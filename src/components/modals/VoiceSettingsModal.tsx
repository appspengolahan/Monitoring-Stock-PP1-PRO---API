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
  X
} from 'lucide-react';
import { 
  VoiceSettingsService, 
  VoiceSettings, 
  GEMINI_VOICE_PERSONAS,
  VoiceEngine 
} from '../../services/voiceSettingsService';

interface VoiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VoiceSettingsModal: React.FC<VoiceSettingsModalProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<VoiceSettings>(VoiceSettingsService.getSettings());
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isPlayingTest, setIsPlayingTest] = useState<boolean>(false);
  const [activeVoiceUsed, setActiveVoiceUsed] = useState<string>('');

  useEffect(() => {
    if (!isOpen) {
      VoiceSettingsService.stopSpeaking();
      setIsPlayingTest(false);
      return;
    }

    setSettings(VoiceSettingsService.getSettings());

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

  const handleTestVoice = () => {
    if (isPlayingTest) {
      VoiceSettingsService.stopSpeaking();
      setIsPlayingTest(false);
      return;
    }

    const testSample = `Halo! Saya adalah narator AI Divisi Produksi Satu PT Batu Karang. Seluruh data mutasi dan saldo persediaan tembakau telah terekonsiliasi seratus persen klop.`;

    setIsPlayingTest(true);
    VoiceSettingsService.speakText(testSample, {
      onStart: () => setIsPlayingTest(true),
      onEnd: () => setIsPlayingTest(false),
      onError: () => setIsPlayingTest(false),
      onVoiceTypeUsed: (type, voiceName) => setActiveVoiceUsed(`${type === 'gemini' ? 'Gemini AI' : 'Browser'}: ${voiceName}`)
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:px-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>Pilihan Suara AI Natural</span>
                <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 px-1.5 py-0.2 rounded-full text-[10px] font-mono">
                  Studio HD
                </span>
              </h3>
              <p className="text-[11px] text-slate-300">
                Sesuaikan karakter suara, kehangatan intonasi, dan teknologi narator audio
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
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-slate-800 text-xs">
          {/* Engine Selection */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
              Teknologi Mesin Suara (Engine)
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
                  <span>Google Gemini Studio AI</span>
                </div>
                <p className="text-[10px] text-slate-600 leading-relaxed">
                  <strong>Paling Natural &amp; Manusiawi.</strong> Artikulasi studio 24kHz dengan intonasi broadcast resmi tanpa nada kaku.
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
                  <span>Suara Browser Lokal</span>
                </div>
                <p className="text-[10px] text-slate-600 leading-relaxed">
                  Berjalan langsung di browser (offline). Kecepatan seketika, mengandalkan TTS bawaan perangkat.
                </p>
              </button>
            </div>
          </div>

          {/* Persona List when Gemini Engine is Active */}
          {settings.engine === 'gemini' && (
            <div className="space-y-2">
              {VoiceSettingsService.isGeminiQuotaCooldownActive() && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Info Kuota Harian Gemini Studio:</span> Kuota harian free-tier (10 permintaan/hari) untuk Gemini TTS sedang terpakai penuh. Sistem secara otomatis mengalihkan pembacaan ke <strong>Suara Browser Natural</strong> tanpa gangguan atau hambatan.
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Pilihan Karakter Suara AI Studio (Gemini)
                </label>
                <span className="text-[10px] text-indigo-600 font-semibold">5 Karakter Studio</span>
              </div>

              <div className="space-y-1.5">
                {GEMINI_VOICE_PERSONAS.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleUpdate({ geminiVoice: p.id })}
                    className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                      settings.geminiVoice === p.id
                        ? 'border-indigo-500 bg-indigo-50/60 ring-1 ring-indigo-400'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                        p.gender === 'female' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {p.gender === 'female' ? '♀' : '♂'}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900">{p.name}</span>
                          {p.recommended && (
                            <span className="bg-amber-100 text-amber-800 text-[9px] px-1.5 py-0.2 rounded font-bold">
                              Rekomendasi
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500">{p.description}</p>
                      </div>
                    </div>

                    <div className="shrink-0 pl-2">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                        settings.geminiVoice === p.id ? 'bg-indigo-600 text-white' : 'border border-slate-300'
                      }`}>
                        {settings.geminiVoice === p.id && <Check className="w-2.5 h-2.5" />}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Browser Voice Picker when Browser Engine is Active */}
          {settings.engine === 'browser' && (
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Pilih Suara Bahasa Indonesia Perangkat
              </label>

              {browserVoices.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px]">
                  Browser Anda tidak mendeteksi paket suara Bahasa Indonesia bawaan. Disarankan menggunakan <strong>Google Gemini Studio AI</strong> untuk kualitas paling natural.
                </div>
              ) : (
                <select
                  value={settings.browserVoiceURI}
                  onChange={e => handleUpdate({ browserVoiceURI: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 focus:outline-indigo-500"
                >
                  <option value="">Otomatis (Pilih Suara Natural Terbaik)</option>
                  {browserVoices.map(v => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang}) {v.name.includes('Natural') || v.name.includes('Online') ? '⭐ [Natural]' : ''}
                    </option>
                  ))}
                </select>
              )}

              <p className="text-[10px] text-slate-500 italic">
                Tips: Pada browser Microsoft Edge &amp; Google Chrome, suara dengan label "Natural" atau "Google" menghasilkan pembacaan yang jauh lebih jernih dan manusiawi.
              </p>
            </div>
          )}

          {/* Speed & Tempo Slider */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/90 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-slate-500" />
                <span>Kecepatan Berbicara (Tempo)</span>
              </span>
              <span className="font-mono font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-slate-200">
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

            <div className="flex gap-1.5 justify-center pt-1">
              {[0.9, 0.95, 1.0, 1.05].map(rate => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => handleUpdate({ speed: rate })}
                  className={`px-2 py-0.8 rounded text-[10px] font-bold transition-all cursor-pointer ${
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

        {/* Footer with Test Audio Player */}
        <div className="p-4 sm:px-6 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleTestVoice}
            className={`w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
              isPlayingTest
                ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            {isPlayingTest ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Hentikan Contoh Suara</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Uji Coba Suara (Dengarkan Sampel) 🔊</span>
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
