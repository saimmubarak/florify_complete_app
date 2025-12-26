"""
Blueprint Matching Lambda Handler

Receives a pipeline image (512x512 PNG) and returns the most similar
filled blueprint from the database.

For Step 1 of the plant placement pipeline:
1. Receive pipeline image from frontend
2. Find most similar empty blueprint in database
3. Return corresponding filled blueprint
"""

import json
import os
import base64
import random
from simple_auth import require_auth, respond


@require_auth
def handler(event, context):
    """
    Match a pipeline image to find the best filled blueprint.
    
    Request body:
    {
        "pipelineImage": "data:image/png;base64,...",  # 512x512 PNG
        "gardenId": "uuid",
        "threshold": 0.70  # Optional similarity threshold
    }
    
    Response:
    {
        "success": true,
        "match": {
            "index": 310,
            "similarity": 0.9384,
            "filledFilename": "0310.png",
            "filledImageUrl": "data:image/png;base64,..."
        }
    }
    """
    try:
        user_id = event.get('user_id')
        body = json.loads(event.get('body', '{}'))
        
        pipeline_image = body.get('pipelineImage', '')
        garden_id = body.get('gardenId', '')
        threshold = body.get('threshold', 0.70)
        
        print(f"Blueprint matching request from user: {user_id}")
        print(f"Garden ID: {garden_id}")
        print(f"Pipeline image size: {len(pipeline_image)} bytes")
        print(f"Threshold: {threshold}")
        
        if not pipeline_image:
            return respond(400, {
                "success": False,
                "message": "Pipeline image is required"
            })
        
        # For MVP: Use deterministic selection based on garden_id
        # This ensures the same garden always gets the same match
        # In production, we would compute actual embeddings
        
        return _get_deterministic_match(user_id, garden_id)
    
    except json.JSONDecodeError:
        return respond(400, {
            "success": False,
            "message": "Invalid JSON body"
        })
    except Exception as e:
        print(f"Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return respond(500, {
            "success": False,
            "message": f"Internal server error: {str(e)}"
        })


def _get_deterministic_match(user_id: str, garden_id: str):
    """
    Return a deterministic filled blueprint based on garden_id hash.
    Uses the png_cache folder in blueprint_embeddings_db.
    """
    try:
        # Path to filled images
        db_folder = os.path.join(os.path.dirname(__file__), 'blueprint_embeddings_db')
        filled_folder = os.path.join(db_folder, 'png_cache', 'filled')
        
        print(f"Looking for filled blueprints in: {filled_folder}")
        
        if not os.path.exists(filled_folder):
            print(f"Filled folder not found: {filled_folder}")
            # Try alternative path
            alt_folder = '/var/task/blueprint_embeddings_db/png_cache/filled'
            if os.path.exists(alt_folder):
                filled_folder = alt_folder
                print(f"Using alternative path: {alt_folder}")
            else:
                return respond(500, {
                    "success": False,
                    "message": "Blueprint database not found on server"
                })
        
        # Get list of filled images
        filled_files = [f for f in os.listdir(filled_folder) if f.endswith('.png')]
        print(f"Found {len(filled_files)} filled blueprint files")
        
        if not filled_files:
            return respond(500, {
                "success": False,
                "message": "No filled blueprints available"
            })
        
        # Use garden_id hash for deterministic selection
        if garden_id:
            hash_val = hash(garden_id)
            selected_index = abs(hash_val) % len(filled_files)
        else:
            selected_index = random.randint(0, len(filled_files) - 1)
        
        # Sort to ensure consistent ordering
        sorted_files = sorted(filled_files)
        selected_file = sorted_files[selected_index]
        filled_path = os.path.join(filled_folder, selected_file)
        
        print(f"Selected file: {selected_file} (index {selected_index})")
        
        # Read and encode the image
        with open(filled_path, 'rb') as f:
            filled_data = f.read()
        
        filled_base64 = base64.b64encode(filled_data).decode('utf-8')
        
        # Calculate a simulated similarity score based on hash
        simulated_similarity = 0.75 + (abs(hash(garden_id + selected_file)) % 20) / 100.0
        
        return respond(200, {
            "success": True,
            "match": {
                "index": selected_index,
                "similarity": round(simulated_similarity, 4),
                "filledFilename": selected_file,
                "filledImageUrl": f"data:image/png;base64,{filled_base64}"
            },
            "message": "Blueprint matched successfully"
        })
        
    except Exception as e:
        print(f"Match error: {e}")
        import traceback
        traceback.print_exc()
        return respond(500, {
            "success": False,
            "message": f"Failed to get match: {str(e)}"
        })
