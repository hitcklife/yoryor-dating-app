import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { AppState, AppStateStatus } from 'react-native';
import { CONFIG } from '../config';
import { apiClient } from '../api-client';
import { EventEmitter, ConnectionState, ConnectionQuality } from './event-emitter';

type ReconnectStrategy = 'aggressive' | 'balanced' | 'conservative';
type AppActivityState = 'background' | 'idle' | 'activeChatting';

interface ConnectionMetrics {
  quality: ConnectionQuality;
  latencyMs: number;
  packetsLost: number;
  reconnectCount: number;
  lastConnected: Date | null;
  lastDisconnected: Date | null;
}

interface HeartbeatConfig {
  background: number;      // 60 seconds when app is backgrounded
  idle: number;           // 30 seconds when app is active but idle
  activeChatting: number; // 15 seconds when user is actively chatting
}

interface ReconnectionState {
  hasNetwork: boolean;
  priorityChannels: string[];
  lastAttempt: Date | null;
  backoffMultiplier: number;
}

/**
 * Enhanced connection manager with adaptive heartbeat, smart reconnection, and network awareness
 */
export class ConnectionManager {
  private echo: Echo<any> | null = null;
  private pusherClient: Pusher | null = null;
  private eventEmitter: EventEmitter;
  
  // Connection state
  private connectionState: ConnectionState = 'disconnected';
  private initialized: boolean = false;
  private connectionMetrics: ConnectionMetrics = {
    quality: 'offline',
    latencyMs: 0,
    packetsLost: 0,
    reconnectCount: 0,
    lastConnected: null,
    lastDisconnected: null
  };
  
  // Reconnection logic
  private reconnectStrategy: ReconnectStrategy = 'balanced';
  private maxReconnectAttempts: number = 10;
  private reconnectTimeout: any = null;
  private reconnectionState: ReconnectionState = {
    hasNetwork: true,
    priorityChannels: [],
    lastAttempt: null,
    backoffMultiplier: 1
  };
  
  // Adaptive heartbeat system
  private heartbeatInterval: any = null;
  private heartbeatTimer: any = null;
  private appActivityState: AppActivityState = 'idle';
  private heartbeatConfig: HeartbeatConfig = {
    background: 60000,      // 60 seconds
    idle: 30000,           // 30 seconds
    activeChatting: 15000  // 15 seconds
  };
  private lastUserActivity: Date = new Date();
  private userActivityTimeout: any = null;
  private consecutiveFailedHeartbeats: number = 0;
  private maxFailedHeartbeats: number = 3;
  
  // Network & App State monitoring
  private netInfoUnsubscribe: any = null;
  private appStateSubscription: any = null;
  private lastAppState: AppStateStatus = 'active';

  constructor(eventEmitter: EventEmitter) {
    this.eventEmitter = eventEmitter;
    this.setupNetworkMonitoring();
    this.setupAppStateMonitoring();
  }

  /**
   * Initialize connection
   */
  async initialize(): Promise<void> {
    try {
      if (this.connectionState === 'connected' && this.echo && this.pusherClient) {
        console.log('Connection already established');
        return;
      }

      this.setConnectionState('connecting');
      
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No auth token found');
      }

      if (this.pusherClient) {
        this.pusherClient.disconnect();
      }

      // Configure Pusher with optimizations
      this.pusherClient = new Pusher(CONFIG.PUSHER.key, {
        cluster: CONFIG.PUSHER.cluster,
        forceTLS: CONFIG.PUSHER.forceTLS,
        authEndpoint: `${CONFIG.API_URL}/api/v1/broadcasting/auth`,
        auth: {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          }
        },
        activityTimeout: 120000,
        pongTimeout: 30000,
        enabledTransports: ['ws', 'wss'],
        disabledTransports: ['sockjs'],
      });

      this.setupPusherListeners();
      this.setupEcho();
      
      console.log('Connection manager initialized successfully');
    } catch (error) {
      console.error('Error initializing connection:', error);
      this.setConnectionState('failed');
      this.eventEmitter.emit('connection.error', { error, canRetry: true });
      this.attemptSmartReconnect();
    }
  }

  /**
   * Set up Pusher event listeners
   */
  private setupPusherListeners(): void {
    if (!this.pusherClient) return;
    
    this.pusherClient.connection.bind('connected', () => {
      console.log('WebSocket connected successfully');
      this.setConnectionState('connected');
      this.connectionMetrics.lastConnected = new Date();
      this.connectionMetrics.reconnectCount = 0;
      this.reconnectionState.backoffMultiplier = 1;
      this.consecutiveFailedHeartbeats = 0;
      this.updateConnectionQuality('good');
      
      this.startAdaptiveHeartbeat();
    });

    this.pusherClient.connection.bind('disconnected', () => {
      console.log('WebSocket disconnected');
      this.setConnectionState('disconnected');
      this.connectionMetrics.lastDisconnected = new Date();
      this.updateConnectionQuality('offline');
      this.stopHeartbeat();
      
      this.attemptSmartReconnect();
    });

    this.pusherClient.connection.bind('error', (error: any) => {
      console.error('WebSocket connection error:', error);
      this.setConnectionState('failed');
      this.updateConnectionQuality('offline');
      this.eventEmitter.emit('connection.error', { error, canRetry: true });
      this.attemptSmartReconnect();
    });

    this.pusherClient.connection.bind('state_change', (states: any) => {
      console.log(`WebSocket state changed from ${states.previous} to ${states.current}`);
    });
  }

  /**
   * Set up Echo client
   */
  private setupEcho(): void {
    if (!this.pusherClient) return;
    
    this.echo = new Echo({
      broadcaster: 'pusher',
      key: CONFIG.PUSHER.key,
      cluster: CONFIG.PUSHER.cluster,
      forceTLS: CONFIG.PUSHER.forceTLS,
      client: this.pusherClient,
      authorizer: (channel: any) => {
        return {
          authorize: (socketId: string, callback: Function) => {
            apiClient.broadcasting.auth({
              socket_id: socketId,
              channel_name: channel.name
            })
            .then((response: any) => {
              callback(false, response.data);
            })
            .catch((error: any) => {
              console.error('Authorization error:', error);
              callback(true, error);
            });
          }
        };
      }
    });
  }

  /**
   * Set up network monitoring with enhanced logic
   */
  private setupNetworkMonitoring(): void {
    this.netInfoUnsubscribe = NetInfo.addEventListener(state => {
      const hasNetwork = Boolean(state.isConnected) && (state.isInternetReachable === null || state.isInternetReachable === true);
      this.reconnectionState.hasNetwork = hasNetwork;
      
      console.log('Network state changed:', hasNetwork ? 'connected' : 'disconnected');
      
      if (hasNetwork && this.connectionState === 'disconnected') {
        // Reset backoff when network returns
        this.reconnectionState.backoffMultiplier = 1;
        this.attemptSmartReconnect();
      } else if (!hasNetwork && this.connectionState === 'connected') {
        this.updateConnectionQuality('offline');
      }
    });
  }

  /**
   * Set up app state monitoring with activity detection
   */
  private setupAppStateMonitoring(): void {
    this.appStateSubscription = AppState.addEventListener('change', nextAppState => {
      console.log('App state changed:', this.lastAppState, '->', nextAppState);
      
      if (this.lastAppState.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground
        this.setAppActivityState('idle');
        if (this.connectionState !== 'connected') {
          this.attemptSmartReconnect();
        }
      } else if (nextAppState.match(/inactive|background/)) {
        // App went to background
        this.setAppActivityState('background');
      }
      
      this.lastAppState = nextAppState;
    });
  }

  /**
   * Start adaptive heartbeat system
   */
  private startAdaptiveHeartbeat(): void {
    this.stopHeartbeat(); // Stop any existing heartbeat
    
    const getCurrentInterval = (): number => {
      return this.heartbeatConfig[this.appActivityState];
    };

    const scheduleNextHeartbeat = () => {
      const interval = getCurrentInterval();
      
      this.heartbeatInterval = setTimeout(() => {
        this.sendHeartbeat();
        scheduleNextHeartbeat(); // Schedule next heartbeat
      }, interval);
    };

    console.log(`Starting adaptive heartbeat with ${this.appActivityState} interval: ${getCurrentInterval()}ms`);
    scheduleNextHeartbeat();
  }

  /**
   * Send heartbeat with enhanced monitoring
   */
  private sendHeartbeat(): void {
    if (this.pusherClient?.connection?.state !== 'connected') {
      console.warn('Cannot send heartbeat - connection not ready');
      this.consecutiveFailedHeartbeats++;
      this.checkHeartbeatHealth();
      return;
    }

    const startTime = Date.now();
    
    // Clear previous timer
    if (this.heartbeatTimer) {
      clearTimeout(this.heartbeatTimer);
    }
    
    // Set timeout for pong response
    this.heartbeatTimer = setTimeout(() => {
      console.warn('Heartbeat timeout - connection may be poor');
      this.consecutiveFailedHeartbeats++;
      this.checkHeartbeatHealth();
      this.updateConnectionQuality('poor');
    }, 5000);
    
    try {
      // Listen for pong response (one-time listener)
      const pongHandler = (data?: any) => {
        const latency = Date.now() - startTime;
        console.log(`Heartbeat pong received: ${latency}ms (${this.appActivityState} mode)`);
        this.consecutiveFailedHeartbeats = 0;
        this.updateConnectionMetrics(latency);
        
        if (this.heartbeatTimer) {
          clearTimeout(this.heartbeatTimer);
          this.heartbeatTimer = null;
        }
        
        this.pusherClient?.connection?.unbind('pusher:pong', pongHandler);
      };
      
      this.pusherClient.connection.bind('pusher:pong', pongHandler);
      this.pusherClient.connection.send_event('pusher:ping', {});
      
      // Cleanup listener after timeout
      setTimeout(() => {
        if (this.pusherClient?.connection) {
          this.pusherClient.connection.unbind('pusher:pong', pongHandler);
        }
      }, 6000);
      
    } catch (error) {
      console.error('Error sending heartbeat:', error);
      this.consecutiveFailedHeartbeats++;
      this.checkHeartbeatHealth();
      this.updateConnectionQuality('poor');
    }
  }

  /**
   * Check heartbeat health and take action if needed
   */
  private checkHeartbeatHealth(): void {
    if (this.consecutiveFailedHeartbeats >= this.maxFailedHeartbeats) {
      console.warn(`${this.consecutiveFailedHeartbeats} consecutive heartbeat failures, forcing reconnection`);
      this.consecutiveFailedHeartbeats = 0;
      this.forceReconnect();
    }
  }

  /**
   * Stop heartbeat system
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearTimeout(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    if (this.heartbeatTimer) {
      clearTimeout(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Set app activity state and adjust heartbeat
   */
  setAppActivityState(state: AppActivityState): void {
    if (this.appActivityState !== state) {
      console.log(`App activity state changed: ${this.appActivityState} -> ${state}`);
      this.appActivityState = state;
      
      // Update user activity timestamp
      this.lastUserActivity = new Date();
      
      // If connected, restart heartbeat with new interval
      if (this.connectionState === 'connected') {
        this.startAdaptiveHeartbeat();
      }
      
             // Set timeout to automatically transition from activeChatting to idle
       if (state === 'activeChatting') {
         if (this.userActivityTimeout) {
           clearTimeout(this.userActivityTimeout);
         }
         
         this.userActivityTimeout = setTimeout(() => {
           if (this.appActivityState === 'activeChatting') {
             this.setAppActivityState('idle');
           }
         }, 30000); // 30 seconds of inactivity
       }
    }
  }

     /**
    * Notify of user activity (for transitioning to activeChatting state)
    */
   notifyUserActivity(): void {
     this.lastUserActivity = new Date();
     
     if (this.appActivityState === 'idle' && this.lastAppState === 'active') {
       this.setAppActivityState('activeChatting');
     }
   }

  /**
   * Smart reconnection with exponential backoff and network awareness
   */
  private async attemptSmartReconnect(): Promise<void> {
    // Don't attempt reconnection if we already have a pending attempt
    if (this.reconnectTimeout) {
      return;
    }

    // Skip reconnection if no network
    if (!this.reconnectionState.hasNetwork) {
      console.log('No network connection, skipping reconnect attempt');
      this.setConnectionState('disconnected');
      return;
    }

    const token = await AsyncStorage.getItem('auth_token');
    if (!token) {
      console.log('No auth token available, skipping reconnect attempt');
      this.setConnectionState('failed');
      return;
    }

    if (this.connectionMetrics.reconnectCount >= this.maxReconnectAttempts) {
      console.error(`Maximum reconnect attempts (${this.maxReconnectAttempts}) reached. Giving up.`);
      this.setConnectionState('failed');
      this.eventEmitter.emit('connection.error', {
        error: new Error('Max reconnect attempts reached'),
        canRetry: false
      });
      return;
    }

    this.setConnectionState('reconnecting');
    this.connectionMetrics.reconnectCount++;
    this.reconnectionState.lastAttempt = new Date();

    const baseDelay = this.getSmartReconnectDelay();
    const jitter = Math.random() * 1000; // Add jitter to prevent thundering herd
    const delay = baseDelay + jitter;
    
    console.log(`Smart reconnect in ${Math.round(delay / 1000)}s (attempt ${this.connectionMetrics.reconnectCount}/${this.maxReconnectAttempts}, backoff: ${this.reconnectionState.backoffMultiplier}x)`);

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      console.log(`Smart reconnecting... (attempt ${this.connectionMetrics.reconnectCount}/${this.maxReconnectAttempts})`);
      this.initialize();
    }, delay);
  }

  /**
   * Get smart reconnect delay with exponential backoff
   */
  private getSmartReconnectDelay(): number {
    const attempt = this.connectionMetrics.reconnectCount;
    let baseDelay: number;
    
    // Base delay depends on strategy and app state
    switch (this.reconnectStrategy) {
      case 'aggressive':
        baseDelay = this.appActivityState === 'background' ? 2000 : 1000;
        break;
      case 'balanced':
        baseDelay = this.appActivityState === 'background' ? 5000 : 2000;
        break;
      case 'conservative':
        baseDelay = this.appActivityState === 'background' ? 10000 : 5000;
        break;
      default:
        baseDelay = 5000;
    }
    
    // Apply exponential backoff with multiplier
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    const finalDelay = Math.min(exponentialDelay * this.reconnectionState.backoffMultiplier, 60000);
    
    // Increase backoff multiplier for next attempt
    this.reconnectionState.backoffMultiplier = Math.min(this.reconnectionState.backoffMultiplier * 1.5, 4);
    
    return finalDelay;
  }

  /**
   * Set priority channels for reconnection
   */
  setPriorityChannels(channels: string[]): void {
    this.reconnectionState.priorityChannels = [...channels];
    console.log(`Priority channels set: ${channels.join(', ')}`);
  }

  /**
   * Get priority channels for reconnection
   */
  getPriorityChannels(): string[] {
    return [...this.reconnectionState.priorityChannels];
  }

  /**
   * Update connection metrics with enhanced quality detection
   */
  private updateConnectionMetrics(latency: number): void {
    this.connectionMetrics.latencyMs = latency;
    
    // Enhanced quality detection based on latency and app state
    let quality: ConnectionQuality;
    if (latency < 100) {
      quality = 'excellent';
    } else if (latency < 300) {
      quality = 'good';
    } else if (latency < 800) {
      quality = 'poor';
    } else {
      quality = 'offline';
    }
    
    this.updateConnectionQuality(quality);
  }

  /**
   * Update connection quality with channel limit notification
   */
  private updateConnectionQuality(quality: ConnectionQuality): void {
    if (this.connectionMetrics.quality !== quality) {
      const previousQuality = this.connectionMetrics.quality;
      this.connectionMetrics.quality = quality;
      
      console.log(`Connection quality changed: ${previousQuality} -> ${quality}`);
      
      this.eventEmitter.emit('connection.state.changed', {
        state: this.connectionState,
        quality: quality
      });
    }
  }

  /**
   * Set connection state
   */
  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      const previousState = this.connectionState;
      this.connectionState = state;
      this.initialized = state === 'connected';
      
      console.log(`Connection state changed: ${previousState} -> ${state}`);
      
      this.eventEmitter.emit('connection.state.changed', {
        state: this.connectionState,
        quality: this.connectionMetrics.quality
      });
    }
  }

  /**
   * Force reconnect with smart logic
   */
  forceReconnect(): void {
    console.log('Force reconnecting with smart logic...');
    this.connectionMetrics.reconnectCount = 0;
    this.reconnectionState.backoffMultiplier = 1;
    this.disconnect();
    setTimeout(() => {
      this.initialize();
    }, 1000);
  }

  /**
   * Disconnect with cleanup
   */
  disconnect(): void {
    try {
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }

      if (this.userActivityTimeout) {
        clearTimeout(this.userActivityTimeout);
        this.userActivityTimeout = null;
      }

      this.stopHeartbeat();
      this.connectionMetrics.reconnectCount = 0;
      this.consecutiveFailedHeartbeats = 0;
      
      if (this.pusherClient) {
        this.pusherClient.disconnect();
        this.pusherClient = null;
      }

      this.echo = null;
      this.setConnectionState('disconnected');
      this.updateConnectionQuality('offline');

      // Clean up monitoring
      if (this.netInfoUnsubscribe) {
        this.netInfoUnsubscribe();
        this.netInfoUnsubscribe = null;
      }

      if (this.appStateSubscription) {
        this.appStateSubscription.remove();
        this.appStateSubscription = null;
      }

      console.log('Enhanced connection manager disconnected');
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  }

  // Getters
  getEcho(): Echo<any> | null {
    return this.echo;
  }

  getPusherClient(): Pusher | null {
    return this.pusherClient;
  }

  isConnected(): boolean {
    return this.connectionState === 'connected' && this.initialized;
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  getConnectionMetrics(): ConnectionMetrics {
    return { ...this.connectionMetrics };
  }

  getAppActivityState(): AppActivityState {
    return this.appActivityState;
  }

  getReconnectionState(): ReconnectionState {
    return { ...this.reconnectionState };
  }

  setReconnectStrategy(strategy: ReconnectStrategy): void {
    this.reconnectStrategy = strategy;
    console.log(`Reconnect strategy changed to: ${strategy}`);
  }

  /**
   * Get current heartbeat interval
   */
  getCurrentHeartbeatInterval(): number {
    return this.heartbeatConfig[this.appActivityState];
  }

  /**
   * Configure heartbeat intervals
   */
  configureHeartbeat(config: Partial<HeartbeatConfig>): void {
    this.heartbeatConfig = { ...this.heartbeatConfig, ...config };
    console.log('Heartbeat configuration updated:', this.heartbeatConfig);
    
    // Restart heartbeat if connected
    if (this.connectionState === 'connected') {
      this.startAdaptiveHeartbeat();
    }
  }
}

export type { ReconnectStrategy, ConnectionMetrics, AppActivityState, HeartbeatConfig, ReconnectionState }; 