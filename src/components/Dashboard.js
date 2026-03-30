import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import HealthCategories from "./HealthCategories";
import { onAuthStateChanged, getAuth } from "firebase/auth";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Card,
  Row,
  Col,
  Button,
  ProgressBar,
  Spinner
} from "react-bootstrap";
import {
  BsArrowRight,
  BsChatDots,
  BsFileEarmarkMedical,
  BsGeoAlt,
  BsCalendarCheck,
  BsPersonCircle,
  BsShieldCheck,
  BsDroplet,
  BsHeart,
  BsActivity
} from "react-icons/bs";
import NavigationBar from "../components/NavigationBar";
import "../styles/Dashboard.css";

const Dashboard = () => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upcomingAppointment, setUpcomingAppointment] = useState("No upcoming appointments");
  const navigate = useNavigate();

  useEffect(() => {
    const authInstance = getAuth();
    const unsubscribe = onAuthStateChanged(authInstance, async (currentUser) => {
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            setUserData(userDoc.data());
          }

          const appointmentSnapshot = await getDocs(collection(db, "appointments"));
          const now = new Date();
          let upcoming = null;

          appointmentSnapshot.forEach(docSnap => {
            const data = docSnap.data();
            if (data.patientId === currentUser.uid && data.appointmentDate && data.appointmentTime) {
              const appointmentDateTime = new Date(`${data.appointmentDate} ${data.appointmentTime}`);
              if (appointmentDateTime > now) {
                if (!upcoming || appointmentDateTime < upcoming.dateTime) {
                  upcoming = {
                    dateTime: appointmentDateTime,
                    formatted: `${data.appointmentDate} at ${data.appointmentTime}${data.doctorName ? ` - Dr. ${data.doctorName}` : ""}`
                  };
                }
              }
            }
          });

          if (upcoming) setUpcomingAppointment(upcoming.formatted);
        } catch (error) {
          console.error("Error fetching user or appointment data:", error);
        } finally {
          setLoading(false);
        }
      } else {
        navigate("/login");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const healthSummary = {
    profileCompletion: 70,
    lastLogin: new Date().toLocaleDateString(),
    lastCheckup: "March 15, 2025",
    upcomingAppointment
  };

  if (loading) {
    return (
      <>
        <NavigationBar />
        <Container className="dashboard-loading-container text-center py-5">
          <div className="dashboard-loading-pulse"></div>
          <h4 className="dashboard-loading-title text-muted">Loading your healthcare dashboard...</h4>
          <p className="dashboard-loading-subtitle text-muted">Please wait while we prepare your personalized health overview</p>
        </Container>
      </>
    );
  }

  return (
    <>
      <NavigationBar />
      <div className="dashboard-header-section">
        <Container>
          <div className="dashboard-welcome-section text-center">
            <div className="dashboard-medical-badge">
              <BsHeart className="me-2" />
              Healthcare Dashboard
            </div>
            <h1 className="dashboard-welcome-title fw-bold mb-3">
              Welcome back, {userData?.firstName || "User"}!
            </h1>
            <p className="dashboard-welcome-subtitle">
              Your personalized healthcare companion for better health management
            </p>
          </div>
        </Container>
      </div>

      <Container className="dashboard-main-container">
        {/* Health Summary Section */}
        <div className="dashboard-health-summary">
          <Row className="g-4">
            <Col lg={6}>
              <Card className="dashboard-summary-card dashboard-hover-scale">
                <Card.Body>
                  <div className="dashboard-medical-card-header">
                    <div className="d-flex align-items-center">
                      <div className="dashboard-icon-circle me-3">
                        <BsPersonCircle size={24} />
                      </div>
                      <div>
                        <h5 className="dashboard-card-title mb-0">Your Health Profile</h5>
                        <small className="dashboard-card-subtitle text-muted">Personal health overview</small>
                      </div>
                    </div>
                  </div>
                  
                  <div className="dashboard-health-metric">
                    <span>Profile Completion</span>
                    <span className="dashboard-health-metric-value">{healthSummary.profileCompletion}%</span>
                  </div>
                  
                  <ProgressBar
                    now={healthSummary.profileCompletion}
                    className="dashboard-health-progress mb-3"
                    style={{ height: '12px' }}
                  />
                  
                  <div className="dashboard-user-stats">
                    <p className="dashboard-stat-item d-flex align-items-center mb-2">
                      <BsActivity className="me-2" />
                      <span className="dashboard-health-status-indicator"></span>
                      Last login: {healthSummary.lastLogin}
                    </p>
                    <p className="dashboard-stat-item d-flex align-items-center">
                      <BsShieldCheck className="me-2" />
                      <span className="dashboard-health-status-indicator"></span>
                      Last checkup: {healthSummary.lastCheckup}
                    </p>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col lg={6}>
              <Card className="dashboard-summary-card dashboard-hover-scale">
                <Card.Body>
                  <div className="dashboard-medical-card-header">
                    <div className="d-flex align-items-center">
                      <div className="dashboard-icon-circle me-3">
                        <BsCalendarCheck size={24} />
                      </div>
                      <div>
                        <h5 className="dashboard-card-title mb-0">Next Appointment</h5>
                        <small className="dashboard-card-subtitle text-muted">Upcoming medical consultation</small>
                      </div>
                    </div>
                  </div>
                  
                  <div className="dashboard-appointment-info">
                    <div className="dashboard-date-time">
                      <BsHeart className="me-2" />
                      {healthSummary.upcomingAppointment}
                    </div>
                    <Button 
                      variant="outline-primary" 
                      className="dashboard-appointment-btn dashboard-hover-scale"
                      onClick={() => navigate("/appointments")}
                    >
                      <BsCalendarCheck className="me-2" />
                      Manage Appointments
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </div>

        {/* Healthcare Services Section */}
        <div className="dashboard-services-section mb-5">
          <h4 className="dashboard-section-title">Healthcare Services</h4>
          <p className="dashboard-section-subtitle text-muted mb-4 lead">
            Comprehensive digital health services designed to support your wellness journey
          </p>

          <Row className="g-4">
            {[
              {
                icon: <BsChatDots className="dashboard-service-icon" />,
                title: "AI Health Assistant",
                desc: "Get instant, personalized health guidance from our advanced AI medical assistant available 24/7.",
                path: "/chatbot",
                color: "info"
              },
              {
                icon: <BsFileEarmarkMedical className="dashboard-service-icon" />,
                title: "Report Analysis",
                desc: "Upload and analyze your medical reports with AI-powered insights and recommendations.",
                path: "/report-analysis",
                color: "warning"
              },
              {
                icon: <BsGeoAlt className="dashboard-service-icon" />,
                title: "Hospital Locator",
                desc: "Find nearby hospitals, clinics, and medical facilities with real-time availability and directions.",
                path: "/hospital-locator",
                color: "danger"
              },
              {
                icon: <BsCalendarCheck className="dashboard-service-icon" />,
                title: "Book Appointment",
                desc: "Schedule appointments with qualified healthcare professionals in your area quickly and easily.",
                path: "/book-appointment",
                color: "success"
              },
              {
                icon: <BsDroplet className="dashboard-service-icon" />,
                title: "Blood Bank",
                desc: "Connect with blood banks, check availability, and coordinate blood donations in emergencies.",
                path: "/blood-bank",
                color: "danger"
              },
              {
                icon: <BsHeart className="dashboard-service-icon" />,
                title: "Diet Plan",
                desc: "Receive personalized nutrition plans and dietary recommendations based on your health goals.",
                path: "/diet-plan",
                color: "success"
              }
            ].map(({ icon, title, desc, path, color }, idx) => (
              <Col md={6} lg={4} key={idx}>
                <Card className="dashboard-service-card dashboard-hover-scale h-100">
                  <div className="dashboard-service-icon-container">
                    {icon}
                  </div>
                  <h5 className="dashboard-service-title mb-3">{title}</h5>
                  <p className="dashboard-service-desc text-muted mb-4">{desc}</p>
                  <Button 
                    className="dashboard-service-btn mt-auto"
                    onClick={() => navigate(path)}
                  >
                    {title.includes("Book") ? "Book Now" : 
                     title.includes("Chat") ? "Chat Now" : 
                     title.includes("Blood") ? "Find Blood" : 
                     title.includes("Diet") ? "Get Plan" : "Explore"}
                    <BsArrowRight className="ms-2" />
                  </Button>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
            <HealthCategories />
        {/* Health Tips Section */}
        <div className="dashboard-tips-section">
          <h4 className="dashboard-section-title">Daily Health Tips</h4>
          <Row className="g-4">
            <Col md={6}>
              <Card className="dashboard-tip-card dashboard-hover-scale">
                <Card.Body>
                  <div className="d-flex align-items-center mb-3">
                    <div className="dashboard-tip-icon">💧</div>
                    <div>
                      <h5 className="dashboard-tip-title mb-1">Stay Hydrated</h5>
                      <small className="dashboard-tip-subtitle text-muted">Essential for optimal health</small>
                    </div>
                  </div>
                  <p className="dashboard-tip-desc text-muted">
                    Drink at least 8 glasses of water daily to maintain optimal health, support bodily functions, 
                    and boost your immune system. Proper hydration improves energy levels and mental clarity.
                  </p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card className="dashboard-tip-card dashboard-hover-scale">
                <Card.Body>
                  <div className="d-flex align-items-center mb-3">
                    <div className="dashboard-tip-icon">💤</div>
                    <div>
                      <h5 className="dashboard-tip-title mb-1">Quality Sleep</h5>
                      <small className="dashboard-tip-subtitle text-muted">Foundation of good health</small>
                    </div>
                  </div>
                  <p className="dashboard-tip-desc text-muted">
                    Aim for 7–9 hours of quality sleep each night to support your immune system, improve mental health, 
                    and enhance overall wellbeing. Good sleep is crucial for recovery and performance.
                  </p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
          <div className="dashboard-tips-footer text-center mt-4">
            <Button 
              variant="outline-primary" 
              size="lg"
              className="dashboard-resources-btn dashboard-hover-scale"
              onClick={() => navigate("/health-resources")}
            >
              <BsHeart className="me-2" />
              Explore More Health Resources
            </Button>
          </div>
        </div>
      </Container>

      
    </>
  );
};

export default Dashboard;