import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { sqliteService } from "./sqlite-service";
import NetInfo from "@react-native-community/netinfo";

// Add base URL configuration (same as in auth-context)
const API_BASE_URL = 'https://incredibly-evident-hornet.ngrok-free.app';

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
      // Check if the URL is already absolute
      if (photoUrl.startsWith('http')) {
        return photoUrl;
      } else {
        return `${API_BASE_URL}${photoUrl}`;
      }
    }
  }

  // Fallback to profile_photo_path if profile_photo is not available
  if (user.profile_photo_path) {
    // Check if the URL is already absolute
    if (user.profile_photo_path.startsWith('http')) {
      return user.profile_photo_path;
    } else {
      return `${API_BASE_URL}${user.profile_photo_path}`;
    }
  }

  return null;
}

// Add pagination tracking for individual chats
class ChatsService {
  private currentPage: number = 1;
  private lastPage: number = 1;
  private isLoading: boolean = false;
  private chatPagination: Map<number, { currentPage: number; lastPage: number; isLoading: boolean }> = new Map();

  constructor() {
    // Set base URL when service is instantiated
    this.configureAxios();
  }

  // Configure axios with base URL and default headers
  private configureAxios(): void {
    if (!axios.defaults.baseURL) {
      axios.defaults.baseURL = API_BASE_URL;
    }
  }

  // Function to set authorization header
  private async setAuthHeader(): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        console.error('No auth token found');
        return false;
      }

      // Ensure axios is configured
      this.configureAxios();
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      return true;
    } catch (error) {
      console.error('Error setting auth header:', error);
      return false;
    }
  }

  // Function to fetch chats
  async fetchChats(page: number = 1): Promise<ChatsResponse | null> {
    try {
      console.log(`Attempting to fetch chats (page: ${page})`);
      this.isLoading = true;

      // Check network connectivity
      const netInfo = await NetInfo.fetch();
      const isConnected = netInfo.isConnected && netInfo.isInternetReachable;
      console.log(`Network status - Connected: ${netInfo.isConnected}, Internet: ${netInfo.isInternetReachable}`);

      // If online, try API call first
      if (isConnected) {
        try {
          console.log('Online mode: attempting API call');

          if (!(await this.setAuthHeader())) {
            console.log('Failed to set auth header, falling back to local data');
          } else {
            // Make the API call
            console.log('Making API request to /api/v1/chats');
            const response = await axios.get(`/api/v1/chats?page=${page}`);
            console.log('API response status:', response.data.status);

            if (response.data.status === 'success') {
              this.currentPage = response.data.data.pagination.current_page;
              this.lastPage = response.data.data.pagination.last_page;

              // Store chats in SQLite for offline access
              const chats = response.data.data.chats;
              console.log(`Received ${chats.length} chats from API`);

              for (const chat of chats) {
                await sqliteService.saveChat(chat);
              }

              return response.data;
            }
          }
        } catch (apiError) {
          console.error('API call failed, falling back to local data:', apiError);
          // Continue to local fallback
        }
      }

      // If offline or API failed, try to get chats from SQLite
      console.log('Fetching chats from local database');
      const localChats = await sqliteService.getChats();
      console.log(`Found ${localChats.length} local chats`);

      if (localChats.length > 0) {
        // Create a response object with the local data
        const response: ChatsResponse = {
          status: 'success',
          data: {
            chats: localChats,
            pagination: {
              total: localChats.length,
              per_page: 20,
              current_page: 1,
              last_page: 1
            }
          }
        };

        this.currentPage = 1;
        this.lastPage = 1;

        return response;
      } else {
        console.log('No local chats found');
        return null;
      }
    } catch (error) {
      console.error('Error in fetchChats:', error);
      return null;
    } finally {
      this.isLoading = false;
    }
  }

  // Function to fetch the next page of chats
  async fetchNextPage(): Promise<ChatsResponse | null> {
    if (this.isLoading || this.currentPage >= this.lastPage) {
      return null;
    }

    return this.fetchChats(this.currentPage + 1);
  }

  // Function to check if there are more pages
  hasMorePages(): boolean {
    return this.currentPage < this.lastPage;
  }

  // Function to get the current page
  getCurrentPage(): number {
    return this.currentPage;
  }

  // Function to reset the pagination
  resetPagination(): void {
    this.currentPage = 1;
  }

  // Initialize pagination for a specific chat
  private initChatPagination(chatId: number, pagination: Pagination): void {
    this.chatPagination.set(chatId, {
      currentPage: pagination.current_page,
      lastPage: pagination.last_page,
      isLoading: false
    });
  }

  // Get pagination info for a specific chat
  getChatPagination(chatId: number): { currentPage: number; lastPage: number; isLoading: boolean } | null {
    return this.chatPagination.get(chatId) || null;
  }

  // Check if there are more pages for a specific chat
  hasMoreMessagesForChat(chatId: number): boolean {
    const pagination = this.chatPagination.get(chatId);
    return pagination ? pagination.currentPage < pagination.lastPage : false;
  }

  // Load more messages for a specific chat
  async loadMoreMessagesForChat(chatId: number): Promise<Message[] | null> {
    const pagination = this.chatPagination.get(chatId);

    if (!pagination || pagination.isLoading || pagination.currentPage >= pagination.lastPage) {
      return null;
    }

    // Set loading state
    pagination.isLoading = true;
    this.chatPagination.set(chatId, pagination);

    try {
      const nextPage = pagination.currentPage + 1;
      const response = await this.fetchChatById(chatId, nextPage);

      if (response && response.status === 'success') {
        // Update pagination
        pagination.currentPage = response.data.pagination.current_page;
        pagination.lastPage = response.data.pagination.last_page;
        pagination.isLoading = false;
        this.chatPagination.set(chatId, pagination);

        // Store messages in SQLite for offline access
        await sqliteService.saveMessages(chatId, response.data.messages);

        return response.data.messages;
      }

      return null;
    } catch (error) {
      console.error(`Error loading more messages for chat ${chatId}:`, error);

      // Reset loading state
      pagination.isLoading = false;
      this.chatPagination.set(chatId, pagination);

      return null;
    }
  }

  // Modified fetchChatById to use message-based pagination
  async fetchChatById(chatId: number, beforeMessageId?: number): Promise<ChatDetailResponse | null> {
    try {
      // Check network connectivity
      const netInfo = await NetInfo.fetch();
      const isConnected = netInfo.isConnected && netInfo.isInternetReachable;

      // If online, try API call first
      if (isConnected) {
        try {
          if (await this.setAuthHeader()) {
            // Make the API call with or without the before_message_id parameter
            let url = `/api/v1/chats/${chatId}`;
            if (beforeMessageId) {
              url += `?before_message_id=${beforeMessageId}`;
            }

            const response = await axios.get(url);

            if (response.data.status === 'success') {
              // Store chat in SQLite for offline access
              await sqliteService.saveChat(response.data.data.chat);

              // Store messages in SQLite for offline access
              await sqliteService.saveMessages(chatId, response.data.data.messages);

              return response.data;
            }
          }
        } catch (apiError) {
          console.error(`API call failed for chat ${chatId}, falling back to local data:`, apiError);
        }
      }

      // If offline or API failed, try to get chat from SQLite
      console.log(`Fetching chat ${chatId} from local database`);
      const localChat = await sqliteService.getChatById(chatId);

      if (localChat) {
        const localMessages = await sqliteService.getMessagesForChat(chatId);

        // Create a response object with the local data
        const response: ChatDetailResponse = {
          status: 'success',
          data: {
            chat: localChat,
            messages: localMessages,
            pagination: {
              total: localMessages.length,
              loaded: localMessages.length,
              has_more: false,
              oldest_message_id: localMessages.length > 0 ? Math.min(...localMessages.map(m => m.id)) : 0
            }
          }
        };

        return response;
      } else {
        console.log(`No local chat found for ID ${chatId}`);
        return null;
      }
    } catch (error) {
      console.error(`Error fetching chat ${chatId}:`, error);
      return null;
    }
  }

  // Load older messages for a chat using before_message_id
  async loadOlderMessages(chatId: number, oldestMessageId: number): Promise<ChatDetailResponse | null> {
    try {
      // Check network connectivity
      const netInfo = await NetInfo.fetch();
      const isConnected = netInfo.isConnected && netInfo.isInternetReachable;

      if (!isConnected) {
        console.log('Cannot load older messages while offline');
        return null;
      }

      // Make the API call with before_message_id parameter
      if (await this.setAuthHeader()) {
        const response = await axios.get(`/api/v1/chats/${chatId}?before_message_id=${oldestMessageId}`);

        if (response.data.status === 'success') {
          // Store messages in SQLite for offline access
          await sqliteService.saveMessages(chatId, response.data.data.messages);

          return response.data;
        }
      }

      return null;
    } catch (error) {
      console.error(`Error loading older messages for chat ${chatId}:`, error);
      return null;
    }
  }

  // Function to send a message to a chat
  async sendMessage(
    chatId: number,
    content?: string,
    media_url?: string,
    message_type: string = 'text',
    media_data?: any,
    reply_to_message_id?: number
  ): Promise<SendMessageResponse | null> {
    try {
      // Check network connectivity
      const netInfo = await NetInfo.fetch();
      const isConnected = netInfo.isConnected && netInfo.isInternetReachable;

      // If offline, store the message locally with a pending status
      if (!isConnected) {
        console.log(`Offline mode: storing message for chat ${chatId} locally`);

        // Create a temporary message with a pending status
        const tempMessage: Message = {
          id: Date.now(), // Temporary ID that will be replaced when online
          chat_id: chatId,
          sender_id: 503, // Assuming current user ID is 503 based on the API response example
          reply_to_message_id: reply_to_message_id || null,
          content: content || '',
          message_type: message_type,
          media_data: media_data || null,
          media_url: media_url || null,
          thumbnail_url: null,
          status: 'pending', // Mark as pending for sync later
          is_edited: false,
          edited_at: null,
          sent_at: new Date().toISOString(),
          deleted_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_mine: true,
          sender: {
            id: 503,
            email: "user@example.com" // Placeholder email
          }
        };

        // Store the message in SQLite
        await sqliteService.saveMessages(chatId, [tempMessage]);

        // Create a response object with the local data
        const response: SendMessageResponse = {
          status: 'success',
          message: 'Message stored locally and will be sent when online',
          data: {
            message: tempMessage
          }
        };

        // TODO: Add to a message queue for sending when back online
        // This would require additional implementation for background sync

        return response;
      }

      // If online, proceed with API call
      if (!(await this.setAuthHeader())) {
        return null;
      }

      // Prepare the request body
      const requestBody: any = {
        message_type
      };

      // Add optional parameters if they exist
      if (content) requestBody.content = content;
      if (media_url) requestBody.media_url = media_url;
      if (media_data) requestBody.media_data = media_data;
      if (reply_to_message_id) requestBody.reply_to_message_id = reply_to_message_id;

      // Make the API call
      const response = await axios.post(`/api/v1/chats/${chatId}/messages`, requestBody);

      if (response.data.status === 'success') {
        // Store the sent message in SQLite
        const sentMessage = response.data.data.message;
        sentMessage.is_mine = true; // Mark as mine since we sent it

        await sqliteService.saveMessages(chatId, [sentMessage]);

        return response.data;
      }

      return null;
    } catch (error) {
      console.error(`Error sending message to chat ${chatId}:`, error);

      // Create a failed message to return to the UI
      const failedMessage: Message = {
        id: Date.now(), // Temporary ID
        chat_id: chatId,
        sender_id: 503, // Assuming current user ID is 503
        reply_to_message_id: reply_to_message_id || null,
        content: content || '',
        message_type: message_type,
        media_data: media_data || null,
        media_url: media_url || null,
        thumbnail_url: null,
        status: 'failed', // Mark as failed
        is_edited: false,
        edited_at: null,
        sent_at: new Date().toISOString(),
        deleted_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_mine: true,
        sender: {
          id: 503,
          email: "user@example.com" // Placeholder email
        }
      };

      // Store the failed message in SQLite
      try {
        await sqliteService.saveMessages(chatId, [failedMessage]);
      } catch (sqliteError) {
        console.error('Error storing failed message in local database:', sqliteError);
      }

      // Create a response object with the failed message
      const failedResponse: SendMessageResponse = {
        status: 'error',
        message: 'Failed to send message',
        data: {
          message: failedMessage
        }
      };

      return failedResponse;
    }
  }
}

// Export a singleton instance of the service
export const chatsService = new ChatsService();
