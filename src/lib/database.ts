import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/safe_panel_db';
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'safe_panel_db';

// MongoDB connection
let isConnected = false;

export async function connectToDatabase() {
  if (isConnected) {
    return;
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      dbName: MONGODB_DB_NAME,
    });
    isConnected = true;
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

// User Schema
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

// Search Result Schema
const searchResultSchema = new mongoose.Schema({
  search_query: {
    type: String,
    required: true,
    index: true,
  },
  title: {
    type: String,
  },
  link: {
    type: String,
  },
  search_date: {
    type: Date,
    default: Date.now,
    index: true,
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  processed: {
    type: Number,
    default: 0,
  },
  category: {
    type: Number,
    default: 0,
  },
  contact_url: {
    type: String,
  },
  is_wordpress: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Search Pagination Schema
const searchPaginationSchema = new mongoose.Schema({
  search_query: {
    type: String,
    required: true,
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  last_start_position: {
    type: Number,
    default: 0,
  },
  total_requests_made: {
    type: Number,
    default: 0,
  },
  last_updated: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Create compound index for search_query and user_id
searchPaginationSchema.index({ search_query: 1, user_id: 1 }, { unique: true });
searchResultSchema.index({ search_query: 1, user_id: 1 });

// Models
export const User = mongoose.models.User || mongoose.model('User', userSchema);
export const SearchResult = mongoose.models.SearchResult || mongoose.model('SearchResult', searchResultSchema);
export const SearchPagination = mongoose.models.SearchPagination || mongoose.model('SearchPagination', searchPaginationSchema);

// TypeScript interfaces
export interface IUser {
  _id?: string;
  email: string;
  password: string;
  name?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ISearchResult {
  _id?: string;
  id?: string; // For backward compatibility
  search_query: string;
  title?: string;
  link?: string;
  search_date?: Date;
  user_id: string;
  processed?: number;
  category?: number;
  contact_url?: string;
  is_wordpress?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  created_at?: Date; // For backward compatibility
}

export interface ISearchPagination {
  _id?: string;
  id?: string; // For backward compatibility
  search_query: string;
  user_id: string;
  last_start_position: number;
  total_requests_made: number;
  last_updated?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export class SearchResultsRepository {
  constructor() {
    // Ensure database connection
    connectToDatabase().catch(console.error);
  }

  // Insert search results
  async insertSearchResults(results: ISearchResult[]): Promise<void> {
    await connectToDatabase();

    const searchResults = results.map(result => ({
      search_query: result.search_query,
      title: result.title,
      link: result.link,
      user_id: result.user_id,
      processed: result.processed || 0,
      category: result.category || 0,
      search_date: result.search_date || new Date(),
    }));

    await SearchResult.insertMany(searchResults);
  }

  // Get search results by query
  async getSearchResultsByQuery(query: string, userId?: string): Promise<ISearchResult[]> {
    await connectToDatabase();

    const filter: any = { search_query: query };
    if (userId) {
      filter.user_id = userId;
    }

    const results = await SearchResult.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    return results.map(result => ({
      _id: result._id?.toString(),
      id: result._id?.toString(), // For backward compatibility
      search_query: result.search_query,
      title: result.title,
      link: result.link,
      search_date: result.search_date,
      user_id: result.user_id?.toString(),
      processed: result.processed,
      category: result.category,
      contact_url: result.contact_url,
      is_wordpress: result.is_wordpress,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      created_at: result.createdAt, // For backward compatibility
    }));
  }

  // Get all search results for a user (for Pages Database)
  async getAllSearchResults(userId?: string): Promise<ISearchResult[]> {
    await connectToDatabase();

    const filter: any = {};
    if (userId) {
      filter.user_id = userId;
    }

    const results = await SearchResult.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    return results.map(result => ({
      _id: result._id?.toString(),
      id: result._id?.toString(), // For backward compatibility
      search_query: result.search_query,
      title: result.title,
      link: result.link,
      search_date: result.search_date,
      user_id: result.user_id?.toString(),
      processed: result.processed,
      category: result.category,
      contact_url: result.contact_url,
      is_wordpress: result.is_wordpress,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      created_at: result.createdAt, // For backward compatibility
    }));
  }

  // Get search result by ID
  async getSearchResultById(id: string, userId?: string): Promise<ISearchResult | null> {
    await connectToDatabase();

    const filter: any = { _id: id };
    if (userId) {
      filter.user_id = userId;
    }

    const result = await SearchResult.findOne(filter).lean() as any;

    if (!result) return null;

    return {
      _id: result._id?.toString(),
      id: result._id?.toString(), // For backward compatibility
      search_query: result.search_query,
      title: result.title,
      link: result.link,
      search_date: result.search_date,
      user_id: result.user_id?.toString(),
      processed: result.processed,
      category: result.category,
      contact_url: result.contact_url,
      is_wordpress: result.is_wordpress,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      created_at: result.createdAt, // For backward compatibility
    };
  }

  // Get all search queries for a user
  async getSearchHistory(userId?: string): Promise<{ search_query: string; count: number; last_search: string }[]> {
    await connectToDatabase();

    const pipeline: any[] = [];

    if (userId) {
      pipeline.push({ $match: { user_id: userId } });
    }

    pipeline.push(
      {
        $group: {
          _id: '$search_query',
          count: { $sum: 1 },
          last_search: { $max: '$createdAt' }
        }
      },
      {
        $project: {
          search_query: '$_id',
          count: 1,
          last_search: 1,
          _id: 0
        }
      },
      { $sort: { last_search: -1 } }
    );

    const results = await SearchResult.aggregate(pipeline);
    return results.map(result => ({
      search_query: result.search_query,
      count: result.count,
      last_search: result.last_search.toISOString(),
    }));
  }

  // Delete search results by query
  async deleteSearchResults(query: string, userId?: string): Promise<void> {
    await connectToDatabase();

    const filter: any = { search_query: query };
    if (userId) {
      filter.user_id = userId;
    }

    await SearchResult.deleteMany(filter);
  }

  // Get total count of results
  async getTotalCount(userId?: string): Promise<number> {
    await connectToDatabase();

    const filter: any = {};
    if (userId) {
      filter.user_id = userId;
    }

    return await SearchResult.countDocuments(filter);
  }

  // Update processed status for a specific result
  async updateProcessedStatus(id: string, processed: number): Promise<void> {
    await connectToDatabase();

    await SearchResult.findByIdAndUpdate(id, { processed });
  }

  // Update processed status for all results of a query
  async updateProcessedStatusByQuery(query: string, processed: number, userId?: string): Promise<void> {
    await connectToDatabase();

    const filter: any = { search_query: query };
    if (userId) {
      filter.user_id = userId;
    }

    await SearchResult.updateMany(filter, { processed });
  }

  // Check if domain exists in database
  async domainExists(domain: string, userId?: string): Promise<boolean> {
    await connectToDatabase();

    const filter: any = { link: domain };
    if (userId) {
      filter.user_id = userId;
    }

    const count = await SearchResult.countDocuments(filter);
    return count > 0;
  }

  // Get pagination state for a query
  async getPaginationState(query: string, userId: string): Promise<ISearchPagination | null> {
    await connectToDatabase();

    const result = await SearchPagination.findOne({
      search_query: query,
      user_id: userId
    }).lean() as any;

    if (!result) return null;

    return {
      _id: result._id?.toString(),
      search_query: result.search_query,
      user_id: result.user_id?.toString(),
      last_start_position: result.last_start_position,
      total_requests_made: result.total_requests_made,
      last_updated: result.last_updated,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  }

  // Update pagination state
  async updatePaginationState(query: string, userId: string, startPosition: number, requestsMade: number): Promise<void> {
    await connectToDatabase();

    await SearchPagination.findOneAndUpdate(
      { search_query: query, user_id: userId },
      {
        last_start_position: startPosition,
        total_requests_made: requestsMade,
        last_updated: new Date(),
      },
      { upsert: true }
    );
  }

  // Reset pagination state for a query
  async resetPaginationState(query: string, userId: string): Promise<void> {
    await connectToDatabase();

    await SearchPagination.deleteOne({
      search_query: query,
      user_id: userId
    });
  }

  // Get all pagination states for a user
  async getAllPaginationStates(userId: string): Promise<ISearchPagination[]> {
    await connectToDatabase();

    const results = await SearchPagination.find({ user_id: userId })
      .sort({ last_updated: -1 })
      .lean();

    return results.map(result => ({
      _id: result._id?.toString(),
      search_query: result.search_query,
      user_id: result.user_id?.toString(),
      last_start_position: result.last_start_position,
      total_requests_made: result.total_requests_made,
      last_updated: result.last_updated,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    }));
  }


  // Insert single search result manually
  async insertManualSearchResult(result: ISearchResult): Promise<string> {
    await connectToDatabase();

    const newResult = new SearchResult({
      search_query: result.search_query,
      title: result.title,
      link: result.link,
      user_id: result.user_id,
      processed: result.processed || 0,
      category: result.category || 0,
      search_date: result.search_date || new Date(),
    });

    const saved = await newResult.save();
    return saved._id.toString();
  }

  // Get one unprocessed or error result with link (public endpoint)
  async getOneUnprocessedResult(): Promise<ISearchResult | null> {
    await connectToDatabase();

    const result = await SearchResult.findOne({
      $and: [
        { $or: [{ processed: 0 }, { processed: 3 }] },
        { link: { $ne: null } },
        { link: { $ne: '' } }
      ]
    })
    .sort({ createdAt: 1 })
    .lean() as any;

    if (!result) return null;

    return {
      _id: result._id?.toString(),
      id: result._id?.toString(), // For backward compatibility
      search_query: result.search_query,
      title: result.title,
      link: result.link,
      search_date: result.search_date,
      user_id: result.user_id?.toString(),
      processed: result.processed,
      category: result.category,
      contact_url: result.contact_url,
      is_wordpress: result.is_wordpress,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      created_at: result.createdAt, // For backward compatibility
    };
  }

  // Update multiple records with contact_url, category, and is_wordpress
  async updateRecordsWithMetadata(updates: Array<{
    id: string;
    contact_url?: string;
    category?: string;
    is_wordpress?: boolean;
  }>): Promise<{ updated: number; errors: Array<{ id: string; error: string }> }> {
    await connectToDatabase();

    const results = { updated: 0, errors: [] as Array<{ id: string; error: string }> };

    for (const update of updates) {
      try {
        const result = await SearchResult.findByIdAndUpdate(
          update.id,
          {
            contact_url: update.contact_url || null,
            category: update.category || null,
            is_wordpress: update.is_wordpress || false,
          },
          { new: true }
        );

        if (result) {
          results.updated++;
        } else {
          results.errors.push({ id: update.id, error: 'Record not found' });
        }
      } catch (error) {
        results.errors.push({
          id: update.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }
}

// User management class
export class UserDatabase {
  constructor() {
    // Ensure database connection
    connectToDatabase().catch(console.error);
  }

  // Create a new user
  async createUser(email: string, password: string, name?: string): Promise<IUser> {
    await connectToDatabase();

    const newUser = new User({
      email,
      password,
      name,
    });

    const saved = await newUser.save();

    return {
      _id: saved._id.toString(),
      email: saved.email,
      password: saved.password,
      name: saved.name,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    };
  }

  // Get user by email
  async getUserByEmail(email: string): Promise<IUser | null> {
    await connectToDatabase();

    const user = await User.findOne({ email }).lean() as any;

    if (!user) return null;

    return {
      _id: user._id?.toString(),
      email: user.email,
      password: user.password,
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  // Get user by ID
  async getUserById(id: string): Promise<IUser | null> {
    await connectToDatabase();

    const user = await User.findById(id).lean() as any;

    if (!user) return null;

    return {
      _id: user._id?.toString(),
      email: user.email,
      password: user.password,
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  // Update user
  async updateUser(id: string, updates: Partial<IUser>): Promise<void> {
    await connectToDatabase();

    const updateData: any = {};

    if (updates.email) {
      updateData.email = updates.email;
    }
    if (updates.password) {
      updateData.password = updates.password;
    }
    if (updates.name !== undefined) {
      updateData.name = updates.name;
    }

    if (Object.keys(updateData).length === 0) return;

    await User.findByIdAndUpdate(id, updateData);
  }

  // Delete user
  async deleteUser(id: string): Promise<void> {
    await connectToDatabase();

    await User.findByIdAndDelete(id);
  }
}

// Export instances for use in API routes
export const searchResultsRepo = new SearchResultsRepository();
export const userDb = new UserDatabase();
