import React, { useState } from 'react';
import { Equipment, MaintenanceLog, SparePart } from '../types';
import { 
  Wrench, Plus, Search, Calendar, DollarSign, ShieldAlert, Cpu, Settings, Edit, 
  X, Upload, Image, Link, BarChart2, TrendingUp, Maximize2, FileText, AlertTriangle, 
  CheckCircle, ArrowRightLeft, RefreshCw, Camera, Eye
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';

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
  const [activeSubTab, setActiveSubTab] = useState<'logs' | 'analytics'>('logs');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddLogForm, setShowAddLogForm] = useState(false);

  // Form states
  const [selectedEqId, setSelectedEqId] = useState('');
  const [repairDetail, setRepairDetail] = useState('');
  const [selectedPartId, setSelectedPartId] = useState('');
  const [partQty, setPartQty] = useState<number>(0);
  const [otherCost, setOtherCost] = useState<number>(0);
  const [technician, setTechnician] = useState('');
  const [formError, setFormError] = useState('');

  // Form Image states
  const [imageInputMethod, setImageInputMethod] = useState<'upload' | 'url'>('upload');
  const [imageUrl, setImageUrl] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Edit states
  const [editingLog, setEditingLog] = useState<MaintenanceLog | null>(null);
  const [editRepairDetail, setEditRepairDetail] = useState('');
  const [editOtherCost, setEditOtherCost] = useState<number>(0);
  const [editTechnician, setEditTechnician] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editImageInputMethod, setEditImageInputMethod] = useState<'upload' | 'url'>('upload');
  const [isEditingUploadingImage, setIsEditingUploadingImage] = useState(false);
  const [editError, setEditError] = useState('');

  // Lightbox Zoom state
  const [zoomedImage, setZoomedImage] = useState<{ url: string; name: string } | null>(null);

  // Helper: Image Resizer & Compressor (JPG, 400x400 max, 0.65 quality)
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 400;
          const MAX_HEIGHT = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.65);
            resolve(dataUrl);
          } else {
            resolve(event.target?.result as string);
          }
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleFileChange = async (file: File, isEdit: boolean) => {
    try {
      if (isEdit) {
        setIsEditingUploadingImage(true);
        const compressed = await compressImage(file);
        setEditImageUrl(compressed);
      } else {
        setIsUploadingImage(true);
        const compressed = await compressImage(file);
        setImageUrl(compressed);
      }
    } catch (err) {
      console.error('Error compressing image:', err);
    } finally {
      if (isEdit) {
        setIsEditingUploadingImage(false);
      } else {
        setIsUploadingImage(false);
      }
    }
  };

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
    setEditImageInputMethod(log.imageUrl?.startsWith('data:') ? 'upload' : 'url');
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
          <div className="bg-slate-100 p-1 rounded-xl flex border border-slate-200 self-start lg:self-auto shadow-sm">
            <button
              onClick={() => setActiveSubTab('logs')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
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
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
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
                    ระบบแนบรูปถ่ายประกอบการซ่อม (Repair Log Photo Attachment)
                  </span>

                  {/* Input method toggle */}
                  <div className="flex gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setImageInputMethod('upload')}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        imageInputMethod === 'upload' 
                          ? 'bg-violet-600 text-white' 
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Upload className="h-3 w-3" />
                      <span>อัปโหลดภาพถ่ายตรงนี้ (บีบอัดลื่นไหล)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageInputMethod('url')}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        imageInputMethod === 'url' 
                          ? 'bg-violet-600 text-white' 
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Link className="h-3 w-3" />
                      <span>วางลิงก์รูปภาพ (Google Drive หรือ URL อื่นๆ)</span>
                    </button>
                  </div>

                  {imageInputMethod === 'upload' ? (
                    <div className="space-y-3">
                      {/* Hidden file inputs */}
                      <input 
                        type="file" 
                        id="repair-image-upload" 
                        accept="image/*" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileChange(file, false);
                        }}
                        className="hidden" 
                      />
                      <input 
                        type="file" 
                        id="repair-image-camera" 
                        accept="image/*" 
                        capture="environment"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileChange(file, false);
                        }}
                        className="hidden" 
                      />

                      {isUploadingImage ? (
                        <div className="border border-dashed border-slate-300 rounded-xl p-6 text-center bg-slate-50/50">
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <RefreshCw className="h-6 w-6 text-violet-600 animate-spin" />
                            <span className="text-xs text-slate-500 font-sans font-semibold">กำลังโหลดและย่อขนาดภาพเพื่อประหยัดพื้นที่คลัง...</span>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Option 1: Live Camera snip */}
                          <label 
                            htmlFor="repair-image-camera"
                            className="border-2 border-dashed border-slate-300 hover:border-violet-500 hover:bg-violet-50/20 rounded-xl p-4 text-center cursor-pointer flex flex-col items-center justify-center gap-1.5 transition-all group active:scale-[0.98]"
                          >
                            <div className="h-10 w-10 bg-violet-50 text-violet-600 rounded-full flex items-center justify-center group-hover:bg-violet-100 group-hover:text-violet-700 transition-colors">
                              <Camera className="h-5 w-5" />
                            </div>
                            <span className="text-xs font-bold text-slate-700 block">เปิดกล้องถ่ายภาพทันที</span>
                            <span className="text-[10px] text-slate-400 font-sans block">ใช้กล้องมือถือถ่ายภาพสด ณ ขณะนั้น</span>
                          </label>

                          {/* Option 2: Upload existing file */}
                          <label 
                            htmlFor="repair-image-upload"
                            className="border-2 border-dashed border-slate-300 hover:border-violet-500 hover:bg-violet-50/20 rounded-xl p-4 text-center cursor-pointer flex flex-col items-center justify-center gap-1.5 transition-all group active:scale-[0.98]"
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              e.preventDefault();
                              const file = e.dataTransfer.files?.[0];
                              if (file) handleFileChange(file, false);
                            }}
                          >
                            <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center group-hover:bg-indigo-100 group-hover:text-indigo-700 transition-colors">
                              <Upload className="h-5 w-5" />
                            </div>
                            <span className="text-xs font-bold text-slate-700 block">เลือกรูปภาพจากคลังภาพ / ไฟล์</span>
                            <span className="text-[10px] text-slate-400 font-sans block">เลือกจากอัลบั้มหรือลากและวางรูปภาพ</span>
                          </label>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <input
                        type="url"
                        placeholder="วางที่อยู่ลิงก์รูปภาพ เช่น ลิงก์ที่แชร์จาก Google Drive..."
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        className="w-full border border-slate-200 bg-white rounded-xl px-3 py-2 text-xs outline-none font-sans focus:ring-2 focus:ring-violet-100"
                      />
                    </div>
                  )}

                  {/* Image Preview & Actions */}
                  {imageUrl && (
                    <div className="flex items-center gap-3 p-2 bg-white rounded-xl border border-slate-150 relative">
                      <img 
                        src={getEmbeddableImageUrl(imageUrl)} 
                        alt="Preview" 
                        referrerPolicy="no-referrer"
                        className="w-16 h-16 object-cover rounded-lg border border-slate-200"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = 'https://placehold.co/100?text=Invalid+Image+URL';
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-bold text-slate-400 block font-mono">ATTACHED IMAGE</span>
                        <p className="text-xs text-slate-700 truncate font-mono">{imageUrl}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setImageUrl('')}
                        className="text-slate-400 hover:text-rose-600 hover:bg-slate-100 p-1.5 rounded-lg transition-all cursor-pointer"
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
                  แก้ไขรูปถ่ายประกอบการซ่อม (Repair Log Photo Attachment)
                </span>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditImageInputMethod('upload')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      editImageInputMethod === 'upload' 
                        ? 'bg-violet-600 text-white' 
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Upload className="h-3 w-3" />
                    <span>อัปโหลดภาพ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditImageInputMethod('url')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      editImageInputMethod === 'url' 
                        ? 'bg-violet-600 text-white' 
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Link className="h-3 w-3" />
                    <span>วางลิงก์ (URL)</span>
                  </button>
                </div>

                {editImageInputMethod === 'upload' ? (
                  <div className="space-y-3">
                    <input 
                      type="file" 
                      id="edit-repair-image-upload" 
                      accept="image/*" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileChange(file, true);
                      }}
                      className="hidden" 
                    />
                    <input 
                      type="file" 
                      id="edit-repair-image-camera" 
                      accept="image/*" 
                      capture="environment"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileChange(file, true);
                      }}
                      className="hidden" 
                    />

                    {isEditingUploadingImage ? (
                      <div className="border border-dashed border-slate-200 rounded-xl p-4 bg-slate-50 flex items-center justify-center">
                        <RefreshCw className="h-5 w-5 text-violet-600 animate-spin" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <label 
                          htmlFor="edit-repair-image-camera"
                          className="border border-dashed border-slate-300 hover:border-violet-500 hover:bg-violet-50/20 rounded-xl p-3 text-center cursor-pointer flex flex-col items-center justify-center gap-1 transition-all group text-slate-600"
                        >
                          <Camera className="h-4 w-4 text-slate-400 group-hover:text-violet-600" />
                          <span className="text-[11px] font-bold">ถ่ายรูปใหม่จากกล้อง</span>
                        </label>
                        
                        <label 
                          htmlFor="edit-repair-image-upload"
                          className="border border-dashed border-slate-300 hover:border-indigo-500 hover:bg-indigo-50/20 rounded-xl p-3 text-center cursor-pointer flex flex-col items-center justify-center gap-1 transition-all group text-slate-600"
                        >
                          <Upload className="h-4 w-4 text-slate-400 group-hover:text-indigo-600" />
                          <span className="text-[11px] font-bold">เลือกจากอัลบั้มรูป</span>
                        </label>
                      </div>
                    )}
                  </div>
                ) : (
                  <input
                    type="url"
                    placeholder="วางลิงก์รูปภาพ..."
                    value={editImageUrl}
                    onChange={(e) => setEditImageUrl(e.target.value)}
                    className="w-full border border-slate-200 bg-white rounded-xl px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-violet-100"
                  />
                )}

                {editImageUrl && (
                  <div className="flex items-center gap-3 p-2 bg-white rounded-xl border border-slate-150">
                    <img 
                      src={getEmbeddableImageUrl(editImageUrl)} 
                      alt="Edit Preview" 
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 object-cover rounded-lg border border-slate-200"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-slate-400 truncate font-mono">{editImageUrl}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditImageUrl('')}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition-all"
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
    </div>
  );
}
