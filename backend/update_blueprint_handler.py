import json
import boto3
import os
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
    Update an existing blueprint
    """
    try:
        # Get authenticated user ID from the decorator
        user_id = event['user_id']
        
        # Get blueprint ID from path parameters
        blueprint_id = event.get('pathParameters', {}).get('blueprintId')
        
        if not blueprint_id:
            return respond(400, {"message": "Blueprint ID is required"})

        body = json.loads(event.get("body", "{}"))
        
        # First, get the existing blueprint to get the garden ID for S3 path
        try:
            existing = table.get_item(
                Key={
                    'userId': user_id,
                    'blueprintId': blueprint_id
                }
            )
            if 'Item' not in existing:
                return respond(404, {"message": "Blueprint not found"})
            garden_id = existing['Item'].get('gardenId', 'unknown')
        except Exception as e:
            print(f"Error fetching existing blueprint: {e}")
            garden_id = 'unknown'
        
        # Build update expression
        update_expression = "SET updatedAt = :updatedAt"
        expression_values = {
            ':updatedAt': datetime.utcnow().isoformat()
        }
        expression_names = {}

        if 'name' in body:
            update_expression += ", #name = :name"
            expression_values[':name'] = body['name']
            expression_names['#name'] = 'name'

        if 'blueprintData' in body:
            update_expression += ", blueprintData = :blueprintData"
            # Store as JSON string
            expression_values[':blueprintData'] = json.dumps(body['blueprintData'])

        # Handle new PNG image uploads
        png_with_skins = body.get("pngWithSkins", "")
        png_without_skins = body.get("pngWithoutSkins", "")
        
        if png_with_skins and png_with_skins.startswith('data:'):
            s3_key = f"blueprints/{user_id}/{garden_id}/{blueprint_id}/with-skins.png"
            s3_url = upload_image_to_s3(png_with_skins, s3_key)
            if s3_url:
                update_expression += ", pngWithSkinsUrl = :pngWithSkinsUrl"
                expression_values[':pngWithSkinsUrl'] = s3_url
                print(f"Uploaded PNG with skins to: {s3_url}")
        
        if png_without_skins and png_without_skins.startswith('data:'):
            s3_key = f"blueprints/{user_id}/{garden_id}/{blueprint_id}/without-skins.png"
            s3_url = upload_image_to_s3(png_without_skins, s3_key)
            if s3_url:
                update_expression += ", pngWithoutSkinsUrl = :pngWithoutSkinsUrl"
                expression_values[':pngWithoutSkinsUrl'] = s3_url
                print(f"Uploaded PNG without skins to: {s3_url}")

        # Legacy support for old field names
        if 'pngImage' in body and body['pngImage'].startswith('data:'):
            s3_key = f"blueprints/{user_id}/{garden_id}/{blueprint_id}/with-skins.png"
            s3_url = upload_image_to_s3(body['pngImage'], s3_key)
            if s3_url:
                update_expression += ", pngWithSkinsUrl = :pngWithSkinsUrl"
                expression_values[':pngWithSkinsUrl'] = s3_url

        # Update item in DynamoDB
        update_params = {
            'Key': {
                'userId': user_id,
                'blueprintId': blueprint_id
            },
            'UpdateExpression': update_expression,
            'ExpressionAttributeValues': expression_values,
            'ConditionExpression': 'attribute_exists(blueprintId)',
            'ReturnValues': 'ALL_NEW'
        }
        
        if expression_names:
            update_params['ExpressionAttributeNames'] = expression_names

        response = table.update_item(**update_params)

        # Parse blueprintData JSON string back to object for response
        updated_item = response['Attributes']
        if 'blueprintData' in updated_item and isinstance(updated_item['blueprintData'], str):
            try:
                updated_item['blueprintData'] = json.loads(updated_item['blueprintData'])
            except json.JSONDecodeError:
                print(f"Warning: Could not parse blueprintData")

        return respond(200, {
            "message": "Blueprint updated successfully",
            "blueprint": updated_item
        })

    except ClientError as e:
        if e.response['Error']['Code'] == 'ConditionalCheckFailedException':
            return respond(404, {"message": "Blueprint not found"})
        print(f"DynamoDB error: {e}")
        return respond(500, {"message": "Database error occurred"})
    except json.JSONDecodeError:
        return respond(400, {"message": "Invalid JSON body"})
    except Exception as e:
        print(f"Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return respond(500, {"message": "Internal server error"})
