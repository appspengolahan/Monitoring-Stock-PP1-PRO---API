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
  ChevronDown
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

Silakan pilih pertanyaan cepat di bawah atau ketik langsung kebutuhan Anda!`,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(scrollToBottom, 150);
    }
  }, [isOpen, messages, isLoading]);

  if (!isOpen) return null;

  // Build stock context matching user permissions
  const stockContext = {
    komoditas: komoditasList.map(k => ({
      nama: k.komoditas,
      komoditas: k.komoditas,
      saldo: k.saldoTotal,
      saldoTotal: k.saldoTotal,
      masuk: k.masukTotal,
      masukTotal: k.masukTotal,
      keluar: k.keluarTotal,
      keluarTotal: k.keluarTotal,
      jumlahKode: k.jumlahKode,
      kategori: k.kategoriList,
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
    { label: '📊 Ringkasan Stok Hari Ini', prompt: 'Berikan ringkasan eksekutif saldo stok bahan baku saat ini secara singkat dan jelas.' },
    { label: '⚖️ Cek Selisih Timbang BSPP', prompt: 'Apakah ada selisih timbangan (BSPP) yang mencolok atau melebihi batas wajar pada data terbaru?' },
    { label: '⚠️ Deteksi Bahan Kritis / Menipis', prompt: 'Apakah ada kode atau komoditas yang mutasinya tinggi atau saldo stoknya mulai menipis?' },
    { label: '🚚 Mutasi Keluar Terbesar', prompt: 'Tampilkan 3 transaksi pengeluaran stok terbesar dan komoditas apa yang paling banyak dipakai?' }
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
                <div
                  className={`mt-1 text-[9.5px] text-right ${
                    msg.role === 'user' ? 'text-blue-100' : 'text-slate-400'
                  }`}
                >
                  {msg.timestamp}
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
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Tanyakan stok, mutasi, atau BSPP (misal: 'Berapa saldo Cengkeh hari ini?')..."
            className="flex-1 px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 placeholder:text-slate-400"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-xs cursor-pointer"
            title="Kirim Pesan"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
