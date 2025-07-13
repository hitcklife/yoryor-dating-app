import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

import { offlineActionQueue } from './action-queue';
import { smartSyncManager, SyncType, SyncPriority } from './smart-sync-manager';
import { offlineDetectionService } from './offline-detection';
import { conflictResolutionService, ConflictResolutionStrategy } from './conflict-resolution';

// === BACKGROUND SYNC CONFIGURATION ===
const BACKGROUND_SYNC_TASK = 'background-sync';
const BACKGROUND_SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes
const MAX_BACKGROUND_SYNC_TIME = 25 * 1000; // 25 seconds (iOS background limit is 30s)
const SYNC_NOTIFICATION_CHANNEL = 'background-sync';

// === BACKGROUND SYNC STATS ===
interface BackgroundSyncStats {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  lastRunTime?: string;
  lastRunDuration: number;
  averageRunTime: number;
  itemsSynced: number;
  conflictsResolved: number;
  errors: string[];
}

// === BACKGROUND SYNC RESULT ===
interface BackgroundSyncResult {
  success: boolean;
  duration: number;
  itemsSynced: number;
  conflictsResolved: number;
  errors: string[];
  nextScheduledSync?: string;
}

// === SYNC PRIORITY CONFIGURATION ===
const BACKGROUND_SYNC_PRIORITIES = [
  SyncPriority.CRITICAL,
  SyncPriority.HIGH,
  SyncPriority.MEDIUM
];

const BACKGROUND_SYNC_TYPES = [
  SyncType.MESSAGES,
  SyncType.CHATS,
  SyncType.NOTIFICATIONS
];

// === BACKGROUND SYNC SERVICE ===
export class BackgroundSyncService {
  private isInitialized = false;
  private isBackgroundTaskRegistered = false;
  private appState: AppStateStatus = 'active';
  private backgroundSyncStats: BackgroundSyncStats = {
    totalRuns: 0,
    successfulRuns: 0,
    failedRuns: 0,
    lastRunDuration: 0,
    averageRunTime: 0,
    itemsSynced: 0,
    conflictsResolved: 0,
    errors: []
  };
  private appStateSubscription: any = null;
  private backgroundTimer: any = null;
  private syncInProgress = false;

  // Configuration
  private readonly STORAGE_KEY = 'background_sync_stats';
  private readonly NOTIFICATION_ENABLED = true;
  private readonly AUTO_RESOLVE_CONFLICTS = true;
  private readonly MAX_ERRORS_TO_STORE = 10;

  /**
   * Initialize the background sync service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load previous stats
      await this.loadBackgroundSyncStats();
      
      // Register background task
      await this.registerBackgroundTask();
      
      // Set up app state monitoring
      this.setupAppStateMonitoring();
      
      // Set up notification channel
      await this.setupNotificationChannel();
      
      this.isInitialized = true;
      console.log('Background sync service initialized successfully');
    } catch (error) {
      console.error('Error initializing background sync service:', error);
      throw error instanceof Error ? error : new Error('Failed to initialize background sync service');
    }
  }

  /**
   * Register the background task
   */
  private async registerBackgroundTask(): Promise<void> {
    try {
      // Define the background task
      TaskManager.defineTask(BACKGROUND_SYNC_TASK, async ({ data, error }) => {
        if (error) {
          console.error('Background task error:', error);
          return;
        }

        console.log('Background sync task started');
        
        try {
          const result = await this.performBackgroundSync();
          
          if (result.success) {
            console.log(`Background sync completed: ${result.itemsSynced} items synced`);
            
            // Show notification if items were synced
            if (result.itemsSynced > 0 && this.NOTIFICATION_ENABLED) {
              await this.showSyncNotification(result.itemsSynced);
            }
          } else {
            console.error('Background sync failed:', result.errors);
          }
        } catch (error) {
          console.error('Error in background sync task:', error);
        }
      });

      // Check if background task is already registered
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
      
      if (!isRegistered) {
        // Register the background task
        await BackgroundTask.registerTaskAsync(BACKGROUND_SYNC_TASK, {
          minimumInterval: BACKGROUND_SYNC_INTERVAL
        });
        
        this.isBackgroundTaskRegistered = true;
        console.log('Background sync task registered successfully');
      } else {
        this.isBackgroundTaskRegistered = true;
        console.log('Background sync task already registered');
      }
    } catch (error) {
      console.error('Error registering background task:', error);
      throw error;
    }
  }

  /**
   * Setup app state monitoring
   */
  private setupAppStateMonitoring(): void {
    this.appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      const previousState = this.appState;
      this.appState = nextAppState;
      
      console.log(`App state changed: ${previousState} -> ${nextAppState}`);
      
      if (previousState === 'active' && nextAppState === 'background') {
        // App went to background - start background sync
        this.startBackgroundSync();
      } else if (previousState === 'background' && nextAppState === 'active') {
        // App came to foreground - stop background sync
        this.stopBackgroundSync();
      }
    });
  }

  /**
   * Setup notification channel
   */
  private async setupNotificationChannel(): Promise<void> {
    try {
      await Notifications.setNotificationChannelAsync(SYNC_NOTIFICATION_CHANNEL, {
        name: 'Background Sync',
        importance: Notifications.AndroidImportance.LOW,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: null,
        badge: null,
        enableVibrate: null
      });
    } catch (error) {
      console.error('Error setting up notification channel:', error);
    }
  }

  /**
   * Start background sync
   */
  private async startBackgroundSync(): Promise<void> {
    if (!this.isBackgroundTaskRegistered) {
      console.log('Background task not registered, skipping background sync');
      return;
    }

    try {
      // Background sync will be handled by the task manager
      console.log('Background sync task is registered and will run automatically');
      
      console.log('Background sync started');
      
      // Also schedule immediate sync
      this.scheduleImmediateBackgroundSync();
    } catch (error) {
      console.error('Error starting background sync:', error);
    }
  }

  /**
   * Stop background sync
   */
  private async stopBackgroundSync(): Promise<void> {
    try {
      // Background task will be stopped by the task manager
      console.log('Background sync task stopped');
      
      if (this.backgroundTimer) {
        clearTimeout(this.backgroundTimer);
        this.backgroundTimer = null;
      }
      
      console.log('Background sync stopped');
    } catch (error) {
      console.error('Error stopping background sync:', error);
    }
  }

  /**
   * Schedule immediate background sync
   */
  private scheduleImmediateBackgroundSync(): void {
    if (this.backgroundTimer) {
      clearTimeout(this.backgroundTimer);
    }

    this.backgroundTimer = setTimeout(async () => {
      if (this.appState === 'background') {
        await this.performBackgroundSync();
      }
    }, 2000); // 2 seconds delay
  }

  /**
   * Perform background sync
   */
  private async performBackgroundSync(): Promise<BackgroundSyncResult> {
    if (this.syncInProgress) {
      return {
        success: false,
        duration: 0,
        itemsSynced: 0,
        conflictsResolved: 0,
        errors: ['Sync already in progress']
      };
    }

    this.syncInProgress = true;
    const startTime = Date.now();
    let itemsSynced = 0;
    let conflictsResolved = 0;
    const errors: string[] = [];

    try {
      // Check if we're online
      const isOnline = offlineDetectionService.isOnline();
      if (!isOnline) {
        throw new Error('Device is offline');
      }

      // Get pending action queue stats
      const actionQueueStats = await offlineActionQueue.getQueueStats();
      
      if (actionQueueStats.pending === 0) {
        console.log('No pending actions to sync');
        return {
          success: true,
          duration: Date.now() - startTime,
          itemsSynced: 0,
          conflictsResolved: 0,
          errors: []
        };
      }

      console.log(`Starting background sync with ${actionQueueStats.pending} pending actions`);

      // Force process the offline action queue
      await offlineActionQueue.forceProcessQueue();

      // Wait a bit for processing to complete
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Get updated stats
      const updatedStats = await offlineActionQueue.getQueueStats();
      itemsSynced = actionQueueStats.pending - updatedStats.pending;

      // Sync high priority items through smart sync manager
      await this.syncHighPriorityItems();

      // Resolve conflicts if auto-resolution is enabled
      if (this.AUTO_RESOLVE_CONFLICTS) {
        conflictsResolved = await this.resolveConflictsAutomatically();
      }

      // Update stats
      const duration = Date.now() - startTime;
      await this.updateBackgroundSyncStats(true, duration, itemsSynced, conflictsResolved, errors);

      console.log(`Background sync completed: ${itemsSynced} items synced, ${conflictsResolved} conflicts resolved`);

      return {
        success: true,
        duration,
        itemsSynced,
        conflictsResolved,
        errors,
        nextScheduledSync: new Date(Date.now() + BACKGROUND_SYNC_INTERVAL).toISOString()
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMessage);
      
      console.error('Background sync failed:', error);
      
      const duration = Date.now() - startTime;
      await this.updateBackgroundSyncStats(false, duration, itemsSynced, conflictsResolved, errors);

      return {
        success: false,
        duration,
        itemsSynced,
        conflictsResolved,
        errors
      };
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Sync high priority items through smart sync manager
   */
  private async syncHighPriorityItems(): Promise<void> {
    try {
      // Add critical sync items
      for (const syncType of BACKGROUND_SYNC_TYPES) {
        await smartSyncManager.addSyncItem(
          syncType,
          SyncPriority.CRITICAL,
          undefined,
          { background: true, immediate: true }
        );
      }

      // Force sync processing
      console.log('High priority sync items added to queue');
    } catch (error) {
      console.error('Error syncing high priority items:', error);
    }
  }

  /**
   * Resolve conflicts automatically
   */
  private async resolveConflictsAutomatically(): Promise<number> {
    try {
      const pendingConflicts = conflictResolutionService.getPendingConflicts();
      let resolvedCount = 0;

      for (const conflict of pendingConflicts) {
        try {
          // Use last writer wins strategy for background resolution
          const result = await conflictResolutionService.resolveConflict(
            conflict.id,
            ConflictResolutionStrategy.LAST_WRITER_WINS
          );

          if (result.success) {
            resolvedCount++;
          }
        } catch (error) {
          console.error(`Error resolving conflict ${conflict.id}:`, error);
        }
      }

      return resolvedCount;
    } catch (error) {
      console.error('Error resolving conflicts automatically:', error);
      return 0;
    }
  }

  /**
   * Show sync notification
   */
  private async showSyncNotification(itemsSynced: number): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Sync Complete',
          body: `${itemsSynced} items synced successfully`,
          data: { type: 'background_sync' },
          sound: false,
          badge: 0
        },
        trigger: null,
        identifier: 'background-sync-notification'
      });
    } catch (error) {
      console.error('Error showing sync notification:', error);
    }
  }

  /**
   * Load background sync stats from storage
   */
  private async loadBackgroundSyncStats(): Promise<void> {
    try {
      const storedStats = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (storedStats) {
        this.backgroundSyncStats = JSON.parse(storedStats);
      }
    } catch (error) {
      console.error('Error loading background sync stats:', error);
    }
  }

  /**
   * Update background sync stats
   */
  private async updateBackgroundSyncStats(
    success: boolean,
    duration: number,
    itemsSynced: number,
    conflictsResolved: number,
    errors: string[]
  ): Promise<void> {
    try {
      this.backgroundSyncStats.totalRuns++;
      
      if (success) {
        this.backgroundSyncStats.successfulRuns++;
      } else {
        this.backgroundSyncStats.failedRuns++;
      }
      
      this.backgroundSyncStats.lastRunTime = new Date().toISOString();
      this.backgroundSyncStats.lastRunDuration = duration;
      this.backgroundSyncStats.itemsSynced += itemsSynced;
      this.backgroundSyncStats.conflictsResolved += conflictsResolved;
      
      // Update average run time
      this.backgroundSyncStats.averageRunTime = Math.round(
        (this.backgroundSyncStats.averageRunTime * (this.backgroundSyncStats.totalRuns - 1) + duration) / 
        this.backgroundSyncStats.totalRuns
      );
      
      // Add errors (keep only last N errors)
      if (errors.length > 0) {
        this.backgroundSyncStats.errors.push(...errors);
        if (this.backgroundSyncStats.errors.length > this.MAX_ERRORS_TO_STORE) {
          this.backgroundSyncStats.errors = this.backgroundSyncStats.errors.slice(-this.MAX_ERRORS_TO_STORE);
        }
      }
      
      // Save to storage
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.backgroundSyncStats));
    } catch (error) {
      console.error('Error updating background sync stats:', error);
    }
  }

  /**
   * Force background sync (for testing)
   */
  async forceBackgroundSync(): Promise<BackgroundSyncResult> {
    return this.performBackgroundSync();
  }

  /**
   * Get background sync stats
   */
  getBackgroundSyncStats(): BackgroundSyncStats {
    return { ...this.backgroundSyncStats };
  }

  /**
   * Check if background sync is enabled
   */
  isBackgroundSyncEnabled(): boolean {
    return this.isBackgroundTaskRegistered;
  }

  /**
   * Enable background sync
   */
  async enableBackgroundSync(): Promise<void> {
    if (!this.isBackgroundTaskRegistered) {
      await this.registerBackgroundTask();
    }
    
    if (this.appState === 'background') {
      await this.startBackgroundSync();
    }
  }

  /**
   * Disable background sync
   */
  async disableBackgroundSync(): Promise<void> {
    if (this.isBackgroundTaskRegistered) {
      try {
        await BackgroundTask.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
        this.isBackgroundTaskRegistered = false;
        console.log('Background sync disabled');
      } catch (error) {
        console.error('Error disabling background sync:', error);
      }
    }
  }

  /**
   * Clear background sync stats
   */
  async clearBackgroundSyncStats(): Promise<void> {
    this.backgroundSyncStats = {
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
      lastRunDuration: 0,
      averageRunTime: 0,
      itemsSynced: 0,
      conflictsResolved: 0,
      errors: []
    };
    
    await AsyncStorage.removeItem(this.STORAGE_KEY);
  }

  /**
   * Get background sync status
   */
  getBackgroundSyncStatus(): {
    enabled: boolean;
    appState: AppStateStatus;
    syncInProgress: boolean;
    lastSync?: string;
    nextScheduledSync?: string;
  } {
    return {
      enabled: this.isBackgroundTaskRegistered,
      appState: this.appState,
      syncInProgress: this.syncInProgress,
      lastSync: this.backgroundSyncStats.lastRunTime,
      nextScheduledSync: this.backgroundSyncStats.lastRunTime 
        ? new Date(new Date(this.backgroundSyncStats.lastRunTime).getTime() + BACKGROUND_SYNC_INTERVAL).toISOString()
        : undefined
    };
  }

  /**
   * Schedule sync for specific time
   */
  async scheduleSyncAt(date: Date): Promise<void> {
    try {
      const delay = date.getTime() - Date.now();
      
      if (delay > 0) {
        setTimeout(async () => {
          if (this.appState === 'background') {
            await this.performBackgroundSync();
          }
        }, delay);
        
        console.log(`Sync scheduled for ${date.toISOString()}`);
      }
    } catch (error) {
      console.error('Error scheduling sync:', error);
    }
  }

  /**
   * Stop the background sync service
   */
  async stop(): Promise<void> {
    try {
      await this.stopBackgroundSync();
      
      if (this.appStateSubscription) {
        this.appStateSubscription.remove();
        this.appStateSubscription = null;
      }
      
      if (this.backgroundTimer) {
        clearTimeout(this.backgroundTimer);
        this.backgroundTimer = null;
      }
      
      this.isInitialized = false;
      console.log('Background sync service stopped');
    } catch (error) {
      console.error('Error stopping background sync service:', error);
    }
  }

  /**
   * Restart the background sync service
   */
  async restart(): Promise<void> {
    await this.stop();
    await this.initialize();
  }
}

// Export singleton instance
export const backgroundSyncService = new BackgroundSyncService(); 