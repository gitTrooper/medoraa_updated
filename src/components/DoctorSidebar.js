import React from 'react';
import {
  User,
  Activity,
  Calendar,
  Clock,
  TrendingUp
} from 'lucide-react';
import '../styles/DoctorSidebar.css'; // Make sure this CSS is linked

const DoctorSidebar = ({ doctorInfo, setShowProfileModal, activeTab, setActiveTab }) => {
  const sidebarItems = [
    { id: 'dashboard', label: 'Upcoming Appointments', icon: <Activity size={18} /> },
    { id: 'past', label: 'Past Appointments', icon: <Calendar size={18} /> },
    { id: 'slots', label: 'Slot Management', icon: <Clock size={18} /> },
    { id: 'earnings', label: 'My Earnings', icon: <TrendingUp size={18} /> },
  ];

  return (
    <div className="doctor-sidebar d-flex flex-column shadow-sm">
      
      {/* Doctor Info */}
      <div className="doctor-header d-flex align-items-center p-3 border-bottom">
        <div
          className="rounded-circle d-flex justify-content-center align-items-center me-3"
          style={{
            width: '44px',
            height: '44px',
            backgroundColor: '#4b0082',
            color: 'white',
            cursor: 'pointer',
          }}
          onClick={() => setShowProfileModal(true)}
        >
          <User size={20} />
        </div>
        <div>
          <h6 className="mb-0 fw-semibold">{doctorInfo.name || 'Doctor'}</h6>
          <small className="text-muted">{doctorInfo.specialization || 'Specialist'}</small>
        </div>
      </div>

      {/* Navigation Items */}
      <div className="flex-grow-1 p-3">
        {sidebarItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`sidebar-item btn w-100 text-start d-flex align-items-center mb-2 ${
              activeTab === item.id ? 'active' : ''
            }`}
          >
            <span className="me-2">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default DoctorSidebar;
