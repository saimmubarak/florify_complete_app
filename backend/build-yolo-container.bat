@echo off
REM Build and push Docker container for YOLO Lambda function

set AWS_REGION=eu-north-1
set AWS_ACCOUNT_ID=813089398751
set ECR_REPOSITORY=florify-yolo-detection
set IMAGE_TAG=latest

echo 🚀 Building YOLO Lambda Container
echo ==================================
echo Region: %AWS_REGION%
echo Account: %AWS_ACCOUNT_ID%
echo Repository: %ECR_REPOSITORY%
echo.

echo 📦 Step 1: Creating ECR repository (if needed)...
aws ecr describe-repositories --repository-names %ECR_REPOSITORY% --region %AWS_REGION% >nul 2>&1
if errorlevel 1 (
    echo    Creating new repository...
    aws ecr create-repository --repository-name %ECR_REPOSITORY% --region %AWS_REGION%
)

echo.
echo 🔐 Step 2: Logging into ECR...
aws ecr get-login-password --region %AWS_REGION% | docker login --username AWS --password-stdin %AWS_ACCOUNT_ID%.dkr.ecr.%AWS_REGION%.amazonaws.com
if errorlevel 1 (
    echo ❌ Failed to login to ECR
    exit /b 1
)

echo.
echo 🔨 Step 3: Building Docker image (this may take 10-20 minutes)...
echo    Using linux/amd64 platform for Lambda compatibility...
docker build --platform linux/amd64 --provenance=false -f Dockerfile.detect-plants -t %ECR_REPOSITORY%:%IMAGE_TAG% .
if errorlevel 1 (
    echo ❌ Docker build failed
    exit /b 1
)

echo.
echo 🏷️  Step 4: Tagging image...
set ECR_URI=%AWS_ACCOUNT_ID%.dkr.ecr.%AWS_REGION%.amazonaws.com/%ECR_REPOSITORY%:%IMAGE_TAG%
docker tag %ECR_REPOSITORY%:%IMAGE_TAG% %ECR_URI%

echo.
echo 📤 Step 5: Pushing image to ECR (this may take 5-10 minutes)...
docker push %ECR_URI%
if errorlevel 1 (
    echo ❌ Docker push failed
    exit /b 1
)

echo.
echo ✅ Container built and pushed successfully!
echo    Image URI: %ECR_URI%
echo.
echo 📝 Next steps:
echo    1. Set environment variable: set ECR_IMAGE_URI=%ECR_URI%
echo    2. Run: serverless deploy --function detect-plants

