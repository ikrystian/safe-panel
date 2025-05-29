import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { SearchResultsRepository } from '@/lib/database';

const searchResultsRepo = new SearchResultsRepository();

export async function POST(request: NextRequest) {
  try {
    let userIdFromAuth: string | null = null;
    let userIdFromCallback: string | null = null;
    let isCallbackRequest = false;

    const callbackApiKey = request.headers.get('X-Callback-API-Key');
    const internalApiKey = process.env.INTERNAL_CALLBACK_API_KEY;

    console.log('Checking API key authorization:');
    console.log('Received API key:', callbackApiKey ? '***PRESENT***' : 'MISSING');
    console.log('Expected API key:', internalApiKey ? '***PRESENT***' : 'MISSING');
    console.log('Keys match:', callbackApiKey === internalApiKey);

    if (internalApiKey && callbackApiKey === internalApiKey) {
      isCallbackRequest = true;
      // For callback requests, userId must be in the payload
      // We'll extract it after parsing the JSON
      console.log('Request authorized via API Key for callback.');
    } else {
      // Standard NextAuth authentication for other requests
      const session = await getServerSession(authOptions);
      userIdFromAuth = (session as any)?.user?.id || null;
      if (!userIdFromAuth) {
        console.log('Unauthorized: No userId from NextAuth session and no valid API key.');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      console.log(`Request authorized via NextAuth for user: ${userIdFromAuth}`);
    }

    const data = await request.json();
    console.log('Received scan result:', JSON.stringify(data, null, 2)); // Log the full received data

    if (isCallbackRequest) {
      if (!data.userId) {
        console.error('Callback Error: Missing userId in payload from server.js');
        return NextResponse.json({ error: 'Missing userId in callback payload' }, { status: 400 });
      }
      userIdFromCallback = data.userId;
    }

    const currentUserId = isCallbackRequest ? userIdFromCallback : userIdFromAuth;

    if (!currentUserId) {
      // This should ideally be caught earlier, but as a safeguard:
      console.error('Critical Error: No user ID available for processing.');
      return NextResponse.json({ error: 'Unauthorized - User ID missing' }, { status: 401 });
    }

    if (!data || !data.url) {
      return NextResponse.json(
        { error: 'Missing required data: url' },
        { status: 400 }
      );
    }

    // Access the database connection
    const db = searchResultsRepo['db']; // Access private db property

    // Find the result by URL and user_id
    const result = db.prepare(`
      SELECT id FROM history_scrapped
      WHERE user_id = ? AND link = ?
      ORDER BY created_at DESC
      LIMIT 1
    `).get(currentUserId, data.url) as { id: number } | undefined;

    if (!result) {
      console.log(`No result found for URL: ${data.url} and user_id: ${currentUserId}`);
      return NextResponse.json(
        { error: 'No matching search result found for this user and URL' },
        { status: 404 }
      );
    }

    // Determine status based on scan result
    let processed = 2; // Default to completed (2)

    if (data.status === 'error') {
      processed = 3; // Error status (3)
      console.log(`Scan error for ${data.url}: ${data.error || 'Unknown error'}`);
    } else if (data.status === 'completed') {
      if (data.data) {
        // Check for errors or aborted scan within the wpscan data itself
        if (data.data.scan_aborted || data.data.error) {
          processed = 3; // Error status (3)
          console.log(`Scan aborted or error for ${data.url}: ${data.data.scan_aborted || data.data.error}`);
        } else {
          processed = 2; // Completed successfully (2)
          console.log(`Scan completed successfully for ${data.url}`);
        }
      } else {
        // Status is 'completed' but no 'data' field from wpscan
        processed = 3; // Error status (3)
        console.log(`Scan completed but no data for ${data.url}`);
      }
    } else {
      // Unknown status from server.js, treat as error or log warning
      console.warn(`Unknown status received: ${data.status} for URL: ${data.url}`);
      processed = 3; // Mark as error
    }

    // Update the search result in the database
    const updateResult = db.prepare(`
      UPDATE history_scrapped
      SET processed = ?
      WHERE id = ?
    `).run(processed, result.id);

    if (updateResult.changes === 0) {
      console.error(`Failed to update search result for ID: ${result.id}`);
      return NextResponse.json(
        { error: 'Failed to update search result in database' },
        { status: 500 }
      );
    }

    console.log(`Successfully updated result ${result.id} with status ${processed}`);

    return NextResponse.json({
      message: 'Scan result processed successfully',
      resultId: result.id,
      status: processed === 2 ? 'completed' : 'error',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error processing scan result in /api/save:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
