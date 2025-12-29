/**
 * Extract house shape type from blueprint data
 * 
 * The blueprint data from replit_floorplan contains shapes with layer='house'.
 * The name field contains the shape type like "Rectangular House", "L-shaped House", etc.
 * 
 * @param {Object} blueprintData - The blueprint data object from replit_floorplan
 * @returns {string|null} - The house shape type: 'rectangular', 'l-shaped', 'mirror-l', 'u-shaped', 'custom', or null
 */
export const extractHouseShape = (blueprintData) => {
  if (!blueprintData || !blueprintData.shapes || !Array.isArray(blueprintData.shapes)) {
    return null;
  }

  // Find the house shape (shapes with layer === 'house')
  const houseShape = blueprintData.shapes.find(shape => shape.layer === 'house');
  
  if (!houseShape || !houseShape.name) {
    return null;
  }

  // Extract shape type from the name
  // Names are like: "Rectangular House", "L-shaped House", "Mirror L House", "U-shaped House"
  const name = houseShape.name.toLowerCase();
  
  if (name.includes('rectangular')) {
    return 'rectangular';
  } else if (name.includes('l-shaped') || name.includes('l shaped')) {
    return 'l-shaped';
  } else if (name.includes('mirror-l') || name.includes('mirror l')) {
    return 'mirror-l';
  } else if (name.includes('u-shaped') || name.includes('u shaped')) {
    return 'u-shaped';
  } else {
    // If it's a house shape but doesn't match standard types, it's custom
    return 'custom';
  }
};

