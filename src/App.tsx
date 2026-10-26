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
  updateSparePart,
  updateEquipment,
  updateMaintenanceLog,
  ensureAuthorizedUsersSheetExist,
  fetchAuthorizedUsers,
  fetchToolLoansData,
  addNewToolLoan,
  returnToolLoan,
  ensurePMInspectionsSheetExist,
  fetchPMInspectionsData
} from './utils/sheets';
import { mergeRemoteInspectionRecords } from './utils/inspectionStorage';
import { SparePart, Transaction, Equipment, MaintenanceLog, SpareLoan } from './types';
import { sendPartWithdrawAlert, sendPartRestockAlert, getTelegramSettings, saveTelegramSettings, sendTelegramMessage, sendToolLoanAlert, sendToolReturnAlert } from './utils/telegram';

// คอมโพเนนต์โมดูล
import LoginView from './components/LoginView';
import SheetSelectView from './components/SheetSelectView';
import TransactionTab from './components/TransactionTab';
import InventoryTab from './components/InventoryTab';
import DashboardTab from './components/DashboardTab';
import AppsScriptExportTab from './components/AppsScriptExportTab';
import EquipmentTab from './components/EquipmentTab';
import MaintenanceTab from './components/MaintenanceTab';
import ToolLoanTab from './components/ToolLoanTab';
import InspectionTab from './components/InspectionTab';
import TelegramSettingsModal from './components/TelegramSettingsModal';
import UnauthorizedView from './components/UnauthorizedView';
import PermissionsTab from './components/PermissionsTab';

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
  Bell,
  Shield,
  Repeat,
  ClipboardCheck
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

  // สถานะการตรวจสอบสิทธิ์ความปลอดภัย (Authorization)
  const [isVerifyingAuth, setIsVerifyingAuth] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // สถานะข้อมูล
  const [parts, setParts] = useState<SparePart[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [loans, setLoans] = useState<SpareLoan[]>([]);
  
  const [activeTab, setActiveTab] = useState<'transaction' | 'inventory' | 'equipment' | 'inspection' | 'maintenance' | 'loans' | 'dashboard' | 'appsscript' | 'permissions'>('transaction');
  
  // ย้ายส่งรหัสเบิกด่วน และรหัสเครื่องตรวจเช็ค PM ด่วน
  const [preSelectedPartId, setPreSelectedPartId] = useState<string | undefined>(undefined);
  const [preSelectedInspectionEqId, setPreSelectedInspectionEqId] = useState<string | undefined>(undefined);

  // สถานะโหลดเดอร์และกล่องแจ้งเตือน
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSubmittingTx, setIsSubmittingTx] = useState(false);
  const [isSubmittingEq, setIsSubmittingEq] = useState(false);
  const [isSubmittingLog, setIsSubmittingLog] = useState(false);
  const [isSubmittingLoan, setIsSubmittingLoan] = useState(false);
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error'; title: string; desc: string; extraAlert?: string } | null>(null);
  
  // สถานะแจ้งเตือน Telegram
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [isTelegramEnabled, setIsTelegramEnabled] = useState(localStorage.getItem('telegram_enabled') === 'true');

  // ฟังก์ชันตรวจสอบสิทธิ์ผู้ใช้จากแผ่นงาน AuthorizedUsers
  const verifyUser = async (currentUser: User, accessToken: string, sheetId: string): Promise<boolean> => {
    setIsVerifyingAuth(true);
    setAuthError(null);
    try {
      const email = currentUser.email;
      if (!email) {
        setAuthError('ไม่พบบัญชีอีเมลของคุณในข้อมูลโปรไฟล์ Google');
        setIsVerifyingAuth(false);
        return false;
      }
      
      // ดึงสิทธิ์ผู้ใช้ และตรวจสอบว่ามีอีเมลนี้หรือไม่
      // ถ้าหากยังไม่มีชีต ระบบจะทำการสร้างและเพิ่มอีเมลปัจจุบันลงไปให้เป็นผู้สร้างโดยอัตโนมัติเพื่อความปลอดภัยไม่ให้ล็อกตัวเองออก
      const list = await fetchAuthorizedUsers(accessToken, sheetId, email);
      const isAllowed = list.some(u => u.email.trim().toLowerCase() === email.trim().toLowerCase());
      
      if (!isAllowed) {
        setAuthError(`ขออภัย อีเมลของคุณ "${email}" ยังไม่ได้รับสิทธิ์ให้เข้าใช้งานระบบฐานข้อมูลนี้ กรุณาติดต่อผู้ควบคุมระบบเพื่อเพิ่มอีเมลนี้ลงในแผ่นงาน "AuthorizedUsers" ของ Google Sheets`);
        setIsVerifyingAuth(false);
        return false;
      }
      
      setIsVerifyingAuth(false);
      return true;
    } catch (error: any) {
      console.error('Verify user error:', error);
      // หากเข้าไม่ถึงสเปรดชีต (เช่น ไม่มีสิทธิ์เปิดใน Google Drive)
      setAuthError(`คุณไม่มีสิทธิ์เข้าถึงสเปรดชีตนี้ หรือสิทธิ์ใช้งานของคุณหมดอายุ\nกรุณาติดต่อเจ้าของระบบ หรือลงชื่อเข้าใช้งานด้วยบัญชี Google ที่ได้รับสิทธิ์แชร์ไฟล์สเปรดชีตนี้`);
      setIsVerifyingAuth(false);
      return false;
    }
  };

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
      async (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
        setNeedsAuth(false);
        setAccessToken(accessToken); // ตั้งค่าแคช
        
        // ดึงข้อมูลคลังทันทีถ้ามีการเชื่อมโยงชีตแล้ว
        if (savedSheetId) {
          const isAllowed = await verifyUser(currentUser, accessToken, savedSheetId);
          if (isAllowed) {
            loadAllData(accessToken, savedSheetId);
          }
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
          const isAllowed = await verifyUser(result.user, result.accessToken, savedSheetId);
          if (isAllowed) {
            loadAllData(result.accessToken, savedSheetId);
          }
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

      const toolLoans = await fetchToolLoansData(accessToken, sheetId);
      setLoans(toolLoans);

      // โหลดและซิงค์ข้อมูล PM Inspection
      await ensurePMInspectionsSheetExist(accessToken, sheetId);
      const remoteInspections = await fetchPMInspectionsData(accessToken, sheetId);
      if (remoteInspections && remoteInspections.length > 0) {
        mergeRemoteInspectionRecords(remoteInspections);
      }
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
      const newSheet = await createNewInventorySpreadsheet(token, user?.email || undefined);
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
    if (!token || !user) return;
    setIsProcessingSheet(true);
    try {
      // ตรวจสอบสิทธิ์ว่าอีเมลนี้ถูกอนุญาตในชีตนี้หรือไม่
      const isAllowed = await verifyUser(user, token, sheetId);
      if (!isAllowed) {
        setIsProcessingSheet(false);
        return;
      }

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

          // ส่งแจ้งเตือนผ่าน Telegram หากเป็นการเบิกจ่ายออก หรือรับเข้าคลัง
          if (data.type === 'เบิกจ่าย') {
            sendPartWithdrawAlert(
              result.updatedPart,
              data.quantity,
              data.technician,
              data.machineNote,
              result.newQty
            ).catch(err => console.error('Telegram alert error:', err));
          } else if (data.type === 'รับเข้า') {
            sendPartRestockAlert(
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
    assetCode?: string;
    name: string;
    location: string;
    purchasePrice: number;
    maxRepairBudget: number;
    purchaseDate: string;
    equipmentType?: 'Main' | 'Spare';
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

  // 7.6.5 แก้ไขข้อมูลเครื่องจักร/อุปกรณ์
  const handleUpdateEquipment = async (eqData: {
    id: string;
    assetCode?: string;
    name: string;
    location: string;
    purchasePrice: number;
    maxRepairBudget: number;
    purchaseDate: string;
    equipmentType?: 'Main' | 'Spare';
  }) => {
    if (!token || !spreadsheetId) return;
    setIsSubmittingEq(true);
    try {
      const result = await updateEquipment(token, spreadsheetId, eqData);
      if (result.success) {
        setEquipments(prev => prev.map(eq => eq.id === result.updatedEquipment.id ? result.updatedEquipment : eq));
        setAlertMessage({
          type: 'success',
          title: 'แก้ไขข้อมูลเครื่องจักรสำเร็จ!',
          desc: `แก้ไขรหัสเครื่องจักร "${result.updatedEquipment.id}" (${result.updatedEquipment.name}) เรียบร้อยแล้ว`,
        });
      }
    } catch (error: any) {
      console.error('Update equipment error:', error);
      setAlertMessage({
        type: 'error',
        title: 'ไม่สามารถแก้ไขข้อมูลเครื่องจักรได้',
        desc: error.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูลสเปรดชีต'
      });
      throw error;
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
    imageUrl?: string;
  }) => {
    if (!token || !spreadsheetId) return;
    setIsSubmittingLog(true);
    try {
      const result = await addNewMaintenanceLog(token, spreadsheetId, logData);
      if (result.success) {
        // อัปเดตข้อมูลประวัติในแอป
        setMaintenanceLogs(prev => [result.newLog, ...prev]);

        // หากมีการใช้อะไหล่และตัดยอดสำเร็จ ให้ปรับสถานะอะไหล่ในแอปและส่งแจ้งเตือน Telegram
        if (logData.partUsedId && logData.partQty > 0) {
          const targetPart = result.updatedPart || parts.find(p => p.id === logData.partUsedId);
          if (targetPart) {
            const newQty = result.updatedPart ? result.updatedPart.quantity : Math.max(0, targetPart.quantity - logData.partQty);
            const updatedPartObj: SparePart = { ...targetPart, quantity: newQty };

            // ส่งแจ้งเตือน Telegram สำหรับการเบิกอะไหล่ในการซ่อมบำรุง
            sendPartWithdrawAlert(
              updatedPartObj,
              logData.partQty,
              logData.technician,
              `งานซ่อมแซมเครื่องจักร: ${logData.repairDetail}`,
              newQty,
              logData.equipmentName
            ).catch(err => console.error('Telegram withdrawal alert error in maintenance log:', err));
          }

          setParts(prev => prev.map(p => {
            if (p.id === logData.partUsedId) {
              return {
                ...p,
                quantity: result.updatedPart ? result.updatedPart.quantity : Math.max(0, p.quantity - logData.partQty)
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

  // 7.7.5 แก้ไขข้อมูลประวัติงานซ่อมบำรุง
  const handleUpdateMaintenanceLog = async (
    oldLog: MaintenanceLog,
    newLogData: {
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
  ) => {
    if (!token || !spreadsheetId) return;
    setIsSubmittingLog(true);
    try {
      const result = await updateMaintenanceLog(token, spreadsheetId, oldLog, newLogData);
      if (result.success) {
        setMaintenanceLogs(prev => prev.map(log => 
          (log.date === oldLog.date && log.equipmentId === oldLog.equipmentId) ? result.updatedLog : log
        ));
        setAlertMessage({
          type: 'success',
          title: 'แก้ไขประวัติงานซ่อมสำเร็จ!',
          desc: `แก้ไขประวัติการซ่อมแซมของเครื่อง "${result.updatedLog.equipmentName}" เรียบร้อยแล้ว`,
        });
        loadAllData(token, spreadsheetId);
      }
    } catch (error: any) {
      console.error('Update maintenance log error:', error);
      setAlertMessage({
        type: 'error',
        title: 'ไม่สามารถแก้ไขประวัติงานซ่อมได้',
        desc: error.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูลสเปรดชีต'
      });
      throw error;
    } finally {
      setIsSubmittingLog(false);
    }
  };

  // 7.8 บันทึกการยืม Spare เครื่องมือใหม่
  const handleAddNewToolLoan = async (loanData: {
    partId: string;
    partName: string;
    lineLocation: string;
    borrowerName: string;
    quantity: number;
    purposeNote: string;
    expectedReturnDate: string;
  }) => {
    if (!token || !spreadsheetId) return;
    setIsSubmittingLoan(true);
    try {
      const result = await addNewToolLoan(token, spreadsheetId, loanData);
      if (result.success) {
        setLoans(prev => [result.newLoan, ...prev]);

        // ส่งแจ้งเตือน Telegram หากเปิดใช้งาน
        if (isTelegramEnabled) {
          sendToolLoanAlert(result.newLoan).catch(err => console.error('Telegram borrow alert error:', err));
        }

        setAlertMessage({
          type: 'success',
          title: '📍 บันทึกการยืม Spare เรียบร้อย!',
          desc: `บันทึกการยืม "${result.newLoan.partName}" นำไปใช้งานที่ "${result.newLoan.lineLocation}" โดยช่าง ${result.newLoan.borrowerName} เรียบร้อยแล้ว`,
        });
      }
    } catch (error: any) {
      console.error('Add tool loan error:', error);
      setAlertMessage({
        type: 'error',
        title: 'ไม่สามารถบันทึกการยืมได้',
        desc: error.message || 'เกิดข้อผิดพลาดในการอัปเดต Google Sheets'
      });
    } finally {
      setIsSubmittingLoan(false);
    }
  };

  // 7.9 บันทึกคืน Spare เข้าคลัง
  const handleReturnToolLoan = async (loanId: string, returnData: {
    receiverName: string;
    returnNote: string;
  }) => {
    if (!token || !spreadsheetId) return;
    setIsSubmittingLoan(true);
    try {
      const result = await returnToolLoan(token, spreadsheetId, loanId, returnData);
      if (result.success) {
        setLoans(prev => prev.map(l => l.id === loanId ? result.updatedLoan : l));

        // ส่งแจ้งเตือน Telegram
        if (isTelegramEnabled) {
          sendToolReturnAlert(result.updatedLoan).catch(err => console.error('Telegram return alert error:', err));
        }

        setAlertMessage({
          type: 'success',
          title: '✅ บันทึกรับคืน Spare เรียบร้อย!',
          desc: `รับคืน "${result.updatedLoan.partName}" จากไลน์ "${result.updatedLoan.lineLocation}" เข้าคลังอย่างปลอดภัย`,
        });
      }
    } catch (error: any) {
      console.error('Return tool loan error:', error);
      setAlertMessage({
        type: 'error',
        title: 'ไม่สามารถบันทึกรับคืนได้',
        desc: error.message || 'เกิดข้อผิดพลาดในการอัปเดต Google Sheets'
      });
    } finally {
      setIsSubmittingLoan(false);
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

  // แสดงผลหากกำลังอยู่ในกระบวนการยืนยันสิทธิ์ความปลอดภัย
  if (isVerifyingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center font-sans">
        <div className="bg-white p-8 rounded-2xl shadow-xl shadow-slate-100 border border-slate-100 flex flex-col items-center max-w-sm w-full text-center">
          <RefreshCw className="h-10 w-10 text-blue-600 animate-spin mb-4" />
          <h3 className="text-base font-bold text-slate-800">กำลังตรวจสอบสิทธิ์การเข้าใช้งาน...</h3>
          <p className="text-xs text-slate-400 mt-1">ตรวจสอบบัญชีอีเมลกับระบบฐานข้อมูลความปลอดภัย</p>
        </div>
      </div>
    );
  }

  // แสดงผลหากไม่มีสิทธิ์ใช้งานฐานข้อมูลนี้
  if (authError) {
    return (
      <UnauthorizedView 
        userEmail={user?.email || ''} 
        authError={authError} 
        onLogout={async () => {
          await logout();
          setUser(null);
          setToken(null);
          setNeedsAuth(true);
          setAuthError(null);
        }}
        onDisconnect={() => {
          setSpreadsheetId(null);
          setSpreadsheetUrl('');
          setParts([]);
          setTransactions([]);
          setEquipments([]);
          setMaintenanceLogs([]);
          localStorage.removeItem('spare_part_spreadsheet_id');
          localStorage.removeItem('spare_part_spreadsheet_url');
          setAuthError(null);
        }}
      />
    );
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
      <nav className="bg-slate-900 border-b-4 border-blue-500 text-white py-3.5 px-4 sm:px-8 sticky top-0 z-40 shadow-lg w-full">
        <div className="w-full flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-blue-500 rounded-lg flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <Settings className="h-5 w-5 text-slate-950 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="font-display text-base sm:text-lg font-bold tracking-tight uppercase">ระบบควบคุมอะไหล่และงานซ่อม (Spare Part & Repairs)</h1>
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
          <div className="flex items-center gap-2.5 sm:gap-3 text-xs flex-wrap justify-end">
            <div className="text-right hidden sm:block">
              <p className="font-bold text-slate-200">{user?.displayName || 'ช่างเทคนิคโรงงาน'}</p>
              <p className="text-[10px] text-green-400">● เชื่อมต่อกับ Google Sheets แล้ว</p>
            </div>

            <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-xs font-bold text-slate-200 uppercase shrink-0">
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

      {/* 2. เมนูกดเปลี่ยนแท็บสไตล์ Full Width Responsive */}
      <div className="bg-white border-b border-slate-200 sticky top-[72px] sm:top-[64px] z-30 shadow-xs w-full">
        <div className="w-full px-2 sm:px-6">
          <div className="flex flex-wrap lg:flex-nowrap justify-start lg:justify-between gap-1 text-xs sm:text-sm font-bold">
            <button
              onClick={() => setActiveTab('transaction')}
              className={`flex-1 min-w-[130px] px-3 sm:px-4 py-3 border-b-4 flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'transaction' 
                  ? 'text-blue-600 border-blue-600 font-bold bg-blue-50/40' 
                  : 'text-slate-600 border-transparent hover:border-slate-300 hover:bg-slate-50 font-medium'
              }`}
            >
              <ArrowRightLeft className="h-4 w-4 shrink-0 text-blue-500" />
              <span>เบิกและรับอะไหล่</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('inventory');
                loadAllData(token!, spreadsheetId);
              }}
              className={`flex-1 min-w-[130px] px-3 sm:px-4 py-3 border-b-4 flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'inventory' 
                  ? 'text-blue-600 border-blue-600 font-bold bg-blue-50/40' 
                  : 'text-slate-600 border-transparent hover:border-slate-300 hover:bg-slate-50 font-medium'
              }`}
            >
              <Layers className="h-4 w-4 shrink-0 text-indigo-500" />
              <span>เช็คยอดคงเหลือ</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('equipment');
                loadAllData(token!, spreadsheetId);
              }}
              className={`flex-1 min-w-[130px] px-3 sm:px-4 py-3 border-b-4 flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'equipment' 
                  ? 'text-blue-600 border-blue-600 font-bold bg-blue-50/40' 
                  : 'text-slate-600 border-transparent hover:border-slate-300 hover:bg-slate-50 font-medium'
              }`}
            >
              <Cpu className="h-4 w-4 shrink-0 text-amber-500" />
              <span>เครื่องจักร/อุปกรณ์</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('inspection');
                loadAllData(token!, spreadsheetId);
              }}
              className={`flex-1 min-w-[130px] px-3 sm:px-4 py-3 border-b-4 flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'inspection' 
                  ? 'text-blue-600 border-blue-600 font-bold bg-blue-50/40' 
                  : 'text-slate-600 border-transparent hover:border-slate-300 hover:bg-slate-50 font-medium'
              }`}
              title="ตรวจเช็คและประเมินเครื่องมือประจำเดือน พร้อมเลือกแบบฟอร์ม"
            >
              <ClipboardCheck className="h-4 w-4 shrink-0 text-emerald-500" />
              <span>แบบตรวจเช็ค PM</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('maintenance');
                loadAllData(token!, spreadsheetId);
              }}
              className={`flex-1 min-w-[130px] px-3 sm:px-4 py-3 border-b-4 flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'maintenance' 
                  ? 'text-blue-600 border-blue-600 font-bold bg-blue-50/40' 
                  : 'text-slate-600 border-transparent hover:border-slate-300 hover:bg-slate-50 font-medium'
              }`}
            >
              <Wrench className="h-4 w-4 shrink-0 text-violet-500" />
              <span>งานซ่อมบำรุง</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('loans');
                loadAllData(token!, spreadsheetId);
              }}
              className={`flex-1 min-w-[130px] px-3 sm:px-4 py-3 border-b-4 flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap relative ${
                activeTab === 'loans' 
                  ? 'text-blue-600 border-blue-600 font-bold bg-blue-50/40' 
                  : 'text-slate-600 border-transparent hover:border-slate-300 hover:bg-slate-50 font-medium'
              }`}
            >
              <Repeat className="h-4 w-4 shrink-0 text-amber-500" />
              <span>ยืม-คืน Spare</span>
              {loans.filter(l => l.status === 'กำลังยืม').length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-amber-500 text-slate-950 font-black text-[10px] rounded-full animate-pulse">
                  {loans.filter(l => l.status === 'กำลังยืม').length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('dashboard');
                loadAllData(token!, spreadsheetId);
              }}
              className={`flex-1 min-w-[130px] px-3 sm:px-4 py-3 border-b-4 flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'dashboard' 
                  ? 'text-blue-600 border-blue-600 font-bold bg-blue-50/40' 
                  : 'text-slate-600 border-transparent hover:border-slate-300 hover:bg-slate-50 font-medium'
              }`}
            >
              <BarChart3 className="h-4 w-4 shrink-0 text-emerald-500" />
              <span>แดชบอร์ดสรุปยอด</span>
            </button>

            <button
              onClick={() => setActiveTab('appsscript')}
              className={`flex-1 min-w-[130px] px-3 sm:px-4 py-3 border-b-4 flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'appsscript' 
                  ? 'text-blue-600 border-blue-600 font-bold bg-blue-50/40' 
                  : 'text-slate-600 border-transparent hover:border-slate-300 hover:bg-slate-50 font-medium'
              }`}
            >
              <Terminal className="h-4 w-4 shrink-0 text-slate-500" />
              <span>คู่มือติดตั้ง GAS</span>
            </button>

            <button
              onClick={() => setActiveTab('permissions')}
              className={`flex-1 min-w-[130px] px-3 sm:px-4 py-3 border-b-4 flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'permissions' 
                  ? 'text-blue-600 border-blue-600 font-bold bg-blue-50/40' 
                  : 'text-slate-600 border-transparent hover:border-slate-300 hover:bg-slate-50 font-medium'
              }`}
            >
              <Shield className="h-4 w-4 shrink-0 text-rose-500" />
              <span>จัดการสิทธิ์เข้าใช้งาน</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. ส่วนเนื้อหาการประมวลผล Full Width */}
      <main className="w-full px-4 sm:px-6 md:px-8 py-6 flex-1">
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
                maintenanceLogs={maintenanceLogs}
                parts={parts}
                onAddEquipment={handleAddNewEquipment}
                onUpdateEquipment={handleUpdateEquipment}
                isSubmitting={isSubmittingEq}
                onGoToSpareLoan={() => {
                  setActiveTab('loans');
                }}
                onGoToMaintenance={() => {
                  setActiveTab('maintenance');
                }}
                onGoToInspection={(eqId) => {
                  setPreSelectedInspectionEqId(eqId);
                  setActiveTab('inspection');
                }}
              />
            )}

            {activeTab === 'inspection' && (
              <InspectionTab 
                equipments={equipments}
                parts={parts}
                preSelectedEquipmentId={preSelectedInspectionEqId}
                onGoToSpareLoan={() => {
                  setActiveTab('loans');
                }}
                onGoToMaintenance={() => {
                  setActiveTab('maintenance');
                }}
              />
            )}

            {activeTab === 'maintenance' && (
              <MaintenanceTab 
                equipments={equipments}
                maintenanceLogs={maintenanceLogs}
                parts={parts}
                onAddMaintenanceLog={handleAddNewMaintenanceLog}
                onUpdateMaintenanceLog={handleUpdateMaintenanceLog}
                isSubmitting={isSubmittingLog}
              />
            )}

            {activeTab === 'loans' && (
              <ToolLoanTab 
                parts={parts}
                equipments={equipments}
                loans={loans}
                onAddLoan={handleAddNewToolLoan}
                onReturnLoan={handleReturnToolLoan}
                isSubmitting={isSubmittingLoan}
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

            {activeTab === 'permissions' && (
              <PermissionsTab 
                accessToken={token!} 
                spreadsheetId={spreadsheetId} 
                currentUserEmail={user?.email || ''}
                onRefreshData={() => loadAllData(token!, spreadsheetId)}
              />
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
