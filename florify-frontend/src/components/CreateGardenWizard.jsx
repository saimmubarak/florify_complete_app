import React, { useState, useEffect, useRef } from 'react';
import Button from './Button';
import InputField from './InputField';
import TypewriterText from './TypewriterText';
import config from '../config';
import { createBlueprint } from '../api/blueprints';
import '../styles/garden-wizard.css';

const CreateGardenWizard = ({ onClose, onGardenCreated, userEmail }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    coordinates: null,
    image: null,
    imagePreview: null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdGardenId, setCreatedGardenId] = useState(null);
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerRef = useRef(null);

  const steps = [
    { number: 1, title: 'Garden Details', description: 'Name and describe your garden' },
    { number: 2, title: 'Location', description: 'Select your garden location on the map' },
    { number: 3, title: 'Photo', description: 'Add a photo of your garden' },
    { number: 4, title: 'Blueprint', description: 'Create your garden floor plan (optional)' }
  ];

  // Initialize Google Maps
  useEffect(() => {
    if (currentStep === 2 && mapRef.current && !mapInstance.current) {
      initMap();
    }
  }, [currentStep]);

  const initMap = () => {
    if (window.google && mapRef.current) {
      mapInstance.current = new window.google.maps.Map(mapRef.current, {
        center: { lat: 40.7128, lng: -74.0060 }, // Default to NYC
        zoom: 13,
        styles: [
          {
            featureType: 'all',
            elementType: 'geometry.fill',
            stylers: [{ color: '#f5f5f5' }]
          },
          {
            featureType: 'water',
            elementType: 'geometry',
            stylers: [{ color: '#c9c9c9' }]
          }
        ]
      });

      // Add click listener to map
      mapInstance.current.addListener('click', (event) => {
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();
        
        // Remove existing marker
        if (markerRef.current) {
          markerRef.current.setMap(null);
        }

        // Add new marker
        markerRef.current = new window.google.maps.Marker({
          position: { lat, lng },
          map: mapInstance.current,
          title: 'Garden Location'
        });

        // Update form data
        setFormData(prev => ({
          ...prev,
          coordinates: { lat, lng },
          location: `${lat.toFixed(4)}, ${lng.toFixed(4)}`
        }));

        // Reverse geocoding to get address
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          if (status === 'OK' && results[0]) {
            setFormData(prev => ({
              ...prev,
              location: results[0].formatted_address
            }));
          }
        });
      });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('Image size must be less than 5MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setFormData(prev => ({
          ...prev,
          image: file,
          imagePreview: e.target.result
        }));
      };
      reader.readAsDataURL(file);
      setError('');
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const validateStep = (step) => {
    switch (step) {
      case 1:
        return formData.name.trim().length >= 2;
      case 2:
        return formData.coordinates !== null;
      case 3:
        return true; // Image is optional
      default:
        return false;
    }
  };

  const uploadImageToS3 = async (file, gardenId) => {
    try {
      // Get presigned upload URL from backend
      const uploadUrlResponse = await fetch(
        `${config.API_BASE_URL}/gardens/upload-url?filename=${encodeURIComponent(file.name)}&contentType=${encodeURIComponent(file.type)}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          }
        }
      );

      if (!uploadUrlResponse.ok) {
        const errorData = await uploadUrlResponse.json();
        throw new Error(errorData.message || 'Failed to get upload URL');
      }

      const { uploadData, publicUrl, gardenId: returnedGardenId } = await uploadUrlResponse.json();
      
      // Use the gardenId from the response
      const finalGardenId = returnedGardenId || gardenId;

      // Create FormData for S3 upload
      const formData = new FormData();
      
      // Add all the fields from presigned POST
      Object.keys(uploadData.fields).forEach(key => {
        formData.append(key, uploadData.fields[key]);
      });
      
      // Add the file last
      formData.append('file', file);

      // Upload to S3
      const uploadResponse = await fetch(uploadData.url, {
        method: 'POST',
        body: formData
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload image to S3');
      }

      return { publicUrl, gardenId: finalGardenId };
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.coordinates) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let imageUrl = '';
      let gardenId = null;

      // Upload image if one was selected
      if (formData.image) {
        try {
          const uploadResult = await uploadImageToS3(formData.image, gardenId);
          imageUrl = uploadResult.publicUrl;
          gardenId = uploadResult.gardenId;
        } catch (uploadError) {
          setError(`Image upload failed: ${uploadError.message}`);
          setLoading(false);
          return;
        }
      }

      // Create garden data
      const gardenData = {
        name: formData.name,
        description: formData.description,
        location: formData.location,
        coordinates: formData.coordinates,
        userEmail: userEmail,
        imageUrl: imageUrl,
        gardenId: gardenId  // Include gardenId if we have one from upload
      };

      // Submit garden to backend
      const response = await fetch(`${config.API_BASE_URL}/gardens`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(gardenData)
      });

      if (response.ok) {
        const result = await response.json();
        const newGarden = result.garden;
        setCreatedGardenId(newGarden.gardenId);
        
        // Move to blueprint step instead of closing
        if (currentStep === 3) {
          setCurrentStep(4);
        } else {
          onGardenCreated(newGarden);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to create garden');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle blueprint creation in new tab
  const handleCreateBlueprint = () => {
    if (!createdGardenId) {
      setError('Garden must be created first');
      return;
    }

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
    const blueprintUrl = `http://localhost:5001/?mode=create&garden_id=${createdGardenId}&user_id=${userId}&token=${encodeURIComponent(token || '')}`;
    const blueprintWindow = window.open(blueprintUrl, '_blank', 'width=1200,height=800');

    // Listen for blueprint data from child window
    const handleMessage = async (event) => {
      // Verify origin for security
      if (event.origin !== 'http://localhost:5001') return;

      if (event.data.type === 'BLUEPRINT_SAVED' && event.data.blueprintData) {
        try {
          // Save blueprint to backend
          await createBlueprint({
            gardenId: createdGardenId,
            blueprintData: event.data.blueprintData,
            name: `${formData.name} Blueprint`
          });

          // Close wizard and refresh
          window.removeEventListener('message', handleMessage);
          onGardenCreated({ gardenId: createdGardenId, ...formData });
        } catch (error) {
          console.error('Failed to save blueprint:', error);
          setError('Failed to save blueprint data');
        }
      }
    };

    window.addEventListener('message', handleMessage);
  };

  // Skip blueprint and finish
  const handleSkipBlueprint = () => {
    onGardenCreated({ gardenId: createdGardenId, ...formData });
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="step-content">
            <TypewriterText delay={100}>
              <h3 className="step-title">What would you like to call your garden?</h3>
            </TypewriterText>
            <TypewriterText delay={200}>
              <p className="step-description">
                Choose a name that reflects your garden's personality and purpose.
              </p>
            </TypewriterText>
            <TypewriterText delay={300}>
              <div className="input-group">
                <label className="input-label">Garden Name*</label>
                <InputField
                  type="text"
                  name="name"
                  placeholder="e.g., My Backyard Paradise, Urban Herb Garden"
                  value={formData.name}
                  onChange={handleInputChange}
                />
              </div>
            </TypewriterText>
            <TypewriterText delay={400}>
              <div className="input-group">
                <label className="input-label">Description (Optional)</label>
                <textarea
                  name="description"
                  placeholder="Tell us more about your garden..."
                  value={formData.description}
                  onChange={handleInputChange}
                  className="description-textarea"
                  rows="4"
                />
              </div>
            </TypewriterText>
          </div>
        );

      case 2:
        return (
          <div className="step-content">
            <TypewriterText delay={100}>
              <h3 className="step-title">Select your garden location</h3>
            </TypewriterText>
            <TypewriterText delay={200}>
              <p className="step-description">
                Click on the map to mark your garden's location. This helps us provide location-specific gardening tips.
              </p>
            </TypewriterText>
            <TypewriterText delay={300}>
              <div className="map-container">
                <div ref={mapRef} className="map" />
                {formData.location && (
                  <div className="location-display">
                    <strong>Selected Location:</strong> {formData.location}
                  </div>
                )}
              </div>
            </TypewriterText>
          </div>
        );

      case 3:
        return (
          <div className="step-content">
            <TypewriterText delay={100}>
              <h3 className="step-title">Add a photo of your garden</h3>
            </TypewriterText>
            <TypewriterText delay={200}>
              <p className="step-description">
                A picture helps you track your garden's progress over time. This is optional but recommended.
              </p>
            </TypewriterText>
            <TypewriterText delay={300}>
              <div className="image-upload-section">
                {formData.imagePreview ? (
                  <div className="image-preview">
                    <img src={formData.imagePreview} alt="Garden preview" />
                    <button 
                      type="button" 
                      className="change-image-btn"
                      onClick={() => document.getElementById('image-upload').click()}
                    >
                      Change Image
                    </button>
                  </div>
                ) : (
                  <div className="image-upload-area" onClick={() => document.getElementById('image-upload').click()}>
                    <div className="upload-icon">📷</div>
                    <p className="upload-text">Click to upload a photo</p>
                    <p className="upload-hint">PNG, JPG up to 5MB</p>
                    <input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden-input"
                    />
                  </div>
                )}
              </div>
            </TypewriterText>
          </div>
        );

      case 4:
        return (
          <div className="step-content">
            <TypewriterText delay={100}>
              <h3 className="step-title">Create Your Garden Blueprint</h3>
            </TypewriterText>
            <TypewriterText delay={200}>
              <p className="step-description">
                Design a detailed floor plan of your garden with our interactive blueprint editor. 
                This step is optional but helps visualize your garden layout.
              </p>
            </TypewriterText>
            <TypewriterText delay={300}>
              <div className="blueprint-section">
                <div className="blueprint-icon">📐</div>
                <p className="blueprint-info">
                  The blueprint editor will open in a new tab where you can:
                </p>
                <ul className="blueprint-features">
                  <li>✓ Define plot boundaries and house shape</li>
                  <li>✓ Add walls, doors, and pathways</li>
                  <li>✓ Design driveways and patios</li>
                  <li>✓ Export your design as PNG or PDF</li>
                </ul>
                <Button 
                  onClick={handleCreateBlueprint} 
                  className="primary-btn blueprint-btn"
                >
                  OPEN BLUEPRINT EDITOR 🎨
                </Button>
                <p className="blueprint-hint">
                  Your garden has been saved. You can create a blueprint now or skip and add it later.
                </p>
              </div>
            </TypewriterText>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="wizard-container">
      <div className="wizard-header">
        <TypewriterText delay={100}>
          <h2 className="wizard-title">CREATE YOUR GARDEN</h2>
        </TypewriterText>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>

      <div className="wizard-progress">
        {steps.map((step, index) => (
          <div key={step.number} className={`progress-step ${currentStep >= step.number ? 'active' : ''}`}>
            <div className="step-number">{step.number}</div>
            <div className="step-info">
              <div className="step-title-small">{step.title}</div>
              <div className="step-desc-small">{step.description}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="wizard-content">
        {renderStepContent()}
        
        {error && <div className="error-message">{error}</div>}

        <div className="wizard-actions">
          {currentStep > 1 && currentStep !== 4 && (
            <Button onClick={prevStep} className="secondary-btn">
              ← PREVIOUS
            </Button>
          )}
          
          {currentStep < 3 ? (
            <Button 
              onClick={nextStep} 
              disabled={!validateStep(currentStep)}
              className="primary-btn"
            >
              NEXT →
            </Button>
          ) : currentStep === 3 ? (
            <Button 
              onClick={handleSubmit} 
              disabled={loading || !formData.name.trim() || !formData.coordinates}
              className="primary-btn"
            >
              {loading ? 'CREATING GARDEN...' : 'CREATE GARDEN & CONTINUE →'}
            </Button>
          ) : (
            <Button 
              onClick={handleSkipBlueprint} 
              className="secondary-btn"
            >
              SKIP & FINISH
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateGardenWizard;