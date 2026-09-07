import React, { useState } from 'react';
import { SparePart, Transaction, Equipment, MaintenanceLog } from '../types';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { 
  TriangleAlert, 
  CheckCircle2, 
  TrendingUp, 
  History, 
  Cpu, 
  Wrench, 
  Coins, 
  Sparkles,
  AlertOctagon,
  ArrowRight,
  Banknote,
  Calendar,
  FileText,
  Printer,
  ChevronRight,
  Filter,
  Search,
  PackagePlus,
  PackageMinus,
  ArrowUpRight,
  ArrowDownLeft,
  Activity,
  RefreshCw,
  BarChart3
} from 'lucide-react';
import { extractMonthKey, formatThaiMonth, parseDateToTimestamp } from '../utils/dateUtils';
import EquipmentHistoryModal from './EquipmentHistoryModal';

interface DashboardTabProps {
  parts: SparePart[];
  transactions: Transaction[];
  onQuickAction: (partId: string) => void;
  equipments: Equipment[];
  maintenanceLogs: MaintenanceLog[];
}

export default function DashboardTab({ 
  parts, 
  transactions, 
  onQuickAction, 
  equipments, 
  maintenanceLogs 
}: DashboardTabProps) {
  
  // State for Maintenance Dashboard Filters
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [selectedEqFilter, setSelectedEqFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [searchRepairKeyword, setSearchRepairKeyword] = useState<string>('');
  
  // State for Spare Part Movement Section
  const [movementTab, setMovementTab] = useState<'withdraw' | 'restock' | 'trend'>('withdraw');
  const [movementSearch, setMovementSearch] = useState<string>('');

  // State for Equipment History Modal
  const [historyModalEqId, setHistoryModalEqId] = useState<string | null>(null);

  // ==================== 1. คำนวณสรุปตัวเลขคลังอะไหล่สำรอง ====================
  const totalItemTypes = parts.length;
  const totalPieces = parts.reduce((acc, curr) => acc + curr.quantity, 0);
  const totalInventoryValue = parts.reduce((acc, curr) => acc + ((curr.price || 0) * curr.quantity), 0);
  
  // รายการที่ต่ำกว่า Min_Stock
  const lowStockParts = parts.filter(p => p.quantity < p.minStock);
  const lowStockCount = lowStockParts.length;

  // เปอร์เซ็นต์ความพร้อมสต็อก (Health Rate)
  const healthPct = totalItemTypes > 0 ? Math.round(((totalItemTypes - lowStockCount) / totalItemTypes) * 100) : 100;

  // จัดกลุ่มข้อมูลหมวดหมู่เพื่อส่งให้กราฟวงกลม Recharts
  const categorySummary: { [key: string]: number } = {
    'เครื่องแพ็ค': 0,
    'ปืนลมยิงตะปู': 0,
    'อุปกรณ์ทั่วไป': 0
  };

  parts.forEach(part => {
    if (categorySummary[part.category] !== undefined) {
      categorySummary[part.category] += 1;
    } else {
      categorySummary[part.category] = 1;
    }
  });

  const pieChartData = Object.keys(categorySummary).map(key => ({
    name: key,
    value: categorySummary[key]
  })).filter(item => item.value > 0);

  const PIE_COLORS: { [key: string]: string } = {
    'เครื่องแพ็ค': '#2563eb', // Blue-600
    'ปืนลมยิงตะปู': '#dc2626', // Red-600
    'อุปกรณ์ทั่วไป': '#d97706' // Amber-600
  };

  // หลากหลายสีสันสำหรับสัดส่วนของหมวดหมู่
  const DIVERSE_COLORS = [
    '#2563eb', '#dc2626', '#d97706', '#10b981', '#8b5cf6', 
    '#ec4899', '#06b6d4', '#f43f5e', '#a855f7', '#14b8a6'
  ];

  const getPieCellColor = (name: string, index: number) => {
    if (PIE_COLORS[name]) {
      return PIE_COLORS[name];
    }
    return DIVERSE_COLORS[index % DIVERSE_COLORS.length];
  };

  // ==================== 2. กรองข้อมูลตามเดือนสำหรับประวัติการซ่อมและประวัติอะไหล่ ====================
  const availableMonths = Array.from(
    new Set([
      ...maintenanceLogs.map(log => extractMonthKey(log.date)),
      ...transactions.map(tx => extractMonthKey(tx.timestamp))
    ].filter(Boolean))
  ).sort((a, b) => b.localeCompare(a));

  // ==================== 3. คำนวณความเคลื่อนไหวการเบิก & เติม Stock อะไหล่รายเดือน ====================
  const activeTransactions = transactions.filter(tx => {
    if (selectedMonth !== 'ALL' && extractMonthKey(tx.timestamp) !== selectedMonth) {
      return false;
    }
    return true;
  });

  const withdrawTxs = activeTransactions.filter(tx => tx.type === 'เบิกจ่าย');
  const totalWithdrawQty = withdrawTxs.reduce((sum, tx) => sum + tx.quantity, 0);
  const totalWithdrawValue = withdrawTxs.reduce((sum, tx) => {
    const part = parts.find(p => p.id === tx.partId);
    return sum + (tx.quantity * (part?.price || 0));
  }, 0);

  const restockTxs = activeTransactions.filter(tx => tx.type === 'รับเข้า');
  const totalRestockQty = restockTxs.reduce((sum, tx) => sum + tx.quantity, 0);
  const totalRestockValue = restockTxs.reduce((sum, tx) => {
    const part = parts.find(p => p.id === tx.partId);
    return sum + (tx.quantity * (part?.price || 0));
  }, 0);

  const netQtyMovement = totalRestockQty - totalWithdrawQty;

  // รวบรวมสถิติความเคลื่อนไหวแยกรายรหัสอะไหล่สำหรับเดือนที่เลือก
  interface PartMovementSummary {
    partId: string;
    partName: string;
    category: string;
    unit: string;
    price: number;
    totalWithdrawn: number;
    totalRestocked: number;
    withdrawnValue: number;
    restockedValue: number;
    withdrawCount: number;
    restockCount: number;
    lastTechnician: string;
    lastTimestamp: string;
    lastRestockTimestamp: string;
    lastRestockTimeMs: number;
    lastRestockTechnician: string;
    lastWithdrawTimestamp: string;
    lastWithdrawTimeMs: number;
    lastWithdrawTechnician: string;
    machineNote: string;
  }

  const partMovementMap = new Map<string, PartMovementSummary>();

  activeTransactions.forEach(tx => {
    const matchedPart = parts.find(p => p.id === tx.partId);
    const existing = partMovementMap.get(tx.partId) || {
      partId: tx.partId,
      partName: tx.partName || matchedPart?.name || tx.partId,
      category: matchedPart?.category || 'ทั่วไป',
      unit: matchedPart?.unit || 'ชิ้น',
      price: matchedPart?.price || 0,
      totalWithdrawn: 0,
      totalRestocked: 0,
      withdrawnValue: 0,
      restockedValue: 0,
      withdrawCount: 0,
      restockCount: 0,
      lastTechnician: tx.technician || '-',
      lastTimestamp: tx.timestamp || '-',
      lastRestockTimestamp: '-',
      lastRestockTimeMs: 0,
      lastRestockTechnician: '-',
      lastWithdrawTimestamp: '-',
      lastWithdrawTimeMs: 0,
      lastWithdrawTechnician: '-',
      machineNote: tx.machineNote || '-'
    };

    const unitPrice = matchedPart?.price || 0;
    const txTime = parseDateToTimestamp(tx.timestamp);

    if (tx.type === 'เบิกจ่าย') {
      existing.totalWithdrawn += tx.quantity;
      existing.withdrawnValue += tx.quantity * unitPrice;
      existing.withdrawCount += 1;
      if (txTime >= existing.lastWithdrawTimeMs) {
        existing.lastWithdrawTimeMs = txTime;
        existing.lastWithdrawTimestamp = tx.timestamp || existing.lastWithdrawTimestamp;
        existing.lastWithdrawTechnician = tx.technician || existing.lastWithdrawTechnician;
        if (tx.machineNote) {
          existing.machineNote = tx.machineNote;
        }
      }
    } else if (tx.type === 'รับเข้า') {
      existing.totalRestocked += tx.quantity;
      existing.restockedValue += tx.quantity * unitPrice;
      existing.restockCount += 1;
      if (txTime >= existing.lastRestockTimeMs) {
        existing.lastRestockTimeMs = txTime;
        existing.lastRestockTimestamp = tx.timestamp || existing.lastRestockTimestamp;
        existing.lastRestockTechnician = tx.technician || existing.lastRestockTechnician;
      }
    }

    if (txTime >= parseDateToTimestamp(existing.lastTimestamp)) {
      existing.lastTimestamp = tx.timestamp || existing.lastTimestamp;
      existing.lastTechnician = tx.technician || existing.lastTechnician;
    }

    partMovementMap.set(tx.partId, existing);
  });

  const allMonthlyPartMovements = Array.from(partMovementMap.values());

  const filteredPartMovements = allMonthlyPartMovements.filter(pm => {
    if (!movementSearch.trim()) return true;
    const q = movementSearch.toLowerCase();
    return (
      pm.partId.toLowerCase().includes(q) ||
      pm.partName.toLowerCase().includes(q) ||
      pm.category.toLowerCase().includes(q) ||
      pm.lastTechnician.toLowerCase().includes(q) ||
      pm.lastRestockTechnician.toLowerCase().includes(q) ||
      pm.lastRestockTimestamp.toLowerCase().includes(q) ||
      pm.machineNote.toLowerCase().includes(q)
    );
  });

  // รายการเบิกอะไหล่ เรียงลำดับตามวันเวลาเบิกล่าสุดขึ้นก่อน
  const withdrawnPartsList = filteredPartMovements
    .filter(pm => pm.totalWithdrawn > 0)
    .sort((a, b) => {
      const diff = b.lastWithdrawTimeMs - a.lastWithdrawTimeMs;
      if (diff !== 0) return diff;
      return b.totalWithdrawn - a.totalWithdrawn;
    });

  // รายการเติมสต็อกอะไหล่ เรียงลำดับตามวันเวลาเติมสต็อกล่าสุดขึ้นก่อนเสมอ (วันล่าสุดอยู่บนสุด และไล่ลำดับตามวันเวลา)
  const restockedPartsList = filteredPartMovements
    .filter(pm => pm.totalRestocked > 0)
    .sort((a, b) => {
      const diff = b.lastRestockTimeMs - a.lastRestockTimeMs;
      if (diff !== 0) return diff;
      return b.totalRestocked - a.totalRestocked;
    });

  // ข้อมูลกราฟเปรียบเทียบแนวโน้มเบิกจ่าย vs รับเข้า รายเดือน
  const monthlyComparisonData = availableMonths.slice(0, 12).reverse().map(mKey => {
    const txs = transactions.filter(tx => extractMonthKey(tx.timestamp) === mKey);
    const withdrawn = txs.filter(tx => tx.type === 'เบิกจ่าย').reduce((s, tx) => s + tx.quantity, 0);
    const restocked = txs.filter(tx => tx.type === 'รับเข้า').reduce((s, tx) => s + tx.quantity, 0);
    const withdrawnValue = txs.filter(tx => tx.type === 'เบิกจ่าย').reduce((s, tx) => {
      const p = parts.find(part => part.id === tx.partId);
      return s + (tx.quantity * (p?.price || 0));
    }, 0);
    const restockedValue = txs.filter(tx => tx.type === 'รับเข้า').reduce((s, tx) => {
      const p = parts.find(part => part.id === tx.partId);
      return s + (tx.quantity * (p?.price || 0));
    }, 0);

    return {
      monthKey: mKey,
      monthName: formatThaiMonth(mKey).replace(/ \(\d{2}\/\d{4}\)/, ''),
      totalWithdrawn: withdrawn,
      totalRestocked: restocked,
      withdrawnValue,
      restockedValue
    };
  });

  // 1) Filter logs by Month, Equipment ID, and Search Keyword
  const activeLogs = maintenanceLogs.filter(log => {
    // Month filter
    if (selectedMonth !== 'ALL' && extractMonthKey(log.date) !== selectedMonth) {
      return false;
    }
    // Equipment filter
    if (selectedEqFilter !== 'ALL' && log.equipmentId !== selectedEqFilter) {
      return false;
    }
    // Search keyword
    if (searchRepairKeyword.trim()) {
      const q = searchRepairKeyword.toLowerCase();
      const matchTech = (log.technician || '').toLowerCase().includes(q);
      const matchDetail = (log.repairDetail || '').toLowerCase().includes(q);
      const matchEq = (log.equipmentId || '').toLowerCase().includes(q);
      const matchPart = (log.partUsedId || '').toLowerCase().includes(q);
      if (!matchTech && !matchDetail && !matchEq && !matchPart) {
        return false;
      }
    }
    return true;
  });

  const totalMachines = equipments.length;
  const totalRepairLogs = activeLogs.length;
  const totalRepairExpense = activeLogs.reduce((sum, log) => sum + log.totalCost, 0);

  // คำนวณอัตราส่วนค่าใช้จ่ายต่อตัวเครื่องจักร ตามช่วงเดือนและตัวกรองที่เลือก
  const machineAnalysisData = equipments
    .filter(eq => selectedEqFilter === 'ALL' || eq.id === selectedEqFilter)
    .map(eq => {
      const logs = activeLogs.filter(log => log.equipmentId === eq.id);
      const accumulatedCost = logs.reduce((sum, log) => sum + log.totalCost, 0);
      const repairCount = logs.length;
      
      // อัตราส่วนความคุ้มค่า (%) = (ค่าซ่อมสะสม / ราคาเครื่องแรกซื้อ) * 100
      const ratio = eq.purchasePrice > 0 ? Math.round((accumulatedCost / eq.purchasePrice) * 100) : 0;
      
      let rating = 'คุ้มค่าดีเยี่ยม';
      let ratingColor = 'text-emerald-600 bg-emerald-50 border-emerald-200';
      let severity = 1;

      if (ratio > 80) {
        rating = 'ไม่คุ้มค่าซ่อม (ควรเปลี่ยนเครื่องใหม่)';
        ratingColor = 'text-rose-600 bg-rose-50 border-rose-200 font-bold';
        severity = 3;
      } else if (ratio > 50) {
        rating = 'ซ่อมสะสมเริ่มสูง (ควรเฝ้าระวัง)';
        ratingColor = 'text-orange-600 bg-orange-50 border-orange-200';
        severity = 2;
      } else if (ratio > 20) {
        rating = 'ปานกลาง (ปกติ)';
        ratingColor = 'text-amber-600 bg-amber-50 border-amber-200';
        severity = 1;
      }

      return {
        id: eq.id,
        name: eq.name,
        location: eq.location,
        purchasePrice: eq.purchasePrice,
        maxBudget: eq.maxRepairBudget,
        accumulatedCost,
        repairCount,
        ratio,
        rating,
        ratingColor,
        severity
      };
    })
    .filter(m => {
      if (selectedStatusFilter === 'CRITICAL') return m.ratio > 80;
      if (selectedStatusFilter === 'WARNING') return m.ratio > 50 && m.ratio <= 80;
      if (selectedStatusFilter === 'NORMAL') return m.ratio <= 50;
      return true;
    });

  const sortedMachineAnalysis = [...machineAnalysisData].sort((a, b) => b.ratio - a.ratio);
  const criticalMachinesCount = machineAnalysisData.filter(m => m.ratio > 80).length;

  const isAnyFilterActive = selectedMonth !== 'ALL' || selectedEqFilter !== 'ALL' || selectedStatusFilter !== 'ALL' || searchRepairKeyword.trim() !== '';

  const handleResetFilters = () => {
    setSelectedMonth('ALL');
    setSelectedEqFilter('ALL');
    setSelectedStatusFilter('ALL');
    setSearchRepairKeyword('');
  };

  return (
    <div className="space-y-6">
      
      {/* ==================== แถบ Filter งานซ่อมบำรุงและวิเคราะห์เครื่องจักร (Maintenance Filter Bar) ==================== */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-md space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100 shrink-0">
              <Filter className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 font-display flex items-center gap-2">
                ตัวกรองระบบงานซ่อมบำรุง & วิเคราะห์สินทรัพย์ (Maintenance Filter)
              </h3>
              <p className="text-xs text-slate-500 font-sans">
                กรองข้อมูลรายงานตามช่วงเวลา รหัสเครื่องจักร สถานะความเสี่ยง หรือค้นหาช่างซ่อม
              </p>
            </div>
          </div>

          {isAnyFilterActive && (
            <button
              onClick={handleResetFilters}
              className="text-xs font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-3.5 py-1.5 rounded-xl border border-rose-200 transition-all self-end md:self-auto cursor-pointer flex items-center gap-1.5"
            >
              <span>ล้างตัวกรองทั้งหมด</span>
            </button>
          )}
        </div>

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* 1. Filter Month */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1 font-sans">
              <Calendar className="h-3.5 w-3.5 text-indigo-500" />
              กรองช่วงเดือน:
            </label>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none shadow-2xs font-sans"
            >
              <option value="ALL">ทุกช่วงเวลา (All Time)</option>
              {availableMonths.map(m => (
                <option key={m} value={m}>
                  {formatThaiMonth(m)}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Filter Equipment */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1 font-sans">
              <Cpu className="h-3.5 w-3.5 text-blue-500" />
              กรองเครื่องจักร:
            </label>
            <select
              value={selectedEqFilter}
              onChange={e => setSelectedEqFilter(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none shadow-2xs font-sans truncate"
            >
              <option value="ALL">เครื่องจักรทั้งหมด ({equipments.length} เครื่อง)</option>
              {equipments.map(eq => (
                <option key={eq.id} value={eq.id}>
                  {eq.id} - {eq.name}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Filter Status */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1 font-sans">
              <AlertOctagon className="h-3.5 w-3.5 text-amber-500" />
              สถานะความคุ้มค่าซ่อม:
            </label>
            <select
              value={selectedStatusFilter}
              onChange={e => setSelectedStatusFilter(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none shadow-2xs font-sans"
            >
              <option value="ALL">ทุกระดับความคุ้มค่า</option>
              <option value="CRITICAL">🔴 วิกฤต - ไม่คุ้มซ่อม (&gt;80%)</option>
              <option value="WARNING">🟠 เฝ้าระวัง - ค่าซ่อมสูง (&gt;50%)</option>
              <option value="NORMAL">🟢 ปกติ/คุ้มค่าดี (&le;50%)</option>
            </select>
          </div>

          {/* 4. Search Keyword */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1 font-sans">
              <Search className="h-3.5 w-3.5 text-slate-500" />
              ค้นหาช่าง / อาการเสีย:
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchRepairKeyword}
                onChange={e => setSearchRepairKeyword(e.target.value)}
                placeholder="ระบุชื่อช่าง, อาการ, รหัส..."
                className="w-full border border-slate-300 rounded-xl pl-8 pr-3 py-2 text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none shadow-2xs font-sans placeholder:font-normal placeholder:text-slate-400"
              />
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>

        </div>
      </div>
      
      {/* ==================== แถวสถิติ Bento Grid: อะไหล่ & เครื่องจักรซ่อมแซม ==================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* บล็อก 1: จำนวนรหัสอะไหล่ */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-md border-l-4 border-l-blue-500 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">คลังอะไหล่สำรอง</p>
            <h2 className="text-2xl font-bold text-slate-900 font-mono">{totalItemTypes} รหัส</h2>
            <p className="text-[11px] text-slate-500 font-sans">รวม {totalPieces.toLocaleString()} ชิ้นในคลัง</p>
          </div>
          <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100 shadow-sm">
            <History className="h-6 w-6 stroke-[1.5]" />
          </div>
        </div>

        {/* บล็อก 1.5: ต้นทุนคลังอะไหล่ทั้งหมด */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-md border-l-4 border-l-emerald-500 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">ต้นทุนคลังอะไหล่ทั้งหมด</p>
            <h2 className="text-2xl font-bold text-emerald-600 font-mono">฿{totalInventoryValue.toLocaleString()}</h2>
            <p className="text-[11px] text-slate-500 font-sans">มูลค่ารวมของอะไหล่คงคลัง</p>
          </div>
          <div className="h-12 w-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100 shadow-sm">
            <Banknote className="h-6 w-6 stroke-[1.5]" />
          </div>
        </div>

        {/* บล็อก 2: สต็อกด่วน */}
        <div className={`rounded-2xl p-5 border shadow-md flex items-center justify-between border-l-4 transition-all ${
          lowStockCount > 0 
            ? 'bg-rose-50/50 border-rose-200 text-rose-950 border-l-rose-600' 
            : 'bg-white border-slate-200 text-slate-900 border-l-slate-400'
        }`}>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">ต้องสั่งซื้ออะไหล่ด่วน</p>
            <h2 className={`text-2xl font-bold font-mono ${lowStockCount > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-900'}`}>
              {lowStockCount} ชิ้น
            </h2>
            <p className="text-[11px] text-slate-500 font-sans">ต่ำกว่าเกณฑ์ Min Stock</p>
          </div>
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center border ${
            lowStockCount > 0 ? 'bg-rose-100 border-rose-200 text-rose-600' : 'bg-slate-100 border-slate-200 text-slate-500'
          }`}>
            <TriangleAlert className="h-6 w-6 stroke-[1.5]" />
          </div>
        </div>

        {/* บล็อก 3: ทะเบียนเครื่องจักร */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-md border-l-4 border-l-violet-500 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">เครื่องจักรคุมคลัง</p>
            <h2 className="text-2xl font-bold text-violet-700 font-mono">{totalMachines} เครื่อง</h2>
            <p className="text-[11px] text-slate-500 font-sans">ประวัติซ่อม {totalRepairLogs} ครั้งสะสม</p>
          </div>
          <div className="h-12 w-12 bg-violet-50 text-violet-600 rounded-xl flex items-center justify-center border border-violet-100 shadow-sm">
            <Cpu className="h-6 w-6 stroke-[1.5]" />
          </div>
        </div>

        {/* บล็อก 4: ค่าซ่อมบำรุงสะสมทั้งหมด */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-md border-l-4 border-l-amber-500 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">ค่าซ่อมแซมสะสมทั้งหมด</p>
            <h2 className="text-2xl font-bold text-amber-600 font-mono">฿{totalRepairExpense.toLocaleString()}</h2>
            <p className="text-[11px] text-slate-500 font-sans">
              {criticalMachinesCount > 0 
                ? `⚠️ มีเครื่องซ่อมบอบช้ำวิกฤต ${criticalMachinesCount} เครื่อง` 
                : '🟢 งบซ่อมโดยรวมปกติ คุ้มค่าดี'}
            </p>
          </div>
          <div className="h-12 w-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center border border-amber-100 shadow-sm">
            <Coins className="h-6 w-6 stroke-[1.5]" />
          </div>
        </div>

      </div>

      {/* ==================== รายงานความเคลื่อนไหวการเบิก & เติม Stock อะไหล่รายเดือน (Monthly Spare Parts Movement) ==================== */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-lg space-y-5">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100 shrink-0">
              <PackageMinus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-display flex items-center gap-2">
                ความเคลื่อนไหวการเบิก & เติม Stock อะไหล่รายเดือน (Monthly Parts Movement)
              </h3>
              <p className="text-xs text-slate-500 font-sans">
                สรุปการเบิกอะไหล่ไปใช้งานและการเติม Stock อะไหล่เข้าคลัง ประจำช่วงเดือน: <span className="font-bold text-slate-700">{formatThaiMonth(selectedMonth)}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 font-mono flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-indigo-500" />
              {selectedMonth === 'ALL' ? 'ทุกช่วงเวลา (All Time)' : formatThaiMonth(selectedMonth)}
            </span>
          </div>
        </div>

        {/* 3 Summary Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          {/* Withdrawn Metric */}
          <div className="bg-rose-50/70 rounded-2xl p-4 border border-rose-200/80 flex items-center justify-between shadow-2xs">
            <div className="space-y-1">
              <p className="text-[11px] font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1 font-sans">
                <ArrowDownLeft className="h-3.5 w-3.5 text-rose-600" />
                ยอดเบิกจ่ายอะไหล่รวม
              </p>
              <h4 className="text-2xl font-bold font-mono text-rose-700">
                {totalWithdrawQty.toLocaleString()} <span className="text-xs font-normal font-sans">ชิ้น</span>
              </h4>
              <p className="text-[11px] text-rose-600/90 font-sans font-medium">
                {withdrawnPartsList.length} รายการรหัส | มูลค่า ฿{totalWithdrawValue.toLocaleString()}
              </p>
            </div>
            <div className="h-11 w-11 bg-rose-100/80 text-rose-600 rounded-xl flex items-center justify-center border border-rose-200 shrink-0">
              <PackageMinus className="h-5 w-5" />
            </div>
          </div>

          {/* Restocked Metric */}
          <div className="bg-emerald-50/70 rounded-2xl p-4 border border-emerald-200/80 flex items-center justify-between shadow-2xs">
            <div className="space-y-1">
              <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1 font-sans">
                <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
                ยอดเติม Stock อะไหล่รวม
              </p>
              <h4 className="text-2xl font-bold font-mono text-emerald-700">
                {totalRestockQty.toLocaleString()} <span className="text-xs font-normal font-sans">ชิ้น</span>
              </h4>
              <p className="text-[11px] text-emerald-600/90 font-sans font-medium">
                {restockedPartsList.length} รายการรหัส | มูลค่า ฿{totalRestockValue.toLocaleString()}
              </p>
            </div>
            <div className="h-11 w-11 bg-emerald-100/80 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-200 shrink-0">
              <PackagePlus className="h-5 w-5" />
            </div>
          </div>

          {/* Net Movement Metric */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex items-center justify-between shadow-2xs">
            <div className="space-y-1">
              <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1 font-sans">
                <Activity className="h-3.5 w-3.5 text-slate-500" />
                ผลต่างสุทธิ (Net Delta)
              </p>
              <h4 className={`text-2xl font-bold font-mono ${netQtyMovement >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {netQtyMovement >= 0 ? `+${netQtyMovement.toLocaleString()}` : netQtyMovement.toLocaleString()} <span className="text-xs font-normal text-slate-500 font-sans">ชิ้น</span>
              </h4>
              <p className="text-[11px] text-slate-500 font-sans font-medium">
                {netQtyMovement >= 0 ? '🟢 เติม Stock เพิ่มขึ้นสุทธิ' : '🔴 เบิกไปใช้มากกว่าการเติม Stock'}
              </p>
            </div>
            <div className="h-11 w-11 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center border border-slate-200 shrink-0">
              <RefreshCw className="h-5 w-5" />
            </div>
          </div>

        </div>

        {/* Tab Controls & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          
          {/* Sub Tab Buttons */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 self-start sm:self-auto overflow-x-auto max-w-full">
            <button
              onClick={() => setMovementTab('withdraw')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                movementTab === 'withdraw'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <PackageMinus className="h-3.5 w-3.5" />
              <span>รายการเบิกอะไหล่ ({withdrawnPartsList.length})</span>
            </button>

            <button
              onClick={() => setMovementTab('restock')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                movementTab === 'restock'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <PackagePlus className="h-3.5 w-3.5" />
              <span>รายการเติม Stock ({restockedPartsList.length})</span>
            </button>

            <button
              onClick={() => setMovementTab('trend')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                movementTab === 'trend'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span>กราฟแนวโน้มเปรียบเทียบ</span>
            </button>
          </div>

          {/* Search Box */}
          {movementTab !== 'trend' && (
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                value={movementSearch}
                onChange={e => setMovementSearch(e.target.value)}
                placeholder="ค้นหารหัส / ชื่ออะไหล่ / ช่าง..."
                className="w-full border border-slate-300 rounded-xl pl-8 pr-3 py-1.5 text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none shadow-2xs font-sans placeholder:font-normal placeholder:text-slate-400"
              />
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2 pointer-events-none" />
            </div>
          )}

        </div>

        {/* Tab 1: Withdrawn Parts Table */}
        {movementTab === 'withdraw' && (
          <div className="space-y-3">
            <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-xl overflow-hidden shadow-inner bg-slate-50/50">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead>
                  <tr className="bg-rose-100/70 text-rose-900 font-bold border-b border-rose-200">
                    <th className="py-2.5 px-3">รหัสอะไหล่</th>
                    <th className="py-2.5 px-3">ชื่ออะไหล่</th>
                    <th className="py-2.5 px-3">หมวดหมู่</th>
                    <th className="py-2.5 px-3 text-right">จำนวนที่เบิกในเดือนนี้</th>
                    <th className="py-2.5 px-3 text-right">ราคา/หน่วย</th>
                    <th className="py-2.5 px-3 text-right">มูลค่ารวมที่เบิก</th>
                    <th className="py-2.5 px-3">ช่างผู้เบิก/ล่าสุด</th>
                    <th className="py-2.5 px-3">เครื่องจักร / หมายเหตุ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white text-slate-700">
                  {withdrawnPartsList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        {movementSearch.trim() ? 'ไม่พบรายการอะไหล่เบิกจ่ายที่ตรงกับคำค้นหา' : 'ไม่มีรายการเบิกอะไหล่ในช่วงเดือนที่เลือกนี้'}
                      </td>
                    </tr>
                  ) : (
                    withdrawnPartsList.map(pm => (
                      <tr key={pm.partId} className="hover:bg-rose-50/30 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{pm.partId}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{pm.partName}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-semibold">
                            {pm.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600">
                          -{pm.totalWithdrawn} {pm.unit}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                          ฿{pm.price.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                          ฿{pm.withdrawnValue.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-700">
                          {pm.lastWithdrawTechnician !== '-' ? pm.lastWithdrawTechnician : pm.lastTechnician}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px] truncate max-w-[160px]">{pm.machineNote}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Restocked Parts Table */}
        {movementTab === 'restock' && (
          <div className="space-y-3">
            <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-xl overflow-hidden shadow-inner bg-slate-50/50">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead>
                  <tr className="bg-emerald-100/70 text-emerald-900 font-bold border-b border-emerald-200">
                    <th className="py-2.5 px-3">รหัสอะไหล่</th>
                    <th className="py-2.5 px-3">ชื่ออะไหล่</th>
                    <th className="py-2.5 px-3">หมวดหมู่</th>
                    <th className="py-2.5 px-3 text-right">จำนวนที่เติม Stock ในเดือนนี้</th>
                    <th className="py-2.5 px-3 text-right">ราคา/หน่วย</th>
                    <th className="py-2.5 px-3 text-right">มูลค่ารวมที่เติม</th>
                    <th className="py-2.5 px-3">ผู้บันทึก/ช่าง</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span>วันเวลาเติมล่าสุด</span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-200 text-emerald-800 shadow-xs">
                          วันล่าสุดอยู่บน ⬇
                        </span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white text-slate-700">
                  {restockedPartsList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        {movementSearch.trim() ? 'ไม่พบรายการอะไหล่เติม Stock ที่ตรงกับคำค้นหา' : 'ไม่มีรายการเติม Stock อะไหล่ในช่วงเดือนที่เลือกนี้'}
                      </td>
                    </tr>
                  ) : (
                    restockedPartsList.map(pm => (
                      <tr key={pm.partId} className="hover:bg-emerald-50/30 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{pm.partId}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{pm.partName}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-semibold">
                            {pm.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600">
                          +{pm.totalRestocked} {pm.unit}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                          ฿{pm.price.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                          ฿{pm.restockedValue.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-700">
                          {pm.lastRestockTechnician !== '-' ? pm.lastRestockTechnician : pm.lastTechnician}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-emerald-950 font-bold text-[11px] whitespace-nowrap bg-emerald-50/60">
                          {pm.lastRestockTimestamp !== '-' ? pm.lastRestockTimestamp : pm.lastTimestamp}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Monthly Trend Comparison Bar Chart */}
        {movementTab === 'trend' && (
          <div className="space-y-3">
            <div className="h-64">
              {monthlyComparisonData.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-sm text-slate-400 font-sans">ไม่มีข้อมูลประวัติรายการย้อนหลัง</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={monthlyComparisonData}
                    margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="monthName" 
                      tick={{ fontFamily: 'Sarabun', fontSize: 10, fontWeight: 'bold' }} 
                    />
                    <YAxis 
                      tick={{ fontFamily: 'Sarabun', fontSize: 10 }}
                    />
                    <Tooltip 
                      formatter={(value, name) => [`${Number(value).toLocaleString()} ชิ้น`, name]}
                      contentStyle={{ fontFamily: 'Sarabun', fontSize: '11px', borderRadius: '8px' }}
                    />
                    <Legend 
                      wrapperStyle={{ fontFamily: 'Sarabun', fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} 
                    />
                    <Bar dataKey="totalWithdrawn" name="ยอดเบิกจ่ายอะไหล่ (ชิ้น)" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="totalRestocked" name="ยอดเติม Stock อะไหล่ (ชิ้น)" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}

      </div>

      {/* ==================== แถววิเคราะห์ความคุ้มค่าของการซ่อมบำรุง (Cost-Effectiveness Analysis) ==================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ชาร์ตเปรียบเทียบงบจริง vs ราคาเครื่องแรกซื้อ */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-lg lg:col-span-2">
          <h3 className="font-display font-bold text-slate-900 text-base mb-2 flex items-center gap-2">
            <span className="h-4 w-1.5 bg-violet-600 rounded-full" />
            เปรียบเทียบราคาแรกซื้อ VS ค่าซ่อมสะสม (Repair Cost VS Purchase Price)
          </h3>
          <p className="text-[11px] text-slate-500 font-sans mb-4">
            กราฟแท่งวิเคราะห์ความคุ้มค่าของการซ่อมบำรุง: หากแถบสีแดง (ค่าซ่อม) ใกล้เคียงหรือสูงกว่าแถบสีน้ำเงิน (ราคาเครื่อง) แสดงว่าคุ้มค่าต่ำอย่างวิกฤต
          </p>
          
          <div className="h-72">
            {machineAnalysisData.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-sm text-slate-400 font-sans">ไม่มีข้อมูลเครื่องจักรเพื่อวิเคราะห์กราฟ</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={machineAnalysisData}
                  margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="id" 
                    tick={{ fontFamily: 'Sarabun', fontSize: 10, fontWeight: 'bold' }} 
                  />
                  <YAxis 
                    tickFormatter={(val) => `฿${(val / 1000).toLocaleString()}k`} 
                    tick={{ fontFamily: 'Sarabun', fontSize: 10 }}
                  />
                  <Tooltip 
                    formatter={(value) => [`฿${Number(value).toLocaleString()}`, '']}
                    contentStyle={{ fontFamily: 'Sarabun', fontSize: '11px', borderRadius: '8px' }}
                  />
                  <Legend 
                    wrapperStyle={{ fontFamily: 'Sarabun', fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} 
                  />
                  <Bar dataKey="purchasePrice" name="ราคาแรกซื้อเครื่องจักร" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="accumulatedCost" name="ค่าซ่อมแซมสะสมจริง" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* รายชื่อเครื่องจักรที่มีสัดส่วนเสี่ยงสิ้นเปลือง สูงสุด */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="font-display font-bold text-slate-900 text-base mb-1 flex items-center gap-2">
              <span className="h-4 w-1.5 bg-rose-600 rounded-full" />
              ดัชนีชี้วัดความคุ้มค่าการซ่อมบำรุง
            </h3>
            <p className="text-[11px] text-slate-500 font-sans mb-4">
              เครื่องจักรเรียงตามเปอร์เซ็นต์ค่าซ่อมสะสมเปรียบเทียบกับราคาซื้อครั้งแรก (สูงสุดไปต่ำสุด)
            </p>

            <div className="space-y-4 max-h-[250px] overflow-y-auto pr-1">
              {sortedMachineAnalysis.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-10 font-sans">ยังไม่มีการบันทึกเครื่องจักร</p>
              ) : (
                sortedMachineAnalysis.map(m => (
                  <div key={m.id} className="border border-slate-100 rounded-xl p-3 bg-slate-50/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-blue-600">{m.id}</span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${m.ratingColor}`}>
                          {m.ratio}%
                        </span>
                      </div>
                      <button
                        onClick={() => setHistoryModalEqId(m.id)}
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-100 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200 flex items-center gap-1 transition-all cursor-pointer"
                        title="ดูประวัติการซ่อมและพิมพ์รายงาน PDF"
                      >
                        <FileText className="h-3 w-3 text-blue-600" />
                        <span>ประวัติ & PDF</span>
                      </button>
                    </div>
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-slate-800 text-xs truncate max-w-[150px]">{m.name}</h4>
                      <span className="text-[9px] text-slate-400 font-sans font-medium">ซ่อม {m.repairCount} ครั้ง</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${
                          m.ratio > 80 ? 'bg-red-500' :
                          m.ratio > 50 ? 'bg-orange-500' :
                          m.ratio > 20 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(m.ratio, 100)}%` }}
                      />
                    </div>
                    
                    <p className="text-[9px] text-slate-500 font-sans leading-tight">
                      <strong>สถานะซ่อมบำรุง:</strong> {m.rating}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
          
          {criticalMachinesCount > 0 && (
            <div className="mt-3 bg-rose-50 border border-rose-200 p-2.5 rounded-lg text-[10px] text-rose-900 leading-normal flex gap-1.5 items-start">
              <AlertOctagon className="h-4 w-4 text-rose-600 shrink-0" />
              <span>
                <strong>ข้อเสนอแนะฝ่ายซ่อมบำรุง (PM):</strong> มีเครื่องจักรซ่อมบอบช้ำสะสมจนไม่คุ้มค่าแล้ว แนะนำให้ทำเรื่องของบจัดซื้อชุดเครื่องเปลี่ยนทดแทนใหม่ดีกว่าส่งซ่อมแซมต่อ
              </span>
            </div>
          )}
        </div>

      </div>

      {/* ==================== แถวหลักของคลัง: สัดส่วนแยกหมวดหมู่ กับ ใบสั่งซื้อด่วนคลังอะไหล่ ==================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* ชาร์ตกราฟวงกลมแยกหมวดหมู่ */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-lg">
          <h3 className="font-display font-bold text-slate-900 text-base mb-4 flex items-center gap-2">
            <span className="h-4 w-1.5 bg-blue-600 rounded-full" />
            สัดส่วนปริมาณอะไหล่ตามหมวดหมู่ (%)
          </h3>
          <div className="h-72 flex items-center justify-center">
            {pieChartData.length === 0 ? (
              <p className="text-sm text-slate-400 font-sans">ไม่มีข้อมูลสรุปหมวดหมู่</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="45%"
                    innerRadius={65}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getPieCellColor(entry.name, index)} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ fontFamily: 'Sarabun', fontSize: '12px', borderRadius: '10px' }}
                    formatter={(value) => [`${value} รายการ`, 'จำนวน']}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    wrapperStyle={{ fontFamily: 'Sarabun', fontSize: '11px', fontWeight: 'bold' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ตารางแสดงเฉพาะไอเท็มที่ต่ำกว่า Min_Stock พร้อม ราคาและราคารวม! */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="font-display font-bold text-rose-950 text-base mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="h-4 w-1.5 bg-rose-600 rounded-full" />
                ใบขอจัดซื้ออะไหล่ด่วนพร้อมราคากลาง (Low Stock)
              </span>
              <span className="bg-rose-100 text-rose-800 text-xs font-bold px-2.5 py-1 rounded-full font-mono border border-rose-200">
                {lowStockCount}
              </span>
            </h3>
            
            <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50 shadow-inner">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 font-sans">
                    <th className="py-3 px-3 font-bold">รหัสอะไหล่</th>
                    <th className="py-3 px-3 font-bold">ชื่ออะไหล่</th>
                    <th className="py-3 px-3 text-right font-bold">คงเหลือ</th>
                    <th className="py-3 px-3 text-right text-rose-700 font-bold">ราคาเฉลี่ย/หน่วย</th>
                    <th className="py-3 px-3 text-right font-bold">มูลค่าคงคลัง</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {lowStockParts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-emerald-600 font-bold font-sans">
                        🟢 ยินดีด้วย! สต็อกทุกชิ้นยังมีความปลอดภัยสูง ไม่มีรายการขาดแคลน
                      </td>
                    </tr>
                  ) : (
                    lowStockParts.map(part => (
                      <tr key={part.id} className="hover:bg-rose-50/20 font-sans transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{part.id}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{part.name}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-red-600">
                          {part.quantity} {part.unit}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                          ฿{(part.price || 0).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                          ฿{((part.price || 0) * part.quantity).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {lowStockParts.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] bg-amber-50/60 p-2.5 rounded-lg border border-amber-200 text-amber-900 leading-relaxed font-sans">
              <strong>ข้อแนะนำจัดซื้อ:</strong> ยอดค่าใช้จ่ายราคากลางด้านบนจะช่วยให้ทำงบขออนุมัติ PR เพื่อซื้ออะไหล่ได้อย่างแม่นยำ ป้องกันสายการผลิตสะดุดชะงัก (Downtime)
            </div>
          )}
        </div>
      </div>

      {/* ==================== ประวัติการทำรายการเบิก-รับอะไหล่ ==================== */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-lg">
        <h3 className="font-display font-bold text-slate-900 text-base mb-4 flex items-center gap-2">
          <span className="h-4 w-1.5 bg-violet-600 rounded-full" />
          ประวัติเคลื่อนไหวคลังอะไหล่ (Recent Stock Activity)
        </h3>
        <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-xl overflow-hidden shadow-inner bg-slate-50/50">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 font-sans">
                <th className="py-3 px-4 font-bold">วันเวลา</th>
                <th className="py-3 px-4 font-bold">รหัสอะไหล่</th>
                <th className="py-3 px-4 font-bold">ชื่ออะไหล่</th>
                <th className="py-3 px-4 text-center font-bold">ประเภท</th>
                <th className="py-3 px-4 text-right font-bold">จำนวน</th>
                <th className="py-3 px-4 font-bold">ช่างเทคนิค</th>
                <th className="py-3 px-4 font-bold">เครื่องจักร / ไลน์</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white font-sans text-slate-600">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-sans">
                    ยังไม่มีข้อมูลประวัติรายการเคลื่อนไหว
                  </td>
                </tr>
              ) : (
                [...transactions]
                  .sort((a, b) => parseDateToTimestamp(b.timestamp) - parseDateToTimestamp(a.timestamp))
                  .map((tx, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-500">{tx.timestamp}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">{tx.partId}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{tx.partName}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-full font-bold text-[10px] ${
                        tx.type === 'เบิกจ่าย' 
                          ? 'bg-rose-50 text-rose-700 border border-rose-100' 
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      }`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className={`py-3 px-4 text-right font-mono font-bold ${
                      tx.type === 'เบิกจ่าย' ? 'text-red-600' : 'text-emerald-700'
                    }`}>
                      {tx.type === 'เบิกจ่าย' ? '-' : '+'}{tx.quantity}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">{tx.technician}</td>
                    <td className="py-3 px-4 text-slate-500 font-sans">{tx.machineNote}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal ดูประวัติการซ่อมและออก PDF รายเครื่องมือ */}
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
