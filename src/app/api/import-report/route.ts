/**
 * GET /api/import-report
 * Returns all import log entries for the import report UI.
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

    const logs = await sql`
      SELECT * FROM "ImportLog"
      WHERE "ownerId" = ${ownerId}
      ORDER BY "csvRow" ASC, "createdAt" ASC
      LIMIT 500
    `;

    // Also compute summary stats
    const summary = {
      total: logs.length,
      byLevel: {
        INFO: logs.filter(l => l.level === 'INFO').length,
        WARNING: logs.filter(l => l.level === 'WARNING').length,
        ERROR: logs.filter(l => l.level === 'ERROR').length,
      },
      byCategory: {} as Record<string, { count: number; label: string }>,
    };

    const categoryLabels: Record<string, string> = {
      A: 'Name & Identity',
      B: 'Number & Format',
      C: 'Missing Data',
      D: 'Business Logic',
      E: 'Duplicates & Conflicts',
      F: 'Date Issues',
      G: 'Currency',
    };

    for (const log of logs) {
      if (!summary.byCategory[log.category]) {
        summary.byCategory[log.category] = {
          count: 0,
          label: categoryLabels[log.category] || log.category,
        };
      }
      summary.byCategory[log.category].count++;
    }

    return NextResponse.json({ logs, summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
