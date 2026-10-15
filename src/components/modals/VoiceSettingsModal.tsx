import React, { useState, useEffect } from 'react';
import { 
  Volume2, 
  Sparkles, 
  Check, 
  Play, 
  Square, 
  Settings2, 
  Sliders, 
  User, 
  Globe, 
  Info,
  AlertTriangle,
  RotateCcw,
  Activity,
  X
} from 'lucide-react';
import { 
  VoiceSettingsService, 
  VoiceSettings, 
  GEMINI_VOICE_PERSONAS,
  VoiceOptionInfo,
  VoiceEngine 
} from '../../services/voiceSettingsService';

interface VoiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VoiceSettingsModal: React.FC<VoiceSettingsModalProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<VoiceSettings>(VoiceSettingsService.getSettings());
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [playingPersonaId, setPlayingPersonaId] = useState<string | null>(null);
  const [activeVoiceStatus, setActiveVoiceStatus] = useState<string>('');
  const [isCooldownActive, setIsCooldownActive] = useState<boolean>(VoiceSettingsService.isGeminiQuotaCooldownActive());

  useEffect(() => {
    if (!isOpen) {
      VoiceSettingsService.stopSpeaking();
      setPlayingPersonaId(null);
      return;
    }

    setSettings(VoiceSettingsService.getSettings());
    setIsCooldownActive(VoiceSettingsService.isGeminiQuotaCooldownActive());

    const loadVoices = () => {
      const v = VoiceSettingsService.getAvailableBrowserVoices();
      setBrowserVoices(v);
    };

    loadVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      VoiceSettingsService.stopSpeaking();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleUpdate = (patch: Partial<VoiceSettings>) => {
    const updated = VoiceSettingsService.saveSettings(patch);
    setSettings(updated);
  };

  const handlePlayPersonaSample = (persona: VoiceOptionInfo) => {
    if (playingPersonaId === persona.id) {
      VoiceSettingsService.stopSpeaking();
      setPlayingPersonaId(null);
      setActiveVoiceStatus('');
      return;
    }

    handleUpdate({ geminiVoice: persona.id });
    setPlayingPersonaId(persona.id);
    setActiveVoiceStatus(`Memutar: ${persona.name}`);

    VoiceSettingsService.playPersonaSample(persona.id, {
      onStart: () => {
        setPlayingPersonaId(persona.id);
      },
      onEnd: () => {
        setPlayingPersonaId(null);
        setActiveVoiceStatus('');
      },
      onError: () => {
        setPlayingPersonaId(null);
        setActiveVoiceStatus('');
      }
    });
  };

  const handleTestFullVoice = () => {
    if (playingPersonaId) {
      VoiceSettingsService.stopSpeaking();
      setPlayingPersonaId(null);
      setActiveVoiceStatus('');
      return;
    }

    const testSample = `Halo! Saya adalah narator AI Divisi Produksi Satu PT Batu Karang. Seluruh data mutasi dan saldo persediaan tembakau telah terekonsiliasi seratus persen klop.`;

    const currentPersona = GEMINI_VOICE_PERSONAS.find(p => p.id === settings.geminiVoice) || GEMINI_VOICE_PERSONAS[0];
    setPlayingPersonaId(currentPersona.id);

    VoiceSettingsService.speakText(testSample, {
      onStart: () => setPlayingPersonaId(currentPersona.id),
      onEnd: () => {
        setPlayingPersonaId(null);
        setActiveVoiceStatus('');
      },
      onError: () => {
        setPlayingPersonaId(null);
        setActiveVoiceStatus('');
      },
      onVoiceTypeUsed: (type, voiceName) => {
        setActiveVoiceStatus(`${type === 'gemini' ? 'Gemini AI Studio' : 'Browser Natural'}: ${voiceName}`);
      }
    });
  };

  const handleResetCooldown = () => {
    VoiceSettingsService.clearGeminiQuotaCooldown();
    setIsCooldownActive(false);
    setActiveVoiceStatus('Mode Gemini Studio HD diaktifkan kembali.');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:px-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>Pilihan Suara AI Natural</span>
                <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 px-1.5 py-0.2 rounded-full text-[10px] font-mono">
                  Multi-Karakter
                </span>
              </h3>
              <p className="text-[11px] text-slate-300">
                Pilih karakter suara AI dengan intonasi pria, wanita, bariton, dan bass yang berbeda
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              VoiceSettingsService.stopSpeaking();
              onClose();
            }}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-slate-800 text-xs">
          {/* Active Voice Playing Alert */}
          {activeVoiceStatus && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-[11px] flex items-center justify-between animate-pulse">
              <span className="flex items-center gap-1.5 font-medium">
                <Activity className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
                <span>{activeVoiceStatus}</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  VoiceSettingsService.stopSpeaking();
                  setPlayingPersonaId(null);
                  setActiveVoiceStatus('');
                }}
                className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
              >
                Hentikan
              </button>
            </div>
          )}

          {/* Engine Selection */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
              Mesin Suara (Audio Engine)
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleUpdate({ engine: 'gemini' })}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative ${
                  settings.engine === 'gemini'
                    ? 'border-indigo-600 bg-indigo-50/70 shadow-xs ring-1 ring-indigo-500'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                {settings.engine === 'gemini' && (
                  <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                )}
                <div className="flex items-center gap-1.5 font-bold text-indigo-950 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Google Gemini AI</span>
                </div>
                <p className="text-[10px] text-slate-600 leading-relaxed">
                  <strong>Paling Manusiawi.</strong> Artikulasi studio 24kHz dengan intonasi broadcast resmi tanpa nada robot.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleUpdate({ engine: 'browser' })}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative ${
                  settings.engine === 'browser'
                    ? 'border-blue-600 bg-blue-50/70 shadow-xs ring-1 ring-blue-500'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                {settings.engine === 'browser' && (
                  <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                )}
                <div className="flex items-center gap-1.5 font-bold text-blue-950 mb-1">
                  <Globe className="w-3.5 h-3.5 text-blue-600" />
                  <span>Browser Natural</span>
                </div>
                <p className="text-[10px] text-slate-600 leading-relaxed">
                  TTS lokal perangkat dengan modulasi nada pria/wanita adaptif sesuai karakter yang dipilih.
                </p>
              </button>
            </div>
          </div>

          {/* Persona List */}
          <div className="space-y-2">
            {isCooldownActive && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Mode Adaptif Aktif:</span> Setiap karakter (Kore, Puck, Zephyr, Fenrir, Charon) tetap dibedakan dengan profil frekuensi &amp; nada unik (Wanita, Pria bariton, Bass) agar tidak seragam.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleResetCooldown}
                  className="shrink-0 flex items-center gap-1 px-2 py-1 bg-amber-200/80 hover:bg-amber-300 text-amber-900 font-bold rounded-lg text-[10px] cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Coba Gemini Lagi</span>
                </button>
              </div>
            )}

            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                5 Karakter Suara AI (Klik Tombol Suara Untuk Mendengar Perbedaan)
              </label>
            </div>

            <div className="space-y-2">
              {GEMINI_VOICE_PERSONAS.map(p => {
                const isSelected = settings.geminiVoice === p.id;
                const isThisPlaying = playingPersonaId === p.id;

                return (
                  <div
                    key={p.id}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-2.5 ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50/60 ring-1 ring-indigo-400'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div 
                      onClick={() => handleUpdate({ geminiVoice: p.id })}
                      className="flex items-center gap-2.5 flex-1 cursor-pointer select-none"
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                        p.gender === 'female' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {p.gender === 'female' ? '♀' : '♂'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900 text-xs">{p.name}</span>
                          {p.recommended && (
                            <span className="bg-amber-100 text-amber-800 text-[9px] px-1.5 py-0.2 rounded font-bold">
                              Rekomendasi
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 leading-snug">{p.description}</p>
                      </div>
                    </div>

                    {/* Action buttons: Play Sample & Select */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayPersonaSample(p);
                        }}
                        title={`Dengarkan contoh suara ${p.id}`}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer shadow-2xs ${
                          isThisPlaying
                            ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        }`}
                      >
                        {isThisPlaying ? (
                          <>
                            <Square className="w-3 h-3 fill-current" />
                            <span>Stop</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3 fill-current" />
                            <span>Contoh</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleUpdate({ geminiVoice: p.id })}
                        className={`w-5 h-5 rounded-full flex items-center justify-center cursor-pointer transition-colors ${
                          isSelected ? 'bg-indigo-600 text-white' : 'border border-slate-300 hover:border-slate-400'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Browser Voice Override Options if Browser Engine is Selected */}
          {settings.engine === 'browser' && (
            <div className="space-y-1.5 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                Paket Suara Bahasa Indonesia Perangkat (Opsional)
              </label>

              {browserVoices.length > 0 ? (
                <select
                  value={settings.browserVoiceURI}
                  onChange={e => handleUpdate({ browserVoiceURI: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 text-[11px] focus:outline-indigo-500"
                >
                  <option value="">Otomatis Sesuai Karakter (Pria / Wanita)</option>
                  {browserVoices.map(v => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang}) {v.name.includes('Natural') || v.name.includes('Online') ? '⭐ [Natural]' : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-[10px] text-slate-500 italic">
                  Sistem otomatis menggunakan paket suara Bahasa Indonesia bawaan browser dengan modulasi nada karakter.
                </p>
              )}
            </div>
          )}

          {/* Speed & Pitch Sliders */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/90 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                <Sliders className="w-3.5 h-3.5 text-slate-500" />
                <span>Kecepatan Berbicara (Tempo)</span>
              </span>
              <span className="font-mono font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-slate-200 text-[10px]">
                {settings.speed}x {settings.speed === 0.95 ? '(Ideal Pabrik)' : ''}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[10px] text-slate-400">0.85x</span>
              <input
                type="range"
                min="0.85"
                max="1.15"
                step="0.05"
                value={settings.speed}
                onChange={e => handleUpdate({ speed: parseFloat(e.target.value) })}
                className="flex-1 accent-indigo-600 cursor-pointer"
              />
              <span className="text-[10px] text-slate-400">1.15x</span>
            </div>

            <div className="flex gap-1.5 justify-center pt-0.5">
              {[0.9, 0.95, 1.0, 1.05].map(rate => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => handleUpdate({ speed: rate })}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    settings.speed === rate 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:px-6 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleTestFullVoice}
            className={`w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
              playingPersonaId
                ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            {playingPersonaId ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Hentikan Audio</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Uji Coba Karakter Terpilih ({settings.geminiVoice}) 🔊</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              VoiceSettingsService.stopSpeaking();
              onClose();
            }}
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            Terapkan &amp; Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
