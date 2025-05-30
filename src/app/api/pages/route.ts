import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { SearchResultsRepository } from '@/lib/database';

const searchResultsRepo = new SearchResultsRepository();

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    const userId = (session as any)?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, link, search_query, category } = body;

    // Validation
    if (!link || !search_query) {
      return NextResponse.json(
        { error: 'Link and search query are required' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(link);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Extract domain from link for duplicate checking

    // Check if domain already exists for this user
    const existingResult = await searchResultsRepo.domainExists(link, userId);
    if (existingResult) {
      return NextResponse.json(
        { error: 'This page already exists in your database' },
        { status: 409 }
      );
    }

    // Create search result object
    const searchResult = {
      search_query: search_query.trim(),
      title: title?.trim() || undefined,
      link: link.trim(),
      user_id: userId,
      processed: 0, // 0 = nieprzetworzone, 1 = w trakcie, 2 = zakończone, 3 = błąd
      category: category || 2, // Default category 2 for manual entries
    };

    // Insert the result
    const insertedId = await searchResultsRepo.insertManualSearchResult(searchResult);

    // Get the inserted result to return
    const insertedResult = await searchResultsRepo.getSearchResultById(insertedId, userId);

    return NextResponse.json({
      success: true,
      message: 'Page added successfully',
      result: insertedResult,
    });

  } catch (error) {
    console.error('Error adding manual page:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
