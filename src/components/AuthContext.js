import React, { useContext, useState, useEffect, createContext } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [userRole, setUserRole] = useState(null); // 'user', 'doctor', or 'hospital'
  const [userData, setUserData] = useState(null); // Full Firestore data

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const emailVerified = user.emailVerified;
        let roleFound = null;
        let data = null;

        // Check if user exists in 'users' (patients)
        const userDocRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          roleFound = "user";
          data = userSnap.data();
          if (emailVerified) {
            setCurrentUser(user);
            setUserRole("user");
            setUserData(data);
            setIsVerified(true);
            setLoadingAuth(false);
            return;
          }
        }

        // Check in 'hospitals'
        const hospitalDocRef = doc(db, "hospitals", user.uid);
        const hospitalSnap = await getDoc(hospitalDocRef);
        if (hospitalSnap.exists()) {
          roleFound = "hospital";
          data = hospitalSnap.data();
          if (emailVerified && data?.isApproved) {
            setCurrentUser(user);
            setUserRole("hospital");
            setUserData(data);
            setIsVerified(true);
            setLoadingAuth(false);
            return;
          }
        }

        // Check in 'doctors'
        const doctorDocRef = doc(db, "doctors", user.uid);
        const doctorSnap = await getDoc(doctorDocRef);
        if (doctorSnap.exists()) {
          roleFound = "doctor";
          data = doctorSnap.data();
          if (emailVerified && data?.isApproved) {
            setCurrentUser(user);
            setUserRole("doctor");
            setUserData(data);
            setIsVerified(true);
            setLoadingAuth(false);
            return;
          }
        }

        // If none of the above allowed
        await signOut(auth);
        setCurrentUser(null);
        setUserRole(null);
        setUserData(null);
        setIsVerified(false);
      } else {
        setCurrentUser(null);
        setUserRole(null);
        setUserData(null);
        setIsVerified(false);
      }

      setLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  const value = {
    currentUser,
    loadingAuth,
    isVerified,
    userRole,
    userData,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loadingAuth && children}
    </AuthContext.Provider>
  );
};
