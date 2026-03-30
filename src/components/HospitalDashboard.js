import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import '../styles/HospitalDashboard.css';
import {
  User, LogOut, Users, Activity, MapPin, Phone, Mail, Bed, UserCheck,
  AlertCircle, Plus, Edit, Trash2, X, Building, Shield, Calendar, Droplets
} from 'lucide-react';

// Reusable Modal Component
const Modal = React.memo(({ show, onClose, title, children, size = 'medium' }) => {
  if (!show) return null;
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal-content ${size}`}>
        <div className="modal-header">
          <div className="modal-title-section">
            <h3 className="modal-title">{title}</h3>
            <div className="modal-title-underline"></div>
          </div>
          <button onClick={onClose} className="modal-close-btn">
            <X className="modal-close-icon" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
});

// Reusable FormInput Component
const FormInput = React.memo(({ label, type = "text", value, onChange, icon: Icon, ...props }) => (
  <div className="form-group">
    <label className="form-label">{label}</label>
    <div className="form-input-wrapper">
      {Icon && <Icon className="form-input-icon" />}
      <input
        type={type}
        className={`form-input ${Icon ? 'has-icon' : ''}`}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        {...props}
      />
    </div>
  </div>
));

// Reusable StatusBadge Component
const StatusBadge = React.memo(({ status }) => (
  <span className={`status-badge status-${status}`}>{status}</span>
));

// Reusable StatCard Component
const StatCard = React.memo(({ title, value, icon: Icon, color, onClick }) => (
  <div className={`stat-card ${onClick ? 'clickable' : ''}`} onClick={onClick}>
    <div className="stat-card-border" style={{ background: color }}></div>
    <div className="stat-card-header">
      <div className="stat-card-icon-wrapper" style={{ background: `${color}1A` }}>
        <Icon className="stat-card-icon" style={{ color }} />
      </div>
      <div className="stat-card-pulse" style={{ background: color }}></div>
    </div>
    <div>
      <h3 className="stat-card-value">{value}</h3>
      <p className="stat-card-title">{title}</p>
    </div>
  </div>
));

// InfoCard Component (already existing, included for completeness)
const InfoCard = React.memo(({ hospitalInfo, doctorsList }) => (
  <div className="info-card-footer">
    <div className="info-card-header">
      <h3>Hospital Information</h3>
      <span className="info-card-subtitle">Facility Details</span>
    </div>
    <div className="info-card-grid">
      <div className="info-card-section">
        <div className="info-card-item">
          <MapPin className="info-card-icon" />
          <div>
            <span className="info-card-label">Location</span>
            <p className="info-card-value">{hospitalInfo.address}, {hospitalInfo.city}</p>
          </div>
        </div>
        <div className="info-card-item">
          <Phone className="info-card-icon" />
          <div>
            <span className="info-card-label">Contact</span>
            <p className="info-card-value">{hospitalInfo.phone}</p>
          </div>
        </div>
      </div>
      <div className="info-card-section">
        <div className="info-card-item">
          <Mail className="info-card-icon" />
          <div>
            <span className="info-card-label">Email</span>
            <p className="info-card-value">{hospitalInfo.email}</p>
          </div>
        </div>
      </div>
      <div className="info-card-section stats-section">
        <div className="info-card-stat">
          <Bed className="info-card-icon stat-icon" />
          <div>
            <span className="info-card-label">Total Beds</span>
            <p className="info-card-value">
              {(hospitalInfo.services?.bedAvailability?.ICU || 0) + (hospitalInfo.services?.bedAvailability?.General || 0)}
            </p>
          </div>
        </div>
        <div className="info-card-stat">
          <UserCheck className="info-card-icon stat-icon" />
          <div>
            <span className="info-card-label">Total Doctors</span>
            <p className="info-card-value">{doctorsList.totalDoctors}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
));

const HospitalDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  // Updated modals state to include 'bloodBank'
  const [modals, setModals] = useState({ profile: false, addDoctor: false, removeConfirm: false, bloodBank: false });
  const [doctorToRemove, setDoctorToRemove] = useState(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [hospitalInfo, setHospitalInfo] = useState({
    name: '', address: '', city: '', phone: '', email: '',
    services: { bedAvailability: { ICU: 0, General: 0 }, emergency: { available: false } }
  });
  const [doctorsList, setDoctorsList] = useState({ doctorIds: [], totalDoctors: 0, lastUpdated: null });
  const [doctorsData, setDoctorsData] = useState([]);
  const [profileFormData, setProfileFormData] = useState({});
  const [addDoctorFormData, setAddDoctorFormData] = useState({ doctorId: '', licenseNumber: '' });
  const [loading, setLoading] = useState({});

  // State for Blood Bank Data
  const [bloodBankData, setBloodBankData] = useState({
    'A+': 0, 'A-': 0, 'B+': 0, 'B-': 0,
    'AB+': 0, 'AB-': 0, 'O+': 0, 'O-': 0
  });

  const navigate = useNavigate();
  const hospitalId = auth.currentUser?.uid;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'doctors', label: 'Doctors', icon: UserCheck }
  ];

  // Updated statsCardsConfig to include "Blood Bank" card
  const statsCardsConfig = [
    { title: "Total Doctors", value: doctorsList.totalDoctors, icon: Users, color: "#3b82f6" },
    { title: "Available Beds", value: hospitalInfo.services?.bedAvailability?.General || 0, icon: Bed, color: "#10b981" },
    { title: "ICU Beds", value: hospitalInfo.services?.bedAvailability?.ICU || 0, icon: Bed, color: "#f59e0b" },
    { title: "Emergency Status", value: hospitalInfo.services?.emergency?.available ? "Active" : "Inactive", icon: AlertCircle, color: hospitalInfo.services?.emergency?.available ? "#10b981" : "#ef4444" },
    { title: "Blood Bank", value: "Manage", icon: Droplets, color: "#dc2626", onClick: () => toggleModal('bloodBank', true) } // Changed icon to Droplets
  ];

  const setLoadingState = useCallback((key, value) => setLoading(prev => ({ ...prev, [key]: value })), []);
  const toggleModal = useCallback((modal, state) => setModals(prev => ({ ...prev, [modal]: state })), []);

  const fetchDoctorDetails = async (doctorId) => {
    try {
      const doctorSnap = await getDoc(doc(db, 'doctors', doctorId));
      return doctorSnap.exists() ? { id: doctorId, ...doctorSnap.data() } : null;
    } catch (error) {
      console.error(`Error fetching doctor ${doctorId}:`, error);
      return null;
    }
  };

  const fetchAllDoctorsData = useCallback(async () => {
    if (doctorsList.doctorIds.length === 0) {
      setDoctorsData([]);
      return;
    }
    setLoadingState('doctors', true);
    try {
      const doctorsResults = await Promise.all(doctorsList.doctorIds.map(entry => fetchDoctorDetails(entry.doctorId)));
      setDoctorsData(doctorsResults.filter(Boolean));
    } catch (error) {
      console.error('Error fetching doctors data:', error);
      setDoctorsData([]);
    } finally {
      setLoadingState('doctors', false);
    }
  }, [doctorsList.doctorIds, setLoadingState]);

  const fetchDoctorIds = useCallback(async () => {
    if (!hospitalId) return;
    try {
      const doctorIdsSnap = await getDoc(doc(db, 'hospitals', hospitalId, 'doctorIds', 'list'));
      const data = doctorIdsSnap.exists() ? doctorIdsSnap.data() : {};
      setDoctorsList({
        doctorIds: data.doctorIds || [],
        totalDoctors: data.totalDoctors || data.doctorIds?.length || 0,
        lastUpdated: data.lastUpdated?.toDate() || null
      });
    } catch (error) {
      console.error('Error fetching doctor IDs:', error);
      setDoctorsList({ doctorIds: [], totalDoctors: 0, lastUpdated: null });
    }
  }, [hospitalId]);

  const fetchHospitalServices = useCallback(async () => {
    if (!hospitalId) return { bedAvailability: { ICU: 0, General: 0 }, emergency: { available: false } };
    try {
      const [bedAvailabilitySnap, emergencySnap] = await Promise.all([
        getDoc(doc(db, 'hospitals', hospitalId, 'services', 'bedAvailability')),
        getDoc(doc(db, 'hospitals', hospitalId, 'services', 'emergency'))
      ]);
      return {
        bedAvailability: bedAvailabilitySnap.exists() ? bedAvailabilitySnap.data() : { ICU: 0, General: 0 },
        emergency: emergencySnap.exists() ? emergencySnap.data() : { available: false }
      };
    } catch (error) {
      console.error('Error fetching hospital services:', error);
      return { bedAvailability: { ICU: 0, General: 0 }, emergency: { available: false } };
    }
  }, [hospitalId]);

  // Fetch Blood Bank Data
  const fetchBloodBankData = useCallback(async () => {
    if (!hospitalId) return;
    try {
      const bloodBankSnap = await getDoc(doc(db, 'hospitals', hospitalId, 'services', 'bloodBank'));
      if (bloodBankSnap.exists()) {
        const data = bloodBankSnap.data();
        // Extract only blood type data, excluding lastUpdated
        const { lastUpdated, ...bloodTypesOnly } = data;
        setBloodBankData(bloodTypesOnly);
      } else {
        // Initialize if no data exists
        setBloodBankData({
          'A+': 0, 'A-': 0, 'B+': 0, 'B-': 0,
          'AB+': 0, 'AB-': 0, 'O+': 0, 'O-': 0
        });
      }
    } catch (error) {
      console.error('Error fetching blood bank data:', error);
      alert('Error loading blood bank data. Please try again.');
    }
  }, [hospitalId]);

  const fetchHospitalProfile = useCallback(async () => {
    if (!hospitalId) return;
    setLoadingState('profile', true);
    try {
      const hospitalSnap = await getDoc(doc(db, 'hospitals', hospitalId));
      const hospitalData = hospitalSnap.exists() ? hospitalSnap.data() : {
        name: 'Medora General Hospital',
        address: '123 Healthcare Ave, Medical District',
        city: 'Medical City',
        phone: '+1 (555) 123-4567',
        email: 'admin@medorahospital.com'
      };
      const servicesData = await fetchHospitalServices();
      const combinedData = { ...hospitalData, services: servicesData };
      setHospitalInfo(combinedData);
      setProfileFormData(combinedData);
      await fetchDoctorIds();
      await fetchBloodBankData(); // Fetch blood bank data when profile loads
    } catch (error) {
      console.error('Error fetching hospital profile:', error);
      alert('Error loading hospital profile. Please try again.');
    } finally {
      setLoadingState('profile', false);
    }
  }, [hospitalId, fetchDoctorIds, fetchHospitalServices, fetchBloodBankData, setLoadingState]);

  const updateHospitalProfile = async () => {
    if (!hospitalId) return;
    setLoadingState('update', true);
    try {
      const { services, ...hospitalData } = profileFormData;
      await updateDoc(doc(db, 'hospitals', hospitalId), hospitalData);
      
      await Promise.all([
        setDoc(doc(db, 'hospitals', hospitalId, 'services', 'bedAvailability'), {
          ICU: parseInt(services.bedAvailability.ICU) || 0,
          General: parseInt(services.bedAvailability.General) || 0,
          lastUpdated: new Date()
        }),
        setDoc(doc(db, 'hospitals', hospitalId, 'services', 'emergency'), {
          available: services.emergency.available || false,
          lastUpdated: new Date()
        })
      ]);
      
      setHospitalInfo(profileFormData);
      toggleModal('profile', false);
      alert('Hospital profile updated successfully!');
    } catch (error) {
      console.error('Error updating hospital profile:', error);
      alert('Error updating hospital profile. Please try again.');
    } finally {
      setLoadingState('update', false);
    }
  };

  const addDoctorToHospital = async () => {
    const { doctorId, licenseNumber } = addDoctorFormData;
    if (!hospitalId || !doctorId.trim() || !licenseNumber.trim()) {
      alert('Please fill in all required fields.');
      return;
    }

    setLoadingState('addDoctor', true);
    try {
      const doctorSnap = await getDoc(doc(db, 'doctors', doctorId.trim()));
      if (!doctorSnap.exists()) {
        alert('Doctor ID not found. Please check the doctor ID and try again.');
        return;
      }

      const doctorData = doctorSnap.data();
      if (doctorData.licenseNumber !== licenseNumber.trim()) {
        alert('License number does not match. Please check the license number and try again.');
        return;
      }

      const doctorIdsRef = doc(db, 'hospitals', hospitalId, 'doctorIds', 'list');
      const doctorIdsSnap = await getDoc(doctorIdsRef);
      const currentDoctorIds = doctorIdsSnap.exists() ? doctorIdsSnap.data().doctorIds || [] : [];

      if (currentDoctorIds.some(d => d.doctorId === doctorId.trim())) {
        alert('This doctor is already assigned to the hospital.');
        return;
      }

      const newDoctorEntry = { doctorId: doctorId.trim(), licenseNumber: licenseNumber.trim(), addedDate: new Date() };
      const updatedDoctorIds = [...currentDoctorIds, newDoctorEntry];

      await setDoc(doctorIdsRef, {
        doctorIds: updatedDoctorIds,
        totalDoctors: updatedDoctorIds.length,
        lastUpdated: new Date()
      });

      setDoctorsList({ doctorIds: updatedDoctorIds, totalDoctors: updatedDoctorIds.length, lastUpdated: new Date() });
      setDoctorsData(prev => [...prev, { id: doctorId.trim(), ...doctorData }]);
      setAddDoctorFormData({ doctorId: '', licenseNumber: '' });
      toggleModal('addDoctor', false);
      alert('Doctor added successfully!');
    } catch (error) {
      console.error('Error adding doctor:', error);
      alert('Error adding doctor. Please try again.');
    } finally {
      setLoadingState('addDoctor', false);
    }
  };

  const removeDoctorFromHospital = async () => {
    if (!hospitalId || !doctorToRemove) return;
    setLoadingState('removeDoctor', true);
    try {
      const doctorIdsRef = doc(db, 'hospitals', hospitalId, 'doctorIds', 'list');
      const doctorIdsSnap = await getDoc(doctorIdsRef);

      if (!doctorIdsSnap.exists()) {
        alert('No doctors found to remove.');
        return;
      }

      const updatedDoctorIds = doctorIdsSnap.data().doctorIds.filter(doctor => doctor.doctorId !== doctorToRemove.id);
      await setDoc(doctorIdsRef, {
        doctorIds: updatedDoctorIds,
        totalDoctors: updatedDoctorIds.length,
        lastUpdated: new Date()
      });

      setDoctorsList({ doctorIds: updatedDoctorIds, totalDoctors: updatedDoctorIds.length, lastUpdated: new Date() });
      setDoctorsData(prev => prev.filter(doctor => doctor.id !== doctorToRemove.id));
      toggleModal('removeConfirm', false);
      setDoctorToRemove(null);
      alert('Doctor removed successfully!');
    } catch (error) {
      console.error('Error removing doctor:', error);
      alert('Error removing doctor. Please try again.');
    } finally {
      setLoadingState('removeDoctor', false);
    }
  };

  const handleRemoveDoctor = (doctor) => {
    setDoctorToRemove(doctor);
    toggleModal('removeConfirm', true);
  };

  const handleProfileInputChange = useCallback((field, value) => {
    setProfileFormData(prev => {
      const fieldMap = {
        'bedAvailability.ICU': () => ({
          ...prev,
          services: { ...prev.services, bedAvailability: { ...prev.services.bedAvailability, ICU: parseInt(value) || 0 } }
        }),
        'bedAvailability.General': () => ({
          ...prev,
          services: { ...prev.services, bedAvailability: { ...prev.services.bedAvailability, General: parseInt(value) || 0 } }
        }),
        'emergency.available': () => ({
          ...prev,
          services: { ...prev.services, emergency: { ...prev.services.emergency, available: value } }
        })
      };
      return fieldMap[field] ? fieldMap[field]() : { ...prev, [field]: value };
    });
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
      alert('Error logging out. Please try again.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const getDoctorAvailability = (status) => {
    const statusMap = { approved: 'available', pending: 'pending', rejected: 'unavailable' };
    return statusMap[status] || 'unknown';
  };

  // Update Blood Bank Data in Firebase
  const updateBloodBankData = async () => {
    if (!hospitalId) return;
    setLoadingState('bloodBank', true);
    try {
      await setDoc(doc(db, 'hospitals', hospitalId, 'services', 'bloodBank'), {
        ...bloodBankData,
        lastUpdated: new Date()
      });
      toggleModal('bloodBank', false);
      alert('Blood bank data updated successfully!');
    } catch (error) {
      console.error('Error updating blood bank data:', error);
      alert('Error updating blood bank data. Please try again.');
    } finally {
      setLoadingState('bloodBank', false);
    }
  };
  
  // Handle input change for blood quantities
  const handleBloodBankChange = (bloodType, value) => {
    setBloodBankData(prev => ({
      ...prev,
      [bloodType]: parseInt(value) || 0
    }));
  };

  useEffect(() => {
    fetchHospitalProfile();
  }, [fetchHospitalProfile]);

  useEffect(() => {
    fetchAllDoctorsData();
  }, [fetchAllDoctorsData]);


  return (
    <div className="dashboard">
      <nav className="navbar1">
        <div className="navbar1-content">
          <div className="navbar1-brand">
            <div className="navbar1-icon-wrapper">
              <Activity className="navbar1-icon" />
            </div>
            <div>
              <h1 className="navbar1-title">{hospitalInfo.name || 'Medora Hospital'}</h1>
              <p className="navbar1-subtitle">Healthcare Management System</p>
            </div>
          </div>
          <div className="navbar1-actions">
            <button onClick={() => toggleModal('profile', true)} className="navbar1-btn">
              <User className="navbar1-btn-icon" />
              <span>Profile</span>
            </button>
            <button onClick={handleLogout} disabled={isLoggingOut} className="navbar1-btn">
              <LogOut className="navbar1-btn-icon" />
              <span>{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="main-content">
        <div className="tab-nav">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}>
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="tab-content">
            <div className="stats-grid">
              {statsCardsConfig.map((stat, index) => (
                <StatCard key={index} {...stat} />
              ))}
            </div>
            <InfoCard hospitalInfo={hospitalInfo} doctorsList={doctorsList} />
          </div>
        )}

        {activeTab === 'doctors' && (
          <div className="tab-content">
            <div className="section-header">
              <h2>Doctors Management ({doctorsList.totalDoctors} Total)</h2>
              <button className="btn-primary" onClick={() => toggleModal('addDoctor', true)}>
                <Plus className="w-4 h-4" />
                Add Doctor
              </button>
            </div>

            {loading.doctors ? (
              <div className="loading-spinner">Loading doctors...</div>
            ) : doctorsList.totalDoctors === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <UserCheck className="w-12 h-12" />
                </div>
                <h3>No Doctors Available</h3>
                <p>No doctors have been assigned to this hospital yet.</p>
              </div>
            ) : (
              <>
                <div className="doctors-info">
                  <p>Total Doctors: <strong>{doctorsList.totalDoctors}</strong></p>
                  {doctorsList.lastUpdated && (
                    <p className="text-sm text-gray">
                      Last updated: {doctorsList.lastUpdated.toLocaleDateString()}
                    </p>
                  )}
                </div>

                <div className="doctors-grid">
                  {doctorsData.map((doctor) => (
                    <div key={doctor.id} className="doctor-card">
                      <div className="doctor-header">
                        <div className="doctor-avatar">
                          <User className="w-6 h-6" />
                        </div>
                        <StatusBadge status={getDoctorAvailability(doctor.status)} />
                      </div>
                      <h3 className="doctor-name">{doctor.name || `${doctor.firstName} ${doctor.lastName}`}</h3>
                      <p className="doctor-specialty">{doctor.specialization}</p>
                      <p className="doctor-experience">{doctor.experience} years experience</p>
                      <div className="doctor-stats">
                        <span>License: <strong>{doctor.licenseNumber}</strong></span>
                        <span>Status: <strong>{doctor.status}</strong></span>
                      </div>
                      <div className="doctor-actions">
                        {/* Removed the Edit button */}
                        <button className="btn-icon btn-danger" onClick={() => handleRemoveDoctor(doctor)} title="Remove Doctor">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Profile Modal */}
      <Modal show={modals.profile} onClose={() => toggleModal('profile', false)} title="Hospital Profile" size="large">
        {loading.profile ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading profile...</p>
          </div>
        ) : (
          <div className="profile-modal-content">
            <div className="profile-header">
              <div className="profile-icon">
                <Building className="profile-icon-svg" />
              </div>
              <div className="profile-info">
                <h4>Hospital Information</h4>
                <p>Update your hospital's profile and service details</p>
              </div>
            </div>

            <div className="profile-form">
              <div className="form-section">
                <h5 className="form-section-title">
                  <Building className="section-icon" />
                  Basic Information
                </h5>
                <div className="form-grid">
                  <FormInput 
                    label="Hospital Name" 
                    value={profileFormData.name} 
                    onChange={(value) => handleProfileInputChange('name', value)}
                    icon={Building}
                  />
                  <FormInput 
                    label="Phone Number" 
                    type="tel" 
                    value={profileFormData.phone} 
                    onChange={(value) => handleProfileInputChange('phone', value)}
                    icon={Phone}
                  />
                  <FormInput 
                    label="Email Address" 
                    type="email" 
                    value={profileFormData.email} 
                    onChange={(value) => handleProfileInputChange('email', value)}
                    icon={Mail}
                  />
                </div>
              </div>

              <div className="form-section">
                <h5 className="form-section-title">
                  <MapPin className="section-icon" />
                  Location Details
                </h5>
                <div className="form-grid">
                  <FormInput 
                    label="Street Address" 
                    value={profileFormData.address} 
                    onChange={(value) => handleProfileInputChange('address', value)}
                    icon={MapPin}
                  />
                  <FormInput 
                    label="City" 
                    value={profileFormData.city} 
                    onChange={(value) => handleProfileInputChange('city', value)}
                    icon={MapPin}
                  />
                </div>
              </div>

              <div className="form-section">
                <h5 className="form-section-title">
                  <Bed className="section-icon" />
                  Hospital Capacity
                </h5>
                <div className="form-grid">
                  <FormInput 
                    label="ICU Beds" 
                    type="number" 
                    value={profileFormData.services?.bedAvailability?.ICU} 
                    onChange={(value) => handleProfileInputChange('bedAvailability.ICU', value)}
                    icon={Bed}
                  />
                  <FormInput 
                    label="General Beds" 
                    type="number" 
                    value={profileFormData.services?.bedAvailability?.General} 
                    onChange={(value) => handleProfileInputChange('bedAvailability.General', value)}
                    icon={Bed}
                  />
                </div>
              </div>

              <div className="form-section">
                <h5 className="form-section-title">
                  <Shield className="section-icon" />
                  Services
                </h5>
                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      className="checkbox-input"
                      checked={profileFormData.services?.emergency?.available || false}
                      onChange={(e) => handleProfileInputChange('emergency.available', e.target.checked)}
                    />
                    <span className="checkbox-custom"></span>
                    <span className="checkbox-text">Emergency Services Available</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button 
                className="btn-primary enhanced" 
                onClick={updateHospitalProfile} 
                disabled={loading.update || loading.profile}
              >
                {loading.update ? (
                  <>
                    <div className="btn-spinner"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Shield className="btn-icon" />
                    Save Changes
                  </>
                )}
              </button>
              <button 
                className="btn-secondary enhanced" 
                onClick={() => toggleModal('profile', false)} 
                disabled={loading.update}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Doctor Modal */}
      <Modal show={modals.addDoctor} onClose={() => toggleModal('addDoctor', false)} title="Add New Doctor" size="medium">
        <div className="add-doctor-modal-content">
          <div className="add-doctor-header">
            <div className="add-doctor-icon">
              <UserCheck className="add-doctor-icon-svg" />
            </div>
            <div className="add-doctor-info">
              <h4>Add Doctor to Hospital</h4>
              <p>Enter doctor's credentials to add them to your hospital roster</p>
            </div>
          </div>

          <div className="add-doctor-form">
            <FormInput
              label="Doctor ID"
              value={addDoctorFormData.doctorId}
              onChange={(value) => setAddDoctorFormData(prev => ({ ...prev, doctorId: value }))}
              placeholder="Enter doctor's unique ID"
              icon={User}
            />
            <FormInput
              label="Medical License Number"
              value={addDoctorFormData.licenseNumber}
              onChange={(value) => setAddDoctorFormData(prev => ({ ...prev, licenseNumber: value }))}
              placeholder="Enter medical license number"
              icon={Shield}
            />
            <div className="form-note">
              <AlertCircle className="note-icon" />
              <p>Both Doctor ID and License Number must match our records exactly.</p>
            </div>
          </div>

          <div className="modal-actions">
            <button
              className="btn-primary enhanced"
              onClick={addDoctorToHospital}
              disabled={loading.addDoctor || !addDoctorFormData.doctorId.trim() || !addDoctorFormData.licenseNumber.trim()}
            >
              {loading.addDoctor ? (
                <>
                  <div className="btn-spinner"></div>
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="btn-icon" />
                  Add Doctor
                </>
              )}
            </button>
            <button 
              className="btn-secondary enhanced" 
              onClick={() => toggleModal('addDoctor', false)} 
              disabled={loading.addDoctor}
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
      {/* Enhanced Remove Doctor Confirmation Modal */}
      <Modal show={modals.removeConfirm} onClose={() => toggleModal('removeConfirm', false)} title="Remove Doctor" size="medium">
        <div className="remove-doctor-modal-content">
          <div className="confirmation-header">
            <div className="confirmation-icon-wrapper">
              <AlertCircle className="confirmation-icon" />
            </div>
            <div className="confirmation-content">
              <h4>Remove Doctor from Hospital?</h4>
              <p>This action will remove the doctor from your hospital's roster permanently.</p>
            </div>
          </div>
          
          {doctorToRemove && (
            <div className="doctor-details-card">
              <div className="doctor-details-header">
                <div className="doctor-avatar-large">
                  <User className="doctor-avatar-icon" />
                </div>
                <div className="doctor-details-info">
                  <h5>{doctorToRemove.name || `${doctorToRemove.firstName} ${doctorToRemove.lastName}`}</h5>
                  <p className="doctor-specialty">{doctorToRemove.specialty}</p>
                </div>
              </div>
              
              <div className="doctor-details-grid">
                <div className="detail-item">
                  <Shield className="detail-icon" />
                  <div>
                    <span className="detail-label">License</span>
                    <span className="detail-value">{doctorToRemove.licenseNumber}</span>
                  </div>
                </div>
                <div className="detail-item">
                  <Calendar className="detail-icon" />
                  <div>
                    <span className="detail-label">Experience</span>
                    <span className="detail-value">{doctorToRemove.experience} years</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="warning-banner">
            <AlertCircle className="warning-icon" />
            <div className="warning-content">
              <strong>Warning:</strong> This action cannot be undone. The doctor will be permanently removed from your hospital's roster.
            </div>
          </div>

          <div className="modal-actions">
            <button
              className="btn-danger enhanced"
              onClick={removeDoctorFromHospital}
              disabled={loading.removeDoctor}
            >
              {loading.removeDoctor ? (
                <>
                  <div className="btn-spinner"></div>
                  Removing...
                </>
              ) : (
                <>
                  <Trash2 className="btn-icon" />
                  Remove Doctor
                </>
              )}
            </button>
            <button 
              className="btn-secondary enhanced" 
              onClick={() => toggleModal('removeConfirm', false)} 
              disabled={loading.removeDoctor}
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>


      {/* Blood Bank Modal */}
      <Modal show={modals.bloodBank} onClose={() => toggleModal('bloodBank', false)} title="Blood Bank Management" size="large">
        <div className="blood-bank-modal-content">
          <div className="blood-bank-header">
            <div className="blood-bank-icon">
              <Droplets className="blood-bank-icon-svg" />
            </div>
            <div className="blood-bank-info">
              <h4>Blood Bank Inventory</h4>
              <p>Manage blood type availability and quantities</p>
            </div>
          </div>

          <div className="blood-bank-grid">
            {Object.entries(bloodBankData).map(([bloodType, quantity]) => (
              <div key={bloodType} className="blood-type-card">
                <div className="blood-type-header">
                  <div className="blood-type-icon">
                    <Droplets className="blood-type-icon-svg" style={{ color: '#dc2626' }} />
                  </div>
                  <div className="blood-type-info">
                    <h5 className="blood-type-name">{bloodType}</h5>
                    <p className="blood-type-label">Blood Type</p>
                  </div>
                </div>
                <div className="blood-type-quantity">
                  <label className="quantity-label">Units Available</label>
                  <input
                    type="number"
                    min="0"
                    className="quantity-input"
                    value={quantity}
                    onChange={(e) => handleBloodBankChange(bloodType, e.target.value)}
                  />
                </div>
                <div className="blood-type-status">
                  <span className={`availability-badge ${quantity > 0 ? 'available' : 'unavailable'}`}>
                    {quantity > 0 ? 'Available' : 'Out of Stock'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="blood-bank-summary">
            <h5>Inventory Summary</h5>
            <div className="summary-stats">
              <div className="summary-stat">
                <span className="stat-label">Total Types Available:</span>
                <span className="stat-value">{Object.values(bloodBankData).filter(q => q > 0).length}/8</span>
              </div>
              <div className="summary-stat">
                <span className="stat-label">Total Units:</span>
                <span className="stat-value">{Object.values(bloodBankData).reduce((sum, q) => sum + q, 0)}</span>
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button
              className="btn-primary enhanced"
              onClick={updateBloodBankData}
              disabled={loading.bloodBank}
            >
              {loading.bloodBank ? (
                <>
                  <div className="btn-spinner"></div>
                  Updating...
                </>
              ) : (
                <>
                  <Droplets className="btn-icon" />
                  Update Blood Bank
                </>
              )}
            </button>
            <button 
              className="btn-secondary enhanced" 
              onClick={() => toggleModal('bloodBank', false)} 
              disabled={loading.bloodBank}
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>


    </div>
  );
};

export default HospitalDashboard;
