# Exact Deployment Commands

## File Path
Run these commands from:
```
C:\florify_webapp\backend
```

## Option 1: Using Command Prompt (CMD)

```cmd
cd C:\florify_webapp\backend
set ECR_IMAGE_URI=813089398751.dkr.ecr.eu-north-1.amazonaws.com/florify-yolo-detection:latest
serverless deploy
```

## Option 2: Using PowerShell

```powershell
cd C:\florify_webapp\backend
$env:ECR_IMAGE_URI = "813089398751.dkr.ecr.eu-north-1.amazonaws.com/florify-yolo-detection:latest"
serverless deploy
```

## Option 3: One-liner (Command Prompt)

```cmd
cd C:\florify_webapp\backend && set ECR_IMAGE_URI=813089398751.dkr.ecr.eu-north-1.amazonaws.com/florify-yolo-detection:latest && serverless deploy
```

## Option 4: One-liner (PowerShell)

```powershell
cd C:\florify_webapp\backend; $env:ECR_IMAGE_URI = "813089398751.dkr.ecr.eu-north-1.amazonaws.com/florify-yolo-detection:latest"; serverless deploy
```

## Expected Output

You should see:
```
✔ Service deployed to stack florify-simple-dev
...
detect-plants: florify-simple-dev-detect-plants
...
POST - https://jiazehdrvf.execute-api.eu-north-1.amazonaws.com/dev/pipeline/detect
```

## Verify Deployment

After deployment, verify the function is using the container:
```cmd
aws lambda get-function --function-name florify-simple-dev-detect-plants --region eu-north-1 --query "Code.ImageUri" --output text
```

Should return:
```
813089398751.dkr.ecr.eu-north-1.amazonaws.com/florify-yolo-detection@sha256:...
```

