/**
 * Settlement Optimizer
 * Implements the minimum cash flow algorithm to minimize
 * the number of transactions needed to settle all debts.
 *
 * Algorithm:
 * 1. Compute net balance for each person
 * 2. Find the person who owes the most and the person who is owed the most
 * 3. Settle between them for the minimum of the two amounts
 * 4. Repeat until all balances are zero
 */

import { PersonBalance } from './balance-engine';

export interface SuggestedSettlement {
  from: string;
  fromId: string;
  to: string;
  toId: string;
  amount: number;
}

/**
 * Generate optimal settlement suggestions using the min-cash-flow algorithm.
 */
export function optimizeSettlements(balances: PersonBalance[]): SuggestedSettlement[] {
  // Filter out guests and people with zero balance
  const activeBalances = balances
    .filter(b => Math.abs(b.netBalance) > 0.01)
    .map(b => ({
      userId: b.userId,
      name: b.name,
      balance: b.netBalance,
    }));

  const settlements: SuggestedSettlement[] = [];

  // Greedy min-cash-flow
  while (true) {
    // Find max debtor (most negative balance) and max creditor (most positive balance)
    let maxDebtor = { userId: '', name: '', balance: 0 };
    let maxCreditor = { userId: '', name: '', balance: 0 };

    for (const person of activeBalances) {
      if (person.balance < maxDebtor.balance) {
        maxDebtor = { ...person };
      }
      if (person.balance > maxCreditor.balance) {
        maxCreditor = { ...person };
      }
    }

    // If both are (near) zero, we're done
    if (Math.abs(maxDebtor.balance) < 0.01 && Math.abs(maxCreditor.balance) < 0.01) {
      break;
    }

    // Settle the minimum of the two
    const settleAmount = Math.min(Math.abs(maxDebtor.balance), maxCreditor.balance);
    const roundedAmount = Math.round(settleAmount * 100) / 100;

    if (roundedAmount < 0.01) break;

    settlements.push({
      from: maxDebtor.name,
      fromId: maxDebtor.userId,
      to: maxCreditor.name,
      toId: maxCreditor.userId,
      amount: roundedAmount,
    });

    // Update balances
    const debtorIdx = activeBalances.findIndex(b => b.userId === maxDebtor.userId);
    const creditorIdx = activeBalances.findIndex(b => b.userId === maxCreditor.userId);

    if (debtorIdx !== -1) activeBalances[debtorIdx].balance += roundedAmount;
    if (creditorIdx !== -1) activeBalances[creditorIdx].balance -= roundedAmount;
  }

  return settlements;
}
