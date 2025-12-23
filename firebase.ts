import { initializeApp } from "firebase/app";
import * as firestore from "firebase/firestore";

// Destructure from the namespace with an explicit any cast to handle 
// environments where TypeScript fails to resolve the exports correctly.
const { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  setDoc, 
  getDocs 
} = firestore as any;

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
export const db = getFirestore(app);

// Pre-defined collection references
export const tasksCol = collection(db, "tasks");
export const projectsCol = collection(db, "projects");

export { 
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
};