import { NextRequest, NextResponse } from 'next/server';
import { searchResultsRepo } from '@/lib/database';

export async function GET() {
  try {
    // Get one unprocessed or error result with link (no authentication required)
    const result = searchResultsRepo.getOneUnprocessedResult();

    if (!result) {
      return NextResponse.json({
        success: false,
        message: 'No unprocessed results found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      result: {
        id: result.id,
        search_query: result.search_query,
        title: result.title,
        link: result.link,
        search_date: result.search_date,
        processed: result.processed,
        category: result.category,
        created_at: result.created_at
      }
    });

  } catch (error) {
    console.error('Public unprocessed API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { id } = await request.json();

    if (!id || typeof id !== 'number') {
      return NextResponse.json({
        success: false,
        error: 'ID is required and must be a number'
      }, { status: 400 });
    }

    // First check if the record exists and get its current data
    const existingRecord = searchResultsRepo.getSearchResultById(id);

    if (!existingRecord) {
      return NextResponse.json({
        success: false,
        error: 'Record not found'
      }, { status: 404 });
    }

    // Update the processed status to 2 (completed)
    searchResultsRepo.updateProcessedStatus(id, 2);

    return NextResponse.json({
      success: true,
      message: 'Record processed status updated to completed',
      record: {
        id: existingRecord.id,
        link: existingRecord.link,
        title: existingRecord.title,
        previous_processed: existingRecord.processed,
        new_processed: 2
      }
    });

  } catch (error) {
    console.error('Public unprocessed POST API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
