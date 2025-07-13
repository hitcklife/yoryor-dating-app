import { connectionManager } from './connection-manager';
import { WrappedConnection } from './performance-wrapper';

// Settings interfaces
export interface UserSettings {
  id?: number;
  user_id: number;
  
  // Account Management
  two_factor_enabled: boolean;
  email_notifications_enabled: boolean;
  marketing_emails_enabled: boolean;
  
  // Notification Settings
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
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  
  // Privacy Settings
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
  
  // Discovery Settings
  show_me_on_discovery: boolean;
  global_mode: boolean;
  recently_active_only: boolean;
  verified_profiles_only: boolean;
  hide_already_seen_profiles: boolean;
  smart_photos: boolean;
  min_age: number;
  max_age: number;
  max_distance: number;
  looking_for_preferences?: string[];
  interest_preferences?: string[];
  
  // Data Privacy Settings
  share_analytics_data: boolean;
  share_location_data: boolean;
  personalized_ads_enabled: boolean;
  data_for_improvements: boolean;
  share_with_partners: boolean;
  
  // Security Settings
  photo_verification_enabled: boolean;
  id_verification_enabled: boolean;
  phone_verification_enabled: boolean;
  social_media_verification_enabled: boolean;
  login_alerts_enabled: boolean;
  block_screenshots: boolean;
  hide_from_facebook: boolean;
  
  created_at?: string;
  updated_at?: string;
}

export interface BlockedUser {
  id?: number;
  blocker_id: number;
  blocked_id: number;
  blocked_user_name?: string;
  blocked_user_age?: number;
  blocked_user_photo_url?: string;
  reason?: string;
  created_at?: string;
}

export interface UserFeedback {
  id?: number;
  user_id?: number;
  email?: string;
  feedback_text: string;
  category?: string;
  status?: 'pending' | 'reviewed' | 'resolved';
  created_at?: string;
  updated_at?: string;
}

export interface UserReport {
  id?: number;
  reporter_id: number;
  reported_id: number;
  reported_user_name?: string;
  reason: string;
  description?: string;
  evidence_urls?: string[];
  status?: 'pending' | 'under_review' | 'resolved' | 'dismissed';
  created_at?: string;
  updated_at?: string;
}

export interface EmergencyContact {
  id?: number;
  user_id: number;
  name: string;
  phone: string;
  relationship?: string;
  is_primary?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface DataExportRequest {
  id?: number;
  user_id: number;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  request_type?: string;
  export_url?: string;
  expires_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AccountDeletionRequest {
  id?: number;
  user_id: number;
  reason?: string;
  scheduled_deletion_date?: string;
  status?: 'pending' | 'scheduled' | 'completed' | 'cancelled';
  created_at?: string;
  updated_at?: string;
}

export interface PasswordChangeHistory {
  id?: number;
  user_id: number;
  change_type?: string;
  ip_address?: string;
  user_agent?: string;
  created_at?: string;
}

export interface EmailChangeRequest {
  id?: number;
  user_id: number;
  old_email: string;
  new_email: string;
  verification_token?: string;
  status?: 'pending' | 'verified' | 'expired' | 'cancelled';
  expires_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserVerificationStatus {
  id?: number;
  user_id: number;
  photo_verification_status?: 'not_started' | 'pending' | 'approved' | 'rejected';
  id_verification_status?: 'not_started' | 'pending' | 'approved' | 'rejected';
  phone_verification_status?: 'not_started' | 'pending' | 'approved' | 'rejected';
  social_media_verification_status?: 'not_started' | 'pending' | 'approved' | 'rejected';
  photo_verification_date?: string;
  id_verification_date?: string;
  phone_verification_date?: string;
  social_media_verification_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SupportTicket {
  id?: number;
  user_id: number;
  subject: string;
  description: string;
  category?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  status?: 'open' | 'in_progress' | 'resolved' | 'closed';
  assigned_to?: string;
  created_at?: string;
  updated_at?: string;
}

export interface NotificationCounts {
  id?: number;
  user_id: number;
  unread_messages_count: number;
  new_likes_count: number;
  created_at?: string;
  updated_at?: string;
}

export interface ISettingsRepository {
  // User Settings
  getUserSettings(userId: number): Promise<UserSettings | null>;
  saveUserSettings(settings: UserSettings): Promise<void>;
  updateUserSettings(userId: number, updates: Partial<UserSettings>): Promise<void>;
  
  // Blocked Users
  getBlockedUsers(userId: number): Promise<BlockedUser[]>;
  blockUser(blockedUser: BlockedUser): Promise<void>;
  unblockUser(blockerId: number, blockedId: number): Promise<void>;
  isUserBlocked(blockerId: number, blockedId: number): Promise<boolean>;
  
  // User Feedback
  saveUserFeedback(feedback: UserFeedback): Promise<void>;
  getUserFeedback(userId?: number): Promise<UserFeedback[]>;
  
  // User Reports
  saveUserReport(report: UserReport): Promise<void>;
  getUserReports(userId?: number): Promise<UserReport[]>;
  
  // Emergency Contacts
  saveEmergencyContact(contact: EmergencyContact): Promise<void>;
  getEmergencyContacts(userId: number): Promise<EmergencyContact[]>;
  deleteEmergencyContact(contactId: number): Promise<void>;
  
  // Data Export
  saveDataExportRequest(request: DataExportRequest): Promise<void>;
  getDataExportRequests(userId: number): Promise<DataExportRequest[]>;
  
  // Account Deletion
  saveAccountDeletionRequest(request: AccountDeletionRequest): Promise<void>;
  getAccountDeletionRequests(userId: number): Promise<AccountDeletionRequest[]>;
  
  // Password History
  savePasswordChangeHistory(history: PasswordChangeHistory): Promise<void>;
  getPasswordChangeHistory(userId: number): Promise<PasswordChangeHistory[]>;
  
  // Email Change
  saveEmailChangeRequest(request: EmailChangeRequest): Promise<void>;
  getEmailChangeRequests(userId: number): Promise<EmailChangeRequest[]>;
  
  // User Verification
  getUserVerificationStatus(userId: number): Promise<UserVerificationStatus | null>;
  saveUserVerificationStatus(status: UserVerificationStatus): Promise<void>;
  
  // Support Tickets
  saveSupportTicket(ticket: SupportTicket): Promise<void>;
  getSupportTickets(userId: number): Promise<SupportTicket[]>;
  
  // Notification Counts
  getNotificationCounts(userId: number): Promise<NotificationCounts>;
  createNotificationCountsRecord(userId: number): Promise<void>;
  updateUnreadMessagesCount(userId: number, count?: number, increment?: boolean): Promise<void>;
  updateNewLikesCount(userId: number, count?: number, increment?: boolean): Promise<void>;
  resetNotificationCounts(userId: number): Promise<void>;
}

/**
 * Settings Repository
 * Handles all settings-related database operations
 */
export class SettingsRepository implements ISettingsRepository {
  /**
   * Get user settings
   */
  async getUserSettings(userId: number): Promise<UserSettings | null> {
    const db = await connectionManager.getConnection();

    try {
      const settings = await db.getFirstAsync<any>(`
        SELECT * FROM user_settings 
        WHERE user_id = ?
      `, [userId]);

      if (!settings) return null;

      return this.transformUserSettingsFromQuery(settings);
    } catch (error) {
      console.error('Error getting user settings:', error);
      throw error;
    }
  }

  /**
   * Save user settings
   */
  async saveUserSettings(settings: UserSettings): Promise<void> {
    const db = await connectionManager.getConnection();

    try {
      await db.runAsync(`
        INSERT OR REPLACE INTO user_settings (
          user_id, two_factor_enabled, email_notifications_enabled, marketing_emails_enabled,
          notify_matches, notify_messages, notify_likes, notify_super_likes, notify_visitors,
          notify_new_features, notify_marketing, push_notifications_enabled, in_app_sounds_enabled,
          vibration_enabled, quiet_hours_start, quiet_hours_end, profile_visible,
          profile_visibility_level, show_online_status, show_distance, show_age, age_display_type,
          show_last_active, allow_messages_from_matches, allow_messages_from_all, show_read_receipts,
          prevent_screenshots, hide_from_contacts, incognito_mode, show_me_on_discovery,
          global_mode, recently_active_only, verified_profiles_only, hide_already_seen_profiles,
          smart_photos, min_age, max_age, max_distance, looking_for_preferences, interest_preferences,
          share_analytics_data, share_location_data, personalized_ads_enabled, data_for_improvements,
          share_with_partners, photo_verification_enabled, id_verification_enabled,
          phone_verification_enabled, social_media_verification_enabled, login_alerts_enabled,
          block_screenshots, hide_from_facebook, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        settings.user_id,
        settings.two_factor_enabled ? 1 : 0,
        settings.email_notifications_enabled ? 1 : 0,
        settings.marketing_emails_enabled ? 1 : 0,
        settings.notify_matches ? 1 : 0,
        settings.notify_messages ? 1 : 0,
        settings.notify_likes ? 1 : 0,
        settings.notify_super_likes ? 1 : 0,
        settings.notify_visitors ? 1 : 0,
        settings.notify_new_features ? 1 : 0,
        settings.notify_marketing ? 1 : 0,
        settings.push_notifications_enabled ? 1 : 0,
        settings.in_app_sounds_enabled ? 1 : 0,
        settings.vibration_enabled ? 1 : 0,
        settings.quiet_hours_start || null,
        settings.quiet_hours_end || null,
        settings.profile_visible ? 1 : 0,
        settings.profile_visibility_level,
        settings.show_online_status ? 1 : 0,
        settings.show_distance ? 1 : 0,
        settings.show_age ? 1 : 0,
        settings.age_display_type,
        settings.show_last_active ? 1 : 0,
        settings.allow_messages_from_matches ? 1 : 0,
        settings.allow_messages_from_all ? 1 : 0,
        settings.show_read_receipts ? 1 : 0,
        settings.prevent_screenshots ? 1 : 0,
        settings.hide_from_contacts ? 1 : 0,
        settings.incognito_mode ? 1 : 0,
        settings.show_me_on_discovery ? 1 : 0,
        settings.global_mode ? 1 : 0,
        settings.recently_active_only ? 1 : 0,
        settings.verified_profiles_only ? 1 : 0,
        settings.hide_already_seen_profiles ? 1 : 0,
        settings.smart_photos ? 1 : 0,
        settings.min_age,
        settings.max_age,
        settings.max_distance,
        settings.looking_for_preferences ? JSON.stringify(settings.looking_for_preferences) : null,
        settings.interest_preferences ? JSON.stringify(settings.interest_preferences) : null,
        settings.share_analytics_data ? 1 : 0,
        settings.share_location_data ? 1 : 0,
        settings.personalized_ads_enabled ? 1 : 0,
        settings.data_for_improvements ? 1 : 0,
        settings.share_with_partners ? 1 : 0,
        settings.photo_verification_enabled ? 1 : 0,
        settings.id_verification_enabled ? 1 : 0,
        settings.phone_verification_enabled ? 1 : 0,
        settings.social_media_verification_enabled ? 1 : 0,
        settings.login_alerts_enabled ? 1 : 0,
        settings.block_screenshots ? 1 : 0,
        settings.hide_from_facebook ? 1 : 0,
        settings.created_at || new Date().toISOString(),
        new Date().toISOString()
      ]);

      console.log(`User settings saved for user ${settings.user_id}`);
    } catch (error) {
      console.error('Error saving user settings:', error);
      throw error;
    }
  }

  /**
   * Update user settings
   */
  async updateUserSettings(userId: number, updates: Partial<UserSettings>): Promise<void> {
    const db = await connectionManager.getConnection();

    try {
      const setClause = [];
      const params = [];

      // Add all the possible settings updates
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined && key !== 'id' && key !== 'user_id') {
          if (typeof value === 'boolean') {
            setClause.push(`${key} = ?`);
            params.push(value ? 1 : 0);
          } else if (Array.isArray(value)) {
            setClause.push(`${key} = ?`);
            params.push(JSON.stringify(value));
          } else {
            setClause.push(`${key} = ?`);
            params.push(value);
          }
        }
      });

      if (setClause.length === 0) {
        return; // No updates to make
      }

      setClause.push('updated_at = ?');
      params.push(new Date().toISOString());
      params.push(userId);

      await db.runAsync(`
        UPDATE user_settings 
        SET ${setClause.join(', ')} 
        WHERE user_id = ?
      `, params);

      console.log(`User settings updated for user ${userId}`);
    } catch (error) {
      console.error('Error updating user settings:', error);
      throw error;
    }
  }

  /**
   * Get blocked users
   */
  async getBlockedUsers(userId: number): Promise<BlockedUser[]> {
    const db = await connectionManager.getConnection();

    try {
      const blockedUsers = await db.getAllAsync<any>(`
        SELECT * FROM blocked_users 
        WHERE blocker_id = ?
        ORDER BY created_at DESC
      `, [userId]);

      return blockedUsers.map(user => this.transformBlockedUserFromQuery(user));
    } catch (error) {
      console.error('Error getting blocked users:', error);
      throw error;
    }
  }

  /**
   * Block a user
   */
  async blockUser(blockedUser: BlockedUser): Promise<void> {
    const db = await connectionManager.getConnection();

    try {
      await db.runAsync(`
        INSERT OR REPLACE INTO blocked_users (
          blocker_id, blocked_id, blocked_user_name, blocked_user_age,
          blocked_user_photo_url, reason, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        blockedUser.blocker_id,
        blockedUser.blocked_id,
        blockedUser.blocked_user_name || null,
        blockedUser.blocked_user_age || null,
        blockedUser.blocked_user_photo_url || null,
        blockedUser.reason || null,
        blockedUser.created_at || new Date().toISOString()
      ]);

      console.log(`User ${blockedUser.blocked_id} blocked by user ${blockedUser.blocker_id}`);
    } catch (error) {
      console.error('Error blocking user:', error);
      throw error;
    }
  }

  /**
   * Unblock a user
   */
  async unblockUser(blockerId: number, blockedId: number): Promise<void> {
    const db = await connectionManager.getConnection();

    try {
      await db.runAsync(`
        DELETE FROM blocked_users 
        WHERE blocker_id = ? AND blocked_id = ?
      `, [blockerId, blockedId]);

      console.log(`User ${blockedId} unblocked by user ${blockerId}`);
    } catch (error) {
      console.error('Error unblocking user:', error);
      throw error;
    }
  }

  /**
   * Check if a user is blocked
   */
  async isUserBlocked(blockerId: number, blockedId: number): Promise<boolean> {
    const db = await connectionManager.getConnection();

    try {
      const result = await db.getFirstAsync<any>(`
        SELECT id FROM blocked_users 
        WHERE blocker_id = ? AND blocked_id = ?
      `, [blockerId, blockedId]);

      return !!result;
    } catch (error) {
      console.error('Error checking if user is blocked:', error);
      throw error;
    }
  }

  /**
   * Save user feedback
   */
  async saveUserFeedback(feedback: UserFeedback): Promise<void> {
    const db = await connectionManager.getConnection();

    try {
      await db.runAsync(`
        INSERT INTO user_feedback (
          user_id, email, feedback_text, category, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        feedback.user_id || null,
        feedback.email || null,
        feedback.feedback_text,
        feedback.category || 'general',
        feedback.status || 'pending',
        feedback.created_at || new Date().toISOString(),
        new Date().toISOString()
      ]);

      console.log('User feedback saved');
    } catch (error) {
      console.error('Error saving user feedback:', error);
      throw error;
    }
  }

  /**
   * Get user feedback
   */
  async getUserFeedback(userId?: number): Promise<UserFeedback[]> {
    const db = await connectionManager.getConnection();

    try {
      let query = 'SELECT * FROM user_feedback ORDER BY created_at DESC';
      let params: any[] = [];

      if (userId) {
        query = 'SELECT * FROM user_feedback WHERE user_id = ? ORDER BY created_at DESC';
        params = [userId];
      }

      const feedback = await db.getAllAsync<any>(query, params);
      return feedback.map(f => this.transformUserFeedbackFromQuery(f));
    } catch (error) {
      console.error('Error getting user feedback:', error);
      throw error;
    }
  }

  /**
   * Save user report
   */
  async saveUserReport(report: UserReport): Promise<void> {
    const db = await connectionManager.getConnection();

    try {
      await db.runAsync(`
        INSERT INTO user_reports (
          reporter_id, reported_id, reported_user_name, reason, description,
          evidence_urls, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        report.reporter_id,
        report.reported_id,
        report.reported_user_name || null,
        report.reason,
        report.description || null,
        report.evidence_urls ? JSON.stringify(report.evidence_urls) : null,
        report.status || 'pending',
        report.created_at || new Date().toISOString(),
        new Date().toISOString()
      ]);

      console.log('User report saved');
    } catch (error) {
      console.error('Error saving user report:', error);
      throw error;
    }
  }

  /**
   * Get user reports
   */
  async getUserReports(userId?: number): Promise<UserReport[]> {
    const db = await connectionManager.getConnection();

    try {
      let query = 'SELECT * FROM user_reports ORDER BY created_at DESC';
      let params: any[] = [];

      if (userId) {
        query = 'SELECT * FROM user_reports WHERE reporter_id = ? ORDER BY created_at DESC';
        params = [userId];
      }

      const reports = await db.getAllAsync<any>(query, params);
      return reports.map(r => this.transformUserReportFromQuery(r));
    } catch (error) {
      console.error('Error getting user reports:', error);
      throw error;
    }
  }

  /**
   * Save emergency contact
   */
  async saveEmergencyContact(contact: EmergencyContact): Promise<void> {
    const db = await connectionManager.getConnection();

    try {
      await db.runAsync(`
        INSERT OR REPLACE INTO emergency_contacts (
          user_id, name, phone, relationship, is_primary, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        contact.user_id,
        contact.name,
        contact.phone,
        contact.relationship || null,
        contact.is_primary ? 1 : 0,
        contact.created_at || new Date().toISOString(),
        new Date().toISOString()
      ]);

      console.log('Emergency contact saved');
    } catch (error) {
      console.error('Error saving emergency contact:', error);
      throw error;
    }
  }

  /**
   * Get emergency contacts
   */
  async getEmergencyContacts(userId: number): Promise<EmergencyContact[]> {
    const db = await connectionManager.getConnection();

    try {
      const contacts = await db.getAllAsync<any>(`
        SELECT * FROM emergency_contacts 
        WHERE user_id = ? 
        ORDER BY is_primary DESC, created_at DESC
      `, [userId]);

      return contacts.map(c => this.transformEmergencyContactFromQuery(c));
    } catch (error) {
      console.error('Error getting emergency contacts:', error);
      throw error;
    }
  }

  /**
   * Delete emergency contact
   */
  async deleteEmergencyContact(contactId: number): Promise<void> {
    const db = await connectionManager.getConnection();

    try {
      await db.runAsync(`
        DELETE FROM emergency_contacts WHERE id = ?
      `, [contactId]);

      console.log('Emergency contact deleted');
    } catch (error) {
      console.error('Error deleting emergency contact:', error);
      throw error;
    }
  }

  /**
   * Save data export request
   */
  async saveDataExportRequest(request: DataExportRequest): Promise<void> {
    const db = await connectionManager.getConnection();

    try {
      await db.runAsync(`
        INSERT INTO data_export_requests (
          user_id, status, request_type, export_url, expires_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        request.user_id,
        request.status || 'pending',
        request.request_type || 'full_export',
        request.export_url || null,
        request.expires_at || null,
        request.created_at || new Date().toISOString(),
        new Date().toISOString()
      ]);

      console.log('Data export request saved');
    } catch (error) {
      console.error('Error saving data export request:', error);
      throw error;
    }
  }

  /**
   * Get data export requests
   */
  async getDataExportRequests(userId: number): Promise<DataExportRequest[]> {
    const db = await connectionManager.getConnection();

    try {
      const requests = await db.getAllAsync<any>(`
        SELECT * FROM data_export_requests 
        WHERE user_id = ? 
        ORDER BY created_at DESC
      `, [userId]);

      return requests.map(r => this.transformDataExportRequestFromQuery(r));
    } catch (error) {
      console.error('Error getting data export requests:', error);
      throw error;
    }
  }

  /**
   * Save account deletion request
   */
  async saveAccountDeletionRequest(request: AccountDeletionRequest): Promise<void> {
    const db = await connectionManager.getConnection();

    try {
      await db.runAsync(`
        INSERT INTO account_deletion_requests (
          user_id, reason, scheduled_deletion_date, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [
        request.user_id,
        request.reason || null,
        request.scheduled_deletion_date || null,
        request.status || 'pending',
        request.created_at || new Date().toISOString(),
        new Date().toISOString()
      ]);

      console.log('Account deletion request saved');
    } catch (error) {
      console.error('Error saving account deletion request:', error);
      throw error;
    }
  }

  /**
   * Get account deletion requests
   */
  async getAccountDeletionRequests(userId: number): Promise<AccountDeletionRequest[]> {
    const db = await connectionManager.getConnection();

    try {
      const requests = await db.getAllAsync<any>(`
        SELECT * FROM account_deletion_requests 
        WHERE user_id = ? 
        ORDER BY created_at DESC
      `, [userId]);

      return requests.map(r => this.transformAccountDeletionRequestFromQuery(r));
    } catch (error) {
      console.error('Error getting account deletion requests:', error);
      throw error;
    }
  }

  /**
   * Save password change history
   */
  async savePasswordChangeHistory(history: PasswordChangeHistory): Promise<void> {
    const db = await connectionManager.getConnection();

    try {
      await db.runAsync(`
        INSERT INTO password_change_history (
          user_id, change_type, ip_address, user_agent, created_at
        ) VALUES (?, ?, ?, ?, ?)
      `, [
        history.user_id,
        history.change_type || 'password_change',
        history.ip_address || null,
        history.user_agent || null,
        history.created_at || new Date().toISOString()
      ]);

      console.log('Password change history saved');
    } catch (error) {
      console.error('Error saving password change history:', error);
      throw error;
    }
  }

  /**
   * Get password change history
   */
  async getPasswordChangeHistory(userId: number): Promise<PasswordChangeHistory[]> {
    const db = await connectionManager.getConnection();

    try {
      const history = await db.getAllAsync<any>(`
        SELECT * FROM password_change_history 
        WHERE user_id = ? 
        ORDER BY created_at DESC
      `, [userId]);

      return history.map(h => this.transformPasswordChangeHistoryFromQuery(h));
    } catch (error) {
      console.error('Error getting password change history:', error);
      throw error;
    }
  }

  /**
   * Save email change request
   */
  async saveEmailChangeRequest(request: EmailChangeRequest): Promise<void> {
    const db = await connectionManager.getConnection();

    try {
      await db.runAsync(`
        INSERT INTO email_change_requests (
          user_id, old_email, new_email, verification_token, status, expires_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        request.user_id,
        request.old_email,
        request.new_email,
        request.verification_token || null,
        request.status || 'pending',
        request.expires_at || null,
        request.created_at || new Date().toISOString(),
        new Date().toISOString()
      ]);

      console.log('Email change request saved');
    } catch (error) {
      console.error('Error saving email change request:', error);
      throw error;
    }
  }

  /**
   * Get email change requests
   */
  async getEmailChangeRequests(userId: number): Promise<EmailChangeRequest[]> {
    const db = await connectionManager.getConnection();

    try {
      const requests = await db.getAllAsync<any>(`
        SELECT * FROM email_change_requests 
        WHERE user_id = ? 
        ORDER BY created_at DESC
      `, [userId]);

      return requests.map(r => this.transformEmailChangeRequestFromQuery(r));
    } catch (error) {
      console.error('Error getting email change requests:', error);
      throw error;
    }
  }

  /**
   * Get user verification status
   */
  async getUserVerificationStatus(userId: number): Promise<UserVerificationStatus | null> {
    const db = await connectionManager.getConnection();

    try {
      const status = await db.getFirstAsync<any>(`
        SELECT * FROM user_verification_status 
        WHERE user_id = ?
      `, [userId]);

      if (!status) return null;

      return this.transformUserVerificationStatusFromQuery(status);
    } catch (error) {
      console.error('Error getting user verification status:', error);
      throw error;
    }
  }

  /**
   * Save user verification status
   */
  async saveUserVerificationStatus(status: UserVerificationStatus): Promise<void> {
    const db = await connectionManager.getConnection();

    try {
      await db.runAsync(`
        INSERT OR REPLACE INTO user_verification_status (
          user_id, photo_verification_status, id_verification_status, phone_verification_status,
          social_media_verification_status, photo_verification_date, id_verification_date,
          phone_verification_date, social_media_verification_date, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        status.user_id,
        status.photo_verification_status || 'not_started',
        status.id_verification_status || 'not_started',
        status.phone_verification_status || 'not_started',
        status.social_media_verification_status || 'not_started',
        status.photo_verification_date || null,
        status.id_verification_date || null,
        status.phone_verification_date || null,
        status.social_media_verification_date || null,
        status.created_at || new Date().toISOString(),
        new Date().toISOString()
      ]);

      console.log('User verification status saved');
    } catch (error) {
      console.error('Error saving user verification status:', error);
      throw error;
    }
  }

  /**
   * Save support ticket
   */
  async saveSupportTicket(ticket: SupportTicket): Promise<void> {
    const db = await connectionManager.getConnection();

    try {
      await db.runAsync(`
        INSERT INTO support_tickets (
          user_id, subject, description, category, priority, status, assigned_to, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        ticket.user_id,
        ticket.subject,
        ticket.description,
        ticket.category || 'general',
        ticket.priority || 'medium',
        ticket.status || 'open',
        ticket.assigned_to || null,
        ticket.created_at || new Date().toISOString(),
        new Date().toISOString()
      ]);

      console.log('Support ticket saved');
    } catch (error) {
      console.error('Error saving support ticket:', error);
      throw error;
    }
  }

  /**
   * Get support tickets
   */
  async getSupportTickets(userId: number): Promise<SupportTicket[]> {
    const db = await connectionManager.getConnection();

    try {
      const tickets = await db.getAllAsync<any>(`
        SELECT * FROM support_tickets 
        WHERE user_id = ? 
        ORDER BY created_at DESC
      `, [userId]);

      return tickets.map(t => this.transformSupportTicketFromQuery(t));
    } catch (error) {
      console.error('Error getting support tickets:', error);
      throw error;
    }
  }

  /**
   * Get notification counts
   */
  async getNotificationCounts(userId: number): Promise<NotificationCounts> {
    const db = await connectionManager.getConnection();

    try {
      const counts = await db.getFirstAsync<any>(`
        SELECT * FROM notification_counts 
        WHERE user_id = ?
      `, [userId]);

      if (!counts) {
        // Create default notification counts if they don't exist
        await this.createNotificationCountsRecord(userId);
        return {
          user_id: userId,
          unread_messages_count: 0,
          new_likes_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }

      return this.transformNotificationCountsFromQuery(counts);
    } catch (error) {
      console.error('Error getting notification counts:', error);
      throw error;
    }
  }

  /**
   * Create notification counts record
   */
  async createNotificationCountsRecord(userId: number): Promise<void> {
    const db = await connectionManager.getConnection();

    try {
      await db.runAsync(`
        INSERT OR IGNORE INTO notification_counts (
          user_id, unread_messages_count, new_likes_count, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?)
      `, [
        userId,
        0,
        0,
        new Date().toISOString(),
        new Date().toISOString()
      ]);

      console.log(`Notification counts record created for user ${userId}`);
    } catch (error) {
      console.error('Error creating notification counts record:', error);
      throw error;
    }
  }

  /**
   * Update unread messages count
   */
  async updateUnreadMessagesCount(userId: number, count?: number, increment: boolean = false): Promise<void> {
    const db = await connectionManager.getConnection();

    try {
      if (increment) {
        await db.runAsync(`
          UPDATE notification_counts 
          SET unread_messages_count = unread_messages_count + ?, updated_at = ?
          WHERE user_id = ?
        `, [count || 1, new Date().toISOString(), userId]);
      } else {
        await db.runAsync(`
          UPDATE notification_counts 
          SET unread_messages_count = ?, updated_at = ?
          WHERE user_id = ?
        `, [count || 0, new Date().toISOString(), userId]);
      }

      console.log(`Unread messages count updated for user ${userId}`);
    } catch (error) {
      console.error('Error updating unread messages count:', error);
      throw error;
    }
  }

  /**
   * Update new likes count
   */
  async updateNewLikesCount(userId: number, count?: number, increment: boolean = false): Promise<void> {
    const db = await connectionManager.getConnection();

    try {
      if (increment) {
        await db.runAsync(`
          UPDATE notification_counts 
          SET new_likes_count = new_likes_count + ?, updated_at = ?
          WHERE user_id = ?
        `, [count || 1, new Date().toISOString(), userId]);
      } else {
        await db.runAsync(`
          UPDATE notification_counts 
          SET new_likes_count = ?, updated_at = ?
          WHERE user_id = ?
        `, [count || 0, new Date().toISOString(), userId]);
      }

      console.log(`New likes count updated for user ${userId}`);
    } catch (error) {
      console.error('Error updating new likes count:', error);
      throw error;
    }
  }

  /**
   * Reset notification counts
   */
  async resetNotificationCounts(userId: number): Promise<void> {
    const db = await connectionManager.getConnection();

    try {
      await db.runAsync(`
        UPDATE notification_counts 
        SET unread_messages_count = 0, new_likes_count = 0, updated_at = ?
        WHERE user_id = ?
      `, [new Date().toISOString(), userId]);

      console.log(`Notification counts reset for user ${userId}`);
    } catch (error) {
      console.error('Error resetting notification counts:', error);
      throw error;
    }
  }

  // Transform methods
  private transformUserSettingsFromQuery(raw: any): UserSettings {
    return {
      id: raw.id,
      user_id: raw.user_id,
      two_factor_enabled: raw.two_factor_enabled === 1,
      email_notifications_enabled: raw.email_notifications_enabled === 1,
      marketing_emails_enabled: raw.marketing_emails_enabled === 1,
      notify_matches: raw.notify_matches === 1,
      notify_messages: raw.notify_messages === 1,
      notify_likes: raw.notify_likes === 1,
      notify_super_likes: raw.notify_super_likes === 1,
      notify_visitors: raw.notify_visitors === 1,
      notify_new_features: raw.notify_new_features === 1,
      notify_marketing: raw.notify_marketing === 1,
      push_notifications_enabled: raw.push_notifications_enabled === 1,
      in_app_sounds_enabled: raw.in_app_sounds_enabled === 1,
      vibration_enabled: raw.vibration_enabled === 1,
      quiet_hours_start: raw.quiet_hours_start,
      quiet_hours_end: raw.quiet_hours_end,
      profile_visible: raw.profile_visible === 1,
      profile_visibility_level: raw.profile_visibility_level,
      show_online_status: raw.show_online_status === 1,
      show_distance: raw.show_distance === 1,
      show_age: raw.show_age === 1,
      age_display_type: raw.age_display_type,
      show_last_active: raw.show_last_active === 1,
      allow_messages_from_matches: raw.allow_messages_from_matches === 1,
      allow_messages_from_all: raw.allow_messages_from_all === 1,
      show_read_receipts: raw.show_read_receipts === 1,
      prevent_screenshots: raw.prevent_screenshots === 1,
      hide_from_contacts: raw.hide_from_contacts === 1,
      incognito_mode: raw.incognito_mode === 1,
      show_me_on_discovery: raw.show_me_on_discovery === 1,
      global_mode: raw.global_mode === 1,
      recently_active_only: raw.recently_active_only === 1,
      verified_profiles_only: raw.verified_profiles_only === 1,
      hide_already_seen_profiles: raw.hide_already_seen_profiles === 1,
      smart_photos: raw.smart_photos === 1,
      min_age: raw.min_age,
      max_age: raw.max_age,
      max_distance: raw.max_distance,
      looking_for_preferences: raw.looking_for_preferences ? JSON.parse(raw.looking_for_preferences) : undefined,
      interest_preferences: raw.interest_preferences ? JSON.parse(raw.interest_preferences) : undefined,
      share_analytics_data: raw.share_analytics_data === 1,
      share_location_data: raw.share_location_data === 1,
      personalized_ads_enabled: raw.personalized_ads_enabled === 1,
      data_for_improvements: raw.data_for_improvements === 1,
      share_with_partners: raw.share_with_partners === 1,
      photo_verification_enabled: raw.photo_verification_enabled === 1,
      id_verification_enabled: raw.id_verification_enabled === 1,
      phone_verification_enabled: raw.phone_verification_enabled === 1,
      social_media_verification_enabled: raw.social_media_verification_enabled === 1,
      login_alerts_enabled: raw.login_alerts_enabled === 1,
      block_screenshots: raw.block_screenshots === 1,
      hide_from_facebook: raw.hide_from_facebook === 1,
      created_at: raw.created_at,
      updated_at: raw.updated_at
    };
  }

  private transformBlockedUserFromQuery(raw: any): BlockedUser {
    return {
      id: raw.id,
      blocker_id: raw.blocker_id,
      blocked_id: raw.blocked_id,
      blocked_user_name: raw.blocked_user_name,
      blocked_user_age: raw.blocked_user_age,
      blocked_user_photo_url: raw.blocked_user_photo_url,
      reason: raw.reason,
      created_at: raw.created_at
    };
  }

  private transformUserFeedbackFromQuery(raw: any): UserFeedback {
    return {
      id: raw.id,
      user_id: raw.user_id,
      email: raw.email,
      feedback_text: raw.feedback_text,
      category: raw.category,
      status: raw.status,
      created_at: raw.created_at,
      updated_at: raw.updated_at
    };
  }

  private transformUserReportFromQuery(raw: any): UserReport {
    return {
      id: raw.id,
      reporter_id: raw.reporter_id,
      reported_id: raw.reported_id,
      reported_user_name: raw.reported_user_name,
      reason: raw.reason,
      description: raw.description,
      evidence_urls: raw.evidence_urls ? JSON.parse(raw.evidence_urls) : undefined,
      status: raw.status,
      created_at: raw.created_at,
      updated_at: raw.updated_at
    };
  }

  private transformEmergencyContactFromQuery(raw: any): EmergencyContact {
    return {
      id: raw.id,
      user_id: raw.user_id,
      name: raw.name,
      phone: raw.phone,
      relationship: raw.relationship,
      is_primary: raw.is_primary === 1,
      created_at: raw.created_at,
      updated_at: raw.updated_at
    };
  }

  private transformDataExportRequestFromQuery(raw: any): DataExportRequest {
    return {
      id: raw.id,
      user_id: raw.user_id,
      status: raw.status,
      request_type: raw.request_type,
      export_url: raw.export_url,
      expires_at: raw.expires_at,
      created_at: raw.created_at,
      updated_at: raw.updated_at
    };
  }

  private transformAccountDeletionRequestFromQuery(raw: any): AccountDeletionRequest {
    return {
      id: raw.id,
      user_id: raw.user_id,
      reason: raw.reason,
      scheduled_deletion_date: raw.scheduled_deletion_date,
      status: raw.status,
      created_at: raw.created_at,
      updated_at: raw.updated_at
    };
  }

  private transformPasswordChangeHistoryFromQuery(raw: any): PasswordChangeHistory {
    return {
      id: raw.id,
      user_id: raw.user_id,
      change_type: raw.change_type,
      ip_address: raw.ip_address,
      user_agent: raw.user_agent,
      created_at: raw.created_at
    };
  }

  private transformEmailChangeRequestFromQuery(raw: any): EmailChangeRequest {
    return {
      id: raw.id,
      user_id: raw.user_id,
      old_email: raw.old_email,
      new_email: raw.new_email,
      verification_token: raw.verification_token,
      status: raw.status,
      expires_at: raw.expires_at,
      created_at: raw.created_at,
      updated_at: raw.updated_at
    };
  }

  private transformUserVerificationStatusFromQuery(raw: any): UserVerificationStatus {
    return {
      id: raw.id,
      user_id: raw.user_id,
      photo_verification_status: raw.photo_verification_status,
      id_verification_status: raw.id_verification_status,
      phone_verification_status: raw.phone_verification_status,
      social_media_verification_status: raw.social_media_verification_status,
      photo_verification_date: raw.photo_verification_date,
      id_verification_date: raw.id_verification_date,
      phone_verification_date: raw.phone_verification_date,
      social_media_verification_date: raw.social_media_verification_date,
      created_at: raw.created_at,
      updated_at: raw.updated_at
    };
  }

  private transformSupportTicketFromQuery(raw: any): SupportTicket {
    return {
      id: raw.id,
      user_id: raw.user_id,
      subject: raw.subject,
      description: raw.description,
      category: raw.category,
      priority: raw.priority,
      status: raw.status,
      assigned_to: raw.assigned_to,
      created_at: raw.created_at,
      updated_at: raw.updated_at
    };
  }

  private transformNotificationCountsFromQuery(raw: any): NotificationCounts {
    return {
      id: raw.id,
      user_id: raw.user_id,
      unread_messages_count: raw.unread_messages_count,
      new_likes_count: raw.new_likes_count,
      created_at: raw.created_at,
      updated_at: raw.updated_at
    };
  }
}

// Export a singleton instance
export const settingsRepository = new SettingsRepository(); 