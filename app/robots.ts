import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://onthivb2.io.vn';

  // Danh sách các đường dẫn YÊU CẦU ĐĂNG NHẬP, QUẢN TRỊ, DỮ LIỆU CÁ NHÂN VÀ HỆ THỐNG
  // Chặn hoàn toàn bot tìm kiếm (Googlebot, Bingbot...) để bảo mật và tối ưu crawl budget
  const disallowedPaths = [
    '/admin',
    '/admin/*',
    '/profile',
    '/profile/*',
    '/import',
    '/import/*',
    '/upload-history',
    '/upload-history/*',
    '/result',
    '/result/*',
    '/login',
    '/register',
    '/signup',
    '/api/*',
    '/_next/*',
  ];

  // Danh sách các trang CÔNG KHAI phục vụ SEO và người dùng chưa cần đăng nhập
  const allowedPaths = [
    '/',
    '/select-exam',
    '/about',
    '/blog',
    '/blog/*',
    '/exam*',
  ];

  return {
    rules: [
      {
        userAgent: '*',
        allow: allowedPaths,
        disallow: disallowedPaths,
      },
      {
        userAgent: 'Googlebot',
        allow: allowedPaths,
        disallow: disallowedPaths,
      },
      {
        userAgent: 'Bingbot',
        allow: allowedPaths,
        disallow: disallowedPaths,
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
