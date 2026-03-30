import React, { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

const ProfileModal = ({ show, onClose, doctorInfo = {}, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    specialization: '',
  });

  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    setFormData({
      name: doctorInfo?.name || '',
      email: doctorInfo?.email || '',
      phone: doctorInfo?.phone || '',
      specialization: doctorInfo?.specialization || '',
    });
  }, [doctorInfo]);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const profileImageUrl = doctorInfo?.profileImageMeta?.url;

  return (
    <>
      <Modal show={show} onHide={onClose} centered>
        <Modal.Header closeButton>
          <Modal.Title>Edit Profile</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {profileImageUrl && (
            <div className="text-center mb-3">
              <img
                src={profileImageUrl}
                alt="Doctor"
                onClick={() => setZoomed(true)}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "/fallback.png"; // fallback image if loading fails
                }}
                style={{
                  width: '100px',
                  height: '100px',
                  objectFit: 'cover',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  border: '2px solid #ccc'
                }}
              />
              <div style={{ fontSize: '0.85rem', color: '#888' }}>Click to zoom</div>
            </div>
          )}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control name="name" value={formData.name} onChange={handleChange} />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control type="email" name="email" value={formData.email} onChange={handleChange} />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Phone</Form.Label>
              <Form.Control name="phone" value={formData.phone} onChange={handleChange} />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Specialization</Form.Label>
              <Form.Control name="specialization" value={formData.specialization} onChange={handleChange} />
            </Form.Group>

            <Button type="submit" className="w-100">Save Changes</Button>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Zoom Modal */}
      {zoomed && (
        <Modal show={zoomed} onHide={() => setZoomed(false)} centered size="lg">
          <Modal.Body className="text-center p-0">
            <img
              src={profileImageUrl}
              alt="Zoomed"
              style={{
                width: '100%',
                maxHeight: '90vh',
                objectFit: 'contain',
                borderRadius: '8px'
              }}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "/fallback.png";
              }}
            />
          </Modal.Body>
        </Modal>
      )}
    </>
  );
};

export default ProfileModal;
