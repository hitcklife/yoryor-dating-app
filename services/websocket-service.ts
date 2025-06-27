import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// Define the base URL for the API
// Replace this with your Laravel backend URL
const API_BASE_URL = 'https://incredibly-evident-hornet.ngrok-free.app';

// Pusher configuration
// These values should be replaced with your actual Pusher credentials from your Laravel Pusher setup
const PUSHER_CONFIG = {
  key: '71d10c58900cc58fb02d',      // Replace with your Pusher app key from Laravel .env (PUSHER_APP_KEY)
  cluster: 'us2',      // Replace with your Pusher cluster from Laravel .env (PUSHER_APP_CLUSTER)
  forceTLS: true,      // Use TLS for secure connections
};

// Initialize Pusher and Echo
class WebSocketService {
  private echo: Echo | null = null;
  private pusherClient: Pusher | null = null;
  private initialized: boolean = false;
  private connectionCallbacks: (() => void)[] = [];
  private errorCallbacks: ((error: any) => void)[] = [];
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectTimeout: number = null;

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
        client: this.pusherClient, // Use the pre-configured client
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

      // Call all error callbacks
      this.errorCallbacks.forEach(callback => callback(error));

      // Attempt to reconnect
      this.attemptReconnect();
    }
  }

  /**
   * Attempt to reconnect to the WebSocket service
   * @private
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`Maximum reconnect attempts (${this.maxReconnectAttempts}) reached. Giving up.`);
      return;
    }

    this.reconnectAttempts++;

    const delay = Math.min(2000 * this.reconnectAttempts, 30000); // Linear backoff with max 30s
    console.log(`Attempting to reconnect in ${delay / 1000} seconds (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    this.reconnectTimeout = setTimeout(() => {
      console.log(`Reconnecting... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      this.initialize();
    }, delay);
  }

  /**
   * Subscribe to a private chat channel
   * @param chatId The ID of the chat to subscribe to
   * @param onMessage Callback function for new messages
   * @param onTyping Callback function for typing indicators
   * @returns The channel subscription
   */
  subscribeToChat(
    chatId: number,
    onMessage: (message: any) => void,
    onTyping?: (user: any) => void
  ): any {
    if (!this.initialized || !this.echo) {
      console.warn('WebSocket service not initialized. Adding to queue...');

      // Add a callback to subscribe once connected
      this.connectionCallbacks.push(() => {
        this.subscribeToChat(chatId, onMessage, onTyping);
      });

      return null;
    }

    try {
      // Subscribe to the private chat channel
      const channel = this.echo.private(`chat.${chatId}`);

      // Listen for new messages
      channel.listen('.MessageSent', (e: any) => {
        console.log('New message received:', e);
        // Get the current user ID (hardcoded as 503 based on chats-service.ts)
        const currentUserId = 503;

        // Check if the message object exists
        if (e.message) {
          // Add is_mine property based on sender_id
          e.message.is_mine = e.message.sender_id === currentUserId;
          onMessage(e.message);
        } else {
          // Fallback to just passing content if message object doesn't exist
          onMessage(e.content);
        }
      });

      // Listen for typing indicators if callback provided
      if (onTyping) {
        channel.listenForWhisper('typing', (e: any) => {
          console.log('User typing:', e);
          onTyping(e.user);
        });
      }

      console.log(`Subscribed to chat channel: chat.${chatId}`);
      return channel;
    } catch (error) {
      console.error(`Error subscribing to chat ${chatId}:`, error);
      return null;
    }
  }

  /**
   * Send a typing indicator to the chat channel
   * @param chatId The ID of the chat
   * @param user The user who is typing
   */
  sendTypingIndicator(chatId: number, user: any): void {
    if (!this.initialized || !this.echo) {
      console.warn('WebSocket service not initialized. Cannot send typing indicator.');
      return;
    }

    try {
      const channel = this.echo.private(`chat.${chatId}`);

      // Whisper the typing event to the channel
      channel.whisper('typing', { user });

      console.log(`Sent typing indicator to chat.${chatId}`);
    } catch (error) {
      console.error(`Error sending typing indicator to chat ${chatId}:`, error);
    }
  }

  /**
   * Unsubscribe from a channel
   * @param channel The channel to unsubscribe from
   */
  unsubscribe(channel: any): void {
    if (channel && this.echo) {
      this.echo.leave(channel.name);
      console.log(`Unsubscribed from channel: ${channel.name}`);
    }
  }

  /**
   * Add a callback to be called when the connection is established
   * @param callback The callback function
   */
  onConnect(callback: () => void): void {
    if (this.initialized) {
      callback();
    } else {
      this.connectionCallbacks.push(callback);
    }
  }

  /**
   * Add a callback to be called when an error occurs
   * @param callback The callback function
   */
  onError(callback: (error: any) => void): void {
    this.errorCallbacks.push(callback);
  }

  /**
   * Check if the service is connected
   */
  isConnected(): boolean {
    return this.initialized && this.pusherClient?.connection.state === 'connected';
  }

  /**
   * Get current connection state
   */
  getConnectionState(): string {
    return this.pusherClient?.connection.state || 'disconnected';
  }

  /**
   * Disconnect from all channels and clean up resources
   */
  disconnect(): void {
    // Clear any reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // Disconnect Pusher client if initialized
    if (this.pusherClient) {
      // Remove all event listeners
      this.pusherClient.connection.unbind_all();
      this.pusherClient.disconnect();
      this.pusherClient = null;
    }

    // Disconnect Echo if initialized
    if (this.echo) {
      this.echo.disconnect();
      this.echo = null;
    }

    // Reset state
    this.initialized = false;
    this.connectionCallbacks = [];
    this.errorCallbacks = [];
    this.reconnectAttempts = 0;

    console.log('WebSocket service disconnected and cleaned up');
  }
}

// Export a singleton instance of the service
export const webSocketService = new WebSocketService();
