import React, { useState, useEffect } from 'react';
import { Equipment, SparePart, MaintenanceLog, MonthlyCheckMonthData, EquipmentMonthlyInspectionRecord, InspectionResultStatus } from '../types';
import { 
  STRAPPING_MACHINE_CHECK_ITEMS, 
  MONTH_NAMES_TH, 
  MONTH_FULL_NAMES_TH, 
  loadInspectionRecords, 
  getOrCreateEquipmentInspection, 
  updateMonthCheckData, 
  toggleInspectionItemStatus, 
  doesMonthHaveFailure,
  exportInspectionToCsv,
  isStrappingMachine
} from '../utils/inspectionStorage';
import { 
  X, 
  Printer, 
  Download, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Calendar, 
  Wrench, 
  Cpu, 
  Check, 
  Sparkles, 
  FileText, 
  UserCheck, 
  ShieldAlert, 
  Eye, 
  RotateCcw,
  ExternalLink,
  ChevronRight,
  Info,
  Clock,
  BookOpen,
  Award,
  CheckSquare,
  HelpCircle
} from 'lucide-react';

interface MonthlyEquipmentInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipments: Equipment[];
  initialEquipmentId?: string;
  onGoToSpareLoan?: (equipment: Equipment) => void;
  onGoToMaintenance?: (equipment: Equipment, problemDetail: string) => void;
}

export default function MonthlyEquipmentInspectionModal({
  isOpen,
  onClose,
  equipments,
  initialEquipmentId,
  onGoToSpareLoan,
  onGoToMaintenance
}: MonthlyEquipmentInspectionModalProps) {
  // Current year & selected equipment
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedEqId, setSelectedEqId] = useState<string>('');
  
  // Inspection record state
  const [inspectionRecord, setInspectionRecord] = useState<EquipmentMonthlyInspectionRecord | null>(null);

  // Active view mode: 'matrix' (full 12-month table like Excel) or 'entry' (month entry form)
  const [viewMode, setViewMode] = useState<'matrix' | 'entry'>('matrix');

  // Month entry form state
  const currentMonthNumber = new Date().getMonth() + 1; // 1-12
  const [entryMonth, setEntryMonth] = useState<number>(currentMonthNumber);
  const [entryResults, setEntryResults] = useState<Record<number, InspectionResultStatus>>({
    1: 'pass', 2: 'pass', 3: 'pass', 4: 'pass', 5: 'pass', 6: 'pass', 7: 'pass'
  });
  const [entryIssues, setEntryIssues] = useState<string>('');
  const [entryTechName, setEntryTechName] = useState<string>('วิโรจน์');
  const [entryEngName, setEntryEngName] = useState<string>('กู้เกียรติ');
  const [entryMgrName, setEntryMgrName] = useState<string>('ชมภู่');
  const [entryCheckedDate, setEntryCheckedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  
  // Re-Inspector specific states
  const [entryReInspectedDate, setEntryReInspectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [entryReInspectionStatus, setEntryReInspectionStatus] = useState<'verified' | 'needs_correction' | 'pending'>('pending');
  const [entryReInspectionNote, setEntryReInspectionNote] = useState<string>('');
  const [showReInspectorGuide, setShowReInspectorGuide] = useState<boolean>(false);
  const [isSavedSuccess, setIsSavedSuccess] = useState<boolean>(false);

  // Visual guide modal popup
  const [showVisualGuideModal, setShowVisualGuideModal] = useState<boolean>(false);

  // Filter only plastic strapping machines for this specific checklist
  const strappingEquipments = equipments.filter(isStrappingMachine);
  const selectableEquipments = strappingEquipments.length > 0 ? strappingEquipments : equipments;

  // Initialize selected equipment
  useEffect(() => {
    if (initialEquipmentId) {
      setSelectedEqId(initialEquipmentId);
    } else if (selectableEquipments.length > 0) {
      setSelectedEqId(selectableEquipments[0].id);
    }
  }, [initialEquipmentId, equipments]);

  // Load inspection record whenever selectedEqId or selectedYear changes
  useEffect(() => {
    if (!selectedEqId) return;
    const currentEq = equipments.find(e => e.id === selectedEqId);
    if (!currentEq) return;

    const record = getOrCreateEquipmentInspection(
      currentEq.id,
      currentEq.name,
      currentEq.assetCode,
      selectedYear,
      'เครื่องแพ็คสายรัดพลาสติก'
    );
    setInspectionRecord(record);

    // Pre-populate entry form if month data exists
    loadEntryFormData(record, entryMonth);
  }, [selectedEqId, selectedYear]);

  // Load entry form with month data
  const loadEntryFormData = (record: EquipmentMonthlyInspectionRecord, month: number) => {
    const monthData = record.months[month];
    if (monthData) {
      setEntryResults(monthData.itemResults || {
        1: 'pass', 2: 'pass', 3: 'pass', 4: 'pass', 5: 'pass', 6: 'pass', 7: 'pass'
      });
      setEntryIssues(monthData.issuesNote || '');
      setEntryTechName(monthData.technicianName || 'วิโรจน์');
      setEntryEngName(monthData.engineerName || 'กู้เกียรติ');
      setEntryMgrName(monthData.managerName || 'ชมภู่');
      setEntryCheckedDate(monthData.checkedDate || new Date().toISOString().slice(0, 10));
      setEntryReInspectedDate(monthData.reInspectedDate || new Date().toISOString().slice(0, 10));
      setEntryReInspectionStatus(monthData.reInspectionStatus || (monthData.engineerName ? 'verified' : 'pending'));
      setEntryReInspectionNote(monthData.reInspectionNote || '');
    } else {
      // Default new form
      setEntryResults({
        1: 'pass', 2: 'pass', 3: 'pass', 4: 'pass', 5: 'pass', 6: 'pass', 7: 'pass'
      });
      setEntryIssues('');
      setEntryCheckedDate(new Date().toISOString().slice(0, 10));
      setEntryReInspectedDate(new Date().toISOString().slice(0, 10));
      setEntryReInspectionStatus('pending');
      setEntryReInspectionNote('');
    }
  };

  const handleMonthChange = (month: number) => {
    setEntryMonth(month);
    if (inspectionRecord) {
      loadEntryFormData(inspectionRecord, month);
    }
  };

  // Quick verify by Re-Inspector (Engineer)
  const handleQuickVerifyByEngineer = () => {
    setEntryReInspectionStatus('verified');
    setEntryReInspectedDate(new Date().toISOString().slice(0, 10));
    if (!entryReInspectionNote.trim()) {
      setEntryReInspectionNote('สุ่มตรวจสอบหน้างานจริง รอยต่อเชื่อมและระบบกรองลมได้มาตรฐานเรียบร้อย');
    }
  };

  // Quick toggle in matrix view
  const handleMatrixCellClick = (itemId: number, month: number) => {
    if (!inspectionRecord || !selectedEqId) return;

    const currentMonthData: MonthlyCheckMonthData = inspectionRecord.months[month] || {
      itemResults: { 1: 'none', 2: 'none', 3: 'none', 4: 'none', 5: 'none', 6: 'none', 7: 'none' },
      technicianName: 'วิโรจน์',
      engineerName: 'กู้เกียรติ',
      managerName: 'ชมภู่',
      checkedDate: new Date().toISOString().slice(0, 10)
    };

    const currentStatus = currentMonthData.itemResults[itemId] || 'none';
    const nextStatus = toggleInspectionItemStatus(currentStatus);

    const updatedMonthData: MonthlyCheckMonthData = {
      ...currentMonthData,
      itemResults: {
        ...currentMonthData.itemResults,
        [itemId]: nextStatus
      }
    };

    const currentEq = equipments.find(e => e.id === selectedEqId);
    const updated = updateMonthCheckData(
      selectedEqId,
      selectedYear,
      month,
      updatedMonthData,
      currentEq?.name,
      currentEq?.assetCode
    );
    setInspectionRecord({ ...updated });
  };

  // Save entry form
  const handleSaveEntryForm = () => {
    if (!inspectionRecord || !selectedEqId) return;

    const hasFailure = Object.values(entryResults).some(s => s === 'fail');

    const monthData: MonthlyCheckMonthData = {
      itemResults: entryResults,
      issuesNote: entryIssues.trim(),
      technicianName: entryTechName.trim(),
      technicianDate: entryCheckedDate,
      engineerName: entryEngName.trim(),
      reInspectedDate: entryReInspectedDate,
      reInspectionStatus: entryReInspectionStatus,
      reInspectionNote: entryReInspectionNote.trim(),
      managerName: entryMgrName.trim(),
      checkedDate: entryCheckedDate,
      isSpareSwapped: hasFailure
    };

    const currentEq = equipments.find(e => e.id === selectedEqId);
    const updated = updateMonthCheckData(
      selectedEqId,
      selectedYear,
      entryMonth,
      monthData,
      currentEq?.name,
      currentEq?.assetCode
    );
    setInspectionRecord({ ...updated });
    setIsSavedSuccess(true);
    setTimeout(() => setIsSavedSuccess(false), 3000);
  };

  // Set all items in entry form to 'pass'
  const handlePassAllEntry = () => {
    setEntryResults({
      1: 'pass', 2: 'pass', 3: 'pass', 4: 'pass', 5: 'pass', 6: 'pass', 7: 'pass'
    });
  };

  // Trigger print
  const handlePrint = () => {
    document.body.classList.add('printing-report');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-report');
    }, 1000);
  };

  if (!isOpen) return null;

  const currentEquipment = equipments.find(e => e.id === selectedEqId) || {
    id: selectedEqId,
    name: 'เครื่องแพ็คสายพลาสติก',
    assetCode: 'AST-PACK-001',
    location: 'แผนกแพ็คกิ้ง ไลน์ 1',
    purchasePrice: 45000,
    maxRepairBudget: 25000,
    purchaseDate: '2024-01-10',
    equipmentType: 'Main' as const
  };

  const hasAnyFailuresInEntry = Object.values(entryResults).some(s => s === 'fail');

  const monthsList = Object.values(inspectionRecord?.months || {}) as MonthlyCheckMonthData[];
  const verifiedMonthsCount = monthsList.filter(m => m?.reInspectionStatus === 'verified').length;
  const checkedMonthsCount = monthsList.filter(m => m?.itemResults && Object.keys(m.itemResults).length > 0).length;
  const pendingVerificationCount = Math.max(0, checkedMonthsCount - verifiedMonthsCount);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto animate-fade-in font-sans">
      <div className="bg-white rounded-3xl max-w-6xl w-full p-4 sm:p-6 shadow-2xl border border-slate-100 my-4 space-y-4 max-h-[92vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center font-bold shrink-0 shadow-md shadow-emerald-500/20">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900 leading-tight">
                  แบบบันทึกการตรวจสอบเครื่องมือแพ็คสายแพ็คพลาสติกประจำเดือน
                </h3>
                <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  PM Checklist
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                ฟอร์มมาตรฐานตรวจเช็ค 7 รายการ พร้อมคู่มือรอยเชื่อมและระบบอนุมัติ 3 ระดับ (Technician / Engineer / Manager)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
            {/* Re-inspector guide SOP button */}
            <button
              type="button"
              onClick={() => setShowReInspectorGuide(true)}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="คู่มือและขั้นตอนการทำงานสำหรับผู้ตรวจสอบซ้ำ (Re-Inspector SOP)"
            >
              <BookOpen className="h-4 w-4 text-indigo-600" />
              <span>คู่มือผู้ตรวจสอบซ้ำ (SOP)</span>
            </button>

            {/* Print A4 button */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="พิมพ์แบบฟอร์มตรวจสอบ A4 เหมือน Excel"
            >
              <Printer className="h-4 w-4 text-slate-600" />
              <span>พิมพ์ A4</span>
            </button>

            {/* Export CSV button */}
            <button
              type="button"
              onClick={() => inspectionRecord && exportInspectionToCsv(inspectionRecord)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="ดาวน์โหลดข้อมูลเป็นไฟล์ Excel / CSV"
            >
              <Download className="h-4 w-4 text-slate-600" />
              <span>ส่งออก CSV</span>
            </button>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Top Control Bar: Select Equipment & Year & View Mode Switcher */}
        <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs">
          {/* Equipment selector */}
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
            <span className="font-bold text-slate-700 flex items-center gap-1">
              <Cpu className="h-3.5 w-3.5 text-blue-600" /> เครื่องแพ็คสายรัด:
            </span>
            <select
              value={selectedEqId}
              onChange={e => setSelectedEqId(e.target.value)}
              className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-200 min-w-[220px]"
            >
              {selectableEquipments.map(eq => (
                <option key={eq.id} value={eq.id}>
                  {eq.id} - {eq.name} ({eq.location})
                </option>
              ))}
            </select>

            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              เฉพาะเครื่องแพ็คสายรัดพลาสติก (7 ข้อ)
            </span>

            {/* Serial / Asset code badge */}
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-slate-600 font-mono">
              <span className="text-[10px] text-slate-400 font-semibold">Serial/Asset:</span>
              <strong className="text-slate-800 font-bold">{currentEquipment.assetCode || currentEquipment.id}</strong>
            </div>

            {/* Year selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-semibold">ประจำปี:</span>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                className="bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 font-bold text-emerald-800 outline-none font-mono"
              >
                {[2024, 2025, 2026, 2027, 2028].map(y => (
                  <option key={y} value={y}>{y} ({y + 543})</option>
                ))}
              </select>
            </div>
          </div>

          {/* View Mode Toggle: Matrix vs Entry Form */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('matrix')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'matrix'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>ตาราง 12 เดือน (Excel Matrix)</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('entry')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'entry'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>บันทึกตรวจเช็ครายเดือน (Check Form)</span>
            </button>
          </div>
        </div>

        {/* Content Section: Matrix View or Entry View */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">

          {/* ================= MODE 1: MATRIX VIEW (MATCHES EXCEL EXACTLY) ================= */}
          {viewMode === 'matrix' && (
            <div className="space-y-4">
              
              {/* Re-Inspection Audit Progress Banner */}
              <div className="bg-gradient-to-r from-indigo-50/90 via-blue-50/80 to-emerald-50/80 border border-indigo-200 rounded-2xl p-3 text-xs flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
                    <Award className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-bold text-indigo-950 block text-xs">
                      สถานะการตรวจสอบซ้ำโดยวิศวกร (Engineer Re-inspection Progress):
                    </span>
                    <span className="text-[11px] text-slate-600">
                      ตรวจเช็คหน้างานแล้ว <strong>{checkedMonthsCount}</strong> เดือน | ยืนยันตรวจสอบซ้ำแล้ว: <strong className="text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.5 rounded">{verifiedMonthsCount} เดือน</strong> {pendingVerificationCount > 0 ? (
                        <>| รอวิศวกรตรวจสอบซ้ำ: <strong className="text-amber-800 font-bold bg-amber-100 px-1.5 py-0.5 rounded">{pendingVerificationCount} เดือน</strong></>
                      ) : (
                        <span className="text-emerald-700 font-bold ml-1">✓ ตรวจสอบซ้ำครบถ้วนทุกเดือน</span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowReInspectorGuide(true)}
                    className="px-2.5 py-1.5 bg-white hover:bg-indigo-100 text-indigo-800 border border-indigo-300 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs text-[11px]"
                  >
                    <BookOpen className="h-3.5 w-3.5 text-indigo-600" />
                    <span>ขั้นตอนผู้ตรวจสอบซ้ำ (SOP)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('entry')}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs text-[11px] active:scale-95"
                  >
                    <CheckSquare className="h-3.5 w-3.5" />
                    <span>บันทึกผล/ลงนามตรวจซ้ำ</span>
                  </button>
                </div>
              </div>

              {/* Legend and Visual Guide shortcut banner */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3 text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-800">สัญลักษณ์การบันทึกผล:</span>
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>✓ = ปกติ</span>
                  </span>
                  <span className="inline-flex items-center gap-1 font-bold text-rose-700 bg-white px-2 py-0.5 rounded-md border border-rose-200">
                    <XCircle className="h-3.5 w-3.5 text-rose-600" />
                    <span>✕ = ผิดปกติ</span>
                  </span>
                  <span className="text-slate-400">💡 คลิกที่แต่ละช่องเดือนเพื่อสลับผลตรวจ (✓ / ✕ / ว่าง)</span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowVisualGuideModal(true)}
                  className="px-2.5 py-1 bg-white hover:bg-emerald-100/60 text-emerald-800 border border-emerald-300 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                >
                  <Eye className="h-3.5 w-3.5 text-emerald-600" />
                  <span>ดูภาพตัวอย่างการเชื่อมสายรัด 3 รูปแบบ</span>
                </button>
              </div>

              {/* The 12-Month Table Matrix */}
              <div className="overflow-x-auto rounded-2xl border border-slate-300 shadow-xs bg-white">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 border-b-2 border-slate-300">
                      <th className="py-2.5 px-3 text-left font-bold border-r border-slate-300 min-w-[280px]">
                        รายการตรวจสอบ
                      </th>
                      {MONTH_NAMES_TH.map((mName, idx) => (
                        <th 
                          key={mName} 
                          className={`py-2 px-1 text-center font-bold border-r border-slate-200 w-11 ${
                            idx + 1 === currentMonthNumber ? 'bg-emerald-100/70 text-emerald-900 font-extrabold' : ''
                          }`}
                        >
                          {mName}
                        </th>
                      ))}
                      <th className="py-2.5 px-3 text-left font-bold min-w-[200px]">
                        ปัญหาที่พบ / การดำเนินการ
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-sans">
                    {STRAPPING_MACHINE_CHECK_ITEMS.map((item) => (
                      <React.Fragment key={item.id}>
                        <tr className="hover:bg-slate-50/60 transition-colors">
                          {/* Item Title & Subdetail */}
                          <td className="py-2.5 px-3 border-r border-slate-200 align-top">
                            <div className="font-bold text-slate-900 leading-tight">
                              {item.title}
                            </div>
                            {item.subDetail && (
                              <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                                {item.subDetail}
                              </div>
                            )}
                          </td>

                          {/* 12 Months Cells */}
                          {MONTH_NAMES_TH.map((_, mIdx) => {
                            const monthNum = mIdx + 1;
                            const monthData = inspectionRecord?.months[monthNum];
                            const status = monthData?.itemResults[item.id] || 'none';

                            return (
                              <td 
                                key={monthNum}
                                onClick={() => handleMatrixCellClick(item.id, monthNum)}
                                className={`py-2 px-1 text-center border-r border-slate-200 align-middle cursor-pointer select-none transition-all hover:bg-slate-100 ${
                                  monthNum === currentMonthNumber ? 'bg-emerald-50/40' : ''
                                } ${
                                  status === 'pass' 
                                    ? 'bg-emerald-50 text-emerald-700 font-bold' 
                                    : status === 'fail' 
                                    ? 'bg-rose-50 text-rose-700 font-bold' 
                                    : 'text-slate-300'
                                }`}
                                title={`คลิกเพื่อเปลี่ยนผลตรวจ ข้อ ${item.id} เดือน ${MONTH_NAMES_TH[mIdx]}`}
                              >
                                {status === 'pass' && (
                                  <span className="inline-block text-base leading-none text-emerald-600 font-bold">✓</span>
                                )}
                                {status === 'fail' && (
                                  <span className="inline-block text-base leading-none text-rose-600 font-bold">✕</span>
                                )}
                                {status === 'none' && (
                                  <span className="inline-block text-xs text-slate-300 leading-none">-</span>
                                )}
                              </td>
                            );
                          })}

                          {/* Issues Column for this item */}
                          <td className="py-2.5 px-3 align-top text-[11px] text-slate-600">
                            {/* Find any issues logged in months for this item */}
                            {MONTH_NAMES_TH.map((mName, mIdx) => {
                              const mData = inspectionRecord?.months[mIdx + 1];
                              if (mData?.itemResults[item.id] === 'fail' && mData.issuesNote) {
                                return (
                                  <div key={mIdx} className="text-rose-700 font-semibold mb-1">
                                    <span className="bg-rose-100 text-rose-800 px-1 py-0.2 rounded text-[10px] mr-1">
                                      {mName}
                                    </span>
                                    {mData.issuesNote}
                                  </div>
                                );
                              }
                              return null;
                            })}
                          </td>
                        </tr>

                        {/* Special Visual Guide Row for Item 4 (Weld seam guidelines) */}
                        {item.hasVisualGuide && (
                          <tr className="bg-slate-50/80 border-y border-dashed border-slate-200">
                            <td colSpan={14} className="p-3">
                              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
                                <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5 shrink-0">
                                  <Info className="h-4 w-4 text-emerald-600" />
                                  <span>ไกด์ไลน์มาตรฐานการตรวจรอยเชื่อม (ข้อ 4):</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
                                  {/* 1. ปรับถูกต้อง */}
                                  <div className="bg-emerald-50/60 border border-emerald-300 rounded-xl p-2 text-center">
                                    <div className="w-full h-8 bg-emerald-700 rounded-md flex items-center justify-center text-white text-[11px] font-mono tracking-wider relative overflow-hidden shadow-2xs">
                                      <div className="w-10 h-5 border-2 border-dashed border-emerald-300 rounded-xs bg-emerald-600 flex items-center justify-center text-[9px] font-bold">
                                        WELD
                                      </div>
                                    </div>
                                    <span className="block text-[11px] font-bold text-emerald-800 mt-1.5">
                                      ✓ ปรับถูกต้อง
                                    </span>
                                    <span className="block text-[10px] text-emerald-600">
                                      รอยต่อแนบสนิท ละลายเรียบสม่ำเสมอ
                                    </span>
                                  </div>

                                  {/* 2. มากเกินไป */}
                                  <div className="bg-rose-50/60 border border-rose-300 rounded-xl p-2 text-center">
                                    <div className="w-full h-8 bg-emerald-800 rounded-md flex items-center justify-center text-white text-[11px] font-mono tracking-wider relative overflow-hidden shadow-2xs">
                                      <div className="w-14 h-7 border-2 border-red-500 rounded-sm bg-red-900/40 flex items-center justify-center text-[9px] font-bold">
                                        OVERMELT
                                      </div>
                                    </div>
                                    <span className="block text-[11px] font-bold text-rose-800 mt-1.5">
                                      ✕ มากเกินไป สายรัดละลายมากไป
                                    </span>
                                    <span className="block text-[10px] text-rose-600">
                                      ขอบปลิ้น ไหม้ หรือสายรัดบางเกินไป
                                    </span>
                                  </div>

                                  {/* 3. น้อยเกินไป */}
                                  <div className="bg-amber-50/60 border border-amber-300 rounded-xl p-2 text-center">
                                    <div className="w-full h-8 bg-emerald-700/60 rounded-md flex items-center justify-center text-white text-[11px] font-mono tracking-wider relative overflow-hidden shadow-2xs">
                                      <div className="w-8 h-3 border-2 border-dashed border-amber-400 rounded-xs bg-amber-500/30 flex items-center justify-center text-[9px] font-bold text-amber-200">
                                        GAP
                                      </div>
                                    </div>
                                    <span className="block text-[11px] font-bold text-amber-800 mt-1.5">
                                      ✕ น้อยเกินไป สายรัดไม่ติดกัน
                                    </span>
                                    <span className="block text-[10px] text-amber-700">
                                      ความร้อนไม่พอ หลุดง่ายเมื่อดึง
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}

                    {/* Section 3 Approval Signatures Rows */}
                    <tr className="bg-slate-50 font-semibold border-t-2 border-slate-300">
                      <td className="py-2 px-3 border-r border-slate-200 font-bold text-slate-800">
                        ผู้ตรวจสอบ 1 : TECHNICIAN
                      </td>
                      {MONTH_NAMES_TH.map((_, idx) => (
                        <td key={idx} className="py-2 px-1 text-center border-r border-slate-200 text-[10px] font-mono text-slate-700 truncate max-w-[45px]">
                          {inspectionRecord?.months[idx + 1]?.technicianName || '-'}
                        </td>
                      ))}
                      <td className="py-2 px-3 text-[10px] text-slate-500">
                        ช่างเทคนิคลงนามหลังตรวจเช็ค
                      </td>
                    </tr>

                    <tr className="bg-slate-50 font-semibold">
                      <td className="py-2.5 px-3 border-r border-slate-200 font-bold text-slate-800">
                        <div className="flex items-center gap-1.5">
                          <Award className="h-4 w-4 text-indigo-600 shrink-0" />
                          <span>ผู้ตรวจสอบ 2 : ENGINEER (ผู้ตรวจสอบซ้ำ)</span>
                        </div>
                      </td>
                      {MONTH_NAMES_TH.map((_, idx) => {
                        const mData = inspectionRecord?.months[idx + 1];
                        const isVerified = mData?.reInspectionStatus === 'verified';
                        const isCorrection = mData?.reInspectionStatus === 'needs_correction';
                        const hasEng = !!mData?.engineerName;

                        return (
                          <td key={idx} className="py-1 px-1 text-center border-r border-slate-200 text-[10px] font-mono text-slate-700">
                            {hasEng ? (
                              <div className="space-y-0.5">
                                <div className="truncate max-w-[50px] mx-auto text-[9px] font-bold text-slate-800" title={`${mData.engineerName} (${mData.reInspectedDate || ''})\n${mData.reInspectionNote || ''}`}>
                                  {mData.engineerName}
                                </div>
                                {isVerified ? (
                                  <span className="inline-block px-1 py-0.2 bg-emerald-100 text-emerald-800 text-[8px] font-bold rounded shadow-2xs" title={mData.reInspectionNote || 'ยืนยันผลการตรวจซ้ำแล้ว'}>
                                    ✓ ตรวจซ้ำแล้ว
                                  </span>
                                ) : isCorrection ? (
                                  <span className="inline-block px-1 py-0.2 bg-rose-100 text-rose-800 text-[8px] font-bold rounded" title={mData.reInspectionNote || 'พบจุดต้องแก้ไข'}>
                                    ⚠️ สั่งแก้ไข
                                  </span>
                                ) : (
                                  <span className="inline-block px-1 py-0.2 bg-amber-50 text-amber-800 text-[8px] rounded">
                                    รอตรวจซ้ำ
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="py-2 px-3 text-[10px] text-slate-500">
                        วิศวกร/หัวหน้างานตรวจสอบซ้ำ (Cross-Audit)
                      </td>
                    </tr>

                    <tr className="bg-slate-50 font-semibold">
                      <td className="py-2 px-3 border-r border-slate-200 font-bold text-slate-800">
                        ผู้อนุมัติ : MANAGER
                      </td>
                      {MONTH_NAMES_TH.map((_, idx) => (
                        <td key={idx} className="py-2 px-1 text-center border-r border-slate-200 text-[10px] font-mono text-slate-700 truncate max-w-[45px]">
                          {inspectionRecord?.months[idx + 1]?.managerName || '-'}
                        </td>
                      ))}
                      <td className="py-2 px-3 text-[10px] text-slate-500">
                        ผู้จัดการลงนามอนุมัติผลประจำเดือน
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Warning Notice Banner (Matches the Excel footer instruction) */}
              <div className="bg-rose-50 border border-rose-300 rounded-2xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0" />
                  <span className="text-xs font-bold text-rose-900 leading-tight">
                    ** กรณีพบความผิดปกติ ให้แจ้ง Technician หรือ Engineer เพื่อนำเครื่อง Spare มาให้ใช้งานและนำเครื่องที่ผิดปกติส่งซ่อม **
                  </span>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  {onGoToSpareLoan && (
                    <button
                      type="button"
                      onClick={() => onGoToSpareLoan(currentEquipment as Equipment)}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>สลับยืมเครื่อง Spare</span>
                    </button>
                  )}

                  {onGoToMaintenance && (
                    <button
                      type="button"
                      onClick={() => onGoToMaintenance(currentEquipment as Equipment, 'พบปัญหาจากการตรวจเช็คเครื่องแพ็คประจำเดือน')}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Wrench className="h-3.5 w-3.5" />
                      <span>ส่งซ่อมบำรุง</span>
                    </button>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* ================= MODE 2: MONTHLY ENTRY FORM ================= */}
          {viewMode === 'entry' && (
            <div className="space-y-4 max-w-4xl mx-auto">
              
              {/* Month selector & quick pass all */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">เลือกเดือนที่จะบันทึก:</span>
                  <div className="flex flex-wrap gap-1">
                    {MONTH_NAMES_TH.map((mName, idx) => {
                      const mNum = idx + 1;
                      const hasFail = doesMonthHaveFailure(inspectionRecord?.months[mNum]);
                      const hasData = !!inspectionRecord?.months[mNum];

                      return (
                        <button
                          key={mNum}
                          type="button"
                          onClick={() => handleMonthChange(mNum)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer relative ${
                            entryMonth === mNum
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : hasFail
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : hasData
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {mName}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePassAllEntry}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>ปกติทุกข้อ (Pass All)</span>
                  </button>
                </div>
              </div>

              {/* Form Title */}
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <span>บันทึกผลการตรวจสอบ เดือน {MONTH_FULL_NAMES_TH[entryMonth - 1]} {selectedYear}</span>
                  <span className="text-xs font-mono font-normal text-slate-500">
                    ({currentEquipment.name})
                  </span>
                </h4>

                <div className="text-xs text-slate-500 flex items-center gap-1">
                  <span>วันที่ตรวจ:</span>
                  <input
                    type="date"
                    value={entryCheckedDate}
                    onChange={e => setEntryCheckedDate(e.target.value)}
                    className="border border-slate-300 rounded-lg px-2 py-0.5 font-mono text-xs bg-white"
                  />
                </div>
              </div>

              {/* 7 Inspection Items Interactive Cards */}
              <div className="space-y-2.5">
                {STRAPPING_MACHINE_CHECK_ITEMS.map((item) => {
                  const status = entryResults[item.id] || 'pass';

                  return (
                    <div 
                      key={item.id}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        status === 'pass'
                          ? 'bg-white border-slate-200 hover:border-emerald-300'
                          : 'bg-rose-50/70 border-rose-300'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1">
                          <h5 className="text-xs font-bold text-slate-900 leading-snug">
                            {item.title}
                          </h5>
                          {item.subDetail && (
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {item.subDetail}
                            </p>
                          )}

                          {item.hasVisualGuide && (
                            <button
                              type="button"
                              onClick={() => setShowVisualGuideModal(true)}
                              className="inline-flex items-center gap-1 text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold mt-1 hover:underline cursor-pointer"
                            >
                              <Eye className="h-3 w-3" />
                              <span>ดูรูปถ่ายมาตรฐานรอยเชื่อม 3 รูปแบบ (ปรับถูกต้อง / มากเกินไป / น้อยเกินไป)</span>
                            </button>
                          )}
                        </div>

                        {/* Status Toggle Buttons */}
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => setEntryResults(prev => ({ ...prev, [item.id]: 'pass' }))}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                              status === 'pass'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            <span>✓ ปกติ</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setEntryResults(prev => ({ ...prev, [item.id]: 'fail' }))}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                              status === 'fail'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            <XCircle className="h-4 w-4" />
                            <span>✕ ผิดปกติ</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Issues Note input */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2">
                <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <AlertTriangle className={`h-4 w-4 ${hasAnyFailuresInEntry ? 'text-rose-500' : 'text-slate-400'}`} />
                  <span>ปัญหาที่พบ / อาการผิดปกติ / การแก้ไขเบื้องต้น:</span>
                  {hasAnyFailuresInEntry && (
                    <span className="text-[10px] text-rose-600 font-normal">
                      *(พบข้อผิดปกติ กรุณาระบุรายละเอียดเพื่อประสานงานซ่อม)*
                    </span>
                  )}
                </label>
                <textarea
                  rows={2}
                  value={entryIssues}
                  onChange={e => setEntryIssues(e.target.value)}
                  placeholder="เช่น รอยต่อเชื่อมไม่ติดกัน ปรับแรงดันลมแล้วยังหลุด นำเครื่อง Spare มาเปลี่ยนและส่งซ่อม..."
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </div>

              {/* Signatures & Approvals Form */}
              <div className="space-y-3">
                {/* 1. กล่องงานเฉพาะของผู้ตรวจสอบซ้ำ (Re-Inspector Verification Section) */}
                <div className="bg-gradient-to-r from-indigo-50/90 via-blue-50/70 to-slate-50 p-4 rounded-2xl border-2 border-indigo-200 space-y-3 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-indigo-600 text-white rounded-lg shadow-2xs">
                        <Award className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                          ผู้ตรวจสอบ 2 : ENGINEER (ผู้ตรวจสอบซ้ำ / Re-Inspector)
                        </span>
                        <p className="text-[11px] text-indigo-700">
                          วิศวกรทำการตรวจสอบซ้ำ (Cross-Audit) ความถูกต้องของผลตรวจ และสุ่มตรวจสอบเครื่องจริงหน้างาน
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setShowReInspectorGuide(true)}
                        className="px-2.5 py-1 bg-white hover:bg-indigo-100 text-indigo-800 border border-indigo-300 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all shadow-2xs cursor-pointer"
                        title="ดูขั้นตอนมาตรฐานการตรวจสอบซ้ำ"
                      >
                        <BookOpen className="h-3.5 w-3.5 text-indigo-600" />
                        <span>คู่มือผู้ตรวจสอบซ้ำ (SOP)</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleQuickVerifyByEngineer}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all shadow-xs cursor-pointer active:scale-95"
                        title="กดเพื่อลงนามยืนยันการตรวจสอบซ้ำทันที"
                      >
                        <CheckSquare className="h-3.5 w-3.5" />
                        <span>⚡ ประทับตรายืนยันตรวจซ้ำ</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        ชื่อวิศวกรผู้ตรวจสอบซ้ำ (Engineer):
                      </label>
                      <input
                        type="text"
                        value={entryEngName}
                        onChange={e => setEntryEngName(e.target.value)}
                        placeholder="ชื่อวิศวกรซ่อมบำรุง / ผู้ตรวจสอบซ้ำ"
                        className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-300 font-semibold text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        วันที่ทำการตรวจสอบซ้ำ:
                      </label>
                      <input
                        type="date"
                        value={entryReInspectedDate}
                        onChange={e => setEntryReInspectedDate(e.target.value)}
                        className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-300 font-mono text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        สถานะการประเมินซ้ำ:
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEntryReInspectionStatus('verified')}
                          className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                            entryReInspectionStatus === 'verified'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-white border border-slate-200 text-slate-600 hover:bg-emerald-50'
                          }`}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>✓ ผ่านการตรวจซ้ำ</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setEntryReInspectionStatus('needs_correction')}
                          className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                            entryReInspectionStatus === 'needs_correction'
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'bg-white border border-slate-200 text-slate-600 hover:bg-rose-50'
                          }`}
                        >
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span>⚠️ สั่งแก้ไข</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      บันทึกข้อสังเกตของผู้ตรวจสอบซ้ำ (Re-inspection Audit Note):
                    </label>
                    <input
                      type="text"
                      value={entryReInspectionNote}
                      onChange={e => setEntryReInspectionNote(e.target.value)}
                      placeholder="เช่น สุ่มดึงรอยเชื่อมสายรัดและตรวจถ้วยดักน้ำแล้ว สภาพสมบูรณ์พร้อมใช้งาน..."
                      className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-300 text-slate-800"
                    />
                  </div>
                </div>

                {/* 2. ผู้ตรวจสอบ 1 (Technician) & ผู้อนุมัติ (Manager) */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <span className="block text-xs font-bold text-slate-700 mb-3 flex items-center gap-1.5">
                    <UserCheck className="h-4 w-4 text-emerald-600" />
                    ผู้ตรวจเช็คหน้างาน และผู้อนุมัติผลประจำเดือน (Sign-offs):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        ผู้ตรวจสอบ 1 : TECHNICIAN (ช่างผู้ตรวจเช็คหน้างาน)
                      </label>
                      <input
                        type="text"
                        value={entryTechName}
                        onChange={e => setEntryTechName(e.target.value)}
                        placeholder="ชื่อช่างเทคนิค"
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-emerald-400 font-semibold text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        ผู้อนุมัติ : MANAGER (ผู้จัดการฝ่ายผลิต / วิศวกรรม)
                      </label>
                      <input
                        type="text"
                        value={entryMgrName}
                        onChange={e => setEntryMgrName(e.target.value)}
                        placeholder="ชื่อผู้จัดการ"
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-emerald-400 font-semibold text-slate-800"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Save & Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="text-xs text-slate-500">
                  {isSavedSuccess && (
                    <span className="text-emerald-700 font-bold bg-emerald-100 px-3 py-1 rounded-lg animate-fade-in flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      บันทึกผลการตรวจสอบเดือน {MONTH_FULL_NAMES_TH[entryMonth - 1]} เรียบร้อยแล้ว
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setViewMode('matrix')}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    กลับสู่หน้าตารางรวม
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEntryForm}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>บันทึกผลตรวจเช็คเดือนนี้</span>
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 shrink-0 text-xs text-slate-500">
          <div>
            รหัสเครื่อง: <strong className="font-mono text-slate-800">{currentEquipment.id}</strong> | ตำแหน่ง: <span className="font-semibold text-slate-700">{currentEquipment.location}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>

      {/* Visual Guide Popup Modal */}
      {showVisualGuideModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-60 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Info className="h-5 w-5 text-emerald-600" />
                <span>คู่มือตรวจสอบรอยเชื่อมสายแพ็คพลาสติก (Weld Joint Guide)</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowVisualGuideModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              ตามข้อกำหนดข้อที่ 4: ตรวจสอบแรงกดการเชื่อมสายแพ็ค โดยการทดลองรัดสายแพ็คและดูความสมบูรณ์ของรอยต่อสายรัด
            </p>

            <div className="space-y-3">
              {/* 1. Correct */}
              <div className="border-2 border-emerald-400 bg-emerald-50/50 rounded-2xl p-3 flex items-start gap-3">
                <div className="w-24 h-16 bg-emerald-700 rounded-xl shrink-0 flex items-center justify-center text-white font-mono text-xs shadow-inner">
                  <div className="w-14 h-8 border-2 border-dashed border-emerald-300 rounded bg-emerald-600/80 flex items-center justify-center text-[10px] font-bold">
                    ✓ GOOD
                  </div>
                </div>
                <div>
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-200/80 px-2 py-0.5 rounded-md inline-block mb-1">
                    1. ปรับถูกต้อง (Optimal)
                  </span>
                  <p className="text-xs text-slate-700 font-medium leading-relaxed">
                    รอยหลอมละลายเชื่อมประสานแนบสนิท เรียบเนียนสม่ำเสมอตลอดแนวเชื่อม ไม่แบนหรือไหม้ และไม่หลุดลอกเมื่อทดสอบดึง
                  </p>
                </div>
              </div>

              {/* 2. Overmelt */}
              <div className="border-2 border-rose-300 bg-rose-50/50 rounded-2xl p-3 flex items-start gap-3">
                <div className="w-24 h-16 bg-emerald-900 rounded-xl shrink-0 flex items-center justify-center text-white font-mono text-xs shadow-inner">
                  <div className="w-20 h-12 border-2 border-red-500 rounded bg-red-800/80 flex items-center justify-center text-[10px] font-bold text-red-100">
                    ✕ OVERMELT
                  </div>
                </div>
                <div>
                  <span className="text-xs font-bold text-rose-800 bg-rose-200/80 px-2 py-0.5 rounded-md inline-block mb-1">
                    2. มากเกินไป สายรัดละลายมากไป (Overheated)
                  </span>
                  <p className="text-xs text-slate-700 font-medium leading-relaxed">
                    รอยเชื่อมเกิดความร้อนหรือเวลาสั่นเสียดสีนานเกินไป ทำให้ขอบเนื้อพลาสติกปลิ้นออกด้านข้าง แบนบางลงจนสูญเสียแรงดึง
                  </p>
                </div>
              </div>

              {/* 3. Undermelt */}
              <div className="border-2 border-amber-300 bg-amber-50/50 rounded-2xl p-3 flex items-start gap-3">
                <div className="w-24 h-16 bg-emerald-700/60 rounded-xl shrink-0 flex items-center justify-center text-white font-mono text-xs shadow-inner">
                  <div className="w-10 h-4 border-2 border-dashed border-amber-400 rounded bg-amber-500/40 flex items-center justify-center text-[9px] font-bold text-amber-200">
                    ✕ GAP
                  </div>
                </div>
                <div>
                  <span className="text-xs font-bold text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-md inline-block mb-1">
                    3. น้อยเกินไป สายรัดไม่ติดกัน (Underheated / Loose)
                  </span>
                  <p className="text-xs text-slate-700 font-medium leading-relaxed">
                    แรงกดหรือความร้อนในการเชื่อมไม่เพียงพอ เนื้อสายรัดไม่หลอมติดกัน สามารถดึงแยกออกจากกันได้ง่าย เสี่ยงกล่องหลุดระหว่างขนส่ง
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowVisualGuideModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                เข้าใจแล้ว ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Re-Inspector SOP Guide Popup Modal */}
      {showReInspectorGuide && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-60 animate-fade-in font-sans">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-5 sm:p-7 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-gradient-to-br from-indigo-600 to-blue-700 text-white rounded-xl shadow-xs">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span>คู่มือขั้นตอนปฏิบัติงานสำหรับผู้ตรวจสอบซ้ำ (Re-Inspector / Engineer SOP)</span>
                  </h4>
                  <p className="text-xs text-slate-500">
                    ขั้นตอนมาตรฐานการตรวจสอบซ้ำ (Cross-Audit) เครื่องแพ็คสายรัดพลาสติกประจำเดือน
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowReInspectorGuide(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Introduction Banner */}
            <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-3.5 text-xs text-indigo-950 space-y-1">
              <strong className="block text-indigo-900 font-bold flex items-center gap-1.5">
                <HelpCircle className="h-4 w-4 text-indigo-600" />
                <span>คำถาม: ผู้ตรวจสอบซ้ำ (ผู้ตรวจสอบ 2 : Engineer) ต้องทำอย่างไรบ้าง?</span>
              </strong>
              <p className="text-slate-700 leading-relaxed">
                ตามระบบ TPM และข้อกำหนดในแบบฟอร์มตรวจสอบเครื่องมือ <strong>"ผู้ตรวจสอบซ้ำ"</strong> มีหน้าที่ทำ <strong>Cross-Audit</strong> และ <strong>Spot-Check</strong> เพื่อรับรองว่าช่างเทคนิคได้ทำการตรวจเช็คเครื่องมือจริงตามมาตรฐาน 7 ข้อ ไม่ใช่การเซ็นผ่านโดยไม่ได้ตรวจสอบ และกำกับดูแลให้ไลน์ผลิตมีเครื่องใช้งานต่อเนื่องตลอดเวลา
              </p>
            </div>

            {/* 4 Standard Operating Procedures */}
            <div className="space-y-3 text-xs">
              {/* Step 1 */}
              <div className="border border-slate-200 rounded-2xl p-3.5 bg-slate-50/60 flex items-start gap-3">
                <div className="h-7 w-7 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                  1
                </div>
                <div className="flex-1 space-y-1">
                  <h5 className="font-bold text-slate-900 text-xs">
                    ขั้นตอนที่ 1: ตรวจสอบความครบถ้วนของแบบประเมิน (Checklist Audit)
                  </h5>
                  <p className="text-slate-600 leading-relaxed">
                    ตรวจทานว่าช่างเทคนิคได้บันทึกผลทั้ง 7 รายการของเดือนนั้นๆ เรียบร้อย ไม่มีการเว้นว่าง หากมีข้อใดบันทึกว่า ✕ (ผิดปกติ) ให้ตรวจดูช่องหมายเหตุว่าได้ระบุอาการและแนวทางแก้ไขเบื้องต้นไว้ชัดเจนหรือไม่
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="border-2 border-indigo-200 rounded-2xl p-3.5 bg-indigo-50/40 flex items-start gap-3">
                <div className="h-7 w-7 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                  2
                </div>
                <div className="flex-1 space-y-2">
                  <h5 className="font-bold text-indigo-950 text-xs">
                    ขั้นตอนที่ 2: สุ่มตรวจสอบเครื่องจริงหน้างาน (Spot-Check Critical Points)
                  </h5>
                  <p className="text-slate-700 leading-relaxed">
                    วิศวกรผู้ตรวจสอบซ้ำต้องสุ่มลงพื้นที่หน้างานตรวจสอบจุดวิกฤตสำคัญ 3 จุดหลัก:
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                    <div className="bg-white p-2.5 rounded-xl border border-indigo-100 shadow-2xs">
                      <strong className="block text-indigo-900 font-bold mb-0.5">🔥 ข้อ 4. รอยเชื่อมสายแพ็ค</strong>
                      <span className="text-[11px] text-slate-600 leading-tight block">
                        ทดลองรัดสายจริง สุ่มดึงดูรอยเชื่อม ต้องละลายแนบสนิทสม่ำเสมอ ไม่ไหม้ (Overmelt) และไม่หลุดลอก (Undermelt)
                      </span>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-indigo-100 shadow-2xs">
                      <strong className="block text-blue-900 font-bold mb-0.5">💧 ข้อ 6. ถ่ายน้ำกรองลม</strong>
                      <span className="text-[11px] text-slate-600 leading-tight block">
                        ตรวจถ้วยดักน้ำและกรองลม ว่ากดเดรนระบายน้ำออกหมดจด ไม่มีน้ำขังที่จะเข้าไปทำลายมอเตอร์ลม
                      </span>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-indigo-100 shadow-2xs">
                      <strong className="block text-teal-900 font-bold mb-0.5">🛢️ ข้อ 7. หยอดน้ำมันลม</strong>
                      <span className="text-[11px] text-slate-600 leading-tight block">
                        ตรวจสอบว่าช่างได้หยอดน้ำมันแอร์ทูล 2-3 หยดที่ช่องลมท้ายเครื่อง และกดยิงหล่อลื่นเรียบร้อย
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="border border-rose-200 rounded-2xl p-3.5 bg-rose-50/40 flex items-start gap-3">
                <div className="h-7 w-7 rounded-xl bg-rose-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                  3
                </div>
                <div className="flex-1 space-y-1">
                  <h5 className="font-bold text-rose-950 text-xs">
                    ขั้นตอนที่ 3: ตรวจสอบการจัดการเครื่องชำรุด (Defect Follow-up & Spare Swapping)
                  </h5>
                  <p className="text-slate-700 leading-relaxed">
                    หากผลการตรวจพบข้อ ✕ (ผิดปกติ) วิศวกรผู้ตรวจสอบซ้ำต้องกำกับดูแลทันทีว่า:
                  </p>
                  <ul className="list-disc list-inside text-[11px] text-slate-700 space-y-0.5 pl-1">
                    <li>ได้นำเครื่องสำรอง (Spare Strapping Tool) มาติดตั้งสลับให้ไลน์ผลิตทำงานต่อเนื่องแล้วหรือไม่</li>
                    <li>เครื่องที่ผิดปกติถูกเปิดใบแจ้งซ่อม หรือส่งซ่อมบำรุงในระบบ Maintenance Logs แล้วหรือไม่</li>
                  </ul>
                </div>
              </div>

              {/* Step 4 */}
              <div className="border border-emerald-200 rounded-2xl p-3.5 bg-emerald-50/40 flex items-start gap-3">
                <div className="h-7 w-7 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                  4
                </div>
                <div className="flex-1 space-y-1">
                  <h5 className="font-bold text-emerald-950 text-xs">
                    ขั้นตอนที่ 4: ลงนามบันทึกการตรวจสอบซ้ำในระบบ (System Verification Sign-off)
                  </h5>
                  <p className="text-slate-700 leading-relaxed">
                    เปิดหน้าแบบฟอร์มประจำเดือนนั้น ระบุชื่อวิศวกรผู้ตรวจซ้ำ วันที่ตรวจซ้ำ เลือกสถานะ <strong>"✓ ผ่านการตรวจซ้ำ (Verified)"</strong> พร้อมกรอกข้อสังเกตหน้างาน แล้วกดบันทึกผล เพื่อส่งต่อให้ผู้จัดการฝ่าย (Manager) ลงนามอนุมัติปิดรอบประจำปี
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-[11px] text-slate-500">
                💡 สามารถกดปุ่ม <strong>"⚡ ประทับตรายืนยันตรวจซ้ำ"</strong> ในหน้าแบบฟอร์มเพื่อบันทึกผลในคลิกเดียว
              </span>
              <button
                type="button"
                onClick={() => setShowReInspectorGuide(false)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                เข้าใจขั้นตอนแล้ว ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden A4 Report Section for Printing (Exact layout of user's Excel sheet) */}
      <div id="report-print-section" className="hidden">
        <div style={{
          width: '100%',
          margin: '0 auto',
          padding: '10px 12px',
          fontFamily: "'Sarabun', 'Mitr', sans-serif",
          color: '#000000',
          backgroundColor: '#ffffff',
          boxSizing: 'border-box'
        }}>
          
          {/* Top Title & Metadata */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #000000', paddingBottom: '6px', marginBottom: '8px' }}>
            <div>
              <h1 style={{ fontSize: '15px', fontWeight: 'bold', margin: 0, color: '#000000' }}>
                แบบบันทึกการตรวจสอบเครื่องมือแพ็คสายแพ็คพลาสติก
              </h1>
              <p style={{ fontSize: '9px', color: '#444444', margin: '2px 0 0 0' }}>
                Plastic Strapping Tool Monthly Preventive Maintenance Inspection Log
              </p>
            </div>
            <div style={{ textAlign: 'right', fontSize: '11px', color: '#000000' }}>
              <p style={{ margin: 0, fontWeight: 'bold' }}>
                เครื่อง: <span style={{ textDecoration: 'underline' }}>{currentEquipment.name} ({currentEquipment.id})</span>
              </p>
              <p style={{ margin: '2px 0 0 0', fontWeight: 'bold' }}>
                ประจำปี: <span style={{ textDecoration: 'underline' }}>{selectedYear}</span>
              </p>
            </div>
          </div>

          {/* Table Grid (12 Months) */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', color: '#000000', border: '1.5px solid #000000' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1.5px solid #000000' }}>
                <th style={{ width: '42%', padding: '5px 4px', borderRight: '1px solid #000000', textAlign: 'left', fontWeight: 'bold' }}>
                  รายการตรวจสอบ
                </th>
                {MONTH_NAMES_TH.map(m => (
                  <th key={m} style={{ width: '3.2%', padding: '4px 1px', borderRight: '1px solid #000000', textAlign: 'center', fontWeight: 'bold' }}>
                    {m}
                  </th>
                ))}
                <th style={{ width: '20%', padding: '5px 4px', textAlign: 'left', fontWeight: 'bold' }}>
                  ปัญหาที่พบ
                </th>
              </tr>
            </thead>
            <tbody>
              {STRAPPING_MACHINE_CHECK_ITEMS.map((item, idx) => (
                <React.Fragment key={item.id}>
                  <tr style={{ borderBottom: '1px solid #000000' }}>
                    <td style={{ padding: '4px', borderRight: '1px solid #000000', verticalAlign: 'top', lineHeight: '1.3' }}>
                      <strong>{item.title}</strong>
                      {item.subDetail && <div style={{ fontSize: '8px', color: '#555555' }}>{item.subDetail}</div>}
                    </td>

                    {MONTH_NAMES_TH.map((_, mIdx) => {
                      const mNum = mIdx + 1;
                      const status = inspectionRecord?.months[mNum]?.itemResults[item.id];
                      return (
                        <td key={mNum} style={{ padding: '4px 1px', borderRight: '1px solid #000000', textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold', fontSize: '11px' }}>
                          {status === 'pass' ? '✓' : status === 'fail' ? '✕' : '-'}
                        </td>
                      );
                    })}

                    <td style={{ padding: '4px', verticalAlign: 'top', fontSize: '8px', color: '#222222' }}>
                      {MONTH_NAMES_TH.map((mName, mIdx) => {
                        const mData = inspectionRecord?.months[mIdx + 1];
                        if (mData?.itemResults[item.id] === 'fail' && mData.issuesNote) {
                          return <div key={mIdx} style={{ color: '#b91c1c' }}>[{mName}] {mData.issuesNote}</div>;
                        }
                        return null;
                      })}
                    </td>
                  </tr>

                  {/* Print Visual Guide for item 4 */}
                  {item.hasVisualGuide && (
                    <tr style={{ borderBottom: '1px solid #000000', backgroundColor: '#fafafa' }}>
                      <td colSpan={14} style={{ padding: '4px 8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', textAlign: 'center', fontSize: '8px' }}>
                          <div style={{ border: '1px solid #10b981', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#ecfdf5' }}>
                            <strong>[✓ ปรับถูกต้อง]</strong>: รอยเชื่อมแนบสนิท สม่ำเสมอ
                          </div>
                          <div style={{ border: '1px solid #ef4444', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#fef2f2' }}>
                            <strong>[✕ มากเกินไป]</strong>: สายรัดละลายมากไป ขอบปลิ้น ไหม้
                          </div>
                          <div style={{ border: '1px solid #f59e0b', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#fffbeb' }}>
                            <strong>[✕ น้อยเกินไป]</strong>: สายรัดไม่ติดกัน ดึงแล้วหลุด
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}

              {/* Signatures in Printout */}
              <tr style={{ borderTop: '2px solid #000000', borderBottom: '1px solid #000000', backgroundColor: '#f8fafc' }}>
                <td style={{ padding: '4px', borderRight: '1px solid #000000', fontWeight: 'bold' }}>
                  ผู้ตรวจสอบ 1 : TECHNICIAN
                </td>
                {MONTH_NAMES_TH.map((_, i) => (
                  <td key={i} style={{ padding: '3px 1px', borderRight: '1px solid #000000', textAlign: 'center', fontSize: '7.5px' }}>
                    {inspectionRecord?.months[i + 1]?.technicianName || '-'}
                  </td>
                ))}
                <td style={{ padding: '3px' }}></td>
              </tr>

              <tr style={{ borderBottom: '1px solid #000000', backgroundColor: '#f8fafc' }}>
                <td style={{ padding: '4px', borderRight: '1px solid #000000', fontWeight: 'bold' }}>
                  ผู้ตรวจสอบ 2 : ENGINEER (ผู้ตรวจสอบซ้ำ)
                </td>
                {MONTH_NAMES_TH.map((_, i) => {
                  const m = inspectionRecord?.months[i + 1];
                  return (
                    <td key={i} style={{ padding: '3px 1px', borderRight: '1px solid #000000', textAlign: 'center', fontSize: '7px' }}>
                      {m?.engineerName ? `${m.engineerName}${m.reInspectionStatus === 'verified' ? ' (✓)' : ''}` : '-'}
                    </td>
                  );
                })}
                <td style={{ padding: '3px' }}></td>
              </tr>

              <tr style={{ backgroundColor: '#f8fafc' }}>
                <td style={{ padding: '4px', borderRight: '1px solid #000000', fontWeight: 'bold' }}>
                  ผู้อนุมัติ : MANAGER
                </td>
                {MONTH_NAMES_TH.map((_, i) => (
                  <td key={i} style={{ padding: '3px 1px', borderRight: '1px solid #000000', textAlign: 'center', fontSize: '7.5px' }}>
                    {inspectionRecord?.months[i + 1]?.managerName || '-'}
                  </td>
                ))}
                <td style={{ padding: '3px' }}></td>
              </tr>
            </tbody>
          </table>

          {/* Footer Notes & Legend */}
          <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '8.5px' }}>
            <div style={{ color: '#b91c1c', fontWeight: 'bold' }}>
              ** กรณีพบความผิดปกติ ให้แจ้ง Technician หรือ Engineer เพื่อนำเครื่อง Spare มาให้ใช้งานและนำเครื่องที่ผิดปกติส่งซ่อม **
            </div>
            <div>
              <strong>Serial no. :</strong> {currentEquipment.assetCode || currentEquipment.id} | <strong>การบันทึกผล:</strong> ✓ = ปกติ, ✕ = ผิดปกติ
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
