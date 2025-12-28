# Step 3: Interactive Plant Placement Canvas - Implementation Guide

## Overview
Step 3 of the garden generation pipeline displays YOLO-detected plant symbols on the user's floorplan blueprint as interactive, draggable divs with hover information.

## Files Created

### 1. Floorplan Renderer Component
**File**: `florify-frontend/src/components/FloorplanRenderer.jsx`

**Purpose**: Renders floorplan structure (walls, doors, driveways, pathways, patios) from blueprint data

**Key Features**:
- Direct SVG rendering from blueprint structure data
- Proper scaling: 1ft = 10.03px (uniform across all structures)
  - Replit coordinates: 170.5px × 300.89px (51ft × 90ft at ~3.344px/ft)
  - Display coordinates: 512px × 903.5px (51ft × 90ft at 10.03px/ft)
  - Scale conversion factor: SCALE = 3.0
- Positioning: Top-left corner at (0px, 20px)
- Renders shapes (walls/fences), doors, driveways, pathways, and patios
- Pipeline colors ("skins") for AI model compatibility:
  - House: #e48d91 (pink)
  - Boundary wall/plot: #d3a8d2 (purple/lavender)
  - Interior walls: #d3a8d2 (purple)
  - Driveway: #b9b9ba (gray)
  - Pathway: #b9b9ba (gray)
  - Patio: #f8b18e (orange/peach)
  - Door: #ffffff (white)
- Proper stroke widths for visibility:
  - Shapes: strokeMm * SCALE * 6, minimum 3px
  - Doors: 5 * SCALE, minimum 5px
  - Driveways: 4 * SCALE, minimum 4px
  - Pathways: pathway.width * SCALE * 1.5, minimum 4px
  - Patios: 4 * SCALE, minimum 4px

### 2. Plant Symbol Parser Utility
**File**: `florify-frontend/src/utils/plantSymbolParser.js`

**Purpose**: Extracts plant properties from YOLO class names

**Key Functions**:
- `extractPlantCategory(className)` - Returns 'Tree', 'Shrub', or 'Perennial'
- `extractCanopySize(className)` - Returns 1-4
- `extractHeightCategory(className)` - Returns 1-4
- `extractFloweringBool(className)` - Returns 1 (Flowering) or 0 (NONFlowering)
- `extractFruitingBool(className)` - Returns 1 (Fruiting) or 0 (NONFruiting)
- `extractFoliageType(className)` - Returns 'Evergreen' or 'Deciduous'
- `getPlantSymbolImage(category)` - Returns path to plant symbol image
- `calculateDivDiameter(category, canopySize)` - Returns diameter in pixels
- `parsePlantProperties(detection)` - Parses full plant object from YOLO detection
- `parseAllDetections(detections)` - Parses array of YOLO detections

**Coordinate System & Scale**:
- House dimensions: 51ft × 90ft
- Scale factor: 1ft = 10.03px (90ft × 10.03 = 903.5px)
- Full house canvas: 512px × 903.5px (51ft × 90ft at 10.03px/ft)
- YOLO detection window: 512px × 512px (bottom 51ft × 51ft of house)
- YOLO window offset: 391.5px from top (903.5 - 512 = 391.5px)
- Plant coordinates: YOLO coordinates (0-512) + 391.5px Y offset for display
- Plant symbols: Sized based on canopy diameter in feet
  - Shrubs: CanopySize1=2.5ft, 2=5ft, 3=9ft, 4=13ft
  - Perennials: CanopySize1=1ft, 2=2ft, 3=3ft
  - Trees: CanopySize1=10ft, 2=15ft, 3=25ft
- Display zoom: 2x default (shows full house at ~1807px height)

### 3. Planted Garden Canvas Component
**File**: `florify-frontend/src/components/PlantedGardenCanvas.jsx`

**Purpose**: Interactive canvas displaying plants on floorplan

**Features**:
- ✅ 512px × 903.5px canvas (full house: 51ft × 90ft at 10.03px/ft)
- ✅ Floorplan background displays entire house structure
- ✅ YOLO coordinate offset (391.5px) applied to plant positions
- ✅ Zoom and pan functionality (scroll to zoom, drag to pan)
- ✅ Default 2x zoom for better visibility
- ✅ Draggable plant divs (click and drag to reposition)
- ✅ Hover popup showing plant properties
- ✅ Plant symbols sized based on category and canopy size
- ✅ Real-time position updates
- ✅ Preserves house structure aspect ratio (51:90)

**Props**:
- `detections` - Array of YOLO detections from Step 2
- `blueprint` - Blueprint object containing floorplan structure data
- `floorplanImage` - URL of floorplan PNG with skins (fallback)
- `onPlantsUpdate` - Callback when plants are repositioned

**State Management**:
- `plants` - Array of parsed plant objects with positions
- `hoveredPlant` - Currently hovered plant (for popup)
- `draggedPlant` - Currently dragged plant
- `panOffset` - Canvas pan offset {x, y}
- `zoom` - Canvas zoom level (0.5 to 3)

### 4. Canvas Styling
**File**: `florify-frontend/src/components/PlantedGardenCanvas.css`

**Styling Features**:
- Responsive 600x600px container with overflow hidden
- Smooth zoom/pan transformations
- Plant hover effects (brightness + drop shadow)
- Animated popup with arrow pointing to plant
- Professional color scheme matching Florify brand (#2D6A4F)

## Plant Object Structure

Each parsed plant object contains:

```javascript
{
  // Unique identifier
  id: "plant-0",

  // From YOLO
  className: "Shrub_Height2_CanopySize2_Evergreen_Flowering_NONFruiting",
  confidence: 0.81,
  bbox: [x1, y1, x2, y2],

  // Extracted properties
  plantCategory: "Shrub",
  canopySizeCategory: 2,
  heightCategory: 2,
  floweringBool: 1,
  fruitingBool: 0,
  foliageType: "Evergreen",

  // Visual properties
  symbolImage: "/plant_symbols/Shrub_symbol.png",
  diameter: 51, // pixels

  // Position
  x: 256,
  y: 256,

  // Extra properties (filled in Step 4 - currently "NA")
  plantBotanicalName: "NA",
  plantCommonName: "NA",
  plantFlowerColor: "NA",
  plantHeight: "NA",
  plantSpread: "NA",
  plantLeafColor: "NA",
  sunExposure: "NA",
  plantingZone: "NA",
  plantPicture: "NA"
}
```

## Hover Popup Display

The popup shows:
- Plant picture (when available in Step 4)
- Plant common name (or class name if NA)
- Flower color
- Height
- Spread
- Leaf color
- Sun exposure
- Technical info: Category, Foliage type, Canopy size, Height category

## Integration with GardenDetailPage

**File**: `florify-frontend/src/pages/GardenDetailPage.jsx`

The component is integrated after Step 2 (YOLO detection) completes:

```jsx
{pipelineState.detections && pipelineState.detections.length > 0 && (
  <div style={{ marginTop: '20px', marginBottom: '20px' }}>
    <PlantedGardenCanvas
      detections={pipelineState.detections}
      floorplanImage={blueprintImages.pngWithSkins}
      onPlantsUpdate={(updatedPlants) => {
        console.log('Plants updated:', updatedPlants);
        // Store updated plant positions for Step 4
      }}
    />
  </div>
)}
```

## User Interactions

1. **Zoom**: Scroll mouse wheel to zoom in/out (0.5x to 3x)
2. **Pan**: Click and drag background to pan around canvas
3. **Move Plants**: Click and drag plant divs to reposition
4. **View Info**: Hover over plant to see popup with properties
5. **Reset View**: Click "Reset" button to reset zoom and pan

## Plant Symbol Images

Located in: `florify-frontend/plant_symbols/`
- `Tree_symbol.png`
- `Shrub_symbol.png`
- `perennial_symbol.png`

## Next Steps (Step 4)

The `onPlantsUpdate` callback provides the updated plant array with final positions. Step 4 will:
1. Match plants to DynamoDB botanical database
2. Fill in "NA" properties with real data:
   - plantBotanicalName
   - plantCommonName
   - plantFlowerColor
   - plantHeight
   - plantSpread
   - plantLeafColor
   - sunExposure
   - plantingZone
   - plantPicture (S3 URL)
3. Display enriched plant information in hover popups
4. Allow user to save final garden design

## Testing

1. Navigate to a garden with a blueprint
2. Click "Generate Garden" button
3. Wait for Steps 1 & 2 to complete
4. Step 3 canvas will appear showing plants on floorplan
5. Test zoom/pan/drag functionality
6. Hover over plants to see popups

## Critical Fix: Coordinate Alignment

**Issue**: Plants were appearing outside the floorplan due to incorrect understanding of the coordinate system and house dimensions.

**Root Cause**:
- House is 51ft × 90ft (512px × 903.5px at 10.03px/ft scale)
- YOLO detection window is only 512px × 512px (bottom 51ft × 51ft of house)
- Initial implementation tried to fit entire house in 512×512, stretching it
- Plant coordinates from YOLO (0-512) needed Y offset to align with full house

**Solution**:
- Display full house canvas at 512px × 903.5px (preserves 51:90 aspect ratio)
- YOLO window captures bottom 51ft × 51ft (512px × 512px)
- House extends 391.5px above YOLO window (903.5 - 512 = 391.5px)
- Add 391.5px Y offset to plant coordinates for correct positioning
- Plants positioned relative to full house, not just YOLO window

**Key Changes**:
```javascript
// Canvas size - full house dimensions
width: '512px'           // 51ft
height: '903.5px'        // 90ft (was: '512px')

// Background sizing - full house
backgroundSize: '512px 903.5px'  // Was: '512px 512px'

// Plant positioning - YOLO coordinates + offset
const YOLO_WINDOW_OFFSET_Y = 903.5 - 512; // 391.5px
left: `${plant.x}px`
top: `${plant.y + YOLO_WINDOW_OFFSET_Y}px`  // Add offset!

// Drag handling - convert back to YOLO coords
const yoloY = canvasY - YOLO_WINDOW_OFFSET_Y;
const clampedYoloY = Math.max(0, Math.min(512, yoloY));
```

**Critical Understanding**:
- House: 51ft × 90ft = 512px × 903.5px (at 10.03px/ft)
- YOLO window: Bottom 512px × 512px of house (51ft × 51ft)
- Top 391.5px of house is above YOLO detection window
- Plant YOLO coordinates (0-512) represent positions within bottom 51×51ft area
- To display on full house: add 391.5px offset to Y coordinate
- When dragging: subtract 391.5px to convert back to YOLO coordinates
- Aspect ratio 51:90 perfectly preserved

## Floorplan Rendering Fix: Stroke Width & Pipeline Colors

**Issue**: After implementing coordinate scaling (SCALE = 3.0), the floorplan structures were either invisible or rendering without proper visual styling ("skins").

**Root Causes**:
1. **Stroke width too small**: Using `strokeMm * SCALE` resulted in 0.25mm * 3 = 0.75px strokes (too thin to see)
2. **Missing pipeline colors**: Using raw `shape.strokeColor` from data instead of layer-based pipeline colors
3. **Incorrect rendering approach**: Driveways and patios were rendered as filled shapes instead of strokes

**Solution** (based on replit_floorplan/client/src/lib/export-canvas.ts):
1. **Correct stroke width calculation**:
   - Shapes: `Math.max(strokeMm * SCALE * 6, 3)` - multiply by 6 for visibility, minimum 3px
   - Doors: `Math.max(5 * SCALE, 5)` - minimum 5px for white doors to be visible
   - Driveways/Patios: `Math.max(4 * SCALE, 4)` - minimum 4px
   - Pathways: `Math.max(pathway.width * SCALE * 1.5, 4)` - width in feet scaled up, minimum 4px

2. **Pipeline colors for "skins"**:
   - Determine color based on `shape.layer` property (not `shape.strokeColor`)
   - Use predefined PIPELINE_COLORS for AI model compatibility
   - Colors: house=#e48d91 (pink), plot/wall=#d3a8d2 (purple), driveway/pathway=#b9b9ba (gray), patio=#f8b18e (orange), door=#ffffff (white)

3. **SVG rendering improvements**:
   - Added `strokeLinecap="round"` and `strokeLinejoin="round"` for smoother appearance
   - Render driveways, pathways, and patios as strokes (not fills) to match export-canvas.ts
   - Door rendered as line element instead of rectangle

**Files Modified**:
- [FloorplanRenderer.jsx](florify-frontend/src/components/FloorplanRenderer.jsx): Added PIPELINE_COLORS, fixed stroke widths in all render functions
- [STEP3_IMPLEMENTATION.md](STEP3_IMPLEMENTATION.md): Updated documentation with pipeline colors and stroke width formulas

## Current Status

✅ Step 3 is fully implemented and fixed
- Plant symbol parsing working
- Interactive canvas with zoom/pan working
- Coordinate alignment fixed - plants appear in exact YOLO positions
- House structure aspect ratio preserved (51ft × 90ft)
- **Floorplan rendering fixed** - proper pipeline colors and stroke widths
- Draggable plant divs working
- Hover popups displaying (with NA values for Step 4 properties)
- Frontend hot-reloaded successfully with no errors

## Frontend Server

Running at: http://localhost:5174
Status: ✅ Active with HMR (Hot Module Replacement)
