import { jsPDF } from 'jspdf';
import fs from 'fs';
import path from 'path';

// Create docs directory in public if it doesn't exist
const publicDocsDir = path.join(process.cwd(), 'public', 'docs');
if (!fs.existsSync(publicDocsDir)) {
  fs.mkdirSync(publicDocsDir, { recursive: true });
}

const doc = new jsPDF({
  orientation: 'portrait',
  unit: 'mm',
  format: 'a4'
});

// Helper for drawing boxes with title and bullet points
function drawSectionBox(doc, x, y, width, height, title, items, headerBgColor = [30, 58, 138]) {
  // Draw header box
  doc.setFillColor(...headerBgColor);
  doc.rect(x, y, width, 8, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(title, x + 3, y + 5.5);

  // Draw content box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.rect(x, y + 8, width, height - 8, 'FD');

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');

  let itemY = y + 13;
  items.forEach(item => {
    doc.text(`* ${item}`, x + 3, itemY);
    itemY += 4.5;
  });
}

// Header Banner
doc.setFillColor(15, 23, 42); // Slate-900
doc.rect(0, 0, 210, 30, 'F');

doc.setTextColor(255, 255, 255);
doc.setFontSize(16);
doc.setFont('helvetica', 'bold');
doc.text('SYSTEM MINDMAP & WORKFLOW ARCHITECTURE', 105, 12, { align: 'center' });

doc.setFontSize(10);
doc.setFont('helvetica', 'normal');
doc.setTextColor(148, 163, 184);
doc.text('Spare Part Control & Equipment Repair Management Web Application', 105, 20, { align: 'center' });

// Line separator
doc.setDrawColor(59, 130, 246);
doc.setLineWidth(1);
doc.line(10, 32, 200, 32);

// SECTION 1: MINDMAP OVERVIEW
doc.setTextColor(15, 23, 42);
doc.setFontSize(12);
doc.setFont('helvetica', 'bold');
doc.text('1. APPLICATION MODULE MINDMAP', 10, 40);

// Row 1 Mindmap Modules
drawSectionBox(doc, 10, 44, 90, 42, 'A. Inventory & Barcode/QR Control', [
  'Master Spare Part List & Location Tracking',
  'Real-time Stock Balance & Min/Max Limit Alerts',
  'Barcode & QR Code Tag Generation & Scanner',
  'Part Unit Price & Valuation Calculation'
], [30, 58, 138]);

drawSectionBox(doc, 110, 44, 90, 42, 'B. Equipment & Asset Management', [
  'Equipment Registry (Asset Code, Price, Budget)',
  'Main Machine vs Spare Machine Classification',
  'Batch Printing Equipment QR Code Stickers',
  'Individual Machine Service & Repair History'
], [13, 148, 136]);

// Row 2 Mindmap Modules
drawSectionBox(doc, 10, 90, 90, 42, 'C. Transaction & Repair Withdrawal', [
  'Quick Spare Part Withdrawal & Restock',
  'Link Withdrawal directly to Machine Repairs',
  'Auto Cost Allocation (Part Cost + Labor Cost)',
  'Instant Telegram Withdrawal Notifications'
], [180, 83, 9]);

drawSectionBox(doc, 110, 90, 90, 42, 'D. 12-Month PM Inspection & Checklist', [
  '4 Factory Forms (Strapping, Nail Gun, Seal, etc.)',
  'Inline Template Editor & Check Item Customization',
  'Friction Weld Seam Visual Standard Guidelines',
  '3-Level Signatures (Tech, Engineer, Manager)'
], [67, 56, 202]);

// Row 3 Mindmap Modules
drawSectionBox(doc, 10, 136, 90, 42, 'E. Tool Loan & Spare Swap Management', [
  'Line Machine Spare Swapping & Borrowing Log',
  'Borrower, Location, Expected Return Date',
  'Return Tracking & Condition Inspection Notes',
  'Instant Telegram Borrow/Return Notifications'
], [219, 39, 119]);

drawSectionBox(doc, 110, 136, 90, 42, 'F. Google Sheets & Cloud Persistence', [
  '2-Way Real-time Google Sheets Cloud Sync',
  'AuthorizedUsers Role Access Control (Admin/User)',
  'Automatic PMInspections & Logs Provisioning',
  'Local Storage + Cloud Fallback Architecture'
], [15, 118, 110]);

// SECTION 2: SYSTEM WORKFLOW & DATA FLOW
doc.setDrawColor(203, 213, 225);
doc.line(10, 182, 200, 182);

doc.setTextColor(15, 23, 42);
doc.setFontSize(12);
doc.setFont('helvetica', 'bold');
doc.text('2. CORE SYSTEM WORKFLOW & DATA FLOW', 10, 190);

// Workflow Step 1
doc.setFillColor(239, 246, 255);
doc.setDrawColor(191, 219, 254);
doc.rect(10, 195, 190, 18, 'FD');
doc.setFontSize(9);
doc.setFont('helvetica', 'bold');
doc.setTextColor(29, 78, 216);
doc.text('STEP 1: User Login & Google Sheets Database Sync', 13, 200);
doc.setFont('helvetica', 'normal');
doc.setTextColor(51, 65, 85);
doc.text('User authenticates via Google OAuth -> Verifies AuthorizedUsers email -> Auto-fetches/provisions Sheet tabs.', 13, 208);

// Workflow Step 2
doc.setFillColor(254, 243, 199);
doc.setDrawColor(253, 230, 138);
doc.rect(10, 216, 190, 18, 'FD');
doc.setFont('helvetica', 'bold');
doc.setTextColor(180, 83, 9);
doc.text('STEP 2: Machine Breakdown / Spare Part Withdrawal Request', 13, 221);
doc.setFont('helvetica', 'normal');
doc.setTextColor(51, 65, 85);
doc.text('Tech scans Machine QR -> Selects required Spare Part -> Records Withdrawal & Repair Detail -> Auto Stock Deduction.', 13, 229);

// Workflow Step 3
doc.setFillColor(236, 253, 245);
doc.setDrawColor(167, 243, 208);
doc.rect(10, 237, 190, 18, 'FD');
doc.setFont('helvetica', 'bold');
doc.setTextColor(4, 120, 87);
doc.text('STEP 3: Monthly Preventive Maintenance (PM) Inspection', 13, 242);
doc.setFont('helvetica', 'normal');
doc.setTextColor(51, 65, 85);
doc.text('Selects Machine Form Template -> Conducts 12-Month Matrix Check -> Auto-Saves -> 3-Level Digital Verification.', 13, 250);

// Workflow Step 4
doc.setFillColor(253, 242, 248);
doc.setDrawColor(251, 207, 232);
doc.rect(10, 258, 190, 18, 'FD');
doc.setFont('helvetica', 'bold');
doc.setTextColor(190, 24, 93);
doc.text('STEP 4: Real-time Notifications & Analytics Sync', 13, 263);
doc.setFont('helvetica', 'normal');
doc.setTextColor(51, 65, 85);
doc.text('Triggers Telegram alerts (Withdrawal / Low Stock / Borrow) -> Updates Executive Dashboard Analytics in real-time.', 13, 271);

// Footer
doc.setFillColor(241, 245, 249);
doc.rect(0, 282, 210, 15, 'F');
doc.setFontSize(8);
doc.setTextColor(100, 116, 139);
doc.text('Generated for Presentation | Spare Part & Equipment Repairs Control System', 105, 289, { align: 'center' });

const pdfPath = path.join(publicDocsDir, 'Web_App_Mindmap_and_Workflow.pdf');
const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
fs.writeFileSync(pdfPath, pdfBuffer);

console.log('PDF generated successfully at:', pdfPath);
