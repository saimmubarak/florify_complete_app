import { type FloorplanShape, type Point, type ViewTransform, DEFAULT_EDITING_DPI } from "@shared/schema";
import { worldToCanvas, pixelsPerFoot } from "@/lib/coordinate-math";

export function drawWallSkin(
  ctx: CanvasRenderingContext2D,
  shape: FloorplanShape,
  viewTransform: ViewTransform,
  canvasSize: { width: number; height: number },
  dpi: number = DEFAULT_EDITING_DPI
) {
  if (shape.layer !== 'wall' || shape.vertices.length < 2) return;

  // Boundary wall thickness: 1.0 feet (12 inches) - thinner as requested
  const wallThickness = 1.0;

  // Use proper pixelsPerFoot from coordinate-math (accounts for A2 scale: 191.5ft = 420mm)
  const wallThicknessPx = wallThickness * pixelsPerFoot(dpi) * viewTransform.zoom;

  ctx.save();
  ctx.lineCap = 'round'; // Use round caps for better appearance on open walls
  ctx.lineJoin = 'round'; // Use round joins for smoother corners

  // Convert vertices to canvas coordinates
  const canvasVertices = shape.vertices.map(v =>
    worldToCanvas(v, viewTransform, dpi, canvasSize.width, canvasSize.height)
  );

  // Draw base wall structure (brick red base color) - this covers the purple line
  ctx.strokeStyle = '#dc2626'; // red-600 brick base
  ctx.lineWidth = wallThicknessPx;

  ctx.beginPath();
  canvasVertices.forEach((v, i) => {
    if (i === 0) ctx.moveTo(v.x, v.y);
    else ctx.lineTo(v.x, v.y);
  });

  // Only close if it's a rectangle type
  if (shape.type === 'rectangle') {
    ctx.closePath();
  }

  ctx.stroke();

  // Draw brick pattern on top for each segment
  for (let i = 0; i < shape.vertices.length - 1; i++) {
    const v1 = canvasVertices[i];
    const v2 = canvasVertices[i + 1];
    drawBrickWallPattern(ctx, v1, v2, wallThicknessPx, viewTransform.zoom);
  }

  // Only close the polygon for rectangle type
  if (shape.type === 'rectangle') {
    const v1 = canvasVertices[canvasVertices.length - 1];
    const v2 = canvasVertices[0];
    drawBrickWallPattern(ctx, v1, v2, wallThicknessPx, viewTransform.zoom);
  }

  ctx.restore();
}

function drawBrickWallPattern(
  ctx: CanvasRenderingContext2D,
  start: Point,
  end: Point,
  thickness: number,
  zoom: number
) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length === 0) return;

  const unitX = dx / length;
  const unitY = dy / length;
  const perpX = -unitY;
  const perpY = unitX;

  ctx.save();

  // Brick dimensions (similar to driveway bricks)
  const brickLength = 8 * zoom;
  const brickHeight = 4 * zoom;
  const mortarWidth = 1 * zoom;

  // Calculate number of brick rows across the wall thickness
  const numRows = Math.max(1, Math.floor(thickness / (brickHeight + mortarWidth)));
  const actualBrickHeight = thickness / numRows;

  // Draw brick pattern along the wall
  for (let row = 0; row < numRows; row++) {
    // Offset from center line for this row
    const rowOffset = (row - (numRows - 1) / 2) * actualBrickHeight;

    // Alternate brick offset for staggered pattern (running bond)
    const startOffset = (row % 2) * (brickLength / 2);

    for (let dist = -startOffset; dist < length + brickLength; dist += brickLength + mortarWidth) {
      if (dist + brickLength < 0) continue;
      if (dist > length) break;

      const brickStart = Math.max(0, dist);
      const brickEnd = Math.min(length, dist + brickLength);
      const brickActualLength = brickEnd - brickStart;

      if (brickActualLength <= 0) continue;

      // Calculate brick corners
      const x1 = start.x + unitX * brickStart + perpX * (rowOffset - actualBrickHeight / 2);
      const y1 = start.y + unitY * brickStart + perpY * (rowOffset - actualBrickHeight / 2);
      const x2 = start.x + unitX * brickEnd + perpX * (rowOffset - actualBrickHeight / 2);
      const y2 = start.y + unitY * brickEnd + perpY * (rowOffset - actualBrickHeight / 2);
      const x3 = start.x + unitX * brickEnd + perpX * (rowOffset + actualBrickHeight / 2);
      const y3 = start.y + unitY * brickEnd + perpY * (rowOffset + actualBrickHeight / 2);
      const x4 = start.x + unitX * brickStart + perpX * (rowOffset + actualBrickHeight / 2);
      const y4 = start.y + unitY * brickStart + perpY * (rowOffset + actualBrickHeight / 2);

      // Draw individual brick with slight color variation
      const seed = Math.floor(dist) + row * 1000;
      const variation = ((seed * 9301) % 100) / 1000; // 0 to 0.1

      ctx.fillStyle = `rgba(185, 28, 28, ${0.9 + variation})`; // red-700 with variation
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x3, y3);
      ctx.lineTo(x4, y4);
      ctx.closePath();
      ctx.fill();

      // Draw mortar lines (lighter red/pink)
      ctx.strokeStyle = '#fca5a5'; // red-300 mortar
      ctx.lineWidth = mortarWidth;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x3, y3);
      ctx.lineTo(x4, y4);
      ctx.closePath();
      ctx.stroke();
    }
  }

  // Draw horizontal mortar lines between rows
  ctx.strokeStyle = '#fca5a5'; // red-300 mortar
  ctx.lineWidth = mortarWidth;

  for (let row = 1; row < numRows; row++) {
    const rowOffset = (row - (numRows - 1) / 2) * actualBrickHeight - actualBrickHeight / 2;

    ctx.beginPath();
    ctx.moveTo(start.x + perpX * rowOffset, start.y + perpY * rowOffset);
    ctx.lineTo(end.x + perpX * rowOffset, end.y + perpY * rowOffset);
    ctx.stroke();
  }

  ctx.restore();
}
