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

// Add MessageBatch type for batch processing
interface MessageBatch {
  messages: Message[];
  oldestMessageId: number;
  newestMessageId: number;
  hasMore: boolean;
}

// Enhanced caching configuration
interface CacheConfig {
  chatListTTL: number; // Time to live for chat list cache
  messagesTTL: number; // Time to live for messages cache
  maxCachedMessages: number; // Max messages to keep in memory per chat
  syncInterval: number; // Interval for background sync
}

const CACHE_CONFIG: CacheConfig = {
  chatListTTL: 5 * 60 * 1000, // 5 minutes
  messagesTTL: 10 * 60 * 1000, // 10 minutes
  maxCachedMessages: 100, // Keep last 100 messages in memory
  syncInterval: 30 * 1000, // Sync every 30 seconds
};

// Cache timestamp tracking
interface CacheTimestamp {
  chatList?: number;
  messages: Map<number, number>; // chatId -> timestamp
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
  private messageCache = new Map<number, MessageBatch>(); // chatId -> messages
  private chatCache: Chat[] | null = null;
  private cacheTimestamps: CacheTimestamp = {
    messages: new Map()
  };
  private syncTimer: any = null;
  private pendingApiCalls = new Map<string, Promise<any>>(); // Prevent duplicate API calls
  
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
    return age < CACHE_CONFIG.chatListTTL;
  }

  private isMessageCacheValid(chatId: number): boolean {
    const timestamp = this.cacheTimestamps.messages.get(chatId);
    if (!timestamp) {
      return false;
    }
    
    const age = Date.now() - timestamp;
    return age < CACHE_CONFIG.messagesTTL;
  }

  private addMessageToCache(chatId: number, message: Message): void {
    const cachedBatch = this.messageCache.get(chatId);
    
    if (cachedBatch) {
      // Add to beginning (newest first)
      cachedBatch.messages.unshift(message);
      cachedBatch.newestMessageId = message.id;
      
      // Trim cache if too large
      if (cachedBatch.messages.length > CACHE_CONFIG.maxCachedMessages) {
        cachedBatch.messages = cachedBatch.messages.slice(0, CACHE_CONFIG.maxCachedMessages);
        cachedBatch.hasMore = true;
      }
    } else {
      // Create new batch
      const batch: MessageBatch = {
        messages: [message],
        oldestMessageId: message.id,
        newestMessageId: message.id,
        hasMore: false
      };
      
      this.messageCache.set(chatId, batch);
      this.cacheTimestamps.messages.set(chatId, Date.now());
    }
  }

  private replaceOptimisticMessage(chatId: number, tempId: number, realMessage: Message): void {
    const cachedBatch = this.messageCache.get(chatId);
    
    if (cachedBatch) {
      const index = cachedBatch.messages.findIndex(m => m.id === tempId);
      if (index !== -1) {
        cachedBatch.messages[index] = realMessage;
      }
    }
  }

  private removeMessageFromCache(chatId: number, messageId: number): void {
    const cachedBatch = this.messageCache.get(chatId);
    
    if (cachedBatch) {
      cachedBatch.messages = cachedBatch.messages.filter(m => m.id !== messageId);
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
    }, CACHE_CONFIG.syncInterval);
  }

  private async performBackgroundSync(): Promise<void> {
    const isConnected = await NetInfo.fetch().then(state => state.isConnected);
    if (!isConnected) {
      return;
    }

    // Sync active chats
    for (const [chatId, batch] of this.messageCache) {
      if (this.isMessageCacheValid(chatId)) {
        continue; // Skip if cache is still fresh
      }
      
      this.debouncedSyncChat(chatId);
    }

    // Sync chat list if needed
    if (!this.isChatListCacheValid()) {
      this.debouncedSyncChatList();
    }
  }

  private async syncChatInBackground(chatId: number): Promise<void> {
    try {
      console.log(`Background sync for chat ${chatId}`);
      await this.getChatDetails(chatId, undefined, CONFIG.APP.chatMessagesPageSize);
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
      // Update memory cache
      const cachedBatch = this.messageCache.get(editedMessage.chat_id);
      if (cachedBatch) {
        const messageIndex = cachedBatch.messages.findIndex(m => m.id === editedMessage.id);
        if (messageIndex !== -1) {
          cachedBatch.messages[messageIndex] = editedMessage;
        }
      }
      
      // Update SQLite
      await sqliteService.updateMessage(editedMessage);
    } catch (error) {
      console.error('Error updating message with edit:', error);
    }
  }

  async updateMessageWithDelete(messageId: number): Promise<void> {
    try {
      // Remove from all caches
      for (const [chatId, batch] of this.messageCache) {
        const index = batch.messages.findIndex(m => m.id === messageId);
        if (index !== -1) {
          batch.messages.splice(index, 1);
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
    
    // Clear caches
    this.messageCache.clear();
    this.chatCache = null;
    this.cacheTimestamps = {
      messages: new Map()
    };
    this.pendingApiCalls.clear();
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
