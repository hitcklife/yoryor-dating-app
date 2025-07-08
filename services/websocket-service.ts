import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationService } from './notification-service';
import { apiClient } from './api-client';
import { CONFIG } from '@/services/config';

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
  'user.unread.update': (data: UnreadUpdate) => void;
  
  // Chat List Events
  'chatlist.message.new': (data: { chatId: number; message: ChatMessage }) => void;
  'chatlist.chat.updated': (data: { chatId: number; chat: any }) => void;
  'chatlist.unread.changed': (data: { chatId: number; unreadCount: number }) => void;
  
  // Connection Events
  'connection.state.changed': (data: { state: ConnectionState; quality: ConnectionQuality }) => void;
  'connection.error': (data: { error: any; canRetry: boolean }) => void;
  
  // Presence Events
  'presence.user.joined': (data: PresenceEvent) => void;
  'presence.user.left': (data: PresenceEvent) => void;
  'presence.users.here': (data: { users: PresenceUser[] }) => void;
  'presence.chat.user.joined': (data: PresenceEvent & { chatId: number }) => void;
  'presence.chat.user.left': (data: PresenceEvent & { chatId: number }) => void;
  'presence.online.status.changed': (data: { userId: number; isOnline: boolean }) => void;
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
  private maxQueueSize = 100;
  private maxRetries = 3;

  add(message: Omit<QueuedMessage, 'id' | 'timestamp' | 'retryCount'>): void {
    // Remove oldest messages if queue is full
    if (this.queue.length >= this.maxQueueSize) {
      this.queue.shift();
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

// === CHANNEL MANAGER ===
interface ChannelInfo {
  channel: any;
  lastActivity: Date;
  subscribers: number;
  chatId?: number;
}

class ChannelManager {
  private channels = new Map<string, ChannelInfo>();
  private maxConcurrentChannels = 10;
  private inactiveTimeoutMs = 5 * 60 * 1000; // 5 minutes
  private cleanupIntervalMs = 60 * 1000; // 1 minute
  private cleanupTimer: any = null;

  subscribe(channelName: string, channel: any, chatId?: number): void {
    // Remove oldest inactive channel if at limit
    if (this.channels.size >= this.maxConcurrentChannels) {
      this.removeOldestInactiveChannel();
    }

    this.channels.set(channelName, {
      channel,
      lastActivity: new Date(),
      subscribers: 1,
      chatId
    });

    this.startCleanupTimer();
    console.log(`Channel subscribed: ${channelName} (${this.channels.size}/${this.maxConcurrentChannels})`);
  }

  unsubscribe(channelName: string): void {
    const channelInfo = this.channels.get(channelName);
    if (channelInfo) {
      try {
        channelInfo.channel.unsubscribe();
        this.channels.delete(channelName);
        console.log(`Channel unsubscribed: ${channelName}`);
      } catch (error) {
        console.error(`Error unsubscribing from ${channelName}:`, error);
      }
    }
  }

  updateActivity(channelName: string): void {
    const channelInfo = this.channels.get(channelName);
    if (channelInfo) {
      channelInfo.lastActivity = new Date();
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

  private removeOldestInactiveChannel(): void {
    let oldestChannel: string | null = null;
    let oldestTime = new Date();

    for (const [channelName, channelInfo] of this.channels) {
      if (channelInfo.lastActivity < oldestTime) {
        oldestTime = channelInfo.lastActivity;
        oldestChannel = channelName;
      }
    }

    if (oldestChannel) {
      console.log(`Removing oldest inactive channel: ${oldestChannel}`);
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
      if (timeSinceActivity > this.inactiveTimeoutMs) {
        channelsToRemove.push(channelName);
      }
    }

    channelsToRemove.forEach(channelName => {
      console.log(`Cleaning up inactive channel: ${channelName}`);
      this.unsubscribe(channelName);
    });
  }

  clear(): void {
    for (const [channelName] of this.channels) {
      this.unsubscribe(channelName);
    }
    
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  getActiveChannels(): string[] {
    return Array.from(this.channels.keys());
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
      this.channelManager.clear();
      this.globalChannel = null;
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

      console.log(`Subscribed to global channel: ${channelName}`);
    } catch (error) {
      console.error('Error subscribing to global channel:', error);
    }
  }
  
  private attemptReconnect(): void {
    AsyncStorage.getItem('auth_token').then(token => {
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
    }).catch(error => {
      console.error('Error checking auth token for reconnect:', error);
      this.setConnectionState('failed');
    });
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

      // Listen for typing indicators
      channel.listenForWhisper('typing', (e: any) => {
        try {
          const currentUserId = this.currentUserId;
          if (e.user_id && currentUserId && e.user_id !== currentUserId) {
            this.emit('chat.typing', {
              user_id: e.user_id,
              user_name: e.name || e.user_name || `User ${e.user_id}`,
              chat_id: chatId,
              is_typing: true
            });
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

      this.stopHeartbeat();
      this.connectionMetrics.reconnectCount = 0;
      this.channelManager.clear();
      
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
   * Subscribe to global online users presence channel
   */
  subscribeToGlobalPresence(): any {
    if (!this.initialized || !this.echo) {
      console.warn('WebSocket service not initialized for presence subscription');
      return null;
    }

    const channelName = 'presence-online-users';
    
    if (this.presenceChannels.has(channelName)) {
      console.log('Already subscribed to global presence');
      return this.presenceChannels.get(channelName);
    }

    try {
      // Add user data for presence channel authentication
      const userData = {
        user_id: this.currentUserId,
        user_info: {
          id: this.currentUserId,
          name: 'User', // You can get this from user context
          avatar: null
        }
      };

      const channel = this.echo.join(channelName)
        .here((users: any[]) => {
          console.log('Users currently online:', users);
          this.emit('presence.users.here', { users });
        })
        .joining((user: any) => {
          console.log('User joined online:', user);
          this.emit('presence.user.joined', {
            user,
            timestamp: new Date().toISOString()
          });
        })
        .leaving((user: any) => {
          console.log('User left online:', user);
          this.emit('presence.user.left', {
            user,
            timestamp: new Date().toISOString()
          });
        })
        .error((error: any) => {
          console.error('Global presence channel error:', error);
          // Handle auth error specifically
          if (error.type === 'AuthError') {
            console.error('Authentication failed for presence channel. Check backend authorization.');
            console.error('Make sure your backend routes/channels.php authorizes presence channels properly.');
            // Remove from presence channels map
            this.presenceChannels.delete(channelName);
          }
        });

      this.presenceChannels.set(channelName, channel);
      console.log('Subscribed to global presence channel');
      return channel;
    } catch (error) {
      console.error('Error subscribing to global presence:', error);
      return null;
    }
  }

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
          this.emit('presence.users.here', { users });
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
   * Subscribe to user matches presence channel
   */
  subscribeToMatchesPresence(): any {
    if (!this.initialized || !this.echo || !this.currentUserId) {
      console.warn('WebSocket service not initialized for matches presence');
      return null;
    }

    const channelName = `presence-user-matches.${this.currentUserId}`;
    
    if (this.presenceChannels.has(channelName)) {
      console.log('Already subscribed to matches presence');
      return this.presenceChannels.get(channelName);
    }

    try {
      const channel = this.echo.private(channelName);

      // Listen for match online status changes
      channel.listen('.user.online.status.changed', (e: any) => {
        console.log('Match online status changed:', e);
        this.emit('presence.online.status.changed', {
          userId: e.user_id,
          isOnline: e.is_online
        });
      });

      this.presenceChannels.set(channelName, channel);
      console.log('Subscribed to matches presence channel');
      return channel;
    } catch (error) {
      console.error('Error subscribing to matches presence:', error);
      return null;
    }
  }

  /**
   * Subscribe to dating activity presence (users actively browsing)
   */
  subscribeToDatingPresence(): any {
    if (!this.initialized || !this.echo) {
      console.warn('WebSocket service not initialized for dating presence');
      return null;
    }

    const channelName = 'presence-dating-active';
    
    if (this.presenceChannels.has(channelName)) {
      console.log('Already subscribed to dating presence');
      return this.presenceChannels.get(channelName);
    }

    try {
      const channel = this.echo.join(channelName)
        .here((users: any[]) => {
          console.log('Users actively dating:', users);
          this.emit('presence.users.here', { users });
        })
        .joining((user: any) => {
          console.log('User started dating activity:', user);
          this.emit('presence.user.joined', {
            user,
            timestamp: new Date().toISOString()
          });
        })
        .leaving((user: any) => {
          console.log('User stopped dating activity:', user);
          this.emit('presence.user.left', {
            user,
            timestamp: new Date().toISOString()
          });
        });

      this.presenceChannels.set(channelName, channel);
      console.log('Subscribed to dating presence channel');
      return channel;
    } catch (error) {
      console.error('Error subscribing to dating presence:', error);
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
   * Send typing status to chat
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
      
      // Subscribe to global presence
      this.subscribeToGlobalPresence();
      
      // Subscribe to matches presence
      this.subscribeToMatchesPresence();

      // Set up presence heartbeat (every 30 seconds)
      const presenceHeartbeat = setInterval(async () => {
        if (this.isConnected()) {
          await this.sendPresenceHeartbeat();
        } else {
          clearInterval(presenceHeartbeat);
        }
      }, 30000);

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
