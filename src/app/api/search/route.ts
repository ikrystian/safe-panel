import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { searchResultsRepo, ISearchResult } from '@/lib/database';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { GoogleSearch } = require('google-search-results-nodejs');

// Extract domain from URL
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace(/^www\./, '');
    const protocol = urlObj.protocol; // http: or https:
    return `${protocol}//${hostname}`;
  } catch (error) {
    // If URL parsing fails, try to add protocol if missing
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return `https://${url}`;
    }
    return url;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    const userId = (session as any)?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query, resetPagination = false } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // Check if SERPAPI_KEY is configured
    const serpApiKey = process.env.SERPAPI_KEY;
    if (!serpApiKey) {
      return NextResponse.json({
        error: 'SerpAPI key not configured. Please add SERPAPI_KEY to your environment variables.'
      }, { status: 500 });
    }

    // Get or reset pagination state
    if (resetPagination) {
      await searchResultsRepo.resetPaginationState(query, userId);
    }

    const paginationState = await searchResultsRepo.getPaginationState(query, userId);
    const startFromPosition = paginationState ? paginationState.last_start_position + 10 : 0;
    const totalRequestsMade = paginationState ? paginationState.total_requests_made : 0;

    const search = new GoogleSearch(serpApiKey);
    const allResults: ISearchResult[] = [];
    const maxRequests = 1; // 1 for testing
    const resultsPerPage = 10; // Google typically returns 10 results per page

    console.log(`Starting search for query: "${query}" with ${maxRequests} requests`);
    console.log(`Starting from position: ${startFromPosition}, Total requests made so far: ${totalRequestsMade}`);

    for (let i = 0; i < maxRequests; i++) {
      const startPosition = startFromPosition + (i * resultsPerPage);

      try {
        console.log(`Making request ${i + 1}/${maxRequests}, start position: ${startPosition}`);

        const searchParams = {
          q: query + "  inurl:wp-content OR inurl:wp-admin OR inurl:wp-includes",
          location: "Poland", // You can make this configurable
          hl: "pl", // Language
          gl: "pl", // Country
          start: startPosition,
          num: resultsPerPage
        };

        // Make the search request
        const searchResults = await new Promise((resolve, reject) => {
          search.json(searchParams, (data: any) => {
            if (data.error) {
              reject(new Error(data.error));
            } else {
              resolve(data);
            }
          });
        });

        const data = searchResults as any;

        // Process organic results
        if (data.organic_results && Array.isArray(data.organic_results)) {
          for (const result of data.organic_results) {
            // Extract domain from the original link
            const originalLink = result.link || '';
            const domain = extractDomain(originalLink);

            // Check if domain already exists for this user
            const domainExists = await searchResultsRepo.domainExists(domain, userId);

            // Only add if domain doesn't exist (skip duplicates)
            if (!domainExists) {
              const searchResult: ISearchResult = {
                search_query: query,
                title: result.title || '',
                link: domain, // Store only the domain
                user_id: userId,
                processed: 0, // Mark as unprocessed
                category: 0  // Set category to 0
              };

              allResults.push(searchResult);
            }
          }
        }

        // Add a small delay between requests to be respectful to the API
        if (i < maxRequests - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // If we get fewer results than expected, we might have reached the end
        if (!data.organic_results || data.organic_results.length < resultsPerPage) {
          console.log(`Reached end of results at request ${i + 1}`);
          break;
        }

      } catch (error) {
        console.error(`Error in request ${i + 1}:`, error);
        // Continue with next request even if one fails
        continue;
      }
    }

    console.log(`Search completed. Total results found: ${allResults.length}`);

    let newlyAddedResults: ISearchResult[] = [];
    // Save all results to database
    if (allResults.length > 0) {
      await searchResultsRepo.insertSearchResults(allResults);
      // After inserting, fetch the newly added results from the database
      // This assumes getSearchResultsByQuery returns results ordered by creation,
      // so the most recent ones (which are the newly added ones) will be at the top.
      // A more robust solution might involve returning IDs from insertSearchResults
      // or adding a unique identifier to the batch. For now, we'll fetch all for the query.
      newlyAddedResults = await searchResultsRepo.getSearchResultsByQuery(query, userId);
    }

    // Update pagination state - save the last position we reached
    const lastPosition = startFromPosition + (maxRequests * resultsPerPage);
    const newTotalRequests = totalRequestsMade + maxRequests;
    await searchResultsRepo.updatePaginationState(query, userId, lastPosition, newTotalRequests);

    return NextResponse.json({
      success: true,
      query,
      totalResults: allResults.length, // This still represents the count of newly found results
      requestsMade: maxRequests,
      totalRequestsMadeOverall: newTotalRequests,
      nextStartPosition: lastPosition,
      results: newlyAddedResults // Return the results fetched from the database
    });

  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    const userId = (session as any)?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const getPagination = searchParams.get('pagination');
    const getAll = searchParams.get('all');

    if (query) {
      // Get results for specific query
      const results = await searchResultsRepo.getSearchResultsByQuery(query, userId);
      const paginationState = await searchResultsRepo.getPaginationState(query, userId);
      return NextResponse.json({
        results,
        query,
        pagination: paginationState
      });
    } else if (getAll === 'true') {
      // Get all search results for user (for Pages Database)
      const results = await searchResultsRepo.getAllSearchResults(userId);
      return NextResponse.json({ results });
    } else if (getPagination === 'true') {
      // Get all pagination states
      const paginationStates = await searchResultsRepo.getAllPaginationStates(userId);
      return NextResponse.json({ paginationStates });
    } else {
      // Get search history
      const history = await searchResultsRepo.getSearchHistory(userId);
      const totalCount = await searchResultsRepo.getTotalCount(userId);
      return NextResponse.json({ history, totalCount });
    }

  } catch (error) {
    console.error('Search API GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    const userId = (session as any)?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query } = await request.json();

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    await searchResultsRepo.deleteSearchResults(query, userId);
    await searchResultsRepo.resetPaginationState(query, userId);

    return NextResponse.json({ success: true, message: 'Search results and pagination state deleted' });

  } catch (error) {
    console.error('Search API DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    const userId = (session as any)?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, processed, query } = await request.json();

    if (id !== undefined && processed !== undefined) {
      // Update specific result by ID
      await searchResultsRepo.updateProcessedStatus(id, processed);

      return NextResponse.json({ success: true, message: 'Website processed successfully' });
    } else if (query && processed !== undefined) {
      // Update all results for a query
      await searchResultsRepo.updateProcessedStatusByQuery(query, processed, userId);
      return NextResponse.json({ success: true, message: 'Processed status updated for all results' });
    } else {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

  } catch (error) {
    console.error('Search API PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
