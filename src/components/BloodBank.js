import React, { useState } from "react";
import {
  Container, Row, Col, Card, Form, Button, Alert, Spinner, Badge
} from "react-bootstrap";
import {
  BsDroplet, BsHospital, BsGeoAlt, BsPhone, BsClock, BsSearch
} from "react-icons/bs";
import NavigationBar from "../components/NavigationBar";
import { db } from "../firebase";
import {
  collection, query, where, getDocs, doc, getDoc
} from "firebase/firestore";

const BloodBank = () => {
  const [searchParams, setSearchParams] = useState({
    district: "",
    city: "",
    bloodGroup: ""
  });
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSearchParams(prev => ({
      ...prev,
      [name]: value
    }));
  };

const handleSearch = async (e) => {
  e.preventDefault();

  if (!searchParams.city || !searchParams.bloodGroup) {
    setError("Please fill in all fields");
    return;
  }

  setLoading(true);
  setError("");
  setHasSearched(true);

  try {
    const normalizedCity = searchParams.city.trim().toUpperCase();
    const bloodGroupKey = searchParams.bloodGroup.trim().toUpperCase();

    

    const allHospitalsSnapshot = await getDocs(collection(db, "hospitals"));
    

    const results = [];

    for (const hospitalDoc of allHospitalsSnapshot.docs) {
      const hospitalData = hospitalDoc.data();
      const hospitalCity = hospitalData.city?.trim().toUpperCase();

      if (hospitalCity !== normalizedCity) {
        continue;
      }

      const servicesRef = doc(db, "hospitals", hospitalDoc.id, "services", "bloodBank");
      const servicesSnap = await getDoc(servicesRef);

      if (!servicesSnap.exists()) continue;

      const bloodBankData = servicesSnap.data();
      const availability = bloodBankData[bloodGroupKey];

      if (availability && availability > 0) {
        results.push({
          id: hospitalDoc.id,
          name: hospitalData.name,
          address: hospitalData.address,
          phone: hospitalData.phone,
          district: hospitalData.district,
          city: hospitalData.city,
          bloodAvailability: availability,
          lastUpdated: bloodBankData.lastUpdated?.toDate?.().toLocaleString?.() || "Not available"
        });
      }
    }


    setSearchResults(results);
  } catch (err) {
  
    setError("Error searching blood banks. Please try again.");
  } finally {
    setLoading(false);
  }
};


  const getAvailabilityColor = (count) => {
    if (count >= 20) return "success";
    if (count >= 10) return "warning";
    return "danger";
  };

  const getAvailabilityText = (count) => {
    if (count >= 20) return "Good Stock";
    if (count >= 10) return "Limited Stock";
    return "Low Stock";
  };

  return (
    <>
      <NavigationBar />
      <div className="bg-light py-5">
        <Container>
          <div className="text-center mb-4">
            <div className="d-flex justify-content-center align-items-center mb-3">
              <BsDroplet className="text-danger me-2" size={40} />
              <h1 className="fw-bold mb-0 text-primar">Blood Bank Locator</h1>
            </div>
            <p className="text-muted">Find blood banks and check blood availability in your area</p>
          </div>
        </Container>
      </div>

      <Container className="py-4">
        <Row>
          <Col lg={4} className="mb-4">
            <Card className="shadow border-0 sticky-top">
              <Card.Header className="bg-primary text-white">
                <h5 className="mb-0">
                  <BsSearch className="me-2" />
                  Search Blood Banks
                </h5>
              </Card.Header>
              <Card.Body>
                <Form onSubmit={handleSearch}>
                  <Form.Group className="mb-3">
                    <Form.Label>District</Form.Label>
                    <Form.Select
                      name="district"
                      value={searchParams.district}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select District</option>
                      <option value="Allahabad">Allahabad</option>
                      <option value="Lucknow">Lucknow</option>
                      <option value="Kanpur">Kanpur</option>
                      <option value="Varanasi">Varanasi</option>
                      <option value="Agra">Agra</option>
                      <option value="Meerut">Meerut</option>
                      <option value="Ghaziabad">Ghaziabad</option>
                      <option value="Noida">Noida</option>
                    </Form.Select>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>City</Form.Label>
                    <Form.Control
                      type="text"
                      name="city"
                      value={searchParams.city}
                      onChange={handleInputChange}
                      placeholder="Enter city name"
                      required
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Blood Group</Form.Label>
                    <Form.Select
                      name="bloodGroup"
                      value={searchParams.bloodGroup}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select Blood Group</option>
                      {bloodGroups.map(group => (
                        <option key={group} value={group}>{group}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>

                  {error && <Alert variant="danger">{error}</Alert>}

                  <Button type="submit" variant="primary" className="w-100" disabled={loading}>
                    {loading ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <BsSearch className="me-2" />
                        Search Blood Banks
                      </>
                    )}
                  </Button>
                </Form>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={8}>
            {loading && (
              <div className="text-center py-5">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3">Searching for blood banks...</p>
              </div>
            )}

            {!loading && hasSearched && searchResults.length === 0 && (
              <Card className="text-center py-5">
                <Card.Body>
                  <BsDroplet className="text-muted mb-3" size={60} />
                  <h4 className="text-muted">No Blood Banks Found</h4>
                  <p className="text-muted">
                    No blood banks found with {searchParams.bloodGroup} blood group in {searchParams.city}, {searchParams.district}.
                  </p>
                  <p className="text-muted">Please try searching in a different location or contact nearby hospitals directly.</p>
                </Card.Body>
              </Card>
            )}

            {!loading && searchResults.length > 0 && (
              <>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h4 className="fw-semibold">Search Results ({searchResults.length} found)</h4>
                  <Badge bg="info" className="fs-6">{searchParams.bloodGroup} Blood Group</Badge>
                </div>

                <Row className="g-4">
                  {searchResults.map((hospital) => (
                    <Col md={6} key={hospital.id}>
                      <Card className="h-100 shadow-sm border-0">
                        <Card.Body>
                          <div className="d-flex justify-content-between align-items-start mb-3">
                            <div>
                              <h5 className="fw-bold text">
                                <BsHospital className="me-2" />
                                {hospital.name}
                              </h5>
                              <p className="text-muted small mb-2">
                                <BsGeoAlt className="me-1" />
                                {hospital.address}
                              </p>
                              <p className="text-muted small mb-0">
                                {hospital.city}, {hospital.district}
                              </p>
                            </div>
                            <Badge bg={getAvailabilityColor(hospital.bloodAvailability)} className="fs-6">
                              {hospital.bloodAvailability} Units
                            </Badge>
                          </div>

                          <div className="mb-3">
                            <div className="d-flex justify-content-between align-items-center">
                              <span className="fw-medium">Blood Availability:</span>
                              <Badge bg={getAvailabilityColor(hospital.bloodAvailability)}>
                                {getAvailabilityText(hospital.bloodAvailability)}
                              </Badge>
                            </div>
                          </div>

                          <div className="mb-3">
                            <p className="text-muted small mb-1">
                              <BsClock className="me-1" />
                              Last Updated: {hospital.lastUpdated}
                            </p>
                            {hospital.phone && (
                              <p className="text-muted small mb-0">
                                <BsPhone className="me-1" />
                                Phone: {hospital.phone}
                              </p>
                            )}
                          </div>

                          <div className="d-grid gap-2">
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => window.open(`tel:${hospital.phone}`, '_self')}
                              disabled={!hospital.phone}
                            >
                              <BsPhone className="me-1" />
                              Call Hospital
                            </Button>
                            <Button
                              variant="outline-success"
                              size="sm"
                              onClick={() => {
                                const address = encodeURIComponent(`${hospital.name}, ${hospital.address}, ${hospital.city}`);
                                window.open(`https://maps.google.com/?q=${address}`, '_blank');
                              }}
                            >
                              <BsGeoAlt className="me-1" />
                              Get Directions
                            </Button>
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </>
            )}

            {!hasSearched && (
              <Card className="text-center py-5">
                <Card.Body>
                  <BsDroplet className="text-muted mb-3" size={60} />
                  <h4 className="text-muted">Find Blood Banks Near You</h4>
                  <p className="text-muted">
                    <h4>🚧 This feature is Coming Soon in your city!</h4>
            <p>We're working hard to expand our services. Stay tuned.</p>
                  </p>
                </Card.Body>
              </Card>
            )}
          </Col>
        </Row>
      </Container>
    </>
  );
};

export default BloodBank;
