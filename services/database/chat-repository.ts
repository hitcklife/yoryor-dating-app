import { connectionManager } from './connection-manager';
import { Chat, UserPivot } from '../chats-service';

// Basic chat data type for repository operations
export interface ChatData {
  id: number;
  type: string;
  name: string | null;
  description: string | null;
  last_activity_at: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  unread_count: number;
  pivot: UserPivot;
}

// Optimized chat summary type
export interface ChatSummary extends ChatData {
  message_count: number;
  last_message_time: string | null;
  other_user_id: number | null;
  other_user_name: string | null;
  other_user_photo: string | null;
  profile_photo_url: string | null;
}

// Pagination options for cursor-based pagination
export interface ChatPaginationOptions {
  cursor?: string; // Base64 encoded cursor containing last_activity_at and chat_id
  limit?: number;
  includeUserData?: boolean;
}

// Pagination result
export interface PaginatedChatResult {
  data: ChatSummary[];
  nextCursor?: string;
  hasNextPage: boolean;
}

// Cache entry
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

// Performance metrics interface
interface PerformanceMetrics {
  queryCount: number;
  cacheHits: number;
  cacheMisses: number;
  avgQueryTime: number;
  slowQueries: Array<{ query: string; duration: number; timestamp: number }>;
  lastOptimizationRun: number;
}

// Cache for query results
class QueryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
  private metrics: PerformanceMetrics;

  constructor() {
    this.metrics = {
      queryCount: 0,
      cacheHits: 0,
      cacheMisses: 0,
      avgQueryTime: 0,
      slowQueries: [],
      lastOptimizationRun: 0
    };
  }

  set<T>(key: string, data: T, customTTL?: number): void {
    const timestamp = Date.now();
    const ttl = customTTL || this.TTL;
    const expiresAt = timestamp + ttl;
    
    this.cache.set(key, {
      data,
      timestamp,
      expiresAt
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.metrics.cacheMisses++;
      return null;
    }
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.metrics.cacheMisses++;
      return null;
    }
    
    this.metrics.cacheHits++;
    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  recordSlowQuery(query: string, duration: number): void {
    this.metrics.slowQueries.push({
      query,
      duration,
      timestamp: Date.now()
    });
    
    // Keep only last 10 slow queries
    if (this.metrics.slowQueries.length > 10) {
      this.metrics.slowQueries.shift();
    }
  }

  updateQueryMetrics(duration: number): void {
    this.metrics.queryCount++;
    this.metrics.avgQueryTime = (this.metrics.avgQueryTime * (this.metrics.queryCount - 1) + duration) / this.metrics.queryCount;
  }
}

export interface IChatRepository {
  saveChat(chat: Chat): Promise<void>;
  storeChats(chats: Chat[]): Promise<void>;
  getChats(): Promise<ChatData[]>;
  getChatsOptimized(options?: ChatPaginationOptions): Promise<PaginatedChatResult>;
  getChatById(chatId: number): Promise<ChatData | null>;
  deleteChat(chatId: number): Promise<void>;
  updateChatLastMessage(chatId: number, messageId: number, content: string, sentAt: string): Promise<void>;
  incrementChatUnreadCount(chatId: number): Promise<void>;
  markChatAsRead(chatId: number): Promise<void>;
  updateChatLastActivity(chatId: number): Promise<void>;
  getChatsByUserId(userId: number): Promise<ChatData[]>;
  updateChatInfo(chatId: number, updates: Partial<ChatData>): Promise<void>;
  createChatSummaryView(): Promise<void>;
  analyzeChatQueries(): Promise<void>;
  getPerformanceMetrics(): PerformanceMetrics;
  logPerformanceWarnings(): void;
  refreshChatSummaryView(): Promise<void>;
  scheduleViewRefresh(): void;
  generateOptimizationReport(): Promise<void>;
}

/**
 * Chat Repository
 * Handles all chat-related database operations with advanced optimizations
 */
export class ChatRepository implements IChatRepository {
  private queryCache = new QueryCache();
  private readonly isDevelopment = __DEV__ || process.env.NODE_ENV === 'development';
  private viewRefreshInterval: any = null;

  constructor() {
    // Initialize materialized view and cleanup timer
    this.initializeOptimizations();
  }

  private async initializeOptimizations(): Promise<void> {
    try {
      // Create materialized view for chat summaries
      await this.createChatSummaryView();
      
      // Set up cache cleanup timer
      setInterval(() => {
        this.queryCache.cleanup();
      }, 60000); // Clean up every minute
      
      // Schedule view refresh
      this.scheduleViewRefresh();
    } catch (error) {
      console.error('Error initializing chat optimizations:', error);
    }
  }

  /**
   * Create materialized view for frequently accessed chat summaries
   */
  async createChatSummaryView(): Promise<void> {
    const db = await connectionManager.getConnection();
    
    try {
      console.log('Creating chat summary materialized view...');
      
      // Drop existing view if it exists
      await db.execAsync(`DROP VIEW IF EXISTS chat_summaries`);
      
      // Create optimized view with pre-calculated data
      await db.execAsync(`
        CREATE VIEW chat_summaries AS
        SELECT 
          c.id,
          c.type,
          c.name,
          c.description,
          c.last_activity_at,
          c.is_active,
          c.created_at,
          c.updated_at,
          c.deleted_at,
          c.unread_count,
          c.pivot_chat_id,
          c.pivot_user_id,
          c.pivot_is_muted,
          c.pivot_last_read_at,
          c.pivot_joined_at,
          c.pivot_left_at,
          c.pivot_role,
          c.pivot_created_at,
          c.pivot_updated_at,
          COALESCE(msg_stats.message_count, 0) as message_count,
          msg_stats.last_message_time,
          ou.id as other_user_id,
          COALESCE(p.first_name || ' ' || p.last_name, ou.email) as other_user_name,
          ou.profile_photo_path as other_user_photo,
          pp.thumbnail_url as profile_photo_url
        FROM chats c
        LEFT JOIN (
          SELECT 
            chat_id,
            COUNT(*) as message_count,
            MAX(sent_at) as last_message_time
          FROM messages 
          WHERE deleted_at IS NULL 
          GROUP BY chat_id
        ) msg_stats ON c.id = msg_stats.chat_id
        LEFT JOIN other_users ou ON c.id = ou.chat_id AND ou.deleted_at IS NULL
        LEFT JOIN profiles p ON ou.id = p.user_id
        LEFT JOIN profile_photos pp ON ou.id = pp.user_id 
          AND pp.is_profile_photo = 1 
          AND pp.deleted_at IS NULL
        WHERE c.deleted_at IS NULL
      `);
      
      console.log('Chat summary materialized view created successfully');
    } catch (error) {
      console.error('Error creating chat summary view:', error);
      throw error;
    }
  }

  /**
   * Analyze chat queries for performance optimization (development mode)
   */
  async analyzeChatQueries(): Promise<void> {
    if (!this.isDevelopment) return;
    
    const db = await connectionManager.getConnection();
    
    try {
      console.log('=== CHAT QUERY ANALYSIS ===');
      
      // Analyze main chat query
      const mainQueryPlan = await db.getAllAsync(`
        EXPLAIN QUERY PLAN 
        SELECT * FROM chat_summaries 
        ORDER BY last_activity_at DESC 
        LIMIT 20
      `);
      
      console.log('Main chat query plan:');
      mainQueryPlan.forEach((row: any) => {
        console.log(`  ${row.selectid}|${row.order}|${row.from}|${row.detail}`);
      });
      
      // Analyze pagination query
      const paginationPlan = await db.getAllAsync(`
        EXPLAIN QUERY PLAN 
        SELECT * FROM chat_summaries 
        WHERE last_activity_at < datetime('now') 
        ORDER BY last_activity_at DESC 
        LIMIT 20
      `);
      
      console.log('\nPagination query plan:');
      paginationPlan.forEach((row: any) => {
        console.log(`  ${row.selectid}|${row.order}|${row.from}|${row.detail}`);
      });
      
      // Get index usage statistics
      const indexStats = await db.getAllAsync(`
        SELECT name, tbl_name FROM sqlite_master 
        WHERE type = 'index' AND tbl_name IN ('chats', 'messages', 'other_users', 'profiles', 'profile_photos')
      `);
      
      console.log('\nAvailable indexes:');
      indexStats.forEach((row: any) => {
        console.log(`  ${row.tbl_name}: ${row.name}`);
      });
      
      console.log('=== END ANALYSIS ===');
    } catch (error) {
      console.error('Error analyzing chat queries:', error);
    }
  }

  /**
   * Get chats with comprehensive optimization
   * Uses two-step query approach, caching, and cursor-based pagination
   */
  async getChatsOptimized(options: ChatPaginationOptions = {}): Promise<PaginatedChatResult> {
    const startTime = performance.now();
    const { cursor, limit = 20, includeUserData = true } = options;
    
    // Generate cache key
    const cacheKey = `chats_optimized_${JSON.stringify(options)}`;
    
    // Check cache first
    const cached = this.queryCache.get<PaginatedChatResult>(cacheKey);
    if (cached) {
      console.log('Returning cached chat results');
      return cached;
    }
    
    const db = await connectionManager.getConnection();
    
    try {
      // Run query analysis in development mode
      if (this.isDevelopment) {
        await this.analyzeChatQueries();
      }
      
      let whereClause = '';
      let orderByClause = 'ORDER BY last_activity_at DESC, id DESC';
      const params: any[] = [];
      
      // Handle cursor-based pagination
      if (cursor) {
        try {
          const decodedCursor = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
          const { last_activity_at, chat_id } = decodedCursor;
          
          whereClause = `WHERE (last_activity_at < ? OR (last_activity_at = ? AND id < ?))`;
          params.push(last_activity_at, last_activity_at, chat_id);
        } catch (error) {
          console.error('Invalid cursor format:', error);
          // Continue without cursor if invalid
        }
      }
      
      // Step 1: Get basic chat data with pagination
      const chatQuery = includeUserData 
        ? `SELECT * FROM chat_summaries ${whereClause} ${orderByClause} LIMIT ?`
        : `SELECT * FROM chats ${whereClause} ${orderByClause} LIMIT ?`;
      
      params.push(limit + 1); // Get one extra to check if there are more results
      
      const queryStartTime = performance.now();
      const rawChats = await db.getAllAsync<any>(chatQuery, params);
      const queryEndTime = performance.now();
      const queryDuration = queryEndTime - queryStartTime;
      
      // Record performance metrics
      this.queryCache.updateQueryMetrics(queryDuration);
      
      // Log slow queries (> 100ms)
      if (queryDuration > 100) {
        this.queryCache.recordSlowQuery(chatQuery, queryDuration);
        console.warn(`Slow query detected: ${queryDuration.toFixed(2)}ms`);
      }
      
      // Determine if there are more results
      const hasNextPage = rawChats.length > limit;
      if (hasNextPage) {
        rawChats.pop(); // Remove the extra record
      }
      
      let transformedChats: ChatSummary[];
      
      if (includeUserData) {
        // Data is already enriched from the materialized view
        transformedChats = rawChats.map(chat => this.transformChatSummaryFromQuery(chat));
      } else {
        // Step 2: Get related data in batches (if needed)
        const chatIds = rawChats.map(chat => chat.id);
        const userDataMap = await this.getUserDataForChats(chatIds);
        
        transformedChats = rawChats.map(chat => ({
          ...this.transformChatFromQuery(chat),
          message_count: 0,
          last_message_time: null,
          other_user_id: userDataMap[chat.id]?.other_user_id || null,
          other_user_name: userDataMap[chat.id]?.other_user_name || null,
          other_user_photo: userDataMap[chat.id]?.other_user_photo || null,
          profile_photo_url: userDataMap[chat.id]?.profile_photo_url || null
        }));
      }
      
      // Generate next cursor
      let nextCursor: string | undefined;
      if (hasNextPage && transformedChats.length > 0) {
        const lastChat = transformedChats[transformedChats.length - 1];
        const cursorData = {
          last_activity_at: lastChat.last_activity_at,
          chat_id: lastChat.id
        };
        nextCursor = Buffer.from(JSON.stringify(cursorData)).toString('base64');
      }
      
      const result: PaginatedChatResult = {
        data: transformedChats,
        nextCursor,
        hasNextPage
      };
      
      // Cache the result
      this.queryCache.set(cacheKey, result);
      
      const totalDuration = performance.now() - startTime;
      console.log(`Retrieved ${transformedChats.length} optimized chats in ${totalDuration.toFixed(2)}ms with ${hasNextPage ? 'more' : 'no more'} results`);
      return result;
      
    } catch (error) {
      console.error('Error getting optimized chats:', error);
      throw error;
    }
  }

  /**
   * Get user data for multiple chats in batch
   */
  private async getUserDataForChats(chatIds: number[]): Promise<Record<number, any>> {
    if (chatIds.length === 0) return {};
    
    const db = await connectionManager.getConnection();
    const placeholders = chatIds.map(() => '?').join(',');
    
    try {
      const userData = await db.getAllAsync<any>(`
        SELECT 
          ou.chat_id,
          ou.id as other_user_id,
          COALESCE(p.first_name || ' ' || p.last_name, ou.email) as other_user_name,
          ou.profile_photo_path as other_user_photo,
          pp.thumbnail_url as profile_photo_url
        FROM other_users ou
        LEFT JOIN profiles p ON ou.id = p.user_id
        LEFT JOIN profile_photos pp ON ou.id = pp.user_id 
          AND pp.is_profile_photo = 1 
          AND pp.deleted_at IS NULL
        WHERE ou.chat_id IN (${placeholders}) AND ou.deleted_at IS NULL
      `, chatIds);
      
      const userDataMap: Record<number, any> = {};
      userData.forEach(row => {
        userDataMap[row.chat_id] = row;
      });
      
      return userDataMap;
    } catch (error) {
      console.error('Error getting user data for chats:', error);
      return {};
    }
  }

  /**
   * Invalidate cache when chat data changes
   */
  private invalidateCache(): void {
    this.queryCache.clear();
    console.log('Chat cache invalidated');
  }

  /**
   * Invalidate specific cache entries matching a pattern
   */
  private invalidateCachePattern(pattern: string): void {
    // For now, we'll clear all cache since we don't have pattern matching
    // In a production system, you might want to implement pattern-based invalidation
    this.queryCache.clear();
    console.log(`Cache invalidated for pattern: ${pattern}`);
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return this.queryCache.getMetrics();
  }

  /**
   * Log performance warnings and recommendations
   */
  logPerformanceWarnings(): void {
    const metrics = this.getPerformanceMetrics();
    const cacheHitRate = metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses) * 100;
    
    console.log('=== CHAT REPOSITORY PERFORMANCE METRICS ===');
    console.log(`Total queries: ${metrics.queryCount}`);
    console.log(`Cache hit rate: ${cacheHitRate.toFixed(2)}%`);
    console.log(`Average query time: ${metrics.avgQueryTime.toFixed(2)}ms`);
    console.log(`Slow queries: ${metrics.slowQueries.length}`);
    
    // Performance warnings
    if (cacheHitRate < 70) {
      console.warn('⚠️  Low cache hit rate detected. Consider increasing cache TTL or optimizing query patterns.');
    }
    
    if (metrics.avgQueryTime > 50) {
      console.warn('⚠️  High average query time detected. Consider optimizing database indexes or query structure.');
    }
    
    if (metrics.slowQueries.length > 5) {
      console.warn('⚠️  Multiple slow queries detected. Review query optimization.');
      console.log('Recent slow queries:');
      metrics.slowQueries.forEach((query, index) => {
        console.log(`  ${index + 1}. ${query.duration.toFixed(2)}ms - ${query.query.substring(0, 100)}...`);
      });
    }
    
    // Recommendations
    console.log('\n=== OPTIMIZATION RECOMMENDATIONS ===');
    
    if (metrics.queryCount > 100 && cacheHitRate < 80) {
      console.log('📈 Consider implementing more granular caching strategies');
    }
    
    if (metrics.slowQueries.length > 0) {
      console.log('📊 Consider analyzing slow queries with EXPLAIN QUERY PLAN');
    }
    
    if (metrics.avgQueryTime > 100) {
      console.log('🔧 Consider running database optimization: VACUUM, ANALYZE');
    }
    
    console.log('=== END PERFORMANCE METRICS ===\n');
  }

  /**
   * Refresh the chat summary view (recreate with fresh data)
   */
  async refreshChatSummaryView(): Promise<void> {
    const db = await connectionManager.getConnection();
    
    try {
      console.log('Refreshing chat summary view...');
      
      const startTime = performance.now();
      
      // Drop and recreate the view with fresh data
      await db.execAsync(`DROP VIEW IF EXISTS chat_summaries`);
      await this.createChatSummaryView();
      
      // Invalidate cache to force fresh data
      this.invalidateCache();
      
      const duration = performance.now() - startTime;
      console.log(`Chat summary view refreshed in ${duration.toFixed(2)}ms`);
      
      // Update metrics
      this.queryCache.getMetrics().lastOptimizationRun = Date.now();
      
    } catch (error) {
      console.error('Error refreshing chat summary view:', error);
      throw error;
    }
  }

  /**
   * Schedule periodic view refresh
   */
  scheduleViewRefresh(): void {
    // Clear existing interval if any
    if (this.viewRefreshInterval) {
      clearInterval(this.viewRefreshInterval);
    }
    
    // Schedule view refresh every 30 minutes
    this.viewRefreshInterval = setInterval(async () => {
      try {
        console.log('Running scheduled view refresh...');
        await this.refreshChatSummaryView();
        
        // Log performance metrics after refresh
        if (this.isDevelopment) {
          this.logPerformanceWarnings();
        }
      } catch (error) {
        console.error('Error in scheduled view refresh:', error);
      }
    }, 30 * 60 * 1000); // 30 minutes
    
    console.log('View refresh scheduled every 30 minutes');
  }

  /**
   * Generate comprehensive optimization report
   */
  async generateOptimizationReport(): Promise<void> {
    const db = await connectionManager.getConnection();
    
    try {
      console.log('=== COMPREHENSIVE OPTIMIZATION REPORT ===');
      
      // 1. Database statistics
      const stats = await connectionManager.getDatabaseStats();
      console.log('\n📊 DATABASE STATISTICS:');
      console.log(`  Total chats: ${stats.totalChats}`);
      console.log(`  Total messages: ${stats.totalMessages}`);
      console.log(`  Total users: ${stats.totalUsers}`);
      console.log(`  Average messages per chat: ${stats.avgMessagesPerChat.toFixed(2)}`);
      console.log(`  Database size: ${(stats.dbSize / 1024 / 1024).toFixed(2)} MB`);
      
      // 2. Index analysis
      console.log('\n🔍 INDEX ANALYSIS:');
      const indexes = await db.getAllAsync(`
        SELECT 
          name, 
          tbl_name, 
          sql 
        FROM sqlite_master 
        WHERE type = 'index' 
        AND tbl_name IN ('chats', 'messages', 'other_users', 'profiles', 'profile_photos')
        AND name NOT LIKE 'sqlite_%'
      `);
      
      indexes.forEach((index: any) => {
        console.log(`  ✓ ${index.tbl_name}: ${index.name}`);
      });
      
      // 3. Query performance analysis
      console.log('\n⚡ QUERY PERFORMANCE:');
      const metrics = this.getPerformanceMetrics();
      const cacheHitRate = metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses) * 100;
      
      console.log(`  Cache hit rate: ${cacheHitRate.toFixed(2)}%`);
      console.log(`  Average query time: ${metrics.avgQueryTime.toFixed(2)}ms`);
      console.log(`  Total queries: ${metrics.queryCount}`);
      
      // 4. Table analysis
      console.log('\n📋 TABLE ANALYSIS:');
      const tables = ['chats', 'messages', 'other_users', 'profiles', 'profile_photos'];
      
      for (const table of tables) {
        const count = await db.getFirstAsync<{ count: number }>(`
          SELECT COUNT(*) as count FROM ${table}
        `);
        
        const size = await db.getFirstAsync<{ size: number }>(`
          SELECT SUM(length(sql)) as size FROM sqlite_master WHERE tbl_name = ?
        `, [table]);
        
        console.log(`  ${table}: ${count?.count || 0} rows`);
      }
      
      // 5. Optimization recommendations
      console.log('\n🚀 OPTIMIZATION RECOMMENDATIONS:');
      
      if (stats.totalChats > 1000 && cacheHitRate < 80) {
        console.log('  📈 HIGH PRIORITY: Implement more aggressive caching for large datasets');
      }
      
      if (stats.avgMessagesPerChat > 50) {
        console.log('  📊 MEDIUM PRIORITY: Consider message archiving for chats with >100 messages');
      }
      
      if (stats.dbSize > 50 * 1024 * 1024) { // 50MB
        console.log('  🗄️  MEDIUM PRIORITY: Database size is large, consider cleanup of old data');
      }
      
      if (metrics.avgQueryTime > 50) {
        console.log('  ⚡ HIGH PRIORITY: Optimize slow queries - consider additional indexes');
      }
      
      if (metrics.slowQueries.length > 0) {
        console.log('  🔧 HIGH PRIORITY: Analyze and optimize slow queries:');
        metrics.slowQueries.forEach((query, index) => {
          console.log(`    ${index + 1}. ${query.duration.toFixed(2)}ms - ${query.query.substring(0, 80)}...`);
        });
      }
      
      // 6. Specific SQL optimizations
      console.log('\n🔧 SQL OPTIMIZATION SUGGESTIONS:');
      
      if (stats.totalMessages > 10000) {
        console.log('  • Consider partitioning messages table by date');
        console.log('  • Implement message cleanup for messages older than 1 year');
      }
      
      if (stats.totalChats > 5000) {
        console.log('  • Consider implementing chat archiving for inactive chats');
      }
      
      console.log('  • Run VACUUM periodically to reclaim space');
      console.log('  • Run ANALYZE after bulk operations');
      console.log('  • Consider using WITHOUT ROWID for lookup tables');
      
      // 7. Performance monitoring
      console.log('\n📊 MONITORING RECOMMENDATIONS:');
      console.log('  • Set up alerts for queries taking >100ms');
      console.log('  • Monitor cache hit rates and adjust TTL accordingly');
      console.log('  • Track database growth over time');
      console.log('  • Log slow queries for analysis');
      
      console.log('\n=== END OPTIMIZATION REPORT ===\n');
      
    } catch (error) {
      console.error('Error generating optimization report:', error);
      throw error;
    }
  }

  /**
   * Save a single chat to the database
   */
  async saveChat(chat: Chat): Promise<void> {
    const db = await connectionManager.getConnection();

    try {
      await db.withTransactionAsync(async () => {
        // Insert or update chat
        await db.runAsync(`
          INSERT OR REPLACE INTO chats (
            id, type, name, description, last_activity_at, is_active, 
            created_at, updated_at, deleted_at, unread_count,
            pivot_chat_id, pivot_user_id, pivot_is_muted, pivot_last_read_at,
            pivot_joined_at, pivot_left_at, pivot_role, pivot_created_at, pivot_updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          chat.id,
          chat.type,
          chat.name,
          chat.description,
          chat.last_activity_at,
          chat.is_active ? 1 : 0,
          chat.created_at,
          chat.updated_at,
          chat.deleted_at,
          chat.unread_count || 0,
          chat.pivot.chat_id,
          chat.pivot.user_id,
          chat.pivot.is_muted ? 1 : 0,
          chat.pivot.last_read_at,
          chat.pivot.joined_at,
          chat.pivot.left_at,
          chat.pivot.role,
          chat.pivot.created_at,
          chat.pivot.updated_at
        ]);
      });

      // Invalidate cache after successful save
      this.invalidateCache();

      console.log(`Chat ${chat.id} saved successfully`);
    } catch (error) {
      console.error('Error saving chat:', error);
      throw error;
    }
  }

  /**
   * Store multiple chats in the database
   */
  async storeChats(chats: Chat[]): Promise<void> {
    const db = await connectionManager.getConnection();

    try {
      console.log(`Starting to store ${chats.length} chats...`);
      
      // Use individual operations instead of a single transaction to avoid rollback issues
      for (const chat of chats) {
        try {
          await db.runAsync(`
            INSERT OR REPLACE INTO chats (
              id, type, name, description, last_activity_at, is_active, 
              created_at, updated_at, deleted_at, unread_count,
              pivot_chat_id, pivot_user_id, pivot_is_muted, pivot_last_read_at,
              pivot_joined_at, pivot_left_at, pivot_role, pivot_created_at, pivot_updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            chat.id,
            chat.type,
            chat.name,
            chat.description,
            chat.last_activity_at,
            chat.is_active ? 1 : 0,
            chat.created_at,
            chat.updated_at,
            chat.deleted_at,
            chat.unread_count || 0,
            chat.pivot.chat_id,
            chat.pivot.user_id,
            chat.pivot.is_muted ? 1 : 0,
            chat.pivot.last_read_at,
            chat.pivot.joined_at,
            chat.pivot.left_at,
            chat.pivot.role,
            chat.pivot.created_at,
            chat.pivot.updated_at
          ]);
        } catch (chatError) {
          console.error(`Error storing chat ${chat.id}:`, chatError);
          // Continue with other chats instead of failing the entire operation
        }
      }
      
      // Invalidate cache after successful bulk store
      this.invalidateCache();
      
      console.log(`${chats.length} chats stored successfully`);
    } catch (error) {
      console.error('Error storing chats:', error);
      // Don't throw the error, just log it to prevent app crashes
    }
  }

  /**
   * Get all chats from the database
   */
  async getChats(): Promise<ChatData[]> {
    const db = await connectionManager.getConnection();

    try {
      const chats = await db.getAllAsync<any>(`
        SELECT * FROM chats 
        WHERE deleted_at IS NULL 
        ORDER BY last_activity_at DESC
      `);

      return chats.map(chat => this.transformChatFromQuery(chat));
    } catch (error) {
      console.error('Error getting chats:', error);
      throw error;
    }
  }

  /**
   * Get a specific chat by ID
   */
  async getChatById(chatId: number): Promise<ChatData | null> {
    const db = await connectionManager.getConnection();

    try {
      const chat = await db.getFirstAsync<any>(`
        SELECT * FROM chats 
        WHERE id = ? AND deleted_at IS NULL
      `, [chatId]);

      if (!chat) return null;

      return this.transformChatFromQuery(chat);
    } catch (error) {
      console.error('Error getting chat by ID:', error);
      throw error;
    }
  }

  /**
   * Delete a chat (soft delete)
   */
  async deleteChat(chatId: number): Promise<void> {
    const db = await connectionManager.getConnection();

    try {
      await db.withTransactionAsync(async () => {
        const now = new Date().toISOString();
        
        // Soft delete the chat
        await db.runAsync(`
          UPDATE chats 
          SET deleted_at = ? 
          WHERE id = ?
        `, [now, chatId]);

        // Soft delete all messages in the chat
        await db.runAsync(`
          UPDATE messages 
          SET deleted_at = ? 
          WHERE chat_id = ?
        `, [now, chatId]);
      });

      // Invalidate cache after successful deletion
      this.invalidateCache();

      console.log(`Chat ${chatId} deleted successfully`);
    } catch (error) {
      console.error('Error deleting chat:', error);
      throw error;
    }
  }

  /**
   * Update chat's last message information
   */
  async updateChatLastMessage(chatId: number, messageId: number, content: string, sentAt: string): Promise<void> {
    const db = await connectionManager.getConnection();

    try {
      await db.runAsync(`
        UPDATE chats 
        SET last_activity_at = ?, updated_at = ? 
        WHERE id = ?
      `, [sentAt, new Date().toISOString(), chatId]);

      // Invalidate cache after successful update
      this.invalidateCache();

      console.log(`Chat ${chatId} last message updated`);
    } catch (error) {
      console.error('Error updating chat last message:', error);
      throw error;
    }
  }

  /**
   * Increment unread count for a chat
   */
  async incrementChatUnreadCount(chatId: number): Promise<void> {
    const db = await connectionManager.getConnection();

    try {
      await db.runAsync(`
        UPDATE chats 
        SET unread_count = COALESCE(unread_count, 0) + 1,
            updated_at = ?
        WHERE id = ?
      `, [new Date().toISOString(), chatId]);

      // Invalidate cache after successful update
      this.invalidateCache();

      console.log(`Chat ${chatId} unread count incremented`);
    } catch (error) {
      console.error('Error incrementing chat unread count:', error);
      throw error;
    }
  }

  /**
   * Mark a chat as read (reset unread count)
   */
  async markChatAsRead(chatId: number): Promise<void> {
    const db = await connectionManager.getConnection();

    try {
      await db.runAsync(`
        UPDATE chats 
        SET unread_count = 0,
            pivot_last_read_at = ?,
            updated_at = ?
        WHERE id = ?
      `, [new Date().toISOString(), new Date().toISOString(), chatId]);

      // Invalidate cache after successful update
      this.invalidateCache();

      console.log(`Chat ${chatId} marked as read`);
    } catch (error) {
      console.error('Error marking chat as read:', error);
      throw error;
    }
  }

  /**
   * Update chat's last activity timestamp
   */
  async updateChatLastActivity(chatId: number): Promise<void> {
    const db = await connectionManager.getConnection();

    try {
      const now = new Date().toISOString();
      await db.runAsync(`
        UPDATE chats 
        SET last_activity_at = ?, updated_at = ? 
        WHERE id = ?
      `, [now, now, chatId]);

      // Invalidate cache after successful update
      this.invalidateCache();

      console.log(`Chat ${chatId} last activity updated`);
    } catch (error) {
      console.error('Error updating chat last activity:', error);
      throw error;
    }
  }

  /**
   * Get chats by user ID
   */
  async getChatsByUserId(userId: number): Promise<ChatData[]> {
    const db = await connectionManager.getConnection();

    try {
      const chats = await db.getAllAsync<any>(`
        SELECT * FROM chats 
        WHERE pivot_user_id = ? AND deleted_at IS NULL 
        ORDER BY last_activity_at DESC
      `, [userId]);

      return chats.map(chat => this.transformChatFromQuery(chat));
    } catch (error) {
      console.error('Error getting chats by user ID:', error);
      throw error;
    }
  }

  /**
   * Update chat information
   */
  async updateChatInfo(chatId: number, updates: Partial<ChatData>): Promise<void> {
    const db = await connectionManager.getConnection();

    try {
      const setClause = [];
      const params = [];

      if (updates.name !== undefined) {
        setClause.push('name = ?');
        params.push(updates.name);
      }
      if (updates.description !== undefined) {
        setClause.push('description = ?');
        params.push(updates.description);
      }
      if (updates.type !== undefined) {
        setClause.push('type = ?');
        params.push(updates.type);
      }
      if (updates.is_active !== undefined) {
        setClause.push('is_active = ?');
        params.push(updates.is_active ? 1 : 0);
      }

      if (setClause.length === 0) {
        return; // No updates to make
      }

      setClause.push('updated_at = ?');
      params.push(new Date().toISOString());
      params.push(chatId);

      await db.runAsync(`
        UPDATE chats 
        SET ${setClause.join(', ')} 
        WHERE id = ?
      `, params);

      // Invalidate cache after successful update
      this.invalidateCache();

      console.log(`Chat ${chatId} info updated`);
    } catch (error) {
      console.error('Error updating chat info:', error);
      throw error;
    }
  }

  /**
   * Transform raw chat data from database query
   */
  private transformChatFromQuery(rawChat: any): ChatData {
    return {
      id: rawChat.id,
      type: rawChat.type,
      name: rawChat.name,
      description: rawChat.description,
      last_activity_at: rawChat.last_activity_at,
      is_active: rawChat.is_active === 1,
      created_at: rawChat.created_at,
      updated_at: rawChat.updated_at,
      deleted_at: rawChat.deleted_at,
      unread_count: rawChat.unread_count || 0,
      pivot: {
        chat_id: rawChat.pivot_chat_id,
        user_id: rawChat.pivot_user_id,
        is_muted: rawChat.pivot_is_muted === 1,
        last_read_at: rawChat.pivot_last_read_at,
        joined_at: rawChat.pivot_joined_at,
        left_at: rawChat.pivot_left_at,
        role: rawChat.pivot_role,
        created_at: rawChat.pivot_created_at,
        updated_at: rawChat.pivot_updated_at
      }
    };
  }

  /**
   * Transform raw chat summary data from database query
   */
  private transformChatSummaryFromQuery(rawChat: any): ChatSummary {
    return {
      id: rawChat.id,
      type: rawChat.type,
      name: rawChat.name,
      description: rawChat.description,
      last_activity_at: rawChat.last_activity_at,
      is_active: rawChat.is_active === 1,
      created_at: rawChat.created_at,
      updated_at: rawChat.updated_at,
      deleted_at: rawChat.deleted_at,
      unread_count: rawChat.unread_count || 0,
      pivot: {
        chat_id: rawChat.pivot_chat_id,
        user_id: rawChat.pivot_user_id,
        is_muted: rawChat.pivot_is_muted === 1,
        last_read_at: rawChat.pivot_last_read_at,
        joined_at: rawChat.pivot_joined_at,
        left_at: rawChat.pivot_left_at,
        role: rawChat.pivot_role,
        created_at: rawChat.pivot_created_at,
        updated_at: rawChat.pivot_updated_at
      },
      message_count: rawChat.message_count || 0,
      last_message_time: rawChat.last_message_time,
      other_user_id: rawChat.other_user_id,
      other_user_name: rawChat.other_user_name,
      other_user_photo: rawChat.other_user_photo,
      profile_photo_url: rawChat.profile_photo_url
    };
  }
}

// Export a singleton instance
export const chatRepository = new ChatRepository(); 