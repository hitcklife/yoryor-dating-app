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

class WebSocketService {
  private echo: Echo | null = null;
  private pusherClient: Pusher | null = null;
  private initialized: boolean = false;
  private connectionCallbacks: (() => void)[] = [];
  private errorCallbacks: ((error: any) => void)[] = [];
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private currentUserId: number | null = null;
  private activeChannels: Map<string, any> = new Map();
  private connectionState: 'disconnected' | 'connecting' | 'connected' | 'failed' = 'disconnected';

  /**
   * Set the current user ID
   */
  setCurrentUserId(userId: number): void {
    this.currentUserId = userId;
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
   * Attempt to reconnect to the WebSocket service with exponential backoff
   */
  private attemptReconnect(): void {
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

      // Listen for typing indicators if callback provided
      if (onTyping || callbacks?.onTyping) {
        channel.listenForWhisper('typing', (e: any) => {
          console.log('User typing:', e);
          try {
            if (onTyping) onTyping(e);
            if (callbacks?.onTyping) callbacks.onTyping(e);
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
      const channel = this.activeChannels.get(channelName) || this.echo.private(channelName);
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
    console.log('Disconnecting WebSocket service...');

    // Clear reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // Disconnect Echo
    if (this.echo) {
      try {
        this.echo.disconnect();
      } catch (error) {
        console.error('Error disconnecting Echo:', error);
      }
    }

    // Disconnect Pusher
    if (this.pusherClient) {
      try {
        this.pusherClient.disconnect();
      } catch (error) {
        console.error('Error disconnecting Pusher:', error);
      }
    }

    // Reset state
    this.connectionState = 'disconnected';
    this.initialized = false;
    this.echo = null;
    this.pusherClient = null;
    this.currentUserId = null;
    this.connectionCallbacks = [];
    this.errorCallbacks = [];
    this.reconnectAttempts = 0;
    this.activeChannels.clear();

    console.log('WebSocket service disconnected');
  }
}

export const webSocketService = new WebSocketService();
