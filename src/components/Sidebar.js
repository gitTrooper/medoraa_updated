// File: Sidebar.jsx
import React, { useState } from 'react';
import {
  Activity,
  Calendar,
  Clock,
  TrendingUp,
  User,
  Pencil,
  LogOut,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DoctorEditProfile from '../components/DoctorEditProfile'; // adjust path if needed

import '../styles/Sidebar.css';

const Sidebar = ({ activeTab, setActiveTab, doctorInfo, onLogout }) => {
  const navigate = useNavigate();

  // List of sidebar tabs
  const sidebarItems = [
    { id: 'dashboard', label: 'Upcoming', icon: Activity },
    { id: 'past', label: 'Past Appointments', icon: Calendar },
    { id: 'slots', label: 'Slot Management', icon: Clock },
    { id: 'earnings', label: 'My Earnings', icon: TrendingUp },
    { id: 'edit', label: 'Edit Profile', icon: Pencil },
  ];

  // Handle logout
  const handleLogout = () => {
    if (typeof onLogout === 'function') {
      onLogout();
    }
    navigate('/');
  };

  return (
    <div
      className="doctor-sidebar-container d-flex flex-column"
      style={{
        width: '260px',
        minHeight: '100vh',
        background: 'linear-gradient(to bottom, #4338ca, #6366f1)',
        color: '#ffffff',
        padding: '20px',
        fontFamily: "'Inter', sans-serif",
        boxShadow: '2px 0 12px rgba(0, 0, 0, 0.05)',
      }}
    >
      {/* Profile Header */}
      <div className="doctor-sidebar-header mb-4">
        <div className="d-flex align-items-center gap-3">
          <div
            className="doctor-profile-image-container"
            style={{
              width: 56,
              height: 56,
              border: '2px solid #fff',
              borderRadius: '50%',
              overflow: 'hidden',
              backgroundColor: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {doctorInfo?.profileImageMeta?.url ? (
              <img
                src={doctorInfo.profileImageMeta.url}
                alt="Profile"
                className="doctor-profile-image"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: '50%',
                }}
              />
            ) : (
              <User size={28} className="text-primary" />
            )}
          </div>

          <div className="doctor-info-section">
            <h6 className="doctor-name mb-0 fw-semibold" style={{ fontSize: '1rem' }}>
              {doctorInfo?.name || 'Doctor'}
            </h6>
            <small className="doctor-specialization text-light" style={{ fontSize: '0.75rem' }}>
              {doctorInfo?.specialization || 'Specialist'}
            </small>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="doctor-sidebar-nav flex-grow-1">
        <ul className="doctor-nav-list list-unstyled">
          {sidebarItems.map(item => (
            <li key={item.id} className="doctor-nav-item mb-2">
              <button
                onClick={() => setActiveTab(item.id)}
                className={`doctor-nav-button d-flex align-items-center gap-2 w-100 px-3 py-2 rounded ${
                  activeTab === item.id ? 'doctor-nav-active' : ''
                }`}
                style={{
                  backgroundColor: activeTab === item.id ? 'rgba(255,255,255,0.2)' : 'transparent',
                  color: '#fff',
                  fontWeight: activeTab === item.id ? 600 : 400,
                  border: 'none',
                  fontSize: '0.95rem',
                  transition: 'background-color 0.2s ease, color 0.2s ease',
                }}
              >
                <item.icon size={18} />
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Logout Button - fixed to bottom */}
      <div className="doctor-sidebar-logout mt-auto pt-3 border-top border-light-subtle">
        <button
          onClick={handleLogout}
          className="doctor-nav-button d-flex align-items-center gap-2 w-100 px-3 py-2 rounded"
          style={{
            color: '#ffdddd',
            backgroundColor: 'transparent',
            border: 'none',
            fontSize: '0.95rem',
            transition: 'background-color 0.2s ease, color 0.2s ease',
          }}
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
