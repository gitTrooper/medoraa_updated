import React from 'react';
import { Bell, User, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';

const TopNavBar = ({ doctorInfo, onEditProfile }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    auth.signOut();
    navigate('/');
  };

  return (
    <div
      className="d-flex justify-content-between align-items-center px-4 py-3"
      style={{
        height: '64px',
        background: '#ffffff',
        color: '#1a1a1a',
        fontFamily: "'Inter', sans-serif",
        borderBottom: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        zIndex: 1
      }}
    >
      <div className="d-flex align-items-center">
        <div className="d-flex align-items-center me-3">
          <div 
            className="d-flex align-items-center justify-content-center me-2"
            style={{
              width: '32px',
              height: '32px',
              background: '#10b981',
              borderRadius: '6px'
            }}
          >
            <div style={{ 
              width: '12px', 
              height: '12px', 
              background: '#ffffff',
              borderRadius: '2px'
            }}></div>
          </div>
          <span className="fs-5 fw-semibold" style={{ 
            letterSpacing: '0.5px',
            color: '#1a1a1a'
          }}>
            Medcare
          </span>
        </div>
      </div>

      <div className="d-flex align-items-center gap-4">
        <span className="fw-light" style={{ 
          fontSize: '15px',
          color: '#6b7280'
        }}>
          Dr. {doctorInfo?.name || 'Doctor'}
        </span>

        <div className="position-relative">
          <Bell 
            size={20} 
            style={{ 
              cursor: 'pointer', 
              color: '#6b7280',
              transition: 'color 0.2s ease'
            }}
            onMouseEnter={(e) => e.target.style.color = '#10b981'}
            onMouseLeave={(e) => e.target.style.color = '#6b7280'}
          />
          <div 
            className="position-absolute top-0 start-100 translate-middle"
            style={{
              width: '8px',
              height: '8px',
              background: '#ef4444',
              borderRadius: '50%',
              border: '2px solid #ffffff'
            }}
          ></div>
        </div>

        <div className="dropdown">
          <User 
            size={20} 
            data-bs-toggle="dropdown" 
            style={{ 
              cursor: 'pointer', 
              color: '#6b7280',
              transition: 'color 0.2s ease'
            }}
            onMouseEnter={(e) => e.target.style.color = '#10b981'}
            onMouseLeave={(e) => e.target.style.color = '#6b7280'}
          />
          <ul className="dropdown-menu dropdown-menu-end mt-2 shadow"
              style={{
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                fontSize: '14px',
                fontFamily: "'Inter', sans-serif",
                minWidth: '180px'
              }}>
            <li>
              <button 
                className="dropdown-item d-flex align-items-center"
                onClick={onEditProfile}
                style={{
                  color: '#374151',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#f3f4f6';
                  e.target.style.color = '#10b981';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = '#374151';
                }}
              >
                Edit Profile
              </button>
            </li>
            <li>
              <button 
                className="dropdown-item d-flex align-items-center"
                onClick={() => navigate('/doctor/earnings')}
                style={{
                  color: '#374151',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#f3f4f6';
                  e.target.style.color = '#10b981';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = '#374151';
                }}
              >
                My Earnings
              </button>
            </li>
            <li><hr className="dropdown-divider" style={{ margin: '0.5rem 0', borderColor: '#e5e7eb' }} /></li>
            <li>
              <button 
                className="dropdown-item d-flex align-items-center"
                onClick={handleLogout}
                style={{
                  color: '#ef4444',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#fef2f2';
                  e.target.style.color = '#dc2626';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = '#ef4444';
                }}
              >
                <LogOut size={16} className="me-2" />
                Logout
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TopNavBar;