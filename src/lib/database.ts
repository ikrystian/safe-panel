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
      displayed_link TEXT,
      position INTEGER,
      search_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      user_id TEXT,
      serpapi_position INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create index for better performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_search_query ON history_scrapped(search_query);
    CREATE INDEX IF NOT EXISTS idx_search_date ON history_scrapped(search_date);
    CREATE INDEX IF NOT EXISTS idx_user_id ON history_scrapped(user_id);
  `);
}

export interface SearchResult {
  id?: number;
  search_query: string;
  title?: string;
  link?: string;
  snippet?: string;
  displayed_link?: string;
  position?: number;
  search_date?: string;
  user_id?: string;
  serpapi_position?: number;
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
        search_query, title, link, snippet, displayed_link, 
        position, user_id, serpapi_position
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = this.db.transaction((results: SearchResult[]) => {
      for (const result of results) {
        stmt.run(
          result.search_query,
          result.title,
          result.link,
          result.snippet,
          result.displayed_link,
          result.position,
          result.user_id,
          result.serpapi_position
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
}

// Export singleton instance
export const searchResultsRepo = new SearchResultsRepository();
