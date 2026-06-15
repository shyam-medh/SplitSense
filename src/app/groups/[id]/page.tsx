'use client';

import React, { useEffect, useState, use, useCallback } from 'react';
import Link from 'next/link';
import {
  Users, Receipt, ArrowLeft,
  ChevronUp, ChevronDown, Plus, X, Trash2, UserPlus,
  DollarSign, AlertCircle, CheckCircle2, Loader2, Calendar
} from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { ModalPortal } from '@/components/ui/ModalPortal';
import { Pagination, PAGE_SIZE } from '@/components/ui/Pagination';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

/* ---------- Types ---------- */
interface Member {
  id: string;
  userId: string;
  name: string;
  isGuest: boolean;
  joinedAt: string;
  leftAt: string | null;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  currency: string;
  date: string;
  paidBy: string | null;
  paidById: string | null;
  splits: { userId: string; name: string; amountOwed: number }[];
}

interface PersonBalance {
  userId: string;
  name: string;
  isGuest: boolean;
  totalPaid: number;
  totalOwed: number;
  netBalance: number;
}

interface SuggestedSettlement {
  from: string;
  fromId: string;
  to: string;
  toId: string;
  amount: number;
}

function AddExpenseModal({
  groupId,
  members,
  onClose,
  onAdded,
}: Readonly<{
  groupId: string;
  members: Member[];
  onClose: () => void;
  onAdded: () => void;
}>) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidById, setPaidById] = useState(members[0]?.userId ?? '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!description.trim() || !amount || !paidById) {
      setError('Please fill in all required fields.');
      return;
    }
    setLoading(true);
    setError('');
    const res = await fetch(`/api/groups/${groupId}/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description, amount: Number.parseFloat(amount), paidById, date, notes }),
    });
    if (res.ok) {
      onAdded();
      onClose();
    } else {
      const data = await res.json();
      setError(data.error ?? 'Failed to add expense');
    }
    setLoading(false);
  };

  const activeMembers = members.filter(m => !m.leftAt);

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
        <div className="glass-card w-full max-w-md p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Receipt className="w-5 h-5 text-violet-400" /> Add Expense
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="expense-desc" className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Description *</label>
            <input
              id="expense-desc"
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g., Dinner, Petrol, Groceries..."
              className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="expense-amount" className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Amount (₹) *</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">₹</span>
                <input
                  id="expense-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-900/50 border border-white/10 rounded-xl pl-8 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>
            </div>
            <div>
              <label htmlFor="expense-date" className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  id="expense-date"
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  style={{ colorScheme: 'dark' }}
                  className="w-full bg-slate-900/50 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="expense-paidby" className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Paid By *</label>
            <CustomSelect
              id="expense-paidby"
              value={paidById}
              onChange={setPaidById}
              options={activeMembers.map(m => ({ label: m.name, value: m.userId }))}
              placeholder="Select who paid..."
            />
          </div>

          <div>
            <label htmlFor="expense-notes" className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Notes (optional)</label>
            <input
              id="expense-notes"
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any additional notes..."
              className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>

          <div className="p-3 rounded-lg bg-violet-500/5 border border-violet-500/20 text-xs text-slate-400">
            💡 Cost will be split <span className="text-violet-400 font-semibold">equally</span> among all {activeMembers.length} active members ({formatCurrency(Number.parseFloat(amount || '0') / Math.max(activeMembers.length, 1))} each)
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm font-semibold hover:bg-white/5 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 transition-all"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add Expense
            </button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>
  );
}

/* ---------- Main Page ---------- */
export default function GroupDetailsPage(props: Readonly<{ params: Promise<{ id: string }> }>) {
  const params = use(props.params);
  const groupId = params.id;

  const [groupName, setGroupName] = useState('Loading...');
  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balances, setBalances] = useState<PersonBalance[]>([]);
  const [settlements, setSettlements] = useState<SuggestedSettlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'expenses' | 'members'>('overview');
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [currentExpensePage, setCurrentExpensePage] = useState(1);

  // Add Member state
  const [newMemberName, setNewMemberName] = useState('');
  const [addMemberLoading, setAddMemberLoading] = useState(false);
  const [addMemberError, setAddMemberError] = useState('');
  const [addMemberSuccess, setAddMemberSuccess] = useState('');

  const fetchAll = useCallback(async () => {
    try {
      const [groupRes, membersRes, expensesRes, balancesRes] = await Promise.all([
        fetch(`/api/groups/${groupId}`),
        fetch(`/api/groups/${groupId}/members`),
        fetch(`/api/groups/${groupId}/expenses`),
        fetch(`/api/balances?groupId=${groupId}`),
      ]);

      if (groupRes.ok) {
        const g = await groupRes.json();
        setGroupName(g.name);
      }
      if (membersRes.ok) setMembers(await membersRes.json());
      if (expensesRes.ok) setExpenses(await expensesRes.json());
      if (balancesRes.ok) {
        const { balances: b, suggestedSettlements: s } = await balancesRes.json();
        setBalances(b ?? []);
        setSettlements(s ?? []);
      }
    } catch (err) {
      console.error('Failed to load group data', err);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleAddMember = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;
    setAddMemberLoading(true);
    setAddMemberError('');
    setAddMemberSuccess('');
    const res = await fetch(`/api/groups/${groupId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newMemberName }),
    });
    if (res.ok) {
      setAddMemberSuccess(`${newMemberName} added successfully!`);
      setNewMemberName('');
      fetchAll();
    } else {
      const d = await res.json();
      setAddMemberError(d.error ?? 'Failed to add member');
    }
    setAddMemberLoading(false);
    setTimeout(() => setAddMemberSuccess(''), 3000);
  };

  const handleRemoveMember = async (userId: string, name: string) => {
    if (!confirm(`Remove ${name} from this group?`)) return;
    await fetch(`/api/groups/${groupId}/members`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    fetchAll();
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm('Delete this expense?')) return;
    await fetch(`/api/groups/${groupId}/expenses`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expenseId }),
    });
    fetchAll();
  };

  const activeMembers = members.filter(m => !m.leftAt);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const chartData = balances.map(b => ({
    name: b.name.split(' ')[0],
    Paid: Math.round(b.totalPaid),
    Owed: Math.round(b.totalOwed),
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading group…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {showAddExpense && (
        <AddExpenseModal
          groupId={groupId}
          members={activeMembers}
          onClose={() => setShowAddExpense(false)}
          onAdded={fetchAll}
        />
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link href="/groups" className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm mb-2 transition-colors w-fit">
            <ArrowLeft className="w-4 h-4" /> Back to Groups
          </Link>
          <h1 className="text-3xl font-bold">{groupName}</h1>
          <p className="text-slate-400 text-sm mt-1">
            {activeMembers.length} members · {expenses.length} expenses · {formatCurrency(totalExpenses)} total
          </p>
        </div>
        <button
          onClick={() => setShowAddExpense(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-all shadow-[0_0_20px_rgba(139,92,246,0.2)] hover:shadow-[0_0_30px_rgba(139,92,246,0.4)]"
        >
          <Plus className="w-4 h-4" /> Add Expense
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider">Total Spent</p>
            <p className="text-xl font-bold">{formatCurrency(totalExpenses)}</p>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider">Members</p>
            <p className="text-xl font-bold">{activeMembers.length}</p>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Receipt className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider">Settlements</p>
            <p className="text-xl font-bold">{settlements.length}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-900/50 border border-white/5 rounded-2xl w-fit">
        {(['overview', 'expenses', 'members'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-xl text-sm font-semibold capitalize transition-all ${activeTab === tab ? 'bg-gradient-to-r from-violet-600 to-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ——— OVERVIEW TAB ——— */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Chart */}
          {chartData.length > 0 && (
            <div className="glass-card p-6">
              <h2 className="text-lg font-bold mb-4">Spending Overview</h2>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', fontSize: 13 }}
                    formatter={(v: any, n: any) => [`₹${v.toLocaleString('en-IN')}`, n]}
                  />
                  <Bar dataKey="Paid" fill="#8b5cf6" radius={[6,6,0,0]} />
                  <Bar dataKey="Owed" fill="#06b6d4" radius={[6,6,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Net Balances */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-bold mb-4">Net Balances</h2>
            {balances.length === 0 ? (
              <p className="text-slate-400 text-sm">No balance data yet. Add some expenses!</p>
            ) : (
              <div className="space-y-3">
                {balances.map(b => {
                  const isExpanded = expandedUser === b.userId;
                  const isPositive = b.netBalance >= 0;
                  const initials = b.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                  const colors = ['from-violet-500 to-purple-500', 'from-cyan-500 to-blue-500', 'from-emerald-500 to-teal-500', 'from-amber-500 to-orange-500', 'from-rose-500 to-pink-500', 'from-indigo-500 to-violet-500'];
                  const colorIdx = (b.name.codePointAt(0) ?? 0) % colors.length;
                  return (
                    <div key={b.userId} className="rounded-xl border border-white/5 overflow-hidden">
                      <button
                        onClick={() => setExpandedUser(isExpanded ? null : b.userId)}
                        className="w-full flex items-center gap-3 p-4 hover:bg-white/5 transition-colors text-left"
                      >
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${colors[colorIdx]} flex items-center justify-center text-sm font-bold text-white shrink-0`}>
                          {initials}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{b.name}</p>
                          <p className="text-xs text-slate-500">Paid {formatCurrency(b.totalPaid)}</p>
                        </div>
                        <div className={`text-right font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isPositive ? '+' : ''}{formatCurrency(b.netBalance)}
                        </div>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400 ml-2" /> : <ChevronDown className="w-4 h-4 text-slate-400 ml-2" />}
                      </button>
                      {isExpanded && (
                        <div className="px-4 pb-4 grid grid-cols-3 gap-3 border-t border-white/5 pt-4 bg-slate-900/20">
                          <div className="text-center">
                            <p className="text-xs text-slate-500 mb-1">Total Paid</p>
                            <p className="font-semibold text-emerald-400">{formatCurrency(b.totalPaid)}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-slate-500 mb-1">Total Owed</p>
                            <p className="font-semibold text-rose-400">{formatCurrency(b.totalOwed)}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-slate-500 mb-1">Net Balance</p>
                            <p className={`font-semibold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(b.netBalance)}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Optimal Settlements */}
          {settlements.length > 0 && (
            <div className="glass-card p-6">
              <h2 className="text-lg font-bold mb-4">Optimal Settlements</h2>
              <div className="space-y-3">
                {settlements.map((s) => (
                  <div key={`${s.from}-${s.to}`} className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/30 border border-white/5">
                    <div className="flex-1">
                      <span className="font-semibold text-rose-400">{s.from}</span>
                      <span className="text-slate-400 text-sm mx-2">pays</span>
                      <span className="font-semibold text-emerald-400">{s.to}</span>
                    </div>
                    <span className="font-bold text-white">{formatCurrency(s.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ——— EXPENSES TAB ——— */}
      {activeTab === 'expenses' && (() => {
        const paginatedExpenses = expenses.slice((currentExpensePage - 1) * PAGE_SIZE, currentExpensePage * PAGE_SIZE);
        return (
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-lg font-bold">Expenses ({expenses.length})</h2>
            <button
              onClick={() => setShowAddExpense(true)}
              className="flex items-center gap-1.5 text-sm bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
          {expenses.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Receipt className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>No expenses yet. Add one above or import a CSV!</p>
            </div>
          ) : (
            <div className="flex flex-col">
              <div className="divide-y divide-white/5">
                {paginatedExpenses.map(exp => (
                <div key={exp.id} className="p-4 flex items-center gap-4 hover:bg-white/5 transition-colors group">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
                    <Receipt className="w-5 h-5 text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{exp.description}</p>
                    <p className="text-xs text-slate-500">
                      {exp.date} · Paid by <span className="text-slate-300">{exp.paidBy ?? 'Unknown'}</span>
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold">{formatCurrency(exp.amount)}</p>
                    <p className="text-xs text-slate-500">{exp.splits.length} splits</p>
                  </div>
                  <button
                    onClick={() => handleDeleteExpense(exp.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-rose-500/20 hover:text-rose-400 rounded-lg transition-all ml-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              </div>
              <Pagination
                totalItems={expenses.length}
                currentPage={currentExpensePage}
                onPageChange={setCurrentExpensePage}
              />
            </div>
          )}
        </div>
        );
      })()}

      {/* ——— MEMBERS TAB ——— */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          {/* Add Member Form */}
          <div className="glass-card p-5">
            <h2 className="text-base font-bold mb-3 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-cyan-400" /> Add Member
            </h2>
            <form onSubmit={handleAddMember} className="flex gap-3">
              <input
                type="text"
                value={newMemberName}
                onChange={e => setNewMemberName(e.target.value)}
                placeholder="Enter person's name…"
                className="flex-1 bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
              />
              <button
                type="submit"
                disabled={addMemberLoading || !newMemberName.trim()}
                className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-all disabled:opacity-50"
              >
                {addMemberLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add
              </button>
            </form>
            {addMemberError && (
              <p className="text-rose-400 text-xs mt-2 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{addMemberError}</p>
            )}
            {addMemberSuccess && (
              <p className="text-emerald-400 text-xs mt-2 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />{addMemberSuccess}</p>
            )}
          </div>

          {/* Member List */}
          <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-white/5">
              <h2 className="font-bold">Members ({activeMembers.length} active)</h2>
            </div>
            {members.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No members yet. Add someone above!</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {members.map(m => {
                  const isActive = !m.leftAt;
                  const colors = ['from-violet-500 to-purple-500', 'from-cyan-500 to-blue-500', 'from-emerald-500 to-teal-500', 'from-amber-500 to-orange-500', 'from-rose-500 to-pink-500', 'from-indigo-500 to-violet-500'];
                  const colorIdx = (m.name.codePointAt(0) ?? 0) % colors.length;
                  const initials = m.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                  return (
                    <div key={m.userId} className={`flex items-center gap-4 p-4 group transition-colors ${isActive ? 'hover:bg-white/5' : 'opacity-40 bg-slate-900/40'}`}>
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${colors[colorIdx]} flex items-center justify-center text-sm font-bold text-white shrink-0`}>
                        {initials}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold">{m.name}</p>
                        <p className="text-xs text-slate-500">
                          Joined {new Date(m.joinedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          {!isActive && ` · Left ${new Date(m.leftAt!).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                          {m.isGuest && <span className="ml-2 bg-slate-700 text-slate-300 text-xs px-1.5 py-0.5 rounded-full">Guest</span>}
                        </p>
                      </div>
                      {isActive && (
                        <button
                          onClick={() => handleRemoveMember(m.userId, m.name)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-rose-500/20 hover:text-rose-400 rounded-lg transition-all"
                          title="Remove from group"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
