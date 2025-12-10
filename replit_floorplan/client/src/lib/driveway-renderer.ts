import { type Driveway, type Point, type ViewTransform, DEFAULT_EDITING_DPI, DRIVEWAY_WIDTHS } from "@shared/schema";
import { worldToCanvas, pixelsPerFoot } from "@/lib/coordinate-math";

/**
 * Draw the driveway core structure (0.25mm grey lines forming rectangle)
 */
export function drawDrivewayStructure(
  ctx: CanvasRenderingContext2D,
  driveway: Driveway,
  viewTransform: ViewTransform,
  canvasSize: { width: number; height: number },
  dpi: number = DEFAULT_EDITING_DPI
) {
  if (driveway.vertices.length !== 4) return;

  // Convert vertices to canvas coordinates
  const canvasVertices = driveway.vertices.map(v =>
    worldToCanvas(v, viewTransform, dpi, canvasSize.width, canvasSize.height)
  );

  ctx.save();

  // Core structure: 0.25mm grey lines
  const strokeThicknessMm = 0.25;
  const mmToInches = 1 / 25.4;
  const strokeThicknessPx = strokeThicknessMm * mmToInches * dpi * viewTransform.zoom;

  ctx.strokeStyle = '#78716c'; // Stone gray
  ctx.lineWidth = strokeThicknessPx;
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';

  ctx.beginPath();
  ctx.moveTo(canvasVertices[0].x, canvasVertices[0].y);
  ctx.lineTo(canvasVertices[1].x, canvasVertices[1].y);
  ctx.lineTo(canvasVertices[2].x, canvasVertices[2].y);
  ctx.lineTo(canvasVertices[3].x, canvasVertices[3].y);
  ctx.closePath();
  ctx.stroke();

  ctx.restore();
}

/**
 * Draw the driveway skin based on surface type
 */
export function drawDrivewaySkin(
  ctx: CanvasRenderingContext2D,
  driveway: Driveway,
  viewTransform: ViewTransform,
  canvasSize: { width: number; height: number },
  dpi: number = DEFAULT_EDITING_DPI
) {
  if (driveway.vertices.length !== 4) return;

  // Convert vertices to canvas coordinates
  const canvasVertices = driveway.vertices.map(v =>
    worldToCanvas(v, viewTransform, dpi, canvasSize.width, canvasSize.height)
  );

  ctx.save();

  // Draw the appropriate skin based on surface type
  switch (driveway.surfaceType) {
    case 'concrete':
      drawConcreteSkin(ctx, canvasVertices, viewTransform.zoom);
      break;
    case 'pebbles':
      drawPebblesSkin(ctx, canvasVertices, viewTransform.zoom);
      break;
    case 'brick':
      drawBrickSkin(ctx, canvasVertices, viewTransform.zoom);
      break;
    case 'stone':
      drawStoneSkin(ctx, canvasVertices, viewTransform.zoom);
      break;
  }

  ctx.restore();
}

/**
 * Concrete skin: Smooth light gray with subtle texture
 */
function drawConcreteSkin(ctx: CanvasRenderingContext2D, vertices: Point[], zoom: number) {
  ctx.save();

  // Fill with light concrete gray
  ctx.fillStyle = '#d4d4d8'; // zinc-300
  ctx.beginPath();
  ctx.moveTo(vertices[0].x, vertices[0].y);
  ctx.lineTo(vertices[1].x, vertices[1].y);
  ctx.lineTo(vertices[2].x, vertices[2].y);
  ctx.lineTo(vertices[3].x, vertices[3].y);
  ctx.closePath();
  ctx.fill();

  // Add subtle expansion joints (darker lines)
  const width = Math.sqrt(
    Math.pow(vertices[1].x - vertices[0].x, 2) + 
    Math.pow(vertices[1].y - vertices[0].y, 2)
  );
  const height = Math.sqrt(
    Math.pow(vertices[3].x - vertices[0].x, 2) + 
    Math.pow(vertices[3].y - vertices[0].y, 2)
  );

  // Draw expansion joints every ~5 feet (in canvas pixels)
  const jointSpacing = 5 * pixelsPerFoot(DEFAULT_EDITING_DPI) * zoom;
  
  ctx.strokeStyle = 'rgba(113, 113, 122, 0.3)'; // zinc-500 with transparency
  ctx.lineWidth = 1;

  // Horizontal joints
  for (let y = jointSpacing; y < height; y += jointSpacing) {
    const t = y / height;
    const startX = vertices[0].x + (vertices[3].x - vertices[0].x) * t;
    const startY = vertices[0].y + (vertices[3].y - vertices[0].y) * t;
    const endX = vertices[1].x + (vertices[2].x - vertices[1].x) * t;
    const endY = vertices[1].y + (vertices[2].y - vertices[1].y) * t;
    
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Pebbles skin: Small rounded stones pattern
 */
function drawPebblesSkin(ctx: CanvasRenderingContext2D, vertices: Point[], zoom: number) {
  ctx.save();

  // Fill with beige/tan base
  ctx.fillStyle = '#e7e5e4'; // stone-200
  ctx.beginPath();
  ctx.moveTo(vertices[0].x, vertices[0].y);
  ctx.lineTo(vertices[1].x, vertices[1].y);
  ctx.lineTo(vertices[2].x, vertices[2].y);
  ctx.lineTo(vertices[3].x, vertices[3].y);
  ctx.closePath();
  ctx.fill();

  // Clip to driveway bounds
  ctx.clip();

  // Draw pebbles
  const pebbleSize = 3 * zoom;
  const spacing = 6 * zoom;
  
  const minX = Math.min(vertices[0].x, vertices[1].x, vertices[2].x, vertices[3].x);
  const maxX = Math.max(vertices[0].x, vertices[1].x, vertices[2].x, vertices[3].x);
  const minY = Math.min(vertices[0].y, vertices[1].y, vertices[2].y, vertices[3].y);
  const maxY = Math.max(vertices[0].y, vertices[1].y, vertices[2].y, vertices[3].y);

  // Use deterministic random for consistent pattern
  const seed = vertices[0].x + vertices[0].y;
  let random = seed;
  const seededRandom = () => {
    random = (random * 9301 + 49297) % 233280;
    return random / 233280;
  };

  for (let x = minX; x < maxX; x += spacing) {
    for (let y = minY; y < maxY; y += spacing) {
      const offsetX = (seededRandom() - 0.5) * spacing * 0.5;
      const offsetY = (seededRandom() - 0.5) * spacing * 0.5;
      const pebbleX = x + offsetX;
      const pebbleY = y + offsetY;
      
      // Random pebble color (various grays and tans)
      const colorChoice = seededRandom();
      if (colorChoice < 0.33) {
        ctx.fillStyle = '#a8a29e'; // stone-400
      } else if (colorChoice < 0.66) {
        ctx.fillStyle = '#78716c'; // stone-500
      } else {
        ctx.fillStyle = '#d6d3d1'; // stone-300
      }
      
      ctx.beginPath();
      ctx.arc(pebbleX, pebbleY, pebbleSize, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

/**
 * Brick skin: Classic brick paver pattern
 */
function drawBrickSkin(ctx: CanvasRenderingContext2D, vertices: Point[], zoom: number) {
  ctx.save();

  // Fill with brick red base
  ctx.fillStyle = '#dc2626'; // red-600
  ctx.beginPath();
  ctx.moveTo(vertices[0].x, vertices[0].y);
  ctx.lineTo(vertices[1].x, vertices[1].y);
  ctx.lineTo(vertices[2].x, vertices[2].y);
  ctx.lineTo(vertices[3].x, vertices[3].y);
  ctx.closePath();
  ctx.fill();

  // Clip to driveway bounds
  ctx.clip();

  // Brick dimensions (in canvas pixels)
  const brickWidth = 8 * zoom;
  const brickHeight = 4 * zoom;
  const mortarWidth = 1 * zoom;

  const minX = Math.min(vertices[0].x, vertices[1].x, vertices[2].x, vertices[3].x);
  const maxX = Math.max(vertices[0].x, vertices[1].x, vertices[2].x, vertices[3].x);
  const minY = Math.min(vertices[0].y, vertices[1].y, vertices[2].y, vertices[3].y);
  const maxY = Math.max(vertices[0].y, vertices[1].y, vertices[2].y, vertices[3].y);

  // Draw brick pattern
  let rowIndex = 0;
  for (let y = minY; y < maxY; y += brickHeight + mortarWidth) {
    const offset = (rowIndex % 2) * (brickWidth / 2);
    
    for (let x = minX - brickWidth + offset; x < maxX; x += brickWidth + mortarWidth) {
      // Draw individual brick with slight color variation
      const seed = x + y;
      const variation = ((seed * 9301) % 100) / 1000; // 0 to 0.1
      
      ctx.fillStyle = `rgba(185, 28, 28, ${0.9 + variation})`; // red-700 with variation
      ctx.fillRect(x, y, brickWidth, brickHeight);
      
      // Mortar lines (lighter)
      ctx.strokeStyle = '#fca5a5'; // red-300
      ctx.lineWidth = mortarWidth;
      ctx.strokeRect(x, y, brickWidth, brickHeight);
    }
    
    rowIndex++;
  }

  ctx.restore();
}

/**
 * Stone skin: Irregular stone blocks pattern
 */
function drawStoneSkin(ctx: CanvasRenderingContext2D, vertices: Point[], zoom: number) {
  ctx.save();

  // Fill with stone gray base
  ctx.fillStyle = '#57534e'; // stone-600
  ctx.beginPath();
  ctx.moveTo(vertices[0].x, vertices[0].y);
  ctx.lineTo(vertices[1].x, vertices[1].y);
  ctx.lineTo(vertices[2].x, vertices[2].y);
  ctx.lineTo(vertices[3].x, vertices[3].y);
  ctx.closePath();
  ctx.fill();

  // Clip to driveway bounds
  ctx.clip();

  // Stone block dimensions (irregular)
  const avgBlockSize = 12 * zoom;
  
  const minX = Math.min(vertices[0].x, vertices[1].x, vertices[2].x, vertices[3].x);
  const maxX = Math.max(vertices[0].x, vertices[1].x, vertices[2].x, vertices[3].x);
  const minY = Math.min(vertices[0].y, vertices[1].y, vertices[2].y, vertices[3].y);
  const maxY = Math.max(vertices[0].y, vertices[1].y, vertices[2].y, vertices[3].y);

  // Use deterministic random for consistent pattern
  const seed = vertices[0].x + vertices[0].y;
  let random = seed;
  const seededRandom = () => {
    random = (random * 9301 + 49297) % 233280;
    return random / 233280;
  };

  // Draw irregular stone blocks
  for (let y = minY; y < maxY; y += avgBlockSize) {
    for (let x = minX; x < maxX; x += avgBlockSize) {
      const blockWidth = avgBlockSize * (0.7 + seededRandom() * 0.6);
      const blockHeight = avgBlockSize * (0.7 + seededRandom() * 0.6);
      
      // Random stone color (various grays)
      const colorChoice = seededRandom();
      if (colorChoice < 0.25) {
        ctx.fillStyle = '#78716c'; // stone-500
      } else if (colorChoice < 0.5) {
        ctx.fillStyle = '#57534e'; // stone-600
      } else if (colorChoice < 0.75) {
        ctx.fillStyle = '#44403c'; // stone-700
      } else {
        ctx.fillStyle = '#a8a29e'; // stone-400
      }
      
      ctx.fillRect(x, y, blockWidth, blockHeight);
      
      // Grout lines
      ctx.strokeStyle = '#292524'; // stone-800
      ctx.lineWidth = 1.5 * zoom;
      ctx.strokeRect(x, y, blockWidth, blockHeight);
    }
  }

  ctx.restore();
}

