import React, { useState, useRef, useEffect } from "react";
import NavigationBar from './NavigationBar';
import { auth, db } from '../firebase'; // Adjust path as needed
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const Chatbot = () => {
  let [messages, setMessages] = useState([
    {
      sender: "bot",
      text: "Hello! I'm your Medoraa AI Health Assistant. How can I help you with your health concerns today?",
      timestamp: new Date().toISOString()
    }
  ]);
  let [userInput, setUserInput] = useState("");
  let [isLoading, setIsLoading] = useState(false);
  let [isLoadingProfile, setIsLoadingProfile] = useState(true);
  let chatboxRef = useRef(null);
  let [medicalProfile, setMedicalProfile] = useState(null);
  let [userHealthProfile, setUserHealthProfile] = useState("");
  let [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  let [currentUser, setCurrentUser] = useState(null);
  
  // Function to get current authenticated user
  let getCurrentUser = () => {
    return auth.currentUser;
  };

  // Function to load user's medical profile from Firebase
  let loadUserMedicalProfile = async (user) => {
    try {
      setIsLoadingProfile(true);
      
      if (!user) {
        console.log("No authenticated user found");
        setMedicalProfile(false);
        setUserHealthProfile("No medical profile available. Please log in to access personalized assistance.");
        return;
      }

      console.log("Loading medical profile for user:", user.uid);

      // Get user's medical profile from Firestore
      const medicalProfileRef = doc(db, "users", user.uid, "medicalData", "medical profile");
      const profileDoc = await getDoc(medicalProfileRef);

      if (!profileDoc.exists()) {
        console.log("No medical profile found for user");
        setMedicalProfile(false);
        setUserHealthProfile("No medical profile available. Please complete your health profile for personalized assistance.");
        return;
      }

      const profileData = profileDoc.data();
      console.log("Medical profile data:", profileData);
      
      if (profileData && Object.keys(profileData).length > 0) {
        // Format the profile data for the medical API
        let formattedProfile = formatMedicalProfile(profileData);
        setUserHealthProfile(formattedProfile);
        setMedicalProfile(true);
        console.log("Medical profile loaded successfully");
      } else {
        setMedicalProfile(false);
        setUserHealthProfile("Medical profile is empty. Please complete your health profile for personalized assistance.");
      }

    } catch (error) {
      console.error('Error loading medical profile:', error);
      setMedicalProfile(false);
      
      // More specific error messages
      if (error.code === 'permission-denied') {
        setUserHealthProfile("Access denied. Please check your permissions and try again.");
      } else if (error.code === 'unavailable') {
        setUserHealthProfile("Service temporarily unavailable. Please try again later.");
      } else {
        setUserHealthProfile("Unable to load medical profile. Please check your connection and try again.");
      }
    } finally {
      setIsLoadingProfile(false);
    }
  };

  // Function to format profile data for the medical API
  let formatMedicalProfile = (profileData) => {
    let profile = [];
    
    // Helper function to check if field has meaningful value
    const hasValue = (value) => {
      return value && value.trim && value.trim() !== "" && value !== "null" && value !== null;
    };
    
    // Basic demographics
    if (hasValue(profileData.age)) profile.push(`Age: ${profileData.age}`);
    if (hasValue(profileData.gender)) profile.push(`Gender: ${profileData.gender}`);
    if (hasValue(profileData.height)) profile.push(`Height: ${profileData.height}`);
    if (hasValue(profileData.weight)) profile.push(`Weight: ${profileData.weight}`);
    if (hasValue(profileData.ethnicity)) profile.push(`Ethnicity: ${profileData.ethnicity}`);
    if (hasValue(profileData.geographicalLocation)) profile.push(`Location: ${profileData.geographicalLocation}`);
    
    // Medical conditions
    if (hasValue(profileData.diabetes)) profile.push(`Diabetes: ${profileData.diabetes}`);
    if (hasValue(profileData.hypertension)) profile.push(`Hypertension: ${profileData.hypertension}`);
    if (hasValue(profileData.cardiovascularDisease)) profile.push(`Cardiovascular Disease: ${profileData.cardiovascularDisease}`);
    if (hasValue(profileData.asthma)) profile.push(`Asthma: ${profileData.asthma}`);
    if (hasValue(profileData.thyroidProblems)) profile.push(`Thyroid Problems: ${profileData.thyroidProblems}`);
    if (hasValue(profileData.liverKidneyConditions)) profile.push(`Liver/Kidney Conditions: ${profileData.liverKidneyConditions}`);
    if (hasValue(profileData.mentalHealthIssues)) profile.push(`Mental Health Issues: ${profileData.mentalHealthIssues}`);
    if (hasValue(profileData.chronicInfections)) profile.push(`Chronic Infections: ${profileData.chronicInfections}`);
    
    // Medical history
    if (hasValue(profileData.pastIllnesses)) profile.push(`Past Illnesses: ${profileData.pastIllnesses}`);
    if (hasValue(profileData.majorSurgeries)) profile.push(`Major Surgeries: ${profileData.majorSurgeries}`);
    if (hasValue(profileData.hospitalizations)) profile.push(`Hospitalizations: ${profileData.hospitalizations}`);
    if (hasValue(profileData.familyHistory)) profile.push(`Family History: ${profileData.familyHistory}`);
    
    // Current medications and allergies
    if (hasValue(profileData.currentMedications)) profile.push(`Current Medications: ${profileData.currentMedications}`);
    if (hasValue(profileData.otcSupplements)) profile.push(`OTC Supplements: ${profileData.otcSupplements}`);
    if (hasValue(profileData.allergies)) profile.push(`Allergies: ${profileData.allergies}`);
    if (hasValue(profileData.knownDrugAllergies)) profile.push(`Drug Allergies: ${profileData.knownDrugAllergies}`);
    
    // Lifestyle factors
    if (hasValue(profileData.smokingStatus)) profile.push(`Smoking Status: ${profileData.smokingStatus}`);
    if (hasValue(profileData.alcoholConsumption)) profile.push(`Alcohol Consumption: ${profileData.alcoholConsumption}`);
    if (hasValue(profileData.exerciseFrequency)) profile.push(`Exercise Frequency: ${profileData.exerciseFrequency}`);
    if (hasValue(profileData.dietaryHabits)) profile.push(`Dietary Habits: ${profileData.dietaryHabits}`);
    if (hasValue(profileData.sleepPattern)) profile.push(`Sleep Pattern: ${profileData.sleepPattern}`);
    
    // Recent changes
    if (hasValue(profileData.recentChanges)) profile.push(`Recent Changes: ${profileData.recentChanges}`);
    
    return profile.length > 0 ? profile.join('\n') : "No detailed medical profile available.";
  };

  // Set up authentication listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("Auth state changed:", user ? user.uid : "No user");
      setCurrentUser(user);
      
      if (user) {
        // User is signed in, load their medical profile
        loadUserMedicalProfile(user);
      } else {
        // User is signed out
        setIsLoadingProfile(false);
        setMedicalProfile(false);
        setUserHealthProfile("No medical profile available. Please log in to access personalized assistance.");
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // Function to refresh profile (call this when user updates their profile)
  let refreshUserProfile = async () => {
    const user = getCurrentUser();
    if (user) {
      await loadUserMedicalProfile(user);
    } else {
      console.log("No authenticated user to refresh profile");
      setMedicalProfile(false);
      setUserHealthProfile("Please log in to access your medical profile.");
    }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    if (chatboxRef.current) {
      chatboxRef.current.scrollTop = chatboxRef.current.scrollHeight;
    }
  }, [messages]);

  // Enhanced message formatting function with improved medical response structure
  let formatBotMessage = (text) => {
    if (!text || typeof text !== 'string') return text;
    
    // Clean up the text first
    let cleanText = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/#+\s*(.*)/g, '<strong>$1</strong>')
      .trim();

    // Enhanced section detection for medical responses
    let sections = [];
    let currentSection = '';
    let currentType = 'paragraph';
    
    let lines = cleanText.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      
      if (!line) {
        if (currentSection.trim()) {
          sections.push({ type: currentType, content: currentSection.trim() });
          currentSection = '';
          currentType = 'paragraph';
        }
        continue;
      }
      
      // Enhanced header detection for medical terms
      if (line.match(/^(symptoms?|causes?|treatment|recommendations?|diagnosis|prevention|when to see|important|note|warning|disclaimer|overview|summary|conclusion|prognosis|complications|risk factors?|differential diagnosis|management|follow[- ]?up|medication|dosage|side effects?|contraindications?|precautions?|clarifying questions?):/i)) {
        if (currentSection.trim()) {
          sections.push({ type: currentType, content: currentSection.trim() });
        }
        sections.push({ type: 'medical-header', content: line });
        currentSection = '';
        currentType = 'paragraph';
      }
      // Detect numbered medical lists
      else if (line.match(/^\d+[\.)]\s/)) {
        if (currentSection.trim() && currentType !== 'numbered-list') {
          sections.push({ type: currentType, content: currentSection.trim() });
          currentSection = '';
        }
        currentType = 'numbered-list';
        currentSection += line + '\n';
      }
      // Detect bullet points with various markers
      else if (line.match(/^[-•*▪▫◦‣⁃]\s/)) {
        if (currentSection.trim() && currentType !== 'bullet-list') {
          sections.push({ type: currentType, content: currentSection.trim() });
          currentSection = '';
        }
        currentType = 'bullet-list';
        currentSection += line + '\n';
      }
      // Detect emergency/warning markers
      else if (line.match(/^(⚠️|🚨|❗|URGENT|EMERGENCY|WARNING|CRITICAL)/i)) {
        if (currentSection.trim()) {
          sections.push({ type: currentType, content: currentSection.trim() });
        }
        sections.push({ type: 'warning', content: line });
        currentSection = '';
        currentType = 'paragraph';
      }
      // Detect medical quotes or important notes
      else if (line.match(/^[""].*[""]$/) || line.match(/^Note:/i) || line.match(/^Important:/i)) {
        if (currentSection.trim()) {
          sections.push({ type: currentType, content: currentSection.trim() });
        }
        sections.push({ type: 'highlight', content: line });
        currentSection = '';
        currentType = 'paragraph';
      }
      // Regular text
      else {
        if (currentType === 'numbered-list' || currentType === 'bullet-list') {
          // Continue with list if it's a continuation line
          if (line.match(/^\s/) || !line.match(/^[a-zA-Z]/)) {
            currentSection += line + '\n';
            continue;
          } else {
            // End list and start new paragraph
            sections.push({ type: currentType, content: currentSection.trim() });
            currentSection = '';
            currentType = 'paragraph';
          }
        }
        currentSection += (currentSection ? ' ' : '') + line;
      }
    }
    
    // Add remaining content
    if (currentSection.trim()) {
      sections.push({ type: currentType, content: currentSection.trim() });
    }
    
    return sections.length > 0 ? sections : [{ type: 'paragraph', content: cleanText }];
  };

  // Enhanced render function with improved medical styling
  let renderFormattedMessage = (sections) => {
    return sections.map((section, index) => {
      switch (section.type) {
        case 'medical-header':
          return (
            <div key={index} style={styles.medicalHeader}>
              <div style={styles.headerIcon}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>
              <span dangerouslySetInnerHTML={{ __html: section.content }} />
            </div>
          );
        
        case 'numbered-list':
          let numberedItems = section.content.split('\n').filter(item => item.trim());
          return (
            <div key={index} style={styles.medicalList}>
              {numberedItems.map((item, itemIndex) => (
                <div key={itemIndex} style={styles.medicalListItem}>
                  <div style={styles.listNumber}>{itemIndex + 1}</div>
                  <div style={styles.medicalListContent}>
                    <span dangerouslySetInnerHTML={{ __html: item.replace(/^\d+[\.)]\s*/, '') }} />
                  </div>
                </div>
              ))}
            </div>
          );
        
        case 'bullet-list':
          let bulletItems = section.content.split('\n').filter(item => item.trim());
          return (
            <div key={index} style={styles.medicalList}>
              {bulletItems.map((item, itemIndex) => (
                <div key={itemIndex} style={styles.medicalListItem}>
                  <div style={styles.medicalBullet}>
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="3" fill="currentColor"/>
                    </svg>
                  </div>
                  <div style={styles.medicalListContent}>
                    <span dangerouslySetInnerHTML={{ __html: item.replace(/^[-•*▪▫◦‣⁃]\s*/, '') }} />
                  </div>
                </div>
              ))}
            </div>
          );
        
        case 'warning':
          return (
            <div key={index} style={styles.warningMessage}>
              <div style={styles.warningIcon}>⚠️</div>
              <span dangerouslySetInnerHTML={{ __html: section.content }} />
            </div>
          );
        
        case 'highlight':
          return (
            <div key={index} style={styles.highlightMessage}>
              <div style={styles.highlightIcon}>💡</div>
              <span dangerouslySetInnerHTML={{ __html: section.content.replace(/^(Note:|Important:)/i, '') }} />
            </div>
          );
        
        default:
          return (
            <div key={index} style={styles.messageParagraph}>
              <span dangerouslySetInnerHTML={{ __html: section.content }} />
            </div>
          );
      }
    });
  };

  // Process API response to handle array format and combine multiple parts
  let processAPIResponse = (rawResponse) => {
    if (!rawResponse) {
      return 'I apologize, but I didn\'t receive a proper response. Please try again.';
    }

    try {
      // If it's already a string, return it
      if (typeof rawResponse === 'string') {
        return rawResponse.trim();
      }

      // If it's an array, process each element
      if (Array.isArray(rawResponse)) {
        let combinedResponse = '';
        
        for (let i = 0; i < rawResponse.length; i++) {
          let part = rawResponse[i];
          
          if (typeof part === 'string' && part.trim()) {
            // Skip responses that seem to be metadata or tracking info
            if (part.includes('CLARIFICATION_NEEDED') || 
                part.includes('Medical Entities Tracked') ||
                part.includes('**Clarifying Questions:**') ||
                part.includes('**Medical Entities Tracked:**') ||
                part.trim() === '[]' ||
                part.trim() === '""') {
              continue;
            }
            
            // Add the part to combined response
            if (combinedResponse) {
              combinedResponse += '\n\n';
            }
            combinedResponse += part.trim();
          }
        }
        
        if (combinedResponse.trim()) {
          return combinedResponse.trim();
        } else {
          return 'I received your message but need more information to provide a helpful response. Could you please provide more details about your health concern?';
        }
      }

      // Try to stringify if it's an object
      if (typeof rawResponse === 'object') {
        return JSON.stringify(rawResponse, null, 2);
      }

      return String(rawResponse);
      
    } catch (error) {
      return 'I apologize, but there was an issue processing the response. Please try again.';
    }
  };

  // Simplified and improved API call function
  let callMedicalAPI = async (userQuery, healthProfile, sessionId) => {
    try {
      // First API call to initiate prediction
      let initiateResponse = await fetch('https://rishi002-medivedallm.hf.space/gradio_api/call/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: [userQuery, healthProfile, sessionId]
        })
      });

      if (!initiateResponse.ok) {
        throw new Error(`HTTP error! status: ${initiateResponse.status}`);
      }

      let initiateData = await initiateResponse.text();
      
      // Extract event ID from response
      let eventId = null;
      
      try {
        let jsonData = JSON.parse(initiateData);
        eventId = jsonData.event_id;
      } catch (e) {
        // Fallback regex extraction
        let eventIdMatch = initiateData.match(/"event_id":\s*"([^"]+)"/);
        if (eventIdMatch) {
          eventId = eventIdMatch[1];
        }
      }
      
      if (!eventId) {
        throw new Error('Could not extract event ID from response: ' + initiateData);
      }

      // Wait before making the second call
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Second API call to get the result
      let resultResponse = await fetch(`https://rishi002-medivedallm.hf.space/gradio_api/call/predict/${eventId}`, {
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream',
        }
      });

      if (!resultResponse.ok) {
        throw new Error(`HTTP error! status: ${resultResponse.status}`);
      }

      // Read the streaming response
      let reader = resultResponse.body.getReader();
      let decoder = new TextDecoder();
      let allChunks = '';
      let finalResponse = null;

      while (true) {
        let { done, value } = await reader.read();
        
        if (done) break;
        
        let chunk = decoder.decode(value, { stream: true });
        allChunks += chunk;
      }

      // Parse the streaming response more effectively
      let lines = allChunks.split('\n');
      
      for (let line of lines) {
        let trimmedLine = line.trim();
        
        // Skip empty lines and status messages
        if (!trimmedLine || trimmedLine === '[DONE]') {
          continue;
        }
        
        // Handle "data: " prefixed lines - THIS IS THE KEY FIX
        if (trimmedLine.startsWith('data: ')) {
          let dataContent = trimmedLine.substring(6).trim();
          
          // Skip empty data lines
          if (!dataContent || dataContent === '[DONE]') {
            continue;
          }
          
          try {
            // Try to parse as JSON array directly
            let parsed = JSON.parse(dataContent);
            
            // If it's an array and has content, use it
            if (Array.isArray(parsed) && parsed.length > 0) {
              finalResponse = parsed;
              break;
            }
            
          } catch (parseError) {
            // Continue if parse error
          }
          continue;
        }
        
        // Handle other JSON responses
        try {
          let parsed = JSON.parse(trimmedLine);
          
          // Check for completion message with output
          if (parsed.msg === 'process_completed' && parsed.output && parsed.output.data) {
            if (Array.isArray(parsed.output.data) && parsed.output.data.length > 0) {
              finalResponse = parsed.output.data;
              break;
            }
          }
          
          // Check for data array responses
          if (parsed.data && Array.isArray(parsed.data) && parsed.data.length > 0) {
            finalResponse = parsed.data;
            break;
          }
          
        } catch (parseError) {
          // If it's not JSON and looks like a direct text response, try to parse as array
          if (trimmedLine.startsWith('[') && trimmedLine.endsWith(']')) {
            try {
              finalResponse = JSON.parse(trimmedLine);
              break;
            } catch (e) {
              // Continue if parse error
            }
          }
        }
      }

      if (!finalResponse) {
        return 'I received a response from the medical service, but it appears to be empty. Please try rephrasing your question or ask something more specific.';
      }

      // Process the response using the new function
      return processAPIResponse(finalResponse);
      
    } catch (error) {
      return `I apologize, but I'm currently unable to connect to the medical service. Error: ${error.message}. Please check your internet connection and try again.`;
    }
  };

  // Send message function with API integration
  let sendMessage = async () => {
    if (!userInput.trim() || isLoading) return;

    let currentInput = userInput.trim();
    setUserInput("");
    setIsLoading(true);

    // Add user message
    let newUserMessage = {
      sender: "user",
      text: currentInput,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, newUserMessage]);

    try {
      // Call the medical API with the actual user's health profile
      let apiResponse = await callMedicalAPI(currentInput, userHealthProfile, sessionId);
      
      let botResponse = {
        sender: "bot",
        text: apiResponse,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, botResponse]);
      
    } catch (error) {
      console.error('Error in sendMessage:', error);
      
      // Fallback response in case of error
      let errorResponse = {
        sender: "bot",
        text: "I apologize, but I'm currently experiencing technical difficulties. Please try again in a moment. If the issue persists, please contact our support team.",
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  let handleKeyPress = (e) => {
    if (e.key === "Enter" && userInput.trim() && !isLoading) {
      sendMessage();
    }
  };

  return (
     <>
    <NavigationBar />
    
    <div style={styles.pageContainer}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <div style={styles.headerIcon}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" 
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 5.67V21.23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M9 12h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M12 9v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div style={styles.headerText}>
              <div style={styles.headerTitle}>Medoraa AI Assistant</div>
              <div style={styles.headerSubtitle}>
                Your Personal Healthcare Companion
                {isLoadingProfile && <span> • Loading your profile...</span>}
                {!isLoadingProfile && medicalProfile && <span> • Profile loaded ✓</span>}
                {!isLoadingProfile && !medicalProfile && currentUser && <span> • Complete your profile for personalized care</span>}
                {!isLoadingProfile && !currentUser && <span> • Please log in for personalized assistance</span>}
              </div>
            </div>
            <div style={styles.statusIndicator}>
              <div style={styles.statusDot}></div>
              <span>Online</span>
            </div>
          </div>
          
          {/* Profile actions */}
          {!isLoadingProfile && !medicalProfile && currentUser && (
            <div style={styles.profilePrompt}>
              <span>📋 No medical profile found. </span>
              <button 
                onClick={refreshUserProfile}
                style={styles.refreshButton}
              >
                Refresh Profile
              </button>
            </div>
          )}
          
          {!currentUser && !isLoadingProfile && (
            <div style={styles.profilePrompt}>
              <span>🔐 Please log in to access personalized medical assistance.</span>
            </div>
          )}
        </div>
        
        <div style={styles.chatbox} ref={chatboxRef}>
          {messages.map((msg, index) => (
            <div key={index} style={msg.sender === "user" ? styles.userMessage : styles.botMessage}>
              {msg.sender === "bot" && (
                <div style={styles.avatarContainer}>
                  <div style={styles.botAvatar}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" 
                            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M9 12h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M12 9v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </div>
                </div>
              )}
              <div style={msg.sender === "user" ? styles.userMessageContent : styles.botMessageContent}>
                {msg.sender === "bot" ? (
                  <div style={styles.formattedMessage}>
                    {renderFormattedMessage(formatBotMessage(msg.text))}
                  </div>
                ) : (
                  msg.text
                )}
                <div style={styles.messageTime}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div style={styles.loadingMessage}>
              <div style={styles.avatarContainer}>
                <div style={styles.botAvatar}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" 
                          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9 12h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M12 9v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
              </div>
              <div style={styles.typingIndicator}>
                <span style={styles.dot}></span>
                <span style={styles.dot}></span>
                <span style={styles.dot}></span>
                <span style={styles.typingText}>AI is analyzing...</span>
              </div>
            </div>
          )}
        </div>
        
        <div style={styles.inputContainer}>
          <div style={styles.inputWrapper}>
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyPress={handleKeyPress}
              style={styles.input}
              placeholder={isLoadingProfile ? "Loading your profile..." : "Describe your symptoms or ask a health question..."}
              disabled={isLoading || isLoadingProfile}
            />
            <button 
              onClick={sendMessage} 
              style={{
                ...styles.button,
                ...((!userInput.trim() || isLoading || isLoadingProfile) ? styles.buttonDisabled : {})
              }}
              disabled={!userInput.trim() || isLoading || isLoadingProfile}
              title="Send message"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          <div style={styles.disclaimer}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 12l2 2 4-4" stroke="#00b894" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="12" r="10" stroke="#00b894" strokeWidth="2"/>
            </svg>
            For informational purposes only. Consult healthcare professionals for medical advice.
          </div>
        </div>
      </div>
      
      {/* Floating background elements */}
      <div style={styles.floatingElement1}></div>
      <div style={styles.floatingElement2}></div>
      <div style={styles.floatingElement3}></div>
    </div>
     </>
  );
};

let styles = {
  pageContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    background: "linear-gradient(135deg, #e6f9f5 0%, #d2f2ec 25%, #f4f7f8 50%, #e6f9f5 100%)",
    padding: "20px",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    position: "relative",
    overflow: "hidden"
  },
  container: {
    width: "100%",
    maxWidth: "600px",
    height: "80vh",
    borderRadius: "20px",
    overflow: "hidden",
    boxShadow: "0 20px 60px rgba(0, 51, 46, 0.15), 0 8px 32px rgba(0, 0, 0, 0.08)",
    display: "flex",
    flexDirection: "column",
    background: "rgba(255, 255, 255, 0.95)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(0, 184, 148, 0.1)",
    position: "relative",
    zIndex: 1
  },
  header: {
    background: "linear-gradient(135deg, #00332e 0%, #002720 50%, #00332e 100%)",
    color: "white",
    padding: "20px 24px",
    position: "relative",
    overflow: "hidden"
  },
  headerContent: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    position: "relative",
    zIndex: 2
  },
  headerIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "14px",
    background: "rgba(255, 255, 255, 0.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(255, 255, 255, 0.2)"
  },
  headerText: {
    flex: 1
  },
  headerTitle: {
    fontSize: "20px",
    fontWeight: "700",
    marginBottom: "4px",
    letterSpacing: "-0.02em"
  },
  headerSubtitle: {
    fontSize: "13px",
    opacity: 0.85,
    fontWeight: "400",
    color: "#cfeee8"
  },
  statusIndicator: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "12px",
    background: "rgba(0, 184, 148, 0.2)",
    padding: "6px 12px",
    borderRadius: "20px",
    border: "1px solid rgba(0, 184, 148, 0.3)"
  },
  statusDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: "#00c4a7",
    animation: "pulse 2s infinite"
  },
  chatbox: {
    flex: 1,
    overflowY: "auto",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    background: "linear-gradient(to bottom, rgba(244, 247, 248, 0.3) 0%, rgba(230, 249, 245, 0.2) 100%)",
    position: "relative"
  },
  userMessage: {
    display: "flex",
    justifyContent: "flex-end",
    marginLeft: "60px"
  },
  botMessage: {
    display: "flex",
    justifyContent: "flex-start",
    marginRight: "60px",
    alignItems: "flex-start",
    gap: "12px"
  },
  avatarContainer: {
    marginTop: "4px"
  },
  botAvatar: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #00b894 0%, #00c4a7 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    flexShrink: 0,
    boxShadow: "0 4px 16px rgba(0, 184, 148, 0.25)",
    border: "2px solid rgba(255, 255, 255, 0.2)"
  },
  userMessageContent: {
    background: "linear-gradient(135deg, #00b894 0%, #00c4a7 100%)",
    color: "white",
    padding: "16px 20px",
    borderRadius: "18px 18px 4px 18px",
    boxShadow: "0 4px 20px rgba(0, 184, 148, 0.25)",
    fontSize: "15px",
    lineHeight: "1.5",
    maxWidth: "100%",
    wordWrap: "break-word",
    fontWeight: "400",
    position: "relative"
  },
  botMessageContent: {
    background: "rgba(255, 255, 255, 0.9)",
    color: "#1a1a1a",
    padding: "16px 20px",
    borderRadius: "18px 18px 18px 4px",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
    fontSize: "15px",
    lineHeight: "1.6",
    border: "1px solid rgba(0, 184, 148, 0.1)",
    maxWidth: "100%",
    wordWrap: "break-word",
    backdropFilter: "blur(10px)"
  },
  formattedMessage: {
    marginBottom: "8px"
  },
  messageParagraph: {
    margin: "0 0 12px 0",
    padding: 0,
    lineHeight: "1.6"
  },
  messageTime: {
    fontSize: "11px",
    color: "#8ba0a8",
    textAlign: "right",
    marginTop: "8px",
    fontWeight: "400"
  },
  loadingMessage: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    marginBottom: "8px"
  },
  typingIndicator: {
    display: "flex",
    alignItems: "center",
    padding: "16px 20px",
    background: "rgba(255, 255, 255, 0.9)",
    borderRadius: "18px",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
    gap: "10px",
    border: "1px solid rgba(0, 184, 148, 0.1)",
    backdropFilter: "blur(10px)"
  },
  dot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: "#00b894",
    animation: "bounce 1.4s infinite ease-in-out both"
  },
  typingText: {
    color: "#8ba0a8",
    fontSize: "14px",
    fontStyle: "italic",
    marginLeft: "4px"
  },
  inputContainer: {
    padding: "20px 24px",
    borderTop: "1px solid rgba(0, 184, 148, 0.1)",
    background: "rgba(255, 255, 255, 0.95)",
    backdropFilter: "blur(20px)"
  },
  inputWrapper: {
    display: "flex",
    gap: "12px",
    marginBottom: "12px",
    background: "rgba(249, 250, 251, 0.8)",
    borderRadius: "16px",
    padding: "6px",
    border: "1px solid rgba(0, 184, 148, 0.1)",
    backdropFilter: "blur(10px)"
  },
  input: {
    flex: 1,
    padding: "14px 18px",
    borderRadius: "12px",
    border: "none",
    fontSize: "15px",
    outline: "none",
    background: "transparent",
    color: "#1a1a1a",
    fontFamily: "inherit"
  },
  button: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "48px",
    height: "48px",
    border: "none",
    borderRadius: "12px",
    background: "linear-gradient(135deg, #00b894 0%, #00c4a7 100%)",
    color: "white",
    cursor: "pointer",
    transition: "all 0.3s ease",
    boxShadow: "0 4px 16px rgba(0, 184, 148, 0.25)"
  },
  buttonDisabled: {
    background: "linear-gradient(135deg, #d1d5db 0%, #9ca3af 100%)",
    cursor: "not-allowed",
    opacity: 0.6,
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)"
  },
  disclaimer: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "12px",
    color: "#8ba0a8",
    textAlign: "center",
    justifyContent: "center",
    fontWeight: "400"
  },
  floatingElement1: {
    position: "absolute",
    width: "200px",
    height: "200px",
    borderRadius: "50%",
    background: "rgba(0, 184, 148, 0.1)",
    top: "10%",
    left: "-5%",
    filter: "blur(40px)",
    animation: "float1 20s ease-in-out infinite"
  },
  floatingElement2: {
    position: "absolute",
    width: "150px",
    height: "150px",
    borderRadius: "50%",
    background: "rgba(0, 51, 46, 0.08)",
    bottom: "20%",
    right: "-3%",
    filter: "blur(30px)",
    animation: "float2 15s ease-in-out infinite"
  },
  floatingElement3: {
    position: "absolute",
    width: "100px",
    height: "100px",
    borderRadius: "50%",
    background: "rgba(0, 196, 167, 0.12)",
    top: "60%",
    left: "10%",
    filter: "blur(25px)",
    animation: "float3 18s ease-in-out infinite"
  }
};

// Add keyframes for animations
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = `
  @keyframes bounce {
    0%, 60%, 100% {
      transform: translateY(0);
      opacity: 0.4;
    }
    30% {
      transform: translateY(-8px);
      opacity: 1;
    }
  }
  
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
  
  @keyframes float1 {
    0%, 100% { 
      transform: translateY(0px) translateX(0px); 
    }
    33% { 
      transform: translateY(-30px) translateX(20px); 
    }
    66% { 
      transform: translateY(20px) translateX(-15px); 
    }
  }
  
  @keyframes float2 {
    0%, 100% { 
      transform: translateY(0px) translateX(0px); 
    }
    50% { 
      transform: translateY(-40px) translateX(-25px); 
    }
  }
  
  @keyframes float3 {
    0%, 100% { 
      transform: translateY(0px) translateX(0px); 
    }
    25% { 
      transform: translateY(15px) translateX(30px); 
    }
    75% { 
      transform: translateY(-25px) translateX(-20px); 
    }
  }
  
  /* Custom scrollbar */
  *::-webkit-scrollbar {
    width: 6px;
  }
  
  *::-webkit-scrollbar-track {
    background: rgba(0, 184, 148, 0.1);
    border-radius: 3px;
  }
  
  *::-webkit-scrollbar-thumb {
    background: rgba(0, 184, 148, 0.3);
    border-radius: 3px;
  }
  
  *::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 184, 148, 0.5);
  }

  /* Smooth hover effects */
  button:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 24px rgba(0, 184, 148, 0.35) !important;
  }
  
  input:focus {
    outline: 2px solid rgba(0, 184, 148, 0.3);
    outline-offset: -2px;
  }
`;

document.head.appendChild(styleSheet);

export default Chatbot;
