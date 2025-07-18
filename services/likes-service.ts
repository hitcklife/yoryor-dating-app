import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiClient } from "./api-client";
import { CONFIG, getAssetUrl } from "@/services/config";

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
    return getAssetUrl(photoUrl);
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

  // Function to fetch received likes
  async fetchReceivedLikes(page: number = 1): Promise<LikesResponse | null> {
    try {
      this.isLoading = true;

      // Make the API call using centralized client
      const response = await apiClient.likes.getReceived(page);

      if (response.status === 'success' && response.data) {
        this.likesCurrentPage = response.data.pagination.current_page;
        this.likesLastPage = response.data.pagination.last_page;
        // Return the full response structure that the component expects
        return {
          status: response.status,
          data: response.data
        };
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

      // Make the API call using centralized client
      const response = await apiClient.matches.getMatches(page);

      if (response.status === 'success' && response.data) {
        this.matchesCurrentPage = response.data.pagination.current_page;
        this.matchesLastPage = response.data.pagination.last_page;
        // Return the full response structure that the component expects
        return {
          status: response.status,
          data: response.data
        };
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
      const response = await apiClient.likes.send(userId);

      if (response.status === 'success') {
        // Return the full response structure that the component expects
        return {
          status: response.status,
          data: response.data
        };
      }

      return null;
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
