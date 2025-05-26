import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'database.sqlite');

// Create database instance
let db: Database.Database;

export function getDatabase() {
  if (!db) {
    // Ensure data directory exists
    const fs = require('fs');
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    db = new Database(dbPath);

    // Enable WAL mode for better performance
    db.pragma('journal_mode = WAL');

    // Initialize tables
    initializeTables();
  }

  return db;
}

function initializeTables() {
  const db = getDatabase();

  // Create history_scrapped table
  db.exec(`
    CREATE TABLE IF NOT EXISTS history_scrapped (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      search_query TEXT NOT NULL,
      title TEXT,
      link TEXT,
      snippet TEXT,
      position INTEGER,
      search_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      user_id TEXT,
      serpapi_position INTEGER,
      processed INTEGER DEFAULT 0,
      category INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create search_pagination table to track pagination state
  db.exec(`
    CREATE TABLE IF NOT EXISTS search_pagination (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      search_query TEXT NOT NULL,
      user_id TEXT NOT NULL,
      last_start_position INTEGER DEFAULT 0,
      total_requests_made INTEGER DEFAULT 0,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(search_query, user_id)
    )
  `);

  // Create wordpress_users table to store fetched WordPress users
  db.exec(`
    CREATE TABLE IF NOT EXISTS wordpress_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      search_result_id INTEGER NOT NULL,
      wp_user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (search_result_id) REFERENCES history_scrapped (id) ON DELETE CASCADE
    )
  `);

  // Add processed column if it doesn't exist (for existing databases)
  try {
    db.exec(`ALTER TABLE history_scrapped ADD COLUMN processed INTEGER DEFAULT 0`);
  } catch (error) {
    // Column already exists, ignore error
  }

  // Add category column if it doesn't exist (for existing databases)
  try {
    db.exec(`ALTER TABLE history_scrapped ADD COLUMN category INTEGER DEFAULT 0`);
  } catch (error) {
    // Column already exists, ignore error
  }

  // Add WordPress fetch status columns if they don't exist (for existing databases)
  try {
    db.exec(`ALTER TABLE history_scrapped ADD COLUMN wp_fetch_status TEXT DEFAULT NULL`);
  } catch (error) {
    // Column already exists, ignore error
  }

  try {
    db.exec(`ALTER TABLE history_scrapped ADD COLUMN wp_fetch_error TEXT DEFAULT NULL`);
  } catch (error) {
    // Column already exists, ignore error
  }

  try {
    db.exec(`ALTER TABLE history_scrapped ADD COLUMN wp_fetch_attempted_at DATETIME DEFAULT NULL`);
  } catch (error) {
    // Column already exists, ignore error
  }

  // Create index for better performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_search_query ON history_scrapped(search_query);
    CREATE INDEX IF NOT EXISTS idx_search_date ON history_scrapped(search_date);
    CREATE INDEX IF NOT EXISTS idx_user_id ON history_scrapped(user_id);
    CREATE INDEX IF NOT EXISTS idx_pagination_query_user ON search_pagination(search_query, user_id);
    CREATE INDEX IF NOT EXISTS idx_wp_users_search_result ON wordpress_users(search_result_id);
  `);
}

export interface SearchResult {
  id?: number;
  search_query: string;
  title?: string;
  link?: string;
  snippet?: string;
  position?: number;
  search_date?: string;
  user_id?: string;
  serpapi_position?: number;
  processed?: number;
  category?: number;
  created_at?: string;
  wp_fetch_status?: string | null;
  wp_fetch_error?: string | null;
  wp_fetch_attempted_at?: string | null;
}

export interface SearchPagination {
  id?: number;
  search_query: string;
  user_id: string;
  last_start_position: number;
  total_requests_made: number;
  last_updated?: string;
}

export interface WordPressUser {
  id?: number;
  search_result_id: number;
  wp_user_id: number;
  name: string;
  created_at?: string;
}

export class SearchResultsRepository {
  private db: Database.Database;

  constructor() {
    this.db = getDatabase();
  }

  // Insert search results
  insertSearchResults(results: SearchResult[]): void {
    const stmt = this.db.prepare(`
      INSERT INTO history_scrapped (
        search_query, title, link, snippet,
        position, user_id, serpapi_position, processed, category
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = this.db.transaction((results: SearchResult[]) => {
      for (const result of results) {
        stmt.run(
          result.search_query,
          result.title,
          result.link,
          result.snippet,
          result.position,
          result.user_id,
          result.serpapi_position,
          result.processed || 0,
          result.category || 0
        );
      }
    });

    insertMany(results);
  }

  // Get search results by query
  getSearchResultsByQuery(query: string, userId?: string): SearchResult[] {
    let sql = `
      SELECT * FROM history_scrapped
      WHERE search_query = ?
    `;
    const params: any[] = [query];

    if (userId) {
      sql += ` AND user_id = ?`;
      params.push(userId);
    }

    sql += ` ORDER BY created_at DESC, serpapi_position ASC`;

    const stmt = this.db.prepare(sql);
    return stmt.all(...params) as SearchResult[];
  }

  // Get search result by ID
  getSearchResultById(id: number, userId?: string): SearchResult | null {
    let sql = `
      SELECT * FROM history_scrapped
      WHERE id = ?
    `;
    const params: any[] = [id];

    if (userId) {
      sql += ` AND user_id = ?`;
      params.push(userId);
    }

    const stmt = this.db.prepare(sql);
    return stmt.get(...params) as SearchResult | null;
  }

  // Get all search queries for a user
  getSearchHistory(userId?: string): { search_query: string; count: number; last_search: string }[] {
    let sql = `
      SELECT
        search_query,
        COUNT(*) as count,
        MAX(created_at) as last_search
      FROM history_scrapped
    `;
    const params: any[] = [];

    if (userId) {
      sql += ` WHERE user_id = ?`;
      params.push(userId);
    }

    sql += ` GROUP BY search_query ORDER BY last_search DESC`;

    const stmt = this.db.prepare(sql);
    return stmt.all(...params) as { search_query: string; count: number; last_search: string }[];
  }

  // Delete search results by query
  deleteSearchResults(query: string, userId?: string): void {
    let sql = `DELETE FROM history_scrapped WHERE search_query = ?`;
    const params: any[] = [query];

    if (userId) {
      sql += ` AND user_id = ?`;
      params.push(userId);
    }

    const stmt = this.db.prepare(sql);
    stmt.run(...params);
  }

  // Get total count of results
  getTotalCount(userId?: string): number {
    let sql = `SELECT COUNT(*) as count FROM history_scrapped`;
    const params: any[] = [];

    if (userId) {
      sql += ` WHERE user_id = ?`;
      params.push(userId);
    }

    const stmt = this.db.prepare(sql);
    const result = stmt.get(...params) as { count: number };
    return result.count;
  }

  // Update processed status for a specific result
  updateProcessedStatus(id: number, processed: number): void {
    const stmt = this.db.prepare(`
      UPDATE history_scrapped
      SET processed = ?
      WHERE id = ?
    `);
    stmt.run(processed, id);
  }

  // Update processed status for all results of a query
  updateProcessedStatusByQuery(query: string, processed: number, userId?: string): void {
    let sql = `UPDATE history_scrapped SET processed = ? WHERE search_query = ?`;
    const params: any[] = [processed, query];

    if (userId) {
      sql += ` AND user_id = ?`;
      params.push(userId);
    }

    const stmt = this.db.prepare(sql);
    stmt.run(...params);
  }

  // Check if domain exists in database
  domainExists(domain: string, userId?: string): boolean {
    let sql = `SELECT COUNT(*) as count FROM history_scrapped WHERE link = ?`;
    const params: any[] = [domain];

    if (userId) {
      sql += ` AND user_id = ?`;
      params.push(userId);
    }

    const stmt = this.db.prepare(sql);
    const result = stmt.get(...params) as { count: number };
    return result.count > 0;
  }

  // Get pagination state for a query
  getPaginationState(query: string, userId: string): SearchPagination | null {
    const stmt = this.db.prepare(`
      SELECT * FROM search_pagination
      WHERE search_query = ? AND user_id = ?
    `);
    return stmt.get(query, userId) as SearchPagination | null;
  }

  // Update pagination state
  updatePaginationState(query: string, userId: string, startPosition: number, requestsMade: number): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO search_pagination
      (search_query, user_id, last_start_position, total_requests_made, last_updated)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    stmt.run(query, userId, startPosition, requestsMade);
  }

  // Reset pagination state for a query
  resetPaginationState(query: string, userId: string): void {
    const stmt = this.db.prepare(`
      DELETE FROM search_pagination
      WHERE search_query = ? AND user_id = ?
    `);
    stmt.run(query, userId);
  }

  // Get all pagination states for a user
  getAllPaginationStates(userId: string): SearchPagination[] {
    const stmt = this.db.prepare(`
      SELECT * FROM search_pagination
      WHERE user_id = ?
      ORDER BY last_updated DESC
    `);
    return stmt.all(userId) as SearchPagination[];
  }

  // WordPress Users methods
  insertWordPressUsers(users: WordPressUser[]): void {
    const stmt = this.db.prepare(`
      INSERT INTO wordpress_users (
        search_result_id, wp_user_id, name
      ) VALUES (?, ?, ?)
    `);

    const insertMany = this.db.transaction((users: WordPressUser[]) => {
      for (const user of users) {
        stmt.run(
          user.search_result_id,
          user.wp_user_id,
          user.name
        );
      }
    });

    insertMany(users);
  }

  getWordPressUsersBySearchResultId(searchResultId: number): WordPressUser[] {
    const stmt = this.db.prepare(`
      SELECT * FROM wordpress_users
      WHERE search_result_id = ?
      ORDER BY name ASC
    `);
    return stmt.all(searchResultId) as WordPressUser[];
  }

  deleteWordPressUsersBySearchResultId(searchResultId: number): void {
    const stmt = this.db.prepare(`
      DELETE FROM wordpress_users
      WHERE search_result_id = ?
    `);
    stmt.run(searchResultId);
  }

  hasWordPressUsers(searchResultId: number): boolean {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM wordpress_users
      WHERE search_result_id = ?
    `);
    const result = stmt.get(searchResultId) as { count: number };
    return result.count > 0;
  }

  // Update WordPress fetch status
  updateWordPressFetchStatus(
    searchResultId: number,
    status: 'success' | 'error' | 'no_users' | 'not_wordpress',
    error?: string
  ): void {
    const stmt = this.db.prepare(`
      UPDATE history_scrapped
      SET wp_fetch_status = ?, wp_fetch_error = ?, wp_fetch_attempted_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(status, error || null, searchResultId);
  }
}

// Export singleton instance
export const searchResultsRepo = new SearchResultsRepository();
