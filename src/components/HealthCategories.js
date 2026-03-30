import React, { useEffect, useState } from 'react';
import '../styles/Healthcategory.css';
import { Container, Button } from 'react-bootstrap';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const healthCategories = [
  {
    title: "Cardiology",
    image: "/images/cardiologist.png",
    specialization: "Cardiologist",
    description: "Expert cardiac care tailored for every heartbeat — from prevention to advanced treatment."
  },
  {
    title: "Neurology",
    image: "/images/neurologist.png",
    specialization: "Neurologist",
    description: "Comprehensive neurological care for brain, spine, and nerve health — all under one roof."
  },
  {
    title: "Radiology",
    image: "/images/radiology.jpeg",
    specialization: "Radiologist",
    description: "Precision imaging powered by advanced technology for accurate diagnosis and care."
  },
  {
    title: "Pulmonary",
    image: "/images/pulmonary.png",
    specialization: "Pulmonologist",
    description: "Expert pulmonary services diagnosing and treating all respiratory conditions with care."
  },
  {
    title: "Dermatology",
    image: "/images/dermatologist.jpeg",
    specialization: "Dermatologist",
    description: "Expert dermatology for all your skin, hair, and nail concerns."
  },
  {
    title: "Pediatrics",
    image: "/images/child.png",
    specialization: "Pediatrician",
    description: "Compassionate pediatric care for your child’s healthy growth and development."
  }
];

const HealthCategories = () => {
  const [doctors, setDoctors] = useState([]);
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'doctors'));
        const allDoctors = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setDoctors(allDoctors);
      } catch (error) {
        console.error('Error fetching doctors:', error);
      }
    };

    fetchDoctors();
  }, []);

  const handleConsultClick = (specialization) => {
    if (currentUser) {
      navigate(`/specialists/${encodeURIComponent(specialization)}`);
    } else {
      alert("Please log in to consult a doctor.");
      navigate("/login");
    }
  };

  const handleViewAllClick = () => {
    // Navigate to all specialties page or show more categories
    navigate("/all-specialties");
  };

  return (
    <div className="services-container">
      <Container>
        <p className="section-subheading">Our Services</p>
        <h2 className="section-heading">
          Find Our Different Services<br />
          For Your Whole Family
        </h2>
        
        <div className="services-grid">
          {healthCategories.map((item, index) => (
            <div 
              key={index} 
              className="health-card"
              onClick={() => handleConsultClick(item.specialization)}
            >
              <div className="health-card-icon">
                <img src={item.image} alt={item.title} />
              </div>
              
              <h3 className="health-card-title">{item.title}</h3>
              
              <p className="health-card-description">{item.description}</p>
              
              <div className="health-card-link">
                View Details
                <span className="arrow-icon">→</span>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </div>
  );
};

export default HealthCategories;
