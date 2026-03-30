import React from 'react';
import '../styles/ReviewSection.css';
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa';

const ReviewSection = () => {
  return (
    <section className="review-container">
      <div className="review-content">
        {/* Left side - image & stats */}
        <div className="review-image-section">
          
          <div className="image-wrapper">
            <img
              src="https://via.placeholder.com/500x300"
              alt="Doctor consultation"
              className="doctor-image"
            />
            
          </div>
        </div>

        {/* Right side - text & review */}
        <div className="review-text-section">
          <h2>What Our Patient Says About Us.</h2>
          <div className="star-rating">★★★★★</div>
          <p className="testimonial">
            "You won't regret it. I didn't even need training. I will let my mum know about this, she could really make use of it. You won't regret it. I didn't even need training.!"
          </p>
          <div className="reviewer">
            
            <div>
              <strong>Raju Choudhury</strong>
              <p className="reviewer-role">Lead Developer at WhiteFrame</p>
            </div>
          </div>
          <div className="navigation-buttons">
            <button className="nav-btn">
              <FaArrowLeft />
            </button>
            <button className="nav-btn active">
              <FaArrowRight />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ReviewSection;
