import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import "../styles/AppointmentPage.css";
import NavigationBar from "./NavigationBar";
import { FaStar, FaRegStar, FaUserMd } from "react-icons/fa";

const DoctorSelect = () => {
  const { city, hospitalId } = useParams();
  const [doctors, setDoctors] = useState([]);
  const [hospitalName, setHospitalName] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Path: /Hospitals/[city]/List of Hospitals/[hospitalId]
        const hospitalRef = doc(db, "Hospitals", city, "List of Hospitals", hospitalId);
        const hospitalSnap = await getDoc(hospitalRef);
        
        if (hospitalSnap.exists()) {
          const hospitalData = hospitalSnap.data();
          console.log("Raw hospital data:", hospitalData); // Debug log to see actual field names
          
          // Use the correct field name for hospital name
          setHospitalName(hospitalData["Hospital Name"] || "Selected Hospital");
          
          // Path: /Hospitals/[city]/List of Hospitals/[hospitalId]/List of Doctors
          const doctorsCollectionRef = collection(hospitalRef, "List of Doctors");
          const doctorsSnapshot = await getDocs(doctorsCollectionRef);
          
          if (doctorsSnapshot.empty) {
            console.log("No doctors found for this hospital");
            setDoctors([]);
            setLoading(false);
            return;
          }
          
          const doctorsData = doctorsSnapshot.docs.map(doc => {
            const data = doc.data();
            console.log("Raw doctor data:", data); // Debug log to see actual field names
            
            return {
              id: doc.id,
              name: data["Doctor Name"] || "Unknown Doctor",
              specialization: data["Specialization"] || "General",
              qualifications: data["Qualifications"] || "Not specified",
              rating: data["Rating"] || 1
            };
          });
          
          console.log("Processed doctors:", doctorsData);
          setDoctors(doctorsData);
        } else {
          console.log("Hospital not found");
        }
      } catch (error) {
        console.error("Error fetching doctors:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [city, hospitalId]);

  // Function to render rating stars
  const renderRatingStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= rating) {
        stars.push(<FaStar key={i} className="star-filled" />);
      } else {
        stars.push(<FaRegStar key={i} className="star-empty" />);
      }
    }
    return <div className="doctor-rating">{stars}</div>;
  };

  return (
    <>
      <NavigationBar />
      <div className="appointment-page">
        <h2 className="selection-title">Select Doctor at {hospitalName}</h2>
        {loading ? (
          <div className="loading-indicator">Loading doctors...</div>
        ) : (
          <div className="doctors-grid">
            {doctors.length > 0 ? (
              doctors.map(doctor => (
                <div 
                  key={doctor.id}
                  className="doctor-card"
                  onClick={() => navigate(`/book-appointment/${city}/${hospitalId}/${doctor.id}`)}
                >
                  <div className="doctor-image">
                    <FaUserMd size={48} />
                  </div>
                  <div className="doctor-info">
                    <h3 className="doctor-name">{doctor.name}</h3>
                    {renderRatingStars(doctor.rating)}
                    <p className="doctor-specialty">{doctor.specialization}</p>
                    <p className="doctor-qualifications">{doctor.qualifications}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="no-results">No doctors found at {hospitalName}.</p>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default DoctorSelect;