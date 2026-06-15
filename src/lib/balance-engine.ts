/**
 * Balance Calculation Engine
 * Computes per-person net balances with full drill-down capability.
 */

import { sql } from './db';
import { toINR } from './currency';

export interface PersonBalance {
  userId: string;
  name: string;
  isGuest: boolean;
  /** Total amount paid by this person (in INR) */
  totalPaid: number;
  /** Total amount this person owes across all expenses (in INR) */
  totalOwed: number;
  /** Net = totalPaid - totalOwed - settlementsSent + settlementsReceived */
  netBalance: number;
  /** Total sent in settlements */
  settlementsSent: number;
  /** Total received in settlements */
  settlementsReceived: number;
}

export interface BalanceDetail {
  expenseId: string;
  description: string;
  date: string;
  amount: number;
  currency: string;
  amountINR: number;
  paidBy: string;
  splitAmount: number;
  splitAmountINR: number;
  role: 'payer' | 'participant' | 'both';
}

/**
 * Get net balances for all users.
 * Positive = person is owed money, Negative = person owes money.
 */
export async function getBalances(ownerId: string, groupId?: string): Promise<PersonBalance[]> {
  // We must fetch users, their paid expenses, their splits, and their settlements.
  // To avoid complex nested jsonb aggregations which might be slow, we fetch flat records and group in JS.
  const usersRaw = await sql`
    SELECT id, name, "isGuest" FROM "User"
    WHERE id IN (
      SELECT "userId" FROM "GroupMember"
      ${groupId ? sql`WHERE "groupId" = ${groupId} AND "groupId" IN (SELECT id FROM "Group" WHERE "ownerId" = ${ownerId})` : sql`WHERE "groupId" IN (SELECT id FROM "Group" WHERE "ownerId" = ${ownerId})`}
    )
  `;

  const paidExpenses = await sql`
    SELECT * FROM "Expense"
    WHERE "isDuplicate" = false AND "paidById" IN (SELECT id FROM "User")
    ${groupId ? sql`AND "groupId" = ${groupId} AND "groupId" IN (SELECT id FROM "Group" WHERE "ownerId" = ${ownerId})` : sql`AND "groupId" IN (SELECT id FROM "Group" WHERE "ownerId" = ${ownerId})`}
  `;

  const expenseSplits = await sql`
    SELECT es.*, e.currency FROM "ExpenseSplit" es
    JOIN "Expense" e ON es."expenseId" = e.id
    WHERE e."isDuplicate" = false
    ${groupId ? sql`AND e."groupId" = ${groupId} AND e."groupId" IN (SELECT id FROM "Group" WHERE "ownerId" = ${ownerId})` : sql`AND e."groupId" IN (SELECT id FROM "Group" WHERE "ownerId" = ${ownerId})`}
  `;

  const paymentsSent = await sql`
    SELECT * FROM "Settlement"
    ${groupId ? sql`WHERE "groupId" = ${groupId} AND "groupId" IN (SELECT id FROM "Group" WHERE "ownerId" = ${ownerId})` : sql`WHERE "groupId" IN (SELECT id FROM "Group" WHERE "ownerId" = ${ownerId})`}
  `;

  const users = usersRaw.map((u: any) => ({
    id: u.id,
    name: u.name,
    isGuest: u.isGuest,
    paidExpenses: paidExpenses.filter((e: any) => e.paidById === u.id),
    expenseSplits: expenseSplits.filter((es: any) => es.userId === u.id).map((es: any) => ({ ...es, expense: { currency: es.currency } })),
    paymentsSent: paymentsSent.filter((s: any) => s.payerId === u.id),
    paymentsRcvd: paymentsSent.filter((s: any) => s.payeeId === u.id),
  }));

  const allBalances = users.map(user => {
    // Total paid by this person (converted to INR)
    const totalPaid = user.paidExpenses.reduce((sum: number, exp: any) => {
      return sum + toINR(exp.amount, exp.currency);
    }, 0);

    // Total owed by this person across all expense splits (converted to INR)
    const totalOwed = user.expenseSplits.reduce((sum: number, split: any) => {
      return sum + toINR(split.amountOwed, split.expense.currency);
    }, 0);

    // Settlements
    const settlementsSent = user.paymentsSent.reduce((sum: number, s: any) => sum + s.amount, 0);
    const settlementsReceived = user.paymentsRcvd.reduce((sum: number, s: any) => sum + s.amount, 0);

    // Net balance = what others owe you - what you owe others
    // totalPaid = money you've spent on behalf of the group
    // totalOwed = your share of all expenses
    // netBalance positive = group owes you, negative = you owe the group
    const netBalance = Math.round((totalPaid - totalOwed - settlementsSent + settlementsReceived) * 100) / 100;

    return {
      userId: user.id,
      name: user.name,
      isGuest: user.isGuest,
      totalPaid: Math.round(totalPaid * 100) / 100,
      totalOwed: Math.round(totalOwed * 100) / 100,
      netBalance,
      settlementsSent: Math.round(settlementsSent * 100) / 100,
      settlementsReceived: Math.round(settlementsReceived * 100) / 100,
    };
  });

  // When filtering by group, exclude users with zero activity in that group
  if (groupId) {
    return allBalances.filter(b => 
      b.totalPaid !== 0 || b.totalOwed !== 0 || b.settlementsSent !== 0 || b.settlementsReceived !== 0
    );
  }

  return allBalances;
}

/**
 * Get detailed breakdown of a specific user's balance.
 * Shows every expense that contributes to their net balance.
 */
export async function getBalanceDetails(ownerId: string, userId: string, groupId?: string): Promise<BalanceDetail[]> {
  const splits = await sql`
    SELECT es.*, e.description, e.date, e.amount, e.currency, u.name as "paidByName", e."paidById"
    FROM "ExpenseSplit" es
    JOIN "Expense" e ON es."expenseId" = e.id
    LEFT JOIN "User" u ON e."paidById" = u.id
    WHERE es."userId" = ${userId} AND e."isDuplicate" = false
    ${groupId ? sql`AND e."groupId" = ${groupId} AND e."groupId" IN (SELECT id FROM "Group" WHERE "ownerId" = ${ownerId})` : sql`AND e."groupId" IN (SELECT id FROM "Group" WHERE "ownerId" = ${ownerId})`}
    ORDER BY e.date ASC
  `;

  const paidExpenses = await sql`
    SELECT e.*, u.name as "paidByName"
    FROM "Expense" e
    LEFT JOIN "User" u ON e."paidById" = u.id
    WHERE e."paidById" = ${userId} AND e."isDuplicate" = false
    ${groupId ? sql`AND e."groupId" = ${groupId} AND e."groupId" IN (SELECT id FROM "Group" WHERE "ownerId" = ${ownerId})` : sql`AND e."groupId" IN (SELECT id FROM "Group" WHERE "ownerId" = ${ownerId})`}
    ORDER BY e.date ASC
  `;

  const details: BalanceDetail[] = [];
  const seenExpenses = new Set<string>();

  // Add expenses where user is a participant
  for (const split of splits) {
    const isPayer = split.paidById === userId;
    seenExpenses.add(split.expenseId);

    details.push({
      expenseId: split.expenseId,
      description: split.description,
      date: new Date(split.date).toISOString().split('T')[0],
      amount: split.amount,
      currency: split.currency,
      amountINR: toINR(split.amount, split.currency),
      paidBy: split.paidByName ?? 'Unknown',
      splitAmount: split.amountOwed,
      splitAmountINR: toINR(split.amountOwed, split.currency),
      role: isPayer ? 'both' : 'participant',
    });
  }

  // Add expenses the user paid but wasn't a participant of
  for (const exp of paidExpenses) {
    if (seenExpenses.has(exp.id)) continue;
    details.push({
      expenseId: exp.id,
      description: exp.description,
      date: new Date(exp.date).toISOString().split('T')[0],
      amount: exp.amount,
      currency: exp.currency,
      amountINR: toINR(exp.amount, exp.currency),
      paidBy: exp.paidByName ?? 'Unknown',
      splitAmount: 0,
      splitAmountINR: 0,
      role: 'payer',
    });
  }

  // Sort by date
  details.sort((a, b) => a.date.localeCompare(b.date));

  return details;
}
