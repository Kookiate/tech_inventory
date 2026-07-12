import React, { useState } from 'react';
import { Equipment } from '../types';
import { PenTool, Plus, Search, Calendar, DollarSign, ShieldAlert, Cpu } from 'lucide-react';

interface EquipmentTabProps {
  equipments: Equipment[];
  onAddEquipment: (eq: {
    id: string;
    name: string;
    location: string;
    purchasePrice: number;
    maxRepairBudget: number;
    purchaseDate: string;
  }) => Promise<void>;
  isSubmitting: boolean;
}

export default function EquipmentTab({ equipments, onAddEquipment, isSubmitting }: EquipmentTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Form states
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [maxRepairBudget, setMaxRepairBudget] = useState<number>(0);
  const [purchaseDate, setPurchaseDate] = useState('');

  const [formError, setFormError] = useState('');

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
        name: name.trim(),
        location: location.trim(),
        purchasePrice,
        maxRepairBudget: maxRepairBudget || Math.round(purchasePrice * 0.4), // default to 40% if not set
        purchaseDate
      });

      // Clear form
      setId('');
      setName('');
      setLocation('');
      setPurchasePrice(0);
      setMaxRepairBudget(0);
      setPurchaseDate('');
      setShowAddForm(false);
    } catch (err: any) {
      setFormError(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูลเครื่องจักร');
    }
  };

  const filteredEquipment = equipments.filter(eq =>
    eq.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    eq.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    eq.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

        <button
          id="btn-toggle-eq-form"
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md transition-all self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          {showAddForm ? 'ปิดฟอร์มกรอกข้อมูล' : 'ลงทะเบียนเครื่องจักรใหม่'}
        </button>
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">รหัสเครื่องจักร *</label>
                <input
                  type="text"
                  placeholder="เช่น EQ-004, PACK-03"
                  value={id}
                  onChange={e => setId(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none font-mono"
                  required
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
            <span>แสดงผลเครื่องจักร <strong>{filteredEquipment.length}</strong> จาก <strong>{equipments.length}</strong> รายการคุมคลัง</span>
          </div>
        </div>

        {/* ตารางแสดงผลเครื่องจักร */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl bg-slate-50/50">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 font-sans">
                <th className="py-3 px-4 font-bold">รหัสเครื่องจักร</th>
                <th className="py-3 px-4 font-bold">ชื่อเครื่องจักร / อุปกรณ์</th>
                <th className="py-3 px-4 font-bold">ไลน์ผลิต / ตำแหน่ง</th>
                <th className="py-3 px-4 text-right font-bold">ราคาซื้อ</th>
                <th className="py-3 px-4 text-right font-bold">งบซ่อมวิกฤตสะสม</th>
                <th className="py-3 px-4 font-bold">เริ่มใช้งาน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredEquipment.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-sans">
                    ไม่พบข้อมูลเครื่องจักรหรือรหัสสเปกเครื่องในระบบคลัง
                  </td>
                </tr>
              ) : (
                filteredEquipment.map(eq => (
                  <tr key={eq.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-600">{eq.id}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">{eq.name}</td>
                    <td className="py-3.5 px-4 text-slate-600 font-sans">{eq.location}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900">
                      ฿{eq.purchasePrice.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-rose-600">
                      ฿{eq.maxRepairBudget.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono">
                      {eq.purchaseDate}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
