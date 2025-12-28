"""
Image Processing Utilities for Blueprint Images

Handles processing full-size blueprint PNGs into 512×512 pipeline images
for use in the AI plant placement pipeline.
"""

from PIL import Image
import numpy as np
import base64
import io


def detect_floorplan_bounds(img):
    """
    Detect the horizontal bounds of the floorplan by finding non-white pixels.
    Returns (left, right, top, bottom) pixel coordinates.
    """
    img_array = np.array(img)

    # Convert to grayscale for easier processing
    if len(img_array.shape) == 3:
        gray = np.mean(img_array[:, :, :3], axis=2)
    else:
        gray = img_array

    # Find pixels that are not white (threshold at 250 to account for slight variations)
    non_white = gray < 250

    # Find bounds
    rows = np.any(non_white, axis=1)
    cols = np.any(non_white, axis=0)

    if not np.any(rows) or not np.any(cols):
        # Fallback: use entire image
        return 0, img.width, 0, img.height

    top, bottom = np.where(rows)[0][[0, -1]]
    left, right = np.where(cols)[0][[0, -1]]

    return left, right, top, bottom


def process_floorplan_to_pipeline(img, output_size=512):
    """
    Process floorplan image to create 512×512 pipeline image:
    1. Detect floorplan horizontal extent
    2. Scale so horizontal extent = output_size
    3. Center-crop to output_size × output_size

    Args:
        img: PIL Image object
        output_size: Target output size (default 512)

    Returns:
        PIL Image object at output_size × output_size
    """
    print(f"Input image size: {img.size}")

    # Detect floorplan bounds
    left, right, top, bottom = detect_floorplan_bounds(img)
    floorplan_width = right - left
    floorplan_height = bottom - top

    print(f"Detected floorplan bounds: left={left}, right={right}, top={top}, bottom={bottom}")
    print(f"Floorplan dimensions: {floorplan_width} x {floorplan_height}")

    # Calculate center of floorplan in original image
    center_x = (left + right) / 2
    center_y = (top + bottom) / 2
    print(f"Floorplan center: ({center_x}, {center_y})")

    # Calculate scale factor so horizontal extent becomes output_size pixels
    scale_factor = output_size / floorplan_width
    print(f"Scale factor: {scale_factor:.4f}")

    # Calculate new image dimensions
    new_width = int(img.width * scale_factor)
    new_height = int(img.height * scale_factor)
    print(f"Scaled image size: {new_width} x {new_height}")

    # Scale image uniformly
    scaled_img = img.resize((new_width, new_height), Image.LANCZOS)

    # Calculate new center position after scaling
    scaled_center_x = center_x * scale_factor
    scaled_center_y = center_y * scale_factor
    print(f"Scaled floorplan center: ({scaled_center_x:.2f}, {scaled_center_y:.2f})")

    # Calculate crop box to get output_size × output_size centered on floorplan
    crop_left = int(scaled_center_x - output_size / 2)
    crop_top = int(scaled_center_y - output_size / 2)
    crop_right = crop_left + output_size
    crop_bottom = crop_top + output_size

    print(f"Crop box: ({crop_left}, {crop_top}, {crop_right}, {crop_bottom})")

    # Ensure crop box is within bounds
    if crop_left < 0:
        crop_right -= crop_left
        crop_left = 0
    if crop_top < 0:
        crop_bottom -= crop_top
        crop_top = 0
    if crop_right > new_width:
        crop_left -= (crop_right - new_width)
        crop_right = new_width
    if crop_bottom > new_height:
        crop_top -= (crop_bottom - new_height)
        crop_bottom = new_height

    # Crop to output size
    output_img = scaled_img.crop((crop_left, crop_top, crop_right, crop_bottom))

    print(f"Output image size: {output_img.size}")

    return output_img


def base64_to_pil(data_url):
    """
    Convert base64 data URL to PIL Image.

    Args:
        data_url: Base64 data URL string (e.g., "data:image/png;base64,...")

    Returns:
        PIL Image object
    """
    if not data_url or not data_url.startswith('data:'):
        raise ValueError("Invalid data URL")

    # Split the data URL to extract base64 content
    header, encoded = data_url.split(',', 1)

    # Decode base64
    image_bytes = base64.b64decode(encoded)

    # Convert to PIL Image
    img = Image.open(io.BytesIO(image_bytes))

    return img


def pil_to_base64(img, format='PNG'):
    """
    Convert PIL Image to base64 data URL.

    Args:
        img: PIL Image object
        format: Image format (default 'PNG')

    Returns:
        Base64 data URL string
    """
    buffered = io.BytesIO()
    img.save(buffered, format=format)
    img_bytes = buffered.getvalue()
    img_base64 = base64.b64encode(img_bytes).decode('utf-8')

    content_type = f'image/{format.lower()}'
    data_url = f'data:{content_type};base64,{img_base64}'

    return data_url


def process_blueprint_to_pipeline_dataurl(full_size_data_url, output_size=512):
    """
    Process a full-size blueprint PNG (as base64 data URL) into a 512×512 pipeline PNG.

    Args:
        full_size_data_url: Base64 data URL of the full-size PNG with skins
        output_size: Target output size (default 512)

    Returns:
        Base64 data URL of the 512×512 pipeline PNG
    """
    # Convert data URL to PIL Image
    img = base64_to_pil(full_size_data_url)

    # Process to pipeline size
    pipeline_img = process_floorplan_to_pipeline(img, output_size)

    # Convert back to data URL
    pipeline_data_url = pil_to_base64(pipeline_img)

    return pipeline_data_url
