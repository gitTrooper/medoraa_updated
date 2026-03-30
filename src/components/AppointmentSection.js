import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Clock3, Phone } from 'lucide-react';
import '../styles/AppointmentSection.css';

const AppointmentSection = ({ title, appointments, todayDate }) => {
  const navigate = useNavigate();

  const getCurrentDateTime = () => {
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().split(' ')[0].substring(0, 5);
    return { currentDate, currentTime };
  };

  const { currentDate, currentTime } = getCurrentDateTime();

  const isAppointmentInPast = (appointment) => {
    const apptDate = appointment.appointmentDate?.split('T')[0] || appointment.appointmentDate;

    if (apptDate < currentDate) return true;
    if (apptDate > currentDate) return false;

    const appointmentTime = appointment.appointmentTime;
    if (!appointmentTime) return false;

    const convertTo24Hour = (time) => {
      if (!time) return '00:00';
      if (time.includes('-')) return time.split('-')[1];

      if (time.includes('AM') || time.includes('PM')) {
        const [timePart, period] = time.split(' ');
        let [hours, minutes] = timePart.split(':').map(Number);
        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        return `${hours.toString().padStart(2, '0')}:${minutes}`;
      }

      return time;
    };

    const normalizedAppointmentTime = convertTo24Hour(appointmentTime);
    return normalizedAppointmentTime < currentTime;
  };

  const filteredAppointments = appointments.filter(appt => {
    const isPast = isAppointmentInPast(appt);
    return title === "Past Appointments" ? isPast : !isPast;
  });

  const sortedAppointments = filteredAppointments.sort((a, b) => {
    const dateA = a.appointmentDate?.split('T')[0] || a.appointmentDate;
    const dateB = b.appointmentDate?.split('T')[0] || b.appointmentDate;

    if (dateA !== dateB) return dateA.localeCompare(dateB);

    const convertTo24Hour = (time) => {
      if (!time) return '00:00';
      if (time.includes('-')) return time.split('-')[0];
      if (time.includes('AM') || time.includes('PM')) {
        const [timePart, period] = time.split(' ');
        let [hours, minutes] = timePart.split(':').map(Number);
        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        return `${hours.toString().padStart(2, '0')}:${minutes}`;
      }
      return time;
    };

    const timeA = convertTo24Hour(a.appointmentTime || '00:00');
    const timeB = convertTo24Hour(b.appointmentTime || '00:00');

    return timeA.localeCompare(timeB);
  });

  return (
    <div className="appointment-section">
      <h4 className="appointment-section-title">{title}</h4>

      {sortedAppointments.length === 0 ? (
        <div className="empty-state">No {title.toLowerCase()}.</div>
      ) : (
        <div className="appointments-grid">
          {sortedAppointments.map((appointment, index) => {
            const isGenerated = appointment?.prescriptionGenerated === true;

            return (
              <div key={index} className="appointment-card">
                <div className="appointment-card-body">
                  <div className="patient-info">
                    <h5 className="patient-name">{appointment.patientName}</h5>
                    <div className="patient-phone">
                      <Phone size={16} />
                      {appointment.phone}
                    </div>
                  </div>

                  <div className="appointment-datetime">
                    <div className="appointment-date">
                      <CalendarDays size={16} />
                      {appointment.appointmentDate}
                    </div>
                    <div className="appointment-time">
                      <Clock3 size={16} />
                      {appointment.appointmentTime}
                    </div>
                  </div>

                  <div className="appointment-actions">
                    <div className="badges-container">
                      <span className="consultation-badge">
                        {appointment.consultationType}
                      </span>
                      <span className={`status-badge ${isGenerated ? 'completed' : 'pending'}`}>
                        {isGenerated ? 'Completed' : 'Pending'}
                      </span>
                    </div>

                    <button
                      className="prescription-btn"
                      disabled={isGenerated}
                      onClick={() => {
                        if (!isGenerated) {
                          navigate('/prescription', { state: { appointment } });
                        }
                      }}
                    >
                      {isGenerated
                        ? 'Prescription Already Generated'
                        : 'Generate Prescription'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AppointmentSection;
