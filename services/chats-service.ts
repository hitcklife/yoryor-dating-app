import { 
  Chat, 
  Message, 
  ChatDetailResponse, 
  ChatsResponse, 
  SendMessageResponse, 
  EditMessageResponse, 
  DeleteMessageResponse,
  OtherUser, 
  Profile, 
  UserPivot,
  ProfilePhoto 
} from '@/types/chat-types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from './api-client';
import { sqliteService } from './sqlite-service';
import { CONFIG } from './config';
import NetInfo from "@react-native-community/netinfo";
import { debounce } from 'lodash';

// Re-export types for backward compatibility
export { 
  Chat, 
  Message, 
  ChatDetailResponse, 
  ChatsResponse, 
  SendMessageResponse, 
  EditMessageResponse, 
  DeleteMessageResponse,
  OtherUser, 
  Profile, 
  UserPivot,
  ProfilePhoto 
} from '@/types/chat-types';

// Optimized message cache with sliding window
interface SlidingMessageCache {
  messages: Message[];
  messageIds: Set<number>; // For deduplication
  oldestMessageId: number;
  newestMessageId: number;
  hasMore: boolean;
  preloadThreshold: number; // When to preload next batch
  isPreloading: boolean;
  lastScrollDirection: 'up' | 'down' | null;
}

// Differential sync tracking
interface DifferentialSyncState {
  chatId: number;
  lastSyncTimestamp: number;
  pendingDeletes: Set<number>; // Message IDs to delete
  pendingEdits: Map<number, Message>; // Message ID -> edited message
  syncInProgress: boolean;
}

// Optimized cache configuration
interface OptimizedCacheConfig {
  chatListTTL: number; // Time to live for chat list cache
  messagesTTL: number; // Time to live for messages cache
  maxCachedMessages: number; // Max messages in sliding window per chat
  preloadBatchSize: number; // Size of batch to preload
  preloadThreshold: number; // Messages from end to trigger preload
  syncInterval: number; // Interval for background sync
  cacheWarmingEnabled: boolean; // Enable cache warming
  warmingTopChatsCount: number; // Number of top chats to warm
  idleTimeBeforeWarming: number; // Time to wait before warming
  deduplicationEnabled: boolean; // Enable message deduplication
}

const OPTIMIZED_CACHE_CONFIG: OptimizedCacheConfig = {
  chatListTTL: 5 * 60 * 1000, // 5 minutes
  messagesTTL: 10 * 60 * 1000, // 10 minutes
  maxCachedMessages: 50, // Sliding window of 50 messages
  preloadBatchSize: 20, // Preload 20 messages at a time
  preloadThreshold: 10, // Start preloading when 10 messages from end
  syncInterval: 30 * 1000, // Sync every 30 seconds
  cacheWarmingEnabled: true,
  warmingTopChatsCount: 3, // Warm top 3 chats
  idleTimeBeforeWarming: 2 * 1000, // Wait 2 seconds before warming
  deduplicationEnabled: true,
};

// Enhanced cache timestamp tracking
interface EnhancedCacheTimestamp {
  chatList?: number;
  messages: Map<number, number>; // chatId -> timestamp
  lastWarming?: number; // When cache warming was last performed
  differentialSync: Map<number, DifferentialSyncState>; // chatId -> sync state
}

// Helper functions
export function getProfilePhotoUrl(user: OtherUser | null): string | null {
  if (!user) return null;

  if (user.profile_photo) {
    if (user.profile_photo.medium_url) return user.profile_photo.medium_url;
    if (user.profile_photo.thumbnail_url) return user.profile_photo.thumbnail_url;
    if (user.profile_photo.original_url) return user.profile_photo.original_url;
  }

  if (user.profile_photo_path) {
    if (user.profile_photo_path.startsWith('http')) {
      return user.profile_photo_path;
    }
    return `${CONFIG.API_URL}${user.profile_photo_path}`;
  }

  return null;
}

export function getMessageReadStatus(message: Message, currentUserId: number, otherUserId: number): 'sent' | 'delivered' | 'read' {
  if (!message || !message.is_mine) return 'sent';
  
  if (message.is_read || message.read_at) {
    return 'read';
  }
  
  return 'sent';
}

// Optimized message ownership function with memoization
const addMessageOwnershipCache = new WeakMap<Message[], Map<number, boolean>>();

export function addMessageOwnership(messages: Message[], currentUserId: number): Message[] {
  // Check cache first
  let ownershipCache = addMessageOwnershipCache.get(messages);
  if (!ownershipCache) {
    ownershipCache = new Map();
    addMessageOwnershipCache.set(messages, ownershipCache);
  }

  return messages.map(message => {
    const cacheKey = message.id;
    
    // Check if we already computed ownership for this message
    if (ownershipCache!.has(cacheKey)) {
      return { ...message, is_mine: ownershipCache!.get(cacheKey)! };
    }
    
    const isMine = message.sender_id === currentUserId;
    ownershipCache!.set(cacheKey, isMine);
    
    return { ...message, is_mine: isMine };
  });
}

export async function getCurrentUserId(): Promise<number | null> {
  try {
    const userData = await AsyncStorage.getItem('user_data');
    if (userData) {
      const user = JSON.parse(userData);
      return user.id;
    }
    return null;
  } catch (error) {
    console.error('Error getting current user ID:', error);
    return null;
  }
}

// Enhanced chat service with optimizations
class ChatsService {
  private currentUserId: number | null = null;
  private messageCache = new Map<number, SlidingMessageCache>(); // chatId -> messages
  private chatCache: Chat[] | null = null;
  private cacheTimestamps: EnhancedCacheTimestamp = {
    messages: new Map(),
    differentialSync: new Map()
  };
  private syncTimer: any = null;
  private pendingApiCalls = new Map<string, Promise<any>>(); // Prevent duplicate API calls
  private cacheWarmingTimer: any = null;
  private isAppIdle = false;
  
  // Debounced functions for optimization
  private debouncedSyncChat: (chatId: number) => void;
  private debouncedSyncChatList: () => void;

  constructor() {
    this.initializeCurrentUser();
    
    // Initialize debounced functions
    this.debouncedSyncChat = debounce((chatId: number) => {
      this.syncChatInBackground(chatId);
    }, 2000); // 2 second debounce
    
    this.debouncedSyncChatList = debounce(() => {
      this.syncChatListInBackground();
    }, 5000); // 5 second debounce
    
          // Start background sync
      this.startBackgroundSync();
      
      // Initialize cache warming if enabled
      if (OPTIMIZED_CACHE_CONFIG.cacheWarmingEnabled) {
        this.initializeCacheWarming();
      }
    }

    private async initializeCurrentUser(): Promise<void> {
      try {
        const userId = await getCurrentUserId();
        if (userId) {
          this.currentUserId = userId;
        }
      } catch (error) {
        console.error('Error initializing current user:', error);
      }
    }

  private async getCurrentUser(): Promise<number | null> {
    if (this.currentUserId) {
      return this.currentUserId;
    }
    
    const userId = await getCurrentUserId();
    if (userId) {
      this.currentUserId = userId;
    }
    return this.currentUserId;
  }

  // Enhanced chat list fetching with intelligent caching
  async getChats(page: number = 1, forceRefresh: boolean = false): Promise<ChatsResponse | null> {
    try {
      // Ensure we have the current user ID
      await this.initializeCurrentUser();
      
      // Check if we can use cached data
      if (!forceRefresh && this.isChatListCacheValid()) {
        console.log('Returning cached chat list');
        return {
          status: 'success',
          data: {
            chats: this.chatCache!,
            pagination: {
              total: this.chatCache!.length,
              per_page: CONFIG.APP.defaultPageSize,
              current_page: 1,
              last_page: 1
            }
          }
        };
      }
      
      const isConnected = await NetInfo.fetch().then((state: any) => state.isConnected);

      if (!isConnected) {
        console.log('No internet connection, fetching from SQLite...');
        try {
          const offlineChats = await sqliteService.getChatsOptimized();

          if (offlineChats && offlineChats.length > 0) {
            console.log(`Returning ${offlineChats.length} offline chats`);
            
            // Update cache
            this.chatCache = offlineChats;
            this.cacheTimestamps.chatList = Date.now();
            
            return {
              status: 'success',
              data: {
                chats: offlineChats,
                pagination: {
                  total: offlineChats.length,
                  per_page: CONFIG.APP.defaultPageSize,
                  current_page: 1,
                  last_page: 1
                }
              }
            };
          }
        } catch (sqliteError) {
          console.error('Error fetching offline chats:', sqliteError);
        }
      }

      // Prevent duplicate API calls
      const cacheKey = `chats-${page}`;
      if (this.pendingApiCalls.has(cacheKey)) {
        console.log('Returning pending API call for chat list');
        return await this.pendingApiCalls.get(cacheKey);
      }

      console.log('Making API call to fetch chats...');
      const apiPromise = apiClient.chats.getAll(page, CONFIG.APP.defaultPageSize);
      this.pendingApiCalls.set(cacheKey, apiPromise);

      try {
        const response = await apiPromise;
        
        console.log('API response status:', response.status);
        console.log('API response data:', response.data);

        if (response.status === 'success' && response.data?.chats) {
          const chats = response.data.chats;
          
          // Update cache
          if (page === 1) {
            this.chatCache = chats;
            this.cacheTimestamps.chatList = Date.now();
          }
          
          // Store in SQLite asynchronously
          this.storeChatListAsync(chats);
          
          return response as ChatsResponse;
        } else {
          console.error('Invalid API response format:', response);
          return null;
        }
      } finally {
        this.pendingApiCalls.delete(cacheKey);
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
      
      // Try to return offline data on error
      try {
        const offlineChats = await sqliteService.getChatsOptimized();
        if (offlineChats && offlineChats.length > 0) {
          return {
            status: 'success',
            data: {
              chats: offlineChats,
              pagination: {
                total: offlineChats.length,
                per_page: CONFIG.APP.defaultPageSize,
                current_page: 1,
                last_page: 1
              }
            }
          };
        }
      } catch (sqliteError) {
        console.error('Error fetching offline chats after API error:', sqliteError);
      }
      
      throw error;
    }
  }

  // Enhanced chat details with cursor-based pagination
  async getChatDetails(
    chatId: number, 
    beforeMessageId?: number, 
    limit: number = CONFIG.APP.chatMessagesPageSize
  ): Promise<ChatDetailResponse | null> {
    try {
      const currentUserId = await this.getCurrentUser();
      if (!currentUserId) {
        throw new Error('Current user ID not found');
      }

      console.log('Getting chat details for chat:', chatId);

      // Check memory cache first
      const cachedBatch = this.messageCache.get(chatId);
      if (cachedBatch && this.isMessageCacheValid(chatId) && !beforeMessageId) {
        console.log('Returning cached messages');
        
        // Get chat from SQLite
        const chat = await sqliteService.getChatById(chatId);
        if (chat) {
          return {
            status: 'success',
            data: {
              chat,
              messages: cachedBatch.messages.slice(0, limit),
              pagination: {
                total: cachedBatch.messages.length,
                loaded: Math.min(cachedBatch.messages.length, limit),
                has_more: cachedBatch.hasMore,
                current_page: 1,
                last_page: 1,
                per_page: limit
              }
            }
          };
        }
      }

      // Try SQLite first for better performance
      const offlineChat = await sqliteService.getChatById(chatId);
      let offlineMessages: Message[] = [];
      
      if (beforeMessageId) {
        offlineMessages = await sqliteService.getMessagesBeforeId(chatId, beforeMessageId, limit);
      } else {
        offlineMessages = await sqliteService.getInitialMessagesByChatId(chatId, limit);
      }

      const isConnected = await NetInfo.fetch().then(state => state.isConnected);

      if (isConnected) {
        // Prevent duplicate API calls for the same request
        const cacheKey = `chat-${chatId}-${beforeMessageId || 'initial'}-${limit}`;
        if (this.pendingApiCalls.has(cacheKey)) {
          console.log('Returning pending API call for chat details');
          return await this.pendingApiCalls.get(cacheKey);
        }

        console.log('Making API call for fresh data...');
        const apiPromise = this.fetchChatDetailsFromAPI(chatId, beforeMessageId, limit, currentUserId);
        this.pendingApiCalls.set(cacheKey, apiPromise);

        try {
          const apiResponse = await apiPromise;
          if (apiResponse) {
            return apiResponse;
          }
        } finally {
          this.pendingApiCalls.delete(cacheKey);
        }
      }

      // Return offline data if available
      if (offlineChat && offlineMessages.length > 0) {
        console.log('Returning offline data');
        const messagesWithOwnership = addMessageOwnership(offlineMessages, currentUserId);
        
        return {
          status: 'success',
          data: {
            chat: offlineChat,
            messages: messagesWithOwnership,
            pagination: {
              total: messagesWithOwnership.length,
              loaded: messagesWithOwnership.length,
              has_more: messagesWithOwnership.length === limit,
              current_page: 1,
              last_page: 1,
              per_page: limit
            }
          }
        };
      }

      return null;
    } catch (error) {
      console.error('Error getting chat details:', error);
      throw error;
    }
  }

  // Optimized API call for chat details
  private async fetchChatDetailsFromAPI(
    chatId: number, 
    beforeMessageId: number | undefined,
    limit: number,
    currentUserId: number
  ): Promise<ChatDetailResponse | null> {
    try {
      let response;
      
      if (beforeMessageId) {
        // TODO: Use cursor-based pagination when API supports it
        response = await apiClient.chats.getById(chatId, 1, limit);
      } else {
        response = await apiClient.chats.getById(chatId, 1, limit);
      }

      console.log('API response status:', response.status);

      if (response.status === 'success' && response.data) {
        const chatData = response.data;
        
        console.log('Raw API response data:', chatData);
        
        // Extract messages from the nested structure
        const messagesArray = chatData.messages?.data || [];
        const messagePagination = chatData.messages?.pagination || {
          total: 0,
          per_page: limit,
          current_page: 1,
          last_page: 1
        };

        console.log('Extracted messages array:', messagesArray.length);
        console.log('Message pagination:', messagePagination);

        // Add ownership to messages
        const messagesWithOwnership = addMessageOwnership(messagesArray, currentUserId);

        console.log('Processed API messages:', messagesWithOwnership.length);

        // Update memory cache for initial load
        if (!beforeMessageId && messagesWithOwnership.length > 0) {
          const batch: MessageBatch = {
            messages: messagesWithOwnership,
            oldestMessageId: messagesWithOwnership[messagesWithOwnership.length - 1].id,
            newestMessageId: messagesWithOwnership[0].id,
            hasMore: messagePagination.current_page < messagePagination.last_page
          };
          
          this.messageCache.set(chatId, batch);
          this.cacheTimestamps.messages.set(chatId, Date.now());
        }

        // Store data in SQLite asynchronously
        if (chatData.chat) {
          this.storeChatDetailsAsync(chatData.chat, messagesWithOwnership);
        }

        return {
          status: 'success',
          data: {
            chat: chatData.chat,
            messages: messagesWithOwnership,
            pagination: {
              total: messagePagination.total,
              loaded: messagesWithOwnership.length,
              has_more: messagePagination.current_page < messagePagination.last_page,
              current_page: messagePagination.current_page,
              last_page: messagePagination.last_page,
              per_page: messagePagination.per_page
            }
          }
        };
      }

      return null;
    } catch (error) {
      console.error('Error fetching chat details from API:', error);
      throw error;
    }
  }

  // Optimized message sending with immediate UI feedback
  async sendMessage(
    chatId: number, 
    content: string, 
    messageType: string = 'text', 
    mediaUrl?: string, 
    mediaData?: any, 
    replyToMessageId?: number
  ): Promise<SendMessageResponse | null> {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No auth token found');
      }

      const currentUserId = await this.getCurrentUser();
      if (!currentUserId) {
        throw new Error('Current user ID not found');
      }

      // Create optimistic message for immediate UI feedback
      const optimisticMessage: Message = {
        id: Date.now(), // Temporary ID
        chat_id: chatId,
        sender_id: currentUserId,
        content,
        message_type: messageType,
        media_url: mediaUrl || null,
        media_data: mediaData || null,
        reply_to_message_id: replyToMessageId || null,
        status: 'sending',
        is_mine: true,
        is_edited: false,
        sent_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_read: false,
        read_at: null,
        edited_at: null,
        deleted_at: null,
        thumbnail_url: null,
        sender: {
          id: currentUserId,
          email: '' // Will be filled from actual response
        },
        reply_to: null
      };

      // Update local cache immediately
      this.addMessageToCache(chatId, optimisticMessage);

      // Make API call
      const response = await apiClient.chats.sendMessage(chatId, {
        content,
        message_type: messageType,
        media_url: mediaUrl,
        media_data: mediaData,
        reply_to_message_id: replyToMessageId
      });

      if (response.status === 'success' && response.data) {
        const message = response.data.message;

        // Add ownership to the sent message
        const messageWithOwnership = {
          ...message,
          is_mine: message.sender_id === currentUserId
        };

        // Update cache with real message
        this.replaceOptimisticMessage(chatId, optimisticMessage.id, messageWithOwnership);

        // Store message in SQLite asynchronously
        sqliteService.saveMessage(messageWithOwnership).catch(error => {
          console.error('Error saving message to SQLite:', error);
        });

        return {
          status: response.status,
          message: response.message || '',
          data: {
            message: messageWithOwnership
          }
        };
      }

      // Remove optimistic message on failure
      this.removeMessageFromCache(chatId, optimisticMessage.id);
      return null;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  // Send voice message with optimized handling
  async sendVoiceMessage(chatId: number, audioUri: string, duration: number): Promise<SendMessageResponse | null> {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No auth token found');
      }

      const currentUserId = await this.getCurrentUser();
      if (!currentUserId) {
        throw new Error('Current user ID not found');
      }

      // Create form data
      const formData = new FormData();
      formData.append('message_type', 'voice');
      formData.append('media_data', JSON.stringify({ duration }));
      
      // Append the audio file
      const audioFile = {
        uri: audioUri,
        type: 'audio/m4a',
        name: `voice_${Date.now()}.m4a`
      } as any;
      
      formData.append('audio', audioFile);

      // Send to API
      const response = await apiClient.chats.sendVoiceMessage(chatId, formData);

      if (response.status === 'success' && response.data) {
        const message = response.data.message;

        // Add ownership to the sent message
        const messageWithOwnership = {
          ...message,
          is_mine: message.sender_id === currentUserId
        };

        // Store message in SQLite asynchronously
        sqliteService.saveMessage(messageWithOwnership).catch(error => {
          console.error('Error saving voice message to SQLite:', error);
        });

        return {
          status: response.status,
          message: response.message || '',
          data: {
            message: messageWithOwnership
          }
        };
      }

      return null;
    } catch (error) {
      console.error('Error sending voice message:', error);
      throw error;
    }
  }

  // Send file message (images, videos, etc.)
  async sendFileMessage(chatId: number, formData: FormData): Promise<SendMessageResponse | null> {
    try {
      const currentUserId = await this.getCurrentUser();
      if (!currentUserId) {
        throw new Error('Current user ID not found');
      }

      // Send to API using the same endpoint as voice messages
      const response = await apiClient.chats.sendVoiceMessage(chatId, formData);

      if (response.status === 'success' && response.data) {
        const message = response.data.message;

        // Add ownership to the sent message
        const messageWithOwnership = {
          ...message,
          is_mine: message.sender_id === currentUserId
        };

        // Store message in SQLite asynchronously
        sqliteService.saveMessage(messageWithOwnership).catch(error => {
          console.error('Error saving file message to SQLite:', error);
        });

        return {
          status: response.status,
          message: response.message || '',
          data: {
            message: messageWithOwnership
          }
        };
      }

      return null;
    } catch (error) {
      console.error('Error sending file message:', error);
      throw error;
    }
  }

  // Enhanced message editing with optimistic updates
  async editMessage(chatId: number, messageId: number, newContent: string): Promise<EditMessageResponse | null> {
    try {
      const currentUserId = await this.getCurrentUser();
      if (!currentUserId) {
        throw new Error('Current user ID not found');
      }

      // Update cache optimistically
      const cachedBatch = this.messageCache.get(chatId);
      if (cachedBatch) {
        const messageIndex = cachedBatch.messages.findIndex(m => m.id === messageId);
        if (messageIndex !== -1) {
          const oldMessage = cachedBatch.messages[messageIndex];
          cachedBatch.messages[messageIndex] = {
            ...oldMessage,
            content: newContent,
            is_edited: true,
            edited_at: new Date().toISOString()
          };
        }
      }

      // Make API call
      const response = await apiClient.chats.editMessage(chatId, messageId, newContent);

      if (response.status === 'success' && response.data) {
        const editedMessage = response.data.message;

        // Add ownership
        const messageWithOwnership = {
          ...editedMessage,
          is_mine: editedMessage.sender_id === currentUserId
        };

        // Update SQLite asynchronously
        sqliteService.updateMessage(messageWithOwnership).catch((error: any) => {
          console.error('Error updating message in SQLite:', error);
        });

        return {
          status: response.status,
          message: response.message || '',
          data: {
            message: messageWithOwnership
          }
        };
      }

      // Revert optimistic update on failure
      // TODO: Implement revert logic if needed

      return null;
    } catch (error) {
      console.error('Error editing message:', error);
      throw error;
    }
  }

  // Delete message with cache cleanup
  async deleteMessage(chatId: number, messageId: number): Promise<DeleteMessageResponse | null> {
    try {
      // Remove from cache immediately
      this.removeMessageFromCache(chatId, messageId);

      // Make API call
      const response = await apiClient.chats.deleteMessage(chatId, messageId);

      if (response.status === 'success') {
        // Mark as deleted in SQLite asynchronously
        sqliteService.markMessageAsDeleted(messageId).catch((error: any) => {
          console.error('Error marking message as deleted in SQLite:', error);
        });

        return {
          status: response.status,
          message: response.message || 'Message deleted successfully',
          data: response.data
        };
      }

      return null;
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }

  // Reply to a message
  async replyToMessage(
    chatId: number, 
    content: string, 
    replyToMessageId: number,
    messageType: string = 'text'
  ): Promise<SendMessageResponse | null> {
    return this.sendMessage(chatId, content, messageType, undefined, undefined, replyToMessageId);
  }

  // Mark messages as read with batch processing
  async markMessagesAsRead(chatId: number, messageIds: number[]): Promise<void> {
    try {
      // Update cache immediately for responsive UI
      const cachedBatch = this.messageCache.get(chatId);
      if (cachedBatch) {
        cachedBatch.messages.forEach(msg => {
          if (messageIds.includes(msg.id) && !msg.is_mine) {
            msg.is_read = true;
            msg.read_at = new Date().toISOString();
          }
        });
      }

      // Make API call to mark messages as read
      await apiClient.chats.markMessagesAsRead(chatId, messageIds);

      // Update SQLite
      await sqliteService.markMessagesAsRead(messageIds);
      
      // Update unread count in chat list
      if (this.chatCache) {
        const chat = this.chatCache.find(c => c.id === chatId);
        if (chat) {
          // Calculate new unread count
          const readCount = messageIds.length;
          chat.unread_count = Math.max(0, (chat.unread_count || 0) - readCount);
        }
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
      // Don't throw - read receipts are non-critical
    }
  }

  // Mark all messages in a chat as read
  async markChatAsRead(chatId: number): Promise<void> {
    try {
      // Update chat cache
      if (this.chatCache) {
        const chat = this.chatCache.find(c => c.id === chatId);
        if (chat) {
          chat.unread_count = 0;
        }
      }

      // Update message cache
      const cachedBatch = this.messageCache.get(chatId);
      if (cachedBatch) {
        cachedBatch.messages.forEach(msg => {
          if (!msg.is_mine && !msg.is_read) {
            msg.is_read = true;
            msg.read_at = new Date().toISOString();
          }
        });
      }

      // Make API call to mark all as read
      await apiClient.chats.markMessagesAsRead(chatId);

      // Update SQLite
      await sqliteService.executeSql(
        `UPDATE messages SET is_read = 1, read_at = datetime('now') 
         WHERE chat_id = ? AND is_mine = 0 AND is_read = 0`,
        [chatId]
      );
    } catch (error) {
      console.error('Error marking chat as read:', error);
    }
  }

  // Get unread message count
  async getUnreadCount(): Promise<number> {
    try {
      const chats = await this.getChats(1);
      if (!chats || chats.status !== 'success') {
        return 0;
      }

      return chats.data.chats.reduce((total: number, chat) => total + (chat.unread_count || 0), 0);
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  // Cache management methods
  private isChatListCacheValid(): boolean {
    if (!this.chatCache || !this.cacheTimestamps.chatList) {
      return false;
    }
    
    const age = Date.now() - this.cacheTimestamps.chatList;
    return age < OPTIMIZED_CACHE_CONFIG.chatListTTL;
  }

  private isMessageCacheValid(chatId: number): boolean {
    const timestamp = this.cacheTimestamps.messages.get(chatId);
    if (!timestamp) {
      return false;
    }
    
    const age = Date.now() - timestamp;
    return age < OPTIMIZED_CACHE_CONFIG.messagesTTL;
  }

  // === OPTIMIZED CACHE METHODS ===

  /**
   * Initialize cache warming system
   */
  private initializeCacheWarming(): void {
    // Set up idle detection
    this.setupIdleDetection();
    
    // Schedule initial cache warming
    this.cacheWarmingTimer = setTimeout(() => {
      this.performCacheWarming();
    }, OPTIMIZED_CACHE_CONFIG.idleTimeBeforeWarming);
  }

  /**
   * Set up idle detection for cache warming
   */
  private setupIdleDetection(): void {
    // Simple idle detection based on API calls
    let lastActivity = Date.now();
    
    // Override the existing API call tracking to detect activity
    const originalApiCall = this.pendingApiCalls.set.bind(this.pendingApiCalls);
    this.pendingApiCalls.set = (key: string, promise: Promise<any>) => {
      lastActivity = Date.now();
      this.isAppIdle = false;
      return originalApiCall(key, promise);
    };

    // Check for idle state every 5 seconds
    setInterval(() => {
      const timeSinceActivity = Date.now() - lastActivity;
      this.isAppIdle = timeSinceActivity > OPTIMIZED_CACHE_CONFIG.idleTimeBeforeWarming;
    }, 5000);
  }

  /**
   * Perform cache warming for top chats
   */
  private async performCacheWarming(): Promise<void> {
    if (!this.isAppIdle || !OPTIMIZED_CACHE_CONFIG.cacheWarmingEnabled) {
      return;
    }

    try {
      console.log('Starting cache warming...');
      
      // Get current chat list
      const chats = await this.getChats(1);
      if (!chats || chats.status !== 'success') {
        return;
      }

      // Warm top N chats
      const topChats = chats.data.chats.slice(0, OPTIMIZED_CACHE_CONFIG.warmingTopChatsCount);
      
      for (const chat of topChats) {
        if (!this.isAppIdle) {
          break; // Stop if app becomes active
        }
        
        // Check if chat is already cached
        if (this.messageCache.has(chat.id) && this.isMessageCacheValid(chat.id)) {
          continue;
        }
        
        console.log(`Cache warming for chat ${chat.id}`);
        
        // Warm the cache in background
        this.getChatDetails(chat.id).catch(error => {
          console.error(`Error warming cache for chat ${chat.id}:`, error);
        });
        
        // Small delay between warmings
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      this.cacheTimestamps.lastWarming = Date.now();
      console.log('Cache warming completed');
    } catch (error) {
      console.error('Error during cache warming:', error);
    }
  }

  /**
   * Add message to sliding window cache with deduplication
   */
  private addMessageToSlidingCache(chatId: number, message: Message): void {
    const cachedData = this.messageCache.get(chatId);
    
    if (cachedData) {
      // Check for deduplication
      if (OPTIMIZED_CACHE_CONFIG.deduplicationEnabled && cachedData.messageIds.has(message.id)) {
        console.log(`Duplicate message ${message.id} detected, skipping`);
        return;
      }
      
      // Add to beginning (newest first)
      cachedData.messages.unshift(message);
      cachedData.messageIds.add(message.id);
      cachedData.newestMessageId = message.id;
      
      // Maintain sliding window size
      if (cachedData.messages.length > OPTIMIZED_CACHE_CONFIG.maxCachedMessages) {
        const removedMessages = cachedData.messages.splice(OPTIMIZED_CACHE_CONFIG.maxCachedMessages);
        
        // Remove from deduplication set
        removedMessages.forEach(msg => {
          cachedData.messageIds.delete(msg.id);
        });
        
        cachedData.hasMore = true;
        cachedData.oldestMessageId = cachedData.messages[cachedData.messages.length - 1].id;
      }
    } else {
      // Create new sliding cache
      const newCache: SlidingMessageCache = {
        messages: [message],
        messageIds: new Set([message.id]),
        oldestMessageId: message.id,
        newestMessageId: message.id,
        hasMore: false,
        preloadThreshold: OPTIMIZED_CACHE_CONFIG.preloadThreshold,
        isPreloading: false,
        lastScrollDirection: null
      };
      
      this.messageCache.set(chatId, newCache);
      this.cacheTimestamps.messages.set(chatId, Date.now());
    }
  }

  /**
   * Check if preload is needed based on scroll position
   */
  private shouldPreloadMessages(chatId: number, currentIndex: number): boolean {
    const cachedData = this.messageCache.get(chatId);
    if (!cachedData || cachedData.isPreloading || !cachedData.hasMore) {
      return false;
    }
    
    const messagesFromEnd = cachedData.messages.length - currentIndex;
    return messagesFromEnd <= cachedData.preloadThreshold;
  }

  /**
   * Preload next batch of messages
   */
  private async preloadNextBatch(chatId: number): Promise<void> {
    const cachedData = this.messageCache.get(chatId);
    if (!cachedData || cachedData.isPreloading) {
      return;
    }
    
    cachedData.isPreloading = true;
    
    try {
      console.log(`Preloading next batch for chat ${chatId}`);
      
      // Get older messages
      const response = await this.getChatDetails(
        chatId,
        cachedData.oldestMessageId,
        OPTIMIZED_CACHE_CONFIG.preloadBatchSize
      );
      
      if (response && response.status === 'success' && response.data.messages.length > 0) {
        const newMessages = response.data.messages;
        
        // Add to the end of cache (older messages)
        newMessages.forEach(msg => {
          if (!cachedData.messageIds.has(msg.id)) {
            cachedData.messages.push(msg);
            cachedData.messageIds.add(msg.id);
          }
        });
        
        cachedData.oldestMessageId = newMessages[newMessages.length - 1].id;
        cachedData.hasMore = response.data.pagination.has_more;
        
        // Maintain sliding window
        if (cachedData.messages.length > OPTIMIZED_CACHE_CONFIG.maxCachedMessages) {
          const excessCount = cachedData.messages.length - OPTIMIZED_CACHE_CONFIG.maxCachedMessages;
          const removedMessages = cachedData.messages.splice(0, excessCount);
          
          // Remove from deduplication set
          removedMessages.forEach(msg => {
            cachedData.messageIds.delete(msg.id);
          });
          
          cachedData.newestMessageId = cachedData.messages[0].id;
        }
      }
    } catch (error) {
      console.error(`Error preloading messages for chat ${chatId}:`, error);
    } finally {
      cachedData.isPreloading = false;
    }
  }

  /**
   * Initialize differential sync state for a chat
   */
  private initializeDifferentialSync(chatId: number): void {
    if (!this.cacheTimestamps.differentialSync.has(chatId)) {
      const syncState: DifferentialSyncState = {
        chatId,
        lastSyncTimestamp: Date.now(),
        pendingDeletes: new Set(),
        pendingEdits: new Map(),
        syncInProgress: false
      };
      
      this.cacheTimestamps.differentialSync.set(chatId, syncState);
    }
  }

  /**
   * Perform differential sync for a chat
   */
  private async performDifferentialSync(chatId: number): Promise<void> {
    const syncState = this.cacheTimestamps.differentialSync.get(chatId);
    if (!syncState || syncState.syncInProgress) {
      return;
    }
    
    syncState.syncInProgress = true;
    
    try {
      console.log(`Performing differential sync for chat ${chatId}`);
      
      // Get messages newer than last sync
      const response = await apiClient.chats.getMessagesAfter(chatId, syncState.lastSyncTimestamp);
      
      if (response && response.status === 'success' && response.data.messages) {
        const newMessages = response.data.messages;
        
        // Process new messages
        newMessages.forEach(message => {
          this.addMessageToSlidingCache(chatId, message);
        });
        
        // Process pending deletes
        syncState.pendingDeletes.forEach(messageId => {
          this.removeMessageFromSlidingCache(chatId, messageId);
        });
        syncState.pendingDeletes.clear();
        
        // Process pending edits
        syncState.pendingEdits.forEach((editedMessage, messageId) => {
          this.updateMessageInSlidingCache(chatId, editedMessage);
        });
        syncState.pendingEdits.clear();
        
        // Update last sync timestamp
        syncState.lastSyncTimestamp = Date.now();
      }
    } catch (error) {
      console.error(`Error in differential sync for chat ${chatId}:`, error);
    } finally {
      syncState.syncInProgress = false;
    }
  }

  /**
   * Remove message from sliding cache
   */
  private removeMessageFromSlidingCache(chatId: number, messageId: number): void {
    const cachedData = this.messageCache.get(chatId);
    
    if (cachedData) {
      const index = cachedData.messages.findIndex(m => m.id === messageId);
      if (index !== -1) {
        cachedData.messages.splice(index, 1);
        cachedData.messageIds.delete(messageId);
        
        // Update bounds if necessary
        if (cachedData.messages.length > 0) {
          cachedData.newestMessageId = cachedData.messages[0].id;
          cachedData.oldestMessageId = cachedData.messages[cachedData.messages.length - 1].id;
        }
      }
    }
  }

  /**
   * Update message in sliding cache
   */
  private updateMessageInSlidingCache(chatId: number, updatedMessage: Message): void {
    const cachedData = this.messageCache.get(chatId);
    
    if (cachedData) {
      const index = cachedData.messages.findIndex(m => m.id === updatedMessage.id);
      if (index !== -1) {
        cachedData.messages[index] = updatedMessage;
      }
    }
  }

  /**
   * Get messages with scroll position tracking for preloading
   */
  async getMessagesWithPreload(chatId: number, currentIndex: number, direction: 'up' | 'down'): Promise<Message[]> {
    const cachedData = this.messageCache.get(chatId);
    if (!cachedData) {
      return [];
    }
    
    // Update scroll direction
    cachedData.lastScrollDirection = direction;
    
    // Check if preload is needed
    if (direction === 'down' && this.shouldPreloadMessages(chatId, currentIndex)) {
      // Preload in background
      this.preloadNextBatch(chatId).catch(error => {
        console.error(`Error preloading messages for chat ${chatId}:`, error);
      });
    }
    
    return cachedData.messages;
  }

  private addMessageToCache(chatId: number, message: Message): void {
    // Use the new sliding cache method
    this.addMessageToSlidingCache(chatId, message);
    
    // Initialize differential sync if not already done
    this.initializeDifferentialSync(chatId);
  }

  private replaceOptimisticMessage(chatId: number, tempId: number, realMessage: Message): void {
    const cachedData = this.messageCache.get(chatId);
    
    if (cachedData) {
      const index = cachedData.messages.findIndex(m => m.id === tempId);
      if (index !== -1) {
        // Remove old message from deduplication set
        cachedData.messageIds.delete(tempId);
        
        // Add new message
        cachedData.messages[index] = realMessage;
        cachedData.messageIds.add(realMessage.id);
      }
    }
  }

  private removeMessageFromCache(chatId: number, messageId: number): void {
    // Use the new sliding cache method
    this.removeMessageFromSlidingCache(chatId, messageId);
    
    // Add to pending deletes for differential sync
    const syncState = this.cacheTimestamps.differentialSync.get(chatId);
    if (syncState) {
      syncState.pendingDeletes.add(messageId);
    }
  }

  // Async storage operations for better performance
  private async storeChatListAsync(chats: Chat[]): Promise<void> {
    try {
      await sqliteService.storeChats(chats);
      console.log('Chat list stored in SQLite');
    } catch (error) {
      console.error('Error storing chat list in SQLite:', error);
    }
  }

  private async storeChatDetailsAsync(chat: Chat, messages: Message[]): Promise<void> {
    try {
      await sqliteService.storeChatDetails(chat, messages);
      console.log('Chat details stored in SQLite');
    } catch (error) {
      console.error('Error storing chat details in SQLite:', error);
    }
  }

  // Background sync methods
  private startBackgroundSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = setInterval(() => {
      this.performBackgroundSync();
    }, OPTIMIZED_CACHE_CONFIG.syncInterval);
  }

  private async performBackgroundSync(): Promise<void> {
    const isConnected = await NetInfo.fetch().then(state => state.isConnected);
    if (!isConnected) {
      return;
    }

    // Perform differential sync for active chats
    for (const [chatId, cachedData] of this.messageCache) {
      if (this.isMessageCacheValid(chatId)) {
        continue; // Skip if cache is still fresh
      }
      
      // Use differential sync instead of full sync
      this.performDifferentialSync(chatId).catch(error => {
        console.error(`Error in differential sync for chat ${chatId}:`, error);
      });
    }

    // Sync chat list if needed
    if (!this.isChatListCacheValid()) {
      this.debouncedSyncChatList();
    }
    
    // Perform cache warming if app is idle
    if (this.isAppIdle && OPTIMIZED_CACHE_CONFIG.cacheWarmingEnabled) {
      const timeSinceLastWarming = this.cacheTimestamps.lastWarming 
        ? Date.now() - this.cacheTimestamps.lastWarming 
        : Infinity;
      
      // Only warm cache if enough time has passed
      if (timeSinceLastWarming > OPTIMIZED_CACHE_CONFIG.idleTimeBeforeWarming) {
        this.performCacheWarming();
      }
    }
  }

  private async syncChatInBackground(chatId: number): Promise<void> {
    try {
      console.log(`Background sync for chat ${chatId}`);
      
      // Use differential sync for more efficient updates
      await this.performDifferentialSync(chatId);
    } catch (error) {
      console.error(`Error syncing chat ${chatId}:`, error);
    }
  }

  private async syncChatListInBackground(): Promise<void> {
    try {
      console.log('Background sync for chat list');
      await this.getChats(1);
    } catch (error) {
      console.error('Error syncing chat list:', error);
    }
  }

  // Update methods for real-time events
  async updateChatWithNewMessage(chatId: number, newMessage: Message): Promise<void> {
    try {
      // Update memory cache
      this.addMessageToCache(chatId, newMessage);
      
      // Update chat list cache
      if (this.chatCache) {
        const chatIndex = this.chatCache.findIndex(c => c.id === chatId);
        if (chatIndex !== -1) {
          this.chatCache[chatIndex].last_message = newMessage;
          this.chatCache[chatIndex].last_activity_at = newMessage.created_at;
          
          // Update unread count if message is not from current user
          const currentUserId = await this.getCurrentUser();
          if (currentUserId && newMessage.sender_id !== currentUserId) {
            this.chatCache[chatIndex].unread_count = (this.chatCache[chatIndex].unread_count || 0) + 1;
          }
          
          // Re-sort chats by last activity
          this.chatCache.sort((a, b) => {
            const timeA = new Date(a.last_activity_at).getTime();
            const timeB = new Date(b.last_activity_at).getTime();
            return timeB - timeA;
          });
        }
      }
      
      // Update SQLite
      await sqliteService.updateChatLastMessage(chatId, newMessage);
      
      // Update unread count if message is not from current user
      const currentUserId = await this.getCurrentUser();
      if (currentUserId && newMessage.sender_id !== currentUserId) {
        await sqliteService.incrementChatUnreadCount(chatId);
      }
    } catch (error) {
      console.error('Error updating chat with new message:', error);
    }
  }

  async updateMessageWithEdit(editedMessage: Message): Promise<void> {
    try {
      // Update sliding cache
      this.updateMessageInSlidingCache(editedMessage.chat_id, editedMessage);
      
      // Add to differential sync pending edits
      const syncState = this.cacheTimestamps.differentialSync.get(editedMessage.chat_id);
      if (syncState) {
        syncState.pendingEdits.set(editedMessage.id, editedMessage);
      }
      
      // Update SQLite
      await sqliteService.updateMessage(editedMessage);
    } catch (error) {
      console.error('Error updating message with edit:', error);
    }
  }

  async updateMessageWithDelete(messageId: number): Promise<void> {
    try {
      // Remove from all sliding caches
      for (const [chatId, cachedData] of this.messageCache) {
        const index = cachedData.messages.findIndex(m => m.id === messageId);
        if (index !== -1) {
          this.removeMessageFromSlidingCache(chatId, messageId);
          break;
        }
      }
      
      // Mark as deleted in SQLite
      await sqliteService.markMessageAsDeleted(messageId);
    } catch (error) {
      console.error('Error updating message with delete:', error);
    }
  }

  async updateChatListWithMessageEdit(editedMessage: Message): Promise<void> {
    try {
      if (this.chatCache) {
        const chat = this.chatCache.find(c => c.id === editedMessage.chat_id);
        if (chat && chat.last_message && chat.last_message.id === editedMessage.id) {
          chat.last_message = editedMessage;
        }
      }
    } catch (error) {
      console.error('Error updating chat list with message edit:', error);
    }
  }

  async updateChatListWithMessageDelete(chatId: number, messageId: number): Promise<void> {
    try {
      if (this.chatCache) {
        const chat = this.chatCache.find(c => c.id === chatId);
        if (chat && chat.last_message && chat.last_message.id === messageId) {
          // Fetch the previous message to update last_message
          const messages = await sqliteService.getInitialMessagesByChatId(chatId, 1);
          if (messages.length > 0) {
            chat.last_message = messages[0];
          } else {
            chat.last_message = null;
          }
        }
      }
    } catch (error) {
      console.error('Error updating chat list with message delete:', error);
    }
  }

  // Cleanup method
  cleanup(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    
    if (this.cacheWarmingTimer) {
      clearTimeout(this.cacheWarmingTimer);
      this.cacheWarmingTimer = null;
    }
    
    // Clear caches
    this.messageCache.clear();
    this.chatCache = null;
    this.cacheTimestamps = {
      messages: new Map(),
      differentialSync: new Map()
    };
    this.pendingApiCalls.clear();
    this.isAppIdle = false;
  }
}

// Create singleton instance
export const chatsService = new ChatsService();

// Initialize the service
export async function initializeChatsService(): Promise<void> {
  try {
    // Check if SQLite service is already initialized
    if (!sqliteService.isServiceInitialized()) {
      console.log('SQLite service not initialized, waiting for initialization...');
      
      // Wait a bit for the service to initialize
      let attempts = 0;
      const maxAttempts = 10;
      
      while (!sqliteService.isServiceInitialized() && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      if (!sqliteService.isServiceInitialized()) {
        console.error('SQLite service failed to initialize after waiting');
        throw new Error('SQLite service initialization timeout');
      }
    }
    
    console.log('Chats service initialized successfully');
  } catch (error) {
    console.error('Error initializing chats service:', error);
    throw error;
  }
}
