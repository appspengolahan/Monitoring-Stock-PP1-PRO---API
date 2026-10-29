import React, { useState } from 'react';
import { 
  Users, 
  ShieldCheck, 
  UserPlus, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Lock, 
  Eye, 
  EyeOff, 
  Sparkles,
  AlertCircle,
  RotateCcw,
  KeyRound,
  Plus,
  Tag,
  Sliders,
  Database,
  FileCheck2,
  Layers
} from 'lucide-react';
import { UserAccessConfig, UserRole } from '../../types';
import { GasService } from '../../services/gasService';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableKomoditas: string[];
  currentUserEmail: string;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  availableKomoditas,
  currentUserEmail
}) => {
  const [users, setUsers] = useState<UserAccessConfig[]>(() => GasService.getUserConfigs());
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [formEmail, setFormEmail] = useState<string>('');
  const [formNama, setFormNama] = useState<string>('');
  const [formRole, setFormRole] = useState<UserRole>('Staff Operasional');
  const [availableRoles, setAvailableRoles] = useState<string[]>(() => GasService.getAvailableRoles());
  const [isCustomRoleMode, setIsCustomRoleMode] = useState<boolean>(false);
  const [customRoleInput, setCustomRoleInput] = useState<string>('');
  const [formHasDevAccess, setFormHasDevAccess] = useState<boolean>(false);
  const [formAllowedKomoditas, setFormAllowedKomoditas] = useState<string[]>([]);
  const [formCanExport, setFormCanExport] = useState<boolean>(true);
  const [formCanAccessAI, setFormCanAccessAI] = useState<boolean>(false);
  const [formCanManageUsers, setFormCanManageUsers] = useState<boolean>(false);
  const [formCanAccessReconciliation, setFormCanAccessReconciliation] = useState<boolean>(true);
  const [formDefaultPin, setFormDefaultPin] = useState<string>('123456');
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const defaultRoles = GasService.DEFAULT_ROLES;
  const customRoles = availableRoles.filter(r => !defaultRoles.includes(r));

  const applyRoleDefaultPermissions = (roleName: string) => {
    const lower = roleName.toLowerCase().trim();
    if (lower === 'web developer' || lower === 'site engineer / pm' || lower === 'project manager') {
      setFormHasDevAccess(true);
      setFormCanExport(true);
      setFormCanAccessAI(true);
      setFormCanManageUsers(true);
      setFormCanAccessReconciliation(true);
    } else if (lower === 'admin produksi') {
      setFormHasDevAccess(false);
      setFormCanExport(true);
      setFormCanAccessAI(true);
      setFormCanManageUsers(true);
      setFormCanAccessReconciliation(true);
    } else if (lower.includes('accounting')) {
      setFormHasDevAccess(false);
      setFormCanExport(true);
      setFormCanAccessAI(false); // Sesuai arahan: Accounting tidak diberi akses AI & Dev
      setFormCanManageUsers(false);
      setFormCanAccessReconciliation(false);
    } else { // Staff Operasional & kustom umum
      setFormHasDevAccess(false);
      setFormCanExport(false);
      setFormCanAccessAI(false);
      setFormCanManageUsers(false);
      setFormCanAccessReconciliation(true);
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'Web Developer':
        return 'bg-purple-100 text-purple-700 border border-purple-200';
      case 'Site Engineer / PM':
      case 'Project Manager':
        return 'bg-blue-100 text-blue-700 border border-blue-200';
      case 'Admin Produksi':
        return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
      case 'Staff Operasional':
        return 'bg-amber-100 text-amber-800 border border-amber-200';
      default:
        if (role.toLowerCase().includes('accounting')) {
          return 'bg-cyan-100 text-cyan-800 border border-cyan-200';
        }
        return 'bg-indigo-100 text-indigo-800 border border-indigo-200';
    }
  };

  const handleStartAdd = () => {
    setIsAddingNew(true);
    setEditingEmail(null);
    setFormEmail('');
    setFormNama('');
    setFormRole('Staff Operasional');
    setIsCustomRoleMode(false);
    setCustomRoleInput('');
    setFormDefaultPin('123456');
    applyRoleDefaultPermissions('Staff Operasional');
    setFormAllowedKomoditas([availableKomoditas[0] || 'Cengkeh']);
  };

  const handleStartEdit = (user: UserAccessConfig) => {
    setIsAddingNew(false);
    setEditingEmail(user.email);
    setFormEmail(user.email);
    setFormNama(user.nama);
    setFormRole(user.role);
    setIsCustomRoleMode(false);
    setCustomRoleInput('');
    setFormDefaultPin(user.defaultPin || '123456');
    setFormHasDevAccess(!!user.hasDevAccess);
    setFormAllowedKomoditas(user.allowedKomoditas);
    setFormCanExport(user.canExportPdf ?? true);
    setFormCanAccessAI(user.canAccessAI ?? (user.role === 'Web Developer' || user.role === 'Site Engineer / PM' || user.role === 'Admin Produksi'));
    setFormCanManageUsers(user.canManageUsers ?? (user.role === 'Web Developer' || user.role === 'Site Engineer / PM' || user.role === 'Admin Produksi'));
    setFormCanAccessReconciliation(user.canAccessReconciliation ?? true);
  };

  const handleToggleKomoditas = (item: string) => {
    if (formAllowedKomoditas.includes('*') || formAllowedKomoditas.includes('all')) {
      // switch to explicit items except clicked one
      const remaining = availableKomoditas.filter(k => k !== item);
      setFormAllowedKomoditas(remaining);
      return;
    }

    if (formAllowedKomoditas.includes(item)) {
      setFormAllowedKomoditas(formAllowedKomoditas.filter(k => k !== item));
    } else {
      setFormAllowedKomoditas([...formAllowedKomoditas, item]);
    }
  };

  const handleSelectAllKomoditas = (select: boolean) => {
    if (select) {
      setFormAllowedKomoditas(['*']);
    } else {
      setFormAllowedKomoditas([]);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmail.trim() || !formNama.trim()) {
      alert('Email dan Nama staf wajib diisi.');
      return;
    }

    const rawRole = isCustomRoleMode ? customRoleInput.trim() : formRole.trim();
    if (isCustomRoleMode && !rawRole) {
      alert('Silakan ketik nama peran baru yang ingin ditambahkan (misal: Accounting).');
      return;
    }
    const finalRole: UserRole = rawRole || 'Staff Operasional';

    // Register custom role if new
    if (finalRole && !defaultRoles.includes(finalRole)) {
      GasService.addCustomRole(finalRole);
      setAvailableRoles(GasService.getAvailableRoles());
    }

    const pinToUse = formDefaultPin.trim() || '123456';
    const existing = users.find(u => u.email.toLowerCase() === formEmail.trim().toLowerCase());
    const isDevRole = finalRole === 'Web Developer' || finalRole === 'Site Engineer / PM';

    const config: UserAccessConfig = {
      email: formEmail.trim().toLowerCase(),
      nama: formNama.trim(),
      role: finalRole,
      password: isAddingNew ? pinToUse : (existing?.password || pinToUse),
      defaultPin: pinToUse,
      isDefaultPassword: isAddingNew ? true : (existing?.isDefaultPassword ?? true),
      hasDevAccess: formHasDevAccess,
      allowedKomoditas: formAllowedKomoditas.length === 0 ? ['*'] : formAllowedKomoditas,
      canExportPdf: formCanExport,
      canManageUsers: formCanManageUsers,
      canAccessAI: formCanAccessAI,
      canAccessReconciliation: formCanAccessReconciliation
    };

    const updated = GasService.upsertUserConfig(config);
    setUsers(updated);
    setIsAddingNew(false);
    setEditingEmail(null);
    setIsCustomRoleMode(false);
    setCustomRoleInput('');
    setStatusMessage(`Hak akses untuk ${config.email} dengan peran "${finalRole}" berhasil disimpan!`);
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const handleResetPin = (email: string) => {
    if (window.confirm(`Reset PIN untuk ${email} kembali ke PIN default (123456)?`)) {
      const updated = GasService.resetUserPassword(email, '123456');
      setUsers(updated);
      setStatusMessage(`PIN untuk ${email} berhasil di-reset ke default: 123456`);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const handleDelete = (emailToDelete: string) => {
    if (emailToDelete === 'obeetools@gmail.com' || emailToDelete === 'loehendra@gmail.com') {
      alert('Akun Developer & Site Engineer utama tidak boleh dihapus.');
      return;
    }
    if (window.confirm(`Yakin ingin mencabut akses staf ${emailToDelete}?`)) {
      const updated = GasService.deleteUserConfig(emailToDelete);
      setUsers(updated);
      if (editingEmail === emailToDelete) {
        setEditingEmail(null);
        setIsAddingNew(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Pusat Pengaturan Hak Akses Staf (RBAC)
              </h3>
              <p className="text-xs text-slate-500">
                Atur pembatasan akses data persediaan bahan baku per user &amp; peranan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Status Message */}
          {statusMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between animate-in fade-in">
              <span className="font-semibold">{statusMessage}</span>
              <button onClick={() => setStatusMessage(null)}>
                <X className="w-4 h-4 text-emerald-600" />
              </button>
            </div>
          )}

          {/* Form Add / Edit Drawer */}
          {(isAddingNew || editingEmail) && (
            <form onSubmit={handleSave} className="p-4 bg-blue-50/60 rounded-2xl border border-blue-200 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-blue-200/80">
                <span className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-700" />
                  <span>{isAddingNew ? 'Tambah Akun Staf Baru' : `Edit Hak Akses: ${formEmail}`}</span>
                </span>
                <button
                  type="button"
                  onClick={() => { setIsAddingNew(false); setEditingEmail(null); }}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  Batal
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Email Staf / Akun
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={e => setFormEmail(e.target.value)}
                    disabled={!isAddingNew}
                    placeholder="nama.staf@gmail.com"
                    required
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Nama Lengkap / Jabatan
                  </label>
                  <input
                    type="text"
                    value={formNama}
                    onChange={e => setFormNama(e.target.value)}
                    placeholder="Contoh: Budi Santoso (Mandor Cengkeh)"
                    required
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-600">
                      Peran Pengguna (Role)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const nextMode = !isCustomRoleMode;
                        setIsCustomRoleMode(nextMode);
                        if (nextMode) {
                          setCustomRoleInput('');
                        } else {
                          setFormRole('Staff Operasional');
                          applyRoleDefaultPermissions('Staff Operasional');
                        }
                      }}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-0.5 cursor-pointer"
                      title={isCustomRoleMode ? 'Pilih peran dari daftar' : 'Tambah peran kustom baru'}
                    >
                      {isCustomRoleMode ? (
                        <span>Pilih Daftar</span>
                      ) : (
                        <>
                          <Plus className="w-3 h-3" />
                          <span>+ Peran Baru</span>
                        </>
                      )}
                    </button>
                  </div>

                  {isCustomRoleMode ? (
                    <div className="space-y-1">
                      <div className="relative">
                        <input
                          type="text"
                          value={customRoleInput}
                          onChange={e => {
                            const val = e.target.value;
                            setCustomRoleInput(val);
                            setFormRole(val);
                            applyRoleDefaultPermissions(val);
                          }}
                          placeholder="Ketik peran baru (e.g. Accounting)..."
                          autoFocus
                          required={isCustomRoleMode}
                          className="w-full text-xs px-2.5 py-2 bg-white border border-blue-400 rounded-lg text-slate-900 font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-xs"
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-blue-600 font-medium">Contoh: Accounting, QC, Mandor</span>
                        <button
                          type="button"
                          onClick={() => {
                            setIsCustomRoleMode(false);
                            setFormRole('Staff Operasional');
                            applyRoleDefaultPermissions('Staff Operasional');
                          }}
                          className="text-slate-400 hover:text-slate-600 underline"
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  ) : (
                    <select
                      value={formRole}
                      onChange={e => {
                        const val = e.target.value;
                        if (val === '__ADD_NEW__') {
                          setIsCustomRoleMode(true);
                          setCustomRoleInput('');
                          setFormRole('');
                        } else {
                          setFormRole(val);
                          applyRoleDefaultPermissions(val);
                        }
                      }}
                      className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-medium"
                    >
                      <optgroup label="Peran Bawaan Standar">
                        {defaultRoles.map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </optgroup>
                      {customRoles.length > 0 && (
                        <optgroup label="Peran Kustom Tambahan">
                          {customRoles.map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </optgroup>
                      )}
                      <option value="__ADD_NEW__" className="text-blue-600 font-bold">
                        + Tambah Peran Baru (Kustom)...
                      </option>
                    </select>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Password Awal / PIN Bawaan
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={formDefaultPin}
                      onChange={e => setFormDefaultPin(e.target.value)}
                      placeholder="Default: 123456"
                      className="w-full pl-8 pr-2 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 font-mono focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400">PIN default pabrik: 123456</span>
                </div>
              </div>

              {/* Granular Feature Access Checkboxes (Hak Akses Fitur Aplikasi) */}
              <div className="bg-white p-3.5 rounded-xl border border-blue-200/90 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 flex-wrap gap-1">
                  <div className="flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wide">
                      Hak Akses Fitur Aplikasi (Centang Fitur yang Diizinkan)
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Preset otomatis aktif sesuai peran, dapat disesuaikan manual
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                  {/* 1. Fitur AI Cerdas (AI Logistik & Bot Asisten) */}
                  <label className={`flex items-start gap-2.5 p-2 rounded-lg border transition-all cursor-pointer ${
                    formCanAccessAI 
                      ? 'bg-purple-50/70 border-purple-200 text-purple-950' 
                      : 'bg-slate-50/50 border-slate-200 text-slate-600 hover:bg-slate-100/50'
                  }`}>
                    <input
                      type="checkbox"
                      checked={formCanAccessAI}
                      onChange={e => setFormCanAccessAI(e.target.checked)}
                      className="mt-0.5 rounded text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                    />
                    <div className="text-xs">
                      <span className="font-bold flex items-center gap-1.5 text-slate-800">
                        <span>Fitur AI Cerdas</span>
                        <span className="text-[9.5px] px-1 py-0.2 rounded bg-purple-100 text-purple-700 font-semibold font-mono">Gemini</span>
                      </span>
                      <span className="text-[10.5px] text-slate-500 block leading-tight mt-0.5">
                        AI Logistik, rekomendasi persediaan, dan AI Stock Bot
                      </span>
                    </div>
                  </label>

                  {/* 2. Mode Dev & Headless GAS API */}
                  <label className={`flex items-start gap-2.5 p-2 rounded-lg border transition-all cursor-pointer ${
                    formHasDevAccess 
                      ? 'bg-indigo-50/70 border-indigo-200 text-indigo-950' 
                      : 'bg-slate-50/50 border-slate-200 text-slate-600 hover:bg-slate-100/50'
                  }`}>
                    <input
                      type="checkbox"
                      checked={formHasDevAccess}
                      onChange={e => setFormHasDevAccess(e.target.checked)}
                      className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    />
                    <div className="text-xs">
                      <span className="font-bold flex items-center gap-1.5 text-slate-800">
                        <span>Mode Dev (Headless GAS)</span>
                        <span className="text-[9.5px] px-1 py-0.2 rounded bg-indigo-100 text-indigo-700 font-semibold font-mono">API</span>
                      </span>
                      <span className="text-[10.5px] text-slate-500 block leading-tight mt-0.5">
                        Akses payload JSON, switchboard pengembang &amp; parameter GAS
                      </span>
                    </div>
                  </label>

                  {/* 3. Export PDF & Cetak Kartu */}
                  <label className={`flex items-start gap-2.5 p-2 rounded-lg border transition-all cursor-pointer ${
                    formCanExport 
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950' 
                      : 'bg-slate-50/50 border-slate-200 text-slate-600 hover:bg-slate-100/50'
                  }`}>
                    <input
                      type="checkbox"
                      checked={formCanExport}
                      onChange={e => setFormCanExport(e.target.checked)}
                      className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                    />
                    <div className="text-xs">
                      <span className="font-bold flex items-center gap-1.5 text-slate-800">
                        <span>Izin Export PDF Laporan</span>
                        <span className="text-[9.5px] px-1 py-0.2 rounded bg-emerald-100 text-emerald-700 font-semibold font-mono">PDF</span>
                      </span>
                      <span className="text-[10.5px] text-slate-500 block leading-tight mt-0.5">
                        Cetak dan unduh laporan persediaan &amp; kartu stok format PDF
                      </span>
                    </div>
                  </label>

                  {/* 4. Audit Rekonsiliasi & Switch Board Susut */}
                  <label className={`flex items-start gap-2.5 p-2 rounded-lg border transition-all cursor-pointer ${
                    formCanAccessReconciliation 
                      ? 'bg-amber-50/70 border-amber-200 text-amber-950' 
                      : 'bg-slate-50/50 border-slate-200 text-slate-600 hover:bg-slate-100/50'
                  }`}>
                    <input
                      type="checkbox"
                      checked={formCanAccessReconciliation}
                      onChange={e => setFormCanAccessReconciliation(e.target.checked)}
                      className="mt-0.5 rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                    />
                    <div className="text-xs">
                      <span className="font-bold flex items-center gap-1.5 text-slate-800">
                        <span>Audit Rekonsiliasi Susut</span>
                        <span className="text-[9.5px] px-1 py-0.2 rounded bg-amber-100 text-amber-800 font-semibold font-mono">Audit</span>
                      </span>
                      <span className="text-[10.5px] text-slate-500 block leading-tight mt-0.5">
                        Panel verifikasi cutoff, selisih timbangan &amp; status susut
                      </span>
                    </div>
                  </label>

                  {/* 5. Kelola Hak Akses Staf (Admin RBAC) */}
                  <label className={`flex items-start gap-2.5 p-2 rounded-lg border transition-all cursor-pointer ${
                    formCanManageUsers 
                      ? 'bg-rose-50/70 border-rose-200 text-rose-950' 
                      : 'bg-slate-50/50 border-slate-200 text-slate-600 hover:bg-slate-100/50'
                  }`}>
                    <input
                      type="checkbox"
                      checked={formCanManageUsers}
                      onChange={e => setFormCanManageUsers(e.target.checked)}
                      className="mt-0.5 rounded text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                    />
                    <div className="text-xs">
                      <span className="font-bold flex items-center gap-1.5 text-slate-800">
                        <span>Kelola Hak Akses Staf</span>
                        <span className="text-[9.5px] px-1 py-0.2 rounded bg-rose-100 text-rose-700 font-semibold font-mono">Admin</span>
                      </span>
                      <span className="text-[10.5px] text-slate-500 block leading-tight mt-0.5">
                        Membuka whitelist user, atur izin fitur &amp; reset PIN staf lain
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Komoditas Checkboxes */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-slate-700 block">
                    Hak Akses Persediaan Bahan Baku:
                  </label>
                  <div className="flex items-center gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => handleSelectAllKomoditas(true)}
                      className="text-blue-600 hover:underline font-semibold"
                    >
                      Pilih Semua (Full Akses)
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => handleSelectAllKomoditas(false)}
                      className="text-slate-500 hover:underline"
                    >
                      Kosongkan
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white p-3 rounded-xl border border-blue-200/80">
                  {availableKomoditas.map(k => {
                    const isChecked = formAllowedKomoditas.includes('*') || 
                                     formAllowedKomoditas.includes('all') || 
                                     formAllowedKomoditas.includes(k);
                    return (
                      <label key={k} className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer p-1.5 rounded-lg hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleKomoditas(k)}
                          className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                        />
                        <span className="font-medium truncate">{k}</span>
                      </label>
                    );
                  })}
                </div>
                <p className="text-[10.5px] text-slate-500 mt-1">
                  * Staf hanya akan melihat kartu stok, mutasi riwayat, dan saldo kode untuk bahan yang dicentang di atas.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-blue-200">
                <button
                  type="button"
                  onClick={() => { setIsAddingNew(false); setEditingEmail(null); }}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
                >
                  Simpan Hak Akses
                </button>
              </div>
            </form>
          )}

          {/* User Table Header Bar & Roles Pill Summary */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <span className="text-xs font-bold text-slate-800">
                Daftar Staf &amp; Pengguna Terdaftar ({users.length} Akun)
              </span>
              <div className="flex items-center gap-1.5 flex-wrap mt-1">
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                  <Tag className="w-2.5 h-2.5" />
                  Peran:
                </span>
                {availableRoles.map(r => {
                  const isCustom = !defaultRoles.includes(r);
                  const count = users.filter(u => u.role === r).length;
                  return (
                    <span 
                      key={r} 
                      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${getRoleBadgeStyle(r)}`}
                    >
                      <span>{r}</span>
                      <span className="opacity-70 text-[9px]">({count})</span>
                      {isCustom && count === 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Hapus peran kustom "${r}" yang tidak terpakai ini?`)) {
                              GasService.deleteCustomRole(r);
                              setAvailableRoles(GasService.getAvailableRoles());
                            }
                          }}
                          className="hover:text-rose-600 ml-0.5"
                          title="Hapus peran kustom"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
            {!isAddingNew && !editingEmail && (
              <button
                onClick={handleStartAdd}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors shrink-0 self-start sm:self-auto"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Tambah Staf / User</span>
              </button>
            )}
          </div>

          {/* User List Cards / Table */}
          <div className="space-y-2.5">
            {users.map(u => {
              const isSuper = u.email === 'obeetools@gmail.com' || u.email === 'loehendra@gmail.com';
              const isDevHidden = !u.hasDevAccess;
              const hasAllBahan = u.allowedKomoditas.includes('*') || u.allowedKomoditas.includes('all');

              return (
                <div
                  key={u.email}
                  className="p-3.5 bg-slate-50/80 hover:bg-slate-100/80 rounded-xl border border-slate-200 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs sm:text-sm text-slate-900">
                        {u.nama}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        ({u.email})
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getRoleBadgeStyle(u.role)}`}>
                        {u.role}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-slate-600 flex-wrap pt-0.5">
                      {/* AI Feature Badge */}
                      {u.canAccessAI ? (
                        <span className="text-purple-700 bg-purple-50 border border-purple-200/80 px-1.5 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5 text-purple-600" />
                          <span>AI Cerdas Aktif</span>
                        </span>
                      ) : (
                        <span className="text-slate-500 bg-slate-100 border border-slate-200/60 px-1.5 py-0.5 rounded text-[10px] font-medium">
                          AI: Nonaktif
                        </span>
                      )}

                      {/* Dev Mode Badge */}
                      {u.hasDevAccess ? (
                        <span className="text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                          Mode Dev (GAS)
                        </span>
                      ) : (
                        <span className="text-slate-500 bg-slate-100 border border-slate-200/60 px-1.5 py-0.5 rounded text-[10px] font-medium">
                          Dev: Tutup
                        </span>
                      )}

                      {/* PDF Export Badge */}
                      {u.canExportPdf ? (
                        <span className="text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                          PDF: Diizinkan
                        </span>
                      ) : (
                        <span className="text-slate-500 bg-slate-100 border border-slate-200/60 px-1.5 py-0.5 rounded text-[10px] font-medium">
                          PDF: Tutup
                        </span>
                      )}

                      {/* Audit Rekonsiliasi Badge */}
                      {u.canAccessReconciliation ? (
                        <span className="text-amber-800 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                          Audit Susut
                        </span>
                      ) : (
                        <span className="text-slate-500 bg-slate-100 border border-slate-200/60 px-1.5 py-0.5 rounded text-[10px] font-medium">
                          Audit: Tutup
                        </span>
                      )}

                      {/* PIN Status */}
                      <span>·</span>
                      <span className="flex items-center gap-1 font-medium">
                        {u.isDefaultPassword ? (
                          <span className="text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1">
                            <KeyRound className="w-3 h-3 text-amber-600" />
                            <span>PIN: {u.defaultPin || '123456'}</span>
                          </span>
                        ) : (
                          <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>PIN Mandiri</span>
                          </span>
                        )}
                      </span>

                      <span>·</span>
                      <span className="font-medium text-slate-700">
                        Bahan: {hasAllBahan ? (
                          <strong className="text-blue-700">Semua</strong>
                        ) : (
                          <span className="text-slate-800 bg-white border border-slate-200 px-1.5 py-0.5 rounded font-mono text-[10px]">
                            {u.allowedKomoditas.join(', ')}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                    <button
                      onClick={() => handleResetPin(u.email)}
                      className="px-2 py-1.5 text-xs text-amber-700 hover:text-amber-800 hover:bg-amber-50 rounded-lg border border-amber-200 transition-colors flex items-center gap-1"
                      title="Reset PIN ke Default Pabrik (123456)"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                      <span className="text-[11px] font-bold">Reset PIN</span>
                    </button>
                    <button
                      onClick={() => handleStartEdit(u)}
                      className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg border border-slate-200 transition-colors"
                      title="Ubah Hak Akses & Role"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    {!isSuper && (
                      <button
                        onClick={() => handleDelete(u.email)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-slate-200 transition-colors"
                        title="Hapus Staf & Cabut Akses"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3 bg-slate-100 rounded-xl text-[11px] text-slate-600 space-y-1">
            <p className="font-semibold text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>Penyimpanan Opsi B (Client-Side Cloud / Local Cache)</span>
            </p>
            <p>
              Hak akses disimpan aman di memori lokal aplikasi. Ketika nanti sheet khusus <code>USER_ROLES</code> telah Anda buat di Google Spreadsheet, arsitektur ini dapat langsung disinkronkan ke cloud tanpa mengubah struktur antarmuka.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl shadow-xs"
          >
            Tutup Panel
          </button>
        </div>
      </div>
    </div>
  );
};
