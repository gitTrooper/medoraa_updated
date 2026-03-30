// Updated AdminPanel.js with correct hospital signup structure and field mappings
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  GeoPoint
} from 'firebase/firestore';
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Modal,
  Table,
  Badge,
  Alert,
  Form,
  Tabs,
  Tab,
  Spinner
} from 'react-bootstrap';
import { FaEye, FaCheck, FaTimes, FaClock, FaUserMd, FaHospital, FaMapMarkerAlt, FaGlobe, FaPhone } from 'react-icons/fa';

const AdminPanel = () => {
  const [pendingDoctors, setPendingDoctors] = useState([]);
  const [pendingHospitals, setPendingHospitals] = useState([]);
  const [selected, setSelected] = useState(null);
  const [type, setType] = useState('doctor');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [alert, setAlert] = useState({ show: false, message: '', type: '' });

  // Fetch pending approvals
  const fetchPending = async () => {
    setFetchLoading(true);
    try {
      // Fetch pending doctors
      const doctorSnap = await getDocs(collection(db, 'tempDoctorSignups'));
      const doctors = doctorSnap.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })).filter(doc => doc.status === 'pending_admin_approval');
      setPendingDoctors(doctors);

      // Fetch pending hospitals
      const hospitalSnap = await getDocs(collection(db, 'tempHospitalSignups'));
      const hospitals = hospitalSnap.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })).filter(doc => doc.status === 'pending_admin_approval');
      setPendingHospitals(hospitals);

      console.log('Fetched pending doctors:', doctors.length);
      console.log('Fetched pending hospitals:', hospitals.length);

    } catch (error) {
      console.error('Fetch error:', error);
      showAlert('Error loading pending approvals', 'danger');
    } finally {
      setFetchLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const showAlert = (message, type) => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: '', type: '' }), 5000);
  };

  // Create hospital document structure matching the signup structure
  const createHospitalDocument = async (hospitalId, hospitalData) => {
    try {
      // Use existing location from signup or create default
      const location = hospitalData.location || new GeoPoint(0, 0);

      // Match the exact structure from HospitalSignupPage createHospitalDocument function
      const finalHospitalData = {
        name: hospitalData.hospitalName,
        hospitalType: hospitalData.hospitalType,
        address: hospitalData.address,
        city: hospitalData.city,
        pincode: hospitalData.pincode,
        location: location,
        phone: hospitalData.phone,
        emergencyPhone: hospitalData.emergencyPhone || "",
        email: hospitalData.email,
        website: hospitalData.website || "",
        emailVerified: true, // Set to true since admin is approving
        userType: "hospital",
        createdAt: hospitalData.submittedAt || new Date().toISOString(),
        isActive: true,
        adminApproved: true,
        approvedAt: serverTimestamp(),
        uid: hospitalData.uid,
        // Include image metadata from signup
        hospitalImages: hospitalData.hospitalImages || [],
        registrationCertificate: hospitalData.registrationCertificate || null
      };

      // Create main hospital document
      await setDoc(doc(db, 'hospitals', hospitalId), finalHospitalData);

      // Create services subcollection exactly as in signup
      const servicesRef = collection(db, 'hospitals', hospitalId, 'services');
      await setDoc(doc(servicesRef, 'bedAvailability'), {
        ICU: 0,
        General: 0,
        Emergency: 0,
        lastUpdated: new Date()
      });

      // Create emergency service document
      await setDoc(doc(servicesRef, 'emergency'), {
        available: false,
        lastUpdated: new Date()
      });

      // Create doctorIds subcollection
      const doctorIdsRef = collection(db, 'hospitals', hospitalId, 'doctorIds');
      await setDoc(doc(doctorIdsRef, 'list'), {
        doctorIds: [],
        lastUpdated: new Date(),
        totalDoctors: 0
      });

      console.log('Hospital document structure created successfully');
      return finalHospitalData;
    } catch (error) {
      console.error('Error creating hospital document:', error);
      throw error;
    }
  };

  // Approve entry (doctor or hospital)
  const approveEntry = async (entry, entryType) => {
    setLoading(true);
    try {
      console.log(`Approving ${entryType}:`, entry);

      if (entryType === 'doctor') {
        // Include consultationMode in approved doctor data
        const approvedDoctorData = {
          firstName: entry.firstName,
          lastName: entry.lastName,
          email: entry.email,
          specialization: entry.specialization,
          licenseNumber: entry.licenseNumber,
          experience: entry.experience,
          qualification: entry.qualification || "",
          userType: "doctor",
          emailVerified: entry.emailVerified || false,
          createdAt: entry.submittedAt || new Date().toISOString(),
          isActive: true,
          adminApproved: true,
          approvedAt: serverTimestamp(),
          approvedBy: 'admin',
          profileImage: entry.profileImage || null,
          profileImageMeta: entry.profileImageMeta || null,
          uid: entry.uid,
          followUpFees: entry.followUpFees || "",
          generalCheckupFees: entry.generalCheckupFees || "",
          specialistFees: entry.specialistFees || "",
          intro: entry.intro || "",
          consultationMode: entry.consultationMode || []
        };

        // Use the UID as document ID
        await setDoc(doc(db, 'doctors', entry.uid), approvedDoctorData);
        
        // Remove from temp collection
        await deleteDoc(doc(db, 'tempDoctorSignups', entry.id));
        
        // Update local state
        setPendingDoctors(prev => prev.filter(d => d.id !== entry.id));
        showAlert(`Doctor ${entry.firstName} ${entry.lastName} approved successfully.`, 'success');

      } else if (entryType === 'hospital') {
        // For hospitals: create complete hospital structure
        await createHospitalDocument(entry.uid, entry);
        
        // Remove from temp collection
        await deleteDoc(doc(db, 'tempHospitalSignups', entry.id));
        
        // Update local state
        setPendingHospitals(prev => prev.filter(h => h.id !== entry.id));
        showAlert(`Hospital ${entry.hospitalName} approved successfully.`, 'success');
      }

    } catch (error) {
      console.error('Approval error:', error);
      showAlert(`Failed to approve ${entryType}. Error: ${error.message}`, 'danger');
    } finally {
      setLoading(false);
    }
  };

  // Reject entry
  const rejectEntry = async (entry, entryType, reason) => {
    if (!reason.trim()) {
      showAlert('Rejection reason is required.', 'warning');
      return;
    }
    
    setLoading(true);
    try {
      const tempPath = entryType === 'doctor' ? 'tempDoctorSignups' : 'tempHospitalSignups';
      
      // Update the temp document with rejection details
      await updateDoc(doc(db, tempPath, entry.id), {
        status: 'rejected',
        rejectedAt: serverTimestamp(),
        rejectedBy: 'admin',
        rejectionReason: reason,
        adminReviewed: true
      });

      // Update local state
      if (entryType === 'doctor') {
        setPendingDoctors(prev => prev.filter(d => d.id !== entry.id));
        showAlert(`Doctor ${entry.firstName} ${entry.lastName} rejected.`, 'info');
      } else {
        setPendingHospitals(prev => prev.filter(h => h.id !== entry.id));
        showAlert(`Hospital ${entry.hospitalName} rejected.`, 'info');
      }

      // Close modal and reset form
      setShowRejectModal(false);
      setRejectionReason('');
      setSelected(null);

    } catch (error) {
      console.error('Rejection error:', error);
      showAlert(`Failed to reject ${entryType}. Error: ${error.message}`, 'danger');
    } finally {
      setLoading(false);
    }
  };

  // Render table for doctors or hospitals
  const renderTable = (data, typeLabel) => {
    if (data.length === 0) {
      return (
        <Alert variant="info" className="text-center">
          No pending {typeLabel} approvals at the moment.
        </Alert>
      );
    }

    return (
      <Table responsive hover className="mt-3">
        <thead className="table-dark">
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>{typeLabel === 'doctor' ? 'Specialization' : 'Type'}</th>
            <th>{typeLabel === 'doctor' ? 'Qualification' : 'City'}</th>
            <th>{typeLabel === 'doctor' ? 'Experience' : 'Phone'}</th>
            <th>Submitted</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map((entry) => (
            <tr key={entry.id}>
              <td>
                <div className="d-flex align-items-center">
                  {/* Profile image for doctors */}
                  {typeLabel === 'doctor' && entry.profileImage && (
                    <img
                      src={entry.profileImage}
                      alt="Profile"
                      className="me-2 rounded-circle"
                      style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                    />
                  )}
                  <strong>
                    {typeLabel === 'doctor' 
                      ? `${entry.firstName} ${entry.lastName}` 
                      : entry.hospitalName}
                  </strong>
                </div>
              </td>
              <td>{entry.email}</td>
              <td>{typeLabel === 'doctor' ? entry.specialization : entry.hospitalType}</td>
              <td>{typeLabel === 'doctor' ? entry.qualification || 'N/A' : entry.city}</td>
              <td>{typeLabel === 'doctor' ? `${entry.experience} years` : entry.phone}</td>
              <td>{new Date(entry.submittedAt).toLocaleDateString()}</td>
              <td>
                <Badge bg="warning">
                  <FaClock className="me-1" />
                  Pending
                </Badge>
              </td>
              <td>
                <div className="btn-group" role="group">
                  <Button 
                    size="sm" 
                    variant="outline-primary"
                    onClick={() => { 
                      setSelected(entry); 
                      setType(typeLabel); 
                      setShowDetailsModal(true); 
                    }}
                    title="View Details"
                  >
                    <FaEye />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="success"
                    onClick={() => approveEntry(entry, typeLabel)} 
                    disabled={loading}
                    title="Approve"
                  >
                    <FaCheck />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="danger"
                    onClick={() => { 
                      setSelected(entry); 
                      setType(typeLabel); 
                      setShowRejectModal(true); 
                    }}
                    disabled={loading}
                    title="Reject"
                  >
                    <FaTimes />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    );
  };

  if (fetchLoading) {
    return (
      <Container className="py-4 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p className="mt-2">Loading pending approvals...</p>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <Row>
        <Col>
          <h2 className="mb-4">
            <FaUserMd className="me-2" />
            Admin Approval Panel
          </h2>
          
          {alert.show && (
            <Alert variant={alert.type} dismissible onClose={() => setAlert({ show: false, message: '', type: '' })}>
              {alert.message}
            </Alert>
          )}

          <Tabs defaultActiveKey="doctors" className="mb-4">
            <Tab 
              eventKey="doctors" 
              title={
                <span>
                  <FaUserMd className="me-2" />
                  Doctors ({pendingDoctors.length})
                </span>
              }
            >
              <Card>
                <Card.Header>
                  <h5 className="mb-0">Pending Doctor Approvals</h5>
                </Card.Header>
                <Card.Body>
                  {renderTable(pendingDoctors, 'doctor')}
                </Card.Body>
              </Card>
            </Tab>
            
            <Tab 
              eventKey="hospitals" 
              title={
                <span>
                  <FaHospital className="me-2" />
                  Hospitals ({pendingHospitals.length})
                </span>
              }
            >
              <Card>
                <Card.Header>
                  <h5 className="mb-0">Pending Hospital Approvals</h5>
                </Card.Header>
                <Card.Body>
                  {renderTable(pendingHospitals, 'hospital')}
                </Card.Body>
              </Card>
            </Tab>
          </Tabs>
        </Col>
      </Row>

      {/* Details Modal */}
      <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {type === 'doctor' ? <FaUserMd className="me-2" /> : <FaHospital className="me-2" />}
            {type === 'doctor' ? 'Doctor' : 'Hospital'} Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selected && (
            <Row>
              <Col md={8}>
                <div className="mb-3">
                  <strong>Name:</strong> {selected.firstName ? `${selected.firstName} ${selected.lastName}` : selected.hospitalName}
                </div>
                <div className="mb-3">
                  <strong>Email:</strong> {selected.email}
                </div>
                
                {type === 'doctor' && (
                  <>
                    <div className="mb-3">
                      <strong>Specialization:</strong> {selected.specialization}
                    </div>
                    <div className="mb-3">
                      <strong>Qualification:</strong> {selected.qualification || 'Not provided'}
                    </div>
                    <div className="mb-3">
                      <strong>License Number:</strong> {selected.licenseNumber}
                    </div>
                    <div className="mb-3">
                      <strong>Experience:</strong> {selected.experience} years
                    </div>
                    <div className="mb-3">
                      <strong>Follow-up Fees:</strong> ₹{selected.followUpFees || 'Not provided'}
                    </div>
                    <div className="mb-3">
                      <strong>General Checkup Fees:</strong> ₹{selected.generalCheckupFees || 'Not provided'}
                    </div>
                    <div className="mb-3">
                      <strong>Specialist Fees:</strong> ₹{selected.specialistFees || 'Not provided'}
                    </div>
                    <div className="mb-3">
                      <strong>Consultation Mode:</strong>
                      <div className="mt-1">
                        {selected.consultationMode && selected.consultationMode.length > 0 ? 
                          selected.consultationMode.map((mode, index) => (
                            <Badge key={index} bg="primary" className="me-1">
                              {mode}
                            </Badge>
                          )) : 
                          <span className="text-muted">Not specified</span>
                        }
                      </div>
                    </div>
                    {selected.intro && (
                      <div className="mb-3">
                        <strong>Introduction:</strong>
                        <p className="mt-1 text-muted">{selected.intro}</p>
                      </div>
                    )}
                  </>
                )}
                
                {type === 'hospital' && (
                  <>
                    <div className="mb-3">
                      <strong>Hospital Type:</strong> 
                      <Badge bg="info" className="ms-2">{selected.hospitalType}</Badge>
                    </div>
                    <div className="mb-3">
                      <strong>Address:</strong> {selected.address}
                    </div>
                    <div className="mb-3">
                      <strong>City:</strong> {selected.city}
                    </div>
                    <div className="mb-3">
                      <strong>Pincode:</strong> {selected.pincode}
                    </div>
                    <div className="mb-3">
                      <strong>Main Phone:</strong> 
                      <FaPhone className="ms-2 me-1 text-primary" />
                      {selected.phone}
                    </div>
                    {selected.emergencyPhone && (
                      <div className="mb-3">
                        <strong>Emergency Phone:</strong> 
                        <FaPhone className="ms-2 me-1 text-danger" />
                        {selected.emergencyPhone}
                      </div>
                    )}
                    {selected.website && (
                      <div className="mb-3">
                        <strong>Website:</strong> 
                        <a href={selected.website} target="_blank" rel="noopener noreferrer" className="ms-2">
                          <FaGlobe className="me-1" />
                          {selected.website}
                        </a>
                      </div>
                    )}
                    {selected.location && (
                      <div className="mb-3">
                        <strong>Location:</strong>
                        <div className="mt-1">
                          <FaMapMarkerAlt className="me-1 text-danger" />
                          Lat: {selected.location.latitude?.toFixed(6) || selected.location._latitude?.toFixed(6) || 'N/A'}, 
                          Lng: {selected.location.longitude?.toFixed(6) || selected.location._longitude?.toFixed(6) || 'N/A'}
                        </div>
                      </div>
                    )}
                  </>
                )}
                
                <div className="mb-3">
                  <strong>Submitted:</strong> {new Date(selected.submittedAt).toLocaleString()}
                </div>
                <div className="mb-3">
                  <strong>User ID:</strong> {selected.uid}
                </div>
                <div className="mb-3">
                  <strong>Request ID:</strong> {selected.requestId || 'N/A'}
                </div>
              </Col>
              
              <Col md={4}>
                {/* Doctor profile image */}
                {type === 'doctor' && selected.profileImage && (
                  <div className="mb-3">
                    <strong>Profile Picture:</strong>
                    <img
                      src={selected.profileImage}
                      alt="Doctor Profile"
                      className="img-thumbnail mt-2 d-block"
                      style={{ maxHeight: '200px', width: 'auto' }}
                    />
                  </div>
                )}

                {/* Hospital images */}
                {type === 'hospital' && selected.hospitalImages?.length > 0 && (
                  <div className="mb-3">
                    <strong>Hospital Images ({selected.hospitalImages.length}):</strong>
                    <div className="row g-2 mt-1">
                      {selected.hospitalImages.map((img, idx) => (
                        <div key={idx} className="col-6">
                          <img
                            src={img.url}
                            alt={`Hospital ${idx + 1}`}
                            className="img-thumbnail w-100"
                            style={{ height: '80px', objectFit: 'cover', cursor: 'pointer' }}
                            onClick={() => window.open(img.url, '_blank')}
                            title="Click to view full image"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hospital registration certificate */}
                {type === 'hospital' && selected.registrationCertificate && (
                  <div className="mt-3">
                    <strong>Registration Certificate:</strong>
                    <div className="mt-2">
                      {selected.registrationCertificate.type?.includes('pdf') ? (
                        <div className="text-center p-3 border rounded">
                          <i className="fas fa-file-pdf text-danger" style={{ fontSize: '2rem' }}></i>
                          <p className="mt-2 mb-0">PDF Certificate</p>
                          <p className="small text-muted">{selected.registrationCertificate.name}</p>
                          <a 
                            href={selected.registrationCertificate.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-outline-primary mt-2"
                          >
                            View PDF
                          </a>
                        </div>
                      ) : (
                        <div className="text-center">
                          <img
                            src={selected.registrationCertificate.url}
                            alt="Registration Certificate"
                            className="img-thumbnail"
                            style={{ maxHeight: '150px', width: 'auto', cursor: 'pointer' }}
                            onClick={() => window.open(selected.registrationCertificate.url, '_blank')}
                            title="Click to view full image"
                          />
                          <p className="small text-muted mt-1">{selected.registrationCertificate.name}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Col>
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>
            Close
          </Button>
          {selected && (
            <div className="ms-auto">
              <Button 
                variant="success" 
                className="me-2"
                onClick={() => {
                  setShowDetailsModal(false);
                  approveEntry(selected, type);
                }} 
                disabled={loading}
              >
                <FaCheck className="me-1" />
                Approve
              </Button>
              <Button 
                variant="danger"
                onClick={() => {
                  setShowDetailsModal(false);
                  setShowRejectModal(true);
                }} 
                disabled={loading}
              >
                <FaTimes className="me-1" />
                Reject
              </Button>
            </div>
          )}
        </Modal.Footer>
      </Modal>

      {/* Rejection Modal */}
      <Modal show={showRejectModal} onHide={() => setShowRejectModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            <FaTimes className="me-2 text-danger" />
            Reject {type === 'doctor' ? 'Doctor' : 'Hospital'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            Are you sure you want to reject{' '}
            <strong>
              {selected && (selected.firstName ? `${selected.firstName} ${selected.lastName}` : selected.hospitalName)}
            </strong>
            ?
          </p>
          <Form.Group className="mb-3">
            <Form.Label>Reason for rejection <span className="text-danger">*</span></Form.Label>
            <Form.Control 
              as="textarea" 
              rows={3} 
              value={rejectionReason} 
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Please provide a clear reason for rejection..."
            />
            <Form.Text className="text-muted">
              This reason will be stored for record keeping and potential future reference.
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRejectModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="danger" 
            onClick={() => rejectEntry(selected, type, rejectionReason)} 
            disabled={loading || !rejectionReason.trim()}
          >
            {loading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Rejecting...
              </>
            ) : (
              <>
                <FaTimes className="me-2" />
                Reject
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default AdminPanel;
