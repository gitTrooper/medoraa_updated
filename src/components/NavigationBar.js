// src/components/NavigationBar.js
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import { useAuth } from '../contexts/AuthContext';
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import "../styles/NavigationBar.css";

// Cache for localStorage operations (same as LandingPage)
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

const NavigationBar = () => {
  const { currentUser, loadingAuth } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [usageCounts, setUsageCounts] = useState({});
  const navigate = useNavigate();
  const location = useLocation();
  const db = getFirestore();

  // Usage limits (same as LandingPage)
  const usageLimits = useMemo(() => ({
    chatbot: 3,
    reportAnalysis: 3,
    dietPlan: 2,
  }), []);

  // Firebase queue refs
  const firebaseQueueRef = React.useRef([]);
  const processingFirebaseRef = React.useRef(false);

  // Get or create visitor ID
  const getOrCreateVisitorId = useCallback(() => {
    let id = optimizedStorage.get("visitorId");
    if (!id) {
      id = uuidv4();
      optimizedStorage.set("visitorId", id);
    }
    return id;
  }, []);

  // Initialize daily usage
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

  // Process Firebase queue
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

  // Increment usage function
  const incrementUsage = useCallback(async (key) => {
    // Immediate UI update for better UX
    setUsageCounts(prev => {
      const newCounts = { ...prev, [key]: (prev[key] || 0) + 1 };
      // Update localStorage
      optimizedStorage.set("usageCounts", JSON.stringify(newCounts));
      return newCounts;
    });

    // Queue Firebase operation for non-logged users
    if (!currentUser) {
      firebaseQueueRef.current.push({ key });
      debouncedFirebaseProcess();
    }
  }, [currentUser, debouncedFirebaseProcess]);

  // Initialize usage counts on component mount
  useEffect(() => {
    const counts = initDailyUsage();
    setUsageCounts(counts);
  }, [initDailyUsage]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownOpen && !event.target.closest('.user-dropdown')) {
        setDropdownOpen(false);
      }
      if (mobileMenuOpen && !event.target.closest('.navbar')) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen, mobileMenuOpen]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log("Explicit logout from Navbar successful.");
      setDropdownOpen(false);
      setMobileMenuOpen(false);
      // Clear any stored redirect paths
      if (typeof Storage !== 'undefined') {
        sessionStorage.removeItem('redirectAfterLogin');
      }
      navigate('/');
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  const handleMobileMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleLinkClick = () => {
    setMobileMenuOpen(false);
    setDropdownOpen(false);
  };

  // Map routes to service keys
  const routeToServiceKey = {
    '/chatbot': 'chatbot',
    '/report-analysis': 'reportAnalysis',
    '/diet-plan': 'dietPlan'
  };

  // Handle protected route clicks with counter logic
  const handleProtectedLinkClick = useCallback((e, path) => {
    e.preventDefault();
    handleLinkClick(); // Close mobile menu and dropdown
    
    if (!currentUser) {
      // Check if this route has usage limits
      const serviceKey = routeToServiceKey[path];
      
      if (serviceKey && usageLimits[serviceKey] !== undefined) {
        const currentUsage = usageCounts[serviceKey] || 0;
        const limit = usageLimits[serviceKey];
        
        // If user has exceeded limit, redirect to login
        if (currentUsage >= limit) {
          if (typeof Storage !== 'undefined') {
            sessionStorage.setItem('redirectAfterLogin', path);
          }
          navigate('/login', { 
            state: { from: location.pathname },
            replace: false 
          });
          return;
        }
        
        // Increment usage before navigation
        incrementUsage(serviceKey);
      }
      
      // For routes without limits or within limits, navigate directly
      navigate(path);
    } else {
      // User is logged in, navigate directly
      navigate(path);
    }
  }, [currentUser, routeToServiceKey, usageLimits, usageCounts, incrementUsage, navigate, location.pathname]);

  // Handle regular protected routes (no counter needed)
  const handleRegularProtectedLink = (e, path) => {
    e.preventDefault();
    handleLinkClick(); // Close mobile menu and dropdown
    
    if (!currentUser) {
      // Store the intended destination (but check if user is truly not authenticated)
      if (!loadingAuth) {
        if (typeof Storage !== 'undefined') {
          sessionStorage.setItem('redirectAfterLogin', path);
        }
        navigate('/login', { 
          state: { from: location.pathname },
          replace: false 
        });
      }
    } else {
      navigate(path);
    }
  };

  // Show a basic loading state for the navigation bar
  if (loadingAuth) {
    return (
      <nav className="navbar navbar-expand-lg fixed-navbar">
        <div className="container-fluid">
          <div className="navbar-brand">
            <span className="logo-text">Medoraa</span>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="navbar navbar-expand-lg fixed-navbar">
      <div className="container-fluid">
        {/* Brand Section - Text Only */}
        <Link to="/" className="navbar-brand" style={{ textDecoration: 'none' }}>
          <span className="logo-text">Medoraa</span>
        </Link>
        
        {/* Modern Mobile Toggle Button */}
        <button
          className="navbar-toggler"
          type="button"
          onClick={handleMobileMenuToggle}
          aria-controls="navbarNav"
          aria-expanded={mobileMenuOpen}
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        
        {/* Collapsible Content */}
        <div className={`navbar-collapse ${mobileMenuOpen ? 'show' : ''}`} id="navbarNav">
          {/* Navigation Links - Center */}
          <ul className="navbar-nav mx-auto">
            <li className="nav-item">
              <Link 
                className="nav-link" 
                to="/chatbot" 
                onClick={(e) => handleProtectedLinkClick(e, '/chatbot')}
              >
                AI Chatbot
              </Link>
            </li>
            <li className="nav-item">
              <Link 
                className="nav-link" 
                to="/report-analysis" 
                onClick={(e) => handleProtectedLinkClick(e, '/report-analysis')}
              >
                Report Analysis
              </Link>
            </li>
            <li className="nav-item">
              <Link 
                className="nav-link" 
                to="/hospital-locator" 
                onClick={(e) => handleRegularProtectedLink(e, '/hospital-locator')}
              >
                Hospital Locator
              </Link>
            </li>
            <li className="nav-item">
              <Link 
                className="nav-link" 
                to="/diet-plan" 
                onClick={(e) => handleProtectedLinkClick(e, '/diet-plan')}
              >
                Diet Plan Generator
              </Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/aboutus" onClick={handleLinkClick}>
                About Us
              </Link>
            </li>
          </ul>

          {/* Buttons Section */}
          <div className="navbar-buttons">
            {!currentUser ? (
              <>
                <Link to="/login" className="get-started-btn" onClick={handleLinkClick}>
                  Login/Sign Up
                </Link>
                <Link to="/admin-login" className="sign-up-btn" onClick={handleLinkClick}>
                  Administrator
                </Link>
              </>
            ) : (
              <div className="user-dropdown">
                <button
                  className="user-btn"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                  <img
                    src={currentUser.photoURL || "https://cdn-icons-png.flaticon.com/512/847/847969.png"}
                    alt="User Avatar"
                    className="user-icon"
                    onError={(e) => {
                      e.target.src = "https://cdn-icons-png.flaticon.com/512/847/847969.png";
                    }}
                  />
                  <span className="user-name">
                    {currentUser.displayName || currentUser.email?.split('@')[0] || 'User'}
                  </span>
                </button>
                {dropdownOpen && (
                  <ul className="dropdown-menu show">
                    <li>
                      <Link to="/profile" className="dropdown-item" onClick={handleLinkClick}>
                        Profile
                      </Link>
                    </li>
                    <li>
                      <button className="dropdown-item" onClick={handleLogout}>
                        Logout
                      </button>
                    </li>
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default NavigationBar;
