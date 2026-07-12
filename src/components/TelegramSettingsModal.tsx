import React, { useState, useEffect } from 'react';
import { getTelegramSettings, saveTelegramSettings, sendTelegramMessage } from '../utils/telegram';
import { Send, Bell, Info, ShieldCheck, X, AlertCircle } from 'lucide-react';

interface TelegramSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (enabled: boolean) => void;
}

export default function TelegramSettingsModal({ isOpen, onClose, onSave }: TelegramSettingsModalProps) {
  const [enabled, setEnabled] = useState(false);
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  
  const [showToken, setShowToken] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // โหลดค่าตอนเปิด Modal
  useEffect(() => {
    if (isOpen) {
      const settings = getTelegramSettings();
      setEnabled(settings.enabled);
      setBotToken(settings.botToken);
      setChatId(settings.chatId);
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // ฟังก์ชันทดสอบความถูกต้องและการเชื่อมต่อ
  const handleTestConnection = async () => {
    if (!botToken.trim() || !chatId.trim()) {
      setTestResult({
        type: 'error',
        message: '❌ กรุณากรอก Bot Token และ Chat ID ให้ครบถ้วนก่อนทำการทดสอบ'
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const testText = `
🔔 <b>[ระบบคลังอะไหล่] ทดสอบการเชื่อมต่อ Telegram สำเร็จ!</b>
━━━━━━━━━━━━━━━━━━━━━
🎉 ยินดีด้วย! บอทของคุณสามารถเชื่อมต่อกับระบบควบคุมพัสดุและงานซ่อมแซมเรียบร้อยแล้ว
📡 พร้อมส่งสัญญาณแจ้งเตือนค่าใช้จ่ายเบิกจ่าย และวิเคราะห์สต็อกวิกฤตทันที
⏰ <i>เวลาเปิดใช้งาน: ${new Date().toLocaleString('th-TH')}</i>
      `.trim();

      await sendTelegramMessage(botToken, chatId, testText);
      setTestResult({
        type: 'success',
        message: '✅ ส่งข้อความทดสอบสำเร็จ! โปรดตรวจสอบในแอปพลิเคชัน Telegram ของคุณ'
      });
    } catch (error: any) {
      console.error('Telegram test error:', error);
      setTestResult({
        type: 'error',
        message: `❌ เชื่อมต่อล้มเหลว: ${error.message || 'โปรดตรวจเช็ค Token หรือ Chat ID อีกครั้ง'}`
      });
    } finally {
      setIsTesting(false);
    }
  };

  // บันทึกการตั้งค่าลงเบราว์เซอร์
  const handleSaveSettings = () => {
    saveTelegramSettings(enabled, botToken, chatId);
    onSave(enabled);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 flex flex-col space-y-4 max-h-[90vh] overflow-y-auto">
        
        {/* หัวข้อโมดอล */}
        <div className="flex justify-between items-center pb-2 border-b border-slate-150">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 bg-sky-50 rounded-lg flex items-center justify-center text-sky-600">
              <Send className="h-5 w-5 fill-sky-500/20 stroke-[2]" />
            </div>
            <div>
              <h3 className="text-base font-bold font-display text-slate-900">
                ตั้งค่าระบบการแจ้งเตือน Telegram (Telegram Alerts)
              </h3>
              <p className="text-[11px] text-slate-400 font-sans">
                ส่งบิลเบิกค่าอะไหล่ งานซ่อม และแจ้งเตือนสต็อกจุดวิกฤตเข้ากลุ่มช่างทันที
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="h-8 w-8 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ฟอร์มการกรอกข้อมูล */}
        <div className="space-y-4 font-sans text-xs">
          
          {/* เปิด/ปิดการทำงาน */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex gap-2 items-start">
              <Bell className="h-5 w-5 text-sky-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-950 block">เปิดใช้งานการแจ้งเตือน (Enable Notifications)</span>
                <span className="text-[10px] text-slate-400">เมื่อเปิดระบบจะส่งข้อมูลวิกฤตเข้า Telegram เสมอหลังการเบิกพัสดุ</span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={enabled} 
                onChange={(e) => setEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-350 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>

          {/* Bot Token */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 flex items-center justify-between">
              <span>1. รหัสบอท Telegram (Telegram Bot Token)</span>
              <button 
                type="button" 
                onClick={() => setShowToken(!showToken)}
                className="text-[10px] text-sky-600 hover:underline font-semibold cursor-pointer"
              >
                {showToken ? 'ปิดบังรหัส' : 'แสดงรหัส'}
              </button>
            </label>
            <input 
              type={showToken ? 'text' : 'password'}
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              placeholder="เช่น 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
              className="w-full px-3.5 py-3 rounded-xl bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 font-mono text-xs transition-all outline-none"
            />
          </div>

          {/* Chat ID */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800">
              2. ไอดีห้องแชท หรือ กลุ่มไอดี (Telegram Chat ID / Group ID)
            </label>
            <input 
              type="text" 
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              placeholder="เช่น -1001234567890 (สำหรับกลุ่ม) หรือ 123456789 (ส่วนตัว)"
              className="w-full px-3.5 py-3 rounded-xl bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 font-mono text-xs transition-all outline-none"
            />
          </div>

          {/* คู่มือช่วยเหลือด่วน */}
          <div className="p-3 bg-sky-50/50 border border-sky-100 rounded-xl text-sky-950 leading-relaxed space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-sky-900 text-[11px]">
              <Info className="h-4 w-4 shrink-0" />
              <span>วิธีตั้งค่าแจ้งเตือน Telegram ภายใน 2 นาที:</span>
            </div>
            <ol className="list-decimal list-inside pl-1 text-[10.5px] text-slate-600 space-y-1">
              <li>เปิด Telegram ค้นหา <b>@BotFather</b> แล้วส่งคำสั่ง <code>/newbot</code> เพื่อรับ <b>Bot Token</b></li>
              <li>สร้างกลุ่มไลน์/กลุ่มช่างเทคนิคใน Telegram แล้วดึง บอทตัวใหม่ของคุณ เข้าร่วมกลุ่ม</li>
              <li>พิมพ์ส่งข้อความคุยในกลุ่มนั้นอย่างน้อย 1 ข้อความ</li>
              <li>ค้นหา <b>@getidsbot</b> หรือ <b>@userinfobot</b> เพื่อขอหมายเลข <b>Chat ID / Group ID</b> (ถ้าเป็นกลุ่มจะมีเครื่องหมายติดลบนำหน้า เช่น <code>-100xxxxxxx</code>)</li>
            </ol>
          </div>

          {/* แถบแสดงผลการทดสอบการเชื่อมต่อ */}
          {testResult && (
            <div className={`p-3 rounded-xl text-xs flex items-start gap-2 border leading-relaxed ${
              testResult.type === 'success' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold' 
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              {testResult.type === 'success' ? (
                <ShieldCheck className="h-4.5 w-4.5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-4.5 w-4.5 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="whitespace-pre-wrap">{testResult.message}</div>
            </div>
          )}

        </div>

        {/* แถบปุ่มดำเนินการ */}
        <div className="flex gap-3 pt-2 font-sans">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting}
            className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Send className={`h-3.5 w-3.5 ${isTesting ? 'animate-pulse text-sky-600' : ''}`} />
            <span>{isTesting ? 'กำลังทดสอบ...' : 'ทดลองส่งข้อความ'}</span>
          </button>
          
          <button
            type="button"
            onClick={handleSaveSettings}
            className="flex-1 py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-sky-600/10"
          >
            <span>บันทึกการตั้งค่า</span>
          </button>
        </div>

      </div>
    </div>
  );
}
