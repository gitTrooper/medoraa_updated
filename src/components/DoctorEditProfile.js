// File: DoctorEditProfile.jsx
import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Button, Form, Card, Row, Col } from 'react-bootstrap';

const DoctorEditProfile = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    specialization: '',
    licenseNumber: '',
    experience: '',
    phone: '',
    intro: '',
    followUpFees: '',
    generalCheckupFees: '',
    specialistFees: ''
  });

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchDoctorData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const docRef = doc(db, 'doctors', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setFormData({
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          specialization: data.specialization || '',
          licenseNumber: data.licenseNumber || '',
          experience: data.experience || '',
          phone: data.phone || '',
          intro: data.intro || '',
          followUpFees: data.followUpFees || '',
          generalCheckupFees: data.generalCheckupFees || '',
          specialistFees: data.specialistFees || ''
        });
      }
    } catch (error) {
      console.error('Error fetching doctor data:', error);
    }
  };

  useEffect(() => {
    fetchDoctorData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const user = auth.currentUser;
      if (!user) return;
      const docRef = doc(db, 'doctors', user.uid);

      await updateDoc(docRef, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        specialization: formData.specialization,
        licenseNumber: formData.licenseNumber,
        experience: formData.experience,
        phone: formData.phone,
        intro: formData.intro,
        followUpFees: formData.followUpFees,
        generalCheckupFees: formData.generalCheckupFees,
        specialistFees: formData.specialistFees
      });

      setSuccessMsg('Profile updated successfully.');
    } catch (error) {
      console.error('Update failed:', error);
      setErrorMsg('Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4 shadow-sm">
      <h4 className="mb-4">Edit Doctor Profile</h4>

      <Form onSubmit={handleSubmit}>
        <Row>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>First Name</Form.Label>
              <Form.Control
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
              />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Last Name</Form.Label>
              <Form.Control
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
              />
            </Form.Group>
          </Col>
        </Row>

        <Form.Group className="mb-3">
          <Form.Label>Specialization</Form.Label>
          <Form.Control
            type="text"
            name="specialization"
            value={formData.specialization}
            onChange={handleChange}
            required
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>License Number</Form.Label>
          <Form.Control
            type="text"
            name="licenseNumber"
            value={formData.licenseNumber}
            onChange={handleChange}
            required
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Experience (in years)</Form.Label>
          <Form.Control
            type="number"
            name="experience"
            value={formData.experience}
            onChange={handleChange}
            required
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Phone Number</Form.Label>
          <Form.Control
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Short Bio / Intro</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            name="intro"
            value={formData.intro}
            onChange={handleChange}
            placeholder="Tell patients a little about yourself..."
          />
        </Form.Group>

        <Row>
          <Col md={4}>
            <Form.Group className="mb-3">
              <Form.Label>Follow-up Fees (₹)</Form.Label>
              <Form.Control
                type="number"
                name="followUpFees"
                value={formData.followUpFees}
                onChange={handleChange}
              />
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group className="mb-3">
              <Form.Label>General Check-up Fees (₹)</Form.Label>
              <Form.Control
                type="number"
                name="generalCheckupFees"
                value={formData.generalCheckupFees}
                onChange={handleChange}
              />
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group className="mb-3">
              <Form.Label>Specialist Fees (₹)</Form.Label>
              <Form.Control
                type="number"
                name="specialistFees"
                value={formData.specialistFees}
                onChange={handleChange}
              />
            </Form.Group>
          </Col>
        </Row>

        <Button type="submit" variant="success" disabled={loading}>
          {loading ? 'Updating...' : 'Update Profile'}
        </Button>

        {successMsg && <p className="text-success mt-3">{successMsg}</p>}
        {errorMsg && <p className="text-danger mt-3">{errorMsg}</p>}
      </Form>
    </Card>
  );
};

export default DoctorEditProfile;
