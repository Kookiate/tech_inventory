import React from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  Layers, 
  ArrowRightLeft, 
  Cpu, 
  ClipboardCheck, 
  Wrench, 
  Repeat, 
  BarChart3, 
  Shield, 
  Send, 
  FileSpreadsheet, 
  CheckCircle2, 
  ChevronRight, 
  Sparkles,
  GitBranch,
  Workflow,
  ExternalLink
} from 'lucide-react';

export default function PresentationTab() {
  const pdfUrl = '/docs/Web_App_Mindmap_and_Workflow.pdf';

  const handlePrint = () => {
    window.print();
  };

  const mindmapNodes = [
    {
      id: 'inv',
      icon: Layers,
      color: 'from-blue-600 to-indigo-700',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
      title: '1. คลังอะไหล่สำรอง (Inventory Control)',
      subtitle: 'บริหารจัดการสต็อก อะไหล่สำรอง บาร์โค้ด และ QR Code',
      points: [
        ' Master Part List: รายการอะไหล่ทั้งหมด ราคา และจุดจัดเก็บ (Cabinet/Shelf)',
        ' Barcode & QR Code: สร้างและสแกนแท็กบาร์โค้ดสำหรับอะไหล่ชิ้นงาน',
        ' Stock Balance Alert: สัญลักษณ์เตือนยอดคงเหลือต่ำกว่าเกณฑ์ความปลอดภัย (Min Stock)',
        ' Valuation Calculation: คำนวณมูลค่ารวมอะไหล่สำรองคลังตามจริง'
      ]
    },
    {
      id: 'eq',
      icon: Cpu,
      color: 'from-amber-500 to-orange-600',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
      title: '2. ระบบทะเบียนเครื่องจักร (Equipment Registry)',
      subtitle: 'ควบคุมประวัติเครื่องจักร งบประมาณซ่อมบำรุง และสติกเกอร์ QR Asset',
      points: [
        ' Equipment Registry: ลงทะเบียนรหัสเครื่อง, ราคาซื้อ, วันที่ซื้อ, และงบซ่อมสูงสุด',
        ' Classification: แยกประเภทเครื่องจักรหลัก (Main) และเครื่องสำรอง (Spare)',
        ' Batch QR Stickers: พิมพ์สติกเกอร์ QR Asset สำหรับติดตัวเครื่องหน้างาน',
        ' Machine Scan: สแกน QR หน้าเครื่องเพื่อดูประวัติซ่อมและเปิดฟอร์ม PM'
      ]
    },
    {
      id: 'tx',
      icon: ArrowRightLeft,
      color: 'from-blue-500 to-cyan-600',
      badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-200',
      title: '3. การเบิกจ่าย - รับเข้าอะไหล่ (Transaction & Withdrawal)',
      subtitle: 'เบิกจ่ายอะไหล่ ตัดสต็อกแบบเรียลไทม์ และลิงก์ประวัติงานซ่อม',
      points: [
        ' Quick Withdrawal: เบิกจ่ายและรับเข้าอะไหล่รวดเร็ว',
        ' Repair Direct Link: ลิงก์รายการเบิกเข้ากับเครื่องจักรและประวัติงานซ่อมทันที',
        ' Auto Cost Allocation: คำนวณค่าอะไหล่ + ค่าบริการเข้าต้นทุนซ่อมเครื่อง',
        ' Telegram Alert: ส่งการแจ้งเตือนลงกลุ่ม Telegram ทันทีเมื่อมีการเบิกจ่าย'
      ]
    },
    {
      id: 'pm',
      icon: ClipboardCheck,
      color: 'from-emerald-600 to-teal-700',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      title: '4. แบบตรวจเช็ค PM ประจำเดือน (12-Month PM Checklist)',
      subtitle: 'แบบฟอร์มประเมิน 4 รูปแบบ พร้อมตาราง Matrix และอนุมัติ 3 ระดับ',
      points: [
        ' 4 Standard Templates: แบบฟอร์มโรงงาน 4 ประเภท (ไม่ใช้กิ๊บ, ยิงตะปู, แพ็คพลาสติก, ใช้กิ๊บ)',
        ' Inline Form Editor: แก้ไขชื่อและรายการหัวข้อตรวจเช็คในแบบฟอร์มได้เอง',
        ' 12-Month Excel Matrix: แสดงตารางสรุปผล 12 เดือน พร้อม Friction Weld Visual Guide',
        ' 3-Level Digital Verification: ลงนามอนุมัติ 3 ระดับ (Technician / Engineer / Manager)'
      ]
    },
    {
      id: 'maint',
      icon: Wrench,
      color: 'from-violet-600 to-purple-700',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
      title: '5. ประวัติงานซ่อมบำรุง (Maintenance & Repair Logs)',
      subtitle: 'บันทึกประวัติการซ่อม รูปภาพปัญหา และแจ้งเตือนงบซ่อมเกินเกณฑ์',
      points: [
        ' Detailed Repair Log: บันทึกสาเหตุการซ่อม, ช่างผู้ซ่อม, และแนบรูปภาพ',
        ' Budget Warning: แจ้งเตือนเมื่อค่าซ่อมสะสมใกล้หรือเกินงบประมาณสูงสุดของเครื่อง',
        ' Cost Analysis: แยกต้นทุนค่าอะไหล่ และค่าใช้จ่ายอื่นๆ',
        ' Export CSV: ส่งออกรายงานประวัติการซ่อมแซมเพื่อนำไปใช้ในวิเคราะห์'
      ]
    },
    {
      id: 'loan',
      icon: Repeat,
      color: 'from-pink-600 to-rose-700',
      badgeColor: 'bg-pink-100 text-pink-800 border-pink-200',
      title: '6. สลับยืม-คืนเครื่องมือ & เครื่อง Spare (Tool Loan)',
      subtitle: 'การสลับยืมเครื่องสำรองเมื่อเครื่องหลักชำรุด',
      points: [
        ' Spare Swap Control: บันทึกการยืมเครื่องสำรองไปใช้งานทดแทนในไลน์',
        ' Borrower & Date Tracking: ระบุชื่อผู้ยืม, ไลน์ผลิต, และกำหนดวันคืน',
        ' Return Inspection: บันทึกการรับคืนเข้าคลังและตรวจสภาพ',
        ' Telegram Loan Notice: แจ้งเตือนยืม-คืนผ่าน Telegram อัตโนมัติ'
      ]
    },
    {
      id: 'sheet',
      icon: FileSpreadsheet,
      color: 'from-teal-600 to-emerald-700',
      badgeColor: 'bg-teal-100 text-teal-800 border-teal-200',
      title: '7. ฐานข้อมูล Google Sheets & สิทธิ์เข้าใช้งาน (Database & OAuth)',
      subtitle: '2-Way Real-time Cloud Sync และจัดการสิทธิ์ผู้ใช้งาน',
      points: [
        ' 2-Way Real-time Sync: เชื่อมต่อชีต Google Sheet ไร้รอยต่อ',
        ' Multi-Device Persistence: ซิงค์ข้อมูลข้ามคอมพิวเตอร์และมือถืออัตโนมัติ',
        ' AuthorizedUsers Access Control: กำหนดสิทธิ์อีเมลผู้ใช้งาน (Admin / User)',
        ' Auto Provisioning: สร้างแผ่นงาน (Tabs) อัตโนมัติในคลิกเดียว'
      ]
    },
    {
      id: 'dash',
      icon: BarChart3,
      color: 'from-sky-600 to-blue-700',
      badgeColor: 'bg-sky-100 text-sky-800 border-sky-200',
      title: '8. แดชบอร์ดผู้บริหาร (Executive Analytics Dashboard)',
      subtitle: 'กราฟวิเคราะห์แนวโน้มค่าใช้จ่ายซ่อม และสต็อกวิกฤต',
      points: [
        ' Executive Metrics: รวมมูลค่าคลัง, ยอดซ่อมบำรุงประจำเดือน, เครื่องวิกฤต',
        ' Top 5 Repair Cost: กราฟแท่งแสดง 5 อันดับเครื่องที่มีค่าซ่อมสูงสุด',
        ' High Frequency Repair Alert: รายงานเครื่องที่เสียซ้ำซ้อนเพื่อวางแผนเปลี่ยนเครื่อง',
        ' Stock Critical Alert: รายการอะไหล่ที่ต้องสั่งซื้อด่วน'
      ]
    }
  ];

  const workflowSteps = [
    {
      step: '01',
      title: 'ผู้ใช้งานเข้าสู่ระบบ & เชื่อมต่อฐานข้อมูล (Login & Sync)',
      color: 'border-blue-500 bg-blue-50/60 text-blue-900',
      badge: 'Step 1: Authentication',
      desc: 'เข้าสู่ระบบด้วย Google Account -> ตรวจสอบอีเมลในแผ่นงาน AuthorizedUsers -> ซิงค์ดึงข้อมูลล่าสุดจาก Google Sheets (Inventory, Equipment, MaintenanceLogs, PMInspections)'
    },
    {
      step: '02',
      title: 'สแกน QR / แจ้งซ่อมแซม & เบิกจ่ายอะไหล่ (Withdrawal)',
      color: 'border-amber-500 bg-amber-50/60 text-amber-900',
      badge: 'Step 2: Repair & Withdraw',
      desc: 'สแกน QR Code หน้าเครื่องจักร -> เลือกรายการอะไหล่ที่ต้องการเบิก -> ระบุช่างและสาเหตุงานซ่อม -> ระบบตัดสต็อกอัตโนมัติ และสร้างบันทึกประวัติการซ่อมบำรุง'
    },
    {
      step: '03',
      title: 'ตรวจเช็คเครื่องมือประจำเดือน PM (12-Month Inspection)',
      color: 'border-emerald-500 bg-emerald-50/60 text-emerald-900',
      badge: 'Step 3: Preventive Maintenance',
      desc: 'เลือกเครื่องและแบบฟอร์มโรงงาน -> ตรวจเช็คตามข้อกำหนด (เช่น Friction Weld) -> บันทึกแบบ Auto-save -> วิศวกรและผู้จัดการลงนามอนุมัติ (3-Level Verification)'
    },
    {
      step: '04',
      title: 'ส่งแจ้งเตือนเรียลไทม์ & สรุปผลบนแดชบอร์ด (Alert & Analytics)',
      color: 'border-purple-500 bg-purple-50/60 text-purple-900',
      badge: 'Step 4: Alert & Dashboard',
      desc: 'ส่งข้อความแจ้งเตือนเข้า Telegram กลุ่มช่างทันที (เบิกจ่าย/สต็อกต่ำ/ยืม Spare) -> อัปเดตข้อมูลแดชบอร์ดสรุปยอดมูลค่าคลังและเครื่องที่มีค่าซ่อมสูงสุด'
    }
  ];

  return (
    <div className="space-y-8 font-sans pb-12">
      {/* 1. Action Bar Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-700/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Workflow className="h-4 w-4 text-blue-400" />
              Presentation Documentation
            </span>
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-xl text-xs font-bold">
              PDF Ready
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            ผังโครงสร้างความคิด (Mindmap) และขั้นตอนการทำงาน (System Flow)
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
            สรุปภาพรวมสถาปัตยกรรมของ Web App ทั้ง 8 โมดูลหลัก และ Flow การประมวลผลข้อมูล ตั้งแต่การล็อกอิน ซิงค์ชีต การเบิกจ่าย ตัดสต็อก ตรวจเช็ค PM จนถึงแดชบอร์ดผู้บริหาร
          </p>
        </div>

        {/* Export Action Buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          <a
            href={pdfUrl}
            download="Web_App_Mindmap_and_Workflow.pdf"
            className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-bold transition-all shadow-lg shadow-emerald-600/30 flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Download className="h-4 w-4" />
            <span>ดาวน์โหลดเอกสาร PDF (Download PDF)</span>
          </a>

          <button
            onClick={handlePrint}
            className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-2xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            <Printer className="h-4 w-4 text-blue-400" />
            <span>พิมพ์ / บันทึกหน้าเว็บเป็น PDF</span>
          </button>
        </div>
      </div>

      {/* 2. SECTION 1: SYSTEM WORKFLOW & DATA FLOW CHART */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold shadow-2xs">
              <GitBranch className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 leading-tight">
                ขั้นตอนการทำงานหลักของระบบ (Core System Workflow & Data Flow)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                ลำดับขั้นการประมวลผลข้อมูลและการทำงานร่วมกันระหว่างโมดูล (End-to-End User Journey)
              </p>
            </div>
          </div>

          <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 hidden sm:inline-block">
            Workflow Diagram
          </span>
        </div>

        {/* Step Flowchart Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {workflowSteps.map((ws, idx) => (
            <div 
              key={ws.step}
              className={`p-5 rounded-2xl border-2 ${ws.color} transition-all hover:shadow-md flex flex-col justify-between relative`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="h-8 w-8 rounded-xl bg-white font-mono font-black text-sm flex items-center justify-center shadow-xs text-slate-800">
                    {ws.step}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-white rounded-md border border-slate-200 shadow-2xs">
                    {ws.badge}
                  </span>
                </div>
                <h4 className="text-xs font-black leading-snug mb-2">{ws.title}</h4>
                <p className="text-[11px] leading-relaxed opacity-90">{ws.desc}</p>
              </div>

              {idx < workflowSteps.length - 1 && (
                <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                  <div className="h-6 w-6 rounded-full bg-white border border-slate-300 flex items-center justify-center text-slate-400 text-xs shadow-xs">
                    <ChevronRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 3. SECTION 2: SYSTEM MINDMAP (8 CORE MODULES) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center font-bold shadow-2xs">
              <Workflow className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 leading-tight">
                ผังความคิดโครงสร้างโมดูลระบบ (Application Architecture Mindmap)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                จำแนกความสามารถและฟังก์ชันการทำงานหลัก 8 โมดูลในระบบ Web Application
              </p>
            </div>
          </div>

          <a
            href={pdfUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-bold text-blue-600 hover:text-blue-800 underline flex items-center gap-1 cursor-pointer self-end sm:self-auto"
          >
            <span>เปิดไฟล์ PDF สรุปทางการ</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        {/* Mindmap Nodes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {mindmapNodes.map((node) => {
            const IconComp = node.icon;

            return (
              <div 
                key={node.id} 
                className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-5 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-xs flex flex-col justify-between"
              >
                <div>
                  {/* Node Title Header */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${node.color} text-white flex items-center justify-center shrink-0 shadow-sm`}>
                      <IconComp className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 leading-snug">{node.title}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">{node.subtitle}</p>
                    </div>
                  </div>

                  {/* Bullet points */}
                  <ul className="space-y-1.5 pt-2 border-t border-slate-200/60">
                    {node.points.map((pt, pIdx) => (
                      <li key={pIdx} className="text-xs text-slate-700 flex items-start gap-2 leading-normal">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Bottom Footer Info Card */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white rounded-3xl p-6 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Sparkles className="h-6 w-6 text-amber-400 shrink-0 animate-pulse" />
          <div>
            <h4 className="text-sm font-bold text-white">พร้อมสำหรับการนำเสนองานผู้บริหารและทีมวิศวกรรม</h4>
            <p className="text-xs text-blue-200 mt-0.5">
              ไฟล์ PDF ถูกสร้างและจัดหน้าสไตล์ Presentation สามารถกดดาวน์โหลดหรือแนบไฟล์ส่งรายงานได้ทันที
            </p>
          </div>
        </div>

        <a
          href={pdfUrl}
          download="Web_App_Mindmap_and_Workflow.pdf"
          className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl text-xs transition-all shadow-md shrink-0 flex items-center gap-2 cursor-pointer"
        >
          <Download className="h-4 w-4" />
          <span>ดาวน์โหลด PDF ตอนนี้</span>
        </a>
      </div>
    </div>
  );
}
