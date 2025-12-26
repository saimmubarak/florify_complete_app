# Quick Start: Deploy YOLO Container Lambda

## ⚠️ Prerequisites

1. **Docker Desktop must be running** (check system tray)
2. **AWS CLI configured** with appropriate credentials
3. **Internet connection** (will download ~2GB during build)

## 🚀 Quick Deployment Steps

### Step 1: Start Docker Desktop
- Open Docker Desktop application
- Wait until it shows "Docker Desktop is running" in the system tray

### Step 2: Build and Push Container
Open a **Command Prompt** (not PowerShell) and run:

```cmd
cd C:\florify_webapp\backend
build-yolo-container.bat
```

**⏱️ This will take 10-20 minutes:**
- Downloads PyTorch (~2GB)
- Downloads ultralytics and dependencies
- Builds Docker image (~3-4GB total)
- Pushes to AWS ECR (~5-10 minutes)

### Step 3: Deploy Lambda Function

After the build completes, you'll see an image URI. Deploy:

```cmd
cd C:\florify_webapp\backend
set ECR_IMAGE_URI=813089398751.dkr.ecr.eu-north-1.amazonaws.com/florify-yolo-detection:latest
serverless deploy --function detect-plants
```

Or deploy entire service:
```cmd
set ECR_IMAGE_URI=813089398751.dkr.ecr.eu-north-1.amazonaws.com/florify-yolo-detection:latest
serverless deploy
```

## ✅ Verify Deployment

1. Go to AWS Lambda Console
2. Find function: `florify-simple-dev-detect-plants`
3. Check "Image" tab - should show ECR image URI
4. Test using frontend "Generate Garden" button

## 🔧 Troubleshooting

### "Docker Desktop is not running"
- Start Docker Desktop application
- Wait for it to fully start (whale icon in system tray)

### "Cannot connect to Docker daemon"
- Restart Docker Desktop
- Check Docker Desktop settings → General → "Use the WSL 2 based engine"

### Build fails with "out of disk space"
- Docker images are large (~4GB)
- Free up disk space or clean Docker: `docker system prune -a`

### "ECR login failed"
- Check AWS credentials: `aws sts get-caller-identity`
- Verify region: `eu-north-1`

### Container build succeeds but Lambda fails
- Check Lambda logs in CloudWatch
- Verify image URI matches exactly
- Ensure Lambda has enough memory (3008 MB) and timeout (60s)

## 📊 Expected Results

After deployment:
- ✅ YOLO model loads successfully
- ✅ Plant detections work (no mock data warning)
- ✅ Detection results show real bounding boxes and classes

## 💰 Cost Notes

- **ECR Storage**: ~$0.30/month (3GB image)
- **Lambda Execution**: Pay per request (same as regular Lambda)
- **Cold Start**: ~5-10 seconds (container initialization)

## 🔄 Updating the Container

When you update code or model:

```cmd
cd C:\florify_webapp\backend
build-yolo-container.bat
set ECR_IMAGE_URI=813089398751.dkr.ecr.eu-north-1.amazonaws.com/florify-yolo-detection:latest
serverless deploy --function detect-plants
```

