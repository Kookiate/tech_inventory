import React, { useState } from 'react';
import { Equipment, MaintenanceLog, SparePart } from '../types';
import { PenTool, Plus, Search, Calendar, DollarSign, ShieldAlert, Cpu, Wrench, Settings } from 'lucide-react';

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
  }) => Promise<void>;
  isSubmitting: boolean;
}

export default function MaintenanceTab({
  equipments,
  maintenanceLogs,
  parts,
  onAddMaintenanceLog,
  isSubmitting
}: MaintenanceTabProps) {
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
        technician: technician.trim()
      });

      // Reset form
      setSelectedEqId('');
      setRepairDetail('');
      setSelectedPartId('');
      setPartQty(0);
      setOtherCost(0);
      setTechnician('');
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
      return { pct, text: '🔴 ไม่คุ้มค่า (แนะนำเปลี่ยนเครื่องจักรใหม่)', color: 'text-rose-700 bg-rose-50 border-rose-100 font-bold animate-pulse' };
    }
  };

  const filteredLogs = maintenanceLogs.filter(log =>
    log.equipmentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.equipmentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.repairDetail.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.technician.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* ส่วนหัว */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-display flex items-center gap-2">
            <Wrench className="h-5 w-5 text-violet-600 stroke-[1.8]" />
            ประวัติงานซ่อมและวิเคราะห์ความคุ้มค่า (Maintenance Logs & Cost-Effectiveness)
          </h2>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            บันทึกประวัติซ่อมบำรุง เบิกอะไหล่หักคลังอัตโนมัติ และประเมินอัตราส่วนความคุ้มค่าเทียบกับราคาเครื่องจักรแรกซื้อ
          </p>
        </div>

        <button
          id="btn-toggle-maintenance-form"
          onClick={() => setShowAddLogForm(!showAddLogForm)}
          className="flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md transition-all self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          {showAddLogForm ? 'ปิดฟอร์มบันทึก' : 'สร้างบันทึกซ่อมบำรุงใหม่'}
        </button>
      </div>

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
            แบบฟอร์มบันทึกผลการซ่อมและประเมินค่าใช้จ่าย
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg font-sans">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">เลือกเครื่องจักร / อุปกรณ์ที่ซ่อม *</label>
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
                placeholder="อธิบายละเอียด อาการเสีย อะไหล่ที่เปลี่ยน และวิธีการบำรุงรักษาซ่อมบำรุง..."
                value={repairDetail}
                onChange={e => setRepairDetail(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-violet-100 focus:border-violet-500 outline-none font-sans"
                required
              />
            </div>

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
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                {isSubmitting ? 'กำลังบันทึกซ่อม...' : 'บันทึกประวัติการซ่อมบำรุง'}
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
                <th className="py-3 px-4 font-bold">รหัสเครื่องจักร</th>
                <th className="py-3 px-4 font-bold">ชื่อเครื่องจักร / อุปกรณ์</th>
                <th className="py-3 px-4 font-bold">รายละเอียดอาการและการซ่อม</th>
                <th className="py-3 px-4 font-bold">อะไหล่ที่ใช้</th>
                <th className="py-3 px-4 text-right font-bold">มูลค่าอะไหล่</th>
                <th className="py-3 px-4 text-right font-bold">ค่าแรงช่างนอก</th>
                <th className="py-3 px-4 text-right text-violet-700 font-bold">รวมค่าใช้จ่าย</th>
                <th className="py-3 px-4 font-bold">ช่างซ่อม</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-sans">
                    ไม่พบประวัติข้อมูลงานซ่อมบำรุงที่บันทึกไว้ในระบบ
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-400">{log.date}</td>
                    <td className="py-3 px-4 font-mono font-bold text-blue-600">{log.equipmentId}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{log.equipmentName}</td>
                    <td className="py-3 px-4 text-slate-700 font-sans">{log.repairDetail}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">
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
                    <td className="py-3 px-4 font-semibold text-slate-700">{log.technician}</td>
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
