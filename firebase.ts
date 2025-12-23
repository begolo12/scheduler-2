import { initializeApp } from "firebase/app";
// Import Firestore members using standard modular SDK syntax
import { 
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
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC3cvF-8_xfwCogL-H7bFTnY6pF3kPSk-M",
  authDomain: "aplikasi-schedule.firebaseapp.com",
  projectId: "aplikasi-schedule",
  storageBucket: "aplikasi-schedule.firebasestorage.app",
  messagingSenderId: "668191930638",
  appId: "1:668191930638:web:b5032679c657d938a3ff5f",
  measurementId: "G-68KBZDDT8L"
};

// Initialize Firebase app instance
const app = initializeApp(firebaseConfig);
// Get Firestore instance
export const db = getFirestore(app);

// Pre-defined collection references for tasks and projects
export const tasksCol = collection(db, "tasks");
export const projectsCol = collection(db, "projects");

// Export Firestore methods for use in other parts of the application
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