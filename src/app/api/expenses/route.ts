/**
 * GET /api/expenses
 * Returns all expenses with their splits and payer info.
 */

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const ownerId = session.user.id;

    const expenses = await sql`
      SELECT 
        e.*, 
        p.name as "paidByName",
        (
          SELECT json_agg(json_build_object(
            'userId', es."userId",
            'amountOwed', es."amountOwed",
            'name', u.name
          ))
          FROM "ExpenseSplit" es
          JOIN "User" u ON es."userId" = u.id
          WHERE es."expenseId" = e.id
        ) as splits
      FROM "Expense" e
      LEFT JOIN "User" p ON e."paidById" = p.id
      WHERE e."groupId" IN (SELECT id FROM "Group" WHERE "ownerId" = ${ownerId})
      ORDER BY e.date ASC
    `;

    const formatted = expenses.map(exp => ({
      id: exp.id,
      description: exp.description,
      amount: exp.amount,
      currency: exp.currency,
      date: new Date(exp.date).toISOString().split('T')[0],
      paidBy: exp.paidByName ?? null,
      splitType: exp.splitType,
      notes: exp.notes,
      isDuplicate: exp.isDuplicate,
      csvRow: exp.csvRow,
      splits: (exp.splits || []).map((s: any) => ({
        userId: s.userId,
        name: s.name,
        amountOwed: s.amountOwed,
      })),
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
