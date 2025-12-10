import { type FloorplanShape, type ViewTransform, DEFAULT_EDITING_DPI } from "@shared/schema";
import { worldToCanvas } from "./coordinate-math";

export function drawShape(
  ctx: CanvasRenderingContext2D,
  shape: FloorplanShape,
  viewTransform: ViewTransform,
  isSelected: boolean,
  canvasSize: { width: number; height: number },
  isHovered: boolean = false,
  dpi: number = DEFAULT_EDITING_DPI
) {
  if (shape.vertices.length < 2) return;

  const canvasVertices = shape.vertices.map(v => worldToCanvas(v, viewTransform, dpi, canvasSize.width, canvasSize.height));
  
  // Calculate center in canvas coordinates
  const xs = canvasVertices.map(v => v.x);
  const ys = canvasVertices.map(v => v.y);
  const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
  const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;

  ctx.save();
  
  // Apply rotation if present
  if (shape.rotation) {
    ctx.translate(centerX, centerY);
    ctx.rotate(shape.rotation * Math.PI / 180);
    ctx.translate(-centerX, -centerY);
  }

  ctx.strokeStyle = shape.strokeColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(canvasVertices[0].x, canvasVertices[0].y);

  for (let i = 1; i < canvasVertices.length; i++) {
    ctx.lineTo(canvasVertices[i].x, canvasVertices[i].y);
  }

  // Only auto-close rectangles
  // For polygons in 'wall' layer, don't auto-close (allows 1-sided, 2-sided, 3-sided walls)
  // For polygons in other layers (plot, house), auto-close
  if (shape.type === 'rectangle') {
    ctx.closePath();
  } else if (shape.type === 'polygon' && shape.layer !== 'wall') {
    ctx.closePath();
  }

  ctx.stroke();

  if (isSelected) {
    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
    ctx.strokeStyle = `hsl(${primaryColor})`;
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
  } else if (isHovered) {
    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
    ctx.strokeStyle = `hsl(${primaryColor} / 0.4)`;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  
  ctx.restore();
}

