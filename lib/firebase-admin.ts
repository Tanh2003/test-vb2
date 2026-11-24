import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import type { Credential, GoogleOAuthAccessToken } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { Firestore } from '@google-cloud/firestore';
import { GoogleAuth, JWT } from 'google-auth-library';
import fs from 'fs';
import path from 'path';

// 0. Chặn cảnh báo deprecation từ các dependency nội bộ của Google Cloud (fromJSON / credentials)
if (typeof process !== 'undefined' && process.emitWarning) {
  const originalEmitWarning = process.emitWarning.bind(process);
  process.emitWarning = ((warning: string | Error, ...args: any[]) => {
    const msg = typeof warning === 'string' ? warning : warning?.message || '';
    if (
      msg.includes('fromJSON') ||
      msg.includes('credentials option is deprecated') ||
      msg.includes('externally-sourced-credentials')
    ) {
      return;
    }
    return originalEmitWarning(warning, ...args);
  }) as any;
}

if (typeof console !== 'undefined' && console.warn) {
  const originalWarn = console.warn.bind(console);
  console.warn = (...args: any[]) => {
    const msg = args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a) || '')).join(' ');
    if (
      msg.includes('fromJSON') ||
      msg.includes('credentials option is deprecated') ||
      msg.includes('externally-sourced-credentials')
    ) {
      return;
    }
    originalWarn(...args);
  };
}

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

// 2. Tạo Custom Credential dùng JWT constructor chuẩn mới (loại bỏ hoàn toàn cert() và fromJSON deprecated)
function createCustomCredential(email: string, key: string): Credential {
  const jwt = new JWT({
    email,
    key,
    scopes: [
      'https://www.googleapis.com/auth/cloud-platform',
      'https://www.googleapis.com/auth/firebase.database',
      'https://www.googleapis.com/auth/firebase.messaging',
      'https://www.googleapis.com/auth/identitytoolkit',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
  });

  return {
    getAccessToken: async (): Promise<GoogleOAuthAccessToken> => {
      const res = await jwt.getAccessToken();
      const expiry = jwt.credentials?.expiry_date;
      const expiresIn = expiry ? Math.max(0, Math.floor((expiry - Date.now()) / 1000)) : 3600;
      return {
        access_token: res?.token || '',
        expires_in: expiresIn || 3600,
      };
    },
  };
}

// 3. Khởi tạo Firebase Admin App (phục vụ Firebase Auth)
const adminApp =
  getApps().length === 0
    ? initializeApp({
        credential:
          saInfo.privateKey && saInfo.clientEmail
            ? createCustomCredential(saInfo.clientEmail, saInfo.privateKey)
            : undefined,
        projectId: saInfo.projectId,
      })
    : getApp();

export const adminAuth = getAuth(adminApp);

// 4. Khởi tạo Firestore theo chuẩn mới của Google Cloud:
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
