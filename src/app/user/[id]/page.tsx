import { sql } from "@/lib/db";
import { notFound } from "next/navigation";
import { formatCurrency } from "@/lib/currency";
import Link from "next/link";
import { ArrowLeft, ArrowDownRight, ArrowUpRight, CheckCircle2 } from "lucide-react";

export default async function UserLedgerPage({ params }: Readonly<{ params: { id: string } }>) {
  const users = await sql`SELECT * FROM "User" WHERE id = ${params.id} LIMIT 1`;
  const user = users[0] as any;
  if (user) {
    user.paidExpenses = await sql`
      SELECT e.*, 
        (
          SELECT json_agg(json_build_object(
            'userId', es."userId",
            'amountOwed', es."amountOwed",
            'user', json_build_object('name', u.name)
          ))
          FROM "ExpenseSplit" es
          JOIN "User" u ON es."userId" = u.id
          WHERE es."expenseId" = e.id
        ) as splits
      FROM "Expense" e
      WHERE e."paidById" = ${user.id}
      ORDER BY e.date DESC
    `;
    
    user.expenseSplits = await sql`
      SELECT es.*, 
        json_build_object(
          'id', e.id, 'description', e.description, 'amount', e.amount, 'currency', e.currency, 'date', e.date,
          'paidBy', json_build_object('name', pu.name)
        ) as expense
      FROM "ExpenseSplit" es
      JOIN "Expense" e ON es."expenseId" = e.id
      LEFT JOIN "User" pu ON e."paidById" = pu.id
      WHERE es."userId" = ${user.id}
      ORDER BY e.date DESC
    `;

    user.paymentsSent = await sql`
      SELECT s.*, json_build_object('name', p.name) as payee
      FROM "Settlement" s
      JOIN "User" p ON s."payeeId" = p.id
      WHERE s."payerId" = ${user.id}
      ORDER BY s.date DESC
    `;

    user.paymentsRcvd = await sql`
      SELECT s.*, json_build_object('name', p.name) as payer
      FROM "Settlement" s
      JOIN "User" p ON s."payerId" = p.id
      WHERE s."payeeId" = ${user.id}
      ORDER BY s.date DESC
    `;
  }

  if (!user) notFound();

  // Combine and sort ledger entries
  const ledger: Array<{
    id: string;
    date: Date;
    type: 'paid' | 'owed' | 'sent' | 'received';
    description: string;
    amount: number;
    relatedUser?: string | null;
  }> = [];

  user.paidExpenses.forEach((exp: any) => {
    ledger.push({
      id: exp.id,
      date: exp.date,
      type: 'paid',
      description: `Paid for: ${exp.description}`,
      amount: exp.amount,
      relatedUser: null
    });
  });

  user.expenseSplits.forEach((split: any) => {
    ledger.push({
      id: split.id,
      date: split.expense.date,
      type: 'owed',
      description: `Owe share for: ${split.expense.description}`,
      amount: split.amountOwed,
      relatedUser: split.expense.paidBy?.name
    });
  });

  user.paymentsSent.forEach((pmt: any) => {
    ledger.push({
      id: pmt.id,
      date: pmt.date,
      type: 'sent',
      description: `Settlement sent to ${pmt.payee.name}`,
      amount: pmt.amount,
      relatedUser: pmt.payee.name
    });
  });

  user.paymentsRcvd.forEach((pmt: any) => {
    ledger.push({
      id: pmt.id,
      date: pmt.date,
      type: 'received',
      description: `Settlement received from ${pmt.payer.name}`,
      amount: pmt.amount,
      relatedUser: pmt.payer.name
    });
  });

  ledger.sort((a, b) => b.date.getTime() - a.date.getTime());

  // Net Balance Calculation
  const totalPaid = user.paidExpenses.reduce((sum: number, e: any) => sum + e.amount, 0);
  const totalOwed = user.expenseSplits.reduce((sum: number, s: any) => sum + s.amountOwed, 0);
  const totalSent = user.paymentsSent.reduce((sum: number, s: any) => sum + s.amount, 0);
  const totalRcvd = user.paymentsRcvd.reduce((sum: number, r: any) => sum + r.amount, 0);

  const netBalance = (totalPaid + totalSent) - (totalOwed + totalRcvd);

  // Helper variables to resolve nested ternaries
  let netBalanceColor = 'text-slate-100';
  if (netBalance > 0) netBalanceColor = 'text-emerald-400';
  else if (netBalance < 0) netBalanceColor = 'text-red-400';

  let netBalanceStatusText = 'All settled up';
  if (netBalance > 0) netBalanceStatusText = 'Owed to them';
  else if (netBalance < 0) netBalanceStatusText = 'They owe the group';

  const getEntryIconBgClass = (type: string) => {
    if (type === 'paid') return 'bg-cyan-500/20 text-cyan-400';
    if (type === 'owed') return 'bg-violet-500/20 text-violet-400';
    if (type === 'sent') return 'bg-emerald-500/20 text-emerald-400';
    return 'bg-orange-500/20 text-orange-400'; // received
  };

  const getEntryRelationText = (type: string) => {
    if (type === 'owed') return 'Paid by';
    if (type === 'sent') return 'To';
    return 'From';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/" className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{user.name}'s Ledger</h1>
          <p className="text-slate-400 text-sm mt-1">Detailed breakdown of all contributions and liabilities.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="glass-card p-6">
          <p className="text-sm text-slate-400 font-semibold mb-2 uppercase tracking-wider">Net Balance</p>
          <div className={`text-3xl font-bold ${netBalanceColor}`}>
            {netBalance > 0 ? '+' : ''}{formatCurrency(netBalance)}
          </div>
          <p className="text-xs text-slate-500 mt-2">{netBalanceStatusText}</p>
        </div>
        <div className="glass-card p-6">
          <p className="text-sm text-slate-400 font-semibold mb-2 uppercase tracking-wider">Total Paid</p>
          <div className="text-2xl font-bold text-cyan-400">{formatCurrency(totalPaid)}</div>
          <p className="text-xs text-slate-500 mt-2">For group expenses</p>
        </div>
        <div className="glass-card p-6">
          <p className="text-sm text-slate-400 font-semibold mb-2 uppercase tracking-wider">Total Share</p>
          <div className="text-2xl font-bold text-violet-400">{formatCurrency(totalOwed)}</div>
          <p className="text-xs text-slate-500 mt-2">Their portion of all expenses</p>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-lg font-bold">Transaction History</h2>
        </div>
        <div className="divide-y divide-white/5">
          {ledger.map((entry) => (
            <div key={`${entry.type}-${entry.id}`} className="p-4 hover:bg-white/5 transition-colors flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${getEntryIconBgClass(entry.type)}`}>
                  {entry.type === 'paid' && <ArrowUpRight className="w-5 h-5" />}
                  {entry.type === 'owed' && <ArrowDownRight className="w-5 h-5" />}
                  {entry.type === 'sent' && <CheckCircle2 className="w-5 h-5" />}
                  {entry.type === 'received' && <CheckCircle2 className="w-5 h-5" />}
                </div>
                <div>
                  <p className="font-semibold text-sm">{entry.description}</p>
                  <div className="flex gap-3 text-xs text-slate-500 mt-1">
                    <span>{entry.date.toISOString().split('T')[0]}</span>
                    {entry.relatedUser && (
                      <>
                        <span>•</span>
                        <span>{getEntryRelationText(entry.type)}: {entry.relatedUser}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className={`font-bold ${entry.type === 'paid' || entry.type === 'sent' ? 'text-emerald-400' : 'text-red-400'}`}>
                {entry.type === 'paid' || entry.type === 'sent' ? '+' : '-'}{formatCurrency(entry.amount)}
              </div>
            </div>
          ))}

          {ledger.length === 0 && (
            <div className="p-8 text-center text-slate-500">
              No transactions found for this user.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
