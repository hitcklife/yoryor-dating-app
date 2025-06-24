import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Types for the likes API response
export interface User {
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
  profile: Profile;
  profile_photo: ProfilePhoto | null;
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

export interface Like {
  id: number;
  user_id: number;
  liked_user_id: number;
  liked_at: string;
  created_at: string;
  updated_at: string;
  user: User;
}

export interface Pagination {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
}

export interface LikesResponse {
  status: string;
  data: {
    likes: Like[];
    pagination: Pagination;
  };
}

export interface Match {
  id: number;
  user_id: number;
  matched_user_id: number;
  matched_at: string;
  created_at: string;
  updated_at: string;
  user: User;
}

export interface MatchesResponse {
  status: string;
  data: {
    matches: Match[];
    pagination: Pagination;
  };
}

// Helper function to get profile photo URL
export function getProfilePhotoUrl(user: User | null, useHighRes: boolean = false): string | null {
  if (!user || !user.profile_photo) {
    return null;
  }

  const photoUrl = useHighRes
    ? user.profile_photo.original_url
    : user.profile_photo.medium_url;

  if (photoUrl) {
    // Check if the URL is already absolute
    if (photoUrl.startsWith('http')) {
      return photoUrl;
    } else {
      // Assuming the base URL is the same as in matches-service.ts
      return `https://incredibly-evident-hornet.ngrok-free.app${photoUrl}`;
    }
  }

  return null;
}

// Class to handle likes and matches API calls
class LikesService {
  private likesCurrentPage: number = 1;
  private likesLastPage: number = 1;
  private matchesCurrentPage: number = 1;
  private matchesLastPage: number = 1;
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

  // Function to fetch received likes
  async fetchReceivedLikes(page: number = 1): Promise<LikesResponse | null> {
    try {
      this.isLoading = true;

      if (!(await this.setAuthHeader())) {
        return null;
      }

      // Make the API call
      const response = await axios.get(`/api/v1/likes/received?page=${page}`);

      if (response.data.status === 'success') {
        this.likesCurrentPage = response.data.data.pagination.current_page;
        this.likesLastPage = response.data.data.pagination.last_page;
        return response.data;
      }

      return null;
    } catch (error) {
      console.error('Error fetching received likes:', error);
      return null;
    } finally {
      this.isLoading = false;
    }
  }

  // Function to fetch matches
  async fetchMatches(page: number = 1): Promise<MatchesResponse | null> {
    try {
      this.isLoading = true;

      if (!(await this.setAuthHeader())) {
        return null;
      }

      // Make the API call
      const response = await axios.get(`/api/v1/matches?page=${page}`);

      if (response.data.status === 'success') {
        this.matchesCurrentPage = response.data.data.pagination.current_page;
        this.matchesLastPage = response.data.data.pagination.last_page;
        return response.data;
      }

      return null;
    } catch (error) {
      console.error('Error fetching matches:', error);
      return null;
    } finally {
      this.isLoading = false;
    }
  }

  // Function to like a user
  async likeUser(userId: number): Promise<any | null> {
    try {
      if (!(await this.setAuthHeader())) {
        return null;
      }

      const response = await axios.post('/api/v1/likes', {
        user_id: userId
      });

      return response.data;
    } catch (error) {
      console.error('Error sending like:', error);
      return null;
    }
  }

  // Function to fetch the next page of likes
  async fetchNextLikesPage(): Promise<LikesResponse | null> {
    if (this.isLoading || this.likesCurrentPage >= this.likesLastPage) {
      return null;
    }

    return this.fetchReceivedLikes(this.likesCurrentPage + 1);
  }

  // Function to fetch the next page of matches
  async fetchNextMatchesPage(): Promise<MatchesResponse | null> {
    if (this.isLoading || this.matchesCurrentPage >= this.matchesLastPage) {
      return null;
    }

    return this.fetchMatches(this.matchesCurrentPage + 1);
  }

  // Function to check if there are more likes pages
  hasMoreLikesPages(): boolean {
    return this.likesCurrentPage < this.likesLastPage;
  }

  // Function to check if there are more matches pages
  hasMoreMatchesPages(): boolean {
    return this.matchesCurrentPage < this.matchesLastPage;
  }

  // Function to reset the pagination
  resetPagination(): void {
    this.likesCurrentPage = 1;
    this.matchesCurrentPage = 1;
  }
}

// Export a singleton instance of the service
export const likesService = new LikesService();
