import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getGarden, updateGarden, deleteGarden } from '../api/gardens';
import { getBlueprintByGarden, getBlueprintImageUrls, downloadBlueprintImage, matchBlueprint, detectPlants } from '../api/blueprints';
import { parseAllDetections } from '../utils/plantSymbolParser';
import Button from '../components/Button';
import InputField from '../components/InputField';
import PlantedGardenCanvas from '../components/PlantedGardenCanvas';
import './GardenDetailPage.css';

const GardenDetailPage = () => {
  const { gardenId } = useParams();
  const navigate = useNavigate();
  const [garden, setGarden] = useState(null);
  const [blueprint, setBlueprint] = useState(null);
  const [blueprintImages, setBlueprintImages] = useState({ pngWithSkins: null, pngWithoutSkins: null, pipelinePngWithSkins: null });
  const [showSkinsVersion, setShowSkinsVersion] = useState(true); // Toggle between with/without skins
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: '',
    location: '',
    description: ''
  });
  
  // Plant Pipeline State
  const [pipelineState, setPipelineState] = useState({
    isRunning: false,
    currentStep: null, // 'matching', 'detecting', 'completed'
    matchedImage: null,
    matchInfo: null,
    detections: null,
    detectionSummary: null,
    detectionWarning: null, // Warning message if YOLO didn't work
    error: null
  });

  useEffect(() => {
    loadGarden();
    loadBlueprint();
  }, [gardenId]);

  const loadGarden = async () => {
    try {
      setLoading(true);
      const response = await getGarden(gardenId);
      setGarden(response.garden);
      setEditData({
        name: response.garden.name,
        location: response.garden.location,
        description: response.garden.description || ''
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadBlueprint = async () => {
    try {
      const response = await getBlueprintByGarden(gardenId);
      console.log('Blueprint loaded:', response.blueprint);
      setBlueprint(response.blueprint);
      
      // Extract blueprint image URLs
      if (response.blueprint) {
        const imageUrls = getBlueprintImageUrls(response.blueprint);
        console.log('Blueprint image URLs:', imageUrls);
        setBlueprintImages(imageUrls);
      }
    } catch (err) {
      console.log('No blueprint found for this garden:', err.message);
      setBlueprint(null);
      setBlueprintImages({ pngWithSkins: null, pngWithoutSkins: null, pipelinePngWithSkins: null });
    }
  };

  const handleViewBlueprint = (autoStep = null) => {
    if (!blueprint) return;

    // Get user ID and token
    const token = localStorage.getItem('token');
    let userId = '';
    if (token) {
      try {
        const payload = token.split('.')[1];
        const decoded = JSON.parse(atob(payload));
        userId = decoded.sub;
      } catch (e) {
        console.error('Failed to decode token:', e);
      }
    }

    // Determine which step to navigate to:
    // - If pipeline completed (has detections), go to planted-garden
    // - Otherwise, use provided autoStep or default to planted-garden if blueprint has plantSymbols
    let targetStep = autoStep;
    if (!targetStep) {
      // Check if blueprint was updated with plant symbols from pipeline
      if (pipelineState.detections && pipelineState.detections.length > 0) {
        targetStep = 'planted-garden';
      } else if (blueprint.blueprintData && blueprint.blueprintData.plantSymbols && blueprint.blueprintData.plantSymbols.length > 0) {
        targetStep = 'planted-garden';
      } else {
        targetStep = 'export'; // Default to export step
      }
    }

    // Open replit floorplan in new tab with edit mode, auto-navigate to specified step, and pass token
    const blueprintUrl = `http://localhost:5001/?mode=edit&blueprint_id=${blueprint.blueprintId}&garden_id=${gardenId}&user_id=${userId}&auto_step=${targetStep}&token=${encodeURIComponent(token || '')}`;
    window.open(blueprintUrl, '_blank', 'width=1200,height=800');
  };

  const handleCreateBlueprint = () => {
    // Get user ID and token
    const token = localStorage.getItem('token');
    let userId = '';
    if (token) {
      try {
        const payload = token.split('.')[1];
        const decoded = JSON.parse(atob(payload));
        userId = decoded.sub;
      } catch (e) {
        console.error('Failed to decode token:', e);
      }
    }

    // Open replit floorplan in new tab with create mode and pass token
    const blueprintUrl = `http://localhost:5001/?mode=create&garden_id=${gardenId}&user_id=${userId}&token=${encodeURIComponent(token || '')}`;
    const blueprintWindow = window.open(blueprintUrl, '_blank', 'width=1200,height=800');

    // Listen for blueprint data from child window
    const handleMessage = async (event) => {
      // Verify origin for security
      if (event.origin !== 'http://localhost:5001') return;

      if (event.data.type === 'BLUEPRINT_SAVED' && event.data.blueprintData) {
        try {
          // Save blueprint to backend
          const { createBlueprint } = await import('../api/blueprints');
          await createBlueprint({
            gardenId: gardenId,
            blueprintData: event.data.blueprintData,
            name: `${garden.name} Blueprint`
          });

          // Reload blueprint data
          window.removeEventListener('message', handleMessage);
          loadBlueprint();
        } catch (error) {
          console.error('Failed to save blueprint:', error);
          setError('Failed to save blueprint data');
        }
      }
    };

    window.addEventListener('message', handleMessage);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData({
      name: garden.name,
      location: garden.location,
      description: garden.description || ''
    });
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const response = await updateGarden(gardenId, editData);
      setGarden(response.garden);
      setIsEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this garden?')) {
      try {
        setLoading(true);
        await deleteGarden(gardenId);
        navigate('/');
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleInputChange = (field, value) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Generate Garden Pipeline - Step 1: Match Blueprint, Step 2: Detect Plants
  const handleGenerateGarden = async () => {
    if (!blueprint || !blueprintImages.pngWithoutSkins) {
      setError('Blueprint is required to generate garden. Please create a blueprint first.');
      return;
    }

    setPipelineState({
      isRunning: true,
      currentStep: 'matching',
      matchedImage: null,
      matchInfo: null,
      detections: null,
      detectionSummary: null,
      error: null
    });

    try {
      console.log('🌱 Starting Generate Garden Pipeline...');
      
      // ========== STEP 1: Match Blueprint ==========
      console.log('Step 1: Matching blueprint to find plant placement template...');
      setPipelineState(prev => ({ ...prev, currentStep: 'matching' }));
      
      // Use the without-skins blueprint image for matching
      const pipelineImage = blueprintImages.pngWithoutSkins;
      
      const matchResult = await matchBlueprint(pipelineImage, gardenId);
      
      if (!matchResult.success || !matchResult.match) {
        throw new Error(matchResult.message || 'No matching blueprint found');
      }
      
      console.log('✅ Step 1 Complete - Match found!', matchResult.match);
      
      // Update state with match results
      setPipelineState(prev => ({
        ...prev,
        currentStep: 'detecting',
        matchedImage: matchResult.match.filledImageUrl,
        matchInfo: {
          similarity: matchResult.match.similarity,
          filename: matchResult.match.filledFilename,
          index: matchResult.match.index
        }
      }));
      
      // ========== STEP 2: Detect Plants with YOLO ==========
      console.log('Step 2: Detecting plant symbols with YOLO...');
      
      const detectionResult = await detectPlants(
        matchResult.match.filledImageUrl,
        gardenId,
        0.25, // Confidence threshold
        0.45  // IoU threshold
      );
      
      if (!detectionResult.success) {
        throw new Error(detectionResult.message || 'Plant detection failed');
      }
      
      console.log('✅ Step 2 Complete - Detections:', detectionResult);
      console.log(`Found ${detectionResult.summary.totalDetections} plant symbols`);

      // Update state with detection results
      setPipelineState(prev => ({
        ...prev,
        isRunning: false,
        currentStep: 'completed',
        detections: detectionResult.detections,
        detectionSummary: detectionResult.summary,
        detectionWarning: detectionResult.warning || (detectionResult.isMock ? 'YOLO model not available - using mock data' : null)
      }));

      // ========== STEP 3: Update Blueprint with Plant Symbols ==========
      console.log('Step 3: Updating blueprint with plant symbols...');

      // Parse YOLO detections into PlantSymbol format
      const plantSymbols = parseAllDetections(detectionResult.detections);
      console.log(`Parsed ${plantSymbols.length} plant symbols:`, plantSymbols);

      // Log first plant symbol for debugging
      if (plantSymbols.length > 0) {
        console.log('Sample plant symbol:', JSON.stringify(plantSymbols[0], null, 2));
      }

      // Update blueprint in replit_floorplan database
      if (blueprint && blueprint.blueprintId) {
        try {
          const token = localStorage.getItem('token');

          const requestBody = {
            plantSymbols: plantSymbols,
            currentStep: 'planted-garden'
          };

          console.log('Sending PATCH request to update blueprint:', {
            url: `http://localhost:5001/api/projects/${blueprint.blueprintId}`,
            body: requestBody
          });

          const updateResponse = await fetch(`http://localhost:5001/api/projects/${blueprint.blueprintId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token || ''}`
            },
            body: JSON.stringify(requestBody)
          });

          console.log('PATCH response status:', updateResponse.status);

          if (!updateResponse.ok) {
            const errorData = await updateResponse.json();
            console.error('Failed to update blueprint - Full error:', errorData);
            throw new Error(errorData.error || 'Failed to update blueprint with plant symbols');
          }

          const updatedBlueprint = await updateResponse.json();
          console.log('✅ Step 3 Complete - Blueprint updated with plant symbols:', updatedBlueprint);

          // Update local blueprint state
          setBlueprint(updatedBlueprint);

          // Don't auto-navigate - user will click "View Blueprint" button to see planted-garden
          console.log('Blueprint ready with planted-garden step. User can click "View Blueprint" to see it.');

        } catch (updateError) {
          console.error('❌ Failed to update blueprint with plant symbols:', updateError);
          setPipelineState(prev => ({
            ...prev,
            error: `Pipeline completed but failed to update blueprint: ${updateError.message}`
          }));
        }
      } else {
        console.warn('No blueprint found to update with plant symbols');
      }
      
    } catch (err) {
      console.error('❌ Pipeline error:', err);
      setPipelineState(prev => ({
        ...prev,
        isRunning: false,
        currentStep: 'error',
        error: err.message || 'Pipeline failed'
      }));
    }
  };

  const handleClearPipeline = () => {
    setPipelineState({
      isRunning: false,
      currentStep: null,
      matchedImage: null,
      matchInfo: null,
      detections: null,
      detectionSummary: null,
      detectionWarning: null,
      error: null
    });
  };

  if (loading) {
    return (
      <div className="garden-detail-page">
        <div className="loading">Loading garden details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="garden-detail-page">
        <div className="error">
          <h2>Error</h2>
          <p>{error}</p>
          <Button onClick={() => navigate('/')}>Back to Home</Button>
        </div>
      </div>
    );
  }

  if (!garden) {
    return (
      <div className="garden-detail-page">
        <div className="error">
          <h2>Garden Not Found</h2>
          <p>The garden you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/')}>Back to Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="garden-detail-page">
      <div className="garden-detail-container">
        <div className="garden-header">
          <h1>{garden.name}</h1>
          <div className="garden-actions">
            {!isEditing ? (
              <>
                {blueprint && (
                  <Button onClick={handleViewBlueprint} variant="primary">
                    📐 View Blueprint
                  </Button>
                )}
                <Button onClick={handleEdit} variant="secondary">
                  Edit Garden
                </Button>
                <Button onClick={handleDelete} variant="danger">
                  Delete Garden
                </Button>
              </>
            ) : (
              <>
                <Button onClick={handleSave} disabled={loading}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button onClick={handleCancel} variant="secondary">
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="garden-content">
          {isEditing ? (
            <div className="edit-form">
              <div className="form-group">
                <label htmlFor="name">Garden Name</label>
                <InputField
                  id="name"
                  type="text"
                  value={editData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter garden name"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="location">Location</label>
                <InputField
                  id="location"
                  type="text"
                  value={editData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder="Enter garden location"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  value={editData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Enter garden description"
                  rows="4"
                />
              </div>
            </div>
          ) : (
            <div className="garden-info">
              <div className="info-section">
                <h3>Location</h3>
                <p>{garden.location}</p>
              </div>
              
              {garden.description && (
                <div className="info-section">
                  <h3>Description</h3>
                  <p>{garden.description}</p>
                </div>
              )}
              
              <div className="info-section">
                <h3>Garden Blueprint</h3>
                {blueprint ? (
                  <div>
                    <p style={{ color: '#4caf50', marginBottom: '10px' }}>
                      ✓ Blueprint created on {new Date(blueprint.createdAt).toLocaleDateString()}
                    </p>
                    
                    {/* Blueprint Image Display with Toggle */}
                    {(blueprintImages.pngWithSkins || blueprintImages.pngWithoutSkins) && (
                      <div style={{ marginTop: '15px', marginBottom: '15px' }}>
                        {/* Toggle Switch for With/Without Skins */}
                        {blueprintImages.pngWithSkins && blueprintImages.pngWithoutSkins && (
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '10px', 
                            marginBottom: '15px',
                            padding: '10px',
                            backgroundColor: '#f5f5f5',
                            borderRadius: '8px'
                          }}>
                            <span style={{ fontSize: '0.9em', color: !showSkinsVersion ? '#333' : '#999' }}>
                              Structure Only
                            </span>
                            <label style={{ 
                              position: 'relative', 
                              display: 'inline-block', 
                              width: '50px', 
                              height: '26px' 
                            }}>
                              <input
                                type="checkbox"
                                checked={showSkinsVersion}
                                onChange={() => setShowSkinsVersion(!showSkinsVersion)}
                                style={{ opacity: 0, width: 0, height: 0 }}
                              />
                              <span style={{
                                position: 'absolute',
                                cursor: 'pointer',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor: showSkinsVersion ? '#4caf50' : '#ccc',
                                transition: '0.3s',
                                borderRadius: '26px'
                              }}>
                                <span style={{
                                  position: 'absolute',
                                  content: '',
                                  height: '20px',
                                  width: '20px',
                                  left: showSkinsVersion ? '26px' : '3px',
                                  bottom: '3px',
                                  backgroundColor: 'white',
                                  transition: '0.3s',
                                  borderRadius: '50%'
                                }} />
                              </span>
                            </label>
                            <span style={{ fontSize: '0.9em', color: showSkinsVersion ? '#333' : '#999' }}>
                              With Visual Skins
                            </span>
                          </div>
                        )}
                        
                        {/* Display the selected image */}
                        <img 
                          src={showSkinsVersion ? blueprintImages.pngWithSkins : blueprintImages.pngWithoutSkins} 
                          alt={showSkinsVersion ? "Garden Blueprint with Visual Skins" : "Garden Blueprint Structure"} 
                          style={{ 
                            maxWidth: '100%', 
                            height: 'auto', 
                            border: '2px solid #e0e0e0', 
                            borderRadius: '8px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                          }} 
                        />
                      </div>
                    )}
                    
                    <div style={{ display: 'flex', gap: '10px', marginTop: '15px', flexWrap: 'wrap' }}>
                      <Button 
                        onClick={handleViewBlueprint} 
                        variant="primary"
                      >
                        📐 View & Edit Blueprint
                      </Button>
                      
                      {/* Download PNG with skins */}
                      {blueprintImages.pngWithSkins && (
                        <Button 
                          variant="secondary"
                          onClick={() => downloadBlueprintImage(
                            blueprintImages.pngWithSkins, 
                            `${garden.name}-blueprint-with-skins.png`
                          )}
                        >
                          🎨 Download With Skins
                        </Button>
                      )}
                      
                      {/* Download PNG without skins */}
                      {blueprintImages.pngWithoutSkins && (
                        <Button 
                          variant="secondary"
                          onClick={() => downloadBlueprintImage(
                            blueprintImages.pngWithoutSkins, 
                            `${garden.name}-blueprint-structure.png`
                          )}
                        >
                          📋 Download Structure Only
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <p style={{ color: '#999', marginBottom: '10px' }}>
                      No blueprint created yet
                    </p>
                    <Button 
                      onClick={handleCreateBlueprint} 
                      variant="primary"
                      style={{ marginTop: '10px' }}
                    >
                      🎨 Create Blueprint
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="info-section">
                <h3>Created</h3>
                <p>{new Date(garden.createdAt).toLocaleDateString()}</p>
              </div>
              
              {/* AI Plant Placement Pipeline Section */}
              {blueprint && (
                <div className="info-section" style={{ 
                  marginTop: '20px', 
                  padding: '20px', 
                  backgroundColor: '#f0fdf4', 
                  borderRadius: '12px',
                  border: '2px solid #86efac'
                }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                    🌱 AI Plant Placement
                  </h3>
                  
                  {!pipelineState.currentStep && (
                    <div>
                      <p style={{ color: '#666', marginBottom: '15px', fontSize: '0.9em' }}>
                        Use AI to automatically suggest plant placements for your garden based on your blueprint layout.
                      </p>
                      <Button 
                        onClick={handleGenerateGarden}
                        variant="primary"
                        style={{ 
                          backgroundColor: '#22c55e', 
                          width: '100%',
                          padding: '12px 20px',
                          fontSize: '1em'
                        }}
                      >
                        🌿 Generate Garden
                      </Button>
                    </div>
                  )}
                  
                  {pipelineState.isRunning && (
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                      <div style={{ 
                        width: '40px', 
                        height: '40px', 
                        border: '4px solid #e0e0e0', 
                        borderTop: '4px solid #22c55e',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 15px'
                      }} />
                      <p style={{ color: '#666' }}>
                        {pipelineState.currentStep === 'matching' 
                          ? '🔍 Step 1: Finding matching plant template...' 
                          : pipelineState.currentStep === 'detecting'
                          ? '🎯 Step 2: Detecting plant symbols with YOLO...'
                          : 'Processing...'}
                      </p>
                    </div>
                  )}
                  
                  {pipelineState.error && (
                    <div style={{ 
                      backgroundColor: '#fef2f2', 
                      padding: '15px', 
                      borderRadius: '8px',
                      marginBottom: '15px'
                    }}>
                      <p style={{ color: '#dc2626', marginBottom: '10px' }}>
                        ❌ {pipelineState.error}
                      </p>
                      <Button onClick={handleClearPipeline} variant="secondary">
                        Try Again
                      </Button>
                    </div>
                  )}
                  
                  {pipelineState.matchedImage && (
                    <div>
                      {/* Step 1 Results */}
                      <div style={{ 
                        backgroundColor: '#dcfce7', 
                        padding: '10px 15px', 
                        borderRadius: '8px',
                        marginBottom: '15px'
                      }}>
                        <p style={{ color: '#16a34a', fontWeight: 'bold', marginBottom: '5px' }}>
                          ✅ Step 1 Complete: Plant Template Found!
                        </p>
                        <p style={{ color: '#666', fontSize: '0.85em' }}>
                          Similarity: {(pipelineState.matchInfo.similarity * 100).toFixed(1)}% • 
                          Template: {pipelineState.matchInfo.filename}
                        </p>
                      </div>
                      
                      {/* Step 2 Results */}
                      {pipelineState.detections && pipelineState.detectionSummary && (
                        <div>
                          {/* Warning if YOLO didn't work */}
                          {pipelineState.detectionWarning && (
                            <div style={{ 
                              backgroundColor: '#fef3c7', 
                              border: '1px solid #f59e0b',
                              padding: '10px 15px', 
                              borderRadius: '8px',
                              marginBottom: '15px'
                            }}>
                              <p style={{ color: '#92400e', fontWeight: 'bold', marginBottom: '5px' }}>
                                ⚠️ YOLO Model Not Available
                              </p>
                              <p style={{ color: '#78350f', fontSize: '0.85em' }}>
                                {pipelineState.detectionWarning}
                              </p>
                              <p style={{ color: '#78350f', fontSize: '0.8em', marginTop: '5px', fontStyle: 'italic' }}>
                                Showing mock detection data for testing purposes.
                              </p>
                            </div>
                          )}
                          
                          <div style={{ 
                            backgroundColor: '#dbeafe', 
                            padding: '10px 15px', 
                            borderRadius: '8px',
                            marginBottom: '15px'
                          }}>
                            <p style={{ color: '#1e40af', fontWeight: 'bold', marginBottom: '5px' }}>
                              ✅ Step 2 Complete: Plant Symbols Detected!
                            </p>
                            <p style={{ color: '#666', fontSize: '0.85em', marginBottom: '8px' }}>
                              Total Detections: <strong>{pipelineState.detectionSummary.totalDetections}</strong> plant symbols
                            </p>
                            <div style={{ fontSize: '0.8em', color: '#555' }}>
                              <strong>Plant Types Found:</strong>
                              <div style={{ marginTop: '5px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {Object.entries(pipelineState.detectionSummary.classCounts).map(([className, count]) => (
                                  <span key={className} style={{ 
                                    backgroundColor: '#eff6ff', 
                                    padding: '3px 8px', 
                                    borderRadius: '4px',
                                    fontSize: '0.75em'
                                  }}>
                                    {className.split('_')[0]}: {count}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Plant Placement Image */}
                      <div style={{ marginBottom: '15px' }}>
                        <p style={{ fontWeight: 'bold', marginBottom: '10px', color: '#333' }}>
                          Suggested Plant Placement:
                        </p>
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                          <img 
                            src={pipelineState.matchedImage}
                            alt="Matched plant placement template"
                            style={{ 
                              width: '100%', 
                              maxWidth: '512px',
                              height: 'auto', 
                              border: '2px solid #22c55e', 
                              borderRadius: '8px',
                              boxShadow: '0 4px 12px rgba(34, 197, 94, 0.2)'
                            }}
                          />
                          {/* Overlay detection boxes if available */}
                          {pipelineState.detections && (
                            <div style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              pointerEvents: 'none'
                            }}>
                              {pipelineState.detections.slice(0, 50).map((detection, idx) => {
                                const img = document.querySelector('img[alt="Matched plant placement template"]');
                                if (!img) return null;
                                const scaleX = img.offsetWidth / 512;
                                const scaleY = img.offsetHeight / 512;
                                
                                return (
                                  <div
                                    key={idx}
                                    style={{
                                      position: 'absolute',
                                      left: `${detection.bbox.x1 * scaleX}px`,
                                      top: `${detection.bbox.y1 * scaleY}px`,
                                      width: `${detection.bbox.width * scaleX}px`,
                                      height: `${detection.bbox.height * scaleY}px`,
                                      border: '2px solid rgba(34, 197, 94, 0.6)',
                                      backgroundColor: 'rgba(34, 197, 94, 0.1)',
                                      borderRadius: '2px',
                                      pointerEvents: 'none'
                                    }}
                                    title={`${detection.class} (${(detection.confidence * 100).toFixed(0)}%)`}
                                  />
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Detection Details Table */}
                      {pipelineState.detections && pipelineState.detections.length > 0 && (
                        <div style={{ marginBottom: '15px' }}>
                          <p style={{ fontWeight: 'bold', marginBottom: '10px', color: '#333' }}>
                            Detection Details:
                          </p>
                          <div style={{ 
                            maxHeight: '200px', 
                            overflowY: 'auto',
                            border: '1px solid #e0e0e0',
                            borderRadius: '8px',
                            padding: '10px',
                            backgroundColor: '#f9fafb'
                          }}>
                            <table style={{ width: '100%', fontSize: '0.85em' }}>
                              <thead>
                                <tr style={{ borderBottom: '1px solid #e0e0e0' }}>
                                  <th style={{ textAlign: 'left', padding: '5px' }}>ID</th>
                                  <th style={{ textAlign: 'left', padding: '5px' }}>Plant Type</th>
                                  <th style={{ textAlign: 'left', padding: '5px' }}>Confidence</th>
                                  <th style={{ textAlign: 'left', padding: '5px' }}>Location</th>
                                </tr>
                              </thead>
                              <tbody>
                                {pipelineState.detections.slice(0, 20).map((detection) => (
                                  <tr key={detection.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                    <td style={{ padding: '5px' }}>{detection.id}</td>
                                    <td style={{ padding: '5px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {detection.class.split('_')[0]}
                                    </td>
                                    <td style={{ padding: '5px' }}>
                                      {(detection.confidence * 100).toFixed(0)}%
                                    </td>
                                    <td style={{ padding: '5px', fontSize: '0.75em' }}>
                                      ({detection.bbox.centerX.toFixed(0)}, {detection.bbox.centerY.toFixed(0)})
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {pipelineState.detections.length > 20 && (
                              <p style={{ marginTop: '10px', fontSize: '0.8em', color: '#666', textAlign: 'center' }}>
                                ... and {pipelineState.detections.length - 20} more detections
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Step 3: Interactive Plant Placement Canvas */}
                      {pipelineState.detections && pipelineState.detections.length > 0 && (
                        <Step3PlantPlacement
                          detections={pipelineState.detections}
                          blueprint={blueprint}
                          pngWithSkins={blueprintImages.pngWithSkins}
                          pngWithoutSkins={blueprintImages.pngWithoutSkins}
                          onPlantsUpdate={(updatedPlants) => {
                            console.log('Plants updated:', updatedPlants);
                            // Store updated plant positions for Step 4
                          }}
                        />
                      )}

                      {/* Action Buttons */}
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <Button 
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = pipelineState.matchedImage;
                            link.download = `${garden.name}-plant-placement.png`;
                            link.click();
                          }}
                          variant="secondary"
                        >
                          📥 Download Template
                        </Button>
                        {pipelineState.detections && (
                          <Button 
                            onClick={() => {
                              const dataStr = JSON.stringify({
                                match: pipelineState.matchInfo,
                                detections: pipelineState.detections,
                                summary: pipelineState.detectionSummary
                              }, null, 2);
                              const blob = new Blob([dataStr], { type: 'application/json' });
                              const url = URL.createObjectURL(blob);
                              const link = document.createElement('a');
                              link.href = url;
                              link.download = `${garden.name}-detections.json`;
                              link.click();
                              URL.revokeObjectURL(url);
                            }}
                            variant="secondary"
                          >
                            📊 Download Detection Data
                          </Button>
                        )}
                        <Button onClick={handleClearPipeline} variant="secondary">
                          🔄 Generate Again
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="garden-footer">
          <Button onClick={() => navigate('/')} variant="secondary">
            Back to Gardens
          </Button>
        </div>
      </div>
    </div>
  );
};

/**
 * Step 3 Plant Placement Component
 * Uses the same pngWithSkins image as the display section, with 3x scaling and specific positioning
 * The image is positioned so its top-left corner (after 3x scaling) is at (-712, -1382.4)
 * Only the portion from (0,0) to (512,512) is visible
 */
const Step3PlantPlacement = ({ detections, blueprint, pngWithSkins, pngWithoutSkins, onPlantsUpdate }) => {
  const [backgroundImage, setBackgroundImage] = useState(null);

  useEffect(() => {
    console.log('Step3 background image selection:', { pngWithSkins, pngWithoutSkins });
    
    // Use pngWithSkins (same image as display section uses) - this is the requirement
    if (pngWithSkins) {
      console.log('✅ Using pngWithSkins (same as display section) as background:', pngWithSkins);
      setBackgroundImage(pngWithSkins);
    }
    // Fallback to without-skin image if with-skin is not available
    else if (pngWithoutSkins) {
      console.log('🔄 Falling back to pngWithoutSkins as background (without skins):', pngWithoutSkins);
      setBackgroundImage(pngWithoutSkins);
    }
    // If none are available, set to null (will show default background)
    else {
      console.warn('⚠️ No background image URL available. pngWithSkins:', pngWithSkins, 'pngWithoutSkins:', pngWithoutSkins);
      setBackgroundImage(null);
    }
  }, [pngWithSkins, pngWithoutSkins]);

  return (
    <div style={{ marginTop: '20px', marginBottom: '20px' }}>
      <div style={{
        backgroundColor: '#f0f9ff',
        padding: '10px 15px',
        borderRadius: '8px',
        marginBottom: '15px'
      }}>
        <p style={{ color: '#0369a1', fontWeight: 'bold', marginBottom: '5px' }}>
          ✅ Step 3: Interactive Plant Placement
        </p>
        <p style={{ color: '#666', fontSize: '0.85em' }}>
          View and adjust plant positions on your garden blueprint. Drag plants to reposition them.
        </p>
      </div>


      <PlantedGardenCanvas
        detections={detections}
        blueprint={blueprint}
        floorplanImage={backgroundImage}
        onPlantsUpdate={onPlantsUpdate}
      />
    </div>
  );
};

export default GardenDetailPage;