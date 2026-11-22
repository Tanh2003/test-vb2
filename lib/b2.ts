import crypto from 'crypto';

interface B2AuthData {
  accountId: string;
  authorizationToken: string;
  apiUrl: string;
  downloadUrl: string;
  expiresAt: number;
}

let cachedAuth: B2AuthData | null = null;
let cachedBucketId: string | null = null;

const B2_KEY_ID = process.env.B2_KEY_ID || 'd4eba599bc44';
const B2_APPLICATION_KEY = process.env.B2_APPLICATION_KEY || '0053dbaa043b660147c574a76b04438f3c230a615c';
const B2_BUCKET_NAME = process.env.B2_BUCKET_NAME || 'file-vb2';

/**
 * Xác thực tài khoản với Backblaze B2 Native API (Cache token 12h)
 */
export async function getB2Auth(): Promise<B2AuthData> {
  const now = Date.now();
  if (cachedAuth && cachedAuth.expiresAt > now + 60000) {
    return cachedAuth;
  }

  const credentials = Buffer.from(`${B2_KEY_ID}:${B2_APPLICATION_KEY}`).toString('base64');
  const res = await fetch('https://api.backblazeb2.com/b2api/v3/b2_authorize_account', {
    headers: {
      Authorization: `Basic ${credentials}`,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Lỗi xác thực Backblaze B2: ${res.status} - ${errText}`);
  }

  const data = await res.json();
  cachedAuth = {
    accountId: data.accountId,
    authorizationToken: data.authorizationToken,
    apiUrl: data.apiInfo?.storageApi?.apiUrl || 'https://api005.backblazeb2.com',
    downloadUrl: data.apiInfo?.storageApi?.downloadUrl || 'https://f005.backblazeb2.com',
    // Backblaze tokens are valid for 24 hours; we refresh after 12 hours
    expiresAt: now + 12 * 60 * 60 * 1000,
  };

  return cachedAuth;
}

/**
 * Lấy Bucket ID từ Bucket Name
 */
export async function getBucketId(bucketName: string = B2_BUCKET_NAME): Promise<string> {
  if (cachedBucketId) {
    return cachedBucketId;
  }

  const auth = await getB2Auth();
  const res = await fetch(`${auth.apiUrl}/b2api/v3/b2_list_buckets`, {
    method: 'POST',
    headers: {
      Authorization: auth.authorizationToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      accountId: auth.accountId,
    }),
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Không thể lấy danh sách Bucket từ B2: ${res.status}`);
  }

  const data = await res.json();
  const bucket = (data.buckets || []).find((b: any) => b.bucketName === bucketName);

  if (!bucket) {
    throw new Error(`Không tìm thấy bucket có tên "${bucketName}" trên Backblaze B2`);
  }

  cachedBucketId = bucket.bucketId;
  return bucket.bucketId;
}

export interface UploadB2Result {
  fileId: string;
  fileName: string;
  fileSize: number;
  bucketName: string;
  directUrl: string;
  authorizedUrl: string;
  proxyUrl: string;
  uploadedAt: string;
}

/**
 * Upload Buffer lên Backblaze B2 và sinh URL tải an toàn
 */
export async function uploadBufferToB2({
  buffer,
  fileName,
  contentType = 'application/pdf',
  folder = 'exams',
}: {
  buffer: Buffer;
  fileName: string;
  contentType?: string;
  folder?: string;
}): Promise<UploadB2Result> {
  const auth = await getB2Auth();
  const bucketId = await getBucketId(B2_BUCKET_NAME);

  // 1. Xin URL upload
  const upRes = await fetch(`${auth.apiUrl}/b2api/v3/b2_get_upload_url`, {
    method: 'POST',
    headers: {
      Authorization: auth.authorizationToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ bucketId }),
    cache: 'no-store',
  });

  if (!upRes.ok) {
    const errText = await upRes.text();
    throw new Error(`Lỗi xin URL upload từ B2: ${upRes.status} - ${errText}`);
  }

  const upData = await upRes.json();
  const uploadUrl = upData.uploadUrl;
  const uploadAuthToken = upData.authorizationToken;

  // 2. Tính SHA1 của file
  const sha1 = crypto.createHash('sha1').update(buffer).digest('hex');

  // Chuẩn hóa đường dẫn file trong bucket: folder/safe_fileName
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const targetKey = `${folder}/${safeName}`;

  // 3. Thực hiện upload
  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: uploadAuthToken,
      'X-Bz-File-Name': encodeURIComponent(targetKey),
      'Content-Type': contentType,
      'Content-Length': buffer.length.toString(),
      'X-Bz-Content-Sha1': sha1,
    },
    body: new Uint8Array(buffer),
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`Lỗi upload tệp lên B2: ${uploadRes.status} - ${errText}`);
  }

  const uploadedData = await uploadRes.json();

  // 4. Tạo token tải tệp an toàn (hợp lệ 7 ngày)
  const authDlRes = await fetch(`${auth.apiUrl}/b2api/v3/b2_get_download_authorization`, {
    method: 'POST',
    headers: {
      Authorization: auth.authorizationToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      bucketId,
      fileNamePrefix: targetKey,
      validDurationInSeconds: 86400 * 7, // 7 ngày
    }),
    cache: 'no-store',
  });

  let dlToken = '';
  if (authDlRes.ok) {
    const dlAuthData = await authDlRes.json();
    dlToken = dlAuthData.authorizationToken || '';
  }

  const directUrl = `${auth.downloadUrl}/file/${B2_BUCKET_NAME}/${targetKey}`;
  const authorizedUrl = dlToken ? `${directUrl}?Authorization=${dlToken}` : directUrl;
  const proxyUrl = `/api/files/view?key=${encodeURIComponent(targetKey)}`;

  return {
    fileId: uploadedData.fileId,
    fileName: targetKey,
    fileSize: buffer.length,
    bucketName: B2_BUCKET_NAME,
    directUrl,
    authorizedUrl,
    proxyUrl,
    uploadedAt: new Date().toISOString(),
  };
}

/**
 * Tải file từ B2 dưới dạng Node fetch response (dùng cho API streaming proxy)
 */
export async function downloadFileFromB2(fileKey: string): Promise<{
  stream: ReadableStream<Uint8Array> | null;
  contentType: string;
  contentLength?: string | null;
}> {
  const auth = await getB2Auth();
  const bucketId = await getBucketId(B2_BUCKET_NAME);

  // Lấy authorization token tải file
  const authDlRes = await fetch(`${auth.apiUrl}/b2api/v3/b2_get_download_authorization`, {
    method: 'POST',
    headers: {
      Authorization: auth.authorizationToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      bucketId,
      fileNamePrefix: fileKey,
      validDurationInSeconds: 3600,
    }),
    cache: 'no-store',
  });

  let downloadUrl = `${auth.downloadUrl}/file/${B2_BUCKET_NAME}/${fileKey}`;
  if (authDlRes.ok) {
    const dlAuthData = await authDlRes.json();
    if (dlAuthData.authorizationToken) {
      downloadUrl += `?Authorization=${dlAuthData.authorizationToken}`;
    }
  }

  const fileRes = await fetch(downloadUrl);
  if (!fileRes.ok) {
    throw new Error(`Lỗi tải file từ B2: ${fileRes.status}`);
  }

  return {
    stream: fileRes.body,
    contentType: fileRes.headers.get('content-type') || 'application/pdf',
    contentLength: fileRes.headers.get('content-length'),
  };
}
