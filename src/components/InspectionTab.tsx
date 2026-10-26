import React, { useState, useEffect, useMemo } from 'react';
import { 
  Equipment, 
  SparePart, 
  MonthlyCheckMonthData, 
  EquipmentMonthlyInspectionRecord, 
  InspectionResultStatus,
  InspectionFormTemplate,
  InspectionCheckItem 
} from '../types';
import { 
  INSPECTION_FORM_TEMPLATES, 
  MONTH_NAMES_TH, 
  MONTH_FULL_NAMES_TH, 
  loadInspectionRecords, 
  getOrCreateEquipmentInspection, 
  updateMonthCheckData, 
  changeRecordFormTemplate,
  toggleInspectionItemStatus, 
  doesMonthHaveFailure,
  exportInspectionToCsv,
  isStrappingMachine,
  getFormTemplateById,
  suggestFormForEquipment,
  getEquipmentAssignedFormId,
  setEquipmentAssignedFormId,
  loadFormTemplates,
  saveFormTemplates,
  updateFormTemplate,
  resetFormTemplatesToDefault
} from '../utils/inspectionStorage';
import { 
  ClipboardCheck, 
  FileText, 
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
  UserCheck, 
  ShieldAlert, 
  Eye, 
  RotateCcw, 
  ChevronRight, 
  Info, 
  Clock, 
  BookOpen, 
  Award, 
  CheckSquare, 
  HelpCircle, 
  Search, 
  Filter, 
  ArrowRightLeft, 
  ExternalLink,
  Layers,
  ChevronDown,
  Edit3,
  Trash2,
  Plus,
  RefreshCw,
  Save,
  FileEdit
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface InspectionTabProps {
  equipments: Equipment[];
  parts?: SparePart[];
  onGoToSpareLoan?: () => void;
  onGoToMaintenance?: () => void;
  preSelectedEquipmentId?: string;
}

export default function InspectionTab({
  equipments,
  parts = [],
  onGoToSpareLoan,
  onGoToMaintenance,
  preSelectedEquipmentId
}: InspectionTabProps) {
  // 1. Selection states
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-12
  
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedEqId, setSelectedEqId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  // 2. Inspection record & Form template state
  const [formTemplates, setFormTemplates] = useState<InspectionFormTemplate[]>(() => loadFormTemplates());
  const [inspectionRecord, setInspectionRecord] = useState<EquipmentMonthlyInspectionRecord | null>(null);
  const [activeFormTemplate, setActiveFormTemplate] = useState<InspectionFormTemplate>(() => {
    const tmpls = loadFormTemplates();
    return tmpls[0];
  });
  const [showFormPickerModal, setShowFormPickerModal] = useState<boolean>(false);

  // Form Template Editor Modal state
  const [showEditTemplateModal, setShowEditTemplateModal] = useState<boolean>(false);
  const [editingTemplateDraft, setEditingTemplateDraft] = useState<InspectionFormTemplate | null>(null);

  // Helper to open form editor for a template
  const handleOpenTemplateEditor = (template: InspectionFormTemplate) => {
    setEditingTemplateDraft(JSON.parse(JSON.stringify(template)));
    setShowEditTemplateModal(true);
  };

  // Save template draft
  const handleSaveTemplateDraft = () => {
    if (!editingTemplateDraft) return;
    const updatedList = updateFormTemplate(editingTemplateDraft.id, editingTemplateDraft);
    setFormTemplates(updatedList);
    
    if (activeFormTemplate.id === editingTemplateDraft.id) {
      setActiveFormTemplate(editingTemplateDraft);
    }
    
    setShowEditTemplateModal(false);
    setIsSavedSuccess(true);
    setTimeout(() => setIsSavedSuccess(false), 3000);
  };

  // Reset all templates to defaults
  const handleResetTemplatesToDefault = () => {
    if (confirm('คุณต้องการรีเซ็ตเนื้อหาแบบฟอร์มทั้งหมดกลับเป็นค่าเริ่มต้นโรงงาน 4 รายการใช่หรือไม่?')) {
      const resetList = resetFormTemplatesToDefault();
      setFormTemplates(resetList);
      const currentAssigned = getEquipmentAssignedFormId(currentEquipment?.id || '');
      const newActive = getFormTemplateById(currentAssigned);
      setActiveFormTemplate(newActive);
      setShowEditTemplateModal(false);
      setShowFormPickerModal(false);
    }
  };

  // 3. View Mode: 'matrix' (full 12-month table like Excel) or 'entry' (monthly checklist form)
  const [viewMode, setViewMode] = useState<'matrix' | 'entry'>('matrix');

  // 4. Entry form fields
  const [entryMonth, setEntryMonth] = useState<number>(currentMonth);
  const [entryResults, setEntryResults] = useState<Record<number, InspectionResultStatus>>({});
  const [entryIssues, setEntryIssues] = useState<string>('');
  const [entryTechName, setEntryTechName] = useState<string>('วิโรจน์');
  const [entryEngName, setEntryEngName] = useState<string>('กู้เกียรติ');
  const [entryMgrName, setEntryMgrName] = useState<string>('ชมภู่');
  const [entryCheckedDate, setEntryCheckedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  
  // Re-Inspector specific states
  const [entryReInspectedDate, setEntryReInspectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [entryReInspectionStatus, setEntryReInspectionStatus] = useState<'verified' | 'needs_correction' | 'pending'>('pending');
  const [entryReInspectionNote, setEntryReInspectionNote] = useState<string>('');
  const [entryIsSpareSwapped, setEntryIsSpareSwapped] = useState<boolean>(false);
  const [showReInspectorGuide, setShowReInspectorGuide] = useState<boolean>(false);
  const [showVisualGuideModal, setShowVisualGuideModal] = useState<boolean>(false);
  const [isSavedSuccess, setIsSavedSuccess] = useState<boolean>(false);

  // Filtered equipment list for selection
  const filteredEquipments = useMemo(() => {
    return equipments.filter(eq => {
      const matchSearch = 
        eq.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (eq.assetCode && eq.assetCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
        eq.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (eq.location && eq.location.toLowerCase().includes(searchTerm.toLowerCase()));
      
      if (!matchSearch) return false;
      if (categoryFilter === 'all') return true;
      if (categoryFilter === 'strapping') return isStrappingMachine(eq);
      return eq.category === categoryFilter;
    });
  }, [equipments, searchTerm, categoryFilter]);

  // Initial selection
  useEffect(() => {
    if (preSelectedEquipmentId && equipments.some(e => e.id === preSelectedEquipmentId)) {
      setSelectedEqId(preSelectedEquipmentId);
    } else if (!selectedEqId && equipments.length > 0) {
      // Prioritize strapping machine if available, else first equipment
      const strappingEq = equipments.find(isStrappingMachine);
      setSelectedEqId(strappingEq ? strappingEq.id : equipments[0].id);
    }
  }, [preSelectedEquipmentId, equipments]);

  // Current selected equipment object
  const currentEquipment = useMemo(() => {
    return equipments.find(e => e.id === selectedEqId) || equipments[0];
  }, [equipments, selectedEqId]);

  // Load inspection record and active template when equipment or year changes
  useEffect(() => {
    if (!currentEquipment) return;

    const assignedFormId = getEquipmentAssignedFormId(currentEquipment.id, currentEquipment);
    const template = getFormTemplateById(assignedFormId);
    setActiveFormTemplate(template);

    const record = getOrCreateEquipmentInspection(
      currentEquipment.id,
      currentEquipment.name,
      currentEquipment.assetCode,
      selectedYear,
      template.shortName,
      assignedFormId
    );
    setInspectionRecord(record);

    loadMonthDataIntoForm(record, entryMonth, template);
  }, [currentEquipment?.id, selectedYear]);

  // Listen for storage updates from other components / cloud sync
  useEffect(() => {
    const handleStorageUpdate = () => {
      if (!currentEquipment) return;
      const assignedFormId = getEquipmentAssignedFormId(currentEquipment.id, currentEquipment);
      const template = getFormTemplateById(assignedFormId);
      const record = getOrCreateEquipmentInspection(
        currentEquipment.id,
        currentEquipment.name,
        currentEquipment.assetCode,
        selectedYear,
        template.shortName,
        assignedFormId
      );
      setInspectionRecord(record);
    };
    window.addEventListener('inspection-records-updated', handleStorageUpdate);
    return () => window.removeEventListener('inspection-records-updated', handleStorageUpdate);
  }, [currentEquipment?.id, selectedYear]);

  // When entryMonth changes, load that month's data
  useEffect(() => {
    if (currentEquipment) {
      const assignedFormId = getEquipmentAssignedFormId(currentEquipment.id, currentEquipment);
      const template = getFormTemplateById(assignedFormId);
      const record = getOrCreateEquipmentInspection(
        currentEquipment.id,
        currentEquipment.name,
        currentEquipment.assetCode,
        selectedYear,
        template.shortName,
        assignedFormId
      );
      setInspectionRecord(record);
      loadMonthDataIntoForm(record, entryMonth, template);
    }
  }, [entryMonth, currentEquipment?.id, selectedYear]);

  const loadMonthDataIntoForm = (
    record: EquipmentMonthlyInspectionRecord, 
    month: number, 
    template: InspectionFormTemplate
  ) => {
    const monthData = record.months[month];
    const initialResults: Record<number, InspectionResultStatus> = {};
    
    template.checkItems.forEach(item => {
      initialResults[item.id] = monthData?.itemResults?.[item.id] || 'pass';
    });

    setEntryResults(initialResults);
    setEntryIssues(monthData?.issuesNote || '');
    setEntryTechName(monthData?.technicianName || 'วิโรจน์');
    setEntryEngName(monthData?.engineerName || 'กู้เกียรติ');
    setEntryMgrName(monthData?.managerName || 'ชมภู่');
    setEntryCheckedDate(monthData?.technicianDate || monthData?.checkedDate || new Date().toISOString().slice(0, 10));
    setEntryReInspectedDate(monthData?.reInspectedDate || new Date().toISOString().slice(0, 10));
    setEntryReInspectionStatus(monthData?.reInspectionStatus || (monthData?.engineerName ? 'verified' : 'pending'));
    setEntryReInspectionNote(monthData?.reInspectionNote || '');
    setEntryIsSpareSwapped(monthData?.isSpareSwapped || false);
  };

  // Switch form template for current equipment
  const handleSelectFormTemplate = (templateId: string) => {
    if (!currentEquipment) return;
    const template = getFormTemplateById(templateId);
    setActiveFormTemplate(template);
    setEquipmentAssignedFormId(currentEquipment.id, templateId);

    const updated = changeRecordFormTemplate(currentEquipment.id, selectedYear, templateId);
    if (updated) {
      setInspectionRecord(updated);
      loadMonthDataIntoForm(updated, entryMonth, template);
    } else {
      const newRec = getOrCreateEquipmentInspection(
        currentEquipment.id,
        currentEquipment.name,
        currentEquipment.assetCode,
        selectedYear,
        template.shortName,
        templateId
      );
      setInspectionRecord(newRec);
      loadMonthDataIntoForm(newRec, entryMonth, template);
    }
    setShowFormPickerModal(false);
  };

  // Quick toggle status in matrix view
  const handleMatrixCellToggle = (month: number, itemId: number) => {
    if (!currentEquipment || !inspectionRecord) return;
    const currentMonthData = inspectionRecord.months[month] || {
      itemResults: {},
      technicianName: 'วิโรจน์',
      engineerName: 'กู้เกียรติ',
      reInspectionStatus: 'pending',
      checkedDate: new Date().toISOString().slice(0, 10)
    };

    const newStatus = toggleInspectionItemStatus(currentMonthData.itemResults[itemId]);
    const updatedMonthData: MonthlyCheckMonthData = {
      ...currentMonthData,
      itemResults: {
        ...currentMonthData.itemResults,
        [itemId]: newStatus
      }
    };

    const updatedRecord = updateMonthCheckData(
      currentEquipment.id,
      selectedYear,
      month,
      updatedMonthData,
      currentEquipment.name,
      currentEquipment.assetCode,
      activeFormTemplate.id
    );
    setInspectionRecord(updatedRecord);
  };

  // Auto-save helper method that persists form changes immediately to storage
  const saveCurrentMonthData = (overrides: Partial<MonthlyCheckMonthData> = {}) => {
    if (!currentEquipment) return;
    const monthData: MonthlyCheckMonthData = {
      itemResults: overrides.itemResults !== undefined ? overrides.itemResults : entryResults,
      issuesNote: overrides.issuesNote !== undefined ? overrides.issuesNote : entryIssues.trim(),
      technicianName: overrides.technicianName !== undefined ? overrides.technicianName : entryTechName.trim(),
      technicianDate: overrides.technicianDate !== undefined ? overrides.technicianDate : entryCheckedDate,
      engineerName: overrides.engineerName !== undefined ? overrides.engineerName : entryEngName.trim(),
      reInspectedDate: overrides.reInspectedDate !== undefined ? overrides.reInspectedDate : entryReInspectedDate,
      reInspectionStatus: overrides.reInspectionStatus !== undefined ? overrides.reInspectionStatus : entryReInspectionStatus,
      reInspectionNote: overrides.reInspectionNote !== undefined ? overrides.reInspectionNote : entryReInspectionNote.trim(),
      managerName: overrides.managerName !== undefined ? overrides.managerName : entryMgrName.trim(),
      checkedDate: overrides.checkedDate !== undefined ? overrides.checkedDate : entryCheckedDate,
      isSpareSwapped: overrides.isSpareSwapped !== undefined ? overrides.isSpareSwapped : entryIsSpareSwapped
    };

    const updatedRecord = updateMonthCheckData(
      currentEquipment.id,
      selectedYear,
      entryMonth,
      monthData,
      currentEquipment.name,
      currentEquipment.assetCode,
      activeFormTemplate.id
    );
    setInspectionRecord(updatedRecord);
  };

  // Save monthly entry form with user feedback
  const handleSaveEntryForm = () => {
    if (!currentEquipment) return;
    saveCurrentMonthData();
    setIsSavedSuccess(true);
    setTimeout(() => setIsSavedSuccess(false), 2500);
  };

  // Mark all pass in entry form & auto save
  const handleMarkAllPass = () => {
    const allPassed: Record<number, InspectionResultStatus> = {};
    activeFormTemplate.checkItems.forEach(item => {
      allPassed[item.id] = 'pass';
    });
    setEntryResults(allPassed);
    saveCurrentMonthData({ itemResults: allPassed });
  };

  // Quick verify button for Re-inspector & auto save
  const handleQuickReInspectVerify = () => {
    const today = new Date().toISOString().slice(0, 10);
    const note = entryReInspectionNote || 'สุ่มทดสอบการทำงานหน้างานตามเกณฑ์มาตรฐานแล้ว ผลตรวจผ่านเกณฑ์สมบูรณ์';
    setEntryReInspectionStatus('verified');
    setEntryReInspectedDate(today);
    setEntryReInspectionNote(note);
    saveCurrentMonthData({
      reInspectionStatus: 'verified',
      reInspectedDate: today,
      reInspectionNote: note
    });
  };

  // Export CSV
  const handleExportCsv = () => {
    if (!inspectionRecord) return;
    exportInspectionToCsv(inspectionRecord);
  };

  // Print form
  const handlePrint = () => {
    window.print();
  };

  // Summary statistics for this record
  const stats = useMemo(() => {
    if (!inspectionRecord) return { recordedMonths: 0, verifiedMonths: 0, hasFailure: false, passRate: 100 };
    let recordedMonths = 0;
    let verifiedMonths = 0;
    let totalItems = 0;
    let passedItems = 0;
    let hasFailure = false;

    Object.values(inspectionRecord.months).forEach((mData: MonthlyCheckMonthData) => {
      if (mData && Object.keys(mData.itemResults || {}).length > 0) {
        recordedMonths++;
        if (mData.reInspectionStatus === 'verified') verifiedMonths++;
        Object.values(mData.itemResults).forEach((status: InspectionResultStatus) => {
          totalItems++;
          if (status === 'pass') passedItems++;
          if (status === 'fail') hasFailure = true;
        });
      }
    });

    const passRate = totalItems > 0 ? Math.round((passedItems / totalItems) * 100) : 100;
    return { recordedMonths, verifiedMonths, hasFailure, passRate };
  }, [inspectionRecord]);

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Quick Summary */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-6 shadow-xl border border-slate-700/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="px-3 py-1 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <ClipboardCheck className="h-3.5 w-3.5 text-blue-400" />
              PM Inspection & Checklist
            </span>
            <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-lg text-xs font-semibold">
              ปี {selectedYear}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black mt-2 tracking-tight text-white flex items-center gap-2">
            แบบตรวจเช็คและประเมินเครื่องมือประจำเดือน
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
            เลือกระบุแบบฟอร์มการตรวจเช็คที่สอดคล้องตามประเภทเครื่องมือ (เช่น เครื่องแพ็คสายรัดพลาสติก, ปั๊มลม, รอกเครน, ปั๊มน้ำ, ตู้ไฟ) 
            พร้อมระบบบันทึกผล 12 เดือน และขั้นตอนตรวจสอบซ้ำโดยวิศวกร (Re-inspector Verification)
          </p>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setShowReInspectorGuide(true)}
            className="px-3 py-2 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-400/40 text-indigo-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            <BookOpen className="h-4 w-4 text-indigo-400" />
            <span>คู่มือผู้ตรวจสอบซ้ำ</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={!inspectionRecord}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm disabled:opacity-50"
          >
            <Download className="h-4 w-4 text-emerald-400" />
            <span>ส่งออก CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-blue-600/30"
          >
            <Printer className="h-4 w-4" />
            <span>พิมพ์ฟอร์ม A4</span>
          </button>
        </div>
      </div>

      {/* 2. Top KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">เครื่องจักรทั้งหมดในระบบ</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{equipments.length} เครื่อง</p>
            <p className="text-[11px] text-blue-600 font-semibold mt-0.5">
              สายรัดพลาสติก: {equipments.filter(isStrappingMachine).length} เครื่อง
            </p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Cpu className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">บันทึกตรวจเช็คแล้วในปีนี้</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{stats.recordedMonths} / 12 เดือน</p>
            <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">
              อัตราผ่านเกณฑ์เฉลี่ย {stats.passRate}%
            </p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">ยืนยันตรวจสอบซ้ำ (Engineer)</p>
            <p className="text-2xl font-black text-indigo-600 mt-1">{stats.verifiedMonths} / {stats.recordedMonths || 0} เดือน</p>
            <p className="text-[11px] text-indigo-700 font-semibold mt-0.5">
              {stats.verifiedMonths === stats.recordedMonths && stats.recordedMonths > 0 
                ? '✓ ครบถ้วนทุกรอบ' 
                : `รอตรวจซ้ำ ${Math.max(0, stats.recordedMonths - stats.verifiedMonths)} เดือน`}
            </p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <UserCheck className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">แบบฟอร์มที่เลือกใช้ปัจจุบัน</p>
            <p className="text-sm font-bold text-slate-800 mt-1 truncate max-w-[180px]" title={activeFormTemplate.title}>
              {activeFormTemplate.shortName}
            </p>
            <button
              onClick={() => setShowFormPickerModal(true)}
              className="text-[11px] text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer mt-0.5 flex items-center gap-0.5"
            >
              <span>เปลี่ยนแบบฟอร์ม ({INSPECTION_FORM_TEMPLATES.length} ฟอร์ม)</span>
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          <div className="h-11 w-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Layers className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* 3. Selector Panel: Equipment, Form Template, Year, and View Mode Toggle */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          
          {/* Equipment selector */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Cpu className="h-3.5 w-3.5 text-blue-600" />
                  เลือกเครื่องจักร / อุปกรณ์
                </span>
                <span className="text-[10px] text-slate-400 font-normal">
                  ({filteredEquipments.length} รายการ)
                </span>
              </label>
              <select
                value={selectedEqId}
                onChange={(e) => setSelectedEqId(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-xs"
              >
                {equipments.map(eq => {
                  const isStrap = isStrappingMachine(eq);
                  return (
                    <option key={eq.id} value={eq.id}>
                      {isStrap ? '⭐ [สายรัด] ' : ''}{eq.id} - {eq.name} ({eq.location || 'ไม่ระบุโซน'})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Form template assigned to this equipment */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-indigo-600" />
                  แบบฟอร์มประเมินที่เลือกใช้
                </span>
                <span className="text-[10px] text-blue-600 font-semibold">
                  {activeFormTemplate.checkItems.length} หัวข้อตรวจ
                </span>
              </label>
              <div className="flex items-center gap-1.5">
                <div 
                  onClick={() => setShowFormPickerModal(true)}
                  className="flex-1 px-3 py-2.5 bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-200 rounded-xl text-xs sm:text-sm font-bold text-indigo-950 flex items-center justify-between cursor-pointer transition-all shadow-xs"
                  title="คลิกเพื่อเลือกแบบฟอร์มอื่น"
                >
                  <span className="truncate">{activeFormTemplate.title}</span>
                  <ChevronDown className="h-4 w-4 text-indigo-600 shrink-0 ml-1" />
                </div>
                <button
                  type="button"
                  onClick={() => setShowFormPickerModal(true)}
                  className="px-3 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shrink-0 shadow-xs flex items-center gap-1"
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>เปลี่ยนฟอร์ม</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenTemplateEditor(activeFormTemplate)}
                  className="px-3 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shrink-0 shadow-xs flex items-center gap-1"
                  title="แก้ไขชื่อ หรือ รายการหัวข้อตรวจเช็คในฟอร์มนี้"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">แก้ไขฟอร์ม</span>
                </button>
              </div>
            </div>
          </div>

          {/* Year selector & View mode buttons */}
          <div className="flex items-center gap-3 justify-end flex-wrap">
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-slate-500" />
                ปี:
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                {[currentYear + 1, currentYear, currentYear - 1, currentYear - 2].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Toggle view mode */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewMode('matrix')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'matrix'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ClipboardCheck className="h-3.5 w-3.5" />
                <span>ตาราง 12 เดือน (Excel)</span>
              </button>

              <button
                onClick={() => setViewMode('entry')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'entry'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CheckSquare className="h-3.5 w-3.5" />
                <span>ฟอร์มบันทึกรายเดือน</span>
              </button>
            </div>
          </div>
        </div>

        {/* Selected Equipment Banner Details */}
        {currentEquipment && (
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-50/70 p-3 rounded-xl">
            <div className="flex items-center gap-4 flex-wrap">
              <div>
                <span className="text-slate-400">รหัสเครื่อง:</span>{' '}
                <span className="font-mono font-bold text-blue-600">{currentEquipment.id}</span>
              </div>
              <div>
                <span className="text-slate-400">Asset Code:</span>{' '}
                <span className="font-mono font-bold text-slate-700">{currentEquipment.assetCode || '-'}</span>
              </div>
              <div>
                <span className="text-slate-400">ชื่อเครื่อง:</span>{' '}
                <span className="font-bold text-slate-800">{currentEquipment.name}</span>
              </div>
              <div>
                <span className="text-slate-400">ตำแหน่งติดตั้ง:</span>{' '}
                <span className="font-medium text-slate-700">{currentEquipment.location || 'ไม่ระบุ'}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-indigo-100 text-indigo-800 font-bold rounded-lg text-[11px] border border-indigo-200">
                ฟอร์ม: {activeFormTemplate.shortName}
              </span>
              {isStrappingMachine(currentEquipment) && (
                <span className="px-2.5 py-1 bg-amber-100 text-amber-900 font-bold rounded-lg text-[11px] border border-amber-200">
                  เครื่องแพ็คสายรัด
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 4. MAIN CONTENT: Switch between MATRIX VIEW and ENTRY FORM VIEW */}
      {viewMode === 'matrix' ? (
        /* ================= 12-MONTH MATRIX VIEW (EXCEL STYLE) ================= */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>ตารางบันทึกผลการตรวจสอบประจำเดือน (12 เดือน)</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-mono">
                  {selectedYear}
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                คลิกที่ช่องแต่ละเดือนเพื่อสลับผลตรวจ ( <span className="text-emerald-600 font-bold">✓ ผ่าน</span> / <span className="text-rose-600 font-bold">✕ ไม่ผ่าน</span> / <span className="text-slate-400">- ว่าง</span> ) หรือคลิกเดือนเพื่อเปิดฟอร์มแก้ไขละเอียด
              </p>
            </div>

            {/* Quick legend */}
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-emerald-700 font-bold">
                <span className="h-4 w-4 rounded-full bg-emerald-100 flex items-center justify-center text-[10px]">✓</span>
                ผ่าน
              </span>
              <span className="flex items-center gap-1 text-rose-700 font-bold">
                <span className="h-4 w-4 rounded-full bg-rose-100 flex items-center justify-center text-[10px]">✕</span>
                ไม่ผ่าน
              </span>
              <span className="flex items-center gap-1 text-slate-400 font-medium">
                <span className="h-4 w-4 rounded-full bg-slate-100 flex items-center justify-center text-[10px]">-</span>
                ยังไม่ตรวจ
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                  <th className="py-3 px-3 w-12 text-center border-r border-slate-200">ลำดับ</th>
                  <th className="py-3 px-4 min-w-[280px] max-w-[340px] border-r border-slate-200">
                    รายการตรวจเช็ค ({activeFormTemplate.shortName})
                  </th>
                  {MONTH_NAMES_TH.map((mName, idx) => {
                    const monthNum = idx + 1;
                    const isCurrent = monthNum === currentMonth;
                    return (
                      <th 
                        key={mName}
                        onClick={() => {
                          setEntryMonth(monthNum);
                          setViewMode('entry');
                        }}
                        className={`py-3 px-2 text-center min-w-[58px] border-r border-slate-200 cursor-pointer transition-colors ${
                          isCurrent 
                            ? 'bg-blue-600 text-white font-black hover:bg-blue-700' 
                            : 'hover:bg-slate-200'
                        }`}
                        title={`คลิกเพื่อเปิดกรอกฟอร์มเดือน ${mName}`}
                      >
                        <div className="flex flex-col items-center">
                          <span>{mName}</span>
                          {isCurrent && <span className="text-[9px] font-normal opacity-90">เดือนนี้</span>}
                        </div>
                      </th>
                    );
                  })}
                  <th className="py-3 px-4 min-w-[240px]">ปัญหาที่พบ / การดำเนินการแก้ไข</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {activeFormTemplate.checkItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3 text-center font-bold text-slate-600 border-r border-slate-200 bg-slate-50/30">
                      {item.id}
                    </td>
                    <td className="py-3 px-4 border-r border-slate-200">
                      <div className="font-bold text-slate-800 leading-snug">{item.title}</div>
                      {item.subDetail && (
                        <div className="text-[11px] text-slate-500 mt-0.5 leading-normal">{item.subDetail}</div>
                      )}
                      {item.hasVisualGuide && (
                        <button
                          type="button"
                          onClick={() => setShowVisualGuideModal(true)}
                          className="mt-1 text-[10px] text-blue-600 hover:text-blue-800 font-bold underline flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="h-3 w-3" />
                          <span>ดูเกณฑ์มาตรฐานรอยเชื่อม Friction Weld</span>
                        </button>
                      )}
                    </td>

                    {/* 12 Months Cells */}
                    {MONTH_NAMES_TH.map((_, idx) => {
                      const monthNum = idx + 1;
                      const monthData = inspectionRecord?.months?.[monthNum];
                      const status: InspectionResultStatus = monthData?.itemResults?.[item.id] || 'none';

                      return (
                        <td
                          key={monthNum}
                          onClick={() => handleMatrixCellToggle(monthNum, item.id)}
                          className="py-2.5 px-2 text-center border-r border-slate-200 cursor-pointer hover:bg-blue-50/50 transition-colors select-none"
                          title="คลิกเพื่อสลับ: ผ่าน -> ไม่ผ่าน -> ยังไม่ตรวจ"
                        >
                          {status === 'pass' && (
                            <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-emerald-100 text-emerald-700 font-black text-sm shadow-xs">
                              ✓
                            </span>
                          )}
                          {status === 'fail' && (
                            <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-rose-100 text-rose-700 font-black text-sm shadow-xs animate-pulse">
                              ✕
                            </span>
                          )}
                          {status === 'none' && (
                            <span className="text-slate-300 font-mono text-sm hover:text-slate-500">-</span>
                          )}
                        </td>
                      );
                    })}

                    {/* Issues column summary */}
                    <td className="py-3 px-4 text-slate-600">
                      {MONTH_NAMES_TH.map((mName, idx) => {
                        const mData = inspectionRecord?.months?.[idx + 1];
                        if (!mData?.issuesNote) return null;
                        return (
                          <div key={mName} className="mb-1 text-[11px]">
                            <span className="font-bold text-slate-800">[{mName}]:</span> {mData.issuesNote}
                            {mData.isSpareSwapped && (
                              <span className="ml-1.5 px-1.5 py-0.2 bg-amber-100 text-amber-800 font-bold rounded text-[10px]">
                                สลับ Spare แล้ว
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </td>
                  </tr>
                ))}

                {/* SIGNATURE ROWS */}
                {/* 1. Technician Row */}
                <tr className="bg-slate-50 border-t-2 border-slate-300 font-semibold text-slate-700">
                  <td className="py-2.5 px-3 text-center border-r border-slate-200 font-bold text-slate-500">1</td>
                  <td className="py-2.5 px-4 border-r border-slate-200">
                    <span className="font-bold text-slate-900">ผู้ตรวจสอบ 1 : TECHNICIAN</span>
                    <span className="block text-[10px] text-slate-500">ช่างเทคนิคผู้ตรวจเช็คประจำเครื่อง</span>
                  </td>
                  {MONTH_NAMES_TH.map((_, idx) => {
                    const mData = inspectionRecord?.months?.[idx + 1];
                    const name = mData?.technicianName;
                    return (
                      <td key={idx} className="py-2 px-1 text-center border-r border-slate-200 text-[10px] truncate max-w-[58px]" title={name || '-'}>
                        {name ? (
                          <span className="font-bold text-slate-800 block truncate">{name.split(' ')[0]}</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="py-2.5 px-4 text-[11px] text-slate-500">ลงชื่อตรวจเช็คหน้างาน</td>
                </tr>

                {/* 2. Engineer / Re-Inspector Row */}
                <tr className="bg-indigo-50/60 font-semibold text-slate-700 border-t border-indigo-100">
                  <td className="py-2.5 px-3 text-center border-r border-slate-200 font-bold text-indigo-700">2</td>
                  <td className="py-2.5 px-4 border-r border-slate-200">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-indigo-950">ผู้ตรวจสอบ 2 (ตรวจสอบซ้ำ) : ENGINEER</span>
                      <span className="px-1.5 py-0.2 bg-indigo-200 text-indigo-900 rounded font-black text-[9px]">
                        RE-CHECK
                      </span>
                    </div>
                    <span className="block text-[10px] text-indigo-700">วิศวกรสุ่มตรวจยืนยันความถูกต้องและมาตรฐาน</span>
                  </td>
                  {MONTH_NAMES_TH.map((_, idx) => {
                    const mData = inspectionRecord?.months?.[idx + 1];
                    const name = mData?.engineerName;
                    const status = mData?.reInspectionStatus;
                    const isVerified = status === 'verified';
                    const isNeedsCorrection = status === 'needs_correction';

                    return (
                      <td key={idx} className="py-2 px-1 text-center border-r border-slate-200 text-[10px]" title={mData?.reInspectionNote || name || '-'}>
                        {name ? (
                          <div className="flex flex-col items-center">
                            <span className="font-bold text-indigo-950 truncate max-w-[55px] block">{name.split(' ')[0]}</span>
                            {isVerified && (
                              <span className="text-[9px] text-emerald-700 font-black flex items-center gap-0.5">
                                <Check className="h-2.5 w-2.5 inline" /> ยืนยัน
                              </span>
                            )}
                            {isNeedsCorrection && (
                              <span className="text-[9px] text-rose-700 font-black">
                                ต้องแก้
                              </span>
                            )}
                            {!isVerified && !isNeedsCorrection && (
                              <span className="text-[9px] text-amber-600 font-medium">
                                รอยืนยัน
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="py-2.5 px-4 text-[11px] text-indigo-900">
                    สุ่มตรวจสภาพเครื่อง รอยเชื่อม และการหยอดน้ำมัน/ระบบลม
                  </td>
                </tr>

                {/* 3. Manager Approval Row */}
                <tr className="bg-slate-50 font-semibold text-slate-700 border-t border-slate-200">
                  <td className="py-2.5 px-3 text-center border-r border-slate-200 font-bold text-slate-500">3</td>
                  <td className="py-2.5 px-4 border-r border-slate-200">
                    <span className="font-bold text-slate-900">ผู้อนุมัติ : MANAGER</span>
                    <span className="block text-[10px] text-slate-500">ผู้จัดการฝ่ายผลิตหรือหัวหน้าแผนก</span>
                  </td>
                  {MONTH_NAMES_TH.map((_, idx) => {
                    const mData = inspectionRecord?.months?.[idx + 1];
                    const name = mData?.managerName;
                    return (
                      <td key={idx} className="py-2 px-1 text-center border-r border-slate-200 text-[10px] truncate max-w-[58px]" title={name || '-'}>
                        {name ? (
                          <span className="font-bold text-slate-800 block truncate">{name.split(' ')[0]}</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="py-2.5 px-4 text-[11px] text-slate-500">อนุมัติปิดรอบประเมินประจำเดือน</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Table footer action info */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-600 shrink-0" />
              <span>ต้องการกรอกบันทึกการตรวจเช็คประจำเดือนอย่างละเอียด? สลับไปที่แท็บ <strong>"ฟอร์มบันทึกรายเดือน"</strong> หรือคลิกชื่อเดือนด้านบน</span>
            </div>
            <button
              onClick={() => setViewMode('entry')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0"
            >
              <span>เปิดฟอร์มบันทึกเดือนนี้ ({MONTH_FULL_NAMES_TH[currentMonth - 1]})</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        /* ================= MONTHLY ENTRY FORM VIEW ================= */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          {/* Month Tabs Bar */}
          <div className="border-b border-slate-200 pb-4">
            <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-blue-600" />
                เลือกเดือนที่ต้องการบันทึกผลการประเมิน:
              </label>

              <button
                type="button"
                onClick={handleMarkAllPass}
                className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>ทำเครื่องหมาย "ผ่านทุกข้อ" (Mark All Pass)</span>
              </button>
            </div>

            <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
              {MONTH_NAMES_TH.map((mName, idx) => {
                const monthNum = idx + 1;
                const isSelected = entryMonth === monthNum;
                const monthRecord = inspectionRecord?.months?.[monthNum];
                const hasFail = doesMonthHaveFailure(monthRecord);
                const isVerified = monthRecord?.reInspectionStatus === 'verified';

                return (
                  <button
                    key={mName}
                    type="button"
                    onClick={() => setEntryMonth(monthNum)}
                    className={`py-2 px-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center relative ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <span>{mName}</span>
                    {monthRecord && (
                      <span className="mt-0.5 flex items-center gap-0.5">
                        {hasFail ? (
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                        ) : (
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        )}
                        {isVerified && (
                          <span className="text-[8px] text-blue-300">★</span>
                        )}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Banner Info */}
          <div className="bg-indigo-50/60 p-4 rounded-xl border border-indigo-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-indigo-600 text-white rounded text-[10px] font-bold">
                  {activeFormTemplate.shortName}
                </span>
                <h4 className="text-sm font-bold text-indigo-950">
                  {activeFormTemplate.title}
                </h4>
              </div>
              <p className="text-xs text-indigo-800 mt-1">
                เดือน: <strong>{MONTH_FULL_NAMES_TH[entryMonth - 1]} {selectedYear}</strong> | 
                เครื่อง: <strong>{currentEquipment?.name} ({currentEquipment?.id})</strong>
              </p>
            </div>

            <button
              onClick={() => setShowFormPickerModal(true)}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer shrink-0"
            >
              เปลี่ยนแบบฟอร์มอื่น
            </button>
          </div>

          {/* Checklist Items */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-blue-600" />
              <span>รายการตรวจเช็คประจำเดือน ({activeFormTemplate.checkItems.length} ข้อ)</span>
            </h4>

            {activeFormTemplate.checkItems.map(item => {
              const currentStatus = entryResults[item.id] || 'pass';

              return (
                <div 
                  key={item.id}
                  className={`p-4 rounded-xl border transition-all ${
                    currentStatus === 'pass' 
                      ? 'bg-white border-slate-200' 
                      : currentStatus === 'fail' 
                        ? 'bg-rose-50/40 border-rose-300' 
                        : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-800">{item.title}</p>
                      {item.subDetail && (
                        <p className="text-xs text-slate-500 mt-0.5">{item.subDetail}</p>
                      )}
                      {item.hasVisualGuide && (
                        <button
                          type="button"
                          onClick={() => setShowVisualGuideModal(true)}
                          className="mt-1 text-xs text-blue-600 hover:text-blue-800 font-bold underline flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>ดูเกณฑ์มาตรฐานรอยเชื่อม Friction Weld (มีภาพประกอบ)</span>
                        </button>
                      )}
                    </div>

                    {/* Result Buttons: Pass, Fail, None */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          const next = { ...entryResults, [item.id]: 'pass' as InspectionResultStatus };
                          setEntryResults(next);
                          saveCurrentMonthData({ itemResults: next });
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                          currentStatus === 'pass'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                        }`}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>ผ่าน (Pass)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const next = { ...entryResults, [item.id]: 'fail' as InspectionResultStatus };
                          setEntryResults(next);
                          saveCurrentMonthData({ itemResults: next });
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                          currentStatus === 'fail'
                            ? 'bg-rose-600 text-white shadow-sm'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                        }`}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        <span>ไม่ผ่าน (Fail)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const next = { ...entryResults, [item.id]: 'none' as InspectionResultStatus };
                          setEntryResults(next);
                          saveCurrentMonthData({ itemResults: next });
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          currentStatus === 'none'
                            ? 'bg-slate-700 text-white'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-400'
                        }`}
                        title="ยังไม่ตรวจ"
                      >
                        -
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Issues and Actions */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
            <label className="block text-xs font-bold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                ปัญหาที่พบ / การดำเนินการแก้ไขในรอบเดือนนี้
              </span>
              <span className="text-slate-400 font-normal text-[11px]">(ไม่บังคับ ถ้าปกติไม่ต้องระบุ)</span>
            </label>
            <textarea
              value={entryIssues}
              onChange={(e) => {
                const val = e.target.value;
                setEntryIssues(val);
                saveCurrentMonthData({ issuesNote: val });
              }}
              placeholder="เช่น แรงดันลมตก, รอยเชื่อมไม่ติด, เป่าเศษฝุ่นสายรัดสะอาดแล้ว, หรือส่งซ่อม..."
              rows={2}
              className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-sans focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
            />

            {/* Spare swap option */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={entryIsSpareSwapped}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setEntryIsSpareSwapped(checked);
                    saveCurrentMonthData({ isSpareSwapped: checked });
                  }}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                />
                <span>มีการนำเครื่องสำรอง (Spare) มาสับเปลี่ยนใช้งานแทน</span>
              </label>

              {entryIsSpareSwapped && onGoToSpareLoan && (
                <button
                  type="button"
                  onClick={onGoToSpareLoan}
                  className="text-xs text-blue-600 hover:text-blue-800 font-bold underline flex items-center gap-1 cursor-pointer"
                >
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  <span>ไปที่หน้า "ยืม-คืน Spare"</span>
                </button>
              )}
            </div>
          </div>

          {/* ================= 3-LEVEL SIGNATURES & RE-INSPECTION SECTION ================= */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            
            {/* 1. Technician Signature */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-black">
                  1
                </span>
                <div>
                  <h5 className="text-xs font-bold text-slate-900">ผู้ตรวจสอบ 1 : TECHNICIAN</h5>
                  <p className="text-[10px] text-slate-500">ช่างเทคนิคผู้ตรวจเช็คประจำเครื่อง</p>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">ชื่อช่างผู้ตรวจ</label>
                <input
                  type="text"
                  value={entryTechName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEntryTechName(val);
                    saveCurrentMonthData({ technicianName: val });
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">วันที่ตรวจเช็ค</label>
                <input
                  type="date"
                  value={entryCheckedDate}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEntryCheckedDate(val);
                    saveCurrentMonthData({ checkedDate: val, technicianDate: val });
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* 2. Engineer / Re-Inspector (ผู้ตรวจสอบซ้ำ) */}
            <div className="p-4 bg-indigo-50/70 rounded-xl border-2 border-indigo-300 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-6 w-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-black">
                    2
                  </span>
                  <div>
                    <h5 className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                      <span>ผู้ตรวจสอบ 2 (ตรวจสอบซ้ำ)</span>
                      <span className="px-1.5 py-0.2 bg-indigo-600 text-white rounded text-[9px] font-black">
                        ENGINEER
                      </span>
                    </h5>
                    <p className="text-[10px] text-indigo-700">วิศวกรสุ่มตรวจซ้ำและลงนามรับรอง</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowReInspectorGuide(true)}
                  className="text-[10px] text-indigo-700 hover:text-indigo-900 font-bold underline flex items-center gap-0.5 cursor-pointer"
                >
                  <BookOpen className="h-3 w-3" />
                  <span>คู่มือ</span>
                </button>
              </div>

              {/* Status Radio */}
              <div>
                <label className="block text-[11px] font-semibold text-indigo-950 mb-1.5">
                  ผลการตรวจสอบซ้ำ (Verification Status)
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setEntryReInspectionStatus('verified');
                      saveCurrentMonthData({ reInspectionStatus: 'verified' });
                    }}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      entryReInspectionStatus === 'verified'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200'
                    }`}
                  >
                    <Check className="h-3 w-3" />
                    <span>ผ่านการตรวจซ้ำ</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEntryReInspectionStatus('needs_correction');
                      saveCurrentMonthData({ reInspectionStatus: 'needs_correction' });
                    }}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      entryReInspectionStatus === 'needs_correction'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200'
                    }`}
                  >
                    <AlertTriangle className="h-3 w-3" />
                    <span>ต้องแก้ไข</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-indigo-950 mb-1">ชื่อวิศวกรผู้ตรวจสอบซ้ำ</label>
                <input
                  type="text"
                  value={entryEngName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEntryEngName(val);
                    saveCurrentMonthData({ engineerName: val });
                  }}
                  className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-indigo-950 mb-1">วันที่ตรวจสอบซ้ำ</label>
                <input
                  type="date"
                  value={entryReInspectedDate}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEntryReInspectedDate(val);
                    saveCurrentMonthData({ reInspectedDate: val });
                  }}
                  className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-indigo-950 mb-1">
                  บันทึกการตรวจสอบซ้ำ (Re-inspection Note)
                </label>
                <input
                  type="text"
                  value={entryReInspectionNote}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEntryReInspectionNote(val);
                    saveCurrentMonthData({ reInspectionNote: val });
                  }}
                  placeholder="เช่น สุ่มดึงรอยเชื่อมหน้างานแล้ว แน่นหนาดี / ถ่ายน้ำกรองลมแล้ว..."
                  className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-lg text-xs font-sans text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Quick sign-off button */}
              <button
                type="button"
                onClick={handleQuickReInspectVerify}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span>กดเพื่อยืนยันการตรวจสอบซ้ำ (Quick Verify)</span>
              </button>
            </div>

            {/* 3. Manager Approval */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-black">
                  3
                </span>
                <div>
                  <h5 className="text-xs font-bold text-slate-900">ผู้อนุมัติ : MANAGER</h5>
                  <p className="text-[10px] text-slate-500">ผู้จัดการฝ่ายผลิตหรือหัวหน้าแผนก</p>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">ชื่อผู้อนุมัติ</label>
                <input
                  type="text"
                  value={entryMgrName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEntryMgrName(val);
                    saveCurrentMonthData({ managerName: val });
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-8">
                <p className="text-[11px] text-slate-500 leading-relaxed bg-white p-3 rounded-lg border border-slate-200">
                  ✓ การลงนามโดยผู้จัดการเป็นการรับรองความสมบูรณ์ของเอกสารประจำเดือน และปิดรอบ PM อย่างเป็นทางการ
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons footer */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3">
            <button
              type="button"
              onClick={() => setViewMode('matrix')}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>กลับสู่ตารางสรุป 12 เดือน</span>
            </button>

            <div className="flex items-center gap-3">
              {isSavedSuccess && (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 animate-fade-in">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>บันทึกผลการประเมินเดือน {MONTH_FULL_NAMES_TH[entryMonth - 1]} เรียบร้อยแล้ว!</span>
                </span>
              )}

              <button
                type="button"
                onClick={handleSaveEntryForm}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-blue-600/30"
              >
                <Check className="h-4 w-4" />
                <span>บันทึกผลการตรวจเช็ค</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 1: FORM PICKER MODAL ================= */}
      {showFormPickerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-400" />
                  <span>เลือกแบบฟอร์มการประเมิน (Select Inspection Form)</span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  เลือกแบบฟอร์มที่สอดคล้องกับเครื่องจักร: <strong>{currentEquipment?.name} ({currentEquipment?.id})</strong>
                </p>
              </div>
              <button
                onClick={() => setShowFormPickerModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* List of Form Templates */}
            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 mb-2 flex items-center justify-between">
                <div>
                  <span className="font-bold block">📋 แบบฟอร์มประเมินมาตรฐานโรงงาน (4 ฟอร์มหลัก)</span>
                  <span className="text-[11px] text-blue-700">ตรงตามประเภทเครื่องมือและเอกสารการตรวจสอบ สามารถกดแก้ไขข้อความหัวข้อตรวจได้ตลอดเวลา</span>
                </div>
                <button
                  type="button"
                  onClick={handleResetTemplatesToDefault}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-blue-800 border border-blue-300 rounded-lg text-[11px] font-bold shrink-0 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>รีเซ็ตค่าเดิม</span>
                </button>
              </div>

              {formTemplates.map(tmpl => {
                const isSelected = activeFormTemplate.id === tmpl.id;
                const isRecommended = suggestFormForEquipment(currentEquipment).id === tmpl.id;

                return (
                  <div
                    key={tmpl.id}
                    onClick={() => handleSelectFormTemplate(tmpl.id)}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col sm:flex-row items-start justify-between gap-4 ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/60 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {/* Thumbnail Image from uploaded document */}
                    {tmpl.imageUrl && (
                      <div className="w-full sm:w-28 h-20 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 shrink-0 self-center sm:self-start">
                        <img 
                          src={tmpl.imageUrl} 
                          alt={tmpl.title} 
                          className="w-full h-full object-cover object-top hover:scale-105 transition-transform"
                        />
                      </div>
                    )}

                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900">{tmpl.title}</span>
                        {isRecommended && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded-md text-[10px] font-black border border-amber-200">
                            ⭐ แนะนำสำหรับเครื่องนี้
                          </span>
                        )}
                        {isSelected && (
                          <span className="px-2 py-0.5 bg-blue-600 text-white rounded-md text-[10px] font-bold">
                            ใช้งานอยู่
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 mt-1">{tmpl.description}</p>
                      
                      {tmpl.standardsNote && (
                        <p className="text-[11px] text-slate-500 mt-1 italic">
                          เกณฑ์สำคัญ: {tmpl.standardsNote}
                        </p>
                      )}

                      <div className="mt-2 text-[11px] text-indigo-700 font-semibold flex items-center gap-1">
                        <CheckSquare className="h-3.5 w-3.5" />
                        <span>จำนวน {tmpl.checkItems.length} หัวข้อตรวจมาตรฐาน</span>
                      </div>
                    </div>

                    <div className="shrink-0 pt-1 flex sm:flex-col gap-2 w-full sm:w-auto justify-end">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectFormTemplate(tmpl.id);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {isSelected ? 'เลือกอยู่' : 'เลือกใช้ฟอร์มนี้'}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenTemplateEditor(tmpl);
                        }}
                        className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="h-3 w-3" />
                        <span>แก้ไขข้อความ</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setShowFormPickerModal(false)}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-700 transition-colors cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: RE-INSPECTOR SOP GUIDELINE ================= */}
      {showReInspectorGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200 bg-indigo-900 text-white flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-indigo-300" />
                  <span>คู่มือแนวทางปฏิบัติ: ผู้ตรวจสอบซ้ำ (Re-Inspector SOP)</span>
                </h3>
                <p className="text-xs text-indigo-200 mt-0.5">
                  ขั้นตอนการปฏิบัติงานสำหรับวิศวกรและผู้ตรวจสอบซ้ำ
                </p>
              </div>
              <button
                onClick={() => setShowReInspectorGuide(false)}
                className="p-1.5 text-indigo-300 hover:text-white rounded-lg hover:bg-indigo-800 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-700 leading-relaxed flex-1">
              <div className="p-3 bg-indigo-50 text-indigo-950 rounded-xl border border-indigo-200">
                <p className="font-bold text-sm">บทบาทหน้าที่ของผู้ตรวจสอบซ้ำ (ENGINEER / RE-INSPECTOR):</p>
                <p className="mt-1">
                  ผู้ตรวจสอบซ้ำทำหน้าที่เป็นด่านการประกันคุณภาพ (Quality Assurance) โดยสุ่มตรวจสภาพเครื่องจักรจริงหน้างาน
                  เพื่อให้แน่ใจว่าการตรวจเช็คของช่างเทคนิคเป็นไปตามเกณฑ์มาตรฐานความปลอดภัย
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex gap-2.5">
                  <span className="h-6 w-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black shrink-0 text-xs">1</span>
                  <div>
                    <h5 className="font-bold text-slate-900 text-sm">สุ่มตรวจหน้างานจริง (Spot Check on Field)</h5>
                    <p className="text-slate-600 mt-0.5">
                      สุ่มตรวจเครื่องจักรอย่างน้อย 20-30% หรือตรวจทุกเครื่องที่เพิ่งผ่านการซ่อมบำรุง ทดลองเดินเครื่อง สังเกตเสียงการทำงาน และความตึงสายพาน/รอยเชื่อม
                    </p>
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <span className="h-6 w-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black shrink-0 text-xs">2</span>
                  <div>
                    <h5 className="font-bold text-slate-900 text-sm">ตรวจสอบจุดวิกฤต (Critical Items)</h5>
                    <p className="text-slate-600 mt-0.5">
                      เช่น การเดรนน้ำใต้ถ้วยดักลม, การหยอดน้ำมันหล่อลื่นแอร์ทูล 2-3 หยด, ระดับน้ำมันคอมเพรสเซอร์, หรือระบบสวิตช์นิรภัย Emergency Stop
                    </p>
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <span className="h-6 w-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black shrink-0 text-xs">3</span>
                  <div>
                    <h5 className="font-bold text-slate-900 text-sm">กำกับดูแลกรณีพบข้อบกพร่อง (Defect & Spare Swapping)</h5>
                    <p className="text-slate-600 mt-0.5">
                      หากพบข้อบกพร่อง ให้แนะนำช่างสลับนำเครื่องสำรอง (Spare Tool) มาใช้ทันทีเพื่อไม่ให้ไลน์หยุดชะงัก และลงบันทึกในช่อง Re-inspection Note พร้อมเลือกสถานะ "ต้องแก้ไข (Needs Correction)"
                    </p>
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <span className="h-6 w-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black shrink-0 text-xs">4</span>
                  <div>
                    <h5 className="font-bold text-slate-900 text-sm">ลงนามยืนยันในระบบ</h5>
                    <p className="text-slate-600 mt-0.5">
                      กรอกชื่อ วันที่ และกดปุ่ม <strong>"ยืนยันการตรวจสอบซ้ำ"</strong> เพื่อให้ข้อมูลสะท้อนไปยังตารางสรุป 12 เดือนและเอกสารพิมพ์อย่างเป็นทางการ
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setShowReInspectorGuide(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                เข้าใจแล้ว / ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: VISUAL GUIDE FOR STRAPPING WELD ================= */}
      {showVisualGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Eye className="h-4 w-4 text-blue-400" />
                <span>เกณฑ์มาตรฐานรอยเชื่อม Friction Weld</span>
              </h3>
              <button
                onClick={() => setShowVisualGuideModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs text-slate-700">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <span className="font-bold text-emerald-800 text-sm block">✓ รอยเชื่อมมาตรฐาน (Good Weld)</span>
                <p className="mt-1 text-emerald-700">
                  เนื้อพลาสติกละลายประสานกันสม่ำเสมอตลอดความกว้าง ไม่มีฟองอากาศ ขอบไม่ไหม้เกรียม และเมื่อใช้มือดึงทดสอบไม่หลุดแยก
                </p>
              </div>

              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                <span className="font-bold text-rose-800 text-sm block">✕ รอยเชื่อมไม่ได้มาตรฐาน (Under / Over Weld)</span>
                <p className="mt-1 text-rose-700">
                  - <strong>หลอมละลายไม่พอ (Under-weld):</strong> รอยต่อลอกหลุดง่าย สาเหตุจากแรงดันลมตกหรือเวลาเชื่อมสั้นเกินไป<br />
                  - <strong>หลอมละลายมากเกินไป (Over-weld):</strong> เนื้อพลาสติกไหม้เป็นขุย เนื้อสายบางลงจนขาดง่าย
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setShowVisualGuideModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 4: FORM TEMPLATE CONTENT EDITOR ================= */}
      {showEditTemplateModal && editingTemplateDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 bg-amber-600 text-white flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Edit3 className="h-5 w-5 text-amber-100" />
                  <span>แก้ไขเนื้อหาแบบฟอร์ม: {editingTemplateDraft.shortName}</span>
                </h3>
                <p className="text-xs text-amber-100 mt-0.5">
                  ปรับแต่งชื่อแบบฟอร์ม คำอธิบาย และข้อความหัวข้อตรวจเช็คให้ตรงตามเอกสารของโรงงานคุณ
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditTemplateModal(false)}
                className="p-1.5 text-amber-200 hover:text-white rounded-lg hover:bg-amber-700 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs text-slate-800">
              
              {/* Form Metadata */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ชื่อแบบฟอร์มการประเมิน (Full Title):
                  </label>
                  <input
                    type="text"
                    value={editingTemplateDraft.title}
                    onChange={(e) => setEditingTemplateDraft({ ...editingTemplateDraft, title: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ชื่อย่อแบบฟอร์ม (Short Name):
                  </label>
                  <input
                    type="text"
                    value={editingTemplateDraft.shortName}
                    onChange={(e) => setEditingTemplateDraft({ ...editingTemplateDraft, shortName: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    หมวดหมู่อุปกรณ์ (Category):
                  </label>
                  <input
                    type="text"
                    value={editingTemplateDraft.category}
                    onChange={(e) => setEditingTemplateDraft({ ...editingTemplateDraft, category: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    คำอธิบายแบบฟอร์ม (Description):
                  </label>
                  <input
                    type="text"
                    value={editingTemplateDraft.description}
                    onChange={(e) => setEditingTemplateDraft({ ...editingTemplateDraft, description: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    เกณฑ์สำคัญ / หมายเหตุ (Standards Note):
                  </label>
                  <input
                    type="text"
                    value={editingTemplateDraft.standardsNote || ''}
                    onChange={(e) => setEditingTemplateDraft({ ...editingTemplateDraft, standardsNote: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Checklist Items Editor */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-amber-600" />
                    <span>รายการหัวข้อการตรวจเช็ค (Check Items - {editingTemplateDraft.checkItems.length} ข้อ)</span>
                  </h4>

                  <button
                    type="button"
                    onClick={() => {
                      const newId = editingTemplateDraft.checkItems.length + 1;
                      const newItems = [
                        ...editingTemplateDraft.checkItems,
                        {
                          id: newId,
                          title: `${newId}. ตรวจสอบ... (ระบุชื่อหัวข้อตรวจใหม่)`,
                          subDetail: 'รายละเอียดคำแนะนำวิธีตรวจ'
                        }
                      ];
                      setEditingTemplateDraft({ ...editingTemplateDraft, checkItems: newItems });
                    }}
                    className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>เพิ่มหัวข้อตรวจ</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {editingTemplateDraft.checkItems.map((item, idx) => (
                    <div key={idx} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 relative group hover:border-amber-300 transition-all">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-900 font-black rounded-md text-[11px]">
                          ข้อที่ {idx + 1}
                        </span>
                        
                        {editingTemplateDraft.checkItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updatedItems = editingTemplateDraft.checkItems
                                .filter((_, i) => i !== idx)
                                .map((it, i) => ({ ...it, id: i + 1 }));
                              setEditingTemplateDraft({ ...editingTemplateDraft, checkItems: updatedItems });
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition-colors cursor-pointer"
                            title="ลบหัวข้อนี้"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-0.5">
                          ข้อความหัวข้อตรวจเช็คหลัก:
                        </label>
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => {
                            const updatedItems = [...editingTemplateDraft.checkItems];
                            updatedItems[idx].title = e.target.value;
                            setEditingTemplateDraft({ ...editingTemplateDraft, checkItems: updatedItems });
                          }}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                          คำอธิบายวิธีตรวจ / จุดเน้นย้ำ (Sub-detail):
                        </label>
                        <input
                          type="text"
                          value={item.subDetail || ''}
                          onChange={(e) => {
                            const updatedItems = [...editingTemplateDraft.checkItems];
                            updatedItems[idx].subDetail = e.target.value;
                            setEditingTemplateDraft({ ...editingTemplateDraft, checkItems: updatedItems });
                          }}
                          className="w-full px-3 py-1 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={handleResetTemplatesToDefault}
                className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>คืนค่าโรงงาน 4 ฟอร์ม</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditTemplateModal(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>

                <button
                  type="button"
                  onClick={handleSaveTemplateDraft}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-amber-600/30"
                >
                  <Save className="h-4 w-4" />
                  <span>บันทึกแบบฟอร์มนี้</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= PRINTABLE A4 SECTION (HIDDEN ON SCREEN, VISIBLE ON PRINT) ================= */}
      <div className="hidden print:block font-sans text-black p-4">
        <div className="text-center pb-3 border-b-2 border-black">
          <h2 className="text-lg font-black">{activeFormTemplate.title}</h2>
          <p className="text-xs">
            รหัสเครื่อง: {currentEquipment?.id} | Asset Code: {currentEquipment?.assetCode || '-'} | 
            ชื่อเครื่อง: {currentEquipment?.name} | ประจำปี {selectedYear}
          </p>
        </div>

        <table className="w-full text-xs border border-black mt-3 border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b border-black">
              <th className="border border-black p-1 text-center w-8">ลำดับ</th>
              <th className="border border-black p-1">รายการตรวจสอบ</th>
              {MONTH_NAMES_TH.map(m => (
                <th key={m} className="border border-black p-1 text-center w-8">{m}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activeFormTemplate.checkItems.map(item => (
              <tr key={item.id}>
                <td className="border border-black p-1 text-center">{item.id}</td>
                <td className="border border-black p-1">{item.title}</td>
                {MONTH_NAMES_TH.map((_, idx) => {
                  const mData = inspectionRecord?.months?.[idx + 1];
                  const st = mData?.itemResults?.[item.id];
                  return (
                    <td key={idx} className="border border-black p-1 text-center">
                      {st === 'pass' ? '✓' : st === 'fail' ? '✕' : '-'}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr>
              <td className="border border-black p-1 font-bold text-center">-</td>
              <td className="border border-black p-1 font-bold">ผู้ตรวจสอบ 1 : TECHNICIAN</td>
              {MONTH_NAMES_TH.map((_, idx) => (
                <td key={idx} className="border border-black p-1 text-center text-[10px]">
                  {inspectionRecord?.months?.[idx + 1]?.technicianName?.slice(0, 5) || '-'}
                </td>
              ))}
            </tr>
            <tr>
              <td className="border border-black p-1 font-bold text-center">-</td>
              <td className="border border-black p-1 font-bold">ผู้ตรวจสอบ 2 (ตรวจสอบซ้ำ) : ENGINEER</td>
              {MONTH_NAMES_TH.map((_, idx) => (
                <td key={idx} className="border border-black p-1 text-center text-[10px]">
                  {inspectionRecord?.months?.[idx + 1]?.engineerName?.slice(0, 5) || '-'}
                </td>
              ))}
            </tr>
            <tr>
              <td className="border border-black p-1 font-bold text-center">-</td>
              <td className="border border-black p-1 font-bold">ผู้อนุมัติ : MANAGER</td>
              {MONTH_NAMES_TH.map((_, idx) => (
                <td key={idx} className="border border-black p-1 text-center text-[10px]">
                  {inspectionRecord?.months?.[idx + 1]?.managerName?.slice(0, 5) || '-'}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
