import React, { useState, useEffect } from 'react';
import { Copy, Check, FileCode, Layers, HelpCircle, Terminal, Download } from 'lucide-react';

export default function AppsScriptExportTab() {
  const [activeCodeTab, setActiveCodeTab] = useState<'code' | 'index'>('code');
  const [codeGs, setCodeGs] = useState('');
  const [indexHtml, setIndexHtml] = useState('');
  const [copiedGs, setCopiedGs] = useState(false);
  const [copiedHtml, setCopiedHtml] = useState(false);

  // โหลดโค้ดตั้งต้นจากระบบ
  useEffect(() => {
    // ในขั้นตอนการพัฒนา เราจะเขียนข้อความหรือดึงข้อความจากภายนอก
    // หรือระบุโค้ดแบบสตริงไปเลยเพื่อให้ผู้ใช้คัดลอกได้ทันที (ปลอดภัย รวดเร็ว)
    // โค้ดด้านล่างนี้สะท้อนจากไฟล์ที่เราสร้างขึ้นจริงในระบบ
    
    // โค้ด Code.gs
    const gsContent = `/**
 * Google Apps Script - ระบบควบคุมสต็อกและประวัติการเบิก-รับอะไหล่ (Spare Part Control)
 * สำหรับโรงงานผลิต (Manufacturing Systems)
 * 
 * ผู้พัฒนา: Manufacturing Systems Developer
 * เชื่อมต่อ 2 ชีตหลัก: "Inventory" (สต็อกคงเหลือ) และ "Transactions" (ประวัติการใช้งาน)
 */

function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setTitle('ระบบควบคุมอะไหล่ - Spare Part Control')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getInventoryData() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Inventory");
    if (!sheet) {
      throw new Error("ไม่พบชีตชื่อ 'Inventory' กรุณาสร้างชีตนี้ก่อนเริ่มใช้งาน");
    }
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];
    
    const jsonResult = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const part = {
        id: String(row[0]).trim(),
        name: String(row[1]),
        category: String(row[2]),
        location: String(row[3]),
        quantity: Number(row[4]) || 0,
        unit: String(row[5]),
        minStock: Number(row[6]) || 0,
        maxStock: Number(row[7]) || 0
      };
      if (part.id) jsonResult.push(part);
    }
    return jsonResult;
  } catch (error) {
    throw new Error("ดึงข้อมูลสต็อกล้มเหลว: " + error.message);
  }
}

function saveNewTransaction(data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // Concurrency Control 10 วินาที
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const invSheet = ss.getSheetByName("Inventory");
    const txSheet = ss.getSheetByName("Transactions");
    
    const partId = String(data.partId).trim();
    const type = data.type; // 'เบิกจ่าย' หรือ 'รับเข้า'
    const qtyToChange = Number(data.quantity);
    
    const invData = invSheet.getDataRange().getValues();
    let rowIndex = -1;
    let currentQty = 0;
    let partName = "";
    let minStock = 0;
    let unit = "";
    
    for (let i = 1; i < invData.length; i++) {
      if (String(invData[i][0]).trim() === partId) {
        rowIndex = i + 1;
        partName = String(invData[i][1]);
        currentQty = Number(invData[i][4]) || 0;
        unit = String(invData[i][5]);
        minStock = Number(invData[i][6]) || 0;
        break;
      }
    }
    
    if (rowIndex === -1) throw new Error("ไม่พบรหัสอะไหล่: " + partId);
    
    let newQty = currentQty;
    if (type === 'เบิกจ่าย') {
      if (currentQty < qtyToChange) {
        throw new Error("สต็อกไม่เพียงพอ! มีเหลือ " + currentQty + " แต่ขอเบิก " + qtyToChange);
      }
      newQty = currentQty - qtyToChange;
    } else {
      newQty = currentQty + qtyToChange;
    }
    
    // บันทึก Transactions
    txSheet.appendRow([new Date(), partId, partName, type, qtyToChange, data.technician, data.machineNote || ""]);
    
    // ปรับยอดสต็อก
    invSheet.getRange(rowIndex, 5).setValue(newQty);
    lock.releaseLock();
    
    const isBelowMin = newQty < minStock;
    let notificationSent = false;
    let alertDetails = "";
    
    if (isBelowMin) {
      const details = { id: partId, name: partName, currentQty: newQty, minStock, unit, technician: data.technician, type, qtyChanged: qtyToChange };
      notificationSent = sendLowStockNotification(details);
      alertDetails = "⚠️ อะไหล่ต่ำกว่าเกณฑ์ขั้นต่ำ! คงเหลือเพียง " + newQty + " " + unit + " (Min: " + minStock + ")";
    }
    
    return { success: true, partId, partName, oldQty: currentQty, newQty, unit, isBelowMin, notificationSent, alertDetails };
  } catch (error) {
    if (lock.hasLock()) lock.releaseLock();
    throw new Error("บันทึกข้อมูลล้มเหลว: " + error.message);
  }
}

function sendLowStockNotification(part) {
  try {
    const recipientEmail = Session.getActiveUser().getEmail();
    const subject = "[แจ้งเตือนด่วน] อะไหล่สำรองวิกฤตต่ำกว่าเกณฑ์: " + part.name;
    const body = "ตรวจพบอะไหล่ต่ำกว่าจุดวิกฤต: " + part.name + " (" + part.id + ")\\n" +
                 "จำนวนคงเหลือล่าสุด: " + part.currentQty + " " + part.unit + " (ค่าสั่งซื้อขั้นต่ำ Min: " + part.minStock + ")\\n" +
                 "ทำรายการโดยช่าง: " + part.technician;
    
    MailApp.sendEmail(recipientEmail, subject, body);
    return true;
  } catch (err) {
    return false;
  }
}`;

    // ย่อสั้นๆ สำหรับแสดงในวิวเวอร์
    setCodeGs(gsContent);
    
    // ดึงโค้ด html คร่าวๆ หรือใช้ตัวย่อที่ผู้ใช้ดึงไปใช้งานได้จริง
    const htmlContent = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ระบบควบคุมคลังอะไหล่ - Spare Part Control Web App</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <!-- อ่านคู่มือและโค้ดตัวเต็ม 100% ได้ที่ปุ่มดาวน์โหลดไฟล์ Index.html ด้านบน -->
</head>
<body>
  <!-- ดำเนินการคัดลอกโค้ดสมบูรณ์แบบ 100% จากไฟล์ /Index.html ไปใช้งานใน Apps Script ของคุณ -->
</body>
</html>`;
    setIndexHtml(htmlContent);
  }, []);

  const copyToClipboard = (text: string, isGs: boolean) => {
    navigator.clipboard.writeText(text);
    if (isGs) {
      setCopiedGs(true);
      setTimeout(() => setCopiedGs(false), 2000);
    } else {
      setCopiedHtml(true);
      setTimeout(() => setCopiedHtml(false), 2000);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden font-sans">
      {/* ส่วนหัว */}
      <div className="bg-slate-900 px-6 py-5 text-white border-b-4 border-blue-500">
        <div className="flex items-center gap-2.5">
          <Terminal className="h-5 w-5 text-blue-400" />
          <div>
            <h3 className="font-display font-bold text-lg">คัดลอกและส่งออกไปยัง Google Apps Script (GAS Setup)</h3>
            <p className="text-xs text-slate-400">สำหรับผู้ที่ต้องการนำแอปนี้ไปติดตั้งไว้บนชีตของโรงงานด้วยตนเอง</p>
          </div>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* คอลัมน์ซ้าย: ขั้นตอนการติดตั้งอย่างละเอียด */}
        <div className="lg:col-span-1 space-y-5">
          <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 text-blue-900 shadow-sm">
            <h4 className="font-display font-bold text-sm flex items-center gap-1.5 mb-1.5">
              <HelpCircle className="h-4 w-4 text-blue-600 shrink-0" />
              วิธีอัปโหลดระบบเข้า Google Sheets
            </h4>
            <p className="text-xs leading-relaxed text-blue-800">
              ท่านสามารถติดตั้งและเปิดใช้งานแอปพลิเคชันเวอร์ชันดั้งเดิมภาษาไทยได้ฟรีในบัญชี Google Workplace ของโรงงาน ผ่าน 5 ขั้นตอนหลัก:
            </p>
          </div>

          <ol className="space-y-4 text-xs text-slate-600 list-decimal list-inside pl-1 font-sans">
            <li className="leading-relaxed">
              <strong className="text-slate-800">เปิดสเปรดชีตโรงงาน:</strong> สร้างหรือเข้าแผ่นงาน Google Sheets ที่ชื่อว่า <span className="font-mono bg-slate-100 px-1 py-0.5 rounded border border-slate-200">Inventory</span> และ <span className="font-mono bg-slate-100 px-1 py-0.5 rounded border border-slate-200">Transactions</span>
            </li>
            <li className="leading-relaxed">
              <strong className="text-slate-800">เข้าเมนู Apps Script:</strong> กดเมนู <strong className="text-slate-900">ส่วนขยาย (Extensions)</strong> &gt; <strong className="text-slate-900">Apps Script</strong> ในแถบด้านบนของ Sheets
            </li>
            <li className="leading-relaxed">
              <strong className="text-slate-800">คัดลอกโค้ดหลังบ้าน (Code.gs):</strong> นำโค้ดในแท็บ <strong className="text-slate-900">Code.gs</strong> ไปวางแทนที่โค้ดเก่าในเครื่องมือแก้ไข
            </li>
            <li className="leading-relaxed">
              <strong className="text-slate-800">สร้างไฟล์หน้าจอหน้าบ้าน (Index.html):</strong> กดเครื่องหมาย <strong className="text-slate-900">+ (เพิ่มไฟล์)</strong> เลือก <strong className="text-slate-900">HTML</strong> ตั้งชื่อไฟล์ว่า <strong className="text-slate-900 font-mono">Index</strong> (ห้ามพิมพ์ .html ซ้ำ) คัดลอกโค้ดจากตารางด้านข้างไปวาง
            </li>
            <li className="leading-relaxed">
              <strong className="text-slate-800">การนำไปใช้งาน (Deployment):</strong> กดปุ่มสีน้ำเงิน <strong className="text-slate-950 bg-blue-100 px-1.5 py-0.5 rounded">การทำให้ใช้งานได้ (Deploy)</strong> &gt; <strong className="text-slate-900">การทำให้ใช้งานได้ใหม่</strong> เลือกประเภท <strong className="text-slate-900">เว็บแอป (Web App)</strong> ตั้งสิทธิ์เข้าถึงเป็น <strong className="text-slate-900">"ทุกคน (Anyone)"</strong> แล้วนำลิงก์ไปส่งให้ช่างใช้ในมือถือได้เลย!
            </li>
          </ol>
        </div>

        {/* คอลัมน์ขวา: ตัวอ่านและคัดลอกโค้ด (Code Viewer Component) */}
        <div className="lg:col-span-2 flex flex-col border border-slate-200 rounded-xl overflow-hidden shadow-md bg-slate-950">
          {/* แถบสลับแท็บโค้ด */}
          <div className="bg-slate-900 px-4 py-2.5 flex items-center justify-between border-b border-slate-800">
            <div className="flex gap-2 text-xs font-semibold">
              <button
                onClick={() => setActiveCodeTab('code')}
                className={`px-3 py-2 rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                  activeCodeTab === 'code' 
                    ? 'bg-slate-800 text-blue-400 font-bold border border-slate-700/50' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileCode className="h-3.5 w-3.5" />
                <span>Code.gs (หลังบ้าน)</span>
              </button>
              <button
                onClick={() => setActiveCodeTab('index')}
                className={`px-3 py-2 rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                  activeCodeTab === 'index' 
                    ? 'bg-slate-800 text-blue-400 font-bold border border-slate-700/50' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileCode className="h-3.5 w-3.5" />
                <span>Index.html (หน้าบ้าน)</span>
              </button>
            </div>

            {/* ปุ่มคัดลอก */}
            <button
              onClick={() => {
                if (activeCodeTab === 'code') {
                  copyToClipboard(codeGs, true);
                } else {
                  copyToClipboard(codeGs, false);
                }
              }}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-sm"
            >
              {activeCodeTab === 'code' ? (
                copiedGs ? <Check className="h-3.5 w-3.5 text-emerald-450" /> : <Copy className="h-3.5 w-3.5" />
              ) : (
                copiedHtml ? <Check className="h-3.5 w-3.5 text-emerald-450" /> : <Copy className="h-3.5 w-3.5" />
              )}
              <span>{activeCodeTab === 'code' ? (copiedGs ? 'คัดลอกสำเร็จ!' : 'คัดลอก Code.gs') : (copiedHtml ? 'คัดลอกสำเร็จ!' : 'คัดลอก Index.html')}</span>
            </button>
          </div>

          {/* ตู้แสดงโค้ด */}
          <div className="p-4 overflow-auto max-h-[440px] text-[11px] font-mono leading-relaxed text-slate-300">
            {activeCodeTab === 'code' ? (
              <pre className="whitespace-pre-wrap select-all">{codeGs}</pre>
            ) : (
              <div className="space-y-4">
                <p className="text-blue-300 leading-normal bg-blue-950/40 p-3 rounded-lg border border-blue-900">
                  💡 <strong>คำแนะนำเพิ่มเติม:</strong> ท่านสามารถคัดลอกโค้ดแบบเต็มรูปแบบ 100% (รวม Bootstrap 5, สไลเดอร์สวิตช์, ตารางค้นหา, และแผนภูมิ Chart.js ในหนึ่งเดียว) ได้อย่างง่ายดายโดยการคลิกเปิดหรือคัดลอกโดยตรงจากไฟล์ชื่อ <strong className="text-white">AppsScript_Index.html</strong> ในเมนูสำรวจไฟล์ (File Explorer) ทางซ้ายมือของแอปนี้ได้เช่นกัน! (แล้วนำไปสร้างไฟล์ใหม่บนเมนูหน้าเว็บ Google Apps Script โดยตั้งชื่อว่า <strong className="text-white">Index</strong>)
                </p>
                <pre className="whitespace-pre-wrap select-all text-slate-400">{indexHtml}</pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
