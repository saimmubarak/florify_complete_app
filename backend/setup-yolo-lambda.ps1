# Complete YOLO Lambda Setup Script
# This script checks prerequisites and guides you through the setup

$ErrorActionPreference = "Continue"

Write-Host "🚀 YOLO Lambda Container Setup" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check Docker
Write-Host "📋 Step 1: Checking Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version 2>&1
    Write-Host "   ✅ Docker installed: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Docker not found. Please install Docker Desktop." -ForegroundColor Red
    exit 1
}

# Check if Docker is running
try {
    docker ps > $null 2>&1
    Write-Host "   ✅ Docker is running" -ForegroundColor Green
    $dockerRunning = $true
} catch {
    Write-Host "   ❌ Docker Desktop is not running!" -ForegroundColor Red
    Write-Host "   📝 Please start Docker Desktop and wait for it to fully start." -ForegroundColor Yellow
    Write-Host "   📝 Then run this script again." -ForegroundColor Yellow
    exit 1
}

# Step 2: Check AWS CLI
Write-Host ""
Write-Host "📋 Step 2: Checking AWS CLI..." -ForegroundColor Yellow
try {
    $awsAccount = aws sts get-caller-identity --query Account --output text 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ AWS CLI configured. Account: $awsAccount" -ForegroundColor Green
    } else {
        Write-Host "   ❌ AWS CLI not configured. Please run: aws configure" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "   ❌ AWS CLI not found. Please install AWS CLI." -ForegroundColor Red
    exit 1
}

# Step 3: Check if model file exists
Write-Host ""
Write-Host "📋 Step 3: Checking YOLO model file..." -ForegroundColor Yellow
if (Test-Path "best.pt") {
    $fileSize = (Get-Item "best.pt").Length / 1MB
    Write-Host "   ✅ Model file found: best.pt ($([math]::Round($fileSize, 2)) MB)" -ForegroundColor Green
} else {
    Write-Host "   ❌ Model file not found: best.pt" -ForegroundColor Red
    Write-Host "   📝 Please ensure best.pt is in the backend directory." -ForegroundColor Yellow
    exit 1
}

# Step 4: Check if image already exists in ECR
Write-Host ""
Write-Host "📋 Step 4: Checking ECR repository..." -ForegroundColor Yellow
$accountId = aws sts get-caller-identity --query Account --output text
$region = "eu-north-1"
$repoName = "florify-yolo-detection"
$imageUri = "$accountId.dkr.ecr.$region.amazonaws.com/$repoName`:latest"

try {
    $images = aws ecr describe-images --repository-name $repoName --region $region --image-ids imageTag=latest 2>&1
    if ($LASTEXITCODE -eq 0 -and $images -match "imageDigest") {
        Write-Host "   ✅ Container image already exists in ECR" -ForegroundColor Green
        Write-Host "   📝 Image URI: $imageUri" -ForegroundColor Cyan
        $imageExists = $true
    } else {
        Write-Host "   ⚠️  Container image not found in ECR" -ForegroundColor Yellow
        $imageExists = $false
    }
} catch {
    Write-Host "   ⚠️  Could not check ECR (repository may not exist)" -ForegroundColor Yellow
    $imageExists = $false
}

# Step 5: Build and push if needed
if (-not $imageExists) {
    Write-Host ""
    Write-Host "📋 Step 5: Building and pushing container..." -ForegroundColor Yellow
    Write-Host "   ⏱️  This will take 10-20 minutes (downloading ~2GB)" -ForegroundColor Yellow
    Write-Host ""
    
    $response = Read-Host "   Continue? (Y/N)"
    if ($response -ne "Y" -and $response -ne "y") {
        Write-Host "   ❌ Setup cancelled" -ForegroundColor Red
        exit 0
    }
    
    Write-Host ""
    Write-Host "   🔨 Running build script..." -ForegroundColor Cyan
    cmd /c "build-yolo-container.bat"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "   ❌ Build failed. Please check the errors above." -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
    Write-Host "   ✅ Container built and pushed successfully!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "📋 Step 5: Skipping build (image already exists)" -ForegroundColor Yellow
}

# Step 6: Deploy Lambda function
Write-Host ""
Write-Host "📋 Step 6: Deploying Lambda function..." -ForegroundColor Yellow
Write-Host "   📝 Setting ECR_IMAGE_URI environment variable..." -ForegroundColor Cyan
$env:ECR_IMAGE_URI = $imageUri

Write-Host "   🚀 Deploying..." -ForegroundColor Cyan
cd $PSScriptRoot
serverless deploy

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Setup complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Next steps:" -ForegroundColor Yellow
    Write-Host "   1. Test the endpoint using the frontend 'Generate Garden' button" -ForegroundColor White
    Write-Host "   2. Check Lambda logs in CloudWatch if there are any issues" -ForegroundColor White
    Write-Host ""
    Write-Host "🎉 YOLO model should now be available in Lambda!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ Deployment failed. Please check the errors above." -ForegroundColor Red
    exit 1
}

