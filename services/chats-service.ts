import AsyncStorage from "@react-native-async-storage/async-storage";
import { sqliteService } from "./sqlite-service";
import NetInfo from "@react-native-community/netinfo";
import { apiClient } from "./api-client";
import { CONFIG, getAssetUrl } from "@/config";

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
  oldest_message_id: number;
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
      : user.profile_photo.medium_url;

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
      const isConnected = await NetInfo.fetch().then((state: any) => state.isConnected);

      if (!isConnected) {
        console.log('No internet connection, fetching from SQLite...');
        const offlineChats = await sqliteService.getChats();

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
      }

      const response = await apiClient.chats.getAll(page, CONFIG.APP.defaultPageSize);

      if (response.status === 'success') {
        const chatsData = response.data;

        // Store chats in SQLite for offline access
        await sqliteService.storeChats(chatsData.chats);

        return response as ChatsResponse;
      }

      return null;
    } catch (error) {
      console.error('Error fetching chats:', error);

      // Try to get offline data if API call fails
      const offlineChats = await sqliteService.getChats();
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

      throw error;
    }
  }

  async getChatDetails(chatId: number, page: number = 1): Promise<ChatDetailResponse | null> {
    try {
      const currentUserId = await this.getCurrentUser();
      if (!currentUserId) {
        throw new Error('Current user ID not found');
      }

      // Always try SQLite first for better performance
      const offlineChat = await sqliteService.getChatById(chatId);
      const offlineMessages = await sqliteService.getMessagesByChatId(chatId);

      const isConnected = await NetInfo.fetch().then(state => state.isConnected);

      // If we have offline data and no internet, return it
      if (!isConnected && offlineChat && offlineMessages) {
        console.log('No internet connection, using SQLite data...');
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
              oldest_message_id: messagesWithOwnership[0]?.id || 0
            }
          }
        };
      }

      // If we have internet, fetch fresh data only if we don't have recent local data
      if (isConnected) {
        const token = await AsyncStorage.getItem('auth_token');
        if (!token) {
          throw new Error('No auth token found');
        }

              const response = await apiClient.chats.getById(chatId, page, CONFIG.APP.chatMessagesPageSize);

        if (response.data.status === 'success') {
          const chatData = response.data.data;

          // Add ownership to messages based on current user ID
          const messagesWithOwnership = addMessageOwnership(chatData.messages, currentUserId);

          // Store data in SQLite for offline access
          await sqliteService.storeChatDetails(chatData.chat, messagesWithOwnership);

          return {
            ...response.data,
            data: {
              ...chatData,
              messages: messagesWithOwnership
            }
          };
        }
      }

      // Fallback to offline data if available
      if (offlineChat && offlineMessages) {
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
              oldest_message_id: messagesWithOwnership[0]?.id || 0
            }
          }
        };
      }

      return null;
    } catch (error) {
      console.error('Error fetching chat details:', error);

      // Try to get offline data if API call fails
      const currentUserId = await this.getCurrentUser();
      if (currentUserId) {
        const offlineChat = await sqliteService.getChatById(chatId);
        const offlineMessages = await sqliteService.getMessagesByChatId(chatId);

        if (offlineChat && offlineMessages) {
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
                oldest_message_id: messagesWithOwnership[0]?.id || 0
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

      const response = await axios.post(`${API_BASE_URL}/api/v1/chats/${chatId}/messages`, {
        content,
        message_type: messageType,
        media_url: mediaUrl,
        media_data: mediaData,
        reply_to_message_id: replyToMessageId
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (response.data.status === 'success') {
        const message = response.data.data.message;

        // Add ownership to the sent message
        const messageWithOwnership = {
          ...message,
          is_mine: message.sender_id === currentUserId
        };

        // Store message in SQLite
        await sqliteService.storeMessage(messageWithOwnership);

        return {
          ...response.data,
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

      const response = await axios.post(`${API_BASE_URL}/api/v1/chats/${chatId}/messages`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.status === 'success') {
        const message = response.data.data.message;

        // Add ownership to the sent message
        const messageWithOwnership = {
          ...message,
          is_mine: message.sender_id === currentUserId
        };

        // Store message in SQLite
        await sqliteService.storeMessage(messageWithOwnership);

        return {
          ...response.data,
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

  async loadMoreMessages(chatId: number, oldestMessageId: number): Promise<{
    status: string;
    data: { chat: any; messages: Message[]; pagination: any }
  }> {
    try {
      const currentUserId = await this.getCurrentUser();
      if (!currentUserId) {
        throw new Error('Current user ID not found');
      }

      // First check if we have older messages in SQLite
      const hasLocalMessages = await sqliteService.hasMessagesBeforeId(chatId, oldestMessageId);

      if (hasLocalMessages) {
        console.log('Loading older messages from SQLite...');
        const localMessages = await sqliteService.getMessagesBeforeId(chatId, oldestMessageId, 20);

        if (localMessages.length > 0) {
          return {
            status: 'success',
            data: {
              chat: null,
              messages: localMessages,
              pagination: {
                total: localMessages.length,
                loaded: localMessages.length,
                has_more: localMessages.length === 20, // Assume more if we got full batch
                oldest_message_id: localMessages[0]?.id || oldestMessageId
              }
            }
          };
        }
      }

      // If no local messages or need to fetch from server
      const isConnected = await NetInfo.fetch().then(state => state.isConnected);

      if (!isConnected) {
        // No internet and no local messages
        return {
          status: 'success',
          data: {
            chat: null,
            messages: [],
            pagination: {
              total: 0,
              loaded: 0,
              has_more: false,
              oldest_message_id: oldestMessageId
            }
          }
        };
      }

      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No auth token found');
      }

      console.log('Fetching older messages from server...');
      const response = await axios.get(`${API_BASE_URL}/api/v1/chats/${chatId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
        params: {
          before_message_id: oldestMessageId,
          per_page: 20
        }
      });

      if (response.data.status === 'success') {
        const messages = response.data.data.messages;

        // Add ownership to messages
        const messagesWithOwnership = addMessageOwnership(messages, currentUserId);

        // Store only new messages in SQLite (avoid duplicates)
        for (const message of messagesWithOwnership) {
          const exists = await sqliteService.messageExists(message.id);
          if (!exists) {
            await sqliteService.storeMessage(message);
          }
        }

        return {
          status: 'success',
          data: {
            chat: response.data.data.chat,
            messages: messagesWithOwnership,
            pagination: response.data.data.pagination
          }
        };
      }

      return {
        status: 'success',
        data: {
          chat: null,
          messages: [],
          pagination: {
            total: 0,
            loaded: 0,
            has_more: false,
            oldest_message_id: oldestMessageId
          }
        }
      };

    } catch (error) {
      console.error('Error loading more messages:', error);
      throw error;
    }
  }

}

export const chatsService = new ChatsService();
