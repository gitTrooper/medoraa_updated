import React from 'react';

const TermsAndConditions = () => {
  const styles = {
    container: {
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
      '--dashboard-transition': '0.3s ease',
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6" style={{...styles.container, backgroundColor: 'var(--dashboard-light)', minHeight: '100vh'}}>
      <div className="mb-8 p-6" style={{
        backgroundColor: 'var(--dashboard-primary)',
        borderRadius: 'var(--dashboard-radius)',
        boxShadow: 'var(--dashboard-shadow)'
      }}>
        <h1 className="text-3xl font-bold mb-2" style={{color: 'white'}}>Terms and Conditions – Medoraa</h1>
        <p className="text-sm opacity-90" style={{color: 'white'}}>Last Updated: July 20, 2025</p>
      </div>

      <div className="prose max-w-none p-6" style={{
        backgroundColor: 'white',
        borderRadius: 'var(--dashboard-radius)',
        boxShadow: 'var(--dashboard-shadow)'
      }}>
        <div className="mb-6 p-4 border-l-4" style={{
          backgroundColor: '#f0f9f5', 
          borderColor: 'var(--dashboard-primary)',
          borderRadius: 'var(--dashboard-radius-sm)',
          border: `2px solid var(--dashboard-primary)`
        }}>
          <p style={{color: 'var(--dashboard-text)'}}>
            Welcome to Medoraa, a digital healthcare platform designed to make quality healthcare accessible and convenient for users, especially in Tier 2 and Tier 3 cities of India. By accessing or using Medoraa ("Platform", "we", "us", "our"), you ("User", "you", or "your") agree to comply with and be bound by the following terms and conditions ("Terms").
          </p>
          <p className="mt-2 font-medium" style={{color: 'var(--dashboard-primary)'}}>
            Please review these Terms carefully before using our services.
          </p>
        </div>

        <section className="mb-6 p-4" style={{
          backgroundColor: '#f8fffe',
          border: `1px solid var(--dashboard-primary)`,
          borderRadius: 'var(--dashboard-radius-sm)',
          borderLeft: `4px solid var(--dashboard-primary)`
        }}>
          <h2 className="text-xl font-semibold mb-3" style={{color: 'var(--dashboard-primary)'}}>1. Acceptance of Terms</h2>
          <p style={{color: 'var(--dashboard-text)'}}>
            By registering with or using Medoraa in any way (including visiting our website or using our mobile application), you agree to these Terms and any other policies referenced herein. If you do not agree to these Terms, you may not use the Platform.
          </p>
        </section>

        <section className="mb-6 p-4" style={{
          backgroundColor: '#f8fffe',
          border: `1px solid var(--dashboard-primary)`,
          borderRadius: 'var(--dashboard-radius-sm)',
          borderLeft: `4px solid var(--dashboard-primary)`
        }}>
          <h2 className="text-xl font-semibold mb-3" style={{color: 'var(--dashboard-primary)'}}>2. Eligibility</h2>
          <ul className="space-y-2" style={{color: 'var(--dashboard-text)'}}>
            <li>• Users must be at least 18 years old to register and use the services. Minors may use some features under guardian supervision.</li>
            <li>• Users agree to provide accurate information during registration and maintain updated, truthful records on the platform.</li>
          </ul>
        </section>

        <section className="mb-6 p-4" style={{
          backgroundColor: '#f8fffe',
          border: `1px solid var(--dashboard-primary)`,
          borderRadius: 'var(--dashboard-radius-sm)',
          borderLeft: `4px solid var(--dashboard-primary)`
        }}>
          <h2 className="text-xl font-semibold mb-3" style={{color: 'var(--dashboard-primary)'}}>3. Services Provided</h2>
          <p className="mb-3" style={{color: 'var(--dashboard-text)'}}>Medoraa offers access to:</p>
          <ul className="space-y-2" style={{color: 'var(--dashboard-text)'}}>
            <li>• Verified hospital and doctor listings by city and specialization</li>
            <li>• Instant online/offline appointment bookings</li>
            <li>• AI-powered chatbot for non-emergency medical queries</li>
            <li>• AI-based personalized diet plans and health report analysis</li>
            <li>• Patient profile management and medical history tracking</li>
            <li>• Ongoing integration of video consultations</li>
          </ul>
          <div className="mt-3 p-3 border" style={{
            backgroundColor: '#fffbeb', 
            borderColor: 'var(--dashboard-warning)',
            borderRadius: 'var(--dashboard-radius-sm)',
            border: `2px solid var(--dashboard-warning)`
          }}>
            <p className="text-sm font-medium" style={{color: '#92400e'}}>
              Note: Medoraa does not provide emergency medical services or guarantee availability of specific doctors/hospitals.
            </p>
          </div>
        </section>

        <section className="mb-6 p-4" style={{
          backgroundColor: '#f8fffe',
          border: `1px solid var(--dashboard-primary)`,
          borderRadius: 'var(--dashboard-radius-sm)',
          borderLeft: `4px solid var(--dashboard-primary)`
        }}>
          <h2 className="text-xl font-semibold mb-3" style={{color: 'var(--dashboard-primary)'}}>4. User Responsibilities</h2>
          <ul className="space-y-2" style={{color: 'var(--dashboard-text)'}}>
            <li>• You are responsible for maintaining the confidentiality of your account credentials.</li>
            <li>• You must only use Medoraa for lawful purposes and avoid any misuse of services for fraudulent or malicious intent.</li>
            <li>• All medical decisions should be made in consultation with a certified healthcare provider; Medoraa's AI tools offer informational guidance, not definitive diagnosis or treatment.</li>
          </ul>
        </section>

        <section className="mb-6 p-4" style={{
          backgroundColor: '#fef2f2',
          border: `2px solid var(--dashboard-danger)`,
          borderRadius: 'var(--dashboard-radius-sm)',
          borderLeft: `4px solid var(--dashboard-danger)`
        }}>
          <h2 className="text-xl font-semibold mb-3" style={{color: 'var(--dashboard-danger)'}}>5. AI Features and Limitations</h2>
          <div className="p-4" style={{
            backgroundColor: '#fee2e2', 
            borderColor: 'var(--dashboard-danger)',
            borderRadius: 'var(--dashboard-radius-sm)',
            border: `1px solid var(--dashboard-danger)`
          }}>
            <p style={{color: 'var(--dashboard-text)'}}>
              The Medoraa platform provides AI-generated diet plans, health report interpretations, and chatbot interactions. These features are for informational and support purposes only and do not replace professional medical advice.
            </p>
            <p className="mt-2 font-medium" style={{color: 'var(--dashboard-danger)'}}>
              Users should consult qualified medical professionals before making decisions based on AI recommendations on our platform.
            </p>
          </div>
        </section>

        {/* Sections 6-13 with green theme */}
        {[
          {
            title: "6. Appointments & Consultations",
            content: [
              "• Medoraa facilitates but does not guarantee or control the availability, appropriateness, or outcomes of appointments with doctors or hospitals.",
              "• All fees, rescheduling, and cancellations are subject to the policies of third-party providers (doctors/hospitals)."
            ]
          },
          {
            title: "7. Privacy and Data Security", 
            content: [
              "• User data is stored and processed securely using cloud infrastructure.",
              "• Please review our Privacy Policy for details on how user data is collected, used, and protected.",
              "• By using Medoraa, you consent to the collection and processing of your information as described in our Privacy Policy."
            ]
          },
          {
            title: "8. Intellectual Property",
            content: [
              "• All content, features, and software provided by Medoraa (excluding content provided by users or third parties) are owned by or licensed to Medoraa.",
              "• Users may not copy, distribute, or modify any part of the platform without prior written consent."
            ]
          },
          {
            title: "9. Restrictions",
            content: [
              "• Do not attempt to reverse engineer, hack, or disrupt the platform's functionality.",
              "• Automated data scraping, bulk registrations, or misuse of our AI features for unintended uses are strictly prohibited."
            ]
          },
          {
            title: "10. Limitation of Liability",
            content: [
              "• Medoraa is not liable for any medical decisions, adverse effects, or loss resulting from using our AI tools or services.",
              "• The platform is provided on an \"as-is\" basis, and we make no warranties regarding service accuracy, completeness, or uninterrupted access."
            ]
          }
        ].map((section, index) => (
          <section key={index} className="mb-6 p-4" style={{
            backgroundColor: '#f8fffe',
            border: `1px solid var(--dashboard-primary)`,
            borderRadius: 'var(--dashboard-radius-sm)',
            borderLeft: `4px solid var(--dashboard-primary)`
          }}>
            <h2 className="text-xl font-semibold mb-3" style={{color: 'var(--dashboard-primary)'}}>{section.title}</h2>
            <ul className="space-y-2" style={{color: 'var(--dashboard-text)'}}>
              {section.content.map((item, itemIndex) => (
                <li key={itemIndex}>{item}</li>
              ))}
            </ul>
          </section>
        ))}

        <section className="mb-6 p-4" style={{
          backgroundColor: '#f8fffe',
          border: `1px solid var(--dashboard-primary)`,
          borderRadius: 'var(--dashboard-radius-sm)',
          borderLeft: `4px solid var(--dashboard-primary)`
        }}>
          <h2 className="text-xl font-semibold mb-3" style={{color: 'var(--dashboard-primary)'}}>11. Changes to Terms</h2>
          <p style={{color: 'var(--dashboard-text)'}}>
            We may modify these Terms from time to time. We will notify users of major changes through the platform or via registered email. Continued use after changes constitutes acceptance of the new Terms.
          </p>
        </section>

        <section className="mb-6 p-4" style={{
          backgroundColor: '#f8fffe',
          border: `1px solid var(--dashboard-primary)`,
          borderRadius: 'var(--dashboard-radius-sm)',
          borderLeft: `4px solid var(--dashboard-primary)`
        }}>
          <h2 className="text-xl font-semibold mb-3" style={{color: 'var(--dashboard-primary)'}}>12. Governing Law</h2>
          <p style={{color: 'var(--dashboard-text)'}}>
            These Terms are governed by the laws of India. Any disputes arising from these Terms or use of the Platform will be subject to the exclusive jurisdiction of the courts in India.
          </p>
        </section>

        <section className="mb-6 p-4" style={{
          backgroundColor: 'var(--dashboard-primary)',
          borderRadius: 'var(--dashboard-radius-sm)',
          boxShadow: 'var(--dashboard-shadow)'
        }}>
          <h2 className="text-xl font-semibold mb-3" style={{color: 'white'}}>13. Contact Us</h2>
          <p className="mb-2" style={{color: 'white'}}>
            For any questions, concerns, or feedback regarding these Terms, please contact us at:
          </p>
          <div className="p-3 border" style={{
            backgroundColor: 'rgba(255, 255, 255, 0.1)', 
            borderColor: 'rgba(255, 255, 255, 0.2)',
            borderRadius: 'var(--dashboard-radius-sm)'
          }}>
            <p style={{color: 'white'}}>
              <strong>Email:</strong> <a href="mailto:team@medora.co.in" className="underline transition-colors duration-300" style={{
                color: 'white',
                transition: 'var(--dashboard-transition)',
                textDecoration: 'underline'
              }} onMouseEnter={(e) => e.target.style.opacity = '0.8'} 
              onMouseLeave={(e) => e.target.style.opacity = '1'}>team@medora.co.in</a>
            </p>
          </div>
        </section>

        <div className="mt-8 p-6" style={{
          backgroundColor: 'var(--dashboard-dark)', 
          borderRadius: 'var(--dashboard-radius)',
          boxShadow: 'var(--dashboard-shadow)',
          textAlign: 'center'
        }}>
          <p className="text-sm" style={{color: 'white', opacity: 0.9}}>
            By using Medoraa, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditions;