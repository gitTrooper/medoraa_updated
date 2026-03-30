import React, { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { db } from "../firebase";
import {
  collection,
  getDocs
} from "firebase/firestore";
import {
  Container,
  Card,
  Button,
  Spinner,
  Alert
} from "react-bootstrap";
import NavigationBar from "../components/NavigationBar";

const AppointmentsPage = () => {
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState({});
  const [loading, setLoading] = useState(true);
  const [downloadingPrescription, setDownloadingPrescription] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAppointmentsAndPrescriptions = async () => {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        setError("User not authenticated");
        setLoading(false);
        return;
      }

      try {
        console.log("Fetching appointments for user:", user.uid);
        
        // Fetch appointments from Firestore
        const apptSnap = await getDocs(collection(db, `users/${user.uid}/appointments`));
        console.log("Raw appointment docs:", apptSnap.docs.length);
        
        const userAppointments = apptSnap.docs.map(doc => {
          const data = doc.data();
          console.log("Appointment data:", data);
          return { id: doc.id, ...data };
        });
        
        console.log("Processed appointments:", userAppointments);
        setAppointments(userAppointments);

        // Process prescriptions
        const prescriptionMap = {};
        for (const appt of userAppointments) {
          console.log("Processing appointment:", appt.id, "hasPrescription:", appt.hasPrescription);
          
          if (appt.hasPrescription && appt.prescription) {
            console.log("Prescription found for appointment:", appt.id, appt.prescription);
            
            prescriptionMap[appt.id] = {
              appointmentId: appt.id,
              fileKey: appt.prescription.fileKey,
              fileName: appt.prescription.fileName || appt.prescription.originalName || "Prescription.pdf",
              accessUrl: appt.prescription.accessUrl,
              doctorId: appt.doctorId
            };
          }
        }

        console.log("Prescription map:", prescriptionMap);
        setPrescriptions(prescriptionMap);
        setLoading(false);
      } catch (err) {
        console.error("❌ Error fetching appointments:", err);
        setError(`Failed to fetch appointments: ${err.message}`);
        setLoading(false);
      }
    };

    fetchAppointmentsAndPrescriptions();
  }, []);

  const generatePrescriptionAccessUrl = async (fileKey) => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      // Wait for auth state to be ready
      await new Promise(resolve => {
        const unsubscribe = auth.onAuthStateChanged((u) => {
          if (u) {
            unsubscribe();
            resolve();
          }
        });
      });

      const idToken = await user.getIdToken(true);
      const response = await fetch(
        `https://cdzlnnqd41.execute-api.eu-north-1.amazonaws.com/prod/cloudflareFreshLink?fileKey=${encodeURIComponent(fileKey)}&patientUid=${encodeURIComponent(user.uid)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
            'Accept': 'application/json',
          }
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}. ${errorText}`);
      }

      const data = await response.json();
      if (data.success && data.data && data.data.accessUrl) {
        return data.data.accessUrl;
      } else {
        throw new Error(data.message || 'Failed to generate access URL');
      }

    } catch (error) {
      console.error('Error generating access URL:', error);
      throw error;
    }
  };

  const handleDownload = async (appointmentId) => {
    const prescription = prescriptions[appointmentId];
    if (!prescription) {
      alert("Prescription data not found");
      return;
    }

    setDownloadingPrescription(appointmentId);
    setError(null);

    try {
      let downloadUrl = prescription.accessUrl;

      // If no access URL, generate a fresh one
      if (!downloadUrl) {
        console.log("No access URL found, generating fresh URL for fileKey:", prescription.fileKey);
        downloadUrl = await generatePrescriptionAccessUrl(prescription.fileKey);
      }

      console.log("Downloading from URL:", downloadUrl);
      
      // Attempt direct download via anchor element
      downloadViaAnchor(downloadUrl, prescription.fileName);

    } catch (err) {
      console.error("❌ Failed to download prescription:", err);
      setError(`Failed to download prescription: ${err.message}`);
    } finally {
      setDownloadingPrescription(null);
    }
  };

  // HTML-style anchor download
  const downloadViaAnchor = (url, fileName) => {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.target = '_blank';
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Date not specified";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return "Time not specified";
    const parts = timeString.split('-');
    if (parts.length < 2) return timeString;
    const [startTime, endTime] = parts;
    return `${startTime} - ${endTime}`;
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return null;
    
    // Handle Firestore timestamp
    if (timestamp.seconds) {
      return new Date(timestamp.seconds * 1000).toLocaleDateString();
    }
    
    // Handle regular date string
    try {
      return new Date(timestamp).toLocaleDateString();
    } catch {
      return null;
    }
  };

  if (loading) {
    return (
      <>
        <NavigationBar />
        <Container className="text-center py-5">
          <Spinner animation="border" />
          <p className="mt-3">Loading your appointments...</p>
        </Container>
      </>
    );
  }

  return (
    <>
      <NavigationBar />
      <Container className="py-4">
        <h2 className="mb-4">Your Appointments</h2>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {appointments.length === 0 ? (
          <Alert variant="info">No appointments found.</Alert>
        ) : (
          appointments.map((appt, index) => {
            const presc = prescriptions[appt.id];
            console.log("Rendering appointment:", appt.id, "with prescription:", presc);

            // Calculate if appointment is past
            const appointmentDate = appt.appointmentDate || new Date().toISOString().split('T')[0];
            const appointmentTime = appt.appointmentTime || "00:00-00:00";
            const startTime = appointmentTime.split('-')[0] || "00:00";
            const appointmentDateTime = new Date(`${appointmentDate} ${startTime}`);
            const isPast = appointmentDateTime < new Date();

            // Check if appointment is completed
            const isCompleted = appt.status === 'completed' || appt.completedAt || appt.prescriptionGeneratedAt;
            
            // Check if prescription is available
            const hasPrescriptionAvailable = appt.hasPrescription && appt.prescription && appt.prescription.fileKey;

            return (
              <Card key={appt.id || index} className="mb-3">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <h5 className="mb-1">{formatDate(appointmentDate)}</h5>
                      <p className="text-muted mb-1">{formatTime(appointmentTime)}</p>
                      
                      {/* Show completion status */}
                      {isCompleted && (
                        <small className="text-success d-block">
                          <strong>✓ Completed</strong>
                          {appt.prescriptionGeneratedAt && (
                            <span className="text-muted ms-1">
                              - Prescription generated on {formatTimestamp(appt.prescriptionGeneratedAt)}
                            </span>
                          )}
                        </small>
                      )}
                      
                      {/* Show prescription status */}
                      {hasPrescriptionAvailable && (
                        <small className="text-info d-block">
                          📄 Prescription available
                        </small>
                      )}
                    </div>
                    <span className={`badge ${
                      appt.status === 'completed' ? 'bg-success' :
                      appt.status === 'confirmed' ? 'bg-info' :
                      appt.status === 'pending' ? 'bg-warning' : 'bg-secondary'
                    }`}>
                      {appt.status ? appt.status.charAt(0).toUpperCase() + appt.status.slice(1) : 'Unknown'}
                    </span>
                  </div>

                  <div className="row">
                    <div className="col-md-6">
                      <p className="mb-1"><strong>Doctor:</strong> {appt.doctorName || 'Unknown'}</p>
                      <p className="mb-1"><strong>Specialization:</strong> {appt.specialization || 'Not specified'}</p>
                      <p className="mb-1"><strong>Type:</strong> {
                        appt.appointmentType === 'inPerson' ? 'In-Person' : 
                        appt.appointmentType === 'online' ? 'Online' : 
                        appt.appointmentType || 'Not specified'
                      }</p>
                      <p className="mb-1"><strong>Consultation:</strong> {appt.consultationType || 'Not specified'}</p>
                    </div>
                    <div className="col-md-6">
                      <p className="mb-1"><strong>Fee:</strong> ₹{appt.appointmentFee || appt.fee || 0}</p>
                      <p className="mb-1"><strong>Payment:</strong> {appt.paymentStatus || 'Not specified'}</p>
                      <p className="mb-1"><strong>Receipt:</strong> {appt.receiptNumber || 'Not available'}</p>
                      <p className="mb-1"><strong>Order ID:</strong> {appt.orderId || 'Not available'}</p>
                    </div>
                  </div>

                  {/* Prescription download section */}
                  {hasPrescriptionAvailable && (
                    <div className="mt-3 pt-3 border-top">
                      <div className="d-flex align-items-center gap-2">
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => handleDownload(appt.id)}
                          disabled={downloadingPrescription === appt.id}
                        >
                          {downloadingPrescription === appt.id ? (
                            <>
                              <Spinner size="sm" className="me-2" />
                              Downloading...
                            </>
                          ) : (
                            <>📄 Download Prescription</>
                          )}
                        </Button>
                        <small className="text-muted">
                          {presc?.fileName || appt.prescription.fileName || 'Prescription.pdf'}
                        </small>
                      </div>
                      
                      {/* Show prescription details */}
                      {appt.prescription.medicines && appt.prescription.medicines.length > 0 && (
                        <div className="mt-2">
                          <small className="text-muted">
                            <strong>Medicines prescribed:</strong> {appt.prescription.medicines.length} item(s)
                          </small>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Show message for future appointments */}
                  {!hasPrescriptionAvailable && !isCompleted && (
                    <div className="mt-3 pt-3 border-top">
                      <small className="text-muted">
                        {isPast ? 
                          "Prescription not available for this appointment" :
                          "Prescription will be available after the appointment is completed"
                        }
                      </small>
                    </div>
                  )}

                  {/* Show message for completed appointments without prescription */}
                  {!hasPrescriptionAvailable && isCompleted && (
                    <div className="mt-3 pt-3 border-top">
                      <Button variant="secondary" size="sm" disabled>
                        Prescription Not Available
                      </Button>
                    </div>
                  )}
                </Card.Body>
              </Card>
            );
          })
        )}
      </Container>
    </>
    );
};

export default AppointmentsPage;