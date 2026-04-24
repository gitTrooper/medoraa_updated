import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import "../styles/BookAppointmentPage.css";
import NavigationBar from "./NavigationBar";

const BookAppointment = () => {
  const { city, hospitalId, doctorId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const specialization = location.state?.specialization || "General";
  const doctorEmail = location.state?.doctorEmail || "N/A";

  const [userId, setUserId] = useState(null);
  const [formData, setFormData] = useState({
    patientName: "",
    phone: "",
    appointmentDate: "",
    appointmentTime: "",
    consultationType: ""
  });
  const [appointmentType, setAppointmentType] = useState("inPerson");
  const [submitting, setSubmitting] = useState(false);

  const [availableDates, setAvailableDates] = useState([]);
  const [slotsByDate, setSlotsByDate] = useState({});
  const [filteredTimes, setFilteredTimes] = useState([]);
  const [bookedSlots, setBookedSlots] = useState([]);
  
  // State for consultation fees, doctor name and address
  const [consultationFees, setConsultationFees] = useState({
    followUpFees: 0,
    generalCheckupFees: 0,
    specialistFees: 0
  });
  const [doctorName, setDoctorName] = useState("Doctor");
  const [doctorAddress, setDoctorAddress] = useState({
    clinicAddress: "",
    city: "",
    state: ""
  });
  const [feesLoading, setFeesLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) setUserId(user.uid);
      else navigate("/login", { state: { message: "Please login to book an appointment." } });
    });
    return () => unsubscribe();
  }, [navigate]);

  // Fetch consultation fees, doctor name and address from database
  useEffect(() => {
    const fetchDoctorData = async () => {
      if (!doctorId) return;
      
      try {
        setFeesLoading(true);
        const doctorRef = doc(db, "doctors", doctorId);
        const doctorSnap = await getDoc(doctorRef);
        
        if (doctorSnap.exists()) {
          const data = doctorSnap.data();
          
          // Set consultation fees
          setConsultationFees({
            followUpFees: data.followUpFees || 0,
            generalCheckupFees: data.generalCheckupFees || 0,
            specialistFees: data.specialistFees || 0
          });
          
          // Set doctor name from firstName and lastName
          const firstName = data.firstName || "";
          const lastName = data.lastName || "";
          const fullName = `${firstName} ${lastName}`.trim() || "Doctor";
          setDoctorName(fullName);

          // Set doctor address
          setDoctorAddress({
            clinicAddress: data.clinicAddress || "",
            city: data.city || "",
            state: data.state || ""
          });

        } else {
          console.warn("Doctor document not found");
          setConsultationFees({
            followUpFees: 300,
            generalCheckupFees: 500,
            specialistFees: 1000
          });
          setDoctorName("Doctor");
          setDoctorAddress({ clinicAddress: "", city: "", state: "" });
        }
      } catch (error) {
        console.error("Error fetching doctor data:", error);
        setConsultationFees({
          followUpFees: 300,
          generalCheckupFees: 500,
          specialistFees: 1000
        });
        setDoctorName("Doctor");
        setDoctorAddress({ clinicAddress: "", city: "", state: "" });
      } finally {
        setFeesLoading(false);
      }
    };

    fetchDoctorData();
  }, [doctorId]);

  useEffect(() => {
    const fetchAvailableSlots = async () => {
      try {
        const snap = await getDocs(collection(db, "doctors", doctorId, "availableSlots"));
        const dates = [];
        const slotsMap = {};

        snap.forEach(docSnap => {
          const data = docSnap.data();
          const date = docSnap.id;
          if (data?.slots?.length > 0) {
            dates.push(date);
            slotsMap[date] = data.slots;
          }
        });

        // Sort dates chronologically
        dates.sort((a, b) => new Date(a) - new Date(b));
        
        setAvailableDates(dates);
        setSlotsByDate(slotsMap);
      } catch (err) {
        console.error("Error fetching available slots:", err);
      }
    };

    const fetchBookedSlots = async () => {
      try {
        const snap = await getDocs(collection(db, "appointments"));
        const booked = [];

        snap.forEach(docSnap => {
          const data = docSnap.data();
          if (data.doctorId === doctorId && data.appointmentDate && data.appointmentTime) {
            booked.push(`${data.appointmentDate}_${data.appointmentTime}`);
          }
        });

        setBookedSlots(booked);
      } catch (err) {
        console.error("Error fetching booked slots:", err);
      }
    };

    if (doctorId) {
      fetchAvailableSlots();
      fetchBookedSlots();
    }
  }, [doctorId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === "appointmentDate") {
      const times = (slotsByDate[value] || []).sort((a, b) => {
        const getMinutes = (t) => {
          const [h, m] = t.split("-")[0].split(":").map(Number);
          return h * 60 + m;
        };
        return getMinutes(a) - getMinutes(b);
      });

      setFilteredTimes(times);
      setFormData(prev => ({ ...prev, appointmentTime: "" }));
    }
  };

  // Updated getFee function to use database values
  const getFee = (type) => {
    switch (type) {
      case "followup": return consultationFees.followUpFees;
      case "general": return consultationFees.generalCheckupFees;
      case "specialist": return consultationFees.specialistFees;
      default: return 0;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (dateStr === today.toISOString().split('T')[0]) {
      return "Today";
    } else if (dateStr === tomorrow.toISOString().split('T')[0]) {
      return "Tomorrow";
    }
    
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short',
      year: 'numeric'
    });
  };

  // Build full address string
  const getFullAddress = () => {
    const parts = [
      doctorAddress.clinicAddress,
      doctorAddress.city,
      doctorAddress.state
    ].filter(Boolean);
    return parts.join(", ");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const appointmentFee = getFee(formData.consultationType);

      navigate("/payment", {
        state: {
          appointmentFee,
          patientName: formData.patientName,
          phone: formData.phone,
          doctorName,
          doctorId,
          appointmentDate: formData.appointmentDate,
          appointmentTime: formData.appointmentTime,
          consultationType: formData.consultationType,
          appointmentType,
          mode: appointmentType,
          doctorEmail,
          specialization,
          city,
          hospitalId
        }
      });
    } catch (error) {
      console.error("Error redirecting to payment:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedFee = formData.consultationType ? getFee(formData.consultationType) : 0;

  return (
    <>
      <NavigationBar />
      <div className="book-app-page">
        <div className="book-app-container">
          <div className="book-app-left">
            <div>
              <h1 className="book-app-brand">Medoraa</h1>
              <p style={{ opacity: 0.8, fontSize: '1.1rem', marginTop: '10px' }}>
                Book your appointment with trusted healthcare professionals
              </p>
            </div>
            
            <div className="book-app-doctor-card">
              <div className="book-app-doctor-info">
                <h3>
                  Dr. {doctorName} 
                  <span className="book-app-verified">✓</span>
                </h3>
                <p style={{ fontSize: '1.1rem', marginBottom: '12px' }}>{specialization}</p>
                <p style={{ fontSize: '0.95rem', opacity: '0.8' }}>
                  {city} • Hospital ID: {hospitalId}
                </p>

                {/* ✅ Doctor Clinic Address */}
                {getFullAddress() && (
                  <p style={{
                    fontSize: '0.9rem',
                    opacity: '0.85',
                    marginTop: '10px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '6px'
                  }}>
                    <span>📍</span>
                    <span>{getFullAddress()}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="book-app-right">
            <h2>Schedule Your Appointment</h2>
            
            <div className="book-app-type-selector">
              <label>
                <input 
                  type="radio" 
                  name="appointmentType" 
                  value="inPerson" 
                  checked={appointmentType === "inPerson"} 
                  onChange={() => setAppointmentType("inPerson")} 
                />
                <span>🏥 In-Person Visit</span>
              </label>
              <label>
                <input 
                  type="radio" 
                  name="appointmentType" 
                  value="videoCall" 
                  checked={appointmentType === "videoCall"} 
                  onChange={() => setAppointmentType("videoCall")} 
                />
                <span>📹 Video Consultation</span>
              </label>
            </div>

            <form onSubmit={handleSubmit} className="book-app-form">
              <input 
                type="text" 
                name="patientName" 
                required 
                placeholder="Patient's Full Name" 
                value={formData.patientName} 
                onChange={handleChange} 
              />
              
              <input 
                type="tel" 
                name="phone" 
                required 
                placeholder="Mobile Number (e.g., +91 9876543210)" 
                value={formData.phone} 
                onChange={handleChange} 
              />

              <select 
                name="appointmentDate" 
                required 
                value={formData.appointmentDate} 
                onChange={handleChange}
              >
                <option value="" disabled>📅 Select Available Date</option>
                {availableDates.map(date => (
                  <option key={date} value={date}>
                    {formatDate(date)}
                  </option>
                ))}
              </select>

              {formData.appointmentDate && (
                <div className="book-app-slots">
                  {filteredTimes.length === 0 && (
                    <p>No available time slots for this date</p>
                  )}
                  {filteredTimes.map((time, index) => {
                    const isBooked = bookedSlots.includes(`${formData.appointmentDate}_${time}`);
                    return (
                      <button
                        key={index}
                        type="button"
                        disabled={isBooked}
                        className={`slot-btn ${isBooked ? "booked" : "available"} ${formData.appointmentTime === time ? "selected" : ""}`}
                        onClick={() => !isBooked && setFormData(prev => ({ ...prev, appointmentTime: time }))}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
              )}

              <select 
                name="consultationType" 
                required 
                value={formData.consultationType} 
                onChange={handleChange}
                disabled={feesLoading}
              >
                <option value="" disabled>
                  {feesLoading ? "Loading consultation types..." : "🩺 Select Consultation Type"}
                </option>
                {!feesLoading && (
                  <>
                    <option value="followup">
                      Follow Up Consultation - ₹{consultationFees.followUpFees}
                    </option>
                    <option value="general">
                      General Checkup - ₹{consultationFees.generalCheckupFees}
                    </option>
                    <option value="specialist">
                      Specialist Consultation - ₹{consultationFees.specialistFees}
                    </option>
                  </>
                )}
              </select>

              {selectedFee > 0 && (
                <div className="fee-display">
                  <div className="fee-label">Consultation Fee</div>
                  <div className="fee-amount">₹{selectedFee}</div>
                </div>
              )}

              <button type="submit" disabled={submitting || !formData.appointmentTime || !formData.consultationType || feesLoading}>
                {submitting ? "Processing..." : "Book Appointment & Pay ➜"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default BookAppointment;
