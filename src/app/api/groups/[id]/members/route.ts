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
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id: groupId } = await params;

    const groups = await sql`SELECT id FROM "Group" WHERE id = ${groupId} AND "ownerId" = ${session.user.id} LIMIT 1`;
    if (groups.length === 0) return NextResponse.json({ error: 'Group not found' }, { status: 404 });

    const members = await sql`
      SELECT gm.*, u.name as "userName", u."isGuest"
      FROM "GroupMember" gm
      JOIN "User" u ON gm."userId" = u.id
      WHERE gm."groupId" = ${groupId}
      ORDER BY gm."joinedAt" ASC
    `;

    return NextResponse.json(members.map(m => ({
      id: m.id,
      userId: m.userId,
      name: m.userName,
      isGuest: m.isGuest,
      joinedAt: m.joinedAt,
      leftAt: m.leftAt,
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
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id: groupId } = await params;
    const { name } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Member name is required' }, { status: 400 });
    }

    const groups = await sql`SELECT id FROM "Group" WHERE id = ${groupId} AND "ownerId" = ${session.user.id} LIMIT 1`;
    if (groups.length === 0) return NextResponse.json({ error: 'Group not found' }, { status: 404 });

    // Find or create the user
    let users = await sql`SELECT * FROM "User" WHERE name = ${name.trim()} LIMIT 1`;
    let user = users[0];
    if (!user) {
      users = await sql`INSERT INTO "User" (name, "isGuest") VALUES (${name.trim()}, true) RETURNING *`;
      user = users[0];
    }

    // Add to group if not already a member
    const existings = await sql`SELECT * FROM "GroupMember" WHERE "groupId" = ${groupId} AND "userId" = ${user.id} LIMIT 1`;
    const existing = existings[0];

    if (existing) {
      // If they left, re-add them
      if (existing.leftAt) {
        await sql`UPDATE "GroupMember" SET "leftAt" = NULL WHERE id = ${existing.id}`;
      }
      return NextResponse.json({ message: 'Already a member', userId: user.id });
    }

    const members = await sql`
      INSERT INTO "GroupMember" ("groupId", "userId", "joinedAt")
      VALUES (${groupId}, ${user.id}, ${new Date()})
      RETURNING *
    `;
    const member = members[0];

    return NextResponse.json({
      id: member.id,
      userId: user.id,
      name: user.name,
      isGuest: user.isGuest,
      joinedAt: member.joinedAt,
    }, { status: 201 });
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
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id: groupId } = await params;
    const { userId } = await request.json();

    const groups = await sql`SELECT id FROM "Group" WHERE id = ${groupId} AND "ownerId" = ${session.user.id} LIMIT 1`;
    if (groups.length === 0) return NextResponse.json({ error: 'Group not found' }, { status: 404 });

    await sql`UPDATE "GroupMember" SET "leftAt" = ${new Date()} WHERE "groupId" = ${groupId} AND "userId" = ${userId}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
