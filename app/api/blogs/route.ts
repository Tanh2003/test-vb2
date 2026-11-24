import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

const RTDB_URL =
  process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ||
  'https://exam-vb2-default-rtdb.asia-southeast1.firebasedatabase.app';

export interface BlogPost {
  id: string;
  title: string;
  slug?: string;
  summary: string;
  content: string;
  coverImage?: string;
  category: 'TIN_TUYEN_SINH' | 'KINH_NGHIEM_THI' | 'QUY_CHE_ON_THI' | 'THONG_BAO';
  author: string;
  authorRole?: string;
  isPublished: boolean;
  featured?: boolean;
  views?: number;
  createdAt: string;
  updatedAt: string;
}

// Dữ liệu bài viết mẫu khởi tạo ban đầu nếu cơ sở dữ liệu chưa có bài viết
const INITIAL_BLOGS: BlogPost[] = [
  {
    id: 'thong-bao-tuyen-sinh-vb2-cand-2026',
    title: 'Thông báo chỉ tiêu & Hướng dẫn tuyển sinh Văn bằng 2 Công an nhân dân năm 2026',
    slug: 'thong-bao-tuyen-sinh-vb2-cand-2026',
    summary: 'Bộ Công An công bố đề án tuyển sinh đào tạo trình độ đại học đối với người đã có bằng tốt nghiệp đại học trở lên vào các trường CAND năm 2026.',
    content: `## 1. Đối tượng và điều kiện dự tuyển

Công dân Việt Nam đã tốt nghiệp đại học hình thức chính quy, văn bằng do các cơ sở giáo dục đại học trong nước hoặc nước ngoài cấp (được Cục Quản lý chất lượng - Bộ GD&ĐT công nhận).
- **Độ tuổi:** Không quá 30 tuổi tính đến năm dự tuyển.
- **Tiêu chuẩn chính trị:** Đảm bảo tiêu chuẩn chính trị theo quy định hiện hành của Bộ Công an.
- **Tiêu chuẩn sức khỏe:** Chiều cao từ 1m64 đến 1m95 đối với nam, từ 1m58 đến 1m80 đối với nữ. Thị lực không kính mỗi mắt đạt 9-10/10, tổng thị lực 2 mắt đạt từ 18-20/10.

## 2. Phương thức và cấu trúc bài thi tuyển sinh

Thí sinh thực hiện 01 bài thi tổng hợp kéo dài **150 phút**, thang điểm **100 điểm**:
- **Phần I: Tự luận Nghị luận xã hội (30 điểm)**: Thời lượng viết yêu cầu tối thiểu 500 từ, đánh giá năng lực lập luận, tư duy chính trị - xã hội và kiến thức thực tiễn.
- **Phần II: Phần Chuyên ngành (70 điểm)**: Thí sinh lựa chọn 01 trong 04 mã ca thi phù hợp với văn bằng tốt nghiệp:
  - **Mã CA1:** Toán cao cấp (Dành cho khối Tự nhiên, Công nghệ thông tin, Kỹ thuật).
  - **Mã CA2:** Kinh tế vĩ mô (Dành cho khối Kinh tế, Quản trị, Tài chính).
  - **Mã CA3:** Triết học Mác - Lênin (Dành cho khối Xã hội và Nhân văn).
  - **Mã CA4:** Lý luận Nhà nước và Pháp luật (Dành cho khối Luật học và Quản lý nhà nước).

## 3. Lời khuyên ôn tập từ Ban Quản Trị

Thí sinh nên luyện tập bấm giờ 150 phút thực tế trên hệ thống **onthivb2.io.vn** để rèn luyện thói quen phân bổ thời gian: dành 45-50 phút cho bài viết tự luận và 90-100 phút cho các câu hỏi chuyên ngành.`,
    coverImage: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1200&q=80',
    category: 'TIN_TUYEN_SINH',
    author: 'Ban Quản Trị Tuyển Sinh CAND',
    authorRole: 'Admin',
    isPublished: true,
    featured: true,
    views: 1240,
    createdAt: '2026-11-20T08:00:00.000Z',
    updatedAt: '2026-11-20T08:00:00.000Z',
  },
  {
    id: 'bi-quyet-dat-diem-cao-tu-luan-xa-hoi',
    title: 'Bí quyết viết bài Tự luận Nghị luận Xã hội (30 điểm) đạt điểm tối đa',
    slug: 'bi-quyet-dat-diem-cao-tu-luan-xa-hoi',
    summary: 'Phân tích cấu trúc 3 phần mở bài - thân bài - kết bài, phương pháp lấy dẫn chứng gắn liền với thực tiễn lý luận và nhiệm vụ bảo vệ an ninh trật tự.',
    content: `## Cấu trúc bài viết chuẩn Nghị luận Xã hội (Thang 30 điểm)

Bài thi tự luận chiếm đến **30% tổng số điểm** của toàn bài thi. Để đạt điểm từ 24 - 28/30 điểm, bài viết cần đáp ứng các tiêu chí sau:

### 1. Đảm bảo dung lượng tối thiểu 500 từ
Hệ thống phòng thi trực tuyến của onthivb2.io.vn có bộ đếm từ tự động. Bài viết dưới 500 từ sẽ bị trừ điểm theo thang barem chuẩn. Thí sinh nên viết từ 550 - 750 từ để đảm bảo phân tích đủ sâu.

### 2. Bố cục 3 phần rõ ràng:
- **Mở bài (khoảng 60 - 80 từ):** Dẫn dắt vấn đề nghị luận, trích dẫn tư tưởng hoặc nhận định của đề bài và khẳng định tính cấp thiết đối với đời sống xã hội.
- **Thân bài (khoảng 400 - 550 từ):**
  - *Giải thích:* Làm rõ các khái niệm, từ khóa trọng tâm của đề bài.
  - *Bình luận & Phân tích:* Nêu nguyên nhân, thực trạng và ý nghĩa của vấn đề. Đưa ra ít nhất 2 dẫn chứng thực tế thuyết phục (ví dụ: tinh thần phụng sự của lực lượng vũ trang nhân dân, công cuộc chuyển đổi số quốc gia, giữ gìn an ninh mạng...).
  - *Phản đề & Mở rộng:* Phê phán các hiện tượng tiêu cực, lệch lạc, thiếu trách nhiệm đối với cộng đồng.
- **Kết bài (khoảng 60 - 80 từ):** Khái quát lại bài học nhận thức và liên hệ hành động cụ thể của bản thân khi đứng trước nguyện vọng cống hiến cho Tổ quốc và lực lượng Công an nhân dân.`,
    coverImage: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=80',
    category: 'KINH_NGHIEM_THI',
    author: 'Tổ Chuyên Môn Lý Luận Chính Trị',
    authorRole: 'Admin',
    isPublished: true,
    featured: true,
    views: 980,
    createdAt: '2026-11-22T09:30:00.000Z',
    updatedAt: '2026-11-22T09:30:00.000Z',
  },
  {
    id: 'huong-dan-on-thi-toan-cao-cap-ca1',
    title: 'Chiến thuật ôn tập môn Toán cao cấp (Mã CA1) cho dân Kỹ thuật & CNTT',
    slug: 'huong-dan-on-thi-toan-cao-cap-ca1',
    summary: 'Tổng hợp các dạng bài Đại số tuyến tính, Giải tích 1 & Giải tích 2 thường xuất hiện trong đề thi tuyển sinh Văn bằng 2.',
    content: `## Trọng tâm kiến thức đề thi CA1 (70 điểm)

Mã đề CA1 gồm **45 câu trắc nghiệm khách quan** và **5 câu trả lời ngắn số học**. Các chuyên đề trọng tâm bao gồm:

1. **Đại số tuyến tính:**
   - Ma trận và định thức (tính định thức cấp n, tìm ma trận nghịch đảo).
   - Hệ phương trình tuyến tính (định lý Kronecker-Capelli, phương pháp Gauss).
   - Không gian vectơ, cơ sở và số chiều, tìm trị riêng và vectơ riêng.

2. **Giải tích:**
   - Đạo hàm và vi phân hàm một biến và nhiều biến.
   - Ứng dụng cực trị tự do và cực trị có điều kiện của hàm nhiều biến.
   - Tích phân suy rộng loại 1 và loại 2.
   - Phương trình vi phân cấp 1 và cấp 2 hệ số hằng.

Hệ thống đã hỗ trợ hiển thị công thức toán học định dạng LaTeX sắc nét trên cả máy tính và điện thoại để thí sinh ôn tập thuận tiện nhất.`,
    coverImage: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=1200&q=80',
    category: 'QUY_CHE_ON_THI',
    author: 'Ban Giảng Viên Khối Tự Nhiên',
    authorRole: 'Admin',
    isPublished: true,
    featured: false,
    views: 750,
    createdAt: '2026-11-23T14:15:00.000Z',
    updatedAt: '2026-11-23T14:15:00.000Z',
  },
];

// Helper đồng bộ dữ liệu mẫu vào RTDB nếu trống
async function ensureInitialBlogsInRTDB(existingBlogs: Record<string, BlogPost>) {
  if (Object.keys(existingBlogs).length === 0) {
    try {
      const updates: Record<string, BlogPost> = {};
      INITIAL_BLOGS.forEach((b) => {
        updates[b.id] = b;
      });
      await fetch(`${RTDB_URL}/blogs.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      return updates;
    } catch {}
  }
  return existingBlogs;
}

// GET: Lấy danh sách bài viết hoặc chi tiết 1 bài viết
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const blogId = searchParams.get('id') || searchParams.get('slug');
    const category = searchParams.get('category');
    const adminOnly = searchParams.get('adminOnly') === 'true';

    const blogMap = new Map<string, BlogPost>();

    // 1. Đọc từ Realtime Database
    try {
      const res = await fetch(`${RTDB_URL}/blogs.json`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        let data = await res.json();
        if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
          data = await ensureInitialBlogsInRTDB({});
        }
        if (data && typeof data === 'object') {
          Object.keys(data).forEach((k) => {
            if (data[k]) {
              blogMap.set(k, { ...data[k], id: data[k].id || k });
            }
          });
        }
      }
    } catch (rtdbErr) {
      console.warn('Lỗi đọc RTDB blogs:', rtdbErr);
    }

    // 2. Đọc bổ sung từ Firestore
    try {
      if (adminDb) {
        const snap = await adminDb.collection('blogs').get();
        if (!snap.empty) {
          snap.docs.forEach((doc) => {
            const item = doc.data() as BlogPost;
            if (!blogMap.has(doc.id)) {
              blogMap.set(doc.id, { ...item, id: doc.id });
            }
          });
        }
      }
    } catch (fsErr) {
      console.warn('Lỗi đọc Firestore blogs:', fsErr);
    }

    // Nếu cả 2 nơi đều rỗng, nạp dữ liệu mẫu
    if (blogMap.size === 0) {
      INITIAL_BLOGS.forEach((b) => blogMap.set(b.id, b));
    }

    let allBlogs = Array.from(blogMap.values());

    // 3. Nếu tìm 1 bài viết cụ thể
    if (blogId) {
      const matched = allBlogs.find(
        (b) => b.id === blogId || b.slug === blogId
      );
      if (!matched) {
        return NextResponse.json({ error: 'Không tìm thấy bài viết' }, { status: 404 });
      }
      return NextResponse.json(matched);
    }

    // 4. Lọc bài viết
    if (!adminOnly) {
      // Người dùng chỉ xem bài đã xuất bản
      allBlogs = allBlogs.filter((b) => b.isPublished !== false);
    }

    if (category && category !== 'ALL') {
      allBlogs = allBlogs.filter((b) => b.category === category);
    }

    // Sắp xếp bài mới nhất lên đầu
    allBlogs.sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );

    return NextResponse.json(allBlogs);
  } catch (error: any) {
    console.error('Lỗi API Blogs:', error);
    return NextResponse.json(
      { error: error?.message || 'Lỗi xử lý bài viết' },
      { status: 500 }
    );
  }
}

// POST: Tạo hoặc cập nhật bài viết (dành cho Admin)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id,
      title,
      summary,
      content,
      coverImage,
      category = 'TIN_TUYEN_SINH',
      author = 'Ban Quản Trị',
      authorRole = 'Admin',
      isPublished = true,
      featured = false,
    } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Tiêu đề và nội dung bài viết không được để trống' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const blogId =
      id ||
      `post_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // Tạo slug tiếng Việt không dấu đơn giản
    const slug =
      body.slug ||
      title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') ||
      blogId;

    const blogPost: BlogPost = {
      id: blogId,
      slug,
      title,
      summary: summary || title,
      content,
      coverImage: coverImage || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1200&q=80',
      category,
      author,
      authorRole,
      isPublished: Boolean(isPublished),
      featured: Boolean(featured),
      views: body.views || 0,
      createdAt: body.createdAt || now,
      updatedAt: now,
    };

    // 1. Lưu vào Realtime Database
    try {
      await fetch(`${RTDB_URL}/blogs/${blogId}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(blogPost),
      });
    } catch (rtdbErr) {
      console.warn('Lỗi ghi RTDB blog:', rtdbErr);
    }

    // 2. Lưu vào Firestore
    try {
      if (adminDb) {
        await adminDb.collection('blogs').doc(blogId).set(blogPost, { merge: true });
      }
    } catch (fsErr) {
      console.warn('Lỗi ghi Firestore blog:', fsErr);
    }

    return NextResponse.json({ success: true, blog: blogPost });
  } catch (error: any) {
    console.error('Lỗi tạo bài viết:', error);
    return NextResponse.json(
      { error: error?.message || 'Không thể lưu bài viết' },
      { status: 500 }
    );
  }
}

// DELETE: Xóa bài viết
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Thiếu mã bài viết cần xóa' }, { status: 400 });
    }

    // 1. Xóa khỏi RTDB
    try {
      await fetch(`${RTDB_URL}/blogs/${id}.json`, {
        method: 'DELETE',
      });
    } catch {}

    // 2. Xóa khỏi Firestore
    try {
      if (adminDb) {
        await adminDb.collection('blogs').doc(id).delete();
      }
    } catch {}

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Lỗi xóa bài viết' }, { status: 500 });
  }
}
