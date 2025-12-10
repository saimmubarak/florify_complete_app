# Boundary Wall Skin Alignment Fix

## The Problem

The boundary wall skin (gray stone pattern) was:
1. **Smaller** than the wall structure line (purple line)
2. **Offset/misaligned** from the wall structure line
3. Not covering the purple line as intended

### Visual Evidence
User provided screenshot showing:
- Purple wall structure line clearly visible
- Gray wall skin much smaller and offset from the purple line
- Wall measurements: 28.0 ft, 22.4 ft, 10.0 ft

---

## Root Cause Analysis

### The Core Issue: Incorrect Coordinate Transformation

The `wall-renderer.ts` file had its own **simplified** `worldToCanvas` function:

```typescript
// INCORRECT - Simplified version (OLD)
function worldToCanvas(point: Point, viewTransform: ViewTransform, ...): Point {
  const scaledX = point.x * zoom;
  const scaledY = point.y * zoom;
  
  return {
    x: scaledX + centerX + panX,
    y: scaledY + centerY + panY,
  };
}
```

**Problem:** This function was treating `point.x` and `point.y` as if they were already in pixels, just applying zoom and pan. But they're actually in **world coordinates (feet)**!

### The Correct Transformation

The proper `worldToCanvas` function from `coordinate-math.ts`:

```typescript
// CORRECT - Proper version
export function worldToCanvas(point: Point, viewTransform: ViewTransform, editingDPI: number, ...): Point {
  const ppf = pixelsPerFoot(editingDPI);  // ← KEY: Convert feet to pixels!
  
  // Offset by A2 sheet center
  const offsetX = point.x - (A2_WIDTH_FT / 2);
  const offsetY = point.y - (A2_HEIGHT_FT / 2);
  
  // Transform with proper scaling
  return {
    x: canvasCenterX + (offsetX * ppf * zoom) + panX,
    y: canvasCenterY + (offsetY * ppf * zoom) + panY,
  };
}
```

**Key differences:**
1. ✅ Uses `pixelsPerFoot(editingDPI)` to convert feet to pixels
2. ✅ Offsets by A2 sheet center (`A2_WIDTH_FT / 2`, `A2_HEIGHT_FT / 2`)
3. ✅ Properly accounts for the A2 scale: **191.5 feet = 420mm**

---

## The Scale System

### A2 Paper Scale
- **A2 sheet dimensions:** 594mm × 420mm (portrait)
- **Scale:** 191.5 feet (real world) = 420mm (on paper)
- **Calculation:** `pixelsPerFoot(dpi) = (420mm × MM_TO_INCHES × dpi) / 191.5`

### Why This Matters
When vertices are stored in **world coordinates (feet)**, they must be converted to **canvas coordinates (pixels)** using the proper scale factor. Without this conversion:
- Wall skin appears at wrong position (offset)
- Wall skin appears at wrong size (smaller)
- Wall skin doesn't align with the structure line

---

## The Fix

### Changes Made

**File:** `client/src/lib/wall-renderer.ts`

#### 1. Import Proper Functions
```typescript
// OLD
import { type FloorplanShape, type Point, type ViewTransform, DEFAULT_EDITING_DPI } from "@shared/schema";

function worldToCanvas(...) { /* simplified version */ }

// NEW
import { type FloorplanShape, type Point, type ViewTransform, DEFAULT_EDITING_DPI } from "@shared/schema";
import { worldToCanvas, pixelsPerFoot } from "@/lib/coordinate-math";
```

#### 2. Remove Local ppf Calculation
```typescript
// OLD
const ppf = (dpi: number) => {
  const paperHeightInches = 420 * (1 / 25.4);
  const paperHeightPixels = paperHeightInches * dpi;
  return paperHeightPixels / 191.5;
};
const wallThicknessPx = wallThickness * ppf(DEFAULT_EDITING_DPI) * viewTransform.zoom;

// NEW
const wallThicknessPx = wallThickness * pixelsPerFoot(DEFAULT_EDITING_DPI) * viewTransform.zoom;
```

#### 3. Use Proper worldToCanvas
```typescript
// Now uses the correct worldToCanvas from coordinate-math.ts
const canvasVertices = shape.vertices.map(v =>
  worldToCanvas(v, viewTransform, DEFAULT_EDITING_DPI, canvasSize.width, canvasSize.height)
);
```

---

## Technical Details

### Coordinate System Layers

1. **World Coordinates (feet)**
   - Stored in database/state
   - Example: `{ x: 50.0, y: 75.0 }` = 50 feet, 75 feet
   - Used for: shape vertices, door positions, measurements

2. **Canvas Coordinates (pixels)**
   - Used for rendering on screen
   - Example: `{ x: 400, y: 600 }` = 400px, 600px
   - Accounts for: scale, zoom, pan, DPI

3. **Export Coordinates (pixels)**
   - Used for high-DPI export (PNG/PDF)
   - Example at 300 DPI: much higher resolution
   - Accounts for: scale, export DPI

### Transformation Pipeline

```
World Coords (feet)
    ↓
    ├─ Subtract A2 sheet center offset
    ├─ Multiply by pixelsPerFoot(dpi)  ← KEY STEP
    ├─ Multiply by zoom
    ├─ Add pan offset
    ↓
Canvas Coords (pixels)
```

---

## Verification

### Before Fix
- ❌ Wall skin smaller than structure line
- ❌ Wall skin offset from structure line
- ❌ Purple line visible (not covered)
- ❌ Incorrect scale conversion

### After Fix
- ✅ Wall skin matches structure line size exactly
- ✅ Wall skin aligned perfectly with structure line
- ✅ Purple line completely covered by gray skin
- ✅ Correct scale conversion (191.5ft = 420mm)

---

## Related Functions

### pixelsPerFoot(dpi)
Converts feet to pixels at given DPI, accounting for A2 scale:
```typescript
export function pixelsPerFoot(dpi: number): number {
  const paperHeightInches = A2_SHEET_HEIGHT_MM * MM_TO_INCHES;
  const paperHeightPixels = paperHeightInches * dpi;
  return paperHeightPixels / A2_HEIGHT_FT;
}
```

**At 96 DPI (editing):**
- A2 height: 420mm = 16.535 inches
- Pixels: 16.535 × 96 = 1,587.4 pixels
- Scale: 1,587.4 / 191.5 = **8.29 pixels per foot**

### worldToCanvas(point, viewTransform, editingDPI, canvasWidth, canvasHeight)
Converts world coordinates (feet) to canvas coordinates (pixels):
- Accounts for A2 sheet center offset
- Applies proper scale (pixelsPerFoot)
- Applies zoom and pan transformations

---

## Impact

### Files Modified
1. **`client/src/lib/wall-renderer.ts`**
   - Removed local `worldToCanvas` function
   - Imported proper `worldToCanvas` and `pixelsPerFoot` from `coordinate-math.ts`
   - Simplified `drawWallSkin` function

### Other Systems Using Correct Transformation
- ✅ Door rendering (`door-renderer.ts`)
- ✅ Shape rendering (`FloorplanCanvas.tsx`)
- ✅ Roof rendering
- ✅ Measurements
- ✅ Export system

### Why Wall Renderer Was Different
The wall renderer was created separately and used a simplified coordinate transformation that didn't account for the world-to-canvas conversion. This worked for some cases but failed when precise alignment was needed.

---

## Testing Checklist

### Test Boundary Wall Rendering
1. ✅ Draw a 2-sided wall (polygon tool)
2. ✅ Verify gray skin completely covers purple line
3. ✅ Verify wall skin size matches structure line
4. ✅ Verify wall skin is aligned (not offset)
5. ✅ Test at different zoom levels
6. ✅ Test with pan (drag canvas)
7. ✅ Test 1-sided, 2-sided, 3-sided, 4-sided walls

### Verify Scale
1. ✅ Wall measurements match expected values
2. ✅ Wall thickness (1.0 ft = 12 inches) appears correct
3. ✅ Stone pattern scales appropriately with zoom

---

## Summary

**Problem:** Wall skin was smaller and offset due to incorrect coordinate transformation

**Root Cause:** Using simplified `worldToCanvas` that didn't convert feet to pixels

**Solution:** Import and use proper `worldToCanvas` from `coordinate-math.ts`

**Result:** Wall skin now perfectly aligns with and covers the wall structure line

**Key Lesson:** Always use the proper coordinate transformation functions that account for the A2 scale (191.5ft = 420mm). Don't create simplified versions that skip the feet-to-pixels conversion!

