import React, { useState, useEffect } from 'react';
import { Equipment } from '../types';
import QRCode from 'qrcode';
import { X, Printer, CheckSquare, Square, Filter, Sparkles, Tag, Layers } from 'lucide-react';

interface EquipmentBatchStickerModalProps {
  equipments: Equipment[];
  onClose: () => void;
}

interface EquipmentWithQr extends Equipment {
  qrUrl: string;
  effectiveCode: string;
}

export default function EquipmentBatchStickerModal({
  equipments,
  onClose
}: EquipmentBatchStickerModalProps) {
  // Selected IDs for batch printing
  const [selectedIds, setSelectedIds] = useState<string[]>(() => equipments.map(e => e.id));
  const [typeFilter, setTypeFilter] = useState<'all' | 'Main' | 'Spare'>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  
  const [generatedItems, setGeneratedItems] = useState<EquipmentWithQr[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(true);

  // Layout mode: 'a4_grid' (A4 sticker sheet, 2 columns) or 'thermal_continuous'
  const [layoutMode, setLayoutMode] = useState<'a4_grid' | 'thermal_continuous'>('a4_grid');

  // Filtered equipment list based on dropdowns
  const availableLocations = Array.from(new Set(equipments.map(e => e.location))).filter(Boolean).sort();

  const filteredEquipments = equipments.filter(eq => {
    if (typeFilter !== 'all' && (eq.equipmentType || 'Main') !== typeFilter) return false;
    if (locationFilter !== 'all' && eq.location !== locationFilter) return false;
    return true;
  });

  // Toggle selection
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedIds(filteredEquipments.map(e => e.id));
  };

  const deselectAll = () => {
    setSelectedIds([]);
  };

  // Generate QR codes for selected items
  useEffect(() => {
    let isMounted = true;
    setIsGenerating(true);

    const generateAll = async () => {
      const selectedItems = equipments.filter(e => selectedIds.includes(e.id));
      const withQr: EquipmentWithQr[] = [];

      for (const eq of selectedItems) {
        const effectiveCode = (eq.assetCode || eq.id).trim();
        try {
          const qrUrl = await QRCode.toDataURL(effectiveCode, {
            margin: 1,
            width: 150,
            color: { dark: '#000000', light: '#ffffff' }
          });
          withQr.push({
            ...eq,
            qrUrl,
            effectiveCode
          });
        } catch (e) {
          console.error(e);
        }
      }

      if (isMounted) {
        setGeneratedItems(withQr);
        setIsGenerating(false);
      }
    };

    generateAll();

    return () => {
      isMounted = false;
    };
  }, [selectedIds, equipments]);

  // Batch print trigger
  const handlePrint = () => {
    document.body.classList.add('printing-batch');
    window.print();
    // Remove class after print dialog closes
    setTimeout(() => {
      document.body.classList.remove('printing-batch');
    }, 1000);
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 z-50 overflow-y-auto animate-fade-in font-sans">
        <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-slate-100 my-4 space-y-5 max-h-[90vh] flex flex-col">
          
          {/* Header */}
          <div className="flex items-start justify-between pb-3 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold shrink-0 shadow-2xs">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span>พิมพ์สติกเกอร์ทรัพย์สินหลายรายการ (Batch Print)</span>
                  <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                    เลือก {selectedIds.length} จาก {equipments.length} รายการ
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  เลือกเครื่องมือที่ต้องการสร้างสติกเกอร์ QR และพิมพ์ลงบนแผ่นสติกเกอร์ A4 หรือม้วนพิมพ์ต่อเนื่อง
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Filter & Selection Bar */}
          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-700 flex items-center gap-1">
                <Filter className="h-3.5 w-3.5" /> ตัวกรอง:
              </span>

              {/* Type Filter */}
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value as any)}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 font-medium text-slate-700 outline-none"
              >
                <option value="all">ประเภททั้งหมด</option>
                <option value="Main">⚙️ เครื่องมือหลัก (Main)</option>
                <option value="Spare">🔄 เครื่องมือสำรอง (Spare)</option>
              </select>

              {/* Location Filter */}
              <select
                value={locationFilter}
                onChange={e => setLocationFilter(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 font-medium text-slate-700 outline-none"
              >
                <option value="all">ไลน์ผลิตทั้งหมด</option>
                {availableLocations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-all"
              >
                <CheckSquare className="h-3.5 w-3.5 text-indigo-600" />
                <span>เลือกทั้งหมด</span>
              </button>

              <button
                type="button"
                onClick={deselectAll}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-all"
              >
                <Square className="h-3.5 w-3.5" />
                <span>ยกเลิกทั้งหมด</span>
              </button>
            </div>
          </div>

          {/* Equipment Checkbox Selection List */}
          <div className="overflow-y-auto max-h-48 border border-slate-200 rounded-xl p-2.5 bg-slate-50/40 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 shrink-0">
            {filteredEquipments.map(eq => {
              const isSelected = selectedIds.includes(eq.id);
              return (
                <label
                  key={eq.id}
                  onClick={() => toggleSelect(eq.id)}
                  className={`flex items-start gap-2 p-2 rounded-xl border text-xs cursor-pointer select-none transition-all ${
                    isSelected
                      ? 'bg-indigo-50/80 border-indigo-300 text-indigo-950 font-medium'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="overflow-hidden leading-tight flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono font-bold text-slate-900">{eq.id}</span>
                      <span className="text-[10px] font-mono text-indigo-700 bg-indigo-100/60 px-1.5 py-0.2 rounded truncate max-w-[100px]">
                        {eq.assetCode || 'ไม่มีรหัสทรัพย์'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-800 truncate mt-0.5 font-semibold">
                      {eq.name}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {eq.location}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>

          {/* Print Preview Grid */}
          <div className="flex-1 overflow-y-auto space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span className="font-bold">
                ตัวอย่างสติกเกอร์ที่จะพิมพ์ ({generatedItems.length} ดวง):
              </span>
              <span className="text-slate-400">
                ขนาด 60mm × 30mm จัดเรียง 2 คอลัมน์ต่อหน้า A4
              </span>
            </div>

            {isGenerating ? (
              <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                <div className="h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <span>กำลังเรนเดอร์ QR Code สติกเกอร์...</span>
              </div>
            ) : generatedItems.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                ยังไม่ได้เลือกเครื่องมือสำหรับพิมพ์สติกเกอร์
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-1">
                {generatedItems.slice(0, 12).map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-white border-2 border-slate-200 rounded-xl p-2.5 flex items-center gap-2.5 shadow-2xs relative overflow-hidden"
                  >
                    {/* Left QR */}
                    <div className="w-16 h-16 shrink-0 flex items-center justify-center bg-white p-0.5 border border-slate-100 rounded-lg">
                      <img src={item.qrUrl} alt="QR" className="w-full h-full object-contain" />
                    </div>

                    {/* Right Info */}
                    <div className="flex-1 overflow-hidden leading-tight text-xs space-y-0.5">
                      <div className="text-[9px] font-bold text-indigo-700 font-mono">
                        ASSET: {item.effectiveCode}
                      </div>
                      <div className="font-bold text-slate-900 truncate">
                        {item.name}
                      </div>
                      <div className="text-[10px] text-slate-600 flex items-center gap-1.5 font-medium">
                        <span>รหัส: <strong className="font-mono">{item.id}</strong></span>
                        <span>•</span>
                        <span className="truncate">{item.location}</span>
                      </div>
                      <div className="text-[9px] text-slate-400 font-mono">
                        {item.equipmentType === 'Spare' ? '🔄 Spare' : '⚙️ Main'} | ฿{item.purchasePrice.toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
                {generatedItems.length > 12 && (
                  <div className="col-span-full py-2 text-center text-xs text-slate-500 font-medium bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    และอีก {generatedItems.length - 12} รายการที่จะถูกสั่งพิมพ์พร้อมกัน...
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 shrink-0">
            <div className="text-xs text-slate-500">
              💡 แนะนำตั้งค่าเครื่องพิมพ์เป็น <strong>A4</strong> หรือ <strong>Thermal Roll</strong> โดยเลือก Margin = <strong>None</strong>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={generatedItems.length === 0}
                onClick={handlePrint}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-md shadow-indigo-600/20 disabled:opacity-50"
              >
                <Printer className="h-4 w-4" />
                <span>สั่งพิมพ์ {generatedItems.length} รายการ</span>
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Hidden Batch Print Section for A4 or Continuous Roll */}
      <div id="batch-print-section" className="hidden">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '4mm',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          {generatedItems.map((item, idx) => (
            <div
              key={idx}
              style={{
                width: '90mm',
                height: '42mm',
                border: '1px solid #cbd5e1',
                borderRadius: '3mm',
                padding: '3mm',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                pageBreakInside: 'avoid',
                breakInside: 'avoid',
                background: 'white',
                color: 'black',
                fontFamily: 'system-ui, -apple-system, sans-serif'
              }}
            >
              {/* QR Image */}
              <div style={{ width: '32mm', height: '32mm', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img 
                  src={item.qrUrl} 
                  alt="QR" 
                  style={{ width: '30mm', height: '30mm', objectFit: 'contain' }} 
                />
              </div>

              {/* Detail */}
              <div style={{
                width: '52mm',
                height: '34mm',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                paddingLeft: '2mm',
                overflow: 'hidden'
              }}>
                <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#1e40af', fontFamily: 'monospace' }}>
                  EQUIPMENT ASSET TAG
                </div>
                <div style={{ fontSize: '15px', fontWeight: '900', fontFamily: 'monospace', color: 'black', lineHeight: '1.1' }}>
                  {item.effectiveCode}
                </div>
                <div style={{ 
                  fontSize: '11px', 
                  fontWeight: 'bold', 
                  color: 'black', 
                  lineHeight: '1.2', 
                  marginTop: '1.5mm',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {item.name}
                </div>
                <div style={{ fontSize: '9px', color: '#334155', fontWeight: 'bold', marginTop: '1mm' }}>
                  รหัส: {item.id} | {item.location}
                </div>
                <div style={{ fontSize: '8px', color: '#64748b' }}>
                  {item.equipmentType === 'Spare' ? 'Spare สำรอง' : 'Main หลัก'} | เริ่ม: {item.purchaseDate || '-'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
