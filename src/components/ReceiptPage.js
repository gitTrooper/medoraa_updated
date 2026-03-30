import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { getAuth } from "firebase/auth";
import { collection, addDoc } from "firebase/firestore";
import { doc, getDoc, setDoc } from "firebase/firestore";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import "../styles/ReceiptPage.css";

const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result); // base64 string
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const uploadToCloudflare = async (pdfBlob, fileName) => {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");

  const idToken = await user.getIdToken();

  const base64Data = await blobToBase64(pdfBlob); // 🔁 encode to base64

  const payload = {
    fileName,
    fileType: "invoice", // 💡 distinguish from prescription
    fileData: base64Data,
  };

  const response = await fetch(
    "https://r32usspts7.execute-api.eu-north-1.amazonaws.com/prod/cloudflareStorageApi",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(payload),
    }
  );

  let result;
  try {
    result = await response.json();
  } catch (e) {
    throw new Error("Upload failed: Server did not return JSON");
  }

  console.log("📥 API Response:", result);

  if (!result.success) {
    throw new Error("Upload failed: " + JSON.stringify(result));
  }

  return result.fileDetails;
};



const ReceiptPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const appointmentId = searchParams.get("appointmentId");

  useEffect(() => {
    const fetchData = async () => {
      if (!appointmentId) {
        navigate("/");
        return;
      }

      try {
        const docRef = doc(db, "appointments", appointmentId);
        const snap = await getDoc(docRef);

        if (snap.exists()) {
          setData(snap.data());
        } else {
          alert("Appointment not found.");
          navigate("/");
        }
      } catch (err) {
        console.error("Error fetching receipt data:", err);
        alert("Something went wrong.");
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [appointmentId, navigate]);

  const formatDate = (str) => {
    const d = new Date(str);
    return `${d.getDate()}-${d.toLocaleString("default", { month: "short" })}-${d.getFullYear()}`;
  };

  const formatDateTime = (str) => {
    const d = new Date(str);
    return d.toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

const generatePDF = async () => {
  const element = document.getElementById("receipt-content");

  if (!element) {
    console.error("❌ Element with ID 'receipt-content' not found.");
    alert("Unable to find invoice content on page.");
    return;
  }

  try {
    // Give DOM time to settle
    await new Promise((res) => setTimeout(res, 300));

    // Convert HTML to canvas
    const canvas = await html2canvas(element, {
      scale: 1,
      useCORS: true,
      backgroundColor: "#ffffff",
    });

    // Prepare PDF
    const imgData = canvas.toDataURL("image/jpeg", 0.8);
    const pdf = new jsPDF("p", "mm", "a4");
    const imgWidth = 210;
    const pageHeight = 295;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    // Convert PDF to blob
    const pdfBlob = pdf.output("blob");

    if (!pdfBlob || pdfBlob.size === 0) {
      console.error("❌ PDF Blob is empty");
      alert("Failed to generate invoice");
      return;
    }

    // Construct file name
    const fileName = `Invoice_${data.paymentId}_${formatDate(data.createdAt)}.pdf`;
    console.log("📄 Generated PDF:", fileName);

    // Upload to Cloudflare
    const fileDetails = await uploadToCloudflare(pdfBlob, fileName);

    // Save file metadata to Firestore
    const auth = getAuth();
    const user = auth.currentUser;

    if (user) {
      await addDoc(collection(db, `users/${user.uid}/invoices`), {
        fileKey: fileDetails.fileKey,
        fileName: fileDetails.fileName,
        accessUrl: fileDetails.accessUrl,
        appointmentId: appointmentId,
        paymentId: data.paymentId,
        patientName: data.patientName,
        phone: data.phone,
        doctorName: data.doctorName,
        specialization: data.specialization,
        hospitalId: data.hospitalId,
        fee: data.fee,
        createdAt: new Date(),
      });

      alert("✅ Invoice uploaded successfully!");
      console.log("📎 Access URL:", fileDetails.accessUrl);

      // Open uploaded invoice
      window.open(fileDetails.accessUrl, "_blank");
    } else {
      console.warn("⚠️ User not found during Firestore save.");
    }

  } catch (error) {
    console.error("❌ Upload error:", error);
    alert("Failed to upload invoice.");
  }
};




  


const downloadPDF = async () => {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) return;

  const idToken = await user.getIdToken();

  const fileKey = 'your-stored-fileKey-from-firestore'; // Load from Firestore

  const url = new URL("https://cdzlnnqd41.execute-api.eu-north-1.amazonaws.com/prod/cloudflareFreshLink");
  url.searchParams.append("fileKey", fileKey);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  const result = await response.json();

  if (result.success) {
    window.open(result.data.accessUrl, "_blank"); // or force download
  } else {
    alert("Failed to fetch download link");
  }
};




  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="container-fluid bg-light min-vh-100 d-flex align-items-center justify-content-center">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3 text-muted">Loading receipt...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container-fluid bg-light min-vh-100 d-flex align-items-center justify-content-center">
        <div className="text-center">
          <h3>Receipt not found</h3>
          <button onClick={() => navigate("/")} className="btn btn-primary mt-3">
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  const {
    patientName, phone, appointmentDate, appointmentTime,
    consultationType, appointmentType, doctorName, specialization,
    doctorEmail, city, hospitalId, fee, paymentId, createdAt
  } = data;

  // Calculate breakdown (similar to Java code structure)
  const doctorFee = Math.round(fee * 0.75);
  const platformFee = Math.round(fee * 0.15);
  const gst = fee - doctorFee - platformFee;

  return (
    <>
      <div className="container-fluid bg-light py-4 receipt-page" style={{ minHeight: '100vh' }}>
        <div className="row justify-content-center">
          <div className="col-lg-8 col-xl-7">
            <div className="card shadow-lg border-0">
              <div className="card-body p-5" id="receipt-content">
                
                {/* Header Section */}
                <div className="row mb-4 header-section">
                  <div className="col-md-4 d-flex align-items-center">
                    <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center company-logo" 
                         style={{ width: '80px', height: '80px' }}>
                      <span className="text-white" style={{ fontSize: '2rem' }}>🏥</span>
                    </div>
                  </div>
                  <div className="col-md-8 text-md-end company-details">
                    <h3 className="text-dark-gray mb-1 fw-bold">MediVeda Healthcare</h3>
                    <p className="text-muted mb-1 small">123 Healthcare Street, Medical District</p>
                    <p className="text-muted mb-0 small">contact@mediveda.com</p>
                  </div>
                </div>

                {/* Title */}
                <div className="text-center mb-4 title-section">
                  <h2 className="fw-bold text-dark mb-3">APPOINTMENT RECEIPT</h2>
                  <hr className="border-2 opacity-25" />
                </div>

                {/* Invoice Details */}
                <div className="row mb-4 invoice-details">
                  <div className="col-md-3">
                    <div className="mb-3">
                      <small className="text-muted fw-semibold d-block">Invoice Number</small>
                      <span className="fw-medium">{paymentId}</span>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="mb-3">
                      <small className="text-muted fw-semibold d-block">Date</small>
                      <span className="fw-medium">{formatDate(createdAt)}</span>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="mb-3">
                      <small className="text-muted fw-semibold d-block">Patient ID</small>
                      <span className="fw-medium">{appointmentId?.substring(0, 8).toUpperCase()}</span>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="mb-3">
                      <small className="text-muted fw-semibold d-block">Hospital ID</small>
                      <span className="fw-medium">{hospitalId}</span>
                    </div>
                  </div>
                </div>

                {/* Patient & Doctor Details */}
                <div className="mb-4 patient-doctor-section">
                  <h5 className="text-dark-gray fw-bold mb-3">PATIENT DETAILS</h5>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="bg-light p-4 rounded border h-100 patient-info">
                        <h6 className="fw-semibold mb-3 text-primary">Patient Information</h6>
                        <p className="mb-2"><strong>Patient Name:</strong> {patientName}</p>
                        <p className="mb-2"><strong>Phone:</strong> {phone}</p>
                        <p className="mb-2"><strong>City:</strong> {city}</p>
                        <p className="mb-0"><strong>Consultation Type:</strong> {consultationType}</p>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="bg-light p-4 rounded border h-100 doctor-info">
                        <h6 className="fw-semibold mb-3 text-success">Doctor Information</h6>
                        <p className="mb-2"><strong>Doctor:</strong> Dr. {doctorName}</p>
                        <p className="mb-2"><strong>Speciality:</strong> {specialization}</p>
                        <p className="mb-2"><strong>Email:</strong> {doctorEmail}</p>
                        <p className="mb-0"><strong>Appointment Type:</strong> {appointmentType === "inPerson" ? "In Doctor Chamber" : "Video Call"}</p>
                      </div>
                    </div>
                  </div>
                </div>

               
                {/* Charges Breakdown */}
                <div className="mb-4 charges-section">
                  <h5 className="text-dark-gray fw-bold mb-3">CHARGES BREAKDOWN</h5>
                  <div className="table-responsive">
                    <table className="table table-sm charges-table">
                      <thead className="table-primary">
                        <tr>
                          <th className="fw-semibold">Description</th>
                          <th className="fw-semibold text-end">Rate</th>
                          <th className="fw-semibold text-end">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Doctor Consultation Fees</td>
                          <td className="text-end">1</td>
                          <td className="text-end">₹{doctorFee.toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td>Platform Fees</td>
                          <td className="text-end">1</td>
                          <td className="text-end">₹{platformFee.toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td>GST (18%)</td>
                          <td className="text-end">1</td>
                          <td className="text-end">₹{gst.toFixed(2)}</td>
                        </tr>
                        <tr className="border-top border-2 total-row">
                          <td colSpan="2" className="fw-bold text-end bg-light py-3">TOTAL AMOUNT</td>
                          <td className="fw-bold text-end bg-light py-3 fs-5 text-primary">₹{fee.toFixed(2)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Footer */}
                <div className="text-center border-top pt-4 footer-section">
                  <div className="mb-3">
                    <h6 className="fw-bold text-success">Thank you for choosing our services!</h6>
                  </div>
                  
                  <div className="row text-start">
                    <div className="col-12">
                      <small className="text-muted disclaimer">
                        <strong>Disclaimer:</strong> This receipt is generated electronically and is valid for all medical and insurance purposes. 
                        Please keep this receipt for your records and future reference.
                      </small>
                    </div>
                  </div>
                  
                  <div className="row text-start mt-3">
                    <div className="col-12">
                      <small className="text-muted terms">
                        <strong>Terms & Conditions:</strong> All appointments are subject to doctor availability. 
                        Cancellation policy applies as per terms. For any queries, please contact our support team.
                      </small>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <small className="text-muted generated-time">
                      Generated on: {formatDateTime(new Date())}
                    </small>
                  </div>
                </div>

              </div>
            </div>

            {/* Action Buttons */}
            <div className="text-center mt-4 d-print-none action-buttons">
              <button 
                onClick={handlePrint}
                className="btn btn-primary btn-lg me-3"
              >
                📄 Print Receipt
              </button>
              <button 
                onClick={generatePDF}
                className="btn btn-success btn-lg me-3"
              >
                📥 Download PDF
              </button>
              

              <button 
                onClick={() => navigate("/")}
                className="btn btn-outline-secondary btn-lg"
              >
                🏠 Back to Home
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Enhanced Print & PDF Styles */}
      <style>{`
        .text-dark-gray {
          color: #495057 !important;
        }
        
        .border-4 {
          border-width: 4px !important;
        }

        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          @page {
            size: A4;
            margin: 0.75in;
          }
          
          body { 
            background: white !important; 
            font-size: 11pt !important;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important;
            line-height: 1.4 !important;
          }
          
          .receipt-page {
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          
          .container-fluid { 
            background: white !important; 
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: none !important;
          }
          
          .row {
            margin: 0 !important;
          }
          
          .col-lg-8, .col-xl-7 {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
          }
          
          .card { 
            box-shadow: none !important; 
            border: none !important;
            margin: 0 !important;
            background: white !important;
          }
          
          .card-body {
            padding: 15px !important;
          }
          
          .bg-light { 
            background: #f8f9fa !important; 
            border: 1px solid #e9ecef !important;
          }
          
          .patient-info, .doctor-info {
            background: #f8f9fa !important;
            border: 1px solid #e9ecef !important;
          }
          
          .table-primary th {
            background-color: #0d6efd !important;
            color: white !important;
            border-color: #0d6efd !important;
          }
          
          .charges-table {
            border: 1px solid #dee2e6 !important;
          }
          
          .charges-table th,
          .charges-table td {
            border: 1px solid #dee2e6 !important;
            padding: 8px !important;
          }
          
          .total-row td {
            background: #f8f9fa !important;
            border-top: 2px solid #dee2e6 !important;
          }
          
          .text-primary {
            color: #0d6efd !important;
          }
          
          .text-success {
            color: #198754 !important;
          }
          
          .text-info {
            color: #0dcaf0 !important;
          }
          
          .border-info {
            border-color: #0dcaf0 !important;
          }
          
          .bg-info {
            background-color: rgba(13, 202, 240, 0.1) !important;
          }
          
          .bg-primary {
            background-color: #0d6efd !important;
          }
          
          .company-logo {
            background-color: #0d6efd !important;
            color: white !important;
          }
          
          .table {
            font-size: 10pt !important;
          }
          
          .table th, .table td {
            padding: 6px !important;
            border-color: #dee2e6 !important;
          }
          
          h2 {
            font-size: 18pt !important;
            margin-bottom: 15px !important;
          }
          
          h3 {
            font-size: 14pt !important;
          }
          
          h5 {
            font-size: 12pt !important;
          }
          
          h6 {
            font-size: 11pt !important;
          }
          
          .fs-5 {
            font-size: 12pt !important;
          }
          
          small {
            font-size: 9pt !important;
          }
          
          .d-print-none {
            display: none !important;
          }
          
          .border-top {
            border-top: 1px solid #dee2e6 !important;
          }
          
          .border-2 {
            border-width: 2px !important;
          }
          
          .border-4 {
            border-width: 3px !important;
          }
          
          .border-start {
            border-left: 3px solid #0dcaf0 !important;
          }
          
          .opacity-25 {
            opacity: 0.25 !important;
          }
          
          .mb-1, .mb-2, .mb-3, .mb-4 {
            margin-bottom: 8px !important;
          }
          
          .mt-3, .mt-4 {
            margin-top: 8px !important;
          }
          
          .py-3 {
            padding-top: 8px !important;
            padding-bottom: 8px !important;
          }
          
          .p-3, .p-4 {
            padding: 10px !important;
          }
          
          .pt-4 {
            padding-top: 12px !important;
          }
          
          .rounded {
            border-radius: 0.375rem !important;
          }
          
          .rounded-circle {
            border-radius: 50% !important;
            width: 60px !important;
            height: 60px !important;
          }
          
          .shadow-lg {
            box-shadow: none !important;
          }
          
          .footer-section {
            border-top: 1px solid #dee2e6 !important;
            padding-top: 15px !important;
          }
          
          .disclaimer, .terms, .generated-time {
            font-size: 8pt !important;
            line-height: 1.3 !important;
          }
        }
      `}</style>
    </>
  );
};

export default ReceiptPage;