import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { searchResultsRepo, SearchResult } from '@/lib/database';

const { GoogleSearch } = require('google-search-results-nodejs');

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query } = await request.json();
    
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

    const search = new GoogleSearch(serpApiKey);
    const allResults: SearchResult[] = [];
    const maxRequests = 50;
    const resultsPerPage = 10; // Google typically returns 10 results per page

    console.log(`Starting search for query: "${query}" with ${maxRequests} requests`);

    // Make 50 API calls with different start parameters
    for (let i = 0; i < maxRequests; i++) {
      const startPosition = i * resultsPerPage;
      
      try {
        console.log(`Making request ${i + 1}/${maxRequests}, start position: ${startPosition}`);
        
        const searchParams = {
          q: query,
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
          for (const [index, result] of data.organic_results.entries()) {
            const searchResult: SearchResult = {
              search_query: query,
              title: result.title || '',
              link: result.link || '',
              snippet: result.snippet || '',
              displayed_link: result.displayed_link || result.link || '',
              position: startPosition + index + 1,
              user_id: userId,
              serpapi_position: startPosition + index + 1
            };
            
            allResults.push(searchResult);
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

    // Save all results to database
    if (allResults.length > 0) {
      searchResultsRepo.insertSearchResults(allResults);
    }

    return NextResponse.json({
      success: true,
      query,
      totalResults: allResults.length,
      requestsMade: Math.min(maxRequests, Math.ceil(allResults.length / resultsPerPage)),
      results: allResults
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
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');

    if (query) {
      // Get results for specific query
      const results = searchResultsRepo.getSearchResultsByQuery(query, userId);
      return NextResponse.json({ results, query });
    } else {
      // Get search history
      const history = searchResultsRepo.getSearchHistory(userId);
      const totalCount = searchResultsRepo.getTotalCount(userId);
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
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query } = await request.json();
    
    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    searchResultsRepo.deleteSearchResults(query, userId);

    return NextResponse.json({ success: true, message: 'Search results deleted' });

  } catch (error) {
    console.error('Search API DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
