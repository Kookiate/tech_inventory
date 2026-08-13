import React, { useState, useEffect } from 'react';
import { Equipment, MaintenanceLog, SparePart } from '../types';
import { 
  X, 
  Printer, 
  Cpu, 
  Wrench, 
  Calendar, 
  MapPin, 
  Coins, 
  AlertTriangle, 
  CheckCircle2, 
  FileText,
  Search,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { formatThaiDate, formatThaiMonth, extractMonthKey } from '../utils/dateUtils';

interface EquipmentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEquipmentId?: string;
  equipments: Equipment[];
  maintenanceLogs: MaintenanceLog[];
  parts?: SparePart[];
}

export default function EquipmentHistoryModal({
  isOpen,
  onClose,
  initialEquipmentId,
  equipments,
  maintenanceLogs,
  parts = []
}: EquipmentHistoryModalProps) {
  const [selectedEqId, setSelectedEqId] = useState<string>('');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('ALL');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    if (initialEquipmentId) {
      setSelectedEqId(initialEquipmentId);
    } else if (equipments.length > 0) {
      setSelectedEqId(equipments[0].id);
    }
  }, [initialEquipmentId, equipments]);

  if (!isOpen) return null;

  // Selected Equipment Object
  const currentEquipment = equipments.find(e => e.id === selectedEqId) || equipments[0];

  if (!currentEquipment) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full text-center space-y-4">
          <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">ไม่พบข้อมูลเครื่องจักร</h3>
          <p className="text-xs text-slate-500">กรุณาลงทะเบียนข้อมูลเครื่องจักรในระบบก่อนดูประวัติการซ่อม</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    );
  }

  // Filter logs for this equipment
  const allEqLogs = maintenanceLogs.filter(log => log.equipmentId === currentEquipment.id);

  // Available months for this equipment
  const eqMonths = Array.from(
    new Set(allEqLogs.map(l => extractMonthKey(l.date)).filter(Boolean))
  ).sort((a, b) => b.localeCompare(a));

  // Filtered by selected month
  const eqLogs = selectedMonthFilter === 'ALL'
    ? allEqLogs
    : allEqLogs.filter(l => extractMonthKey(l.date) === selectedMonthFilter);

  // Stats calculation
  const totalRepairCount = eqLogs.length;
  const totalPartCost = eqLogs.reduce((sum, l) => sum + (l.partCost || 0), 0);
  const totalOtherCost = eqLogs.reduce((sum, l) => sum + (l.otherCost || 0), 0);
  const totalAccumulatedCost = eqLogs.reduce((sum, l) => sum + (l.totalCost || 0), 0);

  // Cost Ratio compared to Purchase Price
  const purchasePrice = currentEquipment.purchasePrice || 0;
  const maxBudget = currentEquipment.maxRepairBudget || Math.round(purchasePrice * 0.4);
  const ratio = purchasePrice > 0 ? Math.round((totalAccumulatedCost / purchasePrice) * 100) : 0;

  // Rating Status
  let statusBadge = {
    text: '🟢 คุ้มค่าดีเยี่ยม',
    bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    barBg: 'bg-emerald-500',
    note: 'ค่าซ่อมสะสมยังคงอยู่ในเกณฑ์ต่ำ คุ้มค่าต่อการใช้งานต่อเนื่อง'
  };

  if (ratio > 80) {
    statusBadge = {
      text: '🔴 วิกฤต - ไม่คุ้มค่าซ่อม',
      bg: 'bg-rose-50 text-rose-800 border-rose-200 font-bold',
      barBg: 'bg-rose-500',
      note: 'ค่าซ่อมสะสมสูงกว่า 80% ของราคาเครื่องแล้ว แนะนำพิจารณาจัดซื้อเครื่องใหม่แทนส่งซ่อม'
    };
  } else if (ratio > 50) {
    statusBadge = {
      text: '🟠 ควรเฝ้าระวัง (ซ่อมสูง)',
      bg: 'bg-orange-50 text-orange-800 border-orange-200',
      barBg: 'bg-orange-500',
      note: 'ค่าซ่อมสะสมเริ่มสูงเกินครึ่งหนึ่งของราคาเครื่อง ควรวางแผนบำรุงรักษาเชิงป้องกัน (PM)'
    };
  } else if (ratio > 20) {
    statusBadge = {
      text: '🟡 ปานกลาง (ปกติ)',
      bg: 'bg-amber-50 text-amber-800 border-amber-200',
      barBg: 'bg-amber-500',
      note: 'ค่าซ่อมอยู่ในเกณฑ์ปานกลางตามอายุการใช้งานปกติ'
    };
  }

  // Handle Export PDF function
  const handleExportPdf = () => {
    document.body.classList.add('printing-report');
    document.body.classList.remove('printing-sticker');

    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.body.classList.remove('printing-report');
      }, 1000);
    }, 150);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl my-auto overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header Modal */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-4 border-blue-500 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-blue-500 rounded-xl flex items-center justify-center shrink-0">
              <Wrench className="h-5 w-5 text-slate-950" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold font-display flex items-center gap-2">
                ประวัติการซ่อมแซมและออกรายงาน PDF
              </h2>
              <p className="text-xs text-blue-200 font-sans">
                ตรวจสอบประวัติรายการซ่อม รายละเอียดอะไหล่ และมูลค่าสะสมแยกรายเครื่องมือ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={handleExportPdf}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md cursor-pointer active:scale-95 font-sans"
            >
              <Printer className="h-4 w-4" />
              <span>Export PDF (รายงาน A4)</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
              title="ปิดหน้าต่าง"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 font-sans">
          
          {/* Equipment Selection Bar */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              <label className="text-xs font-bold text-slate-700 whitespace-nowrap flex items-center gap-1.5">
                <Cpu className="h-4 w-4 text-blue-600" />
                เลือกรหัสเครื่องจักร:
              </label>
              <select
                value={selectedEqId}
                onChange={e => {
                  setSelectedEqId(e.target.value);
                  setSelectedMonthFilter('ALL');
                }}
                className="flex-1 max-w-md border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {equipments.map(eq => (
                  <option key={eq.id} value={eq.id}>
                    {eq.id} {eq.assetCode ? `[${eq.assetCode}] ` : ''}- {eq.name} ({eq.location})
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Month dropdown */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-600 whitespace-nowrap flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-slate-500" />
                กรองประวัติรายเดือน:
              </label>
              <select
                value={selectedMonthFilter}
                onChange={e => setSelectedMonthFilter(e.target.value)}
                className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="ALL">ทั้งหมด ({allEqLogs.length} รายการ)</option>
                {eqMonths.map(m => (
                  <option key={m} value={m}>
                    {formatThaiMonth(m)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Equipment Specification & Cost Summary Card */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-lg border border-slate-700 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-700">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-extrabold px-2.5 py-1 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded-lg">
                    {currentEquipment.id}
                  </span>
                  {currentEquipment.assetCode && (
                    <span className="font-mono text-xs font-bold px-2.5 py-1 bg-slate-700/80 text-amber-300 border border-amber-400/30 rounded-lg">
                      ทรัพย์สิน: {currentEquipment.assetCode}
                    </span>
                  )}
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${statusBadge.bg}`}>
                    {statusBadge.text}
                  </span>
                </div>
                <h3 className="text-lg font-bold font-display text-white mt-1">
                  {currentEquipment.name}
                </h3>
                <p className="text-xs text-slate-300 flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                  <span>ตำแหน่ง/ไลน์ผลิต: <strong>{currentEquipment.location}</strong></span>
                  <span className="mx-1">•</span>
                  <span>เริ่มใช้งาน: <strong>{formatThaiDate(currentEquipment.purchaseDate)}</strong></span>
                </p>
              </div>

              <div className="text-right flex md:flex-col items-center md:items-end justify-between gap-2">
                <p className="text-[11px] text-slate-400">สัดส่วนค่าซ่อมสะสม / ราคาซื้อ:</p>
                <div className="text-2xl font-black font-mono text-amber-400">
                  {ratio}%
                </div>
              </div>
            </div>

            {/* Metric Boxes Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3">
                <p className="text-[10px] text-slate-400 uppercase font-bold">ราคาซื้อแรกเริ่ม</p>
                <p className="text-sm sm:text-base font-bold font-mono text-slate-100 mt-0.5">
                  ฿{purchasePrice.toLocaleString()}
                </p>
              </div>

              <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3">
                <p className="text-[10px] text-slate-400 uppercase font-bold">งบซ่อมสูงสุดที่ตั้งไว้</p>
                <p className="text-sm sm:text-base font-bold font-mono text-rose-300 mt-0.5">
                  ฿{maxBudget.toLocaleString()}
                </p>
              </div>

              <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3">
                <p className="text-[10px] text-slate-400 uppercase font-bold">จำนวนครั้งที่ซ่อม</p>
                <p className="text-sm sm:text-base font-bold font-mono text-blue-300 mt-0.5">
                  {totalRepairCount} ครั้ง
                </p>
              </div>

              <div className="bg-slate-800/80 border border-amber-500/30 rounded-xl p-3 bg-amber-500/5">
                <p className="text-[10px] text-amber-300 uppercase font-bold">ค่าซ่อมสะสมรวมจริง</p>
                <p className="text-sm sm:text-base font-black font-mono text-amber-400 mt-0.5">
                  ฿{totalAccumulatedCost.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Progress Bar & Note */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-[11px] text-slate-300 font-sans">
                <span>แถบระดับความบอบช้ำการซ่อมแซม:</span>
                <span className="font-mono font-bold">{totalAccumulatedCost.toLocaleString()} / {purchasePrice.toLocaleString()} บาท</span>
              </div>
              <div className="h-2 w-full bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${statusBadge.barBg}`}
                  style={{ width: `${Math.min(ratio, 100)}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-300 italic">
                * {statusBadge.note}
              </p>
            </div>
          </div>

          {/* Repair History Logs Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900 font-display flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                รายการประวัติการซ่อมบำรุง ({eqLogs.length} รายการ)
              </h4>
              {selectedMonthFilter !== 'ALL' && (
                <span className="text-xs text-blue-600 font-bold bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                  ประจำเดือน: {formatThaiMonth(selectedMonthFilter)}
                </span>
              )}
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 font-sans">
                    <th className="py-3 px-3 font-bold w-12 text-center">ลำดับ</th>
                    <th className="py-3 px-3 font-bold">วันที่ซ่อม</th>
                    <th className="py-3 px-3 font-bold min-w-[180px]">อาการเสีย & วิธีแก้ไข</th>
                    <th className="py-3 px-3 font-bold">อะไหล่ที่ใช้ (จำนวน x ราคา)</th>
                    <th className="py-3 px-3 text-right font-bold">ค่าอะไหล่</th>
                    <th className="py-3 px-3 text-right font-bold">ค่าบริการ/อื่นๆ</th>
                    <th className="py-3 px-3 text-right font-bold text-blue-700">ค่าซ่อมรวม</th>
                    <th className="py-3 px-3 font-bold">ช่างซ่อม</th>
                    <th className="py-3 px-3 text-center font-bold">รูปภาพ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {eqLogs.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-slate-400 font-sans">
                        ไม่พบข้อมูลประวัติการซ่อมบำรุงตามเงื่อนไขที่เลือก
                      </td>
                    </tr>
                  ) : (
                    eqLogs.map((log, idx) => {
                      const matchedPart = parts.find(p => p.id === log.partUsedId);
                      const partNameDisplay = matchedPart ? matchedPart.name : log.partUsedId;

                      return (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-3 text-center text-slate-400 font-mono font-bold">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-3 font-mono font-semibold text-slate-800 whitespace-nowrap">
                            {formatThaiDate(log.date)}
                          </td>
                          <td className="py-3 px-3 font-medium text-slate-900 leading-relaxed">
                            {log.repairDetail || '-'}
                          </td>
                          <td className="py-3 px-3 text-slate-700 font-sans">
                            {log.partUsedId ? (
                              <div>
                                <span className="font-bold text-blue-700 font-mono">{log.partUsedId}</span>
                                {partNameDisplay && <span className="text-slate-600 block text-[11px]">{partNameDisplay}</span>}
                                <span className="text-[10px] text-slate-400 font-mono">
                                  จำนวน {log.partQty} ชิ้น
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">ไม่ได้ใช้อะไหล่</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-slate-700 whitespace-nowrap">
                            ฿{(log.partCost || 0).toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-slate-700 whitespace-nowrap">
                            ฿{(log.otherCost || 0).toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-rose-600 whitespace-nowrap text-sm">
                            ฿{(log.totalCost || 0).toLocaleString()}
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-800 whitespace-nowrap">
                            {log.technician || '-'}
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            {log.imageUrl ? (
                              <button
                                onClick={() => setPreviewImage(log.imageUrl || null)}
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded-md border border-blue-200 cursor-pointer"
                              >
                                <ExternalLink className="h-3 w-3" />
                                ดูรูป
                              </button>
                            ) : (
                              <span className="text-slate-300 text-[10px]">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {eqLogs.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-900 text-white font-bold font-sans">
                      <td colSpan={4} className="py-3 px-4 text-right">
                        รวมมูลค่าการซ่อมบำรุง ({eqLogs.length} รายการ):
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-400">
                        ฿{totalPartCost.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-amber-300">
                        ฿{totalOtherCost.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-amber-400 text-sm font-extrabold">
                        ฿{totalAccumulatedCost.toLocaleString()}
                      </td>
                      <td colSpan={2} className="py-3 px-3 text-center text-[10px] text-slate-400">
                        สุทธิ
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <p className="text-xs text-slate-500 font-sans text-center sm:text-left">
            * คลิกปุ่ม <strong>Export PDF</strong> เพื่อสั่งพิมพ์รายงานสรุป A4 และบันทึกไฟล์เป็น PDF
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer font-sans"
            >
              ปิดหน้าต่าง
            </button>
            <button
              onClick={handleExportPdf}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer font-sans"
            >
              <Printer className="h-4 w-4" />
              <span>สั่งพิมพ์ / พิมพ์ PDF</span>
            </button>
          </div>
        </div>

      </div>

      {/* Image Preview Modal Lightbox */}
      {previewImage && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-4 max-w-2xl w-full relative shadow-2xl space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <h4 className="text-xs font-bold text-slate-800">รูปถ่ายประวัติการซ่อมแซม</h4>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-1 text-slate-400 hover:text-slate-800 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-hidden flex items-center justify-center bg-slate-100 rounded-xl">
              <img src={previewImage} alt="Repair" className="max-h-[65vh] object-contain rounded-lg" />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 📄 โครงสร้างสำหรับสั่งพิมพ์เป็นรายงาน PDF A4 ขาวดำ (Print-only B&W A4 Report) */}
      {/* ========================================================================= */}
      <div id="report-print-section" className="hidden">
        <div style={{ width: '190mm', margin: '0 auto', padding: '12px 10px', fontFamily: "'Sarabun', 'Mitr', sans-serif", color: '#000000', backgroundColor: '#ffffff', boxSizing: 'border-box' }}>
          
          {/* Header โรงงาน */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '2px solid #000000', paddingBottom: '6px', marginBottom: '10px' }}>
            <div>
              <h1 style={{ fontSize: '15px', fontWeight: 'bold', margin: 0, color: '#000000', letterSpacing: '-0.2px' }}>
                ใบรายงานประวัติการซ่อมบำรุงและวิเคราะห์มูลค่าเครื่องจักร (A4)
              </h1>
              <p style={{ fontSize: '9.5px', color: '#333333', margin: '2px 0 0 0' }}>
                Equipment Maintenance & Asset Cost Analysis Summary Report
              </p>
            </div>
            <div style={{ textAlign: 'right', fontSize: '9px', color: '#000000' }}>
              <p style={{ margin: 0 }}>วันที่ออกรายงาน: <strong>{new Date().toLocaleDateString('th-TH')}</strong></p>
              <p style={{ margin: '2px 0 0 0' }}>ระบบควบคุมอะไหล่และงานซ่อม (Spare Part System)</p>
            </div>
          </div>

          {/* ข้อมูลจำเพาะเครื่องจักร (B&W Border Grid) */}
          <div style={{ border: '1.5px solid #000000', padding: '8px', marginBottom: '10px', backgroundColor: '#ffffff' }}>
            <table style={{ width: '100%', fontSize: '10px', borderCollapse: 'collapse', color: '#000000' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '3px 4px', fontWeight: 'bold', width: '18%' }}>รหัสเครื่องจักร:</td>
                  <td style={{ padding: '3px 4px', fontWeight: 'bold', fontFamily: 'monospace' }}>{currentEquipment.id}</td>
                  <td style={{ padding: '3px 4px', fontWeight: 'bold', width: '18%' }}>ชื่อเครื่องจักร:</td>
                  <td style={{ padding: '3px 4px', fontWeight: 'bold' }}>{currentEquipment.name}</td>
                </tr>
                <tr>
                  <td style={{ padding: '3px 4px', fontWeight: 'bold' }}>ไลน์ผลิต / พิกัด:</td>
                  <td style={{ padding: '3px 4px' }}>{currentEquipment.location}</td>
                  <td style={{ padding: '3px 4px', fontWeight: 'bold' }}>วันที่เริ่มใช้งาน:</td>
                  <td style={{ padding: '3px 4px' }}>{formatThaiDate(currentEquipment.purchaseDate)}</td>
                </tr>
                <tr>
                  <td style={{ padding: '3px 4px', fontWeight: 'bold' }}>ราคาซื้อแรกเริ่ม:</td>
                  <td style={{ padding: '3px 4px', fontFamily: 'monospace', fontWeight: 'bold' }}>฿{purchasePrice.toLocaleString()}</td>
                  <td style={{ padding: '3px 4px', fontWeight: 'bold' }}>งบซ่อมวิกฤต (Max):</td>
                  <td style={{ padding: '3px 4px', fontFamily: 'monospace', fontWeight: 'bold' }}>฿{maxBudget.toLocaleString()}</td>
                </tr>
                <tr>
                  <td style={{ padding: '3px 4px', fontWeight: 'bold' }}>รวมค่าซ่อมสะสม:</td>
                  <td style={{ padding: '3px 4px', fontFamily: 'monospace', fontWeight: 'bold' }}>฿{totalAccumulatedCost.toLocaleString()} ({ratio}%)</td>
                  <td style={{ padding: '3px 4px', fontWeight: 'bold' }}>สถานะประเมิน:</td>
                  <td style={{ padding: '3px 4px', fontWeight: 'bold' }}>
                    [ {statusBadge.text.replace(/^[🔴🟢🟠🟡]\s*/, '')} ]
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ตารางประวัติการซ่อมบำรุง (B&W High Contrast Table) */}
          <div style={{ marginBottom: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <h3 style={{ fontSize: '11px', fontWeight: 'bold', margin: 0, color: '#000000' }}>
                รายการประวัติการซ่อมบำรุง ({eqLogs.length} รายการ)
              </h3>
              {selectedMonthFilter !== 'ALL' && (
                <span style={{ fontSize: '9px', fontWeight: 'bold', border: '1px solid #000000', padding: '1px 6px' }}>
                  เดือน: {formatThaiMonth(selectedMonthFilter)}
                </span>
              )}
            </div>

            <table style={{ width: '100%', fontSize: '9.5px', borderCollapse: 'collapse', border: '1.5px solid #000000', color: '#000000' }}>
              <thead>
                <tr style={{ backgroundColor: '#f0f0f0', color: '#000000', fontWeight: 'bold', borderBottom: '1.5px solid #000000' }}>
                  <th style={{ border: '1px solid #000000', padding: '4px 3px', textAlign: 'center', width: '24px' }}>#</th>
                  <th style={{ border: '1px solid #000000', padding: '4px 3px', textAlign: 'left', width: '65px' }}>วันที่ซ่อม</th>
                  <th style={{ border: '1px solid #000000', padding: '4px 4px', textAlign: 'left' }}>อาการเสียและแนวทางแก้ไข</th>
                  <th style={{ border: '1px solid #000000', padding: '4px 4px', textAlign: 'left', width: '110px' }}>อะไหล่ที่ใช้</th>
                  <th style={{ border: '1px solid #000000', padding: '4px 4px', textAlign: 'right', width: '55px' }}>ค่าอะไหล่</th>
                  <th style={{ border: '1px solid #000000', padding: '4px 4px', textAlign: 'right', width: '55px' }}>ค่าบริการ</th>
                  <th style={{ border: '1px solid #000000', padding: '4px 4px', textAlign: 'right', width: '65px' }}>รวม (บาท)</th>
                  <th style={{ border: '1px solid #000000', padding: '4px 4px', textAlign: 'left', width: '70px' }}>ช่างซ่อม</th>
                </tr>
              </thead>
              <tbody>
                {eqLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '12px', textAlign: 'center', color: '#666666', border: '1px solid #000000' }}>
                      ไม่พบข้อมูลประวัติการซ่อมบำรุง
                    </td>
                  </tr>
                ) : (
                  eqLogs.map((log, idx) => (
                    <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f9f9f9', pageBreakInside: 'avoid' }}>
                      <td style={{ border: '1px solid #000000', padding: '3px', textAlign: 'center', fontWeight: 'bold' }}>{idx + 1}</td>
                      <td style={{ border: '1px solid #000000', padding: '3px', fontFamily: 'monospace' }}>{formatThaiDate(log.date)}</td>
                      <td style={{ border: '1px solid #000000', padding: '3px 4px' }}>{log.repairDetail || '-'}</td>
                      <td style={{ border: '1px solid #000000', padding: '3px 4px' }}>
                        {log.partUsedId ? `${log.partUsedId} (${log.partQty} ชิ้น)` : '-'}
                      </td>
                      <td style={{ border: '1px solid #000000', padding: '3px 4px', textAlign: 'right', fontFamily: 'monospace' }}>
                        {(log.partCost || 0).toLocaleString()}
                      </td>
                      <td style={{ border: '1px solid #000000', padding: '3px 4px', textAlign: 'right', fontFamily: 'monospace' }}>
                        {(log.otherCost || 0).toLocaleString()}
                      </td>
                      <td style={{ border: '1px solid #000000', padding: '3px 4px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>
                        {(log.totalCost || 0).toLocaleString()}
                      </td>
                      <td style={{ border: '1px solid #000000', padding: '3px 4px' }}>{log.technician || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {eqLogs.length > 0 && (
                <tfoot>
                  <tr style={{ backgroundColor: '#f0f0f0', color: '#000000', fontWeight: 'bold', borderTop: '1.5px solid #000000' }}>
                    <td colSpan={4} style={{ border: '1px solid #000000', padding: '4px', textAlign: 'right' }}>
                      รวมมูลค่าค่าซ่อมบำรุงสุทธิ ({eqLogs.length} รายการ):
                    </td>
                    <td style={{ border: '1px solid #000000', padding: '4px', textAlign: 'right', fontFamily: 'monospace' }}>
                      ฿{totalPartCost.toLocaleString()}
                    </td>
                    <td style={{ border: '1px solid #000000', padding: '4px', textAlign: 'right', fontFamily: 'monospace' }}>
                      ฿{totalOtherCost.toLocaleString()}
                    </td>
                    <td style={{ border: '1px solid #000000', padding: '4px', textAlign: 'right', fontFamily: 'monospace', fontSize: '10px' }}>
                      ฿{totalAccumulatedCost.toLocaleString()}
                    </td>
                    <td style={{ border: '1px solid #000000', padding: '4px' }}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* สรุปข้อเสนอแนะ */}
          <div style={{ border: '1px solid #000000', padding: '6px 8px', fontSize: '9.5px', color: '#000000', marginBottom: '16px', backgroundColor: '#fafafa' }}>
            <strong>ข้อเสนอแนะฝ่ายซ่อมบำรุงและวิเคราะห์สินทรัพย์:</strong> {statusBadge.note}
          </div>

          {/* ลายเซ็นอนุมัติ (2 Signature Blocks) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', fontSize: '9.5px', color: '#000000' }}>
            <div style={{ width: '42%', textAlign: 'center' }}>
              <div style={{ borderBottom: '1px solid #000000', height: '28px', marginBottom: '4px' }} />
              <p style={{ margin: 0, fontWeight: 'bold' }}>ลงชื่อ: ...........................................................</p>
              <p style={{ margin: '2px 0 0 0', color: '#333333' }}>( ช่างผู้รับผิดชอบ / ผู้คุมคลังอะไหล่ )</p>
              <p style={{ margin: '2px 0 0 0', color: '#666666', fontSize: '8.5px' }}>วันที่ ....... / ....... / .......</p>
            </div>

            <div style={{ width: '42%', textAlign: 'center' }}>
              <div style={{ borderBottom: '1px solid #000000', height: '28px', marginBottom: '4px' }} />
              <p style={{ margin: 0, fontWeight: 'bold' }}>ลงชื่อ: ...........................................................</p>
              <p style={{ margin: '2px 0 0 0', color: '#333333' }}>( หัวหน้าฝ่ายซ่อมบำรุง / ผู้อำนวยการโรงงาน )</p>
              <p style={{ margin: '2px 0 0 0', color: '#666666', fontSize: '8.5px' }}>วันที่ ....... / ....... / .......</p>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
