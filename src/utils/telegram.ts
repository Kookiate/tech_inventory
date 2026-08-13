import { SparePart, SpareLoan } from '../types';

export interface TelegramSettings {
  enabled: boolean;
  botToken: string;
  chatId: string;
}

/**
 * ดึงการตั้งค่า Telegram จาก localStorage
 */
export function getTelegramSettings(): TelegramSettings {
  const enabled = localStorage.getItem('telegram_enabled') === 'true';
  const botToken = localStorage.getItem('telegram_bot_token') || '';
  const chatId = localStorage.getItem('telegram_chat_id') || '';
  return { enabled, botToken, chatId };
}

/**
 * บันทึกการตั้งค่า Telegram ลง localStorage
 */
export function saveTelegramSettings(enabled: boolean, botToken: string, chatId: string): void {
  localStorage.setItem('telegram_enabled', enabled ? 'true' : 'false');
  localStorage.setItem('telegram_bot_token', botToken.trim());
  localStorage.setItem('telegram_chat_id', chatId.trim());
}

/**
 * ส่งข้อความตรงไปยัง Telegram API
 */
export async function sendTelegramMessage(botToken: string, chatId: string, text: string): Promise<boolean> {
  if (!botToken || !chatId) {
    throw new Error('กรุณาระบุ Telegram Bot Token และ Chat ID ให้ครบถ้วน');
  }

  const url = `https://api.telegram.org/bot${botToken.trim()}/sendMessage`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: chatId.trim(),
      text: text,
      parse_mode: 'HTML',
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.description || 'เกิดข้อผิดพลาดในการส่งข้อความ Telegram');
  }

  return true;
}

/**
 * ส่งแจ้งเตือนการเบิกจ่ายอะไหล่สำรอง และประเมินวิกฤตสต็อก
 */
export async function sendPartWithdrawAlert(
  part: SparePart,
  quantity: number,
  technician: string,
  machineNote: string,
  newQty: number,
  equipmentName?: string
): Promise<boolean> {
  const settings = getTelegramSettings();
  if (!settings.enabled || !settings.botToken || !settings.chatId) {
    return false; // ปิดใช้งานหรือไม่ครบถ้วน
  }

  // คำนวณมูลค่ารวม
  const itemPrice = part.price || 0;
  const totalCost = itemPrice * quantity;

  // ตรวจเช็คสถานะสต็อกวิกฤต
  const minStock = part.minStock || 0;
  
  let criticalStatusText = '';
  let criticalEmoji = '';

  if (newQty <= 0) {
    criticalEmoji = '❌';
    criticalStatusText = `<b>วิกฤตระดับสูงสุด! สินค้าหมดคลังทันที! (Out of Stock)</b>`;
  } else if (newQty < minStock) {
    criticalEmoji = '🚨';
    criticalStatusText = `<b>วิกฤตระดับกลาง! ต่ำกว่าเกณฑ์ความปลอดภัย Min Stock (เกณฑ์ขั้นต่ำ: ${minStock} ${part.unit})</b>`;
  } else if (newQty === minStock) {
    criticalEmoji = '⚠️';
    criticalStatusText = `<b>เตือนภัย! เท่าเกณฑ์ความปลอดภัยขั้นต่ำพอดี (Min Stock: ${minStock} ${part.unit})</b>`;
  } else {
    criticalEmoji = '✅';
    criticalStatusText = `ระดับปกติ (ปลอดภัย)`;
  }

  // รายละเอียดเครื่องจักร/งานซ่อม
  const usageDetail = equipmentName 
    ? `🛠️ <b>เครื่องจักร:</b> ${equipmentName}\n🔧 <b>อาการและการแก้ไข:</b> ${machineNote}`
    : `📝 <b>หมายเหตุ:</b> ${machineNote}`;

  // จัดรูปแบบข้อความแจ้งเตือนความยาวกำลังดีและอ่านง่ายบนหน้าจอมือถือของช่าง
  const messageText = `
${criticalEmoji} <b>แจ้งเตือนการเบิกอะไหล่สำรอง</b>
━━━━━━━━━━━━━━━━━━━━━
📦 <b>อะไหล่:</b> <code>[${part.id}]</code> ${part.name}
📁 <b>หมวดหมู่:</b> ${part.category}
🔢 <b>จำนวนที่เบิก:</b> ${quantity} ${part.unit}
💰 <b>ราคาต่อหน่วย:</b> ฿${itemPrice.toLocaleString()}
💸 <b>รวมมูลค่าการเบิก:</b> ฿${totalCost.toLocaleString()}
👤 <b>ช่างผู้ทำรายการ:</b> ${technician}
━━━━━━━━━━━━━━━━━━━━━
<b>[ รายละเอียดการนำไปใช้งาน/งานซ่อม ]</b>
${usageDetail}
━━━━━━━━━━━━━━━━━━━━━
📊 <b>สถานะสต็อกคงเหลือล่าสุด:</b>
📦 <b>คงเหลือจริงในระบบ:</b> ${newQty} ${part.unit} (ขั้นต่ำควรมี: ${minStock} ${part.unit})
📢 <b>ประเมินความวิกฤต:</b> ${criticalStatusText}
  `.trim();

  try {
    return await sendTelegramMessage(settings.botToken, settings.chatId, messageText);
  } catch (error) {
    console.error('Error sending Telegram withdrawal alert:', error);
    return false;
  }
}

/**
 * ส่งแจ้งเตือนการรับเข้า/เติมสต็อกอะไหล่สำรอง
 */
export async function sendPartRestockAlert(
  part: SparePart,
  quantity: number,
  technician: string,
  machineNote: string,
  newQty: number
): Promise<boolean> {
  const settings = getTelegramSettings();
  if (!settings.enabled || !settings.botToken || !settings.chatId) {
    return false; // ปิดใช้งานหรือไม่ครบถ้วน
  }

  // คำนวณมูลค่ารวมที่รับเข้า
  const itemPrice = part.price || 0;
  const totalCost = itemPrice * quantity;

  // เกณฑ์ความปลอดภัย
  const minStock = part.minStock || 0;
  const maxStock = part.maxStock || 0;

  let stockStatusText = '';
  if (newQty > maxStock && maxStock > 0) {
    stockStatusText = `📈 <b>สต็อกล้นเกณฑ์สูงสุด Max Stock (เกณฑ์สูงสุด: ${maxStock} ${part.unit})</b>`;
  } else if (newQty >= minStock) {
    stockStatusText = `🟢 <b>สต็อกกลับเข้าสู่สภาวะปกติ (พ้นขีดวิกฤตความเสี่ยง)</b>`;
  } else {
    stockStatusText = `⚠️ <b>แม้จะเติมสต็อกแล้ว แต่คงเหลือก็ยังต่ำกว่าเกณฑ์ Min Stock (${newQty} < ${minStock})</b>`;
  }

  // จัดรูปแบบข้อความแจ้งเตือนรับเข้า
  const messageText = `
🟢 <b>แจ้งเตือนการเติมสต็อกอะไหล่ (Restock)</b>
━━━━━━━━━━━━━━━━━━━━━
📦 <b>อะไหล่:</b> <code>[${part.id}]</code> ${part.name}
📁 <b>หมวดหมู่:</b> ${part.category}
📥 <b>จำนวนที่เติมเข้า:</b> ${quantity} ${part.unit}
💰 <b>ราคาต่อหน่วย:</b> ฿${itemPrice.toLocaleString()}
💸 <b>รวมมูลค่าเติมเข้า:</b> ฿${totalCost.toLocaleString()}
👤 <b>ผู้ทำรายการรับเข้า:</b> ${technician}
━━━━━━━━━━━━━━━━━━━━━
📝 <b>หมายเหตุการรับเข้า:</b> ${machineNote || 'เติมอะไหล่สำรองเข้าคลังเพื่อความพร้อมผลิต'}
━━━━━━━━━━━━━━━━━━━━━
📊 <b>สถานะสต็อกคงเหลือล่าสุด:</b>
📦 <b>คงเหลือจริงในระบบ:</b> ${newQty} ${part.unit} (ขั้นต่ำควรมี: ${minStock} ${part.unit})
📢 <b>ประเมินความปลอดภัย:</b> ${stockStatusText}
  `.trim();

  try {
    return await sendTelegramMessage(settings.botToken, settings.chatId, messageText);
  } catch (error) {
    console.error('Error sending Telegram restock alert:', error);
    return false;
  }
}

/**
 * ส่งแจ้งเตือนการยืม Spare/เครื่องมือ ไปยัง Telegram
 */
export async function sendToolLoanAlert(loan: SpareLoan): Promise<boolean> {
  const settings = getTelegramSettings();
  if (!settings.enabled || !settings.botToken || !settings.chatId) {
    return false;
  }

  const messageText = `
🔄 <b>[แจ้งเตือนการยืม Spare / เครื่องมือ]</b>
━━━━━━━━━━━━━━━━━━━━━
🔧 <b>เครื่องมือ/Spare:</b> <code>[${loan.partId}]</code> ${loan.partName}
🔢 <b>จำนวนที่ยืม:</b> ${loan.quantity} ชิ้น/ตัว
🏭 <b>นำไปใช้งานที่:</b> ${loan.lineLocation}
👤 <b>ช่างผู้เบิกยืม:</b> ${loan.borrowerName}
📅 <b>วันเวลาที่ยืม:</b> ${loan.borrowDate}
⏳ <b>กำหนดวันคืน:</b> ${loan.expectedReturnDate || 'ไม่ได้ระบุ'}
━━━━━━━━━━━━━━━━━━━━━
📝 <b>วัตถุประสงค์การใช้งาน:</b>
${loan.purposeNote || '-'}
  `.trim();

  try {
    return await sendTelegramMessage(settings.botToken, settings.chatId, messageText);
  } catch (error) {
    console.error('Error sending Telegram tool loan alert:', error);
    return false;
  }
}

/**
 * ส่งแจ้งเตือนการคืน Spare/เครื่องมือ เข้าคลัง ไปยัง Telegram
 */
export async function sendToolReturnAlert(loan: SpareLoan): Promise<boolean> {
  const settings = getTelegramSettings();
  if (!settings.enabled || !settings.botToken || !settings.chatId) {
    return false;
  }

  const messageText = `
✅ <b>[แจ้งเตือนการคืน Spare / เครื่องมือ เข้าคลัง]</b>
━━━━━━━━━━━━━━━━━━━━━
🔧 <b>เครื่องมือ/Spare:</b> <code>[${loan.partId}]</code> ${loan.partName}
📍 <b>ส่งคืนจากไลน์:</b> ${loan.lineLocation}
👤 <b>ผู้รับคืนเข้าคลัง:</b> ${loan.receiverName || '-'}
⏰ <b>วันเวลาที่ส่งคืน:</b> ${loan.returnDate || '-'}
━━━━━━━━━━━━━━━━━━━━━
📝 <b>สภาพเครื่องมือ / หมายเหตุรับคืน:</b>
${loan.returnNote || 'สภาพปกติพร้อมใช้งานต่อ'}
  `.trim();

  try {
    return await sendTelegramMessage(settings.botToken, settings.chatId, messageText);
  } catch (error) {
    console.error('Error sending Telegram tool return alert:', error);
    return false;
  }
}

