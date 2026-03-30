import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { db, auth } from "../firebase";
import { doc, getDoc, updateDoc, collection, addDoc, setDoc } from "firebase/firestore";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/* ─── INLINE STYLES (no Bootstrap dependency for the new UI) ─────────────── */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .rx-root {
    --emerald:   #059669;
    --emerald-l: #d1fae5;
    --emerald-d: #064e3b;
    --slate:     #0f172a;
    --slate-m:   #334155;
    --slate-l:   #94a3b8;
    --slate-xl:  #f1f5f9;
    --white:     #ffffff;
    --red:       #dc2626;
    --amber:     #d97706;
    --blue:      #2563eb;
    --border:    #e2e8f0;
    --shadow-sm: 0 1px 3px rgba(0,0,0,.08);
    --shadow-md: 0 4px 16px rgba(0,0,0,.10);
    --shadow-lg: 0 12px 40px rgba(0,0,0,.14);
    --radius:    12px;
    font-family: 'DM Sans', sans-serif;
    background: #f0f4f8;
    min-height: 100vh;
    padding: 32px 16px 80px;
    color: var(--slate);
  }

  /* ── layout ── */
  .rx-page { max-width: 960px; margin: 0 auto; }

  /* ── top toolbar ── */
  .rx-toolbar {
    display: flex; align-items: center; gap: 12px;
    margin-bottom: 24px; flex-wrap: wrap;
  }
  .rx-back-btn {
    display: flex; align-items: center; gap: 6px;
    background: var(--white); border: 1.5px solid var(--border);
    border-radius: 8px; padding: 8px 14px; font-size: 13px;
    font-weight: 500; color: var(--slate-m); cursor: pointer;
    transition: all .18s; text-decoration: none;
  }
  .rx-back-btn:hover { background: var(--slate-xl); border-color: var(--slate-l); }

  .rx-toolbar-title {
    font-family: 'Playfair Display', serif;
    font-size: 22px; font-weight: 700; color: var(--slate);
    margin-left: auto;
  }
  .rx-status-badge {
    padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;
    letter-spacing: .4px; text-transform: uppercase;
  }
  .rx-status-badge.completed { background: var(--emerald-l); color: var(--emerald-d); }
  .rx-status-badge.pending   { background: #fef3c7; color: #92400e; }

  /* ── alert ── */
  .rx-alert {
    display: flex; align-items: flex-start; gap: 10px;
    padding: 14px 18px; border-radius: var(--radius);
    margin-bottom: 18px; font-size: 14px; font-weight: 500;
    animation: slideIn .3s ease;
  }
  .rx-alert.success { background: #ecfdf5; border-left: 4px solid var(--emerald); color: var(--emerald-d); }
  .rx-alert.danger  { background: #fef2f2; border-left: 4px solid var(--red);     color: #7f1d1d; }
  .rx-alert.warning { background: #fffbeb; border-left: 4px solid var(--amber);   color: #78350f; }
  .rx-alert.info    { background: #eff6ff; border-left: 4px solid var(--blue);    color: #1e3a8a; }
  .rx-alert-close { margin-left: auto; background: none; border: none; cursor: pointer; opacity: .5; font-size: 18px; line-height: 1; }
  .rx-alert-close:hover { opacity: 1; }
  @keyframes slideIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: none; } }

  /* ── card ── */
  .rx-card {
    background: var(--white); border-radius: var(--radius);
    box-shadow: var(--shadow-sm); border: 1px solid var(--border);
    overflow: visible;
    margin-bottom: 20px;
  }
  .rx-card-header {
    display: flex; align-items: center; gap: 10px;
    padding: 16px 22px; border-bottom: 1px solid var(--border);
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    border-radius: var(--radius) var(--radius) 0 0;
  }
  .rx-card-icon {
    width: 36px; height: 36px; border-radius: 9px;
    display: flex; align-items: center; justify-content: center;
    font-size: 17px; flex-shrink: 0;
  }
  .rx-card-icon.green  { background: var(--emerald-l); }
  .rx-card-icon.blue   { background: #dbeafe; }
  .rx-card-icon.purple { background: #ede9fe; }
  .rx-card-icon.amber  { background: #fef3c7; }
  .rx-card-title { font-weight: 600; font-size: 15px; color: var(--slate); }
  .rx-card-subtitle { font-size: 12px; color: var(--slate-l); margin-top: 1px; }
  .rx-card-body { padding: 20px 22px; overflow: visible; }

  /* ── prescription paper ── */
  .prescription-paper {
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto 28px;
    background: var(--white);
    box-shadow: var(--shadow-lg);
    border-radius: 4px;
    overflow: hidden;
    font-family: 'DM Sans', sans-serif;
    position: relative;
    display: flex;
    flex-direction: column;
  }

  /* letterhead */
  .rx-letterhead {
    background: linear-gradient(135deg, var(--emerald-d) 0%, #065f46 50%, #047857 100%);
    padding: 24px 30px 20px;
    color: white;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    position: relative;
    overflow: hidden;
  }
  .rx-letterhead::before {
    content: '';
    position: absolute; top: -40px; right: -40px;
    width: 160px; height: 160px;
    border-radius: 50%;
    background: rgba(255,255,255,.06);
  }
  .rx-letterhead::after {
    content: '';
    position: absolute; bottom: -50px; right: 80px;
    width: 100px; height: 100px;
    border-radius: 50%;
    background: rgba(255,255,255,.04);
  }
  .rx-doc-name {
    font-family: 'Playfair Display', serif;
    font-size: 24px; font-weight: 700; letter-spacing: -.3px;
    margin-bottom: 4px;
  }
  .rx-doc-spec {
    font-size: 12px; font-weight: 500; letter-spacing: 1.2px;
    text-transform: uppercase; opacity: .85; margin-bottom: 8px;
  }
  .rx-doc-contact {
    font-size: 12px; opacity: .75; display: flex; flex-direction: column; gap: 2px;
  }
  .rx-clinic-logo {
    text-align: right; position: relative; z-index: 1;
  }
  .rx-clinic-emblem {
    width: 64px; height: 64px; background: rgba(255,255,255,.15);
    border-radius: 50%; display: flex; align-items: center;
    justify-content: center; font-size: 28px; margin-left: auto; margin-bottom: 6px;
    border: 2px solid rgba(255,255,255,.3);
  }
  .rx-clinic-name {
    font-size: 13px; font-weight: 600; opacity: .9;
  }
  .rx-reg-no {
    font-size: 10px; opacity: .65; margin-top: 2px;
  }

  /* thin accent bar */
  .rx-accent-bar {
    height: 4px;
    background: linear-gradient(90deg, var(--emerald) 0%, #34d399 50%, var(--emerald-d) 100%);
  }

  /* patient strip */
  .rx-patient-strip {
    padding: 14px 30px;
    background: #f8fffe;
    border-bottom: 1px solid #dcfce7;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
  }
  .rx-patient-field label {
    font-size: 10px; font-weight: 600; letter-spacing: .8px;
    text-transform: uppercase; color: var(--slate-l); display: block; margin-bottom: 2px;
  }
  .rx-patient-field span {
    font-size: 13px; font-weight: 600; color: var(--slate);
  }

  /* body layout */
  .rx-body {
    flex: 1; display: flex;
  }
  .rx-sidebar {
    width: 110px;
    background: #f8fafc;
    border-right: 1px solid var(--border);
    padding: 20px 14px;
    display: flex; flex-direction: column; gap: 18px;
  }
  .rx-sidebar-item {
    font-size: 10px; font-weight: 600; letter-spacing: .6px;
    text-transform: uppercase; color: var(--slate-l);
    padding-bottom: 14px;
    border-bottom: 1px dashed var(--border);
  }
  .rx-sidebar-item:last-child { border-bottom: none; }

  .rx-content {
    flex: 1; padding: 20px 26px; position: relative;
  }
  .rx-symbol {
    font-family: 'Playfair Display', serif;
    font-size: 52px; color: #d1fae5;
    position: absolute; top: 8px; left: 10px;
    line-height: 1; font-weight: 700; pointer-events: none;
    user-select: none;
  }

  /* section within content */
  .rx-section { margin-bottom: 20px; position: relative; }
  .rx-section-label {
    font-size: 10px; font-weight: 700; letter-spacing: 1px;
    text-transform: uppercase; color: var(--emerald);
    display: flex; align-items: center; gap: 6px;
    margin-bottom: 10px;
  }
  .rx-section-label::after {
    content: ''; flex: 1; height: 1px; background: var(--emerald-l);
  }

  /* medicine table */
  .rx-med-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
  .rx-med-table thead tr { background: var(--slate-xl); }
  .rx-med-table th {
    padding: 7px 10px; text-align: left; font-size: 10px;
    font-weight: 700; letter-spacing: .7px; text-transform: uppercase;
    color: var(--slate-l); border-bottom: 2px solid var(--border);
  }
  .rx-med-table td {
    padding: 8px 10px; border-bottom: 1px solid #f1f5f9;
    color: var(--slate); vertical-align: middle;
  }
  .rx-med-table tr:last-child td { border-bottom: none; }
  .rx-med-table tr:nth-child(even) td { background: #fafcff; }
  .rx-med-num {
    width: 22px; height: 22px; background: var(--emerald-l);
    border-radius: 50%; display: inline-flex; align-items: center;
    justify-content: center; font-size: 10px; font-weight: 700;
    color: var(--emerald-d);
  }

  /* tests pills */
  .rx-tests-list { display: flex; flex-wrap: wrap; gap: 6px; }
  .rx-test-pill {
    padding: 4px 11px; background: #eff6ff; border: 1px solid #bfdbfe;
    border-radius: 20px; font-size: 11.5px; color: #1d4ed8; font-weight: 500;
  }

  /* advice */
  .rx-advice-box {
    background: #fffbeb; border: 1px solid #fde68a;
    border-radius: 8px; padding: 10px 14px;
    font-size: 12.5px; color: #78350f; line-height: 1.6;
  }
  .rx-followup-box {
    background: #f0fdf4; border: 1px solid #bbf7d0;
    border-radius: 8px; padding: 10px 14px;
    font-size: 12.5px; color: var(--emerald-d); line-height: 1.6;
  }

  /* signature */
  .rx-signature {
    text-align: right; padding: 10px 30px 14px;
    border-top: 1px dashed var(--border);
    margin-top: auto;
  }
  .rx-sig-line { width: 140px; height: 1px; background: var(--slate-l); margin-left: auto; margin-bottom: 4px; }
  .rx-sig-text { font-size: 11px; color: var(--slate-l); }
  .rx-sig-name { font-size: 12px; font-weight: 600; color: var(--slate); }

  /* footer */
  .rx-footer {
    background: linear-gradient(135deg, var(--emerald-d), #065f46);
    color: rgba(255,255,255,.85);
    display: grid; grid-template-columns: repeat(3, 1fr);
    text-align: center; padding: 12px 20px;
    font-size: 11px; gap: 8px;
  }
  .rx-footer-item { display: flex; flex-direction: column; gap: 2px; }
  .rx-footer-item strong { font-weight: 600; font-size: 10px; letter-spacing: .6px; text-transform: uppercase; opacity: .65; }
  .rx-footer-item span { font-size: 12px; }

  /* ── input forms ── */
  .no-print {}

  .rx-input-grid {
    display: grid; grid-template-columns: 1fr 1fr 1fr auto;
    gap: 10px; align-items: flex-end;
    overflow: visible;
  }
  .rx-label { font-size: 12px; font-weight: 600; color: var(--slate-m); margin-bottom: 5px; display: block; }
  .rx-input {
    width: 100%; padding: 9px 13px; font-size: 13.5px;
    border: 1.5px solid var(--border); border-radius: 8px;
    outline: none; transition: border-color .18s, box-shadow .18s;
    font-family: 'DM Sans', sans-serif; color: var(--slate);
    background: var(--white);
  }
  .rx-input:focus {
    border-color: var(--emerald);
    box-shadow: 0 0 0 3px rgba(5,150,105,.12);
  }
  .rx-textarea { resize: vertical; min-height: 80px; }

  /* ── FIXED suggestions dropdown ── */
  .rx-suggestion-wrapper {
    position: relative;
  }
  .rx-suggestions {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    background: var(--white);
    border: 1.5px solid var(--emerald);
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0,0,0,.14);
    z-index: 9999;
    overflow: hidden;
    min-width: 200px;
  }
  .rx-suggestion-item {
    padding: 10px 14px; font-size: 13px; cursor: pointer;
    transition: background .12s; color: var(--slate);
    border-bottom: 1px solid #f1f5f9;
    display: flex; align-items: center; gap: 8px;
  }
  .rx-suggestion-item::before {
    content: '💊';
    font-size: 12px;
    opacity: 0.6;
  }
  .rx-suggestion-item:last-child { border-bottom: none; }
  .rx-suggestion-item:hover { background: var(--emerald-l); color: var(--emerald-d); }

  /* buttons */
  .rx-btn {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 10px 20px; border-radius: 8px; font-size: 13.5px;
    font-weight: 600; border: none; cursor: pointer;
    transition: all .18s; font-family: 'DM Sans', sans-serif;
    white-space: nowrap;
  }
  .rx-btn:disabled { opacity: .55; cursor: not-allowed; }
  .rx-btn-primary { background: var(--emerald); color: white; }
  .rx-btn-primary:hover:not(:disabled) { background: #047857; box-shadow: 0 4px 14px rgba(5,150,105,.35); transform: translateY(-1px); }
  .rx-btn-secondary { background: var(--white); color: var(--slate-m); border: 1.5px solid var(--border); }
  .rx-btn-secondary:hover:not(:disabled) { background: var(--slate-xl); }
  .rx-btn-blue { background: var(--blue); color: white; }
  .rx-btn-blue:hover:not(:disabled) { background: #1d4ed8; transform: translateY(-1px); }
  .rx-btn-amber { background: #f59e0b; color: white; }
  .rx-btn-amber:hover:not(:disabled) { background: var(--amber); transform: translateY(-1px); }
  .rx-btn-success { background: #16a34a; color: white; }
  .rx-btn-success:hover:not(:disabled) { background: #15803d; transform: translateY(-1px); }
  .rx-btn-sm { padding: 6px 12px; font-size: 12px; }
  .rx-btn-lg { padding: 13px 28px; font-size: 15px; }

  /* action bar */
  .rx-action-bar {
    background: var(--white); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 20px 24px;
    display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
    box-shadow: var(--shadow-sm);
  }
  .rx-action-bar-title { font-weight: 700; font-size: 15px; color: var(--slate); margin-right: auto; }

  /* medicine pill list */
  .rx-med-row {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 14px; background: var(--slate-xl);
    border-radius: 8px; margin-bottom: 8px;
    border-left: 3px solid var(--emerald);
  }
  .rx-med-row span { flex: 1; font-size: 13px; color: var(--slate); }

  /* tests checkbox grid */
  .rx-tests-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .rx-test-check {
    display: flex; align-items: center; gap: 8px;
    padding: 9px 12px; border: 1.5px solid var(--border);
    border-radius: 8px; cursor: pointer; transition: all .15s;
    font-size: 13px; user-select: none;
  }
  .rx-test-check:hover { border-color: var(--emerald); background: var(--emerald-l); }
  .rx-test-check.checked { border-color: var(--emerald); background: var(--emerald-l); color: var(--emerald-d); font-weight: 500; }
  .rx-test-check input { display: none; }
  .rx-test-dot {
    width: 16px; height: 16px; border-radius: 4px; border: 2px solid var(--border);
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    transition: all .15s;
  }
  .rx-test-check.checked .rx-test-dot { background: var(--emerald); border-color: var(--emerald); color: white; font-size: 9px; }

  /* info grid */
  .rx-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

  /* spinner */
  .rx-spinner {
    width: 16px; height: 16px; border: 2px solid rgba(255,255,255,.4);
    border-top-color: white; border-radius: 50%;
    animation: spin .7s linear infinite; display: inline-block;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* divider */
  .rx-divider { height: 1px; background: var(--border); margin: 4px 0 16px; }

  /* saved banner */
  .rx-saved-banner {
    background: linear-gradient(135deg, var(--emerald) 0%, #047857 100%);
    color: white; border-radius: var(--radius); padding: 14px 20px;
    display: flex; align-items: center; gap: 12px; margin-bottom: 20px;
    box-shadow: 0 4px 14px rgba(5,150,105,.3);
  }
  .rx-saved-banner-icon { font-size: 24px; }
  .rx-saved-banner-text { flex: 1; }
  .rx-saved-banner-text strong { display: block; font-size: 14px; margin-bottom: 2px; }
  .rx-saved-banner-text span { font-size: 12px; opacity: .85; }

  @media print {
    .no-print { display: none !important; }
    .rx-root { background: white; padding: 0; }
    .prescription-paper { box-shadow: none; }
  }

  @media (max-width: 720px) {
    .prescription-paper { width: 100%; }
    .rx-patient-strip { grid-template-columns: 1fr 1fr; }
    .rx-input-grid { grid-template-columns: 1fr 1fr; }
    .rx-tests-grid { grid-template-columns: 1fr 1fr; }
    .rx-info-grid { grid-template-columns: 1fr; }
  }
`;

/* ─── DATA ─────────────────────────────────────────────────────────────────── */
const predefinedTests = [
  "Complete Blood Count (CBC)", "Blood Sugar (Fasting/PP)", "Liver Function Test",
  "Kidney Function Test", "Thyroid Profile", "X-Ray Chest", "ECG", "MRI Brain",
  "CT Scan Abdomen", "Urine Routine"
];

const medicineSuggestions = [
  "Paracetamol", "Ibuprofen", "Amoxicillin", "Ciprofloxacin", "Azithromycin",
  "Cetirizine", "Metformin", "Amlodipine", "Omeprazole"
];

/* ─── SMALL HELPERS ─────────────────────────────────────────────────────────── */
const Alert = ({ type, message, onClose }) => (
  <div className={`rx-alert ${type}`}>
    <span>{message}</span>
    <button className="rx-alert-close" onClick={onClose}>×</button>
  </div>
);

/* ─── MAIN COMPONENT ─────────────────────────────────────────────────────────── */
const PrescriptionPage = () => {
  const location  = useLocation();
  const navigate  = useNavigate();
  const appointment = location.state?.appointment;

  const [patient,          setPatient]          = useState({});
  const [doctor,           setDoctor]           = useState({});
  const [selectedTests,    setSelectedTests]    = useState([]);
  const [medicines,        setMedicines]        = useState([]);
  const [medInput,         setMedInput]         = useState("");
  const [dosage,           setDosage]           = useState("");
  const [duration,         setDuration]         = useState("");
  const [advice,           setAdvice]           = useState("");
  const [followUp,         setFollowUp]         = useState("");
  const [showSuggestions,  setShowSuggestions]  = useState(false);
  const [isUploading,      setIsUploading]      = useState(false);
  const [alertMessage,     setAlertMessage]     = useState("");
  const [alertType,        setAlertType]        = useState("success");
  const [pdfUrl,           setPdfUrl]           = useState("");
  const [storedFileKey,    setStoredFileKey]    = useState("");
  const [loading,          setLoading]          = useState(true);

  /* ── fetch data ── */
  useEffect(() => {
    const fetchData = async () => {
      if (!appointment) { navigate("/doctor-dashboard"); return; }
      try {
        setLoading(true);
        if (appointment.patientId) {
          const s = await getDoc(doc(db, "users", appointment.patientId));
          if (s.exists()) setPatient(s.data());
        }
        if (appointment.doctorId) {
          const s = await getDoc(doc(db, "doctors", appointment.doctorId));
          if (s.exists()) setDoctor(s.data());
        }
        if (appointment.prescription) {
          const p = appointment.prescription;
          setMedicines(p.medicines || []);
          setSelectedTests(p.tests || []);
          setAdvice(p.advice || "");
          setFollowUp(p.followUp || "");
          setStoredFileKey(p.fileKey || "");
          setPdfUrl(p.accessUrl || "");
        }
      } catch (e) {
        console.error(e);
        showAlert("Error loading data. Please try again.", "danger");
      } finally { setLoading(false); }
    };
    fetchData();
  }, [appointment, navigate]);

  const showAlert = (msg, type = "success") => {
    setAlertMessage(msg); setAlertType(type);
    setTimeout(() => setAlertMessage(""), 8000);
  };

  /* ── medicine helpers ── */
  const filteredSuggestions = medicineSuggestions.filter(m =>
    m.toLowerCase().includes(medInput.toLowerCase())
  );

  const handleAddMedicine = () => {
    if (medInput.trim() && dosage.trim() && duration.trim()) {
      setMedicines(p => [...p, { name: medInput.trim(), dosage: dosage.trim(), duration: duration.trim() }]);
      setMedInput(""); setDosage(""); setDuration(""); setShowSuggestions(false);
    } else {
      showAlert("Please fill in all medicine fields.", "warning");
    }
  };

  /* ── test toggle ── */
  const handleTestToggle = (test) =>
    setSelectedTests(p => p.includes(test) ? p.filter(t => t !== test) : [...p, test]);

  /* ── PDF generation (unchanged logic) ── */
  const generatePDFFromHTML = async () => {
    const el = document.querySelector('.prescription-paper');
    const noprint = document.querySelectorAll('.no-print');
    if (!el) throw new Error("Prescription element not found");
    noprint.forEach(e => e.style.display = 'none');
    try {
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#fff', logging: false });
      const imgData = canvas.toDataURL('image/jpeg', 0.9);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgW = 210, pageH = 295, imgH = (canvas.height * imgW) / canvas.width;
      let left = imgH, pos = 0;
      pdf.addImage(imgData, 'JPEG', 0, pos, imgW, imgH);
      left -= pageH;
      while (left > 0) { pos = left - imgH; pdf.addPage(); pdf.addImage(imgData, 'JPEG', 0, pos, imgW, imgH); left -= pageH; }
      return pdf.output('blob');
    } finally { noprint.forEach(e => e.style.display = ''); }
  };

  const blobToBase64 = blob => new Promise((res, rej) => {
    const r = new FileReader(); r.onloadend = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob);
  });

  const uploadToCloudflare = async (pdfBlob) => {
    const user = auth.currentUser;
    if (!user) throw new Error("Not authenticated");
    const authToken = await user.getIdToken();
    const fileName  = `prescription_${Date.now()}.pdf`;
    const base64Data = await blobToBase64(pdfBlob);
    const response = await fetch('https://r32usspts7.execute-api.eu-north-1.amazonaws.com/prod/cloudflareStorageApi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
      body: JSON.stringify({ fileName, fileType: "prescription", fileData: base64Data })
    });
    if (!response.ok) { const t = await response.text(); throw new Error(`Upload failed: ${response.status} - ${t}`); }
    const result = await response.json();
    if (!result.success) throw new Error(result.message || "Upload failed");
    return result;
  };

  const savePrescriptionToAppointment = async (fileDetails) => {
    const user = auth.currentUser;
    if (!user) throw new Error("Not authenticated");
    if (!appointment?.id) throw new Error("No appointment ID");
    const prescriptionData = {
      medicines, tests: selectedTests, advice: advice.trim(), followUp: followUp.trim(),
      fileKey: fileDetails.fileKey, fileName: fileDetails.fileName,
      originalName: fileDetails.originalName, fileSize: fileDetails.fileSize,
      accessUrl: fileDetails.accessUrl, uploadedAt: new Date(fileDetails.uploadedAt),
      prescriptionCreatedAt: new Date(), prescriptionCreatedBy: user.uid,
      doctorName: doctor?.firstName && doctor?.lastName
        ? `Dr. ${doctor.firstName.trim()} ${doctor.lastName.trim()}` : "Doctor",
      isLocal: fileDetails.isLocal || false
    };
    const appointmentRef = doc(db, 'appointments', appointment.id);
    await updateDoc(appointmentRef, { prescription: prescriptionData, hasPrescription: true, prescriptionGenerated: true, prescriptionGeneratedAt: new Date() });
    if (appointment.patientId) {
      try {
        const ref = doc(db, 'users', appointment.patientId, 'appointments', appointment.id);
        const snap = await getDoc(ref);
        if (snap.exists()) await updateDoc(ref, { prescription: prescriptionData, hasPrescription: true, prescriptionGeneratedAt: new Date() });
      } catch (e) { console.warn("Mirror update failed:", e); }
    }
    setPdfUrl(fileDetails.accessUrl);
    setStoredFileKey(fileDetails.fileKey);
  };

  const handleSavePrescription = async () => {
    if (!medicines.length && !selectedTests.length && !advice.trim()) {
      showAlert("Add at least one medicine, test, or advice.", "warning"); return;
    }
    setIsUploading(true);
    try {
      const pdfBlob = await generatePDFFromHTML();
      try {
        const res = await uploadToCloudflare(pdfBlob);
        await savePrescriptionToAppointment(res.fileDetails);
        showAlert("Prescription saved successfully!", "success");
      } catch (uploadErr) {
        const fallbackUrl = URL.createObjectURL(pdfBlob);
        await savePrescriptionToAppointment({ fileKey: `local_${Date.now()}`, fileName: `prescription_${Date.now()}.pdf`, originalName: `prescription_${Date.now()}.pdf`, fileSize: pdfBlob.size, accessUrl: fallbackUrl, uploadedAt: new Date().toISOString(), isLocal: true });
        showAlert(`Saved locally. Cloud error: ${uploadErr.message}`, "warning");
      }
    } catch (e) { showAlert(`Failed: ${e.message}`, "danger"); }
    finally { setIsUploading(false); }
  };

  const handleDownloadPrescription = async () => {
    if (!storedFileKey && !pdfUrl) { showAlert("Save prescription first.", "warning"); return; }
    try {
      if (storedFileKey && !storedFileKey.startsWith('local_')) {
        const user = auth.currentUser;
        const token = await user.getIdToken();
        const res = await fetch(`https://cdzlnnqd41.execute-api.eu-north-1.amazonaws.com/prod/cloudflareFreshLink?fileKey=${encodeURIComponent(storedFileKey)}`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        if (data.success) window.open(data.data.accessUrl, '_blank');
        else throw new Error(data.message);
      } else { window.open(pdfUrl, '_blank'); }
    } catch (e) { showAlert(`Download failed: ${e.message}`, "danger"); if (pdfUrl) window.open(pdfUrl, '_blank'); }
  };

  const handleMarkCompleted = async () => {
    if (!appointment?.id) { showAlert("No appointment ID.", "warning"); return; }
    try {
      const upd = { status: "completed", completedAt: new Date() };
      await updateDoc(doc(db, "appointments", appointment.id), upd);
      if (appointment.patientId) {
        try {
          const ref = doc(db, 'users', appointment.patientId, 'appointments', appointment.id);
          const snap = await getDoc(ref);
          if (snap.exists()) await updateDoc(ref, upd);
        } catch (e) { console.warn(e); }
      }
      showAlert("Appointment marked as completed!", "success");
      setTimeout(() => navigate(-1), 2000);
    } catch (e) { showAlert("Failed to mark completed.", "danger"); }
  };

  /* ── loading / no-appointment states ── */
  if (loading) return (
    <div className="rx-root">
      <style>{CSS}</style>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 16 }}>
        <div style={{ width: 48, height: 48, border: '4px solid #d1fae5', borderTopColor: '#059669', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
        <p style={{ color: '#64748b', fontFamily: 'DM Sans, sans-serif', fontSize: 15 }}>Loading appointment…</p>
      </div>
    </div>
  );

  if (!appointment) return (
    <div className="rx-root">
      <style>{CSS}</style>
      <div style={{ maxWidth: 400, margin: '80px auto', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <h2 style={{ fontFamily: 'Playfair Display, serif', marginBottom: 8 }}>No Appointment Found</h2>
        <p style={{ color: '#64748b', marginBottom: 20 }}>Please return to the dashboard and try again.</p>
        <button className="rx-btn rx-btn-primary" onClick={() => navigate("/doctor-dashboard")}>← Back to Dashboard</button>
      </div>
    </div>
  );

  const doctorName = doctor.firstName && doctor.lastName
    ? `Dr. ${doctor.firstName.trim()} ${doctor.lastName.trim()}` : "Dr. Full Name";
  const patientName = patient.name || appointment.patientName || "N/A";

  /* ── RENDER ── */
  return (
    <div className="rx-root">
      <style>{CSS}</style>

      <div className="rx-page">
        {/* Toolbar */}
        <div className="rx-toolbar no-print">
          <button className="rx-back-btn" onClick={() => navigate(-1)}>← Back</button>
          <div className="rx-toolbar-title">Prescription</div>
          {appointment.prescription && (
            <span className="rx-status-badge completed">✓ Prescription on file</span>
          )}
          {appointment.status && (
            <span className={`rx-status-badge ${appointment.status === 'completed' ? 'completed' : 'pending'}`}>
              {appointment.status}
            </span>
          )}
        </div>

        {/* Alerts */}
        {alertMessage && <Alert type={alertType} message={alertMessage} onClose={() => setAlertMessage("")} />}

        {/* Saved banner */}
        {pdfUrl && (
          <div className="rx-saved-banner no-print">
            <div className="rx-saved-banner-icon">📋</div>
            <div className="rx-saved-banner-text">
              <strong>Prescription Saved to Appointment</strong>
              <span>You can download or view it anytime below</span>
            </div>
            <button className="rx-btn rx-btn-secondary rx-btn-sm" onClick={handleDownloadPrescription}>📥 Download</button>
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="rx-btn rx-btn-secondary rx-btn-sm" style={{ textDecoration: 'none' }}>🔗 View Online</a>
          </div>
        )}

        {/* ════════════ PRESCRIPTION PAPER ════════════ */}
        <div className="prescription-paper">

          {/* Letterhead */}
          <div className="rx-letterhead">
            <div>
              <div className="rx-doc-name">{doctorName}</div>
              <div className="rx-doc-spec">{doctor.specialization || "Specialist"}</div>
              <div className="rx-doc-contact">
                <span>🏥 {doctor.clinic || "Health Care Medical Clinic"}</span>
                <span>📞 {doctor.phone || "+91 9807972912"}</span>
                <span>Reg. No: {doctor.registrationNo || "MCI/12345"}</span>
              </div>
            </div>
            <div className="rx-clinic-logo">
              <div className="rx-clinic-emblem">⚕️</div>
              <div className="rx-clinic-name">Health Care</div>
              <div className="rx-clinic-name">Medical Clinic</div>
              <div className="rx-reg-no">Est. 2010</div>
            </div>
          </div>

          <div className="rx-accent-bar" />

          {/* Patient strip */}
          <div className="rx-patient-strip">
            <div className="rx-patient-field">
              <label>Patient Name</label>
              <span>{patientName}</span>
            </div>
            <div className="rx-patient-field">
              <label>Age / Gender</label>
              <span>{patient.age ? `${patient.age} yrs` : "—"} {patient.gender ? `/ ${patient.gender}` : ""}</span>
            </div>
            <div className="rx-patient-field">
              <label>Date</label>
              <span>{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            </div>
            <div className="rx-patient-field">
              <label>Appointment ID</label>
              <span style={{ fontSize: 11 }}>{appointment.id?.slice(0, 10) || "—"}</span>
            </div>
          </div>

          {/* Body */}
          <div className="rx-body">
            {/* Sidebar */}
            <div className="rx-sidebar">
              <div className="rx-sidebar-item">C/C</div>
              <div className="rx-sidebar-item">B.P.</div>
              <div className="rx-sidebar-item">Wt.</div>
              <div className="rx-sidebar-item">Contra</div>
              <div className="rx-sidebar-item">X-Ray</div>
              <div className="rx-sidebar-item">Advice</div>
            </div>

            {/* Content area */}
            <div className="rx-content">
              <div className="rx-symbol">℞</div>

              {/* Medicines */}
              {medicines.length > 0 && (
                <div className="rx-section" style={{ marginTop: 36 }}>
                  <div className="rx-section-label">💊 Medications</div>
                  <table className="rx-med-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Medicine</th>
                        <th>Dosage</th>
                        <th>Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {medicines.map((med, i) => (
                        <tr key={i}>
                          <td><span className="rx-med-num">{i + 1}</span></td>
                          <td style={{ fontWeight: 600 }}>{med.name}</td>
                          <td>{med.dosage}</td>
                          <td>{med.duration}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tests */}
              {selectedTests.length > 0 && (
                <div className="rx-section">
                  <div className="rx-section-label">🔬 Investigations</div>
                  <div className="rx-tests-list">
                    {selectedTests.map((t, i) => (
                      <span key={i} className="rx-test-pill">{t}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Advice */}
              {advice && (
                <div className="rx-section">
                  <div className="rx-section-label">📋 Advice</div>
                  <div className="rx-advice-box">{advice}</div>
                </div>
              )}

              {/* Follow-up */}
              {followUp && (
                <div className="rx-section">
                  <div className="rx-section-label">🗓 Follow-Up</div>
                  <div className="rx-followup-box">{followUp}</div>
                </div>
              )}

              {/* Empty state hint */}
              {!medicines.length && !selectedTests.length && !advice && !followUp && (
                <div style={{ marginTop: 60, textAlign: 'center', opacity: .35 }}>
                  <div style={{ fontSize: 40 }}>📝</div>
                  <p style={{ marginTop: 10, fontSize: 13 }}>Fill in the form below to populate the prescription</p>
                </div>
              )}
            </div>
          </div>

          {/* Signature */}
          <div className="rx-signature">
            <div className="rx-sig-line" />
            <div className="rx-sig-name">{doctorName}</div>
            <div className="rx-sig-text">{doctor.specialization || "Physician"}</div>
          </div>

          {/* Footer */}
          <div className="rx-footer">
            <div className="rx-footer-item">
              <strong>Phone</strong>
              <span>{doctor.phone || "+91 00000 00000"}</span>
            </div>
            <div className="rx-footer-item">
              <strong>Address</strong>
              <span>{doctor.clinic || "Health Care Medical Clinic"}</span>
            </div>
            <div className="rx-footer-item">
              <strong>Website</strong>
              <span>www.healthcareclinic.in</span>
            </div>
          </div>
        </div>
        {/* ════════════ END PRESCRIPTION PAPER ════════════ */}


        {/* ════════════ INPUT FORMS ════════════ */}
        <div className="no-print">

          {/* ── Add Medicines ── */}
          <div className="rx-card">
            <div className="rx-card-header">
              <div className="rx-card-icon green">💊</div>
              <div>
                <div className="rx-card-title">Add Medications</div>
                <div className="rx-card-subtitle">Enter medicine name, dosage and duration</div>
              </div>
            </div>
            <div className="rx-card-body">
              <div className="rx-input-grid">

                {/* ── Medicine Name with fixed suggestions ── */}
                <div>
                  <label className="rx-label">Medicine Name</label>
                  <div className="rx-suggestion-wrapper">
                    <input
                      className="rx-input"
                      value={medInput}
                      placeholder="e.g. Paracetamol"
                      onChange={e => {
                        setMedInput(e.target.value);
                        setShowSuggestions(e.target.value.length > 0);
                      }}
                      onFocus={() => medInput && setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    />
                    {showSuggestions && filteredSuggestions.length > 0 && (
                      <div className="rx-suggestions">
                        {filteredSuggestions.slice(0, 5).map((s, i) => (
                          <div
                            key={i}
                            className="rx-suggestion-item"
                            onMouseDown={() => {
                              setMedInput(s);
                              setShowSuggestions(false);
                            }}
                          >
                            {s}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="rx-label">Dosage</label>
                  <input className="rx-input" placeholder="e.g. 500mg twice daily" value={dosage} onChange={e => setDosage(e.target.value)} />
                </div>
                <div>
                  <label className="rx-label">Duration</label>
                  <input className="rx-input" placeholder="e.g. 7 days" value={duration} onChange={e => setDuration(e.target.value)} />
                </div>
                <div>
                  <label className="rx-label">&nbsp;</label>
                  <button
                    className="rx-btn rx-btn-primary"
                    onClick={handleAddMedicine}
                    disabled={!medInput.trim() || !dosage.trim() || !duration.trim()}
                    style={{ width: '100%' }}
                  >
                    + Add
                  </button>
                </div>
              </div>

              {medicines.length > 0 && (
                <div style={{ marginTop: 18 }}>
                  <div className="rx-divider" />
                  {medicines.map((med, i) => (
                    <div key={i} className="rx-med-row">
                      <span className="rx-med-num">{i + 1}</span>
                      <span><strong>{med.name}</strong> — {med.dosage} for {med.duration}</span>
                      <button className="rx-btn rx-btn-secondary rx-btn-sm" onClick={() => setMedicines(p => p.filter((_, j) => j !== i))}>Remove</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Select Tests ── */}
          <div className="rx-card">
            <div className="rx-card-header">
              <div className="rx-card-icon blue">🔬</div>
              <div>
                <div className="rx-card-title">Select Investigations</div>
                <div className="rx-card-subtitle">{selectedTests.length} test{selectedTests.length !== 1 ? 's' : ''} selected</div>
              </div>
            </div>
            <div className="rx-card-body">
              <div className="rx-tests-grid">
                {predefinedTests.map((test, i) => (
                  <label
                    key={i}
                    className={`rx-test-check ${selectedTests.includes(test) ? 'checked' : ''}`}
                    onClick={() => handleTestToggle(test)}
                  >
                    <div className="rx-test-dot">{selectedTests.includes(test) && '✓'}</div>
                    {test}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* ── Advice & Follow-up ── */}
          <div className="rx-card">
            <div className="rx-card-header">
              <div className="rx-card-icon amber">📋</div>
              <div>
                <div className="rx-card-title">Clinical Notes</div>
                <div className="rx-card-subtitle">Advice and follow-up instructions</div>
              </div>
            </div>
            <div className="rx-card-body">
              <div className="rx-info-grid">
                <div>
                  <label className="rx-label">Advice</label>
                  <textarea
                    className="rx-input rx-textarea"
                    value={advice}
                    onChange={e => setAdvice(e.target.value)}
                    placeholder="Enter medical advice, lifestyle changes, diet recommendations…"
                  />
                </div>
                <div>
                  <label className="rx-label">Follow-Up Instructions</label>
                  <textarea
                    className="rx-input rx-textarea"
                    value={followUp}
                    onChange={e => setFollowUp(e.target.value)}
                    placeholder="Review after 1 week, repeat blood tests, return if symptoms persist…"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Action Bar ── */}
          <div className="rx-action-bar">
            <span className="rx-action-bar-title">Actions</span>

            <button
              className="rx-btn rx-btn-primary rx-btn-lg"
              onClick={handleSavePrescription}
              disabled={isUploading}
            >
              {isUploading ? <><span className="rx-spinner" /> Saving…</> : <><span>💾</span> Save Prescription</>}
            </button>

            <button className="rx-btn rx-btn-amber rx-btn-lg" onClick={() => window.print()}>
              🖨️ Print
            </button>

            <button className="rx-btn rx-btn-success rx-btn-lg" onClick={handleMarkCompleted}>
              ✅ Mark Completed
            </button>
          </div>

        </div>
        {/* ════════════ END INPUT FORMS ════════════ */}
      </div>
    </div>
  );
};

export default PrescriptionPage;