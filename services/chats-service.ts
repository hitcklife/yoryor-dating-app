import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
    pagination: Pagination;
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
        return `https://incredibly-evident-hornet.ngrok-free.app${photoUrl}`;
      }
    }
  }

  // Fallback to profile_photo_path if profile_photo is not available
  if (user.profile_photo_path) {
    // Check if the URL is already absolute
    if (user.profile_photo_path.startsWith('http')) {
      return user.profile_photo_path;
    } else {
      return `https://incredibly-evident-hornet.ngrok-free.app${user.profile_photo_path}`;
    }
  }

  return null;
}

// Class to handle chats API calls
class ChatsService {
  private currentPage: number = 1;
  private lastPage: number = 1;
  private isLoading: boolean = false;

  // Function to set authorization header
  private async setAuthHeader(): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        console.error('No auth token found');
        return false;
      }
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
      this.isLoading = true;

      if (!(await this.setAuthHeader())) {
        return null;
      }

      // Make the API call
      const response = await axios.get(`/api/v1/chats?page=${page}`);

      if (response.data.status === 'success') {
        this.currentPage = response.data.data.pagination.current_page;
        this.lastPage = response.data.data.pagination.last_page;
        return response.data;
      }

      return null;
    } catch (error) {
      console.error('Error fetching chats:', error);
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

  // Function to fetch a specific chat with messages
  async fetchChatById(chatId: number, page: number = 1): Promise<ChatDetailResponse | null> {
    try {
      if (!(await this.setAuthHeader())) {
        return null;
      }

      // Make the API call
      const response = await axios.get(`/api/v1/chats/${chatId}?page=${page}`);

      if (response.data.status === 'success') {
        return response.data;
      }

      return null;
    } catch (error) {
      console.error(`Error fetching chat ${chatId}:`, error);
      return null;
    }
  }
}

// Export a singleton instance of the service
export const chatsService = new ChatsService();
