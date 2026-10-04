import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  X, 
  Send, 
  Sparkles, 
  RefreshCw, 
  Maximize2, 
  Minimize2, 
  User, 
  Scale, 
  Layers, 
  ArrowLeftRight,
  ShieldCheck,
  ChevronDown,
  Mic,
  MicOff,
  Volume2,
  VolumeX
} from 'lucide-react';
import { AIChatMessage, AIService } from '../../services/aiService';
import { UserSession } from '../../types';

interface AIBotModalProps {
  isOpen: boolean;
  onClose: () => void;
  komoditasList: any[];
  bsppList: any[];
  session: UserSession;
}

export const AIBotModal: React.FC<AIBotModalProps> = ({
  isOpen,
  onClose,
  komoditasList,
  bsppList,
  session
}) => {
  const [messages, setMessages] = useState<AIChatMessage[]>([
    {
      id: 'init-1',
      role: 'assistant',
      text: `Halo ${session.nama}! 👋 Saya Asisten AI Divisi Produksi I PT Batu Karang. 

Saya siap membantu Anda menganalisis saldo persediaan bahan baku (${session.allowedKomoditas?.includes('*') ? 'Semua Komoditas' : session.allowedKomoditas?.join(', ')}), mendeteksi anomali timbangan BSPP, maupun mencari riwayat mutasi terbaru.

💡 *Tips: Anda dapat menekan tombol mikrofon 🎙️ untuk berbicara langsung tanpa mengetik!*`,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(scrollToBottom, 150);
    }
  }, [isOpen, messages, isLoading]);

  useEffect(() => {
    if (!isOpen) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      setIsListening(false);
      setSpeakingId(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Voice Input Speech Recognition
  const handleToggleVoice = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Input suara tidak didukung oleh browser ini. Disarankan menggunakan Google Chrome atau Microsoft Edge.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.lang = 'id-ID';
      rec.interimResults = false;
      rec.maxAlternatives = 1;

      rec.onstart = () => setIsListening(true);
      rec.onresult = (evt: any) => {
        const transcript = evt.results?.[0]?.[0]?.transcript;
        if (transcript) {
          setInput(prev => (prev ? `${prev} ${transcript}` : transcript));
        }
      };
      rec.onerror = () => setIsListening(false);
      rec.onend = () => setIsListening(false);

      recognitionRef.current = rec;
      rec.start();
    } catch {
      setIsListening(false);
    }
  };

  // Text to Speech
  const handleToggleSpeak = (id: string, text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (speakingId === id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const clean = text.replace(/[*#•_`]/g, '').slice(0, 300);
    const utt = new SpeechSynthesisUtterance(clean);
    utt.lang = 'id-ID';
    utt.rate = 1.05;
    utt.onend = () => setSpeakingId(null);
    utt.onerror = () => setSpeakingId(null);

    setSpeakingId(id);
    window.speechSynthesis.speak(utt);
  };

  // Build stock context matching user permissions
  const stockContext = {
    komoditas: komoditasList.map(k => ({
      nama: k.komoditas,
      komoditas: k.komoditas,
      saldo: k.saldoTotal,
      saldoTotal: k.saldoTotal,
      saldoSKTTotal: k.saldoSKTTotal,
      saldoSKMTotal: k.saldoSKMTotal,
      masuk: k.masukTotal,
      masukTotal: k.masukTotal,
      keluar: k.keluarTotal,
      keluarTotal: k.keluarTotal,
      jumlahKode: k.jumlahKode,
      kodeList: k.kodeList?.map((item: any) => ({
        nama: item.nama,
        saldo: item.saldo,
        saldoSKT: item.saldoSKT,
        saldoSKM: item.saldoSKM,
        kategoriProduksi: item.kategoriProduksi
      })),
      entriTervalidasi: k.entriTervalidasi,
      mutasiTerbaru: k.mutasiTerbaru?.slice(0, 10) || []
    })),
    bspp: bsppList.map(b => ({
      nama: b.nama,
      totalEntries: b.entries?.length || 0,
      ringkasanTerbaru: b.entries?.slice(-5) || []
    }))
  };

  const handleSend = async (textToSend?: string) => {
    const q = textToSend || input;
    if (!q.trim() || isLoading) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    const userMsg: AIChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      text: q.trim(),
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setIsLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        text: m.text
      }));

      const reply = await AIService.sendChatMessage(
        q.trim(),
        history,
        stockContext,
        session.role,
        session.allowedKomoditas
      );

      const aiMsg: AIChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        text: reply,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (e: any) {
      const errMsg: AIChatMessage = {
        id: `ai-err-${Date.now()}`,
        role: 'assistant',
        text: 'Maaf, terjadi kesalahan saat memproses data. Silakan coba kembali.',
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    { label: '🎯 Prediksi Sisa Hari', prompt: 'Berapa hari sisa persediaan (Days of Inventory) untuk grade yang mendekati level kritis?' },
    { label: '⚖️ Cek Susut BSPP', prompt: 'Apakah ada selisih timbangan (BSPP) yang mencolok atau melebihi batas 0,5% pada data terbaru?' },
    { label: '📦 Stok Mengendap', prompt: 'Tampilkan grade atau komoditas yang tidak ada mutasi keluar lebih dari 25 hari (stok mengendap).' },
    { label: '📊 Ringkasan Saldo', prompt: 'Berikan ringkasan eksekutif saldo stok bahan baku saat ini secara singkat dan jelas.' },
    { label: '🚚 Mutasi Terbesar', prompt: 'Tampilkan 3 transaksi pengeluaran stok terbesar dan komoditas apa yang paling banyak dipakai?' }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div 
        className={`bg-white w-full flex flex-col rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 transition-all duration-200 ${
          isExpanded 
            ? 'h-[96vh] sm:max-w-4xl' 
            : 'h-[85vh] sm:h-[620px] sm:max-w-xl'
        }`}
      >
        {/* Header */}
        <div className="p-4 sm:px-5 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white rounded-t-3xl sm:rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base tracking-tight text-white">
                  AI Logistik &amp; Stock Bot
                </h3>
                <span className="text-[10px] bg-blue-500/20 text-blue-200 border border-blue-400/30 px-2 py-0.5 rounded-full font-mono font-medium">
                  Gemini 3.8 Flash
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Divisi Produksi I · PT Batu Karang ({session.role})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-slate-300">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="hidden sm:inline-flex p-1.5 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              title={isExpanded ? "Perkecil Jendela" : "Perbesar Jendela"}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              title="Tutup AI Chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Access badge reminder */}
        <div className="px-4 py-2 bg-blue-50/80 border-b border-blue-100 flex items-center justify-between text-[11px] text-blue-900">
          <div className="flex items-center gap-1.5 truncate">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>Izin Bahan: <strong className="font-semibold">{session.allowedKomoditas?.includes('*') ? 'Semua Bahan (Full Access)' : session.allowedKomoditas?.join(', ')}</strong></span>
          </div>
          <span className="text-[10px] text-blue-600/80 font-medium shrink-0">RBAC Verified</span>
        </div>

        {/* Message List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/60">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 text-xs shadow-2xs mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed shadow-2xs ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-xs'
                    : 'bg-white border border-slate-200/90 text-slate-800 rounded-bl-xs'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.text}</div>
                <div className="mt-1.5 flex items-center justify-between gap-3 text-[10px] border-t border-slate-100/80 pt-1">
                  {msg.role === 'assistant' ? (
                    <button
                      type="button"
                      onClick={() => handleToggleSpeak(msg.id, msg.text)}
                      className="text-slate-500 hover:text-blue-600 flex items-center gap-1 cursor-pointer transition-colors"
                      title={speakingId === msg.id ? "Hentikan Suara" : "Dengarkan Jawaban (Audio TTS)"}
                    >
                      {speakingId === msg.id ? (
                        <>
                          <VolumeX className="w-3 h-3 text-rose-500" />
                          <span className="text-[9.5px] text-rose-500 font-medium">Hentikan</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3 h-3 text-blue-600" />
                          <span className="text-[9.5px]">Dengarkan</span>
                        </>
                      )}
                    </button>
                  ) : <span />}
                  <span className={msg.role === 'user' ? 'text-blue-100 text-[9.5px]' : 'text-slate-400 text-[9.5px]'}>
                    {msg.timestamp}
                  </span>
                </div>
              </div>

              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-slate-800 text-white flex items-center justify-center shrink-0 text-xs shadow-2xs mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-slate-500 bg-white p-3 rounded-2xl border border-slate-200/80 max-w-[200px] shadow-2xs">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
              <span>AI sedang menganalisis data...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick prompt suggestions */}
        <div className="p-2.5 bg-white border-t border-slate-100 overflow-x-auto flex gap-1.5 text-xs no-scrollbar">
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(qp.prompt)}
              disabled={isLoading}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-medium text-[11px] whitespace-nowrap transition-colors border border-slate-200/60 shrink-0 cursor-pointer disabled:opacity-50"
            >
              {qp.label}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSend();
          }}
          className="p-3 border-t border-slate-200 bg-white flex items-center gap-2"
        >
          {/* Voice Input Microphone Button */}
          <button
            type="button"
            onClick={handleToggleVoice}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer shrink-0 ${
              isListening
                ? 'bg-rose-600 text-white border-rose-600 animate-pulse shadow-md ring-2 ring-rose-400'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
            }`}
            title={isListening ? "Sedang mendengarkan... Klik untuk berhenti" : "Bicara dengan suara (Voice Input)"}
          >
            {isListening ? <MicOff className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4 text-blue-600" />}
          </button>

          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={isListening ? "Mendengarkan suara Anda... Silakan berbicara..." : "Tanyakan stok, mutasi, atau BSPP (misal: 'Berapa saldo Cengkeh hari ini?')..."}
            className={`flex-1 px-3.5 py-2.5 text-xs rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 placeholder:text-slate-400 ${
              isListening ? 'bg-rose-50 border-rose-300 text-rose-900' : 'bg-slate-50 border-slate-200'
            }`}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-xs cursor-pointer shrink-0"
            title="Kirim Pesan"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
