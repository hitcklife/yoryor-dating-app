import AsyncStorage from "@react-native-async-storage/async-storage";
import { sqliteService } from "./sqlite-service";
import NetInfo from "@react-native-community/netinfo";
import { apiClient } from "./api-client";
import { CONFIG, getAssetUrl } from "@/services/config";

// Types for the chats API response
export interface ProfilePhoto {
  id: number;
  user_id: number;
  original_url: string;
  thumbnail_url: string;
  medium_url: string;
  is_profile_photo: boolean;
  order: number;
  is_private: boolean;
  is_verified: boolean;
  status: string;
  rejection_reason: string | null;
  metadata: any | null;
  uploaded_at: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  gender: string;
  date_of_birth: string;
  age: number;
  city: string;
  state: string;
  province: string | null;
  country_id: number;
  latitude: number | null;
  longitude: number | null;
  bio: string;
  interests: string[];
  looking_for: string;
  profile_views: number;
  profile_completed_at: string;
  status: string | null;
  occupation: string | null;
  profession: string | null;
  country_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserPivot {
  chat_id: number;
  user_id: number;
  is_muted: boolean;
  last_read_at: string | null;
  joined_at: string;
  left_at: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface OtherUser {
  id: number;
  email: string;
  phone: string;
  google_id: string | null;
  facebook_id: string | null;
  email_verified_at: string | null;
  phone_verified_at: string | null;
  disabled_at: string | null;
  registration_completed: boolean;
  is_admin: boolean;
  is_private: boolean;
  profile_photo_path: string | null;
  last_active_at: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  two_factor_enabled: boolean;
  last_login_at: string;
  pivot: UserPivot;
  profile: Profile;
  profile_photo: ProfilePhoto | null;
}

export interface Message {
  id: number;
  chat_id: number;
  sender_id: number;
  reply_to_message_id: number | null;
  content: string;
  message_type: string;
  media_data: any | null;
  media_url: string | null;
  thumbnail_url: string | null;
  status: string;
  is_edited: boolean;
  edited_at: string | null;
  sent_at: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  is_mine?: boolean;
  is_read?: boolean;
  read_at?: string | null;
  sender?: {
    id: number;
    email: string;
  };
}

export interface Chat {
  id: number;
  type: string;
  name: string | null;
  description: string | null;
  last_activity_at: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  unread_count: number;
  other_user: OtherUser;
  last_message: Message | null;
  pivot: UserPivot;
}

export interface Pagination {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
}

export interface MessagePagination {
  total: number;
  loaded: number;
  has_more: boolean;
  current_page: number;
  last_page: number;
  per_page: number;
}

export interface ChatsResponse {
  status: string;
  data: {
    chats: Chat[];
    pagination: Pagination;
  };
}

export interface ChatDetailResponse {
  status: string;
  data: {
    chat: Chat;
    messages: Message[];
    pagination: MessagePagination;
  };
}

export interface SendMessageResponse {
  status: string;
  message: string;
  data: {
    message: Message;
  };
}

// Helper function to get current user ID
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

// Helper function to add is_mine property to messages
export function addMessageOwnership(messages: Message[], currentUserId: number): Message[] {
  return messages.map(message => ({
    ...message,
    is_mine: message.sender_id === currentUserId
  }));
}

// Helper function to get profile photo URL
export function getProfilePhotoUrl(user: OtherUser | null, useHighRes: boolean = false): string | null {
  if (!user) {
    return null;
  }

  // First try to use profile_photo if available
  if (user.profile_photo) {
    const photoUrl = useHighRes
      ? user.profile_photo.original_url
      : user.profile_photo.thumbnail_url || user.profile_photo.medium_url;

    if (photoUrl) {
      return getAssetUrl(photoUrl);
    }
  }

  // Fallback to profile_photo_path if profile_photo is not available
  if (user.profile_photo_path) {
    return getAssetUrl(user.profile_photo_path);
  }

  return null;
}

// Helper function to check if a message has been read by a specific user
export function isMessageReadByUser(message: Message, userId: number): boolean {
  return message.is_read || false;
}

// Helper function to get read status for a message (for UI display)
export function getMessageReadStatus(message: Message, currentUserId: number, otherUserId: number): 'sent' | 'delivered' | 'read' {
  if (!message.is_mine) {
    return 'sent'; // For received messages, we don't show read status
  }

  if (message.is_read) {
    return 'read';
  }

  if (message.status === 'sent' || message.status === 'delivered') {
    return 'delivered';
  }

  return 'sent';
}

class ChatsService {
  private currentUserId: number | null = null;

  constructor() {
    this.initializeCurrentUser();
  }

  private async initializeCurrentUser(): Promise<void> {
    this.currentUserId = await getCurrentUserId();
  }

  async getCurrentUser(): Promise<number | null> {
    if (!this.currentUserId) {
      this.currentUserId = await getCurrentUserId();
    }
    return this.currentUserId;
  }

  async getChats(page: number = 1): Promise<ChatsResponse | null> {
    try {
      // Ensure we have the current user ID
      await this.initializeCurrentUser();
      
      const isConnected = await NetInfo.fetch().then((state: any) => state.isConnected);

      if (!isConnected) {
        console.log('No internet connection, fetching from SQLite...');
        try {
          const offlineChats = await sqliteService.getChats();

          if (offlineChats && offlineChats.length > 0) {
            console.log(`Returning ${offlineChats.length} offline chats`);
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
          // Continue to try API call if offline data fails
        }
      }

      console.log('Making API call to fetch chats...');
      const response = await apiClient.chats.getAll(page, CONFIG.APP.defaultPageSize);

      console.log('API response status:', response.status);
      console.log('API response data:', response.data);

      if (response.status === 'success' && response.data) {
        const chatsData = response.data;
        console.log(`Received ${chatsData.chats?.length || 0} chats from API`);

        // Store chats in SQLite for offline access
        if (chatsData.chats && chatsData.chats.length > 0) {
          try {
            // Check if SQLite service is ready before storing
            if (sqliteService.isServiceInitialized()) {
              await sqliteService.storeChats(chatsData.chats);
              console.log('Chats stored in SQLite successfully');
            } else {
              console.log('SQLite service not ready, skipping storage');
            }
          } catch (sqliteError) {
            console.error('Error storing chats in SQLite:', sqliteError);
            // Don't throw error - API data is still valid
          }
        }

        return response as ChatsResponse;
      }

      console.log('API response was not successful, returning null');
      return null;
    } catch (error) {
      console.error('Error fetching chats:', error);

      // Try to get offline data if API call fails
      try {
        console.log('API call failed, trying offline data...');
        const offlineChats = await sqliteService.getChats();
        if (offlineChats && offlineChats.length > 0) {
          console.log(`Returning ${offlineChats.length} offline chats as fallback`);
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
        console.error('Error fetching offline chats as fallback:', sqliteError);
        // Return empty response instead of throwing error
        return {
          status: 'success',
          data: {
            chats: [],
            pagination: {
              total: 0,
              per_page: CONFIG.APP.defaultPageSize,
              current_page: 1,
              last_page: 1
            }
          }
        };
      }

      // If we get here, return empty response
      return {
        status: 'success',
        data: {
          chats: [],
          pagination: {
            total: 0,
            per_page: CONFIG.APP.defaultPageSize,
            current_page: 1,
            last_page: 1
          }
        }
      };
    }
  }

  async getChatDetails(chatId: number, page: number = 1): Promise<ChatDetailResponse | null> {
    try {
      const currentUserId = await this.getCurrentUser();
      if (!currentUserId) {
        throw new Error('Current user ID not found');
      }

      console.log('Getting chat details for chat:', chatId);

      // Always try SQLite first for better performance
      const offlineChat = await sqliteService.getChatById(chatId);
      const offlineMessages = await sqliteService.getMessagesByChatId(chatId);

      const isConnected = await NetInfo.fetch().then(state => state.isConnected);

      if (isConnected) {
        console.log('Making API call for fresh data...');
        const response = await apiClient.chats.getById(chatId, page, CONFIG.APP.chatMessagesPageSize);

        console.log('API response status:', response.status);

        if (response.status === 'success' && response.data) {
          const chatData = response.data;
          
          console.log('Raw API response data:', chatData);
          
          // Extract messages from the nested structure - API returns messages.data
          const messagesArray = chatData.messages?.data || [];
          const messagePagination = chatData.messages?.pagination || {
            total: 0,
            per_page: 20,
            current_page: 1,
            last_page: 1
          };

          console.log('Extracted messages array:', messagesArray.length);
          console.log('Message pagination:', messagePagination);

          // Add ownership to messages based on current user ID
          const messagesWithOwnership = addMessageOwnership(messagesArray, currentUserId);

          console.log('Processed API messages:', messagesWithOwnership.length);

          // Store data in SQLite for offline access
          if (chatData.chat) {
            try {
              await sqliteService.storeChatDetails(chatData.chat, messagesWithOwnership);
              console.log('Chat details stored in SQLite successfully');
            } catch (sqliteError) {
              console.error('Error storing chat details in SQLite:', sqliteError);
            }
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
      }

      // Fallback to offline data if available
      if (offlineChat && offlineMessages) {
        console.log('Using offline fallback data');
        const messagesWithOwnership = addMessageOwnership(offlineMessages, currentUserId);

        return {
          status: 'success',
          data: {
            chat: offlineChat,
            messages: messagesWithOwnership,
            pagination: {
              total: messagesWithOwnership.length,
              loaded: messagesWithOwnership.length,
              has_more: false,
              current_page: 1,
              last_page: 1,
              per_page: messagesWithOwnership.length
            }
          }
        };
      }

      console.log('No data available, returning null');
      return null;
    } catch (error) {
      console.error('Error fetching chat details:', error);

      // Try to get offline data if API call fails
      const currentUserId = await this.getCurrentUser();
      if (currentUserId) {
        const offlineChat = await sqliteService.getChatById(chatId);
        const offlineMessages = await sqliteService.getMessagesByChatId(chatId);

        if (offlineChat && offlineMessages) {
          console.log('Error fallback to offline data');
          const messagesWithOwnership = addMessageOwnership(offlineMessages, currentUserId);

          return {
            status: 'success',
            data: {
              chat: offlineChat,
              messages: messagesWithOwnership,
              pagination: {
                total: messagesWithOwnership.length,
                loaded: messagesWithOwnership.length,
                has_more: false,
                current_page: 1,
                last_page: 1,
                per_page: messagesWithOwnership.length
              }
            }
          };
        }
      }

      throw error;
    }
  }


  async sendMessage(chatId: number, content: string, messageType: string = 'text', mediaUrl?: string, mediaData?: any, replyToMessageId?: number): Promise<SendMessageResponse | null> {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No auth token found');
      }

      const currentUserId = await this.getCurrentUser();
      if (!currentUserId) {
        throw new Error('Current user ID not found');
      }

      const response = await apiClient.post(`/api/v1/chats/${chatId}/messages`, {
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

        // Store message in SQLite
        await sqliteService.saveMessage(messageWithOwnership);

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
      console.error('Error sending message:', error);
      throw error;
    }
  }

  async sendVoiceMessage(chatId: number, formData: FormData): Promise<SendMessageResponse | null> {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No auth token found');
      }

      const currentUserId = await this.getCurrentUser();
      if (!currentUserId) {
        throw new Error('Current user ID not found');
      }

      const response = await apiClient.post(`/api/v1/chats/${chatId}/messages`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });

      if (response.status === 'success' && response.data) {
        const message = response.data.message;

        // Add ownership to the sent message
        const messageWithOwnership = {
          ...message,
          is_mine: message.sender_id === currentUserId
        };

        // Store message in SQLite
        await sqliteService.saveMessage(messageWithOwnership);

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

  async loadMoreMessages(chatId: number, currentPage: number): Promise<{
    status: string;
    data: { chat: any; messages: Message[]; pagination: any }
  }> {
    try {
      const nextPage = currentPage + 1;
      console.log(`Loading more messages for chat ${chatId}, page ${nextPage}`);
      
      const currentUserId = await this.getCurrentUser();
      if (!currentUserId) {
        throw new Error('Current user ID not found');
      }

      const isConnected = await NetInfo.fetch().then(state => state.isConnected);

      if (isConnected) {
        console.log('Making API call for more messages...');
        const response = await apiClient.chats.getById(chatId, nextPage, CONFIG.APP.chatMessagesPageSize);

        console.log('API response status:', response.status);

        if (response.status === 'success' && response.data) {
          const chatData = response.data;
          
          // Extract messages from the nested structure - API returns messages.data
          const messagesArray = chatData.messages?.data || [];
          const messagePagination = chatData.messages?.pagination || {
            total: 0,
            per_page: 20,
            current_page: 1,
            last_page: 1
          };

          // Add ownership to messages based on current user ID
          const messagesWithOwnership = addMessageOwnership(messagesArray, currentUserId);

          console.log('Processed API messages for loadMore:', messagesWithOwnership.length);

          // Store new messages in SQLite for offline access
          if (messagesWithOwnership.length > 0) {
            await sqliteService.saveMessages(chatId, messagesWithOwnership);
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
      }

      // Fallback to SQLite
      const offlineMessages = await sqliteService.getMessagesByChatId(chatId, CONFIG.APP.chatMessagesPageSize);
      const messagesWithOwnership = addMessageOwnership(offlineMessages, currentUserId);

      return {
        status: 'success',
        data: {
          chat: null,
          messages: messagesWithOwnership,
          pagination: {
            total: messagesWithOwnership.length,
            loaded: messagesWithOwnership.length,
            has_more: false,
            current_page: 1,
            last_page: 1,
            per_page: messagesWithOwnership.length
          }
        }
      };
    } catch (error) {
      console.error('Error loading more messages:', error);
      throw error;
    }
  }

  /**
   * Edit a text message
   * @param chatId The chat ID
   * @param messageId The message ID to edit
   * @param newContent The new content for the message
   * @returns Promise with the updated message
   */
  async editMessage(chatId: number, messageId: number, newContent: string): Promise<{
    status: string;
    message: string;
    data: { message: Message };
  } | null> {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No auth token found');
      }

      const currentUserId = await this.getCurrentUser();
      if (!currentUserId) {
        throw new Error('Current user ID not found');
      }

      const response = await apiClient.put(`/api/v1/chats/${chatId}/messages/${messageId}`, {
        content: newContent
      });

      if (response.status === 'success' && response.data) {
        const message = response.data.message;

        // Add ownership to the edited message
        const messageWithOwnership = {
          ...message,
          is_mine: message.sender_id === currentUserId
        };

        // Update message in SQLite
        await sqliteService.saveMessage(messageWithOwnership);

        return {
          status: response.status,
          message: response.message || 'Message edited successfully',
          data: {
            message: messageWithOwnership
          }
        };
      }

      return null;
    } catch (error) {
      console.error('Error editing message:', error);
      throw error;
    }
  }

  /**
   * Delete a message
   * @param chatId The chat ID
   * @param messageId The message ID to delete
   * @returns Promise with success status
   */
  async deleteMessage(chatId: number, messageId: number): Promise<{
    status: string;
    message: string;
  } | null> {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No auth token found');
      }

      const response = await apiClient.delete(`/api/v1/chats/${chatId}/messages/${messageId}`);

      if (response.status === 'success') {
        // Mark message as deleted in SQLite (soft delete)
        await sqliteService.updateMessageStatus(messageId, 'deleted');

        return {
          status: response.status,
          message: response.message || 'Message deleted successfully'
        };
      }

      return null;
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }

  /**
   * Reply to a message
   * @param chatId The chat ID
   * @param content The reply content
   * @param replyToMessageId The ID of the message being replied to
   * @param messageType The type of message (default: 'text')
   * @returns Promise with the sent reply message
   */
  async replyToMessage(
    chatId: number, 
    content: string, 
    replyToMessageId: number,
    messageType: string = 'text'
  ): Promise<SendMessageResponse | null> {
    return this.sendMessage(chatId, content, messageType, undefined, undefined, replyToMessageId);
  }

  /**
   * Mark messages as read in a specific chat
   * @param chatId The chat ID
   * @returns Promise with success status
   */
  async markMessagesAsRead(chatId: number): Promise<{
    status: string;
    message: string;
    data: { count: number };
  } | null> {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No auth token found');
      }

      const response = await apiClient.post(`/api/v1/chats/${chatId}/read`);

      if (response.status === 'success') {
        return {
          status: response.status,
          message: response.message || 'Messages marked as read',
          data: {
            count: response.data?.count || 0
          }
        };
      }

      return null;
    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw error;
    }
  }

  /**
   * Get unread messages count across all chats
   * @returns Promise with unread count data
   */
  async getUnreadCount(): Promise<{
    status: string;
    data: {
      total_unread: number;
      chats: Array<{ chat_id: number; unread_count: number }>;
    };
  } | null> {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No auth token found');
      }

      const response = await apiClient.get('/api/v1/chats/unread-count');

      if (response.status === 'success') {
        return {
          status: response.status,
          data: response.data
        };
      }

      return null;
    } catch (error) {
      console.error('Error getting unread count:', error);
      throw error;
    }
  }

  /**
   * Update a specific chat with new message data
   * This is used for real-time updates when new messages arrive
   */
  async updateChatWithNewMessage(chatId: number, newMessage: Message): Promise<void> {
    try {
      // Update the chat's last message in SQLite
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

  /**
   * Mark messages as read for a specific chat
   */
  async markChatAsRead(chatId: number): Promise<any> {
    try {
      const response = await apiClient.post(`/api/v1/chats/${chatId}/read`);
      return response;
    } catch (error) {
      console.error('Error marking chat as read:', error);
      throw error;
    }
  }

  /**
   * Get a single chat with its latest message
   */
  async getChatWithLatestMessage(chatId: number): Promise<Chat | null> {
    try {
      const chat = await sqliteService.getChatById(chatId);
      if (chat) {
        // Get the latest message for this chat
        const latestMessage = await sqliteService.getLastMessageForChat(chatId);
        if (latestMessage) {
          chat.last_message = latestMessage;
        }
      }
      return chat;
    } catch (error) {
      console.error('Error getting chat with latest message:', error);
      return null;
    }
  }

}

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
