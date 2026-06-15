'use client';

import { useEffect, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Receipt,
  ArrowRight,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { CustomSelect } from '@/components/ui/CustomSelect';

interface PersonBalance {
  userId: string;
  name: string;
  isGuest: boolean;
  totalPaid: number;
  totalOwed: number;
  netBalance: number;
  settlementsSent: number;
  settlementsReceived: number;
}

interface SuggestedSettlement {
  from: string;
  fromId: string;
  to: string;
  toId: string;
  amount: number;
}

interface BalanceDetail {
  expenseId: string;
  description: string;
  date: string;
  amount: number;
  currency: string;
  amountINR: number;
  paidBy: string;
  splitAmount: number;
  splitAmountINR: number;
  role: string;
}

export default function DashboardPage() {
  const [balances, setBalances] = useState<PersonBalance[]>([]);
  const [settlements, setSettlements] = useState<SuggestedSettlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [details, setDetails] = useState<BalanceDetail[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');

  useEffect(() => {
    fetch('/api/groups')
      .then(r => r.json())
      .then(data => setGroups(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    setLoading(true);
    const url = selectedGroupId ? `/api/balances?groupId=${selectedGroupId}` : '/api/balances';
    fetch(url)
      .then(r => r.json())
      .then(data => {
        setBalances(data.balances || []);
        setSettlements(data.suggestedSettlements || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedGroupId]);

  const handleExpand = async (userId: string) => {
    if (expandedUser === userId) {
      setExpandedUser(null);
      setDetails([]);
      return;
    }
    setExpandedUser(userId);
    setDetailsLoading(true);
    try {
      const url = selectedGroupId 
        ? `/api/balances?userId=${userId}&groupId=${selectedGroupId}` 
        : `/api/balances?userId=${userId}`;
      const res = await fetch(url);
      const data = await res.json();
      setDetails(data.details || []);
    } catch {
      setDetails([]);
    }
    setDetailsLoading(false);
  };

  const totalExpenses = balances.reduce((s, b) => s + b.totalPaid, 0);
  const activeMembers = balances.filter(b => !b.isGuest).length;

  if (loading && balances.length === 0) {
    return (
      <div className="max-w-6xl mx-auto space-y-8 animate-pulse">
        <div className="h-10 bg-slate-800/50 rounded-lg w-48 mb-2" />
        <div className="h-4 bg-slate-800/50 rounded-lg w-72 mb-8" />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-card p-5 h-24 bg-slate-800/20" />
          ))}
        </div>
        
        <div className="h-6 bg-slate-800/50 rounded-lg w-32 mt-8 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="glass-card h-32 bg-slate-800/20" />
          ))}
        </div>
      </div>
    );
  }

  if (balances.length === 0 && !selectedGroupId) {
    return (
      <div className="max-w-2xl mx-auto mt-20 text-center">
        <div className="glass-card p-12" style={{ transform: 'none' }}>
          <AlertTriangle className="w-16 h-16 text-amber-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-100 mb-2">No Data Yet</h2>
          <p className="text-slate-400 mb-6">
            Import your expenses CSV to see balances, expenses, and settlement suggestions.
          </p>
          <a
            href="/import"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-cyan-600 rounded-xl text-white font-medium hover:from-violet-500 hover:to-cyan-500 transition-all shadow-lg shadow-violet-500/25"
          >
            Import CSV <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="relative z-50 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in-up">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Dashboard</h1>
          <p className="text-slate-400 mt-1">Overview of shared expenses and balances</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-slate-400">Group:</label>
          <CustomSelect
            value={selectedGroupId}
            onChange={setSelectedGroupId}
            options={[
              { value: "", label: "All Groups" },
              ...groups.map(g => ({ value: g.id, label: g.name }))
            ]}
            className="w-48"
          />
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in-up animate-fade-in-up-delay-1">
        <div className="glass-card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-500/15 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Total Expenses</p>
              <p className="text-xl font-bold text-slate-100">{formatCurrency(totalExpenses)}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/15 flex items-center justify-center">
              <Users className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Active Members</p>
              <p className="text-xl font-bold text-slate-100">{activeMembers}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/15 flex items-center justify-center">
              <ArrowRight className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Settlements Needed</p>
              <p className="text-xl font-bold text-slate-100">{settlements.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="glass-card p-6 animate-fade-in-up animate-fade-in-up-delay-2">
        <h2 className="text-xl font-semibold text-slate-200 mb-6">Spending Overview</h2>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={balances.filter(b => !b.isGuest)} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value}`} />
              <Tooltip 
                cursor={{ fill: '#1e293b' }} 
                contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', backdropFilter: 'blur(16px)' }}
                itemStyle={{ color: '#e2e8f0' }}
              />
              <Bar dataKey="totalPaid" name="Total Paid" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="totalOwed" name="Total Owed" fill="#06b6d4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Balance Cards */}
      <div className="animate-fade-in-up animate-fade-in-up-delay-3">
        <h2 className="text-xl font-semibold text-slate-200 mb-4">Net Balances</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {balances
            .filter(b => !b.isGuest)
            .sort((a, b) => b.netBalance - a.netBalance)
            .map(balance => (
              <div key={balance.userId} className="glass-card overflow-hidden group transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:border-white/10" style={{ transform: 'none' }}>
                <button
                  onClick={() => handleExpand(balance.userId)}
                  className="w-full p-5 text-left bg-transparent transition-colors relative"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-inner ${
                        balance.netBalance >= 0
                          ? 'bg-gradient-to-br from-emerald-400/20 to-emerald-600/20 text-emerald-400 border border-emerald-500/20'
                          : 'bg-gradient-to-br from-rose-400/20 to-rose-600/20 text-rose-400 border border-rose-500/20'
                      }`}>
                        {balance.name[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-100 group-hover:text-white transition-colors">{balance.name}</p>
                        <p className="text-xs text-slate-500">
                          Paid {formatCurrency(balance.totalPaid)}
                        </p>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-800/50 flex items-center justify-center group-hover:bg-slate-700/50 transition-colors">
                      {expandedUser === balance.userId
                        ? <ChevronUp className="w-4 h-4 text-slate-400" />
                        : <ChevronDown className="w-4 h-4 text-slate-400" />
                      }
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    {balance.netBalance >= 0 ? (
                      <div className="p-1 rounded bg-emerald-500/10">
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                      </div>
                    ) : (
                      <div className="p-1 rounded bg-rose-500/10">
                        <TrendingDown className="w-4 h-4 text-rose-400" />
                      </div>
                    )}
                    <span className={`text-xl font-bold tracking-tight ${
                      balance.netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {balance.netBalance >= 0 ? '+' : ''}{formatCurrency(balance.netBalance)}
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-slate-500 mt-1 uppercase tracking-wider">
                    {balance.netBalance >= 0
                      ? 'Total Owed To You'
                      : 'Total You Owe'
                    }
                  </p>
                  
                  {/* Subtle decorative progress line */}
                  <div className="absolute bottom-0 left-0 h-[2px] bg-slate-800/50 w-full">
                    <div 
                      className={`h-full ${balance.netBalance >= 0 ? 'bg-emerald-500/50' : 'bg-rose-500/50'}`} 
                      style={{ width: `${Math.min(100, Math.max(5, (Math.abs(balance.netBalance) / (balance.totalPaid || 1)) * 100))}%` }}
                    />
                  </div>
                </button>

                {/* Expanded Detail */}
                {expandedUser === balance.userId && (
                  <div className="border-t border-slate-800/50 p-4 max-h-64 overflow-y-auto">
                    {(() => {
                      if (detailsLoading) {
                        return (
                          <div className="flex justify-center py-4">
                            <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                          </div>
                        );
                      }
                      if (details.length === 0) {
                        return <p className="text-slate-500 text-sm text-center py-2">No expense details</p>;
                      }
                      return (
                        <div className="space-y-2">
                          {details.map((d) => (
                            <div key={`${d.expenseId}-${d.role}`} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800/30 last:border-0">
                              <div className="flex-1 min-w-0">
                                <p className="text-slate-300 truncate">{d.description}</p>
                                <p className="text-slate-600">{d.date} • paid by {d.paidBy}</p>
                              </div>
                              <div className="text-right ml-3">
                                <p className={`font-medium ${d.role === 'payer' || d.role === 'both' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {d.role === 'payer' ? '+' : '-'}{formatCurrency(d.splitAmountINR)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>

      {/* Settlement Suggestions */}
      {settlements.length > 0 && (
        <div className="animate-fade-in-up animate-fade-in-up-delay-3">
          <h2 className="text-xl font-semibold text-slate-200 mb-4 flex items-center gap-2">
            Optimal Settlements{' '}
            <span className="text-sm font-normal text-slate-500">
              (minimized to {settlements.length} transaction{settlements.length > 1 ? 's' : ''})
            </span>
          </h2>
          <div className="space-y-3">
            {settlements.map((s) => (
              <div key={`${s.fromId}-${s.toId}`} className="glass-card p-4 flex items-center gap-4" style={{ transform: 'none' }}>
                <div className="w-10 h-10 rounded-full bg-rose-500/15 flex items-center justify-center text-sm font-bold text-rose-400">
                  {s.from[0]}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-200">{s.from}</span>
                    <ArrowRight className="w-4 h-4 text-slate-600" />
                    <span className="font-medium text-slate-200">{s.to}</span>
                  </div>
                </div>
                <span className="text-lg font-bold text-violet-400">
                  {formatCurrency(s.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
