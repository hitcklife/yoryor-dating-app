import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiClient } from "./api-client";
import { CONFIG, getAssetUrl } from "@/config";

// Types for the API response
export type PotentialMatchPhoto = {
  id: string;
  attributes: {
    user_id: number;
    original_url: string;
    thumbnail_url: string;
    medium_url: string;
    is_profile_photo: boolean;
    order: number;
    is_private: boolean | null;
    is_verified: boolean | null;
    status: string;
    uploaded_at: string;
  };
};

export type PotentialMatchProfile = {
  id: string;
  attributes: {
    first_name: string;
    last_name: string;
    gender: string;
    date_of_birth: string;
    city: string;
    state: string;
    province: string | null;
    country_id: number;
    latitude: number | null;
    longitude: number | null;
    bio: string;
    profession: string;
    interests: string[];
  };
};

export type PotentialMatchCountry = {
  id: string;
  attributes: {
    name: string;
    code: string;
    flag: string;
    phone_code: string;
    phone_template: string;
  };
};

export type PotentialMatch = {
  type: string;
  id: string;
  attributes: {
    email: string;
    phone: string;
    profile_photo_path: string;
    registration_completed: boolean;
    created_at: string;
    updated_at: string;
    age: number;
    full_name: string;
    is_online: boolean;
    last_active_at: string | null;
  };
  included: (PotentialMatchProfile | PotentialMatchPhoto | PotentialMatchCountry)[];
};

export type PotentialMatchesResponse = {
  data: PotentialMatch[];
  links: {
    self: string;
    first: string[];
    last: string[];
    prev: (string | null)[];
    next: (string | null)[];
  };
  meta: {
    current_page: number[];
    from: number[];
    last_page: number[];
    path: string[];
    per_page: number[];
    to: number[];
    total: number[];
    links: {
      url: string | null;
      label: string;
      active: boolean;
    }[];
  };
  status: string;
};

// Types for like/dislike responses
export type LikeDislikeResponse = {
  status: string;
  message?: string;
  data?: {
    like?: any;
    dislike?: any;
    is_match?: boolean;
  };
};

// Function to get the profile, photos, and country from the included array
export const getProfileAndPhotos = (match: PotentialMatch) => {
  const profile = match.included.find(item => item.type === 'profiles') as PotentialMatchProfile | undefined;
  const photos = match.included.filter(item => item.type === 'photos') as PotentialMatchPhoto[];

  // Extract country information
  let country: PotentialMatchCountry | undefined;
  if (profile && profile.attributes.country_id) {
    country = match.included.find(
      item => item.type === 'countries' && item.id === profile.attributes.country_id.toString()
    ) as PotentialMatchCountry | undefined;
  }

  return { profile, photos, country };
};

// Function to get the profile photo URL (optimized for faster loading)
export const getProfilePhotoUrl = (match: PotentialMatch, useHighRes: boolean = false) => {
  const { photos } = getProfileAndPhotos(match);

  // Find the profile photo (is_profile_photo = true)
  const profilePhoto = photos.find(photo => photo.attributes.is_profile_photo);

  if (profilePhoto) {
    // Use medium for faster loading, original for high res when needed
    const photoUrl = useHighRes
      ? profilePhoto.attributes.original_url
      : profilePhoto.attributes.medium_url || profilePhoto.attributes.original_url;

    if (photoUrl) {
      return getAssetUrl(photoUrl);
    }
  }

  // If no profile photo is marked, use the first photo
  if (photos.length > 0) {
    const firstPhoto = photos[0];
    const photoUrl = useHighRes
      ? firstPhoto.attributes.original_url
      : firstPhoto.attributes.medium_url || firstPhoto.attributes.original_url;

    if (photoUrl) {
      return getAssetUrl(photoUrl);
    }
  }

  return null;
};

// Class to handle potential matches API calls
class MatchesService {
  private currentPage: number = 1;
  private lastPage: number = 1;
  private isLoading: boolean = false;

  // Function to fetch potential matches
  async fetchPotentialMatches(page: number = 1): Promise<PotentialMatchesResponse | null> {
    try {
      this.isLoading = true;

      // Make the API call using centralized client
      const response = await apiClient.matches.getPotential(page);

      if (response.status === 'success' && response.data) {
        this.currentPage = response.data.meta.current_page[0];
        this.lastPage = response.data.meta.last_page[0];
        return response.data;
      }

      return null;
    } catch (error) {
      console.error('Error fetching potential matches:', error);
      return null;
    } finally {
      this.isLoading = false;
    }
  }

  // Function to send a like to a user
  async likeUser(userId: string): Promise<LikeDislikeResponse | null> {
    try {
      const response = await apiClient.likes.send(userId);

      if (response.status === 'success') {
        return response.data;
      }

      return null;
    } catch (error) {
      console.error('Error sending like:', error);
      return null;
    }
  }

  // Function to send a dislike to a user
  async dislikeUser(userId: string): Promise<LikeDislikeResponse | null> {
    try {
      const response = await apiClient.dislikes.send(userId);

      if (response.status === 'success') {
        return response.data;
      }

      return null;
    } catch (error) {
      console.error('Error sending dislike:', error);
      return null;
    }
  }

  // Function to fetch the next page of potential matches
  async fetchNextPage(): Promise<PotentialMatchesResponse | null> {
    if (this.isLoading || this.currentPage >= this.lastPage) {
      return null;
    }

    return this.fetchPotentialMatches(this.currentPage + 1);
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
}

// Export a singleton instance of the service
export const matchesService = new MatchesService();
