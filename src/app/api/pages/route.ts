import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { SearchResultsRepository } from '@/lib/database';

const searchResultsRepo = new SearchResultsRepository();

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, link, snippet, search_query, category } = body;

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
    const url = new URL(link);
    const domain = url.hostname;

    // Check if domain already exists for this user
    const existingResult = searchResultsRepo.domainExists(link, userId);
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
      snippet: snippet?.trim() || undefined,
      position: undefined,
      user_id: userId,
      serpapi_position: undefined,
      processed: 0, // Start as unprocessed
      category: category || 2, // Default category 2 for manual entries
    };

    // Insert the result
    const insertedId = searchResultsRepo.insertManualSearchResult(searchResult);

    // Get the inserted result to return
    const insertedResult = searchResultsRepo.getSearchResultById(insertedId, userId);

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
