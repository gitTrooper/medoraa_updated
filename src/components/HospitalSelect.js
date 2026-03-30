import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { collection, getDocs, doc } from "firebase/firestore";
import NavigationBar from "./NavigationBar";
import { 
  FaStar, 
  FaRegStar, 
  FaHospital, 
  FaMapMarkerAlt, 
  FaArrowRight,
  FaUserMd,
  FaAward,
  FaSpinner
} from "react-icons/fa";

const HospitalSelect = () => {
  const { city } = useParams();
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHospitals = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Access path: /Hospitals/[city]/List of Hospitals
        const cityDoc = doc(db, "Hospitals", city);
        const hospitalsCollectionRef = collection(cityDoc, "List of Hospitals");
        
        const snapshot = await getDocs(hospitalsCollectionRef);
        
        if (snapshot.empty) {
          console.log("No hospitals found in this city");
          setHospitals([]);
          setLoading(false);
          return;
        }
        
        const hospitalsData = snapshot.docs.map(doc => {
          const data = doc.data();
          console.log("Raw hospital data:", data);
          
          return {
            id: doc.id,
            name: data["Hospital Name"] || "Unknown Hospital",
            rating: data["Hospital Rating"] || 1,
            address: data["Hospital Address"] || "Address not available",
            specialty: data["Specialty"] || "General Medicine",
            doctors: data["Total Doctors"] || "10+",
            established: data["Established"] || "2000"
          };
        });
        
        console.log("Processed hospitals:", hospitalsData);
        setHospitals(hospitalsData);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching hospitals:", error);
        setError("Failed to load hospitals. Please try again.");
        setLoading(false);
      }
    };
    
    fetchHospitals();
  }, [city]);

  // Function to render rating stars
  const renderRatingStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        stars.push(
          <FaStar key={i} className="text-warning me-1" />
        );
      } else if (i === fullStars + 1 && hasHalfStar) {
        stars.push(
          <FaStar key={i} className="text-warning me-1" style={{ opacity: 0.5 }} />
        );
      } else {
        stars.push(
          <FaRegStar key={i} className="text-muted me-1" />
        );
      }
    }
    return (
      <div className="d-flex align-items-center">
        {stars}
        <span className="ms-2 text-muted small">({rating})</span>
      </div>
    );
  };

  // Loading Component
  if (loading) {
    return (
      <>
        <NavigationBar />
        <div className="container-fluid medical-bg min-vh-100 py-5">
          <div className="container">
            <div className="row justify-content-center">
              <div className="col-md-6 text-center">
                <div className="loading-card p-5 rounded-4 shadow-lg">
                  <FaSpinner className="fa-spin text-primary mb-3" size={48} />
                  <h4 className="text-primary mb-2">Loading Hospitals...</h4>
                  <p className="text-muted">Please wait while we fetch the best hospitals in {city}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Error Component
  if (error) {
    return (
      <>
        <NavigationBar />
        <div className="container-fluid medical-bg min-vh-100 py-5">
          <div className="container">
            <div className="row justify-content-center">
              <div className="col-md-6 text-center">
                <div className="error-card p-5 rounded-4 shadow-lg">
                  <div className="text-danger mb-3">
                    <FaHospital size={48} />
                  </div>
                  <h4 className="text-danger mb-2">Error Loading Hospitals</h4>
                  <p className="text-muted mb-4">{error}</p>
                  <button 
                    className="btn btn-primary btn-lg"
                    onClick={() => window.location.reload()}
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <NavigationBar />
      <div className="container-fluid medical-bg min-vh-100 py-5">
        <div className="container">
          {/* Header Section */}
          <div className="row mb-5">
            <div className="col-12 text-center">
              <div className="header-content">
                <h1 className="display-4 fw-bold text-primary mb-3">
                  Healthcare Centers in {city}
                </h1>
                <p className="lead text-muted mb-4">
                  Choose from the best hospitals and medical facilities in your area
                </p>
                <div className="header-divider mx-auto"></div>
              </div>
            </div>
          </div>

          {/* Results Count */}
          <div className="row mb-4">
            <div className="col-12">
              <div className="results-info p-3 rounded-3 bg-light border-start border-primary border-4">
                <h5 className="mb-0 text-primary">
                  <FaHospital className="me-2" />
                  {hospitals.length} Hospital{hospitals.length !== 1 ? 's' : ''} Found
                </h5>
              </div>
            </div>
          </div>

          {/* Hospitals Grid */}
          <div className="row g-4">
            {hospitals.length > 0 ? (
              hospitals.map((hospital, index) => (
                <div key={hospital.id} className="col-lg-6 col-xl-4">
                  <div 
                    className={`hospital-card h-100 shadow-lg rounded-4 overflow-hidden position-relative animate-card`}
                    style={{ animationDelay: `${index * 0.1}s` }}
                    onClick={() => navigate(`/select-doctor/${city}/${hospital.id}`)}
                  >
                    {/* Card Header */}
                    <div className="card-header-gradient p-4 text-white position-relative">
                      <div className="d-flex align-items-center mb-3">
                        <div className="hospital-icon-container me-3">
                          <FaHospital size={32} />
                        </div>
                        <div>
                          <h5 className="card-title mb-1 fw-bold">{hospital.name}</h5>
                          <small className="opacity-75">
                            <FaAward className="me-1" />
                            Est. {hospital.established}
                          </small>
                        </div>
                      </div>
                      
                      {/* Rating */}
                      <div className="rating-container">
                        {renderRatingStars(hospital.rating)}
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="card-body p-4">
                      {/* Address */}
                      <div className="mb-3">
                        <div className="d-flex align-items-start">
                          <FaMapMarkerAlt className="text-primary me-2 mt-1 flex-shrink-0" />
                          <p className="mb-0 text-muted small">{hospital.address}</p>
                        </div>
                      </div>

                      {/* Specialty */}
                      <div className="mb-3">
                        <span className="badge bg-primary bg-gradient px-3 py-2 rounded-pill">
                          {hospital.specialty}
                        </span>
                      </div>

                      {/* Doctors Count */}
                      <div className="mb-3">
                        <div className="d-flex align-items-center text-muted">
                          <FaUserMd className="me-2" />
                          <small>{hospital.doctors} Doctors Available</small>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="card-footer bg-transparent border-0 p-4 pt-0">
                      <button className="btn btn-primary w-100 btn-lg rounded-pill shadow-sm">
                        <span className="me-2">View Doctors</span>
                        <FaArrowRight className="transition-transform" />
                      </button>
                    </div>

                    {/* Hover Overlay */}
                    <div className="hover-overlay position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center">
                      <div className="text-white text-center">
                        <FaArrowRight size={24} className="mb-2" />
                        <p className="mb-0 fw-bold">Click to View Doctors</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-12">
                <div className="no-results-card text-center p-5 rounded-4 shadow-lg">
                  <FaHospital size={64} className="text-muted mb-4" />
                  <h4 className="text-muted mb-3">No Hospitals Found</h4>
                  <p className="text-muted mb-4">
                    We couldn't find any hospitals in {city}. Please try a different location.
                  </p>
                  <button 
                    className="btn btn-primary btn-lg"
                    onClick={() => navigate('/select-city')}
                  >
                    Select Different City
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default HospitalSelect;