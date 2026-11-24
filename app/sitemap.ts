import type { MetadataRoute } from 'next';
import { adminDb } from '@/lib/firebase-admin';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://onthivb2.io.vn';
const FIREBASE_DB_URL =
  process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ||
  'https://exam-vb2-default-rtdb.asia-southeast1.firebasedatabase.app';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // 1. Danh sách các trang CÔNG KHAI cố định
  // LƯU Ý: Tuyệt đối không đưa các trang cần đăng nhập (/profile, /admin, /import, /upload-history, /result, /login, /register, /signup)
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/select-exam`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/blog`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.85,
    },
    // 4 Mã ca thi chuyên ngành chuẩn theo cấu trúc Bộ Công An 2026
    {
      url: `${BASE_URL}/exam?ca=CA1`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: `${BASE_URL}/exam?ca=CA2`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: `${BASE_URL}/exam?ca=CA3`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: `${BASE_URL}/exam?ca=CA4`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.85,
    },
  ];

  // 2. Danh sách bài viết Blog công khai (Tối ưu SEO Google)
  const blogRoutes: MetadataRoute.Sitemap = [];
  const processedBlogIds = new Set<string>();

  // A. Lấy bài viết công khai từ Firebase Realtime Database
  try {
    const res = await fetch(`${FIREBASE_DB_URL}/blogs.json`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(6000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data === 'object') {
        Object.keys(data).forEach((key) => {
          const item = data[key];
          if (item && item.isPublished !== false) {
            const blogId = item.id || key;
            processedBlogIds.add(blogId);
            const lastMod = item.updatedAt || item.createdAt;
            blogRoutes.push({
              url: `${BASE_URL}/blog/${encodeURIComponent(blogId)}`,
              lastModified: lastMod ? new Date(lastMod) : now,
              changeFrequency: 'weekly',
              priority: 0.8,
            });
          }
        });
      }
    }
  } catch (err) {
    console.warn('[Sitemap] Lỗi lấy bài viết blog từ RTDB:', err);
  }

  // B. Bổ sung bài viết từ Firestore nếu chưa có
  try {
    if (adminDb) {
      const snapshot = await adminDb
        .collection('blogs')
        .where('isPublished', '==', true)
        .get();

      snapshot.docs.forEach((doc) => {
        if (!processedBlogIds.has(doc.id)) {
          const item = doc.data();
          const lastMod = item.updatedAt || item.createdAt;
          blogRoutes.push({
            url: `${BASE_URL}/blog/${encodeURIComponent(doc.id)}`,
            lastModified: lastMod ? new Date(lastMod) : now,
            changeFrequency: 'weekly',
            priority: 0.8,
          });
        }
      });
    }
  } catch (err) {
    console.warn('[Sitemap] Lỗi lấy bài viết blog từ Firestore:', err);
  }

  // Nếu DB trống, đưa vào 2 bài viết mẫu mặc định để Google lập chỉ mục ngay
  if (blogRoutes.length === 0) {
    blogRoutes.push(
      {
        url: `${BASE_URL}/blog/thong-bao-tuyen-sinh-vb2-cand-2026`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.8,
      },
      {
        url: `${BASE_URL}/blog/bi-quyet-dat-diem-cao-tu-luan-xa-hoi`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.8,
      }
    );
  }

  // 3. Danh sách Đề thi CÔNG KHAI từ Firebase (Realtime Database & Firestore)
  // Chỉ lấy đề có cờ isPublic === true
  const examRoutes: MetadataRoute.Sitemap = [];
  const processedExamIds = new Set<string>();

  // A. Đọc từ Firebase Realtime Database
  try {
    const res = await fetch(`${FIREBASE_DB_URL}/exams.json`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(6000),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && typeof data === 'object') {
        Object.keys(data).forEach((key) => {
          const item = data[key];
          if (item && item.isPublic === true) {
            const id = item.id || key;
            const ca = (item.paperCode || item.examCode || 'CA1').toUpperCase();
            processedExamIds.add(id);

            const lastMod = item.updatedAt || item.b2UploadedAt || item.createdAt;
            examRoutes.push({
              url: `${BASE_URL}/exam?id=${encodeURIComponent(id)}&ca=${ca}`,
              lastModified: lastMod ? new Date(lastMod) : now,
              changeFrequency: 'weekly',
              priority: 0.8,
            });
          }
        });
      }
    }
  } catch (err) {
    console.warn('[Sitemap] Lỗi lấy đề thi từ Firebase RTDB:', err);
  }

  // B. Đọc bổ sung từ Firestore nếu RTDB chưa có
  try {
    if (adminDb) {
      const snapshot = await adminDb
        .collection('exams')
        .where('isPublic', '==', true)
        .get();

      snapshot.docs.forEach((doc) => {
        if (!processedExamIds.has(doc.id)) {
          const item = doc.data();
          const ca = (item.paperCode || item.examCode || 'CA1').toUpperCase();
          processedExamIds.add(doc.id);

          const lastMod = item.updatedAt || item.b2UploadedAt || item.createdAt;
          examRoutes.push({
            url: `${BASE_URL}/exam?id=${encodeURIComponent(doc.id)}&ca=${ca}`,
            lastModified: lastMod ? new Date(lastMod) : now,
            changeFrequency: 'weekly',
            priority: 0.8,
          });
        }
      });
    }
  } catch (err) {
    console.warn('[Sitemap] Lỗi lấy đề thi từ Firestore:', err);
  }

  return [...staticRoutes, ...blogRoutes, ...examRoutes];
}
