import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { SearchResultsRepository } from '@/lib/database';

const searchResultsRepo = new SearchResultsRepository();

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = searchResultsRepo['db']; // Access private db property

    // Basic statistics
    const totalResults = searchResultsRepo.getTotalCount(userId);
    
    // Get processed vs unprocessed
    const processedStats = db.prepare(`
      SELECT 
        processed,
        COUNT(*) as count
      FROM history_scrapped 
      WHERE user_id = ?
      GROUP BY processed
    `).all(userId) as { processed: number; count: number }[];

    // Get results by category
    const categoryStats = db.prepare(`
      SELECT 
        category,
        COUNT(*) as count
      FROM history_scrapped 
      WHERE user_id = ?
      GROUP BY category
    `).all(userId) as { category: number; count: number }[];

    // Get search activity by date (last 30 days)
    const searchActivity = db.prepare(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM history_scrapped 
      WHERE user_id = ? AND created_at >= datetime('now', '-30 days')
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `).all(userId) as { date: string; count: number }[];

    // Get top search queries
    const topQueries = db.prepare(`
      SELECT 
        search_query,
        COUNT(*) as count,
        MAX(created_at) as last_search
      FROM history_scrapped 
      WHERE user_id = ?
      GROUP BY search_query
      ORDER BY count DESC
      LIMIT 10
    `).all(userId) as { search_query: string; count: number; last_search: string }[];

    // WordPress fetch statistics
    const wpFetchStats = db.prepare(`
      SELECT 
        wp_fetch_status,
        COUNT(*) as count
      FROM history_scrapped 
      WHERE user_id = ? AND wp_fetch_status IS NOT NULL
      GROUP BY wp_fetch_status
    `).all(userId) as { wp_fetch_status: string; count: number }[];

    // Error statistics
    const errorStats = db.prepare(`
      SELECT 
        COUNT(*) as total_with_errors
      FROM history_scrapped 
      WHERE user_id = ? AND errors IS NOT NULL
    `).get(userId) as { total_with_errors: number };

    // Pagination statistics
    const paginationStats = db.prepare(`
      SELECT 
        COUNT(*) as total_queries,
        SUM(total_requests_made) as total_requests,
        AVG(total_requests_made) as avg_requests_per_query
      FROM search_pagination 
      WHERE user_id = ?
    `).get(userId) as { total_queries: number; total_requests: number; avg_requests_per_query: number };

    // Recent activity (last 7 days)
    const recentActivity = db.prepare(`
      SELECT 
        search_query,
        title,
        link,
        created_at,
        processed,
        wp_fetch_status
      FROM history_scrapped 
      WHERE user_id = ? AND created_at >= datetime('now', '-7 days')
      ORDER BY created_at DESC
      LIMIT 20
    `).all(userId) as any[];

    return NextResponse.json({
      overview: {
        totalResults,
        totalQueries: paginationStats.total_queries || 0,
        totalRequests: paginationStats.total_requests || 0,
      },
      processedStats,
      categoryStats,
      searchActivity,
      topQueries,
      wpFetchStats,
      errorStats,
      paginationStats,
      recentActivity,
    });

  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
