import json
import boto3
import os
from datetime import datetime
from botocore.exceptions import ClientError
from simple_auth import require_auth, respond

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['GARDENS_TABLE'])

@require_auth
def handler(event, context):
    """
    Update house_shape field in garden record
    This is a separate endpoint to avoid affecting the delicate serverless backend
    """
    try:
        # Get authenticated user ID from the decorator
        user_id = event['user_id']
        
        # Get garden ID from path parameters
        garden_id = event.get('pathParameters', {}).get('gardenId')
        if not garden_id:
            return respond(400, {"message": "Garden ID is required"})

        # Parse request body
        body = json.loads(event.get("body", "{}"))
        house_shape = body.get("houseShape")
        
        if house_shape is None:
            return respond(400, {"message": "houseShape is required"})

        # Update house_shape in garden
        current_time = datetime.utcnow().isoformat()
        update_expression = "SET updatedAt = :updatedAt, houseShape = :houseShape"
        expression_attribute_values = {
            ":updatedAt": current_time,
            ":houseShape": house_shape
        }

        # Update garden in DynamoDB
        response = table.update_item(
            Key={
                'userId': user_id,
                'gardenId': garden_id
            },
            UpdateExpression=update_expression,
            ExpressionAttributeValues=expression_attribute_values,
            ReturnValues='ALL_NEW'
        )

        updated_garden = response.get('Attributes', {})
        
        return respond(200, {
            "message": "House shape updated successfully",
            "garden": updated_garden
        })

    except ClientError as e:
        print(f"DynamoDB error: {e}")
        return respond(500, {"message": "Database error occurred"})
    except json.JSONDecodeError:
        return respond(400, {"message": "Invalid JSON body"})
    except Exception as e:
        print(f"Unexpected error: {e}")
        return respond(500, {"message": "Internal server error"})

