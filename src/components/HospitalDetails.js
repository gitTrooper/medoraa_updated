import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import "../styles/HospitalDetails.css";
import NavigationBar from "./NavigationBar";

const HospitalDetails = () => {
  const { placeId } = useParams();
  const mapRef = useRef(null);
  const [hospital, setHospital] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadMap = () => {
      // Check if Google Maps is loaded
      if (!window.google || !window.google.maps) {
        console.error('Google Maps not loaded');
        setError('Google Maps failed to load');
        setLoading(false);
        return;
      }

      const service = new window.google.maps.places.PlacesService(
        document.createElement('div')
      );

      service.getDetails(
        { 
          placeId: placeId,
          fields: ['name', 'formatted_address', 'formatted_phone_number', 'rating', 'geometry', 'vicinity']
        }, 
        (place, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK) {
            setHospital(place);
            setLoading(false);

            // Initialize map after hospital data is loaded
            setTimeout(() => {
              if (mapRef.current && place.geometry) {
                try {
                  const map = new window.google.maps.Map(mapRef.current, {
                    center: place.geometry.location,
                    zoom: 16,
                    mapTypeId: window.google.maps.MapTypeId.ROADMAP,
                  });

                  new window.google.maps.Marker({
                    map: map,
                    position: place.geometry.location,
                    title: place.name,
                  });
                } catch (mapError) {
                  console.error('Error creating map:', mapError);
                  setError('Failed to load map');
                }
              }
            }, 100);
          } else {
            console.error("❌ Failed to fetch hospital details:", status);
            setError('Failed to load hospital details');
            setLoading(false);
          }
        }
      );
    };

    // Wait for Google Maps to load
    const checkGoogleMaps = () => {
      if (window.google && window.google.maps && window.google.maps.places) {
        loadMap();
      } else {
        setTimeout(checkGoogleMaps, 100);
      }
    };

    checkGoogleMaps();
  }, [placeId]);

  const handleGoBack = () => {
    navigate(-1); // Go back to previous page
  };

  if (loading) {
    return (
      <div className="hospital-details">
        <p>Loading hospital details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="hospital-details">
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={handleGoBack}>Go Back</button>
      </div>
    );
  }

  if (!hospital) {
    return (
      <div className="hospital-details">
        <h2>Hospital not found</h2>
        <button onClick={handleGoBack}>Go Back</button>
      </div>
    );
  }

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push('★');
    }
    if (hasHalfStar) {
      stars.push('☆');
    }
    
    return stars.join('');
  };

  return (
     <>
        <NavigationBar />
    <div className="hospital-details">
      <div className="hospital-header">
        <button onClick={handleGoBack} className="back-btn">
          ← Back to List
        </button>
        <h2>{hospital.name}</h2>
      </div>
      
      <div className="hospital-info">
        <div className="info-grid">
          <div className="info-item">
            <div className="info-icon">📍</div>
            <div className="info-content">
              <div className="info-label">Address</div>
              <div className="info-value">{hospital.formatted_address || hospital.vicinity}</div>
            </div>
          </div>
          
          <div className="info-item">
            <div className="info-icon">📞</div>
            <div className="info-content">
              <div className="info-label">Phone</div>
              <div className="info-value">{hospital.formatted_phone_number || 'Not available'}</div>
            </div>
          </div>
          
          <div className="info-item">
            <div className="info-icon">⭐</div>
            <div className="info-content">
              <div className="info-label">Rating</div>
              <div className="info-value">
                {hospital.rating ? (
                  <div className="rating-stars">
                    <span className="stars">{renderStars(hospital.rating)}</span>
                    <span className="rating-text">{hospital.rating}/5</span>
                  </div>
                ) : (
                  'No rating available'
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="map-container">
        <div className="map-header">
          <h3>
            <div className="map-icon">🗺️</div>
            Location & Directions
          </h3>
          <div className="map-actions">
            <button className="map-btn" onClick={() => window.open(`https://maps.google.com/?q=${hospital.formatted_address || hospital.vicinity}`, '_blank')}>
              Open in Google Maps
            </button>
            <button className="map-btn" onClick={() => window.open(`https://maps.google.com/maps/dir/?api=1&destination=${hospital.formatted_address || hospital.vicinity}`, '_blank')}>
              Get Directions
            </button>
          </div>
        </div>
        
        {loading ? (
          <div className="map-loading">
            Loading map...
          </div>
        ) : (
          <div
            ref={mapRef}
            id="map"
            style={{ 
              height: '450px', 
              width: '100%'
            }}
          />
        )}
      </div>
      
      <div className="hospital-actions">
        <button className="action-btn primary" onClick={() => window.open(`tel:${hospital.formatted_phone_number}`, '_self')}>
          📞 Call Hospital
        </button>
        <button className="action-btn secondary" onClick={() => window.open(`https://maps.google.com/maps/dir/?api=1&destination=${hospital.formatted_address || hospital.vicinity}`, '_blank')}>
          🧭 Get Directions
        </button>
      </div>
    </div>
    </>
  );
};

export default HospitalDetails;