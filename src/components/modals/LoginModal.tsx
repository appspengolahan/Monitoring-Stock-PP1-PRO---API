import React, { useState } from 'react';
import { GasService } from '../../services/gasService';
import { UserSession } from '../../types';
import { ShieldCheck, Lock, Mail, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';

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
  const [emailInput, setEmailInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) {
      setErrorMessage('Alamat email admin / staf wajib diisi.');
      return;
    }
    if (!passwordInput) {
      setErrorMessage('Password / PIN akun wajib diisi.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const res = await GasService.login(emailInput.trim(), passwordInput);
      if (res.ok && res.session) {
        onSuccess(res.session);
      } else {
        setErrorMessage(res.message || 'Verifikasi login gagal.');
      }
    } catch (err: any) {
      setErrorMessage('Terjadi kendala saat verifikasi akun.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150 p-6 sm:p-7">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center mx-auto mb-3 shadow-xs">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Pintu Masuk Terverifikasi
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Monitoring Persediaan PP1 · PT Batu Karang
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="font-medium leading-relaxed">{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Alamat Email Admin Terdaftar (Whitelist)
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                placeholder="nama.admin@gmail.com"
                className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 block">
                Password / PIN Akun
              </label>
              <span className="text-[10.5px] text-slate-400">PIN default: 123456</span>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
                placeholder="Masukkan password atau PIN"
                className="w-full pl-9 pr-10 py-2.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 p-0.5 rounded transition-colors"
                title={showPassword ? "Sembunyikan password" : "Lihat password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
          >
            <span>{isLoading ? 'Memverifikasi Whitelist...' : 'Masuk Aplikasi'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {onClose && (
          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
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
