"""
YOLO Plant Detection Lambda Handler

Step 2 of the plant placement pipeline:
1. Receives the matched filled blueprint image from Step 1
2. Runs YOLO detection to identify plant symbol classes and locations
3. Returns detection results with bounding boxes, classes, and confidence scores
"""

import json
import os
import base64
import io
from simple_auth import require_auth, respond, get_user_id_from_token, cors_headers

# YOLO imports - may not be available in standard Lambda
HAS_YOLO = False
Image = None
YOLO = None
np = None

try:
    from ultralytics import YOLO
    from PIL import Image
    import numpy as np
    import torch
    HAS_YOLO = True
    print("✅ YOLO dependencies loaded successfully")
    print(f"   - ultralytics: {YOLO.__module__}")
    print(f"   - PIL: {Image.__module__}")
    print(f"   - numpy: {np.__version__}")
    print(f"   - torch: {torch.__version__}")
except ImportError as e:
    HAS_YOLO = False
    print(f"⚠️ Warning: YOLO dependencies not available: {e}")
    import traceback
    traceback.print_exc()
    print("Using fallback mode.")


# Path to YOLO model - updated to use best.pt
def find_yolo_model():
    """Find YOLO model file in various possible locations"""
    possible_paths = [
        os.path.join(os.path.dirname(__file__), 'best.pt'),
        os.path.join(os.path.dirname(__file__), 'best (2).pt'),  # Legacy support
        '/var/task/best.pt',
        '/var/task/best (2).pt',  # Legacy support
        os.path.join(os.path.dirname(__file__), '..', 'best.pt'),
    ]
    
    for path in possible_paths:
        if os.path.exists(path):
            print(f"✅ Found YOLO model at: {path}")
            return path
    
    print("❌ YOLO model not found in any expected location")
    print("   Searched paths:")
    for path in possible_paths:
        print(f"     - {path}")
    return None


# Global model instance (loaded once)
_yolo_model = None
_yolo_model_path = None

def load_yolo_model():
    """
    Load the YOLO model following the sample implementation pattern.
    Returns the model or None if loading fails.
    """
    global _yolo_model, _yolo_model_path
    
    if not HAS_YOLO:
        print("❌ YOLO dependencies (ultralytics) not available")
        print("   Please install: pip install ultralytics")
        return None
    
    # Find model file
    model_path = find_yolo_model()
    if not model_path:
        print("❌ YOLO model file not found")
        return None
    
    _yolo_model_path = model_path
    
    # Verify model exists (following sample pattern)
    if not os.path.exists(model_path):
        error_msg = (
            f"❌ YOLO model not found: {model_path}\n"
            f"Please check the path and update YOLO_MODEL_PATH variable."
        )
        print(error_msg)
        return None
    
    try:
        print(f"\n📂 Loading YOLO model from:")
        print(f"   {model_path}\n")
        
        # Load YOLO model (following sample pattern)
        model = YOLO(model_path)
        
        print("✅ YOLO model loaded successfully!")
        print(f"\n📊 Model Info:")
        print(f"   Task: {model.task}")
        
        # Get class names (following sample pattern)
        if hasattr(model, 'names'):
            num_classes = len(model.names)
            print(f"\n🏷️  Detected Classes ({num_classes}):")
            # Show first 10 classes as sample
            for idx, name in list(model.names.items())[:10]:
                print(f"   {idx}: {name}")
            if num_classes > 10:
                print(f"   ... and {num_classes - 10} more classes")
        
        _yolo_model = model
        return model
        
    except Exception as e:
        error_msg = f"❌ Error loading YOLO model: {e}"
        print(error_msg)
        import traceback
        traceback.print_exc()
        return None


def get_yolo_model():
    """Get or load the YOLO model singleton"""
    global _yolo_model
    if _yolo_model is None:
        _yolo_model = load_yolo_model()
    return _yolo_model


def _handler_impl(event, context):
    """
    Internal handler implementation - wrapped to ensure CORS headers are always returned.
    """
    try:
        user_id = event.get('user_id')
        body = json.loads(event.get('body', '{}'))
        
        filled_image = body.get('filledImage', '')
        garden_id = body.get('gardenId', '')
        conf_threshold = body.get('confidenceThreshold', 0.25)
        iou_threshold = body.get('iouThreshold', 0.45)
        
        print("="*80)
        print("🎯 YOLO DETECTION ON MATCHED BLUEPRINT")
        print("="*80)
        print(f"User: {user_id}")
        print(f"Garden ID: {garden_id}")
        print(f"Image size: {len(filled_image)} bytes")
        print(f"Confidence threshold: {conf_threshold}, IoU threshold: {iou_threshold}")
        
        if not filled_image:
            return respond(400, {
                "success": False,
                "message": "Filled image is required"
            })
        
        # Check if YOLO dependencies are available
        if not HAS_YOLO or Image is None:
            error_msg = (
                "❌ YOLO dependencies not available. "
                "Please install ultralytics, torch, and PIL. "
                "Using mock detections for testing."
            )
            print(error_msg)
            return _get_mock_detections_with_error(garden_id, error_msg)
        
        # Decode the base64 image
        try:
            # Remove data URL prefix if present
            if filled_image.startswith('data:'):
                header, encoded = filled_image.split(',', 1)
            else:
                encoded = filled_image
            
            image_data = base64.b64decode(encoded)
            image = Image.open(io.BytesIO(image_data))
            
            # Convert to RGB if needed
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            print(f"\n✅ Image decoded: {image.size[0]}x{image.size[1]} pixels")
        except (NameError, AttributeError) as e:
            error_msg = f"❌ PIL Image not available: {e}"
            print(error_msg)
            return _get_mock_detections_with_error(garden_id, error_msg)
        except Exception as e:
            print(f"❌ Error decoding image: {e}")
            import traceback
            traceback.print_exc()
            return respond(400, {
                "success": False,
                "message": f"Invalid image format: {str(e)}"
            })
        
        # Load YOLO model
        print(f"\n📋 Running YOLO detection on matched filled blueprint...")
        model = get_yolo_model()
        
        if not model:
            error_msg = (
                "❌ YOLO model was not loaded and did not work. "
                "Please check:\n"
                "1. Model file 'best.pt' exists in the backend directory\n"
                "2. YOLO dependencies (ultralytics) are installed\n"
                "3. Model file is properly packaged with Lambda deployment"
            )
            print(error_msg)
            return _get_mock_detections_with_error(garden_id, error_msg)
        
        # Run YOLO detection (following sample implementation)
        try:
            print("\n🔍 Running detection...\n")
            
            # Use the image directly (PIL Image object)
            results = model.predict(
                source=image,
                conf=conf_threshold,  # Confidence threshold
                iou=iou_threshold,    # IoU threshold for NMS
                save=False,
                verbose=False
            )
            
            result = results[0]
            num_detections = len(result.boxes)
            
            print("="*80)
            print("✅ DETECTION COMPLETE!")
            print("="*80)
            print(f"\n📊 Found {num_detections} objects\n")
            
            if num_detections == 0:
                print("⚠️  No objects detected above confidence threshold")
                return respond(200, {
                    "success": True,
                    "detections": [],
                    "summary": {
                        "totalDetections": 0,
                        "classCounts": {}
                    },
                    "message": "No plant symbols detected above confidence threshold"
                })
            
            # Process detections (following sample implementation pattern)
            detections = []
            class_counts = {}
            
            print("🔍 Detection Details:")
            print("-"*80)
            
            for i, box in enumerate(result.boxes):
                # Get coordinates (following sample pattern)
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                conf = box.conf[0].cpu().numpy()
                cls = int(box.cls[0].cpu().numpy())
                class_name = model.names[cls]
                
                # Calculate dimensions and center
                width = float(x2 - x1)
                height = float(y2 - y1)
                center_x = float(x1 + width / 2)
                center_y = float(y1 + height / 2)
                
                detection = {
                    "id": i + 1,
                    "class": class_name,
                    "classId": cls,
                    "confidence": round(float(conf), 4),
                    "bbox": {
                        "x1": round(float(x1), 2),
                        "y1": round(float(y1), 2),
                        "x2": round(float(x2), 2),
                        "y2": round(float(y2), 2),
                        "width": round(width, 2),
                        "height": round(height, 2),
                        "centerX": round(center_x, 2),
                        "centerY": round(center_y, 2)
                    }
                }
                
                detections.append(detection)
                
                # Count classes
                class_counts[class_name] = class_counts.get(class_name, 0) + 1
                
                # Log first few detections (following sample pattern)
                if i < 5:
                    print(f"\n  Detection {i+1}:")
                    print(f"    • Class: {class_name}")
                    print(f"    • Confidence: {conf:.2%}")
                    print(f"    • Box: ({x1:.1f}, {y1:.1f}) → ({x2:.1f}, {y2:.1f})")
            
            print("\n" + "-"*80)
            
            # Class distribution (following sample pattern)
            print("\n📈 Detection Summary:")
            for class_name, count in sorted(class_counts.items()):
                print(f"   • {class_name}: {count}")
            
            print("\n" + "="*80)
            
            return respond(200, {
                "success": True,
                "detections": detections,
                "summary": {
                    "totalDetections": num_detections,
                    "classCounts": class_counts
                },
                "message": f"Detected {num_detections} plant symbols"
            })
            
        except Exception as e:
            error_msg = f"❌ YOLO detection error: {e}"
            print(error_msg)
            import traceback
            traceback.print_exc()
            return respond(500, {
                "success": False,
                "message": f"Detection failed: {str(e)}",
                "error": str(e)
            })
    
    except json.JSONDecodeError:
        return respond(400, {
            "success": False,
            "message": "Invalid JSON body"
        })
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        # Ensure CORS headers are always returned, even on errors
        return respond(500, {
            "success": False,
            "message": f"Internal server error: {str(e)}"
        })


def handler(event, context):
    """
    Run YOLO detection on a filled blueprint image.
    
    Request body:
    {
        "filledImage": "data:image/png;base64,...",  # Matched filled blueprint from Step 1
        "gardenId": "uuid",
        "confidenceThreshold": 0.25,  # Optional, default 0.25
        "iouThreshold": 0.45  # Optional, default 0.45
    }
    
    Response:
    {
        "success": true,
        "detections": [...],
        "summary": {...},
        "message": "..."
    }
    """
    # Handle CORS preflight
    if event.get("httpMethod") == "OPTIONS" or event.get("requestContext", {}).get("http", {}).get("method") == "OPTIONS":
        return respond(200, {"message": "CORS preflight"})
    
    # Wrap handler to ensure CORS headers are always returned
    try:
        # Handle authentication
        try:
            user_id, error = get_user_id_from_token(event)
            if error:
                return respond(401, {"message": f"Authentication required: {error}"})
            event['user_id'] = user_id
        except Exception as e:
            print(f"Auth error: {e}")
            return respond(401, {"message": "Authentication failed"})
        
        # Call the actual handler
        return _handler_impl(event, context)
    except Exception as e:
        # Catch any unhandled exceptions and ensure CORS headers are returned
        print(f"❌ Unhandled exception in handler: {e}")
        import traceback
        traceback.print_exc()
        return respond(500, {
            "success": False,
            "message": f"Internal server error: {str(e)}"
        })


def _get_mock_detections_with_error(garden_id: str, error_message: str):
    """
    Return mock detections with error message when YOLO is not available.
    """
    import random
    
    # Use garden_id for deterministic mock data
    if garden_id:
        random.seed(hash(garden_id))
    
    mock_classes = [
        "Shrub_Height2_CanopySize1_Evergreen_Flowering_NONFruiting",
        "perennials_Height2_CanopySize2_Evergreen_BroadLeafed_Flowering",
        "perennials_Height2_CanopySize2_Evergreen_ThinLeafed_Flowering",
        "Tree_Height3_CanopySize3_Deciduous_NonFlowering_Fruiting",
    ]
    
    num_detections = random.randint(20, 40)
    detections = []
    class_counts = {}
    
    for i in range(num_detections):
        class_name = random.choice(mock_classes)
        x1 = random.uniform(50, 450)
        y1 = random.uniform(50, 450)
        width = random.uniform(15, 40)
        height = random.uniform(15, 40)
        
        detection = {
            "id": i + 1,
            "class": class_name,
            "classId": mock_classes.index(class_name),
            "confidence": round(random.uniform(0.5, 0.95), 4),
            "bbox": {
                "x1": round(x1, 2),
                "y1": round(y1, 2),
                "x2": round(x1 + width, 2),
                "y2": round(y1 + height, 2),
                "width": round(width, 2),
                "height": round(height, 2),
                "centerX": round(x1 + width / 2, 2),
                "centerY": round(y1 + height / 2, 2)
            }
        }
        
        detections.append(detection)
        class_counts[class_name] = class_counts.get(class_name, 0) + 1
    
    return respond(200, {
        "success": True,
        "detections": detections,
        "summary": {
            "totalDetections": num_detections,
            "classCounts": class_counts
        },
        "message": f"Detected {num_detections} plant symbols (mock data - YOLO not available)",
        "warning": error_message,
        "isMock": True
    })
