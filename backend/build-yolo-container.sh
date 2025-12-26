#!/bin/bash
# Build and push Docker container for YOLO Lambda function

set -e

# Configuration
AWS_REGION="eu-north-1"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REPOSITORY="florify-yolo-detection"
IMAGE_TAG="latest"
FUNCTION_NAME="detect-plants"

echo "🚀 Building YOLO Lambda Container"
echo "=================================="
echo "Region: $AWS_REGION"
echo "Account: $AWS_ACCOUNT_ID"
echo "Repository: $ECR_REPOSITORY"
echo ""

# Step 1: Create ECR repository if it doesn't exist
echo "📦 Creating ECR repository (if needed)..."
aws ecr describe-repositories --repository-names $ECR_REPOSITORY --region $AWS_REGION 2>/dev/null || \
aws ecr create-repository --repository-name $ECR_REPOSITORY --region $AWS_REGION

# Step 2: Login to ECR
echo "🔐 Logging into ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Step 3: Build Docker image
echo "🔨 Building Docker image..."
docker build -f Dockerfile.detect-plants -t $ECR_REPOSITORY:$IMAGE_TAG .

# Step 4: Tag image for ECR
ECR_URI="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:$IMAGE_TAG"
echo "🏷️  Tagging image as $ECR_URI"
docker tag $ECR_REPOSITORY:$IMAGE_TAG $ECR_URI

# Step 5: Push to ECR
echo "📤 Pushing image to ECR..."
docker push $ECR_URI

echo ""
echo "✅ Container built and pushed successfully!"
echo "   Image URI: $ECR_URI"
echo ""
echo "📝 Next steps:"
echo "   1. Update serverless.yml with the image URI above"
echo "   2. Run: serverless deploy --function detect-plants"

