/**
 * Plant Symbol Parser Utility
 * Parses YOLO class names to extract plant properties
 */

/**
 * Extract plant category from class name
 * @param {string} className - YOLO class name
 * @returns {string} - 'Tree', 'Shrub', or 'Perennial'
 */
export const extractPlantCategory = (className) => {
  const lower = className.toLowerCase();
  if (lower.startsWith('tree')) return 'Tree';
  if (lower.startsWith('shrub')) return 'Shrub';
  if (lower.startsWith('perennial')) return 'Perennial';
  return 'Unknown';
};

/**
 * Extract canopy size category from class name
 * @param {string} className - YOLO class name
 * @returns {number} - 1, 2, 3, or 4
 */
export const extractCanopySize = (className) => {
  const match = className.match(/CanopySize(\d)/i);
  return match ? parseInt(match[1]) : 1;
};

/**
 * Extract height category from class name
 * @param {string} className - YOLO class name
 * @returns {number} - 1, 2, 3, or 4
 */
export const extractHeightCategory = (className) => {
  const match = className.match(/Height(\d)/i);
  return match ? parseInt(match[1]) : 1;
};

/**
 * Extract flowering status from class name
 * @param {string} className - YOLO class name
 * @returns {number} - 1 (Flowering) or 0 (NONFlowering)
 */
export const extractFloweringBool = (className) => {
  if (className.includes('Flowering') && !className.includes('NONFlowering')) {
    return 1;
  }
  return 0;
};

/**
 * Extract fruiting status from class name
 * @param {string} className - YOLO class name
 * @returns {number} - 1 (Fruiting) or 0 (NONFruiting)
 */
export const extractFruitingBool = (className) => {
  if (className.includes('Fruiting') && !className.includes('NONFruiting')) {
    return 1;
  }
  return 0;
};

/**
 * Extract evergreen/deciduous status from class name
 * @param {string} className - YOLO class name
 * @returns {string} - 'Evergreen' or 'Deciduous'
 */
export const extractFoliageType = (className) => {
  if (className.includes('Evergreen')) return 'Evergreen';
  if (className.includes('Deciduous')) return 'Deciduous';
  return 'Unknown';
};

/**
 * Get plant symbol image path based on category
 * @param {string} category - 'Tree', 'Shrub', or 'Perennial'
 * @returns {string} - Path to plant symbol image
 */
export const getPlantSymbolImage = (category) => {
  const symbolMap = {
    'Tree': '/plant_symbols/Tree_symbol.png',
    'Shrub': '/plant_symbols/Shrub_symbol.png',
    'Perennial': '/plant_symbols/perennial_symbol.png'
  };
  return symbolMap[category] || '/plant_symbols/Shrub_symbol.png';
};

/**
 * Calculate div diameter in pixels based on plant category and canopy size
 * Conversion: 1ft = 10.24px (512px canvas / 50ft reference)
 *
 * Scale reference:
 * - Shrubs: CanopySize1=2.5ft, 2=5ft, 3=9ft, 4=13ft
 * - Perennials: CanopySize1=1ft, 2=2ft, 3=3ft
 * - Trees: CanopySize1=10ft, 2=15ft, 3=25ft
 *
 * @param {string} category - Plant category
 * @param {number} canopySize - Canopy size category (1-4)
 * @returns {number} - Diameter in pixels
 */
export const calculateDivDiameter = (category, canopySize) => {
  const FT_TO_PX = 10.24; // 512px canvas / 50ft reference

  let diameterFt = 0;

  if (category === 'Shrub') {
    const shrubSizes = { 1: 2.5, 2: 5, 3: 9, 4: 13 };
    diameterFt = shrubSizes[canopySize] || 2.5;
  } else if (category === 'Perennial') {
    const perennialSizes = { 1: 1, 2: 2, 3: 3 };
    diameterFt = perennialSizes[canopySize] || 1;
  } else if (category === 'Tree') {
    const treeSizes = { 1: 10, 2: 15, 3: 25 };
    diameterFt = treeSizes[canopySize] || 10;
  }

  return Math.round(diameterFt * FT_TO_PX);
};

/**
 * Parse full plant properties from YOLO detection
 * @param {Object} detection - YOLO detection object with class and bbox
 * @returns {Object} - Parsed plant properties
 */
export const parsePlantProperties = (detection) => {
  // Handle both 'class' and 'className' properties
  const className = detection.class || detection.className;
  const confidence = detection.confidence;
  const bbox = detection.bbox;

  // Validate required fields
  if (!className) {
    console.error('Detection missing class name:', detection);
    return null;
  }

  const category = extractPlantCategory(className);
  const canopySize = extractCanopySize(className);
  const height = extractHeightCategory(className);
  const flowering = extractFloweringBool(className);
  const fruiting = extractFruitingBool(className);
  const foliageType = extractFoliageType(className);
  const symbolImage = getPlantSymbolImage(category);
  const diameter = calculateDivDiameter(category, canopySize);

  // Handle bbox as either object or array
  let centerX, centerY;
  if (bbox && typeof bbox === 'object') {
    if (bbox.centerX !== undefined && bbox.centerY !== undefined) {
      // bbox is an object with centerX, centerY
      centerX = Math.round(bbox.centerX);
      centerY = Math.round(bbox.centerY);
    } else if (Array.isArray(bbox) && bbox.length >= 4) {
      // bbox is an array [x1, y1, x2, y2]
      centerX = Math.round((bbox[0] + bbox[2]) / 2);
      centerY = Math.round((bbox[1] + bbox[3]) / 2);
    } else if (bbox.x1 !== undefined && bbox.y1 !== undefined && bbox.x2 !== undefined && bbox.y2 !== undefined) {
      // bbox is an object with x1, y1, x2, y2
      centerX = Math.round((bbox.x1 + bbox.x2) / 2);
      centerY = Math.round((bbox.y1 + bbox.y2) / 2);
    } else {
      console.error('Invalid bbox format:', bbox);
      centerX = 256;
      centerY = 256;
    }
  } else {
    centerX = 256;
    centerY = 256;
  }

  return {
    // From YOLO
    className,
    confidence,
    // Note: bbox is not included - only x,y are sent to match PlantSymbol schema

    // Extracted properties
    plantCategory: category,
    canopySizeCategory: canopySize,
    heightCategory: height,
    floweringBool: flowering,
    fruitingBool: fruiting,
    foliageType,

    // Visual properties
    symbolImage,
    diameter,

    // Position (center of bbox)
    x: centerX,
    y: centerY,

    // Extra properties (will be filled in Step 4)
    plantBotanicalName: 'NA',
    plantCommonName: 'NA',
    plantFlowerColor: 'NA',
    plantHeight: 'NA',
    plantSpread: 'NA',
    plantLeafColor: 'NA',
    sunExposure: 'NA',
    plantingZone: 'NA',
    plantPicture: 'NA'
  };
};

/**
 * Parse all detections from YOLO results
 * @param {Array} detections - Array of YOLO detections
 * @returns {Array} - Array of parsed plant objects
 */
export const parseAllDetections = (detections) => {
  if (!detections || !Array.isArray(detections)) {
    return [];
  }

  return detections
    .map((detection, index) => {
      const parsed = parsePlantProperties(detection);
      if (!parsed) return null;
      return {
        id: `plant-${index}`,
        ...parsed
      };
    })
    .filter(plant => plant !== null); // Filter out any failed parses
};
