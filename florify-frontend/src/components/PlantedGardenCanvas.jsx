import React, { useState, useRef, useEffect } from 'react';
import './PlantedGardenCanvas.css';
import { parseAllDetections } from '../utils/plantSymbolParser';

/**
 * PlantedGardenCanvas Component
 *
 * Interactive Plant Placement screen for the garden generation pipeline.
 * Displays a 512×512px canvas with:
 * - Floorplan background image WITH skins (generated from replit_floorplan)
 * - Plant symbols positioned at their original YOLO coordinates
 * - Draggable plant divs for repositioning
 * - Hover popup showing plant properties
 */
const PlantedGardenCanvas = ({
  detections,
  blueprint,
  floorplanImage,
  onPlantsUpdate
}) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Parse detections into plant objects
  const [plants, setPlants] = useState([]);
  const [hoveredPlant, setHoveredPlant] = useState(null);
  const [draggedPlant, setDraggedPlant] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Canvas is fixed at 512×512px (same as YOLO input)
  const CANVAS_SIZE = 512;
  
  // Offset adjustments for plant symbol positions
  const PLANT_X_OFFSET = 32; // Move symbols slightly to the right
  const PLANT_Y_OFFSET = 14; // Move symbols slightly down

  // Parse detections on mount or when detections change
  useEffect(() => {
    if (detections && Array.isArray(detections)) {
      const parsedPlants = parseAllDetections(detections);
      setPlants(parsedPlants);

      // Notify parent component
      if (onPlantsUpdate) {
        onPlantsUpdate(parsedPlants);
      }
    }
  }, [detections]);

  // Handle plant drag start
  const handlePlantDragStart = (e, plant) => {
    e.stopPropagation();
    setDraggedPlant(plant);

    const rect = canvasRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left - plant.x;
    const offsetY = e.clientY - rect.top - plant.y;

    setDragOffset({ x: offsetX, y: offsetY });
  };

  // Handle mouse move (for dragging)
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!draggedPlant || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const newX = e.clientX - rect.left - dragOffset.x;
      const newY = e.clientY - rect.top - dragOffset.y;

      // Clamp to canvas bounds (0-512)
      const clampedX = Math.max(0, Math.min(CANVAS_SIZE, newX));
      const clampedY = Math.max(0, Math.min(CANVAS_SIZE, newY));

      // Update plant position
      setPlants(prevPlants =>
        prevPlants.map(p =>
          p.id === draggedPlant.id
            ? { ...p, x: clampedX, y: clampedY }
            : p
        )
      );
    };

    const handleMouseUp = () => {
      if (draggedPlant) {
        setDraggedPlant(null);

        // Notify parent of updated plants
        if (onPlantsUpdate) {
          onPlantsUpdate(plants);
        }
      }
    };

    if (draggedPlant) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggedPlant, dragOffset, plants, onPlantsUpdate]);

  // Get plant color based on category
  const getPlantColor = (category) => {
    if (category === 'Tree') return '#22c55e'; // Green
    if (category === 'Shrub') return '#fb923c'; // Orange
    if (category === 'Perennial') return '#a855f7'; // Purple
    return '#4ade80'; // Default green
  };

  return (
    <div className="planted-garden-canvas-wrapper">
      <div className="canvas-controls">
        <div className="plant-count">
          🌿 Plants: {plants.length}
        </div>
      </div>

      <div
        ref={containerRef}
        className="canvas-container-fixed"
        style={{
          width: `${CANVAS_SIZE}px`,
          height: `${CANVAS_SIZE}px`,
          margin: '0 auto',
          position: 'relative',
          border: '2px solid #ccc',
          borderRadius: '8px',
          overflow: 'hidden',
          backgroundColor: '#fff'
        }}
      >
        {/* Canvas viewport - fixed 512×512px with scaled and positioned background */}
        <div
          ref={canvasRef}
          className="canvas-viewport-fixed"
          style={{
            width: `${CANVAS_SIZE}px`,
            height: `${CANVAS_SIZE}px`,
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: floorplanImage ? 'transparent' : '#f9f9f9'
          }}
        >
          {/* Background image centered in canvas - scaled 0.80x */}
          {floorplanImage && (
            <img
              src={floorplanImage}
              alt="Floorplan background"
              style={{
                position: 'absolute',
                top: '8%',
                left: '50%',
                transform: 'translate(-50%, -50%) scale(0.80)',
                width: 'auto',
                height: 'auto',
                pointerEvents: 'none',
                userSelect: 'none',
                display: 'block',
                zIndex: 0
              }}
              onLoad={(e) => {
                const img = e.target;
                console.log('✅ Floorplan background image loaded successfully');
                console.log('Image URL:', floorplanImage);
                console.log('Image dimensions:', {
                  naturalWidth: img.naturalWidth,
                  naturalHeight: img.naturalHeight,
                  offsetWidth: img.offsetWidth,
                  offsetHeight: img.offsetHeight
                });
              }}
              onError={(e) => {
                console.error('❌ Failed to load floorplan background image:', floorplanImage, e);
              }}
            />
          )}
          {/* Plant symbols - positioned at original YOLO coordinates */}
          {plants.map(plant => {
            const diameter = plant.diameter; // Use original diameter (no scaling)
            const radius = diameter / 2;

            return (
              <div
                key={plant.id}
                className={`plant-symbol ${draggedPlant?.id === plant.id ? 'dragging' : ''}`}
                style={{
                  position: 'absolute',
                  left: `${plant.x + PLANT_X_OFFSET - radius}px`,
                  top: `${plant.y + PLANT_Y_OFFSET - radius}px`,
                  width: `${diameter}px`,
                  height: `${diameter}px`,
                  borderRadius: '50%',
                  backgroundColor: getPlantColor(plant.plantCategory),
                  opacity: 0.7,
                  border: '2px solid #000',
                  cursor: 'move',
                  transition: draggedPlant?.id === plant.id ? 'none' : 'all 0.2s',
                  boxShadow: hoveredPlant?.id === plant.id ? '0 0 15px rgba(0,0,0,0.5)' : '0 2px 4px rgba(0,0,0,0.2)',
                  zIndex: draggedPlant?.id === plant.id ? 1000 : (hoveredPlant?.id === plant.id ? 999 : 1)
                }}
                onMouseDown={(e) => handlePlantDragStart(e, plant)}
                onMouseEnter={() => setHoveredPlant(plant)}
                onMouseLeave={() => setHoveredPlant(null)}
              >
                {/* Plant icon/label */}
                <div style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: `${Math.max(10, diameter * 0.3)}px`,
                  color: '#fff',
                  fontWeight: 'bold',
                  textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                  userSelect: 'none'
                }}>
                  {plant.plantCategory === 'Tree' ? '🌳' : plant.plantCategory === 'Shrub' ? '🌿' : '🌸'}
                </div>
              </div>
            );
          })}

          {/* Hover popup */}
          {hoveredPlant && !draggedPlant && (
            <div
              className="plant-popup"
              style={{
                position: 'absolute',
                left: `${hoveredPlant.x + PLANT_X_OFFSET + hoveredPlant.diameter / 2 + 10}px`,
                top: `${hoveredPlant.y + PLANT_Y_OFFSET}px`,
                backgroundColor: '#fff',
                border: '2px solid #2D6A4F',
                borderRadius: '8px',
                padding: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                zIndex: 2000,
                minWidth: '200px',
                pointerEvents: 'none',
                fontSize: '12px',
                lineHeight: '1.5'
              }}
            >
              <div style={{ fontWeight: 'bold', color: '#2D6A4F', marginBottom: '8px' }}>
                {hoveredPlant.plantCommonName !== 'NA' ? hoveredPlant.plantCommonName : hoveredPlant.className}
              </div>
              <div style={{ fontSize: '11px', color: '#666' }}>
                <div><strong>Category:</strong> {hoveredPlant.plantCategory}</div>
                <div><strong>Foliage:</strong> {hoveredPlant.foliageType}</div>
                <div><strong>Flowering:</strong> {hoveredPlant.floweringBool ? 'Yes' : 'No'}</div>
                <div><strong>Fruiting:</strong> {hoveredPlant.fruitingBool ? 'Yes' : 'No'}</div>
                <div><strong>Canopy Size:</strong> {hoveredPlant.canopySizeCategory}</div>
                <div><strong>Height Cat:</strong> {hoveredPlant.heightCategory}</div>
                <div style={{ marginTop: '4px', fontSize: '10px', color: '#999' }}>
                  Position: ({Math.round(hoveredPlant.x)}, {Math.round(hoveredPlant.y)})
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="canvas-instructions" style={{
        marginTop: '16px',
        textAlign: 'center',
        fontSize: '14px',
        color: '#666'
      }}>
        <p>🖱️ <strong>Drag</strong> plant symbols to reposition them</p>
        <p>🔍 <strong>Hover</strong> over plants to see details</p>
      </div>
    </div>
  );
};

export default PlantedGardenCanvas;
