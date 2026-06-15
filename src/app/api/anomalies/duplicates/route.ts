import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const ownerId = session.user.id;

    const duplicates = await sql`
      SELECT 
        e.id, e.description, e.amount, e.date, e."csvRow", e.notes,
        json_build_object('name', p.name) as "paidBy"
      FROM "Expense" e
      LEFT JOIN "User" p ON e."paidById" = p.id
      WHERE e."isDuplicate" = true 
      AND e."groupId" IN (SELECT id FROM "Group" WHERE "ownerId" = ${ownerId})
      ORDER BY e.date DESC
    `;
    
    return NextResponse.json(duplicates);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch duplicates" }, { status: 500 });
  }
}
