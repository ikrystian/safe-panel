import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { searchResultsRepo } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    // Get result by ID
    const result = searchResultsRepo.getSearchResultById(id, userId);
    
    if (!result) {
      return NextResponse.json({ error: 'Result not found' }, { status: 404 });
    }

    return NextResponse.json({ result });

  } catch (error) {
    console.error('Search result API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
