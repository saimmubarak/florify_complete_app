import { type FloorplanShape, type Door, type Driveway, type Pathway, type Patio, type ExportOptions, DEFAULT_EDITING_DPI, A2_WIDTH_FT, A2_HEIGHT_FT, MM_TO_INCHES, A2_SHEET_WIDTH_MM, A2_SHEET_HEIGHT_MM } from "@shared/schema";
import { pixelsPerFoot, worldToCanvas } from "./coordinate-math";
import { drawShape } from "./shape-renderer";
import { drawRoof } from "./roof-renderer";
import { drawWallSkin } from "./wall-renderer";
import { drawDoorLine, drawDoorSkin } from "./door-renderer";
import { drawDrivewayStructure, drawDrivewaySkin } from "./driveway-renderer";
import { drawPathwayStructure, drawPathwaySkin } from "./pathway-renderer";
import { drawPatioStructure, drawPatioSkin } from "./patio-renderer";
import jsPDF from 'jspdf';

/**
 * Export the floorplan to PNG or PDF
 */
export async function exportFloorplan(
  shapes: FloorplanShape[],
  doors: Door[],
  driveways: Driveway[],
  pathways: Pathway[],
  patios: Patio[],
  options: ExportOptions
): Promise<void> {
  const dpi = parseInt(options.dpi);
  const ppf = pixelsPerFoot(dpi);
  
  // Calculate canvas size based on A2 dimensions
  const canvasWidth = A2_WIDTH_FT * ppf;
  const canvasHeight = A2_HEIGHT_FT * ppf;
  
  // Create offscreen canvas for rendering
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }
  
  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Create a view transform for export (no zoom, no pan)
  // The canvas size exactly matches the A2 sheet dimensions in pixels
  // worldToCanvas will center the A2 sheet (0 to A2_WIDTH_FT, 0 to A2_HEIGHT_FT) on the canvas
  // Since canvas size = A2 dimensions * ppf, this works perfectly
  const viewTransform = {
    zoom: 1,
    panX: 0,
    panY: 0,
  };

  const canvasSize = {
    width: canvasWidth,
    height: canvasHeight,
  };
  
  // Draw grid if requested
  if (options.includeGrid) {
    drawGrid(ctx, canvasWidth, canvasHeight, ppf, viewTransform.zoom);
  }
  
  // Draw skins first (grass, roofs)
  shapes.forEach(shape => {
    // Draw grass skin for plot
    if (shape.layer === 'plot' && options.includeSkins) {
      drawGrassSkin(ctx, shape, viewTransform, canvasSize, dpi);
    }

    // Draw roof skin for house
    if (shape.layer === 'house' && options.includeSkins) {
      drawRoof(ctx, shape, viewTransform, canvasSize, 0.9, dpi);
    }
  });

  // Draw driveways
  driveways.forEach(driveway => {
    if (options.includeSkins) {
      drawDrivewaySkin(ctx, driveway, viewTransform, canvasSize, dpi);
    }
    drawDrivewayStructure(ctx, driveway, viewTransform, canvasSize, dpi);
  });

  // Draw pathways
  pathways.forEach(pathway => {
    if (options.includeSkins) {
      drawPathwaySkin(ctx, pathway, viewTransform, canvasSize, dpi);
    }
    drawPathwayStructure(ctx, pathway, viewTransform, canvasSize, dpi);
  });

  // Draw patios (before house walls so walls can overlap)
  patios.forEach(patio => {
    if (options.includeSkins) {
      drawPatioSkin(ctx, patio, viewTransform, canvasSize, dpi);
    }
    drawPatioStructure(ctx, patio, viewTransform, canvasSize, dpi);
  });

  // Draw shape outlines and wall skins AFTER patios (so walls overlap patio edges)
  shapes.forEach(shape => {
    // Draw shape outline (always)
    drawShape(ctx, shape, viewTransform, false, canvasSize, false, dpi);

    // Draw wall skin
    if (shape.layer === 'wall' && options.includeSkins) {
      drawWallSkin(ctx, shape, viewTransform, canvasSize, dpi);
    }
  });

  // Draw door lines first (white lines that interrupt walls)
  doors.forEach(door => {
    const wallShape = shapes.find(s => s.id === door.wallShapeId);
    if (wallShape) {
      drawDoorLine(ctx, door, wallShape, viewTransform, canvasSize, dpi);
    }
  });

  // Draw door skins AFTER pathways/driveways so they appear on top
  if (options.includeSkins) {
    doors.forEach(door => {
      drawDoorSkin(ctx, door, viewTransform, canvasSize, dpi);
    });
  }
  
  // Export based on format
  if (options.format === 'png') {
    await exportToPNG(canvas);
  } else if (options.format === 'pdf') {
    await exportToPDF(canvas, canvasWidth, canvasHeight, dpi);
  }
}

/**
 * Export canvas to PNG and download
 */
async function exportToPNG(canvas: HTMLCanvasElement): Promise<void> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to create PNG blob'));
        return;
      }
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `floorplan-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      resolve();
    }, 'image/png');
  });
}

/**
 * Export canvas to PDF and download
 * Always creates exact A2 size: 594mm × 420mm (portrait)
 * Scale: 191.5ft = 420mm
 */
async function exportToPDF(canvas: HTMLCanvasElement, width: number, height: number, dpi: number): Promise<void> {
  // Use exact A2 dimensions (portrait orientation)
  // A2 portrait: 594mm (height) × 420mm (width)
  const pdfWidthMm = A2_SHEET_HEIGHT_MM;  // 420mm (width in portrait)
  const pdfHeightMm = A2_SHEET_WIDTH_MM;  // 594mm (height in portrait)

  // Create PDF with exact A2 portrait dimensions
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a2', // Standard A2 format
  });

  // Add canvas as image to PDF, filling the entire A2 sheet
  const imgData = canvas.toDataURL('image/png');
  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidthMm, pdfHeightMm);

  // Download PDF
  pdf.save(`floorplan-${Date.now()}.pdf`);
}

/**
 * Draw grid on canvas
 */
function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number, ppf: number, zoom: number): void {
  const gridSpacing = 5 * ppf * zoom; // 5 feet grid
  
  ctx.save();
  ctx.strokeStyle = '#e5e7eb'; // gray-200
  ctx.lineWidth = 1;
  
  // Vertical lines
  for (let x = 0; x <= width; x += gridSpacing) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  
  // Horizontal lines
  for (let y = 0; y <= height; y += gridSpacing) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  
  ctx.restore();
}

/**
 * Draw grass skin for plot
 */
function drawGrassSkin(
  ctx: CanvasRenderingContext2D,
  shape: FloorplanShape,
  viewTransform: any,
  canvasSize: { width: number; height: number },
  dpi: number
): void {
  const canvasVertices = shape.vertices.map(v =>
    worldToCanvas(v, viewTransform, dpi, canvasSize.width, canvasSize.height)
  );
  
  ctx.save();
  
  // Fill with grass green
  ctx.fillStyle = '#86efac'; // green-300
  ctx.beginPath();
  ctx.moveTo(canvasVertices[0].x, canvasVertices[0].y);
  for (let i = 1; i < canvasVertices.length; i++) {
    ctx.lineTo(canvasVertices[i].x, canvasVertices[i].y);
  }
  ctx.closePath();
  ctx.fill();
  
  // Add grass texture with small lines
  ctx.clip();
  ctx.strokeStyle = 'rgba(34, 197, 94, 0.3)'; // green-500 with transparency
  ctx.lineWidth = 1;
  
  const minX = Math.min(...canvasVertices.map(v => v.x));
  const maxX = Math.max(...canvasVertices.map(v => v.x));
  const minY = Math.min(...canvasVertices.map(v => v.y));
  const maxY = Math.max(...canvasVertices.map(v => v.y));
  
  const spacing = 5 * viewTransform.zoom;
  
  for (let x = minX; x < maxX; x += spacing) {
    for (let y = minY; y < maxY; y += spacing) {
      const angle = Math.random() * Math.PI;
      const length = 3 * viewTransform.zoom;
      const x1 = x + Math.random() * spacing;
      const y1 = y + Math.random() * spacing;
      const x2 = x1 + Math.cos(angle) * length;
      const y2 = y1 + Math.sin(angle) * length;
      
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }
  
  ctx.restore();
}

