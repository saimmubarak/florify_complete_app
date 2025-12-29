# Understanding Negative Coordinates with Overflow Hidden

## How Negative Coordinates Work in CSS

When an element has `position: absolute` with negative `top` or `left` values:

1. **Negative `top` value** (e.g., `top: -1382.4px`):
   - Moves the element **above** the top edge of its positioned parent
   - The element is positioned 1382.4px above the (0,0) point of the parent container

2. **Negative `left` value** (e.g., `left: -712px`):
   - Moves the element **to the left** of the left edge of its positioned parent
   - The element is positioned 712px to the left of the (0,0) point of the parent container

## With `overflow: hidden`

When the parent container has `overflow: hidden`:
- Only the portion of child elements that falls within the parent's boundaries is visible
- Anything outside is **clipped** (invisible)
- The viewport acts as a "window" showing only content from (0,0) to (width, height)

## Our Canvas Setup

- **Canvas viewport**: 512px × 512px (visible area from 0,0 to 512,512)
- **Image position**: `top: -1382.4px, left: -712px`
- **Image scale**: `transform: scale(3)` with `transformOrigin: 'top left'`

## What This Means

1. **Before scaling**: The image's top-left corner is positioned at (-712, -1382.4)
   - This means it's 712px to the left and 1382.4px above the visible (0,0) point
   - The entire image would be outside the viewport

2. **After 3x scaling from top-left**:
   - The image scales 3x larger, but its top-left corner stays at (-712, -1382.4)
   - The scaled image extends 3x in all directions from that point
   - Some portion of the scaled image should extend into the visible (0,0 to 512,512) area

## Example Calculation

If the original image is 1000px × 1500px:
- Position: (-712, -1382.4)
- After 3x scale: effectively 3000px × 4500px (still positioned at -712, -1382.4)
- Right edge of scaled image: -712 + 3000 = 2288px (way outside viewport)
- Bottom edge of scaled image: -1382.4 + 4500 = 3117.6px (way outside viewport)

The portion visible in 512×512 viewport would be:
- From x = max(0, -712) = 0 (we start seeing the image at x=0 of viewport)
- From y = max(0, -1382.4) = 0 (we start seeing the image at y=0 of viewport)

## Testing at (0,0)

When we place the image at (0,0):
- The image's top-left corner aligns with the viewport's top-left corner
- With 3x scaling, the image extends beyond the viewport on the right and bottom
- Only the top-left portion (0-512, 0-512) would be visible

