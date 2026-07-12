import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { initAuth, googleSignIn, logout, setAccessToken } from './utils/auth';
import { 
  createNewInventorySpreadsheet, 
  fetchInventoryData, 
  fetchTransactionsData, 
  executeTransaction,
  addNewSparePart,
  ensureMaintenanceSheetsExist,
  fetchEquipmentData,
  fetchMaintenanceLogsData,
  addNewEquipment,
  addNewMaintenanceLog,
  updateSparePart
} from './utils/sheets';
import { SparePart, Transaction, Equipment, MaintenanceLog } from './types';
import { sendPartWithdrawAlert, getTelegramSettings, saveTelegramSettings, sendTelegramMessage } from './utils/telegram';

// คอมโพเนนต์โมดูล
import LoginView from './components/LoginView';
import SheetSelectView from './components/SheetSelectView';
import TransactionTab from './components/TransactionTab';
import InventoryTab from './components/InventoryTab';
import DashboardTab from './components/DashboardTab';
import AppsScriptExportTab from './components/AppsScriptExportTab';
import EquipmentTab from './components/EquipmentTab';
import MaintenanceTab from './components/MaintenanceTab';
import TelegramSettingsModal from './components/TelegramSettingsModal';

// ไอคอนและแอนิเมชัน
import { 
  Settings, 
  Layers, 
  ArrowRightLeft, 
  BarChart3, 
  Terminal, 
  LogOut, 
  ExternalLink, 
  RefreshCw, 
  AlertCircle,
  CheckCircle,
  FileSpreadsheet,
  Cpu,
  Wrench,
  Send,
  Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  // สถานะล็อกอินและเชื่อมต่อสเปรดชีต
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(null);
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string>('');
  const [isProcessingSheet, setIsProcessingSheet] = useState(false);

  // สถานะข้อมูล
  const [parts, setParts] = useState<SparePart[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  
  const [activeTab, setActiveTab] = useState<'transaction' | 'inventory' | 'equipment' | 'maintenance' | 'dashboard' | 'appsscript'>('transaction');
  
  // ย้ายส่งรหัสเบิกด่วน
  const [preSelectedPartId, setPreSelectedPartId] = useState<string | undefined>(undefined);

  // สถานะโหลดเดอร์และกล่องแจ้งเตือน
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSubmittingTx, setIsSubmittingTx] = useState(false);
  const [isSubmittingEq, setIsSubmittingEq] = useState(false);
  const [isSubmittingLog, setIsSubmittingLog] = useState(false);
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error'; title: string; desc: string; extraAlert?: string } | null>(null);
  
  // สถานะแจ้งเตือน Telegram
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [isTelegramEnabled, setIsTelegramEnabled] = useState(localStorage.getItem('telegram_enabled') === 'true');

  // 1. ตรวจสอบสถานะล็อกอินตั้งต้น
  useEffect(() => {
    // โหลดไอดีชีตที่เคยบันทึกไว้ในเบราว์เซอร์
    const savedSheetId = localStorage.getItem('spare_part_spreadsheet_id');
    const savedSheetUrl = localStorage.getItem('spare_part_spreadsheet_url') || '';
    if (savedSheetId) {
      setSpreadsheetId(savedSheetId);
      setSpreadsheetUrl(savedSheetUrl);
    }

    // เริ่มระบบติดตาม Auth
    initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
        setNeedsAuth(false);
        setAccessToken(accessToken); // ตั้งค่าแคช
        
        // ดึงข้อมูลคลังทันทีถ้ามีการเชื่อมโยงชีตแล้ว
        if (savedSheetId) {
          loadAllData(accessToken, savedSheetId);
        }
      },
      () => {
        setNeedsAuth(true);
      }
    );
  }, []);

  // 2. ฟังก์ชันล็อกอินด้วย Google Account
  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        setNeedsAuth(false);

        // ดึงข้อมูลหากมีชีตอยู่แล้ว
        const savedSheetId = localStorage.getItem('spare_part_spreadsheet_id');
        if (savedSheetId) {
          loadAllData(result.accessToken, savedSheetId);
        }
      }
    } catch (error: any) {
      console.error('Login error:', error);
      
      const errorCode = error?.code || '';
      const errorMessage = error?.message || '';
      
      if (errorCode === 'auth/unauthorized-domain' || errorMessage.includes('unauthorized-domain')) {
        const currentDomain = window.location.hostname;
        alert(
          `🔴 เข้าสู่ระบบล้มเหลว (โดเมนไม่ได้รับอนุญาต)\n\n` +
          `โดเมน "${currentDomain}" ยังไม่ถูกเพิ่มใน Authorized Domains ของ Firebase Authentication\n\n` +
          `วิธีแก้ไข:\n` +
          `1. เข้าไปที่ Firebase Console (https://console.firebase.google.com/)\n` +
          `2. ไปที่เมนู Authentication -> Settings -> Authorized domains\n` +
          `3. กด "Add domain" แล้วกรอก: ${currentDomain}\n` +
          `4. รอประมาณ 1-2 นาที แล้วรีเฟรชหน้าเว็บนี้เพื่อลองเข้าสู่ระบบอีกครั้ง`
        );
      } else {
        alert(`เข้าสู่ระบบล้มเหลว กรุณาลองใหม่อีกครั้ง\n\nรายละเอียดข้อผิดพลาด: ${errorMessage || error}`);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  // 3. ฟังก์ชันดึงข้อมูลสต็อกและประวัติจาก Google Sheets
  const loadAllData = async (accessToken: string, sheetId: string) => {
    setIsLoadingData(true);
    try {
      // ตรวจสอบและอัปเกรดแผ่นงานเพื่อรองรับเครื่องจักรและการซ่อมบำรุงแบบอัตโนมัติ
      await ensureMaintenanceSheetsExist(accessToken, sheetId);

      const inventory = await fetchInventoryData(accessToken, sheetId);
      setParts(inventory);

      const history = await fetchTransactionsData(accessToken, sheetId);
      setTransactions(history);

      const eqList = await fetchEquipmentData(accessToken, sheetId);
      setEquipments(eqList);

      const repairLogs = await fetchMaintenanceLogsData(accessToken, sheetId);
      setMaintenanceLogs(repairLogs);
    } catch (error: any) {
      console.error('Fetch data error:', error);
      // หากดึงล้มเหลว อาจเกิดจากสิทธิ์หมดอายุ หรือระบุไอดีสเปรดชีตผิดพลาด
      setAlertMessage({
        type: 'error',
        title: 'ดึงข้อมูลไม่สำเร็จ',
        desc: error.message || 'โปรดตรวจสอบชื่อ แผ่นงาน (Tabs) ในสเปรดชีตว่าสิทธิ์ถูกต้อง และชื่อแผ่นงานครอบคลุม Inventory, Transactions, Equipment, MaintenanceLogs'
      });
    } finally {
      setIsLoadingData(false);
    }
  };

  // 4. สร้างชีตใหม่แบบคลิกเดียว 3 วินาทีสำเร็จ (Auto-Setup Magic 🚀)
  const handleCreateNewSpreadsheet = async () => {
    if (!token) return;
    setIsProcessingSheet(true);
    try {
      const newSheet = await createNewInventorySpreadsheet(token);
      setSpreadsheetId(newSheet.id);
      setSpreadsheetUrl(newSheet.url);
      
      // บันทึกลงหน่วยความจำถาวรในเครื่อง
      localStorage.setItem('spare_part_spreadsheet_id', newSheet.id);
      localStorage.setItem('spare_part_spreadsheet_url', newSheet.url);

      // โหลดข้อมูลสต็อกที่สร้างเสร็จเข้าแอปพลิเคชัน
      await loadAllData(token, newSheet.id);
      
      setAlertMessage({
        type: 'success',
        title: 'สร้างและเชื่อมต่อฐานข้อมูลสำเร็จ!',
        desc: `สเปรดชีตใหม่ชื่อ "ระบบฐานข้อมูลอะไหล่..." ถูกสร้างในบัญชี Google Drive ของท่านเรียบร้อยแล้ว`
      });
    } catch (error: any) {
      console.error('Create spreadsheet error:', error);
      alert('สร้างสเปรดชีตไม่สำเร็จ: ' + error.message);
    } finally {
      setIsProcessingSheet(false);
    }
  };

  // 5. เชื่อมต่อสเปรดชีตเดิมด้วยไอดีหรือลิงก์
  const handleConnectExistingSpreadsheet = async (sheetId: string) => {
    if (!token) return;
    setIsProcessingSheet(true);
    try {
      // ทดลองดึงข้อมูลเพื่อดูว่าเชื่อมต่อได้จริงและตารางมีโครงสร้างถูกต้องหรือไม่
      await loadAllData(token, sheetId);
      
      setSpreadsheetId(sheetId);
      const url = `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;
      setSpreadsheetUrl(url);

      localStorage.setItem('spare_part_spreadsheet_id', sheetId);
      localStorage.setItem('spare_part_spreadsheet_url', url);

      setAlertMessage({
        type: 'success',
        title: 'เชื่อมต่อฐานข้อมูลชีตสำเร็จ!',
        desc: 'ดึงข้อมูลและอัปเกรดฐานข้อมูลเป็นเวอร์ชันล่าสุดเรียบร้อยแล้ว'
      });
    } catch (error) {
      console.error('Connect spreadsheet error:', error);
    } finally {
      setIsProcessingSheet(false);
    }
  };

  // 6. เปลี่ยนไฟล์ฐานข้อมูลสเปรดชีต
  const handleDisconnectSpreadsheet = () => {
    if (!window.confirm('ต้องการเปลี่ยนการเชื่อมต่อใช่หรือไม่? ข้อมูลประวัติการเบิกรับที่กำลังดำเนินการจะไม่สูญหาย เนื่องจากบันทึกไว้อย่างปลอดภัยบน Google Sheets')) return;
    
    setSpreadsheetId(null);
    setSpreadsheetUrl('');
    setParts([]);
    setTransactions([]);
    setEquipments([]);
    setMaintenanceLogs([]);
    localStorage.removeItem('spare_part_spreadsheet_id');
    localStorage.removeItem('spare_part_spreadsheet_url');
  };

  // 7. บันทึกรายการเบิก-รับอะไหล่
  const handleTransactionSubmit = async (data: {
    partId: string;
    type: 'เบิกจ่าย' | 'รับเข้า';
    quantity: number;
    technician: string;
    machineNote: string;
    equipmentId?: string;
  }) => {
    if (!token || !spreadsheetId) return;
    setIsSubmittingTx(true);
    try {
      if (data.type === 'เบิกจ่าย' && data.equipmentId) {
        // ค้นหาข้อมูลเครื่องจักรและอะไหล่ที่สัมพันธ์กันเพื่อความแม่นยำ
        const selectedEquipment = equipments.find(eq => eq.id === data.equipmentId);
        const selectedPart = parts.find(p => p.id === data.partId);

        if (!selectedEquipment) {
          throw new Error('ไม่พบข้อมูลเครื่องจักรที่เลือกในระบบฐานข้อมูล');
        }
        if (!selectedPart) {
          throw new Error('ไม่พบข้อมูลอะไหล่ที่ต้องการเบิกในระบบ');
        }

        const logData = {
          equipmentId: data.equipmentId,
          equipmentName: selectedEquipment.name,
          repairDetail: data.machineNote,
          partUsedId: data.partId,
          partQty: data.quantity,
          partCost: selectedPart.price,
          otherCost: 0,
          totalCost: selectedPart.price * data.quantity,
          technician: data.technician,
        };

        const result = await addNewMaintenanceLog(token, spreadsheetId, logData);

        if (result.success) {
          // 1. อัปเดตข้อมูลอะไหล่ใน Local State ทันที
          if (result.updatedPart) {
            const updated = result.updatedPart;
            setParts(prev => prev.map(p => p.id === updated.id ? updated : p));
          }

          // 2. เติมรายการประวัติการเบิกใน Local State
          const newTx: Transaction = {
            timestamp: result.newLog.date,
            partId: data.partId,
            partName: selectedPart.name,
            type: 'เบิกจ่าย',
            quantity: data.quantity,
            technician: data.technician,
            machineNote: `🔧 ซ่อมเครื่องจักร: ${selectedEquipment.name} (${data.machineNote})`
          };
          setTransactions(prev => [newTx, ...prev]);

          // 3. เพิ่มรายการในประวัติการซ่อมบำรุง
          setMaintenanceLogs(prev => [result.newLog, ...prev]);

          // ตรวจเช็คยอดสต็อกต่ำกว่าค่าความปลอดภัย Min Stock
          const newQty = result.updatedPart ? result.updatedPart.quantity : (selectedPart.quantity - data.quantity);
          const minStockLimit = result.updatedPart ? result.updatedPart.minStock : selectedPart.minStock;
          const isBelowMin = newQty < minStockLimit;

          // ส่งแจ้งเตือนผ่าน Telegram ทันทีเพื่อบันทึกประวัติและวิเคราะห์สต็อกวิกฤต
          sendPartWithdrawAlert(
            selectedPart,
            data.quantity,
            data.technician,
            data.machineNote,
            newQty,
            selectedEquipment.name
          ).catch(err => console.error('Telegram alert error:', err));

          setAlertMessage({
            type: 'success',
            title: '🔴 เบิกจ่าย & บันทึกงานซ่อมบำรุงเรียบร้อย!',
            desc: `ทำรายการเบิกอะไหล่ ${selectedPart.name} จำนวน ${data.quantity} ${selectedPart.unit} และบันทึกประวัติการซ่อมเข้ากับเครื่องจักร "${selectedEquipment.name}" เรียบร้อยแล้ว`,
            extraAlert: isBelowMin 
              ? `⚠️ สต็อกวิกฤต! อะไหล่สำรองชิ้นนี้คงเหลือต่ำกว่าเกณฑ์ควบคุมคุณภาพ (${newQty} < Min: ${minStockLimit}) ส่งเมลแจ้งเตือนผู้ควบคุมงานซ่อมบำรุงและฝ่ายพัสดุเรียบร้อย`
              : undefined
          });
        }
      } else {
        // รายการปกติแบบไม่ได้ลิงก์กับเครื่องจักรในระบบ
        const result = await executeTransaction(token, spreadsheetId, data);
        
        if (result.success) {
          // อัปเดตข้อมูลระดับท้องถิ่นทันทีเพื่อความรวดเร็วและเป็นมิตรต่อช่างเทคนิค
          setParts(prev => prev.map(p => p.id === data.partId ? result.updatedPart : p));
          
          // เติมประวัติในตารางย้อนหลัง
          const newTx: Transaction = {
            timestamp: new Date().toLocaleString('th-TH'),
            partId: data.partId,
            partName: result.updatedPart.name,
            type: data.type,
            quantity: data.quantity,
            technician: data.technician,
            machineNote: data.machineNote
          };
          setTransactions(prev => [newTx, ...prev]);

          // ตรวจเช็คต่ำกว่าค่าความปลอดภัย Min Stock
          const isBelowMin = result.newQty < result.updatedPart.minStock;

          // ส่งแจ้งเตือนผ่าน Telegram หากเป็นการเบิกจ่ายออก
          if (data.type === 'เบิกจ่าย') {
            sendPartWithdrawAlert(
              result.updatedPart,
              data.quantity,
              data.technician,
              data.machineNote,
              result.newQty
            ).catch(err => console.error('Telegram alert error:', err));
          }
          
          setAlertMessage({
            type: 'success',
            title: data.type === 'เบิกจ่าย' ? '🔴 เบิกจ่ายอะไหล่สำเร็จ!' : '🟢 รับเข้าคลังสำเร็จ!',
            desc: `ทำรายการ ${result.updatedPart.name} จำนวน ${data.quantity} ${result.updatedPart.unit} ยอดสต็อกใหม่ปรับเป็น ${result.newQty} ${result.updatedPart.unit}`,
            extraAlert: isBelowMin 
              ? `⚠️ สต็อกวิกฤต! อะไหล่สำรองชิ้นนี้คงเหลือต่ำกว่าเกณฑ์ควบคุมคุณภาพ (${result.newQty} < Min: ${result.updatedPart.minStock}) ส่งเมลแจ้งเตือนผู้คุมงานซ่อมบำรุงเรียบร้อย`
              : undefined
          });
        }
      }
    } catch (error: any) {
      console.error('Transaction submit error:', error);
      setAlertMessage({
        type: 'error',
        title: 'ไม่สามารถทำรายการได้',
        desc: error.message || 'เกิดข้อผิดพลาดในการปรับปรุงข้อมูลสเปรดชีต'
      });
    } finally {
      setIsSubmittingTx(false);
    }
  };

  // 7.5 เพิ่มอะไหล่ชิ้นใหม่ลงฐานข้อมูลคลัง
  const handleAddNewSparePart = async (partData: {
    id: string;
    name: string;
    category: string;
    location: string;
    quantity: number;
    unit: string;
    minStock: number;
    maxStock: number;
    price: number;
    imageUrl: string;
  }) => {
    if (!token || !spreadsheetId) return;
    setIsLoadingData(true);
    try {
      const result = await addNewSparePart(token, spreadsheetId, partData);
      if (result.success) {
        // อัปเดตในสถานะท้องถิ่นเพื่อให้แอปตอบสนองทันที
        setParts(prev => [...prev, result.newPart]);
        setAlertMessage({
          type: 'success',
          title: 'เพิ่มอะไหล่ใหม่สำเร็จ!',
          desc: `รหัสอะไหล่ "${result.newPart.id}" (${result.newPart.name}) มูลค่า ฿${result.newPart.price.toLocaleString()} ได้ถูกบันทึกลงในระบบคลัง Google Sheet เรียบร้อยแล้ว`,
        });
      }
    } catch (error: any) {
      console.error('Add new spare part error:', error);
      setAlertMessage({
        type: 'error',
        title: 'ไม่สามารถเพิ่มอะไหล่ใหม่ได้',
        desc: error.message || 'เกิดข้อผิดพลาดในการเขียนข้อมูลลงสเปรดชีต'
      });
    } finally {
      setIsLoadingData(false);
    }
  };

  // 7.5.5 แก้ไขข้อมูลอะไหล่ในคลังสินค้า
  const handleUpdateSparePart = async (partData: {
    id: string;
    name: string;
    category: string;
    location: string;
    quantity: number;
    unit: string;
    minStock: number;
    maxStock: number;
    price: number;
    imageUrl: string;
  }) => {
    if (!token || !spreadsheetId) return;
    setIsLoadingData(true);
    try {
      const result = await updateSparePart(token, spreadsheetId, partData);
      if (result.success) {
        // อัปเดตในสถานะท้องถิ่นเพื่อให้แอปตอบสนองทันที
        setParts(prev => prev.map(p => p.id === result.updatedPart.id ? result.updatedPart : p));
        setAlertMessage({
          type: 'success',
          title: 'แก้ไขข้อมูลอะไหล่สำเร็จ!',
          desc: `แก้ไขข้อมูลอะไหล่รหัส "${result.updatedPart.id}" (${result.updatedPart.name}) ในระบบคลัง Google Sheet เรียบร้อยแล้ว`,
        });
      }
    } catch (error: any) {
      console.error('Update spare part error:', error);
      setAlertMessage({
        type: 'error',
        title: 'ไม่สามารถแก้ไขข้อมูลอะไหล่ได้',
        desc: error.message || 'เกิดข้อผิดพลาดในการเขียนข้อมูลลงสเปรดชีต'
      });
    } finally {
      setIsLoadingData(false);
    }
  };

  // 7.6 เพิ่มเครื่องจักร/อุปกรณ์ใหม่
  const handleAddNewEquipment = async (eqData: {
    id: string;
    name: string;
    location: string;
    purchasePrice: number;
    maxRepairBudget: number;
    purchaseDate: string;
  }) => {
    if (!token || !spreadsheetId) return;
    setIsSubmittingEq(true);
    try {
      const result = await addNewEquipment(token, spreadsheetId, eqData);
      if (result.success) {
        setEquipments(prev => [...prev, result.newEquipment]);
        setAlertMessage({
          type: 'success',
          title: 'ลงทะเบียนเครื่องจักรสำเร็จ!',
          desc: `รหัสเครื่องจักร "${result.newEquipment.id}" (${result.newEquipment.name}) ได้รับการจัดเก็บลงชีตเรียบร้อยแล้ว`,
        });
      }
    } catch (error: any) {
      console.error('Add equipment error:', error);
      setAlertMessage({
        type: 'error',
        title: 'ไม่สามารถเพิ่มเครื่องจักรใหม่ได้',
        desc: error.message || 'เกิดข้อผิดพลาดในการติดต่อ Google Sheets'
      });
    } finally {
      setIsSubmittingEq(false);
    }
  };

  // 7.7 เพิ่มประวัติงานซ่อมบำรุง
  const handleAddNewMaintenanceLog = async (logData: {
    equipmentId: string;
    equipmentName: string;
    repairDetail: string;
    partUsedId: string;
    partQty: number;
    partCost: number;
    otherCost: number;
    totalCost: number;
    technician: string;
  }) => {
    if (!token || !spreadsheetId) return;
    setIsSubmittingLog(true);
    try {
      const result = await addNewMaintenanceLog(token, spreadsheetId, logData);
      if (result.success) {
        // อัปเดตข้อมูลประวัติในแอป
        setMaintenanceLogs(prev => [result.newLog, ...prev]);

        // หากมีการใช้อะไหล่และตัดยอดสำเร็จ ให้ปรับสถานะอะไหล่ในแอปทันทีเพื่อความสอดคล้อง (Consistency)
        if (logData.partUsedId && logData.partQty > 0) {
          setParts(prev => prev.map(p => {
            if (p.id === logData.partUsedId) {
              return {
                ...p,
                quantity: Math.max(0, p.quantity - logData.partQty)
              };
            }
            return p;
          }));
        }

        setAlertMessage({
          type: 'success',
          title: 'บันทึกประวัติการซ่อมสำเร็จ!',
          desc: `งานซ่อมแซมสำหรับเครื่อง "${logData.equipmentName}" ได้รับการบันทึกประวัติแล้ว รวมมูลค่าใช้จ่าย ฿${logData.totalCost.toLocaleString()}`,
        });
        
        // โหลดข้อมูลล่าสุดเพื่อความมั่นใจในความถูกต้อง
        loadAllData(token, spreadsheetId);
      }
    } catch (error: any) {
      console.error('Add maintenance log error:', error);
      setAlertMessage({
        type: 'error',
        title: 'ไม่สามารถบันทึกงานซ่อมได้',
        desc: error.message || 'เกิดข้อผิดพลาดในการอัปเดตสเปรดชีต'
      });
    } finally {
      setIsSubmittingLog(false);
    }
  };

  // 8. ลัดเปลี่ยนแท็บเบิกจ่ายด่วนจากหน้ารวมยอด
  const handleQuickWithdrawAction = (partId: string) => {
    setPreSelectedPartId(partId);
    setActiveTab('transaction');
  };

  // 9. ล็อกเอาท์
  const handleLogout = async () => {
    if (!window.confirm('โปรดยืนยันการออกจากระบบ แฟ้มข้อมูล Google Sheet จะถูกปิดอย่างปลอดภัย')) return;
    await logout();
    setUser(null);
    setToken(null);
    setNeedsAuth(true);
    setSpreadsheetId(null);
    setParts([]);
    setTransactions([]);
    setEquipments([]);
    setMaintenanceLogs([]);
  };

  // แสดงผลหน้าล็อกอินหากยังไม่ตรวจสอบสิทธิ์ผ่าน
  if (needsAuth) {
    return <LoginView onLogin={handleLogin} isLoggingIn={isLoggingIn} />;
  }

  // แสดงผลหน้าจอนำเข้าเลือก Spreadsheet หากยังไม่ทำการเชื่อมโยง
  if (!spreadsheetId) {
    return (
      <SheetSelectView 
        onConnect={handleConnectExistingSpreadsheet}
        onCreateNew={handleCreateNewSpreadsheet}
        isProcessing={isProcessingSheet}
        userEmail={user?.email || ''}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans pb-16">
      {/* 1. Header แถบควบคุมบนสุด */}
      <nav className="bg-slate-900 border-b-4 border-blue-500 text-white py-4 px-4 sm:px-8 sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-blue-500 rounded-lg flex items-center justify-center shadow-md shadow-blue-500/20">
              <Settings className="h-5 w-5 text-slate-950 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold tracking-tight uppercase">ระบบควบคุมอะไหล่และงานซ่อม (Spare Part & Repairs)</h1>
              <p className="text-xs text-blue-300 font-sans mt-0.5 flex items-center gap-1">
                <span>เชื่อมต่อฐานข้อมูลสำเร็จ:</span>
                <a 
                  href={spreadsheetUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-emerald-400 hover:text-emerald-300 underline font-mono flex items-center gap-0.5"
                >
                  เปิดชีต <ExternalLink className="h-3 w-3 inline" />
                </a>
              </p>
            </div>
          </div>

          {/* สแกนข้อมูลผู้ใช้และปุ่มกระทำ */}
          <div className="flex items-center gap-3 text-xs">
            <div className="text-right hidden sm:block">
              <p className="font-bold text-slate-200">{user?.displayName || 'ช่างเทคนิคโรงงาน'}</p>
              <p className="text-[10px] text-green-400">● เชื่อมต่อกับ Google Sheets แล้ว</p>
            </div>

            <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-xs font-bold text-slate-200 uppercase">
              {user?.displayName ? user.displayName.slice(0, 2) : 'SC'}
            </div>
            
            <button
              onClick={() => loadAllData(token!, spreadsheetId)}
              disabled={isLoadingData}
              className="px-3 py-2 bg-slate-800 border border-slate-700 hover:bg-slate-700 rounded-lg text-slate-200 font-semibold transition-all flex items-center gap-1 cursor-pointer"
              title="อัปเดตข้อมูลแบบเรียลไทม์"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoadingData ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">อัปเดตคลัง</span>
            </button>

            <button
              onClick={() => setShowTelegramModal(true)}
              className="px-3 py-2 bg-slate-800 border border-slate-700 hover:bg-slate-700 rounded-lg text-slate-200 font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
              title="ตั้งค่าการแจ้งเตือนผ่าน Telegram"
            >
              <Send className="h-3.5 w-3.5 text-sky-400 fill-sky-400/20" />
              <span className="hidden md:inline">ตั้งค่า Telegram</span>
              <span className={`h-2 w-2 rounded-full ${isTelegramEnabled ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-slate-500'}`} />
            </button>

            <button
              onClick={handleDisconnectSpreadsheet}
              className="px-3 py-2 bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:border-blue-600 hover:text-blue-400 rounded-lg text-slate-300 font-semibold transition-all flex items-center gap-1 cursor-pointer"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span className="hidden md:inline">เปลี่ยนฐานข้อมูล</span>
            </button>

            <button
              onClick={handleLogout}
              className="px-3 py-2 bg-slate-800 border border-slate-700 hover:bg-red-950 hover:border-red-800 hover:text-red-400 rounded-lg text-slate-300 font-semibold transition-all flex items-center gap-1 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden md:inline">ออกจากระบบ</span>
            </button>
          </div>
        </div>
      </nav>

      {/* 2. เมนูกดเปลี่ยนแท็บสไตล์ Professional Polish */}
      <div className="bg-white border-b border-slate-200 sticky top-[72px] sm:top-[68px] z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="flex gap-2 sm:gap-6 overflow-x-auto text-sm font-bold scrollbar-none">
            <button
              onClick={() => setActiveTab('transaction')}
              className={`px-4 sm:px-6 py-4 border-b-4 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'transaction' 
                  ? 'text-blue-600 border-blue-600 font-bold' 
                  : 'text-slate-500 border-transparent hover:border-slate-300 font-medium'
              }`}
            >
              <ArrowRightLeft className="h-4 w-4 shrink-0" />
              <span>เบิกและรับอะไหล่</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('inventory');
                loadAllData(token!, spreadsheetId);
              }}
              className={`px-4 sm:px-6 py-4 border-b-4 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'inventory' 
                  ? 'text-blue-600 border-blue-600 font-bold' 
                  : 'text-slate-500 border-transparent hover:border-slate-300 font-medium'
              }`}
            >
              <Layers className="h-4 w-4 shrink-0" />
              <span>เช็คยอดคงเหลือ</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('equipment');
                loadAllData(token!, spreadsheetId);
              }}
              className={`px-4 sm:px-6 py-4 border-b-4 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'equipment' 
                  ? 'text-blue-600 border-blue-600 font-bold' 
                  : 'text-slate-500 border-transparent hover:border-slate-300 font-medium'
              }`}
            >
              <Cpu className="h-4 w-4 shrink-0" />
              <span>เครื่องจักร/อุปกรณ์</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('maintenance');
                loadAllData(token!, spreadsheetId);
              }}
              className={`px-4 sm:px-6 py-4 border-b-4 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'maintenance' 
                  ? 'text-blue-600 border-blue-600 font-bold' 
                  : 'text-slate-500 border-transparent hover:border-slate-300 font-medium'
              }`}
            >
              <Wrench className="h-4 w-4 shrink-0" />
              <span>งานซ่อมบำรุง</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('dashboard');
                loadAllData(token!, spreadsheetId);
              }}
              className={`px-4 sm:px-6 py-4 border-b-4 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'dashboard' 
                  ? 'text-blue-600 border-blue-600 font-bold' 
                  : 'text-slate-500 border-transparent hover:border-slate-300 font-medium'
              }`}
            >
              <BarChart3 className="h-4 w-4 shrink-0" />
              <span>แดชบอร์ดสรุปยอด</span>
            </button>

            <button
              onClick={() => setActiveTab('appsscript')}
              className={`px-4 sm:px-6 py-4 border-b-4 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'appsscript' 
                  ? 'text-blue-600 border-blue-600 font-bold' 
                  : 'text-slate-500 border-transparent hover:border-slate-300 font-medium'
              }`}
            >
              <Terminal className="h-4 w-4 shrink-0" />
              <span>คู่มือติดตั้ง GAS</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. ส่วนเนื้อหาการประมวลผล */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
            className="w-full"
          >
            {activeTab === 'transaction' && (
              <TransactionTab 
                parts={parts} 
                equipments={equipments}
                onSubmit={handleTransactionSubmit} 
                isSubmitting={isSubmittingTx}
                preSelectedPartId={preSelectedPartId}
                onResetPreSelected={() => setPreSelectedPartId(undefined)}
              />
            )}

            {activeTab === 'inventory' && (
              <InventoryTab 
                parts={parts} 
                onQuickAction={handleQuickWithdrawAction}
                onRefresh={() => loadAllData(token!, spreadsheetId)}
                isRefreshing={isLoadingData}
                onAddPart={handleAddNewSparePart}
                onUpdatePart={handleUpdateSparePart}
              />
            )}

            {activeTab === 'equipment' && (
              <EquipmentTab 
                equipments={equipments}
                onAddEquipment={handleAddNewEquipment}
                isSubmitting={isSubmittingEq}
              />
            )}

            {activeTab === 'maintenance' && (
              <MaintenanceTab 
                equipments={equipments}
                maintenanceLogs={maintenanceLogs}
                parts={parts}
                onAddMaintenanceLog={handleAddNewMaintenanceLog}
                isSubmitting={isSubmittingLog}
              />
            )}

            {activeTab === 'dashboard' && (
              <DashboardTab 
                parts={parts} 
                transactions={transactions}
                onQuickAction={handleQuickWithdrawAction}
                equipments={equipments}
                maintenanceLogs={maintenanceLogs}
              />
            )}

            {activeTab === 'appsscript' && (
              <AppsScriptExportTab />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* 4. กล่องป๊อปอัปแจ้งผลการกระทำ (Success / Error Alert Dialog) */}
      {alertMessage && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-100 flex flex-col text-center">
            <div className="mx-auto mb-4">
              {alertMessage.type === 'success' ? (
                <div className="h-14 w-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center shadow-inner">
                  <CheckCircle className="h-8 w-8 stroke-[2]" />
                </div>
              ) : (
                <div className="h-14 w-14 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center shadow-inner animate-bounce">
                  <AlertCircle className="h-8 w-8 stroke-[2]" />
                </div>
              )}
            </div>
            
            <h3 className={`text-lg font-bold font-display ${alertMessage.type === 'success' ? 'text-emerald-950' : 'text-rose-950'}`}>
              {alertMessage.title}
            </h3>
            <p className="mt-2 text-sm text-slate-600 font-sans leading-relaxed">
              {alertMessage.desc}
            </p>

            {/* ส่วนแจ้งสต็อกต่ำพิเศษ (ถ้ามี) */}
            {alertMessage.extraAlert && (
              <div className="mt-4 p-3 bg-amber-50 text-amber-900 text-xs text-left rounded-xl border border-amber-100 leading-relaxed font-semibold">
                {alertMessage.extraAlert}
              </div>
            )}

            <button
              onClick={() => setAlertMessage(null)}
              className="mt-6 w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-sm transition-all cursor-pointer font-sans"
            >
              ตกลง
            </button>
          </div>
        </div>
      )}

      {/* 5. หน้าต่างตั้งค่าระบบการแจ้งเตือนพัสดุผ่าน Telegram */}
      <TelegramSettingsModal
        isOpen={showTelegramModal}
        onClose={() => setShowTelegramModal(false)}
        onSave={(enabled) => setIsTelegramEnabled(enabled)}
      />
    </div>
  );
}
