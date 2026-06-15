"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2, CheckCircle, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { keepDuplicateExpense, discardDuplicateExpense } from "./actions";

type DuplicateExpense = {
  id: string;
  description: string;
  amount: number;
  date: string;
  paidBy: { name: string } | null;
  csvRow: number | null;
  notes: string | null;
};

export default function AnomaliesPage() {
  const [duplicates, setDuplicates] = useState<DuplicateExpense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/anomalies/duplicates')
      .then(res => res.json())
      .then(data => {
        setDuplicates(data);
        setLoading(false);
      });
  }, []);

  const handleKeep = async (id: string) => {
    setDuplicates(prev => prev.filter(d => d.id !== id));
    await keepDuplicateExpense(id);
  };

  const handleDiscard = async (id: string) => {
    setDuplicates(prev => prev.filter(d => d.id !== id));
    await discardDuplicateExpense(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/" className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Pending Anomalies</h1>
          <p className="text-slate-400 text-sm mt-1">Review duplicates and conflicts before they affect balances.</p>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-white/10 flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-amber-500" />
          <h2 className="text-lg font-bold">Duplicate Expenses Requiring Review</h2>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-400">Loading pending anomalies...</p>
          </div>
        ) : duplicates.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4 opacity-50" />
            <p>No pending anomalies to review. All caught up!</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {duplicates.map((dup) => (
              <div key={dup.id} className="p-6 flex flex-col md:flex-row gap-6 md:items-center justify-between hover:bg-white/5 transition-colors">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="bg-amber-500/20 text-amber-400 text-xs font-bold px-2 py-1 rounded">
                      CSV Row {dup.csvRow}
                    </span>
                    <span className="text-sm text-slate-400">
                      {new Date(dup.date).toISOString().split('T')[0]}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold">{dup.description}</h3>
                  <div className="text-sm text-slate-400">
                    Paid by <span className="text-white font-medium">{dup.paidBy?.name || 'Unknown'}</span>
                  </div>
                  {dup.notes && (
                    <div className="text-sm text-slate-500 italic">
                      Notes: "{dup.notes}"
                    </div>
                  )}
                </div>

                <div className="flex flex-col md:items-end gap-4 shrink-0">
                  <div className="text-2xl font-bold text-slate-200">
                    {formatCurrency(dup.amount)}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDiscard(dup.id)}
                      className="px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Discard Duplicate
                    </button>
                    <button
                      onClick={() => handleKeep(dup.id)}
                      className="px-4 py-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Keep Both
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
