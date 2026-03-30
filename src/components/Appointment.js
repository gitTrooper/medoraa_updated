import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaMapMarkerAlt } from "react-icons/fa";
import NavigationBar from "./NavigationBar";
import appointmentImage from "../assets/appointment-illustration.png";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import "../styles/Appointment.css"; // ✅ Make sure this path matches your project structure

const Appointment = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredCities, setFilteredCities] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setFilteredCities(value.trim() === "" ? [] : [value]);
  };

  const handleCitySearch = async () => {
    if (!searchTerm.trim()) return alert("Please enter a city name.");
    setLoading(true);
    try {
      const hospitalsRef = collection(db, "Hospitals");
      const snapshot = await getDocs(hospitalsRef);
      const cityExists = snapshot.docs.some(
        (doc) => doc.id.toLowerCase() === searchTerm.toLowerCase()
      );

      setLoading(false);

      if (cityExists) {
        const cityDoc = snapshot.docs.find(
          (doc) => doc.id.toLowerCase() === searchTerm.toLowerCase()
        );
        navigate(`/choose-hospital/${cityDoc.id}`);
      } else {
        alert("No hospitals found in this city.");
      }
    } catch (error) {
      console.error("Error searching for city:", error);
      setLoading(false);
      alert("Error searching for city. Please try again.");
    }
  };

  return (
    <>
      <NavigationBar />
      <div className="appointment-wrapper">
        <div className="search-section">
          <h2>Book an Appointment</h2>
          <div className="search-bar">
            <FaMapMarkerAlt className="location-icon" />
            <input
              type="text"
              placeholder="Search your city"
              value={searchTerm}
              onChange={handleSearch}
            />
            <button onClick={handleCitySearch} disabled={loading}>
              {loading ? "Searching..." : "Search"}
            </button>
          </div>

          {searchTerm && filteredCities.length > 0 && (
            <ul className="suggestions">
              {filteredCities.map((city, index) => (
                <li key={index}>{city}</li>
              ))}
            </ul>
          )}

          <div className="coming-soon">
            <h4>🚧 Hospitals & Doctors Coming Soon in your city!</h4>
            <p>We're working hard to expand our services. Stay tuned.</p>
          </div>
        </div>

        <div className="illustration">
          <img src={appointmentImage} alt="Appointment Illustration" />
        </div>
      </div>
    </>
  );
};

export default Appointment;
