import * as cdk from 'aws-cdk-lib';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as ddb from 'aws-cdk-lib/aws-dynamodb';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as servicediscovery from 'aws-cdk-lib/aws-servicediscovery';
import { Construct } from 'constructs';

export class MasterAcademyStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ═══════════════════════════════════════════════════════════════════
    // STORAGE: DynamoDB for game sessions
    // ═══════════════════════════════════════════════════════════════════
    const gameTable = new ddb.Table(this, 'GameSessions', {
      tableName: 'MasterAcademy-GameSessions',
      partitionKey: { name: 'gameId', type: ddb.AttributeType.STRING },
      billingMode: ddb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true,
      },
    });

    // GSI for listing games by user
    gameTable.addGlobalSecondaryIndex({
      indexName: 'ByUser',
      partitionKey: { name: 'userId', type: ddb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: ddb.AttributeType.STRING },
    });

    // ═══════════════════════════════════════════════════════════════════
    // MESSAGING: SQS for blunder events → drill worker
    // ═══════════════════════════════════════════════════════════════════
    const blunderDLQ = new sqs.Queue(this, 'BlunderDLQ', {
      queueName: 'MasterAcademy-BlunderDLQ',
      retentionPeriod: cdk.Duration.days(14),
    });

    const blunderQueue = new sqs.Queue(this, 'BlunderQueue', {
      queueName: 'MasterAcademy-BlunderQueue',
      visibilityTimeout: cdk.Duration.seconds(60),
      deadLetterQueue: {
        queue: blunderDLQ,
        maxReceiveCount: 3,
      },
    });

    // ═══════════════════════════════════════════════════════════════════
    // NETWORKING: VPC for ECS services
    // ═══════════════════════════════════════════════════════════════════
    const vpc = new ec2.Vpc(this, 'ChessVpc', {
      maxAzs: 2,
      natGateways: 1,
    });

    // ═══════════════════════════════════════════════════════════════════
    // COMPUTE: ECS Cluster
    // ═══════════════════════════════════════════════════════════════════
    const cluster = new ecs.Cluster(this, 'ChessCluster', {
      clusterName: 'MasterAcademy-Cluster',
      vpc,
      containerInsights: true,
    });

    // Cloud Map namespace for service discovery
    const namespace = new servicediscovery.PrivateDnsNamespace(this, 'ChessNamespace', {
      name: 'chess.local',
      vpc,
    });

    // ═══════════════════════════════════════════════════════════════════
    // IAM: Shared task execution role
    // ═══════════════════════════════════════════════════════════════════
    const taskExecutionRole = new iam.Role(this, 'TaskExecutionRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
      ],
    });

    // Bedrock access for style-service and coach-service
    const bedrockPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'bedrock:InvokeModel',
        'bedrock:InvokeModelWithResponseStream',
      ],
      resources: ['*'],
    });

    // ═══════════════════════════════════════════════════════════════════
    // ALB: Application Load Balancer for API services
    // ═══════════════════════════════════════════════════════════════════
    const alb = new elbv2.ApplicationLoadBalancer(this, 'ChessALB', {
      vpc,
      internetFacing: true,
      loadBalancerName: 'MasterAcademy-ALB',
    });

    const listener = alb.addListener('HttpListener', {
      port: 80,
      defaultAction: elbv2.ListenerAction.fixedResponse(404, {
        contentType: 'text/plain',
        messageBody: 'Not Found',
      }),
    });

    // ═══════════════════════════════════════════════════════════════════
    // SERVICE: Engine Service (Stockfish wrapper)
    // ═══════════════════════════════════════════════════════════════════
    const engineTaskDef = new ecs.FargateTaskDefinition(this, 'EngineTaskDef', {
      memoryLimitMiB: 2048,
      cpu: 1024,
      executionRole: taskExecutionRole,
    });

    engineTaskDef.addContainer('engine', {
      image: ecs.ContainerImage.fromAsset('../../', {
        file: 'packages/engine-service/Dockerfile',
        exclude: ['cdk.out', '**/cdk.out', 'node_modules', '**/node_modules', 'embodied-chess-demo-with-amazon-bedrock', '.git'],
      }),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'engine',
        logRetention: logs.RetentionDays.ONE_WEEK,
      }),
      portMappings: [{ containerPort: 3001 }],
      environment: {
        PORT: '3001',
        NODE_ENV: 'production',
      },
      healthCheck: {
        command: ['CMD-SHELL', 'wget -qO- http://localhost:3001/health || exit 1'],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        retries: 3,
      },
    });

    const engineService = new ecs.FargateService(this, 'EngineService', {
      cluster,
      taskDefinition: engineTaskDef,
      desiredCount: 1,
      serviceName: 'engine-service',
      cloudMapOptions: {
        name: 'engine',
        cloudMapNamespace: namespace,
        dnsRecordType: servicediscovery.DnsRecordType.A,
      },
    });

    listener.addTargets('EngineTG', {
      port: 3001,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [engineService],
      healthCheck: { path: '/health' },
      conditions: [elbv2.ListenerCondition.pathPatterns(['/engine/*'])],
      priority: 10,
    });

    // ═══════════════════════════════════════════════════════════════════
    // SERVICE: Style Service (Bedrock move generation)
    // ═══════════════════════════════════════════════════════════════════
    const styleTaskRole = new iam.Role(this, 'StyleTaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });
    styleTaskRole.addToPolicy(bedrockPolicy);

    const styleTaskDef = new ecs.FargateTaskDefinition(this, 'StyleTaskDef', {
      memoryLimitMiB: 1024,
      cpu: 512,
      executionRole: taskExecutionRole,
      taskRole: styleTaskRole,
    });

    styleTaskDef.addContainer('style', {
      image: ecs.ContainerImage.fromAsset('../../', {
        file: 'packages/style-service/Dockerfile',
        exclude: ['cdk.out', '**/cdk.out', 'node_modules', '**/node_modules', 'embodied-chess-demo-with-amazon-bedrock', '.git'],
      }),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'style',
        logRetention: logs.RetentionDays.ONE_WEEK,
      }),
      portMappings: [{ containerPort: 3002 }],
      environment: {
        PORT: '3002',
        NODE_ENV: 'production',
        BEDROCK_MODEL_ID_ANTHROPIC: 'anthropic.claude-sonnet-4-20250514',
        BEDROCK_MODEL_ID_AMAZON: 'amazon.titan-text-premier-v1:0',
        STYLE_MODEL_PROVIDER: 'anthropic',
        AWS_REGION: this.region,
      },
      healthCheck: {
        command: ['CMD-SHELL', 'wget -qO- http://localhost:3002/health || exit 1'],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        retries: 3,
      },
    });

    const styleService = new ecs.FargateService(this, 'StyleService', {
      cluster,
      taskDefinition: styleTaskDef,
      desiredCount: 1,
      serviceName: 'style-service',
      cloudMapOptions: {
        name: 'style',
        cloudMapNamespace: namespace,
        dnsRecordType: servicediscovery.DnsRecordType.A,
      },
    });

    listener.addTargets('StyleTG', {
      port: 3002,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [styleService],
      healthCheck: { path: '/health' },
      conditions: [elbv2.ListenerCondition.pathPatterns(['/style/*'])],
      priority: 20,
    });

    // ═══════════════════════════════════════════════════════════════════
    // SERVICE: Coach Service (Bedrock explanations)
    // ═══════════════════════════════════════════════════════════════════
    const coachTaskRole = new iam.Role(this, 'CoachTaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });
    coachTaskRole.addToPolicy(bedrockPolicy);

    const coachTaskDef = new ecs.FargateTaskDefinition(this, 'CoachTaskDef', {
      memoryLimitMiB: 512,
      cpu: 256,
      executionRole: taskExecutionRole,
      taskRole: coachTaskRole,
    });

    coachTaskDef.addContainer('coach', {
      image: ecs.ContainerImage.fromAsset('../../', {
        file: 'packages/coach-service/Dockerfile',
        exclude: ['cdk.out', '**/cdk.out', 'node_modules', '**/node_modules', 'embodied-chess-demo-with-amazon-bedrock', '.git'],
      }),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'coach',
        logRetention: logs.RetentionDays.ONE_WEEK,
      }),
      portMappings: [{ containerPort: 3003 }],
      environment: {
        PORT: '3003',
        NODE_ENV: 'production',
        AWS_REGION: this.region,
      },
      healthCheck: {
        command: ['CMD-SHELL', 'wget -qO- http://localhost:3003/health || exit 1'],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        retries: 3,
      },
    });

    const coachService = new ecs.FargateService(this, 'CoachService', {
      cluster,
      taskDefinition: coachTaskDef,
      desiredCount: 1,
      serviceName: 'coach-service',
      cloudMapOptions: {
        name: 'coach',
        cloudMapNamespace: namespace,
        dnsRecordType: servicediscovery.DnsRecordType.A,
      },
    });

    listener.addTargets('CoachTG', {
      port: 3003,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [coachService],
      healthCheck: { path: '/health' },
      conditions: [elbv2.ListenerCondition.pathPatterns(['/coach/*'])],
      priority: 30,
    });

    // ═══════════════════════════════════════════════════════════════════
    // SERVICE: Game API (main orchestrator)
    // ═══════════════════════════════════════════════════════════════════
    const gameApiTaskRole = new iam.Role(this, 'GameApiTaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });
    gameTable.grantReadWriteData(gameApiTaskRole);
    blunderQueue.grantSendMessages(gameApiTaskRole);

    const gameApiTaskDef = new ecs.FargateTaskDefinition(this, 'GameApiTaskDef', {
      memoryLimitMiB: 1024,
      cpu: 512,
      executionRole: taskExecutionRole,
      taskRole: gameApiTaskRole,
    });

    gameApiTaskDef.addContainer('game-api', {
      image: ecs.ContainerImage.fromAsset('../../', {
        file: 'packages/game-api/Dockerfile',
        exclude: ['cdk.out', '**/cdk.out', 'node_modules', '**/node_modules', 'embodied-chess-demo-with-amazon-bedrock', '.git'],
      }),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'game-api',
        logRetention: logs.RetentionDays.ONE_WEEK,
      }),
      portMappings: [{ containerPort: 3000 }],
      environment: {
        PORT: '3000',
        NODE_ENV: 'production',
        DDB_TABLE_NAME: gameTable.tableName,
        BLUNDER_QUEUE_URL: blunderQueue.queueUrl,
        ENGINE_SERVICE_URL: 'http://engine.chess.local:3001',
        STYLE_SERVICE_URL: 'http://style.chess.local:3002',
        COACH_SERVICE_URL: 'http://coach.chess.local:3003',
        AWS_REGION: this.region,
      },
      healthCheck: {
        command: ['CMD-SHELL', 'wget -qO- http://localhost:3000/health || exit 1'],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        retries: 3,
      },
    });

    const gameApiService = new ecs.FargateService(this, 'GameApiService', {
      cluster,
      taskDefinition: gameApiTaskDef,
      desiredCount: 2,
      serviceName: 'game-api',
    });

    listener.addTargets('GameApiTG', {
      port: 3000,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [gameApiService],
      healthCheck: { path: '/health' },
      conditions: [elbv2.ListenerCondition.pathPatterns(['/game/*', '/api/*'])],
      priority: 40,
    });

    // ═══════════════════════════════════════════════════════════════════
    // SERVICE: Drill Worker (SQS consumer)
    // ═══════════════════════════════════════════════════════════════════
    const drillTaskRole = new iam.Role(this, 'DrillTaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });
    blunderQueue.grantConsumeMessages(drillTaskRole);
    gameTable.grantReadWriteData(drillTaskRole);

    const drillTaskDef = new ecs.FargateTaskDefinition(this, 'DrillTaskDef', {
      memoryLimitMiB: 512,
      cpu: 256,
      executionRole: taskExecutionRole,
      taskRole: drillTaskRole,
    });

    drillTaskDef.addContainer('drill-worker', {
      image: ecs.ContainerImage.fromAsset('../../', {
        file: 'packages/drill-worker/Dockerfile',
        exclude: ['cdk.out', '**/cdk.out', 'node_modules', '**/node_modules', 'embodied-chess-demo-with-amazon-bedrock', '.git'],
      }),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'drill-worker',
        logRetention: logs.RetentionDays.ONE_WEEK,
      }),
      environment: {
        NODE_ENV: 'production',
        BLUNDER_QUEUE_URL: blunderQueue.queueUrl,
        DDB_TABLE_NAME: gameTable.tableName,
        AWS_REGION: this.region,
      },
    });

    new ecs.FargateService(this, 'DrillWorkerService', {
      cluster,
      taskDefinition: drillTaskDef,
      desiredCount: 1,
      serviceName: 'drill-worker',
    });

    // ═══════════════════════════════════════════════════════════════════
    // OUTPUTS
    // ═══════════════════════════════════════════════════════════════════
    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: `http://${alb.loadBalancerDnsName}`,
      description: 'Game API endpoint',
    });

    new cdk.CfnOutput(this, 'GameTableName', {
      value: gameTable.tableName,
      description: 'DynamoDB table for game sessions',
    });

    new cdk.CfnOutput(this, 'BlunderQueueUrl', {
      value: blunderQueue.queueUrl,
      description: 'SQS queue for blunder events',
    });
  }
}

