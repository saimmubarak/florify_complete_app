import { Pathway, Point, ViewTransform } from "@/../../shared/schema";
import { worldToCanvas, pixelsPerFoot } from "./coordinate-math";

const DEFAULT_EDITING_DPI = 96;

/**
 * Draw pathway core structure (0.25mm grey outline on edges)
 */
export function drawPathwayStructure(
  ctx: CanvasRenderingContext2D,
  pathway: Pathway,
  viewTransform: ViewTransform,
  canvasSize: { width: number; height: number },
  dpi: number = DEFAULT_EDITING_DPI
) {
  if (pathway.vertices.length < 2) return;

  const canvasVertices = pathway.vertices.map(v =>
    worldToCanvas(v, viewTransform, dpi, canvasSize.width, canvasSize.height)
  );

  const ppf = pixelsPerFoot(dpi);
  const widthPx = pathway.width * ppf * viewTransform.zoom;
  const halfWidth = widthPx / 2;

  // Calculate 0.25mm in pixels
  const MM_TO_INCHES = 0.0393701;
  const strokeWidthPx = 0.25 * MM_TO_INCHES * dpi * viewTransform.zoom;

  // Calculate smooth perpendiculars for clean edges
  const leftSide: { x: number; y: number }[] = [];
  const rightSide: { x: number; y: number }[] = [];

  for (let i = 0; i < canvasVertices.length; i++) {
    const curr = canvasVertices[i];
    let perpX = 0, perpY = 0;

    if (i === 0) {
      // First point: use direction to next point
      const next = canvasVertices[i + 1];
      const dx = next.x - curr.x;
      const dy = next.y - curr.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      perpX = -dy / len;
      perpY = dx / len;
    } else if (i === canvasVertices.length - 1) {
      // Last point: use direction from previous point
      const prev = canvasVertices[i - 1];
      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      perpX = -dy / len;
      perpY = dx / len;
    } else {
      // Middle points: average of two perpendiculars for smooth corners
      const prev = canvasVertices[i - 1];
      const next = canvasVertices[i + 1];
      const dx1 = curr.x - prev.x;
      const dy1 = curr.y - prev.y;
      const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
      const perp1X = -dy1 / len1;
      const perp1Y = dx1 / len1;

      const dx2 = next.x - curr.x;
      const dy2 = next.y - curr.y;
      const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
      const perp2X = -dy2 / len2;
      const perp2Y = dx2 / len2;

      perpX = (perp1X + perp2X) / 2;
      perpY = (perp1Y + perp2Y) / 2;
      const perpLen = Math.sqrt(perpX * perpX + perpY * perpY);
      perpX /= perpLen;
      perpY /= perpLen;
    }

    leftSide.push({ x: curr.x + perpX * halfWidth, y: curr.y + perpY * halfWidth });
    rightSide.push({ x: curr.x - perpX * halfWidth, y: curr.y - perpY * halfWidth });
  }

  ctx.save();
  ctx.strokeStyle = '#6b7280'; // Grey color
  ctx.lineWidth = Math.max(1, strokeWidthPx);
  ctx.lineCap = 'round'; // Round ends for smooth appearance
  ctx.lineJoin = 'round'; // Smooth corners

  // Draw the complete pathway outline as a single path
  ctx.beginPath();

  // Start with left edge
  ctx.moveTo(leftSide[0].x, leftSide[0].y);
  for (let i = 1; i < leftSide.length; i++) {
    ctx.lineTo(leftSide[i].x, leftSide[i].y);
  }

  // Add end cap (semicircle at the end)
  const endCenter = canvasVertices[canvasVertices.length - 1];
  const lastIdx = leftSide.length - 1;
  const endAngle = Math.atan2(leftSide[lastIdx].y - endCenter.y, leftSide[lastIdx].x - endCenter.x);
  ctx.arc(endCenter.x, endCenter.y, halfWidth, endAngle, endAngle + Math.PI, false);

  // Draw right edge in reverse (to complete the outline)
  for (let i = rightSide.length - 1; i >= 0; i--) {
    ctx.lineTo(rightSide[i].x, rightSide[i].y);
  }

  // Add start cap (semicircle at the start)
  const startCenter = canvasVertices[0];
  const startAngle = Math.atan2(rightSide[0].y - startCenter.y, rightSide[0].x - startCenter.x);
  ctx.arc(startCenter.x, startCenter.y, halfWidth, startAngle, startAngle + Math.PI, false);

  // Close the path and stroke it as one continuous line
  ctx.closePath();
  ctx.stroke();

  ctx.restore();
}

/**
 * Draw pathway skin based on surface type
 */
export function drawPathwaySkin(
  ctx: CanvasRenderingContext2D,
  pathway: Pathway,
  viewTransform: ViewTransform,
  canvasSize: { width: number; height: number },
  dpi: number = DEFAULT_EDITING_DPI
) {
  if (pathway.vertices.length < 2) return;

  switch (pathway.surfaceType) {
    case 'concrete':
      drawConcreteSkin(ctx, pathway, viewTransform, canvasSize, dpi);
      break;
    case 'pebbles':
      drawPebblesSkin(ctx, pathway, viewTransform, canvasSize, dpi);
      break;
    case 'brick':
      drawBrickSkin(ctx, pathway, viewTransform, canvasSize, dpi);
      break;
    case 'stone':
      drawStoneSkin(ctx, pathway, viewTransform, canvasSize, dpi);
      break;
  }
}

function drawConcreteSkin(
  ctx: CanvasRenderingContext2D,
  pathway: Pathway,
  viewTransform: ViewTransform,
  canvasSize: { width: number; height: number },
  dpi: number
) {
  const canvasVertices = pathway.vertices.map(v =>
    worldToCanvas(v, viewTransform, dpi, canvasSize.width, canvasSize.height)
  );

  const ppf = pixelsPerFoot(dpi);
  const widthPx = pathway.width * ppf * viewTransform.zoom;

  ctx.save();

  // Fill with light concrete gray (matching driveway)
  ctx.fillStyle = '#d4d4d8'; // zinc-300
  ctx.strokeStyle = '#d4d4d8';
  ctx.lineWidth = widthPx;
  ctx.lineCap = 'butt'; // Flat ends to prevent semi-circle effect
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(canvasVertices[0].x, canvasVertices[0].y);
  for (let i = 1; i < canvasVertices.length; i++) {
    ctx.lineTo(canvasVertices[i].x, canvasVertices[i].y);
  }
  ctx.stroke();

  // Draw expansion joints every 5 feet along the path (matching driveway style)
  ctx.strokeStyle = 'rgba(113, 113, 122, 0.3)'; // zinc-500 with transparency
  ctx.lineWidth = 1;

  let accumulatedDistance = 0;
  for (let i = 1; i < canvasVertices.length; i++) {
    const dx = canvasVertices[i].x - canvasVertices[i - 1].x;
    const dy = canvasVertices[i].y - canvasVertices[i - 1].y;
    const segmentLength = Math.sqrt(dx * dx + dy * dy);

    const worldDx = pathway.vertices[i].x - pathway.vertices[i - 1].x;
    const worldDy = pathway.vertices[i].y - pathway.vertices[i - 1].y;
    const worldSegmentLength = Math.sqrt(worldDx * worldDx + worldDy * worldDy);

    let distanceInSegment = 0;
    while (accumulatedDistance + distanceInSegment < worldSegmentLength) {
      const remainingToJoint = 5 - (accumulatedDistance % 5);
      if (remainingToJoint <= worldSegmentLength - distanceInSegment) {
        distanceInSegment += remainingToJoint;
        const t = distanceInSegment / worldSegmentLength;
        const jointX = canvasVertices[i - 1].x + dx * t;
        const jointY = canvasVertices[i - 1].y + dy * t;

        // Draw perpendicular line
        const angle = Math.atan2(dy, dx);
        const perpAngle = angle + Math.PI / 2;
        const halfWidth = widthPx / 2;

        ctx.beginPath();
        ctx.moveTo(jointX + Math.cos(perpAngle) * halfWidth, jointY + Math.sin(perpAngle) * halfWidth);
        ctx.lineTo(jointX - Math.cos(perpAngle) * halfWidth, jointY - Math.sin(perpAngle) * halfWidth);
        ctx.stroke();

        accumulatedDistance += remainingToJoint;
      } else {
        break;
      }
    }
    accumulatedDistance += worldSegmentLength - distanceInSegment;
  }

  ctx.restore();
}

function drawPebblesSkin(
  ctx: CanvasRenderingContext2D,
  pathway: Pathway,
  viewTransform: ViewTransform,
  canvasSize: { width: number; height: number },
  dpi: number
) {
  const canvasVertices = pathway.vertices.map(v =>
    worldToCanvas(v, viewTransform, dpi, canvasSize.width, canvasSize.height)
  );

  const ppf = pixelsPerFoot(dpi);
  const widthPx = pathway.width * ppf * viewTransform.zoom;

  ctx.save();

  // Fill with beige/tan base (matching driveway)
  ctx.fillStyle = '#e7e5e4'; // stone-200
  ctx.strokeStyle = '#e7e5e4';
  ctx.lineWidth = widthPx;
  ctx.lineCap = 'butt'; // Flat ends to prevent semi-circle effect
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(canvasVertices[0].x, canvasVertices[0].y);
  for (let i = 1; i < canvasVertices.length; i++) {
    ctx.lineTo(canvasVertices[i].x, canvasVertices[i].y);
  }
  ctx.stroke();

  // Create clipping path for pebbles
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(canvasVertices[0].x, canvasVertices[0].y);
  for (let i = 1; i < canvasVertices.length; i++) {
    ctx.lineTo(canvasVertices[i].x, canvasVertices[i].y);
  }
  ctx.lineWidth = widthPx;
  ctx.lineCap = 'butt'; // Flat ends to prevent semi-circle effect
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.clip();

  // Draw pebbles (smaller, more subtle pattern)
  const pebbleSize = 1.5 * viewTransform.zoom; // Reduced from 3
  const spacing = 4 * viewTransform.zoom; // Reduced from 6

  // Use deterministic random for consistent pattern
  const seed = pathway.vertices[0].x + pathway.vertices[0].y;
  let random = seed;
  const seededRandom = () => {
    random = (random * 9301 + 49297) % 233280;
    return random / 233280;
  };

  for (let i = 0; i < canvasVertices.length - 1; i++) {
    const dx = canvasVertices[i + 1].x - canvasVertices[i].x;
    const dy = canvasVertices[i + 1].y - canvasVertices[i].y;
    const segmentLength = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.ceil(segmentLength / spacing);

    for (let j = 0; j <= steps; j++) {
      const t = j / steps;
      const centerX = canvasVertices[i].x + dx * t;
      const centerY = canvasVertices[i].y + dy * t;

      // Draw pebbles across the width
      const angle = Math.atan2(dy, dx);
      const perpAngle = angle + Math.PI / 2;
      const numAcross = Math.ceil(widthPx / spacing);

      for (let k = -numAcross; k <= numAcross; k++) {
        const offsetAcross = k * spacing;
        const offsetX = (seededRandom() - 0.5) * spacing * 0.5;
        const offsetY = (seededRandom() - 0.5) * spacing * 0.5;

        const pebbleX = centerX + Math.cos(perpAngle) * offsetAcross + offsetX;
        const pebbleY = centerY + Math.sin(perpAngle) * offsetAcross + offsetY;

        // Random pebble color (matching driveway)
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
  }

  ctx.restore();
  ctx.restore();
}

function drawBrickSkin(
  ctx: CanvasRenderingContext2D,
  pathway: Pathway,
  viewTransform: ViewTransform,
  canvasSize: { width: number; height: number },
  dpi: number
) {
  const canvasVertices = pathway.vertices.map(v =>
    worldToCanvas(v, viewTransform, dpi, canvasSize.width, canvasSize.height)
  );

  const ppf = pixelsPerFoot(dpi);
  const widthPx = pathway.width * ppf * viewTransform.zoom;

  ctx.save();

  // Create a proper polygon clipping path by offsetting the path on both sides
  const halfWidth = widthPx / 2;
  const leftSide: { x: number; y: number }[] = [];
  const rightSide: { x: number; y: number }[] = [];

  for (let i = 0; i < canvasVertices.length; i++) {
    const curr = canvasVertices[i];
    let perpX = 0, perpY = 0;

    if (i === 0) {
      // First point: use direction to next point
      const next = canvasVertices[i + 1];
      const dx = next.x - curr.x;
      const dy = next.y - curr.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      perpX = -dy / len;
      perpY = dx / len;
    } else if (i === canvasVertices.length - 1) {
      // Last point: use direction from previous point
      const prev = canvasVertices[i - 1];
      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      perpX = -dy / len;
      perpY = dx / len;
    } else {
      // Middle points: average of two perpendiculars
      const prev = canvasVertices[i - 1];
      const next = canvasVertices[i + 1];
      const dx1 = curr.x - prev.x;
      const dy1 = curr.y - prev.y;
      const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
      const perp1X = -dy1 / len1;
      const perp1Y = dx1 / len1;

      const dx2 = next.x - curr.x;
      const dy2 = next.y - curr.y;
      const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
      const perp2X = -dy2 / len2;
      const perp2Y = dx2 / len2;

      perpX = (perp1X + perp2X) / 2;
      perpY = (perp1Y + perp2Y) / 2;
      const perpLen = Math.sqrt(perpX * perpX + perpY * perpY);
      perpX /= perpLen;
      perpY /= perpLen;
    }

    leftSide.push({ x: curr.x + perpX * halfWidth, y: curr.y + perpY * halfWidth });
    rightSide.push({ x: curr.x - perpX * halfWidth, y: curr.y - perpY * halfWidth });
  }

  // Fill with brick red base
  ctx.fillStyle = '#dc2626'; // red-600
  ctx.beginPath();
  ctx.moveTo(leftSide[0].x, leftSide[0].y);
  for (let i = 1; i < leftSide.length; i++) {
    ctx.lineTo(leftSide[i].x, leftSide[i].y);
  }
  for (let i = rightSide.length - 1; i >= 0; i--) {
    ctx.lineTo(rightSide[i].x, rightSide[i].y);
  }
  ctx.closePath();
  ctx.fill();

  // Create clipping path
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(leftSide[0].x, leftSide[0].y);
  for (let i = 1; i < leftSide.length; i++) {
    ctx.lineTo(leftSide[i].x, leftSide[i].y);
  }
  for (let i = rightSide.length - 1; i >= 0; i--) {
    ctx.lineTo(rightSide[i].x, rightSide[i].y);
  }
  ctx.closePath();
  ctx.clip();

  // Brick dimensions (smaller, more subtle pattern)
  const brickWidth = 5 * viewTransform.zoom; // Reduced from 8
  const brickHeight = 2.5 * viewTransform.zoom; // Reduced from 4
  const mortarWidth = 0.5 * viewTransform.zoom; // Reduced from 1

  // Get bounding box from the actual polygon
  const allPoints = [...leftSide, ...rightSide];
  const minX = Math.min(...allPoints.map(p => p.x));
  const maxX = Math.max(...allPoints.map(p => p.x));
  const minY = Math.min(...allPoints.map(p => p.y));
  const maxY = Math.max(...allPoints.map(p => p.y));

  // Draw brick pattern (matching driveway style)
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
  ctx.restore();
}

function drawStoneSkin(
  ctx: CanvasRenderingContext2D,
  pathway: Pathway,
  viewTransform: ViewTransform,
  canvasSize: { width: number; height: number },
  dpi: number
) {
  const canvasVertices = pathway.vertices.map(v =>
    worldToCanvas(v, viewTransform, dpi, canvasSize.width, canvasSize.height)
  );

  const ppf = pixelsPerFoot(dpi);
  const widthPx = pathway.width * ppf * viewTransform.zoom;

  ctx.save();

  // Create a proper polygon clipping path by offsetting the path on both sides
  const halfWidth = widthPx / 2;
  const leftSide: { x: number; y: number }[] = [];
  const rightSide: { x: number; y: number }[] = [];

  for (let i = 0; i < canvasVertices.length; i++) {
    const curr = canvasVertices[i];
    let perpX = 0, perpY = 0;

    if (i === 0) {
      // First point: use direction to next point
      const next = canvasVertices[i + 1];
      const dx = next.x - curr.x;
      const dy = next.y - curr.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      perpX = -dy / len;
      perpY = dx / len;
    } else if (i === canvasVertices.length - 1) {
      // Last point: use direction from previous point
      const prev = canvasVertices[i - 1];
      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      perpX = -dy / len;
      perpY = dx / len;
    } else {
      // Middle points: average of two perpendiculars
      const prev = canvasVertices[i - 1];
      const next = canvasVertices[i + 1];
      const dx1 = curr.x - prev.x;
      const dy1 = curr.y - prev.y;
      const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
      const perp1X = -dy1 / len1;
      const perp1Y = dx1 / len1;

      const dx2 = next.x - curr.x;
      const dy2 = next.y - curr.y;
      const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
      const perp2X = -dy2 / len2;
      const perp2Y = dx2 / len2;

      perpX = (perp1X + perp2X) / 2;
      perpY = (perp1Y + perp2Y) / 2;
      const perpLen = Math.sqrt(perpX * perpX + perpY * perpY);
      perpX /= perpLen;
      perpY /= perpLen;
    }

    leftSide.push({ x: curr.x + perpX * halfWidth, y: curr.y + perpY * halfWidth });
    rightSide.push({ x: curr.x - perpX * halfWidth, y: curr.y - perpY * halfWidth });
  }

  // Fill with stone gray base
  ctx.fillStyle = '#57534e'; // stone-600
  ctx.beginPath();
  ctx.moveTo(leftSide[0].x, leftSide[0].y);
  for (let i = 1; i < leftSide.length; i++) {
    ctx.lineTo(leftSide[i].x, leftSide[i].y);
  }
  for (let i = rightSide.length - 1; i >= 0; i--) {
    ctx.lineTo(rightSide[i].x, rightSide[i].y);
  }
  ctx.closePath();
  ctx.fill();

  // Create clipping path
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(leftSide[0].x, leftSide[0].y);
  for (let i = 1; i < leftSide.length; i++) {
    ctx.lineTo(leftSide[i].x, leftSide[i].y);
  }
  for (let i = rightSide.length - 1; i >= 0; i--) {
    ctx.lineTo(rightSide[i].x, rightSide[i].y);
  }
  ctx.closePath();
  ctx.clip();

  // Stone block dimensions (smaller, more subtle pattern)
  const avgBlockSize = 6 * viewTransform.zoom; // Reduced from 12

  // Get bounding box from the actual polygon
  const allPoints = [...leftSide, ...rightSide];
  const minX = Math.min(...allPoints.map(p => p.x));
  const maxX = Math.max(...allPoints.map(p => p.x));
  const minY = Math.min(...allPoints.map(p => p.y));
  const maxY = Math.max(...allPoints.map(p => p.y));

  // Use deterministic random for consistent pattern
  const seed = pathway.vertices[0].x + pathway.vertices[0].y;
  let random = seed;
  const seededRandom = () => {
    random = (random * 9301 + 49297) % 233280;
    return random / 233280;
  };

  // Draw irregular stone blocks (matching driveway style)
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

      // Grout lines (thinner for more subtle look)
      ctx.strokeStyle = '#292524'; // stone-800
      ctx.lineWidth = 0.5 * viewTransform.zoom; // Reduced from 1.5
      ctx.strokeRect(x, y, blockWidth, blockHeight);
    }
  }

  ctx.restore();
  ctx.restore();
}

/**
 * Find pathway at a given world point
 */
export function findPathwayAtPoint(pathways: Pathway[], point: Point): Pathway | null {
  // Check pathways in reverse order (last drawn = on top)
  for (let i = pathways.length - 1; i >= 0; i--) {
    const pathway = pathways[i];
    if (isPointNearPathway(point, pathway)) {
      return pathway;
    }
  }
  return null;
}

/**
 * Check if a point is near a pathway (within the pathway width)
 */
function isPointNearPathway(point: Point, pathway: Pathway): boolean {
  if (pathway.vertices.length < 2) return false;

  const halfWidth = pathway.width / 2;
  const threshold = halfWidth + 0.5; // Add small buffer for easier selection

  // Check distance to each segment of the pathway
  for (let i = 0; i < pathway.vertices.length - 1; i++) {
    const v1 = pathway.vertices[i];
    const v2 = pathway.vertices[i + 1];

    const dist = distanceToSegment(point, v1, v2);
    if (dist <= threshold) {
      return true;
    }
  }

  return false;
}

/**
 * Calculate distance from a point to a line segment
 */
function distanceToSegment(point: Point, v1: Point, v2: Point): number {
  const dx = v2.x - v1.x;
  const dy = v2.y - v1.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    // v1 and v2 are the same point
    const pdx = point.x - v1.x;
    const pdy = point.y - v1.y;
    return Math.sqrt(pdx * pdx + pdy * pdy);
  }

  // Calculate projection of point onto line segment
  const t = Math.max(0, Math.min(1,
    ((point.x - v1.x) * dx + (point.y - v1.y) * dy) / lengthSquared
  ));

  const projX = v1.x + t * dx;
  const projY = v1.y + t * dy;

  const pdx = point.x - projX;
  const pdy = point.y - projY;
  return Math.sqrt(pdx * pdx + pdy * pdy);
}

/**
 * Draw selection highlight for a pathway
 */
export function drawPathwaySelection(
  ctx: CanvasRenderingContext2D,
  pathway: Pathway,
  viewTransform: ViewTransform,
  canvasSize: { width: number; height: number },
  dpi: number = DEFAULT_EDITING_DPI
) {
  if (pathway.vertices.length < 2) return;

  const canvasVertices = pathway.vertices.map(v =>
    worldToCanvas(v, viewTransform, dpi, canvasSize.width, canvasSize.height)
  );

  const ppf = pixelsPerFoot(dpi);
  const widthPx = pathway.width * ppf * viewTransform.zoom;

  ctx.save();

  // Draw a thicker, semi-transparent blue outline to indicate selection
  ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)'; // blue-500 with transparency
  ctx.lineWidth = widthPx + 4; // Slightly wider than the pathway
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(canvasVertices[0].x, canvasVertices[0].y);
  for (let i = 1; i < canvasVertices.length; i++) {
    ctx.lineTo(canvasVertices[i].x, canvasVertices[i].y);
  }
  ctx.stroke();

  ctx.restore();
}

/**
 * Smooth a path by removing points that are too close together
 * and applying a simple moving average filter
 */
export function smoothPathway(vertices: Point[], minDistance: number = 0.5): Point[] {
  if (vertices.length < 3) return vertices;

  // Step 1: Remove points that are too close together
  const filtered: Point[] = [vertices[0]];
  for (let i = 1; i < vertices.length; i++) {
    const prev = filtered[filtered.length - 1];
    const curr = vertices[i];
    const dx = curr.x - prev.x;
    const dy = curr.y - prev.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist >= minDistance) {
      filtered.push(curr);
    }
  }

  // Always include the last point if it's not already there
  const last = vertices[vertices.length - 1];
  const filteredLast = filtered[filtered.length - 1];
  if (last.x !== filteredLast.x || last.y !== filteredLast.y) {
    filtered.push(last);
  }

  // Step 2: Apply simple moving average smoothing
  if (filtered.length < 3) return filtered;

  const smoothed: Point[] = [filtered[0]]; // Keep first point unchanged

  for (let i = 1; i < filtered.length - 1; i++) {
    const prev = filtered[i - 1];
    const curr = filtered[i];
    const next = filtered[i + 1];

    // Simple 3-point moving average
    smoothed.push({
      x: (prev.x + curr.x + next.x) / 3,
      y: (prev.y + curr.y + next.y) / 3,
    });
  }

  smoothed.push(filtered[filtered.length - 1]); // Keep last point unchanged

  return smoothed;
}

