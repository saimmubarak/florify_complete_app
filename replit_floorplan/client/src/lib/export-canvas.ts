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
 * Result of generating blueprint images
 */
export interface BlueprintExportResult {
  pngWithSkins: string;  // Base64 data URL of PNG with visual skins
  pngWithoutSkins: string;  // Base64 data URL of PNG without visual skins (structure only)
}

/**
 * Result of pipeline processing
 */
export interface PipelineExportResult {
  pipelineImage: string;  // Base64 data URL of 512x512 PNG for AI pipeline
  originalBounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
}

/**
 * Generate a 512x512 PNG for the AI plant placement pipeline
 * 
 * Process:
 * 1. Scale all floorplan elements uniformly by 3x
 * 2. Render the full floorplan at scaled size
 * 3. Crop to the bottom 50% of the full layout
 * 4. Fit the cropped area into a 512x512 pixel canvas
 * 
 * @param shapes - Floorplan shapes (plot, house, walls)
 * @param doors - Door elements
 * @param driveways - Driveway elements
 * @param pathways - Pathway elements
 * @param patios - Patio elements
 * @returns PipelineExportResult with 512x512 PNG data URL
 */
export async function generatePipelineImage(
  shapes: FloorplanShape[],
  doors: Door[],
  driveways: Driveway[],
  pathways: Pathway[],
  patios: Patio[]
): Promise<PipelineExportResult> {
  const SCALE_FACTOR = 3;
  const OUTPUT_SIZE = 512;
  const DPI = 150; // Use 150 DPI for good quality
  const ppf = pixelsPerFoot(DPI);
  
  // Calculate the bounding box of all elements to find content bounds
  const allVertices: { x: number; y: number }[] = [];
  
  // Collect all vertices from shapes
  shapes.forEach(shape => {
    shape.vertices.forEach(v => allVertices.push(v));
  });
  
  // Collect vertices from driveways
  driveways.forEach(driveway => {
    driveway.vertices.forEach(v => allVertices.push(v));
  });
  
  // Collect vertices from pathways
  pathways.forEach(pathway => {
    pathway.vertices.forEach(v => allVertices.push(v));
  });
  
  // Collect vertices from patios
  patios.forEach(patio => {
    patio.vertices.forEach(v => allVertices.push(v));
  });
  
  // Collect door positions
  doors.forEach(door => {
    allVertices.push(door.position);
  });
  
  // Calculate bounds
  if (allVertices.length === 0) {
    throw new Error('No elements to export');
  }
  
  const minX = Math.min(...allVertices.map(v => v.x));
  const maxX = Math.max(...allVertices.map(v => v.x));
  const minY = Math.min(...allVertices.map(v => v.y));
  const maxY = Math.max(...allVertices.map(v => v.y));
  
  // Calculate content dimensions in world units (feet)
  const contentWidth = maxX - minX;
  const contentHeight = maxY - minY;
  
  // Apply 3x scaling - this means we'll render at 3x the normal size
  const scaledWidth = contentWidth * SCALE_FACTOR * ppf;
  const scaledHeight = contentHeight * SCALE_FACTOR * ppf;
  
  // Step 1: Create a canvas for the full scaled floorplan
  // Use higher resolution for better line quality
  const fullCanvas = document.createElement('canvas');
  fullCanvas.width = scaledWidth;
  fullCanvas.height = scaledHeight;
  const fullCtx = fullCanvas.getContext('2d', { 
    willReadFrequently: false,
    alpha: false // Opaque background for better quality
  });
  
  if (!fullCtx) {
    throw new Error('Failed to get canvas context');
  }
  
  // Enable crisp rendering - disable smoothing for sharp lines
  fullCtx.imageSmoothingEnabled = true; // Keep smoothing for better quality
  fullCtx.imageSmoothingQuality = 'high';
  
  // White background
  fullCtx.fillStyle = '#ffffff';
  fullCtx.fillRect(0, 0, scaledWidth, scaledHeight);
  
  // Create a custom view transform that centers on content and applies 3x scale
  const viewTransform = {
    zoom: SCALE_FACTOR,
    panX: 0,
    panY: 0,
  };
  
  // Pipeline colors for AI model compatibility
  const PIPELINE_COLORS = {
    house: '#e48d91',      // Pink for house/building
    driveway: '#b9b9ba',   // Gray for driveway
    pathway: '#b9b9ba',    // Gray for pathway
    boundaryWall: '#d3a8d2', // Purple/lavender for boundary wall (plot)
    patio: '#f8b18e',      // Orange/peach for patio
    wall: '#d3a8d2',       // Purple for interior walls
    door: '#ffffff',       // White for doors
  };

  // We need to render with an offset so content starts at (0,0) of our canvas
  // Custom rendering function that offsets the world coordinates
  const renderWithOffset = (
    ctx: CanvasRenderingContext2D,
    offsetX: number,
    offsetY: number
  ) => {
    // Scale shapes by modifying their vertices temporarily
    const scalePoint = (p: { x: number; y: number }) => ({
      x: (p.x - offsetX) * SCALE_FACTOR * ppf,
      y: (p.y - offsetY) * SCALE_FACTOR * ppf,
    });
    
    // Draw shapes (structure only, no skins for AI pipeline)
    shapes.forEach(shape => {
      const scaledVertices = shape.vertices.map(scalePoint);
      
      // Determine color based on layer type
      let strokeColor = PIPELINE_COLORS.boundaryWall; // Default
      if (shape.layer === 'house') {
        strokeColor = PIPELINE_COLORS.house;
      } else if (shape.layer === 'plot') {
        strokeColor = PIPELINE_COLORS.boundaryWall;
      } else if (shape.layer === 'wall') {
        strokeColor = PIPELINE_COLORS.wall;
      }
      
      ctx.save();
      ctx.strokeStyle = strokeColor;
      // Increase line weight significantly for better visibility after scaling
      // Base stroke is 0.25mm, scale by 3x, then multiply by 6 for visibility
      ctx.lineWidth = Math.max(shape.strokeMm * SCALE_FACTOR * 6, 3); // Minimum 3px for visibility
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      ctx.beginPath();
      if (scaledVertices.length > 0) {
        ctx.moveTo(scaledVertices[0].x, scaledVertices[0].y);
        for (let i = 1; i < scaledVertices.length; i++) {
          ctx.lineTo(scaledVertices[i].x, scaledVertices[i].y);
        }
        // Close polygon for plot, house, and wall shapes
        if (shape.layer === 'plot' || shape.layer === 'house' || shape.layer === 'wall') {
          ctx.closePath();
        }
      }
      ctx.stroke();
      ctx.restore();
    });
    
    // Draw driveways (structure only)
    driveways.forEach(driveway => {
      const scaledVertices = driveway.vertices.map(scalePoint);
      
      ctx.save();
      ctx.strokeStyle = PIPELINE_COLORS.driveway;
      // Increased line weight for better visibility
      ctx.lineWidth = Math.max(4 * SCALE_FACTOR, 4); // Minimum 4px
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      ctx.beginPath();
      if (scaledVertices.length > 0) {
        ctx.moveTo(scaledVertices[0].x, scaledVertices[0].y);
        for (let i = 1; i < scaledVertices.length; i++) {
          ctx.lineTo(scaledVertices[i].x, scaledVertices[i].y);
        }
        ctx.closePath();
      }
      ctx.stroke();
      ctx.restore();
    });
    
    // Draw pathways (structure only)
    pathways.forEach(pathway => {
      const scaledVertices = pathway.vertices.map(scalePoint);
      
      ctx.save();
      ctx.strokeStyle = PIPELINE_COLORS.pathway;
      // Increase pathway line weight for better visibility
      ctx.lineWidth = Math.max(pathway.width * SCALE_FACTOR * ppf * 1.5, 4); // Minimum 4px
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      ctx.beginPath();
      if (scaledVertices.length > 0) {
        ctx.moveTo(scaledVertices[0].x, scaledVertices[0].y);
        for (let i = 1; i < scaledVertices.length; i++) {
          ctx.lineTo(scaledVertices[i].x, scaledVertices[i].y);
        }
      }
      ctx.stroke();
      ctx.restore();
    });
    
    // Draw patios (structure only)
    patios.forEach(patio => {
      const scaledVertices = patio.vertices.map(scalePoint);
      
      ctx.save();
      ctx.strokeStyle = PIPELINE_COLORS.patio;
      // Increased line weight for better visibility
      ctx.lineWidth = Math.max(4 * SCALE_FACTOR, 4); // Minimum 4px
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      ctx.beginPath();
      if (scaledVertices.length > 0) {
        ctx.moveTo(scaledVertices[0].x, scaledVertices[0].y);
        for (let i = 1; i < scaledVertices.length; i++) {
          ctx.lineTo(scaledVertices[i].x, scaledVertices[i].y);
        }
        ctx.closePath();
      }
      ctx.stroke();
      ctx.restore();
    });
    
    // Draw doors (structure only - simple lines)
    doors.forEach(door => {
      const scaledPos = scalePoint(door.position);
      const doorWidth = door.width * SCALE_FACTOR * ppf;
      
      ctx.save();
      ctx.strokeStyle = PIPELINE_COLORS.door; // White (#ffffff)
      // Increased line weight for better visibility - doors need to be visible on colored walls
      ctx.lineWidth = Math.max(5 * SCALE_FACTOR, 5); // Minimum 5px for white doors
      ctx.lineCap = 'round';
      
      // Draw door as a simple line
      ctx.beginPath();
      ctx.moveTo(scaledPos.x - doorWidth / 2, scaledPos.y);
      ctx.lineTo(scaledPos.x + doorWidth / 2, scaledPos.y);
      ctx.stroke();
      ctx.restore();
    });
  };
  
  // Render the full floorplan with offset so content is at origin
  renderWithOffset(fullCtx, minX, minY);
  
  // Step 2: Crop the bottom 50% of the full scaled floorplan
  // The bottom 50% means we take the lower half of the y-axis
  const cropStartY = scaledHeight / 2; // Start from middle
  const cropHeight = scaledHeight / 2; // Take bottom half
  
  // Step 3: Create the final 512x512 canvas
  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = OUTPUT_SIZE;
  outputCanvas.height = OUTPUT_SIZE;
  const outputCtx = outputCanvas.getContext('2d', { 
    willReadFrequently: false,
    alpha: false
  });
  
  if (!outputCtx) {
    throw new Error('Failed to get output canvas context');
  }
  
  // Use high-quality image smoothing for better scaling
  outputCtx.imageSmoothingEnabled = true;
  outputCtx.imageSmoothingQuality = 'high';
  
  // White background
  outputCtx.fillStyle = '#ffffff';
  outputCtx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  
  // Draw the cropped portion scaled to fit 512x512
  // We take the full width but only the bottom 50% of height
  // Using high-quality scaling to preserve line visibility
  outputCtx.drawImage(
    fullCanvas,
    0, cropStartY,           // Source x, y (start from middle height)
    scaledWidth, cropHeight, // Source width, height (full width, bottom half)
    0, 0,                    // Destination x, y
    OUTPUT_SIZE, OUTPUT_SIZE // Destination width, height (scale to 512x512)
  );
  
  // Return the result
  return {
    pipelineImage: outputCanvas.toDataURL('image/png'),
    originalBounds: {
      minX,
      minY: minY + contentHeight / 2, // Adjusted for bottom 50%
      maxX,
      maxY,
    },
  };
}

/**
 * Download the pipeline image as a 512x512 PNG file
 */
export async function downloadPipelineImage(
  shapes: FloorplanShape[],
  doors: Door[],
  driveways: Driveway[],
  pathways: Pathway[],
  patios: Patio[]
): Promise<void> {
  const result = await generatePipelineImage(shapes, doors, driveways, pathways, patios);
  
  // Convert data URL to blob and download
  const response = await fetch(result.pipelineImage);
  const blob = await response.blob();
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `pipeline-floorplan-512x512-${Date.now()}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate PNG data URLs for blueprint - both with and without skins
 * Used for S3 upload when saving to Florify
 */
export async function generateBlueprintImages(
  shapes: FloorplanShape[],
  doors: Door[],
  driveways: Driveway[],
  pathways: Pathway[],
  patios: Patio[],
  dpi: number = 150 // Use 150 DPI for balanced quality/size for web display
): Promise<BlueprintExportResult> {
  // Generate PNG with skins
  const pngWithSkins = await generatePNG(shapes, doors, driveways, pathways, patios, {
    format: 'png',
    dpi: dpi.toString() as '96' | '150' | '300' | '600',
    includeGrid: false,
    includeMeasurements: true,
    includeSkins: true,
  });

  // Generate PNG without skins (structure only)
  const pngWithoutSkins = await generatePNG(shapes, doors, driveways, pathways, patios, {
    format: 'png',
    dpi: dpi.toString() as '96' | '150' | '300' | '600',
    includeGrid: false,
    includeMeasurements: true,
    includeSkins: false,
  });

  return {
    pngWithSkins,
    pngWithoutSkins,
  };
}

/**
 * Generate PNG as data URL (without downloading)
 */
async function generatePNG(
  shapes: FloorplanShape[],
  doors: Door[],
  driveways: Driveway[],
  pathways: Pathway[],
  patios: Patio[],
  options: ExportOptions
): Promise<string> {
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

  // Return as data URL
  return canvas.toDataURL('image/png');
}

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

