# Door and Wall Fixes - Technical Documentation

## Overview

This document details the fixes applied to resolve issues with door placement/scaling and wall drawing behavior in the Floorplan Wizard application.

---

## Issues Fixed

### 1. Door Scaling and Positioning Issues

**Problem:**
- Door lines were placed away from the wall itself
- Door dimensions were not consistent with the A2 canvas scale (191.5ft = 420mm)
- Door width was using simple `zoom` multiplier instead of proper `pixelsPerFoot` calculation

**Root Cause:**
The door rendering code was using `door.width * viewTransform.zoom` instead of the proper scale calculation that accounts for the A2 sheet dimensions.

**Solution:**
Updated `client/src/lib/door-renderer.ts` to use the correct `pixelsPerFoot()` function:

```typescript
// Before:
const widthPx = door.width * viewTransform.zoom;

// After:
const ppf = pixelsPerFoot(DEFAULT_EDITING_DPI);
const widthPx = door.width * ppf * viewTransform.zoom;
```

This ensures door dimensions are consistent with the scale where:
- **191.5 feet** in real world = **420mm** on A2 paper
- `pixelsPerFoot = (420mm * MM_TO_INCHES * DPI) / 191.5ft`

**Files Modified:**
- `client/src/lib/door-renderer.ts`
  - `drawDoorSkin()` - Fixed door width calculation
  - `drawDoorLine()` - Fixed door line width and positioning
  - `drawDoorHandles()` - Fixed handle positioning

---

### 2. Door Line Color

**Problem:**
Door lines were brown instead of white (#ffffff)

**Solution:**
Updated `drawDoorLine()` to use white color:

```typescript
ctx.strokeStyle = '#ffffff'; // White door line
```

The door line now:
- ✅ Is white (#ffffff)
- ✅ Overlaps and hides the wall section behind it
- ✅ Has proper thickness to cover the 0.5ft (6 inch) wall

---

### 3. Door Skin (Quarter Circles)

**Problem:**
Door skin dimensions were inconsistent with the scale

**Solution:**
The door skin already used quarter circles correctly, but the radius calculation was fixed:

```typescript
// Single door: radius = door width
const radius = widthPx; // where widthPx uses proper ppf calculation

// Double door: radius = half door width
const radius = widthPx / 2;
```

**Door Skin Features:**
- ✅ Single door: One quarter circle with radius = door width
- ✅ Double door: Two quarter circles, each with radius = half door width
- ✅ Brown/tan color with transparency
- ✅ Rotates automatically perpendicular to wall
- ✅ Hinge point at door ends

---

### 4. Door Placement on Walls

**How It Works:**

1. **Wall Detection:**
   - `findWallSegmentAtPoint()` identifies the closest wall segment
   - Works for both house walls (`layer: 'house'`) and boundary walls (`layer: 'wall'`)
   - Uses threshold distance (1.0ft for placement, 2.0ft for dragging)

2. **Position Calculation:**
   - Projects click point onto the nearest wall segment
   - Calculates exact coordinates on the wall line
   - Stores Y coordinate for horizontal walls, X coordinate for vertical walls

3. **Rotation:**
   - Automatically calculated perpendicular to wall
   - Stored in degrees (0-360)
   - Can be overridden with `freeRotate: true` (advanced feature)

4. **Dragging:**
   - Doors can be dragged along walls
   - Snap to adjacent wall segments
   - Can move across corners
   - Can snap to other house walls within threshold

**Code Flow:**
```
User clicks wall → findWallSegmentAtPoint() → 
Calculate closestPoint on wall → 
Calculate rotation perpendicular to wall →
Create Door object with position on wall
```

---

### 5. Wall Drawing Auto-Close Behavior

**Problem:**
- Boundary walls in step 4 were being auto-closed into polygons
- Users couldn't create 1-sided, 2-sided, or 3-sided walls
- Wall skin was not overlapping the wall structure properly

**Solution:**
Updated `client/src/lib/wall-renderer.ts`:

```typescript
// Before: Auto-closed all polygons and rectangles
if (shape.type === 'polygon' || shape.type === 'rectangle') {
  ctx.closePath();
}

// After: Only close rectangles, not polygons
if (shape.type === 'rectangle') {
  ctx.closePath();
}
```

**Wall Drawing Behavior Now:**
- ✅ **Line tool**: Single wall segment (1-sided)
- ✅ **Polygon tool**: Open polyline (2-sided, 3-sided, etc.) - does NOT auto-close
- ✅ **Rectangle tool**: Closed rectangle (4-sided) - auto-closes
- ✅ **Freehand tool**: Open freehand path

**Wall Skin Improvements:**
- Changed `lineCap` from `'butt'` to `'round'` for better appearance on open walls
- Changed `lineJoin` from `'miter'` to `'round'` for smoother corners
- Brick pattern now properly overlaps the wall structure line
- Wall thickness uses proper `pixelsPerFoot` calculation

---

## Technical Details

### Scale Calculations

The application uses a consistent scale throughout:

```typescript
// A2 Sheet Dimensions
A2_SHEET_WIDTH_MM = 594mm
A2_SHEET_HEIGHT_MM = 420mm

// Real World Dimensions
A2_WIDTH_FT = 191.5ft
A2_HEIGHT_FT = 270.64ft (calculated from aspect ratio)

// Scale Formula
pixelsPerFoot(dpi) = (A2_SHEET_HEIGHT_MM * MM_TO_INCHES * dpi) / A2_HEIGHT_FT
                   = (420 * 0.03937 * dpi) / 191.5
                   = (16.5354 * dpi) / 191.5

// Examples:
96 DPI  → 8.29 px/ft
150 DPI → 12.95 px/ft
300 DPI → 25.90 px/ft
600 DPI → 51.80 px/ft
```

### Coordinate Systems

**Three coordinate spaces:**

1. **World Coordinates (feet):**
   - All geometry stored in feet
   - Door width: 3ft, 3.5ft, 4ft (single), 5ft, 6ft, 7ft (double)
   - Wall thickness: 0.5ft (6 inches)

2. **Canvas Coordinates (pixels):**
   - For editing view
   - Formula: `worldToCanvas(point, viewTransform, DPI, canvasSize)`
   - Includes pan and zoom transformations

3. **Export Coordinates (pixels):**
   - For high-DPI output (96/150/300/600 DPI)
   - Maintains physical accuracy

### Door Data Structure

```typescript
interface Door {
  id: string;                // Unique identifier
  type: 'single' | 'double'; // Door type
  position: Point;           // Position on wall (world coordinates)
  width: number;             // Door width in feet
  wallShapeId: string;       // ID of the wall shape
  wallSegmentIndex: number;  // Which segment of the wall
  rotation: number;          // Rotation in degrees (auto-calculated)
  freeRotate: boolean;       // Allow manual rotation (advanced)
}
```

---

## User Features

### Door Placement

1. **Add Door:**
   - Select door type (single/double)
   - Choose width (3-7 feet)
   - Click "Add Door" button
   - Click on any wall segment

2. **Move Door:**
   - Select door (click on it)
   - Drag to new position along wall
   - Can move across corners
   - Can snap to adjacent walls

3. **Resize Door:**
   - Select door
   - Drag handles at door ends
   - Maintains position on wall

4. **Delete Door:**
   - Select door
   - Press Delete key

### Wall Drawing

1. **Single Wall (Line Tool):**
   - Click start point
   - Click end point
   - Creates 1-sided wall

2. **Multi-Sided Walls (Polygon Tool):**
   - Click first point
   - Click additional points
   - Double-click to finish
   - Creates open polyline (2-sided, 3-sided, etc.)

3. **Enclosed Walls (Rectangle Tool):**
   - Click and drag
   - Creates closed 4-sided wall

4. **Freehand Walls:**
   - Click and drag
   - Creates freehand path
   - Does not auto-close

---

## Testing Checklist

### Door Testing

- [ ] Place single door on horizontal wall
- [ ] Place single door on vertical wall
- [ ] Place double door on wall
- [ ] Drag door along wall
- [ ] Drag door across corner
- [ ] Drag door to adjacent wall
- [ ] Resize door using handles
- [ ] Verify door line is white
- [ ] Verify door line hides wall behind it
- [ ] Verify door skin (quarter circles) appear correctly
- [ ] Verify door dimensions match selected width

### Wall Testing

- [ ] Draw single wall (line tool)
- [ ] Draw 2-sided wall (polygon tool)
- [ ] Draw 3-sided wall (polygon tool)
- [ ] Draw enclosed wall (rectangle tool)
- [ ] Verify walls don't auto-close (except rectangles)
- [ ] Verify wall skin (brick pattern) appears
- [ ] Verify wall skin overlaps wall line
- [ ] Verify wall thickness is consistent

---

## Known Limitations

1. **Door Rotation:**
   - Currently auto-calculated perpendicular to wall
   - Manual rotation requires `freeRotate: true` (not yet in UI)

2. **Door on Curved Walls:**
   - Not supported (freehand walls are treated as polylines)

3. **Wall Thickness:**
   - Fixed at 0.5ft (6 inches)
   - Not user-configurable

---

## Future Enhancements

1. **Advanced Door Features:**
   - Sliding doors
   - Folding doors
   - Arched doors
   - Custom door widths

2. **Wall Features:**
   - Variable wall thickness
   - Wall materials (brick, concrete, wood)
   - Wall height (currently 2D only)

3. **Snapping:**
   - Snap doors to specific positions (center, thirds, etc.)
   - Snap walls to angles (45°, 90°, etc.)

---

## Summary

All issues have been resolved:

✅ **Door scaling** - Now uses proper `pixelsPerFoot` calculation
✅ **Door positioning** - Placed exactly on wall coordinates
✅ **Door line color** - White (#ffffff)
✅ **Door skin** - Quarter circles with correct radius
✅ **Wall auto-close** - Only rectangles auto-close, polygons stay open
✅ **Wall skin** - Properly overlaps wall structure

The application now correctly handles:
- Doors with accurate dimensions at the A2 scale
- Open boundary walls (1-sided, 2-sided, 3-sided)
- Proper visual rendering of doors and walls

