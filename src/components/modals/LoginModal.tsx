import React, { useState } from 'react';
import { GasService } from '../../services/gasService';
import { UserSession, UserRole } from '../../types';
import { MOCK_USERS } from '../../services/mockData';
import { ShieldCheck, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onSuccess: (session: UserSession) => void;
  onClose?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onSuccess,
  onClose
}) => {
  const [nama, setNama] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim() || !password) {
      setErrorMessage('Nama dan password wajib diisi.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const res = await GasService.login(nama, password);
      if (res.ok && res.session) {
        onSuccess(res.session);
      } else {
        setErrorMessage(res.message || 'Nama atau password salah.');
      }
    } catch (err: any) {
      setErrorMessage('Terjadi kendala saat verifikasi akun.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (demoUser: typeof MOCK_USERS[0]) => {
    setNama(demoUser.nama);
    setPassword(demoUser.password);
    const session: UserSession = {
      nama: demoUser.nama,
      role: demoUser.role,
      token: 'token_quick_' + Date.now(),
      isLoggedIn: true,
      loginTime: new Date().toISOString()
    };
    GasService.saveSession(session);
    onSuccess(session);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150 p-6 sm:p-7">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center mx-auto mb-3">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Monitoring Stock Persediaan
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Divisi Produksi I · PT Batu Karang
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Nama Staf / Pengguna
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={nama}
                onChange={e => setNama(e.target.value)}
                placeholder="Contoh: Lalu Mahendra"
                className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                autoComplete="username"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Masukkan password"
                className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                autoComplete="current-password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
          >
            <span>{isLoading ? 'Memeriksa...' : 'Masuk Aplikasi'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Demo Role Logins */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2 text-center">
            Pilihan Cepat Masuk Akun (Uji Coba RBAC)
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {GasService.getUserConfigs().slice(0, 6).map(u => (
              <button
                key={u.email}
                onClick={() => {
                  setNama(u.email);
                  setPassword('123');
                  const session: UserSession = {
                    nama: u.nama,
                    email: u.email,
                    role: u.role,
                    hasDevAccess: u.hasDevAccess,
                    allowedKomoditas: u.allowedKomoditas,
                    canExportPdf: u.canExportPdf,
                    canManageUsers: u.canManageUsers,
                    token: 'token_quick_' + Date.now(),
                    isLoggedIn: true,
                    loginTime: new Date().toISOString()
                  };
                  GasService.saveSession(session);
                  onSuccess(session);
                }}
                className="p-2 text-left bg-slate-50 hover:bg-blue-50 hover:border-blue-200 border border-slate-200/80 rounded-xl text-xs transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 truncate block">{u.role}</span>
                  {!u.hasDevAccess && (
                    <span className="text-[9.5px] text-amber-700 bg-amber-100 px-1 rounded font-semibold">User Mode</span>
                  )}
                </div>
                <span className="text-[11px] text-slate-600 truncate block">{u.email}</span>
                <span className="text-[10px] text-slate-400 truncate block">Akses: {u.allowedKomoditas.join(', ')}</span>
              </button>
            ))}
          </div>
        </div>

        {onClose && (
          <div className="mt-4 text-center">
            <button
              onClick={onClose}
              className="text-xs text-slate-500 hover:text-slate-800 transition-colors"
            >
              Batal &amp; Tutup
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
