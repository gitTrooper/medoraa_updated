import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { 
  createUserWithEmailAndPassword, 
  sendEmailVerification,
  signOut  // Add this import
} from "firebase/auth"; 
import { doc, setDoc, collection, GeoPoint, getDoc } from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";
import { Container, Form, Button, Row, Col, Alert } from "react-bootstrap";
import "../styles/HospitalSignupPage.css";

const HospitalSignupPage = () => {
  const [formData, setFormData] = useState({
    hospitalName: "",
    email: "",
    address: "",
    city: "",
    phone: "",
    pincode: "",
    password: "",
    confirmPassword: "",
    hospitalType: "",
    website: "",
    emergencyPhone: ""
  });
  
  // Image upload states
  const [selectedImages, setSelectedImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [registrationCertificate, setRegistrationCertificate] = useState(null);
  const [certificatePreview, setCertificatePreview] = useState(null);
  
  // Location states
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState("");
  const [locationLoading, setLoadingLocation] = useState(false); // Corrected state variable name
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  

  const navigate = useNavigate();

  // Hospital type options
  const hospitalTypes = [
    "General Hospital",
    "Specialty Hospital",
    "Multi-Specialty Hospital",
    "Super Specialty Hospital",
    "Emergency Hospital",
    "Trauma Center",
    "Cardiac Hospital",
    "Cancer Hospital",
    "Maternity Hospital",
    "Pediatric Hospital",
    "Mental Health Hospital",
    "Rehabilitation Center",
    "Diagnostic Center",
    "Eye Hospital",
    "Dental Hospital",
    "Orthopedic Hospital",
    "Government Hospital",
    "Private Hospital",
    "Teaching Hospital",
    "Community Hospital"
  ];

  // Get user's current location
  const getCurrentLocation = () => {
    setLoadingLocation(true);
    setLocationError("");

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by this browser");
      setLoadingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lng: longitude });
        setLoadingLocation(false);
        setLocationError("");
      },
      (error) => {
        setLoadingLocation(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError("Location access denied. Please enable location services.");
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError("Location information is unavailable.");
            break;
          case error.TIMEOUT:
            setLocationError("Location request timed out.");
            break;
          default:
            setLocationError("An unknown error occurred while retrieving location.");
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // Upload multiple files to Cloudflare
  const uploadMultipleFilesToCloudflare = async (files, userId, folder = 'hospital') => {
    try {
      const uploadPromises = files.map(async (file, index) => {
        const fileBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(fileBuffer);

        const timestamp = Date.now();
        const fileExtension = file.name.split(".").pop() || "jpg";
        const key = `${folder}/${userId}/${timestamp}_${index}.${fileExtension}`;

        const bucket = process.env.REACT_APP_R2_BUCKET_NAME;
        if (!bucket) throw new Error("Bucket name is missing from .env");

        const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");

        const s3Client = new S3Client({
          region: "auto",
          endpoint: `https://${process.env.REACT_APP_CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
          credentials: {
            accessKeyId: process.env.REACT_APP_R2_ACCESS_KEY_ID,
            secretAccessKey: process.env.REACT_APP_R2_SECRET_ACCESS_KEY,
          },
        });

        const uploadCommand = new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: uint8Array,
          ContentType: file.type,
          ContentDisposition: "inline",
        });

        await s3Client.send(uploadCommand);

        return {
          url: `${process.env.REACT_APP_R2_PUBLIC_URL}/${key}`,
          path: key,
          name: file.name,
          type: file.type,
          size: file.size,
        };
      });

      return await Promise.all(uploadPromises);
    } catch (error) {
      console.error("Multiple files upload error:", error);
      throw new Error("Files upload failed. Check CORS or credentials.");
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle multiple hospital images selection
  const handleImagesChange = (e) => {
    const newFiles = Array.from(e.target.files);

    // Merge with previously selected files
    const merged = [...selectedImages, ...newFiles];

    // Filter duplicates by name
    const uniqueFiles = Array.from(new Map(merged.map(file => [file.name, file])).values());

    // Enforce max file count
    if (uniqueFiles.length > 10) {
      setError("Maximum 10 hospital photos allowed");
      return;
    }

    // Validate each file
    for (let file of uniqueFiles) {
      if (!file.type.startsWith("image/")) {
        setError("Only image files are allowed");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError("Each image must be under 5MB");
        return;
      }
    }

    setSelectedImages(uniqueFiles);

    // Generate new previews
    const readers = uniqueFiles.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readers).then((previews) => {
      setImagePreviews(previews);
    });

    setError("");
  };

  // Handle registration certificate upload
  const handleCertificateChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Allow both images and PDFs for certificates
      if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
        setError("Please select an image or PDF file for registration certificate");
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setError("Certificate file size should be less than 10MB");
        return;
      }

      setRegistrationCertificate(file);

      // Generate preview for images only
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setCertificatePreview(e.target.result);
        };
        reader.readAsDataURL(file);
      } else {
        setCertificatePreview(null);
      }
      
      setError("");
    }
  };

  // Hospital images upload component
  const renderHospitalImagesUpload = () => (
    <div className="form-group"> {/* Changed to form-group */}
      <Form.Label>Hospital Photos (Minimum 4, Maximum 10)*</Form.Label>
      <Form.Control
        type="file"
        name="hospitalImages[]"
        accept="image/*"
        multiple
        onChange={handleImagesChange} // Use combined handler
        required
      />
      <Form.Text className="text-muted">
        Upload at least 4 photos of your hospital (exterior, interior, wards, facilities, etc.)
      </Form.Text>

      {imagePreviews.length > 0 && (
        <div className="mt-2 row row-cols-3 g-2"> {/* Responsive grid for previews */}
          {imagePreviews.map((preview, index) => (
            <div key={index} className="col">
              <img
                src={preview}
                alt={`Hospital ${index + 1}`}
                className="img-thumbnail" // Bootstrap class for image styling
                style={{
                  width: "100%",
                  height: "80px",
                  objectFit: "cover",
                }}
              />
            </div>
          ))}
        </div>
      )}
      {imagePreviews.length > 0 && (
        <small className="text-success mt-2 d-block"> {/* Adjusted class and display */}
          {imagePreviews.length} photo{imagePreviews.length > 1 ? "s" : ""} selected
        </small>
      )}
    </div>
  );

  // Registration certificate upload component
  const renderCertificateUpload = () => (
    <div className="form-group"> {/* Changed to form-group */}
      <Form.Label>Hospital Registration Certificate*</Form.Label>
      <Form.Control
        type="file"
        accept="image/*,.pdf"
        onChange={handleCertificateChange}
        required
      />
      <Form.Text className="text-muted">
        Upload your hospital's registration certificate (Image or PDF format, max 10MB)
      </Form.Text>
      {certificatePreview && (
        <div className="mt-2">
          <img
            src={certificatePreview}
            alt="Certificate Preview"
            className="img-thumbnail" // Bootstrap class for image styling
            style={{
              width: '120px', // Adjusted size
              height: '80px', // Adjusted size
              objectFit: 'cover',
            }}
          />
        </div>
      )}
      {registrationCertificate && !certificatePreview && (
        <div className="mt-2 d-flex align-items-center"> {/* Aligned with PatientSignup */}
          <i className="fas fa-file-pdf text-danger me-2"></i>
          <span className="text-success">{registrationCertificate.name}</span>
        </div>
      )}
    </div>
  );

  // Location component
  const renderLocationSection = () => (
    <div className="form-group"> {/* Changed to form-group */}
      <Form.Label>Hospital Location*</Form.Label>
      <div className="d-flex gap-2 mb-2">
        <Button 
          variant="outline-primary" 
          onClick={getCurrentLocation}
          disabled={locationLoading} // Corrected usage
        >
          {locationLoading ? "Getting Location..." : "Get Current Location"}
        </Button>
        {location && (
          <Button variant="outline-success" disabled>
            ✓ Location Captured
          </Button>
        )}
      </div>
      
      {locationError && (
        <Alert variant="danger" className="mt-2">
          {locationError}
        </Alert>
      )}
      
      {location && (
        <div className="mt-2">
          <small className="text-success">
            Location: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
          </small>
        </div>
      )}
      
      <Form.Text className="text-muted">
        Please allow location access to help patients find your hospital easily.
      </Form.Text>
    </div>
  );

  // Get location coordinates for hospital using captured location
  const getLocationCoordinates = async (address, city, pincode) => {
    try {
      if (location) {
        return new GeoPoint(location.lat, location.lng);
      }
      // Fallback to default coordinates if location not captured
      return new GeoPoint(0, 0);
    } catch (error) {
      console.error('Error getting coordinates:', error);
      return new GeoPoint(0, 0);
    }
  };

  // Send signup request to admin for approval
  const sendToAdminForApproval = async (userData, hospitalImagesMeta = [], certificateMeta = null) => {
    try {
      const adminRequestData = {
        ...userData,
        status: "pending_admin_approval",
        submittedAt: new Date().toISOString(),
        adminApproved: false,
        adminReviewed: false,
        adminComments: "",
        rejectionReason: "",
        hospitalImages: hospitalImagesMeta,
        registrationCertificate: certificateMeta,
        location: location ? new GeoPoint(location.lat, location.lng) : new GeoPoint(0, 0),
        requestId: `hospital_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ipAddress: null,
        userAgent: navigator.userAgent,
        submissionSource: "signup_form"
      };

      // Save to temp collection for admin approval
      await setDoc(doc(db, 'tempHospitalSignups', adminRequestData.requestId), adminRequestData);

      return adminRequestData.requestId;
    } catch (error) {
      console.error('Error sending to admin:', error);
      throw new Error('Failed to submit for admin approval');
    }
  };

  // Create hospital document structure (only called after admin approval)
  const createHospitalDocument = async (hospitalId, userData) => {
    try {
      const locationCoords = await getLocationCoordinates(userData.address, userData.city, userData.pincode);
      
      // Main hospital document
      const hospitalData = {
        name: userData.hospitalName,
        hospitalType: userData.hospitalType,
        address: userData.address,
        city: userData.city,
        pincode: userData.pincode,
        location: locationCoords,
        phone: userData.phone,
        emergencyPhone: userData.emergencyPhone,
        email: userData.email,
        website: userData.website,
        emailVerified: true,
        userType: "hospital",
        createdAt: new Date().toISOString(),
        isActive: true,
        adminApproved: true,
        approvedAt: new Date().toISOString()
      };

      // Create hospital document
      await setDoc(doc(db, 'hospitals', hospitalId), hospitalData);

      // Create services subcollection with bedAvailability document
      const servicesRef = collection(db, 'hospitals', hospitalId, 'services');
      await setDoc(doc(servicesRef, 'bedAvailability'), {
        ICU: 0,
        General: 0,
        Emergency: 0,
        lastUpdated: new Date()
      });

      // Create emergency service document
      await setDoc(doc(servicesRef, 'emergency'), {
        available: false,
        lastUpdated: new Date()
      });

      // Create doctorIds subcollection with a single document containing an array of doctor IDs
      const doctorIdsRef = collection(db, 'hospitals', hospitalId, 'doctorIds');
      await setDoc(doc(doctorIdsRef, 'list'), {
        doctorIds: [],
        lastUpdated: new Date(),
        totalDoctors: 0
      });

      console.log('Hospital document structure created successfully');
    } catch (error) {
      console.error('Error creating hospital document:', error);
      throw error;
    }
  };

  // Validate form
  const validateForm = () => {
    const { hospitalName, email, password, confirmPassword, address, city, phone, pincode, hospitalType } = formData;
    
    if (!hospitalName || !email || !password || !confirmPassword || !address || !city || !phone || !pincode || !hospitalType) {
      setError('All required fields must be filled');
      return false;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }
    
    // Phone validation (basic)
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phone)) {
      setError('Please enter a valid 10-digit phone number');
      return false;
    }
    
    // Emergency phone validation (if provided)
    if (formData.emergencyPhone && !phoneRegex.test(formData.emergencyPhone)) {
      setError('Please enter a valid 10-digit emergency phone number');
      return false;
    }
    
    // Pincode validation
    const pincodeRegex = /^\d{6}$/;
    if (!pincodeRegex.test(pincode)) {
      setError('Please enter a valid 6-digit pincode');
      return false;
    }
    
    // Website validation (if provided)
    if (formData.website && formData.website.trim()) {
      const websiteRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
      if (!websiteRegex.test(formData.website)) {
        setError('Please enter a valid website URL');
        return false;
      }
    }
    
    // Hospital images validation
    if (selectedImages.length < 4) {
      setError('Please upload at least 4 hospital photos');
      return false;
    }
    
    // Registration certificate validation
    if (!registrationCertificate) {
      setError('Please upload hospital registration certificate');
      return false;
    }
    
    // Location validation
    if (!location) {
      setError('Please capture your hospital location');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    // Validate form
    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      // Create temporary auth account first
      const { email, password } = formData;
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Send email verification
      await sendEmailVerification(user);

      // IMPORTANT: Sign out the user immediately after account creation
      // This prevents auto-login before admin approval and email verification
      await signOut(auth);
      console.log("User signed out after hospital registration");

      // Handle hospital images upload
      let hospitalImagesMeta = [];
      if (selectedImages.length > 0) {
        try {
          hospitalImagesMeta = await uploadMultipleFilesToCloudflare(selectedImages, user.uid, 'hospital_images');
        } catch (uploadErr) {
          setError("Hospital images upload failed. Please try again later.");
          setLoading(false);
          return;
        }
      }

      // Handle registration certificate upload
      let certificateMeta = null;
      if (registrationCertificate) {
        try {
          const certificateArray = await uploadMultipleFilesToCloudflare([registrationCertificate], user.uid, 'certificates');
          certificateMeta = certificateArray[0];
        } catch (uploadErr) {
          setError("Registration certificate upload failed. Please try again later.");
          setLoading(false);
          return;
        }
      }

      // Prepare user data for admin approval
      const userData = {
        ...formData,
        uid: user.uid,
        userType: "hospital",
        password: "***HIDDEN***",
        submittedAt: new Date().toISOString(),
        emailVerified: false
      };

      const requestId = await sendToAdminForApproval(userData, hospitalImagesMeta, certificateMeta);

      setSuccess(`Your hospital registration request has been submitted for admin approval. 
Request ID: ${requestId}. 
You will receive an email notification once your request is reviewed.
Please verify your email address and wait for admin approval before attempting to login.`);

      // Reset form
      setFormData({
        hospitalName: "",
        email: "",
        address: "",
        city: "",
        phone: "",
        pincode: "",
        password: "",
        confirmPassword: "",
        hospitalType: "",
        website: "",
        emergencyPhone: ""
      });
      setSelectedImages([]);
      setImagePreviews([]);
      setRegistrationCertificate(null);
      setCertificatePreview(null);
      setLocation(null);

      localStorage.setItem(`signup_request_hospital`, requestId);

      // Navigate to home after a short delay to allow user to read the success message
      setTimeout(() => {
        navigate('/');
      }, 3000);

    } catch (error) {
      console.error('Hospital signup error:', error);
      setError(error.message || 'Hospital registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container fluid className="signup-container">
      <div className="signup-row"> {/* Replaced Row with div and custom class */}
        <div className="signup-form-container"> {/* Replaced Col with div and custom class */}
          <div className="signup-header text-center"> {/* Added header div */}
            <h2>Hospital Registration</h2> {/* Removed text-primary as it's handled by CSS */}
            <p className="text-muted">
              Hospital registrations are subject to admin approval. You will receive an email notification once your request is reviewed.
            </p>
          </div>
          
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success" className="white-space-pre-line">{success}</Alert>}
          
          <Form onSubmit={handleSubmit} className="signup-form">
            <Form.Group className="mb-3">
              <Form.Label>Hospital Name*</Form.Label> {/* Added label */}
              <Form.Control
                type="text"
                name="hospitalName"
                placeholder="Enter hospital name"
                value={formData.hospitalName}
                onChange={handleChange}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Hospital Type*</Form.Label> {/* Added label */}
              <Form.Select
                name="hospitalType"
                value={formData.hospitalType}
                onChange={handleChange}
                required
              >
                <option value="">Select hospital type</option>
                {hospitalTypes.map((type, index) => (
                  <option key={index} value={type}>{type}</option>
                ))}
              </Form.Select>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Hospital Email*</Form.Label> {/* Added label */}
              <Form.Control
                type="email"
                name="email"
                placeholder="Enter hospital email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Hospital Website (Optional)</Form.Label> {/* Added label */}
              <Form.Control
                type="url"
                name="website"
                placeholder="e.g., https://www.yourhospital.com"
                value={formData.website}
                onChange={handleChange}
              />
              <Form.Text className="text-muted">
                (e.g., https://www.yourhospital.com)
              </Form.Text>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Complete Address*</Form.Label> {/* Added label */}
              <Form.Control
                type="text"
                name="address"
                placeholder="Enter complete address"
                value={formData.address}
                onChange={handleChange}
                required
              />
            </Form.Group>
            
            <Row className="g-3"> {/* Use g-3 for consistent gap */}
              <Col>
                <Form.Group className="mb-3"> {/* mb-3 on inner group for consistent spacing */}
                  <Form.Label>City*</Form.Label> {/* Added label */}
                  <Form.Control
                    type="text"
                    name="city"
                    placeholder="Enter city"
                    value={formData.city}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </Col>
              <Col>
                <Form.Group className="mb-3"> {/* mb-3 on inner group */}
                  <Form.Label>Pincode*</Form.Label> {/* Added label */}
                  <Form.Control
                    type="text"
                    name="pincode"
                    placeholder="Enter pincode"
                    maxLength="6"
                    value={formData.pincode}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <Row className="g-3"> {/* Use g-3 for consistent gap */}
              <Col>
                <Form.Group className="mb-3"> {/* mb-3 on inner group */}
                  <Form.Label>Main Phone Number*</Form.Label> {/* Added label */}
                  <Form.Control
                    type="tel"
                    name="phone"
                    placeholder="Enter main phone number"
                    maxLength="10"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </Col>
              <Col>
                <Form.Group className="mb-3"> {/* mb-3 on inner group */}
                  <Form.Label>Emergency Phone (Optional)</Form.Label> {/* Added label */}
                  <Form.Control
                    type="tel"
                    name="emergencyPhone"
                    placeholder="Enter emergency phone"
                    maxLength="10"
                    value={formData.emergencyPhone}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
            </Row>

            {renderLocationSection()}
            
            <Form.Group className="mb-3"> {/* Combined password fields into single groups for vertical stacking */}
              <Form.Label>Create Password*</Form.Label> {/* Added label */}
              <Form.Control
                type="password"
                name="password"
                placeholder="Minimum 6 characters"
                value={formData.password}
                onChange={handleChange}
                required
                minLength="6"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Confirm Password*</Form.Label> {/* Added label */}
              <Form.Control
                type="password"
                name="confirmPassword"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
            </Form.Group>
            
            {renderHospitalImagesUpload()}
            {renderCertificateUpload()}

            
            <Button 
              variant="primary" // Changed to primary variant for green button
              type="submit" 
              className="w-100 mt-3" // Added mt-3 for spacing
              disabled={loading}
            >
              {loading ? "Submitting for Approval..." : "Submit Hospital Registration"}
            </Button>
          </Form>

          {/* Already have an account section */}
          <div className="auth-links"> {/* Used auth-links div */}
            <p>
              Already have an account?{" "}
              <Link to="/login"> {/* Removed text-primary, handled by auth-links a */}
                Sign in here
              </Link>
            </p>
          </div>
          
          {/* Check registration status link */}
          <div className="auth-links mt-2"> {/* Used auth-links div */}
            <p>
              <Link to="/check-registration-status"> {/* Removed text-info, handled by auth-links a */}
                Check Registration Status
              </Link>
            </p>
          </div>

          {/* Navigation to other signup pages */}
          <div className="auth-links mt-3"> {/* Used auth-links div */}
            <p className="text-muted">Register as:</p>
            <div className="d-flex justify-content-center gap-3">
              <Link to="/signup/patient" className="btn btn-outline-primary btn-sm">
                Patient
              </Link>
              <Link to="/signup/doctor" className="btn btn-outline-success btn-sm">
                Doctor
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
};

export default HospitalSignupPage;
