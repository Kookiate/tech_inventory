export interface SparePart {
  id: string; // รหัสอะไหล่
  name: string; // ชื่ออะไหล่
  category: string; // หมวดหมู่
  location: string; // ตำแหน่งจัดเก็บ
  quantity: number; // คงเหลือ
  unit: string; // หน่วยนับ
  minStock: number; // Min_Stock
  maxStock: number; // Max_Stock
  price: number; // ราคาต่อหน่วย
  imageUrl?: string; // ลิงก์รูปภาพอะไหล่
}

export interface Transaction {
  timestamp: string; // วันเวลา
  partId: string; // รหัสอะไหล่
  partName: string; // ชื่ออะไหล่
  type: 'เบิกจ่าย' | 'รับเข้า'; // ประเภท (เบิกจ่าย, รับเข้า)
  quantity: number; // จำนวน
  technician: string; // ชื่อช่าง
  machineNote: string; // หมายเหตุ_เครื่องจักร
}

export interface Equipment {
  id: string; // รหัสเครื่องจักร/อุปกรณ์
  assetCode?: string; // รหัสทรัพย์สิน
  name: string; // ชื่อเครื่องจักร/อุปกรณ์
  location: string; // ไลน์ผลิต/ตำแหน่ง
  purchasePrice: number; // ราคาซื้อแรกเริ่ม
  maxRepairBudget: number; // งบซ่อมสะสมสูงสุดที่รับได้ (หรือราคาเปลี่ยนเครื่องใหม่)
  purchaseDate: string; // วันที่ติดตั้ง/ซื้อ
  equipmentType?: 'Main' | 'Spare'; // ประเภทเครื่องมือ (Main = เครื่องมือหลัก, Spare = เครื่องมือสำรอง)
  category?: string; // หมวดหมู่อุปกรณ์
}

export interface MaintenanceLog {
  date: string; // วันที่ซ่อม
  equipmentId: string; // รหัสเครื่องจักร
  equipmentName: string; // ชื่อเครื่องจักร
  repairDetail: string; // อาการและวิธีซ่อม
  partUsedId: string; // รหัสอะไหล่ที่ใช้
  partQty: number; // จำนวนที่ใช้
  partCost: number; // มูลค่าอะไหล่
  otherCost: number; // ค่าใช้จ่ายนอก/ค่าบริการ
  totalCost: number; // รวมค่าใช้จ่ายทั้งหมด
  technician: string; // ช่างซ่อมผู้รับผิดชอบ
  imageUrl?: string; // ลิงก์รูปถ่ายประวัติซ่อม
}

export interface SpreadsheetConnection {
  spreadsheetId: string;
  spreadsheetUrl: string;
  name: string;
}

export interface SpareLoan {
  id: string; // รหัสการยืม เช่น LOAN-001
  borrowDate: string; // วันเวลาที่ยืม
  partId: string; // รหัสอะไหล่/เครื่องมือ Spare
  partName: string; // ชื่ออะไหล่/เครื่องมือ Spare
  lineLocation: string; // ไลน์ผลิต/ตำแหน่งที่นำไปใช้
  borrowerName: string; // ชื่อผู้ยืม/ช่างเทคนิค
  quantity: number; // จำนวนที่ยืม
  purposeNote: string; // วัตถุประสงค์/หมายเหตุ
  status: 'กำลังยืม' | 'คืนแล้ว'; // สถานะ (กำลังยืม, คืนแล้ว)
  expectedReturnDate: string; // กำหนดวันคืน
  returnDate?: string; // วันเวลาที่รับคืน
  receiverName?: string; // ผู้รับคืน
  returnNote?: string; // สภาพอุปกรณ์/หมายเหตุการรับคืน
}

export type InspectionResultStatus = 'pass' | 'fail' | 'none';

export interface MonthlyCheckMonthData {
  itemResults: Record<number, InspectionResultStatus>; // itemIndex (1-7) -> 'pass' | 'fail' | 'none'
  issuesNote?: string;
  technicianName?: string;
  technicianDate?: string;
  // ข้อมูลสำหรับผู้ตรวจสอบซ้ำ (Re-inspector / Engineer / Checker)
  engineerName?: string;
  reInspectedDate?: string;
  reInspectionStatus?: 'verified' | 'needs_correction' | 'pending';
  reInspectionNote?: string;
  // ผู้อนุมัติ (Manager)
  managerName?: string;
  managerDate?: string;
  checkedDate?: string;
  isSpareSwapped?: boolean; // ระบุว่ามีการนำเครื่อง Spare มาสับเปลี่ยนหรือไม่
}

export interface InspectionCheckItem {
  id: number;
  title: string;
  subDetail?: string;
  hasVisualGuide?: boolean;
}

export interface InspectionFormTemplate {
  id: string; // e.g. 'manual_strapping_no_seal', 'nail_gun', 'pneumatic_strapping_plastic', 'strapping_with_seal'
  title: string;
  shortName: string;
  category: string;
  iconName?: string;
  description: string;
  standardsNote?: string;
  imageUrl?: string;
  checkItems: InspectionCheckItem[];
  matchingKeywords: string[];
}

export interface EquipmentMonthlyInspectionRecord {
  id: string; // e.g. "INSP-EQ001-2026"
  equipmentId: string;
  equipmentName: string;
  assetCode?: string;
  serialNo?: string;
  equipmentType?: string; // e.g. 'เครื่องแพ็คสายรัดพลาสติก'
  formId?: string; // e.g. 'strapping_machine'
  formTitle?: string;
  year: number; // e.g. 2026
  months: Record<number, MonthlyCheckMonthData>; // 1 to 12
  lastUpdated?: string;
}
