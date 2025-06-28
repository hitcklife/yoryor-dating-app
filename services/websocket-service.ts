import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// Define the base URL for the API
const API_BASE_URL = 'https://incredibly-evident-hornet.ngrok-free.app';

// Pusher configuration
const PUSHER_CONFIG = {
  key: '71d10c58900cc58fb02d',
  cluster: 'us2',
  forceTLS: true,
};

class WebSocketService {
  private echo: Echo | null = null;
  private pusherClient: Pusher | null = null;
  private initialized: boolean = false;
  private connectionCallbacks: (() => void)[] = [];
  private errorCallbacks: ((error: any) => void)[] = [];
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectTimeout: number = null;
  private currentUserId: number | null = null;

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
        throw new Error('No auth token found');
      }

      // Get current user ID
      await this.getCurrentUserId();

      // Initialize Pusher client first
      this.pusherClient = new Pusher(PUSHER_CONFIG.key, {
        cluster: PUSHER_CONFIG.cluster,
        forceTLS: PUSHER_CONFIG.forceTLS,
        authEndpoint: `${API_BASE_URL}/api/v1/broadcasting/auth`,
        auth: {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          }
        }
      });

      // Set up connection status listeners on the Pusher client
      this.pusherClient.connection.bind('connected', () => {
        console.log('WebSocket connected');
        this.initialized = true;
        this.reconnectAttempts = 0;

        // Call all connection callbacks
        this.connectionCallbacks.forEach(callback => callback());
      });

      this.pusherClient.connection.bind('disconnected', () => {
        console.log('WebSocket disconnected');
        this.initialized = false;
        this.attemptReconnect();
      });

      this.pusherClient.connection.bind('error', (error: any) => {
        console.error('WebSocket connection error:', error);
        this.initialized = false;

        // Call all error callbacks
        this.errorCallbacks.forEach(callback => callback(error));

        this.attemptReconnect();
      });

      // Initialize Laravel Echo with the pre-configured Pusher client
      this.echo = new Echo({
        broadcaster: 'pusher',
        key: PUSHER_CONFIG.key,
        cluster: PUSHER_CONFIG.cluster,
        forceTLS: PUSHER_CONFIG.forceTLS,
        client: this.pusherClient,
        authorizer: (channel: any) => {
          return {
            authorize: (socketId: string, callback: Function) => {
              axios.post(`${API_BASE_URL}/api/v1/broadcasting/auth`, {
                socket_id: socketId,
                channel_name: channel.name
              }, {
                headers: {
                  Authorization: `Bearer ${token}`,
                  Accept: 'application/json',
                }
              })
              .then(response => {
                callback(false, response.data);
              })
              .catch(error => {
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
      this.errorCallbacks.forEach(callback => callback(error));
      this.attemptReconnect();
    }
  }

  /**
   * Attempt to reconnect to the WebSocket service
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`Maximum reconnect attempts (${this.maxReconnectAttempts}) reached. Giving up.`);
      return;
    }

    this.reconnectAttempts++;

    const delay = Math.min(2000 * this.reconnectAttempts, 30000);
    console.log(`Attempting to reconnect in ${delay / 1000} seconds (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    this.reconnectTimeout = setTimeout(() => {
      console.log(`Reconnecting... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      this.initialize();
    }, delay);
  }

  /**
   * Subscribe to a private chat channel
   */
  subscribeToChat(
    chatId: number,
    onMessage: (message: any) => void,
    onTyping?: (user: any) => void
  ): any {
    if (!this.initialized || !this.echo) {
      console.warn('WebSocket service not initialized. Adding to queue...');

      this.connectionCallbacks.push(() => {
        this.subscribeToChat(chatId, onMessage, onTyping);
      });

      return null;
    }

    try {
      const channel = this.echo.private(`chat.${chatId}`);

      // Listen for new messages
      channel.listen('.MessageSent', async (e: any) => {
        console.log('New message received:', e);

        // Get the current user ID
        const currentUserId = await this.getCurrentUserId();

        if (e.message && currentUserId) {
          // Add is_mine property based on sender_id
          const messageWithOwnership = {
            ...e.message,
            is_mine: e.message.sender_id === currentUserId
          };

          onMessage(messageWithOwnership);
        } else {
          console.warn('Message or current user ID not available');
          onMessage(e.message);
        }
      });

      // Listen for typing indicators if callback provided
      if (onTyping) {
        channel.listenForWhisper('typing', (e: any) => {
          console.log('User typing:', e);
          onTyping(e);
        });
      }

      console.log(`Subscribed to chat channel: chat.${chatId}`);
      return channel;

    } catch (error) {
      console.error('Error subscribing to chat:', error);
      return null;
    }
  }

  /**
   * Send typing indicator
   */
  sendTyping(chatId: number, isTyping: boolean): void {
    if (!this.initialized || !this.echo) {
      console.warn('WebSocket service not initialized');
      return;
    }

    try {
      const channel = this.echo.private(`chat.${chatId}`);
      channel.whisper('typing', {
        typing: isTyping,
        user_id: this.currentUserId
      });
    } catch (error) {
      console.error('Error sending typing indicator:', error);
    }
  }

  /**
   * Unsubscribe from a chat channel
   */
  unsubscribeFromChat(chatId: number): void {
    if (!this.echo) {
      console.warn('WebSocket service not initialized');
      return;
    }

    try {
      this.echo.leave(`chat.${chatId}`);
      console.log(`Unsubscribed from chat channel: chat.${chatId}`);
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
    return this.initialized;
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    if (this.echo) {
      this.echo.disconnect();
    }

    if (this.pusherClient) {
      this.pusherClient.disconnect();
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.initialized = false;
    this.echo = null;
    this.pusherClient = null;
    this.currentUserId = null;
    this.connectionCallbacks = [];
    this.errorCallbacks = [];
    this.reconnectAttempts = 0;

    console.log('WebSocket service disconnected');
  }
}

export const webSocketService = new WebSocketService();
