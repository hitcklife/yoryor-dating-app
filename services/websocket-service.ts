import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationService } from './notification-service';
import { apiClient } from './api-client';

// Import new modular components
import { 
  EventEmitter, 
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
  PresenceUser,
  PresenceEvent,
  TypingStatus
} from './realtime/event-emitter';

import { 
  ConnectionManager, 
  ReconnectStrategy, 
  ConnectionMetrics,
  AppActivityState,
  HeartbeatConfig,
  ReconnectionState
} from './realtime/connection-manager';

import { 
  ChannelManager, 
  ChannelInfo,
  QualityBasedLimits,
  ChannelMetrics
} from './realtime/channel-manager';

import { 
  MessageQueue, 
  QueuedMessage 
} from './realtime/message-queue';

import { 
  PresenceManager 
} from './realtime/presence-manager';

import { 
  BatchingManager,
  BatchedMessage,
  BatchConfig,
  BatchStats
} from './realtime/batching-manager';

/**
 * Enhanced WebSocket service facade with comprehensive optimizations
 */
class WebSocketService {
  private currentUserId: number | null = null;
  
  // Modular components
  private eventEmitter: EventEmitter;
  private connectionManager: ConnectionManager;
  private channelManager: ChannelManager;
  private messageQueue: MessageQueue;
  private presenceManager: PresenceManager;
  private batchingManager: BatchingManager;
  
  // Global channel
  private globalChannel: any = null;
  
  // Activity tracking for adaptive features
  private lastChatActivity: Map<number, Date> = new Map();
  private currentActiveChat: number | null = null;

  constructor() {
    // Initialize modular components
    this.eventEmitter = new EventEmitter();
    this.connectionManager = new ConnectionManager(this.eventEmitter);
    this.channelManager = new ChannelManager();
    this.messageQueue = new MessageQueue();
    this.presenceManager = new PresenceManager(this.eventEmitter);
    this.batchingManager = new BatchingManager();
    
    this.setupOptimizedEventHandlers();
  }

  /**
   * Initialize WebSocket service with optimizations
   */
  async initialize(): Promise<void> {
    try {
      if (this.connectionManager.isConnected()) {
        console.log('WebSocket already connected');
        return;
      }

      await this.getCurrentUserId();
      await this.connectionManager.initialize();
      
      console.log('Enhanced WebSocket service initialized successfully');
    } catch (error) {
      console.error('Error initializing WebSocket service:', error);
    }
  }

  /**
   * Set up optimized event handlers
   */
  private setupOptimizedEventHandlers(): void {
    this.eventEmitter.on('connection.state.changed', (data) => {
      // Update channel manager with quality changes
      this.channelManager.updateConnectionQuality(data.quality);
      
      if (data.state === 'connected') {
        this.onConnected();
      } else if (data.state === 'disconnected') {
        this.onDisconnected();
      }
    });
  }

  /**
   * Handle connection established with optimizations
   */
  private onConnected(): void {
    const echo = this.connectionManager.getEcho();
    if (echo && this.currentUserId) {
      // Subscribe to global channel
      this.subscribeToGlobalChannel();
      
      // Initialize presence system
      this.presenceManager.initialize(echo, this.currentUserId);
      
      // Process queued messages
      this.messageQueue.processQueue(this);
      
      // Reconnect to priority channels first
      this.reconnectPriorityChannels();
    }
  }

  /**
   * Handle connection lost
   */
  private onDisconnected(): void {
    this.channelManager.clear();
    this.globalChannel = null;
    this.presenceManager.disconnect();
    
    // Flush any pending batched messages before disconnecting
    this.batchingManager.flushAll();
  }

  /**
   * Reconnect to priority channels first
   */
  private reconnectPriorityChannels(): void {
    const priorityChannels = this.connectionManager.getPriorityChannels();
    
    for (const channelName of priorityChannels) {
      if (channelName.startsWith('chat.')) {
        const chatId = parseInt(channelName.split('.')[1]);
        if (!isNaN(chatId)) {
          // Subscribe with high priority
          this.subscribeToChat(chatId, 'high');
        }
      }
    }
  }

  /**
   * Get current user ID
   */
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

  /**
   * Set current user ID with activity state management
   */
  setCurrentUserId(userId: number): void {
    this.currentUserId = userId;
    
    if (!this.connectionManager.isConnected()) {
      this.initialize();
    }
  }

  /**
   * Subscribe to global user channel
   */
  private subscribeToGlobalChannel(): void {
    const echo = this.connectionManager.getEcho();
    if (!echo || !this.currentUserId) {
      console.warn('Cannot subscribe to global channel - Echo not initialized or no user ID');
      return;
    }

    try {
      const channelName = `user.${this.currentUserId}`;
      
      if (this.globalChannel) {
        console.log('Already subscribed to global channel');
        return;
      }

      this.globalChannel = echo.private(channelName);

      // Listen for new matches
      this.globalChannel.listen('.NewMatch', (e: any) => {
        console.log('New match received:', e);
        try {
          this.eventEmitter.emit('user.match.new', e.match);
          
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
          this.eventEmitter.emit('user.like.new', e.like);
          
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
          this.eventEmitter.emit('user.call.incoming', e.call);
          
          notificationService.showNotification(
            'Incoming Call 📞',
            `${e.call?.caller_name || 'Someone'} is calling you!`,
            { type: 'call', priority: 'high' }
          );
        } catch (error) {
          console.error('Error processing incoming call:', error);
        }
      });

      // Listen for call initiated events
      this.globalChannel.listen('.CallInitiated', (e: any) => {
        console.log('📞 WebSocket: Call initiated received:', e);
        try {
          this.eventEmitter.emit('user.call.initiated', e.call);
          
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
          this.eventEmitter.emit('user.notification.general', e.notification);
          
          notificationService.showNotification(
            e.notification?.title || 'New Notification',
            e.notification?.message || 'You have a new notification',
            { type: 'general' }
          );
        } catch (error) {
          console.error('Error processing general notification:', error);
        }
      });

      // Listen for unread count updates with batching
      this.globalChannel.listen('.GlobalUnreadCountUpdate', (e: any) => {
        console.log('Global unread count update:', e);
        try {
          this.eventEmitter.emit('user.unread.update', {
            count: e.count,
            total_count: e.total_count || e.count
          });
        } catch (error) {
          console.error('Error processing global unread count update:', error);
        }
      });

      // Listen for chat list events
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

              this.eventEmitter.emit('chatlist.message.new', {
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
            this.eventEmitter.emit('chatlist.chat.updated', {
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
            this.eventEmitter.emit('chatlist.unread.changed', {
              chatId: e.chat_id,
              unreadCount: e.unread_count
            });
          }
        } catch (error) {
          console.error('Error processing unread count change:', error);
        }
      });

      // Listen for MessageSent events
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

              this.eventEmitter.emit('chatlist.message.new', {
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
            this.eventEmitter.emit('chatlist.unread.changed', {
              chatId: e.chat_id,
              unreadCount: e.chat_unread_count
            });

            this.eventEmitter.emit('user.unread.update', {
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

  /**
   * Subscribe to chat channel with enhanced priority management
   */
  subscribeToChat(chatId: number, priority: 'high' | 'medium' | 'low' = 'medium'): any {
    const channelName = `chat.${chatId}`;
    const echo = this.connectionManager.getEcho();
    
    if (!echo) {
      console.warn('Echo not initialized. Chat subscription queued.');
      return null;
    }

    if (this.channelManager.has(channelName)) {
      console.log(`Already subscribed to channel: ${channelName}`);
      // Update priority if different
      this.channelManager.updateChannelPriority(channelName, priority);
      return this.channelManager.get(channelName);
    }

    try {
      const channel = echo.private(channelName);

      // Listen for new messages with activity tracking
      channel.listen('.MessageSent', async (e: any) => {
        console.log('New message received:', e);
        this.channelManager.updateActivity(channelName);
        this.updateChatActivity(chatId);

        try {
          const currentUserId = await this.getCurrentUserId();

          if (e.message && currentUserId) {
            const messageWithOwnership = {
              ...e.message,
              is_mine: e.message.sender_id === currentUserId
            };

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

            this.eventEmitter.emit('chat.message.new', messageWithOwnership);
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
            this.eventEmitter.emit('chat.message.edited', messageWithOwnership);
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
            this.eventEmitter.emit('chat.message.deleted', {
              messageId: e.message_id,
              chatId: chatId
            });
          }
        } catch (error) {
          console.error('Error processing message delete:', error);
        }
      });

      // Listen for message read events with batching
      channel.listen('.MessageRead', (e: any) => {
        console.log('Message read:', e);
        this.channelManager.updateActivity(channelName);
        
        try {
          if (e.message_id && e.user_id) {
            // Use batching for read receipts
            this.batchingManager.addToBatch(
              'read_receipt',
              { messageId: e.message_id },
              chatId,
              e.user_id
            );
            
            this.eventEmitter.emit('chat.message.read', {
              message_id: e.message_id,
              user_id: e.user_id,
              read_at: e.read_at || new Date().toISOString()
            });
          }
        } catch (error) {
          console.error('Error processing message read:', error);
        }
      });

      // Listen for read receipts with batching
      channel.listen('.MessageReadReceipt', (e: any) => {
        console.log('Read receipt received:', e);
        this.channelManager.updateActivity(channelName);
        
        try {
          if (e.message_id && e.read_by_user_id) {
            // Use batching for read receipts
            this.batchingManager.addToBatch(
              'read_receipt',
              { messageId: e.message_id },
              chatId,
              e.read_by_user_id
            );
            
            this.eventEmitter.emit('chat.message.read', {
              message_id: e.message_id,
              user_id: e.read_by_user_id,
              read_at: e.read_at || new Date().toISOString()
            });
          }
        } catch (error) {
          console.error('Error processing read receipt:', error);
        }
      });

      // Listen for typing indicators with batching
      channel.listenForWhisper('typing', async (e: any) => {
        try {
          const currentUserId = await this.getCurrentUserId();
          if (e.user_id && currentUserId && e.user_id !== currentUserId) {
            const userName = e.name || e.user_name || `User ${e.user_id}`;
            
            // Use batching for typing indicators
            this.batchingManager.addToBatch(
              'typing',
              { isTyping: true, userName },
              chatId,
              e.user_id
            );
            
            this.presenceManager.addTypingUser(
              chatId, 
              e.user_id, 
              userName,
              (chatId, isTyping, userName) => {
                this.eventEmitter.emit('chat.typing', {
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

      this.channelManager.subscribe(channelName, channel, chatId, priority);
      
      // Add to priority channels if high priority
      if (priority === 'high') {
        this.addToPriorityChannels(channelName);
      }
      
      console.log(`Subscribed to chat channel: ${channelName} with ${priority} priority`);
      return channel;

    } catch (error) {
      console.error('Error subscribing to chat:', error);
      return null;
    }
  }

  /**
   * Unsubscribe from chat channel
   */
  unsubscribeFromChat(chatId: number): void {
    const channelName = `chat.${chatId}`;
    this.channelManager.unsubscribe(channelName);
    this.presenceManager.removeTypingUser(chatId, this.currentUserId || 0);
    this.removeChatActivity(chatId);
  }

  /**
   * Send typing indicator with batching and activity tracking
   */
  sendTyping(chatId: number, user: any): void {
    this.updateChatActivity(chatId);
    
    if (!this.connectionManager.isConnected()) {
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
        // Use batching for typing indicators
        this.batchingManager.addToBatch(
          'typing',
          { isTyping: true, user },
          chatId,
          this.currentUserId || undefined
        );
        
        channel.whisper('typing', user);
      } else {
        console.warn(`No active channel found for chat ${chatId}`);
      }
    } catch (error) {
      console.error('Error sending typing indicator:', error);
    }
  }

  /**
   * Update chat activity and manage app state
   */
  private updateChatActivity(chatId: number): void {
    this.lastChatActivity.set(chatId, new Date());
    this.currentActiveChat = chatId;
    
    // Notify connection manager of user activity
    this.connectionManager.notifyUserActivity();
    
    // Update channel priority for active chat
    const channelName = `chat.${chatId}`;
    if (this.channelManager.has(channelName)) {
      this.channelManager.updateChannelPriority(channelName, 'high');
      this.addToPriorityChannels(channelName);
    }
  }

  /**
   * Remove chat activity tracking
   */
  private removeChatActivity(chatId: number): void {
    this.lastChatActivity.delete(chatId);
    if (this.currentActiveChat === chatId) {
      this.currentActiveChat = null;
    }
  }

  /**
   * Add channel to priority list for reconnection
   */
  private addToPriorityChannels(channelName: string): void {
    const currentPriority = this.connectionManager.getPriorityChannels();
    if (!currentPriority.includes(channelName)) {
      this.connectionManager.setPriorityChannels([...currentPriority, channelName]);
    }
  }

  /**
   * Set app activity state with automatic detection
   */
  setAppActivityState(state: AppActivityState): void {
    this.connectionManager.setAppActivityState(state);
  }

  /**
   * Force reconnect
   */
  forceReconnect(): void {
    this.connectionManager.forceReconnect();
  }

  /**
   * Disconnect with optimization cleanup
   */
  disconnect(): void {
    try {
      // Flush all pending batches
      this.batchingManager.flushAll();
      
      this.channelManager.clear();
      this.presenceManager.disconnect();
      this.connectionManager.disconnect();
      
      if (this.globalChannel) {
        try {
          this.globalChannel.unsubscribe();
          this.globalChannel = null;
        } catch (error) {
          console.error('Error unsubscribing from global channel:', error);
        }
      }

      this.currentUserId = null;
      this.messageQueue.clear();
      this.eventEmitter.clearAll();
      this.batchingManager.clear();
      this.lastChatActivity.clear();
      this.currentActiveChat = null;

      console.log('Enhanced WebSocket service disconnected');
    } catch (error) {
      console.error('Error disconnecting WebSocket service:', error);
    }
  }

  // === PUBLIC API METHODS ===

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connectionManager.isConnected();
  }

  /**
   * Get connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionManager.getConnectionState();
  }

  /**
   * Get enhanced connection metrics
   */
  getConnectionMetrics(): ConnectionMetrics {
    return this.connectionManager.getConnectionMetrics();
  }

  /**
   * Get app activity state
   */
  getAppActivityState(): AppActivityState {
    return this.connectionManager.getAppActivityState();
  }

  /**
   * Get reconnection state
   */
  getReconnectionState(): ReconnectionState {
    return this.connectionManager.getReconnectionState();
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.messageQueue.getQueueSize();
  }

  /**
   * Get active channels
   */
  getActiveChannels(): string[] {
    return this.channelManager.getActiveChannels();
  }

  /**
   * Get enhanced channel metrics
   */
  getChannelMetrics(): ChannelMetrics {
    return this.channelManager.getChannelMetrics();
  }

  /**
   * Get quality-based limits
   */
  getQualityLimits(): QualityBasedLimits {
    return this.channelManager.getQualityLimits();
  }

  /**
   * Get batch statistics
   */
  getBatchStats(): BatchStats {
    return this.batchingManager.getStats();
  }

  /**
   * Get current heartbeat interval
   */
  getCurrentHeartbeatInterval(): number {
    return this.connectionManager.getCurrentHeartbeatInterval();
  }

  /**
   * Check if channel is active
   */
  isChannelActive(chatId: number): boolean {
    return this.channelManager.isActiveChatChannel(chatId);
  }

  /**
   * Get typing users for chat
   */
  getTypingUsersForChat(chatId: number): string[] {
    return this.presenceManager.getTypingUsersForChat(chatId);
  }

  /**
   * Set reconnect strategy
   */
  setReconnectStrategy(strategy: ReconnectStrategy): void {
    this.connectionManager.setReconnectStrategy(strategy);
  }

  // === CONFIGURATION METHODS ===

  /**
   * Configure heartbeat intervals
   */
  configureHeartbeat(config: Partial<HeartbeatConfig>): void {
    this.connectionManager.configureHeartbeat(config);
  }

  /**
   * Configure quality-based limits
   */
  configureQualityLimits(limits: Partial<QualityBasedLimits>): void {
    this.channelManager.configureQualityLimits(limits);
  }

  /**
   * Configure message batching
   */
  configureBatching(config: Partial<BatchConfig>): void {
    this.batchingManager.configureBatching(config);
  }

  /**
   * Enable or disable batching
   */
  setBatchingEnabled(enabled: boolean): void {
    this.batchingManager.setBatchingEnabled(enabled);
  }

  // === EVENT SYSTEM ===

  /**
   * Subscribe to event
   */
  on<T extends keyof UnifiedWebSocketEvents>(event: T, listener: UnifiedWebSocketEvents[T]): void {
    this.eventEmitter.on(event, listener);
  }

  /**
   * Unsubscribe from event
   */
  off<T extends keyof UnifiedWebSocketEvents>(event: T, listener: UnifiedWebSocketEvents[T]): void {
    this.eventEmitter.off(event, listener);
  }

  /**
   * Emit event
   */
  public emitEvent<T extends keyof UnifiedWebSocketEvents>(event: T, data: Parameters<UnifiedWebSocketEvents[T]>[0]): void {
    this.eventEmitter.emit(event, data);
  }

  // === PRESENCE METHODS ===

  /**
   * Subscribe to chat presence
   */
  subscribeToChatPresence(chatId: number): any {
    return this.presenceManager.subscribeToChatPresence(chatId);
  }

  /**
   * Unsubscribe from chat presence
   */
  unsubscribeFromChatPresence(chatId: number): void {
    this.presenceManager.unsubscribeFromChatPresence(chatId);
  }

  /**
   * Update online status
   */
  async updateOnlineStatus(isOnline: boolean): Promise<void> {
    return this.presenceManager.updateOnlineStatus(isOnline);
  }

  /**
   * Update typing status
   */
  async updateTypingStatus(chatId: number, isTyping: boolean): Promise<void> {
    return this.presenceManager.updateTypingStatus(chatId, isTyping);
  }

  /**
   * Send presence heartbeat
   */
  async sendPresenceHeartbeat(): Promise<void> {
    return this.presenceManager.sendPresenceHeartbeat();
  }

  /**
   * Get online users in chat
   */
  async getOnlineUsersInChat(chatId: number): Promise<PresenceUser[]> {
    return this.presenceManager.getOnlineUsersInChat(chatId);
  }

  /**
   * Get online matches
   */
  async getOnlineMatches(): Promise<PresenceUser[]> {
    return this.presenceManager.getOnlineMatches();
  }

  /**
   * Unsubscribe from presence
   */
  unsubscribeFromPresence(channelName: string): void {
    this.presenceManager.unsubscribeFromPresence(channelName);
  }

  // === LEGACY API COMPATIBILITY ===

  /**
   * Set global callbacks (deprecated)
   */
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

  /**
   * Subscribe to chat list (deprecated)
   */
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

  /**
   * Unsubscribe from chat list (deprecated)
   */
  unsubscribeFromChatList(): void {
    console.warn('unsubscribeFromChatList is deprecated. Use off() method instead.');
  }

  /**
   * On connected (deprecated)
   */
  onConnectedCallback(callback: () => void): void {
    this.on('connection.state.changed', (data) => {
      if (data.state === 'connected') {
        callback();
      }
    });
  }

  /**
   * On error (deprecated)
   */
  onError(callback: (error: any) => void): void {
    this.on('connection.error', (data) => callback(data.error));
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
  AppActivityState,
  HeartbeatConfig,
  ReconnectionState,
  PresenceUser,
  PresenceEvent,
  TypingStatus,
  QualityBasedLimits,
  ChannelMetrics,
  BatchConfig,
  BatchStats
};
