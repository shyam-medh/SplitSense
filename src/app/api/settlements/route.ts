/**
 * GET /api/settlements
 * Returns recorded settlements (from CSV import).
 */

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { withCache } from '@/lib/redis';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const ownerId = session.user.id;

    const formatted = await withCache(`settlements:all:${ownerId}`, 60, async () => {
      const settlements = await sql`
        SELECT s.*, p1.name as "payerName", p2.name as "payeeName" 
        FROM "Settlement" s
        JOIN "User" p1 ON s."payerId" = p1.id
        JOIN "User" p2 ON s."payeeId" = p2.id
        WHERE s."groupId" IN (SELECT id FROM "Group" WHERE "ownerId" = ${ownerId})
        ORDER BY s.date ASC
      `;

      return settlements.map(s => ({
        id: s.id,
        from: s.payerName,
        to: s.payeeName,
        amount: s.amount,
        date: new Date(s.date).toISOString().split('T')[0],
        notes: s.notes,
        csvRow: s.csvRow,
      }));
    });

    return NextResponse.json(formatted);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
