import { initializeApp } from "firebase/app";
import * as Firestore from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC3cvF-8_xfwCogL-H7bFTnY6pF3kPSk-M",
  authDomain: "aplikasi-schedule.firebaseapp.com",
  projectId: "aplikasi-schedule",
  storageBucket: "aplikasi-schedule.firebasestorage.app",
  messagingSenderId: "668191930638",
  appId: "1:668191930638:web:b5032679c657d938a3ff5f",
  measurementId: "G-68KBZDDT8L"
};

const app = initializeApp(firebaseConfig);
export const db = Firestore.getFirestore(app);

// Collection references
export const schedulesCol = Firestore.collection(db, "schedules");
export const tasksCol = Firestore.collection(db, "tasks");
export const projectsCol = Firestore.collection(db, "projects");

// Re-exporting modular functions
export const { 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  setDoc, 
  getDocs, 
  collection 
} = Firestore;
