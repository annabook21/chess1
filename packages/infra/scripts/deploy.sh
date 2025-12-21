#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INFRA_DIR="$(dirname "$SCRIPT_DIR")"
FRONTEND_DIR="$INFRA_DIR/../frontend-web"

echo "🏗️  Building frontend..."
cd "$FRONTEND_DIR"
pnpm build

echo "🚀 Deploying infrastructure with CDK..."
cd "$INFRA_DIR"
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











