import React, { useState } from "react";
import "../styles/FaqSection.css";
import { FaPlus, FaTimes } from "react-icons/fa";

const faqs = [
  {
    question: "How can I make an Appointment?",
    answer:
      "To make an appointment, simply contact our office by phone or use our online scheduling system. Choose your preferred date and time, and we'll confirm your appointment promptly.",
  },
  {
    question: "Are Consultants available 24 hours at Medoraa?",
    answer:
      "Our consultants are available during scheduled hours. However, emergency services are available 24/7.",
  },
  {
    question: "Can I get a weekend appointment? I’m unavailable during weekdays.",
    answer:
      "Yes, we offer weekend appointments. Availability may vary depending on the consultant.",
  },
  {
    question: "Does Medoraa Provide Emergency Services?",
    answer:
      "Yes, we offer 24/7 emergency services with on-call medical professionals available at all times.",
  },
  {
    question: "Can I reschedule or cancel my appointment?",
    answer:
      "Yes, appointments can be rescheduled or canceled at least 24 hours in advance via call or our patient portal.",
  },
  {
    question: "How can I access my medical records?",
    answer:
      "You can access your medical records by logging into your patient portal or contacting our records department.",
  },
];

const FaqSection = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  const toggleFaq = (index) => {
    setActiveIndex(index === activeIndex ? null : index);
  };

  return (
    <div className="faq-container">
      <div className="faq-left">
        <span className="faq-label">Our FAQS</span>
        <h2 className="faq-title">
          Questions? We’re Glad you <span className="faq-highlight">asked.</span>
        </h2>
        <p className="faq-subtitle">
          Quick answer to questions you have. Can’t find what you’re looking for?
        </p>
        <div className="faq-image-container">
              <img src="/images/faq.png" alt="FAQ Visual" className="faq-image" />
        </div>
      </div>

      <div className="faq-right">
        {faqs.map((faq, index) => (
          <div key={index} className="faq-item">
            <div className="faq-question" onClick={() => toggleFaq(index)}>
              {faq.question}
              <span className="faq-toggle-icon">
                {activeIndex === index ? <FaTimes /> : <FaPlus />}
              </span>
            </div>
            {activeIndex === index && (
              <div className="faq-answer">{faq.answer}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FaqSection;
