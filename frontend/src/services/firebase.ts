import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
} from "firebase/auth";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA1XlqmfpFKVSm8VCR-OB9Ujnba_Rmvv9Y",
  authDomain: "women-distress-detection-d16ce.firebaseapp.com",
  projectId: "women-distress-detection-d16ce",
  storageBucket: "women-distress-detection-d16ce.firebasestorage.app",
  messagingSenderId: "358615334323",
  appId: "1:358615334323:web:ee0af9cd053186ee7c1fc6",
  measurementId: "G-FZJM68ES18",
};

// Initialize Firebase only once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Firebase Authentication
const auth = getAuth(app);

// Providers
const googleProvider = new GoogleAuthProvider();

// Indicates Firebase has been configured
const isConfigured = true;

export {
  app,
  auth,
  googleProvider,
  isConfigured,
};