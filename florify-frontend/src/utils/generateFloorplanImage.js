/**
 * Generate a 512×512 PNG with skins from blueprint data
 *
 * This is a simplified version that renders the floorplan with pipeline colors
 * (same as used in YOLO detection) at 512×512px.
 *
 * @param {Object} data - Blueprint data {shapes, doors, driveways, pathways, patios}
 * @returns {Promise<string>} Base64 data URL of the PNG image
 */
export async function generateFloorplanImageWithSkins(data) {
  console.log('🎨 generateFloorplanImageWithSkins called with data:', data);

  const { shapes = [], doors = [], driveways = [], pathways = [], patios = [] } = data;

  console.log('Data counts:', { shapes: shapes.length, doors: doors.length, driveways: driveways.length, pathways: pathways.length, patios: patios.length });

  const SCALE_FACTOR = 3;
  const OUTPUT_SIZE = 512;
  const DPI = 150;
  const ppf = (DPI / 12); // pixels per foot at this DPI

  // Calculate bounding box
  const allVertices = [];
  shapes.forEach(shape => shape.vertices && shape.vertices.forEach(v => allVertices.push(v)));
  driveways.forEach(driveway => driveway.vertices && driveway.vertices.forEach(v => allVertices.push(v)));
  pathways.forEach(pathway => pathway.vertices && pathway.vertices.forEach(v => allVertices.push(v)));
  patios.forEach(patio => patio.vertices && patio.vertices.forEach(v => allVertices.push(v)));
  doors.forEach(door => door.position && allVertices.push(door.position));

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
  const fullCtx = fullCanvas.getContext('2d');

  fullCtx.imageSmoothingEnabled = true;
  fullCtx.imageSmoothingQuality = 'high';
  fullCtx.fillStyle = '#ffffff';
  fullCtx.fillRect(0, 0, scaledWidth, scaledHeight);

  // Pipeline colors
  const PIPELINE_COLORS = {
    house: '#e48d91',
    driveway: '#b9b9ba',
    pathway: '#b9b9ba',
    boundaryWall: '#d3a8d2',
    patio: '#f8b18e',
    wall: '#d3a8d2',
    door: '#ffffff',
  };

  const scalePoint = (p) => ({
    x: (p.x - minX) * SCALE_FACTOR * ppf,
    y: (p.y - minY) * SCALE_FACTOR * ppf,
  });

  // Draw shapes (structure only)
  shapes.forEach(shape => {
    if (!shape.vertices || shape.vertices.length === 0) return;

    const scaledVertices = shape.vertices.map(scalePoint);
    let strokeColor = PIPELINE_COLORS.boundaryWall;
    if (shape.layer === 'house') strokeColor = PIPELINE_COLORS.house;
    else if (shape.layer === 'plot') strokeColor = PIPELINE_COLORS.boundaryWall;
    else if (shape.layer === 'wall') strokeColor = PIPELINE_COLORS.wall;

    fullCtx.save();
    fullCtx.strokeStyle = strokeColor;
    fullCtx.lineWidth = Math.max((shape.strokeMm || 0.25) * SCALE_FACTOR * 6, 3);
    fullCtx.lineCap = 'round';
    fullCtx.lineJoin = 'round';

    fullCtx.beginPath();
    fullCtx.moveTo(scaledVertices[0].x, scaledVertices[0].y);
    for (let i = 1; i < scaledVertices.length; i++) {
      fullCtx.lineTo(scaledVertices[i].x, scaledVertices[i].y);
    }
    if (shape.layer === 'plot' || shape.layer === 'house' || shape.layer === 'wall') {
      fullCtx.closePath();
    }
    fullCtx.stroke();
    fullCtx.restore();
  });

  // Draw driveways
  driveways.forEach(driveway => {
    if (!driveway.vertices || driveway.vertices.length === 0) return;

    const scaledVertices = driveway.vertices.map(scalePoint);

    fullCtx.save();
    fullCtx.strokeStyle = PIPELINE_COLORS.driveway;
    fullCtx.lineWidth = Math.max(4 * SCALE_FACTOR, 4);
    fullCtx.lineCap = 'round';
    fullCtx.lineJoin = 'round';

    fullCtx.beginPath();
    fullCtx.moveTo(scaledVertices[0].x, scaledVertices[0].y);
    for (let i = 1; i < scaledVertices.length; i++) {
      fullCtx.lineTo(scaledVertices[i].x, scaledVertices[i].y);
    }
    fullCtx.closePath();
    fullCtx.stroke();
    fullCtx.restore();
  });

  // Draw pathways
  pathways.forEach(pathway => {
    if (!pathway.vertices || pathway.vertices.length === 0) return;

    const scaledVertices = pathway.vertices.map(scalePoint);

    fullCtx.save();
    fullCtx.strokeStyle = PIPELINE_COLORS.pathway;
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

  // Draw patios
  patios.forEach(patio => {
    if (!patio.vertices || patio.vertices.length === 0) return;

    const scaledVertices = patio.vertices.map(scalePoint);

    fullCtx.save();
    fullCtx.strokeStyle = PIPELINE_COLORS.patio;
    fullCtx.lineWidth = Math.max(4 * SCALE_FACTOR, 4);
    fullCtx.lineCap = 'round';
    fullCtx.lineJoin = 'round';

    fullCtx.beginPath();
    fullCtx.moveTo(scaledVertices[0].x, scaledVertices[0].y);
    for (let i = 1; i < scaledVertices.length; i++) {
      fullCtx.lineTo(scaledVertices[i].x, scaledVertices[i].y);
    }
    fullCtx.closePath();
    fullCtx.stroke();
    fullCtx.restore();
  });

  // Draw doors
  doors.forEach(door => {
    if (!door.position) return;

    const scaledPos = scalePoint(door.position);
    const doorWidth = (door.width || 3) * SCALE_FACTOR * ppf;

    fullCtx.save();
    fullCtx.strokeStyle = PIPELINE_COLORS.door;
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
  const outputCtx = outputCanvas.getContext('2d');

  outputCtx.imageSmoothingEnabled = true;
  outputCtx.imageSmoothingQuality = 'high';
  outputCtx.fillStyle = '#ffffff';
  outputCtx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

  // Draw cropped portion
  outputCtx.drawImage(
    fullCanvas,
    0, cropStartY,
    scaledWidth, cropHeight,
    0, 0,
    OUTPUT_SIZE, OUTPUT_SIZE
  );

  const dataUrl = outputCanvas.toDataURL('image/png');
  console.log('✅ Image generated successfully, data URL length:', dataUrl.length);

  return dataUrl;
}
