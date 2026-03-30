import React, { useState, useEffect } from 'react';
import { MessageCircle, FileBarChart, MapPin, Utensils, Calendar, Users, Target, Lightbulb } from 'lucide-react';

const AboutUsPage = () => {
  const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => {
    const loadLogo = async () => {
      try {
        // Try different possible file extensions and paths
        const possiblePaths = [
          'images/webLogo',
          'images/webLogo.png',
          'images/webLogo.jpg',
          'images/webLogo.jpeg',
          'images/webLogo.svg',
          'webLogo',
          'webLogo.png',
          'webLogo.jpg',
          'webLogo.jpeg',
          'webLogo.svg'
        ];

        for (const path of possiblePaths) {
          try {
            const logoData = await window.fs.readFile(path);
            const extension = path.split('.').pop()?.toLowerCase();
            let mimeType = 'image/png'; // default
            
            if (extension === 'jpg' || extension === 'jpeg') {
              mimeType = 'image/jpeg';
            } else if (extension === 'svg') {
              mimeType = 'image/svg+xml';
            } else if (extension === 'png') {
              mimeType = 'image/png';
            }

            const blob = new Blob([logoData], { type: mimeType });
            const url = URL.createObjectURL(blob);
            setLogoUrl(url);
            console.log(`Logo loaded successfully from: ${path}`);
            return;
          } catch (pathError) {
            continue; // Try next path
          }
        }
        
        console.log('Logo not found in any expected location, using placeholder');
      } catch (error) {
        console.log('Error loading logo:', error);
      }
    };
    
    loadLogo();
    
    return () => {
      if (logoUrl) {
        URL.revokeObjectURL(logoUrl);
      }
    };
  }, []);
  const features = [
    {
      icon: <MessageCircle className="mb-3" size={48} />,
      title: "AI Chatbot",
      description: "Intelligent healthcare assistant providing 24/7 support, answering medical queries, and guiding users through their healthcare journey with personalized responses."
    },
    {
      icon: <FileBarChart className="mb-3" size={48} />,
      title: "Report Analysis",
      description: "Advanced AI-powered analysis of medical reports, providing clear insights and explanations to help users understand their health data better."
    },
    {
      icon: <MapPin className="mb-3" size={48} />,
      title: "Hospital Locator",
      description: "Find nearby healthcare facilities with real-time information, ratings, and directions to ensure you get the right care at the right place."
    },
    {
      icon: <Utensils className="mb-3" size={48} />,
      title: "Diet Plan Generator",
      description: "Personalized nutrition plans based on your health goals, dietary preferences, and medical conditions, created by our intelligent system."
    },
    {
      icon: <Calendar className="mb-3" size={48} />,
      title: "Appointment Booking",
      description: "Seamless appointment scheduling with healthcare providers, integrated calendar management, and automated reminders for your convenience."
    }
  ];

  const stats = [
    { number: "10K+", label: "Active Users" },
    { number: "500+", label: "Healthcare Providers" },
    { number: "95%", label: "User Satisfaction" },
    { number: "24/7", label: "Support Available" }
  ];

  return (
    <div style={{
      '--dashboard-primary': '#2c5f41',
      '--dashboard-secondary': '#2c5f41',
      '--dashboard-light': '#e8f5f5',
      '--dashboard-dark': '#145252',
      '--dashboard-text': '#1a2e2e',
      '--dashboard-text-muted': '#6b7280',
      '--dashboard-warning': '#ffa726',
      '--dashboard-danger': '#ef4444',
      '--dashboard-shadow': 'rgba(26, 95, 95, 0.15)',
      '--dashboard-shadow-light': 'rgba(26, 95, 95, 0.08)',
      '--dashboard-radius': '20px',
      '--dashboard-radius-sm': '12px',
      '--dashboard-transition': '0.3s ease'
    }}>
      <style>{`
        .hero-section {
          background: linear-gradient(135deg, var(--dashboard-primary) 0%, var(--dashboard-dark) 100%);
          color: white;
          padding: 40px 0; /* Reduced from original padding */
          position: relative;
          overflow: hidden;
          min-height: auto; /* Remove any min-height constraints */
        }

        .hero-section::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: url('/images/weblogo.png') no-repeat center center;
          background-size: cover;
          opacity: 0.3;
        }

        .hero-content {
          transform: translateY(0); /* Removed negative transform */
        }

        .hero-content h1 {
          font-size: 2.5rem; /* Slightly smaller heading */
          margin-bottom: 1rem; /* Reduced margin */
        }

        .hero-content .lead {
          font-size: 1.1rem; /* Slightly smaller lead text */
          margin-bottom: 1.5rem; /* Reduced margin */
        }

        .feature-card {
          background: white;
          border-radius: var(--dashboard-radius);
          padding: 2rem;
          height: 100%;
          transition: var(--dashboard-transition);
          border: none;
          box-shadow: var(--dashboard-shadow-light);
        }

        .feature-card:hover {
          transform: translateY(-10px);
          box-shadow: var(--dashboard-shadow);
        }

        .feature-card .lucide {
          color: var(--dashboard-primary);
        }

        .stats-card {
          background: var(--dashboard-light);
          border-radius: var(--dashboard-radius-sm);
          padding: 2rem;
          text-align: center;
          border: none;
        }

        .stats-number {
          font-size: 2.5rem;
          font-weight: 700;
          color: var(--dashboard-primary);
          margin-bottom: 0.5rem;
        }

        .section-title {
          color: var(--dashboard-text);
          font-weight: 600;
          margin-bottom: 3rem;
          position: relative;
        }

        .section-title::after {
          content: '';
          position: absolute;
          bottom: -10px;
          left: 50%;
          transform: translateX(-50%);
          width: 60px;
          height: 4px;
          background: var(--dashboard-primary);
          border-radius: 2px;
        }

        .logo-container {
          background: rgba(255, 255, 255, 0.1);
          border-radius: var(--dashboard-radius-sm);
          padding: 1rem;
          display: inline-block;
          margin-bottom: 1rem;
        }

        .mission-card {
          background: var(--dashboard-light);
          border-radius: var(--dashboard-radius);
          padding: 3rem;
          margin: 2rem 0;
        }

        .value-item {
          display: flex;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .value-icon {
          background: var(--dashboard-primary);
          color: white;
          border-radius: 50%;
          width: 50px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 1rem;
        }

        @media (max-width: 768px) {
          .hero-section {
            padding: 30px 0; /* Even more compact on mobile */
          }
          
          .hero-content h1 {
            font-size: 2rem; /* Smaller on mobile */
          }
          
          .hero-content .lead {
            font-size: 1rem;
          }
          
          .feature-card {
            margin-bottom: 2rem;
          }
          
          .stats-card {
            margin-bottom: 1rem;
          }
        }

        @media (max-width: 576px) {
          .hero-section {
            padding: 20px 0; /* Very compact on small screens */
          }
          
          .hero-content h1 {
            font-size: 1.75rem;
          }
        }
      `}</style>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="container position-relative">
          <div className="row align-items-center">
            <div className="col-lg-8 mx-auto text-center hero-content">
              <h1 className="fw-bold mb-3">Revolutionizing Healthcare Access</h1>
              <p className="lead mb-3">
                Empowering individuals with intelligent healthcare solutions through cutting-edge technology, 
                personalized care, and seamless digital experiences that put your health first.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-5">
        <div className="container">
          <div className="mission-card">
            <div className="row">
              <div className="col-lg-6">
                <h2 className="h3 mb-4" style={{ color: 'var(--dashboard-primary)' }}>Our Mission</h2>
                <p className="mb-4" style={{ color: 'var(--dashboard-text)' }}>
                  To democratize healthcare access by leveraging artificial intelligence and modern technology, 
                  making quality healthcare information, services, and support available to everyone, anywhere, anytime.
                </p>
                <p style={{ color: 'var(--dashboard-text-muted)' }}>
                  We believe that healthcare should be accessible, understandable, and personalized for every individual's unique needs.
                </p>
              </div>
              <div className="col-lg-6">
                <h2 className="h3 mb-4" style={{ color: 'var(--dashboard-primary)' }}>Our Values</h2>
                <div className="value-item">
                  <div className="value-icon">
                    <Users size={24} />
                  </div>
                  <div>
                    <strong style={{ color: 'var(--dashboard-text)' }}>Patient-Centered Care</strong>
                    <p className="mb-0 small" style={{ color: 'var(--dashboard-text-muted)' }}>
                      Every decision we make prioritizes patient wellbeing and experience
                    </p>
                  </div>
                </div>
                <div className="value-item">
                  <div className="value-icon">
                    <Target size={24} />
                  </div>
                  <div>
                    <strong style={{ color: 'var(--dashboard-text)' }}>Accessibility</strong>
                    <p className="mb-0 small" style={{ color: 'var(--dashboard-text-muted)' }}>
                      Breaking down barriers to healthcare access for all communities
                    </p>
                  </div>
                </div>
                <div className="value-item">
                  <div className="value-icon">
                    <Lightbulb size={24} />
                  </div>
                  <div>
                    <strong style={{ color: 'var(--dashboard-text)' }}>Innovation</strong>
                    <p className="mb-0 small" style={{ color: 'var(--dashboard-text-muted)' }}>
                      Continuously evolving with the latest technology and medical insights
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-5" style={{ background: 'var(--dashboard-light)' }}>
        <div className="container">
          <div className="row">
            <div className="col-12 text-center mb-5">
              <h2 className="section-title">Our Comprehensive Features</h2>
              <p className="lead" style={{ color: 'var(--dashboard-text-muted)' }}>
                Discover how our integrated platform transforms your healthcare journey
              </p>
            </div>
          </div>
          <div className="row g-4">
            {features.map((feature, index) => (
              <div key={index} className="col-lg-4 col-md-6">
                <div className="feature-card">
                  <div className="text-center">
                    {feature.icon}
                    <h4 className="mb-3" style={{ color: 'var(--dashboard-text)' }}>
                      {feature.title}
                    </h4>
                    <p style={{ color: 'var(--dashboard-text-muted)' }}>
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technology Section */}
      <section className="py-5" style={{ background: 'var(--dashboard-light)' }}>
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-6">
              <h2 className="section-title text-start">Built with Cutting-Edge Technology</h2>
              <p className="mb-4" style={{ color: 'var(--dashboard-text)' }}>
                Our platform leverages the latest advancements in artificial intelligence, machine learning, 
                and cloud computing to deliver reliable, secure, and scalable healthcare solutions.
              </p>
              <div className="row g-3">
                <div className="col-6">
                  <div className="d-flex align-items-center p-3 rounded" style={{ background: 'white' }}>
                    <div className="me-3" style={{ color: 'var(--dashboard-primary)' }}>
                      <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                      </svg>
                    </div>
                    <small><strong>AI & ML</strong></small>
                  </div>
                </div>
                <div className="col-6">
                  <div className="d-flex align-items-center p-3 rounded" style={{ background: 'white' }}>
                    <div className="me-3" style={{ color: 'var(--dashboard-primary)' }}>
                      <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.5 5.5C19.43 5.5 21 7.07 21 9V18C21 19.93 19.43 21.5 17.5 21.5H6.5C4.57 21.5 3 19.93 3 18V9C3 7.07 4.57 5.5 6.5 5.5H17.5ZM12 7C8.69 7 6 9.69 6 13S8.69 19 12 19 18 16.31 18 13 15.31 7 12 7Z"/>
                      </svg>
                    </div>
                    <small><strong>Cloud Security</strong></small>
                  </div>
                </div>
                <div className="col-6">
                  <div className="d-flex align-items-center p-3 rounded" style={{ background: 'white' }}>
                    <div className="me-3" style={{ color: 'var(--dashboard-primary)' }}>
                      <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2L13.09 6.26L18 7L13.09 7.74L12 12L10.91 7.74L6 7L10.91 6.26L12 2ZM4 14L5.5 16.5L8 18L5.5 19.5L4 22L2.5 19.5L0 18L2.5 16.5L4 14Z"/>
                      </svg>
                    </div>
                    <small><strong>Real-time Analytics</strong></small>
                  </div>
                </div>
                <div className="col-6">
                  <div className="d-flex align-items-center p-3 rounded" style={{ background: 'white' }}>
                    <div className="me-3" style={{ color: 'var(--dashboard-primary)' }}>
                      <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 4V2H9V4L3 7V9H5V20C5 21.1 5.9 22 7 22H17C18.1 22 19 21.1 19 20V9H21Z"/>
                      </svg>
                    </div>
                    <small><strong>Mobile-First</strong></small>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="p-5 text-center" style={{ 
                background: 'white', 
                borderRadius: 'var(--dashboard-radius)',
                boxShadow: 'var(--dashboard-shadow)'
              }}>
                <div style={{
                  width: '120px',
                  height: '120px',
                  background: 'linear-gradient(135deg, var(--dashboard-primary), var(--dashboard-dark))',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 2rem',
                  color: 'white',
                  fontSize: '3rem'
                }}>
                  🏥
                </div>
                <h4 style={{ color: 'var(--dashboard-text)' }}>Healthcare Innovation</h4>
                <p style={{ color: 'var(--dashboard-text-muted)' }}>
                  Combining medical expertise with technological advancement to create solutions that matter.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-5" style={{ 
        background: 'linear-gradient(135deg, var(--dashboard-primary) 0%, var(--dashboard-dark) 100%)',
        color: 'white'
      }}>
        <div className="container">
          <div className="row">
            <div className="col-lg-8 mx-auto text-center">
              <h2 className="mb-4">Ready to Transform Your Healthcare Experience?</h2>
              <p className="lead mb-4">
                Join thousands of users who have already discovered the power of intelligent healthcare solutions.
              </p>
              <button 
                className="btn btn-light btn-lg px-5 py-3 rounded-pill me-3 mb-3"
                style={{ 
                  color: 'var(--dashboard-primary)',
                  fontWeight: '600',
                  transition: 'var(--dashboard-transition)'
                }}
                onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
              >
                Get Started Today
              </button>
              
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutUsPage;
