'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, ArrowLeftRight, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';

interface RecordedSettlement {
  id: string;
  from: string;
  to: string;
  amount: number;
  date: string;
  notes: string | null;
  csvRow: number | null;
}

interface SuggestedSettlement {
  from: string;
  fromId: string;
  to: string;
  toId: string;
  amount: number;
}

export default function SettlementsPage() {
  const [recorded, setRecorded] = useState<RecordedSettlement[]>([]);
  const [suggested, setSuggested] = useState<SuggestedSettlement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/settlements').then(r => r.json()),
      fetch('/api/balances').then(r => r.json()),
    ]).then(([settData, balData]) => {
      setRecorded(Array.isArray(settData) ? settData : []);
      setSuggested(balData.suggestedSettlements || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="animate-fade-in-up">
        <h1 className="text-3xl font-bold gradient-text">Settlements</h1>
        <p className="text-slate-400 mt-1">Recorded payments and optimal settlement suggestions</p>
      </div>

      {/* Recorded Settlements */}
      <div className="animate-fade-in-up animate-fade-in-up-delay-1">
        <h2 className="text-xl font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          Recorded Settlements
          <span className="text-sm font-normal text-slate-500">({recorded.length})</span>
        </h2>

        {recorded.length === 0 ? (
          <div className="glass-card p-8 text-center" style={{ transform: 'none' }}>
            <p className="text-slate-500">No settlements recorded yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recorded.map(s => (
              <div key={s.id} className="glass-card p-4 flex items-center gap-4 group transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(16,185,129,0.15)] hover:border-emerald-500/30 relative overflow-hidden" style={{ transform: 'none' }}>
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400/20 to-emerald-600/20 border border-emerald-500/20 flex items-center justify-center text-sm font-bold text-emerald-400 shadow-inner group-hover:scale-110 transition-transform duration-500">
                  {s.from[0]}
                </div>
                <div className="flex-1 relative z-10">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-200 group-hover:text-white transition-colors">{s.from}</span>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                    <span className="font-semibold text-slate-200 group-hover:text-white transition-colors">{s.to}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-500 font-mono">{s.date}</span>
                    {s.notes && (
                      <span className="text-xs text-slate-500 group-hover:text-slate-400 transition-colors">• {s.notes}</span>
                    )}
                  </div>
                </div>
                <span className="text-lg font-bold tracking-tight text-emerald-400 group-hover:text-emerald-300 group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.5)] transition-all relative z-10">
                  {formatCurrency(s.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Suggested Settlements */}
      <div className="animate-fade-in-up animate-fade-in-up-delay-2">
        <h2 className="text-xl font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <ArrowLeftRight className="w-5 h-5 text-violet-400" />
          Optimal Settlement Plan
          <span className="text-sm font-normal text-slate-500">
            (min-cash-flow: {suggested.length} transaction{suggested.length !== 1 ? 's' : ''})
          </span>
        </h2>

        {suggested.length === 0 ? (
          <div className="glass-card p-12 text-center relative overflow-hidden" style={{ transform: 'none' }}>
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay" />
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 to-transparent" />
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4 shadow-[0_0_40px_rgba(16,185,129,0.3)]">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              </div>
              <p className="text-2xl font-bold text-white mb-2 tracking-tight">All Settled Up!</p>
              <p className="text-emerald-400/80 font-medium">No outstanding balances</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {suggested.map((s, i) => (
              <div key={i} className="glass-card p-6 flex items-center gap-4 group transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(139,92,246,0.2)] hover:border-violet-500/30 relative overflow-hidden" style={{ transform: 'none' }}>
                <div className="absolute inset-0 bg-gradient-to-r from-rose-500/0 via-violet-500/5 to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-rose-400/20 to-rose-600/20 border border-rose-500/20 shadow-inner flex items-center justify-center group-hover:scale-110 transition-transform duration-500 relative z-10">
                  <span className="text-lg font-bold text-rose-400">{s.from[0]}</span>
                </div>
                
                <div className="flex-1 flex items-center gap-4 relative z-10">
                  <div className="min-w-[80px]">
                    <p className="font-semibold text-slate-200 group-hover:text-white transition-colors truncate">{s.from}</p>
                    <p className="text-xs font-semibold uppercase tracking-wider text-rose-400">owes</p>
                  </div>
                  
                  <div className="flex-1 flex items-center justify-center group-hover:px-2 transition-all duration-500">
                    <div className="h-[2px] flex-1 bg-gradient-to-r from-rose-500/50 to-transparent rounded-full" />
                    <div className="px-5 py-2 rounded-full bg-slate-950/80 border border-white/10 shadow-[0_0_20px_rgba(139,92,246,0.15)] group-hover:border-violet-500/50 group-hover:shadow-[0_0_30px_rgba(139,92,246,0.3)] transition-all duration-300">
                      <span className="text-base tracking-tight font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-cyan-300">
                        {formatCurrency(s.amount)}
                      </span>
                    </div>
                    <div className="h-[2px] flex-1 bg-gradient-to-l from-emerald-500/50 to-transparent rounded-full" />
                  </div>
                  
                  <div className="text-right min-w-[80px]">
                    <p className="font-semibold text-slate-200 group-hover:text-white transition-colors truncate">{s.to}</p>
                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">receives</p>
                  </div>
                </div>
                
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400/20 to-emerald-600/20 border border-emerald-500/20 shadow-inner flex items-center justify-center group-hover:scale-110 transition-transform duration-500 relative z-10">
                  <span className="text-lg font-bold text-emerald-400">{s.to[0]}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
