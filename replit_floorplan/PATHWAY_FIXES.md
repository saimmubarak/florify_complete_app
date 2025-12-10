# Pathway Drawing and Deletion Fixes

## Summary

Fixed pathway drawing and deletion behavior to make pathways work like all other objects in the floorplan application.

## Changes Made

### 1. **Pathway Selection** ✅

**File:** `client/src/lib/pathway-renderer.ts`

Added functions to detect when a user clicks on a pathway:

- `findPathwayAtPoint()` - Finds pathway at a given world point
- `isPointNearPathway()` - Checks if point is within pathway width
- `distanceToSegment()` - Calculates distance from point to line segment

**File:** `client/src/components/FloorplanCanvas.tsx`

- Added pathway selection in click handler (between patio and driveway checks)
- Pathways can now be selected by clicking on them
- Selection deselects other objects (shapes, doors, driveways, patios)

### 2. **Pathway Deletion** ✅

**File:** `client/src/components/FloorplanCanvas.tsx`

Added two ways to delete pathways:

**A. Delete Tool:**
- Click on pathway with delete tool active → pathway is removed
- Shows toast notification: "Pathway Deleted"

**B. Keyboard Deletion:**
- Select pathway → Press `Delete` or `Backspace` → pathway is removed
- Works consistently with other objects (shapes, driveways, patios)

### 3. **Line Smoothing/Stabilization** ✅

**File:** `client/src/lib/pathway-renderer.ts`

Added `smoothPathway()` function that:

- **Removes points too close together** (minimum distance: 0.3 feet)
  - Prevents micro-movements from creating jittery lines
  - Reduces vertex count for cleaner geometry

- **Applies moving average smoothing**
  - 3-point moving average filter
  - Smooths out accidental scribbles
  - Preserves start and end points exactly

**File:** `client/src/components/FloorplanCanvas.tsx`

- Applied smoothing when creating pathways
- Smoothed vertices replace raw mouse input
- Result: Clean, intentional lines instead of shaky scribbles

### 4. **Visual Selection Feedback** ✅

**File:** `client/src/lib/pathway-renderer.ts`

Added `drawPathwaySelection()` function:

- Draws semi-transparent blue outline around selected pathway
- Outline is slightly wider than pathway (width + 4px)
- Uses rounded line caps and joins for smooth appearance
- Color: `rgba(59, 130, 246, 0.5)` (blue-500 with 50% opacity)

**File:** `client/src/components/FloorplanCanvas.tsx`

- Selection highlight drawn before skin and structure
- Only visible when pathway is selected
- Provides clear visual feedback to user

### 5. **Skin Behavior** ✅

**File:** `client/src/lib/export-canvas.ts`

Pathway skin behavior already correctly implemented:

- Skin is drawn only when `options.includeSkins` is true
- Structure (0.25mm grey outline) is always drawn
- Matches behavior of other structures (driveways, patios)
- Works correctly in PDF/PNG export

## Technical Details

### Pathway Data Structure

```typescript
{
  id: string;
  width: number;           // Width in feet (user-defined)
  surfaceType: PathwaySurface; // 'concrete' | 'pebbles' | 'brick' | 'stone'
  vertices: Point[];       // Smoothed freehand path
  rotation: number;
  layer: 'pathway';
}
```

### Geometry Logic

Pathways are created from a single drawn line:

1. **User draws line** → Raw vertices captured during mouse movement
2. **Smoothing applied** → `smoothPathway()` removes jitter
3. **Parallel offset lines calculated** → Left and right edges based on width
4. **End caps added** → Semicircular caps at start and end
5. **Region filled** → Area between offset lines filled with skin color

### Selection Detection

Uses distance-to-segment algorithm:

- Calculates perpendicular distance from click point to each pathway segment
- Threshold = pathway width / 2 + 0.5 feet (small buffer for easier selection)
- Returns pathway if click is within threshold

## Testing Checklist

- [x] Pathway can be selected by clicking on it
- [x] Selected pathway shows blue highlight
- [x] Pathway can be deleted with Delete tool
- [x] Pathway can be deleted with Delete/Backspace key
- [x] Smoothing removes jittery lines
- [x] Smoothing preserves intended path shape
- [x] Pathway skin is removable in export
- [x] Pathway structure always prints
- [x] Selection works consistently with other objects

## User Experience Improvements

1. **Stable Drawing:** No more shaky, distorted pathways from small mouse movements
2. **Easy Selection:** Click anywhere on pathway to select it
3. **Clear Feedback:** Blue highlight shows which pathway is selected
4. **Consistent Deletion:** Same deletion methods as other objects
5. **Clean Export:** Skin can be hidden while structure remains visible

## Files Modified

1. `client/src/lib/pathway-renderer.ts` - Added selection, smoothing, and highlight functions
2. `client/src/components/FloorplanCanvas.tsx` - Added selection, deletion, and visual feedback
3. `client/src/lib/export-canvas.ts` - Already correct (no changes needed)

