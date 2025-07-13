import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';
import { sqliteService } from '../sqlite-service';
import { apiClient } from '../api-client';
import { chatsService } from '../chats-service';
import { offlineActionQueue, OfflineActionType } from './action-queue';
import { conflictResolutionService } from './conflict-resolution';

// === SYNC PRIORITY LEVELS ===
export enum SyncPriority {
  CRITICAL = 1,   // Unread messages in active chats
  HIGH = 2,       // Active chat data, recent messages
  MEDIUM = 3,     // Profile updates, settings, other chats
  LOW = 4,        // Media downloads, old messages
  DEFERRED = 5    // Non-essential data, analytics
}

// === SYNC TYPES ===
export enum SyncType {
  MESSAGES = 'messages',
  CHATS = 'chats',
  PROFILE = 'profile',
  SETTINGS = 'settings',
  MEDIA = 'media',
  LIKES = 'likes',
  MATCHES = 'matches',
  STORIES = 'stories',
  LOCATION = 'location',
  NOTIFICATIONS = 'notifications'
}

// === CONNECTION QUALITY ===
export enum ConnectionQuality {
  EXCELLENT = 'excellent',  // WiFi, strong signal
  GOOD = 'good',           // Cellular, good signal
  POOR = 'poor',           // Weak signal, slow connection
  OFFLINE = 'offline'      // No connection
}

// === SYNC ITEM INTERFACE ===
export interface SyncItem {
  id: string;
  type: SyncType;
  priority: SyncPriority;
  targetId?: string | number;
  metadata: any;
  estimatedSize: number; // bytes
  estimatedTime: number; // milliseconds
  retryCount: number;
  maxRetries: number;
  lastAttempt?: string;
  createdAt: string;
  updatedAt: string;
  dependencies?: string[]; // IDs of other sync items this depends on
}

// === SYNC STRATEGY INTERFACE ===
export interface SyncStrategy {
  connectionQuality: ConnectionQuality;
  batchSize: number;
  concurrentRequests: number;
  mediaDownloadEnabled: boolean;
  backgroundSyncEnabled: boolean;
  aggressiveSync: boolean;
  maxSyncDuration: number; // milliseconds
  priorityFilter: SyncPriority[];
}

// === SYNC RESULT INTERFACE ===
export interface SyncResult {
  success: boolean;
  syncedItems: number;
  failedItems: number;
  skippedItems: number;
  totalTime: number;
  errors: string[];
  nextSyncTime?: string;
}

// === SYNC STATS INTERFACE ===
export interface SyncStats {
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  lastSyncTime?: string;
  averageSyncTime: number;
  totalDataSynced: number; // bytes
  syncsByType: Record<SyncType, number>;
  syncsByPriority: Record<SyncPriority, number>;
}

// === SMART SYNC MANAGER CLASS ===
export class SmartSyncManager {
  private isInitialized = false;
  private isOnline = false;
  private connectionQuality: ConnectionQuality = ConnectionQuality.OFFLINE;
  private appState: string = 'active';
  private syncQueue: SyncItem[] = [];
  private activeSyncs = new Set<string>();
  private syncStrategies = new Map<ConnectionQuality, SyncStrategy>();
  private syncInProgress = false;
  private syncTimer: any = null;
  private retryTimer: any = null;
  private priorityBoosts = new Map<string, number>(); // chatId -> boost factor
  private userActivity = new Map<string, number>(); // chatId -> last activity timestamp
  private syncStats: SyncStats = {
    totalSyncs: 0,
    successfulSyncs: 0,
    failedSyncs: 0,
    averageSyncTime: 0,
    totalDataSynced: 0,
    syncsByType: {} as Record<SyncType, number>,
    syncsByPriority: {} as Record<SyncPriority, number>
  };

  // Configuration
  private readonly MAX_QUEUE_SIZE = 1000;
  private readonly SYNC_INTERVAL = 30000; // 30 seconds
  private readonly RETRY_INTERVAL = 60000; // 1 minute
  private readonly ACTIVITY_TIMEOUT = 300000; // 5 minutes
  private readonly PRIORITY_BOOST_FACTOR = 0.5;
  private readonly ESTIMATED_MESSAGE_SIZE = 1024; // 1KB average
  private readonly ESTIMATED_MEDIA_SIZE = 1024 * 1024; // 1MB average

  /**
   * Initialize the smart sync manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Create sync tables
      await this.createSyncTables();
      
      // Load sync queue
      await this.loadSyncQueue();
      
      // Set up sync strategies
      this.setupSyncStrategies();
      
      // Set up network monitoring
      this.setupNetworkMonitoring();
      
      // Set up app state monitoring
      this.setupAppStateMonitoring();
      
      // Start sync timer
      this.startSyncTimer();
      
      // Load sync stats
      await this.loadSyncStats();
      
      this.isInitialized = true;
      console.log('Smart sync manager initialized successfully');
    } catch (error) {
      console.error('Error initializing smart sync manager:', error);
      throw error instanceof Error ? error : new Error('Failed to initialize smart sync manager');
    }
  }

  /**
   * Create sync tables
   */
  private async createSyncTables(): Promise<void> {
    // Sync queue table
    await sqliteService.executeSql(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        priority INTEGER NOT NULL,
        target_id TEXT,
        metadata TEXT NOT NULL,
        estimated_size INTEGER NOT NULL,
        estimated_time INTEGER NOT NULL,
        retry_count INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 3,
        last_attempt TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        dependencies TEXT
      )
    `);

    // Sync stats table
    await sqliteService.executeSql(`
      CREATE TABLE IF NOT EXISTS sync_stats (
        id INTEGER PRIMARY KEY,
        total_syncs INTEGER DEFAULT 0,
        successful_syncs INTEGER DEFAULT 0,
        failed_syncs INTEGER DEFAULT 0,
        last_sync_time TEXT,
        average_sync_time INTEGER DEFAULT 0,
        total_data_synced INTEGER DEFAULT 0,
        syncs_by_type TEXT,
        syncs_by_priority TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // Create indexes
    await sqliteService.executeSql(`
      CREATE INDEX IF NOT EXISTS idx_sync_queue_priority_created 
      ON sync_queue(priority, created_at)
    `);

    await sqliteService.executeSql(`
      CREATE INDEX IF NOT EXISTS idx_sync_queue_type_target 
      ON sync_queue(type, target_id)
    `);
  }

  /**
   * Load sync queue from database
   */
  private async loadSyncQueue(): Promise<void> {
    const sql = `
      SELECT * FROM sync_queue 
      ORDER BY priority ASC, created_at ASC
    `;
    
    const result = await sqliteService.executeSql(sql);
    
    this.syncQueue = result.map((row: any) => ({
      id: row.id,
      type: row.type,
      priority: row.priority,
      targetId: row.target_id,
      metadata: JSON.parse(row.metadata),
      estimatedSize: row.estimated_size,
      estimatedTime: row.estimated_time,
      retryCount: row.retry_count,
      maxRetries: row.max_retries,
      lastAttempt: row.last_attempt,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      dependencies: row.dependencies ? JSON.parse(row.dependencies) : undefined
    }));
    
    console.log(`Loaded ${this.syncQueue.length} sync items from database`);
  }

  /**
   * Load sync stats from database
   */
  private async loadSyncStats(): Promise<void> {
    const sql = `
      SELECT * FROM sync_stats 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    
    const result = await sqliteService.executeSql(sql);
    
    if (result.length > 0) {
      const row = result[0];
      this.syncStats = {
        totalSyncs: row.total_syncs,
        successfulSyncs: row.successful_syncs,
        failedSyncs: row.failed_syncs,
        lastSyncTime: row.last_sync_time,
        averageSyncTime: row.average_sync_time,
        totalDataSynced: row.total_data_synced,
        syncsByType: row.syncs_by_type ? JSON.parse(row.syncs_by_type) : {},
        syncsByPriority: row.syncs_by_priority ? JSON.parse(row.syncs_by_priority) : {}
      };
    }
  }

  /**
   * Setup sync strategies for different connection qualities
   */
  private setupSyncStrategies(): void {
    // Excellent connection (WiFi)
    this.syncStrategies.set(ConnectionQuality.EXCELLENT, {
      connectionQuality: ConnectionQuality.EXCELLENT,
      batchSize: 20,
      concurrentRequests: 6,
      mediaDownloadEnabled: true,
      backgroundSyncEnabled: true,
      aggressiveSync: true,
      maxSyncDuration: 60000, // 1 minute
      priorityFilter: [SyncPriority.CRITICAL, SyncPriority.HIGH, SyncPriority.MEDIUM, SyncPriority.LOW]
    });

    // Good connection (Cellular)
    this.syncStrategies.set(ConnectionQuality.GOOD, {
      connectionQuality: ConnectionQuality.GOOD,
      batchSize: 10,
      concurrentRequests: 3,
      mediaDownloadEnabled: true,
      backgroundSyncEnabled: true,
      aggressiveSync: false,
      maxSyncDuration: 45000, // 45 seconds
      priorityFilter: [SyncPriority.CRITICAL, SyncPriority.HIGH, SyncPriority.MEDIUM]
    });

    // Poor connection
    this.syncStrategies.set(ConnectionQuality.POOR, {
      connectionQuality: ConnectionQuality.POOR,
      batchSize: 5,
      concurrentRequests: 1,
      mediaDownloadEnabled: false,
      backgroundSyncEnabled: false,
      aggressiveSync: false,
      maxSyncDuration: 30000, // 30 seconds
      priorityFilter: [SyncPriority.CRITICAL, SyncPriority.HIGH]
    });

    // Offline - no sync
    this.syncStrategies.set(ConnectionQuality.OFFLINE, {
      connectionQuality: ConnectionQuality.OFFLINE,
      batchSize: 0,
      concurrentRequests: 0,
      mediaDownloadEnabled: false,
      backgroundSyncEnabled: false,
      aggressiveSync: false,
      maxSyncDuration: 0,
      priorityFilter: []
    });
  }

  /**
   * Setup network monitoring
   */
  private setupNetworkMonitoring(): void {
    NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline;
      this.isOnline = !!(state.isConnected && state.isInternetReachable);
      
      // Update connection quality
      if (!this.isOnline) {
        this.connectionQuality = ConnectionQuality.OFFLINE;
      } else if (state.type === 'wifi') {
        this.connectionQuality = ConnectionQuality.EXCELLENT;
      } else if (state.type === 'cellular') {
        // Estimate quality based on cellular type
        const cellularType = state.details?.cellularGeneration;
        if (cellularType === '4g' || cellularType === '5g') {
          this.connectionQuality = ConnectionQuality.GOOD;
        } else {
          this.connectionQuality = ConnectionQuality.POOR;
        }
      } else {
        this.connectionQuality = ConnectionQuality.GOOD;
      }
      
      console.log(`Network state changed: ${this.isOnline ? 'online' : 'offline'} (${this.connectionQuality})`);
      
      // Trigger sync if we came back online
      if (!wasOnline && this.isOnline) {
        this.scheduleImmediateSync();
      }
    });
  }

  /**
   * Setup app state monitoring
   */
  private setupAppStateMonitoring(): void {
    AppState.addEventListener('change', nextAppState => {
      const previousState = this.appState;
      this.appState = nextAppState;
      
      console.log(`App state changed: ${previousState} -> ${nextAppState}`);
      
      // Trigger sync when app comes to foreground
      if (previousState.match(/inactive|background/) && nextAppState === 'active') {
        this.scheduleImmediateSync();
      }
    });
  }

  /**
   * Start sync timer
   */
  private startSyncTimer(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = setInterval(() => {
      this.performSync();
    }, this.SYNC_INTERVAL);

    // Start retry timer
    this.retryTimer = setInterval(() => {
      this.retryFailedSyncs();
    }, this.RETRY_INTERVAL);
  }

  /**
   * Add sync item to queue
   */
  async addSyncItem(
    type: SyncType,
    priority: SyncPriority,
    targetId?: string | number,
    metadata: any = {},
    estimatedSize?: number,
    dependencies?: string[]
  ): Promise<string> {
    const itemId = this.generateSyncItemId();
    const now = new Date().toISOString();
    
    // Estimate size and time based on type
    const finalEstimatedSize = estimatedSize || this.estimateSize(type, metadata);
    const estimatedTime = this.estimateTime(type, finalEstimatedSize);
    
    const syncItem: SyncItem = {
      id: itemId,
      type,
      priority,
      targetId,
      metadata,
      estimatedSize: finalEstimatedSize,
      estimatedTime,
      retryCount: 0,
      maxRetries: 3,
      createdAt: now,
      updatedAt: now,
      dependencies
    };
    
    // Check if queue is full
    if (this.syncQueue.length >= this.MAX_QUEUE_SIZE) {
      // Remove lowest priority items
      this.syncQueue.sort((a, b) => b.priority - a.priority);
      const removed = this.syncQueue.splice(Math.floor(this.MAX_QUEUE_SIZE * 0.1));
      console.log(`Removed ${removed.length} low priority sync items`);
    }
    
    // Add to queue
    this.syncQueue.push(syncItem);
    
    // Save to database
    await this.saveSyncItem(syncItem);
    
    // Trigger immediate sync for high priority items
    if (priority <= SyncPriority.HIGH && this.isOnline) {
      this.scheduleImmediateSync();
    }
    
    console.log(`Added sync item ${type} with priority ${priority}`);
    return itemId;
  }

  /**
   * Perform sync operation
   */
  private async performSync(): Promise<SyncResult> {
    if (this.syncInProgress || !this.isOnline) {
      return {
        success: false,
        syncedItems: 0,
        failedItems: 0,
        skippedItems: 0,
        totalTime: 0,
        errors: ['Sync already in progress or offline']
      };
    }

    this.syncInProgress = true;
    const syncStartTime = Date.now();
    const errors: string[] = [];
    let syncedItems = 0;
    let failedItems = 0;
    let skippedItems = 0;

    try {
      const strategy = this.syncStrategies.get(this.connectionQuality);
      if (!strategy) {
        throw new Error(`No sync strategy for connection quality: ${this.connectionQuality}`);
      }

      console.log(`Starting sync with strategy: ${this.connectionQuality}`);
      
      // Get prioritized sync items
      const itemsToSync = this.getPrioritizedSyncItems(strategy);
      
      if (itemsToSync.length === 0) {
        console.log('No items to sync');
        return {
          success: true,
          syncedItems: 0,
          failedItems: 0,
          skippedItems: 0,
          totalTime: Date.now() - syncStartTime,
          errors: []
        };
      }

      console.log(`Syncing ${itemsToSync.length} items`);
      
      // Process sync items in batches
      const batches = this.createBatches(itemsToSync, strategy.batchSize);
      
      for (const batch of batches) {
        // Check if we should stop (connection lost, app backgrounded, etc.)
        if (!this.isOnline || this.appState === 'background') {
          break;
        }

        // Process batch
        const batchResults = await this.processBatch(batch, strategy);
        
        syncedItems += batchResults.syncedItems;
        failedItems += batchResults.failedItems;
        skippedItems += batchResults.skippedItems;
        errors.push(...batchResults.errors);
        
        // Check if we've exceeded max sync duration
        if (Date.now() - syncStartTime > strategy.maxSyncDuration) {
          console.log('Sync duration exceeded, stopping');
          break;
        }
      }

      // Update sync stats
      await this.updateSyncStats(syncedItems, failedItems, Date.now() - syncStartTime);

      const result: SyncResult = {
        success: errors.length === 0,
        syncedItems,
        failedItems,
        skippedItems,
        totalTime: Date.now() - syncStartTime,
        errors,
        nextSyncTime: new Date(Date.now() + this.SYNC_INTERVAL).toISOString()
      };

      console.log(`Sync completed: ${syncedItems} synced, ${failedItems} failed, ${skippedItems} skipped`);
      return result;

    } catch (error) {
      console.error('Error during sync:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMessage);
      
      return {
        success: false,
        syncedItems,
        failedItems,
        skippedItems,
        totalTime: Date.now() - syncStartTime,
        errors
      };
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Get prioritized sync items
   */
  private getPrioritizedSyncItems(strategy: SyncStrategy): SyncItem[] {
    // Filter by priority
    let items = this.syncQueue.filter(item => 
      strategy.priorityFilter.includes(item.priority)
    );

    // Apply user activity boosts
    items = this.applyActivityBoosts(items);

    // Sort by priority and creation time
    items.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    // Filter out items that are already syncing
    items = items.filter(item => !this.activeSyncs.has(item.id));

    // Resolve dependencies
    items = this.resolveDependencies(items);

    return items;
  }

  /**
   * Apply activity boosts to sync items
   */
  private applyActivityBoosts(items: SyncItem[]): SyncItem[] {
    const now = Date.now();
    
    return items.map(item => {
      if (item.targetId) {
        const lastActivity = this.userActivity.get(item.targetId.toString());
        if (lastActivity && now - lastActivity < this.ACTIVITY_TIMEOUT) {
          // Boost priority for recently active chats
          const boostedPriority = Math.max(1, item.priority - this.PRIORITY_BOOST_FACTOR);
          return { ...item, priority: boostedPriority };
        }
      }
      return item;
    });
  }

  /**
   * Resolve dependencies for sync items
   */
  private resolveDependencies(items: SyncItem[]): SyncItem[] {
    const resolvedItems: SyncItem[] = [];
    const processedIds = new Set<string>();
    
    const processDependencies = (item: SyncItem): boolean => {
      if (processedIds.has(item.id)) {
        return true;
      }
      
      if (item.dependencies && item.dependencies.length > 0) {
        // Check if all dependencies are resolved
        const dependencyItems = items.filter(i => 
          item.dependencies!.includes(i.id)
        );
        
        for (const dep of dependencyItems) {
          if (!processDependencies(dep)) {
            return false;
          }
        }
      }
      
      resolvedItems.push(item);
      processedIds.add(item.id);
      return true;
    };
    
    items.forEach(item => processDependencies(item));
    
    return resolvedItems;
  }

  /**
   * Create batches from sync items
   */
  private createBatches(items: SyncItem[], batchSize: number): SyncItem[][] {
    const batches: SyncItem[][] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    
    return batches;
  }

  /**
   * Process a batch of sync items
   */
  private async processBatch(batch: SyncItem[], strategy: SyncStrategy): Promise<SyncResult> {
    const promises = batch.map(item => this.processSyncItem(item, strategy));
    const results = await Promise.allSettled(promises);
    
    let syncedItems = 0;
    let failedItems = 0;
    let skippedItems = 0;
    const errors: string[] = [];
    
    results.forEach((result, index) => {
      const item = batch[index];
      
      if (result.status === 'fulfilled') {
        if (result.value.success) {
          syncedItems++;
          this.removeSyncItem(item.id);
        } else {
          failedItems++;
          this.handleSyncItemFailure(item, result.value.error || 'Unknown error');
        }
      } else {
        failedItems++;
        this.handleSyncItemFailure(item, result.reason);
        errors.push(`Failed to sync ${item.type}: ${result.reason}`);
      }
    });
    
    return {
      success: errors.length === 0,
      syncedItems,
      failedItems,
      skippedItems,
      totalTime: 0,
      errors
    };
  }

  /**
   * Process a single sync item
   */
  private async processSyncItem(item: SyncItem, strategy: SyncStrategy): Promise<{ success: boolean; error?: string }> {
    try {
      this.activeSyncs.add(item.id);
      
      console.log(`Processing sync item: ${item.type} (${item.id})`);
      
      let result;
      
      switch (item.type) {
        case SyncType.MESSAGES:
          result = await this.syncMessages(item, strategy);
          break;
        
        case SyncType.CHATS:
          result = await this.syncChats(item, strategy);
          break;
        
        case SyncType.PROFILE:
          result = await this.syncProfile(item, strategy);
          break;
        
        case SyncType.SETTINGS:
          result = await this.syncSettings(item, strategy);
          break;
        
        case SyncType.MEDIA:
          result = await this.syncMedia(item, strategy);
          break;
        
        case SyncType.LIKES:
          result = await this.syncLikes(item, strategy);
          break;
        
        case SyncType.MATCHES:
          result = await this.syncMatches(item, strategy);
          break;
        
        case SyncType.STORIES:
          result = await this.syncStories(item, strategy);
          break;
        
        case SyncType.LOCATION:
          result = await this.syncLocation(item, strategy);
          break;
        
        case SyncType.NOTIFICATIONS:
          result = await this.syncNotifications(item, strategy);
          break;
        
        default:
          throw new Error(`Unknown sync type: ${item.type}`);
      }
      
      return { success: true };
    } catch (error) {
      console.error(`Error processing sync item ${item.id}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    } finally {
      this.activeSyncs.delete(item.id);
    }
  }

  /**
   * Sync messages
   */
  private async syncMessages(item: SyncItem, strategy: SyncStrategy): Promise<void> {
    const { chatId, lastMessageId, limit } = item.metadata;
    
    // Check if this is a priority chat (has unread messages)
    if (item.priority === SyncPriority.CRITICAL) {
      // Sync unread messages first
      const unreadMessages = await apiClient.chats.getUnreadMessages(chatId);
      if (unreadMessages.length > 0) {
        await chatsService.saveMessages(chatId, unreadMessages);
      }
    }
    
    // Sync recent messages
    const messages = await apiClient.chats.getMessages(chatId, {
      after: lastMessageId,
      limit: limit || 50
    });
    
    if (messages.length > 0) {
      await chatsService.saveMessages(chatId, messages);
    }
  }

  /**
   * Sync chats
   */
  private async syncChats(item: SyncItem, strategy: SyncStrategy): Promise<void> {
    const { forceRefresh } = item.metadata;
    
    const chats = await chatsService.getChats(1, forceRefresh);
    
    if (chats && chats.data.chats.length > 0) {
      // Save to local database via chatsService
      console.log(`Synced ${chats.data.chats.length} chats`);
    }
  }

  /**
   * Sync profile
   */
  private async syncProfile(item: SyncItem, strategy: SyncStrategy): Promise<void> {
    const { userId } = item.metadata;
    
    const profile = await apiClient.profile.getProfile(userId);
    
    if (profile) {
      // Save to local database
      console.log(`Synced profile for user ${userId}`);
    }
  }

  /**
   * Sync settings
   */
  private async syncSettings(item: SyncItem, strategy: SyncStrategy): Promise<void> {
    const settings = await apiClient.settings.get();
    
    if (settings) {
      // Save to local database
      console.log('Synced user settings');
    }
  }

  /**
   * Sync media
   */
  private async syncMedia(item: SyncItem, strategy: SyncStrategy): Promise<void> {
    if (!strategy.mediaDownloadEnabled) {
      throw new Error('Media download disabled for current connection quality');
    }
    
    const { mediaUrl, chatId, messageId } = item.metadata;
    
    // Download media file
    const mediaData = await apiClient.media.download(mediaUrl);
    
    if (mediaData) {
      // Save to local storage
      console.log(`Downloaded media for message ${messageId}`);
    }
  }

  /**
   * Sync likes
   */
  private async syncLikes(item: SyncItem, strategy: SyncStrategy): Promise<void> {
    const likes = await apiClient.likes.getLikes();
    
    if (likes) {
      // Save to local database
      console.log(`Synced ${likes.length} likes`);
    }
  }

  /**
   * Sync matches
   */
  private async syncMatches(item: SyncItem, strategy: SyncStrategy): Promise<void> {
    const matches = await apiClient.matches.getMatches();
    
    if (matches) {
      // Save to local database
      console.log(`Synced ${matches.length} matches`);
    }
  }

  /**
   * Sync stories
   */
  private async syncStories(item: SyncItem, strategy: SyncStrategy): Promise<void> {
    const stories = await apiClient.stories.getStories();
    
    if (stories) {
      // Save to local database
      console.log(`Synced ${stories.length} stories`);
    }
  }

  /**
   * Sync location
   */
  private async syncLocation(item: SyncItem, strategy: SyncStrategy): Promise<void> {
    const { latitude, longitude } = item.metadata;
    
    await apiClient.location.updateLocation({
      latitude,
      longitude
    });
    
    console.log('Synced location update');
  }

  /**
   * Sync notifications
   */
  private async syncNotifications(item: SyncItem, strategy: SyncStrategy): Promise<void> {
    const notifications = await apiClient.notifications.getNotifications();
    
    if (notifications) {
      // Save to local database
      console.log(`Synced ${notifications.length} notifications`);
    }
  }

  /**
   * Estimate size for sync item
   */
  private estimateSize(type: SyncType, metadata: any): number {
    switch (type) {
      case SyncType.MESSAGES:
        return (metadata.limit || 50) * this.ESTIMATED_MESSAGE_SIZE;
      
      case SyncType.MEDIA:
        return this.ESTIMATED_MEDIA_SIZE;
      
      case SyncType.CHATS:
        return (metadata.limit || 20) * this.ESTIMATED_MESSAGE_SIZE * 2; // Chat + last message
      
      case SyncType.PROFILE:
        return this.ESTIMATED_MESSAGE_SIZE * 5; // Profile data
      
      case SyncType.SETTINGS:
        return this.ESTIMATED_MESSAGE_SIZE; // Settings data
      
      default:
        return this.ESTIMATED_MESSAGE_SIZE;
    }
  }

  /**
   * Estimate time for sync item
   */
  private estimateTime(type: SyncType, size: number): number {
    // Base time estimates in milliseconds
    const baseTime = {
      [SyncType.MESSAGES]: 2000,
      [SyncType.CHATS]: 3000,
      [SyncType.PROFILE]: 1500,
      [SyncType.SETTINGS]: 1000,
      [SyncType.MEDIA]: 5000,
      [SyncType.LIKES]: 2000,
      [SyncType.MATCHES]: 2000,
      [SyncType.STORIES]: 3000,
      [SyncType.LOCATION]: 500,
      [SyncType.NOTIFICATIONS]: 1000
    };
    
    return baseTime[type] || 1000;
  }

  /**
   * Save sync item to database
   */
  private async saveSyncItem(item: SyncItem): Promise<void> {
    const sql = `
      INSERT OR REPLACE INTO sync_queue (
        id, type, priority, target_id, metadata, estimated_size, estimated_time,
        retry_count, max_retries, last_attempt, created_at, updated_at, dependencies
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await sqliteService.executeSql(sql, [
      item.id,
      item.type,
      item.priority,
      item.targetId,
      JSON.stringify(item.metadata),
      item.estimatedSize,
      item.estimatedTime,
      item.retryCount,
      item.maxRetries,
      item.lastAttempt,
      item.createdAt,
      item.updatedAt,
      item.dependencies ? JSON.stringify(item.dependencies) : null
    ]);
  }

  /**
   * Remove sync item from queue
   */
  private async removeSyncItem(itemId: string): Promise<void> {
    // Remove from memory
    this.syncQueue = this.syncQueue.filter(item => item.id !== itemId);
    
    // Remove from database
    await sqliteService.executeSql('DELETE FROM sync_queue WHERE id = ?', [itemId]);
  }

  /**
   * Handle sync item failure
   */
  private async handleSyncItemFailure(item: SyncItem, error: string): Promise<void> {
    item.retryCount++;
    item.lastAttempt = new Date().toISOString();
    item.updatedAt = new Date().toISOString();
    
    if (item.retryCount >= item.maxRetries) {
      console.error(`Sync item ${item.id} failed permanently after ${item.retryCount} attempts`);
      await this.removeSyncItem(item.id);
    } else {
      console.log(`Sync item ${item.id} failed, will retry (${item.retryCount}/${item.maxRetries})`);
      await this.saveSyncItem(item);
    }
  }

  /**
   * Retry failed syncs
   */
  private async retryFailedSyncs(): Promise<void> {
    const now = new Date().toISOString();
    const retryItems = this.syncQueue.filter(item => 
      item.retryCount > 0 && 
      item.retryCount < item.maxRetries &&
      (!item.lastAttempt || new Date(item.lastAttempt).getTime() + this.RETRY_INTERVAL < Date.now())
    );
    
    if (retryItems.length > 0) {
      console.log(`Retrying ${retryItems.length} failed sync items`);
      
      // Reset retry count for retry attempt
      for (const item of retryItems) {
        item.lastAttempt = now;
        await this.saveSyncItem(item);
      }
    }
  }

  /**
   * Update sync stats
   */
  private async updateSyncStats(syncedItems: number, failedItems: number, syncTime: number): Promise<void> {
    this.syncStats.totalSyncs++;
    this.syncStats.successfulSyncs += syncedItems > 0 ? 1 : 0;
    this.syncStats.failedSyncs += failedItems > 0 ? 1 : 0;
    this.syncStats.lastSyncTime = new Date().toISOString();
    
    // Update average sync time
    this.syncStats.averageSyncTime = Math.round(
      (this.syncStats.averageSyncTime * (this.syncStats.totalSyncs - 1) + syncTime) / this.syncStats.totalSyncs
    );
    
    // Save to database
    const sql = `
      INSERT OR REPLACE INTO sync_stats (
        id, total_syncs, successful_syncs, failed_syncs, last_sync_time,
        average_sync_time, total_data_synced, syncs_by_type, syncs_by_priority,
        created_at, updated_at
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const now = new Date().toISOString();
    
    await sqliteService.executeSql(sql, [
      this.syncStats.totalSyncs,
      this.syncStats.successfulSyncs,
      this.syncStats.failedSyncs,
      this.syncStats.lastSyncTime,
      this.syncStats.averageSyncTime,
      this.syncStats.totalDataSynced,
      JSON.stringify(this.syncStats.syncsByType),
      JSON.stringify(this.syncStats.syncsByPriority),
      now,
      now
    ]);
  }

  /**
   * Schedule immediate sync
   */
  private scheduleImmediateSync(): void {
    if (this.syncInProgress) return;
    
    // Clear existing timer and trigger sync
    setTimeout(() => {
      this.performSync();
    }, 1000); // 1 second delay
  }

  /**
   * Update user activity for priority boosting
   */
  updateUserActivity(chatId: string): void {
    this.userActivity.set(chatId, Date.now());
  }

  /**
   * Force sync for specific type
   */
  async forceSyncType(type: SyncType, targetId?: string | number): Promise<void> {
    await this.addSyncItem(type, SyncPriority.CRITICAL, targetId, {
      forceRefresh: true,
      immediate: true
    });
    
    this.scheduleImmediateSync();
  }

  /**
   * Get sync queue status
   */
  getSyncQueueStatus(): {
    totalItems: number;
    itemsByPriority: Record<SyncPriority, number>;
    itemsByType: Record<SyncType, number>;
    activeSyncs: number;
    connectionQuality: ConnectionQuality;
    isOnline: boolean;
  } {
    const itemsByPriority = {} as Record<SyncPriority, number>;
    const itemsByType = {} as Record<SyncType, number>;
    
    this.syncQueue.forEach(item => {
      itemsByPriority[item.priority] = (itemsByPriority[item.priority] || 0) + 1;
      itemsByType[item.type] = (itemsByType[item.type] || 0) + 1;
    });
    
    return {
      totalItems: this.syncQueue.length,
      itemsByPriority,
      itemsByType,
      activeSyncs: this.activeSyncs.size,
      connectionQuality: this.connectionQuality,
      isOnline: this.isOnline
    };
  }

  /**
   * Get sync stats
   */
  getSyncStats(): SyncStats {
    return { ...this.syncStats };
  }

  /**
   * Clear sync queue
   */
  async clearSyncQueue(): Promise<void> {
    this.syncQueue = [];
    await sqliteService.executeSql('DELETE FROM sync_queue');
  }

  /**
   * Generate sync item ID
   */
  private generateSyncItemId(): string {
    return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Stop the sync manager
   */
  stop(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    
    if (this.retryTimer) {
      clearInterval(this.retryTimer);
      this.retryTimer = null;
    }
    
    this.isInitialized = false;
    this.syncInProgress = false;
    this.activeSyncs.clear();
  }

  /**
   * Restart the sync manager
   */
  restart(): void {
    this.stop();
    this.startSyncTimer();
  }
}

// Export singleton instance
export const smartSyncManager = new SmartSyncManager(); 