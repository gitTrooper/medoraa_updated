import React, { useState } from "react";
import { auth, db } from "../firebase";
import { 
  createUserWithEmailAndPassword, 
  updateProfile, 
  sendEmailVerification
} from "firebase/auth"; 
import { doc, setDoc } from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";
import { Container, Form, Button, Alert } from "react-bootstrap";
import "../styles/PatientSignup.css";

const PatientSignup = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: ""
  });
  
  // Image upload states
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  
  // Terms and conditions checkbox state
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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

  // Handle terms checkbox change
  const handleTermsChange = (e) => {
    setAgreeToTerms(e.target.checked);
    // Clear error if user checks the terms
    if (e.target.checked && error === "You must agree to the Terms and Conditions to continue.") {
      setError("");
    }
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

  // Enhanced professional image upload component
  const renderImageUpload = () => (
    <div className="profile-upload-container">
      <label className="profile-upload-label">
        Profile Picture (Optional)
      </label>
      <div className={`profile-upload-section ${imagePreview ? 'has-image' : ''}`}>
        {!imagePreview ? (
          <div className="upload-dropzone">
            <div className="upload-icon">
              📷
            </div>
            <p className="upload-text">
              Click to upload or drag and drop
            </p>
            <p className="upload-subtext">
              <span className="file-types">JPG, PNG</span> up to 5MB
            </p>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="profile-file-input"
            />
          </div>
        ) : (
          <div className="image-preview-section">
            <img
              src={imagePreview}
              alt="Profile Preview"
              className="preview-image"
            />
            <div className="preview-info">
              <p className="preview-filename">
                {selectedImage?.name || 'Profile Image'}
              </p>
              <p className="preview-details">
                {selectedImage && `${(selectedImage.size / 1024 / 1024).toFixed(1)} MB`}
              </p>
              <p className="preview-success">
                ✓ Image ready for upload
              </p>
            </div>
            <div className="preview-actions">
              <label className="btn-change">
                Change
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                />
              </label>
              <button
                type="button"
                className="btn-remove"
                onClick={() => {
                  setSelectedImage(null);
                  setImagePreview(null);
                }}
              >
                Remove
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Validate form
  const validateForm = () => {
    const { firstName, lastName, email, password } = formData;
    
    if (!firstName || !lastName) {
      setError('First name and last name are required');
      return false;
    }
    
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

    // Check if terms are agreed
    if (!agreeToTerms) {
      setError('You must agree to the Terms and Conditions to continue.');
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

      setSuccess("Account created successfully! Please check your email for verification.");
      setTimeout(() => navigate("/login"), 3000);

    } catch (error) {
      console.error('Patient signup error:', error);
      setError(error.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container fluid className="signup-container">
      <div className="signup-row">
        <div className="signup-form-container">
          {/* Header Section */}
          <div className="signup-header">
            <h2>Create Your Account</h2>
            <p>Join our healthcare platform to access quality medical services</p>
          </div>
          
          {/* Alerts */}
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}
          
          {/* Registration Form */}
          <Form onSubmit={handleSubmit} className="signup-form">
            {/* Name Fields */}
            <div className="name-row">
              <Form.Group>
                <Form.Control
                  type="text"
                  name="firstName"
                  placeholder="First Name*"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                />
              </Form.Group>
              <Form.Group>
                <Form.Control
                  type="text"
                  name="lastName"
                  placeholder="Last Name*"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                />
              </Form.Group>
            </div>

            {/* Email Field */}
            <Form.Group>
              <Form.Control
                type="email"
                name="email"
                placeholder="Email Address*"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </Form.Group>

            {/* Password Field */}
            <Form.Group>
              <Form.Control
                type="password"
                name="password"
                placeholder="Create Password* (minimum 6 characters)"
                value={formData.password}
                onChange={handleChange}
                required
                minLength="6"
              />
            </Form.Group>

            {/* Profile Image Upload */}
            {renderImageUpload()}

            {/* Terms and Conditions Checkbox */}
   <Form.Group className="terms-checkbox-container mb-3">
  <div className="custom-checkbox-wrapper">
    <input
      type="checkbox"
      id="agreeToTerms"
      checked={agreeToTerms}
      onChange={handleTermsChange}
      className="custom-checkbox-input"
      required
    />
    <label htmlFor="agreeToTerms" className="custom-checkbox-label">
      <span className="checkbox-indicator">
        {agreeToTerms && (
          <svg 
            width="12" 
            height="9" 
            viewBox="0 0 12 9" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              d="M1 4.5L4.5 8L11 1.5" 
              stroke="white" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <span className="checkbox-text">
        I agree to the{" "}
        <Link 
          to="/terms-and-conditions" 
          target="_blank"
          rel="noopener noreferrer"
          className="terms-link"
        >
          Terms and Conditions
        </Link>
      </span>
    </label>
  </div>
</Form.Group>


            {/* Submit Button */}
            <Button 
              variant="primary" 
              type="submit" 
              className="w-100"
              disabled={loading}
            >
              {loading ? "Creating Account..." : "Create Patient Account"}
            </Button>
          </Form>

          {/* Navigation Links */}
          <div className="auth-links">
            <p>
              Already have an account?{" "}
              <Link to="/login">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </Container>
  );
};

export default PatientSignup;
