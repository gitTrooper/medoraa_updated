import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import {
  doc,
  setDoc,
  getDoc,
  addDoc,
  deleteDoc,
  collection,
} from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

const PaymentGateway = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const { currentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const appointmentDetails = location.state;
  
  // Added appointment mode functionality
  const appointmentMode = appointmentDetails?.appointmentType || appointmentDetails?.mode || 'inPerson';
  const isOnlineConsultation = appointmentMode === 'videoCall';

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => setIsLoaded(true);
    script.onerror = () => setError('Failed to load payment gateway');
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // Generate unique receipt number
  const generateReceiptNumber = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `receipt_${timestamp}_${random}`;
  };

  // Create order on server
  const createOrder = async (amount) => {
    try {
      const orderData = {
        amount: amount * 100, // Convert to paise
        currency: "INR",
        receipt: generateReceiptNumber(),
        notes: {
          customer_id: currentUser.uid,
          product: "appointment"
        }
      };

      console.log('Sending order data:', orderData);

      const response = await fetch('https://bc8q77pn2e.execute-api.eu-north-1.amazonaws.com/prod/razorpayScript/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData)
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const orderResponse = await response.json();
      console.log('Order response:', orderResponse);
      
      // Check if the response has the expected structure
      if (!orderResponse) {
        throw new Error('Empty response from server');
      }

      return orderResponse;
    } catch (error) {
      console.error('Error creating order:', error);
      throw new Error(`Failed to create order: ${error.message}`);
    }
  };

  // Generate Google Meet link for online consultations
  const generateMeetLink = async (appointmentData) => {
    try {
      console.log('Generating Google Meet link for online consultation...');
      
      // Parse appointment date and time to create ISO datetime strings
      const appointmentDate = appointmentData.appointmentDate || appointmentData.date;
      const appointmentTime = appointmentData.appointmentTime || appointmentData.time;
      
      // Create start time (assuming appointment time format like "10:00 AM")
      const startDateTime = new Date(`${appointmentDate} ${appointmentTime}`);
      if (isNaN(startDateTime.getTime())) {
        throw new Error('Invalid appointment date/time format');
      }
      
      // Create end time (assuming 30-minute consultation)
      const endDateTime = new Date(startDateTime.getTime() + 30 * 60 * 1000);
      
      // Convert to ISO strings
      const startTime = startDateTime.toISOString();
      const endTime = endDateTime.toISOString();
      
      const meetRequestData = {
        doctorFirebaseUid: appointmentData.doctorId,
        patientEmail: currentUser.email,
        startTime: startTime,
        endTime: endTime
      };

      console.log('Meet link request data:', meetRequestData);

      const response = await fetch('https://ko7d5si4kcipdpid3qceff73aq0pitnh.lambda-url.eu-north-1.on.aws/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(meetRequestData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Meet link generation error:', errorText);
        throw new Error(`Failed to generate meet link: ${response.status} - ${errorText}`);
      }

      const meetResponse = await response.json();
      console.log('Meet link response:', meetResponse);

      if (!meetResponse.success || !meetResponse.meetLink) {
        throw new Error(meetResponse.error || 'Failed to get meet link from response');
      }

      return meetResponse.meetLink;
    } catch (error) {
      console.error('Error generating Google Meet link:', error);
      throw error;
    }
  };

  const openRazorpay = async () => {
    if (!isLoaded || !appointmentDetails || !currentUser) {
      setError('Payment gateway is not ready or data missing.');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      // Fix: Ensure fee is a number
      const feeValue = appointmentDetails.appointmentFee || 500;
      const fee = Number(feeValue) || 500; // Convert to number with fallback
      
      // Create order on server
      const order = await createOrder(fee);
      console.log('Received order:', order);
      
      // Handle your API's response format
      if (!order.success || !order.order_id) {
        console.error('Invalid order response:', order);
        throw new Error('Failed to create order on server');
      }

      const orderId = order.order_id;
      const orderAmount = order.amount;
      const orderCurrency = order.currency;
      const orderReceipt = order.receipt;
      
      // Use key from server response if available, otherwise use default
      const razorpayKey = order.key_id || order.key || 'rzp_test_z7QMSZV1ZStdfo';

      // Validate Razorpay key format
      if (!razorpayKey.startsWith('rzp_')) {
        throw new Error('Invalid Razorpay key format');
      }

      // Validate order ID format
      if (!orderId.startsWith('order_')) {
        throw new Error('Invalid order ID format from server');
      }

      console.log('Creating Razorpay payment with:', {
        key: razorpayKey,
        order_id: orderId,
        amount: orderAmount,
        currency: orderCurrency
      });

      const options = {
        key: razorpayKey,
        amount: orderAmount,
        currency: orderCurrency,
        name: 'MediVeda',
        description: 'Appointment Fee',
        order_id: orderId,
        prefill: {
          name: appointmentDetails.patientName || currentUser.displayName || 'Patient',
          email: currentUser.email || '',
          contact: appointmentDetails.phone || '',
        },
        theme: { color: '#4b0082' },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
            setError('Payment was cancelled');
          },
        },
        handler: async function (response) {
          console.log('Payment successful:', response);
          try {
            // Show success message immediately
            setError('');
            
            const appointmentData = {
              ...appointmentDetails,
              paymentId: response.razorpay_payment_id,
              orderId: response.razorpay_order_id,
              signature: response.razorpay_signature,
              patientId: currentUser.uid,
              status: 'confirmed',
              fee: fee, // Now guaranteed to be a number
              createdAt: new Date().toISOString(),
              receiptNumber: orderReceipt,
              paymentStatus: 'completed',
              appointmentMode: appointmentMode,
              isOnlineConsultation: isOnlineConsultation
            };

            // Get doctor name if not provided
            if (!appointmentData.doctorName && appointmentData.doctorId) {
              try {
                const docSnap = await getDoc(doc(db, 'doctors', appointmentData.doctorId));
                if (docSnap.exists()) {
                  appointmentData.doctorName = docSnap.data().name || 'Doctor';
                }
              } catch (err) {
                console.warn('Could not fetch doctor name:', err);
                appointmentData.doctorName = 'Doctor';
              }
            }

            // Generate Google Meet link for online consultations
            if (isOnlineConsultation) {
              try {
                console.log('This is an online consultation, generating meet link...');
                const meetLink = await generateMeetLink(appointmentData);
                appointmentData.meetLink = meetLink;
                appointmentData.meetLinkGenerated = true;
                console.log('Meet link generated successfully:', meetLink);
              } catch (meetError) {
                console.error('Error generating meet link:', meetError);
                // Store the error but don't fail the appointment
                appointmentData.meetLinkError = meetError.message;
                appointmentData.meetLinkGenerated = false;
                // You might want to show a warning to the user
                setError(`Appointment booked successfully, but there was an issue generating the video call link: ${meetError.message}. You can contact support for assistance.`);
              }
            }

            console.log('Saving appointment data:', appointmentData);

            // Generate custom ID
            const customId = `appointment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            // Save appointment in main appointments collection
            await setDoc(doc(db, 'appointments', customId), appointmentData);
            console.log('Appointment saved successfully in main collection with ID:', customId);

            // Save mirror appointment in user's subcollection
            try {
              await setDoc(doc(db, 'users', currentUser.uid, 'appointments', customId), appointmentData);
              console.log('Mirror appointment saved successfully in user subcollection');
            } catch (mirrorError) {
              console.error('Error saving mirror appointment:', mirrorError);
              // Don't throw error here as main appointment is saved
            }

            // Navigate immediately after successful save (removed delay)
            navigate(`/receipt?appointmentId=${customId}`, { 
              state: { appointmentData } 
            });

          } catch (err) {
            console.error('Error saving appointment:', err);
            setError(`Payment successful! Payment ID: ${response.razorpay_payment_id}. However, there was an issue saving your appointment. Please contact support with your payment ID.`);
          } finally {
            setIsProcessing(false);
          }
        },
      };

      console.log('Razorpay options:', options);
      const paymentObject = new window.Razorpay(options);
      paymentObject.on('payment.failed', function (response) {
        console.error('Payment failed:', response.error);
        setError(`Payment failed: ${response.error.description}`);
        setIsProcessing(false);
      });
      paymentObject.open();
    } catch (err) {
      console.error('Error initiating payment:', err);
      setError(err.message || 'Failed to initiate payment. Please try again.');
      setIsProcessing(false);
    }
  };

  if (!appointmentDetails) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <h2>Error</h2>
        <p>No appointment details found. Please go back and try again.</p>
        <button 
          onClick={() => navigate(-1)}
          style={{
            backgroundColor: '#4b0082',
            color: 'white',
            padding: '12px 24px',
            border: 'none',
            borderRadius: '25px',
            fontSize: '16px',
            cursor: 'pointer',
          }}
        >
          Go Back
        </button>
      </div>
    );
  }

  // Calculate fee for display (ensure it's a number)
  const displayFee = Number(appointmentDetails.appointmentFee) || 500;

  return (
    <div style={{ padding: '3rem', textAlign: 'center', maxWidth: '500px', margin: '0 auto' }}>
      <h2>Confirm your Appointment</h2>
      
      <div style={{ 
        backgroundColor: '#f8f9fa', 
        padding: '20px', 
        borderRadius: '10px', 
        marginBottom: '20px',
        textAlign: 'left'
      }}>
        <h3>Appointment Details:</h3>
        <p><strong>Patient:</strong> {appointmentDetails.patientName}</p>
        <p><strong>Doctor:</strong> {appointmentDetails.doctorName || 'Doctor'}</p>
        <p><strong>Date:</strong> {appointmentDetails.appointmentDate || appointmentDetails.date}</p>
        <p><strong>Time:</strong> {appointmentDetails.appointmentTime || appointmentDetails.time}</p>
        <p>
          <strong>Mode:</strong> 
          <span style={{ 
            color: isOnlineConsultation ? '#28a745' : '#007bff',
            fontWeight: 'bold',
            marginLeft: '8px'
          }}>
            {isOnlineConsultation ? '📹 Video Consultation' : '🏥 In-Person Visit'}
          </span>
        </p>
        <p><strong>Fee:</strong> ₹{displayFee}</p>
        
        {isOnlineConsultation && (
          <div style={{
            backgroundColor: '#e8f5e8',
            padding: '10px',
            borderRadius: '5px',
            marginTop: '10px',
            border: '1px solid #d4edda'
          }}>
            <p style={{ margin: '0', fontSize: '14px', color: '#155724' }}>
              📹 <strong>Video Consultation:</strong> A Google Meet link will be generated after payment and sent to your email.
            </p>
          </div>
        )}
      </div>

      {error && (
        <div style={{
          backgroundColor: '#ffe6e6',
          color: '#d00',
          padding: '10px',
          borderRadius: '5px',
          marginBottom: '20px',
          border: '1px solid #ffcccc'
        }}>
          {error}
        </div>
      )}

      <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#4b0082' }}>
        Total Fee: ₹{displayFee}
      </p>
      
      <button
        onClick={openRazorpay}
        disabled={isProcessing || !isLoaded}
        style={{
          backgroundColor: isProcessing || !isLoaded ? '#ccc' : '#4b0082',
          color: 'white',
          padding: '12px 24px',
          border: 'none',
          borderRadius: '25px',
          fontSize: '16px',
          cursor: isProcessing || !isLoaded ? 'not-allowed' : 'pointer',
          marginBottom: '10px',
          minWidth: '150px'
        }}
      >
        {isProcessing ? (isOnlineConsultation ? 'Processing & Setting up video call...' : 'Processing...') : !isLoaded ? 'Loading...' : 'Pay Now'}
      </button>

      <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
        <p>🔒 Secure payment powered by Razorpay</p>
        <p>We accept all major credit cards, debit cards, and UPI</p>
        {isOnlineConsultation && (
          <p style={{ color: '#28a745', fontWeight: 'bold' }}>
            📹 Google Meet link will be automatically generated for video consultation
          </p>
        )}
      </div>
    </div>
  );
};

export default PaymentGateway;