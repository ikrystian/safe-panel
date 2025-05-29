import BetterSqlite3 from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'database.sqlite');

// Create database instance
let db: BetterSqlite3.Database;

export function getDatabase() {
  if (!db) {
    // Ensure data directory exists
    const fs = require('fs');
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    db = new BetterSqlite3(dbPath);

    // Enable WAL mode for better performance
    db.pragma('journal_mode = WAL');

    // Initialize tables
    initializeTables();
  }

  return db;
}

function initializeTables() {
  const db = getDatabase();

  // Create users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create history_scrapped table
  db.exec(`
    CREATE TABLE IF NOT EXISTS history_scrapped (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      search_query TEXT NOT NULL,
      title TEXT,
      link TEXT,
      search_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      user_id TEXT,
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



  // Create index for better performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_search_query ON history_scrapped(search_query);
    CREATE INDEX IF NOT EXISTS idx_search_date ON history_scrapped(search_date);
    CREATE INDEX IF NOT EXISTS idx_user_id ON history_scrapped(user_id);
    CREATE INDEX IF NOT EXISTS idx_pagination_query_user ON search_pagination(search_query, user_id);
  `);
}

export interface User {
  id?: number;
  email: string;
  password: string;
  name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SearchResult {
  id?: number;
  search_query: string;
  title?: string;
  link?: string;
  search_date?: string;
  user_id?: string;
  processed?: number;
  category?: number;
  created_at?: string;
}

export interface SearchPagination {
  id?: number;
  search_query: string;
  user_id: string;
  last_start_position: number;
  total_requests_made: number;
  last_updated?: string;
}

export class SearchResultsRepository {
  private db: BetterSqlite3.Database;

  constructor() {
    this.db = getDatabase();
  }

  // Insert search results
  insertSearchResults(results: SearchResult[]): void {
    const stmt = this.db.prepare(`
      INSERT INTO history_scrapped (
        search_query, title, link, user_id, processed, category
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insertMany = this.db.transaction((results: SearchResult[]) => {
      for (const result of results) {
        stmt.run(
          result.search_query,
          result.title,
          result.link,
          result.user_id,
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

    sql += ` ORDER BY created_at DESC`;

    const stmt = this.db.prepare(sql);
    const results = stmt.all(...params) as SearchResult[];

    return results;
    // return results.map(result => {
    //   if (typeof result.meta_generator === 'string') {
    //     try {
    //       result.meta_generator = JSON.parse(result.meta_generator);
    //     } catch (e) {
    //       result.meta_generator = null;
    //     }
    //   } else if (result.meta_generator === null) {
    //     result.meta_generator = null;
    //   } else if (!Array.isArray(result.meta_generator)) {
    //     result.meta_generator = null;
    //   }
  //   return result;
  // });
  }

  // Get search result by ID
  getSearchResultById(id: number, userId?: string): SearchResult | null {
    let sql = `
      SELECT id, search_query, title, link, search_date, user_id, processed, category, created_at
      FROM history_scrapped
      WHERE id = ?
    `;
    const params: any[] = [id];

    if (userId) {
      sql += ` AND user_id = ?`;
      params.push(userId);
    }

    const stmt = this.db.prepare(sql);
    const result = stmt.get(...params) as SearchResult | null;

    return result;
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


  // Insert single search result manually
  insertManualSearchResult(result: SearchResult): number {
    const stmt = this.db.prepare(`
      INSERT INTO history_scrapped (
        search_query, title, link, user_id, processed, category
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      result.search_query,
      result.title || null,
      result.link || null,
      result.user_id,
      result.processed || 0,
      result.category || 0
    );

    return info.lastInsertRowid as number;
  }

  // Get one unprocessed or error result with link (public endpoint)
  getOneUnprocessedResult(): SearchResult | null {
    const stmt = this.db.prepare(`
      SELECT * FROM history_scrapped
      WHERE (processed = 0 OR processed = 3) AND link IS NOT NULL AND link != ''
      ORDER BY created_at ASC
      LIMIT 1
    `);
    return stmt.get() as SearchResult | null;
  }
}

// User management class
export class UserDatabase {
  private db: BetterSqlite3.Database;

  constructor() {
    this.db = getDatabase();
  }

  // Create a new user
  createUser(email: string, password: string, name?: string): User {
    const stmt = this.db.prepare(`
      INSERT INTO users (email, password, name)
      VALUES (?, ?, ?)
    `);

    const info = stmt.run(email, password, name || null);

    return {
      id: info.lastInsertRowid as number,
      email,
      password,
      name,
    };
  }

  // Get user by email
  getUserByEmail(email: string): User | null {
    const stmt = this.db.prepare(`
      SELECT * FROM users WHERE email = ?
    `);
    return stmt.get(email) as User | null;
  }

  // Get user by ID
  getUserById(id: number): User | null {
    const stmt = this.db.prepare(`
      SELECT * FROM users WHERE id = ?
    `);
    return stmt.get(id) as User | null;
  }

  // Update user
  updateUser(id: number, updates: Partial<User>): void {
    const fields = [];
    const values = [];

    if (updates.email) {
      fields.push('email = ?');
      values.push(updates.email);
    }
    if (updates.password) {
      fields.push('password = ?');
      values.push(updates.password);
    }
    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }

    if (fields.length === 0) return;

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE users SET ${fields.join(', ')} WHERE id = ?
    `);
    stmt.run(...values);
  }

  // Delete user
  deleteUser(id: number): void {
    const stmt = this.db.prepare(`
      DELETE FROM users WHERE id = ?
    `);
    stmt.run(id);
  }
}

// Export singleton instance
export const searchResultsRepo = new SearchResultsRepository();
