import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import path from 'path';

const projectId = process.env.FIREBASE_PROJECT_ID || 'exam-vb2';
const clientEmail =
  process.env.FIREBASE_CLIENT_EMAIL ||
  'firebase-adminsdk-fbsvc@exam-vb2.iam.gserviceaccount.com';
const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;
const privateKey = rawPrivateKey ? rawPrivateKey.replace(/\\n/g, '\n') : undefined;

function getAdminCredential() {
  if (privateKey) {
    return cert({
      projectId,
      clientEmail,
      privateKey,
    });
  }

  // Dự phòng: Đọc trực tiếp từ file google-firebase.json ở thư mục gốc nếu biến môi trường chưa load
  try {
    const serviceAccountPath = path.resolve(process.cwd(), 'google-firebase.json');
    return cert(serviceAccountPath);
  } catch {
    return cert({
      projectId,
      clientEmail,
      privateKey,
    });
  }
}

// Khởi tạo Firebase Admin SDK an toàn cho môi trường Server
const adminApp =
  getApps().length === 0
    ? initializeApp({
        credential: getAdminCredential(),
      })
    : getApp();

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);

export default adminApp;
