import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import { PerformanceWrapper, WrappedConnection } from './performance-wrapper';

export interface DatabaseVersionInfo {
  exists: boolean;
  version: number;
}

export interface DatabaseStats {
  totalChats: number;
  totalMessages: number;
  totalUsers: number;
  totalPhotos: number;
  avgMessagesPerChat: number;
  dbSize: number;
}

/**
 * Database Connection Manager
 * Handles database initialization, migrations, and connection pooling
 */
export class ConnectionManager {
  private db: SQLite.SQLiteDatabase | null = null;
  private dbVersion = 5;
  private _isInitialized: boolean = false;
  private lastError: Error | null = null;
  private connectionPool: SQLite.SQLiteDatabase[] = [];
  private maxPoolSize = 5;
  private currentPoolSize = 0;

  constructor() {
    this.initDatabase()
      .then(() => {
        this._isInitialized = true;
        console.log('Database connection manager initialized successfully');
      })
      .catch(error => {
        this.lastError = error;
        console.error('Error initializing database connection manager:', error);
      });
  }

  /**
   * Get database connection with pooling support
   */
  async getConnection(): Promise<WrappedConnection> {
    if (!this.isInitialized) {
      await this.waitForInitialization();
    }

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    // Return wrapped connection with performance monitoring
    return PerformanceWrapper.wrapConnection(this.db);
  }

  /**
   * Get raw database connection (for internal use)
   */
  async getRawConnection(): Promise<SQLite.SQLiteDatabase> {
    if (!this.isInitialized) {
      await this.waitForInitialization();
    }

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return this.db;
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
        await this.createIndexes();
        await this.createVersionTable();
        console.log('New database setup completed');
      } else if (versionInfo.version < this.dbVersion) {
        console.log(`Database needs migration from version ${versionInfo.version} to ${this.dbVersion}`);
        await this.migrateDatabase(versionInfo.version, this.dbVersion);
        console.log('Database migration completed');
      }

      this._isInitialized = true;
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

        // User settings table
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

        // Additional settings tables
        await this.createSettingsTables();

        // Optimized cached images table
        await this.db!.execAsync(`
          CREATE TABLE IF NOT EXISTS optimized_cached_images (
            id TEXT PRIMARY KEY,
            url TEXT NOT NULL,
            local_path TEXT NOT NULL,
            thumbnail_path TEXT,
            type TEXT NOT NULL,
            user_id INTEGER,
            chat_id INTEGER,
            message_id INTEGER,
            size TEXT NOT NULL,
            file_size INTEGER NOT NULL,
            width INTEGER,
            height INTEGER,
            blurhash TEXT,
            created_at TEXT NOT NULL,
            last_accessed TEXT NOT NULL,
            expires_at TEXT,
            access_count INTEGER DEFAULT 0
          )
        `);

        console.log('All tables created successfully');
      });
    } catch (error) {
      console.error('Error creating tables:', error);
      throw error;
    }
  }

  /**
   * Create settings-related tables
   */
  private async createSettingsTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Blocked users table
    await this.db.execAsync(`
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
    await this.db.execAsync(`
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
    await this.db.execAsync(`
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
    await this.db.execAsync(`
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

    // Additional settings tables
    await this.db.execAsync(`
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

    await this.db.execAsync(`
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

    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS password_change_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        change_type TEXT DEFAULT 'password_change',
        ip_address TEXT,
        user_agent TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.db.execAsync(`
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

    await this.db.execAsync(`
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

    await this.db.execAsync(`
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
  }

  /**
   * Create database indexes for optimal performance
   */
  private async createIndexes(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      console.log('Creating database indexes...');
      
      // Chat indexes
      await this.db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_chats_last_activity ON chats (last_activity_at DESC);
        CREATE INDEX IF NOT EXISTS idx_chats_deleted ON chats (deleted_at);
        CREATE INDEX IF NOT EXISTS idx_chats_type ON chats (type);
      `);
      
      // Message indexes
      await this.db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages (chat_id);
        CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON messages (sent_at DESC);
        CREATE INDEX IF NOT EXISTS idx_messages_chat_sent ON messages (chat_id, sent_at DESC);
        CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages (sender_id);
        CREATE INDEX IF NOT EXISTS idx_messages_deleted ON messages (deleted_at);
        CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages (is_read);
        CREATE INDEX IF NOT EXISTS idx_messages_status ON messages (status);
      `);
      
      // User and profile indexes
      await this.db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_other_users_chat_id ON other_users (chat_id);
        CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles (user_id);
        CREATE INDEX IF NOT EXISTS idx_profile_photos_user_id ON profile_photos (user_id);
        CREATE INDEX IF NOT EXISTS idx_profile_photos_is_profile ON profile_photos (is_profile_photo);
      `);
      
      // Notification indexes
      await this.db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_notification_counts_user_id ON notification_counts (user_id);
      `);
      
      // Settings indexes
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
      
      // Cached images indexes
      await this.db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_opt_cached_images_url_size ON optimized_cached_images(url, size);
        CREATE INDEX IF NOT EXISTS idx_opt_cached_images_type_last_accessed ON optimized_cached_images(type, last_accessed);
        CREATE INDEX IF NOT EXISTS idx_opt_cached_images_expires_at ON optimized_cached_images(expires_at);
        CREATE INDEX IF NOT EXISTS idx_opt_cached_images_access_count ON optimized_cached_images(access_count DESC);
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
  private async checkDatabaseVersion(): Promise<DatabaseVersionInfo> {
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
        
        const tableInfo = await this.db.getAllAsync<any>(`
          PRAGMA table_info(messages)
        `);
        
        const hasIsRead = tableInfo.some((col: any) => col.name === 'is_read');
        const hasReadAt = tableInfo.some((col: any) => col.name === 'read_at');
        
        if (!hasIsRead) {
          await this.db.execAsync(`
            ALTER TABLE messages ADD COLUMN is_read INTEGER DEFAULT 0
          `);
        }
        
        if (!hasReadAt) {
          await this.db.execAsync(`
            ALTER TABLE messages ADD COLUMN read_at TEXT
          `);
        }
      }

      // Migration from version 2 to 3: Add notification_counts table
      if (fromVersion < 3 && toVersion >= 3) {
        console.log('Adding notification_counts table...');
        
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
          
          await this.db.execAsync(`
            CREATE INDEX idx_notification_counts_user_id ON notification_counts (user_id)
          `);
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
   * Reset the database by dropping all tables and recreating them
   */
  async resetDatabase(): Promise<void> {
    if (!this.db) {
      // If database is not initialized, try to open it
      this.db = await SQLite.openDatabaseAsync('yoryor_chats.db');
    }

    try {
      console.log('Resetting database...');
      
      // Drop all tables
      await this.db.execAsync(`
        DROP TABLE IF EXISTS chats;
        DROP TABLE IF EXISTS messages;
        DROP TABLE IF EXISTS other_users;
        DROP TABLE IF EXISTS profiles;
        DROP TABLE IF EXISTS profile_photos;
        DROP TABLE IF EXISTS notification_counts;
        DROP TABLE IF EXISTS user_settings;
        DROP TABLE IF EXISTS blocked_users;
        DROP TABLE IF EXISTS user_feedback;
        DROP TABLE IF EXISTS user_reports;
        DROP TABLE IF EXISTS emergency_contacts;
        DROP TABLE IF EXISTS data_export_requests;
        DROP TABLE IF EXISTS account_deletion_requests;
        DROP TABLE IF EXISTS password_change_history;
        DROP TABLE IF EXISTS email_change_requests;
        DROP TABLE IF EXISTS user_verification_status;
        DROP TABLE IF EXISTS support_tickets;
        DROP TABLE IF EXISTS optimized_cached_images;
        DROP TABLE IF EXISTS database_version;
      `);

      // Recreate all tables
      await this.createTables();
      await this.createIndexes();
      await this.createVersionTable();

      console.log('Database reset completed successfully');
    } catch (error) {
      console.error('Error resetting database:', error);
      throw error;
    }
  }

  /**
   * Execute custom SQL with parameters (with performance monitoring)
   */
  async executeSql(sql: string, params: any[] = []): Promise<any> {
    const db = await this.getConnection();
    
    try {
      if (sql.trim().toUpperCase().startsWith('SELECT')) {
        return await db.getAllAsync(sql, params);
      } else {
        return await db.runAsync(sql, params);
      }
    } catch (error) {
      console.error('Error executing SQL:', error);
      throw error;
    }
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats(): Promise<DatabaseStats> {
    const db = await this.getConnection();
    
    const totalChats = await db.getFirstAsync<{ count: number }>(`
      SELECT COUNT(*) as count FROM chats WHERE deleted_at IS NULL
    `);
    
    const totalMessages = await db.getFirstAsync<{ count: number }>(`
      SELECT COUNT(*) as count FROM messages WHERE deleted_at IS NULL
    `);
    
    const totalUsers = await db.getFirstAsync<{ count: number }>(`
      SELECT COUNT(*) as count FROM other_users WHERE deleted_at IS NULL
    `);
    
    const totalPhotos = await db.getFirstAsync<{ count: number }>(`
      SELECT COUNT(*) as count FROM profile_photos WHERE deleted_at IS NULL
    `);
    
    const avgMessages = await db.getFirstAsync<{ avg: number }>(`
      SELECT AVG(message_count) as avg FROM (
        SELECT COUNT(*) as message_count FROM messages 
        WHERE deleted_at IS NULL GROUP BY chat_id
      )
    `);

    // Get database file size
    let dbSize = 0;
    try {
      const dbPath = `${FileSystem.documentDirectory}SQLite/yoryor_chats.db`;
      const fileInfo = await FileSystem.getInfoAsync(dbPath);
      if (fileInfo.exists) {
        dbSize = fileInfo.size || 0;
      }
    } catch (error) {
      console.warn('Could not get database file size:', error);
    }

    return {
      totalChats: totalChats?.count || 0,
      totalMessages: totalMessages?.count || 0,
      totalUsers: totalUsers?.count || 0,
      totalPhotos: totalPhotos?.count || 0,
      avgMessagesPerChat: avgMessages?.avg || 0,
      dbSize
    };
  }

  /**
   * Optimize database performance
   */
  async optimizeDatabase(): Promise<void> {
    const db = await this.getConnection();
    
    try {
      console.log('Starting database optimization...');
      
      // Analyze and optimize tables
      await db.execAsync('ANALYZE');
      
      // Vacuum to reclaim space
      await db.execAsync('VACUUM');
      
      // Update statistics
      await db.execAsync('PRAGMA optimize');
      
      console.log('Database optimization completed');
    } catch (error) {
      console.error('Error optimizing database:', error);
      throw error;
    }
  }

  /**
   * Clean up old data
   */
  async cleanupOldData(daysToKeep: number = 30): Promise<void> {
    const db = await this.getConnection();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffDateStr = cutoffDate.toISOString();

    try {
      console.log(`Cleaning up data older than ${daysToKeep} days...`);
      
      await db.withTransactionAsync(async () => {
        // Clean up old deleted messages
        await db.runAsync(`
          DELETE FROM messages 
          WHERE deleted_at IS NOT NULL AND deleted_at < ?
        `, [cutoffDateStr]);

        // Clean up old cached images
        await db.runAsync(`
          DELETE FROM optimized_cached_images 
          WHERE expires_at IS NOT NULL AND expires_at < ?
        `, [cutoffDateStr]);

        // Clean up old export requests
        await db.runAsync(`
          DELETE FROM data_export_requests 
          WHERE status = 'completed' AND created_at < ?
        `, [cutoffDateStr]);
      });
      
      console.log('Old data cleanup completed');
    } catch (error) {
      console.error('Error cleaning up old data:', error);
      throw error;
    }
  }

  /**
   * Wait for database initialization
   */
  private async waitForInitialization(): Promise<void> {
    let attempts = 0;
    const maxAttempts = 50;
    
    while (!this._isInitialized && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (!this._isInitialized) {
      throw new Error('Database initialization timeout');
    }
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this._isInitialized;
  }

  /**
   * Get last error
   */
  getLastError(): Error | null {
    return this.lastError;
  }

  /**
   * Close database connection
   */
  async closeDatabase(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
      this._isInitialized = false;
      console.log('Database connection closed');
    }
  }
}

// Export a singleton instance
export const connectionManager = new ConnectionManager(); 