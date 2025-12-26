# 🚀 Deploy YOLO Lambda - Step by Step

## ❌ Current Problem
The container image doesn't exist in ECR yet, so the Lambda deployment is failing.

## ✅ Solution: Build and Deploy Container

### Step 1: Start Docker Desktop
1. Open **Docker Desktop** application
2. Wait until you see "Docker Desktop is running" in the system tray
3. Verify it's running: Open Command Prompt and type `docker ps` (should not show an error)

### Step 2: Build and Push Container

Open **Command Prompt** (not PowerShell) and run:

```cmd
cd C:\florify_webapp\backend
build-yolo-container.bat
```

**⏱️ This will take 10-20 minutes:**
- Downloads PyTorch (~2GB)
- Downloads ultralytics and dependencies  
- Builds Docker image (~3-4GB total)
- Pushes to AWS ECR (~5-10 minutes)

**Expected output at the end:**
```
✅ Container built and pushed successfully!
   Image URI: 813089398751.dkr.ecr.eu-north-1.amazonaws.com/florify-yolo-detection:latest
```

### Step 3: Deploy Lambda Function

After the build completes, deploy the function:

**Option A: Using PowerShell**
```powershell
cd C:\florify_webapp\backend
$env:ECR_IMAGE_URI = "813089398751.dkr.ecr.eu-north-1.amazonaws.com/florify-yolo-detection:latest"
serverless deploy
```

**Option B: Using Command Prompt**
```cmd
cd C:\florify_webapp\backend
set ECR_IMAGE_URI=813089398751.dkr.ecr.eu-north-1.amazonaws.com/florify-yolo-detection:latest
serverless deploy
```

### Step 4: Verify Deployment

1. Go to [AWS Lambda Console](https://eu-north-1.console.aws.amazon.com/lambda/home?region=eu-north-1#/functions)
2. Find function: `florify-simple-dev-detect-plants`
3. Click on it → Go to "Image" tab
4. Should show: `813089398751.dkr.ecr.eu-north-1.amazonaws.com/florify-yolo-detection:latest`

### Step 5: Test

1. Go to your frontend
2. Click "Generate Garden" button
3. Should see **real YOLO detections** (no more "YOLO Model Not Available" warning)

---

## 🔧 Troubleshooting

### "Docker Desktop is not running"
- Start Docker Desktop
- Wait for it to fully start (whale icon in system tray)

### "Cannot connect to Docker daemon"
- Restart Docker Desktop
- Check Docker Desktop settings → General → "Use the WSL 2 based engine"

### Build fails with "out of disk space"
- Docker images are large (~4GB)
- Free up disk space
- Or clean Docker: `docker system prune -a` (removes unused images)

### "ECR login failed"
- Check AWS credentials: `aws sts get-caller-identity`
- Verify region: `eu-north-1`

### Deployment fails with "Image not found"
- Make sure you built and pushed the container first (Step 2)
- Verify image exists: `aws ecr describe-images --repository-name florify-yolo-detection --region eu-north-1`

### Still getting "YOLO Model Not Available"
- Check Lambda logs in CloudWatch
- Verify the function is using the container image (not handler)
- Ensure memory is set to 3008 MB
- Check timeout is set to 60 seconds

---

## 📋 Quick Checklist

- [ ] Docker Desktop is running
- [ ] `best.pt` file exists in `backend/` directory
- [ ] AWS CLI is configured (`aws sts get-caller-identity` works)
- [ ] Container built and pushed to ECR
- [ ] Lambda function deployed with container image
- [ ] Tested with frontend "Generate Garden" button

---

## 💡 Alternative: Use Setup Script

If you prefer an automated approach, run:

```powershell
cd C:\florify_webapp\backend
.\setup-yolo-lambda.ps1
```

This script will:
- Check all prerequisites
- Build and push container (if needed)
- Deploy the Lambda function
- Guide you through any issues

