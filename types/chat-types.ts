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
  country?: {
    id: number;
    name: string;
    code: string;
  };
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
  reply_to?: Message | null;
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

export interface EditMessageResponse {
  status: string;
  message: string;
  data: {
    message: Message;
  };
}

export interface DeleteMessageResponse {
  status: string;
  message: string;
  data?: {
    message_id: number;
    deleted_at: string;
  };
} 