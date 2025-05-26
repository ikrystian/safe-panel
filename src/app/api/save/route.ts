import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
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
      // Standard Clerk authentication for other requests
      const authResult = await auth();
      userIdFromAuth = authResult.userId;
      if (!userIdFromAuth) {
        console.log('Unauthorized: No userId from Clerk auth and no valid API key.');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      console.log(`Request authorized via Clerk auth for user: ${userIdFromAuth}`);
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

    // Determine status, errors, and wpscan_details based on scan result
    let processed = 2; // Default to completed (2)
    let errors = null;
    let wpscanDetails = null;

    if (data.status === 'error') {
      processed = 3; // Error status (3)
      errors = JSON.stringify({
        type: 'wpscan_runner_error', // Error from the script running wpscan
        message: data.error || 'Unknown error from scan runner',
        timestamp: new Date().toISOString()
      });
      // wpscanDetails remains null as the scan itself might not have run or produced data
    } else if (data.status === 'completed') {
      if (data.data) {
        wpscanDetails = JSON.stringify(data.data); // Store the wpscan JSON output

        // Check for errors or aborted scan within the wpscan data itself
        if (data.data.scan_aborted) {
          processed = 3; // Error status (3)
          errors = JSON.stringify({
            type: 'wpscan_aborted',
            message: data.data.scan_aborted,
            timestamp: new Date().toISOString()
          });
        } else if (data.data.error) { // Assuming wpscan might have a top-level error field
          processed = 3; // Error status (3)
          errors = JSON.stringify({
            type: 'wpscan_internal_error',
            message: data.data.error,
            timestamp: new Date().toISOString()
          });
        } else {
          processed = 2; // Completed successfully (2)
        }
      } else {
        // Status is 'completed' but no 'data' field from wpscan
        processed = 3; // Error status (3)
        errors = JSON.stringify({
          type: 'missing_wpscan_data',
          message: 'Scan reported as completed by runner, but wpscan output (data.data) is missing.',
          timestamp: new Date().toISOString()
        });
      }
    } else {
      // Unknown status from server.js, treat as error or log warning
      console.warn(`Unknown status received: ${data.status} for URL: ${data.url}`);
      processed = 3; // Mark as error
      errors = JSON.stringify({
        type: 'unknown_status',
        message: `Received unknown status '${data.status}' from scan runner.`,
        timestamp: new Date().toISOString()
      });
    }

    // Update the search result in the database
    const updateResult = db.prepare(`
      UPDATE history_scrapped
      SET processed = ?, errors = ?, wpscan_details = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(processed, errors, wpscanDetails, result.id);

    if (updateResult.changes === 0) {
      console.error(`Failed to update search result for ID: ${result.id}`);
      return NextResponse.json(
        { error: 'Failed to update search result in database' },
        { status: 500 }
      );
    }

    console.log(`Successfully updated result ${result.id} with status ${processed}. WPScan details stored: ${!!wpscanDetails}`);

    return NextResponse.json({
      message: 'Scan result processed successfully',
      resultId: result.id,
      status: processed === 2 ? 'completed' : 'error',
      wpscan_details_stored: !!wpscanDetails,
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
