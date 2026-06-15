import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id: groupId } = await params;

    const groups = await sql`SELECT id FROM "Group" WHERE id = ${groupId} AND "ownerId" = ${session.user.id} LIMIT 1`;
    if (groups.length === 0) return NextResponse.json({ error: 'Group not found' }, { status: 404 });

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
      WHERE e."groupId" = ${groupId}
      ORDER BY e.date DESC
    `;

    return NextResponse.json(expenses.map(exp => ({
      id: exp.id,
      description: exp.description,
      amount: exp.amount,
      currency: exp.currency,
      date: new Date(exp.date).toISOString().split('T')[0],
      paidBy: exp.paidByName ?? null,
      paidById: exp.paidById,
      splitType: exp.splitType,
      notes: exp.notes,
      isDuplicate: exp.isDuplicate,
      splits: (exp.splits || []).map((s: any) => ({
        userId: s.userId,
        name: s.name,
        amountOwed: s.amountOwed,
      })),
    })));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id: groupId } = await params;

    const { description, amount, currency = 'INR', paidById, date, notes } = await request.json();

    if (!description || !amount || !paidById) {
      return NextResponse.json({ error: 'description, amount, and paidById are required' }, { status: 400 });
    }

    const groups = await sql`SELECT id FROM "Group" WHERE id = ${groupId} AND "ownerId" = ${session.user.id} LIMIT 1`;
    if (groups.length === 0) return NextResponse.json({ error: 'Group not found' }, { status: 404 });

    // Get active members for equal split
    const activeMembers = await sql`
      SELECT gm.*, u.name 
      FROM "GroupMember" gm
      JOIN "User" u ON gm."userId" = u.id
      WHERE gm."groupId" = ${groupId} AND gm."leftAt" IS NULL
    `;

    if (activeMembers.length === 0) {
      return NextResponse.json({ error: 'Group has no active members' }, { status: 400 });
    }

    const splitAmount = Number(amount) / activeMembers.length;

    // Create the expense and splits in a transaction
    let expenseId = '';
    await sql.begin(async sql => {
      const expenses = await sql`
        INSERT INTO "Expense" ("groupId", description, amount, currency, date, "paidById", "splitType", notes, "isDuplicate")
        VALUES (${groupId}, ${description.trim()}, ${Number(amount)}, ${currency}, ${date ? new Date(date) : new Date()}, ${paidById}, 'equal', ${notes?.trim() || null}, false)
        RETURNING id
      `;
      expenseId = expenses[0].id;

      const splitsData = activeMembers.map(m => ({
        expenseId,
        userId: m.userId,
        amountOwed: splitAmount,
      }));
      await sql`INSERT INTO "ExpenseSplit" ${sql(splitsData)}`;
    });

    return NextResponse.json({ id: expenseId, success: true }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id: groupId } = await params;
    const { expenseId } = await request.json();

    const groups = await sql`SELECT id FROM "Group" WHERE id = ${groupId} AND "ownerId" = ${session.user.id} LIMIT 1`;
    if (groups.length === 0) return NextResponse.json({ error: 'Group not found' }, { status: 404 });

    await sql.begin(async sql => {
      await sql`DELETE FROM "ExpenseSplit" WHERE "expenseId" = ${expenseId}`;
      await sql`DELETE FROM "Expense" WHERE id = ${expenseId}`;
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
