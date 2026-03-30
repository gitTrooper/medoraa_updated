import React, { useState, useRef, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import "../styles/MedicalReportAnalyzer.css";
import NavigationBar from "../components/NavigationBar";
import { useLocation } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, LineChart, Line, Area, AreaChart } from 'recharts';
import { Activity, Heart, Droplets, AlertCircle, CheckCircle, AlertTriangle, Upload, FileText, MessageCircle, TrendingUp, Shield, Clock, Users, Stethoscope, Plus } from 'lucide-react';

const MedicalReportAnalyzer = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [reportProcessed, setReportProcessed] = useState(false);
  const [patientProfile, setPatientProfile] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadedFileUrl, setUploadedFileUrl] = useState('');
  const [sessionId, setSessionId] = useState('session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9));

  const fileInputRef = useRef(null);
  const chatContainerRef = useRef(null);

  const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      clearMessages();
    } else {
      setError('Please select a PDF file only');
      setSelectedFile(null);
    }
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const processReportFromUrl = async (fileUrl) => {
    
    setIsProcessing(true);
    setError('');
    setSuccess('Uploading and starting analysis...');

    try {
      const fileData = {
        path: fileUrl,
        meta: { _type: "gradio.FileData" }
      };

      const initRes = await fetch('https://rishi002-medicalreportanalyser.hf.space/gradio_api/call/upload_and_analyze_report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: [fileData, sessionId] })
      });

      const initJson = await initRes.json();
     
      const eventId = initJson.event_id;

      

      if (!eventId) throw new Error('No event ID returned from API');

      await listenToAnalysisSSE(eventId);
    } catch (err) {
      
      setError('Failed to process: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const listenToAnalysisSSE = async (eventId) => {
    const response = await fetch(
      `https://rishi002-medicalreportanalyser.hf.space/gradio_api/call/upload_and_analyze_report/${eventId}`,
      {
        headers: { Accept: 'text/event-stream' },
      }
    );

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;

        const jsonString = trimmed.slice(6).trim();
        if (!jsonString || jsonString === 'null' || jsonString === '[DONE]') {
          
          continue;
        }

        try {
          const parsed = JSON.parse(jsonString);
         

          if (Array.isArray(parsed) && parsed.length >= 3) {
            
            const profileData = parsed[2];
            
            setPatientProfile(profileData);
            setReportProcessed(true);
            setSuccess('✅ Report analyzed successfully!');
            return;
          }

          if (parsed.msg === 'process_completed' && parsed.output?.data) {
            const finalData = parsed.output.data;
            if (Array.isArray(finalData) && finalData.length >= 3) {
              const profileData = finalData[2];
            
              setPatientProfile(profileData);
              setReportProcessed(true);
              setSuccess('✅ Report analyzed successfully!');
              return;
            }
          }

          if (parsed.msg === 'progress') {
            
          } else if (parsed.msg === 'estimation') {
            
          }
        } catch (e) {
          
        }
      }
    }

    throw new Error('No final result received from stream.');
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }

    setIsUploading(true);
    setError('');
    setSuccess('📤 Uploading your file...');
    

    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) throw new Error('User not authenticated');

      const token = await user.getIdToken(true);
      

      const base64Data = await fileToBase64(selectedFile);
      

      const uploadResponse = await fetch(
        'https://2srwcyzi2yms65kc7fzdqzhrsq0pvmim.lambda-url.eu-north-1.on.aws/',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            pdf_data: base64Data,
            filename: selectedFile.name,
          }),
        }
      );

      

      if (!uploadResponse.ok) {
        const text = await uploadResponse.text();
        
        throw new Error(`Upload failed: ${uploadResponse.status} - ${text}`);
      }

      const result = await uploadResponse.json();
      

      const accessUrl = result?.data?.access_url;
     

      if (!accessUrl) throw new Error('No access URL received');

      setUploadedFileUrl(accessUrl);
      setSuccess('✅ File uploaded. Starting analysis...');
      setIsUploading(false);

      await processReportFromUrl(accessUrl);

    } catch (err) {
      
      setError('Upload failed: ' + err.message);
      setIsUploading(false);
    }
  };

  const resetAll = () => {
    setSelectedFile(null);
    setReportProcessed(false);
    setPatientProfile('');
    setChatHistory([]);
    setCurrentMessage('');
    setError('');
    setSuccess('');
    setUploadedFileUrl('');
    setIsUploading(false);
    setIsProcessing(false);
    setIsLoading(false);
    setSessionId('session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  };

  const sendChatMessage = async () => {
    if (!currentMessage.trim() || !reportProcessed || isLoading) {
      if (!reportProcessed) {
        setChatHistory(prev => [
          ...prev,
          {
            role: 'assistant',
            content: '📄 Please upload and analyze your medical report first before asking questions.',
          },
        ]);
      }
      return;
    }

    const userMessage = currentMessage.trim();
    setChatHistory((prev) => [...prev, { role: 'user', content: userMessage }]);
    setCurrentMessage('');
    setIsLoading(true);

    try {
      const formattedChatHistory = chatHistory.map(msg => [
        msg.role === 'user' ? 'user' : 'assistant',
        msg.content,
      ]);

      const parsedProfileObject =
        typeof patientProfile === 'string'
          ? JSON.parse(patientProfile)
          : patientProfile;

      const fixedParameters = {};
      for (const key in parsedProfileObject.parameters) {
        const param = parsedProfileObject.parameters[key];
        const fixedRange = param.normal_range.replace(/(\d+)\.(\d+)(\d+)/g, "$1.$2 - $3");
        fixedParameters[key] = {
          ...param,
          normal_range: fixedRange
        };
      }

      const cleanProfile = {
        report_type: parsedProfileObject.report_type,
        report_date: parsedProfileObject.report_date,
        parameters: fixedParameters,
        categories: parsedProfileObject.categories,
        summary: parsedProfileObject.summary,
      };

      const chatData = {
        data: [
          userMessage,
          sessionId,
          formattedChatHistory
        ]
      };

      

      const initRes = await fetch(
        'https://rishi002-medicalreportanalyser.hf.space/gradio_api/call/lambda',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(chatData),
        }
      );

      if (!initRes.ok) throw new Error(`HTTP error! status: ${initRes.status}`);

      const { event_id } = await initRes.json();
      
      if (!event_id) throw new Error('No event_id returned');

      await listenToChatSSE(event_id);

    } catch (err) {
      
      setChatHistory((prev) => [
        ...prev,
        { role: 'assistant', content: '❌ Error: ' + err.message },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const listenToChatSSE = async (eventId) => {
    const streamRes = await fetch(
      `https://rishi002-medicalreportanalyser.hf.space/gradio_api/call/chat_with_reports/${eventId}`,
      {
        headers: { Accept: 'text/event-stream' },
      }
    );

    if (!streamRes.body) throw new Error('No SSE body returned');

    const reader = streamRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finalReply = '⚠ No response from AI';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;

        const dataContent = line.slice(6).trim();

        if (!dataContent || dataContent === '[DONE]' || dataContent === 'null') {
         
          continue;
        }

        try {
          const jsonData = JSON.parse(dataContent);
         

          if (Array.isArray(jsonData) && jsonData.length >= 1) {
            const chatbotHistory = jsonData[0];
            if (Array.isArray(chatbotHistory) && chatbotHistory.length > 0) {
              const lastMessage = chatbotHistory[chatbotHistory.length - 1];
              if (Array.isArray(lastMessage) && lastMessage.length >= 2) {
                finalReply = lastMessage[1];
              }
            }
          }

          if (jsonData.msg === 'process_completed' && jsonData.output?.data) {
            const output = jsonData.output.data;
            if (Array.isArray(output) && output.length >= 1) {
              const chatbotHistory = output[0];
              if (Array.isArray(chatbotHistory) && chatbotHistory.length > 0) {
                const lastMessage = chatbotHistory[chatbotHistory.length - 1];
                if (Array.isArray(lastMessage) && lastMessage.length >= 2) {
                  finalReply = lastMessage[1];
                }
              }
            }
            break;
          }

          if (jsonData.msg === 'progress') {
            
          } else if (jsonData.msg === 'estimation') {
            
          }
        } catch (e) {
          
        }
      }
    }

    setChatHistory((prev) => [...prev, { role: 'assistant', content: finalReply }]);
  };

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory, isLoading]);

  const calculateSeverity = (value, normalRange) => {
    const { min, max } = parseRange(normalRange);
    const val = parseFloat(value);
    
    if (val >= min && val <= max) {
      return 'normal';
    }
    
    const rangeSize = max - min;
    let deviation = 0;
    
    if (val < min) {
      deviation = Math.abs(val - min) / rangeSize;
    } else if (val > max) {
      deviation = Math.abs(val - max) / rangeSize;
    }
    
    if (deviation <= 0.2) {
      return 'moderate';
    } else if (deviation <= 0.5) {
      return 'moderate';
    } else {
      return 'severe';
    }
  };

  const getStatusColor = (value, normalRange, apiStatus) => {
    const severity = calculateSeverity(value, normalRange);
    
    switch (severity) {
      case 'normal':
        return 'border-success bg-light-success';
      case 'moderate':
        return 'border-warning bg-light-warning';
      case 'severe':
        return 'border-danger bg-light-danger';
      default:
        return 'border-secondary bg-light';
    }
  };

  const getStatusIcon = (value, normalRange, apiStatus) => {
    const severity = calculateSeverity(value, normalRange);
    
    switch (severity) {
      case 'normal':
        return <CheckCircle className="text-success" size={20} />;
      case 'moderate':
        return <AlertTriangle className="text-warning" size={20} />;
      case 'severe':
        return <AlertCircle className="text-danger" size={20} />;
      default:
        return <Activity className="text-secondary" size={20} />;
    }
  };

  const parseRange = (rangeStr) => {
    if (!rangeStr) return { min: 0, max: 100 };
    const range = rangeStr.toString().replace(/\s+/g, '');
    const parts = range.split('-');
    if (parts.length === 2) {
      return {
        min: parseFloat(parts[0]) || 0,
        max: parseFloat(parts[1]) || 100
      };
    }
    return { min: 0, max: 100 };
  };

  const createChartData = (parameter) => {
    const { min, max } = parseRange(parameter.normal_range);
    const value = parseFloat(parameter.value) || 0;
    
    return [
      { name: 'Min', value: min, type: 'range' },
      { name: 'Current', value: value, type: 'current' },
      { name: 'Max', value: max, type: 'range' }
    ];
  };

  const ParameterCard = ({ name, parameter }) => {
    const chartData = createChartData(parameter);
    const statusColor = getStatusColor(parameter.value, parameter.normal_range, parameter.status);
    const statusIcon = getStatusIcon(parameter.value, parameter.normal_range, parameter.status);
    const calculatedSeverity = calculateSeverity(parameter.value, parameter.normal_range);
    
    return (
      <div className={`card h-100 ${statusColor} parameter-card`}>
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="card-title text-truncate mb-0">{name}</h5>
            {statusIcon}
          </div>
          
          <div className="mb-3">
            <div className="d-flex align-items-baseline">
              <span className="display-6 fw-bold text-dark me-2">{parameter.value}</span>
              <small className="text-muted fw-medium">{parameter.unit}</small>
            </div>
            <small className="text-muted">
              Normal: {parameter.normal_range}
            </small>
          </div>

          <div style={{ height: '150px' }} className="mb-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.type === 'current' ? 
                        (calculatedSeverity === 'normal' ? '#198754' : 
                         calculatedSeverity === 'moderate' ? '#fd7e14' : '#dc3545') 
                        : '#6c757d'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="d-flex justify-content-between align-items-center">
            <span className={`badge ${
              calculatedSeverity === 'normal' ? 'bg-success' :
              calculatedSeverity === 'moderate' ? 'bg-warning' :
              'bg-danger'
            }`}>
              {calculatedSeverity.toUpperCase()}
            </span>
            <small className="text-muted text-capitalize fw-medium">{parameter.category}</small>
          </div>
        </div>
      </div>
    );
  };

  const parsedProfile = typeof patientProfile === 'string' ? 
    (() => {
      try {
        return JSON.parse(patientProfile);
      } catch {
        return null;
      }
    })() : patientProfile;

  return (
     <>
      <NavigationBar />
    <div className="min-vh-100 bg-gradient-custom">
      {/* Header */}
     
      <div className="container-fluid py-4">
        {/* Hero Section */}
        <div className="text-center mb-5">
          <h2 className="display-4 fw-bold text-dark mb-3">
            We Ensure The Well-Being of Your Health
          </h2>
          <p className="lead text-muted mx-auto" style={{ maxWidth: '600px' }}>
            Experience peace of mind with our advanced medical report analysis. 
            Get instant insights from your lab results with AI-powered healthcare intelligence.
          </p>
        </div>

        {/* Features Grid */}
        <div className="row g-4 mb-5">
          <div className="col-md-4">
            <div className="card text-center h-100 shadow-sm feature-card">
              <div className="card-body p-4">
                <div className="bg-success bg-opacity-25 rounded-circle d-inline-flex p-3 mb-3">
                  <FileText className="text-success" size={32} />
                </div>
                <h5 className="card-title">Instant Analysis</h5>
                <p className="card-text text-muted">Upload your medical reports and get comprehensive analysis in seconds</p>
              </div>
            </div>
          </div>
          
          <div className="col-md-4">
            <div className="card text-center h-100 shadow-sm feature-card">
              <div className="card-body p-4">
                <div className="bg-info bg-opacity-25 rounded-circle d-inline-flex p-3 mb-3">
                  <TrendingUp className="text-info" size={32} />
                </div>
                <h5 className="card-title">Visual Insights</h5>
                <p className="card-text text-muted">Interactive charts and visualizations to understand your health metrics</p>
              </div>
            </div>
          </div>
          
          <div className="col-md-4">
            <div className="card text-center h-100 shadow-sm feature-card">
              <div className="card-body p-4">
                <div className="bg-primary bg-opacity-25 rounded-circle d-inline-flex p-3 mb-3">
                  <MessageCircle className="text-primary" size={32} />
                </div>
                <h5 className="card-title">AI Consultation</h5>
                <p className="card-text text-muted">Chat with our AI doctor for personalized health recommendations</p>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <div className="card shadow-lg border-0 mb-4">
          <div className="card-header bg-gradient-success text-white py-3">
            <div className="d-flex align-items-center">
              <Upload className="me-2" size={24} />
              <div>
                <h4 className="mb-0">Upload Medical Report</h4>
                <small className="text-white-50">Upload your PDF medical report for instant AI-powered analysis</small>
              </div>
            </div>
          </div>
          
          <div className="card-body p-4">
            <div className="border border-2 border-dashed rounded-3 p-4 text-center upload-area">
              <div className="mb-4">
                <FileText className="text-muted mb-3" size={64} />
                <h5 className="text-dark mb-2">Select your medical report</h5>
                <p className="text-muted mb-0">PDF files only • Maximum 10MB</p>
              </div>
              
              <input
                type="file"
                ref={fileInputRef}
                accept=".pdf"
                className="d-none"
                onChange={handleFileSelect}
                disabled={isUploading || isProcessing}
              />
              
              <button
                className="btn btn-success btn-lg"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isProcessing}
              >
                <Plus className="me-2" size={20} />
                Choose File
              </button>
            </div>
            
            {selectedFile && (
              <div className="alert alert-success d-flex align-items-center mt-3">
                <FileText className="me-2" size={20} />
                <span className="fw-medium me-auto">{selectedFile.name}</span>
                <CheckCircle size={20} />
              </div>
            )}
            
            {error && (
              <div className="alert alert-danger d-flex align-items-center mt-3">
                <AlertCircle className="me-2" size={20} />
                <span>{error}</span>
              </div>
            )}
            
            {success && (
              <div className="alert alert-success d-flex align-items-center mt-3">
                <CheckCircle className="me-2" size={20} />
                <span>{success}</span>
              </div>
            )}
            
            <div className="d-flex justify-content-between mt-4">
              <button
                className="btn btn-secondary btn-lg"
                onClick={resetAll}
                disabled={isUploading || isProcessing}
              >
                Reset
              </button>
              
              <button
                className="btn btn-success btn-lg"
                onClick={handleFileUpload}
                disabled={isUploading || isProcessing || !selectedFile}
              >
                {isUploading ? (
                  <>
                    <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                    Uploading...
                  </>
                ) : isProcessing ? (
                  <>
                    <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <Activity className="me-2" size={20} />
                    Upload & Analyze
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Parameter Cards */}
        {parsedProfile && parsedProfile.parameters && (
          <div className="mb-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h3 className="d-flex align-items-center mb-0">
                <Heart className="text-danger me-2" size={24} />
                📊 Medical Parameters
              </h3>
              <div className="text-muted">
                <small>Report Date: {parsedProfile.report_date} | Type: {parsedProfile.report_type}</small>
              </div>
            </div>
            
            <div className="row g-3">
              {Object.entries(parsedProfile.parameters).map(([name, parameter]) => (
                <div key={name} className="col-lg-3 col-md-4 col-sm-6">
                  <ParameterCard name={name} parameter={parameter} />
                </div>
              ))}
            </div>

            {/* Summary Stats */}
             {parsedProfile.summary && (
      <div className="mt-5 bg-white p-4 rounded-xl shadow-lg">
        <h3 className="text-lg font-semibold mb-4">📈 Summary Statistics</h3>
        <div className="row g-3">
          <div className="col-md-3">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{parsedProfile.summary.total_parameters}</div>
              <div className="text-sm text-gray-600">Total Parameters</div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{parsedProfile.summary.normal_count}</div>
              <div className="text-sm text-gray-600">Normal</div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{parsedProfile.summary.abnormal_count}</div>
              <div className="text-sm text-gray-600">Abnormal</div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{parsedProfile.summary.critical_count}</div>
              <div className="text-sm text-gray-600">Critical</div>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Chat Section */}
    <div className="bg-white shadow-xl rounded-xl overflow-hidden mt-5">
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-4">
        <h2 className="text-xl font-semibold d-flex align-items-center gap-2">
          <Activity className="me-2" size={24} />
          💬 Chat with AI Doctor
        </h2>
        <p className="text-white-50 mb-0">Ask questions about your medical report</p>
      </div>

      <div ref={chatContainerRef} className="p-4 h-96 overflow-y-auto bg-gray-50">
        {chatHistory.map((msg, idx) => (
          <div key={idx} className={`mb-4 ${msg.role === 'user' ? 'text-end' : 'text-start'}`}>
            <div
              className={`d-inline-block px-4 py-3 rounded-lg max-w-75 ${
                msg.role === 'user'
                  ? 'bg-primary text-white rounded-end-0'
                  : 'bg-white text-dark shadow rounded-start-0'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="text-start mb-4">
            <div className="d-inline-block px-4 py-3 bg-light rounded-lg animate-pulse">
              ⏳ AI is analyzing your question...
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-top bg-white">
        <div className="d-flex gap-3">
          <textarea
            rows="2"
            className="form-control"
            placeholder="Ask about your medical report..."
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
          />
          <button
            className="btn btn-primary"
            onClick={sendChatMessage}
            disabled={!currentMessage.trim() || isLoading}
          >
            📤 Send
          </button>
        </div>
      </div>
    </div>
  </div>
)}
      </div>
    </div>
    </>
  );
};

export default MedicalReportAnalyzer;