'use client';

import { useEffect, useState, Fragment } from 'react';
import { Receipt, Search, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { Pagination, PAGE_SIZE } from '@/components/ui/Pagination';

interface ExpenseSplit {
  userId: string;
  name: string;
  amountOwed: number;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  currency: string;
  date: string;
  paidBy: string | null;
  splitType: string;
  notes: string | null;
  csvRow: number | null;
  splits: ExpenseSplit[];
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState('All Time');
  const [paidByFilter, setPaidByFilter] = useState('Anyone');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetch('/api/expenses')
      .then(r => r.json())
      .then(data => {
        setExpenses(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = expenses.filter(exp => {
    const q = search.toLowerCase();
    return (
      exp.description.toLowerCase().includes(q) ||
      (exp.paidBy?.toLowerCase().includes(q) ?? false) ||
      exp.date.includes(q)
    );
  });

  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleSearch = (v: string) => { setSearch(v); setCurrentPage(1); };
  const handleDateRange = (v: string) => { setDateRange(v); setCurrentPage(1); };
  const handlePaidBy = (v: string) => { setPaidByFilter(v); setCurrentPage(1); };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <div className="max-w-2xl mx-auto mt-20 text-center">
        <div className="glass-card p-12" style={{ transform: 'none' }}>
          <Receipt className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-100 mb-2">No Expenses</h2>
          <p className="text-slate-400 mb-6">Import a CSV file to see expenses here.</p>
          <a href="/import" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-cyan-600 rounded-xl text-white font-medium">
            Import CSV
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Expenses</h1>
          <p className="text-slate-400 mt-1">{expenses.length} expenses imported</p>
        </div>
      </div>

      <div className="expenses-layout">
        {/* Sidebar Filters */}
        <div className="expenses-sidebar relative z-50">
          <div className="glass-card p-5 animate-fade-in-up" style={{ transform: 'none' }}>
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider mb-4">Filters</h3>
            
            <div className="space-y-4">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-violet-300 transition-colors z-10" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-transparent transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] relative z-10"
                />
              </div>

              <div>
                <label htmlFor="date-range" className="text-xs text-slate-500 mb-1 block">Date Range</label>
                <CustomSelect 
                  id="date-range" 
                  value={dateRange}
                  onChange={handleDateRange}
                  options={[
                    { value: "All Time", label: "All Time" },
                    { value: "This Month", label: "This Month" },
                    { value: "Last Month", label: "Last Month" }
                  ]}
                  className="w-full"
                />
              </div>

              <div>
                <label htmlFor="paid-by" className="text-xs text-slate-500 mb-1 block">Paid By</label>
                <CustomSelect 
                  id="paid-by" 
                  value={paidByFilter}
                  onChange={handlePaidBy}
                  options={[
                    { value: "Anyone", label: "Anyone" },
                    ...Array.from(new Set(expenses.map(e => e.paidBy).filter((p): p is string => Boolean(p)))).map(payer => ({
                      value: payer,
                      label: payer
                    }))
                  ]}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Main Table Area */}
        <div className="flex-1 min-w-0">
          <div className="glass-card overflow-hidden animate-fade-in-up animate-fade-in-up-delay-2" style={{ transform: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Paid By</th>
                  <th>Amount</th>
                  <th>Split</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(exp => (
                    <Fragment key={exp.id}>
                      <tr
                        className="cursor-pointer group relative transition-colors duration-300 hover:bg-white/[0.03]"
                        onClick={() => setExpandedId(expandedId === exp.id ? null : exp.id)}
                      >
                        <td className="font-mono text-xs whitespace-nowrap text-slate-400 group-hover:text-violet-300 transition-colors">{exp.date}</td>
                        <td>
                          <span className="text-slate-200 font-medium group-hover:text-white transition-colors">{exp.description}</span>
                          {!exp.paidBy && (
                            <span className="ml-2 badge badge-warning">
                              <AlertTriangle className="w-3 h-3" /> No payer
                            </span>
                          )}
                        </td>
                        <td className="text-slate-400 group-hover:text-slate-200 transition-colors">{exp.paidBy || '—'}</td>
                        <td className="font-mono whitespace-nowrap">
                          <span className={`font-medium transition-colors ${exp.amount < 0 ? 'text-rose-400 group-hover:text-rose-300' : 'text-emerald-400 group-hover:text-emerald-300'}`}>
                            {exp.currency === 'USD' ? '$' : '₹'}
                            {Math.abs(exp.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          {exp.currency === 'USD' && (
                            <span className="ml-1 text-xs text-slate-600 group-hover:text-slate-400">USD</span>
                          )}
                        </td>
                        <td>
                          <span className="badge badge-info shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">{exp.splitType}</span>
                        </td>
                        <td className="max-w-[200px] truncate text-slate-500 text-xs group-hover:text-slate-400 transition-colors">
                          {exp.notes || '—'}
                        </td>
                      </tr>
                      {expandedId === exp.id && (
                        <tr key={`${exp.id}-detail`} className="bg-slate-900/40">
                          <td colSpan={6} className="!p-0 border-b border-white/5">
                            <div className="p-5 shadow-[inset_0_2px_10px_rgba(0,0,0,0.2)]">
                              <p className="text-xs text-violet-400 uppercase tracking-wider mb-3 font-semibold">
                                Split Details (CSV Row {exp.csvRow})
                              </p>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {exp.splits.map(split => (
                                  <div key={split.userId} className="flex flex-col bg-white/5 border border-white/5 rounded-xl p-3 hover:bg-white/10 transition-colors">
                                    <span className="text-xs text-slate-400 mb-1">{split.name}</span>
                                    <span className="text-sm font-mono font-medium text-slate-200">
                                      {formatCurrency(split.amountOwed, exp.currency)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                ))}
              </tbody>
            </table>
            <Pagination
              totalItems={filtered.length}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
