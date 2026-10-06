import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  Lightbulb, 
  ArrowRight,
  TrendingUp,
  Boxes
} from 'lucide-react';
import { AIInsightItem, AIService } from '../../services/aiService';

interface AISmartInsightsProps {
  komoditasList: any[];
  bsppList: any[];
  userRole: string;
  allowedKomoditas?: string[];
  onNavigateTab: (tabId: string) => void;
}

export const AISmartInsights: React.FC<AISmartInsightsProps> = ({
  komoditasList,
  bsppList,
  userRole,
  allowedKomoditas,
  onNavigateTab
}) => {
  const [insights, setInsights] = useState<AIInsightItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const loadInsights = async () => {
    setIsLoading(true);
    try {
      // Build lightweight context
      const stockContext = {
        komoditas: komoditasList.map(k => ({
          nama: k.komoditas,
          saldo: k.saldoTotal,
          masuk: k.masukTotal,
          keluar: k.keluarTotal,
          jumlahKode: k.jumlahKode,
          tervalidasi: k.entriTervalidasi
        })),
        bsppSummary: bsppList.map(b => ({
          komoditas: b.nama,
          jumlahTransaksi: b.entries?.length || 0
        }))
      };

      const res = await AIService.getInsights(stockContext, userRole, allowedKomoditas);
      setInsights(res);
      setLastUpdated(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (komoditasList.length > 0) {
      loadInsights();
    }
  }, [komoditasList.length]);

  if (komoditasList.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50 border border-blue-100/90 rounded-2xl p-4 sm:p-5 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-blue-100/70">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-4 h-4 text-blue-100 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                AI Smart Insights &amp; Analisis Real-Time
              </h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-600/10 text-blue-700">
                Gemini 3.8 Flash
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Evaluasi otomatis pergerakan stok, anomali timbang, dan rekomendasi gudang
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            onClick={() => onNavigateTab('ai_logistik')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-200/90 rounded-lg transition-all shadow-2xs cursor-pointer"
            title="Buka Pusat Intelijen & Prediksi AI Logistik"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
            <span>Buka AI Logistik</span>
            <ArrowRight className="w-3 h-3 text-indigo-500" />
          </button>

          {lastUpdated && (
            <span className="text-[11px] text-slate-400 font-medium">
              Update {lastUpdated}
            </span>
          )}
          <button
            onClick={loadInsights}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-white/80 border border-transparent hover:border-slate-200 transition-all cursor-pointer disabled:opacity-50"
            title="Muat ulang analisis AI"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Grid of 3 Insight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {insights.map((item, idx) => {
          let icon = <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />;
          let badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
          let borderHighlight = 'border-slate-200/80 hover:border-blue-300';

          if (item.type === 'warning') {
            icon = <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />;
            badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
            borderHighlight = 'border-slate-200/80 hover:border-amber-300';
          } else if (item.type === 'tip') {
            icon = <Lightbulb className="w-4 h-4 text-blue-600 shrink-0" />;
            badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
            borderHighlight = 'border-slate-200/80 hover:border-blue-300';
          }

          return (
            <div
              key={idx}
              className={`bg-white rounded-xl p-3.5 border ${borderHighlight} shadow-2xs flex flex-col justify-between transition-all`}
            >
              <div>
                <div className="flex items-center justify-between gap-1.5 mb-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${badgeColor}`}>
                    {item.badge}
                  </span>
                  {icon}
                </div>
                <h4 className="text-xs font-bold text-slate-800 line-clamp-1 mb-1">
                  {item.title}
                </h4>
                <p className="text-[11.5px] text-slate-600 leading-relaxed line-clamp-3">
                  {item.text}
                </p>
              </div>

              {item.action && (
                <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => {
                      if (item.action?.toLowerCase().includes('bspp')) {
                        onNavigateTab('bspp');
                      } else if (item.action?.toLowerCase().includes('mutasi')) {
                        onNavigateTab('mutasi');
                      } else {
                        onNavigateTab('kode');
                      }
                    }}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 group cursor-pointer"
                  >
                    <span>{item.action}</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                  <span className="text-[10px] text-slate-400">Rekomendasi</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
