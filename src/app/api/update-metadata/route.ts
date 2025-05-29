import { NextRequest, NextResponse } from 'next/server';
import { searchResultsRepo } from '@/lib/database';

interface UpdateMetadataRequest {
  id: string;
  contact_url: string;
  category: string;
  is_wordpress: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate that body is an array
    if (!Array.isArray(body)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Request body must be an array of objects'
        },
        { status: 400 }
      );
    }

    // Validate each item in the array
    const validationErrors: string[] = [];
    const validUpdates: UpdateMetadataRequest[] = [];

    body.forEach((item, index) => {
      if (typeof item !== 'object' || item === null) {
        validationErrors.push(`Item at index ${index}: must be an object`);
        return;
      }

      if (typeof item.id !== 'string') {
        validationErrors.push(`Item at index ${index}: id must be a string`);
        return;
      }

      if (typeof item.contact_url !== 'string') {
        validationErrors.push(`Item at index ${index}: contact_url must be a string`);
        return;
      }

      if (typeof item.category !== 'string') {
        validationErrors.push(`Item at index ${index}: category must be a string`);
        return;
      }

      if (typeof item.is_wordpress !== 'boolean') {
        validationErrors.push(`Item at index ${index}: is_wordpress must be a boolean`);
        return;
      }

      validUpdates.push({
        id: item.id,
        contact_url: item.contact_url,
        category: item.category,
        is_wordpress: item.is_wordpress
      });
    });

    // Return validation errors if any
    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationErrors
        },
        { status: 400 }
      );
    }

    // If no valid updates, return error
    if (validUpdates.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No valid updates provided'
        },
        { status: 400 }
      );
    }

    // Perform the updates
    const result = await searchResultsRepo.updateRecordsWithMetadata(validUpdates);

    // Return success response
    return NextResponse.json({
      success: true,
      message: `Successfully updated ${result.updated} records`,
      updated: result.updated,
      total_requested: validUpdates.length,
      errors: result.errors.length > 0 ? result.errors : undefined
    });

  } catch (error) {
    console.error('Update metadata API error:', error);
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
