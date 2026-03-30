// App.js
import React, { useEffect } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

// Page Components
import LandingPage from "./components/LandingPage";
import LoginPage from "./components/LoginPage";
import DoctorLogin from "./components/DoctorLogin";
import SignupPage from "./components/SignupPage";
import DoctorSignup from "./components/DoctorSignup";
import Dashboard from "./components/Dashboard";
import Chatbot from "./components/Chatbot";
import AppointmentPage from "./components/Appointment";
import HospitalSelect from "./components/HospitalSelect";
import DoctorSelect from "./components/DoctorSelect";
import BookAppointment from "./components/BookAppointment";
import ReportAnalysis from "./components/ReportAnalysis";
import RazorPayment from "./components/PaymentGateway";
import DoctorDashboard from "./components/DoctorDashboard";
import Prescription from "./components/PrescriptionPage";
import SpecialistsPage from "./components/SpecialistsPage";
import ReceiptPage from "./components/ReceiptPage.js";
import UserMyProfilePage from "./components/UserMyProfilePage.js";
import AdminPanel from "./components/AdminPanel";
import AppointmentsPage from "./components/AppointmentsPage";
import HospitalDashboard from "./components/HospitalDashboard.js";
import BloodBank from "./components/BloodBank.js";
import HospitalLocator from "./components/HospitalLocator.js";
import HospitalDetails from "./components/HospitalDetails.js";
import DietPlanGenerator from "./components/DietPlanGenerator.js";
import PatientSignup from "./components/PatientSignup.js";
import HospitalSignup from "./components/HospitalSignup.js";
import FaqSection from "./components/FaqSection.js";
import AdminLoginPage from "./components/AdminLogin.js";
import ScrollToTop from "./components/ScrollToTop";
import AboutUs from "./components/About.js";
import TermsAndConditions from "./components/termsAndConditions.js";
import "./App.css";

// 🔧 Title map for dynamic titles
const titleMap = {
  "/": "Home",
  "/login": "Login",
  "/doctorlogin": "Doctor Login",
  "/signup": "Signup",
  "/signup/patient": "Patient Signup",
  "/signup/doctor": "Doctor Signup",
  "/signup/hospital": "Hospital Signup",
  "/dashboard": "Dashboard",
  "/doctor-dashboard": "Doctor Dashboard",
  "/hospital-dashboard": "Hospital Dashboard",
  "/appointments": "Appointments",
  "/book-appointment": "Book Appointment",
  "/prescription": "Prescription",
  "/receipt": "Receipt",
  "/payment": "Payment",
  "/faq": "FAQs",
  "/blood-bank": "Blood Bank",
  "/report-analysis": "Report Analysis",
  "/diet-plan": "Diet Plan",
  "/chatbot": "Chatbot",
  "/admin": "Admin Panel",
  "/admin-login": "Admin Login",
  "/profile": "My Profile",
  "/aboutus": "About Us",
};

// 🎯 Dynamic title component
const DynamicTitle = () => {
  const location = useLocation();

  useEffect(() => {
    const basePath = location.pathname.split("/")[1];
    const dynamicKey = `/${basePath}`;
    const pageTitle = titleMap[dynamicKey] || "Page";
    document.title = `Medoraa - ${pageTitle}`;
  }, [location]);

  return null;
};

// Main route handler with auth
const AuthAndRouteHandler = () => {
  const { currentUser, loadingAuth } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // REMOVED THE PROBLEMATIC AUTO-LOGOUT CODE
  // The useEffect that was automatically logging out users on landing page has been removed

  return (
    <>
      <DynamicTitle />
      <ScrollToTop />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/doctorlogin" element={<DoctorLogin />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/signup/patient" element={<PatientSignup />} />
        <Route path="/signup/doctor" element={<DoctorSignup />} />
        <Route path="/signup/hospital" element={<HospitalSignup />} />
        <Route path="/profile" element={<UserMyProfilePage />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/faq" element={<FaqSection />} />
        <Route path="/terms-and-conditions" element={<TermsAndConditions />} />

        {/* Authenticated User Dashboard */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/blood-bank" element={<BloodBank />} />
        <Route path="/doctor-dashboard" element={<DoctorDashboard />} />
        <Route path="/hospital-locator" element={<HospitalLocator />} />
        <Route path="/hospital/:placeId" element={<HospitalDetails />} />
        <Route path="/hospital-dashboard" element={<HospitalDashboard />} />
        <Route path="/prescription" element={<Prescription />} />
        <Route path="/admin-login" element={<AdminLoginPage />} />

        {/* Features */}
        <Route path="/chatbot" element={<Chatbot />} />
        <Route path="/report-analysis" element={<ReportAnalysis />} />
        <Route path="/diet-plan" element={<DietPlanGenerator />} />

        {/* Appointment Flow */}
        <Route path="/book-appointment" element={<AppointmentPage />} />
        <Route path="/choose-hospital/:city" element={<HospitalSelect />} />
        <Route path="/select-doctor/:city/:hospitalId" element={<DoctorSelect />} />
        <Route path="/book-appointment/:city/:hospitalId/:doctorId" element={<BookAppointment />} />
        <Route path="/appointments" element={<AppointmentsPage />} />
        <Route path="/receipt" element={<ReceiptPage />} />
        <Route path="/aboutus" element={<AboutUs />} />

        {/* Specialists Directory */}
        <Route path="/specialists/:specialization" element={<SpecialistsPage />} />

        {/* Payment */}
        <Route path="/payment" element={<RazorPayment />} />
      </Routes>
    </>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <AuthAndRouteHandler />
      </AuthProvider>
    </Router>
  );
}

export default App;
