import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';

// กำหนดการตั้งค่า Firebase (ใช้ค่าคอนฟิกจริงเป็นค่าเริ่มต้นเพื่อป้องกันความผิดพลาดเมื่ออัปโหลดขึ้น GitHub)
const metaEnv = (import.meta as any).env || {};
const firebaseConfig = {
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || "inventory-b9bef",
  appId: metaEnv.VITE_FIREBASE_APP_ID || "1:295292781444:web:56dabe95054b70a5cb93d1",
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || "AIzaSyDcQWv7c1E7GZluwqAKkTRoDMpZvv9TuH8",
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || "inventory-b9bef.firebaseapp.com",
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || "inventory-b9bef.firebasestorage.app",
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || "295292781444",
  measurementId: metaEnv.VITE_FIREBASE_MEASUREMENT_ID || "G-DK437JKV4X"
};

// เริ่มการทำงานของแอปพลิเคชัน Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// ตั้งค่าผู้ให้บริการ Google Auth
export const provider = new GoogleAuthProvider();

// กำหนดสิทธิ์ Google Sheets Scope
provider.addScope('https://www.googleapis.com/auth/spreadsheets');

// เก็บแคชของ Token ไว้ในหน่วยความจำชั่วคราว
let cachedAccessToken: string | null = null;
let isSigningIn = false;

/**
 * ติดตามสถานะการเข้าสู่ระบบ
 */
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        // หากมี User แต่ไม่มี Token ในตัวแปรแคช (เช่น เพิ่งรีเฟรชหน้า)
        // จำเป็นต้องร้องขอสิทธิ์ล็อกอินใหม่เพื่อให้ได้ Token ล่าสุด
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * เรียกใช้งานหน้าต่างป๊อปอัปเข้าสู่ระบบของ Google
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Google OAuth credential');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign-In Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * ดึง Token ปัจจุบันที่แคชอยู่
 */
export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

/**
 * กำหนดค่า Token จากภายนอก
 */
export const setAccessToken = (token: string) => {
  cachedAccessToken = token;
};

/**
 * ออกจากระบบ
 */
export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};
