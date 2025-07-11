import { settingsService, SettingsResponse } from './settings-service';
import { UserSettings } from './sqlite-service';

/**
 * Account Management Service
 * Handles account-related settings and actions
 */
export class AccountManagementService {
  /**
   * Get account management settings
   */
  async getAccountSettings(): Promise<SettingsResponse<Pick<UserSettings, 'two_factor_enabled' | 'email_notifications_enabled' | 'marketing_emails_enabled'>>> {
    const response = await settingsService.getUserSettings();
    if (!response.success || !response.data) {
      return response;
    }

    return {
      success: true,
      data: {
        two_factor_enabled: response.data.two_factor_enabled,
        email_notifications_enabled: response.data.email_notifications_enabled,
        marketing_emails_enabled: response.data.marketing_emails_enabled
      }
    };
  }

  /**
   * Update account settings
   */
  async updateAccountSettings(settings: {
    two_factor_enabled?: boolean;
    email_notifications_enabled?: boolean;
    marketing_emails_enabled?: boolean;
  }): Promise<SettingsResponse<UserSettings>> {
    return await settingsService.updateUserSettings(settings);
  }

  /**
   * Change password
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<SettingsResponse> {
    return await settingsService.changePassword({
      current_password: currentPassword,
      new_password: newPassword,
      new_password_confirmation: newPassword
    });
  }

  /**
   * Change email
   */
  async changeEmail(newEmail: string, password?: string): Promise<SettingsResponse> {
    return await settingsService.changeEmail({ new_email: newEmail, password });
  }

  /**
   * Request account deletion
   */
  async deleteAccount(reason?: string): Promise<SettingsResponse> {
    return await settingsService.requestAccountDeletion(reason);
  }

  /**
   * Export user data
   */
  async exportData(): Promise<SettingsResponse> {
    return await settingsService.requestDataExport();
  }
}

/**
 * Notification Settings Service
 * Handles all notification-related settings
 */
export class NotificationSettingsService {
  /**
   * Get notification settings
   */
  async getNotificationSettings(): Promise<SettingsResponse<NotificationSettings>> {
    const response = await settingsService.getUserSettings();
    if (!response.success || !response.data) {
      return response;
    }

    return {
      success: true,
      data: {
        // Dating Activity
        notify_matches: response.data.notify_matches,
        notify_messages: response.data.notify_messages,
        notify_likes: response.data.notify_likes,
        notify_super_likes: response.data.notify_super_likes,
        notify_visitors: response.data.notify_visitors,
        
        // App Notifications
        notify_new_features: response.data.notify_new_features,
        notify_marketing: response.data.notify_marketing,
        
        // Notification Methods
        push_notifications_enabled: response.data.push_notifications_enabled,
        email_notifications_enabled: response.data.email_notifications_enabled,
        in_app_sounds_enabled: response.data.in_app_sounds_enabled,
        vibration_enabled: response.data.vibration_enabled,
        
        // Quiet Hours
        quiet_hours_start: response.data.quiet_hours_start,
        quiet_hours_end: response.data.quiet_hours_end
      }
    };
  }

  /**
   * Update notification settings
   */
  async updateNotificationSettings(settings: Partial<NotificationSettings>): Promise<SettingsResponse<UserSettings>> {
    return await settingsService.updateUserSettings(settings);
  }

  /**
   * Enable/disable all notifications
   */
  async toggleAllNotifications(enabled: boolean): Promise<SettingsResponse<UserSettings>> {
    return await settingsService.updateUserSettings({
      notify_matches: enabled,
      notify_messages: enabled,
      notify_likes: enabled,
      notify_super_likes: enabled,
      notify_visitors: enabled,
      notify_new_features: enabled,
      notify_marketing: enabled,
      push_notifications_enabled: enabled,
      email_notifications_enabled: enabled
    });
  }

  /**
   * Set quiet hours
   */
  async setQuietHours(startTime: string, endTime: string): Promise<SettingsResponse<UserSettings>> {
    return await settingsService.updateUserSettings({
      quiet_hours_start: startTime,
      quiet_hours_end: endTime
    });
  }

  /**
   * Clear quiet hours
   */
  async clearQuietHours(): Promise<SettingsResponse<UserSettings>> {
    return await settingsService.updateUserSettings({
      quiet_hours_start: undefined,
      quiet_hours_end: undefined
    });
  }
}

/**
 * Privacy Settings Service
 * Handles privacy and visibility settings
 */
export class PrivacySettingsService {
  /**
   * Get privacy settings
   */
  async getPrivacySettings(): Promise<SettingsResponse<PrivacySettings>> {
    const response = await settingsService.getUserSettings();
    if (!response.success || !response.data) {
      return response;
    }

    return {
      success: true,
      data: {
        // Profile Visibility
        profile_visible: response.data.profile_visible,
        profile_visibility_level: response.data.profile_visibility_level,
        show_online_status: response.data.show_online_status,
        show_distance: response.data.show_distance,
        show_age: response.data.show_age,
        age_display_type: response.data.age_display_type,
        show_last_active: response.data.show_last_active,
        
        // Messaging Privacy
        allow_messages_from_matches: response.data.allow_messages_from_matches,
        allow_messages_from_all: response.data.allow_messages_from_all,
        show_read_receipts: response.data.show_read_receipts,
        
        // Safety & Security
        prevent_screenshots: response.data.prevent_screenshots,
        hide_from_contacts: response.data.hide_from_contacts,
        incognito_mode: response.data.incognito_mode
      }
    };
  }

  /**
   * Update privacy settings
   */
  async updatePrivacySettings(settings: Partial<PrivacySettings>): Promise<SettingsResponse<UserSettings>> {
    return await settingsService.updateUserSettings(settings);
  }

  /**
   * Set profile visibility
   */
  async setProfileVisibility(visible: boolean, level: 'everyone' | 'matches_only' | 'friends_only' = 'everyone'): Promise<SettingsResponse<UserSettings>> {
    return await settingsService.updateUserSettings({
      profile_visible: visible,
      profile_visibility_level: level
    });
  }

  /**
   * Enable/disable incognito mode
   */
  async toggleIncognitoMode(enabled: boolean): Promise<SettingsResponse<UserSettings>> {
    return await settingsService.updateUserSettings({
      incognito_mode: enabled
    });
  }

  /**
   * Set age display preference
   */
  async setAgeDisplayType(type: 'exact' | 'range' | 'hidden'): Promise<SettingsResponse<UserSettings>> {
    return await settingsService.updateUserSettings({
      age_display_type: type
    });
  }
}

/**
 * Discovery Settings Service
 * Handles discovery and matching preferences
 */
export class DiscoverySettingsService {
  /**
   * Get discovery settings
   */
  async getDiscoverySettings(): Promise<SettingsResponse<DiscoverySettings>> {
    const response = await settingsService.getUserSettings();
    if (!response.success || !response.data) {
      return response;
    }

    return {
      success: true,
      data: {
        // Basic Discovery
        show_me_on_discovery: response.data.show_me_on_discovery,
        global_mode: response.data.global_mode,
        recently_active_only: response.data.recently_active_only,
        verified_profiles_only: response.data.verified_profiles_only,
        hide_already_seen_profiles: response.data.hide_already_seen_profiles,
        smart_photos: response.data.smart_photos,
        
        // Discovery Filters
        min_age: response.data.min_age,
        max_age: response.data.max_age,
        max_distance: response.data.max_distance,
        looking_for_preferences: response.data.looking_for_preferences || [],
        interest_preferences: response.data.interest_preferences || []
      }
    };
  }

  /**
   * Update discovery settings
   */
  async updateDiscoverySettings(settings: Partial<DiscoverySettings>): Promise<SettingsResponse<UserSettings>> {
    return await settingsService.updateUserSettings(settings);
  }

  /**
   * Set age range
   */
  async setAgeRange(minAge: number, maxAge: number): Promise<SettingsResponse<UserSettings>> {
    return await settingsService.updateUserSettings({
      min_age: minAge,
      max_age: maxAge
    });
  }

  /**
   * Set maximum distance
   */
  async setMaxDistance(distance: number): Promise<SettingsResponse<UserSettings>> {
    return await settingsService.updateUserSettings({
      max_distance: distance
    });
  }

  /**
   * Update looking for preferences
   */
  async updateLookingForPreferences(preferences: string[]): Promise<SettingsResponse<UserSettings>> {
    return await settingsService.updateUserSettings({
      looking_for_preferences: preferences
    });
  }

  /**
   * Update interest preferences
   */
  async updateInterestPreferences(interests: string[]): Promise<SettingsResponse<UserSettings>> {
    return await settingsService.updateUserSettings({
      interest_preferences: interests
    });
  }

  /**
   * Enable/disable global mode
   */
  async toggleGlobalMode(enabled: boolean): Promise<SettingsResponse<UserSettings>> {
    return await settingsService.updateUserSettings({
      global_mode: enabled
    });
  }
}

/**
 * Data Privacy Service
 * Handles data sharing and privacy preferences
 */
export class DataPrivacyService {
  /**
   * Get data privacy settings
   */
  async getDataPrivacySettings(): Promise<SettingsResponse<DataPrivacySettings>> {
    const response = await settingsService.getUserSettings();
    if (!response.success || !response.data) {
      return response;
    }

    return {
      success: true,
      data: {
        share_analytics_data: response.data.share_analytics_data,
        share_location_data: response.data.share_location_data,
        personalized_ads_enabled: response.data.personalized_ads_enabled,
        data_for_improvements: response.data.data_for_improvements,
        share_with_partners: response.data.share_with_partners
      }
    };
  }

  /**
   * Update data privacy settings
   */
  async updateDataPrivacySettings(settings: Partial<DataPrivacySettings>): Promise<SettingsResponse<UserSettings>> {
    return await settingsService.updateUserSettings(settings);
  }

  /**
   * Enable/disable all data sharing
   */
  async toggleAllDataSharing(enabled: boolean): Promise<SettingsResponse<UserSettings>> {
    return await settingsService.updateUserSettings({
      share_analytics_data: enabled,
      share_location_data: enabled,
      personalized_ads_enabled: enabled,
      data_for_improvements: enabled,
      share_with_partners: enabled
    });
  }
}

/**
 * Security Settings Service
 * Handles security and verification settings
 */
export class SecuritySettingsService {
  /**
   * Get security settings
   */
  async getSecuritySettings(): Promise<SettingsResponse<SecuritySettings>> {
    const response = await settingsService.getUserSettings();
    if (!response.success || !response.data) {
      return response;
    }

    return {
      success: true,
      data: {
        // Verification
        photo_verification_enabled: response.data.photo_verification_enabled,
        id_verification_enabled: response.data.id_verification_enabled,
        phone_verification_enabled: response.data.phone_verification_enabled,
        social_media_verification_enabled: response.data.social_media_verification_enabled,
        
        // Security
        two_factor_enabled: response.data.two_factor_enabled,
        login_alerts_enabled: response.data.login_alerts_enabled,
        block_screenshots: response.data.block_screenshots,
        hide_from_facebook: response.data.hide_from_facebook
      }
    };
  }

  /**
   * Update security settings
   */
  async updateSecuritySettings(settings: Partial<SecuritySettings>): Promise<SettingsResponse<UserSettings>> {
    return await settingsService.updateUserSettings(settings);
  }

  /**
   * Get verification status
   */
  async getVerificationStatus() {
    return await settingsService.getVerificationStatus();
  }

  /**
   * Enable/disable two-factor authentication
   */
  async toggleTwoFactorAuth(enabled: boolean): Promise<SettingsResponse<UserSettings>> {
    return await settingsService.updateUserSettings({
      two_factor_enabled: enabled
    });
  }

  /**
   * Enable/disable login alerts
   */
  async toggleLoginAlerts(enabled: boolean): Promise<SettingsResponse<UserSettings>> {
    return await settingsService.updateUserSettings({
      login_alerts_enabled: enabled
    });
  }
}

// Type definitions for specialized settings
export interface NotificationSettings {
  notify_matches: boolean;
  notify_messages: boolean;
  notify_likes: boolean;
  notify_super_likes: boolean;
  notify_visitors: boolean;
  notify_new_features: boolean;
  notify_marketing: boolean;
  push_notifications_enabled: boolean;
  email_notifications_enabled: boolean;
  in_app_sounds_enabled: boolean;
  vibration_enabled: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
}

export interface PrivacySettings {
  profile_visible: boolean;
  profile_visibility_level: 'everyone' | 'matches_only' | 'friends_only';
  show_online_status: boolean;
  show_distance: boolean;
  show_age: boolean;
  age_display_type: 'exact' | 'range' | 'hidden';
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

export interface DataPrivacySettings {
  share_analytics_data: boolean;
  share_location_data: boolean;
  personalized_ads_enabled: boolean;
  data_for_improvements: boolean;
  share_with_partners: boolean;
}

export interface SecuritySettings {
  photo_verification_enabled: boolean;
  id_verification_enabled: boolean;
  phone_verification_enabled: boolean;
  social_media_verification_enabled: boolean;
  two_factor_enabled: boolean;
  login_alerts_enabled: boolean;
  block_screenshots: boolean;
  hide_from_facebook: boolean;
}

// Export service instances
export const accountManagementService = new AccountManagementService();
export const notificationSettingsService = new NotificationSettingsService();
export const privacySettingsService = new PrivacySettingsService();
export const discoverySettingsService = new DiscoverySettingsService();
export const dataPrivacyService = new DataPrivacyService();
export const securitySettingsService = new SecuritySettingsService(); 