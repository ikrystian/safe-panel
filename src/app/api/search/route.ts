import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { searchResultsRepo, SearchResult } from '@/lib/database';
import * as cheerio from 'cheerio'; // Import cheerio

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { GoogleSearch } = require('google-search-results-nodejs');

// Fetch and save WordPress users
async function fetchAndSaveWordPressUsers(searchResultId: number, link: string): Promise<void> {
  try {
    // Check if users already exist for this result
    if (searchResultsRepo.hasWordPressUsers(searchResultId)) {
      console.log(`WordPress users already exist for result ${searchResultId}`);
      return;
    }

    const wpApiUrl = `${link}/wp-json/wp/v2/users`;

    console.log(`Fetching WordPress users from: ${wpApiUrl}`);

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(wpApiUrl, {
      headers: {
        'User-Agent': 'Safe-Panel/1.0'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const users = await response.json();

      if (Array.isArray(users) && users.length > 0) {
        const wpUsers = users.map(user => ({
          search_result_id: searchResultId,
          wp_user_id: user.id,
          name: user.name || 'Unknown',
          slug: user.slug || null
        }));

        searchResultsRepo.insertWordPressUsers(wpUsers);
        searchResultsRepo.updateWordPressFetchStatus(searchResultId, 'success');
        console.log(`Saved ${wpUsers.length} WordPress users for result ${searchResultId}`);
      } else {
        searchResultsRepo.updateWordPressFetchStatus(
          searchResultId,
          'no_users',
          'Endpoint WordPress dostępny, ale nie znaleziono użytkowników'
        );
        searchResultsRepo.addError(searchResultId, 'wordpress_users', 'Brak użytkowników WordPress na stronie');
        console.log(`No WordPress users found for ${link}`);
      }
    } else if (response.status === 404) {
      searchResultsRepo.updateWordPressFetchStatus(
        searchResultId,
        'not_wordpress',
        'Endpoint /wp-json/wp/v2/users nie istnieje - prawdopodobnie nie jest to strona WordPress'
      );
      searchResultsRepo.addError(searchResultId, 'wordpress_users', 'Strona nie jest oparta na WordPress');
      console.log(`WordPress API not found for ${link} - not a WordPress site`);
    } else {
      const errorMsg = `Błąd HTTP ${response.status}: ${response.statusText}`;
      searchResultsRepo.updateWordPressFetchStatus(
        searchResultId,
        'error',
        errorMsg
      );
      searchResultsRepo.addError(searchResultId, 'wordpress_users', errorMsg);
      console.log(`Failed to fetch WordPress users from ${link}: ${response.status}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Nieznany błąd';

    if (error instanceof Error && error.name === 'AbortError') {
      const timeoutMsg = 'Przekroczono limit czasu połączenia (10s)';
      searchResultsRepo.updateWordPressFetchStatus(searchResultId, 'error', timeoutMsg);
      searchResultsRepo.addError(searchResultId, 'wordpress_users', timeoutMsg);
    } else if (errorMessage.includes('timeout') || errorMessage.includes('TIMEOUT')) {
      const timeoutMsg = 'Przekroczono limit czasu połączenia (10s)';
      searchResultsRepo.updateWordPressFetchStatus(searchResultId, 'error', timeoutMsg);
      searchResultsRepo.addError(searchResultId, 'wordpress_users', timeoutMsg);
    } else if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('DNS')) {
      const dnsMsg = 'Nie można znaleźć domeny (błąd DNS)';
      searchResultsRepo.updateWordPressFetchStatus(searchResultId, 'error', dnsMsg);
      searchResultsRepo.addError(searchResultId, 'wordpress_users', dnsMsg);
    } else if (errorMessage.includes('ECONNREFUSED')) {
      const connMsg = 'Połączenie odrzucone przez serwer';
      searchResultsRepo.updateWordPressFetchStatus(searchResultId, 'error', connMsg);
      searchResultsRepo.addError(searchResultId, 'wordpress_users', connMsg);
    } else if (errorMessage.includes('certificate') || errorMessage.includes('SSL')) {
      const sslMsg = 'Błąd certyfikatu SSL';
      searchResultsRepo.updateWordPressFetchStatus(searchResultId, 'error', sslMsg);
      searchResultsRepo.addError(searchResultId, 'wordpress_users', sslMsg);
    } else {
      const connErrorMsg = `Błąd połączenia: ${errorMessage}`;
      searchResultsRepo.updateWordPressFetchStatus(searchResultId, 'error', connErrorMsg);
      searchResultsRepo.addError(searchResultId, 'wordpress_users', connErrorMsg);
    }

    console.error('Error fetching WordPress users:', error);
  }
}

// Fetch and save meta name="generator" tag
async function fetchAndSaveMetaGenerator(searchResultId: number, link: string): Promise<void> {
  try {
    console.log(`Fetching meta generator from: ${link}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(link, {
      headers: {
        'User-Agent': 'Safe-Panel/1.0'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const html = await response.text();
      const $ = cheerio.load(html);
      const generatorTag = $('meta[name="generator"]');
      const generatorValue = generatorTag.attr('content');

      if (generatorValue) {
        searchResultsRepo.updateMetaGenerator(searchResultId, generatorValue);
        console.log(`Saved meta generator "${generatorValue}" for result ${searchResultId}`);
      } else {
        searchResultsRepo.updateMetaGenerator(searchResultId, null); // Store null if not found
        console.log(`No meta generator found for ${link}`);
      }
    } else {
      const errorMsg = `Błąd HTTP ${response.status}: ${response.statusText}`;
      searchResultsRepo.addError(searchResultId, 'meta_generator', errorMsg);
      console.log(`Failed to fetch meta generator from ${link}: ${response.status}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Nieznany błąd';

    if (error instanceof Error && error.name === 'AbortError') {
      const timeoutMsg = 'Przekroczono limit czasu połączenia (10s) podczas pobierania meta generatora';
      searchResultsRepo.addError(searchResultId, 'meta_generator', timeoutMsg);
    } else if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('DNS')) {
      const dnsMsg = 'Nie można znaleźć domeny (błąd DNS) podczas pobierania meta generatora';
      searchResultsRepo.addError(searchResultId, 'meta_generator', dnsMsg);
    } else if (errorMessage.includes('ECONNREFUSED')) {
      const connMsg = 'Połączenie odrzucone przez serwer podczas pobierania meta generatora';
      searchResultsRepo.addError(searchResultId, 'meta_generator', connMsg);
    } else if (errorMessage.includes('certificate') || errorMessage.includes('SSL')) {
      const sslMsg = 'Błąd certyfikatu SSL podczas pobierania meta generatora';
      searchResultsRepo.addError(searchResultId, 'meta_generator', sslMsg);
    } else {
      const connErrorMsg = `Błąd połączenia podczas pobierania meta generatora: ${errorMessage}`;
      searchResultsRepo.addError(searchResultId, 'meta_generator', connErrorMsg);
    }
    console.error('Error fetching meta generator:', error);
  }
}

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
    const { userId } = await auth();
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
      searchResultsRepo.resetPaginationState(query, userId);
    }

    const paginationState = searchResultsRepo.getPaginationState(query, userId);
    const startFromPosition = paginationState ? paginationState.last_start_position + 10 : 0;
    const totalRequestsMade = paginationState ? paginationState.total_requests_made : 0;

    const search = new GoogleSearch(serpApiKey);
    const allResults: SearchResult[] = [];
    const maxRequests = 1; // 1 for testing
    const resultsPerPage = 10; // Google typically returns 10 results per page

    console.log(`Starting search for query: "${query}" with ${maxRequests} requests`);
    console.log(`Starting from position: ${startFromPosition}, Total requests made so far: ${totalRequestsMade}`);

    for (let i = 0; i < maxRequests; i++) {
      const startPosition = startFromPosition + (i * resultsPerPage);

      try {
        console.log(`Making request ${i + 1}/${maxRequests}, start position: ${startPosition}`);

        const searchParams = {
          q: query + "  inurl:wp-content",
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
            // Extract domain from the original link
            const originalLink = result.link || '';
            const domain = extractDomain(originalLink);

            // Check if domain already exists for this user
            const domainExists = searchResultsRepo.domainExists(domain, userId);

            // Only add if domain doesn't exist (skip duplicates)
            if (!domainExists) {
              const searchResult: SearchResult = {
                search_query: query,
                title: result.title || '',
                link: domain, // Store only the domain
                snippet: result.snippet || '',
                position: startPosition + index + 1,
                user_id: userId,
                serpapi_position: startPosition + index + 1,
                processed: 0, // Mark as processed
                category: 0  // Set category to 2
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

    // Save all results to database
    if (allResults.length > 0) {
      searchResultsRepo.insertSearchResults(allResults);
    }

    // Update pagination state - save the last position we reached
    const lastPosition = startFromPosition + (maxRequests * resultsPerPage);
    const newTotalRequests = totalRequestsMade + maxRequests;
    searchResultsRepo.updatePaginationState(query, userId, lastPosition, newTotalRequests);

    return NextResponse.json({
      success: true,
      query,
      totalResults: allResults.length,
      requestsMade: maxRequests,
      totalRequestsMadeOverall: newTotalRequests,
      nextStartPosition: lastPosition,
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
    const getPagination = searchParams.get('pagination');

    if (query) {
      // Get results for specific query
      const results = searchResultsRepo.getSearchResultsByQuery(query, userId);
      const paginationState = searchResultsRepo.getPaginationState(query, userId);
      return NextResponse.json({
        results,
        query,
        pagination: paginationState
      });
    } else if (getPagination === 'true') {
      // Get all pagination states
      const paginationStates = searchResultsRepo.getAllPaginationStates(userId);
      return NextResponse.json({ paginationStates });
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
    searchResultsRepo.resetPaginationState(query, userId);

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
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, processed, query } = await request.json();

    if (id !== undefined && processed !== undefined) {
      // Update specific result by ID
      searchResultsRepo.updateProcessedStatus(id, processed);

      // If setting to processed (1), fetch WordPress users and meta generator
      if (processed === 1) {
        const result = searchResultsRepo.getSearchResultById(id, userId);
        if (result?.link) {
          await fetchAndSaveWordPressUsers(id, result.link);
          await fetchAndSaveMetaGenerator(id, result.link); // Call the new function
        }
      }

      return NextResponse.json({ success: true, message: 'Website processed successfully' });
    } else if (query && processed !== undefined) {
      // Update all results for a query
      searchResultsRepo.updateProcessedStatusByQuery(query, processed, userId);
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
