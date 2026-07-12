/**
 * แปลงลิงก์ Google Drive ทั่วไปให้เป็นลิงก์ Direct Link สำหรับแสดงผลในแท็ก <img> ได้ทันที
 * และให้คำแนะนำวิธีการแชร์ไฟล์รูปภาพใน Google Drive
 */
export function getEmbeddableImageUrl(url: string): string {
  if (!url) return '';

  const cleanUrl = url.trim();

  // ตรวจสอบว่าเป็นลิงก์ Google Drive หรือไม่
  if (cleanUrl.includes('drive.google.com')) {
    let fileId = '';

    // แบบที่ 1: /file/d/FILE_ID/view... หรือ /file/d/FILE_ID/edit
    if (cleanUrl.includes('/file/d/')) {
      const parts = cleanUrl.split('/file/d/');
      if (parts[1]) {
        fileId = parts[1].split('/')[0];
      }
    }
    // แบบที่ 2: ?id=FILE_ID หรือ &id=FILE_ID
    else if (cleanUrl.includes('?id=') || cleanUrl.includes('&id=')) {
      const urlObj = new URL(cleanUrl);
      fileId = urlObj.searchParams.get('id') || '';
    }

    if (fileId) {
      // ใช้ lh3.googleusercontent.com ซึ่งมีความเสถียรสูงและโหลดภาพไวมากในเบราว์เซอร์
      return `https://lh3.googleusercontent.com/u/0/d/${fileId}`;
    }
  }

  return cleanUrl;
}

/**
 * ตรวจสอบว่าลิงก์เป็น Google Drive หรือไม่
 */
export function isGoogleDriveUrl(url: string): boolean {
  return url.trim().includes('drive.google.com');
}
