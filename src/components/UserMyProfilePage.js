import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import React, { useState, useEffect, useCallback } from 'react';
import { 
  User, Heart, Settings, CreditCard, MapPin, Calendar, 
  Phone, Mail, Edit3, Camera, Save, X, Loader2, AlertCircle, LogOut 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import '../styles/UserMyProfilePage.css';
import { collection, doc, setDoc, addDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { db } from "../firebase";

// Memoized components
const TabButton = React.memo(({ id, label, icon: Icon, activeTab, onClick }) => (
  <button
    type="button"
    onClick={() => onClick(id)}
    className={`ump-tab-button ${activeTab === id ? 'active' : ''}`}
    aria-selected={activeTab === id}
  >
    <Icon size={18} />
    <span>{label}</span>
  </button>
));

const FormField = React.memo(({ field, value, onChange, type = 'text', options, rows, placeholder, isEditing }) => {
  if (!isEditing) {
    return <div className="ump-display-value">{value || 'Not provided'}</div>;
  }

  if (type === 'select') {
    return (
      <select value={value || ''} onChange={(e) => onChange(field, e.target.value)} className="ump-select">
        {options.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    );
  }

  if (type === 'textarea') {
    return (
      <textarea
        value={value || ''}
        onChange={(e) => onChange(field, e.target.value)}
        rows={rows || 3}
        className="ump-textarea"
        placeholder={placeholder}
      />
    );
  }

  return (
    <input
      type={type}
      value={value || ''}
      onChange={(e) => onChange(field, e.target.value)}
      className="ump-input"
      placeholder={placeholder}
    />
  );
});

const UserMyProfilePage = () => {
  const [activeTab, setActiveTab] = useState('personal');
  const [isEditing, setIsEditing] = useState(false);
  const [isMedicalEditing, setIsMedicalEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  
  const navigate = useNavigate(); // Initialize useNavigate hook

  const [userData, setUserData] = useState({
    // Personal Data
    name: '', email: '', phone: '', city: '', pincode: '', location: null, emergencyContact: '', address: '',
    // Medical Data
    age: '', gender: '', height: '', weight: '', ethnicity: '', geographicalLocation: '', smokingStatus: '',
    exerciseFrequency: '', alcoholConsumption: '', dietaryHabits: '', sleepPattern: '', diabetes: '',
    hypertension: '', asthma: '', cardiovascularDisease: '', thyroidProblems: '', liverKidneyConditions: '',
    mentalHealthIssues: '', allergies: '', majorSurgeries: '', chronicInfections: '', pastIllnesses: '',
    hospitalizations: '', familyHistory: '', currentMedications: '', otcSupplements: '', recentChanges: '',
    knownDrugAllergies: '', dateOfBirth: '', bloodGroup: ''
  });

  // Field configurations
  const personalFields = [
    { field: 'name', label: 'Full Name', icon: User },
    { field: 'email', label: 'Email', icon: Mail },
    { field: 'phone', label: 'Phone', icon: Phone },
    { field: 'city', label: 'City', icon: MapPin },
    { field: 'pincode', label: 'Pincode' },
    { field: 'dateOfBirth', label: 'Date of Birth', type: 'date' },
    { field: 'bloodGroup', label: 'Blood Group' },
    { field: 'emergencyContact', label: 'Emergency Contact', icon: Phone }
  ];

  const medicalSections = {
    demographics: {
      title: 'Basic Demographics',
      fields: [
        { field: 'age', label: 'Age', type: 'number' },
        { field: 'gender', label: 'Sex/Gender', type: 'select', options: [
          { value: '', label: 'Select gender' },
          { value: 'male', label: 'Male' },
          { value: 'female', label: 'Female' },
          { value: 'other', label: 'Other' }
        ]},
        { field: 'height', label: 'Height (cm)', type: 'number' },
        { field: 'weight', label: 'Weight (kg)', type: 'number' },
        { field: 'ethnicity', label: 'Ethnicity' },
        { field: 'geographicalLocation', label: 'Geographical Location' }
      ]
    },
    lifestyle: {
      title: 'Lifestyle Information',
      fields: [
        { field: 'smokingStatus', label: 'Smoking Status', type: 'select', options: [
          { value: '', label: 'Select smoking status' },
          { value: 'current', label: 'Current' },
          { value: 'former', label: 'Former' },
          { value: 'never', label: 'Never' }
        ]},
        { field: 'alcoholConsumption', label: 'Alcohol Consumption' },
        { field: 'exerciseFrequency', label: 'Exercise Frequency', type: 'select', options: [
          { value: '', label: 'Select exercise frequency' },
          { value: 'sedentary', label: 'Sedentary' },
          { value: 'moderate', label: 'Moderate' },
          { value: 'active', label: 'Active' },
          { value: 'very-active', label: 'Very Active' }
        ]},
        { field: 'dietaryHabits', label: 'Dietary Habits', type: 'select', options: [
          { value: '', label: 'Select dietary preference' },
          { value: 'vegetarian', label: 'Vegetarian' },
          { value: 'non-vegetarian', label: 'Non-Vegetarian' },
          { value: 'vegan', label: 'Vegan' },
          { value: 'diabetic', label: 'Diabetic' },
          { value: 'high-fat', label: 'High Fat/Sugar' }
        ]},
        { field: 'sleepPattern', label: 'Sleep Pattern' }
      ]
    },
    conditions: {
      title: 'Current Medical Conditions',
      fields: [
        { field: 'diabetes', label: 'Diabetes' },
        { field: 'hypertension', label: 'Hypertension' },
        { field: 'asthma', label: 'Asthma' },
        { field: 'cardiovascularDisease', label: 'Cardiovascular Disease' },
        { field: 'thyroidProblems', label: 'Thyroid Problems' },
        { field: 'liverKidneyConditions', label: 'Liver/Kidney Conditions' },
        { field: 'mentalHealthIssues', label: 'Mental Health Issues' },
        { field: 'allergies', label: 'Allergies' },
        { field: 'chronicInfections', label: 'Chronic Infections' }
      ]
    },
    history: {
      title: 'Past Medical History',
      fields: [
        { field: 'majorSurgeries', label: 'Major Surgeries' },
        { field: 'pastIllnesses', label: 'Past Illnesses' },
        { field: 'hospitalizations', label: 'Hospitalizations' },
        { field: 'familyHistory', label: 'Family History' }
      ]
    },
    medications: {
      title: 'Medications',
      fields: [
        { field: 'currentMedications', label: 'Current Medications' },
        { field: 'otcSupplements', label: 'OTC Supplements' },
        { field: 'recentChanges', label: 'Recent Changes' },
        { field: 'knownDrugAllergies', label: 'Known Drug Allergies' }
      ]
    }
  };

  // Firebase Authentication listener
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        await loadUserData(user.uid);
      } else {
        setCurrentUser(null);
        setLoading(false);
        // Optionally redirect to landing page if user logs out from another tab/window
        // navigate('/'); 
      }
    });

    return () => unsubscribe();
  }, []);

  // Load existing user data from Firestore
  const loadUserData = async (userId) => {
    try {
      const userDocRef = doc(db, 'users', userId);
      const userDocSnap = await getDoc(userDocRef);
      
      let combinedData = {};

      if (userDocSnap.exists()) {
        combinedData = userDocSnap.data();
      }

      // Also load medical data from the subcollection
      const medicalDocRef = doc(db, 'users', userId, 'medicalData', 'medical profile');
      const medicalDocSnap = await getDoc(medicalDocRef);

      if (medicalDocSnap.exists()) {
        combinedData = { ...combinedData, ...medicalDocSnap.data() };
      }
      
      setUserData(prev => ({
        ...prev,
        ...combinedData
      }));

    } catch (error) {
      console.error('Error loading user data:', error);
      setError('Failed to load user data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = useCallback((field, value) => {
    setUserData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
  }, []);

  // Save personal data to /users/{userId} (update the main document)
  const savePersonalData = async () => {
    setUpdating(true);
    try {
      if (!currentUser?.uid) throw new Error('User not authenticated');

      const personalData = {
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        city: userData.city,
        pincode: userData.pincode,
        location: userData.location,
        emergencyContact: userData.emergencyContact,
        address: userData.address,
        dateOfBirth: userData.dateOfBirth,
        bloodGroup: userData.bloodGroup,
        updatedAt: serverTimestamp()
      };

      const userDocRef = doc(db, 'users', currentUser.uid);
      await setDoc(userDocRef, personalData, { merge: true });
      
      setIsEditing(false);
      setError(null);
      console.log('Personal data saved successfully');
    } catch (error) {
      console.error('Error saving personal data:', error);
      setError('Failed to save personal info: ' + error.message);
    }
    setUpdating(false);
  };

  // Save medical data to /users/{userId}/medicalData/{autoId}
  const saveMedicalData = async () => {
    setUpdating(true);
    try {
      if (!currentUser?.uid) throw new Error('User not authenticated');

      const medicalData = {
        age: userData.age,
        gender: userData.gender,
        height: userData.height,
        weight: userData.weight,
        ethnicity: userData.ethnicity,
        geographicalLocation: userData.geographicalLocation,
        smokingStatus: userData.smokingStatus,
        exerciseFrequency: userData.exerciseFrequency,
        alcoholConsumption: userData.alcoholConsumption,
        dietaryHabits: userData.dietaryHabits,
        sleepPattern: userData.sleepPattern,
        diabetes: userData.diabetes,
        hypertension: userData.hypertension,
        asthma: userData.asthma,
        cardiovascularDisease: userData.cardiovascularDisease,
        thyroidProblems: userData.thyroidProblems,
        liverKidneyConditions: userData.liverKidneyConditions,
        mentalHealthIssues: userData.mentalHealthIssues,
        allergies: userData.allergies,
        majorSurgeries: userData.majorSurgeries,
        chronicInfections: userData.chronicInfections,
        pastIllnesses: userData.pastIllnesses,
        hospitalizations: userData.hospitalizations,
        familyHistory: userData.familyHistory,
        currentMedications: userData.currentMedications,
        otcSupplements: userData.otcSupplements,
        recentChanges: userData.recentChanges,
        knownDrugAllergies: userData.knownDrugAllergies,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const medicalDocRef = doc(db, 'users', currentUser.uid, 'medicalData', 'medical profile');
      await setDoc(medicalDocRef, medicalData);
      
      setIsMedicalEditing(false);
      setError(null);
      console.log('Medical data saved successfully');
    } catch (error) {
      console.error('Error saving medical data:', error);
      setError('Failed to save medical info: ' + error.message);
    }
    setUpdating(false);
  };

  const handleLogout = async () => {
    try {
      const auth = getAuth();
      await signOut(auth);
      console.log('User logged out successfully');
      navigate('/'); // Redirect to the main landing page
    } catch (error) {
      console.error('Error logging out:', error);
      setError('Failed to log out: ' + error.message);
    }
  };

  const renderFormSection = (fields, isEditing) => (
    <div className="ump-form-grid">
      {fields.map(({ field, label, icon: Icon, type, options, rows, placeholder }) => (
        <div key={field} className="ump-form-group">
          <label>
            {Icon && <Icon size={16} className="ump-form-icon" />}
            {label}
          </label>
          <FormField
            field={field}
            value={userData[field]}
            onChange={handleInputChange}
            type={type}
            options={options}
            rows={rows}
            placeholder={placeholder || `Enter ${label.toLowerCase()}`}
            isEditing={isEditing}
          />
        </div>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="ump-loading">
        <Loader2 className="ump-icon-spin" />
        <p>Loading your profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ump-error">
        <AlertCircle className="ump-icon-error" />
        <p>{error}</p>
        <button onClick={() => setError(null)} className="ump-btn-primary">Dismiss</button>
      </div>
    );
  }

  return (
    <div className="ump-container">
      {/* Profile Header */}
      <header className="ump-profile-header">
        <div className="ump-avatar-wrapper">
          <User size={40} />
          <button className="ump-avatar-edit" aria-label="Edit profile photo">
            <Camera size={16} />
          </button>
        </div>
        <div className="ump-profile-info">
          <h1>{userData.name || 'User Profile'}</h1>
          <p>{userData.email || 'No email provided'}</p>
          <div className="ump-profile-meta">
            <span><MapPin size={14} /> {userData.city || 'Location not set'}</span>
            <span><Calendar size={14} /> Joined Recently</span>
          </div>
        </div>
      </header>

      <main className="ump-main-area">
        <nav className="ump-sidebar">
          <TabButton id="personal" label="Personal Info" icon={User} activeTab={activeTab} onClick={handleTabChange} />
          <TabButton id="medical" label="Medical Info" icon={Heart} activeTab={activeTab} onClick={handleTabChange} />
          <TabButton id="settings" label="Settings" icon={Settings} activeTab={activeTab} onClick={handleTabChange} />
        </nav>

        <section className="ump-content-card">
          {activeTab === 'personal' && (
            <div className="ump-section">
              <div className="ump-section-header">
                <h2>Personal Information</h2>
                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  disabled={updating}
                  className={`ump-btn ${isEditing ? 'btn-cancel' : 'btn-edit'}`}
                >
                  {updating ? <Loader2 size={16} className="ump-icon-spin" /> : (isEditing ? <X size={16} /> : <Edit3 size={16} />)}
                  <span>{updating ? 'Saving...' : (isEditing ? 'Cancel' : 'Edit')}</span>
                </button>
              </div>
              
              {renderFormSection(personalFields, isEditing)}
              
              <div className="ump-form-group">
                <label><MapPin size={16} /> Address</label>
                <FormField
                  field="address"
                  value={userData.address}
                  onChange={handleInputChange}
                  type="textarea"
                  rows={3}
                  placeholder="Enter your full address"
                  isEditing={isEditing}
                />
              </div>

              {isEditing && (
                <div className="ump-action-buttons">
                  <button type="button" onClick={() => setIsEditing(false)} disabled={updating} className="ump-btn btn-secondary">
                    Cancel
                  </button>
                  <button type="button" onClick={savePersonalData} disabled={updating} className="ump-btn btn-primary">
                    {updating ? <Loader2 size={16} className="ump-icon-spin" /> : <Save size={16} />}
                    <span>{updating ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'medical' && (
            <div className="ump-section">
              <div className="ump-section-header">
                <h2>Medical Information</h2>
                <button
                  type="button"
                  onClick={() => setIsMedicalEditing(!isMedicalEditing)}
                  disabled={updating}
                  className={`ump-btn ${isMedicalEditing ? 'btn-cancel' : 'btn-edit'}`}
                >
                  {updating ? <Loader2 size={16} className="ump-icon-spin" /> : (isMedicalEditing ? <X size={16} /> : <Edit3 size={16} />)}
                  <span>{updating ? 'Saving...' : (isMedicalEditing ? 'Cancel' : 'Edit')}</span>
                </button>
              </div>
              
              {Object.entries(medicalSections).map(([key, section]) => (
                <div key={key}>
                  <h4>{section.title}</h4>
                  {renderFormSection(section.fields, isMedicalEditing)}
                </div>
              ))}

              {isMedicalEditing && (
                <div className="ump-action-buttons">
                  <button type="button" onClick={() => setIsMedicalEditing(false)} disabled={updating} className="ump-btn btn-secondary">
                    Cancel
                  </button>
                  <button type="button" onClick={saveMedicalData} disabled={updating} className="ump-btn btn-primary">
                    {updating ? <Loader2 size={16} className="ump-icon-spin" /> : <Save size={16} />}
                    <span>{updating ? 'Saving...' : 'Save Medical Info'}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="ump-section">
              <div className="ump-section-header">
                <h2>Settings</h2>
              </div>
              <p>Manage your account settings and preferences here.</p>
              <div className="ump-settings-actions">                
                {/* Logout Button */}
                <button 
                  type="button" 
                  onClick={handleLogout} 
                  className="ump-btn btn-danger ump-logout-button" // Add a class for styling if needed
                >
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default UserMyProfilePage;
