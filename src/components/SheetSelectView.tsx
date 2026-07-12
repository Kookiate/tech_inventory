import React, { useState } from 'react';
import { FileSpreadsheet, PlusCircle, ArrowRight, Info, HelpCircle } from 'lucide-react';

interface SheetSelectViewProps {
  onConnect: (id: string) => void;
  onCreateNew: () => Promise<void>;
  isProcessing: boolean;
  userEmail: string;
}

export default function SheetSelectView({ onConnect, onCreateNew, isProcessing, userEmail }: SheetSelectViewProps) {
  const [inputUrl, setInputUrl] = useState('');
  const [error, setError] = useState('');

  // ฟังก์ชันสกัด Spreadsheet ID จาก URL หรือ Input ตรงๆ
  const extractSpreadsheetId = (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return null;
    
    // หากระบุมาเป็น URL
    const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      return match[1];
    }
    
    // หากระบุมาเป็น ID ตรงๆ
    if (/^[a-zA-Z0-9-_]{15,}$/.test(trimmed)) {
      return trimmed;
    }
    
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const id = extractSpreadsheetId(inputUrl);
    if (!id) {
      setError('รหัสหรือลิงก์ของ Google Sheets ไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง');
      return;
    }
    
    onConnect(id);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl w-full mx-auto bg-white rounded-2xl shadow-xl shadow-slate-100 border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-6 text-white flex items-center gap-4 border-b border-slate-800">
          <div className="h-12 w-12 bg-emerald-500 rounded-xl flex items-center justify-center">
            <FileSpreadsheet className="h-6 w-6 text-slate-950" />
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold">ขั้นตอนการเชื่อมต่อฐานข้อมูล</h3>
            <p className="text-xs text-slate-400 font-sans">ลงชื่อเข้าใช้ด้วย: {userEmail}</p>
          </div>
        </div>

        <div className="p-8 space-y-8">
          {/* ส่วนที่ 1: แนะนำให้สร้างไฟล์ใหม่แบบคลิกเดียวผ่านระบบอัตโนมัติ */}
          <div className="bg-emerald-50/60 rounded-xl p-5 border border-emerald-100/80">
            <h4 className="text-emerald-950 font-semibold font-display text-base flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-emerald-600 shrink-0" />
              ทางเลือกที่ 1: สร้างไฟล์ใหม่ด้วยระบบอัตโนมัติ (แนะนำ 🚀)
            </h4>
            <p className="mt-2 text-sm text-emerald-800 leading-relaxed font-sans">
              ระบบจะสร้างไฟล์ Google Sheets ชนิดมีโครงสร้างที่ถูกต้อง พร้อมลงข้อมูลสต็อกตัวอย่างให้ทันทีใน Google Drive ของคุณเอง สะดวก รวดเร็ว และพร้อมใช้งานได้ใน 3 วินาที!
            </p>
            <div className="mt-4">
              <button
                type="button"
                onClick={onCreateNew}
                disabled={isProcessing}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white font-semibold font-sans py-3.5 px-4 rounded-xl hover:bg-emerald-700 focus:outline-none transition-all disabled:opacity-50 shadow-md shadow-emerald-600/10 cursor-pointer"
              >
                {isProcessing ? (
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>สร้างและเชื่อมต่อฐานข้อมูลอัตโนมัติ</>
                )}
              </button>
            </div>
          </div>

          <div className="relative flex items-center justify-center">
            <hr className="w-full border-slate-200" />
            <span className="absolute bg-white px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider font-sans">หรือ</span>
          </div>

          {/* ส่วนที่ 2: เชื่อมโยงไฟล์เดิม */}
          <div>
            <h4 className="text-slate-900 font-semibold font-display text-base flex items-center gap-2 mb-3">
              <FileSpreadsheet className="h-5 w-5 text-blue-600 shrink-0" />
              ทางเลือกที่ 2: ระบุลิงก์หรือรหัสของไฟล์ Google Sheets ที่มีอยู่
            </h4>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="spreadsheetUrl" className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide font-sans">
                  ลิงก์ไฟล์ Google Sheets หรือรหัสไอดี (ID)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="spreadsheetUrl"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/your-spreadsheet-id/..."
                    disabled={isProcessing}
                    className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 font-mono disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={isProcessing || !inputUrl.trim()}
                    className="px-5 py-3 bg-slate-950 text-white font-semibold rounded-xl hover:bg-slate-800 focus:outline-none disabled:opacity-40 transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    เชื่อมต่อ <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
                {error && <p className="mt-2 text-xs text-rose-600 font-semibold font-sans">{error}</p>}
              </div>
            </form>
          </div>

          {/* คำแนะนำโครงสร้างตาราง */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-slate-600">
            <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mb-2 font-sans">
              <Info className="h-3.5 w-3.5 text-blue-500" /> ข้อควรทราบกรณีเชื่อมต่อไฟล์เดิม
            </h5>
            <p className="text-xs leading-relaxed font-sans mb-2">
              ไฟล์ชีตของคุณจะต้องประกอบไปด้วย 2 แผ่นงาน (Tabs) ที่สะกดชื่อดังนี้:
            </p>
            <ul className="list-disc list-inside text-[11px] text-slate-500 font-sans space-y-1">
              <li><strong className="text-slate-700 font-mono">Inventory</strong>: คอลัมน์ [รหัสอะไหล่, ชื่ออะไหล่, หมวดหมู่, ตำแหน่งจัดเก็บ, คงเหลือ, หน่วยนับ, Min_Stock, Max_Stock]</li>
              <li><strong className="text-slate-700 font-mono">Transactions</strong>: คอลัมน์ [วันเวลา, รหัสอะไหล่, ชื่ออะไหล่, ประเภท, จำนวน, ชื่อช่าง, หมายเหตุ_เครื่องจักร]</li>
            </ul>
          </div>
        </div>
      </div>
      <div className="text-center mt-6 text-xs text-slate-400 font-sans">
        ต้องการความช่วยเหลือ? ติดต่อ Manufacturing Systems Developer แผนกซ่อมบำรุง
      </div>
    </div>
  );
}
