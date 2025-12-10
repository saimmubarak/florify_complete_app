import { type Door, type FloorplanShape, type Point, DEFAULT_EDITING_DPI, A2_HEIGHT_FT, A2_SHEET_HEIGHT_MM, MM_TO_INCHES } from "@shared/schema";
import { type ViewTransform } from "@shared/schema";
import { worldToCanvas as wtc, pixelsPerFoot } from "@/lib/coordinate-math";

function worldToCanvas(
  point: Point,
  viewTransform: ViewTransform,
  dpi: number,
  canvasWidth: number,
  canvasHeight: number
): Point {
  return wtc(point, viewTransform, dpi, canvasWidth, canvasHeight);
}

export function findWallSegmentAtPoint(
  shapes: FloorplanShape[],
  point: Point,
  threshold: number = 1.0
): { shape: FloorplanShape; segmentIndex: number; closestPoint: Point; rotation: number } | null {
  let closestResult: { shape: FloorplanShape; segmentIndex: number; closestPoint: Point; distance: number; rotation: number } | null = null;
  
  for (const shape of shapes) {
    // Allow doors to be placed on both house walls and standalone wall shapes
    if (shape.layer !== 'house' && shape.layer !== 'wall') continue;
    
    for (let i = 0; i < shape.vertices.length; i++) {
      const j = (i + 1) % shape.vertices.length;
      if (shape.type === 'line' && i > 0) break;
      if (shape.type === 'freehand' && i >= shape.vertices.length - 1) break;
      
      const v1 = shape.vertices[i];
      const v2 = shape.vertices[j];
      
      const dx = v2.x - v1.x;
      const dy = v2.y - v1.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      
      if (length === 0) continue;
      
      const t = Math.max(0, Math.min(1, 
        ((point.x - v1.x) * dx + (point.y - v1.y) * dy) / (length * length)
      ));
      
      const closestX = v1.x + t * dx;
      const closestY = v1.y + t * dy;
      
      const dist = Math.sqrt(
        Math.pow(point.x - closestX, 2) + Math.pow(point.y - closestY, 2)
      );
      
      if (dist < threshold && (!closestResult || dist < closestResult.distance)) {
        const rotation = Math.atan2(dy, dx) * (180 / Math.PI);
        closestResult = {
          shape,
          segmentIndex: i,
          closestPoint: { x: closestX, y: closestY },
          distance: dist,
          rotation,
        };
      }
    }
  }
  
  if (closestResult) {
    return {
      shape: closestResult.shape,
      segmentIndex: closestResult.segmentIndex,
      closestPoint: closestResult.closestPoint,
      rotation: closestResult.rotation,
    };
  }
  
  return null;
}

export function drawDoorSkin(
  ctx: CanvasRenderingContext2D,
  door: Door,
  viewTransform: ViewTransform,
  canvasSize: { width: number; height: number },
  dpi: number = DEFAULT_EDITING_DPI
) {
  const pos = worldToCanvas(door.position, viewTransform, dpi, canvasSize.width, canvasSize.height);

  // Use proper pixels per foot calculation consistent with A2 scale
  const ppf = pixelsPerFoot(dpi);
  const widthPx = door.width * ppf * viewTransform.zoom;

  ctx.save();
  ctx.translate(pos.x, pos.y);
  // Rotate to align with wall (x-axis along wall, y-axis perpendicular)
  ctx.rotate((door.rotation * Math.PI) / 180);

  // Draw quarter circle(s) representing outward-opening door(s)
  // For house shapes (clockwise vertices), outside is on NEGATIVE Y side (right-hand rule)
  // So we draw arcs on negative Y to be outside the house
  const brownColor = 'rgb(139, 69, 19)'; // Fully opaque - no transparency
  const brownStroke = 'rgb(101, 67, 33)'; // Fully opaque stroke

  if (door.type === 'single') {
    // Single door: one quarter circle with radius equal to door width
    const radius = widthPx;

    ctx.fillStyle = brownColor;
    ctx.strokeStyle = brownStroke;
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    // Quarter circle: hinge at left end (-widthPx/2, 0), arc extends OUTSIDE (negative y)
    // Arc from 0° to -90° (right to down in local coordinates = outside house)
    ctx.arc(-widthPx / 2, 0, radius, 0, -Math.PI / 2, true);
    ctx.lineTo(-widthPx / 2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    // Double door: two quarter circles, each with radius = half door width
    const radius = widthPx / 2;

    ctx.fillStyle = brownColor;
    ctx.strokeStyle = brownStroke;
    ctx.lineWidth = 1.5;

    // Left door quarter circle (hinge at left end, opens outside)
    ctx.beginPath();
    ctx.arc(-widthPx / 2, 0, radius, 0, -Math.PI / 2, true);
    ctx.lineTo(-widthPx / 2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Right door quarter circle (hinge at right end, opens outside)
    ctx.beginPath();
    ctx.arc(widthPx / 2, 0, radius, -Math.PI / 2, -Math.PI, true);
    ctx.lineTo(widthPx / 2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

export function drawDoorLine(
  ctx: CanvasRenderingContext2D,
  door: Door,
  shape: FloorplanShape,
  viewTransform: ViewTransform,
  canvasSize: { width: number; height: number },
  dpi: number = DEFAULT_EDITING_DPI
) {
  const v1 = shape.vertices[door.wallSegmentIndex];
  const v2 = shape.vertices[(door.wallSegmentIndex + 1) % shape.vertices.length];

  const dx = v2.x - v1.x;
  const dy = v2.y - v1.y;
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length === 0) return;

  const unitX = dx / length;
  const unitY = dy / length;

  const halfWidth = door.width / 2;
  const start: Point = {
    x: door.position.x - unitX * halfWidth,
    y: door.position.y - unitY * halfWidth,
  };
  const end: Point = {
    x: door.position.x + unitX * halfWidth,
    y: door.position.y + unitY * halfWidth,
  };

  const startCanvas = worldToCanvas(start, viewTransform, dpi, canvasSize.width, canvasSize.height);
  const endCanvas = worldToCanvas(end, viewTransform, dpi, canvasSize.width, canvasSize.height);

  ctx.save();
  ctx.strokeStyle = '#ffffff'; // White door line

  // Door line thickness: 0.3mm (between 0.25mm and 0.35mm)
  // Convert mm to pixels at current DPI and zoom
  const doorLineThicknessMm = 0.3;
  const mmToInches = 1 / 25.4;
  const doorLineThicknessPx = doorLineThicknessMm * mmToInches * dpi * viewTransform.zoom;

  ctx.lineWidth = doorLineThicknessPx;
  ctx.lineCap = 'butt';
  ctx.beginPath();
  ctx.moveTo(startCanvas.x, startCanvas.y);
  ctx.lineTo(endCanvas.x, endCanvas.y);
  ctx.stroke();
  ctx.restore();
}

export function drawDoorHandles(
  ctx: CanvasRenderingContext2D,
  door: Door,
  viewTransform: ViewTransform,
  canvasSize: { width: number; height: number },
  dpi: number = DEFAULT_EDITING_DPI
) {
  const pos = worldToCanvas(door.position, viewTransform, dpi, canvasSize.width, canvasSize.height);

  // Use proper pixels per foot calculation
  const ppf = pixelsPerFoot(dpi);
  const widthPx = door.width * ppf * viewTransform.zoom;

  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate((door.rotation * Math.PI) / 180);

  const handleSize = 8;
  const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();

  ctx.fillStyle = `hsl(${primaryColor})`;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;

  // Draw handles at the ends of the door on the wall line
  [-widthPx / 2, widthPx / 2].forEach((x) => {
    ctx.fillRect(x - handleSize / 2, -handleSize / 2, handleSize, handleSize);
    ctx.strokeRect(x - handleSize / 2, -handleSize / 2, handleSize, handleSize);
  });

  ctx.restore();
}

export function drawDoorLabel(
  ctx: CanvasRenderingContext2D,
  door: Door,
  viewTransform: ViewTransform,
  canvasSize: { width: number; height: number }
) {
  const pos = worldToCanvas(door.position, viewTransform, DEFAULT_EDITING_DPI, canvasSize.width, canvasSize.height);

  // Use proper pixels per foot calculation
  const ppf = pixelsPerFoot(DEFAULT_EDITING_DPI);
  const widthPx = door.width * ppf * viewTransform.zoom;

  // Format door width label
  const widthFt = Math.floor(door.width);
  const widthInches = Math.round((door.width - widthFt) * 12);
  const label = widthInches > 0 ? `${widthFt}'-${widthInches}"` : `${widthFt}'`;

  // Calculate label position (outside the door, but keep text horizontal)
  const rotationRad = (door.rotation * Math.PI) / 180;
  const labelDistance = widthPx * 0.6; // Distance from door center
  const labelOffsetX = -Math.sin(rotationRad) * labelDistance;
  const labelOffsetY = -Math.cos(rotationRad) * labelDistance;

  ctx.save();
  ctx.translate(pos.x + labelOffsetX, pos.y + labelOffsetY);
  // Don't rotate - keep text horizontal

  // Draw label background (smaller font for doors)
  ctx.font = `bold ${Math.max(8, 9 * Math.min(viewTransform.zoom, 1.5))}px sans-serif`;
  const metrics = ctx.measureText(label);
  const padding = 3;
  const bgWidth = metrics.width + padding * 2;
  const bgHeight = 12;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.fillRect(-bgWidth / 2, -bgHeight / 2, bgWidth, bgHeight);

  // Draw label border
  ctx.strokeStyle = 'rgba(101, 67, 33, 0.8)';
  ctx.lineWidth = 1;
  ctx.strokeRect(-bgWidth / 2, -bgHeight / 2, bgWidth, bgHeight);

  // Draw label text
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 0, 0);

  ctx.restore();
}

export function findDoorAtPoint(
  doors: Door[],
  point: Point,
  threshold: number = 1.0
): Door | null {
  for (const door of doors) {
    const dist = Math.sqrt(
      Math.pow(point.x - door.position.x, 2) + Math.pow(point.y - door.position.y, 2)
    );
    if (dist < threshold + door.width / 2) {
      return door;
    }
  }
  return null;
}

export function findDoorHandle(
  door: Door,
  point: Point,
  viewTransform: ViewTransform,
  threshold: number = 0.5
): 'start' | 'end' | null {
  const angle = (door.rotation * Math.PI) / 180;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  
  const halfWidth = door.width / 2;
  const startPos = {
    x: door.position.x - dx * halfWidth,
    y: door.position.y - dy * halfWidth,
  };
  const endPos = {
    x: door.position.x + dx * halfWidth,
    y: door.position.y + dy * halfWidth,
  };
  
  const startDist = Math.sqrt(
    Math.pow(point.x - startPos.x, 2) + Math.pow(point.y - startPos.y, 2)
  );
  const endDist = Math.sqrt(
    Math.pow(point.x - endPos.x, 2) + Math.pow(point.y - endPos.y, 2)
  );
  
  if (startDist < threshold) return 'start';
  if (endDist < threshold) return 'end';
  return null;
}
