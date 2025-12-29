// src/api/gardens.js
import axios from "axios";

// Replace with your API Gateway Invoke URL after deployment
const API_BASE_URL = "https://jiazehdrvf.execute-api.eu-north-1.amazonaws.com/dev";

// Create axios instance with better error handling
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 second timeout
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

// ----------------- GARDEN CRUD OPERATIONS -----------------

// Create a new garden
export const createGarden = async (gardenData) => {
  try {
    const response = await api.post('/gardens', gardenData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Get all gardens for the current user
export const getGardens = async () => {
  try {
    const response = await api.get('/gardens');
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Get a specific garden by ID
export const getGarden = async (gardenId) => {
  try {
    const response = await api.get(`/gardens/${gardenId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Update a garden
export const updateGarden = async (gardenId, gardenData) => {
  try {
    const response = await api.put(`/gardens/${gardenId}`, gardenData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Delete a garden
export const deleteGarden = async (gardenId) => {
  try {
    const response = await api.delete(`/gardens/${gardenId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Update house shape for a garden (separate endpoint to avoid affecting other backend processes)
export const updateGardenHouseShape = async (gardenId, houseShape) => {
  try {
    const response = await api.patch(`/gardens/${gardenId}/house-shape`, {
      houseShape: houseShape
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};