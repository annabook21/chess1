#!/bin/bash
set -e

echo "🏗️  Building frontend..."
cd "$(dirname "$0")/../../frontend-web"
pnpm build

echo "🚀 Deploying infrastructure with CDK..."
cd "$(dirname "$0")/.."
pnpm build
npx cdk deploy --all --require-approval never

echo "📦 Uploading ONNX models to S3..."
# Get bucket name from CloudFormation outputs
BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name MasterAcademyChess \
  --query 'Stacks[0].Outputs[?OutputKey==`ModelBucketName`].OutputValue' \
  --output text)

if [ -z "$BUCKET_NAME" ]; then
  echo "❌ Could not find bucket name. Check CloudFormation outputs."
  exit 1
fi

echo "   Syncing models to s3://$BUCKET_NAME/models/"
aws s3 sync ../frontend-web/dist/models s3://$BUCKET_NAME/models/ \
  --exclude ".gitkeep" \
  --content-type "application/octet-stream"

echo "✅ Deployment complete!"
echo ""
echo "Frontend URL: $(aws cloudformation describe-stacks \
  --stack-name MasterAcademyChess \
  --query 'Stacks[0].Outputs[?OutputKey==`FrontendUrl`].OutputValue' \
  --output text)"
