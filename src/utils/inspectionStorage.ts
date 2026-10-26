import { EquipmentMonthlyInspectionRecord, MonthlyCheckMonthData, InspectionResultStatus } from '../types';
import { getAccessToken } from './auth';
import { savePMInspectionRecordToSheet } from './sheets';

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

export const MANUAL_STRAPPING_NO_SEAL_CHECK_ITEMS: InspectionCheckItem[] = [
  {
    id: 1,
    title: '1 ตรวจสอบสภาพเครื่องแพ็คโดยรวม ว่ามีชิ้นส่วนไหนชำรุดหรือผิดปกติหรือไม่',
    subDetail: 'ตรวจดูโครงสร้างภายนอก คันโยก น็อตยึด และตัวกัดสายรัด'
  },
  {
    id: 2,
    title: '2. ทำความสะอาดชุดล้อดึงสายรัด โดยใช้แปรงทองเหลืองขัดและใช้ลมเป่าออก (สวมแว่นตาทุกครั้งที่ใช้ลมเป่าเศษ)',
    subDetail: 'กำจัดฝุ่นพลาสติกและคราบผงที่ติดร่องฟันล้อดึง'
  },
  {
    id: 3,
    title: '3. ตรวจสอบคันโยกว่าอยู่ในระดับที่ตัดสายรัดได้ขาดพอดี โดยการทดลองรัดสายแพ็ค',
    subDetail: 'ทดสอบตัดสายแพ็ค คันโยกต้องตัดขาดพอดี ไม่ลึกหรือหย่อนไป'
  },
  {
    id: 4,
    title: '4. ตรวจสอบระดับของตัวกัดสายรัด โดยการทดลองรัดสายแพ็ค',
    subDetail: 'ตัวกัดสายรัดต้องยึดสายตึงแน่น ไม่รูดไถล'
  },
  {
    id: 5,
    title: '5. ตรวจสอบระดับของล้อดึงสายรัดว่าเหมาะสมหรือไม่ โดยการทดลองรัดสายแล้วดูที่ผิวสายรัด',
    subDetail: 'ผิวสายรัดไม่ฉีกขาดหรือเป็นขุยรุนแรง (ดูคู่มือไดอะแกรมระดับการตัด)'
  }
];

export const NAIL_GUN_CHECK_ITEMS: InspectionCheckItem[] = [
  {
    id: 1,
    title: '1 ตรวจสอบสภาพเครื่องโดยรวม ว่ามีชิ้นส่วนไหนชำรุดหรือผิดปกติหรือไม่',
    subDetail: 'ตรวจโครงสร้างภายนอก น็อตยึดฝาครอบ และตัวเครื่อง'
  },
  {
    id: 2,
    title: '2. ตรวจสอบลูกยางภายใน Bumber A และ Bumber B ว่าแตกหรือสึกหรอหรือไม่',
    subDetail: 'ตรวจสภาพความยืดหยุ่นของลูกยาง Bumber ไม่แตกร้าว'
  },
  {
    id: 3,
    title: '3. ทำความสะอาดภายในกระบอกสูบและตรวจสอบ Seal ภายในกระบอกสูบว่าเสื่อมสภาพหรือไม่',
    subDetail: 'เช็ดทำความสะอาดกระบอกสูบและตรวจซีลยาง O-Ring กันลม'
  },
  {
    id: 4,
    title: '4. ตรวจสอบชุด Drive Unit (ก้านดันตะปู) ว่าหน้าตัดสึกหรอหรือไม่',
    subDetail: 'ก้านดันตะปูต้องเรียบตรง หน้าตัดไม่บิ่นหรือสึกหรอ'
  },
  {
    id: 5,
    title: '5. ทำความสะอาดภายนอก',
    subDetail: 'เช็ดคราบฝุ่น คราบน้ำมัน และสิ่งสกปรกรอบตัวเครื่อง'
  },
  {
    id: 6,
    title: '6. หยอดน้ำมันสำหรับเครื่องมือลม ที่ช่องเสียบสายลมท้ายเครื่อง 2-3 หยด และกดยิงให้น้ำมัน หล่อลื่นระบบก่อนนำไปใช้งานใหม่',
    subDetail: 'ใช้น้ำมันหล่อลื่นเครื่องมือลม (Air Tool Oil) เท่านั้น'
  }
];

export const PNEUMATIC_STRAPPING_PLASTIC_CHECK_ITEMS: InspectionCheckItem[] = [
  {
    id: 1,
    title: '1 ตรวจสอบสภาพเครื่องแพ็คโดยรวม ว่ามีชิ้นส่วนไหนชำรุดหรือผิดปกติหรือไม่',
    subDetail: 'ตรวจโครงสร้างภายนอก ปลอกยาง น็อตยึด คันโยกกด และสายลม'
  },
  {
    id: 2,
    title: '2. ทำความสะอาดชุดล้อดึงสายรัด โดยใช้แปรงทองเหลืองขัดและใช้ลมเป่าออก (สวมแว่นตาทุกครั้งที่ใช้ลมเป่าเศษ)',
    subDetail: 'กำจัดฝุ่นพลาสติกและคราบผงที่ติดร่องฟันล้อดึง'
  },
  {
    id: 3,
    title: '3. ตรวจสอบความตึงของการรัด โดยการทดลองรัดสายแพ็คและทดลองปรับแรงดันลมที่เครื่องให้เหมาะสม',
    subDetail: 'ทดลองรัดชิ้นงานจริง แรงดึงต้องแน่นหนาพอดี ไม่หย่อน และไม่รัดแน่นจนชิ้นงานเสียหาย'
  },
  {
    id: 4,
    title: '4. ตรวจสอบแรงกดการเชื่อมสายแพ็ค โดยการทดลองรัดสายแพ็คและดูความสมบูรณ์ของรอยต่อ',
    subDetail: 'ตรวจดูรอยหลอมละลายเชื่อมประสานให้เรียบแน่นสม่ำเสมอตามเกณฑ์รูปภาพ',
    hasVisualGuide: true
  },
  {
    id: 5,
    title: '5. ตรวจสอบระดับของล้อดึงสายรัดว่าเหมาะสมหรือไม่ โดยการทดลองรัดสายแล้วดูที่ผิวสายรัด',
    subDetail: 'ฟันล้อดึงต้องไม่กินเนื้อสายรัดจนเป็นขุยหรือฉีกขาด'
  },
  {
    id: 6,
    title: '6. ถ่ายน้ำออกจากตัวกรองน้ำมันให้หมดทุกครั้งที่ตรวจเช็คเครื่องมือประจำเดือน',
    subDetail: 'กดวาล์วเดรนน้ำใต้ถ้วยดักน้ำและกรองลมเพื่อป้องกันน้ำเข้าไปสร้างสนิม'
  },
  {
    id: 7,
    title: '7. หยอดน้ำมันสำหรับเครื่องมือลม ที่ช่องเสียบสายลมท้ายเครื่อง 2-3 หยด และกดยิงให้น้ำมัน หล่อลื่นระบบก่อนนำไปใช้งานใหม่',
    subDetail: 'ใช้น้ำมันหล่อลื่นสำหรับเครื่องมือลม (Air Tool Oil) ห้ามใช้น้ำมันเครื่องทั่วไป'
  }
];

export const STRAPPING_MACHINE_CHECK_ITEMS = PNEUMATIC_STRAPPING_PLASTIC_CHECK_ITEMS;

export const STRAPPING_WITH_SEAL_CHECK_ITEMS: InspectionCheckItem[] = [
  {
    id: 1,
    title: '1 ตรวจสอบสภาพเครื่องแพ็คโดยรวม ว่ามีชิ้นส่วนไหนชำรุดหรือผิดปกติหรือไม่',
    subDetail: 'ตรวจดูตัวอัดสายแพ็ค ตัวตัดปลอกแพ็ค หรือเครื่องแพ็คแบบกิ๊บอุดในตัว'
  },
  {
    id: 2,
    title: '2. ทำความสะอาดชุดล้อดึงสายรัด โดยใช้แปรงทองเหลืองขัดและใช้ลมเป่าออก (สวมแว่นตาทุกครั้งที่ใช้ลมเป่าเศษ)',
    subDetail: 'กำจัดผงพลาสติกและคราบเศษกิ๊บเหล็กสะสม'
  },
  {
    id: 3,
    title: '3. ตรวจสอบความสมบูรณ์ของรอยกิ๊ฟที่กิ๊บเหล็ก โดยทำการทดลองรัดสายแพ็ค ดูว่าตัวกิ๊ฟได้กิ๊ฟทั้งกิ๊บและสายแพ็คเข้าด้วยกัน',
    subDetail: 'ตรวจรอยย้ำกิ๊บ 1 เขี้ยว หรือ 2 เขี้ยว รอยย้ำแน่นสมบูรณ์ไม่หลุดแยก'
  },
  {
    id: 4,
    title: '4. ตรวจสอบระดับของตัวกัดสายรัด โดยการทดลองรัดสายแพ็ค สอบดูว่าตัวกิ๊ฟแน่นดีหรือไม่',
    subDetail: 'ตัวกัดสายรัดและตัวย้ำกิ๊บแน่นหนาดี ไม่หลวมไถล'
  },
  {
    id: 5,
    title: '5. ตรวจสอบระดับของล้อดึงสายรัดว่าเหมาะสมหรือไม่ โดยการทดลองรัดสายแล้วดูที่ผิวสายรัด',
    subDetail: 'ฟันล้อดึงกดลงผิวสายรัดพอเหมาะ ไม่ฉีกขาด'
  },
  {
    id: 6,
    title: '6. ถ่ายน้ำออกจากตัวกรองน้ำมันให้หมดทุกครั้งที่ตรวจเช็คเครื่องมือประจำเดือน',
    subDetail: 'เดรนน้ำออกจากตัวกรองลมดักน้ำให้หมด'
  },
  {
    id: 7,
    title: '7. หยอดน้ำมันสำหรับเครื่องมือลม ที่ช่องเสียบสายลมท้ายเครื่อง 2-3 หยด และกดยิงให้น้ำมัน หล่อลื่นระบบก่อนนำไปใช้งานใหม่',
    subDetail: 'หยอดน้ำมันหล่อลื่นสำหรับเครื่องมือลมก่อนใช้งาน'
  }
];

export const DEFAULT_INSPECTION_FORM_TEMPLATES: InspectionFormTemplate[] = [
  {
    id: 'manual_strapping_no_seal',
    title: 'แบบบันทึกการตรวจสอบเครื่องมือแพ็ค แบบไม่ใช้กิ๊บ',
    shortName: 'เครื่องแพ็คแบบไม่ใช้กิ๊บ',
    category: 'เครื่องแพ็คแบบไม่ใช้กิ๊บแบบใช้มือโยก',
    iconName: 'Wrench',
    description: 'ตรวจเช็คสภาพเครื่อง ล้อดึง คันโยกตัดสาย ตัวกัดสายรัด และระดับล้อดึง 5 รายการ',
    standardsNote: 'ปรับตั้งระดับการตัดให้ขาดพอดี ไม่ตัดลึกเกินไปถึงสายด้านล่าง',
    imageUrl: '/assets/aistudio/_____________________5aaf67c4.jpg',
    checkItems: MANUAL_STRAPPING_NO_SEAL_CHECK_ITEMS,
    matchingKeywords: ['ไม่ใช้กิ๊บ', 'มือโยก', 'manual', 'no seal', 'no_seal', 'แพ็คแบบไม่ใช้กิ๊บ']
  },
  {
    id: 'nail_gun',
    title: 'แบบบันทึกการตรวจสอบเครื่องยิงตะปู',
    shortName: 'เครื่องยิงตะปู',
    category: 'เครื่องยิงตะปูลม "BEX38/100"',
    iconName: 'Cpu',
    description: 'ตรวจเช็คลูกยาง Bumber A/B, กระบอกสูบ/ซีล, ชุด Drive Unit ก้านดันตะปู และการหยอดน้ำมัน 6 รายการ',
    standardsNote: 'ตรวจลูกยาง Bumber ไม่แตกร้าว ก้านดันตะปูไม่บิ่น และหยอดน้ำมันแอร์ทูล 2-3 หยด',
    imageUrl: '/assets/aistudio/___________100_mm_e3af2879.jpg',
    checkItems: NAIL_GUN_CHECK_ITEMS,
    matchingKeywords: ['ตะปู', 'ยิงตะปู', 'bex38', 'bex', 'nail', 'gun', 'nailgun', 'ปืนยิงตะปู']
  },
  {
    id: 'pneumatic_strapping_plastic',
    title: 'แบบบันทึกการตรวจสอบเครื่องมือแพ็คสายแพ็คพลาสติก',
    shortName: 'เครื่องแพ็คสายแพ็คพลาสติก',
    category: 'เครื่องแพ็คสายพลาสติก',
    iconName: 'PackageCheck',
    description: 'ตรวจเช็คล้อดึง ความตึง แรงกดรอยเชื่อมความร้อน ระดับล้อดึง ถ่ายน้ำกรองลม และหยอดน้ำมัน 7 รายการ',
    standardsNote: 'ตรวจรอยเชื่อม friction weld ไม่ละลายมากหรือน้อยเกินไป ถ่ายน้ำกรองลม และหยอดน้ำมัน 2-3 หยด',
    imageUrl: '/assets/aistudio/_________________________802817e6.jpg',
    checkItems: PNEUMATIC_STRAPPING_PLASTIC_CHECK_ITEMS,
    matchingKeywords: ['สายพลาสติก', 'แพ็คพลาสติก', 'สายแพ็ค', 'strapping', 'พลาสติก', 'เครื่องแพ็คสาย']
  },
  {
    id: 'strapping_with_seal',
    title: 'แบบบันทึกการตรวจสอบเครื่องมือแพ็ค แบบใช้กิ๊บ',
    shortName: 'เครื่องแพ็คแบบใช้กิ๊บ',
    category: 'เครื่องแพ็คแบบใช้กิ๊บเหล็ก (ตัวอัด/ตัวกัด/กิ๊บอุดในตัว)',
    iconName: 'Box',
    description: 'ตรวจเช็คสภาพเครื่อง ล้อดึง รอยย้ำกิ๊บเหล็ก (1 หรือ 2 เขี้ยว) ตัวกัดสายรัด ถ่ายน้ำ และหยอดน้ำมัน 7 รายการ',
    standardsNote: 'ตรวจความสมบูรณ์ของรอยย้ำกิ๊บเหล็กทั้ง 1 เขี้ยวและ 2 เขี้ยวให้ยึดแน่นสมบูรณ์',
    imageUrl: '/assets/aistudio/_______________Combine_75838970.jpg',
    checkItems: STRAPPING_WITH_SEAL_CHECK_ITEMS,
    matchingKeywords: ['ใช้กิ๊บ', 'กิ๊บเหล็ก', 'กิ๊บ', 'seal', 'with seal', 'ตัวอัดสายแพ็ค', 'ตัวกัดปลอกแพ็ค']
  }
];

export const INSPECTION_FORM_TEMPLATES: InspectionFormTemplate[] = DEFAULT_INSPECTION_FORM_TEMPLATES;

const CUSTOM_TEMPLATES_KEY = 'custom_inspection_forms_v1';

/**
 * Load all active form templates (custom from localStorage if available, or 4 defaults)
 */
export function loadFormTemplates(): InspectionFormTemplate[] {
  try {
    const raw = localStorage.getItem(CUSTOM_TEMPLATES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load custom form templates:', e);
  }
  return DEFAULT_INSPECTION_FORM_TEMPLATES;
}

/**
 * Save customized form templates to localStorage
 */
export function saveFormTemplates(templates: InspectionFormTemplate[]): void {
  try {
    localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(templates));
  } catch (e) {
    console.error('Failed to save custom form templates:', e);
  }
}

/**
 * Update a specific form template (title, checkItems, etc.)
 */
export function updateFormTemplate(
  templateId: string, 
  updated: Partial<InspectionFormTemplate>
): InspectionFormTemplate[] {
  const current = loadFormTemplates();
  const idx = current.findIndex(t => t.id === templateId);
  if (idx !== -1) {
    current[idx] = { ...current[idx], ...updated };
    saveFormTemplates(current);
  }
  return current;
}

/**
 * Reset form templates to factory 4 defaults
 */
export function resetFormTemplatesToDefault(): InspectionFormTemplate[] {
  try {
    localStorage.removeItem(CUSTOM_TEMPLATES_KEY);
  } catch (e) {
    console.error('Failed to reset form templates:', e);
  }
  return DEFAULT_INSPECTION_FORM_TEMPLATES;
}

export const MONTH_NAMES_TH = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

export const MONTH_FULL_NAMES_TH = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

/**
 * Get form template by ID (with fallback to strapping machine)
 */
export function getFormTemplateById(formId?: string): InspectionFormTemplate {
  const templates = loadFormTemplates();
  if (!formId) return templates[0];
  const found = templates.find(f => f.id === formId);
  return found || templates[0];
}

/**
 * Auto-suggest the most appropriate form template based on equipment name/category
 */
export function suggestFormForEquipment(equipment?: { id?: string; name?: string; assetCode?: string; location?: string; category?: string } | null): InspectionFormTemplate {
  const templates = loadFormTemplates();
  if (!equipment) return templates[0];
  
  const text = `${equipment.name || ''} ${equipment.category || ''} ${equipment.location || ''} ${equipment.assetCode || ''} ${equipment.id || ''}`.toLowerCase();

  for (const template of templates) {
    if (template.matchingKeywords.some(kw => text.includes(kw.toLowerCase()))) {
      return template;
    }
  }

  return templates[0];
}

const ASSIGNED_FORMS_KEY = 'equipment_assigned_forms_v1';

/**
 * Get saved form assignment for an equipment
 */
export function getEquipmentAssignedFormId(equipmentId: string, fallbackEquipment?: { id?: string; name?: string; assetCode?: string; location?: string; category?: string }): string {
  try {
    const raw = localStorage.getItem(ASSIGNED_FORMS_KEY);
    if (raw) {
      const map = JSON.parse(raw);
      const cleanId = String(equipmentId || '').trim();
      if (map[cleanId]) return map[cleanId];
      if (map[cleanId.toLowerCase()]) return map[cleanId.toLowerCase()];
    }
  } catch (e) {
    console.error('Failed to load assigned forms:', e);
  }
  return suggestFormForEquipment(fallbackEquipment).id;
}

/**
 * Save form assignment for an equipment
 */
export function setEquipmentAssignedFormId(equipmentId: string, formId: string): void {
  try {
    const raw = localStorage.getItem(ASSIGNED_FORMS_KEY);
    const map = raw ? JSON.parse(raw) : {};
    const cleanId = String(equipmentId || '').trim();
    map[cleanId] = formId;
    localStorage.setItem(ASSIGNED_FORMS_KEY, JSON.stringify(map));
  } catch (e) {
    console.error('Failed to save assigned form:', e);
  }
}

// Helper function to check if equipment is a plastic strapping machine
export function isStrappingMachine(equipment?: { id?: string; name?: string; assetCode?: string; location?: string; category?: string } | null): boolean {
  if (!equipment) return false;
  const str = `${equipment.name || ''} ${equipment.assetCode || ''} ${equipment.location || ''} ${equipment.id || ''} ${equipment.category || ''}`.toLowerCase();
  return (
    str.includes('สายรัด') ||
    str.includes('แพ็คสาย') ||
    str.includes('รัดพลาสติก') ||
    str.includes('strapping') ||
    str.includes('strapp') ||
    str.includes('เครื่องแพ็ค') ||
    str.includes('ast-pack') ||
    str.includes('pack-') ||
    equipment.id === 'EQ-001'
  );
}

const STORAGE_KEY = 'equipment_monthly_inspections_v1';

// Seed default inspection data for demo/existing equipments
export function getInitialInspectionRecords(): EquipmentMonthlyInspectionRecord[] {
  const currentYear = new Date().getFullYear();
  return [
    {
      id: `INSP-EQ-001-${currentYear}`,
      equipmentId: 'EQ-001',
      equipmentName: 'เครื่องแพ็คสายพลาสติกอัตโนมัติ M1',
      assetCode: 'AST-PACK-001',
      serialNo: 'AST-PACK-001',
      equipmentType: 'เครื่องแพ็คสายรัดพลาสติก',
      formId: 'pneumatic_strapping_plastic',
      formTitle: 'แบบบันทึกการตรวจสอบเครื่องมือแพ็คสายแพ็คพลาสติก',
      year: currentYear,
      lastUpdated: new Date().toISOString(),
      months: {
        1: {
          itemResults: { 1: 'pass', 2: 'pass', 3: 'pass', 4: 'pass', 5: 'pass', 6: 'pass', 7: 'pass' },
          issuesNote: 'สภาพสมบูรณ์ พร้อมใช้งาน',
          technicianName: 'วิโรจน์',
          technicianDate: `${currentYear}-01-15`,
          engineerName: 'กู้เกียรติ',
          reInspectedDate: `${currentYear}-01-16`,
          reInspectionStatus: 'verified',
          reInspectionNote: 'สุ่มทดสอบรอยเชื่อมและแรงดันลมแล้ว แน่นหนาได้มาตรฐาน',
          managerName: 'ชมภู่',
          checkedDate: `${currentYear}-01-15`
        },
        2: {
          itemResults: { 1: 'pass', 2: 'pass', 3: 'pass', 4: 'pass', 5: 'pass', 6: 'pass', 7: 'pass' },
          issuesNote: 'เป่าเศษฝุ่นสายรัดสะอาดเรียบร้อย',
          technicianName: 'วิโรจน์',
          technicianDate: `${currentYear}-02-14`,
          engineerName: 'กู้เกียรติ',
          reInspectedDate: `${currentYear}-02-15`,
          reInspectionStatus: 'verified',
          reInspectionNote: 'ตรวจซ้ำการเป่าทำความสะอาดล้อดึง สะอาดเรียบร้อย',
          managerName: 'ชมภู่',
          checkedDate: `${currentYear}-02-14`
        },
        3: {
          itemResults: { 1: 'pass', 2: 'pass', 3: 'pass', 4: 'pass', 5: 'pass', 6: 'pass', 7: 'pass' },
          issuesNote: 'ปกติทุกรายการ',
          technicianName: 'วิโรจน์',
          technicianDate: `${currentYear}-03-16`,
          engineerName: 'กู้เกียรติ',
          reInspectedDate: `${currentYear}-03-17`,
          reInspectionStatus: 'verified',
          reInspectionNote: 'ตรวจซ้ำการทำงานของฟันล้อดึง ไม่กินเนื้อสายรัด',
          managerName: 'ชมภู่',
          checkedDate: `${currentYear}-03-16`
        },
        4: {
          itemResults: { 1: 'pass', 2: 'pass', 3: 'pass', 4: 'pass', 5: 'pass', 6: 'pass', 7: 'pass' },
          issuesNote: 'ปกติ ถ่ายน้ำกรองลมเรียบร้อย',
          technicianName: 'วิโรจน์',
          technicianDate: `${currentYear}-04-18`,
          engineerName: 'กู้เกียรติ',
          reInspectedDate: `${currentYear}-04-18`,
          reInspectionStatus: 'verified',
          reInspectionNote: 'ตรวจถ้วยดักน้ำกรองลม ถ่ายน้ำออกหมดจด',
          managerName: 'ชมภู่',
          checkedDate: `${currentYear}-04-18`
        },
        5: {
          itemResults: { 1: 'pass', 2: 'pass', 3: 'pass', 4: 'pass', 5: 'pass', 6: 'pass', 7: 'pass' },
          issuesNote: 'ปกติ รอยเชื่อมแน่นหนาดี',
          technicianName: 'วิโรจน์',
          technicianDate: `${currentYear}-05-15`,
          engineerName: 'กู้เกียรติ',
          reInspectedDate: `${currentYear}-05-16`,
          reInspectionStatus: 'verified',
          reInspectionNote: 'สุ่มเช็คแนวเชื่อมความร้อน สม่ำเสมอ ไม่ไหม้',
          managerName: 'ชมภู่',
          checkedDate: `${currentYear}-05-15`
        },
        6: {
          itemResults: { 1: 'pass', 2: 'pass', 3: 'fail', 4: 'fail', 5: 'pass', 6: 'pass', 7: 'pass' },
          issuesNote: 'แรงดันลมตก รอยเชื่อมไม่ติด นำเครื่อง Spare มาใช้งานแทนแล้วส่งซ่อมปรับแรงดันลม',
          technicianName: 'วิโรจน์',
          technicianDate: `${currentYear}-06-20`,
          engineerName: 'กู้เกียรติ',
          reInspectedDate: `${currentYear}-06-20`,
          reInspectionStatus: 'verified',
          reInspectionNote: 'ยืนยันเครื่องมีปัญหาแรงดันลม ได้กำกับดูแลให้นำเครื่องสำรอง SP-01 มาใช้แทน และเปิดใบแจ้งซ่อมแล้ว',
          managerName: 'ชมภู่',
          checkedDate: `${currentYear}-06-20`,
          isSpareSwapped: true
        },
        7: {
          itemResults: { 1: 'pass', 2: 'pass', 3: 'pass', 4: 'pass', 5: 'pass', 6: 'pass', 7: 'pass' },
          issuesNote: 'ซ่อมปรับแต่งชุดฟีดลมเสร็จแล้ว ใช้งานได้ปกติ',
          technicianName: 'วิโรจน์',
          technicianDate: `${currentYear}-07-15`,
          engineerName: 'กู้เกียรติ',
          reInspectedDate: `${currentYear}-07-16`,
          reInspectionStatus: 'verified',
          reInspectionNote: 'ตรวจรับเครื่องกลับจากงานซ่อม ทดลองรัด 10 ครั้ง แน่นหนาทุกรอบ',
          managerName: 'ชมภู่',
          checkedDate: `${currentYear}-07-15`
        },
        8: {
          itemResults: { 1: 'pass', 2: 'pass', 3: 'pass', 4: 'pass', 5: 'pass', 6: 'pass', 7: 'pass' },
          issuesNote: 'ปกติ หยอดน้ำมันเครื่องมือลมแล้ว',
          technicianName: 'วิโรจน์',
          technicianDate: `${currentYear}-08-16`,
          engineerName: 'กู้เกียรติ',
          reInspectedDate: `${currentYear}-08-17`,
          reInspectionStatus: 'verified',
          reInspectionNote: 'ตรวจซ้ำการหยอดน้ำมันแอร์ทูล เสียงมอเตอร์ลมเดินเรียบดี',
          managerName: 'ชมภู่',
          checkedDate: `${currentYear}-08-16`
        },
        9: {
          itemResults: { 1: 'pass', 2: 'pass', 3: 'pass', 4: 'pass', 5: 'pass', 6: 'pass', 7: 'pass' },
          issuesNote: 'ปกติทุกระบบ',
          technicianName: 'วิโรจน์',
          technicianDate: `${currentYear}-09-15`,
          engineerName: 'กู้เกียรติ',
          reInspectedDate: `${currentYear}-09-16`,
          reInspectionStatus: 'verified',
          reInspectionNote: 'ผลตรวจผ่านเกณฑ์มาตรฐานทั้งหมด',
          managerName: 'ชมภู่',
          checkedDate: `${currentYear}-09-15`
        },
        10: {
          itemResults: { 1: 'pass', 2: 'pass', 3: 'pass', 4: 'pass', 5: 'pass', 6: 'pass', 7: 'pass' },
          issuesNote: 'ตรวจเช็คประจำเดือนตุลาคม ปกติ',
          technicianName: 'วิโรจน์',
          engineerName: 'กู้เกียรติ',
          managerName: 'ชมภู่',
          checkedDate: `${currentYear}-10-15`
        }
      }
    }
  ];
}

/**
 * Load all inspection records from localStorage (with fallback seed)
 */
export function loadInspectionRecords(): EquipmentMonthlyInspectionRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getInitialInspectionRecords();
      saveInspectionRecords(initial);
      return initial;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load inspection records:', e);
    return getInitialInspectionRecords();
  }
}

/**
 * Save all inspection records to localStorage and sync to Google Sheets if connected
 */
export function saveInspectionRecords(records: EquipmentMonthlyInspectionRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('inspection-records-updated'));
    }

    // Background sync to Google Sheets if user is logged in with spreadsheet ID
    const token = getAccessToken();
    const spreadsheetId = localStorage.getItem('spare_part_spreadsheet_id');
    if (token && spreadsheetId) {
      records.forEach(r => {
        savePMInspectionRecordToSheet(token, spreadsheetId, r).catch(err => {
          console.warn('Background sync PM record error:', err);
        });
      });
    }
  } catch (e) {
    console.error('Failed to save inspection records:', e);
  }
}

/**
 * Merge remote inspection records from Google Sheets into local storage
 */
export function mergeRemoteInspectionRecords(remoteRecords: EquipmentMonthlyInspectionRecord[]): EquipmentMonthlyInspectionRecord[] {
  if (!remoteRecords || remoteRecords.length === 0) return loadInspectionRecords();
  
  const local = loadInspectionRecords();
  const map = new Map<string, EquipmentMonthlyInspectionRecord>();

  local.forEach(r => {
    const key = `${String(r.equipmentId || '').trim().toLowerCase()}_${r.year}`;
    map.set(key, r);
  });

  remoteRecords.forEach(remote => {
    const key = `${String(remote.equipmentId || '').trim().toLowerCase()}_${remote.year}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, remote);
    } else {
      // Merge month data
      const mergedMonths = { ...existing.months, ...(remote.months || {}) };
      map.set(key, {
        ...existing,
        ...remote,
        months: mergedMonths,
        lastUpdated: new Date().toISOString()
      });
    }
  });

  const mergedList = Array.from(map.values());
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedList));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('inspection-records-updated'));
    }
  } catch (e) {
    console.error('Failed to save merged records:', e);
  }
  return mergedList;
}

/**
 * Get or create record for a specific equipment and year
 */
export function getOrCreateEquipmentInspection(
  equipmentId: string,
  equipmentName: string,
  assetCode?: string,
  year: number = new Date().getFullYear(),
  equipmentType?: string,
  formId?: string
): EquipmentMonthlyInspectionRecord {
  const all = loadInspectionRecords();
  const cleanId = String(equipmentId || '').trim().toLowerCase();
  const targetYear = Number(year);

  const existing = all.find(r => 
    String(r.equipmentId || '').trim().toLowerCase() === cleanId && 
    Number(r.year) === targetYear
  );
  
  const assignedFormId = formId || getEquipmentAssignedFormId(equipmentId);
  const formTemplate = getFormTemplateById(assignedFormId);

  if (existing) {
    if (!existing.formId) {
      existing.formId = assignedFormId;
      existing.formTitle = formTemplate.title;
      saveInspectionRecords(all);
    }
    return existing;
  }

  const newRecord: EquipmentMonthlyInspectionRecord = {
    id: `INSP-${equipmentId}-${year}`,
    equipmentId,
    equipmentName,
    assetCode: assetCode || equipmentId,
    serialNo: assetCode || equipmentId,
    equipmentType: equipmentType || formTemplate.shortName,
    formId: assignedFormId,
    formTitle: formTemplate.title,
    year,
    months: {},
    lastUpdated: new Date().toISOString()
  };

  const updatedAll = [...all, newRecord];
  saveInspectionRecords(updatedAll);
  return newRecord;
}

/**
 * Update single month check result for an equipment
 */
export function updateMonthCheckData(
  equipmentId: string,
  year: number,
  month: number,
  monthData: MonthlyCheckMonthData,
  equipmentName?: string,
  assetCode?: string,
  formId?: string
): EquipmentMonthlyInspectionRecord {
  const all = loadInspectionRecords();
  const cleanId = String(equipmentId || '').trim().toLowerCase();
  const targetYear = Number(year);

  let recordIndex = all.findIndex(r => 
    String(r.equipmentId || '').trim().toLowerCase() === cleanId && 
    Number(r.year) === targetYear
  );

  const assignedFormId = formId || getEquipmentAssignedFormId(equipmentId);
  const formTemplate = getFormTemplateById(assignedFormId);

  let targetRecord: EquipmentMonthlyInspectionRecord;
  if (recordIndex === -1) {
    targetRecord = {
      id: `INSP-${equipmentId}-${year}`,
      equipmentId,
      equipmentName: equipmentName || equipmentId,
      assetCode: assetCode || equipmentId,
      serialNo: assetCode || equipmentId,
      equipmentType: formTemplate.shortName,
      formId: assignedFormId,
      formTitle: formTemplate.title,
      year,
      months: { [month]: monthData },
      lastUpdated: new Date().toISOString()
    };
    all.push(targetRecord);
  } else {
    targetRecord = {
      ...all[recordIndex],
      formId: all[recordIndex].formId || assignedFormId,
      formTitle: all[recordIndex].formTitle || formTemplate.title,
      months: {
        ...all[recordIndex].months,
        [month]: monthData
      },
      lastUpdated: new Date().toISOString()
    };
    all[recordIndex] = targetRecord;
  }

  saveInspectionRecords(all);
  return targetRecord;
}

/**
 * Change the form template assigned to an inspection record
 */
export function changeRecordFormTemplate(equipmentId: string, year: number, newFormId: string): EquipmentMonthlyInspectionRecord | null {
  const all = loadInspectionRecords();
  const cleanId = String(equipmentId || '').trim().toLowerCase();
  const targetYear = Number(year);

  const index = all.findIndex(r => 
    String(r.equipmentId || '').trim().toLowerCase() === cleanId && 
    Number(r.year) === targetYear
  );

  const formTemplate = getFormTemplateById(newFormId);
  setEquipmentAssignedFormId(equipmentId, newFormId);

  if (index !== -1) {
    all[index] = {
      ...all[index],
      formId: newFormId,
      formTitle: formTemplate.title,
      equipmentType: formTemplate.shortName,
      lastUpdated: new Date().toISOString()
    };
    saveInspectionRecords(all);
    return all[index];
  }
  return null;
}

/**
 * Quick toggle an item in a month: 'none' -> 'pass' -> 'fail' -> 'none'
 */
export function toggleInspectionItemStatus(
  currentStatus: InspectionResultStatus | undefined
): InspectionResultStatus {
  if (!currentStatus || currentStatus === 'none') return 'pass';
  if (currentStatus === 'pass') return 'fail';
  return 'none';
}

/**
 * Check if a month has any failure
 */
export function doesMonthHaveFailure(monthData?: MonthlyCheckMonthData): boolean {
  if (!monthData || !monthData.itemResults) return false;
  return Object.values(monthData.itemResults).some(status => status === 'fail');
}

/**
 * Export annual inspection data as CSV format
 */
export function exportInspectionToCsv(record: EquipmentMonthlyInspectionRecord): void {
  const template = getFormTemplateById(record.formId);
  const checkItems = template.checkItems;

  const headers = ['ลำดับ', 'รายการตรวจสอบ', ...MONTH_NAMES_TH, 'ปัญหาที่พบ / การดำเนินการ'];
  
  const rows = checkItems.map(item => {
    const monthVals = MONTH_NAMES_TH.map((_, idx) => {
      const monthNum = idx + 1;
      const mData = record.months[monthNum];
      const status = mData?.itemResults[item.id];
      if (status === 'pass') return '✓';
      if (status === 'fail') return '✕';
      return '-';
    });

    const issues = MONTH_NAMES_TH.map((mName, idx) => {
      const mData = record.months[idx + 1];
      return mData?.issuesNote ? `[${mName}] ${mData.issuesNote}` : null;
    }).filter(Boolean).join(' | ');

    return [
      item.id,
      `"${item.title.replace(/"/g, '""')}"`,
      ...monthVals,
      `"${issues.replace(/"/g, '""')}"`
    ];
  });

  // Add signature rows
  const techRow = ['-', '"ผู้ตรวจสอบ 1 : TECHNICIAN"', ...MONTH_NAMES_TH.map((_, i) => `"${record.months[i + 1]?.technicianName || '-'}"`), '""'];
  const engRow = ['-', '"ผู้ตรวจสอบ 2 (ตรวจสอบซ้ำ) : ENGINEER"', ...MONTH_NAMES_TH.map((_, i) => `"${record.months[i + 1]?.engineerName || '-'}"`), '""'];
  const mgrRow = ['-', '"ผู้อนุมัติ : MANAGER"', ...MONTH_NAMES_TH.map((_, i) => `"${record.months[i + 1]?.managerName || '-'}"`), '""'];

  const csvContent = '\uFEFF' + [
    `"${template.title} ประจำปี ${record.year}"`,
    `"เครื่อง: ${record.equipmentName} (${record.equipmentId})", "แบบฟอร์ม: ${template.title}", "Serial no.: ${record.serialNo || record.assetCode || record.equipmentId}"`,
    '',
    headers.join(','),
    ...rows.map(r => r.join(',')),
    '',
    techRow.join(','),
    engRow.join(','),
    mgrRow.join(',')
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `PM_${template.shortName}_${record.equipmentId}_${record.year}.csv`;
  link.click();
}

