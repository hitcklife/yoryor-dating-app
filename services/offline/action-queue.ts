import AsyncStorage from '@react-native-async-storage/async-storage';
import { sqliteService } from '../sqlite-service';
import { apiClient } from '../api-client';
import NetInfo from '@react-native-community/netinfo';

// === OFFLINE ACTION TYPES ===
export enum OfflineActionType {
  SEND_MESSAGE = 'send_message',
  EDIT_MESSAGE = 'edit_message',
  DELETE_MESSAGE = 'delete_message',
  MARK_MESSAGE_READ = 'mark_message_read',
  SEND_LIKE = 'send_like',
  SEND_DISLIKE = 'send_dislike',
  UPDATE_PROFILE = 'update_profile',
  UPDATE_SETTINGS = 'update_settings',
  BLOCK_USER = 'block_user',
  UNBLOCK_USER = 'unblock_user',
  REPORT_USER = 'report_user',
  UPDATE_LOCATION = 'update_location',
  START_TYPING = 'start_typing',
  STOP_TYPING = 'stop_typing',
  UPLOAD_MEDIA = 'upload_media',
  DELETE_MEDIA = 'delete_media',
  CREATE_STORY = 'create_story',
  DELETE_STORY = 'delete_story',
  SUPER_LIKE = 'super_like',
  UNDO_LIKE = 'undo_like'
}

// === OFFLINE ACTION INTERFACE ===
export interface OfflineAction {
  id: string;
  type: OfflineActionType;
  payload: any;
  targetId?: string | number; // chat_id, user_id, message_id, etc.
  priority: ActionPriority;
  timestamp: string;
  retryCount: number;
  maxRetries: number;
  nextRetryAt: string;
  createdAt: string;
  updatedAt: string;
  status: ActionStatus;
  error?: string;
  metadata?: any;
}

export enum ActionPriority {
  HIGH = 1,     // Messages, calls, critical actions
  MEDIUM = 2,   // Likes, profile updates
  LOW = 3       // Settings, analytics, non-critical actions
}

export enum ActionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

// === SYNC RESULT INTERFACE ===
export interface SyncResult {
  success: boolean;
  error?: string;
  shouldRetry?: boolean;
  backoffMultiplier?: number;
  data?: any;
}

// === OFFLINE ACTION QUEUE CLASS ===
export class OfflineActionQueue {
  private isInitialized = false;
  private processingQueue = false;
  private processTimer: any = null;
  private retryTimer: any = null;
  
  // Queue configuration
  private readonly PROCESS_INTERVAL = 5000; // 5 seconds
  private readonly RETRY_INTERVAL = 30000; // 30 seconds
  private readonly MAX_RETRY_ATTEMPTS = 5;
  private readonly BATCH_SIZE = 10;
  
  // Backoff multipliers for different action types
  private readonly BACKOFF_MULTIPLIERS = {
    [OfflineActionType.SEND_MESSAGE]: 1.5,
    [OfflineActionType.EDIT_MESSAGE]: 1.2,
    [OfflineActionType.DELETE_MESSAGE]: 1.2,
    [OfflineActionType.MARK_MESSAGE_READ]: 1.1,
    [OfflineActionType.SEND_LIKE]: 1.3,
    [OfflineActionType.SEND_DISLIKE]: 1.3,
    [OfflineActionType.UPDATE_PROFILE]: 1.4,
    [OfflineActionType.UPDATE_SETTINGS]: 1.4,
    [OfflineActionType.BLOCK_USER]: 1.5,
    [OfflineActionType.UNBLOCK_USER]: 1.5,
    [OfflineActionType.REPORT_USER]: 1.5,
    [OfflineActionType.UPDATE_LOCATION]: 1.2,
    [OfflineActionType.START_TYPING]: 1.1,
    [OfflineActionType.STOP_TYPING]: 1.1,
    [OfflineActionType.UPLOAD_MEDIA]: 2.0,
    [OfflineActionType.DELETE_MEDIA]: 1.3,
    [OfflineActionType.CREATE_STORY]: 1.5,
    [OfflineActionType.DELETE_STORY]: 1.3,
    [OfflineActionType.SUPER_LIKE]: 1.4,
    [OfflineActionType.UNDO_LIKE]: 1.2
  };

  /**
   * Initialize the offline action queue
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Create offline actions table
      await this.createOfflineActionsTable();
      
      // Start processing queue
      this.startProcessing();
      
      // Start retry timer
      this.startRetryTimer();
      
      this.isInitialized = true;
      console.log('Offline action queue initialized successfully');
    } catch (error) {
      console.error('Error initializing offline action queue:', error);
      throw error;
    }
  }

  /**
   * Create the offline actions table
   */
  private async createOfflineActionsTable(): Promise<void> {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS offline_actions (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        payload TEXT NOT NULL,
        target_id TEXT,
        priority INTEGER NOT NULL,
        timestamp TEXT NOT NULL,
        retry_count INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 5,
        next_retry_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        status TEXT NOT NULL,
        error TEXT,
        metadata TEXT
      )
    `;
    
    await sqliteService.executeSql(createTableSQL);
    
    // Create indexes for better performance
    await sqliteService.executeSql(`
      CREATE INDEX IF NOT EXISTS idx_offline_actions_status_priority 
      ON offline_actions(status, priority, timestamp)
    `);
    
    await sqliteService.executeSql(`
      CREATE INDEX IF NOT EXISTS idx_offline_actions_type_target 
      ON offline_actions(type, target_id)
    `);
    
    await sqliteService.executeSql(`
      CREATE INDEX IF NOT EXISTS idx_offline_actions_retry_at 
      ON offline_actions(next_retry_at)
    `);
  }

  /**
   * Add an action to the offline queue
   */
  async addAction(
    type: OfflineActionType,
    payload: any,
    targetId?: string | number,
    priority: ActionPriority = ActionPriority.MEDIUM,
    metadata?: any
  ): Promise<string> {
    const actionId = this.generateActionId();
    const now = new Date().toISOString();
    
    const action: OfflineAction = {
      id: actionId,
      type,
      payload,
      targetId: targetId?.toString(),
      priority,
      timestamp: now,
      retryCount: 0,
      maxRetries: this.MAX_RETRY_ATTEMPTS,
      nextRetryAt: now,
      createdAt: now,
      updatedAt: now,
      status: ActionStatus.PENDING,
      metadata
    };

    try {
      await this.saveAction(action);
      
      // Trigger immediate processing if online
      const isOnline = await this.isOnline();
      if (isOnline && !this.processingQueue) {
        this.processQueue();
      }
      
      console.log(`Added offline action ${type} with ID ${actionId}`);
      return actionId;
    } catch (error) {
      console.error('Error adding offline action:', error);
      throw error;
    }
  }

  /**
   * Save an action to the database
   */
  private async saveAction(action: OfflineAction): Promise<void> {
    const sql = `
      INSERT OR REPLACE INTO offline_actions (
        id, type, payload, target_id, priority, timestamp, retry_count, max_retries,
        next_retry_at, created_at, updated_at, status, error, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await sqliteService.executeSql(sql, [
      action.id,
      action.type,
      JSON.stringify(action.payload),
      action.targetId,
      action.priority,
      action.timestamp,
      action.retryCount,
      action.maxRetries,
      action.nextRetryAt,
      action.createdAt,
      action.updatedAt,
      action.status,
      action.error,
      action.metadata ? JSON.stringify(action.metadata) : null
    ]);
  }

  /**
   * Get pending actions from the queue
   */
  async getPendingActions(limit: number = this.BATCH_SIZE): Promise<OfflineAction[]> {
    const sql = `
      SELECT * FROM offline_actions 
      WHERE status = ? AND (next_retry_at <= ? OR next_retry_at IS NULL)
      ORDER BY priority ASC, timestamp ASC 
      LIMIT ?
    `;
    
    const now = new Date().toISOString();
    const result = await sqliteService.executeSql(sql, [ActionStatus.PENDING, now, limit]);
    
    return result.map((row: any) => ({
      id: row.id,
      type: row.type,
      payload: JSON.parse(row.payload),
      targetId: row.target_id,
      priority: row.priority,
      timestamp: row.timestamp,
      retryCount: row.retry_count,
      maxRetries: row.max_retries,
      nextRetryAt: row.next_retry_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      status: row.status,
      error: row.error,
      metadata: row.metadata ? JSON.parse(row.metadata) : null
    }));
  }

  /**
   * Update action status
   */
  async updateActionStatus(
    actionId: string,
    status: ActionStatus,
    error?: string,
    nextRetryAt?: string
  ): Promise<void> {
    const sql = `
      UPDATE offline_actions 
      SET status = ?, error = ?, next_retry_at = ?, updated_at = ?, retry_count = retry_count + ?
      WHERE id = ?
    `;
    
    const now = new Date().toISOString();
    const incrementRetryCount = status === ActionStatus.FAILED ? 1 : 0;
    
    await sqliteService.executeSql(sql, [
      status,
      error,
      nextRetryAt,
      now,
      incrementRetryCount,
      actionId
    ]);
  }

  /**
   * Delete completed or cancelled actions
   */
  async cleanupCompletedActions(): Promise<void> {
    const sql = `
      DELETE FROM offline_actions 
      WHERE status IN (?, ?) AND created_at < ?
    `;
    
    // Clean up actions older than 24 hours
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    await sqliteService.executeSql(sql, [
      ActionStatus.COMPLETED,
      ActionStatus.CANCELLED,
      cutoffTime
    ]);
  }

  /**
   * Start processing the queue
   */
  private startProcessing(): void {
    this.processTimer = setInterval(() => {
      this.processQueue();
    }, this.PROCESS_INTERVAL);
  }

  /**
   * Start retry timer
   */
  private startRetryTimer(): void {
    this.retryTimer = setInterval(() => {
      this.processRetries();
    }, this.RETRY_INTERVAL);
  }

  /**
   * Process the action queue
   */
  private async processQueue(): Promise<void> {
    if (this.processingQueue) return;
    
    const isOnline = await this.isOnline();
    if (!isOnline) {
      console.log('Offline: Skipping queue processing');
      return;
    }
    
    this.processingQueue = true;
    
    try {
      const actions = await this.getPendingActions();
      
      if (actions.length === 0) {
        return;
      }
      
      console.log(`Processing ${actions.length} offline actions`);
      
      // Process actions in batches
      for (const action of actions) {
        try {
          await this.processAction(action);
        } catch (error) {
          console.error(`Error processing action ${action.id}:`, error);
          await this.handleActionError(action, error);
        }
      }
      
      // Clean up completed actions
      await this.cleanupCompletedActions();
      
    } finally {
      this.processingQueue = false;
    }
  }

  /**
   * Process retry attempts
   */
  private async processRetries(): Promise<void> {
    const sql = `
      SELECT * FROM offline_actions 
      WHERE status = ? AND retry_count < max_retries AND next_retry_at <= ?
      ORDER BY priority ASC, timestamp ASC
      LIMIT ?
    `;
    
    const now = new Date().toISOString();
    const result = await sqliteService.executeSql(sql, [
      ActionStatus.FAILED,
      now,
      this.BATCH_SIZE
    ]);
    
    if (result.length > 0) {
      console.log(`Retrying ${result.length} failed actions`);
      
      for (const row of result) {
        const action: OfflineAction = {
          id: row.id,
          type: row.type,
          payload: JSON.parse(row.payload),
          targetId: row.target_id,
          priority: row.priority,
          timestamp: row.timestamp,
          retryCount: row.retry_count,
          maxRetries: row.max_retries,
          nextRetryAt: row.next_retry_at,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          status: ActionStatus.PENDING,
          error: row.error,
          metadata: row.metadata ? JSON.parse(row.metadata) : null
        };
        
        await this.updateActionStatus(action.id, ActionStatus.PENDING);
      }
    }
  }

  /**
   * Process a single action
   */
  private async processAction(action: OfflineAction): Promise<void> {
    console.log(`Processing action ${action.type} (${action.id})`);
    
    await this.updateActionStatus(action.id, ActionStatus.PROCESSING);
    
    try {
      const result = await this.executeAction(action);
      
      if (result.success) {
        await this.updateActionStatus(action.id, ActionStatus.COMPLETED);
        console.log(`Action ${action.id} completed successfully`);
      } else {
        await this.handleActionError(action, new Error(result.error || 'Unknown error'));
      }
    } catch (error) {
      await this.handleActionError(action, error);
    }
  }

  /**
   * Execute an action
   */
  private async executeAction(action: OfflineAction): Promise<SyncResult> {
    switch (action.type) {
      case OfflineActionType.SEND_MESSAGE:
        return this.executeSendMessage(action);
      
      case OfflineActionType.EDIT_MESSAGE:
        return this.executeEditMessage(action);
      
      case OfflineActionType.DELETE_MESSAGE:
        return this.executeDeleteMessage(action);
      
      case OfflineActionType.MARK_MESSAGE_READ:
        return this.executeMarkMessageRead(action);
      
      case OfflineActionType.SEND_LIKE:
        return this.executeSendLike(action);
      
      case OfflineActionType.SEND_DISLIKE:
        return this.executeSendDislike(action);
      
      case OfflineActionType.UPDATE_PROFILE:
        return this.executeUpdateProfile(action);
      
      case OfflineActionType.UPDATE_SETTINGS:
        return this.executeUpdateSettings(action);
      
      case OfflineActionType.BLOCK_USER:
        return this.executeBlockUser(action);
      
      case OfflineActionType.UNBLOCK_USER:
        return this.executeUnblockUser(action);
      
      case OfflineActionType.REPORT_USER:
        return this.executeReportUser(action);
      
      case OfflineActionType.UPDATE_LOCATION:
        return this.executeUpdateLocation(action);
      
      case OfflineActionType.START_TYPING:
        return this.executeStartTyping(action);
      
      case OfflineActionType.STOP_TYPING:
        return this.executeStopTyping(action);
      
      case OfflineActionType.UPLOAD_MEDIA:
        return this.executeUploadMedia(action);
      
      case OfflineActionType.DELETE_MEDIA:
        return this.executeDeleteMedia(action);
      
      case OfflineActionType.CREATE_STORY:
        return this.executeCreateStory(action);
      
      case OfflineActionType.DELETE_STORY:
        return this.executeDeleteStory(action);
      
      case OfflineActionType.SUPER_LIKE:
        return this.executeSuperLike(action);
      
      case OfflineActionType.UNDO_LIKE:
        return this.executeUndoLike(action);
      
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Execute send message action
   */
  private async executeSendMessage(action: OfflineAction): Promise<SyncResult> {
    try {
      const { chatId, content, messageType, mediaData } = action.payload;
      
      const response = await apiClient.chats.sendMessage(chatId, {
        content,
        message_type: messageType,
        media_data: mediaData
      });
      
      return { success: true, data: response };
    } catch (error) {
      return { 
        success: false, 
        error: error.message,
        shouldRetry: this.shouldRetryError(error)
      };
    }
  }

  /**
   * Execute edit message action
   */
  private async executeEditMessage(action: OfflineAction): Promise<SyncResult> {
    try {
      const { messageId, content } = action.payload;
      
      const response = await apiClient.chats.editMessage(messageId, content);
      
      return { success: true, data: response };
    } catch (error) {
      return { 
        success: false, 
        error: error.message,
        shouldRetry: this.shouldRetryError(error)
      };
    }
  }

  /**
   * Execute delete message action
   */
  private async executeDeleteMessage(action: OfflineAction): Promise<SyncResult> {
    try {
      const { messageId } = action.payload;
      
      const response = await apiClient.chats.deleteMessage(messageId);
      
      return { success: true, data: response };
    } catch (error) {
      return { 
        success: false, 
        error: error.message,
        shouldRetry: this.shouldRetryError(error)
      };
    }
  }

  /**
   * Execute mark message read action
   */
  private async executeMarkMessageRead(action: OfflineAction): Promise<SyncResult> {
    try {
      const { chatId, messageId } = action.payload;
      
      const response = await apiClient.chats.markMessageAsRead(chatId, messageId);
      
      return { success: true, data: response };
    } catch (error) {
      return { 
        success: false, 
        error: error.message,
        shouldRetry: this.shouldRetryError(error)
      };
    }
  }

  /**
   * Execute send like action
   */
  private async executeSendLike(action: OfflineAction): Promise<SyncResult> {
    try {
      const { userId } = action.payload;
      
      const response = await apiClient.likes.sendLike(userId);
      
      return { success: true, data: response };
    } catch (error) {
      return { 
        success: false, 
        error: error.message,
        shouldRetry: this.shouldRetryError(error)
      };
    }
  }

  /**
   * Execute send dislike action
   */
  private async executeSendDislike(action: OfflineAction): Promise<SyncResult> {
    try {
      const { userId } = action.payload;
      
      const response = await apiClient.dislikes.sendDislike(userId);
      
      return { success: true, data: response };
    } catch (error) {
      return { 
        success: false, 
        error: error.message,
        shouldRetry: this.shouldRetryError(error)
      };
    }
  }

  /**
   * Execute update profile action
   */
  private async executeUpdateProfile(action: OfflineAction): Promise<SyncResult> {
    try {
      const profileData = action.payload;
      
      const response = await apiClient.profile.updateProfile(profileData);
      
      return { success: true, data: response };
    } catch (error) {
      return { 
        success: false, 
        error: error.message,
        shouldRetry: this.shouldRetryError(error)
      };
    }
  }

  /**
   * Execute update settings action
   */
  private async executeUpdateSettings(action: OfflineAction): Promise<SyncResult> {
    try {
      const settingsData = action.payload;
      
      const response = await apiClient.settings.update(settingsData);
      
      return { success: true, data: response };
    } catch (error) {
      return { 
        success: false, 
        error: error.message,
        shouldRetry: this.shouldRetryError(error)
      };
    }
  }

  /**
   * Execute block user action
   */
  private async executeBlockUser(action: OfflineAction): Promise<SyncResult> {
    try {
      const { userId } = action.payload;
      
      const response = await apiClient.blockedUsers.blockUser(userId);
      
      return { success: true, data: response };
    } catch (error) {
      return { 
        success: false, 
        error: error.message,
        shouldRetry: this.shouldRetryError(error)
      };
    }
  }

  /**
   * Execute unblock user action
   */
  private async executeUnblockUser(action: OfflineAction): Promise<SyncResult> {
    try {
      const { userId } = action.payload;
      
      const response = await apiClient.blockedUsers.unblockUser(userId);
      
      return { success: true, data: response };
    } catch (error) {
      return { 
        success: false, 
        error: error.message,
        shouldRetry: this.shouldRetryError(error)
      };
    }
  }

  /**
   * Execute report user action
   */
  private async executeReportUser(action: OfflineAction): Promise<SyncResult> {
    try {
      const { userId, reason, description } = action.payload;
      
      const response = await apiClient.reports.reportUser(userId, reason, description);
      
      return { success: true, data: response };
    } catch (error) {
      return { 
        success: false, 
        error: error.message,
        shouldRetry: this.shouldRetryError(error)
      };
    }
  }

  /**
   * Execute update location action
   */
  private async executeUpdateLocation(action: OfflineAction): Promise<SyncResult> {
    try {
      const locationData = action.payload;
      
      const response = await apiClient.location.updateLocation(locationData);
      
      return { success: true, data: response };
    } catch (error) {
      return { 
        success: false, 
        error: error.message,
        shouldRetry: this.shouldRetryError(error)
      };
    }
  }

  /**
   * Execute start typing action
   */
  private async executeStartTyping(action: OfflineAction): Promise<SyncResult> {
    try {
      const { chatId } = action.payload;
      
      const response = await apiClient.chats.startTyping(chatId);
      
      return { success: true, data: response };
    } catch (error) {
      return { 
        success: false, 
        error: error.message,
        shouldRetry: false // Don't retry typing actions
      };
    }
  }

  /**
   * Execute stop typing action
   */
  private async executeStopTyping(action: OfflineAction): Promise<SyncResult> {
    try {
      const { chatId } = action.payload;
      
      const response = await apiClient.chats.stopTyping(chatId);
      
      return { success: true, data: response };
    } catch (error) {
      return { 
        success: false, 
        error: error.message,
        shouldRetry: false // Don't retry typing actions
      };
    }
  }

  /**
   * Execute upload media action
   */
  private async executeUploadMedia(action: OfflineAction): Promise<SyncResult> {
    try {
      const { chatId, mediaData } = action.payload;
      
      const response = await apiClient.chats.uploadMedia(chatId, mediaData);
      
      return { success: true, data: response };
    } catch (error) {
      return { 
        success: false, 
        error: error.message,
        shouldRetry: this.shouldRetryError(error)
      };
    }
  }

  /**
   * Execute delete media action
   */
  private async executeDeleteMedia(action: OfflineAction): Promise<SyncResult> {
    try {
      const { mediaId } = action.payload;
      
      const response = await apiClient.chats.deleteMedia(mediaId);
      
      return { success: true, data: response };
    } catch (error) {
      return { 
        success: false, 
        error: error.message,
        shouldRetry: this.shouldRetryError(error)
      };
    }
  }

  /**
   * Execute create story action
   */
  private async executeCreateStory(action: OfflineAction): Promise<SyncResult> {
    try {
      const storyData = action.payload;
      
      const response = await apiClient.stories.createStory(storyData);
      
      return { success: true, data: response };
    } catch (error) {
      return { 
        success: false, 
        error: error.message,
        shouldRetry: this.shouldRetryError(error)
      };
    }
  }

  /**
   * Execute delete story action
   */
  private async executeDeleteStory(action: OfflineAction): Promise<SyncResult> {
    try {
      const { storyId } = action.payload;
      
      const response = await apiClient.stories.deleteStory(storyId);
      
      return { success: true, data: response };
    } catch (error) {
      return { 
        success: false, 
        error: error.message,
        shouldRetry: this.shouldRetryError(error)
      };
    }
  }

  /**
   * Execute super like action
   */
  private async executeSuperLike(action: OfflineAction): Promise<SyncResult> {
    try {
      const { userId } = action.payload;
      
      const response = await apiClient.likes.sendSuperLike(userId);
      
      return { success: true, data: response };
    } catch (error) {
      return { 
        success: false, 
        error: error.message,
        shouldRetry: this.shouldRetryError(error)
      };
    }
  }

  /**
   * Execute undo like action
   */
  private async executeUndoLike(action: OfflineAction): Promise<SyncResult> {
    try {
      const { userId } = action.payload;
      
      const response = await apiClient.likes.undoLike(userId);
      
      return { success: true, data: response };
    } catch (error) {
      return { 
        success: false, 
        error: error.message,
        shouldRetry: this.shouldRetryError(error)
      };
    }
  }

  /**
   * Handle action error
   */
  private async handleActionError(action: OfflineAction, error: any): Promise<void> {
    console.error(`Action ${action.id} failed:`, error);
    
    if (action.retryCount >= action.maxRetries) {
      // Max retries reached, mark as failed permanently
      await this.updateActionStatus(action.id, ActionStatus.FAILED, error.message);
      console.error(`Action ${action.id} failed permanently after ${action.retryCount} retries`);
    } else {
      // Calculate next retry time with exponential backoff
      const backoffMultiplier = this.BACKOFF_MULTIPLIERS[action.type] || 1.5;
      const baseDelay = 1000 * Math.pow(backoffMultiplier, action.retryCount); // Start with 1 second
      const jitter = Math.random() * 1000; // Add jitter to prevent thundering herd
      const delay = Math.min(baseDelay + jitter, 300000); // Cap at 5 minutes
      
      const nextRetryAt = new Date(Date.now() + delay).toISOString();
      
      await this.updateActionStatus(action.id, ActionStatus.FAILED, error.message, nextRetryAt);
      console.log(`Action ${action.id} will retry in ${Math.round(delay / 1000)}s (attempt ${action.retryCount + 1}/${action.maxRetries})`);
    }
  }

  /**
   * Check if an error should trigger a retry
   */
  private shouldRetryError(error: any): boolean {
    // Network errors should be retried
    if (error.code === 'NETWORK_ERROR' || error.code === 'ECONNRESET') {
      return true;
    }
    
    // Server errors (5xx) should be retried
    if (error.response && error.response.status >= 500) {
      return true;
    }
    
    // Timeout errors should be retried
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      return true;
    }
    
    // Client errors (4xx) should generally not be retried
    if (error.response && error.response.status >= 400 && error.response.status < 500) {
      return false;
    }
    
    return true; // Default to retry
  }

  /**
   * Check if the device is online
   */
  private async isOnline(): Promise<boolean> {
    try {
      const netInfo = await NetInfo.fetch();
      return !!(netInfo.isConnected && netInfo.isInternetReachable);
    } catch (error) {
      console.error('Error checking network status:', error);
      return false;
    }
  }

  /**
   * Generate a unique action ID
   */
  private generateActionId(): string {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    cancelled: number;
  }> {
    const sql = `
      SELECT 
        status,
        COUNT(*) as count
      FROM offline_actions 
      GROUP BY status
    `;
    
    const result = await sqliteService.executeSql(sql);
    const stats = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      cancelled: 0
    };
    
    result.forEach((row: any) => {
      stats[row.status] = row.count;
    });
    
    return stats;
  }

  /**
   * Cancel an action
   */
  async cancelAction(actionId: string): Promise<void> {
    await this.updateActionStatus(actionId, ActionStatus.CANCELLED);
  }

  /**
   * Get actions by type
   */
  async getActionsByType(type: OfflineActionType): Promise<OfflineAction[]> {
    const sql = `
      SELECT * FROM offline_actions 
      WHERE type = ? 
      ORDER BY timestamp DESC
    `;
    
    const result = await sqliteService.executeSql(sql, [type]);
    
    return result.map((row: any) => ({
      id: row.id,
      type: row.type,
      payload: JSON.parse(row.payload),
      targetId: row.target_id,
      priority: row.priority,
      timestamp: row.timestamp,
      retryCount: row.retry_count,
      maxRetries: row.max_retries,
      nextRetryAt: row.next_retry_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      status: row.status,
      error: row.error,
      metadata: row.metadata ? JSON.parse(row.metadata) : null
    }));
  }

  /**
   * Clear all actions
   */
  async clearAllActions(): Promise<void> {
    await sqliteService.executeSql('DELETE FROM offline_actions');
  }

  /**
   * Stop processing
   */
  stop(): void {
    if (this.processTimer) {
      clearInterval(this.processTimer);
      this.processTimer = null;
    }
    
    if (this.retryTimer) {
      clearInterval(this.retryTimer);
      this.retryTimer = null;
    }
    
    this.isInitialized = false;
    this.processingQueue = false;
  }

  /**
   * Restart processing
   */
  restart(): void {
    this.stop();
    this.startProcessing();
    this.startRetryTimer();
  }

  /**
   * Force process queue (for testing or immediate sync)
   */
  async forceProcessQueue(): Promise<void> {
    await this.processQueue();
  }
}

// Export singleton instance
export const offlineActionQueue = new OfflineActionQueue(); 