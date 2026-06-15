import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const groups = await sql`
      SELECT 
        g.*,
        (SELECT count(*) FROM "GroupMember" WHERE "groupId" = g.id)::int as members_count,
        (SELECT count(*) FROM "Expense" WHERE "groupId" = g.id)::int as expenses_count
      FROM "Group" g
      WHERE g."ownerId" = ${session.user.id}
      ORDER BY g.name ASC
    `;
    const formattedGroups = groups.map(g => ({
      ...g,
      _count: {
        members: g.members_count,
        expenses: g.expenses_count
      }
    }));
    return NextResponse.json(formattedGroups);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name } = await request.json();
    
    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Group name is required' }, { status: 400 });
    }

    const groups = await sql`
      INSERT INTO "Group" (name, "ownerId")
      VALUES (${name.trim()}, ${session.user.id})
      RETURNING *
    `;
    const group = groups[0];

    return NextResponse.json(group);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
