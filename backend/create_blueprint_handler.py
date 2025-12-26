import json
import boto3
import os
import uuid
import base64
from datetime import datetime
from botocore.exceptions import ClientError
from simple_auth import require_auth, respond

dynamodb = boto3.resource('dynamodb')
s3 = boto3.client('s3')
table = dynamodb.Table(os.environ['BLUEPRINTS_TABLE'])
BUCKET_NAME = os.environ.get('BLUEPRINT_IMAGES_BUCKET', 'florify-blueprint-images')

def upload_image_to_s3(image_data_url: str, key: str) -> str:
    """
    Upload a base64 data URL image to S3 and return the S3 URL
    """
    try:
        # Parse the data URL to extract the base64 content
        # Format: data:image/png;base64,<base64_data>
        if not image_data_url or not image_data_url.startswith('data:'):
            return ""
        
        # Split the data URL
        header, encoded = image_data_url.split(',', 1)
        
        # Determine content type from header
        content_type = 'image/png'
        if 'image/jpeg' in header:
            content_type = 'image/jpeg'
        elif 'image/png' in header:
            content_type = 'image/png'
        
        # Decode base64
        image_bytes = base64.b64decode(encoded)
        
        # Upload to S3
        s3.put_object(
            Bucket=BUCKET_NAME,
            Key=key,
            Body=image_bytes,
            ContentType=content_type,
            CacheControl='max-age=31536000'  # Cache for 1 year
        )
        
        # Return the S3 URL
        region = os.environ.get('AWS_REGION', 'eu-north-1')
        s3_url = f"https://{BUCKET_NAME}.s3.{region}.amazonaws.com/{key}"
        return s3_url
        
    except Exception as e:
        print(f"Error uploading to S3: {e}")
        return ""

@require_auth
def handler(event, context):
    """
    Create a new blueprint for a garden
    Request body should contain:
    {
        "gardenId": "uuid",
        "blueprintData": { ... },  # JSON data from replit_floorplan
        "name": "Optional blueprint name",
        "pngWithSkins": "data:image/png;base64,...",  # PNG with visual skins
        "pngWithoutSkins": "data:image/png;base64,..."  # PNG without skins (structure only)
    }
    """
    try:
        # Get authenticated user ID from the decorator
        user_id = event['user_id']
        
        print(f"Creating blueprint for user: {user_id}")
        
        body = json.loads(event.get("body", "{}"))
        garden_id = body.get("gardenId")
        blueprint_data = body.get("blueprintData", {})
        name = body.get("name", "Garden Blueprint")
        
        # New PNG fields
        png_with_skins = body.get("pngWithSkins", "")
        png_without_skins = body.get("pngWithoutSkins", "")
        
        # Legacy support for old field names
        if not png_with_skins:
            png_with_skins = body.get("pngImage", "")

        print(f"Garden ID: {garden_id}")
        print(f"Blueprint data size: {len(json.dumps(blueprint_data))} bytes")
        print(f"Blueprint name: {name}")
        print(f"PNG with skins size: {len(png_with_skins)} bytes")
        print(f"PNG without skins size: {len(png_without_skins)} bytes")

        if not garden_id:
            return respond(400, {"message": "Garden ID is required"})

        # Generate unique blueprint ID
        blueprint_id = str(uuid.uuid4())
        current_time = datetime.utcnow().isoformat()
        
        # Upload images to S3
        s3_png_with_skins = ""
        s3_png_without_skins = ""
        
        if png_with_skins and png_with_skins.startswith('data:'):
            s3_key_with_skins = f"blueprints/{user_id}/{garden_id}/{blueprint_id}/with-skins.png"
            s3_png_with_skins = upload_image_to_s3(png_with_skins, s3_key_with_skins)
            print(f"Uploaded PNG with skins to: {s3_png_with_skins}")
        
        if png_without_skins and png_without_skins.startswith('data:'):
            s3_key_without_skins = f"blueprints/{user_id}/{garden_id}/{blueprint_id}/without-skins.png"
            s3_png_without_skins = upload_image_to_s3(png_without_skins, s3_key_without_skins)
            print(f"Uploaded PNG without skins to: {s3_png_without_skins}")
        
        # Create blueprint item for DynamoDB
        blueprint_item = {
            "userId": user_id,
            "blueprintId": blueprint_id,
            "gardenId": garden_id,
            "name": name,
            "blueprintData": json.dumps(blueprint_data),  # Store as JSON string
            "pngWithSkinsUrl": s3_png_with_skins,  # S3 URL for PNG with skins
            "pngWithoutSkinsUrl": s3_png_without_skins,  # S3 URL for PNG without skins
            "createdAt": current_time,
            "updatedAt": current_time
        }

        print(f"Attempting to save blueprint: {blueprint_id}")
        
        # Save to DynamoDB
        table.put_item(Item=blueprint_item)
        
        print(f"Successfully saved blueprint: {blueprint_id}")

        # Response with S3 URLs
        response_item = {
            "userId": user_id,
            "blueprintId": blueprint_id,
            "gardenId": garden_id,
            "name": name,
            "blueprintData": blueprint_data,  # Return as object
            "pngWithSkinsUrl": s3_png_with_skins,
            "pngWithoutSkinsUrl": s3_png_without_skins,
            "createdAt": current_time,
            "updatedAt": current_time
        }

        return respond(201, {
            "message": "Blueprint created successfully",
            "blueprint": response_item
        })

    except json.JSONDecodeError:
        return respond(400, {"message": "Invalid JSON body"})
    except ClientError as e:
        print(f"DynamoDB error: {e}")
        return respond(500, {"message": "Database error occurred"})
    except Exception as e:
        print(f"Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return respond(500, {"message": "Internal server error"})
