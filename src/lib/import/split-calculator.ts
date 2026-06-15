/**
 * Split Calculator
 * Computes the exact amount each participant owes for an expense,
 * handling equal, unequal, percentage, and share split types.
 */

import { ParsedRow, ImportLogEntry } from './parser';
import { parseSplitDetails } from './anomaly-detector';

export interface SplitResult {
  /** Map of person name → amount they owe */
  splits: Map<string, number>;
  logs: ImportLogEntry[];
}

/** Round to 2 decimal places */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Check if a participant was active on the expense date */
function isActiveOnDate(
  joinedAt: Date,
  leftAt: Date | null,
  expenseDate: Date
): boolean {
  const expTime = new Date(expenseDate.getFullYear(), expenseDate.getMonth(), expenseDate.getDate()).getTime();
  const joinTime = new Date(joinedAt.getFullYear(), joinedAt.getMonth(), joinedAt.getDate()).getTime();
  const leftTime = leftAt
    ? new Date(leftAt.getFullYear(), leftAt.getMonth(), leftAt.getDate()).getTime()
    : Infinity;
  return expTime >= joinTime && expTime <= leftTime;
}

/** Filter split details to only include active participants */
function filterDetails(details: Map<string, number>, participants: string[]): Map<string, number> {
  const activeSet = new Set(participants);
  const filtered = new Map<string, number>();
  for (const [name, val] of details) {
    if (activeSet.has(name)) {
      filtered.set(name, val);
    }
  }
  return filtered;
}

/** Distribute amount equally among participants, handling rounding remainder */
function equalSplit(amount: number, participants: string[]): Map<string, number> {
  const splits = new Map<string, number>();
  const perPerson = round2(amount / participants.length);
  let remaining = round2(amount - perPerson * participants.length);

  for (const person of participants) {
    let share = perPerson;
    if (remaining > 0) {
      share += 0.01;
      remaining -= 0.01;
    } else if (remaining < 0) {
      share -= 0.01;
      remaining += 0.01;
    }
    splits.set(person, round2(share));
  }
  return splits;
}

/** Fix rounding error by adjusting the last person's share */
function fixRoundingOnLast(
  splits: Map<string, number>,
  entries: [string, number][],
  totalAmount: number,
  totalAllocated: number
): void {
  if (entries.length === 0) return;
  const lastPerson = entries.at(-1)![0];
  const diff = round2(totalAmount - totalAllocated);
  if (diff !== 0) {
    splits.set(lastPerson, (splits.get(lastPerson) ?? 0) + diff);
  }
}

/** Filter participants by group membership */
function filterByMembership(
  participants: string[],
  membershipMap: Map<string, { joinedAt: Date; leftAt: Date | null }>,
  expenseDate: Date,
  rowNumber: number
): { filtered: string[]; logs: ImportLogEntry[] } {
  const logs: ImportLogEntry[] = [];
  const filtered = participants.filter(name => {
    const membership = membershipMap.get(name);
    if (!membership) {
      logs.push({
        level: 'WARNING', csvRow: rowNumber, field: 'split_with',
        rawValue: name,
        description: `Participant ${name} excluded from split because they are not a member of the group`,
        actionTaken: 'Excluded from split', category: 'C',
      });
      return false;
    }
    if (isActiveOnDate(membership.joinedAt, membership.leftAt, expenseDate)) {
      return true;
    }
    logs.push({
      level: 'WARNING', csvRow: rowNumber, field: 'split_with',
      rawValue: name,
      description: `Participant ${name} excluded from split because they were not active on ${expenseDate.toISOString().split('T')[0]}`,
      actionTaken: 'Excluded from split', category: 'C',
    });
    return false;
  });
  return { filtered, logs };
}

/**
 * Calculate splits for a given expense row.
 */
export function calculateSplits(
  row: ParsedRow,
  membershipMap?: Map<string, { joinedAt: Date; leftAt: Date | null }>
): SplitResult {
  const logs: ImportLogEntry[] = [];
  let participants = row.splitWith;
  const expenseDate = row.date ?? new Date();

  // Filter participants based on membership
  if (membershipMap) {
    const result = filterByMembership(participants, membershipMap, expenseDate, row.rowNumber);
    participants = result.filtered;
    logs.push(...result.logs);
  }

  if (participants.length === 0) {
    logs.push({
      level: 'ERROR', csvRow: row.rowNumber, field: 'split_with',
      rawValue: '',
      description: 'No active participants in split after filtering',
      actionTaken: 'Cannot calculate splits — expense will have no split records',
      category: 'D',
    });
    return { splits: new Map(), logs };
  }

  const splits = computeSplitsByType(row, participants, logs);
  return { splits, logs };
}

/** Route to the correct split calculation based on splitType */
function computeSplitsByType(
  row: ParsedRow,
  participants: string[],
  logs: ImportLogEntry[]
): Map<string, number> {
  switch (row.splitType) {
    case 'equal':
      return computeEqualSplit(row, participants);
    case 'unequal':
      return computeUnequalSplit(row, participants, logs);
    case 'percentage':
      return computePercentageSplit(row, participants);
    case 'share':
      return calculateShareSplit(row, filterDetails(parseSplitDetails(row.splitDetails, row.splitType), participants), participants, logs).splits;
    default:
      return equalSplit(row.amount, participants);
  }
}

function computeEqualSplit(row: ParsedRow, participants: string[]): Map<string, number> {
  if (row.splitDetails) {
    const details = filterDetails(parseSplitDetails(row.splitDetails, row.splitType), participants);
    const values = [...details.values()];
    const allSame = values.length > 0 && values.every(v => v === values[0]);
    if (!allSame && values.length > 0) {
      return calculateShareSplit(row, details, participants, []).splits;
    }
  }
  return equalSplit(row.amount, participants);
}

function computeUnequalSplit(
  row: ParsedRow,
  participants: string[],
  logs: ImportLogEntry[]
): Map<string, number> {
  const details = filterDetails(parseSplitDetails(row.splitDetails, row.splitType), participants);
  if (details.size === 0) {
    logs.push({
      level: 'WARNING', csvRow: row.rowNumber, field: 'split_details',
      rawValue: row.splitDetails,
      description: 'Unequal split type but no valid active split details provided',
      actionTaken: 'Falling back to equal split among active members',
      category: 'D',
    });
    return equalSplit(row.amount, participants);
  }
  const splits = new Map<string, number>();
  for (const [name, amount] of details) {
    splits.set(name, amount);
  }
  return splits;
}

function computePercentageSplit(row: ParsedRow, participants: string[]): Map<string, number> {
  const details = filterDetails(parseSplitDetails(row.splitDetails, row.splitType), participants);
  if (details.size === 0) {
    return equalSplit(row.amount, participants);
  }

  const totalPct = [...details.values()].reduce((s, v) => s + v, 0);
  const normalizer = totalPct === 0 ? 1 : 100 / totalPct;

  const splits = new Map<string, number>();
  let totalAllocated = 0;
  const entries = [...details.entries()];

  for (const [name, pct] of entries) {
    const normalizedPct = pct * normalizer;
    const share = round2(row.amount * normalizedPct / 100);
    splits.set(name, share);
    totalAllocated += share;
  }

  fixRoundingOnLast(splits, entries, row.amount, totalAllocated);
  return splits;
}

/**
 * Calculate splits based on share ratios (e.g., Aisha 1; Rohan 2; Priya 1; Dev 2)
 */
function calculateShareSplit(
  row: ParsedRow,
  details: Map<string, number>,
  participants: string[],
  logs: ImportLogEntry[]
): SplitResult {
  const totalShares = [...details.values()].reduce((s, v) => s + v, 0);

  if (totalShares === 0) {
    return { splits: equalSplit(row.amount, participants), logs };
  }

  const splits = new Map<string, number>();
  let totalAllocated = 0;
  const entries = [...details.entries()];

  for (const [name, shares] of entries) {
    const share = round2(row.amount * shares / totalShares);
    splits.set(name, share);
    totalAllocated += share;
  }

  fixRoundingOnLast(splits, entries, row.amount, totalAllocated);
  return { splits, logs };
}
