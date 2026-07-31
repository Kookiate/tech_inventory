import React, { useState, useEffect } from 'react';
import { AuthorizedUser, fetchAuthorizedUsers, addAuthorizedUser, removeAuthorizedUser } from '../utils/sheets';
import { Shield, UserPlus, Trash2, Mail, User, ShieldCheck, HelpCircle, Loader2, FolderPlus, ExternalLink } from 'lucide-react';

interface PermissionsTabProps {
  accessToken: string;
  spreadsheetId: string;
  currentUserEmail: string;
  onRefreshData?: () => void;
}

export default function PermissionsTab({ accessToken, spreadsheetId, currentUserEmail, onRefreshData }: PermissionsTabProps) {
  const [users, setUsers] = useState<AuthorizedUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('ช่างเทคนิค');

  // Google Drive Storage Folder URL
  const [driveFolderUrl, setDriveFolderUrl] = useState<string>(() => {
    return localStorage.getItem('drive_folder_url') || '';
  });

  const handleSaveDriveFolder = (url: string) => {
    setDriveFolderUrl(url);
    localStorage.setItem('drive_folder_url', url);
  };

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // ดึงข้อมูลผู้ใช้ที่ได้รับสิทธิ์
  const loadUsers = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const list = await fetchAuthorizedUsers(accessToken, spreadsheetId, currentUserEmail);
      setUsers(list);
    } catch (error: any) {
      console.error('Error in PermissionsTab:', error);
      setErrorMessage('ไม่สามารถดึงรายชื่อผู้ได้รับสิทธิ์ได้ กรุณาตรวจสอบการเชื่อมโยงระบบชีต');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [spreadsheetId]);

  // คำนวณสิทธิ์ผู้ใช้เพื่อตรวจสอบว่าเป็น "เจ้าของระบบ" หรือไม่
  const currentUserObj = users.find(u => u.email.toLowerCase() === currentUserEmail.toLowerCase());
  const isOwner = currentUserEmail.toLowerCase() === 'kookiate.b@gmail.com' || 
                  (currentUserObj ? currentUserObj.name.includes('เจ้าของระบบ') : false) ||
                  (users.length > 0 && users[0].email.toLowerCase() === currentUserEmail.toLowerCase());

  // จัดการเพิ่มสิทธิ์ผู้ใช้ใหม่
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) {
      alert('คุณไม่มีสิทธิ์มอบหมายสิทธิ์การเข้าใช้งานระบบนี้ เฉพาะผู้ดูแลระบบหลักเท่านั้น!');
      return;
    }
    if (!newEmail || !newName) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    const emailToRegister = newEmail.trim().toLowerCase();

    // ตรวจสอบว่ามีอีเมลนี้อยู่แล้วในระบบหรือไม่
    const isExist = users.some(u => u.email.toLowerCase() === emailToRegister);
    if (isExist) {
      setErrorMessage(`อีเมล "${emailToRegister}" นี้ได้รับสิทธิ์เข้าใช้งานอยู่แล้ว`);
      setIsSubmitting(false);
      return;
    }

    try {
      await addAuthorizedUser(accessToken, spreadsheetId, {
        email: emailToRegister,
        name: newName.trim(),
        role: newRole
      });

      setSuccessMessage(`มอบสิทธิ์ให้คุณ "${newName}" (${emailToRegister}) เรียบร้อยแล้ว`);
      setNewEmail('');
      setNewName('');
      setNewRole('ช่างเทคนิค');
      
      // รีโหลดข้อมูลใหม่
      await loadUsers();
      if (onRefreshData) onRefreshData();
    } catch (error: any) {
      console.error('Add user error:', error);
      setErrorMessage(error.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูลลง Google Sheet');
    } finally {
      setIsSubmitting(false);
    }
  };

  // จัดการลบสิทธิ์ผู้ใช้
  const handleRemoveUser = async (email: string, name: string) => {
    if (!isOwner) {
      alert('คุณไม่มีสิทธิ์เพิกถอนสิทธิ์การเข้าใช้งานระบบนี้ เฉพาะผู้ดูแลระบบหลักเท่านั้น!');
      return;
    }

    if (email.toLowerCase() === currentUserEmail.toLowerCase()) {
      alert('คุณไม่สามารถถอดถอนสิทธิ์ของตัวเองได้ เพื่อความปลอดภัยไม่ให้หลุดออกจากระบบ!');
      return;
    }

    const confirmDelete = window.confirm(`คุณแน่ใจหรือไม่ที่จะ "ถอดถอนสิทธิ์" ของคุณ ${name} (${email})? หลังจากนี้เขาจะไม่สามารถเข้าใช้งานระบบซ่อมบำรุงนี้ได้อีก`);
    if (!confirmDelete) return;

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await removeAuthorizedUser(accessToken, spreadsheetId, email);
      setSuccessMessage(`ถอดถอนสิทธิ์ของ "${name}" เรียบร้อยแล้ว`);
      await loadUsers();
      if (onRefreshData) onRefreshData();
    } catch (error: any) {
      console.error('Remove user error:', error);
      setErrorMessage(error.message || 'ไม่สามารถลบสิทธิ์ผู้ใช้ได้');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 font-sans">
      {/* ส่วนหัวของแท็บ */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.15),transparent)] pointer-events-none" />
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center border border-blue-500/20 shadow-inner">
              <Shield className="h-7 w-7 stroke-[1.75]" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">ระบบควบคุมสิทธิ์การเข้าใช้งาน (User Authentication Access)</h2>
              <p className="text-xs text-slate-400 mt-1">
                กำหนดและจัดการรายชื่อวิศวกร ช่างเทคนิค หรือบุคคลที่ได้รับอนุญาตให้เข้าสู่ระบบฐานข้อมูลคลังอะไหล่นี้
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadUsers}
            disabled={isLoading}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
          >
            {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            <span>รีเฟรชรายชื่อ</span>
          </button>
        </div>
      </div>

      {/* ข้อความตอบกลับสำเร็จ/ล้มเหลว */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-900 rounded-2xl text-sm font-semibold flex items-center gap-2">
          <span className="text-lg">✅</span>
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-900 rounded-2xl text-sm font-semibold flex items-center gap-2">
          <span className="text-lg">❌</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Grid คอลัมน์ฟอร์ม และตารางรายชื่อ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* ฟอร์มเพิ่มสิทธิ์ผู้ใช้ใหม่ */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm h-fit">
          {isOwner ? (
            <>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-4 mb-5">
                <UserPlus className="h-4 w-4 text-blue-600" />
                <span>มอบสิทธิ์การเข้าใช้งานใหม่</span>
              </h3>

              <form onSubmit={handleAddUser} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">อีเมล Google (Gmail / Workspace)</label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      placeholder="name@gmail.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    />
                    <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">ชื่อ-นามสกุล / ชื่อเล่นผู้ใช้งาน</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="ช่างมงคล ดีงาม"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    />
                    <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">ตำแหน่ง / บทบาทสิทธิ์</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-sans cursor-pointer"
                  >
                    <option value="ช่างเทคนิค">ช่างเทคนิค (เบิก/รับ/แจ้งซ่อมบำรุง)</option>
                    <option value="ผู้ดูแลระบบ">ผู้ดูแลระบบ (แก้ไขอะไหล่/ควบคุมสิทธิ์)</option>
                    <option value="หัวหน้างานซ่อมบำรุง">หัวหน้างานซ่อมบำรุง (ดูรายงานและสรุปงบ)</option>
                  </select>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-all cursor-pointer shadow-sm shadow-blue-500/15"
                  >
                    {isSubmitting ? 'กำลังบันทึกลงชีต...' : 'บันทึกและมอบสิทธิ์'}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="text-center py-6">
              <div className="h-12 w-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-6 w-6 stroke-[1.75]" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">เฉพาะเจ้าของระบบหลัก</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                เฉพาะผู้ดูแลระบบหลัก หรือผู้เริ่มติดตั้งระบบ (<strong className="text-slate-800">{users[0]?.name || 'เจ้าของระบบ'}</strong>) เท่านั้นที่มีสิทธิ์มอบหมายสิทธิ์หรือลบผู้ใช้อื่นในระบบได้
              </p>
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] text-slate-500 text-left leading-relaxed">
                <p className="font-bold text-slate-700 mb-1">สิทธิ์ปัจจุบันของคุณ:</p>
                บทบาท: {currentUserObj?.role || 'ผู้ใช้งาน'}<br />
                อีเมล: {currentUserEmail}
              </div>
            </div>
          )}

          {/* ส่วนตั้งค่า Google Drive Folder Storage สำหรับจัดเก็บรูปภาพ */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 mb-3">
              <FolderPlus className="h-4 w-4 text-violet-600" />
              <span>ลิงก์โฟลเดอร์ Google Drive กลาง</span>
            </h3>
            <p className="text-xs text-slate-500 mb-3 leading-relaxed">
              ระบุลิงก์โฟลเดอร์ Google Drive สำหรับเก็บรูปถ่ายงานซ่อมและอะไหล่ เพื่อให้ทีมช่างคลิกเปิดโฟลเดอร์สำหรับลากวางรูปได้สะดวก
            </p>
            <div className="space-y-3">
              <div className="relative">
                <input
                  type="url"
                  placeholder="https://drive.google.com/drive/folders/..."
                  value={driveFolderUrl}
                  onChange={(e) => handleSaveDriveFolder(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white transition-all font-sans"
                />
                <FolderPlus className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              </div>
              {driveFolderUrl && (
                <a
                  href={driveFolderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 bg-violet-50 hover:bg-violet-100 border border-violet-200 text-violet-700 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>ทดสอบเปิดโฟลเดอร์ Google Drive</span>
                </a>
              )}
            </div>
          </div>

          <div className="mt-5 p-3.5 bg-amber-50 text-amber-900 border border-amber-100 rounded-xl text-xs flex items-start gap-2.5 leading-relaxed font-medium">
            <HelpCircle className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold mb-0.5">ระบบจะเชื่อมต่อตรงกับสเปรดชีต:</p>
              ผู้ใช้ที่มอบสิทธิ์ใหม่นี้ จะถูกเพิ่มลงในชีตแผ่นงาน <strong className="text-slate-800 underline">"AuthorizedUsers"</strong> ใน Google Drive ของคุณทันที และพวกเขาสามารถใช้มือถือหรืออุปกรณ์อื่นเข้ามาใช้แอปนี้ด้วยบัญชี Google ดังกล่าวได้เลย!
            </div>
          </div>
        </div>

        {/* ตารางรายชื่อผู้ได้รับสิทธิ์ทั้งหมด */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm lg:col-span-2">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-4 mb-4">
            รายชื่อผู้ได้รับสิทธิ์ในปัจจุบัน ({users.length} คน)
          </h3>

          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <p className="text-sm font-semibold">กำลังโหลดข้อมูลผู้ใช้จาก Google Sheet...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm font-semibold">
              <p>📭 ไม่พบรายชื่อผู้ได้รับสิทธิ์ในระบบคลัง</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-xs uppercase font-bold">
                    <th className="pb-3 font-semibold">ชื่อผู้ใช้ / บทบาท</th>
                    <th className="pb-3 font-semibold">อีเมลที่ได้รับสิทธิ์</th>
                    <th className="pb-3 font-semibold">วันที่มอบสิทธิ์</th>
                    <th className="pb-3 text-right font-semibold">ดำเนินการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {users.map((item) => {
                    const isSelf = item.email.toLowerCase() === currentUserEmail.toLowerCase();
                    return (
                      <tr key={item.email} className={`hover:bg-slate-50/50 transition-colors ${isSelf ? 'bg-blue-50/20' : ''}`}>
                        <td className="py-3.5 pr-2">
                          <div className="font-bold text-slate-950 flex items-center gap-1.5">
                            <span>{item.name || 'ไม่ระบุชื่อ'}</span>
                            {isSelf && (
                              <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[9px] font-bold">บัญชีของคุณ</span>
                            )}
                          </div>
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold mt-1 ${
                            item.role.includes('ผู้ดูแลระบบ') 
                              ? 'bg-rose-50 text-rose-700 border border-rose-100/50' 
                              : 'bg-blue-50 text-blue-700 border border-blue-100/50'
                          }`}>
                            <ShieldCheck className="h-3 w-3 mr-1" />
                            {item.role}
                          </span>
                        </td>
                        <td className="py-3.5 pr-2 font-mono text-xs font-semibold text-slate-600">
                          {item.email}
                        </td>
                        <td className="py-3.5 pr-2 text-xs text-slate-500 font-semibold">
                          {item.dateAdded || 'ไม่มีข้อมูล'}
                        </td>
                        <td className="py-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveUser(item.email, item.name)}
                            disabled={isSelf || !isOwner}
                            className={`p-2 rounded-xl border transition-all cursor-pointer inline-flex items-center justify-center ${
                              isSelf || !isOwner
                                ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed' 
                                : 'bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-100'
                            }`}
                            title={isSelf ? 'คุณไม่สามารถลบสิทธิ์ของตัวเองได้' : !isOwner ? 'คุณไม่มีสิทธิ์ถอดถอนสิทธิ์ผู้ใช้อื่น' : `ถอดถอนสิทธิ์คุณ ${item.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
