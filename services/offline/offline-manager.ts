import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import all offline services
import { offlineActionQueue, OfflineActionType, ActionPriority } from './action-queue';
import { conflictResolutionService, ConflictResolutionStrategy } from './conflict-resolution';
import { smartSyncManager, SyncType, SyncPriority } from './smart-sync-manager';
import { offlineDetectionService, OfflineDetectionListener } from './offline-detection';
import { backgroundSyncService } from './background-sync';

// === OFFLINE MANAGER CONFIGURATION ===
interface OfflineManagerConfig {
  enableBackgroundSync: boolean;
  autoResolveConflicts: boolean;
  prioritizeUnreadMessages: boolean;
  deferMediaDownloads: boolean;
  maxRetryAttempts: number;
  syncInterval: number;
  conflictResolutionStrategy: ConflictResolutionStrategy;
  enableOfflineUI: boolean;
  enableNotifications: boolean;
}

// === OFFLINE MANAGER STATUS ===
export interface OfflineManagerStatus {
  isInitialized: boolean;
  isOnline: boolean;
  connectionQuality: string;
  pendingActions: number;
  pendingSyncItems: number;
  pendingConflicts: number;
  backgroundSyncEnabled: boolean;
  lastSyncTime?: string;
  offlineDuration: number;
  services: {
    actionQueue: boolean;
    conflictResolution: boolean;
    smartSync: boolean;
    offlineDetection: boolean;
    backgroundSync: boolean;
  };
}

// === OFFLINE MANAGER EVENTS ===
export interface OfflineManagerEvents {
  onInitialized: () => void;
  onOffline: () => void;
  onOnline: () => void;
  onSyncStarted: () => void;
  onSyncCompleted: (itemsSynced: number) => void;
  onSyncFailed: (error: string) => void;
  onConflictDetected: (conflictId: string) => void;
  onConflictResolved: (conflictId: string) => void;
  onActionQueued: (actionType: OfflineActionType) => void;
  onActionCompleted: (actionType: OfflineActionType) => void;
  onActionFailed: (actionType: OfflineActionType, error: string) => void;
}

// === OFFLINE MANAGER ===
export class OfflineManager {
  private isInitialized = false;
  private config: OfflineManagerConfig;
  private eventListeners = new Map<keyof OfflineManagerEvents, Set<Function>>();
  private appState: AppStateStatus = 'active';
  private appStateSubscription: any = null;

  // Default configuration
  private readonly DEFAULT_CONFIG: OfflineManagerConfig = {
    enableBackgroundSync: true,
    autoResolveConflicts: true,
    prioritizeUnreadMessages: true,
    deferMediaDownloads: false,
    maxRetryAttempts: 5,
    syncInterval: 30000, // 30 seconds
    conflictResolutionStrategy: ConflictResolutionStrategy.LAST_WRITER_WINS,
    enableOfflineUI: true,
    enableNotifications: true
  };

  constructor(config?: Partial<OfflineManagerConfig>) {
    this.config = { ...this.DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the offline manager and all its services
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('Initializing Offline Manager...');

      // Initialize all services in order
      await this.initializeServices();

      // Set up offline detection listener
      this.setupOfflineDetectionListener();

      // Set up conflict resolution listeners
      this.setupConflictResolutionListeners();

      // Set up app state monitoring
      this.setupAppStateMonitoring();

      // Load configuration
      await this.loadConfiguration();

      this.isInitialized = true;
      console.log('Offline Manager initialized successfully');

      // Emit initialized event
      this.emit('onInitialized');
    } catch (error) {
      console.error('Error initializing Offline Manager:', error);
      throw error instanceof Error ? error : new Error('Failed to initialize Offline Manager');
    }
  }

  /**
   * Initialize all offline services
   */
  private async initializeServices(): Promise<void> {
    try {
      // Initialize in dependency order
      console.log('Initializing offline detection service...');
      await offlineDetectionService.initialize();

      console.log('Initializing conflict resolution service...');
      await conflictResolutionService.initialize();

      console.log('Initializing action queue...');
      await offlineActionQueue.initialize();

      console.log('Initializing smart sync manager...');
      await smartSyncManager.initialize();

      if (this.config.enableBackgroundSync) {
        console.log('Initializing background sync service...');
        await backgroundSyncService.initialize();
      }

      console.log('All offline services initialized successfully');
    } catch (error) {
      console.error('Error initializing offline services:', error);
      throw error;
    }
  }

  /**
   * Setup offline detection listener
   */
  private setupOfflineDetectionListener(): void {
    const listener: OfflineDetectionListener = {
      onStateChange: (state) => {
        console.log('Offline state changed:', state);
      },
      onConnectionLost: () => {
        console.log('Connection lost - entering offline mode');
        this.emit('onOffline');
      },
      onConnectionRestored: () => {
        console.log('Connection restored - entering online mode');
        this.emit('onOnline');
        
        // Trigger sync when coming back online
        this.triggerSync();
      },
      onQualityChanged: (quality) => {
        console.log('Connection quality changed:', quality);
      }
    };

    offlineDetectionService.addListener(listener);
  }

  /**
   * Setup conflict resolution listeners
   */
  private setupConflictResolutionListeners(): void {
    conflictResolutionService.addConflictListener((conflict) => {
      console.log('Conflict detected:', conflict.id);
      this.emit('onConflictDetected', conflict.id);

      // Auto-resolve if enabled
      if (this.config.autoResolveConflicts) {
        this.resolveConflictAutomatically(conflict.id);
      }
    });

    conflictResolutionService.addResolvedListener((conflict) => {
      console.log('Conflict resolved:', conflict.id);
      this.emit('onConflictResolved', conflict.id);
    });
  }

  /**
   * Setup app state monitoring
   */
  private setupAppStateMonitoring(): void {
    this.appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      const previousState = this.appState;
      this.appState = nextAppState;

      console.log(`App state changed: ${previousState} -> ${nextAppState}`);

      // Update user activity when app becomes active
      if (previousState.match(/inactive|background/) && nextAppState === 'active') {
        // Trigger sync when app becomes active
        this.triggerSync();
      }
    });
  }

  /**
   * Load configuration from storage
   */
  private async loadConfiguration(): Promise<void> {
    try {
      const storedConfig = await AsyncStorage.getItem('offline_manager_config');
      if (storedConfig) {
        const parsedConfig = JSON.parse(storedConfig);
        this.config = { ...this.config, ...parsedConfig };
        console.log('Loaded offline manager configuration');
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
    }
  }

  /**
   * Save configuration to storage
   */
  private async saveConfiguration(): Promise<void> {
    try {
      await AsyncStorage.setItem('offline_manager_config', JSON.stringify(this.config));
      console.log('Saved offline manager configuration');
    } catch (error) {
      console.error('Error saving configuration:', error);
    }
  }

  /**
   * Queue an offline action
   */
  async queueAction(
    type: OfflineActionType,
    payload: any,
    targetId?: string | number,
    priority?: ActionPriority
  ): Promise<string> {
    try {
      const actionId = await offlineActionQueue.addAction(
        type,
        payload,
        targetId,
        priority || ActionPriority.MEDIUM
      );

      console.log(`Queued offline action: ${type} (${actionId})`);
      this.emit('onActionQueued', type);

      return actionId;
    } catch (error) {
      console.error('Error queuing offline action:', error);
      this.emit('onActionFailed', type, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Trigger sync manually
   */
  async triggerSync(): Promise<void> {
    try {
      console.log('Triggering sync...');
      this.emit('onSyncStarted');

      // Force process offline action queue
      await offlineActionQueue.forceProcessQueue();

      // Sync high priority items
      await smartSyncManager.forceSyncType(SyncType.MESSAGES);
      await smartSyncManager.forceSyncType(SyncType.CHATS);

      // Get sync stats
      const actionStats = await offlineActionQueue.getQueueStats();
      const syncStats = smartSyncManager.getSyncStats();

      console.log('Sync completed successfully');
      this.emit('onSyncCompleted', syncStats.totalSyncs);
    } catch (error) {
      console.error('Error during sync:', error);
      this.emit('onSyncFailed', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Resolve conflict automatically
   */
  private async resolveConflictAutomatically(conflictId: string): Promise<void> {
    try {
      await conflictResolutionService.resolveConflict(
        conflictId,
        this.config.conflictResolutionStrategy
      );
      console.log(`Auto-resolved conflict: ${conflictId}`);
    } catch (error) {
      console.error(`Error auto-resolving conflict ${conflictId}:`, error);
    }
  }

  /**
   * Add event listener
   */
  addEventListener<K extends keyof OfflineManagerEvents>(
    event: K,
    listener: OfflineManagerEvents[K]
  ): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener<K extends keyof OfflineManagerEvents>(
    event: K,
    listener: OfflineManagerEvents[K]
  ): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.eventListeners.delete(event);
      }
    }
  }

  /**
   * Emit event
   */
  private emit<K extends keyof OfflineManagerEvents>(
    event: K,
    ...args: Parameters<OfflineManagerEvents[K]>
  ): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          (listener as Function)(...args);
        } catch (error) {
          console.error(`Error in offline manager event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Get offline manager status
   */
  async getStatus(): Promise<OfflineManagerStatus> {
    try {
      const offlineState = offlineDetectionService.getState();
      const actionStats = await offlineActionQueue.getQueueStats();
      const syncStats = smartSyncManager.getSyncQueueStatus();
      const conflicts = conflictResolutionService.getPendingConflicts();
      const backgroundSyncStatus = backgroundSyncService.getBackgroundSyncStatus();

      return {
        isInitialized: this.isInitialized,
        isOnline: offlineState.isOnline,
        connectionQuality: offlineState.connectionQuality,
        pendingActions: actionStats.pending,
        pendingSyncItems: syncStats.totalItems,
        pendingConflicts: conflicts.length,
        backgroundSyncEnabled: backgroundSyncStatus.enabled,
        lastSyncTime: backgroundSyncStatus.lastSync,
        offlineDuration: offlineState.offlineDuration,
        services: {
          actionQueue: true,
          conflictResolution: true,
          smartSync: true,
          offlineDetection: true,
          backgroundSync: this.config.enableBackgroundSync
        }
      };
    } catch (error) {
      console.error('Error getting offline manager status:', error);
      throw error;
    }
  }

  /**
   * Get configuration
   */
  getConfiguration(): OfflineManagerConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  async updateConfiguration(newConfig: Partial<OfflineManagerConfig>): Promise<void> {
    try {
      this.config = { ...this.config, ...newConfig };
      await this.saveConfiguration();
      console.log('Updated offline manager configuration');
    } catch (error) {
      console.error('Error updating configuration:', error);
      throw error;
    }
  }

  /**
   * Clear all offline data
   */
  async clearOfflineData(): Promise<void> {
    try {
      console.log('Clearing all offline data...');

      // Clear action queue
      await offlineActionQueue.clearAllActions();

      // Clear sync queue
      await smartSyncManager.clearSyncQueue();

      // Clear conflict resolution data
      await conflictResolutionService.clearResolvedConflicts();

      // Clear connection history
      await offlineDetectionService.clearConnectionHistory();

      // Clear background sync stats
      await backgroundSyncService.clearBackgroundSyncStats();

      console.log('All offline data cleared successfully');
    } catch (error) {
      console.error('Error clearing offline data:', error);
      throw error;
    }
  }

  /**
   * Enable background sync
   */
  async enableBackgroundSync(): Promise<void> {
    try {
      this.config.enableBackgroundSync = true;
      await this.saveConfiguration();
      await backgroundSyncService.enableBackgroundSync();
      console.log('Background sync enabled');
    } catch (error) {
      console.error('Error enabling background sync:', error);
      throw error;
    }
  }

  /**
   * Disable background sync
   */
  async disableBackgroundSync(): Promise<void> {
    try {
      this.config.enableBackgroundSync = false;
      await this.saveConfiguration();
      await backgroundSyncService.disableBackgroundSync();
      console.log('Background sync disabled');
    } catch (error) {
      console.error('Error disabling background sync:', error);
      throw error;
    }
  }

  /**
   * Force background sync
   */
  async forceBackgroundSync(): Promise<void> {
    try {
      await backgroundSyncService.forceBackgroundSync();
      console.log('Background sync forced');
    } catch (error) {
      console.error('Error forcing background sync:', error);
      throw error;
    }
  }

  /**
   * Get pending conflicts
   */
  getPendingConflicts() {
    return conflictResolutionService.getPendingConflicts();
  }

  /**
   * Resolve conflict manually
   */
  async resolveConflict(
    conflictId: string,
    strategy: ConflictResolutionStrategy,
    userInput?: any
  ): Promise<void> {
    try {
      await conflictResolutionService.resolveConflict(conflictId, strategy, userInput);
      console.log(`Manually resolved conflict: ${conflictId}`);
    } catch (error) {
      console.error(`Error resolving conflict ${conflictId}:`, error);
      throw error;
    }
  }

  /**
   * Check if offline
   */
  isOffline(): boolean {
    return !offlineDetectionService.isOnline();
  }

  /**
   * Check if online
   */
  isOnline(): boolean {
    return offlineDetectionService.isOnline();
  }

  /**
   * Get connection quality
   */
  getConnectionQuality(): string {
    return offlineDetectionService.getConnectionQuality();
  }

  /**
   * Get offline duration
   */
  getOfflineDuration(): number {
    return offlineDetectionService.getOfflineDuration();
  }

  /**
   * Get comprehensive stats
   */
  async getStats(): Promise<{
    offlineManager: OfflineManagerStatus;
    actionQueue: any;
    syncManager: any;
    conflicts: any;
    backgroundSync: any;
    connection: any;
  }> {
    try {
      const status = await this.getStatus();
      const actionStats = await offlineActionQueue.getQueueStats();
      const syncStats = smartSyncManager.getSyncStats();
      const conflictStats = await conflictResolutionService.getConflictStats();
      const backgroundSyncStats = backgroundSyncService.getBackgroundSyncStats();
      const connectionStats = offlineDetectionService.getConnectionStats();

      return {
        offlineManager: status,
        actionQueue: actionStats,
        syncManager: syncStats,
        conflicts: conflictStats,
        backgroundSync: backgroundSyncStats,
        connection: connectionStats
      };
    } catch (error) {
      console.error('Error getting comprehensive stats:', error);
      throw error;
    }
  }

  /**
   * Reset offline manager
   */
  async reset(): Promise<void> {
    try {
      console.log('Resetting offline manager...');

      // Stop all services
      await this.stop();

      // Clear all data
      await this.clearOfflineData();

      // Reset configuration
      this.config = { ...this.DEFAULT_CONFIG };
      await this.saveConfiguration();

      // Reinitialize
      await this.initialize();

      console.log('Offline manager reset successfully');
    } catch (error) {
      console.error('Error resetting offline manager:', error);
      throw error;
    }
  }

  /**
   * Stop offline manager
   */
  async stop(): Promise<void> {
    try {
      console.log('Stopping offline manager...');

      // Remove app state subscription
      if (this.appStateSubscription) {
        this.appStateSubscription.remove();
        this.appStateSubscription = null;
      }

      // Stop all services
      offlineActionQueue.stop();
      smartSyncManager.stop();
      conflictResolutionService.stop();
      offlineDetectionService.stop();
      await backgroundSyncService.stop();

      // Clear event listeners
      this.eventListeners.clear();

      this.isInitialized = false;
      console.log('Offline manager stopped successfully');
    } catch (error) {
      console.error('Error stopping offline manager:', error);
      throw error;
    }
  }

  /**
   * Restart offline manager
   */
  async restart(): Promise<void> {
    await this.stop();
    await this.initialize();
  }
}

// Export singleton instance
export const offlineManager = new OfflineManager();

// Export types for external use
export type {
  OfflineManagerConfig
};

// Export all service instances for direct access if needed
export {
  offlineActionQueue,
  conflictResolutionService,
  smartSyncManager,
  offlineDetectionService,
  backgroundSyncService
}; 