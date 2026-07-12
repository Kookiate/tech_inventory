import React from 'react';
import { Settings, Shield, FileSpreadsheet, Lock } from 'lucide-react';

interface LoginViewProps {
  onLogin: () => void;
  isLoggingIn: boolean;
}

export default function LoginView({ onLogin, isLoggingIn }: LoginViewProps) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full mx-auto bg-white rounded-2xl shadow-xl shadow-slate-100 border border-slate-100 overflow-hidden">
        {/* Banner */}
        <div className="bg-slate-900 px-6 py-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(51,65,85,0.4),transparent)]" />
          <div className="mx-auto h-16 w-16 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20 mb-4 animate-pulse">
            <Settings className="h-9 w-9 text-slate-950 stroke-[1.75]" />
          </div>
          <h2 className="font-display text-2xl font-semibold text-white tracking-tight">
            Spare Part Control App
          </h2>
          <p className="mt-1 text-slate-400 text-sm font-sans">
            ระบบควบคุมสต็อกอะไหล่สำรอง (ไลน์ผลิตโรงงาน)
          </p>
        </div>

        <div className="px-8 py-10">
          <div className="space-y-6">
            <div className="text-center">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 font-sans">
                <Shield className="h-3.5 w-3.5 mr-1" /> สำหรับวิศวกรและช่างเทคนิคซ่อมบำรุง
              </span>
              <p className="mt-4 text-slate-600 text-sm leading-relaxed">
                ลงชื่อเข้าใช้งานด้วยบัญชี Google เพื่อเชื่อมต่อฐานข้อมูลคลังอะไหล่และประวัติการเบิกจ่ายจาก Google Sheets ของแผนกซ่อมบำรุงโดยตรง
              </p>
            </div>

            {/* คุณสมบัติหลัก */}
            <div className="bg-slate-50 rounded-xl p-4 space-y-3.5 border border-slate-100">
              <div className="flex items-start">
                <FileSpreadsheet className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
                <div className="ml-3">
                  <h4 className="text-sm font-semibold text-slate-800">เชื่อมต่อ Google Sheets โดยตรง</h4>
                  <p className="text-xs text-slate-500">บันทึกประวัติการเบิก-รับ และตัดยอดแบบเรียลไทม์ 100%</p>
                </div>
              </div>
              <div className="flex items-start">
                <Lock className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                <div className="ml-3">
                  <h4 className="text-sm font-semibold text-slate-800">ความปลอดภัยมาตรฐานระดับองค์กร</h4>
                  <p className="text-xs text-slate-500">จำกัดการเข้าใช้งานเฉพาะผู้ที่ได้รับมอบหมายสิทธิ์เท่านั้น</p>
                </div>
              </div>
            </div>

            {/* ปุ่มล็อกอินขนาดใหญ่ */}
            <div>
              <button
                onClick={onLogin}
                disabled={isLoggingIn}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 border border-slate-200 rounded-xl shadow-sm text-base font-semibold text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isLoggingIn ? (
                  <div className="h-5 w-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                  </svg>
                )}
                <span className="font-sans font-medium text-slate-800">เข้าสู่ระบบด้วย Google</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="text-center mt-6 text-xs text-slate-400 font-sans">
        © 2026 Spare Part Control App. Manufacturing Systems Division.
      </div>
    </div>
  );
}
