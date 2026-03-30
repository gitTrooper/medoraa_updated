// File: components/DoctorDashboard.jsx
import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import AppointmentSection from './AppointmentSection';
import SlotManager from './SlotManager';
import EarningsSection from './EarningsSection';
import DoctorEditProfile from './DoctorEditProfile'; // ✅ NEW
import TopNavBar from './TopNavBar';
import { auth, db } from '../firebase';
import {
  doc, getDoc, collection, query, where, getDocs, updateDoc, arrayUnion, arrayRemove
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const DoctorDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [appointments, setAppointments] = useState([]);
  const [doctorInfo, setDoctorInfo] = useState({});
  const [updatedDoctorInfo, setUpdatedDoctorInfo] = useState({});
  const [slots, setSlots] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const todayDate = new Date().toISOString().split('T')[0];

  useEffect(() => {
    onAuthStateChanged(auth, user => {
      if (user) fetchDoctorData(user.uid);
    });
  }, []);

  const fetchDoctorData = async (uid) => {
    const doctorSnap = await getDoc(doc(db, 'doctors', uid));
    if (doctorSnap.exists()) {
      const data = doctorSnap.data();
      setDoctorInfo(data);
      setUpdatedDoctorInfo({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        specialization: data.specialization || '',
        experience: data.experience || '',
        bio: data.bio || ''
      });
    }

    const appointmentsQuery = query(collection(db, 'appointments'), where('doctorId', '==', uid));
    const appointmentsSnapshot = await getDocs(appointmentsQuery);
    const fetchedAppointments = [];

    for (const docSnap of appointmentsSnapshot.docs) {
      const data = docSnap.data();
      let patientEmail = 'Not available';
      if (data.patientId) {
        const userSnap = await getDoc(doc(db, 'users', data.patientId));
        if (userSnap.exists()) patientEmail = userSnap.data().email || 'No email';
      }
      fetchedAppointments.push({
        id: docSnap.id,
        ...data,
        email: patientEmail,
        appointmentDate: data.appointmentDate.split('T')[0],
        appointmentTime: data.appointmentTime || 'Time not set',
        patientName: data.patientName || 'Unknown Patient',
        phone: data.phone || 'Not Provided',
        consultationType: data.appointmentType || 'General',
        status: data.status || 'pending'
      });
    }
    setAppointments(fetchedAppointments);

    const slotSnap = await getDocs(collection(db, 'doctors', uid, 'availableSlots'));
    const allSlots = [];
    slotSnap.forEach(docSnap => {
      const data = docSnap.data();
      const date = docSnap.id;
      (data.slots || []).forEach(slot => {
        allSlots.push({ date, time: slot });
      });
    });
    setAvailableSlots(allSlots);
  };

  const saveDoctorInfo = async () => {
    const user = auth.currentUser;
    if (!user) return;
    await updateDoc(doc(db, 'doctors', user.uid), updatedDoctorInfo);
    setDoctorInfo(prev => ({ ...prev, ...updatedDoctorInfo }));
    alert('Profile updated successfully.');
  };

  const getWeekDates = () => [...Array(7)].map((_, i) => new Date(Date.now() + i * 86400000));

  const calculateEarnings = () => {
    const now = new Date();
    const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    let weekCount = 0, monthCount = 0, yearCount = 0;

    appointments.forEach(app => {
      const appDate = new Date(app.appointmentDate);
      if (appDate >= startOfWeek) weekCount++;
      if (appDate >= startOfMonth) monthCount++;
      if (appDate >= startOfYear) yearCount++;
    });

    return {
      totalPatients: appointments.length,
      weekEarnings: weekCount * 500,
      monthEarnings: monthCount * 500,
      yearEarnings: yearCount * 500
    };
  };

  const getMonthlyEarningsData = () => {
    const earningsMap = Array(12).fill(0);
    appointments.forEach(app => {
      const date = new Date(app.appointmentDate);
      earningsMap[date.getMonth()] += 500;
    });
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return earningsMap.map((amount, index) => ({ month: monthNames[index], earnings: amount }));
  };

  const getDailyEarningsData = () => {
    const today = new Date();
    const result = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const iso = date.toISOString().split('T')[0];
      const count = appointments.filter(app => app.appointmentDate === iso).length;
      result.push({ date: iso, earnings: count * 500 });
    }

    return result;
  };

  const getYearlyEarningsData = () => {
    const result = {};
    appointments.forEach(app => {
      const year = new Date(app.appointmentDate).getFullYear();
      result[year] = (result[year] || 0) + 500;
    });
    return Object.entries(result).map(([year, earnings]) => ({ year, earnings }));
  };

  useEffect(() => {
    const temp = [];
    for (let hour = 9; hour < 18; hour++) {
      for (let min = 0; min < 60; min += 15) {
        const start = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
        const endMin = min + 15;
        const endHour = endMin >= 60 ? hour + 1 : hour;
        const endMinAdj = endMin >= 60 ? endMin - 60 : endMin;
        const end = `${endHour.toString().padStart(2, '0')}:${endMinAdj.toString().padStart(2, '0')}`;
        temp.push(`${start}-${end}`);
      }
    }
    setSlots(temp);
  }, []);

  const addSlot = async (slot) => {
    const user = auth.currentUser;
    const formattedDate = selectedDate.toISOString().split('T')[0];
    const slotRef = doc(db, 'doctors', user.uid, 'availableSlots', formattedDate);
    await updateDoc(slotRef, { slots: arrayUnion(slot) });
    fetchDoctorData(user.uid);
  };

  const removeSlot = async (slot) => {
    const user = auth.currentUser;
    const formattedDate = selectedDate.toISOString().split('T')[0];
    const slotRef = doc(db, 'doctors', user.uid, 'availableSlots', formattedDate);
    await updateDoc(slotRef, { slots: arrayRemove(slot) });
    fetchDoctorData(user.uid);
  };

  return (
    <div className="d-flex" style={{ height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        doctorInfo={doctorInfo}
        onLogout={() => auth.signOut()}
      />

      {/* Right Panel */}
      <div className="flex-grow-1 d-flex flex-column">
        <TopNavBar doctorInfo={doctorInfo} />

        {/* Main Content */}
        <div style={{ flex: 1, overflowY: 'auto', background: '#f9fafb', padding: '1.5rem' }}>
          <div className="card shadow-sm rounded-4 p-4" style={{ backgroundColor: '#ffffff' }}>
            {activeTab === 'dashboard' || activeTab === 'past' ? (
              <AppointmentSection
                appointments={appointments}
                title={activeTab === 'past' ? "Past Appointments" : "Upcoming Appointments"}
                todayDate={todayDate}
              />
            ) : activeTab === 'slots' ? (
              <SlotManager
                slots={slots}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                weekDates={getWeekDates()}
                availableSlots={availableSlots}
                appointments={appointments}
                addSlot={addSlot}
                removeSlot={removeSlot}
              />
            ) : activeTab === 'edit' ? (
              <DoctorEditProfile
                doctorInfo={updatedDoctorInfo}
                setDoctorInfo={setUpdatedDoctorInfo}
                onSave={saveDoctorInfo}
              />
            ) : (
              <EarningsSection
                calculateEarnings={calculateEarnings}
                getDailyEarningsData={getDailyEarningsData}
                getMonthlyEarningsData={getMonthlyEarningsData}
                getYearlyEarningsData={getYearlyEarningsData}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;
