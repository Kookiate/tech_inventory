import React, { useState } from 'react';
import { SparePart } from '../types';
import { Search, AlertTriangle, CheckCircle, ArrowRightLeft, RefreshCw, Layers, Plus, X, FolderPlus, HelpCircle, Edit, QrCode, Printer } from 'lucide-react';
import { getEmbeddableImageUrl, isGoogleDriveUrl } from '../utils/image';
import QRCode from 'qrcode';

interface InventoryTabProps {
  parts: SparePart[];
  onQuickAction: (partId: string) => void;
  onRefresh: () => Promise<void>;
  isRefreshing: boolean;
  onAddPart: (part: {
    id: string;
    name: string;
    category: string;
    location: string;
    quantity: number;
    unit: string;
    minStock: number;
    maxStock: number;
    price: number;
    imageUrl: string;
  }) => Promise<void>;
  onUpdatePart: (part: {
    id: string;
    name: string;
    category: string;
    location: string;
    quantity: number;
    unit: string;
    minStock: number;
    maxStock: number;
    price: number;
    imageUrl: string;
  }) => Promise<void>;
}

export default function InventoryTab({ parts, onQuickAction, onRefresh, isRefreshing, onAddPart, onUpdatePart }: InventoryTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด');

  // Status for adding new parts form
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formId, setFormId] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('เครื่องแพ็ค');
  const [formCustomCategory, setFormCustomCategory] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formQuantity, setFormQuantity] = useState(0);
  const [formUnit, setFormUnit] = useState('ชิ้น');
  const [formMinStock, setFormMinStock] = useState(5);
  const [formMaxStock, setFormMaxStock] = useState(50);
  const [formPrice, setFormPrice] = useState(0);
  const [formImageUrl, setFormImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  
  // สถานะเปิดดูรูปขยายใหญ่ (Lightbox Zoom)
  const [zoomedImage, setZoomedImage] = useState<{ url: string; name: string } | null>(null);

  // QR Code states
  const [selectedPartForQr, setSelectedPartForQr] = useState<SparePart | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  const handleShowQrSticker = async (part: SparePart) => {
    setSelectedPartForQr(part);
    try {
      // สร้าง QR Code จาก ID ของอะไหล่ เพื่อสแกนเบิกได้รวดเร็ว
      const url = await QRCode.toDataURL(part.id, {
        margin: 1,
        width: 180,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      setQrCodeDataUrl(url);
    } catch (err) {
      console.error('Failed to generate QR Code:', err);
    }
  };

  // ดึงรายการตำแหน่งจัดเก็บที่ไม่ซ้ำทั้งหมดในระบบ เพื่อสร้างเป็น Drop-down Suggestion
  const existingLocations = Array.from(
    new Set(
      parts
        .map(p => p.location ? p.location.trim() : '')
        .filter(loc => loc !== '')
    )
  ).sort((a, b) => a.localeCompare(b, 'th'));

  // ดึงรายการหมวดหมู่ที่ไม่ซ้ำทั้งหมดในระบบ เพื่อสร้างเป็นตัวเลือกใน Drop-down
  const systemCategories = Array.from(
    new Set([
      'เครื่องแพ็ค',
      'ปืนลมยิงตะปู',
      'อุปกรณ์ทั่วไป',
      ...parts.map(p => p.category ? p.category.trim() : '').filter(cat => cat !== '')
    ])
  ).sort((a, b) => a.localeCompare(b, 'th'));

  // ฟังก์ชันคำนวณและคาดเดารหัสอะไหล่ใหม่ถัดไปโดยอัตโนมัติ เพื่ออำนวยความสะดวก
  const suggestNextId = () => {
    let maxNum = 0;
    parts.forEach(part => {
      const match = part.id.match(/^SP-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) {
          maxNum = num;
        }
      }
    });
    const nextNum = maxNum + 1;
    return `SP-${String(nextNum).padStart(3, '0')}`;
  };

  // ฟังก์ชันตั้งค่าข้อมูลสำหรับการแก้ไขข้อมูล
  const handleEditClick = (part: SparePart) => {
    setIsEditMode(true);
    setFormId(part.id);
    setFormName(part.name);
    
    // ตรวจสอบความถูกต้องหมวดหมู่ของเดิม
    if (systemCategories.includes(part.category)) {
      setFormCategory(part.category);
      setFormCustomCategory('');
    } else {
      setFormCategory('ระบุเอง...');
      setFormCustomCategory(part.category);
    }
    
    setFormLocation(part.location);
    setFormQuantity(part.quantity);
    setFormUnit(part.unit);
    setFormMinStock(part.minStock);
    setFormMaxStock(part.maxStock);
    setFormPrice(part.price);
    setFormImageUrl(part.imageUrl || '');
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formId.trim()) {
      setFormError('กรุณากรอกรหัสอะไหล่');
      return;
    }
    if (!formName.trim()) {
      setFormError('กรุณากรอกชื่ออะไหล่');
      return;
    }
    if (formCategory === 'ระบุเอง...' && !formCustomCategory.trim()) {
      setFormError('กรุณาระบุชื่อหมวดหมู่ที่ต้องการ');
      return;
    }
    if (!formLocation.trim()) {
      setFormError('กรุณากรอกตำแหน่งจัดเก็บ');
      return;
    }
    if (formQuantity < 0) {
      setFormError('จำนวนคงเหลือต้องเป็นศูนย์หรือมากกว่า');
      return;
    }
    if (formMinStock < 0) {
      setFormError('เกณฑ์ควบคุมความปลอดภัยขั้นต่ำ (Min) ต้องไม่ติดลบ');
      return;
    }
    if (formMaxStock < formMinStock) {
      setFormError('ระดับจัดเก็บสูงสุด (Max) ต้องไม่ต่ำกว่าระดับขั้นต่ำ (Min)');
      return;
    }

    // ตรวจสอบกับข้อมูลรหัสที่มีอยู่เดิมในเครื่อง (เฉพาะเมื่อไม่ใช่โหมดแก้ไข)
    if (!isEditMode) {
      const isDuplicate = parts.some(p => p.id.trim().toLowerCase() === formId.trim().toLowerCase());
      if (isDuplicate) {
        setFormError(`รหัสอะไหล่ "${formId.trim().toUpperCase()}" มีอยู่ในระบบเรียบร้อยแล้ว กรุณาตรวจสอบหรือเปลี่ยนรหัส`);
        return;
      }
    }

    if (formPrice < 0) {
      setFormError('ราคาต่อหน่วยต้องไม่ต่ำกว่าศูนย์');
      return;
    }

    setIsSubmitting(true);
    try {
      const finalCategory = formCategory === 'ระบุเอง...' ? formCustomCategory : formCategory;
      const partPayload = {
        id: formId.trim().toUpperCase(),
        name: formName.trim(),
        category: finalCategory.trim(),
        location: formLocation.trim(),
        quantity: Number(formQuantity),
        unit: formUnit.trim(),
        minStock: Number(formMinStock),
        maxStock: Number(formMaxStock),
        price: Number(formPrice),
        imageUrl: formImageUrl.trim(),
      };

      if (isEditMode) {
        await onUpdatePart(partPayload);
      } else {
        await onAddPart(partPayload);
      }
      setIsAddModalOpen(false);
    } catch (error: any) {
      setFormError(error.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSubmitting(false);
    }
  };

  // รายการหมวดหมู่ทั้งหมดสำหรับตัวกรอง
  const categories = Array.from(
    new Set([
      'ทั้งหมด',
      ...systemCategories
    ])
  );

  // ฟิลเตอร์คัดกรองข้อมูล
  const filteredParts = parts.filter(part => {
    const matchesSearch = 
      part.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'ทั้งหมด' || part.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
      {/* ส่วนหัวการจัดการคลัง */}
      <div className="bg-slate-900 px-6 py-5 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b-4 border-blue-500">
        <div className="flex items-center gap-2.5">
          <Layers className="h-5 w-5 text-blue-400" />
          <div>
            <h3 className="font-display font-bold text-lg">ยอดสต็อกและตำแหน่งจัดเก็บ (Inventory levels)</h3>
            <p className="text-xs text-slate-400 font-sans mt-0.5">ตรวจสอบระดับอะไหล่สำรองในตู้จัดเก็บตามไลน์ผลิต</p>
          </div>
        </div>

        {/* แถบปุ่มจัดการ */}
        <div className="flex flex-wrap items-center gap-2">
          {/* ปุ่มลัดรีเฟรชยอด */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 border border-slate-700/60 rounded-xl text-xs font-semibold hover:bg-slate-700 transition-all disabled:opacity-50 cursor-pointer text-slate-200"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>รีเฟรชข้อมูล</span>
          </button>

          {/* ปุ่มเพิ่มอะไหล่ใหม่ */}
          <button
            onClick={() => {
              setIsEditMode(false);
              setFormId(suggestNextId());
              setFormName('');
              setFormCategory('เครื่องแพ็ค');
              setFormCustomCategory('');
              setFormLocation('');
              setFormQuantity(0);
              setFormUnit('ชิ้น');
              setFormMinStock(5);
              setFormMaxStock(50);
              setFormPrice(0);
              setFormImageUrl('');
              setFormError('');
              setIsAddModalOpen(true);
            }}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 rounded-xl text-xs font-bold hover:bg-blue-700 transition-all disabled:opacity-50 cursor-pointer text-white shadow-md shadow-blue-600/10 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>เพิ่มอะไหล่ใหม่</span>
          </button>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* คอนโทรลบ็อกซ์: ช่องพิมพ์และฟิลเตอร์ */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="พิมพ์รหัสอะไหล่, ชื่อชิ้นส่วน, หรือตำแหน่งจัดเก็บ..."
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-sans transition-all"
            />
            <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-3 text-xs font-bold rounded-xl border transition-all cursor-pointer whitespace-nowrap font-sans ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-600/10'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* ตารางแสดงระดับอะไหล่ */}
        <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto shadow-inner bg-slate-50/50">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/80 text-slate-700 text-xs font-bold border-b border-slate-200 uppercase tracking-wider font-sans">
                <th className="py-4 px-4 font-bold">รหัสอะไหล่</th>
                <th className="py-4 px-4 font-bold text-center">รูปอะไหล่</th>
                <th className="py-4 px-4 font-bold">ชื่ออะไหล่</th>
                <th className="py-4 px-4 font-bold">หมวดหมู่</th>
                <th className="py-4 px-4 font-bold">ตำแหน่งจัดเก็บ</th>
                <th className="py-4 px-4 text-right font-bold">คงเหลือ</th>
                <th className="py-4 px-4 font-bold">หน่วย</th>
                <th className="py-4 px-4 text-right text-emerald-700 font-bold">ราคา/หน่วย</th>
                <th className="py-4 px-4 text-right text-teal-700 font-bold">ต้นทุนรวม</th>
                <th className="py-4 px-4 text-right text-amber-700 font-bold">Min</th>
                <th className="py-4 px-4 text-right text-blue-700 font-bold">Max</th>
                <th className="py-4 px-4 text-center font-bold">สเตตัส</th>
                <th className="py-4 px-4 text-center font-bold">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredParts.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-sm text-slate-400 font-sans">
                    ไม่พบรายการอะไหล่ในคลังตามเงื่อนไขที่ระบุ
                  </td>
                </tr>
              ) : (
                filteredParts.map((part) => {
                  const isBelowMin = part.quantity < part.minStock;
                  return (
                    <tr 
                      key={part.id} 
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isBelowMin ? 'animate-blink-danger' : ''
                      }`}
                    >
                      <td className="py-4 px-4 font-mono font-bold text-slate-800 text-sm whitespace-nowrap">
                        {part.id}
                      </td>
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        {part.imageUrl ? (
                          <img 
                            src={getEmbeddableImageUrl(part.imageUrl)} 
                            alt={part.name}
                            referrerPolicy="no-referrer"
                            className="w-12 h-12 object-cover rounded-lg border border-slate-200 shadow-sm hover:scale-110 hover:shadow transition-all cursor-zoom-in inline-block bg-slate-50"
                            onClick={() => setZoomedImage({ url: getEmbeddableImageUrl(part.imageUrl || ''), name: part.name })}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] text-slate-400 font-sans inline-block">
                            ไม่มีรูป
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="font-semibold text-slate-900 text-sm">{part.name}</span>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap text-xs">
                        <span className="inline-block px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                          {part.category}
                        </span>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap text-xs text-slate-600 font-sans">
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-100 text-slate-700 font-medium border border-slate-200">
                          <span className="h-2 w-2 rounded-full bg-blue-500" />
                          {part.location}
                        </span>
                      </td>
                      <td className={`py-4 px-4 text-right font-mono font-bold text-base whitespace-nowrap ${
                        isBelowMin ? 'text-red-600' : 'text-slate-800'
                      }`}>
                        {part.quantity}
                      </td>
                      <td className="py-4 px-4 text-xs font-semibold text-slate-500 whitespace-nowrap font-sans">
                        {part.unit}
                      </td>
                      <td className="py-4 px-4 text-right font-mono text-xs text-emerald-700 font-bold whitespace-nowrap">
                        ฿{(part.price || 0).toLocaleString()}
                      </td>
                      <td className="py-4 px-4 text-right font-mono text-xs text-teal-700 font-bold whitespace-nowrap">
                        ฿{((part.price || 0) * part.quantity).toLocaleString()}
                      </td>
                      <td className="py-4 px-4 text-right font-mono text-xs text-slate-500 whitespace-nowrap">
                        {part.minStock}
                      </td>
                      <td className="py-4 px-4 text-right font-mono text-xs text-slate-500 whitespace-nowrap">
                        {part.maxStock}
                      </td>
                      <td className="py-4 px-4 text-center whitespace-nowrap text-xs font-sans">
                        {isBelowMin ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-100 text-rose-700 font-bold border border-rose-200">
                            <AlertTriangle className="h-3 w-3 animate-bounce text-rose-600" />
                            <span>สั่งซื้อด่วน</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                            <CheckCircle className="h-3 w-3 text-emerald-600" />
                            <span>ปกติ</span>
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center whitespace-nowrap text-xs">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onQuickAction(part.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md shadow-blue-600/10 focus:outline-none transition-all cursor-pointer active:scale-95"
                          >
                            <ArrowRightLeft className="h-3 w-3" />
                            <span>ทำรายการ</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditClick(part)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 border border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-200 focus:outline-none transition-all cursor-pointer active:scale-95"
                            title="แก้ไขข้อมูลอะไหล่"
                          >
                            <Edit className="h-3 w-3 text-slate-500" />
                            <span>แก้ไข</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleShowQrSticker(part)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-violet-50 border border-violet-200 text-violet-700 font-bold rounded-lg hover:bg-violet-100 focus:outline-none transition-all cursor-pointer active:scale-95"
                            title="พิมพ์สติกเกอร์ QR Code"
                          >
                            <QrCode className="h-3 w-3" />
                            <span>QR Code</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* โมดูลหน้าต่างป๊อปอัปเพิ่มอะไหล่ชิ้นใหม่ (Add New Spare Part Modal) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden max-h-[90vh] animate-scale-up">
            
            {/* ส่วนหัว Modal */}
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between border-b-4 border-blue-500">
              <div className="flex items-center gap-2">
                <FolderPlus className="h-5 w-5 text-blue-400" />
                <h3 className="font-display font-bold text-base">
                  {isEditMode ? 'แก้ไขข้อมูลอะไหล่ (Edit Spare Part)' : 'ลงทะเบียนเพิ่มอะไหล่ชิ้นใหม่ (Register New Spare Part)'}
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white transition-all cursor-pointer p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* ส่วนเนื้อหาฟอร์ม */}
            <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 1. รหัสอะไหล่ */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 block">
                    รหัสอะไหล่ (Part ID) {isEditMode && <span className="text-slate-400 font-normal">(แก้ไขไม่ได้)</span>} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formId}
                    onChange={(e) => setFormId(e.target.value.toUpperCase())}
                    placeholder="ตัวอย่าง SP-009"
                    disabled={isEditMode}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold uppercase transition-all disabled:bg-slate-100 disabled:text-slate-500"
                    required
                  />
                  <p className="text-[10px] text-slate-400 font-medium">
                    {isEditMode ? 'รหัสนี้เชื่อมโยงกับฐานข้อมูลชีตเพื่อไม่ให้ข้อมูลอื่นคลาดเคลื่อน' : 'ระบบคำนวณและป้อนรหัสถัดไปให้อัตโนมัติเพื่อป้องกันความสับสน'}
                  </p>
                </div>

                {/* 2. ชื่ออะไหล่ */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 block">ชื่อชิ้นส่วนอะไหล่ (Part Name) <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="ตัวอย่าง ใบมีดตัดฟิล์มชนิดคมพิเศษ"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans transition-all"
                    required
                  />
                </div>

                {/* 2.5 ลิงก์รูปภาพอะไหล่ */}
                <div className="space-y-1.5 md:col-span-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-500 block">ลิงก์รูปภาพอะไหล่ (Image URL)</label>
                    <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                      <HelpCircle className="h-3 w-3" /> รองรับลิงก์ Google Drive
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={formImageUrl}
                      onChange={(e) => setFormImageUrl(e.target.value)}
                      placeholder="เช่น ลิงก์จาก Unsplash หรือวางลิงก์แชร์จาก Google Drive ได้โดยตรง"
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans transition-all"
                    />
                    {formImageUrl && (
                      <button
                        type="button"
                        onClick={() => setFormImageUrl('')}
                        className="px-3 py-2 border border-slate-300 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-50 text-xs font-bold shrink-0"
                      >
                        ล้าง
                      </button>
                    )}
                  </div>
                  
                  {/* กล่องช่วยสอนสำหรับผู้ใช้ Google Drive */}
                  <div className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                    <p className="font-bold text-slate-700">💡 วิธีนำรูปลง Google Drive ให้แสดงผลสำเร็จ:</p>
                    <ul className="list-decimal pl-4 space-y-0.5 text-slate-600">
                      <li>อัปโหลดรูปภาพลง Google Drive ของคุณ</li>
                      <li>คลิกขวาที่ไฟล์รูปภาพ ➡️ เลือก <strong className="text-blue-600">แชร์ (Share)</strong></li>
                      <li>เปลี่ยนสิทธิ์การเข้าถึงจาก "จำกัด" เป็น <strong className="text-emerald-600">"ทุกคนที่มีลิงก์ (Anyone with the link)"</strong> และเลือกบทบาทเป็นผู้ดู</li>
                      <li>คัดลอกลิงก์มาวางในช่องด้านบนได้ทันที ระบบจะช่วยแปลงให้แสดงรูปภาพโดยอัตโนมัติ!</li>
                    </ul>
                  </div>

                  {formImageUrl && (
                    <div className="mt-2 flex items-center gap-3 p-2.5 border border-slate-200 rounded-xl bg-slate-50/50">
                      <img 
                        src={getEmbeddableImageUrl(formImageUrl)} 
                        alt="Preview" 
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 object-cover rounded-lg border border-slate-200 bg-white shadow-sm"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = 'https://placehold.co/100?text=Invalid+Image';
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] text-slate-500 block">ภาพจำลองตัวอย่างที่จะแสดงผล</span>
                        {isGoogleDriveUrl(formImageUrl) && (
                          <span className="text-[9px] text-emerald-600 font-semibold block mt-0.5">✨ ตรวจพบลิงก์ Google Drive: ระบบได้แปลงลิงก์ Direct Link ให้แล้ว</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. หมวดหมู่ */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 block">หมวดหมู่กลุ่มงาน (Category) <span className="text-red-500">*</span></label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans bg-white transition-all"
                  >
                    {systemCategories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="ระบุเอง...">ระบุหมวดหมู่ใหม่เอง...</option>
                  </select>
                </div>

                {/* 3.1 หมวดหมู่กำหนดเอง (ถ้าเลือก ระบุเอง...) */}
                {formCategory === 'ระบุเอง...' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 block">ระบุชื่อหมวดหมู่ใหม่ <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={formCustomCategory}
                      onChange={(e) => setFormCustomCategory(e.target.value)}
                      placeholder="ตัวอย่าง เครื่องเป่าขวด, ระบบไฟฟ้า"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans transition-all"
                      required
                    />
                  </div>
                )}

                {/* 4. ตำแหน่งจัดเก็บ */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-500 block">ตำแหน่งจัดเก็บตู้คลัง (Location) <span className="text-red-500">*</span></label>
                    {existingLocations.length > 0 && (
                      <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-semibold">
                        💡 ดับเบิ้ลคลิกเพื่อดูประวัติตำแหน่งเดิม
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="ตัวอย่าง Cabinet A-4, Shelf C-1"
                    list="existing-locations"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans transition-all"
                    required
                  />
                  <datalist id="existing-locations">
                    {existingLocations.map((loc) => (
                      <option key={loc} value={loc} />
                    ))}
                  </datalist>
                </div>

                {/* 5. จำนวนเริ่มต้น */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 block">จำนวนรับเข้าเริ่มแรก (Initial Stock)</label>
                  <input
                    type="number"
                    min="0"
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono transition-all"
                  />
                </div>

                {/* 5.5 ราคาอะไหล่ต่อหน่วย */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 block text-emerald-700">ราคาอะไหล่ต่อหน่วย (บาท) <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-400 text-xs">฿</span>
                    <input
                      type="number"
                      min="0"
                      value={formPrice || ''}
                      onChange={(e) => setFormPrice(Number(e.target.value))}
                      placeholder="เช่น 150, 450"
                      className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-emerald-700 font-bold transition-all"
                      required
                    />
                  </div>
                </div>

                {/* 6. หน่วยนับ */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 block">หน่วยนับปริมาณ (Unit) <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    placeholder="ตัวอย่าง ชิ้น, ตัว, ใบ, ม้วน, ชุด"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans transition-all"
                    required
                  />
                </div>

                {/* 7. เกณฑ์ความมั่นคงขั้นต่ำ (Min Stock) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 block text-rose-700">เกณฑ์แจ้งเตือนสต็อกต่ำ (Min Stock) <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    min="0"
                    value={formMinStock}
                    onChange={(e) => setFormMinStock(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono transition-all text-rose-700 font-bold"
                    required
                  />
                  <p className="text-[10px] text-slate-400">ระบบจะเปลี่ยนสเตตัสเป็น "สั่งซื้อด่วน" สีแดงเมื่อจำนวนต่ำกว่าเกณฑ์นี้</p>
                </div>

                {/* 8. เกณฑ์จัดเก็บสูงสุด (Max Stock) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 block text-blue-700">เกณฑ์จัดเก็บสูงสุด (Max Stock) <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    min="0"
                    value={formMaxStock}
                    onChange={(e) => setFormMaxStock(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono transition-all text-blue-700 font-bold"
                    required
                  />
                </div>

              </div>

              {/* ส่วนสัญญายืนยันและควบคุมคลัง */}
              <div className="p-3 bg-blue-50 text-blue-900 border border-blue-200 text-[11px] rounded-xl leading-relaxed">
                ℹ️ <strong>ความมั่นคงเชิงวิศวกรรม:</strong> ระบบจะเชื่อมโยงข้อมูลและทำการเขียนบันทึกลง Google Sheets ของตระกูลคลัง "Inventory" ให้ท่านทันที และระดับจัดเก็บคงเหลือจะถูกเชื่อมเข้าตัวแดชบอร์ดหลักโดยตรง
              </div>

              {/* ปุ่มจังหวะการทำรายการ */}
              <div className="pt-3 border-t border-slate-150 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer active:scale-95"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50 font-sans"
                >
                  {isSubmitting ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <FolderPlus className="h-3.5 w-3.5" />
                  )}
                  <span>
                    {isSubmitting 
                      ? 'กำลังบันทึกลง Sheet...' 
                      : isEditMode 
                        ? 'บันทึกการแก้ไขข้อมูล' 
                        : 'ลงทะเบียนและบันทึก'}
                  </span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* กล่องเปิดดูภาพขยายใหญ่ (Image Lightbox Modal) */}
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
              <p className="text-xs text-slate-500 mt-1">ภาพชิ้นส่วนอะไหล่จริง</p>
            </div>
          </div>
        </div>
      )}

      {/* โมดอลพิมพ์สติกเกอร์ QR Code */}
      {selectedPartForQr && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-scale-up">
            
            {/* ส่วนหัว Modal */}
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between border-b-4 border-violet-500">
              <div className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-violet-400" />
                <h3 className="font-display font-bold text-base">
                  พิมพ์สติกเกอร์บาร์โค้ด QR Code
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedPartForQr(null)}
                className="text-slate-400 hover:text-white transition-all cursor-pointer p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="text-center">
                <p className="text-xs text-slate-500 font-sans">
                  สติกเกอร์ขนาด <strong className="text-slate-800 font-mono">30mm x 60mm</strong> อัตราส่วน 1:2 เหมาะสำหรับพิมพ์ออกเครื่องพิมพ์ความร้อน (Thermal Label Printer)
                </p>
              </div>

              {/* จำลองขนาดสติกเกอร์จริง (60x30 มม. อัตราส่วน 2:1) ในหน้าจอ */}
              <div className="flex justify-center">
                <div className="w-[320px] h-[160px] bg-white border-2 border-dashed border-slate-300 rounded-lg p-3 flex flex-row items-center justify-between shadow-md relative overflow-hidden select-none bg-slate-50/20">
                  {/* ขอบเขตระยะปลอดภัยตัดขอบ */}
                  <div className="absolute top-0.5 right-1 text-[8px] font-mono text-slate-300">
                    30mm x 60mm Label
                  </div>
                  
                  {/* ซีกซ้าย: QR Code */}
                  <div className="w-[40%] flex items-center justify-center">
                    {qrCodeDataUrl ? (
                      <img 
                        src={qrCodeDataUrl} 
                        alt="Sticker QR Code" 
                        className="w-24 h-24 object-contain bg-white p-1 border border-slate-150 rounded"
                      />
                    ) : (
                      <div className="w-24 h-24 bg-slate-100 animate-pulse rounded flex items-center justify-center text-slate-400 text-[10px]">
                        กำลังสร้าง QR...
                      </div>
                    )}
                  </div>

                  {/* ซีกขวา: ข้อมูลชิ้นงาน */}
                  <div className="w-[60%] pl-3 flex flex-col justify-center text-left h-full border-l border-slate-200">
                    <span className="text-[10px] font-mono font-bold text-violet-600 tracking-wide">SPARE PART ID</span>
                    <span className="text-lg font-mono font-extrabold text-slate-950 leading-none mb-1">
                      {selectedPartForQr.id}
                    </span>
                    <span className="text-xs font-bold text-slate-900 leading-tight line-clamp-2 mb-1.5 font-sans">
                      {selectedPartForQr.name}
                    </span>
                    <div className="space-y-0.5 text-[9px] font-medium text-slate-600 font-sans">
                      <div><span className="text-slate-400">หมวดหมู่:</span> {selectedPartForQr.category}</div>
                      <div><span className="text-slate-400">ตำแหน่ง:</span> {selectedPartForQr.location}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 text-amber-900 border border-amber-200 text-xs p-3.5 rounded-xl leading-relaxed font-sans">
                💡 <strong>คำแนะนำการสั่งพิมพ์:</strong> เมื่อกดปุ่มสั่งพิมพ์แล้ว หน้าต่างพิมพ์ของเบราว์เซอร์จะปรากฏขึ้น ให้เลือกเครื่องพิมพ์สติกเกอร์ความร้อน (Thermal Printer) แล้วตั้งค่า <strong>Paper Size</strong> เป็น <strong>30mm x 60mm</strong> (หรือ 60mm x 30mm) และปรับขนาด <strong>Margins</strong> เป็น <strong>None (ไม่มีระยะขอบ)</strong> เพื่อความพอดี
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedPartForQr(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer active:scale-95"
                >
                  ปิดหน้าต่าง
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-md shadow-violet-600/10 font-sans"
                >
                  <Printer className="h-4 w-4" />
                  <span>สั่งพิมพ์สติกเกอร์</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* โครงสร้างพิมพ์สติกเกอร์ที่มองไม่เห็นในหน้าจอปกติ แต่ใช้พิมพ์โดยเฉพาะ (Print-only view) */}
      {selectedPartForQr && (
        <div id="print-section" className="hidden">
          {/* ซีกซ้าย: QR Code (25mm x 25mm) */}
          <div style={{ width: '25mm', height: '25mm', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {qrCodeDataUrl && (
              <img 
                src={qrCodeDataUrl} 
                alt="QR Code" 
                style={{ width: '24mm', height: '24mm', objectFit: 'contain' }}
              />
            )}
          </div>
          {/* ซีกขวา: ข้อมูลชิ้นงาน (31mm x 26mm) */}
          <div style={{ 
            width: '31mm', 
            height: '26mm', 
            paddingLeft: '1.5mm', 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            color: 'black',
            overflow: 'hidden'
          }}>
            <div style={{ fontSize: '7.5px', fontWeight: 'bold', fontFamily: 'monospace', color: '#4f46e5', letterSpacing: '0.5px', marginBottom: '0.5px' }}>
              SPARE PART ID
            </div>
            <div style={{ fontSize: '13.5px', fontWeight: '900', fontFamily: 'monospace', color: 'black', lineHeight: '1.1', marginBottom: '1px' }}>
              {selectedPartForQr.id}
            </div>
            <div style={{ 
              fontSize: '8.5px', 
              fontWeight: 'bold', 
              color: 'black', 
              lineHeight: '1.2', 
              marginBottom: '2px',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {selectedPartForQr.name}
            </div>
            <div style={{ fontSize: '7px', fontWeight: 'bold', color: '#4b5563', lineHeight: '1.2' }}>
              ประเภท: {selectedPartForQr.category}
            </div>
            <div style={{ fontSize: '7px', fontWeight: 'bold', color: '#4b5563', lineHeight: '1.2' }}>
              ตำแหน่ง: {selectedPartForQr.location}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
