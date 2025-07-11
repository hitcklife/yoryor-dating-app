import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiClient } from "./api-client";
import { sqliteService, UserSettings, BlockedUser, UserFeedback, UserReport, EmergencyContact, DataExportRequest, AccountDeletionRequest, UserVerificationStatus, SupportTicket, PasswordChangeHistory, EmailChangeRequest } from "./sqlite-service";
import NetInfo from "@react-native-community/netinfo";

// API Response interfaces
export interface SettingsResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  status?: 'success' | 'error';
}

export interface PasswordChangeRequest {
  current_password: string;
  new_password: string;
  new_password_confirmation: string;
}

export interface EmailChangeRequestData {
  new_email: string;
  password?: string;
}

export interface ReportUserRequest {
  reported_user_id: number;
  reason: string;
  description?: string;
  evidence_urls?: string[];
}

export interface FeedbackRequest {
  feedback_text: string;
  category?: string;
  email?: string;
}

// Category-specific settings interfaces
export interface NotificationSettings {
  notify_matches: boolean;
  notify_messages: boolean;
  notify_likes: boolean;
  notify_super_likes: boolean;
  notify_visitors: boolean;
  notify_new_features: boolean;
  notify_marketing: boolean;
  push_notifications_enabled: boolean;
  in_app_sounds_enabled: boolean;
  vibration_enabled: boolean;
  email_notifications_enabled: boolean;
  quiet_hours_enabled?: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
}

export interface PrivacySettings {
  profile_visible: boolean;
  profile_visibility_level: "everyone" | "matches_only" | "friends_only";
  show_online_status: boolean;
  show_distance: boolean;
  show_age: boolean;
  age_display_type: "exact" | "range" | "hidden";
  show_last_active: boolean;
  allow_messages_from_matches: boolean;
  allow_messages_from_all: boolean;
  show_read_receipts: boolean;
  prevent_screenshots: boolean;
  hide_from_contacts: boolean;
  incognito_mode: boolean;
}

export interface DiscoverySettings {
  show_me_on_discovery: boolean;
  global_mode: boolean;
  recently_active_only: boolean;
  verified_profiles_only: boolean;
  hide_already_seen_profiles: boolean;
  smart_photos: boolean;
  min_age: number;
  max_age: number;
  max_distance: number;
  looking_for_preferences: string[];
  interest_preferences: string[];
}

export interface SecuritySettings {
  two_factor_enabled: boolean;
  photo_verification_enabled: boolean;
  id_verification_enabled: boolean;
  phone_verification_enabled: boolean;
  social_media_verification_enabled: boolean;
  login_alerts_enabled: boolean;
  block_screenshots: boolean;
  hide_from_facebook: boolean;
}

// Settings service class
class SettingsService {
  private static instance: SettingsService;
  private cachedSettings: UserSettings | null = null;
  private cachedBlockedUsers: BlockedUser[] | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private settingsChangeListeners: Set<(settings: UserSettings) => void> = new Set();

  static getInstance(): SettingsService {
    if (!SettingsService.instance) {
      SettingsService.instance = new SettingsService();
    }
    return SettingsService.instance;
  }

  private constructor() {
    this.initializeCache();
  }

  private async initializeCache(): Promise<void> {
    try {
      // Load cached settings from AsyncStorage
      const cachedData = await AsyncStorage.getItem('user_settings_cache');
      if (cachedData) {
        const { settings, timestamp } = JSON.parse(cachedData);
        if (Date.now() - timestamp < this.CACHE_DURATION) {
          this.cachedSettings = settings;
          this.cacheTimestamp = timestamp;
        }
      }
    } catch (error) {
      console.error('Error initializing settings cache:', error);
    }
  }

  private async getCurrentUserId(): Promise<number | null> {
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

  private async saveToCache(settings: UserSettings): Promise<void> {
    try {
      const cacheData = {
        settings,
        timestamp: Date.now()
      };
      await AsyncStorage.setItem('user_settings_cache', JSON.stringify(cacheData));
      this.cachedSettings = settings;
      this.cacheTimestamp = Date.now();
    } catch (error) {
      console.error('Error saving settings to cache:', error);
    }
  }

  private isCacheValid(): boolean {
    return this.cachedSettings !== null && (Date.now() - this.cacheTimestamp) < this.CACHE_DURATION;
  }

  private notifySettingsChange(settings: UserSettings): void {
    this.settingsChangeListeners.forEach(listener => {
      try {
        listener(settings);
      } catch (error) {
        console.error('Error notifying settings change listener:', error);
      }
    });
  }

  // Settings change listeners
  public addSettingsChangeListener(listener: (settings: UserSettings) => void): void {
    this.settingsChangeListeners.add(listener);
  }

  public removeSettingsChangeListener(listener: (settings: UserSettings) => void): void {
    this.settingsChangeListeners.delete(listener);
  }

  // ===== MAIN SETTINGS METHODS =====

  /**
   * Get all user settings with offline support
   */
  async getUserSettings(forceRefresh: boolean = false): Promise<SettingsResponse<UserSettings>> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        return { success: false, message: 'User not authenticated' };
      }

      // Return cached data if valid and not forcing refresh
      if (!forceRefresh && this.isCacheValid()) {
        console.log('Returning cached settings');
        return { success: true, data: this.cachedSettings! };
      }

      const isConnected = await NetInfo.fetch().then(state => state.isConnected);

      if (isConnected) {
        try {
          // Fetch from API using the new endpoint
          const response = await apiClient.settings.get();
          
          if (response.status === 'success' && response.data) {
            const settings = response.data as UserSettings;
            
            // Cache the settings
            await this.saveToCache(settings);
            
            // Save to SQLite
            await sqliteService.saveUserSettings(settings);
            
            // Notify listeners
            this.notifySettingsChange(settings);
            
            return { success: true, data: settings };
          }
        } catch (error) {
          console.error('Error fetching settings from API:', error);
        }
      }

      // Try to get from SQLite as fallback
      const offlineSettings = await sqliteService.getUserSettings(userId);
      if (offlineSettings) {
        console.log('Returning offline settings');
        return { success: true, data: offlineSettings };
      }

      // Return default settings if nothing found
      const defaultSettings = this.getDefaultSettings(userId);
      return { success: true, data: defaultSettings };

    } catch (error) {
      console.error('Error getting user settings:', error);
      return { success: false, message: 'Failed to get settings' };
    }
  }

  /**
   * Update user settings with real-time API sync
   */
  async updateUserSettings(settings: Partial<UserSettings>): Promise<SettingsResponse<UserSettings>> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        return { success: false, message: 'User not authenticated' };
      }

      // Get current settings
      const currentResponse = await this.getUserSettings();
      if (!currentResponse.success || !currentResponse.data) {
        return { success: false, message: 'Failed to get current settings' };
      }

      const updatedSettings: UserSettings = {
        ...currentResponse.data,
        ...settings,
        user_id: userId,
        updated_at: new Date().toISOString()
      };

      // Save to SQLite immediately for offline support
      await sqliteService.saveUserSettings(updatedSettings);

      const isConnected = await NetInfo.fetch().then(state => state.isConnected);

      if (isConnected) {
        try {
          // Update via API using the new endpoint
          const response = await apiClient.settings.update(settings);
          
          if (response.status === 'success' && response.data) {
            const apiSettings = response.data as UserSettings;
            
            // Update cache
            await this.saveToCache(apiSettings);
            
            // Update SQLite with API response
            await sqliteService.saveUserSettings(apiSettings);
            
            // Notify listeners
            this.notifySettingsChange(apiSettings);
            
            return { success: true, data: apiSettings };
          }
        } catch (error) {
          console.error('Error updating settings via API:', error);
          // Continue with offline update
        }
      }

      // Update cache with offline data
      await this.saveToCache(updatedSettings);
      
      // Notify listeners
      this.notifySettingsChange(updatedSettings);
      
      return { success: true, data: updatedSettings };

    } catch (error) {
      console.error('Error updating user settings:', error);
      return { success: false, message: 'Failed to update settings' };
    }
  }

  /**
   * Get default settings for a user
   */
  private getDefaultSettings(userId: number): UserSettings {
    return {
      user_id: userId,
      
      // Account Management
      two_factor_enabled: false,
      email_notifications_enabled: true,
      marketing_emails_enabled: false,
      
      // Notification Settings
      notify_matches: true,
      notify_messages: true,
      notify_likes: true,
      notify_super_likes: true,
      notify_visitors: false,
      notify_new_features: true,
      notify_marketing: false,
      push_notifications_enabled: true,
      in_app_sounds_enabled: true,
      vibration_enabled: true,
      
      // Privacy Settings
      profile_visible: true,
      profile_visibility_level: 'everyone',
      show_online_status: true,
      show_distance: true,
      show_age: true,
      age_display_type: 'exact',
      show_last_active: false,
      allow_messages_from_matches: true,
      allow_messages_from_all: false,
      show_read_receipts: true,
      prevent_screenshots: false,
      hide_from_contacts: false,
      incognito_mode: false,
      
      // Discovery Settings
      show_me_on_discovery: true,
      global_mode: false,
      recently_active_only: true,
      verified_profiles_only: false,
      hide_already_seen_profiles: true,
      smart_photos: true,
      min_age: 18,
      max_age: 35,
      max_distance: 25,
      looking_for_preferences: [],
      interest_preferences: [],
      
      // Data Privacy Settings
      share_analytics_data: true,
      share_location_data: true,
      personalized_ads_enabled: true,
      data_for_improvements: true,
      share_with_partners: false,
      
      // Security Settings
      photo_verification_enabled: false,
      id_verification_enabled: false,
      phone_verification_enabled: true,
      social_media_verification_enabled: false,
      login_alerts_enabled: true,
      block_screenshots: false,
      hide_from_facebook: true,
      
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  // ===== ACCOUNT MANAGEMENT METHODS =====

  /**
   * Change user password
   */
  async changePassword(passwordData: PasswordChangeRequest): Promise<SettingsResponse> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        return { success: false, message: 'User not authenticated' };
      }

      const response = await apiClient.put('/api/v1/account/password', passwordData);
      
      if (response.status === 'success') {
        // Log password change
        await sqliteService.savePasswordChangeHistory({
          user_id: userId,
          change_type: 'password_change',
          created_at: new Date().toISOString()
        });
        
        return { success: true, message: 'Password changed successfully' };
      }
      
      return { success: false, message: response.message || 'Failed to change password' };
    } catch (error) {
      console.error('Error changing password:', error);
      return { success: false, message: 'Failed to change password' };
    }
  }

  /**
   * Change user email
   */
  async changeEmail(emailData: EmailChangeRequestData): Promise<SettingsResponse> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        return { success: false, message: 'User not authenticated' };
      }

      const response = await apiClient.put('/api/v1/account/email', emailData);
      
      if (response.status === 'success') {
        // Save email change request
        await sqliteService.saveEmailChangeRequest({
          user_id: userId,
          old_email: '', // Will be filled by API
          new_email: emailData.new_email,
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
        return { success: true, message: 'Email change request sent. Please check your email for verification.' };
      }
      
      return { success: false, message: response.message || 'Failed to change email' };
    } catch (error) {
      console.error('Error changing email:', error);
      return { success: false, message: 'Failed to change email' };
    }
  }

  /**
   * Request account deletion
   */
  async requestAccountDeletion(reason?: string): Promise<SettingsResponse> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        return { success: false, message: 'User not authenticated' };
      }

      const response = await apiClient.delete('/api/v1/account', { data: { reason } });
      
      if (response.status === 'success') {
        // Save deletion request
        await sqliteService.saveAccountDeletionRequest({
          user_id: userId,
          reason,
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
        return { success: true, message: 'Account deletion requested successfully' };
      }
      
      return { success: false, message: response.message || 'Failed to request account deletion' };
    } catch (error) {
      console.error('Error requesting account deletion:', error);
      return { success: false, message: 'Failed to request account deletion' };
    }
  }

  /**
   * Request data export
   */
  async requestDataExport(): Promise<SettingsResponse> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        return { success: false, message: 'User not authenticated' };
      }

      const response = await apiClient.post('/api/v1/account/export-data');
      
      if (response.status === 'success') {
        // Save export request
        await sqliteService.saveDataExportRequest({
          user_id: userId,
          status: 'pending',
          request_type: 'full_export',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
        return { success: true, message: 'Data export requested. You will receive an email with the download link.' };
      }
      
      return { success: false, message: response.message || 'Failed to request data export' };
    } catch (error) {
      console.error('Error requesting data export:', error);
      return { success: false, message: 'Failed to request data export' };
    }
  }

  // ===== BLOCKED USERS METHODS =====

  /**
   * Get blocked users
   */
  async getBlockedUsers(): Promise<SettingsResponse<BlockedUser[]>> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        return { success: false, message: 'User not authenticated' };
      }

      const isConnected = await NetInfo.fetch().then(state => state.isConnected);

      if (isConnected) {
        try {
          const response = await apiClient.get('/api/v1/blocked-users');
          
          if (response.status === 'success' && response.data) {
            const blockedUsers = response.data as BlockedUser[];
            
            // Cache blocked users
            this.cachedBlockedUsers = blockedUsers;
            
            // Save to SQLite
            for (const blockedUser of blockedUsers) {
              await sqliteService.blockUser(blockedUser);
            }
            
            return { success: true, data: blockedUsers };
          }
        } catch (error) {
          console.error('Error fetching blocked users from API:', error);
        }
      }

      // Get from SQLite as fallback
      const offlineBlockedUsers = await sqliteService.getBlockedUsers(userId);
      return { success: true, data: offlineBlockedUsers };

    } catch (error) {
      console.error('Error getting blocked users:', error);
      return { success: false, message: 'Failed to get blocked users' };
    }
  }

  /**
   * Block a user
   */
  async blockUser(blockedUser: Omit<BlockedUser, 'id' | 'created_at'>): Promise<SettingsResponse> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        return { success: false, message: 'User not authenticated' };
      }

      const blockData: BlockedUser = {
        ...blockedUser,
        blocker_id: userId,
        created_at: new Date().toISOString()
      };

      // Save to SQLite immediately
      await sqliteService.blockUser(blockData);

      const isConnected = await NetInfo.fetch().then(state => state.isConnected);

      if (isConnected) {
        try {
          const response = await apiClient.post('/api/v1/blocked-users', {
            blocked_user_id: blockedUser.blocked_id,
            reason: blockedUser.reason
          });
          
          if (response.status === 'success') {
            // Update cache
            if (this.cachedBlockedUsers) {
              this.cachedBlockedUsers.push(blockData);
            }
            
            return { success: true, message: 'User blocked successfully' };
          }
        } catch (error) {
          console.error('Error blocking user via API:', error);
        }
      }

      return { success: true, message: 'User blocked successfully (offline)' };

    } catch (error) {
      console.error('Error blocking user:', error);
      return { success: false, message: 'Failed to block user' };
    }
  }

  /**
   * Unblock a user
   */
  async unblockUser(blockedUserId: number): Promise<SettingsResponse> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        return { success: false, message: 'User not authenticated' };
      }

      // Remove from SQLite immediately
      await sqliteService.unblockUser(userId, blockedUserId);

      const isConnected = await NetInfo.fetch().then(state => state.isConnected);

      if (isConnected) {
        try {
          const response = await apiClient.delete(`/api/v1/blocked-users/${blockedUserId}`);
          
          if (response.status === 'success') {
            // Update cache
            if (this.cachedBlockedUsers) {
              this.cachedBlockedUsers = this.cachedBlockedUsers.filter(
                user => user.blocked_id !== blockedUserId
              );
            }
            
            return { success: true, message: 'User unblocked successfully' };
          }
        } catch (error) {
          console.error('Error unblocking user via API:', error);
        }
      }

      return { success: true, message: 'User unblocked successfully (offline)' };

    } catch (error) {
      console.error('Error unblocking user:', error);
      return { success: false, message: 'Failed to unblock user' };
    }
  }

  // ===== FEEDBACK & SUPPORT METHODS =====

  /**
   * Submit user feedback
   */
  async submitFeedback(feedbackData: FeedbackRequest): Promise<SettingsResponse> {
    try {
      const userId = await this.getCurrentUserId();

      const feedback: UserFeedback = {
        user_id: userId || undefined,
        email: feedbackData.email,
        feedback_text: feedbackData.feedback_text,
        category: feedbackData.category || 'general',
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Save to SQLite immediately
      await sqliteService.saveUserFeedback(feedback);

      const isConnected = await NetInfo.fetch().then(state => state.isConnected);

      if (isConnected) {
        try {
          const response = await apiClient.post('/api/v1/support/feedback', feedbackData);
          
          if (response.status === 'success') {
            return { success: true, message: 'Feedback submitted successfully' };
          }
        } catch (error) {
          console.error('Error submitting feedback via API:', error);
        }
      }

      return { success: true, message: 'Feedback saved (will be sent when online)' };

    } catch (error) {
      console.error('Error submitting feedback:', error);
      return { success: false, message: 'Failed to submit feedback' };
    }
  }

  /**
   * Report a user
   */
  async reportUser(reportData: ReportUserRequest): Promise<SettingsResponse> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        return { success: false, message: 'User not authenticated' };
      }

      const report: UserReport = {
        reporter_id: userId,
        reported_id: reportData.reported_user_id,
        reason: reportData.reason,
        description: reportData.description,
        evidence_urls: reportData.evidence_urls,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Save to SQLite immediately
      await sqliteService.saveUserReport(report);

      const isConnected = await NetInfo.fetch().then(state => state.isConnected);

      if (isConnected) {
        try {
          const response = await apiClient.post('/api/v1/support/report', reportData);
          
          if (response.status === 'success') {
            return { success: true, message: 'User reported successfully' };
          }
        } catch (error) {
          console.error('Error reporting user via API:', error);
        }
      }

      return { success: true, message: 'Report saved (will be sent when online)' };

    } catch (error) {
      console.error('Error reporting user:', error);
      return { success: false, message: 'Failed to report user' };
    }
  }

  /**
   * Create support ticket
   */
  async createSupportTicket(ticketData: Omit<SupportTicket, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<SettingsResponse> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        return { success: false, message: 'User not authenticated' };
      }

      const ticket: SupportTicket = {
        ...ticketData,
        user_id: userId,
        status: 'open',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Save to SQLite immediately
      await sqliteService.saveSupportTicket(ticket);

      const isConnected = await NetInfo.fetch().then(state => state.isConnected);

      if (isConnected) {
        try {
          const response = await apiClient.post('/api/v1/support/tickets', ticketData);
          
          if (response.status === 'success') {
            return { success: true, message: 'Support ticket created successfully' };
          }
        } catch (error) {
          console.error('Error creating support ticket via API:', error);
        }
      }

      return { success: true, message: 'Support ticket saved (will be sent when online)' };

    } catch (error) {
      console.error('Error creating support ticket:', error);
      return { success: false, message: 'Failed to create support ticket' };
    }
  }

  // ===== EMERGENCY CONTACTS METHODS =====

  /**
   * Get emergency contacts
   */
  async getEmergencyContacts(): Promise<SettingsResponse<EmergencyContact[]>> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        return { success: false, message: 'User not authenticated' };
      }

      const isConnected = await NetInfo.fetch().then(state => state.isConnected);

      if (isConnected) {
        try {
          const response = await apiClient.get('/api/v1/emergency-contacts');
          
          if (response.status === 'success' && response.data) {
            const contacts = response.data as EmergencyContact[];
            
            // Save to SQLite
            for (const contact of contacts) {
              await sqliteService.saveEmergencyContact(contact);
            }
            
            return { success: true, data: contacts };
          }
        } catch (error) {
          console.error('Error fetching emergency contacts from API:', error);
        }
      }

      // Get from SQLite as fallback
      const offlineContacts = await sqliteService.getEmergencyContacts(userId);
      return { success: true, data: offlineContacts };

    } catch (error) {
      console.error('Error getting emergency contacts:', error);
      return { success: false, message: 'Failed to get emergency contacts' };
    }
  }

  /**
   * Save emergency contact
   */
  async saveEmergencyContact(contact: Omit<EmergencyContact, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<SettingsResponse> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        return { success: false, message: 'User not authenticated' };
      }

      const contactData: EmergencyContact = {
        ...contact,
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Save to SQLite immediately
      await sqliteService.saveEmergencyContact(contactData);

      const isConnected = await NetInfo.fetch().then(state => state.isConnected);

      if (isConnected) {
        try {
          const response = await apiClient.post('/api/v1/emergency-contacts', contact);
          
          if (response.status === 'success') {
            return { success: true, message: 'Emergency contact saved successfully' };
          }
        } catch (error) {
          console.error('Error saving emergency contact via API:', error);
        }
      }

      return { success: true, message: 'Emergency contact saved (offline)' };

    } catch (error) {
      console.error('Error saving emergency contact:', error);
      return { success: false, message: 'Failed to save emergency contact' };
    }
  }

  /**
   * Delete emergency contact
   */
  async deleteEmergencyContact(contactId: number): Promise<SettingsResponse> {
    try {
      // Remove from SQLite immediately
      await sqliteService.deleteEmergencyContact(contactId);

      const isConnected = await NetInfo.fetch().then(state => state.isConnected);

      if (isConnected) {
        try {
          const response = await apiClient.delete(`/api/v1/emergency-contacts/${contactId}`);
          
          if (response.status === 'success') {
            return { success: true, message: 'Emergency contact deleted successfully' };
          }
        } catch (error) {
          console.error('Error deleting emergency contact via API:', error);
        }
      }

      return { success: true, message: 'Emergency contact deleted (offline)' };

    } catch (error) {
      console.error('Error deleting emergency contact:', error);
      return { success: false, message: 'Failed to delete emergency contact' };
    }
  }

  // ===== VERIFICATION METHODS =====

  /**
   * Get user verification status
   */
  async getVerificationStatus(): Promise<SettingsResponse<UserVerificationStatus>> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        return { success: false, message: 'User not authenticated' };
      }

      const isConnected = await NetInfo.fetch().then(state => state.isConnected);

      if (isConnected) {
        try {
          const response = await apiClient.get('/api/v1/verification/status');
          
          if (response.status === 'success' && response.data) {
            const status = response.data as UserVerificationStatus;
            
            // Save to SQLite
            await sqliteService.saveUserVerificationStatus(status);
            
            return { success: true, data: status };
          }
        } catch (error) {
          console.error('Error fetching verification status from API:', error);
        }
      }

      // Get from SQLite as fallback
      const offlineStatus = await sqliteService.getUserVerificationStatus(userId);
      if (offlineStatus) {
        return { success: true, data: offlineStatus };
      }

      // Return default status
      const defaultStatus: UserVerificationStatus = {
        user_id: userId,
        photo_verification_status: 'not_started',
        id_verification_status: 'not_started',
        phone_verification_status: 'not_started',
        social_media_verification_status: 'not_started',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      return { success: true, data: defaultStatus };

    } catch (error) {
      console.error('Error getting verification status:', error);
      return { success: false, message: 'Failed to get verification status' };
    }
  }

  // ===== CATEGORY-SPECIFIC SETTINGS METHODS =====

  /**
   * Get notification settings
   */
  async getNotificationSettings(): Promise<SettingsResponse<NotificationSettings>> {
    try {
      const isConnected = await NetInfo.fetch().then(state => state.isConnected);

      if (isConnected) {
        try {
          const response = await apiClient.settings.getNotifications();
          
          if (response.status === 'success' && response.data) {
            return { success: true, data: response.data };
          }
        } catch (error) {
          console.error('Error fetching notification settings from API:', error);
        }
      }

      // Fallback to main settings
      const mainSettings = await this.getUserSettings();
      if (mainSettings.success && mainSettings.data) {
        const notificationSettings: NotificationSettings = {
          notify_matches: mainSettings.data.notify_matches,
          notify_messages: mainSettings.data.notify_messages,
          notify_likes: mainSettings.data.notify_likes,
          notify_super_likes: mainSettings.data.notify_super_likes,
          notify_visitors: mainSettings.data.notify_visitors,
          notify_new_features: mainSettings.data.notify_new_features,
          notify_marketing: mainSettings.data.notify_marketing,
          push_notifications_enabled: mainSettings.data.push_notifications_enabled,
          in_app_sounds_enabled: mainSettings.data.in_app_sounds_enabled,
          vibration_enabled: mainSettings.data.vibration_enabled,
          email_notifications_enabled: mainSettings.data.email_notifications_enabled,
        };
        return { success: true, data: notificationSettings };
      }

      return { success: false, message: 'Failed to get notification settings' };
    } catch (error) {
      console.error('Error getting notification settings:', error);
      return { success: false, message: 'Failed to get notification settings' };
    }
  }

  /**
   * Update notification settings
   */
  async updateNotificationSettings(settings: Partial<NotificationSettings>): Promise<SettingsResponse<NotificationSettings>> {
    try {
      const isConnected = await NetInfo.fetch().then(state => state.isConnected);

      if (isConnected) {
        try {
          const response = await apiClient.settings.updateNotifications(settings);
          
          if (response.status === 'success' && response.data) {
            // Also update main settings cache
            await this.updateUserSettings(settings);
            return { success: true, data: response.data };
          }
        } catch (error) {
          console.error('Error updating notification settings via API:', error);
        }
      }

      // Fallback to main settings update
      const result = await this.updateUserSettings(settings);
      if (result.success && result.data) {
        const notificationSettings: NotificationSettings = {
          notify_matches: result.data.notify_matches,
          notify_messages: result.data.notify_messages,
          notify_likes: result.data.notify_likes,
          notify_super_likes: result.data.notify_super_likes,
          notify_visitors: result.data.notify_visitors,
          notify_new_features: result.data.notify_new_features,
          notify_marketing: result.data.notify_marketing,
          push_notifications_enabled: result.data.push_notifications_enabled,
          in_app_sounds_enabled: result.data.in_app_sounds_enabled,
          vibration_enabled: result.data.vibration_enabled,
          email_notifications_enabled: result.data.email_notifications_enabled,
        };
        return { success: true, data: notificationSettings };
      }

      return { success: false, message: 'Failed to update notification settings' };
    } catch (error) {
      console.error('Error updating notification settings:', error);
      return { success: false, message: 'Failed to update notification settings' };
    }
  }

  /**
   * Get privacy settings
   */
  async getPrivacySettings(): Promise<SettingsResponse<PrivacySettings>> {
    try {
      const isConnected = await NetInfo.fetch().then(state => state.isConnected);

      if (isConnected) {
        try {
          const response = await apiClient.settings.getPrivacy();
          
          if (response.status === 'success' && response.data) {
            return { success: true, data: response.data };
          }
        } catch (error) {
          console.error('Error fetching privacy settings from API:', error);
        }
      }

      // Fallback to main settings
      const mainSettings = await this.getUserSettings();
      if (mainSettings.success && mainSettings.data) {
        const privacySettings: PrivacySettings = {
          profile_visible: mainSettings.data.profile_visible,
          profile_visibility_level: mainSettings.data.profile_visibility_level,
          show_online_status: mainSettings.data.show_online_status,
          show_distance: mainSettings.data.show_distance,
          show_age: mainSettings.data.show_age,
          age_display_type: mainSettings.data.age_display_type,
          show_last_active: mainSettings.data.show_last_active,
          allow_messages_from_matches: mainSettings.data.allow_messages_from_matches,
          allow_messages_from_all: mainSettings.data.allow_messages_from_all,
          show_read_receipts: mainSettings.data.show_read_receipts,
          prevent_screenshots: mainSettings.data.prevent_screenshots,
          hide_from_contacts: mainSettings.data.hide_from_contacts,
          incognito_mode: mainSettings.data.incognito_mode,
        };
        return { success: true, data: privacySettings };
      }

      return { success: false, message: 'Failed to get privacy settings' };
    } catch (error) {
      console.error('Error getting privacy settings:', error);
      return { success: false, message: 'Failed to get privacy settings' };
    }
  }

  /**
   * Update privacy settings
   */
  async updatePrivacySettings(settings: Partial<PrivacySettings>): Promise<SettingsResponse<PrivacySettings>> {
    try {
      const isConnected = await NetInfo.fetch().then(state => state.isConnected);

      if (isConnected) {
        try {
          const response = await apiClient.settings.updatePrivacy(settings);
          
          if (response.status === 'success' && response.data) {
            // Also update main settings cache
            await this.updateUserSettings(settings);
            return { success: true, data: response.data };
          }
        } catch (error) {
          console.error('Error updating privacy settings via API:', error);
        }
      }

      // Fallback to main settings update
      const result = await this.updateUserSettings(settings);
      if (result.success && result.data) {
        const privacySettings: PrivacySettings = {
          profile_visible: result.data.profile_visible,
          profile_visibility_level: result.data.profile_visibility_level,
          show_online_status: result.data.show_online_status,
          show_distance: result.data.show_distance,
          show_age: result.data.show_age,
          age_display_type: result.data.age_display_type,
          show_last_active: result.data.show_last_active,
          allow_messages_from_matches: result.data.allow_messages_from_matches,
          allow_messages_from_all: result.data.allow_messages_from_all,
          show_read_receipts: result.data.show_read_receipts,
          prevent_screenshots: result.data.prevent_screenshots,
          hide_from_contacts: result.data.hide_from_contacts,
          incognito_mode: result.data.incognito_mode,
        };
        return { success: true, data: privacySettings };
      }

      return { success: false, message: 'Failed to update privacy settings' };
    } catch (error) {
      console.error('Error updating privacy settings:', error);
      return { success: false, message: 'Failed to update privacy settings' };
    }
  }

  /**
   * Get discovery settings
   */
  async getDiscoverySettings(): Promise<SettingsResponse<DiscoverySettings>> {
    try {
      const isConnected = await NetInfo.fetch().then(state => state.isConnected);

      if (isConnected) {
        try {
          const response = await apiClient.settings.getDiscovery();
          
          if (response.status === 'success' && response.data) {
            return { success: true, data: response.data };
          }
        } catch (error) {
          console.error('Error fetching discovery settings from API:', error);
        }
      }

      // Fallback to main settings
      const mainSettings = await this.getUserSettings();
      if (mainSettings.success && mainSettings.data) {
        const discoverySettings: DiscoverySettings = {
          show_me_on_discovery: mainSettings.data.show_me_on_discovery,
          global_mode: mainSettings.data.global_mode,
          recently_active_only: mainSettings.data.recently_active_only,
          verified_profiles_only: mainSettings.data.verified_profiles_only,
          hide_already_seen_profiles: mainSettings.data.hide_already_seen_profiles,
          smart_photos: mainSettings.data.smart_photos,
          min_age: mainSettings.data.min_age,
          max_age: mainSettings.data.max_age,
          max_distance: mainSettings.data.max_distance,
          looking_for_preferences: mainSettings.data.looking_for_preferences || [],
          interest_preferences: mainSettings.data.interest_preferences || [],
        };
        return { success: true, data: discoverySettings };
      }

      return { success: false, message: 'Failed to get discovery settings' };
    } catch (error) {
      console.error('Error getting discovery settings:', error);
      return { success: false, message: 'Failed to get discovery settings' };
    }
  }

  /**
   * Update discovery settings
   */
  async updateDiscoverySettings(settings: Partial<DiscoverySettings>): Promise<SettingsResponse<DiscoverySettings>> {
    try {
      const isConnected = await NetInfo.fetch().then(state => state.isConnected);

      if (isConnected) {
        try {
          const response = await apiClient.settings.updateDiscovery(settings);
          
          if (response.status === 'success' && response.data) {
            // Also update main settings cache
            await this.updateUserSettings(settings);
            return { success: true, data: response.data };
          }
        } catch (error) {
          console.error('Error updating discovery settings via API:', error);
        }
      }

      // Fallback to main settings update
      const result = await this.updateUserSettings(settings);
      if (result.success && result.data) {
        const discoverySettings: DiscoverySettings = {
          show_me_on_discovery: result.data.show_me_on_discovery,
          global_mode: result.data.global_mode,
          recently_active_only: result.data.recently_active_only,
          verified_profiles_only: result.data.verified_profiles_only,
          hide_already_seen_profiles: result.data.hide_already_seen_profiles,
          smart_photos: result.data.smart_photos,
          min_age: result.data.min_age,
          max_age: result.data.max_age,
          max_distance: result.data.max_distance,
          looking_for_preferences: result.data.looking_for_preferences || [],
          interest_preferences: result.data.interest_preferences || [],
        };
        return { success: true, data: discoverySettings };
      }

      return { success: false, message: 'Failed to update discovery settings' };
    } catch (error) {
      console.error('Error updating discovery settings:', error);
      return { success: false, message: 'Failed to update discovery settings' };
    }
  }

  /**
   * Get security settings
   */
  async getSecuritySettings(): Promise<SettingsResponse<SecuritySettings>> {
    try {
      const isConnected = await NetInfo.fetch().then(state => state.isConnected);

      if (isConnected) {
        try {
          const response = await apiClient.settings.getSecurity();
          
          if (response.status === 'success' && response.data) {
            return { success: true, data: response.data };
          }
        } catch (error) {
          console.error('Error fetching security settings from API:', error);
        }
      }

      // Fallback to main settings
      const mainSettings = await this.getUserSettings();
      if (mainSettings.success && mainSettings.data) {
        const securitySettings: SecuritySettings = {
          two_factor_enabled: mainSettings.data.two_factor_enabled,
          photo_verification_enabled: mainSettings.data.photo_verification_enabled,
          id_verification_enabled: mainSettings.data.id_verification_enabled,
          phone_verification_enabled: mainSettings.data.phone_verification_enabled,
          social_media_verification_enabled: mainSettings.data.social_media_verification_enabled,
          login_alerts_enabled: mainSettings.data.login_alerts_enabled,
          block_screenshots: mainSettings.data.block_screenshots,
          hide_from_facebook: mainSettings.data.hide_from_facebook,
        };
        return { success: true, data: securitySettings };
      }

      return { success: false, message: 'Failed to get security settings' };
    } catch (error) {
      console.error('Error getting security settings:', error);
      return { success: false, message: 'Failed to get security settings' };
    }
  }

  /**
   * Update security settings
   */
  async updateSecuritySettings(settings: Partial<SecuritySettings>): Promise<SettingsResponse<SecuritySettings>> {
    try {
      const isConnected = await NetInfo.fetch().then(state => state.isConnected);

      if (isConnected) {
        try {
          const response = await apiClient.settings.updateSecurity(settings);
          
          if (response.status === 'success' && response.data) {
            // Also update main settings cache
            await this.updateUserSettings(settings);
            return { success: true, data: response.data };
          }
        } catch (error) {
          console.error('Error updating security settings via API:', error);
        }
      }

      // Fallback to main settings update
      const result = await this.updateUserSettings(settings);
      if (result.success && result.data) {
        const securitySettings: SecuritySettings = {
          two_factor_enabled: result.data.two_factor_enabled,
          photo_verification_enabled: result.data.photo_verification_enabled,
          id_verification_enabled: result.data.id_verification_enabled,
          phone_verification_enabled: result.data.phone_verification_enabled,
          social_media_verification_enabled: result.data.social_media_verification_enabled,
          login_alerts_enabled: result.data.login_alerts_enabled,
          block_screenshots: result.data.block_screenshots,
          hide_from_facebook: result.data.hide_from_facebook,
        };
        return { success: true, data: securitySettings };
      }

      return { success: false, message: 'Failed to update security settings' };
    } catch (error) {
      console.error('Error updating security settings:', error);
      return { success: false, message: 'Failed to update security settings' };
    }
  }

  /**
   * Clear cache
   */
  async clearCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem('user_settings_cache');
      this.cachedSettings = null;
      this.cachedBlockedUsers = null;
      this.cacheTimestamp = 0;
    } catch (error) {
      console.error('Error clearing settings cache:', error);
    }
  }
}

// Export singleton instance
export const settingsService = SettingsService.getInstance();
export default settingsService;

// React Hook for Settings Management
import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await settingsService.getUserSettings(forceRefresh);
      
      if (result.success && result.data) {
        setSettings(result.data);
      } else {
        setError(result.message || 'Failed to load settings');
      }
    } catch (err) {
      setError('Failed to load settings');
      console.error('Settings loading error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSettings = useCallback(async (updates: Partial<UserSettings>) => {
    try {
      setError(null);
      
      const result = await settingsService.updateUserSettings(updates);
      
      if (result.success && result.data) {
        setSettings(result.data);
        return { success: true };
      } else {
        setError(result.message || 'Failed to update settings');
        return { success: false, error: result.message };
      }
    } catch (err) {
      const errorMessage = 'Failed to update settings';
      setError(errorMessage);
      console.error('Settings update error:', err);
      return { success: false, error: errorMessage };
    }
  }, []);

  // Load settings on mount and when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [loadSettings])
  );

  // Listen for settings changes
  useEffect(() => {
    const handleSettingsChange = (updatedSettings: UserSettings) => {
      setSettings(updatedSettings);
    };

    settingsService.addSettingsChangeListener(handleSettingsChange);

    return () => {
      settingsService.removeSettingsChangeListener(handleSettingsChange);
    };
  }, []);

  return {
    settings,
    loading,
    error,
    loadSettings,
    updateSettings,
    refreshSettings: () => loadSettings(true)
  };
}

// Category-specific hooks
export function useNotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await settingsService.getNotificationSettings();
      
      if (result.success && result.data) {
        setSettings(result.data);
      } else {
        setError(result.message || 'Failed to load notification settings');
      }
    } catch (err) {
      setError('Failed to load notification settings');
      console.error('Notification settings loading error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSettings = useCallback(async (updates: Partial<NotificationSettings>) => {
    try {
      setError(null);
      
      const result = await settingsService.updateNotificationSettings(updates);
      
      if (result.success && result.data) {
        setSettings(result.data);
        return { success: true };
      } else {
        setError(result.message || 'Failed to update notification settings');
        return { success: false, error: result.message };
      }
    } catch (err) {
      const errorMessage = 'Failed to update notification settings';
      setError(errorMessage);
      console.error('Notification settings update error:', err);
      return { success: false, error: errorMessage };
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [loadSettings])
  );

  return {
    settings,
    loading,
    error,
    updateSettings,
    refreshSettings: loadSettings
  };
}

export function usePrivacySettings() {
  const [settings, setSettings] = useState<PrivacySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await settingsService.getPrivacySettings();
      
      if (result.success && result.data) {
        setSettings(result.data);
      } else {
        setError(result.message || 'Failed to load privacy settings');
      }
    } catch (err) {
      setError('Failed to load privacy settings');
      console.error('Privacy settings loading error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSettings = useCallback(async (updates: Partial<PrivacySettings>) => {
    try {
      setError(null);
      
      const result = await settingsService.updatePrivacySettings(updates);
      
      if (result.success && result.data) {
        setSettings(result.data);
        return { success: true };
      } else {
        setError(result.message || 'Failed to update privacy settings');
        return { success: false, error: result.message };
      }
    } catch (err) {
      const errorMessage = 'Failed to update privacy settings';
      setError(errorMessage);
      console.error('Privacy settings update error:', err);
      return { success: false, error: errorMessage };
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [loadSettings])
  );

  return {
    settings,
    loading,
    error,
    updateSettings,
    refreshSettings: loadSettings
  };
}

export function useDiscoverySettings() {
  const [settings, setSettings] = useState<DiscoverySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await settingsService.getDiscoverySettings();
      
      if (result.success && result.data) {
        setSettings(result.data);
      } else {
        setError(result.message || 'Failed to load discovery settings');
      }
    } catch (err) {
      setError('Failed to load discovery settings');
      console.error('Discovery settings loading error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSettings = useCallback(async (updates: Partial<DiscoverySettings>) => {
    try {
      setError(null);
      
      const result = await settingsService.updateDiscoverySettings(updates);
      
      if (result.success && result.data) {
        setSettings(result.data);
        return { success: true };
      } else {
        setError(result.message || 'Failed to update discovery settings');
        return { success: false, error: result.message };
      }
    } catch (err) {
      const errorMessage = 'Failed to update discovery settings';
      setError(errorMessage);
      console.error('Discovery settings update error:', err);
      return { success: false, error: errorMessage };
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [loadSettings])
  );

  return {
    settings,
    loading,
    error,
    updateSettings,
    refreshSettings: loadSettings
  };
}

export function useSecuritySettings() {
  const [settings, setSettings] = useState<SecuritySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await settingsService.getSecuritySettings();
      
      if (result.success && result.data) {
        setSettings(result.data);
      } else {
        setError(result.message || 'Failed to load security settings');
      }
    } catch (err) {
      setError('Failed to load security settings');
      console.error('Security settings loading error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSettings = useCallback(async (updates: Partial<SecuritySettings>) => {
    try {
      setError(null);
      
      const result = await settingsService.updateSecuritySettings(updates);
      
      if (result.success && result.data) {
        setSettings(result.data);
        return { success: true };
      } else {
        setError(result.message || 'Failed to update security settings');
        return { success: false, error: result.message };
      }
    } catch (err) {
      const errorMessage = 'Failed to update security settings';
      setError(errorMessage);
      console.error('Security settings update error:', err);
      return { success: false, error: errorMessage };
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [loadSettings])
  );

  return {
    settings,
    loading,
    error,
    updateSettings,
    refreshSettings: loadSettings
  };
} 