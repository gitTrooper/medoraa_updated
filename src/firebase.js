// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, sendEmailVerification, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { getStorage } from "firebase/storage";


// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBmlb2M8Jiu0puszATqHFKwrJN9TZ6_9vE",
  authDomain: "mediveda-b6140.firebaseapp.com",
  databaseURL: "https://mediveda-b6140-default-rtdb.firebaseio.com",
  projectId: "mediveda-b6140",
  storageBucket: "mediveda-b6140.firebasestorage.app",
  messagingSenderId: "717105510728",
  appId: "1:717105510728:web:5b5dc2d13129a530ffdb7d",
  measurementId: "G-ENFZTCWQVE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
export const storage = getStorage(app); 

export { auth, db, sendEmailVerification, createUserWithEmailAndPassword, setDoc, doc };
