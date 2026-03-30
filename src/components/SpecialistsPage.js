import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Container, Row, Col, Card, Button, Spinner } from 'react-bootstrap';
import NavigationBar from './NavigationBar';
import '../styles/SpecialistsPage.css';

const SpecialistsPage = () => {
  const { specialization } = useParams();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'doctors'));
        const allDoctors = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const filteredDoctors = allDoctors.filter(doc =>
          doc.specialization?.toLowerCase() === specialization.toLowerCase()
        );

        setDoctors(filteredDoctors);
      } catch (error) {
        console.error('Error fetching doctors:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDoctors();
  }, [specialization]);

  return (
    <>
      <NavigationBar />

      <Container className="specialists-container">
        <h2 className="section-heading">
          Doctors Specialized in <span className="spec">{specialization}</span>
        </h2>

        {loading ? (
          <div className="text-center my-5">
            <Spinner animation="border" role="status" />
          </div>
        ) : doctors.length === 0 ? (
          <Row className="justify-content-center">
            <Col md={6} lg={4} className="mb-4">
              <Card className="text-center p-4 shadow coming-soon-card">
                <Card.Body>
                  <img
                    src="https://cdn-icons-png.flaticon.com/512/3909/3909444.png"
                    alt="Coming Soon"
                    style={{ width: '80px', marginBottom: '15px' }}
                  />
                  <Card.Title>Coming Soon</Card.Title>
                  <Card.Text>
                    We're currently onboarding specialists in <strong>{specialization}</strong>. Stay tuned!
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        ) : (
          <Row>
            {doctors.map((doctor) => {
              const city = doctor.city || 'Unknown';
              const hospitalId = doctor.hospitalId || doctor["Hospital Id"] || 'Unknown';
              const doctorName = doctor.name || `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim() || 'Unknown Doctor';

              return (
                <Col key={doctor.id} md={6} lg={4} className="mb-4">
                  <Card className="doctor-card">
                    <Card.Body>
                      <div className="doctor-header">
                        <img
                          src={doctor.profileImage || "https://cdn-icons-png.flaticon.com/512/847/847969.png"}
                          alt="Doctor"
                          className="doctor-avatar"
                        />
                        <div>
                          <h5 className="doctor-name">{doctorName}</h5>
                          <small className="doctor-specialization">{doctor.specialization}</small>
                        </div>
                      </div>

                      <div className="doctor-info">
                        <p><strong>Experience:</strong> {doctor.experience || 'N/A'} yrs</p>
                        <p><strong>City:</strong> {city}</p>
                        <p><strong>Rating:</strong> ⭐ {doctor.rating || 'N/A'}</p>
                      </div>

                      <Link
                        to={`/book-appointment/${city}/${hospitalId}/${doctor.id}`}
                        state={{
                          doctorId: doctor.id,
                          doctorName: doctorName,
                          specialization: doctor.specialization,
                          doctorEmail: doctor.email,
                          city,
                          hospitalId,
                        }}
                      >
                        <Button variant="outline-primary" className="w-100 mt-2">
                          Book Appointment
                        </Button>
                      </Link>
                    </Card.Body>
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}
      </Container>
    </>
  );
};

export default SpecialistsPage;