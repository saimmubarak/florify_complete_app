# PowerShell script to build and push Docker container for YOLO Lambda function

$ErrorActionPreference = "Stop"

# Configuration
$AWS_REGION = "eu-north-1"
$AWS_ACCOUNT_ID = (aws sts get-caller-identity --query Account --output text)
$ECR_REPOSITORY = "florify-yolo-detection"
$IMAGE_TAG = "latest"

Write-Host "🚀 Building YOLO Lambda Container" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Region: $AWS_REGION"
Write-Host "Account: $AWS_ACCOUNT_ID"
Write-Host "Repository: $ECR_REPOSITORY"
Write-Host ""

# Step 1: Create ECR repository if it doesn't exist
Write-Host "📦 Creating ECR repository (if needed)..." -ForegroundColor Yellow
try {
    aws ecr describe-repositories --repository-names $ECR_REPOSITORY --region $AWS_REGION 2>$null
    Write-Host "   Repository already exists" -ForegroundColor Green
} catch {
    Write-Host "   Creating new repository..." -ForegroundColor Yellow
    aws ecr create-repository --repository-name $ECR_REPOSITORY --region $AWS_REGION
}

# Step 2: Login to ECR
Write-Host "🔐 Logging into ECR..." -ForegroundColor Yellow
$loginCommand = aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to login to ECR" -ForegroundColor Red
    exit 1
}

# Step 3: Build Docker image
Write-Host "🔨 Building Docker image..." -ForegroundColor Yellow
$imageName = "${ECR_REPOSITORY}:${IMAGE_TAG}"
docker build -f Dockerfile.detect-plants -t $imageName .
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker build failed" -ForegroundColor Red
    exit 1
}

# Step 4: Tag image for ECR
$ECR_URI = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}:${IMAGE_TAG}"
Write-Host "🏷️  Tagging image as $ECR_URI" -ForegroundColor Yellow
docker tag $imageName $ECR_URI

# Step 5: Push to ECR
Write-Host "📤 Pushing image to ECR..." -ForegroundColor Yellow
docker push $ECR_URI
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker push failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Container built and pushed successfully!" -ForegroundColor Green
Write-Host "   Image URI: $ECR_URI" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Yellow
Write-Host "   1. Set environment variable: `$env:ECR_IMAGE_URI = '$ECR_URI'"
Write-Host "   2. Run: serverless deploy --function detect-plants"

