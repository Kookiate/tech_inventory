import React, { useState } from 'react';
import { Equipment, MaintenanceLog, SparePart } from '../types';
import { getEmbeddableImageUrl } from '../utils/image';
import { 
  Wrench, Plus, Search, Calendar, DollarSign, ShieldAlert, Cpu, Settings, Edit, 
  X, Upload, Image, Link, BarChart2, TrendingUp, Maximize2, FileText, AlertTriangle, 
  CheckCircle, ArrowRightLeft, RefreshCw, Camera, Eye, FolderPlus, ExternalLink,
  Trophy, Printer, PackageMinus, Layers, ChevronRight, Info, CheckCircle2
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';
import EquipmentHistoryModal from './EquipmentHistoryModal';

interface MaintenanceTabProps {
  equipments: Equipment[];
  maintenanceLogs: MaintenanceLog[];
  parts: SparePart[];
  onAddMaintenanceLog: (log: {
    equipmentId: string;
    equipmentName: string;
    repairDetail: string;
    partUsedId: string;
    partQty: number;
    partCost: number;
    otherCost: number;
    totalCost: number;
    technician: string;
    imageUrl?: string;
  }) => Promise<void>;
  onUpdateMaintenanceLog?: (
    oldLog: MaintenanceLog,
    newLog: {
      date: string;
      equipmentId: string;
      equipmentName: string;
      repairDetail: string;
      partUsedId: string;
      partQty: number;
      partCost: number;
      otherCost: number;
      totalCost: number;
      technician: string;
      imageUrl?: string;
    }
  ) => Promise<void>;
  isSubmitting: boolean;
}

export default function MaintenanceTab({
  equipments,
  maintenanceLogs,
  parts,
  onAddMaintenanceLog,
  onUpdateMaintenanceLog,
  isSubmitting
}: MaintenanceTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<'top5' | 'logs' | 'analytics'>('top5');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddLogForm, setShowAddLogForm] = useState(false);

  // Inspector & Top 5 states
  const [selectedInspectorEqId, setSelectedInspectorEqId] = useState<string>('');
  const [inspectorTab, setInspectorTab] = useState<'parts' | 'logs'>('parts');
  const [historyModalEqId, setHistoryModalEqId] = useState<string | null>(null);

  // Form states
  const [selectedEqId, setSelectedEqId] = useState('');
  const [repairDetail, setRepairDetail] = useState('');
  const [selectedPartId, setSelectedPartId] = useState('');
  const [partQty, setPartQty] = useState<number>(0);
  const [otherCost, setOtherCost] = useState<number>(0);
  const [technician, setTechnician] = useState('');
  const [formError, setFormError] = useState('');

  // Form Image state
  const [imageUrl, setImageUrl] = useState('');

  // Edit states
  const [editingLog, setEditingLog] = useState<MaintenanceLog | null>(null);
  const [editRepairDetail, setEditRepairDetail] = useState('');
  const [editOtherCost, setEditOtherCost] = useState<number>(0);
  const [editTechnician, setEditTechnician] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editError, setEditError] = useState('');

  // Lightbox Zoom state
  const [zoomedImage, setZoomedImage] = useState<{ url: string; name: string } | null>(null);

  const getEmbeddableImageUrl = (url: string): string => {
    if (!url) return '';
    const cleanUrl = url.trim();
    if (cleanUrl.includes('drive.google.com')) {
      let fileId = '';
      if (cleanUrl.includes('/file/d/')) {
        const parts = cleanUrl.split('/file/d/');
        if (parts[1]) fileId = parts[1].split('/')[0];
      } else if (cleanUrl.includes('?id=') || cleanUrl.includes('&id=')) {
        const urlObj = new URL(cleanUrl);
        fileId = urlObj.searchParams.get('id') || '';
      }
      if (fileId) {
        return `https://lh3.googleusercontent.com/u/0/d/${fileId}`;
      }
    }
    return cleanUrl;
  };

  const startEditLog = (log: MaintenanceLog) => {
    setEditingLog(log);
    setEditRepairDetail(log.repairDetail);
    setEditOtherCost(log.otherCost);
    setEditTechnician(log.technician);
    setEditImageUrl(log.imageUrl || '');
    setEditError('');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError('');

    if (!editingLog) return;

    if (!editRepairDetail.trim()) {
      setEditError('กรุณากรอกอาการชำรุดและรายละเอียดการซ่อม');
      return;
    }

    if (!editTechnician.trim()) {
      setEditError('กรุณาระบุชื่อช่างผู้รับผิดชอบ');
      return;
    }

    try {
      if (onUpdateMaintenanceLog) {
        const updatedTotalCost = editingLog.partCost + (editOtherCost || 0);
        await onUpdateMaintenanceLog(editingLog, {
          date: editingLog.date,
          equipmentId: editingLog.equipmentId,
          equipmentName: editingLog.equipmentName,
          repairDetail: editRepairDetail.trim(),
          partUsedId: editingLog.partUsedId,
          partQty: editingLog.partQty,
          partCost: editingLog.partCost,
          otherCost: editOtherCost || 0,
          totalCost: updatedTotalCost,
          technician: editTechnician.trim(),
          imageUrl: editImageUrl.trim()
        });
      }
      setEditingLog(null);
    } catch (err: any) {
      setEditError(err.message || 'เกิดข้อผิดพลาดในการแก้ไขข้อมูลประวัติการซ่อม');
    }
  };

  // Find selected equipment
  const selectedEquipment = equipments.find(eq => eq.id === selectedEqId);

  // Find selected part
  const selectedPart = parts.find(p => p.id === selectedPartId);
  const partUnitPrice = selectedPart ? (selectedPart.price || 0) : 0;
  const partMaxStock = selectedPart ? selectedPart.quantity : 0;
  const calculatedPartCost = partQty * partUnitPrice;
  const calculatedTotalCost = calculatedPartCost + (otherCost || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!selectedEqId) {
      setFormError('กรุณาเลือกเครื่องจักร/อุปกรณ์ที่ชำรุด');
      return;
    }

    if (!repairDetail.trim()) {
      setFormError('กรุณากรอกอาการชำรุดและรายละเอียดการซ่อม');
      return;
    }

    if (!technician.trim()) {
      setFormError('กรุณาระบุชื่อช่างผู้รับผิดชอบ');
      return;
    }

    if (selectedPartId && selectedPartId !== '-' && partQty <= 0) {
      setFormError('กรุณาระบุจำนวนอะไหล่ที่ต้องการใช้อย่างน้อย 1 ชิ้น');
      return;
    }

    if (selectedPartId && selectedPartId !== '-' && partQty > partMaxStock) {
      setFormError(`จำนวนอะไหล่คงเหลือไม่พอในคลัง! เหลือเพียง ${partMaxStock} ${selectedPart?.unit} เท่านั้น`);
      return;
    }

    try {
      await onAddMaintenanceLog({
        equipmentId: selectedEqId,
        equipmentName: selectedEquipment ? selectedEquipment.name : 'ไม่ระบุชื่อเครื่อง',
        repairDetail: repairDetail.trim(),
        partUsedId: selectedPartId === '-' ? '' : selectedPartId,
        partQty: selectedPartId === '-' ? 0 : partQty,
        partCost: selectedPartId === '-' ? 0 : calculatedPartCost,
        otherCost: otherCost || 0,
        totalCost: calculatedTotalCost,
        technician: technician.trim(),
        imageUrl: imageUrl.trim()
      });

      // Reset form
      setSelectedEqId('');
      setRepairDetail('');
      setSelectedPartId('');
      setPartQty(0);
      setOtherCost(0);
      setTechnician('');
      setImageUrl('');
      setShowAddLogForm(false);
    } catch (err: any) {
      setFormError(err.message || 'เกิดข้อผิดพลาดในการบันทึกประวัติการซ่อมบำรุง');
    }
  };

  // คำนวณสรุปค่าซ่อมแยกตามเครื่องจักร และการประเมินความคุ้มค่า
  const getEquipmentRepairStats = (eqId: string) => {
    const logs = maintenanceLogs.filter(log => log.equipmentId === eqId);
    const totalRepairCost = logs.reduce((sum, log) => sum + log.totalCost, 0);
    const repairCount = logs.length;
    return { totalRepairCost, repairCount };
  };

  const getCostEffectiveness = (totalCost: number, purchasePrice: number) => {
    if (purchasePrice <= 0) return { pct: 0, text: 'ไม่สามารถประเมินได้', color: 'text-slate-500 bg-slate-50 border-slate-200' };
    const pct = Math.round((totalCost / purchasePrice) * 100);

    if (pct <= 20) {
      return { pct, text: '🟢 คุ้มค่าดีเยี่ยม (คุ้มค่ามาก)', color: 'text-emerald-700 bg-emerald-50 border-emerald-100' };
    } else if (pct <= 50) {
      return { pct, text: '🟡 ปานกลาง (เริ่มต้องระวัง)', color: 'text-amber-700 bg-amber-50 border-amber-100' };
    } else if (pct <= 80) {
      return { pct, text: '🟠 เสี่ยงสิ้นเปลือง (แนะนำจัดงบตรวจเช็ก)', color: 'text-orange-700 bg-orange-50 border-orange-100' };
    } else {
      return { pct, text: '🔴 ไม่คุ้มค่า (แนะนำเปลี่ยนเครื่องใหม่)', color: 'text-rose-700 bg-rose-50 border-rose-100 font-bold animate-pulse' };
    }
  };

  const filteredLogs = maintenanceLogs.filter(log =>
    log.equipmentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.equipmentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.repairDetail.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.technician.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // คำนวณสรุปค่าซ่อมและประวัติงานซ่อมแยกรายเครื่องจักร
  const equipmentStats = equipments.map(eq => {
    const logs = maintenanceLogs.filter(log => log.equipmentId === eq.id);
    const totalCost = logs.reduce((sum, log) => sum + log.totalCost, 0);
    const partsCost = logs.reduce((sum, log) => sum + log.partCost, 0);
    const serviceCost = logs.reduce((sum, log) => sum + log.otherCost, 0);
    const incidentCount = logs.length;
    return {
      ...eq,
      totalCost,
      partsCost,
      serviceCost,
      incidentCount,
      logs
    };
  });

  // เรียงลำดับเครื่องแพ็ค / เครื่องจักรที่มีค่าใช้จ่ายในการซ่อมมากที่สุด 5 ลำดับแรก
  const top5Equipments = [...equipmentStats]
    .sort((a, b) => b.totalCost - a.totalCost)
    .slice(0, 5);

  // ข้อมูลเครื่องจักรที่เลือกดูเจาะลึก (Drill-Down Inspector)
  const activeInspectorEqId = selectedInspectorEqId || top5Equipments[0]?.id || equipments[0]?.id || '';
  const inspectorEq = equipmentStats.find(eq => eq.id === activeInspectorEqId) || equipmentStats[0];

  // รวบรวมสรุปรายการอะไหล่ที่เคยเบิกไปใช้กับเครื่องจักรรหัสนี้
  const inspectorPartsMap = new Map<string, {
    partId: string;
    partName: string;
    unit: string;
    totalQty: number;
    totalCost: number;
    lastDate: string;
    lastTech: string;
  }>();

  if (inspectorEq && inspectorEq.logs) {
    inspectorEq.logs.forEach(log => {
      if (log.partUsedId && log.partUsedId !== '-') {
        const partObj = parts.find(p => p.id === log.partUsedId);
        const existing = inspectorPartsMap.get(log.partUsedId) || {
          partId: log.partUsedId,
          partName: partObj?.name || 'อะไหล่นอกคลัง/ระบุไอดี',
          unit: partObj?.unit || 'ชิ้น',
          totalQty: 0,
          totalCost: 0,
          lastDate: log.date,
          lastTech: log.technician
        };
        existing.totalQty += log.partQty;
        existing.totalCost += log.partCost;
        existing.lastDate = log.date;
        existing.lastTech = log.technician;
        inspectorPartsMap.set(log.partUsedId, existing);
      }
    });
  }

  const inspectorPartsList = Array.from(inspectorPartsMap.values()).sort((a, b) => b.totalCost - a.totalCost);

  // --- ANALYTICS DATA CALCULATIONS ---
  const totalCostSum = maintenanceLogs.reduce((sum, log) => sum + log.totalCost, 0);
  const totalPartsCostSum = maintenanceLogs.reduce((sum, log) => sum + log.partCost, 0);
  const totalServiceCostSum = maintenanceLogs.reduce((sum, log) => sum + log.otherCost, 0);
  const totalIncidents = maintenanceLogs.length;
  const avgCostPerIncident = totalIncidents > 0 ? Math.round(totalCostSum / totalIncidents) : 0;

  // 1. Month Trend Parser
  const getLogMonthYear = (dateStr: string): string => {
    if (!dateStr) return 'ไม่ระบุเดือน';
    const parts = dateStr.split(',')[0].split('/');
    if (parts.length >= 3) {
      let month = parseInt(parts[1], 10);
      let year = parseInt(parts[2], 10);
      if (year > 2500) year = year - 543; // BE to AD
      const monthsThai = [
        'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
        'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
      ];
      if (month >= 1 && month <= 12) {
        return `${monthsThai[month - 1]} ${year}`;
      }
    }
    return 'อื่นๆ';
  };

  const getSortKey = (dateStr: string): number => {
    const parts = dateStr.split(',')[0].split('/');
    if (parts.length >= 3) {
      let month = parseInt(parts[1], 10);
      let year = parseInt(parts[2], 10);
      if (year > 2500) year -= 543;
      return year * 100 + month;
    }
    return 0;
  };

  // Group by Month
  const monthlyDataMap: { [key: string]: { monthName: string; cost: number; partsCost: number; serviceCost: number; sortKey: number } } = {};
  maintenanceLogs.forEach(log => {
    const displayLabel = getLogMonthYear(log.date);
    const key = getSortKey(log.date);
    if (!monthlyDataMap[displayLabel]) {
      monthlyDataMap[displayLabel] = {
        monthName: displayLabel,
        cost: 0,
        partsCost: 0,
        serviceCost: 0,
        sortKey: key
      };
    }
    monthlyDataMap[displayLabel].cost += log.totalCost;
    monthlyDataMap[displayLabel].partsCost += log.partCost;
    monthlyDataMap[displayLabel].serviceCost += log.otherCost;
  });
  const monthlyTrendData = Object.values(monthlyDataMap).sort((a, b) => a.sortKey - b.sortKey);

  // Group by Equipment (Bad Actors)
  const eqCostMap: { [id: string]: { id: string; name: string; cost: number; count: number; maxBudget: number } } = {};
  equipments.forEach(eq => {
    eqCostMap[eq.id] = {
      id: eq.id,
      name: eq.name,
      cost: 0,
      count: 0,
      maxBudget: eq.maxRepairBudget
    };
  });
  maintenanceLogs.forEach(log => {
    if (eqCostMap[log.equipmentId]) {
      eqCostMap[log.equipmentId].cost += log.totalCost;
      eqCostMap[log.equipmentId].count += 1;
    } else {
      eqCostMap[log.equipmentId] = {
        id: log.equipmentId,
        name: log.equipmentName,
        cost: log.totalCost,
        count: 1,
        maxBudget: 0
      };
    }
  });
  const equipmentCostData = Object.values(eqCostMap)
    .filter(item => item.cost > 0 || item.count > 0)
    .sort((a, b) => b.cost - a.cost);

  // Cost Breakdown Spare Parts vs Services
  const costBreakdownData = [
    { name: 'มูลค่าอะไหล่เบิกคลัง', value: totalPartsCostSum, color: '#6366f1' },
    { name: 'ค่าบริการช่างนอก/บริการอื่นๆ', value: totalServiceCostSum, color: '#f59e0b' }
  ];

  // Top Parts Utilized
  const partUsageMap: { [id: string]: { id: string; name: string; qty: number; cost: number } } = {};
  maintenanceLogs.forEach(log => {
    if (log.partUsedId && log.partUsedId !== '-') {
      if (!partUsageMap[log.partUsedId]) {
        const matchedPart = parts.find(p => p.id === log.partUsedId);
        partUsageMap[log.partUsedId] = {
          id: log.partUsedId,
          name: matchedPart ? matchedPart.name : 'อะไหล่นอกคลังหลัก',
          qty: 0,
          cost: 0
        };
      }
      partUsageMap[log.partUsedId].qty += log.partQty;
      partUsageMap[log.partUsedId].cost += log.partCost;
    }
  });
  const topPartsUsage = Object.values(partUsageMap).sort((a, b) => b.qty - a.qty).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* ส่วนหัวแผงหลัก */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-display flex items-center gap-2">
            <Wrench className="h-5.5 w-5.5 text-violet-600 stroke-[1.8]" />
            ประวัติงานซ่อมบำรุงและวิเคราะห์ต้นทุน (Maintenance Log & Cost Analytics)
          </h2>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            บันทึกประวัติการซ่อมแซมพร้อมแนบหลักฐานภาพถ่าย, เบิกอะไหล่อัตโนมัติ และสถิติวิเคราะห์งบประมาณเทียบความคุ้มค่าของเครื่องจักรรายหน่วย
          </p>
        </div>

        <div className="flex flex-row items-center gap-2">
          {/* Sub tabs navigation */}
          <div className="bg-slate-100 p-1 rounded-xl flex border border-slate-200 self-start lg:self-auto shadow-sm overflow-x-auto max-w-full">
            <button
              onClick={() => setActiveSubTab('top5')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeSubTab === 'top5'
                  ? 'bg-white text-violet-700 shadow'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Trophy className="h-3.5 w-3.5 text-amber-500" />
              <span>5 อันดับค่าซ่อมสูงสุด & เจาะลึกรายเครื่อง</span>
            </button>
            <button
              onClick={() => setActiveSubTab('logs')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeSubTab === 'logs'
                  ? 'bg-white text-violet-700 shadow'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>ประวัติและบันทึก</span>
            </button>
            <button
              onClick={() => setActiveSubTab('analytics')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeSubTab === 'analytics'
                  ? 'bg-white text-violet-700 shadow'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart2 className="h-3.5 w-3.5" />
              <span>วิเคราะห์ต้นทุน & แดชบอร์ด</span>
            </button>
          </div>

          <button
            id="btn-toggle-maintenance-form"
            onClick={() => {
              setShowAddLogForm(!showAddLogForm);
              setActiveSubTab('logs');
            }}
            className="flex items-center justify-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-md transition-all self-start lg:self-auto cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            {showAddLogForm ? 'ปิดฟอร์มบันทึก' : 'สร้างบันทึกซ่อมบำรุงใหม่'}
          </button>
        </div>
      </div>

      {/* RENDER VIEW: TOP 5 RANKING & EQUIPMENT DRILL-DOWN INSPECTOR */}
      {activeSubTab === 'top5' && (
        <div className="space-y-6 animate-fade-in">
          {/* SECTION 1: 🏆 5 อันดับเครื่องแพ็ค / เครื่องจักรที่มีค่าใช้จ่ายซ่อมบำรุงสูงสุด */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-md space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center border border-amber-200 shrink-0">
                  <Trophy className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-display flex items-center gap-2">
                    ลำดับเครื่องแพ็ค / เครื่องจักรที่มีค่าใช้จ่ายในการซ่อมมากที่สุด 5 อันดับแรก
                  </h3>
                  <p className="text-xs text-slate-500 font-sans">
                    วิเคราะห์งบซ่อมสะสมเพื่อระบุจุดเสี่ยงและเครื่องจักรที่มีค่าบำรุงรักษาสูงผิดปกติ (Top 5 Maintenance Cost Bad Actors)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-3 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 font-mono">
                  TOP 5 COST RANKING
                </span>
              </div>
            </div>

            {top5Equipments.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs font-sans">
                ยังไม่มีข้อมูลประวัติการซ่อมสำหรับจัดอันดับเครื่องจักร
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {top5Equipments.map((eq, idx) => {
                  const isSelected = eq.id === activeInspectorEqId;
                  const rankBadges = [
                    { label: 'อันดับ 1', bg: 'bg-amber-500 text-white border-amber-600' },
                    { label: 'อันดับ 2', bg: 'bg-slate-400 text-white border-slate-500' },
                    { label: 'อันดับ 3', bg: 'bg-amber-700 text-white border-amber-800' },
                    { label: 'อันดับ 4', bg: 'bg-indigo-600 text-white border-indigo-700' },
                    { label: 'อันดับ 5', bg: 'bg-violet-600 text-white border-violet-700' },
                  ];
                  const badge = rankBadges[idx] || rankBadges[4];
                  const assessment = getCostEffectiveness(eq.totalCost, eq.purchasePrice);

                  return (
                    <div
                      key={eq.id}
                      onClick={() => setSelectedInspectorEqId(eq.id)}
                      className={`rounded-2xl p-4 border transition-all cursor-pointer relative flex flex-col justify-between ${
                        isSelected
                          ? 'bg-violet-50/80 border-violet-400 shadow-md ring-2 ring-violet-400/50 scale-[1.02]'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border shadow-2xs font-mono ${badge.bg}`}>
                            {badge.label}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-slate-400">
                            {eq.id}
                          </span>
                        </div>

                        <h4 className="font-bold text-slate-900 text-xs font-display line-clamp-2 min-h-[2rem]">
                          {eq.name}
                        </h4>
                        <p className="text-[10px] text-slate-500 font-sans mt-0.5 flex items-center gap-1">
                          <Cpu className="h-3 w-3 text-slate-400 shrink-0" />
                          <span>ไลน์ {eq.location}</span>
                        </p>

                        <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                          <div className="flex justify-between items-baseline">
                            <span className="text-[10px] text-slate-500 font-sans">ค่าซ่อมสะสมรวม:</span>
                            <span className="font-mono font-extrabold text-sm text-rose-600">
                              ฿{eq.totalCost.toLocaleString()}
                            </span>
                          </div>

                          <div className="flex justify-between items-center text-[10px] text-slate-500">
                            <span>จำนวนเข้าซ่อม:</span>
                            <span className="font-mono font-bold text-slate-800">{eq.incidentCount} ครั้ง</span>
                          </div>

                          <div className="flex justify-between items-center text-[10px] text-slate-500">
                            <span>มูลค่าอะไหล่:</span>
                            <span className="font-mono text-slate-700">฿{eq.partsCost.toLocaleString()}</span>
                          </div>

                          <div className="flex justify-between items-center text-[10px] text-slate-500">
                            <span>ค่าช่างนอก:</span>
                            <span className="font-mono text-slate-700">฿{eq.serviceCost.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-2">
                        <div className={`text-[10px] px-2 py-1 rounded-lg border text-center font-bold font-sans ${assessment.color}`}>
                          {assessment.text}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedInspectorEqId(eq.id);
                          }}
                          className={`mt-2 w-full py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                            isSelected
                              ? 'bg-violet-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          <span>{isSelected ? 'กำลังเจาะลึกเครื่องนี้' : 'เลือกดูข้อมูลเบิกซ่อม'}</span>
                          <ChevronRight className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SECTION 2: 🔎 เจาะลึกประวัติการเบิกอะไหล่ & การซ่อมบำรุงรายเครื่อง (Equipment Inspector) */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-lg space-y-5">
            {/* Header Inspector */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-violet-50 text-violet-600 rounded-xl flex items-center justify-center border border-violet-100 shrink-0">
                  <Cpu className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-display flex items-center gap-2">
                    เจาะลึกประวัติการเบิกอะไหล่ & งานซ่อมบำรุงรายรหัสเครื่องแพ็ค
                  </h3>
                  <p className="text-xs text-slate-500 font-sans">
                    เลือกดูรายละเอียดว่าเครื่องแพ็ค/เครื่องจักรรหัสนี้ได้ทำการ <strong className="text-violet-700 font-bold">เบิกอะไหล่อะไรไปบ้าง</strong> และมี <strong className="text-slate-800 font-bold">ประวัติอาการชำรุดเรื่องอะไรบ้าง</strong>
                  </p>
                </div>
              </div>

              {/* Dropdown Selector for Machine */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative">
                  <select
                    value={activeInspectorEqId}
                    onChange={(e) => setSelectedInspectorEqId(e.target.value)}
                    className="bg-slate-50 hover:bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-violet-500 outline-none shadow-xs font-sans cursor-pointer pr-8"
                  >
                    {equipments.map(eq => (
                      <option key={eq.id} value={eq.id}>
                        [{eq.id}] {eq.name} - (ไลน์ {eq.location})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => setHistoryModalEqId(activeInspectorEqId)}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Printer className="h-3.5 w-3.5 text-amber-400" />
                  <span>พิมพ์รายงาน A4</span>
                </button>
              </div>
            </div>

            {/* Selected Equipment Info Header Banner */}
            {inspectorEq && (
              <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="bg-violet-500/30 text-violet-200 border border-violet-400/30 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full">
                      EQUIPMENT CODE: {inspectorEq.id}
                    </span>
                    <span className="text-xs text-slate-300 font-sans">| ไลน์: {inspectorEq.location}</span>
                  </div>
                  <h4 className="text-lg font-bold font-display text-white">{inspectorEq.name}</h4>
                  <p className="text-xs text-slate-300 font-sans">
                    ราคาจัดซื้อแรกเริ่ม: ฿{inspectorEq.purchasePrice.toLocaleString()} | พิกัดงบซ่อมวิกฤต: ฿{inspectorEq.maxRepairBudget.toLocaleString()}
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-t md:border-t-0 md:border-l border-slate-700/80 pt-3 md:pt-0 md:pl-5 font-mono">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-sans block">ค่าซ่อมรวม</span>
                    <span className="text-base font-extrabold text-amber-400">฿{inspectorEq.totalCost.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-sans block">อะไหล่ที่เบิกใช้</span>
                    <span className="text-base font-bold text-indigo-300">{inspectorPartsList.length} ชนิด</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-sans block">เข้าซ่อมรวม</span>
                    <span className="text-base font-bold text-emerald-300">{inspectorEq.incidentCount} ครั้ง</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-sans block">มูลค่าอะไหล่</span>
                    <span className="text-base font-bold text-slate-200">฿{inspectorEq.partsCost.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Inspector Toggle Sub-Tabs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
                <button
                  onClick={() => setInspectorTab('parts')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    inspectorTab === 'parts'
                      ? 'bg-violet-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <PackageMinus className="h-3.5 w-3.5" />
                  <span>อะไหล่ที่เบิกไปใช้กับเครื่องนี้ ({inspectorPartsList.length})</span>
                </button>

                <button
                  onClick={() => setInspectorTab('logs')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    inspectorTab === 'logs'
                      ? 'bg-violet-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Wrench className="h-3.5 w-3.5" />
                  <span>ประวัติอาการเสีย & รายรายละเอียดการซ่อม ({inspectorEq?.logs.length || 0})</span>
                </button>
              </div>
            </div>

            {/* Inspector Tab 1: Withdrawn Spare Parts Table */}
            {inspectorTab === 'parts' && (
              <div className="space-y-3">
                <div className="max-h-80 overflow-y-auto border border-slate-200 rounded-xl overflow-hidden shadow-inner bg-slate-50/50">
                  <table className="w-full text-left text-xs border-collapse font-sans">
                    <thead>
                      <tr className="bg-violet-100/70 text-violet-900 font-bold border-b border-violet-200">
                        <th className="py-2.5 px-3">รหัสอะไหล่</th>
                        <th className="py-2.5 px-3">ชื่อชิ้นส่วนอะไหล่</th>
                        <th className="py-2.5 px-3 text-right">จำนวนเบิกสะสม</th>
                        <th className="py-2.5 px-3 text-right">มูลค่ารวมที่เบิก (บาท)</th>
                        <th className="py-2.5 px-3">ช่างผู้เบิกล่าสุด</th>
                        <th className="py-2.5 px-3">วันเวลาทำรายการล่าสุด</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white text-slate-700">
                      {inspectorPartsList.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            ไม่มีประวัติการเบิกใช้อะไหล่จากคลังสำหรับเครื่องจักรรหัสนี้ (อาจซ่อมโดยไม่ใช้อะไหล่ หรือจ้างช่างภายนอก)
                          </td>
                        </tr>
                      ) : (
                        inspectorPartsList.map(item => (
                          <tr key={item.partId} className="hover:bg-violet-50/30 transition-colors">
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{item.partId}</td>
                            <td className="py-2.5 px-3 font-semibold text-slate-900">{item.partName}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-violet-600">
                              {item.totalQty} {item.unit}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                              ฿{item.totalCost.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-700">{item.lastTech}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">{item.lastDate}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Inspector Tab 2: Full Repair Logs for this Machine */}
            {inspectorTab === 'logs' && (
              <div className="space-y-3">
                <div className="max-h-80 overflow-y-auto border border-slate-200 rounded-xl overflow-hidden shadow-inner bg-slate-50/50">
                  <table className="w-full text-left text-xs border-collapse font-sans">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                        <th className="py-2.5 px-3">วันที่ / เวลา</th>
                        <th className="py-2.5 px-3">อาการชำรุด & รายละเอียดวิธีซ่อม</th>
                        <th className="py-2.5 px-3">อะไหล่ที่เบิกใช้</th>
                        <th className="py-2.5 px-3 text-right">ค่าอะไหล่</th>
                        <th className="py-2.5 px-3 text-right">ค่าช่าง/อื่นๆ</th>
                        <th className="py-2.5 px-3 text-right">รวมค่าซ่อม</th>
                        <th className="py-2.5 px-3">ช่างผู้รับผิดชอบ</th>
                        <th className="py-2.5 px-3 text-center">หลักฐาน</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white text-slate-700">
                      {(!inspectorEq || inspectorEq.logs.length === 0) ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400">
                            ไม่พบประวัติการเข้าซ่อมแซมสำหรับเครื่องจักรรหัสนี้
                          </td>
                        </tr>
                      ) : (
                        inspectorEq.logs.map((log, idx) => (
                          <tr key={`${log.equipmentId}-${log.date}-${idx}`} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2.5 px-3 font-mono text-slate-600 text-[11px] whitespace-nowrap">{log.date}</td>
                            <td className="py-2.5 px-3 font-medium text-slate-900 max-w-xs">{log.repairDetail}</td>
                            <td className="py-2.5 px-3 text-slate-700">
                              {log.partUsedId && log.partUsedId !== '-' ? (
                                <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded-md font-bold">
                                  {log.partUsedId} ({log.partQty} ชิ้น)
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px]">-</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-600">฿{log.partCost.toLocaleString()}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-600">฿{log.otherCost.toLocaleString()}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600">฿{log.totalCost.toLocaleString()}</td>
                            <td className="py-2.5 px-3 font-semibold text-slate-800">{log.technician}</td>
                            <td className="py-2.5 px-3 text-center">
                              {log.imageUrl ? (
                                <button
                                  onClick={() => setZoomedImage({ url: getEmbeddableImageUrl(log.imageUrl!), name: `${inspectorEq.name} (${log.date})` })}
                                  className="p-1 bg-violet-50 hover:bg-violet-100 text-violet-600 rounded-lg transition-all cursor-pointer"
                                  title="ดูรูปถ่าย"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                              ) : (
                                <span className="text-slate-300 text-[10px]">-</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* RENDER VIEW: ANALYTICS SUB TAB */}
      {activeSubTab === 'analytics' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* 1. Metric Cards (KPI Bento Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <DollarSign className="h-16 w-16 text-indigo-900" />
              </div>
              <span className="text-xs font-bold text-slate-400 font-sans block uppercase">รวมค่าใช้จ่ายบำรุงรักษาทั้งหมด</span>
              <span className="text-2xl font-mono font-extrabold text-indigo-600 block mt-2">฿{totalCostSum.toLocaleString()}</span>
              <span className="text-[10px] text-slate-500 font-sans mt-3 block">ค่าอะไหล่ ฿{totalPartsCostSum.toLocaleString()} | ค่าช่างนอก ฿{totalServiceCostSum.toLocaleString()}</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <Wrench className="h-16 w-16 text-amber-900" />
              </div>
              <span className="text-xs font-bold text-slate-400 font-sans block uppercase">จำนวนครั้งที่เข้าซ่อม (Incidents)</span>
              <span className="text-2xl font-mono font-extrabold text-amber-600 block mt-2">{totalIncidents} ครั้ง</span>
              <span className="text-[10px] text-emerald-600 font-sans mt-3 font-medium block flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                ระบบบันทึกอย่างสมบูรณ์เชื่อมโยงเรียบร้อย
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <TrendingUp className="h-16 w-16 text-violet-900" />
              </div>
              <span className="text-xs font-bold text-slate-400 font-sans block uppercase">เฉลี่ยต่อการซ่อมแซม 1 ครั้ง</span>
              <span className="text-2xl font-mono font-extrabold text-violet-600 block mt-2">฿{avgCostPerIncident.toLocaleString()}</span>
              <span className="text-[10px] text-slate-500 font-sans mt-3 block">อ้างอิงจากประวัติการซ่อมทั้งหมด</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <Cpu className="h-16 w-16 text-rose-900" />
              </div>
              <span className="text-xs font-bold text-slate-400 font-sans block uppercase">อัตราความคลาดเคลื่อนงบประมาณ</span>
              <span className="text-2xl font-mono font-extrabold text-emerald-600 block mt-2">ปกติ (Within Limit)</span>
              <span className="text-[10px] text-slate-500 font-sans mt-3 block">เทียบเกณฑ์วิกฤตความคุ้มค่าเฉลี่ย</span>
            </div>
          </div>

          {/* 2. Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Trend Chart */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-md">
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 font-display">
                  <TrendingUp className="h-4 w-4 text-indigo-500" />
                  แนวโน้มค่าใช้จ่ายซ่อมบำรุงรายเดือน (Monthly Cost Trend)
                </h3>
                <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold">สรุปสะสม</span>
              </div>
              <div className="h-64">
                {monthlyTrendData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-400 text-xs font-sans">
                    ไม่มีข้อมูลสรุปรายเดือนในขณะนี้
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="monthName" tick={{ fontSize: 10, fill: '#64748b' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                      <Tooltip formatter={(value: any) => [`฿${Number(value).toLocaleString()}`, '']} />
                      <Legend wrapperStyle={{ fontSize: 10, marginTop: 10 }} />
                      <Line type="monotone" dataKey="cost" name="รวมทั้งหมด" stroke="#6366f1" strokeWidth={2.5} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="partsCost" name="มูลค่าอะไหล่" stroke="#3b82f6" strokeWidth={1.5} />
                      <Line type="monotone" dataKey="serviceCost" name="ค่าจ้างช่างนอก" stroke="#f59e0b" strokeWidth={1.5} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Bad Actors Budget Breakdown (Equipment cost) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-md">
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 font-display">
                  <ShieldAlert className="h-4 w-4 text-rose-500" />
                  งบซ่อมแซมสูงสุดสะสมรายเครื่องจักร (Bad Actors Budget Analysis)
                </h3>
                <span className="text-[10px] bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full font-bold">เรียงตามค่าใช้จ่าย</span>
              </div>
              <div className="h-64">
                {equipmentCostData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-400 text-xs font-sans">
                    ไม่มีข้อมูลเครื่องจักรที่ผ่านการซ่อม
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={equipmentCostData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} />
                      <YAxis dataKey="id" type="category" tick={{ fontSize: 9, fill: '#64748b' }} width={60} />
                      <Tooltip formatter={(value: any, name: any, props: any) => [`฿${Number(value).toLocaleString()}`, `${props.payload.name}`]} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Bar dataKey="cost" name="งบซ่อมสะสม (บาท)" fill="#f43f5e" radius={[0, 4, 4, 0]} barSize={14} />
                      <Bar dataKey="maxBudget" name="งบซ่อมวิกฤตแนะนำ (บาท)" fill="#94a3b8" radius={[0, 4, 4, 0]} barSize={4} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* 3. Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Pie Chart: Spare parts vs service costs */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-md flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 font-display">
                    <DollarSign className="h-4 w-4 text-emerald-500" />
                    สัดส่วนประเภทค่าใช้จ่าย (Cost Distribution)
                  </h3>
                </div>
                <div className="h-48 flex justify-center items-center">
                  {totalCostSum === 0 ? (
                    <div className="text-slate-400 text-xs font-sans">ไม่มีสัดส่วนค่าใช้จ่าย</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={costBreakdownData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {costBreakdownData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: any) => `฿${Number(value).toLocaleString()}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Legends list */}
              <div className="space-y-2 mt-2 pt-3 border-t border-slate-100">
                {costBreakdownData.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs font-sans">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span>{item.name}</span>
                    </div>
                    <span className="font-mono font-bold text-slate-900">
                      ฿{item.value.toLocaleString()} ({totalCostSum > 0 ? Math.round((item.value / totalCostSum) * 100) : 0}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* List: Top 5 Parts Utilized */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-md flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 font-display">
                    <Cpu className="h-4 w-4 text-violet-500" />
                    อะไหล่ที่เบิกใช้เยอะที่สุด 5 อันดับแรก (Top 5 Spare Parts Utilized)
                  </h3>
                </div>
                {topPartsUsage.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs font-sans">
                    ไม่มีประวัติการเบิกใช้อะไหล่ในระบบขณะนี้
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {topPartsUsage.map((part, index) => (
                      <div key={part.id} className="py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-violet-50 border border-violet-100 text-[10px] font-bold text-violet-700 flex items-center justify-center font-mono">
                            {index + 1}
                          </span>
                          <div>
                            <span className="text-xs font-bold text-slate-800 block leading-tight">{part.name}</span>
                            <span className="text-[10px] font-mono text-slate-400 block mt-0.5">{part.id}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-slate-800 block font-mono">{part.qty} ชิ้น</span>
                          <span className="text-[9px] text-slate-400 block mt-0.5 font-mono">มูลค่า ฿{part.cost.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-[10px] text-slate-400 leading-tight border-t border-slate-100 pt-3">
                💡 แนะนำฝ่ายซ่อมบำรุงตรวจเช็กชิ้นส่วนเหล่านี้เพื่อหามาตรการยืดอายุการทำงาน
              </p>
            </div>

            {/* List: Critical Machines with Highest Incidents */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-md flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 font-display">
                    <ShieldAlert className="h-4 w-4 text-amber-500" />
                    เครื่องจักรวิกฤตที่เกิดอาการเสียบ่อยที่สุด (Top Bad Actors by Count)
                  </h3>
                </div>
                {equipmentCostData.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs font-sans">
                    ไม่มีประวัติงานซ่อมสำหรับประเมิน
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {equipmentCostData.slice(0, 5).map((eq, index) => {
                      const assessment = getCostEffectiveness(eq.cost, eq.maxBudget);
                      return (
                        <div key={eq.id} className="py-2.5 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-600 flex items-center justify-center font-mono">
                              {index + 1}
                            </span>
                            <div>
                              <span className="text-xs font-bold text-slate-800 block leading-tight truncate max-w-[150px]">{eq.name}</span>
                              <span className="text-[10px] font-mono text-slate-400 block mt-0.5">{eq.id}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-extrabold text-slate-800 block font-mono">{eq.count} ครั้ง</span>
                            <span className="text-[9px] text-rose-500 font-semibold block mt-0.5 font-mono">ค่าซ่อมรวม ฿{eq.cost.toLocaleString()}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <p className="text-[10px] text-slate-400 leading-tight border-t border-slate-100 pt-3">
                💡 ลำดับความเสียหายสะสมสูงสุดรายเครื่องจักร บ่งชี้จุดเสี่ยงในไลน์ผลิตซ้ำซาก
              </p>
            </div>

          </div>

        </div>
      )}

      {/* RENDER VIEW: STANDARD LISTS & FORMS SUB TAB */}
      {activeSubTab === 'logs' && (
        <div className="space-y-6">

          {/* สรุป bento ย่อยๆ ของตารางความคุ้มค่าเฉลี่ยรายเครื่องจักร */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {equipments.slice(0, 3).map(eq => {
              const { totalRepairCost, repairCount } = getEquipmentRepairStats(eq.id);
              const assessment = getCostEffectiveness(totalRepairCost, eq.purchasePrice);
              return (
                <div key={eq.id} className="bg-white border border-slate-200 shadow-md rounded-2xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-[10px] font-bold text-slate-400">ANALYSIS: {eq.id}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${assessment.color}`}>
                        {assessment.text}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-800 text-xs font-display truncate">{eq.name}</h4>
                    <div className="mt-2 space-y-1 text-slate-500 text-[11px] font-sans">
                      <div className="flex justify-between">
                        <span>ราคาแรกซื้อ:</span>
                        <span className="font-mono text-slate-700 font-semibold">฿{eq.purchasePrice.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>ซ่อมบำรุงสะสม:</span>
                        <span className="font-mono text-slate-700 font-semibold">฿{totalRepairCost.toLocaleString()} ({repairCount} ครั้ง)</span>
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-[9px] text-slate-400 mb-1 font-mono">
                      <span>สัดส่วนค่าซ่อมสะสมต่อราคาแรกซื้อ</span>
                      <span>{assessment.pct}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          assessment.pct <= 20 ? 'bg-emerald-500' :
                          assessment.pct <= 50 ? 'bg-amber-500' :
                          assessment.pct <= 80 ? 'bg-orange-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(assessment.pct, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ฟอร์มสร้างบันทึกซ่อมบำรุงใหม่ */}
          {showAddLogForm && (
            <div className="bg-white border border-violet-100 rounded-2xl p-6 shadow-xl relative overflow-hidden transition-all duration-300">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-violet-600" />
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-1.5 font-display">
                <Plus className="h-4 w-4 text-violet-600" />
                แบบฟอร์มบันทึกผลการซ่อมแซมพร้อมแนบรูปถ่ายและประเมินงบประมาณ
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                {formError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg font-sans">
                    {formError}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">เลือกเครื่องจักร / อุปกรณ์ที่ชำรุด *</label>
                    <select
                      value={selectedEqId}
                      onChange={e => setSelectedEqId(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-violet-100 focus:border-violet-500 outline-none font-sans"
                      required
                    >
                      <option value="">-- กรุณาเลือกเครื่องจักร --</option>
                      {equipments.map(eq => (
                        <option key={eq.id} value={eq.id}>
                          [{eq.id}] {eq.name} (ไลน์: {eq.location})
                        </option>
                      ))}
                    </select>
                    {selectedEquipment && (
                      <p className="text-[10px] text-blue-600 font-sans mt-1">
                        ราคาจัดซื้อแรกเริ่ม: ฿{selectedEquipment.purchasePrice.toLocaleString()} | พิกัดงบซ่อมวิกฤต: ฿{selectedEquipment.maxRepairBudget.toLocaleString()}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">ช่างผู้รับผิดชอบซ่อมบำรุง *</label>
                    <input
                      type="text"
                      placeholder="เช่น ช่างศักดิ์ดา, ช่างวรวุฒิ"
                      value={technician}
                      onChange={e => setTechnician(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-violet-100 focus:border-violet-500 outline-none font-sans"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">อาการชำรุด และรายละเอียดวิธีซ่อมแซม *</label>
                  <textarea
                    rows={3}
                    placeholder="อธิบายอาการเสียและสาเหตุ ชิ้นส่วนที่ซ่อมบำรุง..."
                    value={repairDetail}
                    onChange={e => setRepairDetail(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-violet-100 focus:border-violet-500 outline-none font-sans"
                    required
                  />
                </div>

                {/* Photo Attachment Module */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <span className="text-[11px] font-bold text-slate-700 block border-b border-slate-200 pb-1 flex items-center gap-1.5">
                    <Camera className="h-4 w-4 text-violet-600" />
                    แนบรูปถ่ายประกอบการซ่อม (แนบลิงก์ Google Drive หรือ URL รูปภาพ)
                  </span>

                  <div className="space-y-2.5">
                    {/* ปุ่มทางลัดเปิดโฟลเดอร์ Google Drive กลาง */}
                    {localStorage.getItem('drive_folder_url') ? (
                      <div className="p-3 bg-violet-50 border border-violet-200/80 rounded-xl flex items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-8 w-8 bg-violet-600 text-white rounded-lg flex items-center justify-center shrink-0 shadow-xs">
                            <FolderPlus className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-violet-950 truncate">โฟลเดอร์จัดเก็บรูป Google Drive กลาง</p>
                            <p className="text-[10px] text-violet-700 truncate">คลิกเปิดเพื่อลากวางรูปขึ้น Drive แล้วคัดลอกลิงก์มาวางด้านล่าง</p>
                          </div>
                        </div>
                        <a
                          href={localStorage.getItem('drive_folder_url')!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs rounded-lg shadow-xs flex items-center gap-1 shrink-0 transition-all cursor-pointer"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span>เปิดโฟลเดอร์ Drive</span>
                        </a>
                      </div>
                    ) : (
                      <div className="p-2.5 bg-amber-50/80 border border-amber-200/80 rounded-xl text-[11px] text-amber-900 flex items-center justify-between gap-2">
                        <span className="text-amber-800">💡 เคล็ดลับ: ตั้งค่าโฟลเดอร์ Google Drive กลางในแท็บ "จัดระบบ & สิทธิ์" เพื่อคลิกเปิดโฟลเดอร์ลากวางรูปได้สะดวก</span>
                      </div>
                    )}

                    <div className="relative">
                      <input
                        type="url"
                        placeholder="วางลิงก์รูปภาพ เช่น https://drive.google.com/file/d/..."
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        className="w-full border border-slate-200 bg-white rounded-xl pl-9 pr-3.5 py-2.5 text-xs outline-none font-sans focus:ring-2 focus:ring-violet-200 focus:border-violet-400 transition-all"
                      />
                      <Link className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    </div>

                    <div className="p-2.5 bg-violet-50/70 border border-violet-100 rounded-xl text-[11px] text-violet-900 flex items-start gap-2 leading-relaxed">
                      <Link className="h-4 w-4 text-violet-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-violet-800">การใช้องค์ประกอบลิงก์ Google Drive:</span>
                        <p className="text-[10px] text-violet-700 mt-0.5">
                          ก๊อปปี้ลิงก์แชร์ไฟล์รูปภาพจาก Google Drive มาวางได้ทันที (ตั้งค่าแชร์ไฟล์เป็น <strong className="font-bold">"ทุกคนที่มีลิงก์สิทธิ์อ่าน"</strong>) ระบบจะแปลงเป็นรูปภาพแสดงผลอัตโนมัติ ช่วยให้ไฟล์ Google Sheet ไม่หนักและโหลดรวดเร็วขึ้น
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Image Preview & Actions */}
                  {imageUrl && (
                    <div className="flex items-center gap-3 p-2.5 bg-white rounded-xl border border-slate-200 relative">
                      <img 
                        src={getEmbeddableImageUrl(imageUrl)} 
                        alt="Preview" 
                        referrerPolicy="no-referrer"
                        className="w-14 h-14 object-cover rounded-lg border border-slate-200"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = 'https://placehold.co/100?text=Invalid+Image+URL';
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-bold text-violet-600 block font-mono">ATTACHED IMAGE URL</span>
                        <p className="text-xs text-slate-700 truncate font-mono">{imageUrl}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setImageUrl('')}
                        className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-all cursor-pointer"
                        title="ลบรูปถ่ายที่แนบ"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Spare parts and expenses module */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <span className="text-[11px] font-bold text-slate-700 block border-b border-slate-200 pb-1">
                    ⚙️ อะไหล่ที่ใช้หักจากคลัง (ระบบจะหักจำนวนคงเหลือในแผ่น Inventory และบันทึกประวัติเบิกจ่ายให้อัตโนมัติ)
                  </span>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">เลือกอะไหล่สำรองที่ใช้</label>
                      <select
                        value={selectedPartId}
                        onChange={e => {
                          setSelectedPartId(e.target.value);
                          setPartQty(e.target.value === '-' ? 0 : 1);
                        }}
                        className="w-full border border-slate-200 bg-white rounded-xl px-3 py-1.5 text-xs outline-none font-sans"
                      >
                        <option value="-">-- ไม่ได้ใช้อะไหล่คลัง / ไม่มี --</option>
                        {parts.map(p => (
                          <option key={p.id} value={p.id}>
                            [{p.id}] {p.name} (คลังเหลือ: {p.quantity} {p.unit} | ราคา: ฿{p.price}/ชิ้น)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">จำนวนที่เบิกใช้</label>
                      <input
                        type="number"
                        min={0}
                        disabled={!selectedPartId || selectedPartId === '-'}
                        value={partQty || ''}
                        onChange={e => setPartQty(Math.max(0, Number(e.target.value)))}
                        placeholder="เช่น 1, 2"
                        className="w-full border border-slate-200 bg-white rounded-xl px-3 py-1.5 text-xs outline-none font-mono disabled:opacity-50"
                      />
                      {selectedPart && (
                        <p className="text-[9px] text-slate-500 font-sans mt-0.5">
                          (คงคลังสูงสุด: {partMaxStock} {selectedPart.unit})
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">ค่าใช้จ่ายอื่นๆ / ค่าช่างนอก (บาท)</label>
                      <input
                        type="number"
                        min={0}
                        value={otherCost || ''}
                        onChange={e => setOtherCost(Math.max(0, Number(e.target.value)))}
                        placeholder="เช่น ค่าแรงที่จ้างช่างภายนอกซ่อม"
                        className="w-full border border-slate-200 bg-white rounded-xl px-3 py-1.5 text-xs outline-none font-mono"
                      />
                    </div>
                  </div>

                  {selectedPartId && selectedPartId !== '-' && (
                    <div className="text-[11px] text-indigo-700 bg-indigo-50 px-3 py-2 rounded-lg flex justify-between font-sans">
                      <span>มูลค่าคำนวณอะไหล่สะสม:</span>
                      <span className="font-mono font-bold">฿{partUnitPrice.toLocaleString()} x {partQty} = ฿{calculatedPartCost.toLocaleString()}</span>
                    </div>
                  )}

                  <div className="pt-2 flex justify-between items-center text-xs border-t border-slate-200">
                    <span className="font-bold text-slate-700">คำนวณรวมค่าซ่อมบำรุงทริปนี้:</span>
                    <span className="font-mono font-extrabold text-sm text-violet-700 bg-violet-100 px-3 py-1 rounded-lg">
                      ฿{calculatedTotalCost.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddLogForm(false)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    {isSubmitting ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle className="h-3.5 w-3.5" />
                    )}
                    <span>{isSubmitting ? 'กำลังบันทึกซ่อม...' : 'บันทึกประวัติการซ่อมบำรุง'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* รายการประวัติงานซ่อม */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-3 text-slate-400">
                  <Search className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  placeholder="ค้นหาตามรหัสเครื่องจักร ชื่อ อาการซ่อม หรือช่างซ่อม..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs focus:ring-2 focus:ring-violet-100 focus:border-violet-500 outline-none font-sans"
                />
              </div>
            </div>

            {/* ตารางแสดงผลประวัติ */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl bg-slate-50/50">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 font-sans">
                    <th className="py-3 px-4 font-bold">วันเวลาซ่อม</th>
                    <th className="py-3 px-3 font-bold text-center">รูปถ่ายซ่อม</th>
                    <th className="py-3 px-4 font-bold">รหัสเครื่องจักร</th>
                    <th className="py-3 px-4 font-bold">ชื่อเครื่องจักร / อุปกรณ์</th>
                    <th className="py-3 px-4 font-bold">รายละเอียดอาการและการซ่อม</th>
                    <th className="py-3 px-4 font-bold">อะไหล่ที่ใช้</th>
                    <th className="py-3 px-4 text-right font-bold">มูลค่าอะไหล่</th>
                    <th className="py-3 px-4 text-right font-bold">ค่าแรงช่างนอก</th>
                    <th className="py-3 px-4 text-right text-violet-700 font-bold">รวมค่าใช้จ่าย</th>
                    <th className="py-3 px-4 font-bold">ช่างซ่อม</th>
                    <th className="py-3 px-4 text-center font-bold">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-slate-400 font-sans">
                        ไม่พบประวัติข้อมูลงานซ่อมบำรุงที่บันทึกไว้ในระบบ
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">{log.date}</td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {log.imageUrl ? (
                            <div className="relative group inline-block">
                              <img 
                                src={getEmbeddableImageUrl(log.imageUrl)} 
                                alt="Repair item"
                                referrerPolicy="no-referrer"
                                className="w-10 h-10 object-cover rounded-lg border border-slate-200 shadow-sm cursor-zoom-in group-hover:scale-105 transition-all bg-slate-100"
                                onClick={() => setZoomedImage({ url: getEmbeddableImageUrl(log.imageUrl || ''), name: `รูปภาพแนบงานซ่อมของ ${log.equipmentName} (${log.equipmentId})` })}
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src = 'https://placehold.co/100?text=Error';
                                }}
                              />
                              <div className="absolute -top-1.5 -right-1.5 hidden group-hover:flex items-center justify-center bg-violet-600 text-white rounded-full p-0.5">
                                <Eye className="w-2.5 h-2.5" />
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-300 font-sans text-[10px] italic">ไม่มีรูป</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-blue-600 whitespace-nowrap">{log.equipmentId}</td>
                        <td className="py-3 px-4 font-semibold text-slate-800 whitespace-nowrap max-w-[150px] truncate" title={log.equipmentName}>{log.equipmentName}</td>
                        <td className="py-3 px-4 text-slate-700 font-sans max-w-[200px] truncate" title={log.repairDetail}>{log.repairDetail}</td>
                        <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                          {log.partUsedId && log.partUsedId !== '-' ? (
                            <span className="font-semibold text-slate-800">
                              {log.partUsedId} (x{log.partQty})
                            </span>
                          ) : '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-600">
                          ฿{log.partCost.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-600">
                          ฿{log.otherCost.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-violet-700 bg-violet-50/20">
                          ฿{log.totalCost.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-700 whitespace-nowrap">{log.technician}</td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <button
                            onClick={() => startEditLog(log)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all cursor-pointer active:scale-95 inline-block"
                            title="แก้ไขประวัติงานซ่อม"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* โมดอลแก้ไขประวัติงานซ่อมบำรุง */}
      {editingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 flex flex-col relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-violet-600" />
            
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-1.5 font-display">
              <Edit className="h-4 w-4 text-violet-600" />
              แก้ไขประวัติการซ่อมบำรุง
            </h3>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              {editError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg font-sans">
                  {editError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">วันเวลาที่ซ่อม</label>
                  <input
                    type="text"
                    value={editingLog.date}
                    disabled
                    className="w-full bg-slate-50 border border-slate-200 text-slate-400 rounded-xl px-3 py-2 text-xs font-mono cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">เครื่องจักร</label>
                  <input
                    type="text"
                    value={`[${editingLog.equipmentId}] ${editingLog.equipmentName}`}
                    disabled
                    className="w-full bg-slate-50 border border-slate-200 text-slate-400 rounded-xl px-3 py-2 text-xs font-sans cursor-not-allowed text-ellipsis overflow-hidden whitespace-nowrap"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">ช่างผู้รับผิดชอบซ่อมบำรุง *</label>
                <input
                  type="text"
                  value={editTechnician}
                  onChange={e => setEditTechnician(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-violet-100 focus:border-violet-500 outline-none font-sans"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">อาการชำรุด และรายละเอียดวิธีซ่อมแซม *</label>
                <textarea
                  rows={3}
                  value={editRepairDetail}
                  onChange={e => setEditRepairDetail(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-violet-100 focus:border-violet-500 outline-none font-sans"
                  required
                />
              </div>

              {/* Edit Image Module */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <span className="text-[11px] font-bold text-slate-700 block border-b border-slate-200 pb-1 flex items-center gap-1.5">
                  <Camera className="h-4 w-4 text-violet-600" />
                  แก้ไขรูปถ่ายประกอบการซ่อม (แนบลิงก์ Google Drive หรือ URL)
                </span>

                <div className="space-y-2">
                  {localStorage.getItem('drive_folder_url') && (
                    <div className="p-2.5 bg-violet-50 border border-violet-150 rounded-xl flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-violet-900 truncate">โฟลเดอร์รูปภาพ Google Drive กลาง</span>
                      <a
                        href={localStorage.getItem('drive_folder_url')!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 bg-violet-600 hover:bg-violet-700 text-white font-semibold text-[10px] rounded-lg shadow-xs flex items-center gap-1 shrink-0 transition-all cursor-pointer"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span>เปิด Drive</span>
                      </a>
                    </div>
                  )}
                  <div className="relative">
                    <input
                      type="url"
                      placeholder="วางลิงก์รูปภาพ เช่น https://drive.google.com/file/d/..."
                      value={editImageUrl}
                      onChange={(e) => setEditImageUrl(e.target.value)}
                      className="w-full border border-slate-200 bg-white rounded-xl pl-8 pr-3 py-2 text-xs outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 transition-all font-sans"
                    />
                    <Link className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  </div>
                </div>

                {editImageUrl && (
                  <div className="flex items-center gap-3 p-2 bg-white rounded-xl border border-slate-200">
                    <img 
                      src={getEmbeddableImageUrl(editImageUrl)} 
                      alt="Edit Preview" 
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 object-cover rounded-lg border border-slate-200"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = 'https://placehold.co/100?text=Invalid+Image+URL';
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-bold text-violet-600 block font-mono">ATTACHED IMAGE URL</span>
                      <p className="text-[10px] text-slate-600 truncate font-mono">{editImageUrl}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditImageUrl('')}
                      className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1 rounded-lg transition-all cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <span className="text-[10px] font-bold text-slate-500 block uppercase font-mono">
                  ข้อมูลการใช้อะไหล่คลัง (ไม่สามารถแก้ไขเพื่อป้องกันยอดคลังคลาดเคลื่อน)
                </span>
                
                <div className="grid grid-cols-2 gap-4 text-xs font-sans text-slate-600">
                  <div>
                    <span className="text-slate-400 block text-[10px]">อะไหล่ที่เบิกใช้:</span>
                    <span className="font-semibold font-mono">{editingLog.partUsedId && editingLog.partUsedId !== '-' ? editingLog.partUsedId : 'ไม่ได้ใช้อะไหล่คลัง'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">จำนวนที่ใช้ / มูลค่าอะไหล่:</span>
                    <span className="font-semibold">{editingLog.partUsedId && editingLog.partUsedId !== '-' ? `${editingLog.partQty} ชิ้น (฿${editingLog.partCost.toLocaleString()})` : '-'}</span>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-3">
                  <label className="block text-xs font-bold text-slate-600 mb-1">ค่าใช้จ่ายอื่นๆ / ค่าช่างนอก (บาท)</label>
                  <input
                    type="number"
                    min={0}
                    value={editOtherCost || ''}
                    onChange={e => setEditOtherCost(Math.max(0, Number(e.target.value)))}
                    placeholder="ระบุค่าแรงที่จ้างภายนอก"
                    className="w-full border border-slate-200 bg-white rounded-xl px-3 py-1.5 text-xs outline-none font-mono focus:ring-2 focus:ring-violet-100 focus:border-violet-500"
                  />
                </div>

                <div className="pt-2 flex justify-between items-center text-xs border-t border-slate-200">
                  <span className="font-bold text-slate-700">คำนวณรวมค่าซ่อมบำรุงใหม่:</span>
                  <span className="font-mono font-extrabold text-sm text-violet-700 bg-violet-100 px-3 py-1 rounded-lg">
                    ฿{(editingLog.partCost + (editOtherCost || 0)).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingLog(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  {isSubmitting ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle className="h-3.5 w-3.5" />
                  )}
                  <span>{isSubmitting ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* กล่องเปิดดูภาพขยายใหญ่ (Lightbox Modal) */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
          onClick={() => setZoomedImage(null)}
        >
          <div 
            className="bg-white rounded-2xl p-4 max-w-lg w-full shadow-2xl border border-slate-200 flex flex-col relative animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setZoomedImage(null)}
              className="absolute right-4 top-4 bg-slate-900/60 hover:bg-slate-900 text-white p-2 rounded-full transition-all cursor-pointer z-10"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="rounded-xl overflow-hidden bg-slate-900 max-h-[70vh] flex items-center justify-center border border-slate-100">
              <img 
                src={zoomedImage.url} 
                alt={zoomedImage.name} 
                referrerPolicy="no-referrer"
                className="max-w-full max-h-[60vh] object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = 'https://placehold.co/400x300?text=No+Image+Available';
                }}
              />
            </div>
            <div className="mt-3 text-center">
              <h4 className="font-bold text-sm text-slate-900 font-sans">{zoomedImage.name}</h4>
              <p className="text-xs text-slate-500 mt-1">รูปถ่ายประกอบประวัติงานซ่อม</p>
            </div>
          </div>
        </div>
      )}

      {/* โมดอลเปิดดูรายงาน A4 ประวัติการซ่อมแบบพิมพ์ */}
      {historyModalEqId && (
        <EquipmentHistoryModal
          isOpen={!!historyModalEqId}
          onClose={() => setHistoryModalEqId(null)}
          initialEquipmentId={historyModalEqId}
          equipments={equipments}
          maintenanceLogs={maintenanceLogs}
          parts={parts}
        />
      )}
    </div>
  );
}
