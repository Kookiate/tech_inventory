import React from 'react';
import { ShieldAlert, LogOut, FileSpreadsheet, Mail, HelpCircle } from 'lucide-react';

interface UnauthorizedViewProps {
  userEmail: string;
  authError: string;
  onLogout: () => void;
  onDisconnect: () => void;
}

export default function UnauthorizedView({ userEmail, authError, onLogout, onDisconnect }: UnauthorizedViewProps) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full mx-auto bg-white rounded-2xl shadow-xl shadow-slate-100 border border-slate-200/60 overflow-hidden animate-fade-in font-sans">
        {/* Banner Alert Header */}
        <div className="bg-rose-600 px-6 py-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(254,226,226,0.25),transparent)]" />
          <div className="mx-auto h-16 w-16 bg-white rounded-2xl flex items-center justify-center shadow-lg mb-4 text-rose-600">
            <ShieldAlert className="h-9 w-9 stroke-[1.75]" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            ไม่มีสิทธิ์เข้าใช้งานระบบ
          </h2>
          <p className="mt-1 text-rose-100 text-xs">
            Access Restricted by System Policy
          </p>
        </div>

        <div className="px-8 py-10">
          <div className="space-y-6">
            {/* Account Info */}
            <div className="bg-slate-50 border border-slate-150 rounded-xl p-4 flex items-center gap-3">
              <div className="h-10 w-10 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center shrink-0">
                <Mail className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">บัญชีที่กำลังเข้าสู่ระบบ</p>
                <p className="text-sm font-semibold text-slate-800 truncate">{userEmail}</p>
              </div>
            </div>

            {/* Error Message Description */}
            <div className="text-slate-600 text-sm leading-relaxed space-y-3">
              <p className="text-rose-700 font-semibold bg-rose-50/70 border border-rose-100/50 rounded-lg p-3 text-xs leading-relaxed">
                {authError}
              </p>
              
              <div className="border-t border-slate-100 pt-4">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-2 uppercase tracking-wide">
                  <HelpCircle className="h-4 w-4 text-blue-500" /> วิธีการขอรับสิทธิ์เข้าใช้งาน:
                </h4>
                <ol className="list-decimal list-inside text-xs text-slate-500 space-y-1.5 pl-1 leading-relaxed">
                  <li>ติดต่อ <strong className="text-slate-700">ผู้ดูแลระบบคลังอะไหล่ (เจ้าของสเปรดชีต)</strong></li>
                  <li>ขอให้เพิ่มบัญชีอีเมล <strong className="text-rose-600 font-mono select-all">{userEmail}</strong> ลงในแท็บชีต <strong className="text-slate-700">"AuthorizedUsers"</strong></li>
                  <li>เมื่อได้รับการเพิ่มรายชื่อแล้ว ให้กดปุ่มรีเฟรชหรือล็อกอินเข้าสู่ระบบใหม่อีกครั้ง</li>
                </ol>
              </div>
            </div>

            {/* Actions Panel */}
            <div className="space-y-3 pt-2">
              <button
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-sm transition-all cursor-pointer shadow-sm"
              >
                <LogOut className="h-4 w-4" />
                <span>ลงชื่อเข้าใช้งานด้วยบัญชี Google อื่น</span>
              </button>

              <button
                onClick={onDisconnect}
                className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 font-semibold rounded-xl text-xs transition-all cursor-pointer"
              >
                <FileSpreadsheet className="h-4 w-4 text-slate-400" />
                <span>เปลี่ยนการเชื่อมต่อฐานข้อมูล (สเปรดชีต)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="text-center mt-6 text-xs text-slate-400 font-sans">
        © 2026 Spare Part Control App. Security Enforcement Module.
      </div>
    </div>
  );
}
