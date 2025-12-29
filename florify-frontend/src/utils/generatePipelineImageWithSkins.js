/**
 * Generate a 512×512 PNG with skins from blueprint data
 * 
 * This function replicates the logic from generatePipelineImageWithSkins in replit_floorplan
 * to create a 512x512 image with visual skins (filled shapes) for use as background in step3.
 * 
 * Process:
 * 1. Scale all floorplan elements uniformly by 3x
 * 2. Render the full floorplan at scaled size with filled shapes (skins)
 * 3. Crop to the bottom 50% of the full layout
 * 4. Fit the cropped area into a 512×512 pixel canvas
 * 
 * @param {Object} data - Blueprint data {shapes, doors, driveways, pathways, patios}
 * @returns {Promise<string>} Base64 data URL of the 512×512 PNG image with skins
 */
export async function generatePipelineImageWithSkins(data) {
  console.log('🎨 generatePipelineImageWithSkins called with data:', data);

  const { shapes = [], doors = [], driveways = [], pathways = [], patios = [] } = data;

  console.log('Data counts:', { 
    shapes: shapes.length, 
    doors: doors.length, 
    driveways: driveways.length, 
    pathways: pathways.length, 
    patios: patios.length 
  });

  const SCALE_FACTOR = 3;
  const OUTPUT_SIZE = 512;
  const DPI = 150;
  const ppf = (DPI / 12); // pixels per foot at this DPI

  // Calculate bounding box
  const allVertices = [];
  shapes.forEach(shape => {
    if (shape.vertices) {
      shape.vertices.forEach(v => allVertices.push(v));
    }
  });
  driveways.forEach(driveway => {
    if (driveway.vertices) {
      driveway.vertices.forEach(v => allVertices.push(v));
    }
  });
  pathways.forEach(pathway => {
    if (pathway.vertices) {
      pathway.vertices.forEach(v => allVertices.push(v));
    }
  });
  patios.forEach(patio => {
    if (patio.vertices) {
      patio.vertices.forEach(v => allVertices.push(v));
    }
  });
  doors.forEach(door => {
    if (door.position) {
      allVertices.push(door.position);
    }
  });

  console.log('Total vertices collected:', allVertices.length);

  if (allVertices.length === 0) {
    console.warn('⚠️ No vertices found - returning white canvas');
    // Return white canvas if no data
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    return canvas.toDataURL('image/png');
  }

  const minX = Math.min(...allVertices.map(v => v.x));
  const maxX = Math.max(...allVertices.map(v => v.x));
  const minY = Math.min(...allVertices.map(v => v.y));
  const maxY = Math.max(...allVertices.map(v => v.y));

  const contentWidth = maxX - minX;
  const contentHeight = maxY - minY;
  const scaledWidth = contentWidth * SCALE_FACTOR * ppf;
  const scaledHeight = contentHeight * SCALE_FACTOR * ppf;

  // Create full canvas
  const fullCanvas = document.createElement('canvas');
  fullCanvas.width = scaledWidth;
  fullCanvas.height = scaledHeight;
  const fullCtx = fullCanvas.getContext('2d', { willReadFrequently: false, alpha: false });

  if (!fullCtx) {
    throw new Error('Failed to get canvas context');
  }

  fullCtx.imageSmoothingEnabled = true;
  fullCtx.imageSmoothingQuality = 'high';
  fullCtx.fillStyle = '#ffffff';
  fullCtx.fillRect(0, 0, scaledWidth, scaledHeight);

  // Skin colors (visual representation with fills)
  const SKIN_COLORS = {
    plot: '#86efac',        // Grass green
    house: '#e48d91',       // Pink/red for house
    wall: '#d3a8d2',        // Purple/lavender for walls
    driveway: '#b9b9ba',    // Gray for driveway
    pathway: '#b9b9ba',     // Gray for pathway
    patio: '#f8b18e',       // Orange/peach for patio
    door: '#ffffff',        // White for doors
  };

  const scalePoint = (p) => ({
    x: (p.x - minX) * SCALE_FACTOR * ppf,
    y: (p.y - minY) * SCALE_FACTOR * ppf,
  });

  // Draw plot boundary first (grass background)
  shapes.forEach(shape => {
    if (!shape.vertices || shape.vertices.length === 0) return;
    if (shape.layer === 'plot') {
      const scaledVertices = shape.vertices.map(scalePoint);
      
      fullCtx.save();
      // Fill with grass color
      fullCtx.fillStyle = SKIN_COLORS.plot;
      fullCtx.beginPath();
      fullCtx.moveTo(scaledVertices[0].x, scaledVertices[0].y);
      for (let i = 1; i < scaledVertices.length; i++) {
        fullCtx.lineTo(scaledVertices[i].x, scaledVertices[i].y);
      }
      fullCtx.closePath();
      fullCtx.fill();
      fullCtx.restore();
    }
  });

  // Draw driveways with fill
  driveways.forEach(driveway => {
    if (!driveway.vertices || driveway.vertices.length === 0) return;

    const scaledVertices = driveway.vertices.map(scalePoint);

    fullCtx.save();
    // Fill with driveway color
    fullCtx.fillStyle = SKIN_COLORS.driveway;
    fullCtx.beginPath();
    fullCtx.moveTo(scaledVertices[0].x, scaledVertices[0].y);
    for (let i = 1; i < scaledVertices.length; i++) {
      fullCtx.lineTo(scaledVertices[i].x, scaledVertices[i].y);
    }
    fullCtx.closePath();
    fullCtx.fill();
    
    // Add border
    fullCtx.strokeStyle = '#888888';
    fullCtx.lineWidth = Math.max(2 * SCALE_FACTOR, 2);
    fullCtx.stroke();
    fullCtx.restore();
  });

  // Draw pathways with fill
  pathways.forEach(pathway => {
    if (!pathway.vertices || pathway.vertices.length === 0) return;

    const scaledVertices = pathway.vertices.map(scalePoint);

    fullCtx.save();
    // Fill with pathway color
    fullCtx.strokeStyle = SKIN_COLORS.pathway;
    fullCtx.lineWidth = Math.max((pathway.width || 1) * SCALE_FACTOR * ppf * 1.5, 4);
    fullCtx.lineCap = 'round';
    fullCtx.lineJoin = 'round';
    fullCtx.beginPath();
    fullCtx.moveTo(scaledVertices[0].x, scaledVertices[0].y);
    for (let i = 1; i < scaledVertices.length; i++) {
      fullCtx.lineTo(scaledVertices[i].x, scaledVertices[i].y);
    }
    fullCtx.stroke();
    fullCtx.restore();
  });

  // Draw patios with fill
  patios.forEach(patio => {
    if (!patio.vertices || patio.vertices.length === 0) return;

    const scaledVertices = patio.vertices.map(scalePoint);

    fullCtx.save();
    // Fill with patio color
    fullCtx.fillStyle = SKIN_COLORS.patio;
    fullCtx.beginPath();
    fullCtx.moveTo(scaledVertices[0].x, scaledVertices[0].y);
    for (let i = 1; i < scaledVertices.length; i++) {
      fullCtx.lineTo(scaledVertices[i].x, scaledVertices[i].y);
    }
    fullCtx.closePath();
    fullCtx.fill();
    
    // Add border
    fullCtx.strokeStyle = '#d97706';
    fullCtx.lineWidth = Math.max(2 * SCALE_FACTOR, 2);
    fullCtx.stroke();
    fullCtx.restore();
  });

  // Draw house with fill
  shapes.forEach(shape => {
    if (!shape.vertices || shape.vertices.length === 0) return;
    if (shape.layer === 'house') {
      const scaledVertices = shape.vertices.map(scalePoint);
      
      fullCtx.save();
      // Fill with house color
      fullCtx.fillStyle = SKIN_COLORS.house;
      fullCtx.beginPath();
      fullCtx.moveTo(scaledVertices[0].x, scaledVertices[0].y);
      for (let i = 1; i < scaledVertices.length; i++) {
        fullCtx.lineTo(scaledVertices[i].x, scaledVertices[i].y);
      }
      fullCtx.closePath();
      fullCtx.fill();
      
      // Add border
      fullCtx.strokeStyle = '#dc2626';
      fullCtx.lineWidth = Math.max((shape.strokeMm || 0.25) * SCALE_FACTOR * 6, 3);
      fullCtx.lineCap = 'round';
      fullCtx.lineJoin = 'round';
      fullCtx.stroke();
      fullCtx.restore();
    }
  });

  // Draw walls with fill
  shapes.forEach(shape => {
    if (!shape.vertices || shape.vertices.length === 0) return;
    if (shape.layer === 'wall') {
      const scaledVertices = shape.vertices.map(scalePoint);
      
      fullCtx.save();
      // Fill with wall color
      fullCtx.fillStyle = SKIN_COLORS.wall;
      fullCtx.beginPath();
      fullCtx.moveTo(scaledVertices[0].x, scaledVertices[0].y);
      for (let i = 1; i < scaledVertices.length; i++) {
        fullCtx.lineTo(scaledVertices[i].x, scaledVertices[i].y);
      }
      fullCtx.closePath();
      fullCtx.fill();
      
      // Add border
      fullCtx.strokeStyle = '#a855f7';
      fullCtx.lineWidth = Math.max((shape.strokeMm || 0.25) * SCALE_FACTOR * 6, 3);
      fullCtx.lineCap = 'round';
      fullCtx.lineJoin = 'round';
      fullCtx.stroke();
      fullCtx.restore();
    }
  });

  // Draw doors
  doors.forEach(door => {
    if (!door.position) return;

    const scaledPos = scalePoint(door.position);
    const doorWidth = (door.width || 3) * SCALE_FACTOR * ppf;

    fullCtx.save();
    // Draw door as white line (visible on colored walls)
    fullCtx.strokeStyle = SKIN_COLORS.door;
    fullCtx.lineWidth = Math.max(5 * SCALE_FACTOR, 5);
    fullCtx.lineCap = 'round';
    fullCtx.beginPath();
    fullCtx.moveTo(scaledPos.x - doorWidth / 2, scaledPos.y);
    fullCtx.lineTo(scaledPos.x + doorWidth / 2, scaledPos.y);
    fullCtx.stroke();
    fullCtx.restore();
  });

  // Crop bottom 50%
  const cropStartY = scaledHeight / 2;
  const cropHeight = scaledHeight / 2;

  console.log('Cropping:', { scaledWidth, scaledHeight, cropStartY, cropHeight });

  // Create 512×512 output
  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = OUTPUT_SIZE;
  outputCanvas.height = OUTPUT_SIZE;
  const outputCtx = outputCanvas.getContext('2d', { willReadFrequently: false, alpha: false });

  if (!outputCtx) {
    throw new Error('Failed to get output canvas context');
  }

  outputCtx.imageSmoothingEnabled = true;
  outputCtx.imageSmoothingQuality = 'high';
  outputCtx.fillStyle = '#ffffff';
  outputCtx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

  // Draw cropped portion scaled to fit 512×512
  outputCtx.drawImage(
    fullCanvas,
    0, cropStartY,           // Source x, y (start from middle height)
    scaledWidth, cropHeight, // Source width, height (full width, bottom half)
    0, 0,                    // Destination x, y
    OUTPUT_SIZE, OUTPUT_SIZE // Destination width, height (scale to 512×512)
  );

  const dataUrl = outputCanvas.toDataURL('image/png');
  console.log('✅ Image with skins generated successfully, data URL length:', dataUrl.length);

  return dataUrl;
}

