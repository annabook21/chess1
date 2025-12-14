#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { MasterAcademyStack } from '../lib/master-academy-stack';

const app = new cdk.App();

new MasterAcademyStack(app, 'MasterAcademyChess', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1',
  },
  description: 'Master Academy Chess - AI-powered chess learning platform',
});

