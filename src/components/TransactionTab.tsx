import React, { useState, useEffect, useRef } from 'react';
import { SparePart, Equipment } from '../types';
import { ClipboardList, Upload, Download, Calculator, UserCheck, Cpu, AlertTriangle, ChevronDown } from 'lucide-react';
import { getEmbeddableImageUrl } from '../utils/image';

interface TransactionTabProps {
  parts: SparePart[];
  equipments: Equipment[];
  onSubmit: (data: {
    partId: string;
    type: 'เบิกจ่าย' | 'รับเข้า';
    quantity: number;
    technician: string;
    machineNote: string;
    equipmentId?: string;
  }) => Promise<void>;
  isSubmitting: boolean;
  preSelectedPartId?: string; // รองรับกรณีช่างกดจากหน้ารายการด่วนแล้วสั่งเบิกด่วน
  onResetPreSelected?: () => void;
}

export default function TransactionTab({ parts, equipments, onSubmit, isSubmitting, preSelectedPartId, onResetPreSelected }: TransactionTabProps) {
  const [type, setType] = useState<'เบิกจ่าย' | 'รับเข้า'>('เบิกจ่าย');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPartId, setSelectedPartId] = useState('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [technician, setTechnician] = useState('');
  const [machineNote, setMachineNote] = useState('');
  const [selectedEquipmentId, setSelectedEquipmentId] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [localError, setLocalError] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // รองรับกรณีเบิกจ่ายด่วนผ่านปุ่มลัด
  useEffect(() => {
    if (preSelectedPartId) {
      const part = parts.find(p => p.id === preSelectedPartId);
      if (part) {
        setSelectedPartId(part.id);
        setSearchTerm(`${part.id} | ${part.name}`);
        setType('เบิกจ่าย'); // เปลี่ยนสวิตช์เป็นเบิกทันที
      }
      if (onResetPreSelected) onResetPreSelected();
    }
  }, [preSelectedPartId, parts]);

  // จับการคลิกนอก Dropdown เพื่อปิดอัตโนมัติ
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // ค้นหาและกรองอะไหล่ใน Dropdown
  const filteredParts = parts.filter(p => 
    p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedPart = parts.find(p => p.id === selectedPartId);

  // ตรวจสอบว่าคำค้นหาคือชิ้นที่กำลังเลือกอยู่หรือไม่ เพื่อจัดรูปแบบการแสดงหมวดหมู่ทั้งหมดให้เลือกใหม่ได้ง่ายขึ้น
  const isSelectedActive = selectedPart && searchTerm === `${selectedPart.id} | ${selectedPart.name}`;
  const displayParts = isSelectedActive || searchTerm.trim() === '' ? parts : filteredParts;

  // จัดกลุ่มอะไหล่ตามหมวดหมู่ (Category)
  const groupedParts = displayParts.reduce((groups: { [key: string]: SparePart[] }, part) => {
    const category = part.category || 'หมวดหมู่อื่นๆ';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(part);
    return groups;
  }, {});

  // ตรวจสอบความถูกต้องของแบบฟอร์ม
  const hasLowStockAlert = type === 'เบิกจ่าย' && selectedPart && quantity !== '' && Number(quantity) > selectedPart.quantity;

  const isFormValid = true; // ให้ปุ่มคลิกได้เสมอ แล้วตรวจพบฟิลด์ว่างแจ้งเตือนให้ชัดเจนดีกว่าล็อคปุ่ม

  const handleSelectPart = (part: SparePart) => {
    setSelectedPartId(part.id);
    setSearchTerm(`${part.id} | ${part.name}`);
    setShowDropdown(false);
    setLocalError('');
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    setLocalError('');

    if (!selectedPartId) {
      setLocalError('❌ กรุณาค้นหาและเลือกอะไหล่สำรองที่ต้องการทำรายการก่อน');
      return;
    }
    if (quantity === '' || Number(quantity) <= 0) {
      setLocalError('❌ กรุณาระบุจำนวนอะไหล่ที่ถูกต้อง (ต้องมากกว่า 0)');
      return;
    }
    if (!technician.trim()) {
      setLocalError('❌ กรุณาระบุชื่อช่างเทคนิคผู้รับผิดชอบทำรายการ');
      return;
    }
    if (!machineNote.trim()) {
      setLocalError(
        type === 'เบิกจ่าย' && selectedEquipmentId
          ? '❌ กรุณากรอกอาการชำรุด / การแก้ไขปรับปรุงเครื่องจักร'
          : '❌ กรุณากรอกรหัสเครื่องจักร / ไลน์การผลิตที่นำไปซ่อมแซม'
      );
      return;
    }

    if (isSubmitting) return;

    // เปิดหน้าต่างยืนยันประวัติ (Custom Modal) ปลอดภัยต่อระบบ iFrame
    setShowConfirmModal(true);
  };

  const handleActualSubmit = async () => {
    setShowConfirmModal(false);
    if (isSubmitting) return;

    try {
      await onSubmit({
        partId: selectedPartId,
        type,
        quantity: Number(quantity),
        technician,
        machineNote,
        equipmentId: type === 'เบิกจ่าย' && selectedEquipmentId ? selectedEquipmentId : undefined
      });

      // สำเร็จแล้ว ทำการเคลียร์ฟอร์ม
      setSearchTerm('');
      setSelectedPartId('');
      setQuantity('');
      setTechnician('');
      setMachineNote('');
      setSelectedEquipmentId('');
      setSubmitAttempted(false);
      setLocalError('');
    } catch (err: any) {
      setLocalError(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง');
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* หัวข้อฟอร์ม */}
        <div className="bg-slate-900 px-6 py-5 text-white flex items-center justify-between border-b-4 border-blue-500">
          <div className="flex items-center gap-2.5">
            <ClipboardList className="h-5 w-5 text-blue-400" />
            <span className="font-display font-bold text-lg tracking-wide uppercase">ทำรายการอะไหล่คลัง (Spare Part Action)</span>
          </div>
          <span className="text-[11px] font-mono bg-slate-800 text-slate-300 py-1 px-2.5 rounded-full border border-slate-700/50">
            PLATFORM V2.1
          </span>
        </div>

        <div className="p-6 space-y-6">
          {/* สวิตช์สลับใหญ่ยักษ์ เบิกอะไหล่ VS รับเข้าคลัง */}
          <div className="bg-slate-100 rounded-xl p-1.5 flex gap-1.5">
            <button
              type="button"
              onClick={() => setType('เบิกจ่าย')}
              className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-lg font-display text-base font-bold transition-all cursor-pointer ${
                type === 'เบิกจ่าย'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/10 ring-4 ring-rose-100'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <Upload className="h-5 w-5 shrink-0" />
              <span>เบิกอะไหล่ (จ่ายออก)</span>
            </button>
            <button
              type="button"
              onClick={() => setType('รับเข้า')}
              className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-lg font-display text-base font-bold transition-all cursor-pointer ${
                type === 'รับเข้า'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/10 ring-4 ring-emerald-100'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <Download className="h-5 w-5 shrink-0" />
              <span>รับเข้าคลัง (รับเพิ่ม)</span>
            </button>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-5">
            {/* 1. เลือกอะไหล่ (มีระบบพิมพ์ค้นหาและแบ่งกลุ่มงาน) */}
            <div ref={dropdownRef} className="relative">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5 font-sans flex items-center gap-1.5">
                <span className="w-1.5 h-4 bg-blue-500 rounded-full inline-block"></span>
                ค้นหาและเลือกอะไหล่สำรอง (จัดกลุ่มตามหมวดหมู่):
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setSelectedPartId('');
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="พิมพ์เพื่อค้นหา หรือคลิกเพื่อเลือกตามประเภท..."
                  className="w-full pl-4 pr-20 py-3.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-sans transition-all"
                />
                <div className="absolute right-3.5 top-3.5 flex items-center gap-2">
                  {selectedPartId && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm('');
                        setSelectedPartId('');
                      }}
                      className="text-xs text-rose-500 hover:text-rose-700 font-bold font-sans cursor-pointer mr-1"
                    >
                      ล้างค่า
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    <ChevronDown className={`h-5 w-5 transform transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              </div>

              {/* รายการผลการค้นหาจัดแยกตามประเภทสินค้า */}
              {showDropdown && (
                <div className="absolute z-30 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-80 overflow-y-auto divide-y divide-slate-100 scrollbar-thin">
                  {Object.keys(groupedParts).length === 0 ? (
                    <div className="p-5 text-center text-sm text-slate-400 font-sans">
                      ไม่พบอะไหล่ที่ตรงตามเงื่อนไขการค้นหา
                    </div>
                  ) : (
                    Object.entries(groupedParts).map(([category, partList]) => (
                      <div key={category} className="bg-white">
                        {/* หัวข้อแสดงประเภทอะไหล่ที่เด่นชัด */}
                        <div className="sticky top-0 bg-slate-100/95 backdrop-blur-sm px-4 py-2 text-xs font-bold text-slate-600 border-y border-slate-200/80 uppercase tracking-wider flex items-center justify-between select-none z-10">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block shadow-sm"></span>
                            {category}
                          </span>
                          <span className="bg-slate-200 text-slate-700 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
                            {partList.length} รายการ
                          </span>
                        </div>
                        
                        {/* รายการย่อย */}
                        <div className="divide-y divide-slate-100">
                          {partList.map((part) => (
                            <button
                              key={part.id}
                              type="button"
                              onClick={() => handleSelectPart(part)}
                              className="w-full text-left px-5 py-3 hover:bg-blue-50/40 flex justify-between items-center transition-all cursor-pointer gap-3"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                {part.imageUrl ? (
                                  <img 
                                    src={getEmbeddableImageUrl(part.imageUrl)} 
                                    alt={part.name}
                                    referrerPolicy="no-referrer"
                                    className="w-10 h-10 object-cover rounded-lg border border-slate-200 bg-slate-100 shrink-0 shadow-sm"
                                    onError={(e) => {
                                      (e.currentTarget as HTMLImageElement).src = 'https://placehold.co/100?text=No+Img';
                                    }}
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] text-slate-400 shrink-0 font-sans">
                                    ไม่มีรูป
                                  </div>
                                )}
                                <div className="truncate">
                                  <p className="text-sm font-bold text-slate-800 font-mono flex items-center gap-2">
                                    <span>{part.id}</span>
                                    {part.quantity <= 0 && (
                                      <span className="text-[9px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-semibold font-sans">ของหมดคลัง!</span>
                                    )}
                                  </p>
                                  <p className="text-xs text-slate-500 font-sans mt-0.5 truncate">{part.name}</p>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <span className={`inline-block text-xs font-bold font-mono px-2 py-1 rounded-md border ${
                                  part.quantity < part.minStock 
                                    ? 'bg-rose-50 text-rose-700 border-rose-100' 
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                }`}>
                                  คงเหลือ: {part.quantity} {part.unit}
                                </span>
                                <p className="text-[10px] text-slate-400 font-sans mt-0.5">ที่เก็บ: {part.location}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* แสดงรายละเอียดอะไหล่ที่เลือกสำเร็จ */}
              {selectedPart && (
                <div className="mt-2.5 bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col sm:flex-row items-center gap-4 text-xs font-sans shadow-sm border-l-4 border-l-blue-500">
                  {selectedPart.imageUrl ? (
                    <img 
                      src={getEmbeddableImageUrl(selectedPart.imageUrl)} 
                      alt={selectedPart.name}
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 object-cover rounded-xl border border-slate-200 bg-white shadow-sm shrink-0"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = 'https://placehold.co/150?text=No+Image';
                      }}
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-[10px] text-slate-400 shrink-0 font-sans">
                      <span>ไม่มีรูปอะไหล่</span>
                    </div>
                  )}
                  <div className="flex-1 w-full flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                    <div className="space-y-1">
                      <p className="text-slate-500">หมวดหมู่: <span className="font-semibold text-slate-700">{selectedPart.category}</span></p>
                      <p className="text-slate-500">ตำแหน่งจัดเก็บ: <span className="font-semibold text-slate-700">{selectedPart.location}</span></p>
                    </div>
                    <div className="sm:text-right space-y-1">
                      <p className="text-slate-500 font-sans">สต็อกคงเหลือ: <span className={`font-bold font-mono text-sm ${selectedPart.quantity < selectedPart.minStock ? 'text-rose-600' : 'text-emerald-700'}`}>{selectedPart.quantity} {selectedPart.unit}</span></p>
                      <p className="text-[10px] text-slate-400 font-mono">Min: {selectedPart.minStock} | Max: {selectedPart.maxStock}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 2. จำนวนอะไหล่ */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5 font-sans flex items-center gap-1.5">
                <span className="w-1.5 h-4 bg-blue-500 rounded-full inline-block"></span>
                ระบุจำนวนที่ต้องการ ({selectedPart?.unit || 'หน่วย'}):
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  value={quantity}
                  onChange={(e) => {
                    const val = e.target.value;
                    setQuantity(val === '' ? '' : Number(val));
                  }}
                  placeholder="0.00"
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono transition-all"
                  disabled={!selectedPartId}
                />
                <div className="absolute right-4 top-3.5 text-sm font-semibold text-slate-500 font-sans">
                  {selectedPart?.unit || '-'}
                </div>
              </div>

              {/* แจ้งเตือนกรณีจำนวนเบิกเกินยอดสต็อกจริง */}
              {hasLowStockAlert && (
                <div className="mt-2 bg-rose-50 text-rose-700 rounded-xl p-4 border border-rose-150 flex items-start gap-2 text-xs font-sans shadow-sm border-l-4 border-l-rose-500">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600 animate-bounce" />
                  <div>
                    <span className="font-bold text-rose-800">สต็อกไม่เพียงพอ!</span> ยอดคงเหลือในตู้มีเพียง {selectedPart?.quantity} {selectedPart?.unit} แต่ช่างต้องการเบิก {quantity} {selectedPart?.unit} กรุณาระบุค่าให้ถูกต้อง
                  </div>
                </div>
              )}
            </div>

            {/* 3. ชื่อช่างเทคนิค */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5 font-sans flex items-center gap-1.5">
                <span className="w-1.5 h-4 bg-blue-500 rounded-full inline-block"></span>
                ชื่อช่างเทคนิคผู้ทำรายการ:
              </label>
              <input
                type="text"
                value={technician}
                onChange={(e) => setTechnician(e.target.value)}
                placeholder="พิมพ์ชื่อ-นามสกุลจริงของช่างเทคนิค"
                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-sans transition-all"
              />
            </div>

            {/* 4. เชื่อมโยงประวัติเครื่องจักร (เฉพาะเบิกจ่าย) */}
            {type === 'เบิกจ่าย' && (
              <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/40 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900 uppercase">
                  <Cpu className="h-4 w-4 text-blue-600" />
                  <span>เชื่อมโยงข้อมูลกับเครื่องจักรในระบบ</span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 font-sans">
                    เลือกเครื่องจักร/อุปกรณ์ที่ต้องการบันทึกประวัติซ่อมบำรุง:
                  </label>
                  <select
                    value={selectedEquipmentId}
                    onChange={(e) => {
                      setSelectedEquipmentId(e.target.value);
                    }}
                    className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-sans transition-all"
                  >
                    <option value="">-- ไม่เชื่อมโยง (ระบุเครื่องจักร/ไลน์ผลิตเองด้านล่าง) --</option>
                    {equipments.map((eq) => (
                      <option key={eq.id} value={eq.id}>
                        [{eq.id}] {eq.name} ({eq.location})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* 5. รายละเอียดอาการชำรุด หรือ บรรทัดการผลิต */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5 font-sans flex items-center gap-1.5">
                <span className="w-1.5 h-4 bg-blue-500 rounded-full inline-block"></span>
                {type === 'เบิกจ่าย' && selectedEquipmentId ? (
                  <span>รายละเอียดอาการชำรุด / การแก้ไขบำรุงรักษา: <span className="text-red-500">*</span></span>
                ) : (
                  <span>รหัสเครื่องจักร / บรรทัดไลน์ผลิตที่นำไปซ่อมแซม: <span className="text-red-500">*</span></span>
                )}
              </label>
              <input
                type="text"
                value={machineNote}
                onChange={(e) => setMachineNote(e.target.value)}
                placeholder={
                  type === 'เบิกจ่าย' && selectedEquipmentId
                    ? "เช่น เปลี่ยนกระบอกสูบตัวใหม่เนื่องจากสึกหรอ, เปลี่ยนใบมีดชำรุด"
                    : "ระบุ เช่น เครื่องแพ็ค No.2 แผนกสไลด์ฟิล์ม"
                }
                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-sans transition-all"
              />
              {type === 'เบิกจ่าย' && selectedEquipmentId && (
                <p className="text-[10px] text-emerald-600 font-semibold mt-1.5 flex items-center gap-1">
                  ✨ ยอดเยี่ยม! ระบบจะตัดยอดคลังคู่อัตโนมัติ และบันทึกประวัตินี้ลงแท็บ "งานซ่อมบำรุง" ทันที!
                </p>
              )}
            </div>

            {/* แสดงกล่องแจ้งเตือนข้อมูลผิดพลาดหรือฟิลด์ที่กรอกไม่ครบถ้วน */}
            {localError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3.5 text-xs font-semibold font-sans flex items-start gap-2 border-l-4 border-l-rose-500 shadow-sm animate-pulse">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
                <div>{localError}</div>
              </div>
            )}

            {/* ปุ่มกดขนาดใหญ่พิเศษ (สวมถุงมือซ่อมงานก็กดง่าย) */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-4 px-4 rounded-xl text-base font-bold font-sans transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] ${
                  isSubmitting
                    ? 'bg-slate-200 text-slate-400 shadow-none cursor-not-allowed'
                    : type === 'เบิกจ่าย'
                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20 hover:shadow-xl'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 hover:shadow-xl'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                    <span>กำลังส่งประวัติลงชีต...</span>
                  </>
                ) : type === 'เบิกจ่าย' ? (
                  <>
                    <Upload className="h-5 w-5 shrink-0" />
                    <span>ยืนยันการบันทึกใบเบิกอะไหล่</span>
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5 shrink-0" />
                    <span>ยืนยันการรับอะไหล่เข้าคลัง</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* 5. Custom Confirmation Modal for IFrame environments */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-100 flex flex-col space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 text-slate-900">
              <ClipboardList className={`h-5 w-5 ${type === 'เบิกจ่าย' ? 'text-rose-600' : 'text-emerald-600'}`} />
              <h3 className="text-base font-bold font-display">
                ยืนยันการบันทึกข้อมูลใช่หรือไม่?
              </h3>
            </div>

            <div className="space-y-2.5 text-xs font-sans text-slate-700">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-semibold">ประเภทรายการ:</span>
                <span className={`font-bold px-2 py-0.5 rounded ${type === 'เบิกจ่าย' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
                  {type === 'เบิกจ่าย' ? '🔴 เบิกจ่ายออกจากคลัง' : '🟢 รับเข้าคลังสินค้า'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-semibold">อะไหล่:</span>
                <span className="font-bold text-slate-800 text-right max-w-[240px] truncate" title={selectedPart?.name}>
                  [{selectedPartId}] {selectedPart?.name}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-semibold">จำนวน:</span>
                <span className="font-mono font-bold text-slate-900">
                  {quantity} {selectedPart?.unit}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-semibold">ช่างเทคนิคผู้ทำรายการ:</span>
                <span className="font-bold text-slate-800">{technician}</span>
              </div>
              <div className="flex flex-col py-1 space-y-1">
                <span className="text-slate-400 font-semibold">บันทึกงานซ่อม/ไลน์การผลิต:</span>
                <span className="p-2.5 bg-slate-50 rounded-lg border border-slate-150 text-slate-800 text-[11px] leading-relaxed break-words whitespace-pre-wrap">
                  {type === 'เบิกจ่าย' && selectedEquipmentId ? `🔧 [เครื่องจักร: ${equipments.find(e => e.id === selectedEquipmentId)?.name}] ${machineNote}` : machineNote}
                </span>
              </div>

              {/* คำแนะนำแจ้งเตือนความต่างคลังคู่วิกฤต */}
              {type === 'เบิกจ่าย' && selectedPart && Number(quantity) > selectedPart.quantity && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold rounded-lg flex items-start gap-1.5 leading-relaxed">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                  <div>
                    <span className="font-bold text-amber-950 block">แจ้งเตือนสถานะคลัง:</span>
                    ยอดเบิกมากกว่าสต็อกจริงที่มีอยู่ ({selectedPart.quantity} {selectedPart.unit}) ระบบจะปรับยอดเป็นติดลบชั่วคราวให้ช่างทำงานเสร็จก่อน
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleActualSubmit}
                className={`flex-1 py-3 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                  type === 'เบิกจ่าย' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                <span>บันทึกข้อมูล</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
