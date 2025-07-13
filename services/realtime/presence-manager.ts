import { apiClient } from '../api-client';
import { EventEmitter, PresenceUser, PresenceEvent, TypingStatus } from './event-emitter';

interface TypingIndicatorManager {
  typingUsers: Map<string, { timeout: any; userName: string }>;
  typingDebounceMs: number;
}

/**
 * Manages presence-related functionality including online status, typing indicators, and presence channels
 */
export class PresenceManager {
  private eventEmitter: EventEmitter;
  private echo: any = null;
  private currentUserId: number | null = null;
  
  // Presence channels
  private presenceChannels = new Map<string, any>();
  private currentUserPresence: PresenceUser | null = null;
  
  // Typing indicators
  private typingUsers = new Map<string, { timeout: any; userName: string }>();
  private typingDebounceMs = 3000; // 3 seconds
  
  // Heartbeat system
  private presenceHeartbeatInterval: any = null;

  constructor(eventEmitter: EventEmitter) {
    this.eventEmitter = eventEmitter;
  }

  /**
   * Initialize presence system
   */
  async initialize(echo: any, userId: number): Promise<void> {
    this.echo = echo;
    this.currentUserId = userId;
    
    if (!this.currentUserId) return;

    try {
      // Set user online when connected
      await this.updateOnlineStatus(true);
      this.startPresenceHeartbeat();
      
      console.log('Presence system initialized');
    } catch (error) {
      console.error('Error initializing presence system:', error);
    }
  }

  /**
   * Subscribe to chat-specific presence channel
   */
  subscribeToChatPresence(chatId: number): any {
    if (!this.echo) {
      console.warn('Echo not initialized for chat presence');
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
          this.eventEmitter.emit('presence.chat.user.joined', {
            user,
            chatId,
            timestamp: new Date().toISOString()
          });
        })
        .leaving((user: any) => {
          console.log(`User left chat ${chatId}:`, user);
          this.eventEmitter.emit('presence.chat.user.left', {
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
  clearPresenceChannels(): void {
    for (const [channelName] of Array.from(this.presenceChannels.entries())) {
      this.unsubscribeFromPresence(channelName);
    }
    this.presenceChannels.clear();
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
   * Start presence heartbeat
   */
  startPresenceHeartbeat(): void {
    if (this.presenceHeartbeatInterval) return;

    // Send presence heartbeat every 30 seconds
    this.presenceHeartbeatInterval = setInterval(() => {
      this.sendPresenceHeartbeat();
    }, 30000);
  }

  /**
   * Stop presence heartbeat
   */
  stopPresenceHeartbeat(): void {
    if (this.presenceHeartbeatInterval) {
      clearInterval(this.presenceHeartbeatInterval);
      this.presenceHeartbeatInterval = null;
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

  // === TYPING INDICATOR MANAGEMENT ===

  /**
   * Add typing user
   */
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

  /**
   * Remove typing user
   */
  removeTypingUser(chatId: number, userId: number): void {
    const key = `${chatId}-${userId}`;
    const existing = this.typingUsers.get(key);
    if (existing) {
      clearTimeout(existing.timeout);
      this.typingUsers.delete(key);
    }
  }

  /**
   * Get typing users for chat
   */
  getTypingUsersForChat(chatId: number): string[] {
    const typingUserNames: string[] = [];
    for (const [key, value] of Array.from(this.typingUsers.entries())) {
      if (key.startsWith(`${chatId}-`)) {
        typingUserNames.push(value.userName);
      }
    }
    return typingUserNames;
  }

  /**
   * Clear all typing indicators
   */
  clearTypingIndicators(): void {
    for (const [key, value] of Array.from(this.typingUsers.entries())) {
      clearTimeout(value.timeout);
    }
    this.typingUsers.clear();
  }

  /**
   * Disconnect presence manager
   */
  disconnect(): void {
    try {
      this.stopPresenceHeartbeat();
      this.clearPresenceChannels();
      this.clearTypingIndicators();
      
      // Set user offline when disconnecting
      if (this.currentUserId) {
        this.updateOnlineStatus(false).catch(error => {
          console.error('Error setting offline status:', error);
        });
      }
      
      this.echo = null;
      this.currentUserId = null;
      this.currentUserPresence = null;
      
      console.log('Presence manager disconnected');
    } catch (error) {
      console.error('Error disconnecting presence manager:', error);
    }
  }

  // === GETTERS ===

  /**
   * Get current user presence
   */
  getCurrentUserPresence(): PresenceUser | null {
    return this.currentUserPresence;
  }

  /**
   * Get active presence channels
   */
  getActivePresenceChannels(): string[] {
    return Array.from(this.presenceChannels.keys());
  }

  /**
   * Get presence channel count
   */
  getPresenceChannelCount(): number {
    return this.presenceChannels.size;
  }

  /**
   * Check if subscribed to chat presence
   */
  isSubscribedToChatPresence(chatId: number): boolean {
    return this.presenceChannels.has(`presence-chat.${chatId}`);
  }

  /**
   * Get typing users count
   */
  getTypingUsersCount(): number {
    return this.typingUsers.size;
  }

  /**
   * Get all typing users info for debugging
   */
  getAllTypingUsers(): Map<string, { timeout: any; userName: string }> {
    return new Map(this.typingUsers);
  }

  /**
   * Set typing debounce time
   */
  setTypingDebounceMs(ms: number): void {
    this.typingDebounceMs = ms;
  }

  /**
   * Get typing debounce time
   */
  getTypingDebounceMs(): number {
    return this.typingDebounceMs;
  }
}

export type { PresenceUser, PresenceEvent, TypingStatus }; 