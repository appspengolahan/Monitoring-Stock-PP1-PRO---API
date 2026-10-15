export type VoiceEngine = 'gemini' | 'browser';

export interface VoiceOptionInfo {
  id: string; // 'Kore' | 'Puck' | 'Zephyr' | 'Fenrir' | 'Charon'
  name: string;
  title: string;
  gender: 'female' | 'male';
  description: string;
  recommended?: boolean;
  samplePhrase: string;
  browserPitch: number; // Pitch multiplier for distinct character emulation in Web Speech API
  browserRate: number;  // Speed multiplier
}

export const GEMINI_VOICE_PERSONAS: VoiceOptionInfo[] = [
  {
    id: 'Kore',
    name: 'Kore (Wanita Profesional & Elegan)',
    title: 'Wanita Profesional & Elegan',
    gender: 'female',
    description: 'Artikulasi jernih, tenang, dan sangat cocok untuk briefing eksekutif pabrik',
    recommended: true,
    samplePhrase: 'Halo! Saya Kore, narator wanita profesional dan elegan. Artikulasi jernih dan tenang untuk briefing eksekutif pabrik.',
    browserPitch: 1.12,
    browserRate: 0.98
  },
  {
    id: 'Puck',
    name: 'Puck (Pria Hangat & Percaya Diri)',
    title: 'Pria Hangat & Percaya Diri',
    gender: 'male',
    description: 'Suara alami dan bersahabat, sangat enak didengar untuk laporan harian',
    recommended: true,
    samplePhrase: 'Halo! Saya Puck, narator pria hangat dan percaya diri. Suara alami dan bersahabat untuk pemantauan harian gudang.',
    browserPitch: 0.88,
    browserRate: 0.95
  },
  {
    id: 'Zephyr',
    name: 'Zephyr (Wanita Ramah & Ceria Dinamis)',
    title: 'Wanita Ramah & Ceria Dinamis',
    gender: 'female',
    description: 'Intonasi ceria, tegas, dan modern untuk pengingat operasional tanggap',
    samplePhrase: 'Halo! Saya Zephyr, narator wanita ceria dan dinamis. Intonasi bersemangat untuk pengingat operasional yang tanggap.',
    browserPitch: 1.28,
    browserRate: 1.05
  },
  {
    id: 'Fenrir',
    name: 'Fenrir (Pria Mantap & Berwibawa)',
    title: 'Pria Mantap & Berwibawa',
    gender: 'male',
    description: 'Karakter bariton berwibawa, cocok untuk peringatan audit & batas stok',
    samplePhrase: 'Halo! Saya Fenrir, narator pria mantap dan berwibawa. Karakter tegas dan kuat untuk peringatan audit dan batas minimum stok.',
    browserPitch: 0.72,
    browserRate: 0.90
  },
  {
    id: 'Charon',
    name: 'Charon (Pria Tenang Bass Rendah)',
    title: 'Pria Tenang Bass Rendah',
    gender: 'male',
    description: 'Tempo santai dan bass mendalam, sangat nyaman untuk laporan panjang',
    samplePhrase: 'Halo! Saya Charon, narator pria tenang bertempo santai dengan bass mendalam, sangat nyaman untuk mendengarkan laporan panjang.',
    browserPitch: 0.60,
    browserRate: 0.85
  }
];

export interface VoiceSettings {
  engine: VoiceEngine;
  geminiVoice: string; // 'Kore' | 'Puck' | 'Zephyr' | 'Fenrir' | 'Charon'
  browserVoiceURI: string;
  speed: number; // 0.85 to 1.15, default 0.95
  pitch: number; // 0.8 to 1.2, default 1.0
  autoPlayAudio: boolean;
}

const STORAGE_KEY = 'stockpp1_voice_settings_v3';

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
  private static readonly QUOTA_COOLDOWN_KEY = 'stockpp1_gemini_tts_quota_cooldown_v3';
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
        fetch('/api/ai/tts-reset-cooldown', { method: 'POST' }).catch(() => {});
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
   * Mengumpulkan seluruh suara browser yang tersedia
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
   * Cari suara browser terbaik berdasarkan preferensi URI atau Gender karakter
   */
  public static getBestBrowserVoice(targetURI?: string, preferredGender?: 'female' | 'male'): SpeechSynthesisVoice | null {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return null;

    if (targetURI) {
      const found = voices.find(v => v.voiceURI === targetURI);
      if (found) return found;
    }

    const idVoices = voices.filter(v => v.lang.includes('id') || v.lang.includes('ID') || v.lang.includes('ms'));
    const candidateVoices = idVoices.length > 0 ? idVoices : voices;

    if (preferredGender) {
      const femaleKeywords = ['gadis', 'wita', 'siti', 'female', 'wanita', 'cewek', 'zira', 'aria', 'jenny', 'heera'];
      const maleKeywords = ['ardi', 'indra', 'budi', 'male', 'pria', 'cowok', 'david', 'guy', 'george'];

      const targetKeywords = preferredGender === 'female' ? femaleKeywords : maleKeywords;
      const avoidKeywords = preferredGender === 'female' ? maleKeywords : femaleKeywords;

      // Prioritas 1: Suara Natural yang cocok gender
      const matchedNatural = candidateVoices.find(v => {
        const nameLower = v.name.toLowerCase();
        const isTarget = targetKeywords.some(kw => nameLower.includes(kw));
        const isAvoid = avoidKeywords.some(kw => nameLower.includes(kw));
        const isNat = nameLower.includes('natural') || nameLower.includes('online');
        return isTarget && !isAvoid && isNat;
      });
      if (matchedNatural) return matchedNatural;

      // Prioritas 2: Suara apa pun yang cocok gender
      const matchedGender = candidateVoices.find(v => {
        const nameLower = v.name.toLowerCase();
        const isTarget = targetKeywords.some(kw => nameLower.includes(kw));
        const isAvoid = avoidKeywords.some(kw => nameLower.includes(kw));
        return isTarget && !isAvoid;
      });
      if (matchedGender) return matchedGender;
    }

    // Prioritas 3: Suara Natural Bahasa Indonesia terbaik
    const naturalId = idVoices.find(v => 
      (v.name.includes('Natural') || v.name.includes('Online'))
    );
    if (naturalId) return naturalId;

    // Prioritas 4: Suara Google Bahasa Indonesia
    const googleId = idVoices.find(v => v.name.toLowerCase().includes('google'));
    if (googleId) return googleId;

    // Prioritas 5: Suara ID apa saja
    if (idVoices.length > 0) return idVoices[0];
    return voices[0] || null;
  }

  /**
   * Hentikan seluruh pemutaran suara yang sedang aktif
   */
  public static stopSpeaking(): void {
    this.isCancelled = true;
    this.speechQueue = [];

    if (this.activeAudio) {
      try {
        this.activeAudio.pause();
        this.activeAudio.currentTime = 0;
      } catch {}
      this.activeAudio = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
  }

  /**
   * Putar sampel audio karakter spesifik (Kore, Puck, Zephyr, Fenrir, Charon).
   * Selalu menggunakan audio studio precomputed beresolusi 24kHz tanpa memakan kuota Gemini!
   */
  public static async playPersonaSample(
    personaId: string,
    callbacks?: {
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (err: any) => void;
    }
  ): Promise<void> {
    this.stopSpeaking();
    this.isCancelled = false;

    const persona = GEMINI_VOICE_PERSONAS.find(p => p.id === personaId) || GEMINI_VOICE_PERSONAS[0];
    const settings = this.getSettings();

    callbacks?.onStart?.();

    // 1. Coba putar sample precomputed HD studio langsung dari server (zero quota impact)
    try {
      const sampleAudioUrl = `/api/ai/tts-sample/${persona.id}`;
      const audio = new Audio(sampleAudioUrl);
      audio.playbackRate = settings.speed || 1.0;
      this.activeAudio = audio;

      audio.onended = () => {
        this.activeAudio = null;
        callbacks?.onEnd?.();
      };

      audio.onerror = () => {
        this.activeAudio = null;
        // Fallback: putar via browser speech dengan profil akustik karakter
        this.speakPersonaViaBrowser(persona.samplePhrase, persona, settings, callbacks);
      };

      await audio.play();
      return;
    } catch {
      this.activeAudio = null;
      // Fallback: browser speech dengan profil akustik karakter
      this.speakPersonaViaBrowser(persona.samplePhrase, persona, settings, callbacks);
    }
  }

  /**
   * Putar teks menggunakan Gemini Studio Natural Voice (High-Fidelity)
   * dengan fallback otomatis ke Browser SpeechSynthesis bersegmen & berkarakter unik.
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
    const persona = GEMINI_VOICE_PERSONAS.find(p => p.id === settings.geminiVoice) || GEMINI_VOICE_PERSONAS[0];

    // 1. Coba gunakan Gemini Studio Natural Voice bila mesin aktif adalah 'gemini'
    if (settings.engine === 'gemini') {
      if (!this.isGeminiQuotaCooldownActive()) {
        try {
          callbacks?.onStart?.();

          const cleanText = text
            .replace(/[*_#`~>]/g, '')
            .replace(/\s+/g, ' ')
            .trim();

          const res = await fetch('/api/ai/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: cleanText,
              voiceName: persona.id
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

              callbacks?.onVoiceTypeUsed?.('gemini', `${persona.name} (Gemini AI HD)`);

              audio.onended = () => {
                this.activeAudio = null;
                callbacks?.onEnd?.();
              };

              audio.onerror = () => {
                this.activeAudio = null;
                this.speakPersonaViaBrowser(cleanText, persona, settings, callbacks);
              };

              await audio.play();
              return;
            } else if (data.quotaExceeded) {
              this.setGeminiQuotaCooldown();
            }
          }
        } catch {
          // Fallback ke browser speech berkarakter
        }
      }
    }

    // 2. Fallback atau Pilihan Engine Browser Speech Berkarakter (Profil persona tetap diterapkan)
    this.speakPersonaViaBrowser(text, persona, settings, callbacks);
  }

  /**
   * Pembacaan Web Speech API dengan penerapan profil akustik karakter (pitch & speed spesifik)
   * agar setiap karakter (Kore, Puck, Zephyr, Fenrir, Charon) memiliki suara yang berbeda dan tidak seragam!
   */
  private static speakPersonaViaBrowser(
    text: string,
    persona: VoiceOptionInfo,
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
    const voice = this.getBestBrowserVoice(settings.browserVoiceURI, persona.gender);

    // Hitung pitch dan speed dengan modulasi persona karakter
    const userPitch = settings.pitch || 1.0;
    const userSpeed = settings.speed || 0.95;

    // Modulasi nada: karakter wanita dinaikkan, pria diturunkan/bass
    const effectivePitch = Math.min(2.0, Math.max(0.1, userPitch * persona.browserPitch));
    const effectiveRate = Math.min(2.0, Math.max(0.5, userSpeed * (persona.browserRate / 0.95)));

    callbacks?.onStart?.();
    callbacks?.onVoiceTypeUsed?.('browser', `${persona.title} (${voice?.name || 'Browser'})`);

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
      utterance.rate = effectiveRate;
      utterance.pitch = effectivePitch;
      if (voice) utterance.voice = voice;

      utterance.onend = () => {
        if (!this.isCancelled) playNext();
      };

      utterance.onerror = () => {
        if (!this.isCancelled) playNext();
      };

      window.speechSynthesis.speak(utterance);
    };

    playNext();
  }
}
