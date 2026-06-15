'use client';

import { useEffect, useState } from 'react';
import { FileText, AlertTriangle, Info, AlertCircle, Filter } from 'lucide-react';
import { Pagination, PAGE_SIZE } from '@/components/ui/Pagination';

interface LogEntry {
  id: string;
  level: string;
  csvRow: number | null;
  field: string | null;
  rawValue: string | null;
  description: string;
  actionTaken: string;
  category: string;
}

interface Summary {
  total: number;
  byLevel: { INFO: number; WARNING: number; ERROR: number };
  byCategory: Record<string, { count: number; label: string }>;
}

const CATEGORY_COLORS: Record<string, string> = {
  A: 'from-violet-500 to-purple-500',
  B: 'from-cyan-500 to-blue-500',
  C: 'from-amber-500 to-orange-500',
  D: 'from-rose-500 to-pink-500',
  E: 'from-emerald-500 to-teal-500',
  F: 'from-indigo-500 to-violet-500',
  G: 'from-yellow-500 to-amber-500',
};

export default function ImportReportPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetch('/api/import-report')
      .then(r => r.json())
      .then(data => {
        setLogs(data.logs || []);
        setSummary(data.summary || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredLogs = logs.filter(log => {
    if (filterLevel !== 'ALL' && log.level !== filterLevel) return false;
    if (filterCategory !== 'ALL' && log.category !== filterCategory) return false;
    return true;
  });

  const paginatedLogs = filteredLogs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleFilterCategory = (cat: string) => { setFilterCategory(cat); setCurrentPage(1); };
  const handleFilterLevel = (level: string) => { setFilterLevel(level); setCurrentPage(1); };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="max-w-2xl mx-auto mt-20 text-center">
        <div className="glass-card p-12" style={{ transform: 'none' }}>
          <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-100 mb-2">No Import Report</h2>
          <p className="text-slate-400 mb-6">
            Import a CSV file first to generate the anomaly report.
          </p>
          <a href="/import" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-cyan-600 rounded-xl text-white font-medium hover:from-violet-500 hover:to-cyan-500 transition-all shadow-lg shadow-violet-500/25">
            Go to Import
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 pb-12">
      {/* Header & Main Summary */}
      <div className="relative glass-card p-8 md:p-12 overflow-hidden animate-fade-in-up border-0 ring-1 ring-white/10" style={{ transform: 'none' }}>
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-violet-600/20 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-cyan-600/20 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 mb-4 tracking-tight">
              Import Report
            </h1>
            <p className="text-lg text-slate-400 max-w-xl leading-relaxed">
              A comprehensive breakdown of all anomalies detected during your CSV import, categorized by severity and logic rules.
            </p>
          </div>

          {summary && (
            <div className="flex gap-6 items-center bg-slate-950/40 p-6 rounded-3xl border border-white/5 backdrop-blur-md shadow-2xl">
              <div className="text-center px-4 border-r border-white/10">
                <p className="text-4xl font-black text-slate-100">{summary.total}</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">Total Issues</p>
              </div>
              <div className="flex gap-6 px-2">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center mb-2 shadow-[0_0_15px_rgba(244,63,94,0.2)]">
                    <AlertCircle className="w-5 h-5 text-rose-400" />
                  </div>
                  <p className="text-lg font-bold text-rose-400">{summary.byLevel.ERROR}</p>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center mb-2 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                  </div>
                  <p className="text-lg font-bold text-amber-400">{summary.byLevel.WARNING}</p>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center mb-2 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                    <Info className="w-5 h-5 text-cyan-400" />
                  </div>
                  <p className="text-lg font-bold text-cyan-400">{summary.byLevel.INFO}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Category Breakdown Grid */}
      {summary && (
        <div className="animate-fade-in-up animate-fade-in-up-delay-1">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px bg-gradient-to-r from-violet-500/50 to-transparent flex-1" />
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-widest px-4">Anomalies by Category</h3>
            <div className="h-px bg-gradient-to-l from-violet-500/50 to-transparent flex-1" />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {Object.entries(summary.byCategory).map(([cat, data]) => {
              const isActive = filterCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => handleFilterCategory(isActive ? 'ALL' : cat)}
                  className={`relative overflow-hidden group rounded-2xl p-5 text-left transition-all duration-500 ${
                    isActive 
                      ? 'bg-slate-800/80 ring-2 ring-violet-500 shadow-[0_0_30px_rgba(139,92,246,0.15)] scale-105 z-10' 
                      : 'bg-slate-900/40 hover:bg-slate-800/60 ring-1 ring-white/5 hover:ring-white/10'
                  }`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${CATEGORY_COLORS[cat] || 'from-slate-500 to-slate-600'} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
                  {isActive && <div className={`absolute inset-0 bg-gradient-to-br ${CATEGORY_COLORS[cat] || 'from-slate-500 to-slate-600'} opacity-10`} />}
                  
                  <div className="flex items-center justify-between mb-4 relative z-10">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${CATEGORY_COLORS[cat] || 'from-slate-500 to-slate-600'} flex items-center justify-center text-xs font-black text-white shadow-lg shadow-black/50`}>
                      {cat}
                    </div>
                    <span className={`text-2xl font-black ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'} transition-colors`}>
                      {data.count}
                    </span>
                  </div>
                  <p className={`text-[11px] font-semibold leading-relaxed relative z-10 transition-colors ${isActive ? 'text-violet-200' : 'text-slate-500 group-hover:text-slate-400'}`}>
                    {data.label}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter Segmented Control */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in-up animate-fade-in-up-delay-2 bg-slate-900/50 backdrop-blur-xl p-3 rounded-2xl border border-white/5">
        <div className="flex items-center gap-2 p-1 bg-slate-950/50 rounded-xl overflow-hidden shadow-inner">
          <div className="px-3 text-slate-500"><Filter className="w-4 h-4" /></div>
          {['ALL', 'INFO', 'WARNING', 'ERROR'].map(level => {
            const isSelected = filterLevel === level;
            return (
              <button
                key={level}
                onClick={() => handleFilterLevel(level)}
                className={`relative px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                  isSelected ? 'text-white' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                }`}
              >
                {isSelected && (
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-cyan-600 rounded-lg shadow-lg" />
                )}
                <span className="relative z-10">{level}</span>
              </button>
            );
          })}
        </div>
        <div className="text-sm font-medium text-slate-400 px-4">
          Showing <span className="text-white">{filteredLogs.length}</span> of {logs.length} logs
        </div>
      </div>

      {/* Modern Data Table */}
      <div className="glass-card overflow-hidden animate-fade-in-up animate-fade-in-up-delay-3 border-0 ring-1 ring-white/10" style={{ transform: 'none' }}>
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-slate-950/90 backdrop-blur-xl z-20 shadow-md">
            <tr>
              <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-white/5">Severity</th>
              <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-white/5">Row</th>
              <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-white/5">Category</th>
              <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-white/5">Field & Value</th>
              <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-white/5">Issue Description</th>
              <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-white/5">Action Taken</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.02]">
            {paginatedLogs.map((log) => {
                let levelClasses = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
                if (log.level === 'ERROR') levelClasses = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
                else if (log.level === 'WARNING') levelClasses = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                
                return (
                <tr key={log.id} className="group hover:bg-white/[0.02] transition-colors duration-300">
                  <td className="py-5 px-6 align-top">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase border ${levelClasses}`}>
                      {log.level === 'ERROR' && <AlertCircle className="w-3 h-3" />}
                      {log.level === 'WARNING' && <AlertTriangle className="w-3 h-3" />}
                      {log.level === 'INFO' && <Info className="w-3 h-3" />}
                      {log.level}
                    </span>
                  </td>
                  <td className="py-5 px-6 align-top">
                    <span className="font-mono text-xs font-medium text-slate-500 bg-slate-900 px-2 py-1 rounded border border-white/5">
                      {log.csvRow ? `#${log.csvRow}` : '—'}
                    </span>
                  </td>
                  <td className="py-5 px-6 align-top">
                    <span className={`inline-flex w-8 h-8 rounded-lg bg-gradient-to-br ${CATEGORY_COLORS[log.category] || 'from-slate-500 to-slate-600'} items-center justify-center text-[11px] font-black text-white shadow-md`}>
                      {log.category}
                    </span>
                  </td>
                  <td className="py-5 px-6 align-top">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">{log.field || 'General'}</span>
                      {log.rawValue && (
                        <span className="font-mono text-[11px] text-violet-300 bg-violet-500/10 px-2 py-1 rounded border border-violet-500/20 max-w-[150px] truncate" title={log.rawValue}>
                          {log.rawValue}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-5 px-6 align-top max-w-sm">
                    <p className="text-sm font-medium text-slate-200 leading-relaxed">{log.description}</p>
                  </td>
                  <td className="py-5 px-6 align-top max-w-sm">
                    <div className="flex gap-3">
                      <div className="w-1 min-h-[1.5rem] bg-gradient-to-b from-slate-600 to-transparent rounded-full opacity-50" />
                      <p className="text-sm text-slate-400 leading-relaxed">{log.actionTaken}</p>
                    </div>
                  </td>
                </tr>
                );
            })}
          </tbody>
        </table>
        <Pagination
          totalItems={filteredLogs.length}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}
