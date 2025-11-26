import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDtaqgpJsUXIECxPWV98DIKgp2t95XLktQ",
  authDomain: "boardtally.firebaseapp.com",
  projectId: "boardtally",
  storageBucket: "boardtally.firebasestorage.app",
  messagingSenderId: "67917777022",
  appId: "1:67917777022:web:6df05966814d43ff43702f",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Connect to emulators in development
if (import.meta.env.DEV) {
  console.log("🔥 Connecting to Firebase emulators...");
  connectFirestoreEmulator(db, "localhost", 8080);
  connectStorageEmulator(storage, "localhost", 9199);
  connectFunctionsEmulator(functions, "localhost", 5001);
}

export default app;

