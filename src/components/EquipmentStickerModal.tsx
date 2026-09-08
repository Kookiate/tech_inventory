import React, { useState, useEffect, useRef } from 'react';
import { Equipment } from '../types';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { 
  X, 
  Printer, 
  Download, 
  QrCode, 
  Barcode as BarcodeIcon, 
  Layers, 
  Copy, 
  Check, 
  Tag, 
  Sparkles, 
  Save, 
  AlertCircle,
  ExternalLink
} from 'lucide-react';

interface EquipmentStickerModalProps {
  equipment: Equipment;
  onClose: () => void;
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
  onOpenHistory?: (eqId: string) => void;
}

export default function EquipmentStickerModal({
  equipment,
  onClose,
  onUpdateEquipment,
  onOpenHistory
}: EquipmentStickerModalProps) {
  // Format: 'qr' (QR Code standard), 'barcode' (Code 128 1D Barcode), 'dual' (QR + Barcode)
  const [stickerMode, setStickerMode] = useState<'qr' | 'barcode' | 'dual'>('qr');
  const [labelSize, setLabelSize] = useState<'60x30' | '50x30' | '70x40'>('60x30');
  
  // Asset code editing
  const [currentAssetCode, setCurrentAssetCode] = useState(equipment.assetCode || '');
  const [isEditingCode, setIsEditingCode] = useState(!equipment.assetCode);
  const [isSavingCode, setIsSavingCode] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Generated image URLs
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [barcodeDataUrl, setBarcodeDataUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  // Sticker preview ref for download/copy
  const previewRef = useRef<HTMLDivElement>(null);

  // Effective code value for QR / Barcode
  const effectiveCode = (currentAssetCode.trim() || equipment.id).trim();

  // Generate QR and Barcode whenever effectiveCode changes
  useEffect(() => {
    let isMounted = true;
    setIsGenerating(true);

    const generateCodes = async () => {
      try {
        // 1. Generate QR Code
        const qrUrl = await QRCode.toDataURL(effectiveCode, {
          margin: 1,
          width: 250,
          errorCorrectionLevel: 'M',
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        });

        // 2. Generate Barcode (Code128)
        const canvas = document.createElement('canvas');
        JsBarcode(canvas, effectiveCode, {
          format: 'CODE128',
          width: 2,
          height: 48,
          displayValue: false,
          margin: 2,
          background: '#ffffff',
          lineColor: '#000000'
        });
        const bcUrl = canvas.toDataURL('image/png');

        if (isMounted) {
          setQrDataUrl(qrUrl);
          setBarcodeDataUrl(bcUrl);
          setIsGenerating(false);
        }
      } catch (err) {
        console.error('Failed to generate sticker codes:', err);
        if (isMounted) {
          setIsGenerating(false);
        }
      }
    };

    generateCodes();

    return () => {
      isMounted = false;
    };
  }, [effectiveCode]);

  // Handle saving new asset code
  const handleSaveAssetCode = async () => {
    if (!onUpdateEquipment) return;
    if (!currentAssetCode.trim()) {
      setSaveError('กรุณาระบุรหัสทรัพย์สิน');
      return;
    }

    setIsSavingCode(true);
    setSaveError('');
    try {
      await onUpdateEquipment({
        id: equipment.id,
        assetCode: currentAssetCode.trim(),
        name: equipment.name,
        location: equipment.location,
        purchasePrice: equipment.purchasePrice,
        maxRepairBudget: equipment.maxRepairBudget,
        purchaseDate: equipment.purchaseDate,
        equipmentType: equipment.equipmentType
      });
      setIsEditingCode(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(err.message || 'บันทึกไม่สำเร็จ');
    } finally {
      setIsSavingCode(false);
    }
  };

  // Auto suggest asset code based on equipment ID
  const handleAutoSuggest = () => {
    const suggested = `AST-${equipment.id.replace(/[^A-Z0-9_-]/gi, '')}`;
    setCurrentAssetCode(suggested);
  };

  // Direct print action
  const handlePrint = () => {
    window.print();
  };

  // Download sticker image as PNG
  const handleDownloadSticker = () => {
    // Draw sticker to high-res canvas and trigger download
    const canvas = document.createElement('canvas');
    const scale = 3; // high DPI for printing
    canvas.width = 600 * scale;
    canvas.height = 300 * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(scale, scale);
    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 600, 300);

    // Border
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.strokeRect(4, 4, 592, 292);

    // Top Brand Bar
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(4, 4, 592, 36);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Sarabun, sans-serif';
    ctx.fillText('EQUIPMENT ASSET TAG • ทรัพย์สินเครื่องจักร/อุปกรณ์', 16, 26);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(equipment.equipmentType === 'Spare' ? 'SPARE TOOL' : 'MAIN EQUIPMENT', 580, 26);
    ctx.textAlign = 'left';

    // Load QR and Barcode images
    const qrImg = new Image();
    qrImg.onload = () => {
      // Draw QR on left
      ctx.drawImage(qrImg, 18, 52, 160, 160);

      // Draw Information on right
      ctx.fillStyle = '#475569';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('ASSET CODE (รหัสทรัพย์สิน)', 195, 68);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 24px monospace';
      ctx.fillText(effectiveCode, 195, 96);

      ctx.fillStyle = '#334155';
      ctx.font = 'bold 15px Sarabun, sans-serif';
      ctx.fillText(`ชื่อ: ${equipment.name}`, 195, 126);

      ctx.fillStyle = '#64748b';
      ctx.font = '13px Sarabun, sans-serif';
      ctx.fillText(`รหัสเครื่อง: ${equipment.id}  |  ตำแหน่ง: ${equipment.location}`, 195, 150);

      ctx.fillStyle = '#64748b';
      ctx.font = '12px Sarabun, sans-serif';
      ctx.fillText(`เริ่มใช้งาน: ${equipment.purchaseDate || '-'}  |  ราคา: ฿${equipment.purchasePrice.toLocaleString()}`, 195, 172);

      // Bottom Barcode or verification label
      if (barcodeDataUrl) {
        const bcImg = new Image();
        bcImg.onload = () => {
          ctx.drawImage(bcImg, 195, 185, 380, 65);
          ctx.fillStyle = '#64748b';
          ctx.font = '11px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`*${effectiveCode}*`, 385, 268);
          ctx.textAlign = 'left';

          // Trigger download
          const link = document.createElement('a');
          link.download = `AssetSticker_${effectiveCode}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
        };
        bcImg.src = barcodeDataUrl;
      } else {
        const link = document.createElement('a');
        link.download = `AssetSticker_${effectiveCode}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }
    };
    qrImg.src = qrDataUrl;
  };

  // Copy sticker image to clipboard
  const handleCopySticker = async () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 300;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 600, 300);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.strokeRect(2, 2, 596, 296);

      // Header
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(2, 2, 596, 36);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('EQUIPMENT ASSET TAG', 16, 25);

      const qrImg = new Image();
      qrImg.crossOrigin = 'anonymous';
      qrImg.onload = () => {
        ctx.drawImage(qrImg, 18, 50, 160, 160);
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 22px monospace';
        ctx.fillText(effectiveCode, 195, 90);
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText(equipment.name, 195, 120);
        ctx.fillStyle = '#475569';
        ctx.font = '13px sans-serif';
        ctx.fillText(`รหัส: ${equipment.id} | ตำแหน่ง: ${equipment.location}`, 195, 145);

        canvas.toBlob(blob => {
          if (blob && navigator.clipboard && (window as any).ClipboardItem) {
            navigator.clipboard.write([
              new (window as any).ClipboardItem({ 'image/png': blob })
            ]).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2500);
            });
          }
        });
      };
      qrImg.src = qrDataUrl;
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 z-50 overflow-y-auto animate-fade-in font-sans">
        <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 my-4 space-y-5">
          
          {/* Header */}
          <div className="flex items-start justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0 shadow-2xs">
                <QrCode className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span>สติกเกอร์ QR / Barcode ตรวจเช็คทรัพย์สิน</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold border border-blue-200">
                    {equipment.id}
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  สำหรับนำสติกเกอร์ไปติดที่เครื่องมือ เพื่อใช้สแกนตรวจนับและเช็คทรัพย์สินหน้างาน
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

          {/* Asset Code Configuration Box */}
          <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-blue-600" />
                รหัสทรัพย์สินของเครื่องมือ (Asset Code)
              </span>
              {!isEditingCode && (
                <button
                  type="button"
                  onClick={() => setIsEditingCode(true)}
                  className="text-[11px] text-blue-600 hover:text-blue-700 font-bold hover:underline"
                >
                  แก้ไขรหัสทรัพย์สิน
                </button>
              )}
            </div>

            {isEditingCode ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={currentAssetCode}
                      onChange={e => setCurrentAssetCode(e.target.value)}
                      placeholder={`เช่น AST-${equipment.id} หรือ FA-MCH-001`}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAutoSuggest}
                    className="px-2.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0"
                    title="สร้างรหัสทรัพย์สินอัตโนมัติตามรหัสเครื่อง"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>สร้างออโต้</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAssetCode}
                    disabled={isSavingCode}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0 disabled:opacity-50 shadow-xs"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>{isSavingCode ? 'บันทึก...' : 'บันทึก'}</span>
                  </button>
                </div>
                {saveError && (
                  <p className="text-[11px] text-rose-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {saveError}
                  </p>
                )}
                <p className="text-[10px] text-slate-500">
                  * หากเว้นว่างไว้ ระบบจะใช้รหัสเครื่อง ({equipment.id}) แทนชั่วคราวในการสร้าง QR/Barcode
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between bg-white rounded-xl p-2.5 border border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">รหัสที่ใช้สร้างสติกเกอร์:</span>
                  <span className="font-mono font-bold text-sm text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-100">
                    {effectiveCode}
                  </span>
                  {!equipment.assetCode && (
                    <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded font-sans">
                      (ใช้รหัสเครื่องแทนชั่วคราว)
                    </span>
                  )}
                </div>
                {saveSuccess && (
                  <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                    <Check className="h-3.5 w-3.5" /> อัปเดตสำเร็จ
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Customization Options Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
            {/* Mode Switcher */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setStickerMode('qr')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  stickerMode === 'qr'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <QrCode className="h-3.5 w-3.5" />
                <span>QR Code</span>
              </button>

              <button
                type="button"
                onClick={() => setStickerMode('barcode')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  stickerMode === 'barcode'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarcodeIcon className="h-3.5 w-3.5" />
                <span>Barcode 1D</span>
              </button>

              <button
                type="button"
                onClick={() => setStickerMode('dual')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  stickerMode === 'dual'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>แบบคู่ (QR + Barcode)</span>
              </button>
            </div>

            {/* Label Size */}
            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
              <span>ขนาด:</span>
              <select
                value={labelSize}
                onChange={e => setLabelSize(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono font-bold text-slate-700 outline-none"
              >
                <option value="60x30">60 × 30 mm (มาตรฐานความร้อน)</option>
                <option value="50x30">50 × 30 mm</option>
                <option value="70x40">70 × 40 mm (สติกเกอร์ใหญ่)</option>
              </select>
            </div>
          </div>

          {/* Realistic Sticker Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold">ตัวอย่างสติกเกอร์จริง (Live Sticker Preview):</span>
              <span className="font-mono text-[11px] text-slate-400">ขนาดจำลอง {labelSize} mm</span>
            </div>

            <div 
              ref={previewRef}
              className="bg-white rounded-2xl border-2 border-slate-300 shadow-lg p-3 sm:p-4 max-w-md mx-auto relative overflow-hidden transition-all"
              style={{
                aspectRatio: stickerMode === 'dual' ? '2.1/1' : '2/1',
              }}
            >
              {/* Subtle Thermal label notch marker */}
              <div className="absolute top-0 right-3 w-4 h-1 bg-slate-200 rounded-b-sm" />

              {/* Tag Header */}
              <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-slate-200">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-blue-600 inline-block" />
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-800 font-mono">
                    EQUIPMENT ASSET TAG
                  </span>
                </div>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-mono">
                  {equipment.equipmentType === 'Spare' ? 'SPARE' : 'MAIN'}
                </span>
              </div>

              {/* Body layout based on mode */}
              {stickerMode === 'qr' && (
                <div className="flex items-center gap-3 h-[calc(100%-28px)]">
                  {/* Left: QR Code */}
                  <div className="w-[38%] h-full flex items-center justify-center shrink-0 bg-white p-0.5 rounded-lg border border-slate-100">
                    {qrDataUrl ? (
                      <img 
                        src={qrDataUrl} 
                        alt="Asset QR Code" 
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="animate-pulse bg-slate-100 w-full h-full rounded" />
                    )}
                  </div>

                  {/* Right: Info Details */}
                  <div className="flex-1 flex flex-col justify-center overflow-hidden space-y-0.5">
                    <div className="text-[9px] font-bold text-blue-600 font-mono tracking-wide">
                      ASSET CODE
                    </div>
                    <div className="text-base font-extrabold font-mono text-slate-950 truncate leading-tight">
                      {effectiveCode}
                    </div>
                    <div className="text-xs font-bold text-slate-800 truncate leading-tight mt-0.5">
                      {equipment.name}
                    </div>
                    <div className="text-[10px] text-slate-600 flex items-center gap-2 font-medium">
                      <span>รหัส: <strong className="font-mono text-slate-800">{equipment.id}</strong></span>
                      <span>•</span>
                      <span className="truncate">ไลน์: <strong className="text-slate-800">{equipment.location}</strong></span>
                    </div>
                    <div className="text-[9px] text-slate-500 font-mono">
                      เริ่ม: {equipment.purchaseDate || '-'} | ฿{equipment.purchasePrice.toLocaleString()}
                    </div>
                  </div>
                </div>
              )}

              {stickerMode === 'barcode' && (
                <div className="flex flex-col justify-between h-[calc(100%-28px)] space-y-1">
                  <div className="flex items-start justify-between">
                    <div className="overflow-hidden">
                      <div className="text-[9px] font-bold text-blue-600 font-mono tracking-wide">
                        ASSET CODE
                      </div>
                      <div className="text-base font-extrabold font-mono text-slate-950 truncate leading-tight">
                        {effectiveCode}
                      </div>
                      <div className="text-xs font-bold text-slate-800 truncate leading-tight">
                        {equipment.name}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[10px] text-slate-600">
                        ไลน์: <strong>{equipment.location}</strong>
                      </div>
                      <div className="text-[9px] text-slate-500 font-mono">
                        รหัส: {equipment.id}
                      </div>
                    </div>
                  </div>

                  {/* 1D Barcode Strip */}
                  <div className="w-full flex flex-col items-center justify-center bg-white pt-1">
                    {barcodeDataUrl ? (
                      <img 
                        src={barcodeDataUrl} 
                        alt="Asset Barcode" 
                        className="w-full h-9 object-contain"
                      />
                    ) : (
                      <div className="animate-pulse bg-slate-100 w-full h-9 rounded" />
                    )}
                    <span className="text-[9px] font-mono tracking-widest text-slate-600 font-bold">
                      *{effectiveCode}*
                    </span>
                  </div>
                </div>
              )}

              {stickerMode === 'dual' && (
                <div className="flex items-center gap-2.5 h-[calc(100%-28px)]">
                  {/* Left: QR Code */}
                  <div className="w-[30%] h-full flex items-center justify-center shrink-0 bg-white p-0.5 rounded-lg border border-slate-100">
                    {qrDataUrl && (
                      <img 
                        src={qrDataUrl} 
                        alt="Asset QR Code" 
                        className="w-full h-full object-contain"
                      />
                    )}
                  </div>

                  {/* Center & Right */}
                  <div className="flex-1 flex flex-col justify-between h-full overflow-hidden">
                    <div className="space-y-0.5">
                      <div className="flex items-baseline justify-between gap-1">
                        <span className="text-[8.5px] font-bold text-blue-600 font-mono">ASSET CODE</span>
                        <span className="text-[8.5px] text-slate-500 font-mono">ID: {equipment.id}</span>
                      </div>
                      <div className="text-sm font-extrabold font-mono text-slate-950 truncate leading-none">
                        {effectiveCode}
                      </div>
                      <div className="text-[11px] font-bold text-slate-800 truncate leading-tight">
                        {equipment.name}
                      </div>
                    </div>

                    {/* Small Barcode at bottom */}
                    <div className="w-full flex flex-col items-center pt-0.5">
                      {barcodeDataUrl && (
                        <img 
                          src={barcodeDataUrl} 
                          alt="Asset Barcode" 
                          className="w-full h-6 object-contain"
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Info & Tips */}
          <div className="bg-amber-50 text-amber-900 border border-amber-200/90 text-xs p-3 rounded-2xl leading-relaxed flex items-start gap-2">
            <span className="text-base leading-none">💡</span>
            <div className="space-y-0.5">
              <strong>วิธีใช้งานสติกเกอร์ตรวจเช็คทรัพย์สิน:</strong>
              <p className="text-[11px] text-amber-800">
                นำสติกเกอร์ที่พิมพ์ไปติดที่ตัวเครื่องมือ เมื่อต้องการตรวจนับหรือตรวจสอบประวัติ สามารถใช้กล้องมือถือหรือฟังก์ชัน 
                <strong> "🔍 สแกนตรวจเช็คทรัพย์สิน"</strong> บนหน้านี้เพื่อสแกน QR / Barcode ได้ทันที
              </p>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopySticker}
                className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                title="คัดลอกรูปภาพสติกเกอร์"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'คัดลอกแล้ว!' : 'คัดลอกรูป'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadSticker}
                className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                title="ดาวน์โหลดภาพ PNG"
              >
                <Download className="h-3.5 w-3.5 text-blue-600" />
                <span>โหลด PNG</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                ปิด
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-md shadow-blue-600/20"
              >
                <Printer className="h-4 w-4" />
                <span>สั่งพิมพ์สติกเกอร์</span>
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Hidden Print Section specifically formatted for 60x30mm thermal label printers */}
      <div id="print-section" className="hidden">
        {stickerMode === 'qr' && (
          <div style={{
            width: '60mm',
            height: '30mm',
            padding: '1.5mm',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            color: 'black',
            background: 'white'
          }}>
            {/* Left QR (26x26mm) */}
            <div style={{ width: '25mm', height: '26mm', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {qrDataUrl && (
                <img 
                  src={qrDataUrl} 
                  alt="QR" 
                  style={{ width: '25mm', height: '25mm', objectFit: 'contain' }} 
                />
              )}
            </div>

            {/* Right Information (32x26mm) */}
            <div style={{
              width: '32mm',
              height: '26mm',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              paddingLeft: '1.5mm',
              overflow: 'hidden'
            }}>
              <div style={{ fontSize: '7px', fontWeight: 'bold', color: '#1e40af', fontFamily: 'monospace' }}>
                ASSET CODE • ทรัพย์สิน
              </div>
              <div style={{ fontSize: '13px', fontWeight: '900', fontFamily: 'monospace', color: 'black', lineHeight: '1.1' }}>
                {effectiveCode}
              </div>
              <div style={{ 
                fontSize: '8.5px', 
                fontWeight: 'bold', 
                color: 'black', 
                lineHeight: '1.15', 
                marginTop: '1px',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}>
                {equipment.name}
              </div>
              <div style={{ fontSize: '7.5px', color: '#334155', fontWeight: 'bold', marginTop: '1px' }}>
                รหัส: {equipment.id} | {equipment.location}
              </div>
              <div style={{ fontSize: '6.5px', color: '#64748b', fontFamily: 'monospace' }}>
                ประเภท: {equipment.equipmentType === 'Spare' ? 'Spare สำรอง' : 'Main หลัก'}
              </div>
            </div>
          </div>
        )}

        {stickerMode === 'barcode' && (
          <div style={{
            width: '60mm',
            height: '30mm',
            padding: '1.5mm',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            color: 'black',
            background: 'white'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '7px', fontWeight: 'bold', color: '#1e40af', fontFamily: 'monospace' }}>
                  ASSET CODE • {equipment.equipmentType || 'MAIN'}
                </div>
                <div style={{ fontSize: '12.5px', fontWeight: '900', fontFamily: 'monospace', color: 'black', lineHeight: '1.1' }}>
                  {effectiveCode}
                </div>
                <div style={{ fontSize: '8px', fontWeight: 'bold', color: 'black', maxWidth: '40mm', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {equipment.name}
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '7px', color: '#334155' }}>
                <div>รหัส: {equipment.id}</div>
                <div>{equipment.location}</div>
              </div>
            </div>

            {/* Barcode image */}
            <div style={{ textAlign: 'center', width: '100%' }}>
              {barcodeDataUrl && (
                <img 
                  src={barcodeDataUrl} 
                  alt="Barcode" 
                  style={{ width: '54mm', height: '11mm', objectFit: 'contain', margin: '0 auto' }} 
                />
              )}
              <div style={{ fontSize: '7.5px', fontFamily: 'monospace', fontWeight: 'bold', letterSpacing: '1px' }}>
                *{effectiveCode}*
              </div>
            </div>
          </div>
        )}

        {stickerMode === 'dual' && (
          <div style={{
            width: '60mm',
            height: '30mm',
            padding: '1.5mm',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            color: 'black',
            background: 'white'
          }}>
            {/* Left QR */}
            <div style={{ width: '23mm', height: '26mm', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {qrDataUrl && (
                <img 
                  src={qrDataUrl} 
                  alt="QR" 
                  style={{ width: '23mm', height: '23mm', objectFit: 'contain' }} 
                />
              )}
            </div>

            {/* Right details & Barcode */}
            <div style={{ width: '34mm', height: '26mm', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingLeft: '1mm' }}>
              <div>
                <div style={{ fontSize: '6.5px', fontWeight: 'bold', color: '#1e40af', fontFamily: 'monospace' }}>
                  ASSET CODE
                </div>
                <div style={{ fontSize: '11px', fontWeight: '900', fontFamily: 'monospace', color: 'black', lineHeight: '1.1' }}>
                  {effectiveCode}
                </div>
                <div style={{ fontSize: '7.5px', fontWeight: 'bold', color: 'black', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {equipment.name}
                </div>
                <div style={{ fontSize: '6.5px', color: '#334155' }}>
                  {equipment.id} | {equipment.location}
                </div>
              </div>

              {barcodeDataUrl && (
                <img 
                  src={barcodeDataUrl} 
                  alt="Barcode" 
                  style={{ width: '33mm', height: '6mm', objectFit: 'contain' }} 
                />
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
