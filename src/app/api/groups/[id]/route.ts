import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const groups = await sql`SELECT * FROM "Group" WHERE id = ${id} AND "ownerId" = ${session.user.id} LIMIT 1`;
    const group = groups[0] as any;
    if (group) {
      const members = await sql`
        SELECT gm.*, u.id as "userId", u.name, u.email, u."isGuest"
        FROM "GroupMember" gm
        JOIN "User" u ON gm."userId" = u.id
        WHERE gm."groupId" = ${id}
      `;
      group.members = members.map(m => ({
        id: m.id, groupId: m.groupId, userId: m.userId, joinedAt: m.joinedAt, leftAt: m.leftAt,
        user: { id: m.userId, name: m.name, email: m.email, isGuest: m.isGuest }
      }));
    }

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    return NextResponse.json(group);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    
    // Ensure the group belongs to the user
    const groups = await sql`SELECT id FROM "Group" WHERE id = ${id} AND "ownerId" = ${session.user.id} LIMIT 1`;
    if (groups.length === 0) return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });

    // Delete all related records first
    await sql.begin(async sql => {
      await sql`DELETE FROM "ExpenseSplit" WHERE "expenseId" IN (SELECT id FROM "Expense" WHERE "groupId" = ${id})`;
      await sql`DELETE FROM "Expense" WHERE "groupId" = ${id}`;
      await sql`DELETE FROM "Settlement" WHERE "groupId" = ${id}`;
      await sql`DELETE FROM "GroupMember" WHERE "groupId" = ${id}`;
      await sql`DELETE FROM "Group" WHERE id = ${id}`;
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
