import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { Firestore } from '@google-cloud/firestore';
import { GoogleAuth, JWT } from 'google-auth-library';
import fs from 'fs';
import path from 'path';

// 1. Trích xuất thông tin cấu hình Service Account an toàn
function getServiceAccountInfo() {
  const projectId = process.env.FIREBASE_PROJECT_ID || 'exam-vb2';
  const clientEmail =
    process.env.FIREBASE_CLIENT_EMAIL ||
    'firebase-adminsdk-fbsvc@exam-vb2.iam.gserviceaccount.com';
  const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;
  const privateKey = rawPrivateKey ? rawPrivateKey.replace(/\\n/g, '\n') : undefined;

  if (privateKey) {
    return { projectId, clientEmail, privateKey };
  }

  // Dự phòng: Đọc trực tiếp từ file google-firebase.json ở thư mục gốc nếu biến môi trường chưa load
  try {
    const serviceAccountPath = path.resolve(process.cwd(), 'google-firebase.json');
    if (fs.existsSync(serviceAccountPath)) {
      const sa = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      return {
        projectId: sa.project_id || projectId,
        clientEmail: sa.client_email || clientEmail,
        privateKey: sa.private_key,
      };
    }
  } catch (err) {
    console.warn('[Firebase-Admin] Không thể đọc google-firebase.json:', err);
  }

  return { projectId, clientEmail, privateKey: undefined };
}

const saInfo = getServiceAccountInfo();

// 2. Khởi tạo Firebase Admin App (phục vụ Firebase Auth)
const adminApp =
  getApps().length === 0
    ? initializeApp({
        credential: saInfo.privateKey
          ? cert({
              projectId: saInfo.projectId,
              clientEmail: saInfo.clientEmail,
              privateKey: saInfo.privateKey,
            })
          : undefined,
        projectId: saInfo.projectId,
      })
    : getApp();

export const adminAuth = getAuth(adminApp);

// 3. Khởi tạo Firestore theo chuẩn mới của Google Cloud:
// Sử dụng `JWT` constructor và `auth` object constructor thay cho `credentials` và `fromJSON` đã bị deprecate
function initFirestoreClient(): Firestore {
  if (saInfo.privateKey) {
    const authClient = new JWT({
      email: saInfo.clientEmail,
      key: saInfo.privateKey,
      scopes: [
        'https://www.googleapis.com/auth/cloud-platform',
        'https://www.googleapis.com/auth/datastore',
      ],
    });

    const auth = new GoogleAuth({
      authClient,
      projectId: saInfo.projectId,
    });

    return new Firestore({
      projectId: saInfo.projectId,
      auth,
    });
  }

  const auth = new GoogleAuth({
    projectId: saInfo.projectId,
  });

  return new Firestore({
    projectId: saInfo.projectId,
    auth,
  });
}

// Khởi tạo Singleton Firestore Instance an toàn cho SSR / Server Actions
const globalForFirestore = global as unknown as { adminDb?: Firestore };
export const adminDb = globalForFirestore.adminDb || initFirestoreClient();
if (process.env.NODE_ENV !== 'production') globalForFirestore.adminDb = adminDb;

export default adminApp;
