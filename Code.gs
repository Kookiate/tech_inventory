/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Google Apps Script - ระบบควบคุมสต็อกและประวัติการเบิก-รับอะไหล่ (Spare Part Control)
 * สำหรับโรงงานผลิต (Manufacturing Systems)
 * 
 * ผู้พัฒนา: Manufacturing Systems Developer
 * เชื่อมต่อ 2 ชีตหลัก: 
 * 1. "Inventory" (สต็อกคงเหลือ)
 * 2. "Transactions" (ประวัติการใช้งาน)
 */

// 1. ฟังก์ชันเปิดหน้าเว็บแอปพลิเคชัน
function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setTitle('ระบบควบคุมอะไหล่ - Spare Part Control')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ฟังก์ชันดึงลิงก์รวมไฟล์ CSS/JS หรือ include หน้าอื่น (ถ้าแยกไฟล์)
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// 2. ฟังก์ชันดึงข้อมูลทั้งหมดจากชีต Inventory
function getInventoryData() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Inventory");
    if (!sheet) {
      throw new Error("ไม่พบชีตชื่อ 'Inventory' กรุณาสร้างชีตนี้ก่อนเริ่มใช้งาน");
    }
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return []; // ไม่มีข้อมูลนอกจากหัวตาราง
    
    const headers = data[0];
    const jsonResult = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      // คอลัมน์ [รหัสอะไหล่, ชื่ออะไหล่, หมวดหมู่, ตำแหน่งจัดเก็บ, คงเหลือ, หน่วยนับ, Min_Stock, Max_Stock]
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
      
      if (part.id) { // ตรวจสอบว่ามีรหัสอะไหล่
        jsonResult.push(part);
      }
    }
    return jsonResult;
  } catch (error) {
    Logger.log("เกิดข้อผิดพลาดในการดึงข้อมูลสต็อก: " + error.toString());
    throw new Error("ดึงข้อมูลสต็อกล้มเหลว: " + error.message);
  }
}

// 3. ฟังก์ชันบันทึกประวัติและปรับปรุงยอดคงเหลือในคลัง
function saveNewTransaction(data) {
  const lock = LockService.getScriptLock();
  try {
    // ใช้ Lock เพื่อป้องกันการบันทึกข้อมูลพร้อมกันแล้วจำนวนสต็อกเพี้ยน (Concurrency Control)
    lock.waitLock(10000); // รอสูงสุด 10 วินาที
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const invSheet = ss.getSheetByName("Inventory");
    const txSheet = ss.getSheetByName("Transactions");
    
    if (!invSheet || !txSheet) {
      throw new Error("ไม่พบชีต 'Inventory' หรือ 'Transactions' กรุณาตรวจสอบโครงสร้างชีต");
    }
    
    const partId = String(data.partId).trim();
    const type = data.type; // 'เบิกจ่าย' หรือ 'รับเข้า'
    const qtyToChange = Number(data.quantity);
    
    if (!partId) throw new Error("ไม่ระบุรหัสอะไหล่");
    if (isNaN(qtyToChange) || qtyToChange <= 0) throw new Error("จำนวนระบุไม่ถูกต้อง ต้องมากกว่า 0");
    if (type !== 'เบิกจ่าย' && type !== 'รับเข้า') throw new Error("ประเภทรายการไม่ถูกต้อง");
    
    // ค้นหาตำแหน่งแถวของอะไหล่ในชีต Inventory
    const invData = invSheet.getDataRange().getValues();
    let rowIndex = -1;
    let currentQty = 0;
    let partName = "";
    let minStock = 0;
    let unit = "";
    
    for (let i = 1; i < invData.length; i++) {
      if (String(invData[i][0]).trim() === partId) {
        rowIndex = i + 1; // ออฟเซ็ตสำหรับ Google Sheet แถวเริ่มที่ 1 และแถวหัวข้อคือ 1
        partName = String(invData[i][1]);
        currentQty = Number(invData[i][4]) || 0;
        unit = String(invData[i][5]);
        minStock = Number(invData[i][6]) || 0;
        break;
      }
    }
    
    if (rowIndex === -1) {
      throw new Error("ไม่พบรหัสอะไหล่: " + partId + " ในคลังสินค้า");
    }
    
    // คำนวณยอดใหม่
    let newQty = currentQty;
    if (type === 'เบิกจ่าย') {
      if (currentQty < qtyToChange) {
        throw new Error("สต็อกไม่เพียงพอ! ปัจจุบันมีเหลือ " + currentQty + " " + unit + " แต่ช่างขอเบิก " + qtyToChange + " " + unit);
      }
      newQty = currentQty - qtyToChange;
    } else if (type === 'รับเข้า') {
      newQty = currentQty + qtyToChange;
    }
    
    // บันทึกประวัติการทำรายการใน Transactions
    // คอลัมน์ [วันเวลา, รหัสอะไหล่, ชื่ออะไหล่, ประเภท, จำนวน, ชื่อช่าง, หมายเหตุ_เครื่องจักร]
    const timestamp = new Date();
    txSheet.appendRow([
      timestamp,
      partId,
      partName,
      type,
      qtyToChange,
      data.technician,
      data.machineNote || ""
    ]);
    
    // อัปเดตสต็อกคงเหลือในชีต Inventory (คอลัมน์ E คือ คอลัมน์ที่ 5 แถวที่พบ)
    invSheet.getRange(rowIndex, 5).setValue(newQty);
    
    // ปลดล็อกข้อมูล
    lock.releaseLock();
    
    // 4. ตรวจสอบเงื่อนไขสต็อกต่ำกว่าค่า Min_Stock เพื่อแจ้งเตือนผู้ดูแลรักษา
    const isBelowMin = newQty < minStock;
    let notificationSent = false;
    let alertDetails = "";
    
    if (isBelowMin) {
      const details = {
        id: partId,
        name: partName,
        currentQty: newQty,
        minStock: minStock,
        unit: unit,
        technician: data.technician,
        type: type,
        qtyChanged: qtyToChange
      };
      
      notificationSent = sendLowStockNotification(details);
      alertDetails = `⚠️ อะไหล่ต่ำกว่าเกณฑ์ขั้นต่ำ! คงเหลือเพียง ${newQty} ${unit} (ค่าวิกฤต Min: ${minStock} ${unit})`;
    }
    
    return {
      success: true,
      partId: partId,
      partName: partName,
      oldQty: currentQty,
      newQty: newQty,
      unit: unit,
      isBelowMin: isBelowMin,
      notificationSent: notificationSent,
      alertDetails: alertDetails,
      message: "บันทึกข้อมูลเรียบร้อยแล้ว!"
    };
    
  } catch (error) {
    if (lock.hasLock()) lock.releaseLock();
    Logger.log("เกิดข้อผิดพลาดในการบันทึกรายการ: " + error.toString());
    throw new Error("บันทึกข้อมูลล้มเหลว: " + error.message);
  }
}

/**
 * 4. ฟังก์ชันส่งข้อความภาษาไทยแจ้งเตือนผู้รับผิดชอบเมื่อสต็อกต่ำกว่า Min_Stock
 * ส่งแจ้งเตือนผ่าน Gmail (ฟรีใน Apps Script) และมีโค้ดแนะนำสำหรับ LINE Notify
 */
function sendLowStockNotification(part) {
  try {
    const recipientEmail = Session.getActiveUser().getEmail(); // ส่งหาอีเมลผู้ใช้งานปัจจุบัน หรือเปลี่ยนเป็นอีเมลหัวหน้าแผนก เช่น 'admin@factory.com'
    const subject = `[แจ้งเตือนด่วน] อะไหล่สำรองวิกฤตต่ำกว่าเกณฑ์: ${part.name} (${part.id})`;
    
    const htmlBody = `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; border: 1px solid #ffccd5; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        <div style="background-color: #dc3545; color: white; padding: 15px 20px; font-size: 18px; font-weight: bold;">
          🚨 รายงานอะไหล่ต่ำกว่าจุดสั่งซื้อขั้นต่ำ (Critical Low Stock Warning)
        </div>
        <div style="padding: 20px; background-color: #fffafb; color: #333; line-height: 1.6;">
          <p style="font-size: 16px; margin-top: 0;">เรียน หัวหน้าแผนกซ่อมบำรุง / ผู้ควบคุมคลังอะไหล่,</p>
          <p>ระบบตรวจพบรายการอะไหล่ในสายการผลิต <strong>ต่ำกว่าจุดสั่งซื้อวิกฤต (Min Stock)</strong> หลังจากการทำรายการล่าสุด รายละเอียดดังนี้:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0; background-color: #ffffff;">
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px 12px; font-weight: bold; width: 35%; color: #555;">รหัสอะไหล่:</td>
              <td style="padding: 8px 12px; color: #dc3545; font-family: monospace; font-weight: bold; font-size: 15px;">${part.id}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px 12px; font-weight: bold; color: #555;">ชื่ออะไหล่:</td>
              <td style="padding: 8px 12px; font-weight: bold;">${part.name}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px 12px; font-weight: bold; color: #555;">จำนวนคงเหลือล่าสุด:</td>
              <td style="padding: 8px 12px; font-weight: bold; font-size: 18px; color: #ff0000; background-color: #fff0f2;">${part.currentQty} ${part.unit}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px 12px; font-weight: bold; color: #555;">จุดสั่งซื้อขั้นต่ำ (Min):</td>
              <td style="padding: 8px 12px; color: #666;">${part.minStock} ${part.unit}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px 12px; font-weight: bold; color: #555;">รายการล่าสุด:</td>
              <td style="padding: 8px 12px;">${part.type} (${part.qtyChanged} ${part.unit}) โดยช่าง <strong>${part.technician}</strong></td>
            </tr>
          </table>
          
          <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; border-radius: 4px; margin: 15px 0; color: #856404;">
            <strong>คำแนะนำในการทำงาน:</strong> กรุณาดำเนินการเปิดเอกสารใบขอสั่งซื้อ (Purchase Requisition - PR) เพื่อจัดหาอะไหล่ชิ้นนี้ทดแทนในคลังโดยด่วนเพื่อไม่ให้กระทบต่ออัตราการหยุดทำงานของเครื่องจักร (Machine Downtime)
          </div>
          
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 11px; color: #888; text-align: center; margin-bottom: 0;">
            ข้อความนี้ส่งโดยระบบอัตโนมัติ Spare Part Control Web Application - Apps Script Database Connection
          </p>
        </div>
      </div>
    `;
    
    // ส่งอีเมล
    if (recipientEmail && recipientEmail.indexOf('@') !== -1) {
      MailApp.sendEmail({
        to: recipientEmail,
        subject: subject,
        htmlBody: htmlBody
      });
      Logger.log("ส่งเมลเตือนสต็อกต่ำเรียบร้อยแล้วส่งหา: " + recipientEmail);
    }
    
    // ==========================================
    // สำหรับผู้นำไปประยุกต์ใช้: ส่ง LINE Notify ด้วยโค้ดด้านล่างนี้
    // ==========================================
    /*
    const lineToken = "กรอก_LINE_NOTIFY_TOKEN_ตรงนี้";
    if (lineToken !== "กรอก_LINE_NOTIFY_TOKEN_ตรงนี้") {
      const message = `\n🚨 [แจ้งเตือนอะไหล่ต่ำกว่าเกณฑ์]\nรหัส: ${part.id}\nชื่อ: ${part.name}\nคงเหลือวิกฤต: ${part.currentQty} ${part.unit} (Min: ${part.minStock})\nทำรายการล่าสุด: ${part.type} โดยช่าง ${part.technician}\n⚠️ โปรดจัดซื้อโดยด่วน!`;
      
      const options = {
        "method": "post",
        "headers": {
          "Authorization": "Bearer " + lineToken
        },
        "payload": {
          "message": message
        }
      };
      UrlFetchApp.fetch("https://notify-api.line.me/api/notify", options);
      Logger.log("ส่ง LINE Notify สำเร็จ");
    }
    */
    
    return true;
  } catch (err) {
    Logger.log("ส่งข้อความเตือนผิดพลาด: " + err.toString());
    return false; // ไม่ให้ระบบทั้งหมดพังเนื่องจากส่งข้อความไม่ผ่าน
  }
}
