import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAa-2mOkb4iZ_uWRaL9a_vKMs6V7ZJsunQ",
  authDomain: "exam-vb2.firebaseapp.com",
  databaseURL: "https://exam-vb2-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "exam-vb2",
  storageBucket: "exam-vb2.firebasestorage.app",
  messagingSenderId: "970006888926",
  appId: "1:970006888926:web:a411a6428c387d395edd4f",
  measurementId: "G-3N1VED05M0"
};

// Initialize Firebase safely for SSR / API Routes
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getDatabase(app);
export default app;
