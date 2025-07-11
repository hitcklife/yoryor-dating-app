import * as SQLite from 'expo-sqlite';
import { Chat, Message, OtherUser, Profile, ProfilePhoto, UserPivot } from './chats-service';
import * as FileSystem from 'expo-file-system';

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
  looking_for_preferences?: string[]; // JSON array
  interest_preferences?: string[]; // JSON array
  
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

/**
 * SQLite Database Service for chat data
 * This service provides methods for storing and retrieving chat data locally
 */
class SQLiteService {
  private db: SQLite.SQLiteDatabase | null = null;
  private dbVersion = 4; // Updated to version 4 to include all settings tables
  private isInitialized: boolean = false;
  private lastError: Error | null = null;

  constructor() {
    this.initDatabase()
      .then(() => {
        this.isInitialized = true;
        console.log('SQLite service initialized successfully');
      })
      .catch(error => {
        this.lastError = error;
        console.error('Error initializing SQLite service:', error);
      });
  }

  /**
   * Initialize the database connection and create tables
   */
  private async initDatabase(): Promise<void> {
    try {
      console.log('Initializing SQLite database...');
      
      // Open the database
      this.db = await SQLite.openDatabaseAsync('yoryor_chats.db');
      console.log('Database opened successfully');

      // Check database version and migrate if needed
      const versionInfo = await this.checkDatabaseVersion();
      console.log('Database version info:', versionInfo);

      if (!versionInfo.exists) {
        console.log('Database is new, creating tables...');
        await this.createTables();
        await this.createVersionTable();
        console.log('New database setup completed');
      } else if (versionInfo.version < this.dbVersion) {
        console.log(`Database needs migration from version ${versionInfo.version} to ${this.dbVersion}`);
        await this.migrateDatabase(versionInfo.version, this.dbVersion);
        console.log('Database migration completed');
      }

      console.log('Database initialization completed');
    } catch (error) {
      console.error('Error initializing database:', error);
      
      // If there's an error during initialization, try to reset the database
      console.log('Attempting database reset due to initialization error...');
      try {
        await this.resetDatabase();
      } catch (resetError) {
        console.error('Error resetting database:', resetError);
        this.lastError = resetError instanceof Error ? resetError : new Error('Database reset failed');
        throw resetError;
      }
    }
  }

  /**
   * Create all necessary tables
   */
  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      // Create tables using withTransactionAsync for better performance
      await this.db.withTransactionAsync(async () => {
        // Chats table
        await this.db!.execAsync(`
          CREATE TABLE IF NOT EXISTS chats (
            id INTEGER PRIMARY KEY,
            type TEXT,
            name TEXT,
            description TEXT,
            last_activity_at TEXT,
            is_active INTEGER,
            created_at TEXT,
            updated_at TEXT,
            deleted_at TEXT,
            unread_count INTEGER,
            pivot_chat_id INTEGER,
            pivot_user_id INTEGER,
            pivot_is_muted INTEGER,
            pivot_last_read_at TEXT,
            pivot_joined_at TEXT,
            pivot_left_at TEXT,
            pivot_role TEXT,
            pivot_created_at TEXT,
            pivot_updated_at TEXT
          )
        `);

        // Other users table
        await this.db!.execAsync(`
          CREATE TABLE IF NOT EXISTS other_users (
            id INTEGER PRIMARY KEY,
            chat_id INTEGER,
            email TEXT,
            phone TEXT,
            google_id TEXT,
            facebook_id TEXT,
            email_verified_at TEXT,
            phone_verified_at TEXT,
            disabled_at TEXT,
            registration_completed INTEGER,
            is_admin INTEGER,
            is_private INTEGER,
            profile_photo_path TEXT,
            last_active_at TEXT,
            deleted_at TEXT,
            created_at TEXT,
            updated_at TEXT,
            two_factor_enabled INTEGER,
            last_login_at TEXT,
            FOREIGN KEY (chat_id) REFERENCES chats (id) ON DELETE CASCADE
          )
        `);

        // Profiles table
        await this.db!.execAsync(`
          CREATE TABLE IF NOT EXISTS profiles (
            id INTEGER PRIMARY KEY,
            user_id INTEGER,
            first_name TEXT,
            last_name TEXT,
            gender TEXT,
            date_of_birth TEXT,
            age INTEGER,
            city TEXT,
            state TEXT,
            province TEXT,
            country_id INTEGER,
            latitude REAL,
            longitude REAL,
            bio TEXT,
            interests TEXT,
            looking_for TEXT,
            profile_views INTEGER,
            profile_completed_at TEXT,
            status TEXT,
            occupation TEXT,
            profession TEXT,
            country_code TEXT,
            created_at TEXT,
            updated_at TEXT,
            FOREIGN KEY (user_id) REFERENCES other_users (id) ON DELETE CASCADE
          )
        `);

        // Profile photos table
        await this.db!.execAsync(`
          CREATE TABLE IF NOT EXISTS profile_photos (
            id INTEGER PRIMARY KEY,
            user_id INTEGER,
            original_url TEXT,
            thumbnail_url TEXT,
            medium_url TEXT,
            is_profile_photo INTEGER,
            order_num INTEGER,
            is_private INTEGER,
            is_verified INTEGER,
            status TEXT,
            rejection_reason TEXT,
            metadata TEXT,
            uploaded_at TEXT,
            deleted_at TEXT,
            created_at TEXT,
            updated_at TEXT,
            FOREIGN KEY (user_id) REFERENCES other_users (id) ON DELETE CASCADE
          )
        `);

        // Messages table
        await this.db!.execAsync(`
          CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY,
            chat_id INTEGER,
            sender_id INTEGER,
            reply_to_message_id INTEGER,
            content TEXT,
            message_type TEXT,
            media_data TEXT,
            media_url TEXT,
            thumbnail_url TEXT,
            status TEXT,
            is_edited INTEGER,
            edited_at TEXT,
            sent_at TEXT,
            deleted_at TEXT,
            created_at TEXT,
            updated_at TEXT,
            is_mine INTEGER,
            sender_email TEXT,
            is_read INTEGER,
            read_at TEXT,
            FOREIGN KEY (chat_id) REFERENCES chats (id) ON DELETE CASCADE,
            FOREIGN KEY (reply_to_message_id) REFERENCES messages (id)
          )
        `);

        // Notification counts table
        await this.db!.execAsync(`
          CREATE TABLE IF NOT EXISTS notification_counts (
            id INTEGER PRIMARY KEY,
            user_id INTEGER,
            unread_messages_count INTEGER DEFAULT 0,
            new_likes_count INTEGER DEFAULT 0,
            created_at TEXT,
            updated_at TEXT
          )
        `);

        // User settings table - Main settings for all user preferences
        await this.db!.execAsync(`
          CREATE TABLE IF NOT EXISTS user_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            
            -- Account Management
            two_factor_enabled INTEGER DEFAULT 0,
            email_notifications_enabled INTEGER DEFAULT 1,
            marketing_emails_enabled INTEGER DEFAULT 0,
            
            -- Notification Settings
            notify_matches INTEGER DEFAULT 1,
            notify_messages INTEGER DEFAULT 1,
            notify_likes INTEGER DEFAULT 1,
            notify_super_likes INTEGER DEFAULT 1,
            notify_visitors INTEGER DEFAULT 0,
            notify_new_features INTEGER DEFAULT 1,
            notify_marketing INTEGER DEFAULT 0,
            push_notifications_enabled INTEGER DEFAULT 1,
            in_app_sounds_enabled INTEGER DEFAULT 1,
            vibration_enabled INTEGER DEFAULT 1,
            quiet_hours_start TEXT,
            quiet_hours_end TEXT,
            
            -- Privacy Settings
            profile_visible INTEGER DEFAULT 1,
            profile_visibility_level TEXT DEFAULT 'everyone',
            show_online_status INTEGER DEFAULT 1,
            show_distance INTEGER DEFAULT 1,
            show_age INTEGER DEFAULT 1,
            age_display_type TEXT DEFAULT 'exact',
            show_last_active INTEGER DEFAULT 0,
            allow_messages_from_matches INTEGER DEFAULT 1,
            allow_messages_from_all INTEGER DEFAULT 0,
            show_read_receipts INTEGER DEFAULT 1,
            prevent_screenshots INTEGER DEFAULT 0,
            hide_from_contacts INTEGER DEFAULT 0,
            incognito_mode INTEGER DEFAULT 0,
            
            -- Discovery Settings
            show_me_on_discovery INTEGER DEFAULT 1,
            global_mode INTEGER DEFAULT 0,
            recently_active_only INTEGER DEFAULT 1,
            verified_profiles_only INTEGER DEFAULT 0,
            hide_already_seen_profiles INTEGER DEFAULT 1,
            smart_photos INTEGER DEFAULT 1,
            min_age INTEGER DEFAULT 18,
            max_age INTEGER DEFAULT 35,
            max_distance INTEGER DEFAULT 25,
            looking_for_preferences TEXT,
            interest_preferences TEXT,
            
            -- Data Privacy Settings
            share_analytics_data INTEGER DEFAULT 1,
            share_location_data INTEGER DEFAULT 1,
            personalized_ads_enabled INTEGER DEFAULT 1,
            data_for_improvements INTEGER DEFAULT 1,
            share_with_partners INTEGER DEFAULT 0,
            
            -- Security Settings
            photo_verification_enabled INTEGER DEFAULT 0,
            id_verification_enabled INTEGER DEFAULT 0,
            phone_verification_enabled INTEGER DEFAULT 1,
            social_media_verification_enabled INTEGER DEFAULT 0,
            login_alerts_enabled INTEGER DEFAULT 1,
            block_screenshots INTEGER DEFAULT 0,
            hide_from_facebook INTEGER DEFAULT 1,
            
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            
            UNIQUE(user_id)
          )
        `);

        // Blocked users table
        await this.db!.execAsync(`
          CREATE TABLE IF NOT EXISTS blocked_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            blocker_id INTEGER NOT NULL,
            blocked_id INTEGER NOT NULL,
            blocked_user_name TEXT,
            blocked_user_age INTEGER,
            blocked_user_photo_url TEXT,
            reason TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            
            UNIQUE(blocker_id, blocked_id)
          )
        `);

        // User feedback table
        await this.db!.execAsync(`
          CREATE TABLE IF NOT EXISTS user_feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            email TEXT,
            feedback_text TEXT NOT NULL,
            category TEXT DEFAULT 'general',
            status TEXT DEFAULT 'pending',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // User reports table
        await this.db!.execAsync(`
          CREATE TABLE IF NOT EXISTS user_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            reporter_id INTEGER NOT NULL,
            reported_id INTEGER NOT NULL,
            reported_user_name TEXT,
            reason TEXT NOT NULL,
            description TEXT,
            evidence_urls TEXT,
            status TEXT DEFAULT 'pending',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Emergency contacts table
        await this.db!.execAsync(`
          CREATE TABLE IF NOT EXISTS emergency_contacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            phone TEXT NOT NULL,
            relationship TEXT,
            is_primary INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Data export requests table
        await this.db!.execAsync(`
          CREATE TABLE IF NOT EXISTS data_export_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            status TEXT DEFAULT 'pending',
            request_type TEXT DEFAULT 'full_export',
            export_url TEXT,
            expires_at TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Account deletion requests table
        await this.db!.execAsync(`
          CREATE TABLE IF NOT EXISTS account_deletion_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            reason TEXT,
            scheduled_deletion_date TEXT,
            status TEXT DEFAULT 'pending',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Password change history table
        await this.db!.execAsync(`
          CREATE TABLE IF NOT EXISTS password_change_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            change_type TEXT DEFAULT 'password_change',
            ip_address TEXT,
            user_agent TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Email change requests table
        await this.db!.execAsync(`
          CREATE TABLE IF NOT EXISTS email_change_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            old_email TEXT NOT NULL,
            new_email TEXT NOT NULL,
            verification_token TEXT,
            status TEXT DEFAULT 'pending',
            expires_at TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // User verification status table
        await this.db!.execAsync(`
          CREATE TABLE IF NOT EXISTS user_verification_status (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            photo_verification_status TEXT DEFAULT 'not_started',
            id_verification_status TEXT DEFAULT 'not_started',
            phone_verification_status TEXT DEFAULT 'not_started',
            social_media_verification_status TEXT DEFAULT 'not_started',
            photo_verification_date TEXT,
            id_verification_date TEXT,
            phone_verification_date TEXT,
            social_media_verification_date TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            
            UNIQUE(user_id)
          )
        `);

        // Support tickets table
        await this.db!.execAsync(`
          CREATE TABLE IF NOT EXISTS support_tickets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            subject TEXT NOT NULL,
            description TEXT NOT NULL,
            category TEXT DEFAULT 'general',
            priority TEXT DEFAULT 'medium',
            status TEXT DEFAULT 'open',
            assigned_to TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Create indexes for better query performance
        await this.createIndexes();

        console.log('All tables created successfully');
      });
    } catch (error) {
      console.error('Error creating tables:', error);
      throw error;
    }
  }

  /**
   * Create database indexes for optimal performance
   */
  private async createIndexes(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      console.log('Creating database indexes...');
      
      // Chat indexes for faster lookups
      await this.db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_chats_last_activity ON chats (last_activity_at DESC);
        CREATE INDEX IF NOT EXISTS idx_chats_deleted ON chats (deleted_at);
        CREATE INDEX IF NOT EXISTS idx_chats_type ON chats (type);
      `);
      
      // Message indexes for optimized queries
      await this.db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages (chat_id);
        CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON messages (sent_at DESC);
        CREATE INDEX IF NOT EXISTS idx_messages_chat_sent ON messages (chat_id, sent_at DESC);
        CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages (sender_id);
        CREATE INDEX IF NOT EXISTS idx_messages_deleted ON messages (deleted_at);
        CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages (is_read);
        CREATE INDEX IF NOT EXISTS idx_messages_status ON messages (status);
      `);
      
      // Other_users indexes
      await this.db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_other_users_chat_id ON other_users (chat_id);
      `);
      
      // Profile indexes
      await this.db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles (user_id);
      `);
      
      // Profile photos indexes
      await this.db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_profile_photos_user_id ON profile_photos (user_id);
        CREATE INDEX IF NOT EXISTS idx_profile_photos_is_profile ON profile_photos (is_profile_photo);
      `);
      
      // Notification counts indexes
      await this.db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_notification_counts_user_id ON notification_counts (user_id);
      `);
      
      // Settings tables indexes
      await this.db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings (user_id);
        CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker_id ON blocked_users (blocker_id);
        CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked_id ON blocked_users (blocked_id);
        CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON user_feedback (user_id);
        CREATE INDEX IF NOT EXISTS idx_user_feedback_status ON user_feedback (status);
        CREATE INDEX IF NOT EXISTS idx_user_reports_reporter_id ON user_reports (reporter_id);
        CREATE INDEX IF NOT EXISTS idx_user_reports_reported_id ON user_reports (reported_id);
        CREATE INDEX IF NOT EXISTS idx_user_reports_status ON user_reports (status);
        CREATE INDEX IF NOT EXISTS idx_emergency_contacts_user_id ON emergency_contacts (user_id);
        CREATE INDEX IF NOT EXISTS idx_data_export_requests_user_id ON data_export_requests (user_id);
        CREATE INDEX IF NOT EXISTS idx_data_export_requests_status ON data_export_requests (status);
        CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_user_id ON account_deletion_requests (user_id);
        CREATE INDEX IF NOT EXISTS idx_password_change_history_user_id ON password_change_history (user_id);
        CREATE INDEX IF NOT EXISTS idx_email_change_requests_user_id ON email_change_requests (user_id);
        CREATE INDEX IF NOT EXISTS idx_user_verification_status_user_id ON user_verification_status (user_id);
        CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets (user_id);
        CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets (status);
      `);
      
      // Composite indexes for complex queries
      await this.db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_messages_composite ON messages (chat_id, deleted_at, sent_at DESC);
        CREATE INDEX IF NOT EXISTS idx_chats_composite ON chats (deleted_at, last_activity_at DESC);
      `);
      
      console.log('Database indexes created successfully');
    } catch (error) {
      console.error('Error creating indexes:', error);
      throw error;
    }
  }

  /**
   * Check if the database version table exists and get the current version
   */
  private async checkDatabaseVersion(): Promise<{ exists: boolean; version: number }> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const versionResult = await this.db.getFirstAsync<{ version: number }>(`
        SELECT version FROM database_version LIMIT 1
      `);

      return { exists: true, version: versionResult?.version || 1 };
    } catch (error) {
      // Table doesn't exist
      return { exists: false, version: 1 };
    }
  }

  /**
   * Store chat details (chat + messages) to the local database
   * @param chat The chat to store
   * @param messages The messages to store
   */
  async storeChatDetails(chat: Chat, messages: Message[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.withTransactionAsync(async () => {
        // Save the chat
        await this.db!.runAsync(`
          INSERT OR REPLACE INTO chats (
            id, type, name, description, last_activity_at, is_active, 
            created_at, updated_at, deleted_at, unread_count,
            pivot_chat_id, pivot_user_id, pivot_is_muted, pivot_last_read_at,
            pivot_joined_at, pivot_left_at, pivot_role, pivot_created_at, pivot_updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          chat.id,
          chat.type,
          chat.name,
          chat.description,
          chat.last_activity_at,
          chat.is_active ? 1 : 0,
          chat.created_at,
          chat.updated_at,
          chat.deleted_at,
          chat.unread_count || 0,
          chat.other_user?.pivot?.chat_id || chat.id,
          chat.other_user?.pivot?.user_id || 0,
          chat.other_user?.pivot?.is_muted ? 1 : 0,
          chat.other_user?.pivot?.last_read_at || null,
          chat.other_user?.pivot?.joined_at || chat.created_at,
          chat.other_user?.pivot?.left_at || null,
          chat.other_user?.pivot?.role || 'member',
          chat.other_user?.pivot?.created_at || chat.created_at,
          chat.other_user?.pivot?.updated_at || chat.updated_at
        ]);

        // Save other user if exists
        if (chat.other_user) {
          const user = chat.other_user;
          
          // Save user
          await this.db!.runAsync(`
            INSERT OR REPLACE INTO other_users (
              id, chat_id, email, phone, google_id, facebook_id,
              email_verified_at, phone_verified_at, disabled_at,
              registration_completed, is_admin, is_private, profile_photo_path,
              last_active_at, deleted_at, created_at, updated_at,
              two_factor_enabled, last_login_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            user.id,
            chat.id,
            user.email,
            user.phone,
            user.google_id,
            user.facebook_id,
            user.email_verified_at,
            user.phone_verified_at,
            user.disabled_at,
            user.registration_completed ? 1 : 0,
            user.is_admin ? 1 : 0,
            user.is_private ? 1 : 0,
            user.profile_photo_path,
            user.last_active_at,
            user.deleted_at,
            user.created_at,
            user.updated_at,
            user.two_factor_enabled ? 1 : 0,
            user.last_login_at
          ]);

          // Save profile if exists
          if (user.profile) {
            const profile = user.profile;
            await this.db!.runAsync(`
              INSERT OR REPLACE INTO profiles (
                id, user_id, first_name, last_name, gender, date_of_birth,
                age, city, state, province, country_id, latitude, longitude,
                bio, interests, looking_for, profile_views, profile_completed_at,
                status, occupation, profession, country_code, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              profile.id,
              user.id,
              profile.first_name,
              profile.last_name,
              profile.gender,
              profile.date_of_birth,
              profile.age,
              profile.city,
              profile.state,
              profile.province,
              profile.country_id,
              profile.latitude,
              profile.longitude,
              profile.bio,
              JSON.stringify(profile.interests),
              profile.looking_for,
              profile.profile_views,
              profile.profile_completed_at,
              profile.status,
              profile.occupation,
              profile.profession,
              profile.country_code,
              profile.created_at,
              profile.updated_at
            ]);
          }

          // Save profile photo if exists
          if (user.profile_photo) {
            const photo = user.profile_photo;
            await this.db!.runAsync(`
              INSERT OR REPLACE INTO profile_photos (
                id, user_id, original_url, thumbnail_url, medium_url,
                is_profile_photo, order_num, is_private, is_verified,
                status, rejection_reason, metadata, uploaded_at,
                deleted_at, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              photo.id,
              user.id,
              photo.original_url,
              photo.thumbnail_url,
              photo.medium_url,
              photo.is_profile_photo ? 1 : 0,
              photo.order,
              photo.is_private ? 1 : 0,
              photo.is_verified ? 1 : 0,
              photo.status,
              photo.rejection_reason,
              photo.metadata ? JSON.stringify(photo.metadata) : null,
              photo.uploaded_at,
              photo.deleted_at,
              photo.created_at,
              photo.updated_at
            ]);
          }
        }

        // Save all messages
        for (const message of messages) {
          await this.db!.runAsync(`
            INSERT OR REPLACE INTO messages (
              id, chat_id, sender_id, reply_to_message_id, content,
              message_type, media_data, media_url, thumbnail_url,
              status, is_edited, edited_at, sent_at, deleted_at,
              created_at, updated_at, is_mine, sender_email, is_read, read_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            message.id,
            message.chat_id,
            message.sender_id,
            message.reply_to_message_id,
            message.content,
            message.message_type,
            message.media_data ? JSON.stringify(message.media_data) : null,
            message.media_url,
            message.thumbnail_url,
            message.status,
            message.is_edited ? 1 : 0,
            message.edited_at,
            message.sent_at,
            message.deleted_at,
            message.created_at,
            message.updated_at,
            message.is_mine ? 1 : 0,
            message.sender?.email || null,
            message.is_read ? 1 : 0,
            message.read_at || null
          ]);
        }
      });
      console.log(`Chat details for chat ${chat.id} stored successfully`);
    } catch (error) {
      console.error('Error storing chat details:', error);
      throw error;
    }
  }

  /**
   * Get messages by chat ID ordered by newest first (for inverted FlatList)
   * @param chatId The chat ID to get messages for
   * @param limit Maximum number of messages to retrieve
   * @returns Array of messages
   */
  async getMessagesByChatId(chatId: number, limit: number = 50): Promise<Message[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const messages = await this.db.getAllAsync<any>(`
        SELECT * FROM messages 
        WHERE chat_id = ? AND deleted_at IS NULL 
        ORDER BY sent_at DESC
        LIMIT ?
      `, [chatId, limit]);

      return messages.map(msg => ({
        id: msg.id,
        chat_id: msg.chat_id,
        sender_id: msg.sender_id,
        reply_to_message_id: msg.reply_to_message_id,
        content: msg.content,
        message_type: msg.message_type,
        media_data: msg.media_data ? JSON.parse(msg.media_data) : null,
        media_url: msg.media_url,
        thumbnail_url: msg.thumbnail_url,
        status: msg.status,
        is_edited: msg.is_edited === 1,
        edited_at: msg.edited_at,
        sent_at: msg.sent_at,
        deleted_at: msg.deleted_at,
        created_at: msg.created_at,
        updated_at: msg.updated_at,
        is_mine: msg.is_mine === 1,
        is_read: msg.is_read === 1,
        read_at: msg.read_at,
        sender: msg.sender_email ? {
          id: msg.sender_id,
          email: msg.sender_email
        } : undefined
      }));
    } catch (error) {
      console.error('Error getting messages by chat ID:', error);
      throw error;
    }
  }

  /**
   * Store multiple chats in the database
   * @param chats Array of chats to store
   */
  async storeChats(chats: Chat[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      console.log(`Starting to store ${chats.length} chats in SQLite...`);
      
      // Use a single transaction for all operations
      await this.db.withTransactionAsync(async () => {
        for (const chat of chats) {
          try {
            // Save chat
            await this.db!.runAsync(`
              INSERT OR REPLACE INTO chats (
                id, type, name, description, last_activity_at, is_active, 
                created_at, updated_at, deleted_at, unread_count,
                pivot_chat_id, pivot_user_id, pivot_is_muted, pivot_last_read_at,
                pivot_joined_at, pivot_left_at, pivot_role, pivot_created_at, pivot_updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              chat.id,
              chat.type,
              chat.name,
              chat.description,
              chat.last_activity_at,
              chat.is_active ? 1 : 0,
              chat.created_at,
              chat.updated_at,
              chat.deleted_at,
              chat.unread_count,
              chat.pivot.chat_id,
              chat.pivot.user_id,
              chat.pivot.is_muted ? 1 : 0,
              chat.pivot.last_read_at,
              chat.pivot.joined_at,
              chat.pivot.left_at,
              chat.pivot.role,
              chat.pivot.created_at,
              chat.pivot.updated_at
            ]);

            // Save other user if exists (without the pivot data which is for the other user)
            if (chat.other_user) {
              const user = chat.other_user;
              
              // Save user (excluding the pivot data which is for the other user's relationship)
              await this.db!.runAsync(`
                INSERT OR REPLACE INTO other_users (
                  id, chat_id, email, phone, google_id, facebook_id,
                  email_verified_at, phone_verified_at, disabled_at,
                  registration_completed, is_admin, is_private, profile_photo_path,
                  last_active_at, deleted_at, created_at, updated_at,
                  two_factor_enabled, last_login_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `, [
                user.id,
                chat.id,
                user.email,
                user.phone,
                user.google_id,
                user.facebook_id,
                user.email_verified_at,
                user.phone_verified_at,
                user.disabled_at,
                user.registration_completed ? 1 : 0,
                user.is_admin ? 1 : 0,
                user.is_private ? 1 : 0,
                user.profile_photo_path,
                user.last_active_at,
                user.deleted_at,
                user.created_at,
                user.updated_at,
                user.two_factor_enabled ? 1 : 0,
                user.last_login_at
              ]);

              // Save profile if exists
              if (user.profile) {
                const profile = user.profile;
                await this.db!.runAsync(`
                  INSERT OR REPLACE INTO profiles (
                    id, user_id, first_name, last_name, gender, date_of_birth,
                    age, city, state, province, country_id, latitude, longitude,
                    bio, interests, looking_for, profile_views, profile_completed_at,
                    status, occupation, profession, country_code, created_at, updated_at
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                  profile.id,
                  user.id,
                  profile.first_name || '',
                  profile.last_name || '',
                  profile.gender || '',
                  profile.date_of_birth || '',
                  profile.age || 0,
                  profile.city || '',
                  profile.state || '',
                  profile.province || '',
                  profile.country_id || 0,
                  profile.latitude || 0,
                  profile.longitude || 0,
                  profile.bio || '',
                  JSON.stringify(profile.interests || []),
                  profile.looking_for || '',
                  profile.profile_views || 0,
                  profile.profile_completed_at || '',
                  profile.status || '',
                  profile.occupation || '',
                  profile.profession || '',
                  profile.country_code || '',
                  profile.created_at || '',
                  profile.updated_at || ''
                ]);
              }

              // Save profile photo if exists
              if (user.profile_photo) {
                const photo = user.profile_photo;
                await this.db!.runAsync(`
                  INSERT OR REPLACE INTO profile_photos (
                    id, user_id, original_url, thumbnail_url, medium_url,
                    is_profile_photo, order_num, is_private, is_verified,
                    status, rejection_reason, metadata, uploaded_at,
                    deleted_at, created_at, updated_at
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                  photo.id,
                  user.id,
                  photo.original_url,
                  photo.thumbnail_url,
                  photo.medium_url,
                  photo.is_profile_photo ? 1 : 0,
                  photo.order || 0,
                  photo.is_private ? 1 : 0,
                  photo.is_verified ? 1 : 0,
                  photo.status || 'active',
                  photo.rejection_reason || null,
                  photo.metadata ? JSON.stringify(photo.metadata) : null,
                  photo.uploaded_at || '',
                  photo.deleted_at || null,
                  photo.created_at || '',
                  photo.updated_at || ''
                ]);
              }
            }

            // Save last message if exists
            if (chat.last_message) {
              const message = chat.last_message;
              await this.db!.runAsync(`
                INSERT OR REPLACE INTO messages (
                  id, chat_id, sender_id, reply_to_message_id, content,
                  message_type, media_data, media_url, thumbnail_url,
                  status, is_edited, edited_at, sent_at, deleted_at,
                  created_at, updated_at, is_mine, sender_email, is_read, read_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `, [
                message.id,
                message.chat_id,
                message.sender_id,
                message.reply_to_message_id,
                message.content,
                message.message_type,
                message.media_data ? JSON.stringify(message.media_data) : null,
                message.media_url,
                message.thumbnail_url,
                message.status,
                message.is_edited ? 1 : 0,
                message.edited_at,
                message.sent_at,
                message.deleted_at,
                message.created_at,
                message.updated_at,
                message.is_mine ? 1 : 0,
                message.sender?.email || null,
                message.is_read ? 1 : 0,
                message.read_at || null
              ]);
            }
          } catch (chatError) {
            console.error(`Error storing chat ${chat.id}:`, chatError);
            // Continue with other chats instead of failing the entire transaction
          }
        }
      });
      console.log(`${chats.length} chats stored successfully`);
    } catch (error) {
      console.error('Error storing chats:', error);
      // Don't throw the error, just log it to prevent app crashes
      // The API data is still valid even if local storage fails
    }
  }

  /**
   * Create the version table
   */
  private async createVersionTable(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS database_version (
        version INTEGER PRIMARY KEY
      )
    `);

    await this.db.runAsync('INSERT INTO database_version (version) VALUES (?)', [this.dbVersion]);
  }

  /**
   * Migrate the database from one version to another
   */
  private async migrateDatabase(fromVersion: number, toVersion: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    console.log(`Migrating database from version ${fromVersion} to ${toVersion}`);

    try {
      // Migration from version 1 to 2: Add read status columns to messages table
      if (fromVersion < 2 && toVersion >= 2) {
        console.log('Adding read status columns to messages table...');
        
        // Check if columns already exist to avoid errors
        const tableInfo = await this.db.getAllAsync<any>(`
          PRAGMA table_info(messages)
        `);
        
        const hasIsRead = tableInfo.some((col: any) => col.name === 'is_read');
        const hasReadAt = tableInfo.some((col: any) => col.name === 'read_at');
        
        if (!hasIsRead) {
          await this.db.execAsync(`
            ALTER TABLE messages ADD COLUMN is_read INTEGER DEFAULT 0
          `);
          console.log('Added is_read column to messages table');
        }
        
        if (!hasReadAt) {
          await this.db.execAsync(`
            ALTER TABLE messages ADD COLUMN read_at TEXT
          `);
          console.log('Added read_at column to messages table');
        }
      }

      // Migration from version 2 to 3: Add notification_counts table
      if (fromVersion < 3 && toVersion >= 3) {
        console.log('Adding notification_counts table...');
        
        // Check if table already exists
        const tableExists = await this.db.getFirstAsync<any>(`
          SELECT name FROM sqlite_master WHERE type='table' AND name='notification_counts'
        `);
        
        if (!tableExists) {
          await this.db.execAsync(`
            CREATE TABLE notification_counts (
              id INTEGER PRIMARY KEY,
              user_id INTEGER,
              unread_messages_count INTEGER DEFAULT 0,
              new_likes_count INTEGER DEFAULT 0,
              created_at TEXT,
              updated_at TEXT
            )
          `);
          
          // Create index for notification_counts
          await this.db.execAsync(`
            CREATE INDEX idx_notification_counts_user_id ON notification_counts (user_id)
          `);
          
          console.log('Added notification_counts table and index');
        }
      }

      // Update the version
      await this.db.runAsync('UPDATE database_version SET version = ?', [toVersion]);
      console.log(`Database migrated successfully to version ${toVersion}`);
    } catch (error) {
      console.error('Error during database migration:', error);
      throw error;
    }
  }

  /**
   * Save a chat to the local database
   * @param chat The chat to save
   */
  async saveChat(chat: Chat): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      // Insert or update chat
      await this.db.runAsync(`
        INSERT OR REPLACE INTO chats (
          id, type, name, description, last_activity_at, is_active, 
          created_at, updated_at, deleted_at, unread_count,
          pivot_chat_id, pivot_user_id, pivot_is_muted, pivot_last_read_at,
          pivot_joined_at, pivot_left_at, pivot_role, pivot_created_at, pivot_updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        chat.id,
        chat.type,
        chat.name,
        chat.description,
        chat.last_activity_at,
        chat.is_active ? 1 : 0,
        chat.created_at,
        chat.updated_at,
        chat.deleted_at,
        chat.unread_count,
        chat.pivot.chat_id,
        chat.pivot.user_id,
        chat.pivot.is_muted ? 1 : 0,
        chat.pivot.last_read_at,
        chat.pivot.joined_at,
        chat.pivot.left_at,
        chat.pivot.role,
        chat.pivot.created_at,
        chat.pivot.updated_at
      ]);

      console.log(`Chat ${chat.id} saved successfully`);

      // Save other user
      if (chat.other_user) {
        await this.saveOtherUser(chat.id, chat.other_user);
      }

      // Save last message if exists
      if (chat.last_message) {
        await this.saveMessage(chat.last_message);
      }
    } catch (error) {
      console.error('Error saving chat:', error);
      throw error;
    }
  }

  /**
   * Save an other user to the local database
   * @param chatId The chat ID this user belongs to
   * @param user The user to save
   */
  private async saveOtherUser(chatId: number, user: OtherUser): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(`
      INSERT OR REPLACE INTO other_users (
        id, chat_id, email, phone, google_id, facebook_id, email_verified_at,
        phone_verified_at, disabled_at, registration_completed, is_admin,
        is_private, profile_photo_path, last_active_at, deleted_at,
        created_at, updated_at, two_factor_enabled, last_login_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      user.id,
      chatId,
      user.email,
      user.phone,
      user.google_id,
      user.facebook_id,
      user.email_verified_at,
      user.phone_verified_at,
      user.disabled_at,
      user.registration_completed ? 1 : 0,
      user.is_admin ? 1 : 0,
      user.is_private ? 1 : 0,
      user.profile_photo_path,
      user.last_active_at,
      user.deleted_at,
      user.created_at,
      user.updated_at,
      user.two_factor_enabled ? 1 : 0,
      user.last_login_at
    ]);

    console.log(`Other user ${user.id} saved successfully`);

    // Save profile if exists
    if (user.profile) {
      await this.saveProfile(user.id, user.profile);
    }

    // Save profile photo if exists
    if (user.profile_photo) {
      await this.saveProfilePhoto(user.id, user.profile_photo);
    }
  }

  /**
   * Save a profile to the local database
   * @param userId The user ID this profile belongs to
   * @param profile The profile to save
   */
  private async saveProfile(userId: number, profile: Profile): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(`
      INSERT OR REPLACE INTO profiles (
        id, user_id, first_name, last_name, gender, date_of_birth,
        age, city, state, province, country_id, latitude, longitude,
        bio, interests, looking_for, profile_views, profile_completed_at,
        status, occupation, profession, country_code, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      profile.id,
      userId,
      profile.first_name,
      profile.last_name,
      profile.gender,
      profile.date_of_birth,
      profile.age,
      profile.city,
      profile.state,
      profile.province,
      profile.country_id,
      profile.latitude,
      profile.longitude,
      profile.bio,
      JSON.stringify(profile.interests),
      profile.looking_for,
      profile.profile_views,
      profile.profile_completed_at,
      profile.status,
      profile.occupation,
      profile.profession,
      profile.country_code,
      profile.created_at,
      profile.updated_at
    ]);

    console.log(`Profile ${profile.id} saved successfully`);
  }

  /**
   * Save a profile photo to the local database
   * @param userId The user ID this photo belongs to
   * @param photo The profile photo to save
   */
  private async saveProfilePhoto(userId: number, photo: ProfilePhoto): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(`
      INSERT OR REPLACE INTO profile_photos (
        id, user_id, original_url, thumbnail_url, medium_url,
        is_profile_photo, order_num, is_private, is_verified,
        status, rejection_reason, metadata, uploaded_at,
        deleted_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      photo.id,
      userId,
      photo.original_url,
      photo.thumbnail_url,
      photo.medium_url,
      photo.is_profile_photo ? 1 : 0,
      photo.order,
      photo.is_private ? 1 : 0,
      photo.is_verified ? 1 : 0,
      photo.status,
      photo.rejection_reason,
      photo.metadata ? JSON.stringify(photo.metadata) : null,
      photo.uploaded_at,
      photo.deleted_at,
      photo.created_at,
      photo.updated_at
    ]);

    console.log(`Profile photo ${photo.id} saved successfully`);
  }

  /**
   * Save a message to the local database
   * @param message The message to save
   */
  async saveMessage(message: Message): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(`
      INSERT OR REPLACE INTO messages (
        id, chat_id, sender_id, reply_to_message_id, content,
        message_type, media_data, media_url, thumbnail_url,
        status, is_edited, edited_at, sent_at, deleted_at,
        created_at, updated_at, is_mine, sender_email, is_read, read_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      message.id,
      message.chat_id,
      message.sender_id,
      message.reply_to_message_id,
      message.content,
      message.message_type,
      message.media_data ? JSON.stringify(message.media_data) : null,
      message.media_url,
      message.thumbnail_url,
      message.status,
      message.is_edited ? 1 : 0,
      message.edited_at,
      message.sent_at,
      message.deleted_at,
      message.created_at,
      message.updated_at,
      message.is_mine ? 1 : 0,
      message.sender?.email || null,
      message.is_read ? 1 : 0,
      message.read_at || null
    ]);

    console.log(`Message ${message.id} saved successfully`);
  }

  /**
   * Save multiple messages to the local database
   * @param chatId The chat ID these messages belong to
   * @param messages The messages to save
   */
  async saveMessages(chatId: number, messages: Message[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.withTransactionAsync(async () => {
        for (const message of messages) {
          await this.db!.runAsync(`
            INSERT OR REPLACE INTO messages (
              id, chat_id, sender_id, reply_to_message_id, content,
              message_type, media_data, media_url, thumbnail_url,
              status, is_edited, edited_at, sent_at, deleted_at,
              created_at, updated_at, is_mine, sender_email, is_read, read_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            message.id,
            message.chat_id,
            message.sender_id,
            message.reply_to_message_id,
            message.content,
            message.message_type,
            message.media_data ? JSON.stringify(message.media_data) : null,
            message.media_url,
            message.thumbnail_url,
            message.status,
            message.is_edited ? 1 : 0,
            message.edited_at,
            message.sent_at,
            message.deleted_at,
            message.created_at,
            message.updated_at,
            message.is_mine ? 1 : 0,
            message.sender?.email || null,
            message.is_read ? 1 : 0,
            message.read_at || null
          ]);
        }
      });
      console.log(`${messages.length} messages saved successfully`);
    } catch (error) {
      console.error('Error saving messages:', error);
      throw error;
    }
  }

  /**
   * Get all chats from the local database
   * @returns A promise that resolves to an array of chats
   */
  async getChats(): Promise<Chat[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const chatRows = await this.db.getAllAsync<any>(`
        SELECT * FROM chats ORDER BY last_activity_at DESC
      `);

      const chats: Chat[] = [];

      for (const chatRow of chatRows) {

        // Get the other user for this chat
        const otherUser = await this.getOtherUserForChat(chatRow.id);

        // Get the last message for this chat
        const lastMessage = await this.getLastMessageForChat(chatRow.id);

        // Create the pivot object
        const pivot: UserPivot = {
          chat_id: chatRow.pivot_chat_id,
          user_id: chatRow.pivot_user_id,
          is_muted: chatRow.pivot_is_muted === 1,
          last_read_at: chatRow.pivot_last_read_at,
          joined_at: chatRow.pivot_joined_at,
          left_at: chatRow.pivot_left_at,
          role: chatRow.pivot_role,
          created_at: chatRow.pivot_created_at,
          updated_at: chatRow.pivot_updated_at
        };

        // Create the chat object
        const chat: Chat = {
          id: chatRow.id,
          type: chatRow.type,
          name: chatRow.name,
          description: chatRow.description,
          last_activity_at: chatRow.last_activity_at,
          is_active: chatRow.is_active === 1,
          created_at: chatRow.created_at,
          updated_at: chatRow.updated_at,
          deleted_at: chatRow.deleted_at,
          unread_count: chatRow.unread_count,
          other_user: otherUser!,
          last_message: lastMessage,
          pivot: pivot
        };

        chats.push(chat);
      }

      return chats;
    } catch (error) {
      console.error('Error getting chats:', error);
      throw error;
    }
  }

  /**
   * Get a chat by ID from the local database
   * @param chatId The ID of the chat to get
   * @returns A promise that resolves to the chat or null if not found
   */
  async getChatById(chatId: number): Promise<Chat | null> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const chatRow = await this.db.getFirstAsync<any>(`
        SELECT * FROM chats WHERE id = ?
      `, [chatId]);

      if (!chatRow) {
        return null;
      }

      // Get the other user for this chat
      const otherUser = await this.getOtherUserForChat(chatId);

      // Get the last message for this chat
      const lastMessage = await this.getLastMessageForChat(chatId);

      // Create the pivot object
      const pivot: UserPivot = {
        chat_id: chatRow.pivot_chat_id,
        user_id: chatRow.pivot_user_id,
        is_muted: chatRow.pivot_is_muted === 1,
        last_read_at: chatRow.pivot_last_read_at,
        joined_at: chatRow.pivot_joined_at,
        left_at: chatRow.pivot_left_at,
        role: chatRow.pivot_role,
        created_at: chatRow.pivot_created_at,
        updated_at: chatRow.pivot_updated_at
      };

      // Create the chat object
      const chat: Chat = {
        id: chatRow.id,
        type: chatRow.type,
        name: chatRow.name,
        description: chatRow.description,
        last_activity_at: chatRow.last_activity_at,
        is_active: chatRow.is_active === 1,
        created_at: chatRow.created_at,
        updated_at: chatRow.updated_at,
        deleted_at: chatRow.deleted_at,
        unread_count: chatRow.unread_count,
        other_user: otherUser!,
        last_message: lastMessage,
        pivot: pivot
      };

      return chat;
    } catch (error) {
      console.error('Error getting chat by ID:', error);
      throw error;
    }
  }

  /**
   * Get the other user for a chat
   * @param chatId The ID of the chat
   * @returns A promise that resolves to the other user or null if not found
   */
  private async getOtherUserForChat(chatId: number): Promise<OtherUser | null> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const userRow = await this.db.getFirstAsync<any>(`
        SELECT * FROM other_users WHERE chat_id = ?
      `, [chatId]);

      if (!userRow) {
        return null;
      }

      // Get the profile for this user
      const profile = await this.getProfileForUser(userRow.id);

      // Get the profile photo for this user
      const profilePhoto = await this.getProfilePhotoForUser(userRow.id);

      // Create the pivot object with default values
      const pivot: UserPivot = {
        chat_id: chatId,
        user_id: userRow.id,
        is_muted: false, // Default value
        last_read_at: null,
        joined_at: userRow.created_at,
        left_at: null,
        role: 'member', // Default value
        created_at: userRow.created_at,
        updated_at: userRow.updated_at
      };

      // Create the other user object
      const otherUser: OtherUser = {
        id: userRow.id,
        email: userRow.email,
        phone: userRow.phone,
        google_id: userRow.google_id,
        facebook_id: userRow.facebook_id,
        email_verified_at: userRow.email_verified_at,
        phone_verified_at: userRow.phone_verified_at,
        disabled_at: userRow.disabled_at,
        registration_completed: userRow.registration_completed === 1,
        is_admin: userRow.is_admin === 1,
        is_private: userRow.is_private === 1,
        profile_photo_path: userRow.profile_photo_path,
        last_active_at: userRow.last_active_at,
        deleted_at: userRow.deleted_at,
        created_at: userRow.created_at,
        updated_at: userRow.updated_at,
        two_factor_enabled: userRow.two_factor_enabled === 1,
        last_login_at: userRow.last_login_at,
        pivot: pivot,
        profile: profile!,
        profile_photo: profilePhoto
      };

      return otherUser;
    } catch (error) {
      console.error('Error getting other user for chat:', error);
      throw error;
    }
  }

  /**
   * Get the profile for a user
   * @param userId The ID of the user
   * @returns A promise that resolves to the profile or null if not found
   */
  private async getProfileForUser(userId: number): Promise<Profile | null> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const profileRow = await this.db.getFirstAsync<any>(`
        SELECT * FROM profiles WHERE user_id = ?
      `, [userId]);

      if (!profileRow) {
        return null;
      }

      // Create the profile object
      const profile: Profile = {
        id: profileRow.id,
        user_id: profileRow.user_id,
        first_name: profileRow.first_name,
        last_name: profileRow.last_name,
        gender: profileRow.gender,
        date_of_birth: profileRow.date_of_birth,
        age: profileRow.age,
        city: profileRow.city,
        state: profileRow.state,
        province: profileRow.province,
        country_id: profileRow.country_id,
        latitude: profileRow.latitude,
        longitude: profileRow.longitude,
        bio: profileRow.bio,
        interests: JSON.parse(profileRow.interests || '[]'),
        looking_for: profileRow.looking_for,
        profile_views: profileRow.profile_views,
        profile_completed_at: profileRow.profile_completed_at,
        status: profileRow.status,
        occupation: profileRow.occupation,
        profession: profileRow.profession,
        country_code: profileRow.country_code,
        created_at: profileRow.created_at,
        updated_at: profileRow.updated_at
      };

      return profile;
    } catch (error) {
      console.error('Error getting profile for user:', error);
      throw error;
    }
  }

  /**
   * Get the profile photo for a user
   * @param userId The ID of the user
   * @returns A promise that resolves to the profile photo or null if not found
   */
  private async getProfilePhotoForUser(userId: number): Promise<ProfilePhoto | null> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const photoRow = await this.db.getFirstAsync<any>(`
        SELECT * FROM profile_photos WHERE user_id = ? AND is_profile_photo = 1
      `, [userId]);

      if (!photoRow) {
        return null;
      }

      // Create the profile photo object
      const profilePhoto: ProfilePhoto = {
        id: photoRow.id,
        user_id: photoRow.user_id,
        original_url: photoRow.original_url,
        thumbnail_url: photoRow.thumbnail_url,
        medium_url: photoRow.medium_url,
        is_profile_photo: photoRow.is_profile_photo === 1,
        order: photoRow.order_num,
        is_private: photoRow.is_private === 1,
        is_verified: photoRow.is_verified === 1,
        status: photoRow.status,
        rejection_reason: photoRow.rejection_reason,
        metadata: photoRow.metadata ? JSON.parse(photoRow.metadata) : null,
        uploaded_at: photoRow.uploaded_at,
        deleted_at: photoRow.deleted_at,
        created_at: photoRow.created_at,
        updated_at: photoRow.updated_at
      };

      return profilePhoto;
    } catch (error) {
      console.error('Error getting profile photo for user:', error);
      throw error;
    }
  }

  /**
   * Get the last message for a chat
   * @param chatId The ID of the chat
   * @returns A promise that resolves to the last message or null if not found
   */
  async getLastMessageForChat(chatId: number): Promise<Message | null> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const messageRow = await this.db.getFirstAsync<any>(`
        SELECT * FROM messages WHERE chat_id = ? ORDER BY sent_at DESC LIMIT 1
      `, [chatId]);

      if (!messageRow) {
        return null;
      }

      // Create the message object
      const message: Message = {
        id: messageRow.id,
        chat_id: messageRow.chat_id,
        sender_id: messageRow.sender_id,
        reply_to_message_id: messageRow.reply_to_message_id,
        content: messageRow.content,
        message_type: messageRow.message_type,
        media_data: messageRow.media_data ? JSON.parse(messageRow.media_data) : null,
        media_url: messageRow.media_url,
        thumbnail_url: messageRow.thumbnail_url,
        status: messageRow.status,
        is_edited: messageRow.is_edited === 1,
        edited_at: messageRow.edited_at,
        sent_at: messageRow.sent_at,
        deleted_at: messageRow.deleted_at,
        created_at: messageRow.created_at,
        updated_at: messageRow.updated_at,
        is_mine: messageRow.is_mine === 1,
        is_read: messageRow.is_read === 1,
        read_at: messageRow.read_at,
        sender: messageRow.sender_email ? {
          id: messageRow.sender_id,
          email: messageRow.sender_email
        } : undefined
      };

      return message;
    } catch (error) {
      console.error('Error getting last message for chat:', error);
      throw error;
    }
  }

  /**
   * Get messages for a chat
   * @param chatId The ID of the chat
   * @returns A promise that resolves to an array of messages
   */
  async getMessagesForChat(chatId: number): Promise<Message[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const messageRows = await this.db.getAllAsync<any>(`
        SELECT * FROM messages WHERE chat_id = ? AND deleted_at IS NULL 
        ORDER BY sent_at DESC
      `, [chatId]);

      const messages: Message[] = messageRows.map(messageRow => ({
        id: messageRow.id,
        chat_id: messageRow.chat_id,
        sender_id: messageRow.sender_id,
        reply_to_message_id: messageRow.reply_to_message_id,
        content: messageRow.content,
        message_type: messageRow.message_type,
        media_data: messageRow.media_data ? JSON.parse(messageRow.media_data) : null,
        media_url: messageRow.media_url,
        thumbnail_url: messageRow.thumbnail_url,
        status: messageRow.status,
        is_edited: messageRow.is_edited === 1,
        edited_at: messageRow.edited_at,
        sent_at: messageRow.sent_at,
        deleted_at: messageRow.deleted_at,
        created_at: messageRow.created_at,
        updated_at: messageRow.updated_at,
        is_mine: messageRow.is_mine === 1,
        is_read: messageRow.is_read === 1,
        read_at: messageRow.read_at,
        sender: messageRow.sender_email ? {
          id: messageRow.sender_id,
          email: messageRow.sender_email
        } : undefined
      }));

      return messages;
    } catch (error) {
      console.error('Error getting messages for chat:', error);
      throw error;
    }
  }

  /**
   * Check if messages exist for a chat before a specific message ID
   * @param chatId The chat ID
   * @param beforeMessageId The message ID to check before
   * @returns boolean indicating if messages exist
   */
  async hasMessagesBeforeId(chatId: number, beforeMessageId: number): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = await this.db.getFirstAsync<{ count: number }>(`
      SELECT COUNT(*) as count FROM messages 
      WHERE chat_id = ? AND id < ? AND deleted_at IS NULL
    `, [chatId, beforeMessageId]);

      return (result?.count || 0) > 0;
    } catch (error) {
      console.error('Error checking messages before ID:', error);
      return false;
    }
  }

  /**
   * Get messages before a specific message ID (for pagination)
   * @param chatId The chat ID
   * @param beforeMessageId The message ID to get messages before
   * @param limit Maximum number of messages to retrieve
   * @returns Array of messages
   */
  async getMessagesBeforeId(chatId: number, beforeMessageId: number, limit: number = 20): Promise<Message[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const messages = await this.db.getAllAsync<any>(`
        SELECT * FROM messages 
        WHERE chat_id = ? AND id < ? AND deleted_at IS NULL 
        ORDER BY sent_at DESC
        LIMIT ?
      `, [chatId, beforeMessageId, limit]);

      return messages.map(msg => ({
        id: msg.id,
        chat_id: msg.chat_id,
        sender_id: msg.sender_id,
        reply_to_message_id: msg.reply_to_message_id,
        content: msg.content,
        message_type: msg.message_type,
        media_data: msg.media_data ? JSON.parse(msg.media_data) : null,
        media_url: msg.media_url,
        thumbnail_url: msg.thumbnail_url,
        status: msg.status,
        is_edited: msg.is_edited === 1,
        edited_at: msg.edited_at,
        sent_at: msg.sent_at,
        deleted_at: msg.deleted_at,
        created_at: msg.created_at,
        updated_at: msg.updated_at,
        is_mine: msg.is_mine === 1,
        is_read: msg.is_read === 1,
        read_at: msg.read_at,
        sender: msg.sender_email ? {
          id: msg.sender_id,
          email: msg.sender_email
        } : undefined
      }));
    } catch (error) {
      console.error('Error getting messages before ID:', error);
      throw error;
    }
  }

  /**
   * Check if a specific message exists in local storage
   * @param messageId The message ID to check
   * @returns boolean indicating if message exists
   */
  async messageExists(messageId: number): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = await this.db.getFirstAsync<{ count: number }>(`
      SELECT COUNT(*) as count FROM messages WHERE id = ?
    `, [messageId]);

      return (result?.count || 0) > 0;
    } catch (error) {
      console.error('Error checking if message exists:', error);
      return false;
    }
  }

  /**
   * Delete a chat and all related data
   * @param chatId The ID of the chat to delete
   */
  async deleteChat(chatId: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.runAsync('DELETE FROM chats WHERE id = ?', [chatId]);
      console.log(`Chat ${chatId} deleted successfully`);
    } catch (error) {
      console.error('Error deleting chat:', error);
      throw error;
    }
  }

  /**
   * Clear all messages for a chat
   * @param chatId The ID of the chat to clear messages for
   */
  async clearChatMessages(chatId: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.runAsync('DELETE FROM messages WHERE chat_id = ?', [chatId]);
      console.log(`Messages for chat ${chatId} cleared successfully`);
    } catch (error) {
      console.error('Error clearing chat messages:', error);
      throw error;
    }
  }

  /**
   * Update a message's status
   * @param messageId The ID of the message to update
   * @param status The new status
   */
  async updateMessageStatus(messageId: number, status: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      if (status === 'deleted') {
        await this.db.runAsync(`
          UPDATE messages 
          SET status = ?, deleted_at = datetime('now', 'utc') 
          WHERE id = ?
        `, [status, messageId]);
      } else {
        await this.db.runAsync(`
          UPDATE messages 
          SET status = ?, updated_at = datetime('now', 'utc') 
          WHERE id = ?
        `, [status, messageId]);
      }
      console.log(`Message ${messageId} status updated to ${status}`);
    } catch (error) {
      console.error('Error updating message status:', error);
      throw error;
    }
  }

  /**
   * Update message content (for edit operations)
   * @param messageId The message ID to update
   * @param newContent The new content
   */
  async updateMessageContent(messageId: number, newContent: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.runAsync(`
        UPDATE messages 
        SET content = ?, is_edited = 1, edited_at = datetime('now', 'utc'), updated_at = datetime('now', 'utc')
        WHERE id = ?
      `, [newContent, messageId]);
      console.log(`Message ${messageId} content updated`);
    } catch (error) {
      console.error('Error updating message content:', error);
      throw error;
    }
  }

  /**
   * Get message by ID
   * @param messageId The message ID
   * @returns Message or null if not found
   */
  async getMessageById(messageId: number): Promise<Message | null> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const msg = await this.db.getFirstAsync<any>(`
        SELECT * FROM messages WHERE id = ? AND deleted_at IS NULL
      `, [messageId]);

      if (!msg) return null;

      return {
        id: msg.id,
        chat_id: msg.chat_id,
        sender_id: msg.sender_id,
        reply_to_message_id: msg.reply_to_message_id,
        content: msg.content,
        message_type: msg.message_type,
        media_data: msg.media_data ? JSON.parse(msg.media_data) : null,
        media_url: msg.media_url,
        thumbnail_url: msg.thumbnail_url,
        status: msg.status,
        is_edited: msg.is_edited === 1,
        edited_at: msg.edited_at,
        sent_at: msg.sent_at,
        deleted_at: msg.deleted_at,
        created_at: msg.created_at,
        updated_at: msg.updated_at,
        is_mine: msg.is_mine === 1,
        is_read: msg.is_read === 1,
        read_at: msg.read_at,
        sender: msg.sender_email ? {
          id: msg.sender_id,
          email: msg.sender_email
        } : undefined
      };
    } catch (error) {
      console.error('Error getting message by ID:', error);
      throw error;
    }
  }

  /**
   * Execute a SQL query directly
   * @param sql The SQL query to execute
   * @param params The parameters for the SQL query
   * @returns A promise that resolves to the query result
   */
  async executeSql(sql: string, params: any[] = []): Promise<any> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      return await this.db.getAllAsync(sql, params);
    } catch (error) {
      console.error('Error executing SQL:', error);
      throw error;
    }
  }

  /**
   * Check if the service is initialized
   */
  isServiceInitialized(): boolean {
    return this.isInitialized && this.db !== null;
  }

  /**
   * Get the last error that occurred
   */
  getLastError(): Error | null {
    return this.lastError;
  }

  /**
   * Close the database connection
   */
  async closeDatabase(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
      this.isInitialized = false;
      console.log('Database connection closed');
    }
  }

  /**
   * Clear and delete the local database on logout
   * This drops all tables and closes the database connection
   */
  async clearDatabaseOnLogout(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      console.log('Clearing database on logout...');

      // Drop all tables in a transaction
      await this.db.withTransactionAsync(async () => {
        await this.db!.execAsync('DROP TABLE IF EXISTS messages');
        await this.db!.execAsync('DROP TABLE IF EXISTS profile_photos');
        await this.db!.execAsync('DROP TABLE IF EXISTS profiles');
        await this.db!.execAsync('DROP TABLE IF EXISTS other_users');
        await this.db!.execAsync('DROP TABLE IF EXISTS chats');
        await this.db!.execAsync('DROP TABLE IF EXISTS database_version');
      });

      // Close the database connection
      await this.closeDatabase();

      console.log('Database cleared and closed successfully');
    } catch (error) {
      console.error('Error clearing database on logout:', error);
      throw error;
    }
  }

  /**
   * Update a chat's last message
   * @param chatId The chat ID
   * @param message The new last message
   */
  async updateChatLastMessage(chatId: number, message: Message): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.withTransactionAsync(async () => {
        // Save the message first
        await this.db!.runAsync(`
          INSERT OR REPLACE INTO messages (
            id, chat_id, sender_id, reply_to_message_id, content,
            message_type, media_data, media_url, thumbnail_url,
            status, is_edited, edited_at, sent_at, deleted_at,
            created_at, updated_at, is_mine, sender_email, is_read, read_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          message.id,
          message.chat_id,
          message.sender_id,
          message.reply_to_message_id,
          message.content,
          message.message_type,
          message.media_data ? JSON.stringify(message.media_data) : null,
          message.media_url,
          message.thumbnail_url,
          message.status,
          message.is_edited ? 1 : 0,
          message.edited_at,
          message.sent_at,
          message.deleted_at,
          message.created_at,
          message.updated_at,
          message.is_mine ? 1 : 0,
          message.sender?.email || null,
          message.is_read ? 1 : 0,
          message.read_at || null
        ]);
        
        // Then update the chat's last_activity_at
        const timestamp = message.sent_at || message.created_at || new Date().toISOString();
        await this.db!.runAsync(`
          UPDATE chats 
          SET last_activity_at = ?, updated_at = datetime('now', 'utc')
          WHERE id = ?
        `, [timestamp, chatId]);
      });
      
      console.log(`Updated last message for chat ${chatId}`);
    } catch (error) {
      console.error('Error updating chat last message:', error);
      throw error;
    }
  }

  /**
   * Increment unread count for a chat
   * @param chatId The chat ID
   */
  async incrementChatUnreadCount(chatId: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.runAsync(`
        UPDATE chats 
        SET unread_count = unread_count + 1, updated_at = datetime('now', 'utc')
        WHERE id = ?
      `, [chatId]);
      
      console.log(`Incremented unread count for chat ${chatId}`);
    } catch (error) {
      console.error('Error incrementing chat unread count:', error);
      throw error;
    }
  }

  /**
   * Mark a chat as read (reset unread count)
   * @param chatId The chat ID
   */
  async markChatAsRead(chatId: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.runAsync(`
        UPDATE chats 
        SET unread_count = 0, updated_at = datetime('now', 'utc')
        WHERE id = ?
      `, [chatId]);
      
      console.log(`Marked chat ${chatId} as read`);
    } catch (error) {
      console.error('Error marking chat as read:', error);
      throw error;
    }
  }

  /**
   * Update a chat's last activity timestamp
   * @param chatId The chat ID
   */
  async updateChatLastActivity(chatId: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.runAsync(`
        UPDATE chats 
        SET last_activity_at = datetime('now', 'utc'), updated_at = datetime('now', 'utc')
        WHERE id = ?
      `, [chatId]);
      
      console.log(`Updated last activity for chat ${chatId}`);
    } catch (error) {
      console.error('Error updating chat last activity:', error);
      throw error;
    }
  }

  // Force database reset and migration
  async resetDatabase(): Promise<void> {
    try {
      console.log('Resetting database...');
      
      // Close the database if it's open
      if (this.db) {
        await this.db.closeAsync();
        this.db = null;
      }
      
      // Delete the database file
      const dbPath = `${FileSystem.documentDirectory}SQLite/yoryor_chats.db`;
      try {
        await FileSystem.deleteAsync(dbPath);
        console.log('Deleted old database file');
      } catch (error) {
        console.log('Database file not found or already deleted');
      }
      
      // Reinitialize the database
      await this.initDatabase();
      console.log('Database reset completed');
    } catch (error) {
      console.error('Error resetting database:', error);
      throw error;
    }
  }

  // Force add missing columns
  public async forceAddMissingColumns(): Promise<void> {
    if (!this.db) {
      console.log('Database not initialized, initializing first...');
      await this.initDatabase();
      return;
    }

    try {
      console.log('Checking for missing columns...');
      
      // Use a transaction to ensure atomicity
      await this.db.withTransactionAsync(async () => {
        // Check if columns exist
        const tableInfo = await this.db!.getAllAsync<any>(`
          PRAGMA table_info(messages)
        `);
        
        const hasIsRead = tableInfo.some((col: any) => col.name === 'is_read');
        const hasReadAt = tableInfo.some((col: any) => col.name === 'read_at');
        
        console.log('Current columns:', tableInfo.map((col: any) => col.name));
        console.log('Has is_read:', hasIsRead);
        console.log('Has read_at:', hasReadAt);
        
        if (!hasIsRead) {
          console.log('Adding is_read column...');
          await this.db!.execAsync(`
            ALTER TABLE messages ADD COLUMN is_read INTEGER DEFAULT 0
          `);
          console.log('Successfully added is_read column');
        }
        
        if (!hasReadAt) {
          console.log('Adding read_at column...');
          await this.db!.execAsync(`
            ALTER TABLE messages ADD COLUMN read_at TEXT
          `);
          console.log('Successfully added read_at column');
        }
        
        console.log('All required columns are present');
      });
    } catch (error) {
      console.error('Error adding missing columns:', error);
      
      // If there's an error with missing columns, try to recreate the database
      console.log('Attempting to reset database due to column errors...');
      try {
        await this.resetDatabase();
      } catch (resetError) {
        console.error('Error resetting database:', resetError);
        throw resetError;
      }
    }
  }

  /**
   * Get initial messages for a chat with pagination limit (for consistency with API)
   * @param chatId The chat ID to get messages for
   * @param limit Maximum number of messages to retrieve
   * @returns Array of messages ordered by newest first
   */
  async getInitialMessagesByChatId(chatId: number, limit: number = 20): Promise<Message[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const messages = await this.db.getAllAsync<any>(`
        SELECT * FROM messages 
        WHERE chat_id = ? AND deleted_at IS NULL 
        ORDER BY sent_at DESC
        LIMIT ?
      `, [chatId, limit]);

      return messages.map(msg => ({
        id: msg.id,
        chat_id: msg.chat_id,
        sender_id: msg.sender_id,
        reply_to_message_id: msg.reply_to_message_id,
        content: msg.content,
        message_type: msg.message_type,
        media_data: msg.media_data ? JSON.parse(msg.media_data) : null,
        media_url: msg.media_url,
        thumbnail_url: msg.thumbnail_url,
        status: msg.status,
        is_edited: msg.is_edited === 1,
        edited_at: msg.edited_at,
        sent_at: msg.sent_at,
        deleted_at: msg.deleted_at,
        created_at: msg.created_at,
        updated_at: msg.updated_at,
        is_mine: msg.is_mine === 1,
        is_read: msg.is_read === 1,
        read_at: msg.read_at,
        sender: msg.sender_email ? {
          id: msg.sender_id,
          email: msg.sender_email
        } : undefined
      }));
    } catch (error) {
      console.error('Error getting initial messages by chat ID:', error);
      throw error;
    }
  }

  // ==================== NOTIFICATION COUNTS METHODS ====================

  /**
   * Get notification counts for a user
   * @param userId The user ID
   * @returns Object with unread_messages_count and new_likes_count
   */
  async getNotificationCounts(userId: number): Promise<{ unread_messages_count: number; new_likes_count: number }> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = await this.db.getFirstAsync<any>(`
        SELECT unread_messages_count, new_likes_count 
        FROM notification_counts 
        WHERE user_id = ?
      `, [userId]);

      if (result) {
        return {
          unread_messages_count: result.unread_messages_count || 0,
          new_likes_count: result.new_likes_count || 0
        };
      }

      // If no record exists, create one with default values
      await this.createNotificationCountsRecord(userId);
      return { unread_messages_count: 0, new_likes_count: 0 };
    } catch (error) {
      console.error('Error getting notification counts:', error);
      throw error;
    }
  }

  /**
   * Create a notification counts record for a user
   * @param userId The user ID
   */
  async createNotificationCountsRecord(userId: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const now = new Date().toISOString();
      await this.db.runAsync(`
        INSERT OR IGNORE INTO notification_counts (
          user_id, unread_messages_count, new_likes_count, created_at, updated_at
        ) VALUES (?, 0, 0, ?, ?)
      `, [userId, now, now]);
    } catch (error) {
      console.error('Error creating notification counts record:', error);
      throw error;
    }
  }

  /**
   * Update unread messages count for a user
   * @param userId The user ID
   * @param count The new count (or increment if not specified)
   * @param increment Whether to increment the existing count
   */
  async updateUnreadMessagesCount(userId: number, count?: number, increment: boolean = false): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const now = new Date().toISOString();
      
      if (increment) {
        await this.db.runAsync(`
          INSERT OR REPLACE INTO notification_counts (
            user_id, unread_messages_count, new_likes_count, created_at, updated_at
          ) VALUES (
            ?, 
            COALESCE((SELECT unread_messages_count FROM notification_counts WHERE user_id = ?), 0) + 1,
            COALESCE((SELECT new_likes_count FROM notification_counts WHERE user_id = ?), 0),
            COALESCE((SELECT created_at FROM notification_counts WHERE user_id = ?), ?),
            ?
          )
        `, [userId, userId, userId, userId, now, now]);
      } else {
        await this.db.runAsync(`
          INSERT OR REPLACE INTO notification_counts (
            user_id, unread_messages_count, new_likes_count, created_at, updated_at
          ) VALUES (
            ?, 
            ?,
            COALESCE((SELECT new_likes_count FROM notification_counts WHERE user_id = ?), 0),
            COALESCE((SELECT created_at FROM notification_counts WHERE user_id = ?), ?),
            ?
          )
        `, [userId, count || 0, userId, userId, now, now]);
      }
    } catch (error) {
      console.error('Error updating unread messages count:', error);
      throw error;
    }
  }

  /**
   * Update new likes count for a user
   * @param userId The user ID
   * @param count The new count (or increment if not specified)
   * @param increment Whether to increment the existing count
   */
  async updateNewLikesCount(userId: number, count?: number, increment: boolean = false): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const now = new Date().toISOString();
      
      if (increment) {
        await this.db.runAsync(`
          INSERT OR REPLACE INTO notification_counts (
            user_id, unread_messages_count, new_likes_count, created_at, updated_at
          ) VALUES (
            ?, 
            COALESCE((SELECT unread_messages_count FROM notification_counts WHERE user_id = ?), 0),
            COALESCE((SELECT new_likes_count FROM notification_counts WHERE user_id = ?), 0) + 1,
            COALESCE((SELECT created_at FROM notification_counts WHERE user_id = ?), ?),
            ?
          )
        `, [userId, userId, userId, userId, now, now]);
      } else {
        await this.db.runAsync(`
          INSERT OR REPLACE INTO notification_counts (
            user_id, unread_messages_count, new_likes_count, created_at, updated_at
          ) VALUES (
            ?, 
            COALESCE((SELECT unread_messages_count FROM notification_counts WHERE user_id = ?), 0),
            ?,
            COALESCE((SELECT created_at FROM notification_counts WHERE user_id = ?), ?),
            ?
          )
        `, [userId, userId, count || 0, userId, now, now]);
      }
    } catch (error) {
      console.error('Error updating new likes count:', error);
      throw error;
    }
  }

  /**
   * Reset all notification counts for a user
   * @param userId The user ID
   */
  async resetNotificationCounts(userId: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const now = new Date().toISOString();
      await this.db.runAsync(`
        INSERT OR REPLACE INTO notification_counts (
          user_id, unread_messages_count, new_likes_count, created_at, updated_at
        ) VALUES (?, 0, 0, ?, ?)
      `, [userId, now, now]);
    } catch (error) {
      console.error('Error resetting notification counts:', error);
      throw error;
    }
  }

  /**
   * Force recreate the notification_counts table (for debugging)
   */
  async forceRecreateNotificationTable(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      console.log('Force recreating notification_counts table...');
      
      // Drop the table if it exists
      await this.db.execAsync('DROP TABLE IF EXISTS notification_counts');
      
      // Recreate the table
      await this.db.execAsync(`
        CREATE TABLE notification_counts (
          id INTEGER PRIMARY KEY,
          user_id INTEGER,
          unread_messages_count INTEGER DEFAULT 0,
          new_likes_count INTEGER DEFAULT 0,
          created_at TEXT,
          updated_at TEXT
        )
      `);
      
      // Create index
      await this.db.execAsync(`
        CREATE INDEX idx_notification_counts_user_id ON notification_counts (user_id)
      `);
      
      console.log('Notification_counts table recreated successfully');
    } catch (error) {
      console.error('Error recreating notification_counts table:', error);
      throw error;
    }
  }

  /**
   * Get chats with optimized query (includes last message)
   */
  async getChatsOptimized(): Promise<Chat[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const chats = await this.db.getAllAsync<Chat>(`
        SELECT 
          c.*,
          ou.id as other_user_id,
          ou.email as other_user_email,
          ou.phone as other_user_phone,
          ou.profile_photo_path as other_user_profile_photo_path,
          ou.last_active_at as other_user_last_active_at,
          p.first_name as profile_first_name,
          p.last_name as profile_last_name,
          p.gender as profile_gender,
          p.age as profile_age,
          p.city as profile_city,
          p.state as profile_state,
          p.bio as profile_bio,
          p.interests as profile_interests,
          p.looking_for as profile_looking_for,
          pp.medium_url as profile_photo_medium_url,
          pp.thumbnail_url as profile_photo_thumbnail_url,
          pp.is_profile_photo as profile_photo_is_profile,
          m.content as last_message_content,
          m.message_type as last_message_type,
          m.sent_at as last_message_sent_at,
          m.sender_id as last_message_sender_id,
          m.is_mine as last_message_is_mine
        FROM chats c
        LEFT JOIN other_users ou ON c.id = ou.chat_id
        LEFT JOIN profiles p ON ou.id = p.user_id
        LEFT JOIN profile_photos pp ON ou.id = pp.user_id AND pp.is_profile_photo = 1
        LEFT JOIN (
          SELECT 
            chat_id, 
            content, 
            message_type, 
            sent_at, 
            sender_id, 
            is_mine,
            ROW_NUMBER() OVER (PARTITION BY chat_id ORDER BY sent_at DESC) as rn
          FROM messages 
          WHERE deleted_at IS NULL
        ) m ON c.id = m.chat_id AND m.rn = 1
        WHERE c.deleted_at IS NULL
        ORDER BY c.last_activity_at DESC
      `);

      return chats.map(chat => this.transformChatFromQuery(chat));
    } catch (error) {
      console.error('Error getting optimized chats:', error);
      return [];
    }
  }

  /**
   * Get messages with optimized pagination
   */
  async getMessagesOptimized(chatId: number, limit: number = 20, offset: number = 0): Promise<Message[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const messages = await this.db.getAllAsync<Message>(`
        SELECT 
          m.*,
          ou.email as sender_email
        FROM messages m
        LEFT JOIN other_users ou ON m.sender_id = ou.id
        WHERE m.chat_id = ? AND m.deleted_at IS NULL
        ORDER BY m.sent_at DESC
        LIMIT ? OFFSET ?
      `, [chatId, limit, offset]);

      return messages.map(msg => ({
        ...msg,
        is_mine: Boolean(msg.is_mine),
        is_read: Boolean(msg.is_read),
        is_edited: Boolean(msg.is_edited)
      }));
    } catch (error) {
      console.error('Error getting optimized messages:', error);
      return [];
    }
  }

  /**
   * Transform raw query result to Chat object
   */
  private transformChatFromQuery(rawChat: any): Chat {
    return {
      id: rawChat.id,
      type: rawChat.type,
      name: rawChat.name,
      description: rawChat.description,
      last_activity_at: rawChat.last_activity_at,
      is_active: Boolean(rawChat.is_active),
      created_at: rawChat.created_at,
      updated_at: rawChat.updated_at,
      deleted_at: rawChat.deleted_at,
      unread_count: rawChat.unread_count || 0,
      other_user: {
        id: rawChat.other_user_id,
        email: rawChat.other_user_email,
        phone: rawChat.other_user_phone,
        profile_photo_path: rawChat.other_user_profile_photo_path,
        last_active_at: rawChat.other_user_last_active_at,
        profile: {
          first_name: rawChat.profile_first_name,
          last_name: rawChat.profile_last_name,
          gender: rawChat.profile_gender,
          age: rawChat.profile_age,
          city: rawChat.profile_city,
          state: rawChat.profile_state,
          bio: rawChat.profile_bio,
          interests: rawChat.profile_interests ? JSON.parse(rawChat.profile_interests) : [],
          looking_for: rawChat.profile_looking_for
        },
        profile_photo: rawChat.profile_photo_medium_url ? {
          medium_url: rawChat.profile_photo_medium_url,
          thumbnail_url: rawChat.profile_photo_thumbnail_url,
          is_profile_photo: Boolean(rawChat.profile_photo_is_profile)
        } : null
      },
      last_message: rawChat.last_message_content ? {
        content: rawChat.last_message_content,
        message_type: rawChat.last_message_type,
        sent_at: rawChat.last_message_sent_at,
        sender_id: rawChat.last_message_sender_id,
        is_mine: Boolean(rawChat.last_message_is_mine)
      } : null
    } as Chat;
  }

  /**
   * Optimize database performance
   */
  async optimizeDatabase(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      console.log('Starting database optimization...');
      
      // Analyze tables for better query planning
      await this.db.execAsync('ANALYZE');
      
      // Vacuum to reclaim space and optimize storage
      await this.db.execAsync('VACUUM');
      
      // Update statistics for better query optimization
      await this.db.execAsync('ANALYZE chats');
      await this.db.execAsync('ANALYZE messages');
      await this.db.execAsync('ANALYZE other_users');
      await this.db.execAsync('ANALYZE profiles');
      await this.db.execAsync('ANALYZE profile_photos');
      
      console.log('Database optimization completed');
    } catch (error) {
      console.error('Error optimizing database:', error);
    }
  }

  /**
   * Get database statistics for monitoring
   */
  async getDatabaseStats(): Promise<{
    totalChats: number;
    totalMessages: number;
    totalUsers: number;
    totalPhotos: number;
    avgMessagesPerChat: number;
    dbSize: number;
  }> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const stats = await this.db.getFirstAsync<{
        total_chats: number;
        total_messages: number;
        total_users: number;
        total_photos: number;
        avg_messages: number;
      }>(`
        SELECT 
          (SELECT COUNT(*) FROM chats WHERE deleted_at IS NULL) as total_chats,
          (SELECT COUNT(*) FROM messages WHERE deleted_at IS NULL) as total_messages,
          (SELECT COUNT(*) FROM other_users) as total_users,
          (SELECT COUNT(*) FROM profile_photos) as total_photos,
          (SELECT ROUND(AVG(msg_count), 2) FROM (
            SELECT chat_id, COUNT(*) as msg_count 
            FROM messages 
            WHERE deleted_at IS NULL 
            GROUP BY chat_id
          )) as avg_messages
      `);

      return {
        totalChats: stats?.total_chats || 0,
        totalMessages: stats?.total_messages || 0,
        totalUsers: stats?.total_users || 0,
        totalPhotos: stats?.total_photos || 0,
        avgMessagesPerChat: stats?.avg_messages || 0,
        dbSize: 0 // Would need file system access to calculate
      };
    } catch (error) {
      console.error('Error getting database stats:', error);
      return {
        totalChats: 0,
        totalMessages: 0,
        totalUsers: 0,
        totalPhotos: 0,
        avgMessagesPerChat: 0,
        dbSize: 0
      };
    }
  }

  /**
   * Clean up old data to maintain performance
   */
  async cleanupOldData(daysToKeep: number = 30): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      const cutoffString = cutoffDate.toISOString();

      console.log(`Cleaning up data older than ${cutoffString}...`);

      await this.db.withTransactionAsync(async () => {
        // Soft delete old messages (keep structure, mark as deleted)
        await this.db!.runAsync(`
          UPDATE messages 
          SET deleted_at = datetime('now') 
          WHERE created_at < ? AND deleted_at IS NULL
        `, [cutoffString]);

        // Clean up old notification counts
        await this.db!.runAsync(`
          DELETE FROM notification_counts 
          WHERE updated_at < ?
        `, [cutoffString]);

        console.log('Old data cleanup completed');
      });
    } catch (error) {
      console.error('Error cleaning up old data:', error);
    }
  }

  /**
   * Update a message
   */
  async updateMessage(message: Message): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.runAsync(`
        UPDATE messages 
        SET content = ?, 
            is_edited = ?, 
            edited_at = ?, 
            updated_at = ?
        WHERE id = ?
      `, [
        message.content,
        message.is_edited ? 1 : 0,
        message.edited_at,
        message.updated_at,
        message.id
      ]);
      
      console.log(`Message ${message.id} updated`);
    } catch (error) {
      console.error('Error updating message:', error);
      throw error;
    }
  }

  /**
   * Mark a message as deleted (soft delete)
   */
  async markMessageAsDeleted(messageId: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.runAsync(`
        UPDATE messages 
        SET deleted_at = datetime('now', 'utc')
        WHERE id = ?
      `, [messageId]);
      
      console.log(`Message ${messageId} marked as deleted`);
    } catch (error) {
      console.error('Error marking message as deleted:', error);
      throw error;
    }
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(messageIds: number[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    if (messageIds.length === 0) return;

    try {
      const placeholders = messageIds.map(() => '?').join(',');
      await this.db.runAsync(`
        UPDATE messages 
        SET is_read = 1, 
            read_at = datetime('now', 'utc')
        WHERE id IN (${placeholders})
      `, messageIds);
      
      console.log(`${messageIds.length} messages marked as read`);
    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw error;
    }
  }

  // ===== SETTINGS MANAGEMENT METHODS =====

  /**
   * Get user settings by user ID
   */
  async getUserSettings(userId: number): Promise<UserSettings | null> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const settings = await this.db.getFirstAsync<any>(`
        SELECT * FROM user_settings WHERE user_id = ?
      `, [userId]);

      if (!settings) return null;

      return {
        ...settings,
        // Convert INTEGER to boolean
        two_factor_enabled: Boolean(settings.two_factor_enabled),
        email_notifications_enabled: Boolean(settings.email_notifications_enabled),
        marketing_emails_enabled: Boolean(settings.marketing_emails_enabled),
        notify_matches: Boolean(settings.notify_matches),
        notify_messages: Boolean(settings.notify_messages),
        notify_likes: Boolean(settings.notify_likes),
        notify_super_likes: Boolean(settings.notify_super_likes),
        notify_visitors: Boolean(settings.notify_visitors),
        notify_new_features: Boolean(settings.notify_new_features),
        notify_marketing: Boolean(settings.notify_marketing),
        push_notifications_enabled: Boolean(settings.push_notifications_enabled),
        in_app_sounds_enabled: Boolean(settings.in_app_sounds_enabled),
        vibration_enabled: Boolean(settings.vibration_enabled),
        profile_visible: Boolean(settings.profile_visible),
        show_online_status: Boolean(settings.show_online_status),
        show_distance: Boolean(settings.show_distance),
        show_age: Boolean(settings.show_age),
        show_last_active: Boolean(settings.show_last_active),
        allow_messages_from_matches: Boolean(settings.allow_messages_from_matches),
        allow_messages_from_all: Boolean(settings.allow_messages_from_all),
        show_read_receipts: Boolean(settings.show_read_receipts),
        prevent_screenshots: Boolean(settings.prevent_screenshots),
        hide_from_contacts: Boolean(settings.hide_from_contacts),
        incognito_mode: Boolean(settings.incognito_mode),
        show_me_on_discovery: Boolean(settings.show_me_on_discovery),
        global_mode: Boolean(settings.global_mode),
        recently_active_only: Boolean(settings.recently_active_only),
        verified_profiles_only: Boolean(settings.verified_profiles_only),
        hide_already_seen_profiles: Boolean(settings.hide_already_seen_profiles),
        smart_photos: Boolean(settings.smart_photos),
        share_analytics_data: Boolean(settings.share_analytics_data),
        share_location_data: Boolean(settings.share_location_data),
        personalized_ads_enabled: Boolean(settings.personalized_ads_enabled),
        data_for_improvements: Boolean(settings.data_for_improvements),
        share_with_partners: Boolean(settings.share_with_partners),
        photo_verification_enabled: Boolean(settings.photo_verification_enabled),
        id_verification_enabled: Boolean(settings.id_verification_enabled),
        phone_verification_enabled: Boolean(settings.phone_verification_enabled),
        social_media_verification_enabled: Boolean(settings.social_media_verification_enabled),
        login_alerts_enabled: Boolean(settings.login_alerts_enabled),
        block_screenshots: Boolean(settings.block_screenshots),
        hide_from_facebook: Boolean(settings.hide_from_facebook),
        // Parse JSON arrays
        looking_for_preferences: settings.looking_for_preferences ? JSON.parse(settings.looking_for_preferences) : [],
        interest_preferences: settings.interest_preferences ? JSON.parse(settings.interest_preferences) : [],
      };
    } catch (error) {
      console.error('Error getting user settings:', error);
      return null;
    }
  }

  /**
   * Create or update user settings
   */
  async saveUserSettings(settings: UserSettings): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const now = new Date().toISOString();
      await this.db.runAsync(`
        INSERT OR REPLACE INTO user_settings (
          user_id, two_factor_enabled, email_notifications_enabled, marketing_emails_enabled,
          notify_matches, notify_messages, notify_likes, notify_super_likes, notify_visitors,
          notify_new_features, notify_marketing, push_notifications_enabled, in_app_sounds_enabled,
          vibration_enabled, quiet_hours_start, quiet_hours_end, profile_visible, profile_visibility_level,
          show_online_status, show_distance, show_age, age_display_type, show_last_active,
          allow_messages_from_matches, allow_messages_from_all, show_read_receipts, prevent_screenshots,
          hide_from_contacts, incognito_mode, show_me_on_discovery, global_mode, recently_active_only,
          verified_profiles_only, hide_already_seen_profiles, smart_photos, min_age, max_age,
          max_distance, looking_for_preferences, interest_preferences, share_analytics_data,
          share_location_data, personalized_ads_enabled, data_for_improvements, share_with_partners,
          photo_verification_enabled, id_verification_enabled, phone_verification_enabled,
          social_media_verification_enabled, login_alerts_enabled, block_screenshots, hide_from_facebook,
          created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
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
        settings.profile_visibility_level || 'everyone',
        settings.show_online_status ? 1 : 0,
        settings.show_distance ? 1 : 0,
        settings.show_age ? 1 : 0,
        settings.age_display_type || 'exact',
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
        settings.min_age || 18,
        settings.max_age || 35,
        settings.max_distance || 25,
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
        settings.created_at || now,
        now
      ]);
      
      console.log(`User settings saved for user ${settings.user_id}`);
    } catch (error) {
      console.error('Error saving user settings:', error);
      throw error;
    }
  }

  /**
   * Get blocked users for a user
   */
  async getBlockedUsers(userId: number): Promise<BlockedUser[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const blockedUsers = await this.db.getAllAsync<BlockedUser>(`
        SELECT * FROM blocked_users WHERE blocker_id = ? ORDER BY created_at DESC
      `, [userId]);

      return blockedUsers;
    } catch (error) {
      console.error('Error getting blocked users:', error);
      return [];
    }
  }

  /**
   * Block a user
   */
  async blockUser(blockedUser: BlockedUser): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const now = new Date().toISOString();
      await this.db.runAsync(`
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
        now
      ]);
      
      console.log(`User ${blockedUser.blocked_id} blocked by ${blockedUser.blocker_id}`);
    } catch (error) {
      console.error('Error blocking user:', error);
      throw error;
    }
  }

  /**
   * Unblock a user
   */
  async unblockUser(blockerId: number, blockedId: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.runAsync(`
        DELETE FROM blocked_users WHERE blocker_id = ? AND blocked_id = ?
      `, [blockerId, blockedId]);
      
      console.log(`User ${blockedId} unblocked by ${blockerId}`);
    } catch (error) {
      console.error('Error unblocking user:', error);
      throw error;
    }
  }

  /**
   * Check if a user is blocked
   */
  async isUserBlocked(blockerId: number, blockedId: number): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = await this.db.getFirstAsync<{ count: number }>(`
        SELECT COUNT(*) as count FROM blocked_users 
        WHERE blocker_id = ? AND blocked_id = ?
      `, [blockerId, blockedId]);

      return (result?.count || 0) > 0;
    } catch (error) {
      console.error('Error checking if user is blocked:', error);
      return false;
    }
  }

  /**
   * Save user feedback
   */
  async saveUserFeedback(feedback: UserFeedback): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const now = new Date().toISOString();
      await this.db.runAsync(`
        INSERT INTO user_feedback (
          user_id, email, feedback_text, category, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        feedback.user_id || null,
        feedback.email || null,
        feedback.feedback_text,
        feedback.category || 'general',
        feedback.status || 'pending',
        now,
        now
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
    if (!this.db) throw new Error('Database not initialized');

    try {
      let query = 'SELECT * FROM user_feedback';
      let params: any[] = [];

      if (userId) {
        query += ' WHERE user_id = ?';
        params.push(userId);
      }

      query += ' ORDER BY created_at DESC';

      const feedback = await this.db.getAllAsync<UserFeedback>(query, params);
      return feedback;
    } catch (error) {
      console.error('Error getting user feedback:', error);
      return [];
    }
  }

  /**
   * Save user report
   */
  async saveUserReport(report: UserReport): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const now = new Date().toISOString();
      await this.db.runAsync(`
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
        now,
        now
      ]);
      
      console.log(`User report saved: ${report.reporter_id} reported ${report.reported_id}`);
    } catch (error) {
      console.error('Error saving user report:', error);
      throw error;
    }
  }

  /**
   * Get user reports
   */
  async getUserReports(userId?: number): Promise<UserReport[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      let query = 'SELECT * FROM user_reports';
      let params: any[] = [];

      if (userId) {
        query += ' WHERE reporter_id = ?';
        params.push(userId);
      }

      query += ' ORDER BY created_at DESC';

      const reports = await this.db.getAllAsync<any>(query, params);
      
      return reports.map(report => ({
        ...report,
        evidence_urls: report.evidence_urls ? JSON.parse(report.evidence_urls) : []
      }));
    } catch (error) {
      console.error('Error getting user reports:', error);
      return [];
    }
  }

  /**
   * Save emergency contact
   */
  async saveEmergencyContact(contact: EmergencyContact): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const now = new Date().toISOString();
      await this.db.runAsync(`
        INSERT OR REPLACE INTO emergency_contacts (
          id, user_id, name, phone, relationship, is_primary, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        contact.id || null,
        contact.user_id,
        contact.name,
        contact.phone,
        contact.relationship || null,
        contact.is_primary ? 1 : 0,
        contact.created_at || now,
        now
      ]);
      
      console.log(`Emergency contact saved for user ${contact.user_id}`);
    } catch (error) {
      console.error('Error saving emergency contact:', error);
      throw error;
    }
  }

  /**
   * Get emergency contacts for a user
   */
  async getEmergencyContacts(userId: number): Promise<EmergencyContact[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const contacts = await this.db.getAllAsync<any>(`
        SELECT * FROM emergency_contacts WHERE user_id = ? ORDER BY is_primary DESC, created_at ASC
      `, [userId]);

      return contacts.map(contact => ({
        ...contact,
        is_primary: Boolean(contact.is_primary)
      }));
    } catch (error) {
      console.error('Error getting emergency contacts:', error);
      return [];
    }
  }

  /**
   * Delete emergency contact
   */
  async deleteEmergencyContact(contactId: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.runAsync(`
        DELETE FROM emergency_contacts WHERE id = ?
      `, [contactId]);
      
      console.log(`Emergency contact ${contactId} deleted`);
    } catch (error) {
      console.error('Error deleting emergency contact:', error);
      throw error;
    }
  }

  /**
   * Save data export request
   */
  async saveDataExportRequest(request: DataExportRequest): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const now = new Date().toISOString();
      await this.db.runAsync(`
        INSERT INTO data_export_requests (
          user_id, status, request_type, export_url, expires_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        request.user_id,
        request.status || 'pending',
        request.request_type || 'full_export',
        request.export_url || null,
        request.expires_at || null,
        now,
        now
      ]);
      
      console.log(`Data export request saved for user ${request.user_id}`);
    } catch (error) {
      console.error('Error saving data export request:', error);
      throw error;
    }
  }

  /**
   * Get data export requests for a user
   */
  async getDataExportRequests(userId: number): Promise<DataExportRequest[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const requests = await this.db.getAllAsync<DataExportRequest>(`
        SELECT * FROM data_export_requests WHERE user_id = ? ORDER BY created_at DESC
      `, [userId]);

      return requests;
    } catch (error) {
      console.error('Error getting data export requests:', error);
      return [];
    }
  }

  /**
   * Save account deletion request
   */
  async saveAccountDeletionRequest(request: AccountDeletionRequest): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const now = new Date().toISOString();
      await this.db.runAsync(`
        INSERT INTO account_deletion_requests (
          user_id, reason, scheduled_deletion_date, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [
        request.user_id,
        request.reason || null,
        request.scheduled_deletion_date || null,
        request.status || 'pending',
        now,
        now
      ]);
      
      console.log(`Account deletion request saved for user ${request.user_id}`);
    } catch (error) {
      console.error('Error saving account deletion request:', error);
      throw error;
    }
  }

  /**
   * Get user verification status
   */
  async getUserVerificationStatus(userId: number): Promise<UserVerificationStatus | null> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const status = await this.db.getFirstAsync<UserVerificationStatus>(`
        SELECT * FROM user_verification_status WHERE user_id = ?
      `, [userId]);

      return status || null;
    } catch (error) {
      console.error('Error getting user verification status:', error);
      return null;
    }
  }

  /**
   * Save user verification status
   */
  async saveUserVerificationStatus(status: UserVerificationStatus): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const now = new Date().toISOString();
      await this.db.runAsync(`
        INSERT OR REPLACE INTO user_verification_status (
          user_id, photo_verification_status, id_verification_status, 
          phone_verification_status, social_media_verification_status,
          photo_verification_date, id_verification_date, phone_verification_date,
          social_media_verification_date, created_at, updated_at
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
        status.created_at || now,
        now
      ]);
      
      console.log(`User verification status saved for user ${status.user_id}`);
    } catch (error) {
      console.error('Error saving user verification status:', error);
      throw error;
    }
  }

  /**
   * Save support ticket
   */
  async saveSupportTicket(ticket: SupportTicket): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const now = new Date().toISOString();
      await this.db.runAsync(`
        INSERT INTO support_tickets (
          user_id, subject, description, category, priority, status, 
          assigned_to, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        ticket.user_id,
        ticket.subject,
        ticket.description,
        ticket.category || 'general',
        ticket.priority || 'medium',
        ticket.status || 'open',
        ticket.assigned_to || null,
        now,
        now
      ]);
      
      console.log(`Support ticket saved for user ${ticket.user_id}`);
    } catch (error) {
      console.error('Error saving support ticket:', error);
      throw error;
    }
  }

  /**
   * Get support tickets for a user
   */
  async getSupportTickets(userId: number): Promise<SupportTicket[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const tickets = await this.db.getAllAsync<SupportTicket>(`
        SELECT * FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC
      `, [userId]);

      return tickets;
    } catch (error) {
      console.error('Error getting support tickets:', error);
      return [];
    }
  }

  /**
   * Save password change history
   */
  async savePasswordChangeHistory(history: PasswordChangeHistory): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const now = new Date().toISOString();
      await this.db.runAsync(`
        INSERT INTO password_change_history (
          user_id, change_type, ip_address, user_agent, created_at
        ) VALUES (?, ?, ?, ?, ?)
      `, [
        history.user_id,
        history.change_type || 'password_change',
        history.ip_address || null,
        history.user_agent || null,
        now
      ]);
      
      console.log(`Password change history saved for user ${history.user_id}`);
    } catch (error) {
      console.error('Error saving password change history:', error);
      throw error;
    }
  }

  /**
   * Save email change request
   */
  async saveEmailChangeRequest(request: EmailChangeRequest): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const now = new Date().toISOString();
      await this.db.runAsync(`
        INSERT INTO email_change_requests (
          user_id, old_email, new_email, verification_token, status, 
          expires_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        request.user_id,
        request.old_email,
        request.new_email,
        request.verification_token || null,
        request.status || 'pending',
        request.expires_at || null,
        now,
        now
      ]);
      
      console.log(`Email change request saved for user ${request.user_id}`);
    } catch (error) {
      console.error('Error saving email change request:', error);
      throw error;
    }
  }

  /**
   * Get email change requests for a user
   */
  async getEmailChangeRequests(userId: number): Promise<EmailChangeRequest[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const requests = await this.db.getAllAsync<EmailChangeRequest>(`
        SELECT * FROM email_change_requests WHERE user_id = ? ORDER BY created_at DESC
      `, [userId]);

      return requests;
    } catch (error) {
      console.error('Error getting email change requests:', error);
      return [];
    }
  }
}

// Export a singleton instance
export const sqliteService = new SQLiteService();
export default sqliteService;
