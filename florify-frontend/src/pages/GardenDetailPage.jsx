import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getGarden, updateGarden, deleteGarden } from '../api/gardens';
import { getBlueprintByGarden, getBlueprintImageUrls, downloadBlueprintImage, matchBlueprint } from '../api/blueprints';
import Button from '../components/Button';
import InputField from '../components/InputField';
import './GardenDetailPage.css';

const GardenDetailPage = () => {
  const { gardenId } = useParams();
  const navigate = useNavigate();
  const [garden, setGarden] = useState(null);
  const [blueprint, setBlueprint] = useState(null);
  const [blueprintImages, setBlueprintImages] = useState({ pngWithSkins: null, pngWithoutSkins: null });
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
    currentStep: null,
    matchedImage: null,
    matchInfo: null,
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
      setBlueprintImages({ pngWithSkins: null, pngWithoutSkins: null });
    }
  };

  const handleViewBlueprint = () => {
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

    // Open replit floorplan in new tab with edit mode, auto-navigate to export, and pass token
    const blueprintUrl = `http://localhost:5001/?mode=edit&blueprint_id=${blueprint.blueprintId}&garden_id=${gardenId}&user_id=${userId}&auto_step=export&token=${encodeURIComponent(token || '')}`;
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

  // Generate Garden Pipeline - Step 1: Match Blueprint
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
      error: null
    });

    try {
      console.log('🌱 Starting Generate Garden Pipeline...');
      console.log('Step 1: Matching blueprint to find plant placement template...');
      
      // Use the without-skins blueprint image for matching
      // In a full implementation, we would first generate the 512x512 pipeline image
      // For now, we'll use the existing without-skins image
      const pipelineImage = blueprintImages.pngWithoutSkins;
      
      const result = await matchBlueprint(pipelineImage, gardenId);
      
      if (result.success && result.match) {
        console.log('✅ Match found!', result.match);
        setPipelineState({
          isRunning: false,
          currentStep: 'completed',
          matchedImage: result.match.filledImageUrl,
          matchInfo: {
            similarity: result.match.similarity,
            filename: result.match.filledFilename,
            index: result.match.index
          },
          error: null
        });
      } else {
        throw new Error(result.message || 'No matching blueprint found');
      }
    } catch (err) {
      console.error('❌ Pipeline error:', err);
      setPipelineState({
        isRunning: false,
        currentStep: 'error',
        matchedImage: null,
        matchInfo: null,
        error: err.message || 'Failed to match blueprint'
      });
    }
  };

  const handleClearPipeline = () => {
    setPipelineState({
      isRunning: false,
      currentStep: null,
      matchedImage: null,
      matchInfo: null,
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
                          ? '🔍 Finding matching plant template...' 
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
                      <div style={{ 
                        backgroundColor: '#dcfce7', 
                        padding: '10px 15px', 
                        borderRadius: '8px',
                        marginBottom: '15px'
                      }}>
                        <p style={{ color: '#16a34a', fontWeight: 'bold', marginBottom: '5px' }}>
                          ✅ Plant Template Found!
                        </p>
                        <p style={{ color: '#666', fontSize: '0.85em' }}>
                          Similarity: {(pipelineState.matchInfo.similarity * 100).toFixed(1)}% • 
                          Template: {pipelineState.matchInfo.filename}
                        </p>
                      </div>
                      
                      <div style={{ marginBottom: '15px' }}>
                        <p style={{ fontWeight: 'bold', marginBottom: '10px', color: '#333' }}>
                          Suggested Plant Placement:
                        </p>
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
                      </div>
                      
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
                        <Button onClick={handleClearPipeline} variant="secondary">
                          🔄 Generate Again
                        </Button>
                      </div>
                      
                      <p style={{ 
                        color: '#666', 
                        fontSize: '0.85em', 
                        marginTop: '15px',
                        fontStyle: 'italic'
                      }}>
                        Note: Step 2 (YOLO plant detection) will be added in the next update.
                      </p>
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

export default GardenDetailPage;