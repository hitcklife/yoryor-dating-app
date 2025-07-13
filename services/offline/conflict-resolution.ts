import { sqliteService } from '../sqlite-service';
import { apiClient } from '../api-client';
import { OfflineAction, OfflineActionType } from './action-queue';

// === CONFLICT TYPES ===
export enum ConflictType {
  MESSAGE_EDIT = 'message_edit',
  MESSAGE_DELETE = 'message_delete',
  PROFILE_UPDATE = 'profile_update',
  SETTINGS_UPDATE = 'settings_update',
  LOCATION_UPDATE = 'location_update',
  MEDIA_UPLOAD = 'media_upload',
  STORY_UPDATE = 'story_update',
  LIKE_DISLIKE = 'like_dislike',
  BLOCK_UNBLOCK = 'block_unblock'
}

// === CONFLICT RESOLUTION STRATEGIES ===
export enum ConflictResolutionStrategy {
  LAST_WRITER_WINS = 'last_writer_wins',
  MERGE = 'merge',
  USER_CHOICE = 'user_choice',
  SERVER_WINS = 'server_wins',
  CLIENT_WINS = 'client_wins',
  CUSTOM = 'custom'
}

// === CONFLICT INTERFACE ===
export interface ConflictData {
  id: string;
  type: ConflictType;
  entityId: string | number; // message_id, user_id, etc.
  entityType: string; // 'message', 'profile', 'settings', etc.
  localVersion: any;
  serverVersion: any;
  localTimestamp: string;
  serverTimestamp: string;
  conflictDetails: ConflictDetails;
  resolution?: ConflictResolution;
  status: ConflictStatus;
  createdAt: string;
  resolvedAt?: string;
  metadata?: any;
}

export interface ConflictDetails {
  conflictedFields: string[];
  originalValue?: any;
  localChanges: Record<string, any>;
  serverChanges: Record<string, any>;
  description: string;
}

export interface ConflictResolution {
  strategy: ConflictResolutionStrategy;
  resolvedValue: any;
  resolvedBy: 'system' | 'user';
  resolvedAt: string;
  reason?: string;
}

export enum ConflictStatus {
  PENDING = 'pending',
  RESOLVED = 'resolved',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

// === CONFLICT RESOLUTION RESULT ===
export interface ConflictResolutionResult {
  success: boolean;
  resolvedValue?: any;
  error?: string;
  requiresUserInput?: boolean;
  conflictData?: ConflictData;
}

// === CONFLICT RESOLUTION SERVICE ===
export class ConflictResolutionService {
  private isInitialized = false;
  private pendingConflicts = new Map<string, ConflictData>();
  private resolutionStrategies = new Map<ConflictType, ConflictResolutionStrategy>();
  private conflictListeners = new Set<(conflict: ConflictData) => void>();
  private resolvedListeners = new Set<(conflict: ConflictData) => void>();

  /**
   * Initialize the conflict resolution service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Create conflicts table
      await this.createConflictsTable();
      
      // Load pending conflicts
      await this.loadPendingConflicts();
      
      // Set default resolution strategies
      this.setDefaultResolutionStrategies();
      
      this.isInitialized = true;
      console.log('Conflict resolution service initialized successfully');
         } catch (error) {
       console.error('Error initializing conflict resolution service:', error);
       throw error instanceof Error ? error : new Error('Failed to initialize conflict resolution service');
     }
  }

  /**
   * Create the conflicts table
   */
  private async createConflictsTable(): Promise<void> {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS conflicts (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        local_version TEXT NOT NULL,
        server_version TEXT NOT NULL,
        local_timestamp TEXT NOT NULL,
        server_timestamp TEXT NOT NULL,
        conflict_details TEXT NOT NULL,
        resolution TEXT,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        resolved_at TEXT,
        metadata TEXT
      )
    `;
    
    await sqliteService.executeSql(createTableSQL);
    
    // Create indexes
    await sqliteService.executeSql(`
      CREATE INDEX IF NOT EXISTS idx_conflicts_status_created 
      ON conflicts(status, created_at)
    `);
    
    await sqliteService.executeSql(`
      CREATE INDEX IF NOT EXISTS idx_conflicts_entity 
      ON conflicts(entity_type, entity_id)
    `);
  }

  /**
   * Load pending conflicts from database
   */
  private async loadPendingConflicts(): Promise<void> {
    const sql = `
      SELECT * FROM conflicts 
      WHERE status = ? 
      ORDER BY created_at DESC
    `;
    
    const result = await sqliteService.executeSql(sql, [ConflictStatus.PENDING]);
    
    result.forEach((row: any) => {
      const conflict: ConflictData = {
        id: row.id,
        type: row.type,
        entityId: row.entity_id,
        entityType: row.entity_type,
        localVersion: JSON.parse(row.local_version),
        serverVersion: JSON.parse(row.server_version),
        localTimestamp: row.local_timestamp,
        serverTimestamp: row.server_timestamp,
        conflictDetails: JSON.parse(row.conflict_details),
        resolution: row.resolution ? JSON.parse(row.resolution) : undefined,
        status: row.status,
        createdAt: row.created_at,
        resolvedAt: row.resolved_at,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined
      };
      
      this.pendingConflicts.set(conflict.id, conflict);
    });
    
    console.log(`Loaded ${this.pendingConflicts.size} pending conflicts`);
  }

  /**
   * Set default resolution strategies
   */
  private setDefaultResolutionStrategies(): void {
    this.resolutionStrategies.set(ConflictType.MESSAGE_EDIT, ConflictResolutionStrategy.LAST_WRITER_WINS);
    this.resolutionStrategies.set(ConflictType.MESSAGE_DELETE, ConflictResolutionStrategy.SERVER_WINS);
    this.resolutionStrategies.set(ConflictType.PROFILE_UPDATE, ConflictResolutionStrategy.MERGE);
    this.resolutionStrategies.set(ConflictType.SETTINGS_UPDATE, ConflictResolutionStrategy.MERGE);
    this.resolutionStrategies.set(ConflictType.LOCATION_UPDATE, ConflictResolutionStrategy.LAST_WRITER_WINS);
    this.resolutionStrategies.set(ConflictType.MEDIA_UPLOAD, ConflictResolutionStrategy.CLIENT_WINS);
    this.resolutionStrategies.set(ConflictType.STORY_UPDATE, ConflictResolutionStrategy.LAST_WRITER_WINS);
    this.resolutionStrategies.set(ConflictType.LIKE_DISLIKE, ConflictResolutionStrategy.LAST_WRITER_WINS);
    this.resolutionStrategies.set(ConflictType.BLOCK_UNBLOCK, ConflictResolutionStrategy.LAST_WRITER_WINS);
  }

  /**
   * Detect conflicts when syncing offline actions
   */
  async detectConflict(
    action: OfflineAction,
    serverData: any,
    localData: any
  ): Promise<ConflictData | null> {
    const conflictType = this.getConflictTypeFromAction(action.type);
    if (!conflictType) return null;

    const entityType = this.getEntityTypeFromAction(action.type);
    const entityId = this.getEntityIdFromAction(action);

    // Check if data has actually changed
    const hasConflict = this.hasDataConflict(localData, serverData, conflictType);
    if (!hasConflict) return null;

    // Create conflict data
    const conflictId = this.generateConflictId();
    const conflictDetails = this.analyzeConflict(localData, serverData, conflictType);
    
    const conflict: ConflictData = {
      id: conflictId,
      type: conflictType,
      entityId,
      entityType,
      localVersion: localData,
      serverVersion: serverData,
      localTimestamp: action.timestamp,
      serverTimestamp: serverData.updated_at || new Date().toISOString(),
      conflictDetails,
      status: ConflictStatus.PENDING,
      createdAt: new Date().toISOString(),
      metadata: {
        actionId: action.id,
        actionType: action.type
      }
    };

    // Save conflict to database
    await this.saveConflict(conflict);
    
    // Add to pending conflicts
    this.pendingConflicts.set(conflictId, conflict);
    
    // Notify listeners
    this.notifyConflictListeners(conflict);
    
    console.log(`Conflict detected: ${conflictType} for entity ${entityId}`);
    
    return conflict;
  }

  /**
   * Resolve a conflict
   */
  async resolveConflict(
    conflictId: string,
    strategy?: ConflictResolutionStrategy,
    userInput?: any
  ): Promise<ConflictResolutionResult> {
    const conflict = this.pendingConflicts.get(conflictId);
    if (!conflict) {
      return { success: false, error: 'Conflict not found' };
    }

    try {
      const resolutionStrategy = strategy || this.resolutionStrategies.get(conflict.type) || ConflictResolutionStrategy.LAST_WRITER_WINS;
      
      const result = await this.applyResolutionStrategy(conflict, resolutionStrategy, userInput);
      
      if (result.success) {
        // Update conflict with resolution
        conflict.resolution = {
          strategy: resolutionStrategy,
          resolvedValue: result.resolvedValue,
          resolvedBy: userInput ? 'user' : 'system',
          resolvedAt: new Date().toISOString(),
          reason: result.error // Use error field for resolution reason
        };
        
        conflict.status = ConflictStatus.RESOLVED;
        conflict.resolvedAt = new Date().toISOString();
        
        // Save to database
        await this.saveConflict(conflict);
        
        // Remove from pending
        this.pendingConflicts.delete(conflictId);
        
        // Notify listeners
        this.notifyResolvedListeners(conflict);
        
        console.log(`Conflict ${conflictId} resolved using ${resolutionStrategy}`);
      }
      
      return result;
         } catch (error) {
       console.error(`Error resolving conflict ${conflictId}:`, error);
       return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
     }
  }

  /**
   * Apply resolution strategy
   */
  private async applyResolutionStrategy(
    conflict: ConflictData,
    strategy: ConflictResolutionStrategy,
    userInput?: any
  ): Promise<ConflictResolutionResult> {
    switch (strategy) {
      case ConflictResolutionStrategy.LAST_WRITER_WINS:
        return this.applyLastWriterWins(conflict);
      
      case ConflictResolutionStrategy.MERGE:
        return this.applyMergeStrategy(conflict);
      
      case ConflictResolutionStrategy.USER_CHOICE:
        return this.applyUserChoice(conflict, userInput);
      
      case ConflictResolutionStrategy.SERVER_WINS:
        return this.applyServerWins(conflict);
      
      case ConflictResolutionStrategy.CLIENT_WINS:
        return this.applyClientWins(conflict);
      
      case ConflictResolutionStrategy.CUSTOM:
        return this.applyCustomStrategy(conflict, userInput);
      
      default:
        return { success: false, error: `Unknown resolution strategy: ${strategy}` };
    }
  }

  /**
   * Apply last writer wins strategy
   */
  private applyLastWriterWins(conflict: ConflictData): ConflictResolutionResult {
    const localTime = new Date(conflict.localTimestamp);
    const serverTime = new Date(conflict.serverTimestamp);
    
    const resolvedValue = localTime > serverTime ? conflict.localVersion : conflict.serverVersion;
    
    return {
      success: true,
      resolvedValue,
      requiresUserInput: false
    };
  }

  /**
   * Apply merge strategy
   */
  private applyMergeStrategy(conflict: ConflictData): ConflictResolutionResult {
    try {
      const merged = this.mergeObjects(conflict.serverVersion, conflict.localVersion);
      
      return {
        success: true,
        resolvedValue: merged,
        requiresUserInput: false
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Apply user choice strategy
   */
  private applyUserChoice(conflict: ConflictData, userInput?: any): ConflictResolutionResult {
    if (!userInput) {
      return {
        success: false,
        requiresUserInput: true,
        conflictData: conflict
      };
    }
    
    let resolvedValue;
    
    if (userInput.choice === 'local') {
      resolvedValue = conflict.localVersion;
    } else if (userInput.choice === 'server') {
      resolvedValue = conflict.serverVersion;
    } else if (userInput.choice === 'custom') {
      resolvedValue = userInput.customValue;
    } else {
      return { success: false, error: 'Invalid user choice' };
    }
    
    return {
      success: true,
      resolvedValue,
      requiresUserInput: false
    };
  }

  /**
   * Apply server wins strategy
   */
  private applyServerWins(conflict: ConflictData): ConflictResolutionResult {
    return {
      success: true,
      resolvedValue: conflict.serverVersion,
      requiresUserInput: false
    };
  }

  /**
   * Apply client wins strategy
   */
  private applyClientWins(conflict: ConflictData): ConflictResolutionResult {
    return {
      success: true,
      resolvedValue: conflict.localVersion,
      requiresUserInput: false
    };
  }

  /**
   * Apply custom strategy
   */
  private applyCustomStrategy(conflict: ConflictData, userInput?: any): ConflictResolutionResult {
    // Custom strategy can be implemented based on specific requirements
    // For now, fall back to merge strategy
    return this.applyMergeStrategy(conflict);
  }

  /**
   * Merge two objects
   */
  private mergeObjects(base: any, changes: any): any {
    if (!base || !changes) return changes || base;
    
    if (typeof base !== 'object' || typeof changes !== 'object') {
      return changes;
    }
    
    const merged = { ...base };
    
    for (const key in changes) {
      if (changes.hasOwnProperty(key)) {
        if (
          typeof merged[key] === 'object' &&
          typeof changes[key] === 'object' &&
          !Array.isArray(merged[key]) &&
          !Array.isArray(changes[key])
        ) {
          merged[key] = this.mergeObjects(merged[key], changes[key]);
        } else {
          merged[key] = changes[key];
        }
      }
    }
    
    return merged;
  }

  /**
   * Analyze conflict between local and server data
   */
  private analyzeConflict(
    localData: any,
    serverData: any,
    conflictType: ConflictType
  ): ConflictDetails {
    const conflictedFields: string[] = [];
    const localChanges: Record<string, any> = {};
    const serverChanges: Record<string, any> = {};
    
    // Compare fields based on conflict type
    const fieldsToCompare = this.getFieldsToCompare(conflictType);
    
    for (const field of fieldsToCompare) {
      const localValue = this.getNestedValue(localData, field);
      const serverValue = this.getNestedValue(serverData, field);
      
      if (!this.areValuesEqual(localValue, serverValue)) {
        conflictedFields.push(field);
        localChanges[field] = localValue;
        serverChanges[field] = serverValue;
      }
    }
    
    const description = this.generateConflictDescription(conflictType, conflictedFields);
    
    return {
      conflictedFields,
      localChanges,
      serverChanges,
      description
    };
  }

  /**
   * Get fields to compare for different conflict types
   */
  private getFieldsToCompare(conflictType: ConflictType): string[] {
    switch (conflictType) {
      case ConflictType.MESSAGE_EDIT:
        return ['content', 'edited_at', 'media_data'];
      
      case ConflictType.PROFILE_UPDATE:
        return ['first_name', 'last_name', 'bio', 'age', 'city', 'occupation', 'interests'];
      
      case ConflictType.SETTINGS_UPDATE:
        return ['profile_visible', 'show_distance', 'show_age', 'min_age', 'max_age', 'max_distance'];
      
      case ConflictType.LOCATION_UPDATE:
        return ['latitude', 'longitude', 'city', 'state', 'country'];
      
      case ConflictType.STORY_UPDATE:
        return ['content', 'media_url', 'expires_at'];
      
      default:
        return ['updated_at'];
    }
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Check if two values are equal
   */
  private areValuesEqual(value1: any, value2: any): boolean {
    if (value1 === value2) return true;
    
    if (typeof value1 === 'object' && typeof value2 === 'object') {
      return JSON.stringify(value1) === JSON.stringify(value2);
    }
    
    return false;
  }

  /**
   * Generate conflict description
   */
  private generateConflictDescription(
    conflictType: ConflictType,
    conflictedFields: string[]
  ): string {
    const fieldsList = conflictedFields.join(', ');
    
    switch (conflictType) {
      case ConflictType.MESSAGE_EDIT:
        return `Message was edited both locally and on server. Conflicted fields: ${fieldsList}`;
      
      case ConflictType.PROFILE_UPDATE:
        return `Profile was updated both locally and on server. Conflicted fields: ${fieldsList}`;
      
      case ConflictType.SETTINGS_UPDATE:
        return `Settings were updated both locally and on server. Conflicted fields: ${fieldsList}`;
      
      case ConflictType.LOCATION_UPDATE:
        return `Location was updated both locally and on server. Conflicted fields: ${fieldsList}`;
      
      default:
        return `Data was modified both locally and on server. Conflicted fields: ${fieldsList}`;
    }
  }

  /**
   * Save conflict to database
   */
  private async saveConflict(conflict: ConflictData): Promise<void> {
    const sql = `
      INSERT OR REPLACE INTO conflicts (
        id, type, entity_id, entity_type, local_version, server_version,
        local_timestamp, server_timestamp, conflict_details, resolution,
        status, created_at, resolved_at, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await sqliteService.executeSql(sql, [
      conflict.id,
      conflict.type,
      conflict.entityId,
      conflict.entityType,
      JSON.stringify(conflict.localVersion),
      JSON.stringify(conflict.serverVersion),
      conflict.localTimestamp,
      conflict.serverTimestamp,
      JSON.stringify(conflict.conflictDetails),
      conflict.resolution ? JSON.stringify(conflict.resolution) : null,
      conflict.status,
      conflict.createdAt,
      conflict.resolvedAt,
      conflict.metadata ? JSON.stringify(conflict.metadata) : null
    ]);
  }

  /**
   * Get conflict type from action type
   */
  private getConflictTypeFromAction(actionType: OfflineActionType): ConflictType | null {
    switch (actionType) {
      case OfflineActionType.EDIT_MESSAGE:
        return ConflictType.MESSAGE_EDIT;
      
      case OfflineActionType.DELETE_MESSAGE:
        return ConflictType.MESSAGE_DELETE;
      
      case OfflineActionType.UPDATE_PROFILE:
        return ConflictType.PROFILE_UPDATE;
      
      case OfflineActionType.UPDATE_SETTINGS:
        return ConflictType.SETTINGS_UPDATE;
      
      case OfflineActionType.UPDATE_LOCATION:
        return ConflictType.LOCATION_UPDATE;
      
      case OfflineActionType.UPLOAD_MEDIA:
        return ConflictType.MEDIA_UPLOAD;
      
      case OfflineActionType.CREATE_STORY:
      case OfflineActionType.DELETE_STORY:
        return ConflictType.STORY_UPDATE;
      
      case OfflineActionType.SEND_LIKE:
      case OfflineActionType.SEND_DISLIKE:
      case OfflineActionType.SUPER_LIKE:
      case OfflineActionType.UNDO_LIKE:
        return ConflictType.LIKE_DISLIKE;
      
      case OfflineActionType.BLOCK_USER:
      case OfflineActionType.UNBLOCK_USER:
        return ConflictType.BLOCK_UNBLOCK;
      
      default:
        return null;
    }
  }

  /**
   * Get entity type from action type
   */
  private getEntityTypeFromAction(actionType: OfflineActionType): string {
    switch (actionType) {
      case OfflineActionType.SEND_MESSAGE:
      case OfflineActionType.EDIT_MESSAGE:
      case OfflineActionType.DELETE_MESSAGE:
        return 'message';
      
      case OfflineActionType.UPDATE_PROFILE:
        return 'profile';
      
      case OfflineActionType.UPDATE_SETTINGS:
        return 'settings';
      
      case OfflineActionType.UPDATE_LOCATION:
        return 'location';
      
      case OfflineActionType.UPLOAD_MEDIA:
      case OfflineActionType.DELETE_MEDIA:
        return 'media';
      
      case OfflineActionType.CREATE_STORY:
      case OfflineActionType.DELETE_STORY:
        return 'story';
      
      case OfflineActionType.SEND_LIKE:
      case OfflineActionType.SEND_DISLIKE:
      case OfflineActionType.SUPER_LIKE:
      case OfflineActionType.UNDO_LIKE:
        return 'like';
      
      case OfflineActionType.BLOCK_USER:
      case OfflineActionType.UNBLOCK_USER:
        return 'user';
      
      default:
        return 'unknown';
    }
  }

  /**
   * Get entity ID from action
   */
  private getEntityIdFromAction(action: OfflineAction): string {
    return action.targetId?.toString() || action.id;
  }

  /**
   * Check if there's a data conflict
   */
  private hasDataConflict(localData: any, serverData: any, conflictType: ConflictType): boolean {
    if (!localData || !serverData) return false;
    
    const fieldsToCompare = this.getFieldsToCompare(conflictType);
    
    for (const field of fieldsToCompare) {
      const localValue = this.getNestedValue(localData, field);
      const serverValue = this.getNestedValue(serverData, field);
      
      if (!this.areValuesEqual(localValue, serverValue)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Generate conflict ID
   */
  private generateConflictId(): string {
    return `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Add conflict listener
   */
  addConflictListener(listener: (conflict: ConflictData) => void): void {
    this.conflictListeners.add(listener);
  }

  /**
   * Remove conflict listener
   */
  removeConflictListener(listener: (conflict: ConflictData) => void): void {
    this.conflictListeners.delete(listener);
  }

  /**
   * Add resolved listener
   */
  addResolvedListener(listener: (conflict: ConflictData) => void): void {
    this.resolvedListeners.add(listener);
  }

  /**
   * Remove resolved listener
   */
  removeResolvedListener(listener: (conflict: ConflictData) => void): void {
    this.resolvedListeners.delete(listener);
  }

  /**
   * Notify conflict listeners
   */
  private notifyConflictListeners(conflict: ConflictData): void {
    this.conflictListeners.forEach(listener => {
      try {
        listener(conflict);
      } catch (error) {
        console.error('Error in conflict listener:', error);
      }
    });
  }

  /**
   * Notify resolved listeners
   */
  private notifyResolvedListeners(conflict: ConflictData): void {
    this.resolvedListeners.forEach(listener => {
      try {
        listener(conflict);
      } catch (error) {
        console.error('Error in resolved listener:', error);
      }
    });
  }

  /**
   * Get pending conflicts
   */
  getPendingConflicts(): ConflictData[] {
    return Array.from(this.pendingConflicts.values());
  }

  /**
   * Get conflict by ID
   */
  getConflict(conflictId: string): ConflictData | null {
    return this.pendingConflicts.get(conflictId) || null;
  }

  /**
   * Set resolution strategy for conflict type
   */
  setResolutionStrategy(conflictType: ConflictType, strategy: ConflictResolutionStrategy): void {
    this.resolutionStrategies.set(conflictType, strategy);
  }

  /**
   * Get resolution strategy for conflict type
   */
  getResolutionStrategy(conflictType: ConflictType): ConflictResolutionStrategy {
    return this.resolutionStrategies.get(conflictType) || ConflictResolutionStrategy.LAST_WRITER_WINS;
  }

  /**
   * Clear resolved conflicts
   */
  async clearResolvedConflicts(): Promise<void> {
    const sql = `
      DELETE FROM conflicts 
      WHERE status = ? AND resolved_at < ?
    `;
    
    // Clear conflicts older than 24 hours
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    await sqliteService.executeSql(sql, [ConflictStatus.RESOLVED, cutoffTime]);
  }

  /**
   * Get conflict statistics
   */
  async getConflictStats(): Promise<{
    pending: number;
    resolved: number;
    failed: number;
    cancelled: number;
  }> {
    const sql = `
      SELECT 
        status,
        COUNT(*) as count
      FROM conflicts 
      GROUP BY status
    `;
    
    const result = await sqliteService.executeSql(sql);
    const stats = {
      pending: 0,
      resolved: 0,
      failed: 0,
      cancelled: 0
    };
    
         result.forEach((row: any) => {
       if (row.status in stats) {
         stats[row.status as keyof typeof stats] = row.count;
       }
     });
    
    return stats;
  }

  /**
   * Stop the service
   */
  stop(): void {
    this.isInitialized = false;
    this.pendingConflicts.clear();
    this.conflictListeners.clear();
    this.resolvedListeners.clear();
  }
}

// Export singleton instance
export const conflictResolutionService = new ConflictResolutionService(); 