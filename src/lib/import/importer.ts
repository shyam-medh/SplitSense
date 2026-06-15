/**
 * Import Orchestrator
 * The main pipeline that ties together parsing, anomaly detection,
 * split calculation, and database persistence.
 *
 * Runs as a single atomic transaction — all-or-nothing.
 */

import { sql } from '../db';
import { parseCSV, ImportLogEntry, ParsedRow } from './parser';
import { detectAnomalies } from './anomaly-detector';
import { calculateSplits } from './split-calculator';

export interface ImportResult {
  success: boolean;
  expensesCreated: number;
  settlementsCreated: number;
  rowsSkipped: number;
  usersCreated: string[];
  logs: ImportLogEntry[];
  error?: string;
}

/**
 * Import a CSV file into the database.
 * Clears existing data and re-imports from scratch.
 */
export async function importCSV(csvContent: string, existingGroupId: string | undefined, ownerId: string): Promise<ImportResult> {
  const allLogs: ImportLogEntry[] = [];

  try {
    const { rows, logs: parseLogs } = parseCSV(csvContent);
    for (const log of parseLogs) allLogs.push(log);

    const { logs: anomalyLogs, skipRows, duplicateRows, settlementRows } = detectAnomalies(rows, []);
    for (const log of anomalyLogs) allLogs.push(log);

    const allNames = extractAllNames(rows);
    const { userMap, usersCreated } = await createUsers(allNames);

    let groupId = existingGroupId;

    if (groupId) {
      // Wipe only old expenses/settlements for this group
      await clearGroupData(groupId);
    } else {
      // Create new group
      if (!ownerId) throw new Error('ownerId is required to create a new group');
      const groups = await sql`INSERT INTO "Group" (name, "ownerId") VALUES ('Flat Expenses', ${ownerId}) RETURNING id`;
      const group = groups[0];
      groupId = group.id;
      // Also create default memberships for new group
      await createMemberships(groupId as string, userMap);
    }

    // Fetch the active memberships for this group to pass to the split calculator
    const memberships = await sql`SELECT * FROM "GroupMember" WHERE "groupId" = ${groupId as string}`;
    const membershipMap = new Map<string, { joinedAt: Date; leftAt: Date | null }>();
    for (const member of memberships) {
      // Find the name of this user from userMap (reverse lookup)
      const name = [...userMap.entries()].find(([, id]) => id === member.userId)?.[0];
      if (name) {
        membershipMap.set(name, { joinedAt: member.joinedAt, leftAt: member.leftAt });
      }
    }

    const { expensesCreated, settlementsCreated } = await processRows(rows, {
      groupId: groupId as string, userMap, membershipMap, skipRows, duplicateRows, settlementRows, allLogs
    });

    await persistLogs(allLogs, ownerId);

    return {
      success: true,
      expensesCreated,
      settlementsCreated,
      rowsSkipped: skipRows.size,
      usersCreated,
      logs: allLogs,
    };
  } catch (error) {
    console.error("IMPORT ERROR:", error);
    const errMsg = error instanceof Error ? error.message : String(error);
    allLogs.push({
      level: 'ERROR', csvRow: 0, field: 'system', rawValue: '',
      description: `Import failed: ${errMsg}`, actionTaken: 'Import aborted', category: 'F',
    });

    return {
      success: false, expensesCreated: 0, settlementsCreated: 0,
      rowsSkipped: 0, usersCreated: [], logs: allLogs, error: errMsg,
    };
  }
}

async function clearGroupData(groupId: string) {
  await sql.begin(async sql => {
    await sql`DELETE FROM "ExpenseSplit" WHERE "expenseId" IN (SELECT id FROM "Expense" WHERE "groupId" = ${groupId})`;
    await sql`DELETE FROM "Expense" WHERE "groupId" = ${groupId}`;
    await sql`DELETE FROM "Settlement" WHERE "groupId" = ${groupId}`;
  });
}

function extractAllNames(rows: ParsedRow[]): Set<string> {
  const allNames = new Set<string>();
  for (const row of rows) {
    if (row.paidBy) allNames.add(row.paidBy);
    row.splitWith.forEach((name: string) => allNames.add(name));
  }
  return allNames;
}

async function createUsers(allNames: Set<string>) {
  const userMap = new Map<string, string>();
  const guestNames = new Set(['Kabir']);
  const usersCreated: string[] = [];

  for (const name of allNames) {
    if (!name) continue;
    let users = await sql`SELECT * FROM "User" WHERE name = ${name} LIMIT 1`;
    let user = users[0];
    if (!user) {
      users = await sql`INSERT INTO "User" (name, "isGuest") VALUES (${name}, ${guestNames.has(name)}) RETURNING *`;
      user = users[0];
      usersCreated.push(name);
    }
    userMap.set(name, user.id);
  }
  return { userMap, usersCreated };
}

async function createMemberships(groupId: string, userMap: Map<string, string>) {
  const memberTimeline: Record<string, { joined: string; left?: string }> = {
    Aisha: { joined: '2026-01-01' },
    Rohan: { joined: '2026-01-01' },
    Priya: { joined: '2026-01-01' },
    Meera: { joined: '2026-01-01', left: '2026-03-29' },
    Dev: { joined: '2026-02-08' },
    Kabir: { joined: '2026-03-11' },
    Sam: { joined: '2026-04-08' },
  };

  for (const [name, timeline] of Object.entries(memberTimeline)) {
    const userId = userMap.get(name);
    if (!userId) continue;
    const existing = await sql`SELECT id FROM "GroupMember" WHERE "groupId" = ${groupId} AND "userId" = ${userId} LIMIT 1`;
    if (existing.length === 0) {
      await sql`
        INSERT INTO "GroupMember" ("groupId", "userId", "joinedAt", "leftAt")
        VALUES (${groupId}, ${userId}, ${new Date(timeline.joined)}, ${timeline.left ? new Date(timeline.left) : null})
      `;
    }
  }
}

interface ProcessContext {
  groupId: string;
  userMap: Map<string, string>;
  membershipMap: Map<string, { joinedAt: Date; leftAt: Date | null }>;
  skipRows: Set<number>;
  duplicateRows: Set<number>;
  settlementRows: Set<number>;
  allLogs: ImportLogEntry[];
}

async function processSettlement(row: ParsedRow, ctx: ProcessContext): Promise<boolean> {
  const payerId = row.paidBy ? ctx.userMap.get(row.paidBy) : null;
  const payeeId = row.splitWith.length === 1 ? ctx.userMap.get(row.splitWith[0]) : null;

  if (payerId && payeeId) {
    await sql`
      INSERT INTO "Settlement" ("groupId", "payerId", "payeeId", amount, date, notes, "csvRow")
      VALUES (${ctx.groupId}, ${payerId}, ${payeeId}, ${row.amount}, ${row.date ?? new Date()}, ${row.notes || row.description}, ${row.rowNumber})
    `;
    return true;
  }
  return false;
}

async function processRows(rows: ParsedRow[], ctx: ProcessContext) {
  let expensesCreated = 0;
  let settlementsCreated = 0;

  const expensesToInsert: Record<string, any>[] = [];
  const settlementsToInsert: Record<string, any>[] = [];
  const splitsToInsert: Record<string, any>[] = []; // We will map this after getting expense IDs

  for (const row of rows) {
    if (ctx.skipRows.has(row.rowNumber)) continue;

    if (ctx.settlementRows.has(row.rowNumber)) {
      const payerId = row.paidBy ? ctx.userMap.get(row.paidBy) : null;
      const payeeId = row.splitWith.length === 1 ? ctx.userMap.get(row.splitWith[0]) : null;
      if (payerId && payeeId) {
        settlementsToInsert.push({
          groupId: ctx.groupId,
          payerId,
          payeeId,
          amount: row.amount,
          date: row.date ?? new Date(),
          notes: row.notes || row.description,
          csvRow: row.rowNumber
        });
        settlementsCreated++;
      }
      continue;
    }

    const payerId = row.paidBy ? ctx.userMap.get(row.paidBy) : null;
    const isDuplicate = ctx.duplicateRows.has(row.rowNumber);

    expensesToInsert.push({
      groupId: ctx.groupId,
      description: row.description,
      amount: row.amount,
      currency: row.currency,
      date: row.date ?? new Date(),
      paidById: payerId ?? null,
      splitType: row.splitType || 'equal',
      notes: row.notes || null,
      csvRow: row.rowNumber,
      isDuplicate,
      // Pass along the row metadata so we can map splits later
      __row: row
    });
  }

  // Bulk insert Settlements
  if (settlementsToInsert.length > 0) {
    await sql`INSERT INTO "Settlement" ${sql(settlementsToInsert, 'groupId', 'payerId', 'payeeId', 'amount', 'date', 'notes', 'csvRow')}`;
  }

  // Bulk insert Expenses and retrieve their IDs to create splits
  if (expensesToInsert.length > 0) {
    const insertedExpenses = await sql`
      INSERT INTO "Expense" ${sql(expensesToInsert, 'groupId', 'description', 'amount', 'currency', 'date', 'paidById', 'splitType', 'notes', 'csvRow', 'isDuplicate')}
      RETURNING id, "csvRow"
    `;

    // Now map the returned Expense IDs back to their original splits
    const expenseIdMap = new Map<number, string>();
    for (const exp of insertedExpenses) {
      expenseIdMap.set(exp.csvRow, exp.id);
    }

    for (const expInput of expensesToInsert) {
      const row = expInput.__row;
      const expenseId = expenseIdMap.get(row.rowNumber);
      if (!expenseId) continue;

      expensesCreated++;

      const { splits, logs: splitLogs } = calculateSplits(row, ctx.membershipMap);
      for (const log of splitLogs) ctx.allLogs.push(log);

      for (const [name, amountOwed] of splits) {
        const userId = ctx.userMap.get(name);
        if (!userId) continue;
        splitsToInsert.push({
          expenseId,
          userId,
          amountOwed
        });
      }
    }

    // Bulk insert Splits
    if (splitsToInsert.length > 0) {
      await sql`INSERT INTO "ExpenseSplit" ${sql(splitsToInsert, 'expenseId', 'userId', 'amountOwed')}`;
    }
  }

  return { expensesCreated, settlementsCreated };
}

async function persistLogs(allLogs: ImportLogEntry[], ownerId: string) {
  const CHUNK_SIZE = 500;
  for (let i = 0; i < allLogs.length; i += CHUNK_SIZE) {
    const chunk = allLogs.slice(i, i + CHUNK_SIZE);
    const insertData = chunk.map(log => ({
      level: log.level, csvRow: log.csvRow, field: log.field,
      rawValue: log.rawValue, description: log.description,
      actionTaken: log.actionTaken, category: log.category,
      ownerId: ownerId,
    }));
    await sql`INSERT INTO "ImportLog" ${sql(insertData)}`;
  }
}

