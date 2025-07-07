import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationService } from './notification-service';
import { apiClient } from './api-client';
import { CONFIG } from '@/services/config';

interface WebSocketCallbacks {
  onMessage?: (message: any) => void;
  onTyping?: (user: any) => void;
  onMessageEdited?: (message: any) => void;
  onMessageDeleted?: (messageId: number) => void;
  onMessageRead?: (messageId: number, userId: number) => void;
}

interface ChatListCallbacks {
  onNewMessage?: (chatId: number, message: any) => void;
  onChatUpdated?: (chatId: number, chat: any) => void;
  onUnreadCountChanged?: (chatId: number, unreadCount: number) => void;
}

interface GlobalCallbacks {
  onNewMatch?: (match: any) => void;
  onNewLike?: (like: any) => void;
  onIncomingCall?: (call: any) => void;
  onGeneralNotification?: (notification: any) => void;
  onGlobalUnreadCountUpdate?: (count: number) => void;
}

class WebSocketService {
  private echo: Echo<any> | null = null;
  private pusherClient: Pusher | null = null;
  private initialized: boolean = false;
  private connectionCallbacks: (() => void)[] = [];
  private errorCallbacks: ((error: any) => void)[] = [];
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectTimeout: number | null = null;
  private currentUserId: number | null = null;
  private activeChannels: Map<string, any> = new Map();
  private connectionState: 'disconnected' | 'connecting' | 'connected' | 'failed' = 'disconnected';
  private chatListCallbacks: ChatListCallbacks | null = null;
  private globalCallbacks: GlobalCallbacks | null = null;
  private globalChannel: any = null;

  /**
   * Set global callbacks for app-wide events
   */
  setGlobalCallbacks(callbacks: GlobalCallbacks): void {
    this.globalCallbacks = callbacks;
  }

  /**
   * Set the current user ID and auto-initialize if not already connected
   */
  setCurrentUserId(userId: number): void {
    this.currentUserId = userId;
    
    // Auto-initialize if not already connected
    if (!this.initialized && this.connectionState !== 'connecting') {
      this.initialize();
    }
  }

  /**
   * Get current user ID from AsyncStorage
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
   * Initialize the WebSocket service with Pusher
   */
  async initialize(): Promise<void> {
    try {
      // Don't reinitialize if already connected
      if (this.connectionState === 'connected' && this.echo && this.pusherClient) {
        console.log('WebSocket already connected');
        return;
      }

      this.connectionState = 'connecting';
      
      // Reset reconnect attempts on new initialization
      this.reconnectAttempts = 0;

      // Clear any existing reconnect timeout
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }

      // Get the auth token
      const token = await AsyncStorage.getItem('auth_token');

      if (!token) {
        console.error('No auth token found for WebSocket initialization');
        this.connectionState = 'failed';
        throw new Error('No auth token found');
      }

      // Get current user ID
      await this.getCurrentUserId();

      // Disconnect existing connections if any
      if (this.pusherClient) {
        this.pusherClient.disconnect();
      }

      // Initialize Pusher client first
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
        // Add connection timeout and activity timeout for better error handling
        activityTimeout: 120000, // 2 minutes
        pongTimeout: 30000, // 30 seconds
      });

      // Set up connection status listeners on the Pusher client
      this.pusherClient.connection.bind('connected', () => {
        console.log('WebSocket connected successfully');
        this.connectionState = 'connected';
        this.initialized = true;
        this.reconnectAttempts = 0;

        // Subscribe to global private channel immediately after connection
        this.subscribeToGlobalChannel();

        // Call all connection callbacks
        this.connectionCallbacks.forEach(callback => {
          try {
            callback();
          } catch (error) {
            console.error('Error in connection callback:', error);
          }
        });
      });

      this.pusherClient.connection.bind('disconnected', () => {
        console.log('WebSocket disconnected');
        this.connectionState = 'disconnected';
        this.initialized = false;
        this.activeChannels.clear();
        this.globalChannel = null;
        this.attemptReconnect();
      });

      this.pusherClient.connection.bind('error', (error: any) => {
        console.error('WebSocket connection error:', error);
        this.connectionState = 'failed';
        this.initialized = false;

        // Call all error callbacks
        this.errorCallbacks.forEach(callback => {
          try {
            callback(error);
          } catch (err) {
            console.error('Error in error callback:', err);
          }
        });

        this.attemptReconnect();
      });

      this.pusherClient.connection.bind('state_change', (states: any) => {
        console.log(`WebSocket state changed from ${states.previous} to ${states.current}`);
      });

      // Initialize Laravel Echo with the pre-configured Pusher client
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

      console.log('WebSocket service initialized successfully');
    } catch (error) {
      console.error('Error initializing WebSocket service:', error);
      this.connectionState = 'failed';
      this.errorCallbacks.forEach(callback => {
        try {
          callback(error);
        } catch (err) {
          console.error('Error in error callback:', err);
        }
      });
      this.attemptReconnect();
    }
  }

  /**
   * Subscribe to global private channel for app-wide events
   */
  private subscribeToGlobalChannel(): void {
    if (!this.initialized || !this.echo || !this.currentUserId) {
      console.warn('WebSocket service not initialized or no user ID available');
      return;
    }

    try {
      const channelName = `user.${this.currentUserId}`;
      
      // Check if already subscribed
      if (this.globalChannel) {
        console.log('Already subscribed to global channel');
        return;
      }

      this.globalChannel = this.echo.private(channelName);

      // Listen for new matches
      this.globalChannel.listen('.NewMatch', (e: any) => {
        console.log('New match received:', e);
        try {
          if (this.globalCallbacks?.onNewMatch) {
            this.globalCallbacks.onNewMatch(e.match);
          }
          
          // Show notification for new match
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
          if (this.globalCallbacks?.onNewLike) {
            this.globalCallbacks.onNewLike(e.like);
          }
          
          // Show notification for new like
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
        console.log('📞 WebSocket: Global callbacks available:', !!this.globalCallbacks?.onIncomingCall);
        try {
          if (this.globalCallbacks?.onIncomingCall) {
            console.log('📞 WebSocket: Calling onIncomingCall callback');
            this.globalCallbacks.onIncomingCall(e.call);
          } else {
            console.log('📞 WebSocket: No onIncomingCall callback available');
          }
          
          // Show notification for incoming call
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
          if (this.globalCallbacks?.onGeneralNotification) {
            this.globalCallbacks.onGeneralNotification(e.notification);
          }
          
          // Show notification
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
          if (this.globalCallbacks?.onGlobalUnreadCountUpdate) {
            this.globalCallbacks.onGlobalUnreadCountUpdate(e.count);
          }
        } catch (error) {
          console.error('Error processing global unread count update:', error);
        }
      });

      // Listen for new messages across all chats for chat list updates
      this.globalChannel.listen('.NewMessageInChat', async (e: any) => {
        console.log('New message in chat list:', e);
        
        try {
          if (e.chat_id && e.message && this.chatListCallbacks?.onNewMessage) {
            // Get current user ID to determine if message is from current user
            const currentUserId = await this.getCurrentUserId();
            
            if (currentUserId) {
              const messageWithOwnership = {
                ...e.message,
                is_mine: e.message.sender_id === currentUserId
              };

              // Call the callback to update chat list
              this.chatListCallbacks.onNewMessage(e.chat_id, messageWithOwnership);
            }
          }
        } catch (error) {
          console.error('Error processing new message in chat list:', error);
        }
      });

      // Listen for chat updates (e.g., when someone joins/leaves)
      this.globalChannel.listen('.ChatUpdated', (e: any) => {
        console.log('Chat updated:', e);
        
        try {
          if (e.chat_id && e.chat && this.chatListCallbacks?.onChatUpdated) {
            this.chatListCallbacks.onChatUpdated(e.chat_id, e.chat);
          }
        } catch (error) {
          console.error('Error processing chat update:', error);
        }
      });

      // Listen for unread count changes
      this.globalChannel.listen('.UnreadCountChanged', (e: any) => {
        console.log('Unread count changed:', e);
        
        try {
          if (e.chat_id && this.chatListCallbacks?.onUnreadCountChanged) {
            this.chatListCallbacks.onUnreadCountChanged(e.chat_id, e.unread_count);
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

  /**
   * Attempt to reconnect to the WebSocket service with exponential backoff
   */
  private attemptReconnect(): void {
    // Don't attempt to reconnect if no auth token is available
    AsyncStorage.getItem('auth_token').then(token => {
      if (!token) {
        console.log('No auth token available, skipping reconnect attempt');
        this.connectionState = 'failed';
        return;
      }

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error(`Maximum reconnect attempts (${this.maxReconnectAttempts}) reached. Giving up.`);
        this.connectionState = 'failed';
        return;
      }

      this.reconnectAttempts++;

      // Exponential backoff with jitter
      const baseDelay = Math.min(2000 * Math.pow(2, this.reconnectAttempts - 1), 30000);
      const jitter = Math.random() * 1000; // Add randomness to prevent thundering herd
      const delay = baseDelay + jitter;
      
      console.log(`Attempting to reconnect in ${Math.round(delay / 1000)} seconds (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

      this.reconnectTimeout = setTimeout(() => {
        console.log(`Reconnecting... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.initialize();
      }, delay);
    }).catch(error => {
      console.error('Error checking auth token for reconnect:', error);
      this.connectionState = 'failed';
    });
  }

  /**
   * Subscribe to a private chat channel with enhanced event handling
   */
  subscribeToChat(
    chatId: number,
    onMessage: (message: any) => void,
    onTyping?: (user: any) => void,
    callbacks?: WebSocketCallbacks
  ): any {
    const channelName = `chat.${chatId}`;
    
    if (!this.initialized || !this.echo) {
      console.warn('WebSocket service not initialized. Adding to queue...');

      this.connectionCallbacks.push(() => {
        this.subscribeToChat(chatId, onMessage, onTyping, callbacks);
      });

      return null;
    }

    // Check if already subscribed
    if (this.activeChannels.has(channelName)) {
      console.log(`Already subscribed to channel: ${channelName}`);
      return this.activeChannels.get(channelName);
    }

    try {
      const channel = this.echo.private(channelName);

      // Listen for new messages
      channel.listen('.MessageSent', async (e: any) => {
        console.log('New message received:', e);

        try {
          // Get the current user ID
          const currentUserId = await this.getCurrentUserId();

          if (e.message && currentUserId) {
            // Add is_mine property based on sender_id
            const messageWithOwnership = {
              ...e.message,
              is_mine: e.message.sender_id === currentUserId
            };

            // Show notification for incoming messages (not from current user)
            if (!messageWithOwnership.is_mine) {
              try {
                // Get sender name from the message data
                const senderName = e.sender?.name || 'New message';

                // Show notification
                await notificationService.showMessageNotification(
                  messageWithOwnership,
                  chatId.toString(),
                  senderName
                );
              } catch (error) {
                console.error('Error showing notification:', error);
              }
            }

            onMessage(messageWithOwnership);
            if (callbacks?.onMessage) {
              callbacks.onMessage(messageWithOwnership);
            }
          } else {
            console.warn('Message or current user ID not available');
            onMessage(e.message);
          }
        } catch (error) {
          console.error('Error processing new message:', error);
        }
      });

      // Listen for message edited events
      channel.listen('.MessageEdited', async (e: any) => {
        console.log('Message edited:', e);
        try {
          const currentUserId = await this.getCurrentUserId();
          if (e.message && currentUserId) {
            const messageWithOwnership = {
              ...e.message,
              is_mine: e.message.sender_id === currentUserId
            };
            if (callbacks?.onMessageEdited) {
              callbacks.onMessageEdited(messageWithOwnership);
            }
          }
        } catch (error) {
          console.error('Error processing message edit:', error);
        }
      });

      // Listen for message deleted events
      channel.listen('.MessageDeleted', (e: any) => {
        console.log('Message deleted:', e);
        try {
          if (callbacks?.onMessageDeleted && e.message_id) {
            callbacks.onMessageDeleted(e.message_id);
          }
        } catch (error) {
          console.error('Error processing message delete:', error);
        }
      });

      // Listen for message read events
      channel.listen('.MessageRead', (e: any) => {
        console.log('Message read:', e);
        try {
          if (callbacks?.onMessageRead && e.message_id && e.user_id) {
            callbacks.onMessageRead(e.message_id, e.user_id);
          }
        } catch (error) {
          console.error('Error processing message read:', error);
        }
      });

      // Listen for read receipts (when someone reads your message)
      channel.listen('.MessageReadReceipt', async (e: any) => {
        console.log('Read receipt received:', e);
        try {
          if (e.message_id && e.read_by_user_id) {
            // Call the callback to update UI
            if (callbacks?.onMessageRead) {
              callbacks.onMessageRead(e.message_id, e.read_by_user_id);
            }
          }
        } catch (error) {
          console.error('Error processing read receipt:', error);
        }
      });

      // Listen for typing indicators if callback provided
      if (onTyping || callbacks?.onTyping) {
        channel.listenForWhisper('typing', (e: any) => {
          try {
            // Only show typing indicator if it's from someone else
            const currentUserId = this.currentUserId;
            if (e.user_id && currentUserId && e.user_id !== currentUserId) {
              const typingUser = {
                id: e.user_id,
                name: e.name || e.user_name || `User ${e.user_id}`,
                ...e
              };
              
              if (onTyping) onTyping(typingUser);
              if (callbacks?.onTyping) callbacks.onTyping(typingUser);
            }
          } catch (error) {
            console.error('Error processing typing indicator:', error);
          }
        });
      }

      // Store the channel
      this.activeChannels.set(channelName, channel);

      console.log(`Subscribed to chat channel: ${channelName}`);
      return channel;

    } catch (error) {
      console.error('Error subscribing to chat:', error);
      return null;
    }
  }

  /**
   * Send typing indicator with debouncing
   */
  sendTyping(chatId: number, user: any): void {
    if (!this.initialized || !this.echo) {
      console.warn('WebSocket service not initialized');
      return;
    }

    try {
      const channelName = `chat.${chatId}`;
      const channel = this.activeChannels.get(channelName);
      
      if (!channel) {
        console.warn(`No active channel found for chat ${chatId}`);
        return;
      }
      
      channel.whisper('typing', user);
    } catch (error) {
      console.error('Error sending typing indicator:', error);
    }
  }

  /**
   * Unsubscribe from a chat channel
   */
  unsubscribeFromChat(chatId: number): void {
    const channelName = `chat.${chatId}`;
    
    if (!this.echo) {
      console.warn('WebSocket service not initialized');
      return;
    }

    try {
      this.echo.leave(channelName);
      this.activeChannels.delete(channelName);
      console.log(`Unsubscribed from chat channel: ${channelName}`);
    } catch (error) {
      console.error('Error unsubscribing from chat:', error);
    }
  }

  /**
   * Add connection callback
   */
  onConnected(callback: () => void): void {
    this.connectionCallbacks.push(callback);
  }

  /**
   * Add error callback
   */
  onError(callback: (error: any) => void): void {
    this.errorCallbacks.push(callback);
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.connectionState === 'connected' && this.initialized;
  }

  /**
   * Get current connection state
   */
  getConnectionState(): string {
    return this.connectionState;
  }

  /**
   * Force reconnection
   */
  forceReconnect(): void {
    console.log('Force reconnecting WebSocket...');
    this.reconnectAttempts = 0;
    this.disconnect();
    setTimeout(() => {
      this.initialize();
    }, 1000);
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    try {
      // Clear any pending reconnect timeout
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }

      // Reset reconnect attempts
      this.reconnectAttempts = 0;

      // Unsubscribe from all active channels
      this.activeChannels.forEach((channel, channelName) => {
        try {
          channel.unsubscribe();
          console.log(`Unsubscribed from channel: ${channelName}`);
        } catch (error) {
          console.error(`Error unsubscribing from channel ${channelName}:`, error);
        }
      });

      // Clear active channels
      this.activeChannels.clear();

      // Unsubscribe from global channel
      if (this.globalChannel) {
        try {
          this.globalChannel.unsubscribe();
          this.globalChannel = null;
          console.log('Unsubscribed from global channel');
        } catch (error) {
          console.error('Error unsubscribing from global channel:', error);
        }
      }

      // Disconnect Pusher client
      if (this.pusherClient) {
        this.pusherClient.disconnect();
        this.pusherClient = null;
      }

      // Reset Echo
      this.echo = null;
      this.initialized = false;
      this.connectionState = 'disconnected';
      this.chatListCallbacks = null;
      this.currentUserId = null;

      console.log('WebSocket service disconnected');
    } catch (error) {
      console.error('Error disconnecting WebSocket service:', error);
    }
  }

  /**
   * Subscribe to chat list updates for real-time notifications
   * This now just stores the callbacks since the global channel already handles the events
   */
  subscribeToChatList(callbacks: ChatListCallbacks): void {
    if (!this.initialized || !this.echo) {
      console.warn('WebSocket service not initialized. Adding to queue...');
      this.connectionCallbacks.push(() => {
        this.subscribeToChatList(callbacks);
      });
      return;
    }

    // Store callbacks - the global channel will handle the events
    this.chatListCallbacks = callbacks;
    
    console.log('Chat list callbacks registered with global channel');
  }

  /**
   * Unsubscribe from chat list updates
   */
  unsubscribeFromChatList(): void {
    // Just clear the callbacks since we're using the global channel
    this.chatListCallbacks = null;
    console.log('Chat list callbacks cleared');
  }
}

export const webSocketService = new WebSocketService();
