import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import NavigationBar from "./NavigationBar";
import Footer from "./Footer";
import HealthCategories from "./HealthCategories";
import FaqSection from "./FaqSection";
import "../styles/LandingPage.css";
import {
  BsChatDots,
  BsFileEarmarkMedical,
  BsGeoAlt,
  BsCalendarCheck,
  BsHeart,
  BsDroplet,
} from "react-icons/bs";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import { Row, Col, Button } from "react-bootstrap";
import { v4 as uuidv4 } from "uuid";

// Cache for localStorage operations
const storageCache = new Map();
const CACHE_EXPIRY = 5000; // 5 seconds

// Optimized localStorage operations with caching
const optimizedStorage = {
  get: (key) => {
    const cached = storageCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY) {
      return cached.value;
    }
    
    const value = localStorage.getItem(key);
    storageCache.set(key, { value, timestamp: Date.now() });
    return value;
  },
  
  set: (key, value) => {
    localStorage.setItem(key, value);
    storageCache.set(key, { value, timestamp: Date.now() });
  },
  
  invalidate: (key) => {
    storageCache.delete(key);
  }
};

// Debounce utility for expensive operations
const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

// Throttle utility for high-frequency updates
const throttle = (func, limit) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

const LandingPage = () => {
  const [typedText, setTypedText] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [usageCounts, setUsageCounts] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  
  const navigate = useNavigate();
  const auth = getAuth();
  const db = getFirestore();
  
  // Refs for cleanup and optimization
  const typingIntervalRef = useRef(null);
  const authUnsubscribeRef = useRef(null);
  const firebaseQueueRef = useRef([]);
  const processingFirebaseRef = useRef(false);

  // Memoized constants to prevent re-creation
  const usageLimits = useMemo(() => ({
    chatbot: 3,
    reportAnalysis: 3,
    dietPlan: 2,
  }), []);

  const services = useMemo(() => [
    {
      key: "chatbot",
      icon: <BsChatDots size={28} />,
      title: "AI Health Assistant",
      desc: "Get instant, personalized health guidance from our advanced AI medical assistant available 24/7.",
      path: "/chatbot",
      button: "EXPLORE",
    },
    {
      key: "reportAnalysis",
      icon: <BsFileEarmarkMedical size={28} />,
      title: "Report Analysis",
      desc: "Upload and analyze your medical reports with AI-powered insights and recommendations.",
      path: "/report-analysis",
      button: "EXPLORE",
    },
    {
      key: "hospitalLocator",
      icon: <BsGeoAlt size={28} />,
      title: "Hospital Locator",
      desc: "Find nearby hospitals, clinics, and medical facilities with real-time availability and directions.",
      path: "/hospital-locator",
      button: "EXPLORE",
    },
    {
      key: "bookAppointment",
      icon: <BsCalendarCheck size={28} />,
      title: "Book Appointment",
      desc: "Schedule appointments with qualified healthcare professionals in your area quickly and easily.",
      path: "/book-appointment",
      button: "BOOK NOW",
    },
    {
      key: "bloodBank",
      icon: <BsDroplet size={28} />,
      title: "Blood Bank",
      desc: "Connect with blood banks, check availability, and coordinate blood donations in emergencies.",
      path: "/blood-bank",
      button: "FIND BLOOD",
    },
    {
      key: "dietPlan",
      icon: <BsHeart size={28} />,
      title: "Diet Plan",
      desc: "Receive personalized nutrition plans and dietary recommendations based on your health goals.",
      path: "/diet-plan",
      button: "GET PLAN",
    },
  ], []);

  // Optimized visitor ID generation with memoization
  const getOrCreateVisitorId = useCallback(() => {
    let id = optimizedStorage.get("visitorId");
    if (!id) {
      id = uuidv4();
      optimizedStorage.set("visitorId", id);
    }
    return id;
  }, []);

  // Optimized daily usage initialization
  const initDailyUsage = useCallback(() => {
    const today = new Date().toISOString().split("T")[0];
    const savedDate = optimizedStorage.get("usageDate");
    const initialCounts = {
      chatbot: 0,
      reportAnalysis: 0,
      dietPlan: 0,
    };
    
    if (savedDate !== today) {
      optimizedStorage.set("usageDate", today);
      optimizedStorage.set("usageCounts", JSON.stringify(initialCounts));
      return initialCounts;
    }
    
    try {
      return JSON.parse(optimizedStorage.get("usageCounts") || JSON.stringify(initialCounts));
    } catch {
      return initialCounts;
    }
  }, []);

  // Batch Firebase operations to reduce network calls
  const procesFirebaseQueue = useCallback(async () => {
    if (processingFirebaseRef.current || firebaseQueueRef.current.length === 0) {
      return;
    }

    processingFirebaseRef.current = true;
    const queue = [...firebaseQueueRef.current];
    firebaseQueueRef.current = [];

    try {
      const visitorId = getOrCreateVisitorId();
      const docRef = doc(db, "notlogged", `notlogged-${visitorId}`);
      const docSnap = await getDoc(docRef);
      let data = docSnap.exists() ? docSnap.data() : {};

      // Batch all queued updates
      queue.forEach(({ key }) => {
        data[key] = (data[key] || 0) + 1;
      });

      await setDoc(docRef, data);
    } catch (error) {
      console.error("Firebase batch update error:", error);
      // Re-queue failed operations
      firebaseQueueRef.current.unshift(...queue);
    } finally {
      processingFirebaseRef.current = false;
    }
  }, [db, getOrCreateVisitorId]);

  // Debounced Firebase processing
  const debouncedFirebaseProcess = useMemo(
    () => debounce(procesFirebaseQueue, 1000),
    [procesFirebaseQueue]
  );

  // Optimized increment usage function
  const incrementUsage = useCallback(async (key) => {
    // Immediate UI update for better UX
    setUsageCounts(prev => {
      const newCounts = { ...prev, [key]: (prev[key] || 0) + 1 };
      // Update localStorage with throttling
      optimizedStorage.set("usageCounts", JSON.stringify(newCounts));
      return newCounts;
    });

    // Queue Firebase operation for non-logged users
    if (!isLoggedIn) {
      firebaseQueueRef.current.push({ key });
      debouncedFirebaseProcess();
    }
  }, [isLoggedIn, debouncedFirebaseProcess]);

  // Optimized typing effect with RAF for smooth animation
  useEffect(() => {
    let index = 0;
    let isDeleting = false;
    let currentText = "";
    const fullText = "We Ensure";
    let animationFrame;

    const type = () => {
      currentText = isDeleting
        ? fullText.substring(0, index--)
        : fullText.substring(0, index++);
      
      setTypedText(currentText);
      
      if (!isDeleting && index === fullText.length + 1) {
        setTimeout(() => {
          isDeleting = true;
          index = fullText.length - 1;
        }, 2000);
      } else if (isDeleting && index < 0) {
        isDeleting = false;
        index = 0;
      }
      
      typingIntervalRef.current = setTimeout(type, 150);
    };

    typingIntervalRef.current = setTimeout(type, 100);

    return () => {
      if (typingIntervalRef.current) {
        clearTimeout(typingIntervalRef.current);
      }
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, []);

  // Optimized auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
    });
    authUnsubscribeRef.current = unsubscribe;
    
    return () => unsubscribe();
  }, [auth]);

  // Initialize usage counts with loading state
  useEffect(() => {
    const initializeUsage = async () => {
      try {
        const counts = initDailyUsage();
        setUsageCounts(counts);
      } catch (error) {
        console.error("Error initializing usage:", error);
        setUsageCounts({});
      } finally {
        setIsLoading(false);
      }
    };

    initializeUsage();
  }, [initDailyUsage]);

  // Export increment function with throttling
  useEffect(() => {
    const throttledIncrement = throttle(incrementUsage, 500);
    window.incrementUsage = throttledIncrement;
    
    return () => {
      if (window.incrementUsage === throttledIncrement) {
        delete window.incrementUsage;
      }
    };
  }, [incrementUsage]);

  // Memoized service click handler
  const handleServiceClick = useCallback(async (service) => {
    const currentUsage = usageCounts[service.key] || 0;
    const limit = usageLimits[service.key];
    const isRestricted = !isLoggedIn && limit !== undefined && currentUsage >= limit;

    if (isRestricted) {
      navigate("/login");
      return;
    }

    // For services with usage limits, increment usage when accessed
    if (!isLoggedIn && limit !== undefined) {
      incrementUsage(service.key);
    }

    navigate(service.path);
  }, [usageCounts, usageLimits, isLoggedIn, navigate, incrementUsage]);

  // Memoized service cards to prevent unnecessary re-renders
  const serviceCards = useMemo(() => {
    return services.map((service, i) => {
      const used = usageCounts[service.key] || 0;
      const limit = usageLimits[service.key];
      const isRestricted = !isLoggedIn && limit !== undefined && used >= limit;
      const remaining = limit !== undefined ? Math.max(0, limit - used) : null;

      return (
        <Col key={service.key}>
          <div className={`service-card text-center ${isRestricted ? 'restricted' : ''}`}>
            <div className={`icon-circle ${isRestricted ? 'restricted' : ''}`}>
              {service.icon}
            </div>
            <h5 className="fw-bold">{service.title}</h5>
            <p className="text-muted small">{service.desc}</p>
            {!isLoggedIn && limit !== undefined && (
              <p className={`usage-info ${remaining === 0 ? 'warning' : 'normal'}`}>
                {remaining > 0 
                  ? `${remaining} credit(s) remaining`
                  : 'No credits remaining'
                }
              </p>
            )}
            {isRestricted ? (
              <Button
                className="login-btn"
                onClick={() => navigate("/login")}
              >
                Login for More Credits →
              </Button>
            ) : (
              <Button
                className="explore-btn"
                onClick={() => handleServiceClick(service)}
              >
                {service.button} →
              </Button>
            )}
          </div>
        </Col>
      );
    });
  }, [services, usageCounts, usageLimits, isLoggedIn, handleServiceClick]);

  // Show loading state for better UX
  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .service-card {
          border-radius: 16px;
          background-color: #fff;
          box-shadow: 0 1px 8px rgba(0,0,0,0.05);
          padding: 25px;
          transition: all 0.2s ease;
          border: 1px solid #e2e8f0;
          height: 100%;
          will-change: transform, box-shadow;
        }
        .service-card:hover {
          box-shadow: 0 4px 16px rgba(0,0,0,0.1);
          transform: translateY(-2px);
        }
        .service-card.restricted {
          opacity: 0.7;
          border-color: #fecaca;
          background-color: #fef2f2;
        }
        .icon-circle {
          width: 56px;
          height: 56px;
          background-color: #ecfdf5;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 12px;
          color: #047857;
          transition: all 0.2s ease;
        }
        .icon-circle.restricted {
          background-color: #fee2e2;
          color: #dc2626;
        }
        .explore-btn {
          font-weight: 500;
          border-radius: 8px;
          padding: 6px 16px;
          background-color: #166534;
          border: none;
          transition: all 0.2s ease;
          will-change: transform, background-color;
        }
        .explore-btn:hover:not(:disabled) {
          background-color: #14532d;
          transform: translateY(-1px);
        }
        .login-btn {
          background-color: #dc2626 !important;
          color: #fff !important;
          cursor: pointer !important;
          border: none !important;
          font-weight: 500;
          border-radius: 8px;
          padding: 6px 16px;
          transition: all 0.2s ease;
          will-change: transform, background-color;
        }
        .login-btn:hover {
          background-color: #b91c1c !important;
          transform: translateY(-1px);
          color: #fff !important;
        }
        .explore-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .usage-info {
          font-size: 0.75rem;
          margin-bottom: 8px;
        }
        .usage-info.warning {
          color: #dc2626;
          font-weight: 500;
        }
        .usage-info.normal {
          color: #6b7280;
        }
        
        /* Performance optimizations */
        * {
          backface-visibility: hidden;
          perspective: 1000px;
        }
        
        .hero-section {
          will-change: auto;
        }
        
        /* Prevent layout thrashing */
        .container {
          contain: layout style;
        }
      `}</style>

      <NavigationBar />

      <section className="hero-section">
        <div className="container">
          <div className="row">
            <div className="col-md-7">
              <div className="hero-content">
                <div className="headline">
                  <h1><span className="enhancing">{typedText}</span></h1>
                  <h1><span className="healthcare">The Well-Being</span></h1>
                  <h1><span className="access">of Your Health</span></h1>
                </div>
                <p className="mission-text">
                  Experience peace of mind with our dedicated commitment to ensuring your optimal well-being.
                  Our comprehensive healthcare solutions provide 24/7 support, expert care, and personalized
                  treatment plans tailored to your unique needs.
                </p>
                <div className="cta-buttons">
                 <a href="mailto:team@medoraa.co.in">
  <button className="btn btn-dark contact-now">Contact Us</button>
</a>

                </div>
              </div>
            </div>
            <div className="col-md-5">
              <div className="heart-illustration">
                <img src="/heart.png" alt="Healthcare Professional" className="img-fluid" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container my-5">
        <h3 className="text-center mb-4">Our Services</h3>
        <Row xs={1} sm={2} md={3} className="g-4">
          {serviceCards}
        </Row>
      </section>
      <HealthCategories />
      <FaqSection />
      <Footer />
    </>
  );
};

export default LandingPage;
