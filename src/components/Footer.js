// Footer.js
import React from "react";
import { Link } from "react-router-dom";
import "../styles/Footer.css";

const Footer = () => {
  return (
    <footer className="custom-footer">
      <div className="footer-container">
        <div className="footer-top">
          <div className="footer-column">
            <h5>Medoraa</h5>
            <ul>
              <li><Link to="/aboutus">About us</Link></li>
              <li><Link to="/terms-and-conditions">Terms And Conditions</Link></li>
              <li><Link to="/contact">Contact Us</Link></li>
            </ul>
          </div>

          <div className="footer-column">
            <h5>Services</h5>
            <ul>
              <li><Link to="/hospital-locator">Hospital Locator</Link></li>
              <li><Link to="/book-appointment">Appointment Booking</Link></li>
              <li><Link to="/chatbot">AI Chatbot</Link></li>
              <li><Link to="/report-analysis">Report Analysis</Link></li>
              <li><Link to="/diet-plan">Diet Plan Generator</Link></li>
            </ul>
          </div>

          <div className="footer-column">
            <h5>Social</h5>
            <ul>
              <li><a href="https://www.facebook.com/people/Medoraa-AI/pfbid02KDfNSWLo2gsBborcSUdBYspcizfKbAzq5LxCbhPoqtCnocDE5c87oK1inVmcpjDcl/?rdid=hHDZRWDTN2O5Cr2U&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2F163WVdxJKy%2F" target="_blank" rel="noopener noreferrer">Facebook</a></li>
              <li><a href="https://www.youtube.com/@medoraa01" target="_blank" rel="noopener noreferrer">Youtube</a></li>
              <li><a href="https://www.instagram.com/_medoraa?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==" target="_blank" rel="noopener noreferrer">Instagram</a></li>
            </ul>
          </div>

          {/* Logo/Image section on the extreme right */}
          <div className="footer-column footer-logo-column">
            <div className="footer-logo-container">
              <img 
                src="/images/medlogo.png" 
                alt="Medoraa Logo" 
                className="footer-logo-image"
                onError={(e) => {
                  // Fallback if image doesn't load
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
              <div className="footer-brand-text">Medoraa</div>
              {/* Fallback content if image fails to load */}
              <div className="footer-logo-fallback" style={{ display: 'none' }}>
                <div className="logo-placeholder">
                  <span className="logo-icon">🩺</span>
                  <span className="logo-text">Medoraa</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="footer-brand">
            <div className="logo-section">
              <span className="footer-logo-icon">🩺</span>
              <span className="footer-logo-text">Medoraa</span>
            </div>
          </div>
        </div>
      </div>

      {/* Add these styles to your Footer.css or include them inline */}
      <style jsx>{`
        .footer-logo-column {
          display: flex;
          justify-content: flex-end;
          align-items: flex-start;
          padding-top: 1rem;
        }

        .footer-logo-container {
          max-width: 160px;
          width: 100%;
          text-align: center;
        }

        .footer-logo-image {
          width: 100%;
          height: auto;
          max-height: 120px;
          object-fit: contain;
          filter: none;
          background: transparent;
          transition: opacity 0.3s ease;
          margin-bottom: 8px;
        }

        .footer-logo-image:hover {
          opacity: 0.8;
        }

        .footer-brand-text {
          font-size: 1.1rem;
          font-weight: 600;
          color: #ffffff;
          text-align: center;
          margin-top: 5px;
        }

        .footer-logo-fallback {
          text-align: center;
          padding: 1rem;
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          border-radius: 8px;
          border: 2px solid #e2e8f0;
        }

        .logo-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }

        .logo-icon {
          font-size: 2rem;
          display: block;
        }

        .logo-text {
          font-size: 1.2rem;
          font-weight: 600;
          color: #1e40af;
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .footer-logo-column {
            justify-content: center;
            margin-top: 2rem;
          }

          .footer-logo-container {
            max-width: 140px;
          }

          .footer-logo-image {
            max-height: 100px;
          }

          .footer-brand-text {
            font-size: 1rem;
          }
        }

        @media (max-width: 480px) {
          .footer-logo-container {
            max-width: 120px;
          }

          .footer-logo-image {
            max-height: 80px;
          }

          .footer-brand-text {
            font-size: 0.9rem;
          }
        }
      `}</style>
    </footer>
  );
};

export default Footer;
