import { Patio, Point, ViewTransform } from "@/../../shared/schema";
import { worldToCanvas, pixelsPerFoot } from "./coordinate-math";

const DEFAULT_EDITING_DPI = 96;

/**
 * Draw patio core structure (0.25mm orange outline)
 * Exactly matches driveway structure drawing, but with orange color
 */
export function drawPatioStructure(
  ctx: CanvasRenderingContext2D,
  patio: Patio,
  viewTransform: ViewTransform,
  canvasSize: { width: number; height: number },
  dpi: number = DEFAULT_EDITING_DPI
) {
  if (patio.vertices.length !== 4) return;

  // Convert vertices to canvas coordinates
  const canvasVertices = patio.vertices.map(v =>
    worldToCanvas(v, viewTransform, dpi, canvasSize.width, canvasSize.height)
  );

  // Calculate 0.25mm in pixels (matching driveway rendering exactly)
  const strokeThicknessMm = 0.25;
  const mmToInches = 1 / 25.4;
  const strokeWidthPx = strokeThicknessMm * mmToInches * dpi * viewTransform.zoom;

  ctx.save();
  ctx.strokeStyle = '#ea580c'; // Orange color (only difference from driveway)
  ctx.lineWidth = Math.max(1.5, strokeWidthPx);
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';

  // Draw rectangle outline
  ctx.beginPath();
  ctx.moveTo(canvasVertices[0].x, canvasVertices[0].y);
  for (let i = 1; i < canvasVertices.length; i++) {
    ctx.lineTo(canvasVertices[i].x, canvasVertices[i].y);
  }
  ctx.closePath();
  ctx.stroke();

  ctx.restore();
}

/**
 * Draw patio skin (visual texture based on surface type)
 */
export function drawPatioSkin(
  ctx: CanvasRenderingContext2D,
  patio: Patio,
  viewTransform: ViewTransform,
  canvasSize: { width: number; height: number },
  dpi: number = DEFAULT_EDITING_DPI
) {
  if (patio.vertices.length !== 4) return;

  const canvasVertices = patio.vertices.map(v =>
    worldToCanvas(v, viewTransform, dpi, canvasSize.width, canvasSize.height)
  );

  ctx.save();

  // Create clipping region for the patio rectangle
  ctx.beginPath();
  ctx.moveTo(canvasVertices[0].x, canvasVertices[0].y);
  for (let i = 1; i < canvasVertices.length; i++) {
    ctx.lineTo(canvasVertices[i].x, canvasVertices[i].y);
  }
  ctx.closePath();
  ctx.clip();

  // Calculate bounding box
  const xs = canvasVertices.map(v => v.x);
  const ys = canvasVertices.map(v => v.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  // Draw pattern based on surface type
  switch (patio.surfaceType) {
    case 'wooden':
      drawWoodenPattern(ctx, minX, minY, maxX, maxY, viewTransform);
      break;
    case 'marble':
      drawMarblePattern(ctx, minX, minY, maxX, maxY, viewTransform);
      break;
    case 'concrete':
      drawConcretePattern(ctx, minX, minY, maxX, maxY, viewTransform);
      break;
  }

  ctx.restore();
}

/**
 * Draw wooden plank pattern
 */
function drawWoodenPattern(
  ctx: CanvasRenderingContext2D,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  viewTransform: ViewTransform
) {
  const plankWidth = 60 * viewTransform.zoom; // Width of each plank
  const plankHeight = 8 * viewTransform.zoom; // Height of each plank

  ctx.fillStyle = '#d4a574'; // Light wood color
  ctx.fillRect(minX, minY, maxX - minX, maxY - minY);

  ctx.strokeStyle = '#8b6f47'; // Darker wood grain
  ctx.lineWidth = Math.max(0.5, 1 * viewTransform.zoom);

  // Draw horizontal planks
  for (let y = minY; y < maxY; y += plankHeight) {
    ctx.beginPath();
    ctx.moveTo(minX, y);
    ctx.lineTo(maxX, y);
    ctx.stroke();

    // Draw vertical separators (staggered)
    const offset = ((y - minY) / plankHeight) % 2 === 0 ? 0 : plankWidth / 2;
    for (let x = minX + offset; x < maxX; x += plankWidth) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, Math.min(y + plankHeight, maxY));
      ctx.stroke();
    }
  }
}

/**
 * Draw marble tile pattern
 */
function drawMarblePattern(
  ctx: CanvasRenderingContext2D,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  viewTransform: ViewTransform
) {
  const tileSize = 20 * viewTransform.zoom; // Size of each marble tile

  ctx.fillStyle = '#f5f5f5'; // Light marble color
  ctx.fillRect(minX, minY, maxX - minX, maxY - minY);

  ctx.strokeStyle = '#d1d5db'; // Grout lines
  ctx.lineWidth = Math.max(0.5, 1 * viewTransform.zoom);

  // Draw grid of tiles
  for (let y = minY; y < maxY; y += tileSize) {
    ctx.beginPath();
    ctx.moveTo(minX, y);
    ctx.lineTo(maxX, y);
    ctx.stroke();
  }

  for (let x = minX; x < maxX; x += tileSize) {
    ctx.beginPath();
    ctx.moveTo(x, minY);
    ctx.lineTo(x, maxY);
    ctx.stroke();
  }

  // Add subtle marble veining
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = Math.max(0.3, 0.5 * viewTransform.zoom);
  
  for (let y = minY; y < maxY; y += tileSize) {
    for (let x = minX; x < maxX; x += tileSize) {
      // Random diagonal veins
      if (Math.random() > 0.5) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + tileSize, y + tileSize);
        ctx.stroke();
      }
    }
  }
}

/**
 * Draw concrete pattern
 */
function drawConcretePattern(
  ctx: CanvasRenderingContext2D,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  viewTransform: ViewTransform
) {
  const slabSize = 30 * viewTransform.zoom; // Size of each concrete slab

  ctx.fillStyle = '#d6d3d1'; // Concrete color
  ctx.fillRect(minX, minY, maxX - minX, maxY - minY);

  ctx.strokeStyle = '#a8a29e'; // Joint lines
  ctx.lineWidth = Math.max(0.5, 1.5 * viewTransform.zoom);

  // Draw grid of concrete slabs
  for (let y = minY; y < maxY; y += slabSize) {
    ctx.beginPath();
    ctx.moveTo(minX, y);
    ctx.lineTo(maxX, y);
    ctx.stroke();
  }

  for (let x = minX; x < maxX; x += slabSize) {
    ctx.beginPath();
    ctx.moveTo(x, minY);
    ctx.lineTo(x, maxY);
    ctx.stroke();
  }

  // Add texture with random dots
  ctx.fillStyle = '#a8a29e';
  for (let y = minY; y < maxY; y += 5 * viewTransform.zoom) {
    for (let x = minX; x < maxX; x += 5 * viewTransform.zoom) {
      if (Math.random() > 0.7) {
        ctx.beginPath();
        ctx.arc(x, y, Math.max(0.5, 0.8 * viewTransform.zoom), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

/**
 * Draw patio handles for transformation
 */
export function drawPatioHandles(
  ctx: CanvasRenderingContext2D,
  patio: Patio,
  viewTransform: ViewTransform,
  hoveredHandle: { shapeId: string; handle: string } | null,
  canvasSize: { width: number; height: number },
  dpi: number = DEFAULT_EDITING_DPI
) {
  if (patio.vertices.length < 3) return;

  const canvasVertices = patio.vertices.map(v =>
    worldToCanvas(v, viewTransform, dpi, canvasSize.width, canvasSize.height)
  );

  ctx.save();

  // Draw edge midpoint handles (for stretching)
  for (let i = 0; i < canvasVertices.length; i++) {
    const j = (i + 1) % canvasVertices.length;
    const midX = (canvasVertices[i].x + canvasVertices[j].x) / 2;
    const midY = (canvasVertices[i].y + canvasVertices[j].y) / 2;

    const isHovered = hoveredHandle?.shapeId === patio.id && hoveredHandle?.handle === `edge-${i}`;

    ctx.fillStyle = isHovered ? '#fb923c' : '#ea580c'; // Orange, lighter when hovered
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;

    // Draw circular handle at edge midpoint
    ctx.beginPath();
    ctx.arc(midX, midY, isHovered ? 7 : 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Draw vertex handles (corner handles)
  canvasVertices.forEach((vertex, index) => {
    const isHovered = hoveredHandle?.shapeId === patio.id && hoveredHandle?.handle === `vertex-${index}`;

    ctx.fillStyle = isHovered ? '#fb923c' : '#ea580c'; // Orange, lighter when hovered
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(vertex.x, vertex.y, isHovered ? 8 : 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });

  ctx.restore();
}

/**
 * Find patio at a given point
 */
export function findPatioAtPoint(patios: Patio[], point: Point): Patio | null {
  for (let i = patios.length - 1; i >= 0; i--) {
    const patio = patios[i];
    if (isPointInPatio(point, patio)) {
      return patio;
    }
  }
  return null;
}

/**
 * Check if a point is inside a patio polygon
 */
function isPointInPatio(point: Point, patio: Patio): boolean {
  if (patio.vertices.length < 3) return false;

  // Check bounding box with tolerance first
  const tolerance = 0.5; // feet
  const bounds = {
    min: {
      x: Math.min(...patio.vertices.map(v => v.x)) - tolerance,
      y: Math.min(...patio.vertices.map(v => v.y)) - tolerance,
    },
    max: {
      x: Math.max(...patio.vertices.map(v => v.x)) + tolerance,
      y: Math.max(...patio.vertices.map(v => v.y)) + tolerance,
    },
  };

  if (point.x < bounds.min.x || point.x > bounds.max.x ||
      point.y < bounds.min.y || point.y > bounds.max.y) {
    return false;
  }

  // Use ray casting for accurate point-in-polygon test
  return pointInPolygon(point, patio.vertices);
}

/**
 * Ray casting algorithm for point-in-polygon test
 */
function pointInPolygon(point: Point, vertices: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i].x, yi = vertices[i].y;
    const xj = vertices[j].x, yj = vertices[j].y;

    const intersect = ((yi > point.y) !== (yj > point.y))
        && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Find patio handle at a given canvas point
 */
export function findPatioHandle(
  patio: Patio,
  canvasPoint: Point,
  viewTransform: ViewTransform,
  canvasSize: { width: number; height: number }
): string | null {
  const canvasVertices = patio.vertices.map(v =>
    worldToCanvas(v, viewTransform, DEFAULT_EDITING_DPI, canvasSize.width, canvasSize.height)
  );

  const handleRadius = 10; // pixels

  // Check vertex handles first (higher priority)
  for (let i = 0; i < canvasVertices.length; i++) {
    const vertex = canvasVertices[i];
    const dist = Math.sqrt(
      Math.pow(canvasPoint.x - vertex.x, 2) + Math.pow(canvasPoint.y - vertex.y, 2)
    );
    if (dist <= handleRadius) {
      return `vertex-${i}`;
    }
  }

  // Check edge midpoint handles
  for (let i = 0; i < canvasVertices.length; i++) {
    const j = (i + 1) % canvasVertices.length;
    const midX = (canvasVertices[i].x + canvasVertices[j].x) / 2;
    const midY = (canvasVertices[i].y + canvasVertices[j].y) / 2;

    const dist = Math.sqrt(
      Math.pow(canvasPoint.x - midX, 2) + Math.pow(canvasPoint.y - midY, 2)
    );
    if (dist <= handleRadius) {
      return `edge-${i}`;
    }
  }

  return null;
}

/**
 * Draw length labels for patio edges
 */
export function drawPatioLabels(
  ctx: CanvasRenderingContext2D,
  patio: Patio,
  viewTransform: ViewTransform,
  canvasSize: { width: number; height: number }
) {
  if (patio.vertices.length < 3) return;

  ctx.save();

  for (let i = 0; i < patio.vertices.length; i++) {
    const j = (i + 1) % patio.vertices.length;

    const start = worldToCanvas(patio.vertices[i], viewTransform, DEFAULT_EDITING_DPI, canvasSize.width, canvasSize.height);
    const end = worldToCanvas(patio.vertices[j], viewTransform, DEFAULT_EDITING_DPI, canvasSize.width, canvasSize.height);

    // Calculate edge length in feet
    const dx = patio.vertices[j].x - patio.vertices[i].x;
    const dy = patio.vertices[j].y - patio.vertices[i].y;
    const length = Math.sqrt(dx * dx + dy * dy);

    // Calculate midpoint for label
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;

    // Calculate angle for label positioning
    const angle = Math.atan2(end.y - start.y, end.x - start.x);

    // Calculate offset position based on edge orientation
    const isHorizontal = Math.abs(Math.cos(angle)) > Math.abs(Math.sin(angle));
    const offsetDistance = 20; // pixels

    let labelX = midX;
    let labelY = midY;

    if (isHorizontal) {
      // For horizontal edges, place label above or below
      labelY = midY - offsetDistance;
    } else {
      // For vertical edges, place label to the left or right
      labelX = midX - offsetDistance;
    }

    // Format label
    const label = `${length.toFixed(1)} ft`;
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const metrics = ctx.measureText(label);
    const padding = 4;
    const bgWidth = metrics.width + padding * 2;
    const bgHeight = 16;

    // Draw background
    ctx.fillStyle = 'rgba(234, 88, 12, 0.9)'; // Orange background
    ctx.fillRect(labelX - bgWidth / 2, labelY - bgHeight / 2, bgWidth, bgHeight);

    // Draw text
    ctx.fillStyle = '#ffffff';
    ctx.fillText(label, labelX, labelY);
  }

  ctx.restore();
}

