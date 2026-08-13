import React, { useState } from 'react';
import { SparePart, SpareLoan, Equipment } from '../types';
import { 
  Repeat, 
  PlusCircle, 
  Search, 
  Filter, 
  MapPin, 
  Clock, 
  User, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRightLeft, 
  Calendar, 
  FileText, 
  PackageCheck, 
  ShieldAlert,
  RotateCcw,
  Tag,
  Factory,
  Wrench,
  Check,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ToolLoanTabProps {
  parts: SparePart[];
  equipments: Equipment[];
  loans: SpareLoan[];
  onAddLoan: (loanData: {
    partId: string;
    partName: string;
    lineLocation: string;
    borrowerName: string;
    quantity: number;
    purposeNote: string;
    expectedReturnDate: string;
  }) => Promise<void>;
  onReturnLoan: (loanId: string, returnData: {
    receiverName: string;
    returnNote: string;
  }) => Promise<void>;
  isSubmitting: boolean;
}

export default function ToolLoanTab({
  parts,
  equipments,
  loans,
  onAddLoan,
  onReturnLoan,
  isSubmitting
}: ToolLoanTabProps) {
  // สถานะค้นหาและตัวกรอง
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'BORROWED' | 'RETURNED'>('BORROWED');
  const [lineFilter, setLineFilter] = useState<string>('ALL');

  // โมดอลยืม Spare
  const [showBorrowModal, setShowBorrowModal] = useState(false);
  const [selectedPartId, setSelectedPartId] = useState('');
  const [customPartName, setCustomPartName] = useState('');
  const [lineLocation, setLineLocation] = useState('');
  const [customLine, setCustomLine] = useState('');
  const [borrowerName, setBorrowerName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [purposeNote, setPurposeNote] = useState('');
  const [expectedReturnDate, setExpectedReturnDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3); // ค่าเริ่มต้นกำหนดคืนอีก 3 วัน
    return d.toISOString().split('T')[0];
  });

  // โมดอลคืน Spare
  const [activeReturnLoan, setActiveReturnLoan] = useState<SpareLoan | null>(null);
  const [receiverName, setReceiverName] = useState('');
  const [returnNote, setReturnNote] = useState('คืนแล้ว สภาพสมบูรณ์พร้อมใช้งานต่อ');

  // ตัวเลือกไลน์ผลิตจาก Equipment และค่าเริ่มต้น
  const defaultLines = [
    'แผนกบรรจุ ไลน์ 1',
    'แผนกบรรจุ ไลน์ 2',
    'แผนกบรรจุ ไลน์ 3',
    'แผนกประกอบไม้ ไลน์ 1',
    'แผนกประกอบไม้ ไลน์ 2',
    'ไลน์ผลิตหลัก (Main Assembly Line)',
    'ไลน์แพ็คเกจจิ้ง (Packaging Line)'
  ];

  const availableLines = Array.from(new Set([
    ...equipments.map(e => e.location).filter(Boolean),
    ...defaultLines
  ]));

  // กรองเฉพาะอุปกรณ์เครื่องมือที่เป็น Spare จากหน้าเครื่องจักรและอุปกรณ์
  const spareEquipments = equipments.filter(e => e.equipmentType === 'Spare');

  // คำนวณสถิติ
  const activeLoans = loans.filter(l => l.status === 'กำลังยืม');
  const returnedLoans = loans.filter(l => l.status === 'คืนแล้ว');

  // ไลน์ผลิตที่มีการยืมบ่อยที่สุด
  const lineCountMap: Record<string, number> = {};
  loans.forEach(l => {
    if (l.lineLocation) {
      lineCountMap[l.lineLocation] = (lineCountMap[l.lineLocation] || 0) + 1;
    }
  });
  const topBorrowingLine = Object.entries(lineCountMap).sort((a, b) => b[1] - a[1])[0]?.[0] || 'ยังไม่มีข้อมูล';

  // กรองรายการ
  const filteredLoans = loans.filter(loan => {
    // สถานะ
    if (statusFilter === 'BORROWED' && loan.status !== 'กำลังยืม') return false;
    if (statusFilter === 'RETURNED' && loan.status !== 'คืนแล้ว') return false;

    // ไลน์
    if (lineFilter !== 'ALL' && loan.lineLocation !== lineFilter) return false;

    // ค้นหา
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      loan.partName.toLowerCase().includes(term) ||
      loan.partId.toLowerCase().includes(term) ||
      loan.borrowerName.toLowerCase().includes(term) ||
      loan.lineLocation.toLowerCase().includes(term) ||
      loan.purposeNote.toLowerCase().includes(term) ||
      loan.id.toLowerCase().includes(term)
    );
  });

  // ส่งฟอร์มยืม
  const handleBorrowSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let finalPartId = selectedPartId;
    let finalPartName = customPartName;

    if (selectedPartId && selectedPartId !== 'OTHER') {
      const spareEq = spareEquipments.find(x => x.id === selectedPartId);
      const p = parts.find(x => x.id === selectedPartId);
      if (spareEq) {
        finalPartName = spareEq.name;
      } else if (p) {
        finalPartName = p.name;
      }
    } else {
      finalPartId = `SPARE-${Date.now().toString().slice(-4)}`;
    }

    const finalLine = lineLocation === 'OTHER' ? customLine : lineLocation;

    if (!finalPartName || !finalLine || !borrowerName) {
      alert('กรุณากรอกชื่อ Spare/เครื่องมือ, ไลน์ผลิตที่นำไปใช้ และชื่อผู้ยืมให้ครบถ้วน');
      return;
    }

    await onAddLoan({
      partId: finalPartId,
      partName: finalPartName,
      lineLocation: finalLine,
      borrowerName,
      quantity,
      purposeNote,
      expectedReturnDate
    });

    // รีเซ็ตฟอร์ม
    setShowBorrowModal(false);
    setSelectedPartId('');
    setCustomPartName('');
    setLineLocation('');
    setCustomLine('');
    setBorrowerName('');
    setQuantity(1);
    setPurposeNote('');
  };

  // ส่งฟอร์มรับคืน
  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReturnLoan) return;
    if (!receiverName) {
      alert('กรุณากรอกชื่อผู้รับคืน/ช่างที่รับเครื่องมือคืน');
      return;
    }

    await onReturnLoan(activeReturnLoan.id, {
      receiverName,
      returnNote
    });

    setActiveReturnLoan(null);
    setReceiverName('');
    setReturnNote('คืนแล้ว สภาพสมบูรณ์พร้อมใช้งานต่อ');
  };

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-blue-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-xs font-bold flex items-center gap-1.5">
                <Repeat className="h-3.5 w-3.5 animate-spin-slow" />
                Spare Tool Borrowing & Return Tracking
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              ระบบการยืม-คืน อะไหล่ & เครื่องมือ Spare
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              ติดตามสถานะอะไหล่และเครื่องมือสับเปลี่ยน (Spare Items) ว่าตอนนี้อยู่ที่ <strong className="text-amber-300">ไลน์ผลิตไหน</strong> ช่างคนไหนนำไปใช้ และคืนเข้าคลังหรือยังแบบเรียลไทม์
            </p>
          </div>

          <button
            onClick={() => setShowBorrowModal(true)}
            className="px-5 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition-all flex items-center gap-2 cursor-pointer shrink-0"
          >
            <PlusCircle className="h-5 w-5 stroke-[2.5]" />
            <span>บันทึกการยืม Spare ใหม่</span>
          </button>
        </div>
      </div>

      {/* 📊 สถิติตัวเลขสรุปการยืม-คืน */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* การ์ด 1: กำลังยืมไปใช้ */}
        <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">กำลังยืมใช้งานอยู่ในไลน์</p>
              <h3 className="text-3xl font-black text-amber-900 mt-1">{activeLoans.length} <span className="text-sm font-normal text-amber-600">รายการ</span></h3>
            </div>
            <div className="h-12 w-12 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-600">
              <Clock className="h-6 w-6" />
            </div>
          </div>
          <p className="text-[11px] text-amber-700/80 mt-3 flex items-center gap-1 font-medium">
            <MapPin className="h-3.5 w-3.5 inline text-amber-600" />
            มีเครื่องมือติดอยู่ตามไลน์ผลิตขณะนี้
          </p>
        </div>

        {/* การ์ด 2: คืนแล้ว */}
        <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide">คืนเข้าคลังเรียบร้อยแล้ว</p>
              <h3 className="text-3xl font-black text-emerald-900 mt-1">{returnedLoans.length} <span className="text-sm font-normal text-emerald-600">รายการ</span></h3>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </div>
          <p className="text-[11px] text-emerald-700/80 mt-3 flex items-center gap-1 font-medium">
            <PackageCheck className="h-3.5 w-3.5 inline text-emerald-600" />
            คืนครบสมบูรณ์พร้อมนำไปหมุนเวียนใช้ต่อ
          </p>
        </div>

        {/* การ์ด 3: ไลน์ผลิตที่ยืมใช้มากที่สุด */}
        <div className="bg-white p-5 rounded-2xl border border-blue-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">ไลน์ยืมสูงสุด</p>
              <h3 className="text-base font-bold text-blue-950 mt-1 line-clamp-1">{topBorrowingLine}</h3>
            </div>
            <div className="h-12 w-12 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
              <Factory className="h-6 w-6" />
            </div>
          </div>
          <p className="text-[11px] text-blue-700/80 mt-3 flex items-center gap-1 font-medium">
            <Tag className="h-3.5 w-3.5 inline text-blue-600" />
            จุดที่มีการยืมสำรองสับเปลี่ยนถี่ที่สุด
          </p>
        </div>

        {/* การ์ด 4: รวมรายการยืมทั้งหมด */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">ประวัติการยืม-คืนรวม</p>
              <h3 className="text-3xl font-black text-slate-800 mt-1">{loans.length} <span className="text-sm font-normal text-slate-500">ครั้ง</span></h3>
            </div>
            <div className="h-12 w-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
              <ArrowRightLeft className="h-6 w-6" />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-3 flex items-center gap-1 font-medium">
            <FileText className="h-3.5 w-3.5 inline text-slate-400" />
            บันทึกประวัติการหมุนเวียนลงฐานข้อมูล
          </p>
        </div>
      </div>

      {/* 🔍 แถบตัวกรองและค้นหา */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row justify-between gap-3 items-stretch md:items-center">
          {/* ช่องค้นหา */}
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="ค้นหาชื่อ Spare, รหัส, ไลน์ผลิต, หรือชื่อผู้ยืม..."
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* ปุ่มกรองสถานะ */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0 text-xs font-bold">
            <button
              onClick={() => setStatusFilter('BORROWED')}
              className={`px-3 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'BORROWED'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>กำลังถูกยืม ({activeLoans.length})</span>
            </button>

            <button
              onClick={() => setStatusFilter('RETURNED')}
              className={`px-3 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'RETURNED'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>คืนแล้ว ({returnedLoans.length})</span>
            </button>

            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-2 rounded-lg transition-all cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ทั้งหมด ({loans.length})
            </button>
          </div>

          {/* ตัวกรองไลน์ผลิต */}
          <div className="shrink-0 flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={lineFilter}
              onChange={e => setLineFilter(e.target.value)}
              className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="ALL">แสดงทุกไลน์ผลิต</option>
              {availableLines.map(line => (
                <option key={line} value={line}>{line}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 📋 รายการการ์ดการยืม-คืน Spare */}
      {filteredLoans.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center space-y-3">
          <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
            <Repeat className="h-8 w-8" />
          </div>
          <h3 className="text-base font-bold text-slate-700">ไม่พบข้อมูลการยืม Spare ตามเงื่อนไขที่เลือก</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {statusFilter === 'BORROWED' 
              ? 'ขณะนี้ไม่มี Spare หรือเครื่องมือใดถูกยืมไปใช้งานที่ไลน์ผลิต' 
              : 'ลองปรับเปลี่ยนคำค้นหาหรือตัวกรองสถานะในแถบด้านบน'}
          </p>
          <button
            onClick={() => setShowBorrowModal(true)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl inline-flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
          >
            <PlusCircle className="h-4 w-4" />
            <span>คลิกบันทึกการยืม Spare ใหม่</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLoans.map(loan => {
            const isBorrowed = loan.status === 'กำลังยืม';
            
            return (
              <motion.div
                key={loan.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden relative shadow-xs hover:shadow-md ${
                  isBorrowed 
                    ? 'border-amber-300 ring-2 ring-amber-400/20' 
                    : 'border-slate-200 opacity-90'
                }`}
              >
                {/* แถบสถานะด้านบน */}
                <div className={`px-4 py-2.5 flex items-center justify-between text-xs font-bold border-b ${
                  isBorrowed 
                    ? 'bg-amber-50 text-amber-900 border-amber-200' 
                    : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}>
                  <span className="font-mono text-[11px] text-slate-500">#{loan.id}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 ${
                    isBorrowed
                      ? 'bg-amber-500 text-slate-950 shadow-xs animate-pulse'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}>
                    {isBorrowed ? (
                      <>
                        <Clock className="h-3 w-3" />
                        <span>กำลังยืมใช้งานที่ไลน์</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        <span>คืนเรียบร้อยแล้ว</span>
                      </>
                    )}
                  </span>
                </div>

                {/* เนื้อหาการ์ด */}
                <div className="p-4 space-y-3 flex-1">
                  {/* ชื่อ Spare และรหัส */}
                  <div>
                    <h4 className="font-bold text-slate-900 text-base leading-snug line-clamp-2">{loan.partName}</h4>
                    <p className="text-xs text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                      <Tag className="h-3 w-3 inline text-slate-400" />
                      รหัส: {loan.partId} | จำนวน: <strong className="text-slate-800">{loan.quantity} ชิ้น</strong>
                    </p>
                  </div>

                  {/* 📍 ตำแหน่งไลน์ผลิตที่เอาไปใช้ (ไฮไลต์สำคัญ) */}
                  <div className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                    isBorrowed 
                      ? 'bg-amber-50/70 border-amber-200 text-amber-950' 
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}>
                    <MapPin className={`h-5 w-5 shrink-0 mt-0.5 ${isBorrowed ? 'text-amber-600' : 'text-slate-400'}`} />
                    <div className="text-xs space-y-0.5">
                      <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">ตำแหน่งไลน์ผลิตที่นำไปใช้</p>
                      <p className="font-bold text-sm text-slate-900">{loan.lineLocation}</p>
                    </div>
                  </div>

                  {/* ผู้ยืม & วัตถุประสงค์ */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">ช่างผู้ยืม:</span>
                      <span className="font-bold text-slate-800 flex items-center gap-1">
                        <User className="h-3 w-3 text-blue-500 shrink-0" />
                        {loan.borrowerName}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">วันที่ยืม:</span>
                      <span className="font-medium text-slate-700 flex items-center gap-1 text-[11px]">
                        <Calendar className="h-3 w-3 text-slate-400 shrink-0" />
                        {loan.borrowDate}
                      </span>
                    </div>
                  </div>

                  {loan.purposeNote && (
                    <div className="text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-slate-600">
                      <span className="font-semibold text-slate-700 block text-[10px]">หมายเหตุ/เหตุผลที่ยืม:</span>
                      <p className="italic text-[11px] text-slate-600 line-clamp-2">"{loan.purposeNote}"</p>
                    </div>
                  )}

                  {/* รายละเอียดวันรับคืนหากคืนแล้ว */}
                  {!isBorrowed && loan.returnDate && (
                    <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-100 text-xs space-y-1 text-emerald-900">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="font-bold flex items-center gap-1 text-emerald-800">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          รับคืนเมื่อ:
                        </span>
                        <span className="text-emerald-700 font-mono text-[10px]">{loan.returnDate}</span>
                      </div>
                      <div className="text-[11px] text-emerald-800">
                        <span>ผู้รับคืน: <strong>{loan.receiverName || 'ไม่ระบุ'}</strong></span>
                      </div>
                      {loan.returnNote && (
                        <p className="text-[10px] text-emerald-700 italic border-t border-emerald-200/60 pt-1 mt-1">
                          สภาพ: {loan.returnNote}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* ปุ่มกระทำด้านล่าง */}
                {isBorrowed && (
                  <div className="p-3 bg-slate-50 border-t border-slate-200">
                    <button
                      onClick={() => {
                        setActiveReturnLoan(loan);
                        setReceiverName(loan.borrowerName); // ค่าเริ่มต้นคือชื่อช่าง
                      }}
                      className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs hover:shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>กดคืน Spare เข้าคลัง</span>
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* 📝 โมดอล 1: บันทึกการยืม Spare ใหม่ */}
      <AnimatePresence>
        {showBorrowModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden"
            >
              {/* Header */}
              <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center border-b-2 border-amber-500">
                <div className="flex items-center gap-2">
                  <Repeat className="h-5 w-5 text-amber-400" />
                  <h3 className="font-bold text-base">บันทึกการยืม Spare / เครื่องมือ</h3>
                </div>
                <button
                  onClick={() => setShowBorrowModal(false)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleBorrowSubmit} className="p-6 space-y-4">
                {/* เลือก Spare/เครื่องมือ */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    เลือกเครื่องมือ Spare ที่ยืม <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedPartId}
                    onChange={e => setSelectedPartId(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-amber-500 font-sans"
                    required
                  >
                    <option value="">-- กรุณาเลือกเครื่องมือ Spare ที่ต้องการยืม --</option>
                    
                    {spareEquipments.length === 0 ? (
                      <option value="" disabled>-- ยังไม่มีเครื่องมือที่ลงทะเบียนเป็น Spare (ไปตั้งค่าได้ที่หน้าเครื่องจักรและอุปกรณ์) --</option>
                    ) : (
                      spareEquipments.map(eq => (
                        <option key={eq.id} value={eq.id}>
                          [{eq.id}] {eq.assetCode ? `[${eq.assetCode}] ` : ''}{eq.name} (ประจำ: {eq.location})
                        </option>
                      ))
                    )}

                    <option value="OTHER">+ พิมพ์ชื่อเครื่องมืออื่นนอกคลัง...</option>
                  </select>
                  <p className="text-[11px] text-amber-700 mt-1">
                    💡 แสดงเฉพาะอุปกรณ์ที่กำหนดประเภทเป็น <strong>"Spare"</strong> จากหน้าเครื่องจักรและอุปกรณ์
                  </p>
                </div>

                {/* กรณีพิมพ์ชื่อเอง */}
                {selectedPartId === 'OTHER' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ระบุชื่อเครื่องมือ / อะไหล่ Spare <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={customPartName}
                      onChange={e => setCustomPartName(e.target.value)}
                      placeholder="เช่น ปืนลมยิงตะปูตัวสำรอง, ชุดฮีตเตอร์สำรอง No.2"
                      className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>
                )}

                {/* ไลน์ผลิตที่นำไปใช้ */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    📍 ไลน์ผลิต / ตำแหน่งที่นำ Spare ไปใช้ <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={lineLocation}
                    onChange={e => setLineLocation(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-amber-500"
                    required
                  >
                    <option value="">-- เลือกไลน์ผลิตที่นำไปสับเปลี่ยน/ใช้งาน --</option>
                    {availableLines.map(line => (
                      <option key={line} value={line}>{line}</option>
                    ))}
                    <option value="OTHER">+ ระบุชื่อไลน์ผลิต/ตำแหน่งอื่น...</option>
                  </select>
                </div>

                {lineLocation === 'OTHER' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ระบุชื่อไลน์ผลิต/ตำแหน่งใช้งาน <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={customLine}
                      onChange={e => setCustomLine(e.target.value)}
                      placeholder="เช่น แผนกจัดเตรียม ไลน์ 4, ห้องทดสอบ QC"
                      className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  {/* ชื่อผู้ยืม */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ช่าง/ผู้เบิกยืม <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={borrowerName}
                      onChange={e => setBorrowerName(e.target.value)}
                      placeholder="ชื่อช่างผู้เบิกนำไปใช้"
                      className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>

                  {/* จำนวน */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      จำนวนที่ยืม (ชิ้น/ตัว)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={e => setQuantity(Number(e.target.value))}
                      className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>
                </div>

                {/* วัตถุประสงค์ */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    วัตถุประสงค์ / หมายเหตุการนำไปใช้
                  </label>
                  <textarea
                    value={purposeNote}
                    onChange={e => setPurposeNote(e.target.value)}
                    rows={2}
                    placeholder="เช่น นำไปสำรองแทนเครื่องหลักส่งซ่อม, ทดสอบสับเปลี่ยนหาจุดชำรุด"
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* ปุ่มกดยืนยัน */}
                <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowBorrowModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    ยกเลิก
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    {isSubmitting ? (
                      <span>กำลังบันทึก...</span>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        <span>ยืนยันบันทึกการยืม Spare</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 📥 โมดอล 2: คืน Spare เข้าคลัง */}
      <AnimatePresence>
        {activeReturnLoan && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden"
            >
              {/* Header */}
              <div className="bg-emerald-800 text-white px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <RotateCcw className="h-5 w-5 text-emerald-300" />
                  <h3 className="font-bold text-base">บันทึกคืน Spare / เครื่องมือ</h3>
                </div>
                <button
                  onClick={() => setActiveReturnLoan(null)}
                  className="text-emerald-200 hover:text-white cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleReturnSubmit} className="p-6 space-y-4">
                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-xs space-y-1">
                  <p className="font-bold text-emerald-950 text-sm">{activeReturnLoan.partName}</p>
                  <p className="text-emerald-800">📍 ยืมไปที่: <strong>{activeReturnLoan.lineLocation}</strong></p>
                  <p className="text-emerald-700">👤 ผู้ยืมเดิม: {activeReturnLoan.borrowerName}</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ช่างผู้รับคืน / ตรวจรับเข้าคลัง <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={receiverName}
                    onChange={e => setReceiverName(e.target.value)}
                    placeholder="ชื่อช่าง/เจ้าหน้าที่ผู้รับคืน"
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    สภาพเครื่องมือ / หมายเหตุการรับคืน
                  </label>
                  <textarea
                    value={returnNote}
                    onChange={e => setReturnNote(e.target.value)}
                    rows={2}
                    placeholder="เช่น สมบูรณ์ปกติพร้อมใช้ต่อ, คืนแล้วมีรอยสึกหรอบางจุด"
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setActiveReturnLoan(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    ยกเลิก
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    {isSubmitting ? (
                      <span>กำลังบันทึก...</span>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        <span>ยืนยันรับคืน Spare เข้าคลัง</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
