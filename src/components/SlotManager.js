import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { 
  doc, 
  setDoc, 
  updateDoc, 
  getDoc, 
  arrayUnion, 
  arrayRemove,
  collection,
  getDocs,
  query,
  where
} from 'firebase/firestore';
import { db, auth } from '../firebase';


const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};


const FirebaseSlotManager = {
  addSlot: async (doctorId, slot, date) => {
  try {
    const dateString = formatLocalDate(date); // ✅ Updated to use local date format
    const slotDocRef = doc(db, 'doctors', doctorId, 'availableSlots', dateString);
    const docSnap = await getDoc(slotDocRef);
    const cleanedSlot = slot.trim(); // Always clean slot to avoid mismatches

    if (docSnap.exists()) {
      await updateDoc(slotDocRef, {
        slots: arrayUnion(cleanedSlot),
        lastUpdated: new Date()
      });
    } else {
      await setDoc(slotDocRef, {
        date: dateString,
        slots: [cleanedSlot],
        createdAt: new Date(),
        lastUpdated: new Date()
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error adding slot:', error);
    return { success: false, error: error.message };
  }
},

  removeSlot: async (doctorId, slot, date) => {
  try {
    const dateString = formatLocalDate(date); // ✅ Use local date format
    const slotDocRef = doc(db, 'doctors', doctorId, 'availableSlots', dateString);
    const docSnap = await getDoc(slotDocRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      const currentSlots = data.slots || [];

      const cleanedSlot = slot.trim(); // ✅ Ensure match for arrayRemove

      if (currentSlots.includes(cleanedSlot)) {
        await updateDoc(slotDocRef, {
          slots: arrayRemove(cleanedSlot),
          lastUpdated: new Date()
        });
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error removing slot:', error);
    return { success: false, error: error.message };
  }
},

  fetchAvailableSlots: async (doctorId) => {
    try {
      const slotsCollectionRef = collection(db, 'doctors', doctorId, 'availableSlots');
      const querySnapshot = await getDocs(slotsCollectionRef);
      const availableSlots = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const slots = data.slots || [];
        slots.forEach(slot => {
          availableSlots.push({
            date: data.date,
            time: slot
          });
        });
      });
      return { success: true, data: availableSlots };
    } catch (error) {
      console.error('Error fetching available slots:', error);
      return { success: false, error: error.message };
    }
  },

  fetchAppointments: async (doctorId) => {
    try {
      const appointmentsRef = collection(db, 'appointments');
      const q = query(appointmentsRef, where('doctorId', '==', doctorId));
      const querySnapshot = await getDocs(q);
      const appointments = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        appointments.push({
          id: doc.id,
          ...data
        });
      });
      
      // Debug: Log the fetched appointments structure
      console.log('🔍 DEBUG - Fetched appointments for doctor:', doctorId);
      console.log('📅 Appointments data:', appointments);
      if (appointments.length > 0) {
        console.log('📋 Sample appointment structure:', appointments[0]);
        console.log('📋 Available fields:', Object.keys(appointments[0]));
      }
      
      return { success: true, data: appointments };
    } catch (error) {
      console.error('Error fetching appointments:', error);
      return { success: false, error: error.message };
    }
  }
};

const generateWeekDates = (startDate = new Date()) => {
  const dates = [];
  const today = new Date(startDate);
  today.setHours(0, 0, 0, 0); // normalize time
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    dates.push(date);
  }
  return dates;
};


const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 9; hour <= 17; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const startHour = hour.toString().padStart(2, '0');
      const startMinute = minute.toString().padStart(2, '0');
      let endHour = hour;
      let endMinute = minute + 15;
      if (endMinute >= 60) {
        endHour += 1;
        endMinute -= 60;
      }
      const endHourStr = endHour.toString().padStart(2, '0');
      const endMinuteStr = endMinute.toString().padStart(2, '0');
      const timeSlot = `${startHour}:${startMinute}-${endHourStr}:${endMinuteStr}`;
      slots.push(timeSlot);
    }
  }
  return slots;
};

// SlotManager Component
const SlotManager = ({
  slots,
  selectedDate,
  setSelectedDate,
  weekDates,
  availableSlots,
  appointments,
  addSlot,
  removeSlot,
  loading = false
}) => {
  const formatDate = (date) =>
    date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

  const formatDateFromISO = (isoString) => {
    try {
      return isoString?.split('T')[0] || 'Unknown Date';
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Unknown Date';
    }
  };

  const isSlotBooked = (date, slot) => {
    try {
      if (!appointments || !Array.isArray(appointments)) {
        console.log('⚠️ DEBUG - No appointments array found');
        return false;
      }
      
      const dateString = date.toISOString().split('T')[0]; // Get YYYY-MM-DD format
      console.log(`🔍 DEBUG - Checking if slot ${slot} is booked on ${dateString}`);
      console.log(`📊 DEBUG - Total appointments to check: ${appointments.length}`);
      
      const matchingAppointments = appointments.filter((appointment) => {
        if (!appointment) return false;
        
        // Check multiple possible date formats in appointment
        const appointmentDate = appointment.date || appointment.formattedDate || appointment.appointmentDate;
        let appointmentDateString = '';
        
        if (appointmentDate) {
          // Handle different date formats
          if (typeof appointmentDate === 'string') {
            if (appointmentDate.includes('T')) {
              // ISO string format
              appointmentDateString = appointmentDate.split('T')[0];
            } else {
              // Already in YYYY-MM-DD format
              appointmentDateString = appointmentDate;
            }
          } else if (appointmentDate.toISOString) {
            // Date object
            appointmentDateString = appointmentDate.toISOString().split('T')[0];
          }
        }
        
        // Check time field variations
        const appointmentTime = appointment.time || appointment.slot || appointment.timeSlot || appointment.appointmentTime;
        
        // Match both date and time slot
        const dateMatches = appointmentDateString === dateString;
        const timeMatches = appointmentTime === slot;
        
        console.log(`📋 DEBUG - Appointment check:`, {
          appointmentId: appointment.id,
          appointmentDateString,
          appointmentTime,
          targetDate: dateString,
          targetSlot: slot,
          dateMatches,
          timeMatches,
          overallMatch: dateMatches && timeMatches
        });
        
        return dateMatches && timeMatches;
      });
      
      console.log(`✅ DEBUG - Found ${matchingAppointments.length} matching appointments for ${slot} on ${dateString}`);
      return matchingAppointments.length > 0;
      
    } catch (error) {
      console.error('Error checking if slot is booked:', error);
      return false;
    }
  };

  const isSlotAlreadyAvailable = (date, slot) => {
    try {
      if (!availableSlots || !Array.isArray(availableSlots)) return false;
      
      const dateString = formatDateFromISO(date.toISOString());
      return availableSlots.some(
        (s) =>
          s && s.time === slot && s.date === dateString
      );
    } catch (error) {
      console.error('Error checking if slot is available:', error);
      return false;
    }
  };

  const handleSlotClick = async (slot) => {
    if (loading) return;
    
    try {
      const isBooked = isSlotBooked(selectedDate, slot);
      const isAvailable = isSlotAlreadyAvailable(selectedDate, slot);
      
      // Don't allow any action on booked slots
      if (isBooked) return;
      
      if (isAvailable) {
        // Remove the slot (only if not booked)
        if (typeof removeSlot === 'function') {
          await removeSlot(slot, selectedDate);
        }
      } else {
        // Add the slot
        if (typeof addSlot === 'function') {
          await addSlot(slot, selectedDate);
        }
      }
    } catch (error) {
      console.error('Error handling slot click:', error);
    }
  };

  const handleRemoveSlot = async (e, slot) => {
    if (loading) return;
    
    try {
      e.stopPropagation();
      
      // Check if slot is booked before allowing removal
      const isBooked = isSlotBooked(selectedDate, slot);
      if (isBooked) return; // Don't allow removal of booked slots
      
      if (typeof removeSlot === 'function') {
        await removeSlot(slot, selectedDate);
      }
    } catch (error) {
      console.error('Error removing slot:', error);
    }
  };

  const handleDateChange = (e) => {
    try {
      const newDate = new Date(e.target.value);
      if (!isNaN(newDate.getTime()) && typeof setSelectedDate === 'function') {
        setSelectedDate(newDate);
      }
    } catch (error) {
      console.error('Error changing date:', error);
    }
  };

  // Safety checks
  if (!slots || !Array.isArray(slots)) {
    return <div>Error: Slots data is not available</div>;
  }

  if (!selectedDate || isNaN(selectedDate.getTime())) {
    return <div>Error: Invalid selected date</div>;
  }

  if (!weekDates || !Array.isArray(weekDates)) {
    return <div>Error: Week dates data is not available</div>;
  }

  return (
    <>
      <style>{`
        .slot-manager-card {
          background: #ffffff;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.06);
          font-family: 'Segoe UI', sans-serif;
          position: relative;
        }

        .slot-manager-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #eaeaea;
          padding-bottom: 12px;
          margin-bottom: 20px;
        }

        .slot-manager-header h5 {
          font-size: 20px;
          font-weight: 600;
          color: #2c3e50;
          margin: 0;
        }

        .slot-manager-select {
          padding: 6px 12px;
          border-radius: 8px;
          border: 1px solid #ccc;
          background-color: #f9f9f9;
          font-size: 14px;
        }

        .slot-button {
          width: 100%;
          padding: 10px 12px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 500;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: background-color 0.2s ease, box-shadow 0.2s ease;
          cursor: pointer;
          border: none;
        }

        .slot-button:not(:disabled):hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }

        .slot-default {
          color: #0d6efd;
          border: 1px solid #0d6efd !important;
          background-color: #fff;
        }

        .slot-available {
          background-color: #198754;
          color: white;
          border: none;
        }

        .slot-booked {
          background-color: #6c757d !important;
          color: #ffffff !important;
          cursor: not-allowed !important;
          border: 1px solid #6c757d !important;
        }

        .slot-booked:hover {
          background-color: #6c757d !important;
          box-shadow: none !important;
        }

        .slot-close-icon {
          margin-left: 8px;
          cursor: pointer;
          color: white;
          opacity: 0.9;
        }

        .slot-close-icon:hover {
          opacity: 1;
        }

        .slot-note {
          font-size: 13px;
          color: #777;
          margin-top: 16px;
        }

        .loading-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(255, 255, 255, 0.8);
          display: flex;
          justify-content: center;
          align-items: center;
          border-radius: 16px;
          z-index: 10;
        }

        .spinner {
          border: 3px solid #f3f3f3;
          border-top: 3px solid #0d6efd;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .slot-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 8px;
        }
      `}</style>

      <div className="slot-manager-card">
        {loading && (
          <div className="loading-overlay">
            <div className="spinner"></div>
          </div>
        )}
        
        <div className="slot-manager-header">
          <h5>Slot Management</h5>
          
          <select
  className="slot-manager-select"
  value={formatLocalDate(selectedDate)} // ✅ local date format
  onChange={(e) => setSelectedDate(new Date(e.target.value))}
>
  {weekDates.map((d) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (d < today) return null;

    const localDateStr = formatLocalDate(d); // ✅ local date for option
    return (
      <option key={localDateStr} value={localDateStr}>
        {formatDate(d)}
      </option>
    );
  })}
</select>



        </div>

        <div className="slot-grid">
          {slots.map((slot) => {
            const isBooked = isSlotBooked(selectedDate, slot);
            const isAvailable = isSlotAlreadyAvailable(selectedDate, slot);

            return (
              <div key={slot}>
                <button
                  className={`slot-button ${
                    isBooked
                      ? 'slot-booked'
                      : isAvailable
                      ? 'slot-available'
                      : 'slot-default'
                  }`}
                  disabled={isBooked || loading}
                  onClick={() => handleSlotClick(slot)}
                >
                  <span>{slot}</span>
                  {/* Only show X icon for available slots that are NOT booked */}
                  {!isBooked && isAvailable && (
                    <X
                      size={14}
                      className="slot-close-icon"
                      onClick={(e) => handleRemoveSlot(e, slot)}
                    />
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <div className="slot-note">
          <strong>Legend:</strong> 
          <span style={{color: '#0d6efd'}}> Blue</span> - Available to add | 
          <span style={{color: '#198754'}}> Green</span> - Available slot | 
          <span style={{color: '#6c757d'}}> Grey</span> - Booked (cannot modify)
        </div>
      </div>
    </>
  );
};

// Main Container Component
const SlotManagerContainer = () => {
  const [doctorId, setDoctorId] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [availableSlots, setAvailableSlots] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const slots = generateTimeSlots();
  const weekDates = generateWeekDates();

  useEffect(() => {
    const fetchDoctorId = async () => {
      const user = auth.currentUser;
      if (user) {
        const docRef = doc(db, 'doctors', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setDoctorId(user.uid);
        }
      }
    };
    fetchDoctorId();
  }, []);

  useEffect(() => {
    if (doctorId) {
      loadInitialData();
    }
  }, [doctorId]);

  const loadInitialData = async () => {
    if (!doctorId) return;
    setInitialLoading(true);
    try {
      const [slotsResult, appointmentsResult] = await Promise.all([
        FirebaseSlotManager.fetchAvailableSlots(doctorId),
        FirebaseSlotManager.fetchAppointments(doctorId)
      ]);
      if (slotsResult.success) {
        setAvailableSlots(slotsResult.data);
      }
      if (appointmentsResult.success) {
        setAppointments(appointmentsResult.data);
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleAddSlot = async (slot, date) => {
  setLoading(true);
  try {
    const result = await FirebaseSlotManager.addSlot(doctorId, slot, date);
    if (result.success) {
      const dateString = formatLocalDate(date); // ✅ Use local format
      setAvailableSlots(prev => [...prev, { date: dateString, time: slot.trim() }]);
    } else {
      alert('Error adding slot: ' + result.error);
    }
  } catch (error) {
    console.error('Error adding slot:', error);
    alert('Error adding slot: ' + error.message);
  } finally {
    setLoading(false);
  }
};

  const handleRemoveSlot = async (slot, date) => {
  setLoading(true);
  try {
    const result = await FirebaseSlotManager.removeSlot(doctorId, slot, date);
    if (result.success) {
      const dateString = date.toISOString().split('T')[0]; // ❌ Old: prone to mismatch
      setAvailableSlots(prev => prev.filter(s => !(s.date === dateString && s.time === slot)));
    } else {
      alert('Error removing slot: ' + result.error);
    }
  } catch (error) {
    console.error('Error removing slot:', error);
    alert('Error removing slot: ' + error.message);
  } finally {
    setLoading(false);
  }
};



  if (!doctorId) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center', 
        color: '#0d6efd',
        border: '1px solid #0d6efd',
        borderRadius: '8px',
        backgroundColor: '#e7f1ff'
      }}>
        Loading doctor information...
      </div>
    );
  }

  if (initialLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '400px' 
      }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <SlotManager
      slots={slots}
      selectedDate={selectedDate}
      setSelectedDate={setSelectedDate}
      weekDates={weekDates}
      availableSlots={availableSlots}
      appointments={appointments}
      addSlot={handleAddSlot}
      removeSlot={handleRemoveSlot}
      loading={loading}
    />
  );
};

export default SlotManagerContainer;