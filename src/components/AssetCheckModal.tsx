import React, { useState, useEffect, useRef } from 'react';
import { Equipment, MaintenanceLog, SparePart } from '../types';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  X, 
  Search, 
  Camera, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCcw, 
  Printer, 
  FileText, 
  PenTool, 
  ClipboardCheck, 
  Download, 
  Building2, 
  Calendar, 
  Wrench,
  ShieldCheck,
  Tag
} from 'lucide-react';

interface AssetCheckModalProps {
  equipments: Equipment[];
  maintenanceLogs?: MaintenanceLog[];
  parts?: SparePart[];
  onClose: () => void;
  onOpenSticker: (eq: Equipment) => void;
  onOpenHistory?: (eqId: string) => void;
  onEditEquipment?: (eq: Equipment) => void;
}

interface AuditRecord {
  timestamp: string;
  assetCode: string;
  equipmentId: string;
  equipmentName: string;
  location: string;
  status: 'matched' | 'unknown';
  notes?: string;
}

export default function AssetCheckModal({
  equipments,
  maintenanceLogs = [],
  parts = [],
  onClose,
  onOpenSticker,
  onOpenHistory,
  onEditEquipment
}: AssetCheckModalProps) {
  // Input search mode: camera scanner or manual / barcode gun
  const [activeTab, setActiveTab] = useState<'camera' | 'manual'>('camera');
  const [searchInput, setSearchInput] = useState('');
  const [matchedEquipment, setMatchedEquipment] = useState<Equipment | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Camera scanner states
  const [scannerLoading, setScannerLoading] = useState(false);
  const [scannerError, setScannerError] = useState('');
  const qrScannerRef = useRef<Html5Qrcode | null>(null);

  // Audit session records
  const [auditedList, setAuditedList] = useState<AuditRecord[]>(() => {
    try {
      const saved = sessionStorage.getItem('daily_asset_audit_session');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [auditorName, setAuditorName] = useState('ช่างเทคนิค');
  const [auditSuccessMsg, setAuditSuccessMsg] = useState('');

  // Audio beep on successful scan
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // 880 Hz beep
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch {
      // Ignore audio failure
    }
  };

  // Find equipment by assetCode or ID
  const searchEquipment = (code: string) => {
    const cleanCode = code.trim().toLowerCase();
    if (!cleanCode) return;

    setHasSearched(true);
    const found = equipments.find(eq => {
      const eqAsset = (eq.assetCode || '').trim().toLowerCase();
      const eqId = eq.id.trim().toLowerCase();
      return eqAsset === cleanCode || eqId === cleanCode;
    });

    if (found) {
      setMatchedEquipment(found);
      playBeep();
    } else {
      setMatchedEquipment(null);
    }
  };

  // Handle successful scan from camera
  const handleScanSuccess = (decodedText: string) => {
    if (!decodedText) return;
    setSearchInput(decodedText);
    searchEquipment(decodedText);
  };

  // Start Html5Qrcode camera
  const startScanner = async () => {
    setScannerLoading(true);
    setScannerError('');

    try {
      if (qrScannerRef.current) {
        try {
          await qrScannerRef.current.stop();
        } catch {
          // ignore
        }
      }

      const scanner = new Html5Qrcode('asset-qr-reader');
      qrScannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 15,
          qrbox: (w, h) => {
            const size = Math.min(w, h) * 0.75;
            return { width: size, height: size };
          }
        },
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        () => {
          // Frame error ignore
        }
      );
      setScannerLoading(false);
    } catch (err: any) {
      console.error('Asset camera error:', err);
      setScannerError('ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตสิทธิ์การเข้าถึงกล้องในเบราว์เซอร์');
      setScannerLoading(false);
    }
  };

  // Stop scanner
  const stopScanner = async () => {
    if (qrScannerRef.current) {
      try {
        if (qrScannerRef.current.isScanning) {
          await qrScannerRef.current.stop();
        }
        qrScannerRef.current.clear();
      } catch {
        // ignore
      }
      qrScannerRef.current = null;
    }
  };

  useEffect(() => {
    if (activeTab === 'camera') {
      const timer = setTimeout(() => {
        startScanner();
      }, 300);
      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [activeTab]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  // Save session audit record
  const handleMarkAudited = () => {
    if (!matchedEquipment) return;

    const nowStr = new Date().toLocaleString('th-TH');
    const newRecord: AuditRecord = {
      timestamp: nowStr,
      assetCode: matchedEquipment.assetCode || matchedEquipment.id,
      equipmentId: matchedEquipment.id,
      equipmentName: matchedEquipment.name,
      location: matchedEquipment.location,
      status: 'matched'
    };

    const updated = [newRecord, ...auditedList.filter(r => r.equipmentId !== matchedEquipment.id)];
    setAuditedList(updated);
    sessionStorage.setItem('daily_asset_audit_session', JSON.stringify(updated));

    setAuditSuccessMsg(`บันทึกการตรวจนับ "${matchedEquipment.name}" เรียบร้อยแล้ว`);
    setTimeout(() => setAuditSuccessMsg(''), 3500);
  };

  // Export audit session as CSV
  const handleExportAuditCsv = () => {
    if (auditedList.length === 0) return;
    const headers = ['วันเวลาที่ตรวจนับ', 'รหัสทรัพย์สิน', 'รหัสเครื่องจักร', 'ชื่อเครื่องจักร', 'ตำแหน่งไลน์ผลิต', 'สถานะ'];
    const rows = auditedList.map(r => [
      `"${r.timestamp}"`,
      `"${r.assetCode}"`,
      `"${r.equipmentId}"`,
      `"${r.equipmentName}"`,
      `"${r.location}"`,
      `"ตรวจพบถูกต้อง"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Asset_Audit_Log_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  // Calculate maintenance summary for matched equipment
  const equipmentLogs = matchedEquipment
    ? maintenanceLogs.filter(l => l.equipmentId === matchedEquipment.id)
    : [];
  const totalRepairCost = equipmentLogs.reduce((sum, log) => sum + (log.totalCost || 0), 0);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 z-50 overflow-y-auto animate-fade-in font-sans">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 my-4 space-y-5">
        
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0 shadow-2xs">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>สแกนตรวจเช็คทรัพย์สิน (Asset Audit Check)</span>
              </h3>
              <p className="text-xs text-slate-500">
                สแกน QR Code หรือ Barcode ที่ติดบนเครื่องมือ เพื่อตรวจนับทรัพย์สินและดูสเปกทันที
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mode Switcher: Camera vs USB Scanner/Manual Input */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('camera')}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'camera'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Camera className="h-3.5 w-3.5" />
              <span>สแกนด้วยกล้องมือถือ/เว็บแคม</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('manual')}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'manual'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Search className="h-3.5 w-3.5" />
              <span>พิมพ์รหัส / ยิงปืนบาร์โค้ด USB</span>
            </button>
          </div>

          <div className="text-xs text-slate-500 font-mono">
            ตรวจแล้ว <strong className="text-emerald-700 font-bold">{auditedList.length}</strong> รายการ
          </div>
        </div>

        {/* Tab 1: Camera Scanner View */}
        {activeTab === 'camera' && (
          <div className="space-y-3">
            <div className="relative w-full h-60 bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center">
              <div id="asset-qr-reader" className="w-full h-full" />
              
              {/* Target Aim overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-48 h-48 border-2 border-emerald-400/80 rounded-2xl relative">
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-emerald-400 rounded-tl-md" />
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-emerald-400 rounded-tr-md" />
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-emerald-400 rounded-bl-md" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-emerald-400 rounded-br-md" />
                  <div className="w-full h-0.5 bg-emerald-400/70 absolute top-1/2 -translate-y-1/2 animate-pulse" />
                </div>
              </div>

              {scannerLoading && (
                <div className="absolute inset-0 bg-slate-900/80 flex flex-col items-center justify-center text-white text-xs gap-2">
                  <div className="h-6 w-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                  <span>กำลังเชื่อมต่อกล้องถ่ายรูป...</span>
                </div>
              )}

              {scannerError && (
                <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center text-rose-300 text-xs gap-2 p-4 text-center">
                  <AlertTriangle className="h-6 w-6 text-rose-400" />
                  <span>{scannerError}</span>
                  <button
                    type="button"
                    onClick={startScanner}
                    className="mt-2 px-3 py-1.5 bg-rose-600/40 border border-rose-500 rounded-lg text-white font-bold"
                  >
                    ลองใหม่อีกครั้ง
                  </button>
                </div>
              )}
            </div>
            <p className="text-[11px] text-center text-slate-500">
              หันกล้องไปที่ QR Code หรือบาร์โค้ดบนสติกเกอร์ที่ติดอยู่บนเครื่องมือ
            </p>
          </div>
        )}

        {/* Tab 2: Manual Search / USB Scanner Input */}
        {activeTab === 'manual' && (
          <div className="space-y-2">
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                searchEquipment(searchInput);
              }}
              className="flex items-center gap-2"
            >
              <div className="relative flex-1">
                <input
                  type="text"
                  autoFocus
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  placeholder="พิมพ์หรือสแกนด้วยปืนบาร์โค้ด (เช่น AST-GZD-001 หรือ GZD-001)..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 outline-none"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1 shrink-0"
              >
                <Search className="h-3.5 w-3.5" />
                <span>ค้นหา</span>
              </button>
            </form>
            <p className="text-[10px] text-slate-400">
              * รองรับการยิงด้วยปืนบาร์โค้ดผ่าน USB หรือบลูทูธ เครื่องจะค้นหาทันทีหลังยิง
            </p>
          </div>
        )}

        {/* Scan Results Card */}
        {hasSearched && matchedEquipment && (
          <div className="bg-emerald-50/80 rounded-2xl p-4 border border-emerald-200 space-y-3 animate-fade-in">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="h-7 w-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                <div>
                  <span className="text-[10px] font-bold text-emerald-700 tracking-wide uppercase">
                    พบข้อมูลทรัพย์สินในระบบ
                  </span>
                  <h4 className="text-base font-extrabold text-slate-900 leading-tight">
                    {matchedEquipment.name}
                  </h4>
                </div>
              </div>

              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                matchedEquipment.equipmentType === 'Spare'
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-blue-100 text-blue-900 border border-blue-200'
              }`}>
                {matchedEquipment.equipmentType === 'Spare' ? '🔄 Spare สำรอง' : '⚙️ Main หลัก'}
              </span>
            </div>

            {/* Key Specs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-white p-3 rounded-xl border border-emerald-100 font-sans">
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">รหัสทรัพย์สิน</span>
                <span className="font-mono font-bold text-slate-800">
                  {matchedEquipment.assetCode || '- (ยังไม่มี)'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">รหัสเครื่องจักร</span>
                <span className="font-mono font-bold text-blue-600">
                  {matchedEquipment.id}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">ไลน์ / ตำแหน่ง</span>
                <span className="font-semibold text-slate-700 truncate block">
                  {matchedEquipment.location}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">เริ่มใช้งาน</span>
                <span className="font-mono text-slate-600">
                  {matchedEquipment.purchaseDate || '-'}
                </span>
              </div>
            </div>

            {/* Financial & Maintenance Quick Overview */}
            <div className="flex flex-wrap items-center justify-between text-xs bg-white/70 p-2.5 rounded-xl border border-emerald-100 gap-2">
              <div className="flex items-center gap-3">
                <span>ราคาซื้อ: <strong className="font-mono text-slate-800">฿{matchedEquipment.purchasePrice.toLocaleString()}</strong></span>
                <span>•</span>
                <span>ยอดซ่อมสะสม: <strong className="font-mono text-rose-600">฿{totalRepairCost.toLocaleString()}</strong> ({equipmentLogs.length} ครั้ง)</span>
              </div>
              <div className="text-[11px] text-slate-500">
                งบซ่อมวิกฤต: <strong className="font-mono text-slate-700">฿{matchedEquipment.maxRepairBudget.toLocaleString()}</strong>
              </div>
            </div>

            {/* Action Buttons for Matched Equipment */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onOpenSticker(matchedEquipment)}
                  className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold border border-blue-200 transition-all flex items-center gap-1 cursor-pointer"
                  title="พิมพ์หรือดาวน์โหลดสติกเกอร์ใหม่"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>สติกเกอร์ QR</span>
                </button>

                {onOpenHistory && (
                  <button
                    type="button"
                    onClick={() => onOpenHistory(matchedEquipment.id)}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>ประวัติซ่อม</span>
                  </button>
                )}

                {onEditEquipment && (
                  <button
                    type="button"
                    onClick={() => onEditEquipment(matchedEquipment)}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <PenTool className="h-3.5 w-3.5" />
                    <span>แก้ไขข้อมูล</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handleMarkAudited}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>บันทึกตรวจนับทรัพย์สินนี้</span>
              </button>
            </div>

            {auditSuccessMsg && (
              <div className="text-xs font-bold text-emerald-800 bg-emerald-100/90 px-3 py-1.5 rounded-lg text-center animate-fade-in">
                {auditSuccessMsg}
              </div>
            )}
          </div>
        )}

        {hasSearched && !matchedEquipment && (
          <div className="bg-rose-50 rounded-2xl p-4 border border-rose-200 text-center space-y-1.5 animate-fade-in">
            <AlertTriangle className="h-6 w-6 text-rose-500 mx-auto" />
            <h4 className="text-sm font-bold text-rose-900">
              ไม่พบรหัสทรัพย์สิน "{searchInput}" ในระบบคลัง
            </h4>
            <p className="text-xs text-rose-700">
              กรุณาตรวจสอบว่าพิมพ์รหัสถูกต้อง หรือเครื่องมือนี้ยังไม่ได้ลงทะเบียนในระบบ
            </p>
          </div>
        )}

        {/* Audit Log Session History */}
        {auditedList.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                ประวัติการตรวจนับในรอบนี้ ({auditedList.length} รายการ)
              </span>
              <button
                type="button"
                onClick={handleExportAuditCsv}
                className="text-emerald-700 hover:text-emerald-800 font-bold text-xs flex items-center gap-1 hover:underline cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>ส่งออกรายงาน CSV</span>
              </button>
            </div>

            <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 divide-y divide-slate-100 text-xs">
              {auditedList.map((rec, i) => (
                <div key={i} className="p-2 flex items-center justify-between gap-2 hover:bg-white transition-colors">
                  <div className="overflow-hidden">
                    <span className="font-mono font-bold text-slate-800">{rec.assetCode}</span>
                    <span className="mx-1 text-slate-400">•</span>
                    <span className="font-semibold text-slate-700">{rec.equipmentName}</span>
                    <span className="text-[10px] text-slate-500 ml-1.5">({rec.location})</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono shrink-0">
                    {rec.timestamp}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
}
