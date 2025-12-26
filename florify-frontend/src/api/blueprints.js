// src/api/blueprints.js
import axios from "axios";

// Replace with your API Gateway Invoke URL after deployment
const API_BASE_URL = "https://jiazehdrvf.execute-api.eu-north-1.amazonaws.com/dev";

// Create axios instance with better error handling
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 second timeout for large image uploads
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for better error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout. Please check your internet connection.');
    }
    
    if (error.response) {
      // Server responded with error status
      const errorMessage = error.response.data?.message || 'Server error occurred';
      throw new Error(errorMessage);
    } else if (error.request) {
      // Request was made but no response received
      throw new Error('Network error. Please check your internet connection and try again.');
    } else {
      // Something else happened
      throw new Error('An unexpected error occurred. Please try again.');
    }
  }
);

// ----------------- BLUEPRINT CRUD OPERATIONS -----------------

// Create a new blueprint
export const createBlueprint = async (blueprintData) => {
  try {
    console.log('📤 Creating blueprint with data:', {
      gardenId: blueprintData.gardenId,
      name: blueprintData.name,
      hasBlueprintData: !!blueprintData.blueprintData,
      blueprintDataSize: JSON.stringify(blueprintData.blueprintData).length
    });
    const response = await api.post('/blueprints', blueprintData);
    console.log('✅ Blueprint created successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Blueprint creation failed:', error);
    throw error;
  }
};

// Get a specific blueprint by ID
export const getBlueprint = async (blueprintId) => {
  try {
    console.log('📥 Fetching blueprint by ID:', blueprintId);
    const response = await api.get(`/blueprints/${blueprintId}`);
    console.log('✅ Blueprint retrieved:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Blueprint retrieval failed:', error);
    throw error;
  }
};

// Get blueprint by garden ID
export const getBlueprintByGarden = async (gardenId) => {
  try {
    console.log('📥 Fetching blueprint by garden ID:', gardenId);
    const response = await api.get(`/gardens/${gardenId}/blueprint`);
    console.log('✅ Blueprint retrieved by garden:', response.data);
    return response.data;
  } catch (error) {
    // If blueprint doesn't exist, return null instead of throwing
    if (error.message === 'No blueprint found for this garden') {
      return { blueprint: null };
    }
    throw error;
  }
};

// Update an existing blueprint
export const updateBlueprint = async (blueprintId, blueprintData) => {
  try {
    const response = await api.put(`/blueprints/${blueprintId}`, blueprintData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// ----------------- BLUEPRINT IMAGE UTILITIES -----------------

/**
 * Get blueprint image URLs from a blueprint object
 * Returns both the with-skins and without-skins versions
 * 
 * @param {Object} blueprint - The blueprint object from API
 * @returns {Object} Object with pngWithSkins and pngWithoutSkins URLs
 */
export const getBlueprintImageUrls = (blueprint) => {
  if (!blueprint) {
    return { pngWithSkins: null, pngWithoutSkins: null };
  }

  return {
    pngWithSkins: blueprint.pngWithSkinsUrl || null,
    pngWithoutSkins: blueprint.pngWithoutSkinsUrl || null,
  };
};

/**
 * Fetch blueprint images for a garden
 * Returns the S3 URLs for both with-skins and without-skins versions
 * 
 * @param {string} gardenId - The garden ID
 * @returns {Promise<Object>} Object with pngWithSkins and pngWithoutSkins URLs
 */
export const fetchBlueprintImages = async (gardenId) => {
  try {
    const response = await getBlueprintByGarden(gardenId);
    if (!response.blueprint) {
      return { pngWithSkins: null, pngWithoutSkins: null };
    }
    return getBlueprintImageUrls(response.blueprint);
  } catch (error) {
    console.error('Error fetching blueprint images:', error);
    return { pngWithSkins: null, pngWithoutSkins: null };
  }
};

/**
 * Download a blueprint image
 * 
 * @param {string} imageUrl - The S3 URL of the image
 * @param {string} filename - The filename for the download
 */
export const downloadBlueprintImage = async (imageUrl, filename = 'blueprint.png') => {
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading blueprint image:', error);
    throw error;
  }
};

// ----------------- AI PIPELINE OPERATIONS -----------------

/**
 * Match a pipeline image to find the best filled blueprint
 * This is Step 1 of the plant placement pipeline
 * 
 * @param {string} pipelineImage - Base64 data URL of the 512x512 pipeline PNG
 * @param {string} gardenId - The garden ID for deterministic matching
 * @returns {Promise<Object>} Match result with filled blueprint image
 */
export const matchBlueprint = async (pipelineImage, gardenId) => {
  try {
    console.log('🌱 Matching blueprint for plant placement...');
    console.log('Pipeline image size:', pipelineImage.length, 'bytes');
    console.log('Garden ID:', gardenId);
    
    const response = await api.post('/pipeline/match', {
      pipelineImage,
      gardenId,
      threshold: 0.70
    });
    
    console.log('✅ Blueprint matched:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Blueprint matching failed:', error);
    throw error;
  }
};

/**
 * Detect plant symbols in a filled blueprint image using YOLO
 * This is Step 2 of the plant placement pipeline
 * 
 * @param {string} filledImage - Base64 data URL of the matched filled blueprint PNG
 * @param {string} gardenId - The garden ID
 * @param {number} confidenceThreshold - Optional confidence threshold (default 0.25)
 * @param {number} iouThreshold - Optional IoU threshold (default 0.45)
 * @returns {Promise<Object>} Detection results with plant symbols and locations
 */
export const detectPlants = async (filledImage, gardenId, confidenceThreshold = 0.25, iouThreshold = 0.45) => {
  try {
    console.log('🎯 Detecting plant symbols with YOLO...');
    console.log('Filled image size:', filledImage.length, 'bytes');
    console.log('Garden ID:', gardenId);
    console.log('Confidence threshold:', confidenceThreshold);
    
    const response = await api.post('/pipeline/detect', {
      filledImage,
      gardenId,
      confidenceThreshold,
      iouThreshold
    });
    
    console.log('✅ Plant detection complete:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Plant detection failed:', error);
    throw error;
  }
};

export default {
  createBlueprint,
  getBlueprint,
  getBlueprintByGarden,
  updateBlueprint,
  getBlueprintImageUrls,
  fetchBlueprintImages,
  downloadBlueprintImage,
  matchBlueprint,
  detectPlants,
};
