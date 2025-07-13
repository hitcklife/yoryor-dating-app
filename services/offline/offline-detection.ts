import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sqliteService } from '../sqlite-service';

// === OFFLINE STATE INTERFACE ===
export interface OfflineState {
  isOnline: boolean;
  connectionType: ConnectionType;
  connectionQuality: ConnectionQuality;
  lastOnlineTime?: string;
  lastOfflineTime?: string;
  offlineDuration: number; // milliseconds
  connectionHistory: ConnectionEvent[];
}

// === CONNECTION TYPES ===
export enum ConnectionType {
  WIFI = 'wifi',
  CELLULAR = 'cellular',
  ETHERNET = 'ethernet',
  BLUETOOTH = 'bluetooth',
  WIMAX = 'wimax',
  VPN = 'vpn',
  NONE = 'none',
  UNKNOWN = 'unknown'
}

// === CONNECTION QUALITY ===
export enum ConnectionQuality {
  EXCELLENT = 'excellent',  // WiFi, strong signal, fast speed
  GOOD = 'good',           // Cellular, good signal, moderate speed
  POOR = 'poor',           // Weak signal, slow connection
  OFFLINE = 'offline',     // No connection
  UNKNOWN = 'unknown'      // Unable to determine
}

// === CONNECTION EVENT ===
export interface ConnectionEvent {
  id: string;
  timestamp: string;
  type: 'connected' | 'disconnected' | 'quality_changed';
  connectionType: ConnectionType;
  connectionQuality: ConnectionQuality;
  details?: any;
}

// === OFFLINE DETECTION LISTENER ===
export interface OfflineDetectionListener {
  onStateChange: (state: OfflineState) => void;
  onConnectionLost: () => void;
  onConnectionRestored: () => void;
  onQualityChanged: (quality: ConnectionQuality) => void;
}

// === OFFLINE DETECTION SERVICE ===
export class OfflineDetectionService {
  private isInitialized = false;
  private currentState: OfflineState;
  private listeners = new Set<OfflineDetectionListener>();
  private netInfoUnsubscribe: any = null;
  private appStateSubscription: any = null;
  private qualityCheckInterval: any = null;
  private appState: AppStateStatus = 'active';

  // Quality check configuration
  private readonly QUALITY_CHECK_INTERVAL = 10000; // 10 seconds
  private readonly QUALITY_CHECK_TIMEOUT = 5000; // 5 seconds
  private readonly QUALITY_CHECK_URL = 'https://www.google.com/favicon.ico';
  private readonly CONNECTION_HISTORY_LIMIT = 100;

  // Storage keys
  private readonly OFFLINE_STATE_KEY = 'offline_state';
  private readonly CONNECTION_HISTORY_KEY = 'connection_history';

  constructor() {
    this.currentState = {
      isOnline: false,
      connectionType: ConnectionType.NONE,
      connectionQuality: ConnectionQuality.OFFLINE,
      offlineDuration: 0,
      connectionHistory: []
    };
  }

  /**
   * Initialize the offline detection service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Create offline state table
      await this.createOfflineStateTable();
      
      // Load previous state
      await this.loadOfflineState();
      
      // Set up network monitoring
      this.setupNetworkMonitoring();
      
      // Set up app state monitoring
      this.setupAppStateMonitoring();
      
      // Start quality checking
      this.startQualityChecking();
      
      // Get initial network state
      await this.updateNetworkState();
      
      this.isInitialized = true;
      console.log('Offline detection service initialized successfully');
    } catch (error) {
      console.error('Error initializing offline detection service:', error);
      throw error instanceof Error ? error : new Error('Failed to initialize offline detection service');
    }
  }

  /**
   * Create offline state table
   */
  private async createOfflineStateTable(): Promise<void> {
    await sqliteService.executeSql(`
      CREATE TABLE IF NOT EXISTS offline_state (
        id INTEGER PRIMARY KEY,
        is_online INTEGER NOT NULL,
        connection_type TEXT NOT NULL,
        connection_quality TEXT NOT NULL,
        last_online_time TEXT,
        last_offline_time TEXT,
        offline_duration INTEGER NOT NULL,
        connection_history TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // Create connection events table
    await sqliteService.executeSql(`
      CREATE TABLE IF NOT EXISTS connection_events (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        type TEXT NOT NULL,
        connection_type TEXT NOT NULL,
        connection_quality TEXT NOT NULL,
        details TEXT,
        created_at TEXT NOT NULL
      )
    `);

    // Create index for connection events
    await sqliteService.executeSql(`
      CREATE INDEX IF NOT EXISTS idx_connection_events_timestamp 
      ON connection_events(timestamp)
    `);
  }

  /**
   * Load offline state from storage
   */
  private async loadOfflineState(): Promise<void> {
    try {
      // Try to load from SQLite first
      const sql = `
        SELECT * FROM offline_state 
        ORDER BY updated_at DESC 
        LIMIT 1
      `;
      
      const result = await sqliteService.executeSql(sql);
      
      if (result.length > 0) {
        const row = result[0];
        this.currentState = {
          isOnline: row.is_online === 1,
          connectionType: row.connection_type as ConnectionType,
          connectionQuality: row.connection_quality as ConnectionQuality,
          lastOnlineTime: row.last_online_time,
          lastOfflineTime: row.last_offline_time,
          offlineDuration: row.offline_duration,
          connectionHistory: row.connection_history ? JSON.parse(row.connection_history) : []
        };
      } else {
        // Fallback to AsyncStorage
        const storedState = await AsyncStorage.getItem(this.OFFLINE_STATE_KEY);
        if (storedState) {
          this.currentState = JSON.parse(storedState);
        }
      }
      
      // Load connection history
      await this.loadConnectionHistory();
      
      console.log('Loaded offline state:', this.currentState);
    } catch (error) {
      console.error('Error loading offline state:', error);
    }
  }

  /**
   * Load connection history from database
   */
  private async loadConnectionHistory(): Promise<void> {
    try {
      const sql = `
        SELECT * FROM connection_events 
        ORDER BY timestamp DESC 
        LIMIT ?
      `;
      
      const result = await sqliteService.executeSql(sql, [this.CONNECTION_HISTORY_LIMIT]);
      
      this.currentState.connectionHistory = result.map((row: any) => ({
        id: row.id,
        timestamp: row.timestamp,
        type: row.type,
        connectionType: row.connection_type,
        connectionQuality: row.connection_quality,
        details: row.details ? JSON.parse(row.details) : undefined
      }));
      
    } catch (error) {
      console.error('Error loading connection history:', error);
    }
  }

  /**
   * Save offline state to storage
   */
  private async saveOfflineState(): Promise<void> {
    try {
      // Save to SQLite
      const sql = `
        INSERT OR REPLACE INTO offline_state (
          id, is_online, connection_type, connection_quality, 
          last_online_time, last_offline_time, offline_duration, 
          connection_history, created_at, updated_at
        ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const now = new Date().toISOString();
      
      await sqliteService.executeSql(sql, [
        this.currentState.isOnline ? 1 : 0,
        this.currentState.connectionType,
        this.currentState.connectionQuality,
        this.currentState.lastOnlineTime,
        this.currentState.lastOfflineTime,
        this.currentState.offlineDuration,
        JSON.stringify(this.currentState.connectionHistory),
        now,
        now
      ]);
      
      // Also save to AsyncStorage as backup
      await AsyncStorage.setItem(this.OFFLINE_STATE_KEY, JSON.stringify(this.currentState));
      
    } catch (error) {
      console.error('Error saving offline state:', error);
    }
  }

  /**
   * Setup network monitoring
   */
  private setupNetworkMonitoring(): void {
    this.netInfoUnsubscribe = NetInfo.addEventListener(state => {
      this.handleNetworkStateChange(state);
    });
  }

  /**
   * Setup app state monitoring
   */
  private setupAppStateMonitoring(): void {
    this.appStateSubscription = AppState.addEventListener('change', nextAppState => {
      const previousState = this.appState;
      this.appState = nextAppState;
      
      console.log(`App state changed: ${previousState} -> ${nextAppState}`);
      
      // Update network state when app becomes active
      if (previousState.match(/inactive|background/) && nextAppState === 'active') {
        this.updateNetworkState();
      }
    });
  }

  /**
   * Start quality checking
   */
  private startQualityChecking(): void {
    if (this.qualityCheckInterval) {
      clearInterval(this.qualityCheckInterval);
    }

    this.qualityCheckInterval = setInterval(() => {
      if (this.currentState.isOnline && this.appState === 'active') {
        this.checkConnectionQuality();
      }
    }, this.QUALITY_CHECK_INTERVAL);
  }

  /**
   * Handle network state change
   */
  private async handleNetworkStateChange(state: NetInfoState): Promise<void> {
    const wasOnline = this.currentState.isOnline;
    const previousQuality = this.currentState.connectionQuality;
    
    // Determine if we're online
    const isOnline = !!(state.isConnected && state.isInternetReachable);
    
    // Map connection type
    const connectionType = this.mapConnectionType(state.type);
    
    // Determine initial quality
    let connectionQuality = this.determineConnectionQuality(state);
    
    // Update state
    const now = new Date().toISOString();
    
    this.currentState = {
      ...this.currentState,
      isOnline,
      connectionType,
      connectionQuality,
      lastOnlineTime: isOnline ? now : this.currentState.lastOnlineTime,
      lastOfflineTime: !isOnline ? now : this.currentState.lastOfflineTime,
      offlineDuration: !isOnline && this.currentState.lastOfflineTime 
        ? Date.now() - new Date(this.currentState.lastOfflineTime).getTime()
        : 0
    };
    
    // Add connection event
    await this.addConnectionEvent(
      wasOnline !== isOnline ? (isOnline ? 'connected' : 'disconnected') : 'quality_changed',
      connectionType,
      connectionQuality,
      { netInfoState: state }
    );
    
    // Save state
    await this.saveOfflineState();
    
    // Notify listeners
    this.notifyListeners(wasOnline, previousQuality);
    
    console.log(`Network state changed: ${isOnline ? 'online' : 'offline'} (${connectionType}/${connectionQuality})`);
  }

  /**
   * Update network state manually
   */
  private async updateNetworkState(): Promise<void> {
    try {
      const state = await NetInfo.fetch();
      await this.handleNetworkStateChange(state);
    } catch (error) {
      console.error('Error updating network state:', error);
    }
  }

  /**
   * Map NetInfo connection type to our enum
   */
  private mapConnectionType(type: string | null): ConnectionType {
    switch (type) {
      case 'wifi':
        return ConnectionType.WIFI;
      case 'cellular':
        return ConnectionType.CELLULAR;
      case 'ethernet':
        return ConnectionType.ETHERNET;
      case 'bluetooth':
        return ConnectionType.BLUETOOTH;
      case 'wimax':
        return ConnectionType.WIMAX;
      case 'vpn':
        return ConnectionType.VPN;
      case 'none':
        return ConnectionType.NONE;
      default:
        return ConnectionType.UNKNOWN;
    }
  }

  /**
   * Determine connection quality from NetInfo state
   */
  private determineConnectionQuality(state: NetInfoState): ConnectionQuality {
    if (!state.isConnected) {
      return ConnectionQuality.OFFLINE;
    }

    // WiFi connections are generally excellent
    if (state.type === 'wifi') {
      return ConnectionQuality.EXCELLENT;
    }

    // Cellular connections depend on generation
    if (state.type === 'cellular') {
      const details = state.details as any;
      const cellularGeneration = details?.cellularGeneration;
      
      if (cellularGeneration === '5g') {
        return ConnectionQuality.EXCELLENT;
      } else if (cellularGeneration === '4g') {
        return ConnectionQuality.GOOD;
      } else if (cellularGeneration === '3g') {
        return ConnectionQuality.POOR;
      } else {
        return ConnectionQuality.POOR;
      }
    }

    // Ethernet is generally excellent
    if (state.type === 'ethernet') {
      return ConnectionQuality.EXCELLENT;
    }

    // Other connections are good by default
    return ConnectionQuality.GOOD;
  }

  /**
   * Check connection quality by making a test request
   */
  private async checkConnectionQuality(): Promise<void> {
    if (!this.currentState.isOnline) return;

    try {
      const startTime = Date.now();
      
      // Make a small test request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.QUALITY_CHECK_TIMEOUT);
      
      const response = await fetch(this.QUALITY_CHECK_URL, {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-cache'
      });
      
      clearTimeout(timeoutId);
      
      const responseTime = Date.now() - startTime;
      
      // Determine quality based on response time
      let newQuality: ConnectionQuality;
      
      if (response.ok) {
        if (responseTime < 1000) {
          newQuality = ConnectionQuality.EXCELLENT;
        } else if (responseTime < 3000) {
          newQuality = ConnectionQuality.GOOD;
        } else {
          newQuality = ConnectionQuality.POOR;
        }
      } else {
        newQuality = ConnectionQuality.POOR;
      }
      
      // Update quality if it changed
      if (newQuality !== this.currentState.connectionQuality) {
        const previousQuality = this.currentState.connectionQuality;
        this.currentState.connectionQuality = newQuality;
        
        await this.addConnectionEvent(
          'quality_changed',
          this.currentState.connectionType,
          newQuality,
          { responseTime, status: response.status }
        );
        
        await this.saveOfflineState();
        
        // Notify listeners
        this.listeners.forEach(listener => {
          try {
            listener.onQualityChanged(newQuality);
            listener.onStateChange(this.currentState);
          } catch (error) {
            console.error('Error in offline detection listener:', error);
          }
        });
        
        console.log(`Connection quality changed: ${previousQuality} -> ${newQuality} (${responseTime}ms)`);
      }
      
    } catch (error) {
      // If test request fails, consider quality as poor
      if (this.currentState.connectionQuality !== ConnectionQuality.POOR) {
        const previousQuality = this.currentState.connectionQuality;
        this.currentState.connectionQuality = ConnectionQuality.POOR;
        
        await this.addConnectionEvent(
          'quality_changed',
          this.currentState.connectionType,
          ConnectionQuality.POOR,
          { error: error instanceof Error ? error.message : 'Unknown error' }
        );
        
        await this.saveOfflineState();
        
        // Notify listeners
        this.listeners.forEach(listener => {
          try {
            listener.onQualityChanged(ConnectionQuality.POOR);
            listener.onStateChange(this.currentState);
          } catch (error) {
            console.error('Error in offline detection listener:', error);
          }
        });
        
        console.log(`Connection quality changed: ${previousQuality} -> poor (test failed)`);
      }
    }
  }

  /**
   * Add connection event to history
   */
  private async addConnectionEvent(
    type: 'connected' | 'disconnected' | 'quality_changed',
    connectionType: ConnectionType,
    connectionQuality: ConnectionQuality,
    details?: any
  ): Promise<void> {
    const event: ConnectionEvent = {
      id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      type,
      connectionType,
      connectionQuality,
      details
    };

    // Add to memory
    this.currentState.connectionHistory.unshift(event);
    
    // Keep only the last N events
    if (this.currentState.connectionHistory.length > this.CONNECTION_HISTORY_LIMIT) {
      this.currentState.connectionHistory = this.currentState.connectionHistory.slice(0, this.CONNECTION_HISTORY_LIMIT);
    }

    // Save to database
    try {
      const sql = `
        INSERT INTO connection_events (
          id, timestamp, type, connection_type, connection_quality, details, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      
      await sqliteService.executeSql(sql, [
        event.id,
        event.timestamp,
        event.type,
        event.connectionType,
        event.connectionQuality,
        event.details ? JSON.stringify(event.details) : null,
        event.timestamp
      ]);
    } catch (error) {
      console.error('Error saving connection event:', error);
    }
  }

  /**
   * Notify listeners of state changes
   */
  private notifyListeners(wasOnline: boolean, previousQuality: ConnectionQuality): void {
    this.listeners.forEach(listener => {
      try {
        // Always notify of state change
        listener.onStateChange(this.currentState);
        
        // Notify of connection status change
        if (wasOnline !== this.currentState.isOnline) {
          if (this.currentState.isOnline) {
            listener.onConnectionRestored();
          } else {
            listener.onConnectionLost();
          }
        }
        
        // Notify of quality change
        if (previousQuality !== this.currentState.connectionQuality) {
          listener.onQualityChanged(this.currentState.connectionQuality);
        }
      } catch (error) {
        console.error('Error in offline detection listener:', error);
      }
    });
  }

  /**
   * Add listener for offline state changes
   */
  addListener(listener: OfflineDetectionListener): void {
    this.listeners.add(listener);
  }

  /**
   * Remove listener
   */
  removeListener(listener: OfflineDetectionListener): void {
    this.listeners.delete(listener);
  }

  /**
   * Get current offline state
   */
  getState(): OfflineState {
    return { ...this.currentState };
  }

  /**
   * Get connection history
   */
  getConnectionHistory(): ConnectionEvent[] {
    return [...this.currentState.connectionHistory];
  }

  /**
   * Check if currently online
   */
  isOnline(): boolean {
    return this.currentState.isOnline;
  }

  /**
   * Check if currently offline
   */
  isOffline(): boolean {
    return !this.currentState.isOnline;
  }

  /**
   * Get current connection type
   */
  getConnectionType(): ConnectionType {
    return this.currentState.connectionType;
  }

  /**
   * Get current connection quality
   */
  getConnectionQuality(): ConnectionQuality {
    return this.currentState.connectionQuality;
  }

  /**
   * Get offline duration in milliseconds
   */
  getOfflineDuration(): number {
    if (this.currentState.isOnline) {
      return 0;
    }
    
    if (this.currentState.lastOfflineTime) {
      return Date.now() - new Date(this.currentState.lastOfflineTime).getTime();
    }
    
    return this.currentState.offlineDuration;
  }

  /**
   * Force refresh network state
   */
  async refreshNetworkState(): Promise<void> {
    await this.updateNetworkState();
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): {
    totalEvents: number;
    connections: number;
    disconnections: number;
    qualityChanges: number;
    averageOnlineTime: number;
    averageOfflineTime: number;
    connectionsByType: Record<ConnectionType, number>;
    qualityDistribution: Record<ConnectionQuality, number>;
  } {
    const history = this.currentState.connectionHistory;
    
    const stats = {
      totalEvents: history.length,
      connections: 0,
      disconnections: 0,
      qualityChanges: 0,
      averageOnlineTime: 0,
      averageOfflineTime: 0,
      connectionsByType: {} as Record<ConnectionType, number>,
      qualityDistribution: {} as Record<ConnectionQuality, number>
    };
    
    history.forEach(event => {
      switch (event.type) {
        case 'connected':
          stats.connections++;
          break;
        case 'disconnected':
          stats.disconnections++;
          break;
        case 'quality_changed':
          stats.qualityChanges++;
          break;
      }
      
      stats.connectionsByType[event.connectionType] = (stats.connectionsByType[event.connectionType] || 0) + 1;
      stats.qualityDistribution[event.connectionQuality] = (stats.qualityDistribution[event.connectionQuality] || 0) + 1;
    });
    
    return stats;
  }

  /**
   * Clear connection history
   */
  async clearConnectionHistory(): Promise<void> {
    this.currentState.connectionHistory = [];
    await this.saveOfflineState();
    
    // Clear database
    await sqliteService.executeSql('DELETE FROM connection_events');
  }

  /**
   * Generate event ID
   */
  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Stop the offline detection service
   */
  stop(): void {
    if (this.netInfoUnsubscribe) {
      this.netInfoUnsubscribe();
      this.netInfoUnsubscribe = null;
    }
    
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    
    if (this.qualityCheckInterval) {
      clearInterval(this.qualityCheckInterval);
      this.qualityCheckInterval = null;
    }
    
    this.listeners.clear();
    this.isInitialized = false;
  }

  /**
   * Restart the offline detection service
   */
  restart(): void {
    this.stop();
    this.initialize();
  }
}

// Export singleton instance
export const offlineDetectionService = new OfflineDetectionService(); 