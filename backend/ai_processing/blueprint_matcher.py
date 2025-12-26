"""
Blueprint Matcher Module

Uses MobileNetV2 embeddings and FAISS index to find the most similar
filled blueprint for a given empty floorplan image.

Database Structure:
- database.pkl: Contains pairs (empty_path, filled_path) and 1280-dim embeddings
- faiss_index.bin: FAISS index for fast similarity search
- png_cache/empty/: 1134 empty floorplan PNGs (512x512)
- png_cache/filled/: 1134 filled floorplan PNGs (512x512)
"""

import os
import pickle
import base64
import io
import json
from pathlib import Path

# These imports may not be available in Lambda - will be conditionally imported
try:
    import numpy as np
    import faiss
    from PIL import Image
    HAS_AI_DEPS = True
except ImportError:
    HAS_AI_DEPS = False
    print("Warning: AI dependencies not available. Using fallback mode.")

# For Lambda, we'll use a simpler approach that doesn't require PyTorch
# The embeddings are pre-computed, we just need to compute query embedding

# Path to the database folder
DB_FOLDER = os.path.join(os.path.dirname(__file__), '..', 'blueprint_embeddings_db')


class SimpleBlueprintMatcher:
    """
    Simplified blueprint matcher that works without PyTorch.
    Uses pre-computed embeddings and FAISS for matching.
    
    For production, query embeddings should be computed by a separate
    service (e.g., SageMaker endpoint) or we use a simpler matching approach.
    """
    
    def __init__(self, db_folder=None):
        self.db_folder = db_folder or DB_FOLDER
        self.database = None
        self.index = None
        self.metadata = None
        self._loaded = False
    
    def load(self):
        """Load the database and FAISS index"""
        if self._loaded:
            return
        
        if not HAS_AI_DEPS:
            raise ImportError("AI dependencies (numpy, faiss, PIL) not available")
        
        # Load database
        database_path = os.path.join(self.db_folder, 'database.pkl')
        if not os.path.exists(database_path):
            raise FileNotFoundError(f"Database not found: {database_path}")
        
        with open(database_path, 'rb') as f:
            self.database = pickle.load(f)
        
        # Load FAISS index
        faiss_path = os.path.join(self.db_folder, 'faiss_index.bin')
        if not os.path.exists(faiss_path):
            raise FileNotFoundError(f"FAISS index not found: {faiss_path}")
        
        self.index = faiss.read_index(faiss_path)
        
        # Load metadata
        metadata_path = os.path.join(self.db_folder, 'metadata.json')
        if os.path.exists(metadata_path):
            with open(metadata_path, 'r') as f:
                self.metadata = json.load(f)
        
        self._loaded = True
        print(f"Blueprint matcher loaded: {self.database['num_pairs']} pairs")
    
    def find_best_match_by_index(self, query_index: int) -> dict:
        """
        Get the filled blueprint for a specific index.
        Useful for testing or when we have the index directly.
        """
        if not self._loaded:
            self.load()
        
        if query_index < 0 or query_index >= len(self.database['pairs']):
            return None
        
        empty_path, filled_path = self.database['pairs'][query_index]
        
        # Get the filled image from local cache
        filled_filename = Path(filled_path).name
        local_filled_path = os.path.join(self.db_folder, 'png_cache', 'filled', filled_filename)
        
        if not os.path.exists(local_filled_path):
            return None
        
        # Read and encode the filled image
        with open(local_filled_path, 'rb') as f:
            filled_data = f.read()
        
        return {
            'index': query_index,
            'similarity': 1.0,
            'filled_filename': filled_filename,
            'filled_image_base64': base64.b64encode(filled_data).decode('utf-8'),
        }
    
    def find_random_match(self) -> dict:
        """
        Return a random filled blueprint.
        Useful for testing the pipeline without actual matching.
        """
        if not self._loaded:
            self.load()
        
        import random
        random_idx = random.randint(0, len(self.database['pairs']) - 1)
        return self.find_best_match_by_index(random_idx)
    
    def find_best_match(self, query_embedding: np.ndarray, threshold: float = 0.70) -> dict:
        """
        Find the best matching filled blueprint for a query embedding.
        
        Args:
            query_embedding: 1280-dimensional feature vector (normalized)
            threshold: Minimum similarity score (0-1)
        
        Returns:
            Dictionary with match info or None if no match above threshold
        """
        if not self._loaded:
            self.load()
        
        # Ensure correct shape and type
        query_embedding = query_embedding.reshape(1, -1).astype('float32')
        faiss.normalize_L2(query_embedding)
        
        # Search for top 1 match
        similarities, indices = self.index.search(query_embedding, 1)
        
        best_idx = int(indices[0][0])
        best_score = float(similarities[0][0])
        
        # Check threshold
        if best_score < threshold:
            return None
        
        # Get the matched pair
        empty_path, filled_path = self.database['pairs'][best_idx]
        filled_filename = Path(filled_path).name
        
        # Get the filled image from local cache
        local_filled_path = os.path.join(self.db_folder, 'png_cache', 'filled', filled_filename)
        
        if not os.path.exists(local_filled_path):
            return {
                'index': best_idx,
                'similarity': best_score,
                'filled_filename': filled_filename,
                'filled_image_base64': None,
                'error': f'Filled image not found: {filled_filename}'
            }
        
        # Read and encode the filled image
        with open(local_filled_path, 'rb') as f:
            filled_data = f.read()
        
        return {
            'index': best_idx,
            'similarity': best_score,
            'filled_filename': filled_filename,
            'filled_image_base64': base64.b64encode(filled_data).decode('utf-8'),
        }
    
    def get_all_empty_embeddings(self) -> np.ndarray:
        """Get all pre-computed embeddings for empty blueprints"""
        if not self._loaded:
            self.load()
        return self.database['embeddings']
    
    def get_num_pairs(self) -> int:
        """Get the number of blueprint pairs in the database"""
        if not self._loaded:
            self.load()
        return self.database['num_pairs']


# Singleton instance
_matcher_instance = None

def get_matcher() -> SimpleBlueprintMatcher:
    """Get the singleton matcher instance"""
    global _matcher_instance
    if _matcher_instance is None:
        _matcher_instance = SimpleBlueprintMatcher()
    return _matcher_instance

