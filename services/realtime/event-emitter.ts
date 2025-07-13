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

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'failed' | 'reconnecting';
type ConnectionQuality = 'excellent' | 'good' | 'poor' | 'offline';

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

/**
 * Centralized event emitter for realtime WebSocket events
 */
export class EventEmitter {
  private eventListeners = new Map<keyof UnifiedWebSocketEvents, Set<any>>();
  private lastActivityTime = Date.now();
  private inactivityTimeoutMs = 10 * 60 * 1000; // 10 minutes
  private inactivityTimer: any = null;

  /**
   * Subscribe to an event
   */
  on<T extends keyof UnifiedWebSocketEvents>(event: T, listener: UnifiedWebSocketEvents[T]): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener);
  }

  /**
   * Unsubscribe from an event
   */
  off<T extends keyof UnifiedWebSocketEvents>(event: T, listener: UnifiedWebSocketEvents[T]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.eventListeners.delete(event);
      }
    }
  }

  /**
   * Emit an event to all listeners
   */
  emit<T extends keyof UnifiedWebSocketEvents>(event: T, data: Parameters<UnifiedWebSocketEvents[T]>[0]): void {
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

  /**
   * Get the number of listeners for an event
   */
  getListenerCount<T extends keyof UnifiedWebSocketEvents>(event: T): number {
    const listeners = this.eventListeners.get(event);
    return listeners ? listeners.size : 0;
  }

  /**
   * Get all active event names
   */
  getActiveEvents(): string[] {
    return Array.from(this.eventListeners.keys()).filter(key => 
      this.eventListeners.get(key)!.size > 0
    );
  }

  /**
   * Clear all event listeners
   */
  clearAll(): void {
    this.eventListeners.clear();
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
  }

  /**
   * Update last activity timestamp
   */
  private updateLastActivity(): void {
    this.lastActivityTime = Date.now();
    this.setupInactivityTimer();
  }

  /**
   * Setup inactivity timer
   */
  private setupInactivityTimer(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }

    this.inactivityTimer = setTimeout(() => {
      const timeSinceActivity = Date.now() - this.lastActivityTime;
      if (timeSinceActivity >= this.inactivityTimeoutMs) {
        console.log('Event emitter inactivity detected');
        // Emit inactivity event if needed
        this.emit('connection.state.changed', { 
          state: 'disconnected', 
          quality: 'offline' 
        });
      }
    }, this.inactivityTimeoutMs);
  }

  /**
   * Get last activity timestamp
   */
  getLastActivity(): number {
    return this.lastActivityTime;
  }
}

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
  PresenceUser,
  PresenceEvent,
  TypingStatus
}; 