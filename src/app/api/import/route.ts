/**
 * POST /api/import
 * Accepts CSV content (as text body or file upload) and runs the import pipeline.
 */

import { NextRequest, NextResponse } from 'next/server';
import { importCSV } from '@/lib/import/importer';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    const groupId = formData.get('groupId') as string | null;

    let csvContent: string;

    if (file) {
      csvContent = await file.text();
    } else {
      // Try reading as plain text
      csvContent = await request.text();
    }

    if (!csvContent || csvContent.trim().length === 0) {
      return NextResponse.json(
        { error: 'No CSV content provided' },
        { status: 400 }
      );
    }

    const result = await importCSV(csvContent, groupId || undefined, session.user.id);

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
