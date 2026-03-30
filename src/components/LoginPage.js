import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { signInWithEmailAndPassword, sendPasswordResetEmail, signOut, onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { FaUser, FaLock, FaTimes } from "react-icons/fa";
import "../styles/LoginPage.css";

const LoginPage = () => {
  const [userType, setUserType] = useState("patient");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const [resetError, setResetError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.message) {
      setError(location.state.message);
    }

    // Monitor auth state and ensure unverified users are signed out
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && !user.emailVerified) {
        // Force sign out unverified users
        await signOut(auth);
      }
    });

    return () => unsubscribe();
  }, [location]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Force refresh the user to get the latest email verification status
      await user.reload();
      const refreshedUser = auth.currentUser;

      if (!refreshedUser.emailVerified) {
        setError("Please verify your email before logging in. Check your inbox and spam folder for the verification email.");
        // Sign out the user since email is not verified
        await signOut(auth);
        setLoading(false);
        return;
      }

      const uid = refreshedUser.uid;

      if (userType === "patient") {
        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          setError("Patient account not found. Please sign up.");
          // Sign out the user since they're not the correct user type
          await signOut(auth);
          setLoading(false);
          return;
        }
        navigate("/dashboard");

      } else if (userType === "doctor") {
        const doctorRef = doc(db, "doctors", uid);
        const doctorSnap = await getDoc(doctorRef);
        if (doctorSnap.exists()) {
          navigate("/doctor-dashboard");
        } else {
          // Check if they have a pending/rejected application
          const tempRef = doc(db, "tempDoctorSignups", uid);
          const tempSnap = await getDoc(tempRef);
          if (tempSnap.exists()) {
            const status = tempSnap.data().status;
            const errorMessage = 
              status === "pending"
                ? "Doctor application is under review. You cannot access services until approved."
                : status === "rejected"
                ? "Doctor application was rejected. Please contact support."
                : "Doctor account not approved yet. You cannot access services until approved.";
            
            setError(errorMessage);
          } else {
            setError("No doctor account found. Please sign up as a doctor first.");
          }
          // Sign out the user since they're not approved or don't have correct account type
          await signOut(auth);
          setLoading(false);
          return;
        }

      } else if (userType === "hospital") {
        const hospRef = doc(db, "hospitals", uid);
        const hospSnap = await getDoc(hospRef);
        if (hospSnap.exists()) {
          navigate("/hospital-dashboard");
        } else {
          // Check if they have a pending/rejected application
          const tempRef = doc(db, "tempHospitalSignups", uid);
          const tempSnap = await getDoc(tempRef);
          if (tempSnap.exists()) {
            const status = tempSnap.data().status;
            const errorMessage = 
              status === "pending"
                ? "Hospital application is under review. You cannot access services until approved."
                : status === "rejected"
                ? "Hospital application was rejected. Please contact support."
                : "Hospital account not approved yet. You cannot access services until approved.";
            
            setError(errorMessage);
          } else {
            setError("No hospital account found. Please sign up as a hospital first.");
          }
          // Sign out the user since they're not approved or don't have correct account type
          await signOut(auth);
          setLoading(false);
          return;
        }
      }

    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        setError("No account found with this email address.");
      } else if (err.code === 'auth/wrong-password') {
        setError("Incorrect password. Please try again.");
      } else if (err.code === 'auth/invalid-email') {
        setError("Please enter a valid email address.");
      } else if (err.code === 'auth/too-many-requests') {
        setError("Too many failed login attempts. Please try again later.");
      } else {
        setError("Invalid email or password.");
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setResetError("");
    setResetMessage("");
    setResetLoading(true);

    if (!resetEmail.trim()) {
      setResetError("Please enter your email address.");
      setResetLoading(false);
      return;
    }

    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetMessage("Password reset email sent! Please check your inbox and spam folder.");
      setResetEmail("");
    } catch (err) {
      console.error(err);
      if (err.code === "auth/user-not-found") {
        setResetError("No account found with this email address.");
      } else if (err.code === "auth/invalid-email") {
        setResetError("Please enter a valid email address.");
      } else if (err.code === "auth/too-many-requests") {
        setResetError("Too many requests. Please try again later.");
      } else {
        setResetError("Error sending reset email. Please try again.");
      }
    } finally {
      setResetLoading(false);
    }
  };

  const closeForgotPasswordModal = () => {
    setShowForgotPassword(false);
    setResetEmail("");
    setResetError("");
    setResetMessage("");
  };

  return (
    <div className="login-page">
      <div className="login-container">
        {/* Left Section */}
        <div className="login-left">
          <h1>Welcome Back</h1>
          <p>Login to access your dashboard</p>
        </div>

        {/* Right Section */}
        <div className="login-right">
          <h2 className="mb-3">Login</h2>

          {/* Tabs */}
          <div style={{ marginBottom: "15px" }}>
            {["patient", "doctor", "hospital"].map(type => (
              <button
                key={type}
                className={`user-tab ${userType === type ? "active" : ""}`}
                onClick={() => setUserType(type)}
                style={{
                  padding: "8px 16px",
                  margin: "0 6px",
                  borderRadius: "8px",
                  border: userType === type ? "2px solid #007bb5" : "1px solid #ccc",
                  backgroundColor: userType === type ? "#007bb5" : "#f5f5f5",
                  color: userType === type ? "white" : "#333",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleLogin}>
            <div className="input-box">
              <FaUser className="icon" />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="input-box">
              <FaLock className="icon" />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="forgot-password-link" style={{ textAlign: "right", marginBottom: "15px" }}>
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#007bb5",
                  textDecoration: "underline",
                  cursor: "pointer",
                  fontSize: "14px"
                }}
              >
                Forgot Password?
              </button>
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          <div className="signup-link">
            Don't have an account? Register as:
            <div style={{ marginTop: "8px" }}>
              <Link to="/signup/patient" className="me-2">Patient</Link> |{" "}
              <Link to="/signup/doctor" className="mx-2">Doctor</Link> |{" "}
              <Link to="/signup/hospital" className="ms-2">Hospital</Link>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="modal-overlay" style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000
        }}>
          <div className="modal-content" style={{
            background: "white",
            padding: "30px",
            borderRadius: "10px",
            width: "90%",
            maxWidth: "400px",
            position: "relative",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)"
          }}>
            <button
              onClick={closeForgotPasswordModal}
              style={{
                position: "absolute",
                top: "15px",
                right: "15px",
                background: "none",
                border: "none",
                fontSize: "18px",
                cursor: "pointer",
                color: "#666"
              }}
            >
              <FaTimes />
            </button>

            <h3 style={{ marginBottom: "20px", color: "#333" }}>Reset Password</h3>
            <p style={{ marginBottom: "20px", color: "#666" }}>
              Enter your email address and we'll send you a link to reset your password.
            </p>

            {resetError && (
              <div style={{
                color: "#dc3545",
                backgroundColor: "#f8d7da",
                padding: "10px",
                borderRadius: "5px",
                marginBottom: "15px",
                fontSize: "14px"
              }}>
                {resetError}
              </div>
            )}

            {resetMessage && (
              <div style={{
                color: "#155724",
                backgroundColor: "#d4edda",
                padding: "10px",
                borderRadius: "5px",
                marginBottom: "15px",
                fontSize: "14px"
              }}>
                {resetMessage}
              </div>
            )}

            <form onSubmit={handleForgotPassword}>
              <div className="input-box" style={{ marginBottom: "20px" }}>
                <FaUser className="icon" />
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "12px 40px",
                    border: "1px solid #ddd",
                    borderRadius: "5px",
                    fontSize: "16px"
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="submit"
                  disabled={resetLoading}
                  style={{
                    flex: 1,
                    padding: "12px",
                    backgroundColor: "#007bb5",
                    color: "white",
                    border: "none",
                    borderRadius: "5px",
                    cursor: resetLoading ? "not-allowed" : "pointer",
                    fontSize: "16px",
                    fontWeight: "bold"
                  }}
                >
                  {resetLoading ? "Sending..." : "Send Reset Link"}
                </button>
                
                <button
                  type="button"
                  onClick={closeForgotPasswordModal}
                  style={{
                    flex: 1,
                    padding: "12px",
                    backgroundColor: "#6c757d",
                    color: "white",
                    border: "none",
                    borderRadius: "5px",
                    cursor: "pointer",
                    fontSize: "16px"
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
