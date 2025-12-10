import { z } from "zod";

// ============================================
// COORDINATE & GEOMETRY TYPES
// ============================================

export const Point = z.object({
  x: z.number(),
  y: z.number(),
});
export type Point = z.infer<typeof Point>;

export const ViewTransform = z.object({
  panX: z.number(),
  panY: z.number(),
  zoom: z.number(),
});
export type ViewTransform = z.infer<typeof ViewTransform>;

// ============================================
// FLOORPLAN SHAPE TYPES
// ============================================

export const ShapeType = z.enum([
  'rectangle',
  'polygon',
  'line',
  'freehand',
]);
export type ShapeType = z.infer<typeof ShapeType>;

export const FloorplanShape = z.object({
  id: z.string(),
  type: ShapeType,
  vertices: z.array(Point),
  strokeMm: z.number().default(0.25),
  strokeColor: z.string().default('#000000'),
  fill: z.string().optional(),
  layer: z.string().default('default'),
  labelVisibility: z.boolean().default(true),
  lockAspect: z.boolean().default(false),
  name: z.string().optional(),
  rotation: z.number().default(0),
});
export type FloorplanShape = z.infer<typeof FloorplanShape>;

export const insertShapeSchema = FloorplanShape.omit({ id: true });
export type InsertShape = z.infer<typeof insertShapeSchema>;

export const DoorType = z.enum(['single', 'double']);
export type DoorType = z.infer<typeof DoorType>;

export const Door = z.object({
  id: z.string(),
  type: DoorType,
  position: Point,
  width: z.number(),
  wallShapeId: z.string(),
  wallSegmentIndex: z.number(),
  rotation: z.number().default(0),
  freeRotate: z.boolean().default(false),
});
export type Door = z.infer<typeof Door>;

// ============================================
// DRIVEWAY TYPES
// ============================================

export const DrivewayWidth = z.enum(['single', 'double', 'triple']);
export type DrivewayWidth = z.infer<typeof DrivewayWidth>;

export const DrivewaySurface = z.enum(['concrete', 'pebbles', 'brick', 'stone']);
export type DrivewaySurface = z.infer<typeof DrivewaySurface>;

export const Driveway = z.object({
  id: z.string(),
  widthType: DrivewayWidth,
  surfaceType: DrivewaySurface,
  vertices: z.array(Point), // 4 vertices forming a rectangle
  rotation: z.number().default(0),
  layer: z.literal('driveway'),
});
export type Driveway = z.infer<typeof Driveway>;

// Driveway width in feet based on type
export const DRIVEWAY_WIDTHS = {
  'single': 8,   // Single car driveway: 8 feet
  'double': 16,  // Double car driveway: 16 feet
  'triple': 24,  // Triple car driveway: 24 feet
} as const;

// ============================================
// PATHWAY TYPES
// ============================================

export const PathwaySurface = z.enum(['concrete', 'pebbles', 'brick', 'stone']);
export type PathwaySurface = z.infer<typeof PathwaySurface>;

export const Pathway = z.object({
  id: z.string(),
  width: z.number(), // Width in feet (user-defined)
  surfaceType: PathwaySurface,
  vertices: z.array(Point), // Freehand curved path vertices
  rotation: z.number().default(0),
  layer: z.literal('pathway'),
});
export type Pathway = z.infer<typeof Pathway>;

// ============================================
// PATIO TYPES
// ============================================

export const PatioWidth = z.enum(['small', 'medium', 'large']);
export type PatioWidth = z.infer<typeof PatioWidth>;

export const PatioSurface = z.enum(['wooden', 'marble', 'concrete']);
export type PatioSurface = z.infer<typeof PatioSurface>;

export const Patio = z.object({
  id: z.string(),
  widthType: PatioWidth,
  surfaceType: PatioSurface,
  vertices: z.array(Point), // 4 vertices forming a rectangle
  rotation: z.number().default(0),
  layer: z.literal('patio'),
});
export type Patio = z.infer<typeof Patio>;

// Patio width in feet based on type
export const PATIO_WIDTHS = {
  'small': 8,   // Small patio: 8 feet
  'medium': 12, // Medium patio: 12 feet
  'large': 16,  // Large patio: 16 feet
} as const;

// ============================================
// WIZARD & PROJECT TYPES
// ============================================

export const WizardStep = z.enum([
  'plot-size',
  'house-shape',
  'add-doors',
  'walls',
  'add-driveways',
  'add-pathways',
  'add-patios',
  'export-save',
]);
export type WizardStep = z.infer<typeof WizardStep>;

export const FloorplanProject = z.object({
  id: z.string(),
  name: z.string(),
  currentStep: WizardStep,
  shapes: z.array(FloorplanShape),
  doors: z.array(Door).default([]),
  driveways: z.array(Driveway).default([]),
  pathways: z.array(Pathway).default([]),
  patios: z.array(Patio).default([]),
  viewTransform: ViewTransform,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type FloorplanProject = z.infer<typeof FloorplanProject>;

export const insertProjectSchema = FloorplanProject.omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertProject = z.infer<typeof insertProjectSchema>;

// ============================================
// TOOL & INTERACTION TYPES
// ============================================

export const ToolType = z.enum([
  'select',
  'line',
  'rectangle',
  'polygon',
  'freehand',
  'pan',
  'delete',
]);
export type ToolType = z.infer<typeof ToolType>;

export const HandleType = z.enum([
  'nw', 'n', 'ne',
  'e',
  'se', 's', 'sw',
  'w',
  'center',
  'rotate',
]);
export type HandleType = z.infer<typeof HandleType>;

export const TransformMode = z.enum([
  'translate',
  'scale-axis',
  'corner-drag',
  'rotate',
]);
export type TransformMode = z.infer<typeof TransformMode>;

export const TransformSession = z.object({
  mode: TransformMode,
  shapeId: z.string(),
  handleType: HandleType,
  anchor: Point,
  initialVertices: z.array(Point),
  modifiers: z.object({
    shift: z.boolean(),
    alt: z.boolean(),
    ctrl: z.boolean(),
  }),
});
export type TransformSession = z.infer<typeof TransformSession>;

export const PolylineDrawingState = z.object({
  isActive: z.boolean(),
  vertices: z.array(Point),
  toolType: ToolType,
  isClosed: z.boolean(),
});
export type PolylineDrawingState = z.infer<typeof PolylineDrawingState>;

// ============================================
// UNDO/REDO COMMAND TYPES
// ============================================

export const Command = z.object({
  type: z.enum(['create', 'update', 'delete', 'transform']),
  shapeId: z.string(),
  before: FloorplanShape.optional(),
  after: FloorplanShape.optional(),
  timestamp: z.string(),
});
export type Command = z.infer<typeof Command>;

// ============================================
// EXPORT TYPES
// ============================================

export const ExportFormat = z.enum(['png', 'pdf']);
export type ExportFormat = z.infer<typeof ExportFormat>;

export const ExportDPI = z.enum(['96', '150', '300', '600']);
export type ExportDPI = z.infer<typeof ExportDPI>;

export const ExportOptions = z.object({
  format: ExportFormat,
  dpi: ExportDPI,
  includeGrid: z.boolean().default(false),
  includeMeasurements: z.boolean().default(true),
  includeSkins: z.boolean().default(true), // Include visual skins (textures)
});
export type ExportOptions = z.infer<typeof ExportOptions>;

// ============================================
// CONSTANTS
// ============================================

export const DEFAULT_EDITING_DPI = 96;
export const SNAP_THRESHOLD_FT = 0.5;
export const GRID_SPACING_FT = 5;
export const MM_TO_INCHES = 1 / 25.4;

// A2 sheet dimensions: 594mm x 420mm (portrait)
// Scale: 191.5ft in real world = 420mm on paper
export const A2_SHEET_WIDTH_MM = 594;
export const A2_SHEET_HEIGHT_MM = 420;

// Real world dimensions that fit on A2 sheet at the specified scale (portrait orientation)
export const A2_WIDTH_FT = 191.5; // Width matches the scale requirement
export const A2_HEIGHT_FT = 191.5 * (A2_SHEET_WIDTH_MM / A2_SHEET_HEIGHT_MM); // ~270.64 ft

// Drawing area bounds (world coordinates in feet)
export const SHEET_BOUNDS = {
  minX: 0,
  minY: 0,
  maxX: A2_WIDTH_FT,
  maxY: A2_HEIGHT_FT,
};

// Preset plot sizes
export const PRESET_PLOTS = {
  '1-kanal': { width: 50, height: 90, name: '1 Kanal' },
  '10-marla': { width: 35, height: 65, name: '10 Marla' },
  '5-marla': { width: 25, height: 45, name: '5 Marla' },
};

// Step-based color mapping
export const STEP_COLORS = {
  'plot-size': '#1e3a8a',     // Dark blue for plot boundary
  'house-shape': '#9a3412',   // Brick red for house
  'add-doors': '#4b5563',     // Gray for doors
  'walls': '#9333ea',         // Purple for walls
  'add-driveways': '#78716c', // Stone gray for driveways
  'add-pathways': '#92400e',  // Brown for pathways
  'add-patios': '#ea580c',    // Orange for patios
  'export-save': '#000000',   // Black for export
} as const;
