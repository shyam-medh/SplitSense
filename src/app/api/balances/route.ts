/**
 * GET /api/balances
 * Returns per-person net balances.
 * Optional query param: ?userId=xxx for drill-down details.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getBalances, getBalanceDetails } from '@/lib/balance-engine';
import { optimizeSettlements } from '@/lib/settlement-optimizer';
import { withCache } from '@/lib/redis';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const ownerId = session.user.id;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const groupId = searchParams.get('groupId') || undefined;

    if (userId) {
      const cacheKeySuffix = groupId ? `:${groupId}` : '';
      const details = await withCache(
        `balances:details:${ownerId}:${userId}${cacheKeySuffix}`,
        60, // 1 minute
        () => getBalanceDetails(ownerId, userId, groupId)
      );
      return NextResponse.json({ details });
    }

    const cacheKeyAll = groupId ? `balances:all:${ownerId}:${groupId}` : `balances:all:${ownerId}`;
    const { balances, settlements } = await withCache(
      cacheKeyAll,
      60, // 1 minute
      async () => {
        const bal = await getBalances(ownerId, groupId);
        const sett = optimizeSettlements(bal);
        return { balances: bal, settlements: sett };
      }
    );

    return NextResponse.json({ balances, suggestedSettlements: settlements });
  } catch (error) {
    console.error('API Error:', error instanceof Error ? error.stack : error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
