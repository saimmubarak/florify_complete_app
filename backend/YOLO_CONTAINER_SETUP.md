# YOLO Container Lambda Setup Guide

This guide explains how to deploy the YOLO plant detection Lambda function using a Docker container. This approach is necessary because PyTorch and ultralytics are too large for standard Lambda deployment packages.

## Why Container-Based Lambda?

- **Size Limit**: Standard Lambda packages are limited to 250MB (50MB zipped)
- **PyTorch Size**: PyTorch + ultralytics + dependencies ≈ 2-3GB
- **Solution**: Container-based Lambda supports up to 10GB images

## Prerequisites

1. **Docker** installed and running
2. **AWS CLI** configured with appropriate credentials
3. **AWS Account ID** (will be auto-detected)
4. **Permissions**: ECR create/push, Lambda update

## Step-by-Step Setup

### Step 1: Build and Push Container

**On Windows (PowerShell):**
```powershell
cd backend
.\build-yolo-container.ps1
```

**On Linux/Mac:**
```bash
cd backend
chmod +x build-yolo-container.sh
./build-yolo-container.sh
```

This script will:
1. Create ECR repository `florify-yolo-detection` (if needed)
2. Build Docker image with all YOLO dependencies
3. Push image to ECR
4. Display the image URI

### Step 2: Update serverless.yml

After building, you'll get an image URI like:
```
123456789012.dkr.ecr.eu-north-1.amazonaws.com/florify-yolo-detection:latest
```

**Option A: Set Environment Variable (Recommended)**
```powershell
# PowerShell
$env:ECR_IMAGE_URI = "123456789012.dkr.ecr.eu-north-1.amazonaws.com/florify-yolo-detection:latest"
serverless deploy --function detect-plants
```

**Option B: Update serverless.yml Directly**
Edit `serverless.yml` and replace `YOUR_ACCOUNT_ID` in the image URI.

### Step 3: Deploy Function

```powershell
cd backend
serverless deploy --function detect-plants
```

Or deploy entire service:
```powershell
serverless deploy
```

## Verifying Deployment

1. **Check Lambda Console**: Go to AWS Lambda → Functions → `florify-simple-dev-detect-plants`
2. **Check Container Image**: Should show the ECR image URI
3. **Test Endpoint**: Use the frontend "Generate Garden" button

## Troubleshooting

### "Image not found" error
- Ensure ECR repository exists: `aws ecr describe-repositories --repository-names florify-yolo-detection`
- Check image URI matches exactly (including region)

### "Docker build failed"
- Ensure `best.pt` exists in `backend/` directory
- Check Docker is running: `docker ps`

### "ECR login failed"
- Verify AWS credentials: `aws sts get-caller-identity`
- Check region matches: `eu-north-1`

### Container too large
- Current size: ~3-4GB (PyTorch + dependencies)
- Lambda limit: 10GB (we're well within)

## Manual Steps (if scripts fail)

```powershell
# 1. Get AWS Account ID
$accountId = aws sts get-caller-identity --query Account --output text

# 2. Create ECR repository
aws ecr create-repository --repository-name florify-yolo-detection --region eu-north-1

# 3. Login to ECR
aws ecr get-login-password --region eu-north-1 | docker login --username AWS --password-stdin "$accountId.dkr.ecr.eu-north-1.amazonaws.com"

# 4. Build image
docker build -f Dockerfile.detect-plants -t florify-yolo-detection:latest .

# 5. Tag image
docker tag florify-yolo-detection:latest "$accountId.dkr.ecr.eu-north-1.amazonaws.com/florify-yolo-detection:latest"

# 6. Push image
docker push "$accountId.dkr.ecr.eu-north-1.amazonaws.com/florify-yolo-detection:latest"

# 7. Deploy
$env:ECR_IMAGE_URI = "$accountId.dkr.ecr.eu-north-1.amazonaws.com/florify-yolo-detection:latest"
serverless deploy --function detect-plants
```

## Cost Considerations

- **ECR Storage**: ~$0.10 per GB/month (3GB ≈ $0.30/month)
- **Lambda Execution**: Same as regular Lambda (pay per request)
- **Cold Start**: Container images may have slightly longer cold starts (~5-10s)

## Updating the Container

When you update `detect_plants_handler.py` or `best.pt`:

1. Rebuild container: `.\build-yolo-container.ps1`
2. Redeploy: `serverless deploy --function detect-plants`

The image tag (`latest`) will be updated automatically.

