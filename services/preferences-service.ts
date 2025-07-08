import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiClient } from "./api-client";

export interface DatingPreferences {
  id?: number;
  user_id?: number;
  search_radius: number;
  preferred_genders: string[] | null;
  min_age: number;
  max_age: number;
  distance_unit: 'km' | 'miles';
  show_me_globally: boolean;
  country?: string | null;
  languages_spoken?: string[] | null;
  hobbies_interests?: string[] | null;
  deal_breakers?: string[] | null;
  must_haves?: string[] | null;
  notification_preferences?: any | null;
  created_at?: string;
  updated_at?: string;
}

export interface Country {
  id: number;
  name: string;
  code: string;
  flag: string;
  phone_code: string;
  phone_template: string;
  created_at: string;
  updated_at: string;
}

export interface PreferencesResponse {
  success: boolean;
  data?: DatingPreferences;
  message?: string;
}

class PreferencesService {
  private static instance: PreferencesService;
  private cachedPreferences: DatingPreferences | null = null;

  static getInstance(): PreferencesService {
    if (!PreferencesService.instance) {
      PreferencesService.instance = new PreferencesService();
    }
    return PreferencesService.instance;
  }

  // Get user preferences from API
  async fetchPreferences(): Promise<PreferencesResponse | null> {
    try {
      const response = await apiClient.preferences.get();
      
      if (response.status === 'success' && response.data) {
        this.cachedPreferences = response.data;
        await this.saveToLocalStorage(response.data);
        return {
          success: true,
          data: response.data
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching preferences:', error);
      // Try to get from local storage as fallback
      const localPreferences = await this.getFromLocalStorage();
      if (localPreferences) {
        return {
          success: true,
          data: localPreferences
        };
      }
      return null;
    }
  }

  // Update user preferences
  async updatePreferences(preferences: Partial<DatingPreferences>): Promise<PreferencesResponse | null> {
    try {
      const response = await apiClient.preferences.update(preferences);
      
      if (response.status === 'success' && response.data) {
        this.cachedPreferences = response.data;
        await this.saveToLocalStorage(response.data);
        return {
          success: true,
          data: response.data
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error updating preferences:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update preferences'
      };
    }
  }

  // Get cached preferences
  getCachedPreferences(): DatingPreferences | null {
    return this.cachedPreferences;
  }

  // Fetch countries from API
  async fetchCountries(): Promise<Country[]> {
    try {
      const response = await apiClient.countries.getAll();
      
      if (response.status === 'success' && response.data) {
        return response.data;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching countries:', error);
      return [];
    }
  }

  // Save preferences to local storage
  private async saveToLocalStorage(preferences: DatingPreferences): Promise<void> {
    try {
      await AsyncStorage.setItem('dating_preferences', JSON.stringify(preferences));
    } catch (error) {
      console.error('Error saving preferences to local storage:', error);
    }
  }

  // Get preferences from local storage
  private async getFromLocalStorage(): Promise<DatingPreferences | null> {
    try {
      const stored = await AsyncStorage.getItem('dating_preferences');
      if (stored) {
        return JSON.parse(stored);
      }
      return null;
    } catch (error) {
      console.error('Error getting preferences from local storage:', error);
      return null;
    }
  }

  // Get default preferences
  getDefaultPreferences(): DatingPreferences {
    return {
      search_radius: 25,
      preferred_genders: ['all'],
      min_age: 18,
      max_age: 35,
      distance_unit: 'km',
      show_me_globally: true,
      country: '',
      languages_spoken: ['English'],
      hobbies_interests: []
    };
  }

  // Convert preferences to API format
  convertToApiFormat(preferences: {
    ageRange: [number, number];
    preferredGender: string;
    searchGlobal: boolean;
    selectedCountry?: string;
    maxDistance?: number;
  }): Partial<DatingPreferences> {
    return {
      min_age: preferences.ageRange[0],
      max_age: preferences.ageRange[1],
      preferred_genders: [preferences.preferredGender],
      show_me_globally: preferences.searchGlobal,
      country: null, // Will be overridden by the modal with actual country code
      search_radius: preferences.maxDistance || 25
    };
  }

  // Convert API preferences to UI format
  convertFromApiFormat(apiPreferences: DatingPreferences): {
    ageRange: [number, number];
    preferredGender: string;
    searchGlobal: boolean;
    selectedCountry: string;
    maxDistance: number;
  } {
    return {
      ageRange: [apiPreferences.min_age, apiPreferences.max_age] as [number, number],
      preferredGender: apiPreferences.preferred_genders?.[0] || 'all',
      searchGlobal: apiPreferences.show_me_globally,
      selectedCountry: apiPreferences.country || '', // Will be converted to name by the modal
      maxDistance: apiPreferences.search_radius
    };
  }
}

export const preferencesService = PreferencesService.getInstance(); 