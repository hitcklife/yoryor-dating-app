import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationService } from './notification-service';
import { apiClient } from './api-client';
import { CONFIG } from '@/services/config';
import NetInfo from '@react-native-community/netinfo';
import { AppState, AppStateStatus } from 'react-native';

// === UNIFIED EVENT SYSTEM ===
interface ChatMessage {
  id: number;
  chat_id: number;
  sender_id: number;
  content: string;
  message_type: string;
  created_at: string;
  updated_at: string;
  is_mine: boolean;
  sender?: {
    id: number;
    name: string;
    avatar?: string;
  };
}

interface ReadReceipt {
  message_id: number;
  user_id: number;
  read_at: string;
}

interface TypingIndicator {
  user_id: number;
  user_name: string;
  chat_id: number;
  is_typing: boolean;
}

interface Match {
  id: number;
  user_id: number;
  matched_user_id: number;
  name?: string;
  avatar?: string;
  created_at: string;
}

interface Like {
  id: number;
  user_id: number;
  liked_user_id: number;
  name?: string;
  avatar?: string;
  created_at: string;
}

interface IncomingCall {
  id: string;
  caller_id: number;
  caller_name: string;
  caller_avatar?: string;
  call_type: 'audio' | 'video';
  channel_name: string;
  token: string;
  created_at: string;
}

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  data?: any;
  created_at: string;
}

interface UnreadUpdate {
  chat_id?: number;
  count: number;
  total_count: number;
}

interface PresenceUser {
  id: number;
  name: string;
  avatar?: string;
  last_seen?: string;
  is_online: boolean;
}

interface PresenceEvent {
  user: PresenceUser;
  timestamp: string;
}

interface TypingStatus {
  user_id: number;
  user_name: string;
  chat_id: number;
  is_typing: boolean;
  timestamp: string;
}

// Unified WebSocket Events Interface
interface UnifiedWebSocketEvents {
  // Chat Events
  'chat.message.new': (data: ChatMessage) => void;
  'chat.message.edited': (data: ChatMessage) => void;
  'chat.message.deleted': (data: { messageId: number; chatId: number }) => void;
  'chat.message.read': (data: ReadReceipt) => void;
  'chat.typing': (data: TypingIndicator) => void;
  
  // Global Events
  'user.match.new': (data: Match) => void;
  'user.like.new': (data: Like) => void;
  'user.notification.general': (data: Notification) => void;
  'user.call.incoming': (data: IncomingCall) => void;
  'user.call.initiated': (data: any) => void;
  'user.unread.update': (data: UnreadUpdate) => void;
  
  // Chat List Events
  'chatlist.message.new': (data: { chatId: number; message: ChatMessage }) => void;
  'chatlist.chat.updated': (data: { chatId: number; chat: any }) => void;
  'chatlist.unread.changed': (data: { chatId: number; unreadCount: number }) => void;
  'chat.own.message.sent': (data: { chatId: number; message: ChatMessage }) => void;
  
  // Connection Events
  'connection.state.changed': (data: { state: ConnectionState; quality: ConnectionQuality }) => void;
  'connection.error': (data: { error: any; canRetry: boolean }) => void;
  
  // Presence Events
  'presence.chat.user.joined': (data: PresenceEvent & { chatId: number }) => void;
  'presence.chat.user.left': (data: PresenceEvent & { chatId: number }) => void;
  'presence.typing.status.changed': (data: TypingStatus) => void;
}

// === CONNECTION MANAGEMENT ===
type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'failed' | 'reconnecting';
type ConnectionQuality = 'excellent' | 'good' | 'poor' | 'offline';
type ReconnectStrategy = 'aggressive' | 'balanced' | 'conservative';

interface ConnectionMetrics {
  quality: ConnectionQuality;
  latencyMs: number;
  packetsLost: number;
  reconnectCount: number;
  lastConnected: Date | null;
  lastDisconnected: Date | null;
}

// === MESSAGE QUEUE SYSTEM ===
interface QueuedMessage {
  id: string;
  type: 'message' | 'read' | 'typing' | 'event';
  chatId?: number;
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  priority: 'high' | 'medium' | 'low';
}

class MessageQueue {
  private queue: QueuedMessage[] = [];
  private processing = false;
  private maxQueueSize = 50; // Reduced from 100 for memory optimization
  private maxRetries = 3;

  add(message: Omit<QueuedMessage, 'id' | 'timestamp' | 'retryCount'>): void {
    // Remove oldest low-priority messages if queue is full
    if (this.queue.length >= this.maxQueueSize) {
      const lowPriorityIndex = this.queue.findIndex(msg => msg.priority === 'low');
      if (lowPriorityIndex !== -1) {
        this.queue.splice(lowPriorityIndex, 1);
      } else {
        this.queue.shift();
      }
    }

    const queuedMessage: QueuedMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
      ...message,
      maxRetries: message.maxRetries || this.maxRetries
    };

    // Insert based on priority
    if (message.priority === 'high') {
      this.queue.unshift(queuedMessage);
    } else {
      this.queue.push(queuedMessage);
    }

    console.log(`Message queued: ${queuedMessage.id} (${queuedMessage.type})`);
  }

  async processQueue(webSocketService: WebSocketService): Promise<void> {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;
    console.log(`Processing ${this.queue.length} queued messages...`);

    const messagesToProcess = [...this.queue];
    this.queue = [];

    for (const message of messagesToProcess) {
      try {
        await this.processMessage(message, webSocketService);
      } catch (error) {
        console.error(`Error processing queued message ${message.id}:`, error);
        
        // Retry if within limits
        if (message.retryCount < message.maxRetries) {
          message.retryCount++;
          this.queue.push(message);
        } else {
          console.warn(`Message ${message.id} failed after ${message.maxRetries} retries`);
        }
      }
    }

    this.processing = false;
  }

  private async processMessage(message: QueuedMessage, webSocketService: WebSocketService): Promise<void> {
    switch (message.type) {
      case 'message':
        // Re-send message through API
        if (message.chatId) {
          await apiClient.chats.sendMessage(message.chatId, message.data);
        }
        break;
      case 'read':
        // Mark message as read - TODO: implement when API endpoint is available
        console.log('Message read queued for processing:', message.data.messageId);
        break;
      case 'typing':
        // Send typing indicator
        if (message.chatId) {
          webSocketService.sendTyping(message.chatId, message.data);
        }
        break;
      default:
        console.warn(`Unknown message type: ${message.type}`);
    }
  }

  clear(): void {
    this.queue = [];
    this.processing = false;
  }

  getQueueSize(): number {
    return this.queue.length;
  }
}

// === OPTIMIZED CHANNEL MANAGER ===
interface ChannelInfo {
  channel: any;
  lastActivity: Date;
  subscribers: number;
  chatId?: number;
  isActive: boolean;
}

class ChannelManager {
  private channels = new Map<string, ChannelInfo>();
  private maxConcurrentChannels = 5; // Reduced from 10 for memory optimization
  private inactiveTimeoutMs = 3 * 60 * 1000; // Reduced to 3 minutes
  private cleanupIntervalMs = 30 * 1000; // Reduced to 30 seconds
  private cleanupTimer: any = null;
  private activeChats = new Set<number>();

  subscribe(channelName: string, channel: any, chatId?: number): void {
    // Check if we need to cleanup before adding
    if (this.channels.size >= this.maxConcurrentChannels) {
      this.removeOldestInactiveChannel();
    }

    const channelInfo: ChannelInfo = {
      channel,
      lastActivity: new Date(),
      subscribers: 1,
      chatId,
      isActive: true
    };

    this.channels.set(channelName, channelInfo);
    
    if (chatId) {
      this.activeChats.add(chatId);
    }

    this.startCleanupTimer();
    console.log(`Channel subscribed: ${channelName} (${this.channels.size}/${this.maxConcurrentChannels})`);
  }

  unsubscribe(channelName: string): void {
    const channelInfo = this.channels.get(channelName);
    if (channelInfo) {
      try {
        // Properly cleanup the channel
        if (channelInfo.channel && typeof channelInfo.channel.unsubscribe === 'function') {
          channelInfo.channel.unsubscribe();
        }
        
        if (channelInfo.chatId) {
          this.activeChats.delete(channelInfo.chatId);
        }
        
        this.channels.delete(channelName);
        console.log(`Channel unsubscribed: ${channelName}`);
      } catch (error) {
        console.error(`Error unsubscribing from ${channelName}:`, error);
        // Force removal even if unsubscribe fails
        this.channels.delete(channelName);
      }
    }
  }

  updateActivity(channelName: string): void {
    const channelInfo = this.channels.get(channelName);
    if (channelInfo) {
      channelInfo.lastActivity = new Date();
      channelInfo.isActive = true;
    }
  }

  setInactive(channelName: string): void {
    const channelInfo = this.channels.get(channelName);
    if (channelInfo) {
      channelInfo.isActive = false;
    }
  }

  get(channelName: string): any {
    const channelInfo = this.channels.get(channelName);
    if (channelInfo) {
      this.updateActivity(channelName);
      return channelInfo.channel;
    }
    return null;
  }

  has(channelName: string): boolean {
    return this.channels.has(channelName);
  }

  isActiveChatChannel(chatId: number): boolean {
    return this.activeChats.has(chatId);
  }

  private removeOldestInactiveChannel(): void {
    let oldestChannel: string | null = null;
    let oldestTime = new Date();

    // First try to remove inactive channels
    for (const [channelName, channelInfo] of this.channels) {
      if (!channelInfo.isActive && channelInfo.lastActivity < oldestTime) {
        oldestTime = channelInfo.lastActivity;
        oldestChannel = channelName;
      }
    }

    // If no inactive channels, remove the oldest one
    if (!oldestChannel) {
      for (const [channelName, channelInfo] of this.channels) {
        if (channelInfo.lastActivity < oldestTime) {
          oldestTime = channelInfo.lastActivity;
          oldestChannel = channelName;
        }
      }
    }

    if (oldestChannel) {
      console.log(`Removing oldest channel: ${oldestChannel}`);
      this.unsubscribe(oldestChannel);
    }
  }

  private startCleanupTimer(): void {
    if (this.cleanupTimer) return;

    this.cleanupTimer = setInterval(() => {
      this.cleanupInactiveChannels();
    }, this.cleanupIntervalMs);
  }

  private cleanupInactiveChannels(): void {
    const now = new Date();
    const channelsToRemove: string[] = [];

    for (const [channelName, channelInfo] of this.channels) {
      const timeSinceActivity = now.getTime() - channelInfo.lastActivity.getTime();
      if (!channelInfo.isActive && timeSinceActivity > this.inactiveTimeoutMs) {
        channelsToRemove.push(channelName);
      }
    }

    channelsToRemove.forEach(channelName => {
      console.log(`Cleaning up inactive channel: ${channelName}`);
      this.unsubscribe(channelName);
    });

    // Stop timer if no channels
    if (this.channels.size === 0 && this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  clear(): void {
    // Unsubscribe from all channels
    const channelNames = Array.from(this.channels.keys());
    channelNames.forEach(channelName => {
      this.unsubscribe(channelName);
    });
    
    this.activeChats.clear();
    
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  getActiveChannels(): string[] {
    return Array.from(this.channels.keys());
  }

  getChannelCount(): number {
    return this.channels.size;
  }
}

// === TYPING INDICATOR MANAGER ===
class TypingIndicatorManager {
  private typingUsers = new Map<string, { timeout: any; userName: string }>();
  private typingDebounceMs = 3000; // 3 seconds

  addTypingUser(chatId: number, userId: number, userName: string, callback: (chatId: number, isTyping: boolean, userName?: string) => void): void {
    const key = `${chatId}-${userId}`;
    
    // Clear existing timeout
    const existing = this.typingUsers.get(key);
    if (existing) {
      clearTimeout(existing.timeout);
    }

    // Set new timeout
    const timeout = setTimeout(() => {
      this.typingUsers.delete(key);
      callback(chatId, false);
    }, this.typingDebounceMs);

    this.typingUsers.set(key, { timeout, userName });
    callback(chatId, true, userName);
  }

  removeTypingUser(chatId: number, userId: number): void {
    const key = `${chatId}-${userId}`;
    const existing = this.typingUsers.get(key);
    if (existing) {
      clearTimeout(existing.timeout);
      this.typingUsers.delete(key);
    }
  }

  getTypingUsersForChat(chatId: number): string[] {
    const typingUserNames: string[] = [];
    for (const [key, value] of this.typingUsers) {
      if (key.startsWith(`${chatId}-`)) {
        typingUserNames.push(value.userName);
      }
    }
    return typingUserNames;
  }

  clear(): void {
    for (const [key, value] of this.typingUsers) {
      clearTimeout(value.timeout);
    }
    this.typingUsers.clear();
  }
}

// === MAIN WEBSOCKET SERVICE ===
class WebSocketService {
  private echo: Echo<any> | null = null;
  private pusherClient: Pusher | null = null;
  private initialized: boolean = false;
  private currentUserId: number | null = null;
  
  // Connection Management
  private connectionState: ConnectionState = 'disconnected';
  private connectionMetrics: ConnectionMetrics = {
    quality: 'offline',
    latencyMs: 0,
    packetsLost: 0,
    reconnectCount: 0,
    lastConnected: null,
    lastDisconnected: null
  };
  private reconnectStrategy: ReconnectStrategy = 'balanced';
  private maxReconnectAttempts: number = 10;
  private reconnectTimeout: any = null;
  private heartbeatInterval: any = null;
  private heartbeatTimer: any = null;
  private presenceHeartbeatInterval: any = null;
  
  // Network & App State
  private netInfoUnsubscribe: any = null;
  private appStateSubscription: any = null;
  private lastAppState: AppStateStatus = 'active';
  
  // Event System
  private eventListeners = new Map<keyof UnifiedWebSocketEvents, Set<any>>();
  
  // Message Queue
  private messageQueue = new MessageQueue();
  
  // Channel Management
  private channelManager = new ChannelManager();
  private globalChannel: any = null;
  
  // Presence Channels
  private presenceChannels = new Map<string, any>();
  private currentUserPresence: PresenceUser | null = null;
  
  // Typing Indicator Manager
  private typingManager = new TypingIndicatorManager();
  
  // Performance Optimization
  private lastActivityTime = Date.now();
  private inactivityTimeoutMs = 10 * 60 * 1000; // 10 minutes
  private inactivityTimer: any = null;

  constructor() {
    // Set up network monitoring
    this.setupNetworkMonitoring();
    // Set up app state monitoring
    this.setupAppStateMonitoring();
  }

  private setupNetworkMonitoring(): void {
    this.netInfoUnsubscribe = NetInfo.addEventListener(state => {
      console.log('Network state changed:', state.isConnected ? 'connected' : 'disconnected');
      
      if (state.isConnected && this.connectionState === 'disconnected') {
        // Network is back, try to reconnect
        this.attemptReconnect();
      } else if (!state.isConnected && this.connectionState === 'connected') {
        // Network is gone, update state
        this.updateConnectionQuality('offline');
      }
    });
  }

  private setupAppStateMonitoring(): void {
    this.appStateSubscription = AppState.addEventListener('change', nextAppState => {
      console.log('App state changed:', this.lastAppState, '->', nextAppState);
      
      if (this.lastAppState.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground
        if (this.connectionState !== 'connected') {
          this.attemptReconnect();
        } else {
          // Send presence heartbeat
          this.sendPresenceHeartbeat();
        }
      } else if (nextAppState.match(/inactive|background/)) {
        // App went to background
        this.updateOnlineStatus(false);
      }
      
      this.lastAppState = nextAppState;
    });
  }

  private setupInactivityTimer(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }

    this.inactivityTimer = setTimeout(() => {
      const timeSinceActivity = Date.now() - this.lastActivityTime;
      if (timeSinceActivity >= this.inactivityTimeoutMs) {
        console.log('Inactivity detected, reducing connection resources...');
        // Mark all channels as inactive
        this.channelManager.getActiveChannels().forEach(channelName => {
          this.channelManager.setInactive(channelName);
        });
      }
    }, this.inactivityTimeoutMs);
  }

  private updateLastActivity(): void {
    this.lastActivityTime = Date.now();
    this.setupInactivityTimer();
  }

  // Heartbeat System
  private startHeartbeat(): void {
    if (this.heartbeatInterval) return;

    this.heartbeatInterval = setInterval(() => {
      if (this.pusherClient?.connection?.state === 'connected') {
        const startTime = Date.now();
        
        // Clear previous timer
        if (this.heartbeatTimer) {
          clearTimeout(this.heartbeatTimer);
        }
        
        // Set timeout for pong response
        this.heartbeatTimer = setTimeout(() => {
          console.warn('Heartbeat timeout - connection may be poor');
          this.updateConnectionQuality('poor');
        }, 5000);
        
        try {
          // Check connection state first
          if (this.pusherClient.connection.state !== 'connected') {
            console.warn('Connection not ready for heartbeat');
            this.updateConnectionQuality('poor');
            return;
          }
          
          // Listen for pong response first (one-time listener)
          const pongHandler = (data?: any) => {
            const latency = Date.now() - startTime;
            console.log(`Heartbeat pong received: ${latency}ms`);
            this.updateConnectionMetrics(latency);
            
            if (this.heartbeatTimer) {
              clearTimeout(this.heartbeatTimer);
              this.heartbeatTimer = null;
            }
            
            // Immediately unbind to prevent duplicate responses
            this.pusherClient?.connection?.unbind('pusher:pong', pongHandler);
          };
          
          this.pusherClient.connection.bind('pusher:pong', pongHandler);
          
          // Send ping via websocket directly
          console.log('Sending heartbeat ping...');
          this.pusherClient.connection.send_event('pusher:ping', {});
          
          // Cleanup listener after timeout period
          setTimeout(() => {
            if (this.pusherClient?.connection) {
              this.pusherClient.connection.unbind('pusher:pong', pongHandler);
            }
          }, 6000); // Cleanup after 6 seconds
          
        } catch (error) {
          console.error('Error sending heartbeat:', error);
          this.updateConnectionQuality('poor');
        }
      }
    }, 30000); // Send heartbeat every 30 seconds
  }
  
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    if (this.heartbeatTimer) {
      clearTimeout(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private startPresenceHeartbeat(): void {
    if (this.presenceHeartbeatInterval) return;

    // Send presence heartbeat every 30 seconds
    this.presenceHeartbeatInterval = setInterval(() => {
      if (this.isConnected()) {
        this.sendPresenceHeartbeat();
      }
    }, 30000);
  }

  private stopPresenceHeartbeat(): void {
    if (this.presenceHeartbeatInterval) {
      clearInterval(this.presenceHeartbeatInterval);
      this.presenceHeartbeatInterval = null;
    }
  }
  
  private updateConnectionMetrics(latency: number): void {
    this.connectionMetrics.latencyMs = latency;
    
    // Update quality based on latency
    if (latency < 100) {
      this.updateConnectionQuality('excellent');
    } else if (latency < 300) {
      this.updateConnectionQuality('good');
    } else {
      this.updateConnectionQuality('poor');
    }
  }
  
  private updateConnectionQuality(quality: ConnectionQuality): void {
    if (this.connectionMetrics.quality !== quality) {
      this.connectionMetrics.quality = quality;
      this.emit('connection.state.changed', {
        state: this.connectionState,
        quality: quality
      });
    }
  }
  
  // Event System Implementation
  on<T extends keyof UnifiedWebSocketEvents>(event: T, listener: UnifiedWebSocketEvents[T]): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener);
  }
  
  off<T extends keyof UnifiedWebSocketEvents>(event: T, listener: UnifiedWebSocketEvents[T]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.eventListeners.delete(event);
      }
    }
  }
  
  private emit<T extends keyof UnifiedWebSocketEvents>(event: T, data: Parameters<UnifiedWebSocketEvents[T]>[0]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
    
    // Update last activity on any event
    this.updateLastActivity();
  }

  // Public method to emit events
  public emitEvent<T extends keyof UnifiedWebSocketEvents>(event: T, data: Parameters<UnifiedWebSocketEvents[T]>[0]): void {
    this.emit(event, data);
  }
  
  // Main Service Methods
  async initialize(): Promise<void> {
    try {
      if (this.connectionState === 'connected' && this.echo && this.pusherClient) {
        console.log('WebSocket already connected');
        return;
      }

      this.setConnectionState('connecting');
      
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No auth token found');
      }

      await this.getCurrentUserId();
      
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
        enabledTransports: ['ws', 'wss'], // Use only WebSocket transports
        disabledTransports: ['sockjs'], // Disable fallback transports
      });

      this.setupPusherListeners();
      this.setupEcho();
      
      console.log('WebSocket service initialized successfully');
    } catch (error) {
      console.error('Error initializing WebSocket service:', error);
      this.setConnectionState('failed');
      this.emit('connection.error', { error, canRetry: true });
      this.attemptReconnect();
    }
  }
  
  private setupPusherListeners(): void {
    if (!this.pusherClient) return;
    
    this.pusherClient.connection.bind('connected', () => {
      console.log('WebSocket connected successfully');
      this.setConnectionState('connected');
      this.connectionMetrics.lastConnected = new Date();
      this.connectionMetrics.reconnectCount = 0;
      this.updateConnectionQuality('good');
      
      this.subscribeToGlobalChannel();
      this.startHeartbeat();
      this.startPresenceHeartbeat();
      this.setupInactivityTimer();
      
      // Initialize presence system (async)
      this.initializePresence().catch(error => {
        console.error('Error initializing presence system:', error);
      });
      
      // Process queued messages
      this.messageQueue.processQueue(this);
    });

    this.pusherClient.connection.bind('disconnected', () => {
      console.log('WebSocket disconnected');
      this.setConnectionState('disconnected');
      this.connectionMetrics.lastDisconnected = new Date();
      this.updateConnectionQuality('offline');
      this.stopHeartbeat();
      this.stopPresenceHeartbeat();
      this.channelManager.clear();
      this.globalChannel = null;
      this.typingManager.clear();
      
      if (this.inactivityTimer) {
        clearTimeout(this.inactivityTimer);
        this.inactivityTimer = null;
      }
      
      this.attemptReconnect();
    });

    this.pusherClient.connection.bind('error', (error: any) => {
      console.error('WebSocket connection error:', error);
      this.setConnectionState('failed');
      this.updateConnectionQuality('offline');
      this.emit('connection.error', { error, canRetry: true });
      this.attemptReconnect();
    });

    this.pusherClient.connection.bind('state_change', (states: any) => {
      console.log(`WebSocket state changed from ${states.previous} to ${states.current}`);
    });
  }
  
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
  
  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state;
      this.initialized = state === 'connected';
      this.emit('connection.state.changed', {
        state: this.connectionState,
        quality: this.connectionMetrics.quality
      });
    }
  }
  
  private async getCurrentUserId(): Promise<number | null> {
    try {
      if (this.currentUserId) {
        return this.currentUserId;
      }

      const userData = await AsyncStorage.getItem('user_data');
      if (userData) {
        const user = JSON.parse(userData);
        this.currentUserId = user.id;
        return user.id;
      }
      return null;
    } catch (error) {
      console.error('Error getting current user ID:', error);
      return null;
    }
  }
  
  setCurrentUserId(userId: number): void {
    this.currentUserId = userId;
    
    if (!this.initialized && this.connectionState !== 'connecting') {
      this.initialize();
    }
  }
  
  private subscribeToGlobalChannel(): void {
    if (!this.initialized || !this.echo || !this.currentUserId) {
      console.warn('WebSocket service not initialized or no user ID available');
      return;
    }

    try {
      const channelName = `user.${this.currentUserId}`;
      
      if (this.globalChannel) {
        console.log('Already subscribed to global channel');
        return;
      }

      this.globalChannel = this.echo.private(channelName);

      // Listen for new matches
      this.globalChannel.listen('.NewMatch', (e: any) => {
        console.log('New match received:', e);
        try {
          this.emit('user.match.new', e.match);
          
          notificationService.showNotification(
            'New Match! 💕',
            `You have a new match with ${e.match?.name || 'someone'}!`,
            { type: 'match' }
          );
        } catch (error) {
          console.error('Error processing new match:', error);
        }
      });

      // Listen for new likes
      this.globalChannel.listen('.NewLike', (e: any) => {
        console.log('New like received:', e);
        try {
          this.emit('user.like.new', e.like);
          
          notificationService.showNotification(
            'Someone likes you! 😍',
            `${e.like?.name || 'Someone'} liked your profile!`,
            { type: 'like' }
          );
        } catch (error) {
          console.error('Error processing new like:', error);
        }
      });

      // Listen for incoming call offers
      this.globalChannel.listen('.IncomingCall', (e: any) => {
        console.log('📞 WebSocket: Incoming call received:', e);
        try {
          this.emit('user.call.incoming', e.call);
          
          notificationService.showNotification(
            'Incoming Call 📞',
            `${e.call?.caller_name || 'Someone'} is calling you!`,
            { type: 'call', priority: 'high' }
          );
        } catch (error) {
          console.error('Error processing incoming call:', error);
        }
      });

      // Listen for call initiated events (new format)
      this.globalChannel.listen('.CallInitiated', (e: any) => {
        console.log('📞 WebSocket: Call initiated received:', e);
        try {
          this.emit('user.call.initiated', e.call);
          
          // Show notification for incoming call
          const callerName = e.call?.caller?.email || 'Someone';
          const callType = e.call?.type === 'video' ? 'Video' : 'Voice';
          
          notificationService.showNotification(
            `Incoming ${callType} Call 📞`,
            `${callerName} is calling you!`,
            { type: 'call', priority: 'high' }
          );
        } catch (error) {
          console.error('Error processing call initiated:', error);
        }
      });

      // Listen for general notifications
      this.globalChannel.listen('.GeneralNotification', (e: any) => {
        console.log('General notification received:', e);
        try {
          this.emit('user.notification.general', e.notification);
          
          notificationService.showNotification(
            e.notification?.title || 'New Notification',
            e.notification?.message || 'You have a new notification',
            { type: 'general' }
          );
        } catch (error) {
          console.error('Error processing general notification:', error);
        }
      });

      // Listen for global unread message count updates
      this.globalChannel.listen('.GlobalUnreadCountUpdate', (e: any) => {
        console.log('Global unread count update:', e);
        try {
          this.emit('user.unread.update', {
            count: e.count,
            total_count: e.total_count || e.count
          });
        } catch (error) {
          console.error('Error processing global unread count update:', error);
        }
      });

      // Listen for new messages across all chats for chat list updates
      this.globalChannel.listen('.NewMessageInChat', async (e: any) => {
        console.log('New message in chat list:', e);
        
        try {
          if (e.chat_id && e.message) {
            const currentUserId = await this.getCurrentUserId();
            
            if (currentUserId) {
              const messageWithOwnership = {
                ...e.message,
                is_mine: e.message.sender_id === currentUserId
              };

              this.emit('chatlist.message.new', {
                chatId: e.chat_id,
                message: messageWithOwnership
              });
            }
          }
        } catch (error) {
          console.error('Error processing new message in chat list:', error);
        }
      });

      // Listen for chat updates
      this.globalChannel.listen('.ChatUpdated', (e: any) => {
        console.log('Chat updated:', e);
        
        try {
          if (e.chat_id && e.chat) {
            this.emit('chatlist.chat.updated', {
              chatId: e.chat_id,
              chat: e.chat
            });
          }
        } catch (error) {
          console.error('Error processing chat update:', error);
        }
      });

      // Listen for unread count changes
      this.globalChannel.listen('.UnreadCountChanged', (e: any) => {
        console.log('Unread count changed:', e);
        
        try {
          if (e.chat_id) {
            this.emit('chatlist.unread.changed', {
              chatId: e.chat_id,
              unreadCount: e.unread_count
            });
          }
        } catch (error) {
          console.error('Error processing unread count change:', error);
        }
      });

      // Listen for MessageSent events (new message notifications)
      this.globalChannel.listen('.MessageSent', async (e: any) => {
        console.log('MessageSent received:', e);
        
        try {
          if (e.message && e.chat_id) {
            const currentUserId = await this.getCurrentUserId();
            
            if (currentUserId) {
              const messageWithOwnership = {
                ...e.message,
                is_mine: e.message.sender_id === currentUserId
              };

              this.emit('chatlist.message.new', {
                chatId: e.chat_id,
                message: messageWithOwnership
              });
            }
          }
        } catch (error) {
          console.error('Error processing MessageSent:', error);
        }
      });

      // Listen for UnreadCountUpdate events
      this.globalChannel.listen('.UnreadCountUpdate', (e: any) => {
        console.log('UnreadCountUpdate received:', e);
        
        try {
          if (e.chat_id) {
            // Update specific chat unread count
            this.emit('chatlist.unread.changed', {
              chatId: e.chat_id,
              unreadCount: e.chat_unread_count
            });

            // Also emit global unread count update
            this.emit('user.unread.update', {
              count: e.total_unread_count,
              total_count: e.total_unread_count
            });
          }
        } catch (error) {
          console.error('Error processing UnreadCountUpdate:', error);
        }
      });

      console.log(`Subscribed to global channel: ${channelName}`);
    } catch (error) {
      console.error('Error subscribing to global channel:', error);
    }
  }
  
  private async attemptReconnect(): Promise<void> {
    // Check network connectivity first
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
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
      this.emit('connection.error', {
        error: new Error('Max reconnect attempts reached'),
        canRetry: false
      });
      return;
    }

    this.setConnectionState('reconnecting');
    this.connectionMetrics.reconnectCount++;

    const baseDelay = this.getReconnectDelay();
    const jitter = Math.random() * 1000;
    const delay = baseDelay + jitter;
    
    console.log(`Attempting to reconnect in ${Math.round(delay / 1000)} seconds (attempt ${this.connectionMetrics.reconnectCount}/${this.maxReconnectAttempts})...`);

    this.reconnectTimeout = setTimeout(() => {
      console.log(`Reconnecting... (attempt ${this.connectionMetrics.reconnectCount}/${this.maxReconnectAttempts})`);
      this.initialize();
    }, delay);
  }
  
  private getReconnectDelay(): number {
    const attempt = this.connectionMetrics.reconnectCount;
    
    switch (this.reconnectStrategy) {
      case 'aggressive':
        return Math.min(1000 * Math.pow(1.5, attempt), 10000);
      case 'balanced':
        return Math.min(2000 * Math.pow(2, attempt), 30000);
      case 'conservative':
        return Math.min(5000 * Math.pow(2, attempt), 60000);
      default:
        return 5000;
    }
  }
  
  // Chat Channel Management
  subscribeToChat(chatId: number): any {
    const channelName = `chat.${chatId}`;
    
    if (!this.initialized || !this.echo) {
      console.warn('WebSocket service not initialized. Chat subscription queued.');
      return null;
    }

    if (this.channelManager.has(channelName)) {
      console.log(`Already subscribed to channel: ${channelName}`);
      return this.channelManager.get(channelName);
    }

    try {
      const channel = this.echo.private(channelName);

      // Listen for new messages
      channel.listen('.MessageSent', async (e: any) => {
        console.log('New message received:', e);
        this.channelManager.updateActivity(channelName);

        try {
          const currentUserId = await this.getCurrentUserId();

          if (e.message && currentUserId) {
            const messageWithOwnership = {
              ...e.message,
              is_mine: e.message.sender_id === currentUserId
            };

            // Show notification for incoming messages (not from current user)
            if (!messageWithOwnership.is_mine) {
              try {
                const senderName = e.sender?.name || 'New message';
                await notificationService.showMessageNotification(
                  messageWithOwnership,
                  chatId.toString(),
                  senderName
                );
              } catch (error) {
                console.error('Error showing notification:', error);
              }
            }

            this.emit('chat.message.new', messageWithOwnership);
          }
        } catch (error) {
          console.error('Error processing new message:', error);
        }
      });

      // Listen for message edited events
      channel.listen('.MessageEdited', async (e: any) => {
        console.log('Message edited:', e);
        this.channelManager.updateActivity(channelName);
        
        try {
          const currentUserId = await this.getCurrentUserId();
          if (e.message && currentUserId) {
            const messageWithOwnership = {
              ...e.message,
              is_mine: e.message.sender_id === currentUserId
            };
            this.emit('chat.message.edited', messageWithOwnership);
          }
        } catch (error) {
          console.error('Error processing message edit:', error);
        }
      });

      // Listen for message deleted events
      channel.listen('.MessageDeleted', (e: any) => {
        console.log('Message deleted:', e);
        this.channelManager.updateActivity(channelName);
        
        try {
          if (e.message_id) {
            this.emit('chat.message.deleted', {
              messageId: e.message_id,
              chatId: chatId
            });
          }
        } catch (error) {
          console.error('Error processing message delete:', error);
        }
      });

      // Listen for message read events
      channel.listen('.MessageRead', (e: any) => {
        console.log('Message read:', e);
        this.channelManager.updateActivity(channelName);
        
        try {
          if (e.message_id && e.user_id) {
            this.emit('chat.message.read', {
              message_id: e.message_id,
              user_id: e.user_id,
              read_at: e.read_at || new Date().toISOString()
            });
          }
        } catch (error) {
          console.error('Error processing message read:', error);
        }
      });

      // Listen for read receipts
      channel.listen('.MessageReadReceipt', (e: any) => {
        console.log('Read receipt received:', e);
        this.channelManager.updateActivity(channelName);
        
        try {
          if (e.message_id && e.read_by_user_id) {
            this.emit('chat.message.read', {
              message_id: e.message_id,
              user_id: e.read_by_user_id,
              read_at: e.read_at || new Date().toISOString()
            });
          }
        } catch (error) {
          console.error('Error processing read receipt:', error);
        }
      });

      // Listen for typing indicators with improved handling
      channel.listenForWhisper('typing', async (e: any) => {
        try {
          const currentUserId = await this.getCurrentUserId();
          if (e.user_id && currentUserId && e.user_id !== currentUserId) {
            const userName = e.name || e.user_name || `User ${e.user_id}`;
            
            // Use typing manager for better debouncing
            this.typingManager.addTypingUser(
              chatId, 
              e.user_id, 
              userName,
              (chatId, isTyping, userName) => {
                this.emit('chat.typing', {
                  user_id: e.user_id,
                  user_name: userName || '',
                  chat_id: chatId,
                  is_typing: isTyping
                });
              }
            );
          }
        } catch (error) {
          console.error('Error processing typing indicator:', error);
        }
      });

      this.channelManager.subscribe(channelName, channel, chatId);
      console.log(`Subscribed to chat channel: ${channelName}`);
      return channel;

    } catch (error) {
      console.error('Error subscribing to chat:', error);
      return null;
    }
  }
  
  unsubscribeFromChat(chatId: number): void {
    const channelName = `chat.${chatId}`;
    this.channelManager.unsubscribe(channelName);
    this.typingManager.removeTypingUser(chatId, this.currentUserId || 0);
  }
  
  sendTyping(chatId: number, user: any): void {
    if (!this.initialized || !this.echo) {
      // Queue typing indicator for later
      this.messageQueue.add({
        type: 'typing',
        chatId: chatId,
        data: user,
        priority: 'low',
        maxRetries: 1
      });
      return;
    }

    try {
      const channelName = `chat.${chatId}`;
      const channel = this.channelManager.get(channelName);
      
              if (channel) {
          channel.whisper('typing', user);
          
          // TODO: Also send to API when endpoint is available
          // apiClient.presence.typing({ chat_id: chatId, is_typing: true })
        } else {
          console.warn(`No active channel found for chat ${chatId}`);
        }
    } catch (error) {
      console.error('Error sending typing indicator:', error);
    }
  }
  
  // Public API Methods
  isConnected(): boolean {
    return this.connectionState === 'connected' && this.initialized;
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  getConnectionMetrics(): ConnectionMetrics {
    return { ...this.connectionMetrics };
  }

  getQueueSize(): number {
    return this.messageQueue.getQueueSize();
  }

  getActiveChannels(): string[] {
    return this.channelManager.getActiveChannels();
  }

  getActiveChannelCount(): number {
    return this.channelManager.getChannelCount();
  }

  isChannelActive(chatId: number): boolean {
    return this.channelManager.isActiveChatChannel(chatId);
  }

  getTypingUsersForChat(chatId: number): string[] {
    return this.typingManager.getTypingUsersForChat(chatId);
  }

  setReconnectStrategy(strategy: ReconnectStrategy): void {
    this.reconnectStrategy = strategy;
  }

  forceReconnect(): void {
    console.log('Force reconnecting WebSocket...');
    this.connectionMetrics.reconnectCount = 0;
    this.disconnect();
    setTimeout(() => {
      this.initialize();
    }, 1000);
  }

  disconnect(): void {
    try {
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }

      if (this.inactivityTimer) {
        clearTimeout(this.inactivityTimer);
        this.inactivityTimer = null;
      }

      this.stopHeartbeat();
      this.stopPresenceHeartbeat();
      this.connectionMetrics.reconnectCount = 0;
      this.channelManager.clear();
      this.typingManager.clear();
      
      // Clear presence channels and set offline
      this.clearPresenceChannels();
      if (this.currentUserId) {
        this.updateOnlineStatus(false).catch(error => {
          console.error('Error setting offline status:', error);
        });
      }
      
      if (this.globalChannel) {
        try {
          this.globalChannel.unsubscribe();
          this.globalChannel = null;
        } catch (error) {
          console.error('Error unsubscribing from global channel:', error);
        }
      }

      if (this.pusherClient) {
        this.pusherClient.disconnect();
        this.pusherClient = null;
      }

      this.echo = null;
      this.setConnectionState('disconnected');
      this.updateConnectionQuality('offline');
      this.currentUserId = null;
      this.messageQueue.clear();

      // Clean up monitoring
      if (this.netInfoUnsubscribe) {
        this.netInfoUnsubscribe();
        this.netInfoUnsubscribe = null;
      }

      if (this.appStateSubscription) {
        this.appStateSubscription.remove();
        this.appStateSubscription = null;
      }

      console.log('WebSocket service disconnected');
    } catch (error) {
      console.error('Error disconnecting WebSocket service:', error);
    }
  }

  // Legacy API compatibility methods
  setGlobalCallbacks(callbacks: any): void {
    console.warn('setGlobalCallbacks is deprecated. Use event-based API instead.');
    
    if (callbacks.onNewMatch) {
      this.on('user.match.new', callbacks.onNewMatch);
    }
    if (callbacks.onNewLike) {
      this.on('user.like.new', callbacks.onNewLike);
    }
    if (callbacks.onIncomingCall) {
      this.on('user.call.incoming', callbacks.onIncomingCall);
    }
    if (callbacks.onGeneralNotification) {
      this.on('user.notification.general', callbacks.onGeneralNotification);
    }
    if (callbacks.onGlobalUnreadCountUpdate) {
      this.on('user.unread.update', callbacks.onGlobalUnreadCountUpdate);
    }
  }

  subscribeToChatList(callbacks: any): void {
    console.warn('subscribeToChatList is deprecated. Use event-based API instead.');
    
    if (callbacks.onNewMessage) {
      this.on('chatlist.message.new', (data) => callbacks.onNewMessage(data.chatId, data.message));
    }
    if (callbacks.onChatUpdated) {
      this.on('chatlist.chat.updated', (data) => callbacks.onChatUpdated(data.chatId, data.chat));
    }
    if (callbacks.onUnreadCountChanged) {
      this.on('chatlist.unread.changed', (data) => callbacks.onUnreadCountChanged(data.chatId, data.unreadCount));
    }
  }

  unsubscribeFromChatList(): void {
    console.warn('unsubscribeFromChatList is deprecated. Use off() method instead.');
  }

  onConnected(callback: () => void): void {
    this.on('connection.state.changed', (data) => {
      if (data.state === 'connected') {
        callback();
      }
    });
  }

  onError(callback: (error: any) => void): void {
    this.on('connection.error', (data) => callback(data.error));
  }
  
  // === PRESENCE CHANNEL METHODS ===
  
  /**
   * Subscribe to chat-specific presence channel
   */
  subscribeToChatPresence(chatId: number): any {
    if (!this.initialized || !this.echo) {
      console.warn('WebSocket service not initialized for chat presence');
      return null;
    }

    const channelName = `presence-chat.${chatId}`;
    
    if (this.presenceChannels.has(channelName)) {
      console.log(`Already subscribed to chat ${chatId} presence`);
      return this.presenceChannels.get(channelName);
    }

    try {
      const channel = this.echo.join(channelName)
        .here((users: any[]) => {
          console.log(`Users in chat ${chatId}:`, users);
          // Note: This event is no longer emitted since we removed global presence
        })
        .joining((user: any) => {
          console.log(`User joined chat ${chatId}:`, user);
          this.emit('presence.chat.user.joined', {
            user,
            chatId,
            timestamp: new Date().toISOString()
          });
        })
        .leaving((user: any) => {
          console.log(`User left chat ${chatId}:`, user);
          this.emit('presence.chat.user.left', {
            user,
            chatId,
            timestamp: new Date().toISOString()
          });
        })
        .error((error: any) => {
          console.error(`Chat ${chatId} presence error:`, error);
        });

      this.presenceChannels.set(channelName, channel);
      console.log(`Subscribed to chat ${chatId} presence channel`);
      return channel;
    } catch (error) {
      console.error(`Error subscribing to chat ${chatId} presence:`, error);
      return null;
    }
  }

  /**
   * Update user online status
   */
  async updateOnlineStatus(isOnline: boolean): Promise<void> {
    try {
      const response = await apiClient.post('/api/v1/presence/status', {
        is_online: isOnline
      });

      if (response.status === 'success') {
        console.log(`Online status updated: ${isOnline}`);
        if (this.currentUserPresence) {
          this.currentUserPresence.is_online = isOnline;
        }
      }
    } catch (error) {
      console.error('Error updating online status:', error);
    }
  }

  /**
   * Update typing status for a chat
   */
  async updateTypingStatus(chatId: number, isTyping: boolean): Promise<void> {
    try {
      const response = await apiClient.post('/api/v1/presence/typing', {
        chat_id: chatId,
        is_typing: isTyping
      });

      if (response.status === 'success') {
        console.log(`Typing status updated for chat ${chatId}: ${isTyping}`);
      }
    } catch (error) {
      console.error('Error updating typing status:', error);
    }
  }

  /**
   * Send heartbeat to maintain online status
   */
  async sendPresenceHeartbeat(): Promise<void> {
    try {
      await apiClient.post('/api/v1/presence/heartbeat');
      console.log('Presence heartbeat sent');
    } catch (error) {
      console.error('Error sending presence heartbeat:', error);
    }
  }

  /**
   * Get online users in chat
   */
  async getOnlineUsersInChat(chatId: number): Promise<PresenceUser[]> {
    try {
      const response = await apiClient.get(`/api/v1/presence/chats/${chatId}/online-users`);
      if (response.status === 'success') {
        return response.data || [];
      }
      return [];
    } catch (error) {
      console.error(`Error getting online users for chat ${chatId}:`, error);
      return [];
    }
  }

  /**
   * Get online matches
   */
  async getOnlineMatches(): Promise<PresenceUser[]> {
    try {
      const response = await apiClient.get('/api/v1/presence/online-matches');
      if (response.status === 'success') {
        return response.data || [];
      }
      return [];
    } catch (error) {
      console.error('Error getting online matches:', error);
      return [];
    }
  }

  /**
   * Unsubscribe from presence channel
   */
  unsubscribeFromPresence(channelName: string): void {
    const channel = this.presenceChannels.get(channelName);
    if (channel) {
      try {
        if (this.echo) {
          this.echo.leave(channelName);
        }
        this.presenceChannels.delete(channelName);
        console.log(`Unsubscribed from presence channel: ${channelName}`);
      } catch (error) {
        console.error(`Error unsubscribing from presence ${channelName}:`, error);
      }
    }
  }

  /**
   * Unsubscribe from chat presence
   */
  unsubscribeFromChatPresence(chatId: number): void {
    this.unsubscribeFromPresence(`presence-chat.${chatId}`);
  }

  /**
   * Clear all presence subscriptions
   */
  private clearPresenceChannels(): void {
    for (const [channelName] of this.presenceChannels) {
      this.unsubscribeFromPresence(channelName);
    }
    this.presenceChannels.clear();
  }

  /**
   * Initialize presence system
   */
  private async initializePresence(): Promise<void> {
    if (!this.currentUserId) return;

    try {
      // Set user online when connected
      await this.updateOnlineStatus(true);
      
      console.log('Presence system initialized');
    } catch (error) {
      console.error('Error initializing presence system:', error);
    }
  }
}

export const webSocketService = new WebSocketService();

// Export types for external use
export type {
  UnifiedWebSocketEvents,
  ChatMessage,
  ReadReceipt,
  TypingIndicator,
  Match,
  Like,
  IncomingCall,
  Notification,
  UnreadUpdate,
  ConnectionState,
  ConnectionQuality,
  ReconnectStrategy,
  ConnectionMetrics,
  PresenceUser,
  PresenceEvent,
  TypingStatus
};
