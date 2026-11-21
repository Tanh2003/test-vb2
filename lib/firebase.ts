import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyAa-2mOkb4iZ_uWRaL9a_vKMs6V7ZJsunQ',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'exam-vb2.firebaseapp.com',
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || 'https://exam-vb2-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'exam-vb2',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'exam-vb2.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '970006888926',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:970006888926:web:a411a6428c387d395edd4f',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-3N1VED05M0',
};

// Khởi tạo Firebase App an toàn (tránh khởi tạo lại trong môi trường dev Next.js)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Firebase Auth & Google Provider
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Luôn hiện màn hình chọn tài khoản Google khi bấm đăng nhập
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Firestore
export const db = getFirestore(app);

export default app;
