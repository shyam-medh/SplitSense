'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, FileText, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { CustomSelect } from '@/components/ui/CustomSelect';

interface ImportResult {
  success: boolean;
  expensesCreated: number;
  settlementsCreated: number;
  rowsSkipped: number;
  usersCreated: string[];
  logs: Array<{
    level: string;
    csvRow: number;
    field: string;
    rawValue: string;
    description: string;
    actionTaken: string;
    category: string;
  }>;
  error?: string;
}

function getBadgeClass(level: string): string {
  if (level === 'ERROR') return 'badge-error';
  if (level === 'WARNING') return 'badge-warning';
  return 'badge-info';
}

export default function ImportPage() {
  const [dragOver, setDragOver] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/groups')
      .then(r => r.json())
      .then(data => setGroups(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, []);

  const handleImport = useCallback(async (file: File) => {
    setImporting(true);
    setResult(null);
    setProgress(10);

    const formData = new FormData();
    formData.append('file', file);
    if (selectedGroupId) {
      formData.append('groupId', selectedGroupId);
    }

    setProgress(30);

    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      });

      setProgress(80);
      const data = await res.json();
      setProgress(100);

      setTimeout(() => {
        setResult(data);
        setImporting(false);
      }, 500);
    } catch (err) {
      setResult({
        success: false,
        expensesCreated: 0,
        settlementsCreated: 0,
        rowsSkipped: 0,
        usersCreated: [],
        logs: [],
        error: err instanceof Error ? err.message : 'Import failed',
      });
      setImporting(false);
    }
  }, [selectedGroupId]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith('.csv')) {
      handleImport(file);
    }
  }, [handleImport]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImport(file);
    }
  }, [handleImport]);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="relative z-50 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in-up">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Import CSV</h1>
          <p className="text-slate-400 mt-1">
            Upload your expenses CSV file to import and analyze data
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <label htmlFor="import-group-select" className="text-sm font-medium text-slate-400">Import to Group:</label>
          <CustomSelect
            id="import-group-select"
            value={selectedGroupId}
            onChange={setSelectedGroupId}
            options={[
              { value: "", label: "Create New Group" },
              ...groups.map(g => ({ value: g.id, label: g.name }))
            ]}
            className="w-56"
          />
        </div>
      </div>

      {/* Upload Zone */}
      <div className="animate-fade-in-up animate-fade-in-up-delay-1">
        <div className="relative group">
          {/* Animated Glow Behind Upload Zone */}
          <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 via-transparent to-cyan-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          
          <button
            type="button"
            className={`relative w-full border-2 border-dashed rounded-3xl p-16 text-center transition-all duration-500 cursor-pointer overflow-hidden backdrop-blur-xl ${
              dragOver 
                ? 'border-violet-400 bg-violet-500/10 shadow-[0_0_40px_rgba(139,92,246,0.3)] scale-[1.02]' 
                : 'border-white/10 bg-slate-900/40 hover:border-violet-500/50 hover:bg-slate-900/60'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            {/* Subtle inner grid pattern */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay pointer-events-none" />
            
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileSelect}
            />

            {importing ? (
              <div className="space-y-6 relative z-10">
                <div className="relative w-16 h-16 mx-auto">
                  <div className="absolute inset-0 border-4 border-violet-500/20 rounded-full" />
                  <div className="absolute inset-0 border-4 border-violet-400 border-t-transparent rounded-full animate-spin" />
                  <Loader2 className="w-8 h-8 text-violet-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <p className="text-slate-200 font-semibold tracking-wide">Importing & analyzing...</p>
                <div className="max-w-xs mx-auto h-2 bg-slate-950/50 rounded-full overflow-hidden border border-white/5">
                  <div 
                    className="h-full bg-gradient-to-r from-violet-500 to-cyan-400 rounded-full transition-all duration-300 ease-out relative" 
                    style={{ width: `${progress}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-[shimmer_1s_linear_infinite]" />
                  </div>
                </div>
                <p className="text-xs font-mono text-slate-400">
                  Parsing CSV → Detecting anomalies → Calculating splits
                </p>
              </div>
            ) : (
              <div className="space-y-4 relative z-10 transform group-hover:-translate-y-2 transition-transform duration-500">
                <div className="w-20 h-20 mx-auto rounded-full bg-white/5 flex items-center justify-center border border-white/10 group-hover:scale-110 group-hover:shadow-[0_0_30px_rgba(139,92,246,0.3)] transition-all duration-500">
                  <Upload className={`w-8 h-8 transition-colors duration-500 ${dragOver ? 'text-violet-300' : 'text-slate-400 group-hover:text-violet-400'}`} />
                </div>
                <div>
                  <p className="text-lg text-slate-200 font-semibold mb-1">
                    Drop your CSV file here
                  </p>
                  <p className="text-sm text-slate-400">
                    or <span className="text-violet-400 group-hover:text-cyan-400 transition-colors">click to browse</span> your computer
                  </p>
                </div>
                <p className="text-xs text-slate-500 bg-slate-950/50 inline-block px-3 py-1.5 rounded-full border border-white/5">
                  Supports Expenses Export format (CSV)
                </p>
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-6 animate-fade-in-up">
          {/* Summary Card */}
          <div className={`glass-card p-6 ${result.success ? '' : 'border-rose-500/30'}`} style={{ transform: 'none' }}>
            <div className="flex items-center gap-3 mb-4">
              {result.success ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-rose-400" />
              )}
              <h2 className="text-xl font-bold text-slate-100">
                {result.success ? 'Import Successful' : 'Import Failed'}
              </h2>
            </div>

            {result.error && (
              <p className="text-rose-400 mb-4 text-sm">{result.error}</p>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 rounded-lg bg-slate-800/50">
                <p className="text-2xl font-bold text-emerald-400">{result.expensesCreated}</p>
                <p className="text-xs text-slate-500">Expenses</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-800/50">
                <p className="text-2xl font-bold text-cyan-400">{result.settlementsCreated}</p>
                <p className="text-xs text-slate-500">Settlements</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-800/50">
                <p className="text-2xl font-bold text-amber-400">{result.rowsSkipped}</p>
                <p className="text-xs text-slate-500">Rows Skipped</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-800/50">
                <p className="text-2xl font-bold text-violet-400">{result.logs.length}</p>
                <p className="text-xs text-slate-500">Anomalies Found</p>
              </div>
            </div>

            {result.usersCreated.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-800/50">
                <p className="text-xs text-slate-500 mb-2">Users Created:</p>
                <div className="flex flex-wrap gap-2">
                  {result.usersCreated.map(name => (
                    <span key={name} className="badge badge-info">{name}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Log Preview */}
          {result.logs.length > 0 && (
            <div className="glass-card overflow-hidden" style={{ transform: 'none' }}>
              <div className="p-4 border-b border-slate-800/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-400" />
                  <h3 className="font-semibold text-slate-200">Anomaly Log Preview</h3>
                </div>
                <a
                  href="/import-report"
                  className="text-sm text-violet-400 hover:text-violet-300 transition-colors"
                >
                  View Full Report →
                </a>
              </div>
              <div className="max-h-96 overflow-y-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Level</th>
                      <th>Row</th>
                      <th>Description</th>
                      <th>Action Taken</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.logs.slice(0, 15).map((log) => (
                      <tr key={`${log.csvRow}-${log.field}-${log.category}`}>
                        <td>
                          <span className={`badge ${getBadgeClass(log.level)}`}>
                            {log.level}
                          </span>
                        </td>
                        <td className="font-mono text-sm">{log.csvRow || '—'}</td>
                        <td className="max-w-xs truncate font-medium text-slate-100">{log.description}</td>
                        <td className="max-w-xs truncate text-slate-400">{log.actionTaken}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {result.logs.length > 15 && (
                  <div className="p-3 text-center border-t border-slate-800/50">
                    <a href="/import-report" className="text-sm text-violet-400 hover:text-violet-300">
                      View all {result.logs.length} entries →
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
