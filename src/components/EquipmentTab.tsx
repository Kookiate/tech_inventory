import React, { useState } from 'react';
import { Equipment, MaintenanceLog, SparePart } from '../types';
import { 
  PenTool, 
  Plus, 
  Search, 
  Calendar, 
  DollarSign, 
  ShieldAlert, 
  Cpu, 
  FileText, 
  Printer, 
  QrCode, 
  ClipboardCheck, 
  Layers, 
  Tag,
  CalendarCheck,
  ClipboardList
} from 'lucide-react';
import EquipmentHistoryModal from './EquipmentHistoryModal';
import EquipmentStickerModal from './EquipmentStickerModal';
import AssetCheckModal from './AssetCheckModal';
import EquipmentBatchStickerModal from './EquipmentBatchStickerModal';
import MonthlyEquipmentInspectionModal from './MonthlyEquipmentInspectionModal';
import { isStrappingMachine } from '../utils/inspectionStorage';

interface EquipmentTabProps {
  equipments: Equipment[];
  maintenanceLogs?: MaintenanceLog[];
  parts?: SparePart[];
  onAddEquipment: (eq: {
    id: string;
    assetCode?: string;
    name: string;
    location: string;
    purchasePrice: number;
    maxRepairBudget: number;
    purchaseDate: string;
    equipmentType?: 'Main' | 'Spare';
  }) => Promise<void>;
  onUpdateEquipment?: (eq: {
    id: string;
    assetCode?: string;
    name: string;
    location: string;
    purchasePrice: number;
    maxRepairBudget: number;
    purchaseDate: string;
    equipmentType?: 'Main' | 'Spare';
  }) => Promise<void>;
  isSubmitting: boolean;
  onGoToSpareLoan?: (equipment: Equipment) => void;
  onGoToMaintenance?: (equipment: Equipment, problemDetail: string) => void;
  onGoToInspection?: (equipmentId?: string) => void;
}

export default function EquipmentTab({ 
  equipments, 
  maintenanceLogs = [], 
  parts = [], 
  onAddEquipment, 
  onUpdateEquipment, 
  isSubmitting,
  onGoToSpareLoan,
  onGoToMaintenance,
  onGoToInspection
}: EquipmentTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [historyModalEqId, setHistoryModalEqId] = useState<string | null>(null);

  // Asset QR sticker and audit modals
  const [selectedEquipmentForSticker, setSelectedEquipmentForSticker] = useState<Equipment | null>(null);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);

  // Monthly Equipment PM Inspection modal
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [inspectionEquipmentId, setInspectionEquipmentId] = useState<string | null>(null);
  const [strappingFilter, setStrappingFilter] = useState<'all' | 'strapping'>('all');

  // Form states
  const [id, setId] = useState('');
  const [assetCode, setAssetCode] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [maxRepairBudget, setMaxRepairBudget] = useState<number>(0);
  const [purchaseDate, setPurchaseDate] = useState('');
  const [equipmentType, setEquipmentType] = useState<'Main' | 'Spare'>('Main');

  const [formError, setFormError] = useState('');

  // Inline edit states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAssetCode, setEditAssetCode] = useState('');
  const [editName, setEditName] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editPurchasePrice, setEditPurchasePrice] = useState<number>(0);
  const [editMaxRepairBudget, setEditMaxRepairBudget] = useState<number>(0);
  const [editPurchaseDate, setEditPurchaseDate] = useState('');
  const [editEquipmentType, setEditEquipmentType] = useState<'Main' | 'Spare'>('Main');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  const startEdit = (eq: Equipment) => {
    setEditingId(eq.id);
    setEditAssetCode(eq.assetCode || '');
    setEditName(eq.name);
    setEditLocation(eq.location);
    setEditPurchasePrice(eq.purchasePrice);
    setEditMaxRepairBudget(eq.maxRepairBudget);
    setEditPurchaseDate(eq.purchaseDate);
    setEditEquipmentType(eq.equipmentType || 'Main');
    setEditError('');
  };

  const handleSaveEdit = async (eqId: string) => {
    setEditError('');
    if (!editName.trim() || !editLocation.trim() || !editPurchaseDate) {
      setEditError('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    if (editPurchasePrice < 0 || editMaxRepairBudget < 0) {
      setEditError('ราคาซื้อและงบซ่อมต้องไม่ติดลบ');
      return;
    }
    setIsSavingEdit(true);
    try {
      if (onUpdateEquipment) {
        await onUpdateEquipment({
          id: eqId,
          assetCode: editAssetCode.trim(),
          name: editName.trim(),
          location: editLocation.trim(),
          purchasePrice: editPurchasePrice,
          maxRepairBudget: editMaxRepairBudget || Math.round(editPurchasePrice * 0.4),
          purchaseDate: editPurchaseDate.trim(),
          equipmentType: editEquipmentType
        });
      }
      setEditingId(null);
    } catch (err: any) {
      setEditError(err.message || 'เกิดข้อผิดพลาดในการแก้ไขข้อมูล');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!id.trim() || !name.trim() || !location.trim() || !purchaseDate) {
      setFormError('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
      return;
    }

    if (purchasePrice < 0 || maxRepairBudget < 0) {
      setFormError('ราคาซื้อแรกเริ่มและงบซ่อมสูงสุดต้องไม่ติดลบ');
      return;
    }

    try {
      await onAddEquipment({
        id: id.trim().toUpperCase(),
        assetCode: assetCode.trim(),
        name: name.trim(),
        location: location.trim(),
        purchasePrice,
        maxRepairBudget: maxRepairBudget || Math.round(purchasePrice * 0.4), // default to 40% if not set
        purchaseDate,
        equipmentType
      });

      // Clear form
      setId('');
      setAssetCode('');
      setName('');
      setLocation('');
      setPurchasePrice(0);
      setMaxRepairBudget(0);
      setPurchaseDate('');
      setEquipmentType('Main');
      setShowAddForm(false);
    } catch (err: any) {
      setFormError(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูลเครื่องจักร');
    }
  };

  const strappingCount = equipments.filter(isStrappingMachine).length;

  const filteredEquipment = equipments.filter(eq => {
    const matchesSearch = eq.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (eq.assetCode && eq.assetCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
      eq.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eq.location.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (strappingFilter === 'strapping') {
      return isStrappingMachine(eq);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* ส่วนหัวหน้าเว็บและปุ่มเปิดฟอร์ม */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-display flex items-center gap-2">
            <Cpu className="h-5 w-5 text-blue-600 stroke-[1.8]" />
            จัดการเครื่องจักรและอุปกรณ์ (Equipment Directory)
          </h2>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            บันทึกรหัส สเปก ราคาซื้อแรกเริ่ม และตั้งค่าพิกัดวิกฤตความคุ้มค่าของการซ่อมเครื่องจักร
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            id="btn-monthly-inspection"
            type="button"
            onClick={() => {
              if (onGoToInspection) {
                onGoToInspection();
              } else {
                setInspectionEquipmentId(null);
                setShowInspectionModal(true);
              }
            }}
            className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
            title="เปิดหน้าระบบตรวจเช็คและประเมินเครื่องมือประจำเดือน (PM Inspection) พร้อมเลือกแบบฟอร์ม"
          >
            <CalendarCheck className="h-4 w-4" />
            <span>ระบบตรวจเช็ค PM (เลือกฟอร์ม)</span>
            <span className="ml-0.5 px-1.5 py-0.5 bg-emerald-800/80 rounded-full text-[10px] font-mono">
              {equipments.length} เครื่อง
            </span>
          </button>

          <button
            id="btn-scan-asset-audit"
            type="button"
            onClick={() => setShowAuditModal(true)}
            className="flex items-center justify-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
            title="สแกน QR Code หรือ Barcode เพื่อตรวจเช็คทรัพย์สินเครื่องมือ"
          >
            <ClipboardCheck className="h-4 w-4 text-emerald-600" />
            <span>สแกนตรวจนับทรัพย์สิน</span>
          </button>

          <button
            id="btn-batch-stickers"
            type="button"
            onClick={() => setShowBatchModal(true)}
            className="flex items-center justify-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
            title="พิมพ์สติกเกอร์ QR สำหรับติดเครื่องมือแบบหลายรายการ"
          >
            <Layers className="h-4 w-4 text-indigo-600" />
            <span>พิมพ์สติกเกอร์หลายรายการ</span>
          </button>

          <button
            id="btn-toggle-eq-form"
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>{showAddForm ? 'ปิดฟอร์มกรอกข้อมูล' : 'ลงทะเบียนเครื่องใหม่'}</span>
          </button>
        </div>
      </div>

      {/* ฟอร์มเพิ่มเครื่องจักรใหม่ */}
      {showAddForm && (
        <div className="bg-white border border-blue-100 rounded-2xl p-6 shadow-xl relative overflow-hidden transition-all duration-300">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-blue-600" />
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-1.5 font-display">
            <Plus className="h-4 w-4 text-blue-600" />
            แบบฟอร์มลงทะเบียนรหัสเครื่องจักรใหม่
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg font-sans">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">รหัสเครื่องจักร *</label>
                <input
                  type="text"
                  placeholder="เช่น EQ-004"
                  value={id}
                  onChange={e => setId(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">รหัสทรัพย์สิน</label>
                <input
                  type="text"
                  placeholder="เช่น AST-PACK-004"
                  value={assetCode}
                  onChange={e => setAssetCode(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">ชื่อเครื่องจักร / อุปกรณ์ *</label>
                <input
                  type="text"
                  placeholder="เช่น มอเตอร์สายพานลำเลียง M1"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none font-sans"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">ไลน์ผลิต / แผนกจัดวาง *</label>
                <input
                  type="text"
                  placeholder="เช่น แผนกบรรจุ ไลน์ 3"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none font-sans"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">ประเภทเครื่องมือ / อุปกรณ์ *</label>
                <select
                  value={equipmentType}
                  onChange={e => setEquipmentType(e.target.value as 'Main' | 'Spare')}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none font-sans bg-white font-medium"
                >
                  <option value="Main">⚙️ เครื่องมือ Main (เครื่องหลัก)</option>
                  <option value="Spare">🔄 เครื่องมือ Spare (สำรอง/สับเปลี่ยน)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">ราคาแรกซื้อ (บาท) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 text-xs">฿</span>
                  <input
                    type="number"
                    value={purchasePrice || ''}
                    onChange={e => setPurchasePrice(Number(e.target.value))}
                    placeholder="ใส่ยอดราคาเครื่องจักรแรกซื้อ"
                    className="w-full border border-slate-200 rounded-xl pl-7 pr-3 py-2 text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  งบซ่อมสะสมสูงสุดที่ทนได้ (หรือราคาเปลี่ยนเครื่อง)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 text-xs">฿</span>
                  <input
                    type="number"
                    value={maxRepairBudget || ''}
                    onChange={e => setMaxRepairBudget(Number(e.target.value))}
                    placeholder="ว่างเพื่อใช้สูตรออโต้ (40% ของราคาซื้อ)"
                    className="w-full border border-slate-200 rounded-xl pl-7 pr-3 py-2 text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">วันที่ซื้อ / เริ่มใช้งาน *</label>
                <div className="relative">
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={e => setPurchaseDate(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none font-sans"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                {isSubmitting ? 'กำลังลงทะเบียนบันทึก...' : 'บันทึกลงทะเบียนเครื่อง'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* บล็อกค้นหาและสรุปยอด */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-3 text-slate-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="ค้นหาตามรหัส ชื่อ หรือตำแหน่งเครื่องจักร..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none font-sans"
            />
          </div>

          <div className="text-xs text-slate-500 font-sans flex items-center gap-2">
            <span>แสดงผล <strong>{filteredEquipment.length}</strong> จาก <strong>{equipments.length}</strong> รายการ</span>
          </div>
        </div>

        {/* แถบกรองหมวดหมู่เฉพาะเครื่องแพ็คสายรัดพลาสติก */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-600">ประเภทเครื่องมือ:</span>
            <button
              type="button"
              onClick={() => setStrappingFilter('all')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                strappingFilter === 'all'
                  ? 'bg-slate-800 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              ทั้งหมด ({equipments.length})
            </button>
            <button
              type="button"
              onClick={() => setStrappingFilter('strapping')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                strappingFilter === 'strapping'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              <CalendarCheck className="h-3.5 w-3.5" />
              <span>เฉพาะเครื่องแพ็คสายรัดพลาสติก ({strappingCount})</span>
              <span className="text-[10px] opacity-80">(มีแบบฟอร์มตรวจเช็ค PM)</span>
            </button>
          </div>

          {strappingFilter === 'strapping' && (
            <div className="text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              💡 กรองแสดงเฉพาะเครื่องแพ็คสายรัดพลาสติกที่มีระบบตรวจเช็ค PM ประจำเดือน (7 รายการตามมาตรฐาน)
            </div>
          )}
        </div>

        {/* ตารางแสดงผลเครื่องจักร */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl bg-slate-50/50">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 font-sans">
                <th className="py-3 px-4 font-bold">รหัสเครื่องจักร</th>
                <th className="py-3 px-4 font-bold">รหัสทรัพย์สิน</th>
                <th className="py-3 px-4 font-bold">ชื่อเครื่องจักร / อุปกรณ์</th>
                <th className="py-3 px-4 font-bold">ไลน์ผลิต / ตำแหน่ง</th>
                <th className="py-3 px-4 text-center font-bold">ประเภท</th>
                <th className="py-3 px-4 text-right font-bold">ราคาซื้อ</th>
                <th className="py-3 px-4 text-right font-bold">งบซ่อมวิกฤตสะสม</th>
                <th className="py-3 px-4 font-bold">เริ่มใช้งาน</th>
                <th className="py-3 px-4 text-center font-bold">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredEquipment.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-sans">
                    ไม่พบข้อมูลเครื่องจักรหรือรหัสสเปกเครื่องในระบบคลัง
                  </td>
                </tr>
              ) : (
                filteredEquipment.map(eq => {
                  const isEditing = editingId === eq.id;
                  if (isEditing) {
                    return (
                      <tr key={eq.id} className="bg-blue-50/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-blue-600 align-middle">
                          {eq.id}
                          {editError && (
                            <div className="text-[10px] text-rose-600 font-sans mt-1 block">
                              {editError}
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-2 align-middle">
                          <input
                            type="text"
                            value={editAssetCode}
                            onChange={e => setEditAssetCode(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs focus:ring-1 focus:ring-blue-300 outline-none font-mono"
                            placeholder="รหัสทรัพย์สิน"
                          />
                        </td>
                        <td className="py-2 px-2 align-middle">
                          <input
                            type="text"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs focus:ring-1 focus:ring-blue-300 outline-none font-sans"
                            placeholder="ชื่อเครื่องจักร"
                          />
                        </td>
                        <td className="py-2 px-2 align-middle">
                          <input
                            type="text"
                            value={editLocation}
                            onChange={e => setEditLocation(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs focus:ring-1 focus:ring-blue-300 outline-none font-sans"
                            placeholder="ไลน์ผลิต"
                          />
                        </td>
                        <td className="py-2 px-2 align-middle">
                          <select
                            value={editEquipmentType}
                            onChange={e => setEditEquipmentType(e.target.value as 'Main' | 'Spare')}
                            className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs focus:ring-1 focus:ring-blue-300 outline-none font-sans bg-white font-medium"
                          >
                            <option value="Main">⚙️ Main</option>
                            <option value="Spare">🔄 Spare</option>
                          </select>
                        </td>
                        <td className="py-2 px-2 align-middle">
                          <input
                            type="number"
                            value={editPurchasePrice || ''}
                            onChange={e => setEditPurchasePrice(Number(e.target.value))}
                            className="w-full text-right border border-slate-300 rounded-lg px-2 py-1 text-xs focus:ring-1 focus:ring-blue-300 outline-none font-mono"
                            placeholder="ราคาซื้อ"
                          />
                        </td>
                        <td className="py-2 px-2 align-middle">
                          <input
                            type="number"
                            value={editMaxRepairBudget || ''}
                            onChange={e => setEditMaxRepairBudget(Number(e.target.value))}
                            className="w-full text-right border border-slate-300 rounded-lg px-2 py-1 text-xs focus:ring-1 focus:ring-blue-300 outline-none font-mono"
                            placeholder="งบซ่อมสูงสุด"
                          />
                        </td>
                        <td className="py-2 px-2 align-middle">
                          <input
                            type="text"
                            value={editPurchaseDate}
                            onChange={e => setEditPurchaseDate(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs focus:ring-1 focus:ring-blue-300 outline-none font-mono"
                            placeholder="เริ่มใช้งาน"
                          />
                        </td>
                        <td className="py-2 px-4 text-center align-middle whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleSaveEdit(eq.id)}
                              disabled={isSavingEdit}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shadow-sm transition-all disabled:opacity-50"
                            >
                              {isSavingEdit ? 'บันทึก...' : 'บันทึก'}
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[11px] font-bold transition-all"
                            >
                              ยกเลิก
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  const isStrapping = isStrappingMachine(eq);

                  return (
                    <tr key={eq.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-600 align-middle">{eq.id}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-700 align-middle">
                        {eq.assetCode ? (
                          <button
                            type="button"
                            onClick={() => setSelectedEquipmentForSticker(eq)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-lg text-[11px] font-mono font-bold border border-blue-200 transition-all cursor-pointer group shadow-2xs"
                            title="คลิกเพื่อเปิดสติกเกอร์ QR / Barcode ของรหัสทรัพย์สินนี้"
                          >
                            <span>{eq.assetCode}</span>
                            <QrCode className="h-3 w-3 text-blue-500 group-hover:text-blue-700 transition-colors" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSelectedEquipmentForSticker(eq)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-dashed border-slate-300 hover:border-blue-300 transition-all cursor-pointer"
                            title="ยังไม่มีรหัสทรัพย์สิน คลิกเพื่อสร้างสติกเกอร์ QR หรือกำหนดรหัส"
                          >
                            <span>+ สร้าง QR</span>
                            <QrCode className="h-3 w-3 text-slate-400" />
                          </button>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800 align-middle">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{eq.name}</span>
                          {isStrapping && (
                            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              เครื่องแพ็คสายรัด
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-sans align-middle">{eq.location}</td>
                      <td className="py-3.5 px-4 text-center align-middle whitespace-nowrap">
                        {eq.equipmentType === 'Spare' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                            🔄 Spare สำรอง
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                            ⚙️ Main หลัก
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900 align-middle">
                        ฿{eq.purchasePrice.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-rose-600 align-middle">
                        ฿{eq.maxRepairBudget.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono align-middle">
                        {eq.purchaseDate}
                      </td>
                      <td className="py-3.5 px-4 text-center align-middle whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              if (onGoToInspection) {
                                onGoToInspection(eq.id);
                              } else {
                                setInspectionEquipmentId(eq.id);
                                setShowInspectionModal(true);
                              }
                            }}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold shadow-xs transition-all cursor-pointer active:scale-95 ${
                              isStrapping 
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                            }`}
                            title={isStrapping ? 'แบบตรวจเช็คเครื่องแพ็คสายรัดพลาสติกตาม Excel (7 ข้อ)' : 'ตรวจเช็คและประเมินเครื่องมือ PM ประจำเดือน (เลือกแบบฟอร์ม)'}
                          >
                            <ClipboardList className="h-3.5 w-3.5" />
                            <span>{isStrapping ? 'ตรวจเช็ค PM สายรัด' : 'ตรวจเช็ค PM'}</span>
                          </button>
                          <button
                            onClick={() => setSelectedEquipmentForSticker(eq)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-bold border border-indigo-200 transition-all cursor-pointer shadow-2xs"
                            title="สร้างสติกเกอร์ QR Code / Barcode เพื่อติดเครื่องมือและตรวจเช็คทรัพย์สิน"
                          >
                            <QrCode className="h-3.5 w-3.5 text-indigo-600" />
                            <span>สติกเกอร์ QR</span>
                          </button>
                          <button
                            onClick={() => setHistoryModalEqId(eq.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[11px] font-bold border border-blue-200 transition-all cursor-pointer shadow-2xs"
                            title="ดูประวัติการซ่อมบำรุง และ พิมพ์รายงาน PDF"
                          >
                            <FileText className="h-3.5 w-3.5 text-blue-600" />
                            <span>ประวัติซ่อม & PDF</span>
                          </button>
                          <button
                            onClick={() => startEdit(eq)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold border border-slate-200 transition-all cursor-pointer"
                          >
                            <PenTool className="h-3.5 w-3.5" />
                            แก้ไข
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

      {/* Modal สติกเกอร์ QR / Barcode ประจำเครื่องมือเดี่ยว */}
      {selectedEquipmentForSticker && (
        <EquipmentStickerModal
          equipment={selectedEquipmentForSticker}
          onClose={() => setSelectedEquipmentForSticker(null)}
          onUpdateEquipment={onUpdateEquipment}
          onOpenHistory={(eqId) => {
            setSelectedEquipmentForSticker(null);
            setHistoryModalEqId(eqId);
          }}
        />
      )}

      {/* Modal สแกนตรวจเช็คทรัพย์สิน (Asset Audit Scanner) */}
      {showAuditModal && (
        <AssetCheckModal
          equipments={equipments}
          maintenanceLogs={maintenanceLogs}
          parts={parts}
          onClose={() => setShowAuditModal(false)}
          onOpenSticker={(eq) => {
            setShowAuditModal(false);
            setSelectedEquipmentForSticker(eq);
          }}
          onOpenHistory={(eqId) => {
            setShowAuditModal(false);
            setHistoryModalEqId(eqId);
          }}
          onEditEquipment={(eq) => {
            setShowAuditModal(false);
            startEdit(eq);
          }}
          onOpenMonthlyInspection={(eq) => {
            setShowAuditModal(false);
            setInspectionEquipmentId(eq.id);
            setShowInspectionModal(true);
          }}
        />
      )}

      {/* Modal พิมพ์สติกเกอร์หลายรายการ (Batch Print) */}
      {showBatchModal && (
        <EquipmentBatchStickerModal
          equipments={equipments}
          onClose={() => setShowBatchModal(false)}
        />
      )}

      {/* Modal แบบบันทึกการตรวจสอบเครื่องมือแพ็คสายรัดพลาสติกประจำเดือน */}
      {showInspectionModal && (
        <MonthlyEquipmentInspectionModal
          isOpen={showInspectionModal}
          onClose={() => setShowInspectionModal(false)}
          equipments={equipments}
          initialEquipmentId={inspectionEquipmentId || undefined}
          onGoToSpareLoan={(eq) => {
            setShowInspectionModal(false);
            if (onGoToSpareLoan) {
              onGoToSpareLoan(eq);
            }
          }}
          onGoToMaintenance={(eq, detail) => {
            setShowInspectionModal(false);
            if (onGoToMaintenance) {
              onGoToMaintenance(eq, detail);
            }
          }}
        />
      )}
    </div>
  );
}
