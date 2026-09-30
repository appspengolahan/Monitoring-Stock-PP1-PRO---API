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
  KeyRound
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
  const [formHasDevAccess, setFormHasDevAccess] = useState<boolean>(false);
  const [formAllowedKomoditas, setFormAllowedKomoditas] = useState<string[]>([]);
  const [formCanExport, setFormCanExport] = useState<boolean>(true);
  const [formDefaultPin, setFormDefaultPin] = useState<string>('123456');
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const roleList: UserRole[] = [
    'Web Developer',
    'Site Engineer / PM',
    'Admin Produksi',
    'Staff Operasional'
  ];

  const handleStartAdd = () => {
    setIsAddingNew(true);
    setEditingEmail(null);
    setFormEmail('');
    setFormNama('');
    setFormRole('Staff Operasional');
    setFormDefaultPin('123456');
    setFormHasDevAccess(false);
    setFormAllowedKomoditas([availableKomoditas[0] || 'Cengkeh']);
    setFormCanExport(false);
  };

  const handleStartEdit = (user: UserAccessConfig) => {
    setIsAddingNew(false);
    setEditingEmail(user.email);
    setFormEmail(user.email);
    setFormNama(user.nama);
    setFormRole(user.role);
    setFormDefaultPin(user.defaultPin || '123456');
    setFormHasDevAccess(user.hasDevAccess);
    setFormAllowedKomoditas(user.allowedKomoditas);
    setFormCanExport(user.canExportPdf);
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

    const pinToUse = formDefaultPin.trim() || '123456';
    const existing = users.find(u => u.email.toLowerCase() === formEmail.trim().toLowerCase());

    const config: UserAccessConfig = {
      email: formEmail.trim().toLowerCase(),
      nama: formNama.trim(),
      role: formRole,
      password: isAddingNew ? pinToUse : (existing?.password || pinToUse),
      defaultPin: pinToUse,
      isDefaultPassword: isAddingNew ? true : (existing?.isDefaultPassword ?? true),
      hasDevAccess: formRole === 'Web Developer' || formRole === 'Site Engineer / PM' ? formHasDevAccess : false,
      allowedKomoditas: formAllowedKomoditas.length === 0 ? ['*'] : formAllowedKomoditas,
      canExportPdf: formCanExport,
      canManageUsers: formRole === 'Web Developer' || formRole === 'Site Engineer / PM'
    };

    const updated = GasService.upsertUserConfig(config);
    setUsers(updated);
    setIsAddingNew(false);
    setEditingEmail(null);
    setStatusMessage(`Hak akses untuk ${config.email} berhasil disimpan!`);
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Peran Pengguna (Role)
                  </label>
                  <select
                    value={formRole}
                    onChange={e => {
                      const r = e.target.value as UserRole;
                      setFormRole(r);
                      if (r === 'Web Developer' || r === 'Site Engineer / PM') {
                        setFormHasDevAccess(true);
                      } else {
                        setFormHasDevAccess(false);
                      }
                    }}
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  >
                    {roleList.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
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

                <div className="flex flex-col justify-end space-y-1.5 pb-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={formHasDevAccess}
                      disabled={formRole !== 'Web Developer' && formRole !== 'Site Engineer / PM'}
                      onChange={e => setFormHasDevAccess(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span>Mode Dev (Headless GAS)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={formCanExport}
                      onChange={e => setFormCanExport(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span>Izin Export PDF Laporan</span>
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

          {/* User Table Header Bar */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">
              Daftar Staf &amp; Pengguna Terdaftar ({users.length} Akun)
            </span>
            {!isAddingNew && !editingEmail && (
              <button
                onClick={handleStartAdd}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
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
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        u.role === 'Web Developer' ? 'bg-purple-100 text-purple-700 border border-purple-200' :
                        u.role === 'Site Engineer / PM' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                        u.role === 'Admin Produksi' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                        'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {u.role}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-600 flex-wrap">
                      <span className="flex items-center gap-1 font-medium">
                        {isDevHidden ? (
                          <span className="text-slate-500 bg-slate-200/80 px-1.5 py-0.5 rounded text-[10px]">
                            Mode Dev: Ditutup
                          </span>
                        ) : (
                          <span className="text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                            Mode Dev: Aktif (Headless GAS)
                          </span>
                        )}
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1 font-medium">
                        {u.isDefaultPassword ? (
                          <span className="text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1">
                            <KeyRound className="w-3 h-3 text-amber-600" />
                            <span>Bawaan Dev (PIN: {u.defaultPin || '123456'})</span>
                          </span>
                        ) : (
                          <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>Telah Diubah Mandiri</span>
                          </span>
                        )}
                      </span>
                      <span>·</span>
                      <span className="font-medium text-slate-700">
                        Akses: {hasAllBahan ? (
                          <strong className="text-blue-700">Semua Bahan</strong>
                        ) : (
                          <span className="text-slate-800 bg-white border border-slate-200 px-1.5 py-0.5 rounded font-mono text-[10.5px]">
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
