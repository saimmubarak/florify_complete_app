import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import TypewriterText from '../components/TypewriterText';
import SimpleCreateGardenWizard from '../components/SimpleCreateGardenWizard';
import GardenCard from '../components/GardenCard';
import { getGardens } from '../api/gardens';
import '../styles/landing.css';

function LandingPage({ onLogout, userEmail }) {
  const navigate = useNavigate();
  const [showWizard, setShowWizard] = useState(false);
  const [gardens, setGardens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const [currentSeason, setCurrentSeason] = useState(0);

  // Handle scroll effects
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch user's gardens on component mount
  useEffect(() => {
    fetchGardens();
  }, []);

  // Seasonal animation effect
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSeason(prev => (prev + 1) % 4);
    }, 3000); // 3 seconds per season
    return () => clearInterval(interval);
  }, []);

  // Seasonal images array
  const seasonalImages = [
    '/images/seasons/spring.jpg',
    '/images/seasons/summer.jpg', 
    '/images/seasons/fall.jpg',
    '/images/seasons/winter.jpg'
  ];

  const seasonalIcons = ['🌸', '☀️', '🍂', '❄️'];

  const fetchGardens = async () => {
    try {
      setLoading(true);
      const response = await getGardens();
      setGardens(response.gardens || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGardenCreated = async () => {
    // Refresh the gardens list from the API instead of adding to array
    // This prevents duplicates and ensures we have the latest data
    setShowWizard(false);
    await fetchGardens();
  };

  const handleGardenClick = (gardenId) => {
    navigate(`/garden/${gardenId}`);
  };

  const navbarLinks = [
    { text: 'ADD GARDEN', action: () => setShowWizard(true) },
    { text: 'YOUR GARDENS', action: () => document.getElementById('gardens-section')?.scrollIntoView({ behavior: 'smooth' }) },
    { text: 'INSPIRATION', action: () => console.log('Inspiration clicked') },
    { text: 'TIPS', action: () => console.log('Tips clicked') }
  ];

  return (
    <div className="landing-container">
      {/* Background Grid */}
      <div className="background-grid"></div>

      {/* Floating Logo */}
      <div className={`floating-logo ${isScrolled ? 'scrolled' : ''}`}>
        <div className="logo-box">
          <span className="logo-text">FLORIFY</span>
        </div>
      </div>

      {/* Floating Navbar */}
      <nav className={`floating-navbar ${isScrolled ? 'scrolled' : ''}`}>
        <div className="navbar-content">
          {navbarLinks.map((link, index) => (
            <TypewriterText
              key={link.text}
              text={link.text}
              delay={index * 200}
              className="navbar-link"
              onClick={link.action}
            />
          ))}
        </div>
        <button className="logout-btn" onClick={onLogout}>
          LOGOUT
        </button>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            {/* Tagline */}
            <div className="tagline-container">
              <TypewriterText
                text="Leading AI based Garden Planner"
                delay={500}
                className="tagline"
              />
            </div>

            {/* Main Headline */}
            <h1 className="main-headline">
              <TypewriterText
                text="WE HELP YOU PLAN GARDENS THAT ARE FUNCTIONAL AND BEAUTIFUL"
                delay={800}
                className="headline-text"
              />
            </h1>

            {/* Subtext */}
            <p className="hero-subtext">
              <TypewriterText
                text="Tell us more about your garden so that our AI model plans the garden tailor made for you."
                delay={1200}
                className="subtext-content"
              />
            </p>

            {/* CTA Buttons */}
            <div className="cta-container">
              <TypewriterText
                text=""
                delay={1500}
                className="cta-wrapper"
              >
                <div className="cta-buttons">
                  <Button 
                    onClick={() => setShowWizard(true)}
                    className="create-garden-cta"
                  >
                    CREATE GARDEN
                  </Button>
                </div>
              </TypewriterText>
            </div>
          </div>

          {/* Hero Image */}
          <div className="hero-image-container">
            <div className="hero-image">
              <div className="seasonal-image-container">
                <img 
                  src={seasonalImages[currentSeason]} 
                  alt={`Seasonal garden - ${['Spring', 'Summer', 'Fall', 'Winter'][currentSeason]}`}
                  className="seasonal-image"
                />
                <div className="seasonal-overlay">
                  <div className="seasonal-icon">
                    {seasonalIcons[currentSeason]}
                  </div>
                  <p>Garden Planning Visual</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Gardens Section */}
      <section id="gardens-section" className="gardens-section">
        <div className="gardens-container">
          <h2 className="gardens-title">
            <TypewriterText
              text="YOUR GARDENS"
              delay={2000}
              className="section-title-text"
            />
          </h2>
          
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading your gardens...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <p>{error}</p>
              <Button onClick={fetchGardens}>Retry</Button>
            </div>
          ) : gardens.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🌱</div>
              <h4>No gardens yet</h4>
              <p>Create your first garden to get started!</p>
              <div className="empty-state-actions">
                <Button onClick={() => setShowWizard(true)}>
                  CREATE YOUR FIRST GARDEN
                </Button>
              </div>
            </div>
          ) : (
            <div className="gardens-grid">
              {gardens.map((garden, index) => (
                <div
                  key={garden.gardenId || garden.id}
                  className="garden-card-wrapper"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <GardenCard 
                    garden={garden} 
                    onClick={() => handleGardenClick(garden.gardenId || garden.id)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Create Garden Wizard Modal */}
      {showWizard && (
        <div className="modal-overlay">
          <div className="modal-content">
            <SimpleCreateGardenWizard 
              onClose={() => setShowWizard(false)}
              onGardenCreated={handleGardenCreated}
              userEmail={userEmail}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default LandingPage;
