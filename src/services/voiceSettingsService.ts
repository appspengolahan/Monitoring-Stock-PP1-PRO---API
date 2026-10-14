export type VoiceEngine = 'gemini' | 'browser';

export interface VoiceOptionInfo {
  id: string;
  name: string;
  gender: 'female' | 'male';
  description: string;
  recommended?: boolean;
}

export const GEMINI_VOICE_PERSONAS: VoiceOptionInfo[] = [
  {
    id: 'Kore',
    name: 'Kore (Wanita Profesional & Elegan)',
    gender: 'female',
    description: 'Artikulasi jernih, tenang, dan sangat cocok untuk briefing eksekutif pabrik',
    recommended: true
  },
  {
    id: 'Puck',
    name: 'Puck (Pria Hangat & Percaya Diri)',
    gender: 'male',
    description: 'Suara alami dan bersahabat, sangat enak didengar untuk laporan harian',
    recommended: true
  },
  {
    id: 'Zephyr',
    name: 'Zephyr (Wanita Ramah & Dinamis)',
    gender: 'female',
    description: 'Intonasi ceria, tegas, dan modern untuk pengingat operasional'
  },
  {
    id: 'Fenrir',
    name: 'Fenrir (Pria Berwibawa & Mantap)',
    gender: 'male',
    description: 'Karakter suara berwibawa, cocok untuk peringatan audit & ROP'
  },
  {
    id: 'Charon',
    name: 'Charon (Pria Tenang & Santun)',
    gender: 'male',
    description: 'Tempo santai dan bass mendalam untuk laporan panjang'
  }
];

export interface VoiceSettings {
  engine: VoiceEngine;
  geminiVoice: string; // 'Kore' | 'Puck' | 'Zephyr' | 'Fenrir' | 'Charon'
  browserVoiceURI: string;
  speed: number; // 0.8 to 1.2, default 0.95
  pitch: number; // 0.9 to 1.1, default 1.0
  autoPlayAudio: boolean;
}

const STORAGE_KEY = 'stockpp1_voice_settings_v2';

const DEFAULT_SETTINGS: VoiceSettings = {
  engine: 'gemini',
  geminiVoice: 'Kore',
  browserVoiceURI: '',
  speed: 0.95,
  pitch: 1.0,
  autoPlayAudio: true
};

export class VoiceSettingsService {
  private static activeAudio: HTMLAudioElement | null = null;
  private static speechQueue: string[] = [];
  private static isCancelled: boolean = false;
  private static readonly QUOTA_COOLDOWN_KEY = 'stockpp1_gemini_tts_quota_cooldown';
  private static memoryQuotaCooldownUntil: number = 0;

  public static isGeminiQuotaCooldownActive(): boolean {
    if (typeof window === 'undefined') return false;
    if (Date.now() < this.memoryQuotaCooldownUntil) return true;
    try {
      const stored = localStorage.getItem(this.QUOTA_COOLDOWN_KEY);
      if (stored) {
        const val = parseInt(stored, 10);
        if (Date.now() < val) {
          this.memoryQuotaCooldownUntil = val;
          return true;
        }
      }
    } catch {}
    return false;
  }

  public static setGeminiQuotaCooldown(durationMs: number = 60 * 60 * 1000): void {
    const until = Date.now() + durationMs;
    this.memoryQuotaCooldownUntil = until;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.QUOTA_COOLDOWN_KEY, until.toString());
      } catch {}
    }
  }

  public static clearGeminiQuotaCooldown(): void {
    this.memoryQuotaCooldownUntil = 0;
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(this.QUOTA_COOLDOWN_KEY);
      } catch {}
    }
  }

  public static getSettings(): VoiceSettings {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (e) {}
    return DEFAULT_SETTINGS;
  }

  public static saveSettings(settings: Partial<VoiceSettings>): VoiceSettings {
    const current = this.getSettings();
    const updated = { ...current, ...settings };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('stockpp1_voice_settings_changed', { detail: updated }));
      }
    } catch (e) {}
    return updated;
  }

  /**
   * Mengumpulkan seluruh suara browser yang tersedia, mengutamakan suara Natural Indonesia
   */
  public static getAvailableBrowserVoices(): SpeechSynthesisVoice[] {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
    const all = window.speechSynthesis.getVoices();
    
    // Sort so Indonesian and "Natural" / "Online" voices appear at the top
    return all.filter(v => v.lang.includes('id') || v.lang.includes('ID') || v.lang.includes('ms')).sort((a, b) => {
      const aNat = a.name.toLowerCase().includes('natural') || a.name.toLowerCase().includes('online') || a.name.toLowerCase().includes('google');
      const bNat = b.name.toLowerCase().includes('natural') || b.name.toLowerCase().includes('online') || b.name.toLowerCase().includes('google');
      if (aNat && !bNat) return -1;
      if (!aNat && bNat) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Cari suara browser terbaik berdasarkan preferensi tersimpan
   */
  public static getBestBrowserVoice(targetURI?: string): SpeechSynthesisVoice | null {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return null;

    if (targetURI) {
      const found = voices.find(v => v.voiceURI === targetURI);
      if (found) return found;
    }

    // Cari suara Microsoft Online (Natural) Bahasa Indonesia (sangat manusiawi)
    const naturalId = voices.find(v => 
      (v.lang.includes('id') || v.lang.includes('ID')) && 
      (v.name.includes('Natural') || v.name.includes('Online'))
    );
    if (naturalId) return naturalId;

    // Cari suara Google Bahasa Indonesia
    const googleId = voices.find(v => 
      (v.lang.includes('id') || v.lang.includes('ID')) && 
      v.name.toLowerCase().includes('google')
    );
    if (googleId) return googleId;

    // Fallback ke suara Bahasa Indonesia apa pun
    const anyId = voices.find(v => v.lang.includes('id') || v.lang.includes('ID'));
    if (anyId) return anyId;

    return null;
  }

  /**
   * Hentikan seluruh pembacaan suara yang sedang aktif (baik Gemini Audio maupun Browser TTS)
   */
  public static stopSpeaking(): void {
    this.isCancelled = true;
    this.speechQueue = [];

    if (this.activeAudio) {
      this.activeAudio.pause();
      this.activeAudio.currentTime = 0;
      this.activeAudio = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  /**
   * Putar teks menggunakan Gemini Studio Natural Voice (High-Fidelity)
   * dengan fallback otomatis ke Browser SpeechSynthesis bersegmen.
   */
  public static async speakText(
    text: string,
    callbacks?: {
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (err: any) => void;
      onVoiceTypeUsed?: (type: 'gemini' | 'browser', voiceName: string) => void;
    }
  ): Promise<void> {
    this.stopSpeaking();
    this.isCancelled = false;

    const settings = this.getSettings();

    // 1. Coba gunakan Gemini Studio Natural Voice bila mesin aktif adalah 'gemini'
    if (settings.engine === 'gemini') {
      // Jika cooldown kuota harian aktif, langsung gunakan Browser Speech tanpa delay & tanpa request error
      if (!this.isGeminiQuotaCooldownActive()) {
        try {
          callbacks?.onStart?.();

          const cleanText = text
            .replace(/[*_#`~>]/g, '')
            .replace(/\s+/g, ' ')
            .trim();

          // Gemini TTS request
          const res = await fetch('/api/ai/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: cleanText,
              voiceName: settings.geminiVoice || 'Kore'
            })
          });

          if (res.ok) {
            const data = await res.json();
            if (data.ok && data.audioBase64) {
              if (this.isCancelled) return;

              const audioUrl = `data:${data.mimeType || 'audio/wav'};base64,${data.audioBase64}`;
              const audio = new Audio(audioUrl);
              audio.playbackRate = settings.speed || 1.0;
              this.activeAudio = audio;

              callbacks?.onVoiceTypeUsed?.('gemini', data.voiceUsed || settings.geminiVoice);

              audio.onended = () => {
                this.activeAudio = null;
                callbacks?.onEnd?.();
              };

              audio.onerror = () => {
                this.activeAudio = null;
                // Fallback ke browser speech bila pemutaran audio gagal
                this.speakViaBrowser(cleanText, settings, callbacks);
              };

              await audio.play();
              return;
            } else if (data.quotaExceeded) {
              this.setGeminiQuotaCooldown();
            }
          }
        } catch {
          // Silent fallback ke browser speech
        }
      }
    }

    // 2. Fallback atau Pilihan Engine Browser Speech
    this.speakViaBrowser(text, settings, callbacks);
  }

  /**
   * Pembacaan berbasis Web Speech API bersegmen (tidak terputus di baris kelima)
   */
  private static speakViaBrowser(
    text: string,
    settings: VoiceSettings,
    callbacks?: {
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (err: any) => void;
      onVoiceTypeUsed?: (type: 'gemini' | 'browser', voiceName: string) => void;
    }
  ): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      callbacks?.onError?.('Browser tidak mendukung Web Speech API.');
      return;
    }

    const cleanText = text
      .replace(/[*_#`~>]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const sentences = cleanText
      .split(/(?<=[.?!])\s+/)
      .filter(s => s.trim().length > 0);

    if (sentences.length === 0) {
      callbacks?.onEnd?.();
      return;
    }

    this.speechQueue = sentences;
    const voice = this.getBestBrowserVoice(settings.browserVoiceURI);

    callbacks?.onStart?.();
    callbacks?.onVoiceTypeUsed?.('browser', voice?.name || 'Default Browser Voice');

    const playNext = () => {
      if (this.isCancelled || this.speechQueue.length === 0) {
        callbacks?.onEnd?.();
        return;
      }

      const chunk = this.speechQueue.shift();
      if (!chunk) {
        callbacks?.onEnd?.();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(chunk);
      utterance.lang = 'id-ID';
      utterance.rate = settings.speed || 0.95;
      utterance.pitch = settings.pitch || 1.0;
      if (voice) utterance.voice = voice;

      utterance.onend = () => {
        if (!this.isCancelled) playNext();
      };

      utterance.onerror = (e) => {
        if (!this.isCancelled) playNext();
      };

      window.speechSynthesis.speak(utterance);
    };

    playNext();
  }
}
