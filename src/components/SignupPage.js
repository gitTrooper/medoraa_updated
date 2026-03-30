import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { 
  createUserWithEmailAndPassword, 
  updateProfile, 
  sendEmailVerification,
  onAuthStateChanged
} from "firebase/auth"; 
import { doc, setDoc, collection, GeoPoint, getDoc } from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";
import { Container, Form, Button, Row, Col, Nav, Tab, Alert } from "react-bootstrap";
import "../styles/SignupPage.css";

const SignupPage = () => {
  const [userType, setUserType] = useState("patient");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    // Doctor specific fields
    specialization: "",
    licenseNumber: "",
    experience: "",
    // Hospital specific fields
    hospitalName: "",
    address: "",
    city: "",
    phone: "",
    pincode: "",
    confirmPassword: ""
  });
  
  // Image upload states
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [checkingVerification, setCheckingVerification] = useState(false);

  const navigate = useNavigate();

  // Cloudflare R2 image upload function
  const uploadImageToCloudflare = async (file, userId) => {
    try {
      const fileBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(fileBuffer);

      const timestamp = Date.now();
      const fileExtension = file.name.split(".").pop() || "jpg";
      const key = `profiles/${userId}/${timestamp}.${fileExtension}`;

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
    } catch (error) {
      console.error("Image upload error:", error);
      throw new Error("Image upload failed. Check CORS or credentials.");
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle image selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setError("Please select a valid image file");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setError("Image size should be less than 5MB");
        return;
      }

      setSelectedImage(file);

      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
      setError("");
    }
  };

  // Image upload component
  const renderImageUpload = () => (
    <div className="mb-3">
      <Form.Label>
        Profile Picture {userType === 'doctor' ? '*' : '(Optional)'}
      </Form.Label>
      <Form.Control
        type="file"
        accept="image/*"
        onChange={handleImageChange}
        required={userType === 'doctor'}
      />
      {imagePreview && (
        <div className="mt-2">
          <img
            src={imagePreview}
            alt="Preview"
            style={{
              width: '100px',
              height: '100px',
              objectFit: 'cover',
              borderRadius: '8px',
              border: '2px solid #dee2e6'
            }}
          />
        </div>
      )}
    </div>
  );

  // Get location coordinates for hospital (can be enhanced with geocoding API)
  const getLocationCoordinates = async (address, city, pincode) => {
    try {
      // For now, returning default coordinates
      // You can integrate with Google Geocoding API or similar service
      return new GeoPoint(0, 0); // Default coordinates
    } catch (error) {
      console.error('Error getting coordinates:', error);
      return new GeoPoint(0, 0);
    }
  };

  // Send signup request to admin for approval
  const sendToAdminForApproval = async (userData, profileImageMeta = null) => {
  try {
    const adminRequestData = {
      ...userData,
      status: "pending_admin_approval",
      submittedAt: new Date().toISOString(),
      adminApproved: false,
      adminReviewed: false,
      adminComments: "",
      rejectionReason: "",
      profileImage: profileImageMeta?.url || null,
      profileImageMeta: profileImageMeta,
      requestId: `${userType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ipAddress: null,
      userAgent: navigator.userAgent,
      submissionSource: "signup_form"
    };

    // ✅ Set correct collection based on user type
    let collectionName = '';
    if (userType === 'doctor') {
      collectionName = 'tempDoctorSignups';
    } else if (userType === 'hospital') {
      collectionName = 'tempHospitalSignups';
    } else {
      throw new Error('Unexpected userType: only doctor and hospital require approval');
    }

    // ✅ Save only to the temp collection
    await setDoc(doc(db, collectionName, adminRequestData.requestId), adminRequestData);

    // ❌ Removed: admin_approval_queue and admin_notifications

    return adminRequestData.requestId;
  } catch (error) {
    console.error('Error sending to admin:', error);
    throw new Error('Failed to submit for admin approval');
  }
};

  // Send notification to admin about new signup request
   // Create hospital document structure (only called after admin approval)
  const createHospitalDocument = async (hospitalId, userData) => {
    try {
      const location = await getLocationCoordinates(userData.address, userData.city, userData.pincode);
      
      // Main hospital document
      const hospitalData = {
        name: userData.hospitalName,
        address: userData.address,
        city: userData.city,
        location: location,
        phone: userData.phone,
        email: userData.email,
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
        doctorIds: [], // Empty array initially - hospital will add doctors later
        lastUpdated: new Date(),
        totalDoctors: 0
      });

      console.log('Hospital document structure created successfully');
    } catch (error) {
      console.error('Error creating hospital document:', error);
      throw error;
    }
  };

  // Validate forms
  const validateForm = () => {
    const { firstName, lastName, email, password, confirmPassword } = formData;
    
    // Common validation for all user types
    if (!email || !password) {
      setError('Email and password are required');
      return false;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }

    // User type specific validation
    if (userType === "patient") {
      if (!firstName || !lastName) {
        setError('First name and last name are required for patients');
        return false;
      }
    } else if (userType === "doctor") {
      if (!firstName || !lastName || !formData.specialization || !formData.licenseNumber || !formData.experience) {
        setError('All fields are required for doctor registration');
        return false;
      }
      
      // Doctor profile picture validation
      if (!selectedImage) {
        setError('Profile picture is required for doctor registration');
        return false;
      }
    } else if (userType === "hospital") {
      const { hospitalName, address, city, phone, pincode } = formData;
      
      if (!hospitalName || !address || !city || !phone || !pincode || !confirmPassword) {
        setError('All fields are required for hospital registration');
        return false;
      }
      
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return false;
      }
      
      // Phone validation (basic)
      const phoneRegex = /^\d{10}$/;
      if (!phoneRegex.test(phone)) {
        setError('Please enter a valid 10-digit phone number');
        return false;
      }
      
      // Pincode validation
      const pincodeRegex = /^\d{6}$/;
      if (!pincodeRegex.test(pincode)) {
        setError('Please enter a valid 6-digit pincode');
        return false;
      }
    }
    
    return true;
  };

  // Check approval status
  const checkApprovalStatus = async (requestId, userType) => {
  try {
    let collectionName = '';
    if (userType === 'doctor') {
      collectionName = 'tempDoctorSignups';
    } else if (userType === 'hospital') {
      collectionName = 'tempHospitalSignups';
    } else {
      throw new Error('Invalid user type');
    }

    const approvalDoc = await getDoc(doc(db, collectionName, requestId));

    if (approvalDoc.exists()) {
      const approvalData = approvalDoc.data();

      if (approvalData.adminApproved && approvalData.status === 'approved') {
        return { approved: true, data: approvalData };
      } else if (approvalData.status === 'rejected') {
        return { approved: false, rejected: true, reason: approvalData.rejectionReason };
      } else {
        return { approved: false, pending: true };
      }
    }

    return { approved: false, notFound: true };
  } catch (error) {
    console.error('Error checking approval status:', error);
    throw error;
  }
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
      if (userType === "patient") {
        const { email, password, firstName, lastName } = formData;
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await updateProfile(user, {
          displayName: `${firstName} ${lastName}`
        });

        await sendEmailVerification(user);

        // Handle image upload for patient (optional)
        let profileImageMeta = null;
        if (selectedImage) {
          try {
            profileImageMeta = await uploadImageToCloudflare(selectedImage, user.uid);
          } catch (uploadErr) {
            setError("Image upload failed. Please try again later.");
            setLoading(false);
            return;
          }
        }

        await setDoc(doc(db, "users", user.uid), {
          firstName,
          lastName,
          email,
          userType: "patient",
          createdAt: new Date().toISOString(),
          emailVerified: false,
          profileImage: profileImageMeta?.url || null,
          profileImageMeta: profileImageMeta
        });

        setSuccess("Patient registered successfully! Please verify your email.");
        setTimeout(() => navigate("/login"), 3000);
        return;

      } else {
        // For doctors and hospitals, create temporary auth account first
        const { email, password } = formData;
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Send email verification
        await sendEmailVerification(user);

        // Handle image upload if present
        let profileImageMeta = null;
        if (selectedImage) {
          try {
            profileImageMeta = await uploadImageToCloudflare(selectedImage, user.uid);
          } catch (uploadErr) {
            setError("Image upload failed. Please try again later.");
            setLoading(false);
            return;
          }
        }

        // Prepare user data for admin approval
        const userData = {
          ...formData,
          uid: user.uid,
          userType: userType,
          password: "***HIDDEN***",
          submittedAt: new Date().toISOString(),
          emailVerified: false
        };

        const requestId = await sendToAdminForApproval(userData, profileImageMeta);

        setSuccess(`Your ${userType} registration request has been submitted for admin approval. 
Request ID: ${requestId}. 
You will receive an email notification once your request is reviewed.`);

        // Reset form
        setFormData({
          firstName: "",
          lastName: "",
          email: "",
          password: "",
          specialization: "",
          licenseNumber: "",
          experience: "",
          hospitalName: "",
          address: "",
          city: "",
          phone: "",
          pincode: "",
          confirmPassword: ""
        });
        setSelectedImage(null);
        setImagePreview(null);

        localStorage.setItem(`signup_request_${userType}`, requestId);

        setTimeout(() => {
          navigate(`/signup-status/${requestId}`, { 
            state: { 
              userType: userType,
              requestId: requestId,
              message: "Your registration request is being reviewed by our admin team."
            }
          });
        }, 3000);
      }
    } catch (error) {
      console.error('Signup error:', error);
      setError(error.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container fluid className="signup-container">
      <Row className="signup-row">
        <Col md={6} className="signup-form-container">
          <h2 className="text-primary mb-4">Create an Account</h2>
          <p className="text-muted mb-4">
            All registrations are subject to admin approval. You will receive an email notification once your request is reviewed.
          </p>
          
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success" className="white-space-pre-line">{success}</Alert>}
          
          <Tab.Container id="signup-tabs" defaultActiveKey="patient">
            <Nav variant="pills" className="mb-4 nav-justified">
              <Nav.Item>
                <Nav.Link 
                  eventKey="patient" 
                  onClick={() => setUserType("patient")}
                  className="rounded-pill"
                >
                  Patient Signup
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link 
                  eventKey="doctor" 
                  onClick={() => setUserType("doctor")}
                  className="rounded-pill"
                >
                  Doctor Signup
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link 
                  eventKey="hospital" 
                  onClick={() => setUserType("hospital")}
                  className="rounded-pill"
                >
                  Hospital Signup
                </Nav.Link>
              </Nav.Item>
            </Nav>
            
            <Tab.Content>
              <Tab.Pane eventKey="patient">
                <Form onSubmit={handleSubmit} className="signup-form">
                  <Row>
                    <Col>
                      <Form.Group className="mb-3">
                        <Form.Control
                          type="text"
                          name="firstName"
                          placeholder="First Name*"
                          value={formData.firstName}
                          onChange={handleChange}
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col>
                      <Form.Group className="mb-3">
                        <Form.Control
                          type="text"
                          name="lastName"
                          placeholder="Last Name*"
                          value={formData.lastName}
                          onChange={handleChange}
                          required
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                  <Form.Group className="mb-3">
                    <Form.Control
                      type="email"
                      name="email"
                      placeholder="Your Email*"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Control
                      type="password"
                      name="password"
                      placeholder="Create Password*"
                      value={formData.password}
                      onChange={handleChange}
                      required
                    />
                  </Form.Group>
                  {renderImageUpload()}
                  <Button 
                    variant="primary" 
                    type="submit" 
                    className="w-100"
                    disabled={loading}
                  >
                    {loading ? "Submitting for Approval..." : "Submit Patient Registration"}
                  </Button>
                </Form>
              </Tab.Pane>
              
              <Tab.Pane eventKey="doctor">
                <Form onSubmit={handleSubmit} className="signup-form">
                  <Row>
                    <Col>
                      <Form.Group className="mb-3">
                        <Form.Control
                          type="text"
                          name="firstName"
                          placeholder="First Name*"
                          value={formData.firstName}
                          onChange={handleChange}
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col>
                      <Form.Group className="mb-3">
                        <Form.Control
                          type="text"
                          name="lastName"
                          placeholder="Last Name*"
                          value={formData.lastName}
                          onChange={handleChange}
                          required
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                  <Form.Group className="mb-3">
                    <Form.Control
                      type="email"
                      name="email"
                      placeholder="Your Email*"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Control
                      type="password"
                      name="password"
                      placeholder="Create Password*"
                      value={formData.password}
                      onChange={handleChange}
                      required
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Control
                      type="text"
                      name="specialization"
                      placeholder="Specialization*"
                      value={formData.specialization}
                      onChange={handleChange}
                      required
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Control
                      type="text"
                      name="licenseNumber"
                      placeholder="License Number*"
                      value={formData.licenseNumber}
                      onChange={handleChange}
                      required
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Control
                      type="text"
                      name="experience"
                      placeholder="Years of Experience*"
                      value={formData.experience}
                      onChange={handleChange}
                      required
                    />
                  </Form.Group>
                  {renderImageUpload()}
                  <Button 
                    variant="success" 
                    type="submit" 
                    className="w-100"
                    disabled={loading}
                  >
                    {loading ? "Submitting for Approval..." : "Submit Doctor Registration"}
                  </Button>
                </Form>
              </Tab.Pane>

              <Tab.Pane eventKey="hospital">
                <Form onSubmit={handleSubmit} className="signup-form">
                  <Form.Group className="mb-3">
                    <Form.Control
                      type="text"
                      name="hospitalName"
                      placeholder="Hospital Name*"
                      value={formData.hospitalName}
                      onChange={handleChange}
                      required
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Control
                      type="email"
                      name="email"
                      placeholder="Hospital Email*"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Control
                      type="text"
                      name="address"
                      placeholder="Complete Address*"
                      value={formData.address}
                      onChange={handleChange}
                      required
                    />
                  </Form.Group>
                  <Row>
                    <Col>
                      <Form.Group className="mb-3">
                        <Form.Control
                          type="text"
                          name="city"
                          placeholder="City*"
                          value={formData.city}
                          onChange={handleChange}
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col>
                      <Form.Group className="mb-3">
                        <Form.Control
                          type="text"
                          name="pincode"
                          placeholder="Pincode*"
                          maxLength="6"
                          value={formData.pincode}
                          onChange={handleChange}
                          required
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                  <Form.Group className="mb-3">
                    <Form.Control
                      type="tel"
                      name="phone"
                      placeholder="Phone Number (10 digits)*"
                      maxLength="10"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                    />
                  </Form.Group>
                  <Row>
                    <Col>
                      <Form.Group className="mb-3">
                        <Form.Control
                          type="password"
                          name="password"
                          placeholder="Create Password*"
                          value={formData.password}
                          onChange={handleChange}
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col>
                      <Form.Group className="mb-3">
                        <Form.Control
                          type="password"
                          name="confirmPassword"
                          placeholder="Confirm Password*"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          required
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                  {renderImageUpload()}
                  <Button 
                    variant="warning" 
                    type="submit" 
                    className="w-100"
                    disabled={loading}
                  >
                    {loading ? "Submitting for Approval..." : "Submit Hospital Registration"}
                  </Button>
                </Form>
              </Tab.Pane>
            </Tab.Content>
          </Tab.Container>

          {/* Already have an account section */}
          <p className="mt-3 text-center">
            Already have an account?{" "}
            <Link to="/login" className="text-primary">
              Login here
            </Link>
          </p>
          
          {/* Check registration status link */}
          <p className="mt-2 text-center">
            <Link to="/check-registration-status" className="text-info">
              Check Registration Status
            </Link>
          </p>
        </Col>
        <Col md={6} className="signup-image-container">
          <img src="/signup.png" alt="Doctors" className="signup-image" />
        </Col>
      </Row>
    </Container>
  );
};

export default SignupPage;