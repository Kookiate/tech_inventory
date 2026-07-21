import { SparePart, Transaction, Equipment, MaintenanceLog } from '../types';

/**
 * ฟังก์ชันสร้างสเปรดชีต Google Sheet ใหม่ในบัญชีของผู้ใช้
 * พร้อมตั้งค่าชีต Inventory, Transactions, Equipment, และ MaintenanceLogs และป้อนข้อมูลตั้งต้น
 */
export async function createNewInventorySpreadsheet(accessToken: string, creatorEmail?: string): Promise<{ id: string; url: string }> {
  try {
    const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          title: 'ระบบฐานข้อมูลอะไหล่ - Spare Part Control Database ⚙️',
        },
        sheets: [
          {
            properties: {
              title: 'Inventory',
              gridProperties: { rowCount: 100, columnCount: 10 },
            },
          },
          {
            properties: {
              title: 'Transactions',
              gridProperties: { rowCount: 1000, columnCount: 10 },
            },
          },
          {
            properties: {
              title: 'Equipment',
              gridProperties: { rowCount: 100, columnCount: 10 },
            },
          },
          {
            properties: {
              title: 'MaintenanceLogs',
              gridProperties: { rowCount: 1000, columnCount: 12 },
            },
          },
          {
            properties: {
              title: 'AuthorizedUsers',
              gridProperties: { rowCount: 100, columnCount: 5 },
            },
          },
        ],
      }),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || 'ไม่สามารถสร้างสเปรดชีตได้');
    }

    const sheetData = await response.json();
    const spreadsheetId = sheetData.spreadsheetId;
    const spreadsheetUrl = sheetData.spreadsheetUrl;

    // เติมหัวตารางและข้อมูลตัวอย่างลงใน Inventory
    await populateDefaultInventory(accessToken, spreadsheetId);
    
    // เติมหัวตารางใน Transactions
    await populateDefaultTransactions(accessToken, spreadsheetId);

    // เติมข้อมูลตั้งต้นใน Equipment & MaintenanceLogs
    await populateDefaultEquipmentAndLogs(accessToken, spreadsheetId);

    // เติมสิทธิ์ผู้ใช้เริ่มต้น
    await populateDefaultAuthorizedUsers(accessToken, spreadsheetId, creatorEmail);

    return { id: spreadsheetId, url: spreadsheetUrl };
  } catch (error: any) {
    console.error('Error creating spreadsheet:', error);
    throw error;
  }
}

/**
 * ป้อนข้อมูลตั้งต้นลงชีต Inventory
 */
async function populateDefaultInventory(accessToken: string, spreadsheetId: string) {
  const headers = [
    ['รหัสอะไหล่', 'ชื่ออะไหล่', 'หมวดหมู่', 'ตำแหน่งจัดเก็บ', 'คงเหลือ', 'หน่วยนับ', 'Min_Stock', 'Max_Stock', 'ราคาต่อหน่วย', 'รูปภาพ']
  ];

  const defaultParts = [
    ['SP-001', 'ลูกสูบกระบอกลมไฮดรอลิก', 'เครื่องแพ็ค', 'Cabinet A-1', 15, 'ตัว', 5, 30, 450, 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=250'],
    ['SP-002', 'ฮีตเตอร์แท่งต้านทานความร้อน 220V', 'เครื่องแพ็ค', 'Cabinet A-3', 8, 'ชิ้น', 10, 50, 1200, 'https://images.unsplash.com/photo-1537462715879-360eeb61a0bc?w=250'], // Low stock!
    ['SP-003', 'ใบมีดตัดม้วนฟิล์มสแตนเลส', 'เครื่องแพ็ค', 'Shelf B-1', 12, 'ใบ', 4, 20, 350, 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=250'],
    ['SP-004', 'ลิ้นปืนลมยิงตะปู (ชุดกระแทก)', 'ปืนลมยิงตะปู', 'Cabinet B-2', 3, 'ตัว', 5, 15, 250, 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=250'], // Low stock!
    ['SP-005', 'โอริงซีลยางกันลมซึม (ชุดใหญ่)', 'ปืนลมยิงตะปู', 'Drawer C-1', 120, 'ชิ้น', 50, 300, 15, ''],
    ['SP-006', 'ข้อต่อลมทองเหลืองสวมเร็ว 8 มม.', 'อุปกรณ์ทั่วไป', 'Drawer C-3', 45, 'ตัว', 20, 100, 45, ''],
    ['SP-007', 'สายลมโพลียูรีเทนใส (โรล 100m)', 'อุปกรณ์ทั่วไป', 'Rack D-2', 2, 'ม้วน', 1, 5, 1800, ''],
    ['SP-008', 'สวิตช์ปุ่มกดฉุกเฉิน (E-Stop)', 'อุปกรณ์ทั่วไป', 'Cabinet E-1', 2, 'ตัว', 3, 10, 380, ''], // Low stock!
  ];

  const values = [...headers, ...defaultParts];

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Inventory!A1:J9?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values }),
  });
}

/**
 * ป้อนหัวตารางของชีต Transactions
 */
async function populateDefaultTransactions(accessToken: string, spreadsheetId: string) {
  const headers = [
    ['วันเวลา', 'รหัสอะไหล่', 'ชื่ออะไหล่', 'ประเภท', 'จำนวน', 'ชื่อช่าง', 'หมายเหตุ_เครื่องจักร']
  ];

  // เติมหัวตารางและประวัติตัวอย่าง 2-3 แถว
  const now = new Date();
  const timestampStr1 = new Date(now.getTime() - 24 * 60 * 60 * 1000).toLocaleString('th-TH');
  const timestampStr2 = new Date(now.getTime() - 12 * 60 * 60 * 1000).toLocaleString('th-TH');

  const defaultTXs = [
    [timestampStr1, 'SP-001', 'ลูกสูบกระบอกลมไฮดรอลิก', 'รับเข้า', 10, 'ช่างชัยชนะ', 'เติมคลังอะไหล่ปกติ'],
    [timestampStr2, 'SP-002', 'ฮีตเตอร์แท่งต้านทานความร้อน 220V', 'เบิกจ่าย', 2, 'ช่างศักดิ์ดา', 'ซ่อมเครื่องแพ็ค 03 แผนกบรรจุ']
  ];

  const values = [...headers, ...defaultTXs];

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Transactions!A1:G3?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values }),
  });
}

/**
 * ป้อนหัวตารางและข้อมูลตัวอย่างสำหรับ Equipment และ MaintenanceLogs
 */
async function populateDefaultEquipmentAndLogs(accessToken: string, spreadsheetId: string) {
  const eqHeaders = [['รหัสเครื่องจักร', 'ชื่อเครื่องจักร', 'ไลน์ผลิต/ตำแหน่ง', 'ราคาซื้อแรกเริ่ม', 'งบซ่อมสะสมสูงสุดที่รับได้', 'วันที่ซื้อ']];
  const defaultEq = [
    ['EQ-001', 'เครื่องแพ็คซองอัตโนมัติ Pack-01', 'แผนกบรรจุ ไลน์ 1', 120000, 45000, '12/05/2024'],
    ['EQ-002', 'เครื่องแพ็คกล่องบรรจุภัณฑ์ Carton-02', 'แผนกบรรจุ ไลน์ 2', 250000, 80000, '10/01/2025'],
    ['EQ-003', 'ปืนลมยิงตะปูอุตสาหกรรม NailGun-05', 'แผนกประกอบไม้', 4500, 2000, '20/11/2025']
  ];

  const logHeaders = [['วันเวลาที่ซ่อม', 'รหัสเครื่องจักร', 'ชื่อเครื่องจักร', 'รายละเอียดการซ่อม', 'รหัสอะไหล่ที่ใช้', 'จำนวนที่ใช้', 'มูลค่าอะไหล่', 'ค่าใช้จ่ายนอก/ค่าบริการ', 'รวมรวมทั้งหมด', 'ช่างผู้รับผิดชอบ']];
  const dateNow = new Date().toLocaleDateString('th-TH');
  const defaultLogs = [
    [dateNow, 'EQ-001', 'เครื่องแพ็คซองอัตโนมัติ Pack-01', 'เปลี่ยนกระบอกสูบที่สึกหรอ', 'SP-001', 1, 450, 500, 950, 'ช่างศักดิ์ดา'],
    [dateNow, 'EQ-002', 'เครื่องแพ็คกล่องบรรจุภัณฑ์ Carton-02', 'ซ่อมระบบฮีตเตอร์และใบมีดชำรุด', 'SP-002', 2, 2400, 1500, 3900, 'ช่างชัยชนะ']
  ];

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: [
        { range: 'Equipment!A1:F4', values: [...eqHeaders, ...defaultEq] },
        { range: 'MaintenanceLogs!A1:J3', values: [...logHeaders, ...defaultLogs] }
      ]
    })
  });
}

/**
 * ดึงข้อมูล Inventory จากสเปรดชีต
 */
export async function fetchInventoryData(accessToken: string, spreadsheetId: string): Promise<SparePart[]> {
  try {
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Inventory!A2:J1000`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const apiMsg = errData?.error?.message || '';
      
      if (response.status === 403 || apiMsg.includes('permission') || apiMsg.includes('Permission')) {
        throw new Error('สิทธิ์การเข้าถึงไม่เพียงพอ (Permission Denied): ตอนที่คุณล็อกอินด้วย Google คุณอาจจะไม่ได้ติ๊กเลือกกล่องเครื่องหมาย "ดู แก้ไข สร้าง และลบสเปรดชีต Google Sheets ทั้งหมดของคุณ" ทำให้แอปไม่มีสิทธิ์อ่าน/เขียนชีต\n\nวิธีแก้ไข: กรุณากด "ออกจากระบบ" ที่ปุ่มมุมขวาบน แล้วกดล็อกอินใหม่อีกครั้ง โดยรอบนี้ต้องติ๊กเลือกกล่องเครื่องหมายอนุญาตสิทธิ์ทำงานของชีตด้วย');
      }
      if (response.status === 404) {
        throw new Error('ไม่พบสเปรดชีตนี้ (404 Not Found): กรุณาตรวจสอบว่าไอดีสเปรดชีตหรือลิงก์ชีตที่คุณเชื่อมต่อถูกต้อง หรือไม่ก็กดปุ่ม "สร้างฐานข้อมูลใหม่แบบคลิกเดียว" ในหน้าเลือกสเปรดชีต');
      }
      throw new Error(apiMsg || 'ไม่สามารถดึงข้อมูลสต็อกได้ กรุณาตรวจสอบว่าเลือกสเปรดชีตถูกต้องและตั้งชื่อแผ่นงานว่า "Inventory"');
    }

    const data = await response.json();
    const rows = data.values || [];
    
    return rows.map((row: any, index: number) => {
      return {
        id: row[0] ? String(row[0]).trim() : `ITEM-${index + 1}`,
        name: row[1] ? String(row[1]) : 'ไม่ได้ระบุชื่อ',
        category: row[2] ? String(row[2]) : 'ทั่วไป',
        location: row[3] ? String(row[3]) : 'ไม่มีตำแหน่ง',
        quantity: row[4] ? Number(row[4]) : 0,
        unit: row[5] ? String(row[5]) : 'ชิ้น',
        minStock: row[6] ? Number(row[6]) : 0,
        maxStock: row[7] ? Number(row[7]) : 0,
        price: row[8] ? Number(row[8]) : 0,
        imageUrl: row[9] ? String(row[9]).trim() : '',
      };
    }).filter((item: SparePart) => item.id !== '');
  } catch (error) {
    console.error('Error fetching inventory:', error);
    throw error;
  }
}

/**
 * ดึงข้อมูลประวัติการทำรายการย้อนหลัง
 */
export async function fetchTransactionsData(accessToken: string, spreadsheetId: string): Promise<Transaction[]> {
  try {
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Transactions!A2:G1000`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    const rows = data.values || [];

    return rows.map((row: any) => {
      return {
        timestamp: row[0] ? String(row[0]) : '',
        partId: row[1] ? String(row[1]) : '',
        partName: row[2] ? String(row[2]) : '',
        type: row[3] === 'รับเข้า' ? 'รับเข้า' : 'เบิกจ่าย',
        quantity: row[4] ? Number(row[4]) : 0,
        technician: row[5] ? String(row[5]) : 'ไม่ระบุ',
        machineNote: row[6] ? String(row[6]) : '',
      };
    }).reverse(); // ล่าสุดขึ้นก่อน
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }
}

/**
 * บันทึกประวัติรายการเบิก-รับ และปรับเปลี่ยนยอดใน Inventory
 */
export async function executeTransaction(
  accessToken: string,
  spreadsheetId: string,
  data: {
    partId: string;
    type: 'เบิกจ่าย' | 'รับเข้า';
    quantity: number;
    technician: string;
    machineNote: string;
  }
): Promise<{ success: boolean; updatedPart: SparePart; oldQty: number; newQty: number }> {
  try {
    // 1. ดึงข้อมูล Inventory ทั้งหมดเพื่อหาตำแหน่งแถวและตรวจสอบปริมาณคงเหลือปัจจุบัน
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Inventory!A1:J1000`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const apiMsg = errData?.error?.message || '';
      
      if (response.status === 403 || apiMsg.includes('permission') || apiMsg.includes('Permission')) {
        throw new Error('สิทธิ์การเข้าถึงไม่เพียงพอ (Permission Denied): ตอนที่คุณล็อกอินด้วย Google คุณอาจจะไม่ได้ติ๊กเลือกกล่องเครื่องหมาย "ดู แก้ไข สร้าง และลบสเปรดชีต Google Sheets ทั้งหมดของคุณ" ทำให้แอปไม่มีสิทธิ์อ่าน/เขียนชีต\n\nวิธีแก้ไข: กรุณากด "ออกจากระบบ" ที่ปุ่มมุมขวาบน แล้วกดล็อกอินใหม่อีกครั้ง โดยรอบนี้ต้องติ๊กเลือกกล่องเครื่องหมายอนุญาตสิทธิ์ทำงานของชีตด้วย');
      }
      throw new Error(apiMsg || 'ไม่สามารถตรวจสอบข้อมูลคลังสินค้าก่อนบันทึกได้');
    }

    const sheetData = await response.json();
    const rows = sheetData.values || [];
    
    let rowIndex = -1;
    let oldQty = 0;
    let targetPart: any = null;

    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] && String(rows[i][0]).trim() === data.partId.trim()) {
        rowIndex = i + 1; // Google sheets 1-indexed
        oldQty = rows[i][4] ? Number(rows[i][4]) : 0;
        targetPart = {
          id: String(rows[i][0]).trim(),
          name: String(rows[i][1]),
          category: String(rows[i][2]),
          location: String(rows[i][3]),
          quantity: oldQty,
          unit: String(rows[i][5] || 'ชิ้น'),
          minStock: Number(rows[i][6] || 0),
          maxStock: Number(rows[i][7] || 0),
          price: Number(rows[i][8] || 0),
          imageUrl: rows[i][9] ? String(rows[i][9]).trim() : ''
        };
        break;
      }
    }

    if (rowIndex === -1 || !targetPart) {
      throw new Error(`ไม่พบรหัสอะไหล่: ${data.partId} ในระบบคลังสินค้า`);
    }

    // คำนวณปริมาณคงเหลือใหม่ (อนุญาตให้ติดลบได้กรณีฉุกเฉินเพื่อให้งานซ่อมหน้างานสามารถบันทึกประวัติการซ่อมได้ทันที)
    let newQty = oldQty;
    if (data.type === 'เบิกจ่าย') {
      newQty = oldQty - data.quantity;
    } else {
      newQty = oldQty + data.quantity;
    }

    // 2. ปรับปรุงจำนวนใน Inventory แถวเดิม คอลัมน์ E (คอลัมน์ที่ 5)
    // ใช้ตำแหน่งช่วง เช่น Inventory!E{rowIndex}
    const updateResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Inventory!E${rowIndex}:E${rowIndex}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [[newQty]],
        }),
      }
    );

    if (!updateResponse.ok) {
      const errData = await updateResponse.json().catch(() => ({}));
      const apiMsg = errData?.error?.message || '';
      if (updateResponse.status === 403 || apiMsg.includes('permission') || apiMsg.includes('Permission')) {
        throw new Error('สิทธิ์การเขียนข้อมูลไม่เพียงพอ (Permission Denied): ตอนที่คุณล็อกอินด้วย Google คุณไม่ได้ติ๊กเลือกกล่องอนุญาตสิทธิ์ทำงานของสเปรดชีต ส่งผลให้ไม่สามารถบันทึกยอดลงชีตได้\n\nวิธีแก้ไข: กรุณากด "ออกจากระบบ" แล้วเข้าสู่ระบบใหม่อีกครั้ง และตรวจสอบว่าได้เลือกสิทธิ์การเข้าถึง Google Sheets ทุกกล่องก่อนกดยอมรับ');
      }
      throw new Error(apiMsg || 'ไม่สามารถบันทึกยอดอะไหล่คงเหลือใหม่ลงสเปรดชีตได้');
    }

    // 3. บันทึกประวัติการทำรายการลงในแผ่นงาน "Transactions" (Append ท้ายตาราง)
    const timestampStr = new Date().toLocaleString('th-TH');
    const transactionRow = [
      timestampStr,
      data.partId,
      targetPart.name,
      data.type,
      data.quantity,
      data.technician,
      data.machineNote,
    ];

    const appendResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Transactions!A:G:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [transactionRow],
        }),
      }
    );

    if (!appendResponse.ok) {
      console.warn('บันทึกยอดสำเร็จ แต่ไม่สามารถเขียนประวัติลงในชีต Transactions ได้');
    }

    const updatedPart: SparePart = {
      ...targetPart,
      quantity: newQty
    };

    return {
      success: true,
      updatedPart,
      oldQty,
      newQty
    };
  } catch (error: any) {
    console.error('executeTransaction error:', error);
    throw error;
  }
}

/**
 * เพิ่มอะไหล่ใหม่ลงในชีต Inventory
 */
export async function addNewSparePart(
  accessToken: string,
  spreadsheetId: string,
  part: {
    id: string;
    name: string;
    category: string;
    location: string;
    quantity: number;
    unit: string;
    minStock: number;
    maxStock: number;
    price: number;
    imageUrl?: string;
  }
): Promise<{ success: boolean; newPart: SparePart }> {
  try {
    // 1. ตรวจสอบรหัสซ้ำ
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Inventory!A2:A1000`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (response.ok) {
      const data = await response.json();
      const existingIds = (data.values || []).map((row: any) => row[0] ? String(row[0]).trim().toLowerCase() : '');
      if (existingIds.includes(part.id.trim().toLowerCase())) {
        throw new Error(`รหัสอะไหล่ "${part.id}" นี้มีอยู่ในระบบคลังแล้ว กรุณาใช้รหัสอื่นที่ไม่มีการซ้ำซ้อน`);
      }
    } else {
      const errData = await response.json().catch(() => ({}));
      const apiMsg = errData?.error?.message || '';
      if (response.status === 403 || apiMsg.includes('permission') || apiMsg.includes('Permission')) {
        throw new Error('สิทธิ์การเขียนข้อมูลไม่เพียงพอ (Permission Denied): ตอนที่คุณล็อกอินด้วย Google คุณไม่ได้ติ๊กเลือกกล่องอนุญาตสิทธิ์ทำงานของสเปรดชีต ส่งผลให้ไม่สามารถเพิ่มอะไหล่ลงชีตได้\n\nวิธีแก้ไข: กรุณากด "ออกจากระบบ" แล้วเข้าสู่ระบบใหม่อีกครั้ง และตรวจสอบว่าได้เลือกสิทธิ์การเข้าถึง Google Sheets ทุกกล่องก่อนกดยอมรับ');
      }
    }

    const rowValue = [
      part.id.trim().toUpperCase(),
      part.name.trim(),
      part.category.trim(),
      part.location.trim(),
      part.quantity,
      part.unit.trim(),
      part.minStock,
      part.maxStock,
      part.price,
      part.imageUrl ? part.imageUrl.trim() : ''
    ];

    // 2. บันทึกลงในแผ่นงาน "Inventory" (Append ท้ายตาราง)
    const appendResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Inventory!A:J:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [rowValue],
        }),
      }
    );

    if (!appendResponse.ok) {
      const errData = await appendResponse.json().catch(() => ({}));
      const apiMsg = errData?.error?.message || '';
      if (appendResponse.status === 403 || apiMsg.includes('permission') || apiMsg.includes('Permission')) {
        throw new Error('สิทธิ์การเพิ่มแถวข้อมูลไม่เพียงพอ (Permission Denied): ตอนที่คุณล็อกอินด้วย Google คุณไม่ได้ติ๊กเลือกกล่องอนุญาตสิทธิ์ทำงานของสเปรดชีต\n\nวิธีแก้ไข: กรุณากด "ออกจากระบบ" แล้วล็อกอิน Google ใหม่อีกครั้ง และตรวจสอบว่าได้เลือกสิทธิ์การเข้าถึง Google Sheets ทุกกล่องก่อนกดยอมรับ');
      }
      throw new Error(apiMsg || 'ไม่สามารถเขียนข้อมูลลง Google Sheets ได้');
    }

    const newPart: SparePart = {
      id: part.id.trim().toUpperCase(),
      name: part.name.trim(),
      category: part.category.trim(),
      location: part.location.trim(),
      quantity: part.quantity,
      unit: part.unit.trim(),
      minStock: part.minStock,
      maxStock: part.maxStock,
      price: part.price,
      imageUrl: part.imageUrl ? part.imageUrl.trim() : '',
    };

    return {
      success: true,
      newPart
    };
  } catch (error: any) {
    console.error('addNewSparePart error:', error);
    throw error;
  }
}

/**
 * ตรวจสอบและสร้างชีต Equipment และ MaintenanceLogs ในกรณีที่เปิดชีตเก่าที่ยังไม่มี
 */
export async function ensureMaintenanceSheetsExist(accessToken: string, spreadsheetId: string): Promise<void> {
  try {
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) return;

    const data = await response.json();
    const sheetTitles = (data.sheets || []).map((s: any) => s.properties?.title);

    const requests: any[] = [];
    const hasEquipment = sheetTitles.includes('Equipment');
    const hasLogs = sheetTitles.includes('MaintenanceLogs');

    if (!hasEquipment) {
      requests.push({
        addSheet: {
          properties: { title: 'Equipment', gridProperties: { rowCount: 100, columnCount: 10 } }
        }
      });
    }

    if (!hasLogs) {
      requests.push({
        addSheet: {
          properties: { title: 'MaintenanceLogs', gridProperties: { rowCount: 1000, columnCount: 12 } }
        }
      });
    }

    if (requests.length > 0) {
      const updateResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests }),
      });

      if (updateResponse.ok) {
        // เติมหัวตารางและค่าเริ่มต้นสำหรับชีตที่สร้างใหม่
        const valData: any[] = [];
        if (!hasEquipment) {
          valData.push({
            range: 'Equipment!A1:F1',
            values: [['รหัสเครื่องจักร', 'ชื่อเครื่องจักร', 'ไลน์ผลิต/ตำแหน่ง', 'ราคาซื้อแรกเริ่ม', 'งบซ่อมสะสมสูงสุดที่รับได้', 'วันที่ซื้อ']]
          });
          valData.push({
            range: 'Equipment!A2:F4',
            values: [
              ['EQ-001', 'เครื่องแพ็คซองอัตโนมัติ Pack-01', 'แผนกบรรจุ ไลน์ 1', 120000, 45000, '12/05/2024'],
              ['EQ-002', 'เครื่องแพ็คกล่องบรรจุภัณฑ์ Carton-02', 'แผนกบรรจุ ไลน์ 2', 250000, 80000, '10/01/2025'],
              ['EQ-003', 'ปืนลมยิงตะปูอุตสาหกรรม NailGun-05', 'แผนกประกอบไม้', 4500, 2000, '20/11/2025']
            ]
          });
        }
        if (!hasLogs) {
          valData.push({
            range: 'MaintenanceLogs!A1:J1',
            values: [['วันเวลาที่ซ่อม', 'รหัสเครื่องจักร', 'ชื่อเครื่องจักร', 'รายละเอียดการซ่อม', 'รหัสอะไหล่ที่ใช้', 'จำนวนที่ใช้', 'มูลค่าอะไหล่', 'ค่าใช้จ่ายนอก/ค่าบริการ', 'รวมรวมทั้งหมด', 'ช่างผู้รับผิดชอบ']]
          });
          const dateNow = new Date().toLocaleDateString('th-TH');
          valData.push({
            range: 'MaintenanceLogs!A2:J3',
            values: [
              [dateNow, 'EQ-001', 'เครื่องแพ็คซองอัตโนมัติ Pack-01', 'เปลี่ยนกระบอกสูบที่สึกหรอ', 'SP-001', 1, 450, 500, 950, 'ช่างศักดิ์ดา'],
              [dateNow, 'EQ-002', 'เครื่องแพ็คกล่องบรรจุภัณฑ์ Carton-02', 'ซ่อมระบบฮีตเตอร์และใบมีดชำรุด', 'SP-002', 2, 2400, 1500, 3900, 'ช่างชัยชนะ']
            ]
          });
        }

        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            valueInputOption: 'USER_ENTERED',
            data: valData
          })
        });
      }
    }
  } catch (error) {
    console.error('ensureMaintenanceSheetsExist error:', error);
  }
}

/**
 * ดึงข้อมูลเครื่องจักรทั้งหมดจากชีต Equipment
 */
export async function fetchEquipmentData(accessToken: string, spreadsheetId: string): Promise<Equipment[]> {
  try {
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Equipment!A2:F500`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) return [];

    const data = await response.json();
    const rows = data.values || [];

    return rows.map((row: any, index: number) => {
      return {
        id: row[0] ? String(row[0]).trim() : `EQ-${index + 1}`,
        name: row[1] ? String(row[1]) : 'ไม่ได้ระบุชื่อ',
        location: row[2] ? String(row[2]) : 'ไม่ได้ระบุตำแหน่ง',
        purchasePrice: row[3] ? Number(row[3]) : 0,
        maxRepairBudget: row[4] ? Number(row[4]) : 0,
        purchaseDate: row[5] ? String(row[5]) : '',
      };
    }).filter((eq: Equipment) => eq.id !== '');
  } catch (error) {
    console.error('Error fetching equipment:', error);
    return [];
  }
}

/**
 * ดึงประวัติการซ่อมบำรุงจากชีต MaintenanceLogs
 */
export async function fetchMaintenanceLogsData(accessToken: string, spreadsheetId: string): Promise<MaintenanceLog[]> {
  try {
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/MaintenanceLogs!A2:K1000`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) return [];

    const data = await response.json();
    const rows = data.values || [];

    return rows.map((row: any) => {
      return {
        date: row[0] ? String(row[0]) : '',
        equipmentId: row[1] ? String(row[1]) : '',
        equipmentName: row[2] ? String(row[2]) : '',
        repairDetail: row[3] ? String(row[3]) : '',
        partUsedId: row[4] ? String(row[4]) : '',
        partQty: row[5] ? Number(row[5]) : 0,
        partCost: row[6] ? Number(row[6]) : 0,
        otherCost: row[7] ? Number(row[7]) : 0,
        totalCost: row[8] ? Number(row[8]) : 0,
        technician: row[9] ? String(row[9]) : 'ไม่ระบุ',
        imageUrl: row[10] ? String(row[10]) : '',
      };
    }).reverse(); // ล่าสุดขึ้นก่อน
  } catch (error) {
    console.error('Error fetching maintenance logs:', error);
    return [];
  }
}

/**
 * เพิ่มอุปกรณ์เครื่องจักรใหม่ลงในชีต Equipment
 */
export async function addNewEquipment(
  accessToken: string,
  spreadsheetId: string,
  eq: {
    id: string;
    name: string;
    location: string;
    purchasePrice: number;
    maxRepairBudget: number;
    purchaseDate: string;
  }
): Promise<{ success: boolean; newEquipment: Equipment }> {
  try {
    // 1. ตรวจสอบรหัสซ้ำ
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Equipment!A2:A100`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (response.ok) {
      const data = await response.json();
      const existingIds = (data.values || []).map((row: any) => row[0] ? String(row[0]).trim().toLowerCase() : '');
      if (existingIds.includes(eq.id.trim().toLowerCase())) {
        throw new Error(`รหัสเครื่องจักร "${eq.id}" นี้มีอยู่ในระบบแล้ว กรุณาใช้รหัสอื่นที่ไม่มีการซ้ำซ้อน`);
      }
    }

    const rowValue = [
      eq.id.trim().toUpperCase(),
      eq.name.trim(),
      eq.location.trim(),
      eq.purchasePrice,
      eq.maxRepairBudget,
      eq.purchaseDate.trim()
    ];

    // 2. บันทึกลงในแผ่นงาน "Equipment" (Append ท้ายตาราง)
    const appendResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Equipment!A:F:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [rowValue],
        }),
      }
    );

    if (!appendResponse.ok) {
      const errData = await appendResponse.json().catch(() => ({}));
      throw new Error(errData.error?.message || 'ไม่สามารถเขียนข้อมูลลง Google Sheets ได้');
    }

    const newEquipment: Equipment = {
      id: eq.id.trim().toUpperCase(),
      name: eq.name.trim(),
      location: eq.location.trim(),
      purchasePrice: eq.purchasePrice,
      maxRepairBudget: eq.maxRepairBudget,
      purchaseDate: eq.purchaseDate.trim(),
    };

    return {
      success: true,
      newEquipment
    };
  } catch (error: any) {
    console.error('addNewEquipment error:', error);
    throw error;
  }
}

/**
 * บันทึกประวัติการซ่อมบำรุงและตัดยอดคลังสินค้าหากมีการใช้อะไหล่
 */
export async function addNewMaintenanceLog(
  accessToken: string,
  spreadsheetId: string,
  log: {
    equipmentId: string;
    equipmentName: string;
    repairDetail: string;
    partUsedId: string; // ว่างถ้าไม่ได้ใช้
    partQty: number;
    partCost: number;
    otherCost: number;
    totalCost: number;
    technician: string;
    imageUrl?: string;
  }
): Promise<{ success: boolean; newLog: MaintenanceLog; updatedPart?: SparePart }> {
  try {
    let updatedPart: SparePart | undefined;

    // 1. ถ้ามีการใช้อะไหล่ ให้หักออกจากคลัง
    if (log.partUsedId && log.partUsedId !== '-' && log.partQty > 0) {
      const result = await executeTransaction(accessToken, spreadsheetId, {
        partId: log.partUsedId,
        type: 'เบิกจ่าย',
        quantity: log.partQty,
        technician: log.technician,
        machineNote: `ซ่อมแซมเครื่องจักรอุปกรณ์: ${log.equipmentName} (${log.repairDetail})`
      });
      if (result.success) {
        updatedPart = result.updatedPart;
      }
    }

    // 2. บันทึกประวัติลงในแผ่นงาน "MaintenanceLogs"
    const timestampStr = new Date().toLocaleString('th-TH');
    const logValue = [
      timestampStr,
      log.equipmentId.toUpperCase(),
      log.equipmentName,
      log.repairDetail,
      log.partUsedId ? log.partUsedId.toUpperCase() : '-',
      log.partQty || 0,
      log.partCost || 0,
      log.otherCost || 0,
      log.totalCost || 0,
      log.technician,
      log.imageUrl ? log.imageUrl.trim() : ''
    ];

    const appendResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/MaintenanceLogs!A:K:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [logValue],
        }),
      }
    );

    if (!appendResponse.ok) {
      const errData = await appendResponse.json().catch(() => ({}));
      throw new Error(errData.error?.message || 'ไม่สามารถเขียนประวัติการซ่อมบำรุงลงสเปรดชีตได้');
    }

    const newLog: MaintenanceLog = {
      date: timestampStr,
      equipmentId: log.equipmentId.toUpperCase(),
      equipmentName: log.equipmentName,
      repairDetail: log.repairDetail,
      partUsedId: log.partUsedId ? log.partUsedId.toUpperCase() : '-',
      partQty: log.partQty || 0,
      partCost: log.partCost || 0,
      otherCost: log.otherCost || 0,
      totalCost: log.totalCost || 0,
      technician: log.technician,
      imageUrl: log.imageUrl ? log.imageUrl.trim() : '',
    };

    return {
      success: true,
      newLog,
      updatedPart
    };
  } catch (error: any) {
    console.error('addNewMaintenanceLog error:', error);
    throw error;
  }
}

/**
 * แก้ไข/ปรับปรุงข้อมูลอะไหล่เดิมในชีต Inventory
 */
export async function updateSparePart(
  accessToken: string,
  spreadsheetId: string,
  part: {
    id: string;
    name: string;
    category: string;
    location: string;
    quantity: number;
    unit: string;
    minStock: number;
    maxStock: number;
    price: number;
    imageUrl?: string;
  }
): Promise<{ success: boolean; updatedPart: SparePart }> {
  try {
    // 1. ดึงข้อมูล Inventory ทั้งหมดเพื่อหาตำแหน่งแถว
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Inventory!A1:J1000`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData?.error?.message || 'ไม่สามารถดึงข้อมูลคลังสินค้าเพื่อแก้ไขได้');
    }

    const sheetData = await response.json();
    const rows = sheetData.values || [];
    
    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] && String(rows[i][0]).trim().toLowerCase() === part.id.trim().toLowerCase()) {
        rowIndex = i + 1; // Google sheets is 1-indexed
        break;
      }
    }

    if (rowIndex === -1) {
      throw new Error(`ไม่พบรหัสอะไหล่: ${part.id} ในระบบคลังสินค้า`);
    }

    // เตรียมค่าที่จะบันทึก (คอลัมน์ A ถึง J)
    const rowValue = [
      part.id.trim().toUpperCase(),
      part.name.trim(),
      part.category.trim(),
      part.location.trim(),
      part.quantity,
      part.unit.trim(),
      part.minStock,
      part.maxStock,
      part.price,
      part.imageUrl ? part.imageUrl.trim() : ''
    ];

    // 2. ปรับปรุงข้อมูลใน Inventory แถวเดิม ช่วง A{rowIndex}:J{rowIndex}
    const updateResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Inventory!A${rowIndex}:J${rowIndex}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [rowValue],
        }),
      }
    );

    if (!updateResponse.ok) {
      const errData = await updateResponse.json().catch(() => ({}));
      throw new Error(errData?.error?.message || 'ไม่สามารถบันทึกการแก้ไขข้อมูลอะไหล่ลงสเปรดชีตได้');
    }

    const updatedPart: SparePart = {
      id: part.id.trim().toUpperCase(),
      name: part.name.trim(),
      category: part.category.trim(),
      location: part.location.trim(),
      quantity: part.quantity,
      unit: part.unit.trim(),
      minStock: part.minStock,
      maxStock: part.maxStock,
      price: part.price,
      imageUrl: part.imageUrl ? part.imageUrl.trim() : '',
    };

    return {
      success: true,
      updatedPart
    };
  } catch (error: any) {
    console.error('updateSparePart error:', error);
    throw error;
  }
}

/**
 * แก้ไข/ปรับปรุงข้อมูลเครื่องจักรเดิมในชีต Equipment
 */
export async function updateEquipment(
  accessToken: string,
  spreadsheetId: string,
  eq: {
    id: string;
    name: string;
    location: string;
    purchasePrice: number;
    maxRepairBudget: number;
    purchaseDate: string;
  }
): Promise<{ success: boolean; updatedEquipment: Equipment }> {
  try {
    // 1. ดึงข้อมูล Equipment ทั้งหมดเพื่อหาตำแหน่งแถว
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Equipment!A1:F500`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData?.error?.message || 'ไม่สามารถดึงข้อมูลเครื่องจักรเพื่อแก้ไขได้');
    }

    const sheetData = await response.json();
    const rows = sheetData.values || [];
    
    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] && String(rows[i][0]).trim().toLowerCase() === eq.id.trim().toLowerCase()) {
        rowIndex = i + 1; // Google sheets is 1-indexed
        break;
      }
    }

    if (rowIndex === -1) {
      throw new Error(`ไม่พบรหัสเครื่องจักร: ${eq.id} ในระบบ`);
    }

    // เตรียมค่าที่จะบันทึก (คอลัมน์ A ถึง F)
    const rowValue = [
      eq.id.trim().toUpperCase(),
      eq.name.trim(),
      eq.location.trim(),
      eq.purchasePrice,
      eq.maxRepairBudget,
      eq.purchaseDate.trim()
    ];

    // 2. ปรับปรุงข้อมูลใน Equipment แถวเดิม ช่วง A{rowIndex}:F{rowIndex}
    const updateResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Equipment!A${rowIndex}:F${rowIndex}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [rowValue],
        }),
      }
    );

    if (!updateResponse.ok) {
      const errData = await updateResponse.json().catch(() => ({}));
      throw new Error(errData?.error?.message || 'ไม่สามารถบันทึกการแก้ไขข้อมูลเครื่องจักรลงสเปรดชีตได้');
    }

    const updatedEquipment: Equipment = {
      id: eq.id.trim().toUpperCase(),
      name: eq.name.trim(),
      location: eq.location.trim(),
      purchasePrice: eq.purchasePrice,
      maxRepairBudget: eq.maxRepairBudget,
      purchaseDate: eq.purchaseDate.trim(),
    };

    return {
      success: true,
      updatedEquipment
    };
  } catch (error: any) {
    console.error('updateEquipment error:', error);
    throw error;
  }
}

/**
 * แก้ไขประวัติการซ่อมบำรุงเดิมในชีต MaintenanceLogs
 */
export async function updateMaintenanceLog(
  accessToken: string,
  spreadsheetId: string,
  oldLog: MaintenanceLog,
  newLog: {
    date: string;
    equipmentId: string;
    equipmentName: string;
    repairDetail: string;
    partUsedId: string;
    partQty: number;
    partCost: number;
    otherCost: number;
    totalCost: number;
    technician: string;
    imageUrl?: string;
  }
): Promise<{ success: boolean; updatedLog: MaintenanceLog }> {
  try {
    // 1. ดึงข้อมูล MaintenanceLogs ทั้งหมดเพื่อหาตำแหน่งแถว
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/MaintenanceLogs!A1:K1000`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData?.error?.message || 'ไม่สามารถดึงประวัติการซ่อมเพื่อแก้ไขได้');
    }

    const sheetData = await response.json();
    const rows = sheetData.values || [];
    
    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      const rowDate = rows[i][0] ? String(rows[i][0]).trim() : '';
      const rowEqId = rows[i][1] ? String(rows[i][1]).trim() : '';
      // เทียบวันเวลาและรหัสเครื่องจักรเพื่อหาความถูกต้องสูงสุด
      if (rowDate === oldLog.date.trim() && rowEqId.toLowerCase() === oldLog.equipmentId.toLowerCase().trim()) {
        rowIndex = i + 1; // Google sheets is 1-indexed
        break;
      }
    }

    if (rowIndex === -1) {
      throw new Error(`ไม่พบประวัติการซ่อมแซม ณ วันเวลา: ${oldLog.date} ของเครื่องจักร: ${oldLog.equipmentId} ในระบบ`);
    }

    // เตรียมค่าที่จะบันทึก (คอลัมน์ A ถึง K)
    const rowValue = [
      newLog.date.trim(),
      newLog.equipmentId.trim().toUpperCase(),
      newLog.equipmentName.trim(),
      newLog.repairDetail.trim(),
      newLog.partUsedId ? newLog.partUsedId.trim().toUpperCase() : '-',
      newLog.partQty,
      newLog.partCost,
      newLog.otherCost,
      newLog.totalCost,
      newLog.technician.trim(),
      newLog.imageUrl ? newLog.imageUrl.trim() : ''
    ];

    // 2. ปรับปรุงข้อมูลใน MaintenanceLogs แถวเดิม ช่วง A{rowIndex}:K{rowIndex}
    const updateResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/MaintenanceLogs!A${rowIndex}:K${rowIndex}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [rowValue],
        }),
      }
    );

    if (!updateResponse.ok) {
      const errData = await updateResponse.json().catch(() => ({}));
      throw new Error(errData?.error?.message || 'ไม่สามารถบันทึกการแก้ไขประวัติการซ่อมลงสเปรดชีตได้');
    }

    const updatedLog: MaintenanceLog = {
      date: newLog.date.trim(),
      equipmentId: newLog.equipmentId.trim().toUpperCase(),
      equipmentName: newLog.equipmentName.trim(),
      repairDetail: newLog.repairDetail.trim(),
      partUsedId: newLog.partUsedId ? newLog.partUsedId.trim().toUpperCase() : '-',
      partQty: newLog.partQty,
      partCost: newLog.partCost,
      otherCost: newLog.otherCost,
      totalCost: newLog.totalCost,
      technician: newLog.technician.trim(),
      imageUrl: newLog.imageUrl ? newLog.imageUrl.trim() : '',
    };

    return {
      success: true,
      updatedLog
    };
  } catch (error: any) {
    console.error('updateMaintenanceLog error:', error);
    throw error;
  }
}

/**
 * ป้อนหัวตารางและอีเมลผู้สร้างลงชีต AuthorizedUsers
 */
async function populateDefaultAuthorizedUsers(accessToken: string, spreadsheetId: string, creatorEmail?: string) {
  try {
    const headers = [
      ['อีเมลที่ได้รับอนุญาต', 'ชื่อ-นามสกุล', 'บทบาท', 'วันที่เพิ่ม']
    ];
    const rows = [...headers];
    if (creatorEmail) {
      rows.push([
        creatorEmail.trim().toLowerCase(),
        'เจ้าของระบบ (ผู้เริ่มสร้าง)',
        'ผู้ดูแลระบบ',
        new Date().toLocaleDateString('th-TH')
      ]);
    }
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/AuthorizedUsers!A1:D2?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: rows }),
    });
  } catch (error) {
    console.error('populateDefaultAuthorizedUsers error:', error);
  }
}

/**
 * ตรวจสอบและสร้างชีต AuthorizedUsers ในกรณีที่เปิดชีตเก่าที่ยังไม่มี
 */
export async function ensureAuthorizedUsersSheetExist(accessToken: string, spreadsheetId: string, currentUserEmail?: string): Promise<void> {
  try {
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) return;

    const data = await response.json();
    const sheetTitles = (data.sheets || []).map((s: any) => s.properties?.title);

    const hasAuthorizedUsers = sheetTitles.includes('AuthorizedUsers');

    if (!hasAuthorizedUsers) {
      const requests = [{
        addSheet: {
          properties: { title: 'AuthorizedUsers', gridProperties: { rowCount: 100, columnCount: 5 } }
        }
      }];

      const updateResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests }),
      });

      if (updateResponse.ok) {
        const valData: any[] = [
          {
            range: 'AuthorizedUsers!A1:D1',
            values: [['อีเมลที่ได้รับอนุญาต', 'ชื่อ-นามสกุล', 'บทบาท', 'วันที่เพิ่ม']]
          }
        ];
        if (currentUserEmail) {
          valData.push({
            range: 'AuthorizedUsers!A2:D2',
            values: [[currentUserEmail.trim().toLowerCase(), 'เจ้าของระบบ (ผู้ติดตั้ง)', 'ผู้ดูแลระบบ', new Date().toLocaleDateString('th-TH')]]
          });
        }

        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            valueInputOption: 'USER_ENTERED',
            data: valData
          })
        });
      }
    }
  } catch (error) {
    console.error('ensureAuthorizedUsersSheetExist error:', error);
  }
}

export interface AuthorizedUser {
  email: string;
  name: string;
  role: string;
  dateAdded: string;
}

/**
 * ดึงข้อมูลผู้ได้รับอนุญาตทั้งหมดจากชีต AuthorizedUsers
 */
export async function fetchAuthorizedUsers(accessToken: string, spreadsheetId: string, currentUserEmail?: string): Promise<AuthorizedUser[]> {
  try {
    // ตรวจสอบและอัปเกรดเพื่อรองรับชีตสิทธิ์
    await ensureAuthorizedUsersSheetExist(accessToken, spreadsheetId, currentUserEmail);

    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/AuthorizedUsers!A2:D100`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) return [];

    const data = await response.json();
    const rows = data.values || [];

    return rows.map((row: any) => {
      return {
        email: row[0] ? String(row[0]).trim().toLowerCase() : '',
        name: row[1] ? String(row[1]).trim() : '',
        role: row[2] ? String(row[2]).trim() : 'ผู้ใช้งาน',
        dateAdded: row[3] ? String(row[3]).trim() : '',
      };
    }).filter((u: AuthorizedUser) => u.email !== '');
  } catch (error) {
    console.error('Error fetching authorized users:', error);
    return [];
  }
}

/**
 * เพิ่มรายชื่อผู้ได้รับอนุญาตใหม่ลงในชีต AuthorizedUsers
 */
export async function addAuthorizedUser(
  accessToken: string,
  spreadsheetId: string,
  newUser: { email: string; name: string; role: string }
): Promise<void> {
  try {
    const rowValue = [
      newUser.email.trim().toLowerCase(),
      newUser.name.trim(),
      newUser.role.trim(),
      new Date().toLocaleDateString('th-TH')
    ];

    const appendResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/AuthorizedUsers!A:D:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [rowValue],
        }),
      }
    );

    if (!appendResponse.ok) {
      throw new Error('ไม่สามารถเพิ่มอีเมลผู้ใช้ลง Google Sheet ได้');
    }
  } catch (error) {
    console.error('addAuthorizedUser error:', error);
    throw error;
  }
}

/**
 * ลบรายชื่อผู้ได้รับอนุญาตจากชีต AuthorizedUsers
 */
export async function removeAuthorizedUser(
  accessToken: string,
  spreadsheetId: string,
  email: string
): Promise<void> {
  try {
    // ดึงข้อมูลชีตทั้งหมดเพื่อหา sheetId ของชีต "AuthorizedUsers" และหาแถวที่จะลบ
    const spreadsheetResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!spreadsheetResponse.ok) {
      throw new Error('ไม่สามารถดึงข้อมูลสเปรดชีตเพื่อทำรายการได้');
    }
    const spreadsheetData = await spreadsheetResponse.json();
    const authorizedUsersSheet = (spreadsheetData.sheets || []).find((s: any) => s.properties?.title === 'AuthorizedUsers');
    if (!authorizedUsersSheet) return;

    const sheetId = authorizedUsersSheet.properties.sheetId;

    const valuesResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/AuthorizedUsers!A1:A100`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!valuesResponse.ok) return;

    const valuesData = await valuesResponse.json();
    const rows = valuesData.values || [];

    let rowIndexToDelete = -1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] && String(rows[i][0]).trim().toLowerCase() === email.trim().toLowerCase()) {
        rowIndexToDelete = i; // 0-based index of row in sheet (A2 is index 1)
        break;
      }
    }

    if (rowIndexToDelete === -1) return; // ไม่เจอ ไม่ต้องทำอะไร

    // ลบแถวโดยใช้ batchUpdate (deleteDimension)
    const requests = [
      {
        deleteDimension: {
          range: {
            sheetId,
            dimension: 'ROWS',
            startIndex: rowIndexToDelete,
            endIndex: rowIndexToDelete + 1,
          },
        },
      },
    ];

    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests }),
    });

    if (!response.ok) {
      throw new Error('ไม่สามารถลบแถวผู้ใช้ที่ได้รับอนุญาตได้');
    }
  } catch (error) {
    console.error('removeAuthorizedUser error:', error);
    throw error;
  }
}




