import AsyncStorage from "@react-native-async-storage/async-storage";
import { sqliteService } from "./sqlite-service";
import { Platform } from "react-native";
import * as FileSystem from 'expo-file-system';

export interface CachedImage {
  id: string;
  url: string;
  localPath: string;
  type: 'profile' | 'chat_media';
  userId?: number;
  chatId?: number;
  messageId?: number;
  size: 'thumbnail' | 'medium' | 'original';
  fileSize: number;
  createdAt: string;
  lastAccessed: string;
  expiresAt?: string;
}

export interface ImageCacheConfig {
  maxCacheSize: number; // in bytes
  maxAge: number; // in milliseconds
  enableCompression: boolean;
  enableProgressiveLoading: boolean;
}

class ImageCacheService {
  private config: ImageCacheConfig = {
    maxCacheSize: 100 * 1024 * 1024, // 100MB
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    enableCompression: true,
    enableProgressiveLoading: true,
  };

  private cacheDir: string;
  private isInitialized = false;

  constructor() {
    this.cacheDir = `${FileSystem.cacheDirectory}image-cache/`;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Create cache directory if it doesn't exist
      const dirInfo = await FileSystem.getInfoAsync(this.cacheDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.cacheDir, { intermediates: true });
      }

      // Initialize database tables
      await this.initializeDatabase();

      this.isInitialized = true;
      console.log('ImageCacheService initialized successfully');
    } catch (error) {
      console.error('Error initializing ImageCacheService:', error);
      throw error;
    }
  }

  private async initializeDatabase(): Promise<void> {
    try {
      // Wait for SQLite service to be ready
      let attempts = 0;
      const maxAttempts = 10;
      
      while (!sqliteService.isServiceInitialized() && attempts < maxAttempts) {
        console.log(`Waiting for SQLite service to initialize... (attempt ${attempts + 1}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }
      
      if (!sqliteService.isServiceInitialized()) {
        throw new Error('SQLite service failed to initialize');
      }

      // Create the cached_images table
      await sqliteService.executeSql(`
        CREATE TABLE IF NOT EXISTS cached_images (
          id TEXT PRIMARY KEY,
          url TEXT NOT NULL,
          local_path TEXT NOT NULL,
          type TEXT NOT NULL,
          user_id INTEGER,
          chat_id INTEGER,
          message_id INTEGER,
          size TEXT NOT NULL,
          file_size INTEGER NOT NULL,
          created_at TEXT NOT NULL,
          last_accessed TEXT NOT NULL,
          expires_at TEXT
        )
      `);

      // Create indexes for better performance
      await sqliteService.executeSql(`
        CREATE INDEX IF NOT EXISTS idx_cached_images_url ON cached_images(url)
      `);
      await sqliteService.executeSql(`
        CREATE INDEX IF NOT EXISTS idx_cached_images_type ON cached_images(type)
      `);
      await sqliteService.executeSql(`
        CREATE INDEX IF NOT EXISTS idx_cached_images_user_id ON cached_images(user_id)
      `);
      await sqliteService.executeSql(`
        CREATE INDEX IF NOT EXISTS idx_cached_images_chat_id ON cached_images(chat_id)
      `);
      await sqliteService.executeSql(`
        CREATE INDEX IF NOT EXISTS idx_cached_images_last_accessed ON cached_images(last_accessed)
      `);

      console.log('Image cache database initialized');
    } catch (error) {
      console.error('Error initializing image cache database:', error);
      throw error;
    }
  }

  /**
   * Get cached image URL or download and cache if not available
   */
  async getCachedImageUrl(
    imageUrl: string,
    type: 'profile' | 'chat_media',
    options: {
      userId?: number;
      chatId?: number;
      messageId?: number;
      size?: 'thumbnail' | 'medium' | 'original';
      forceRefresh?: boolean;
    } = {}
  ): Promise<string | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!imageUrl) return null;

    const { userId, chatId, messageId, size = 'medium', forceRefresh = false } = options;
    const cacheId = this.generateCacheId(imageUrl, type, size);

    try {
      // Check if image is already cached and not expired
      if (!forceRefresh) {
        const cachedImage = await this.getCachedImage(cacheId);
        if (cachedImage && !this.isExpired(cachedImage)) {
          // Update last accessed time
          await this.updateLastAccessed(cacheId);
          return cachedImage.localPath;
        }
      }

      // Download and cache the image
      const localPath = await this.downloadAndCacheImage(imageUrl, cacheId, type, {
        userId,
        chatId,
        messageId,
        size,
      });

      return localPath;
    } catch (error) {
      console.error('Error getting cached image:', error);
      // Return original URL as fallback
      return imageUrl;
    }
  }

  /**
   * Get cached image metadata
   */
  private async getCachedImage(cacheId: string): Promise<CachedImage | null> {
    try {
      const result = await sqliteService.executeSql(`
        SELECT * FROM cached_images WHERE id = ?
      `, [cacheId]);

      if (!result || result.length === 0) return null;

      const cachedImage = result[0];

      // Check if file still exists
      const fileInfo = await FileSystem.getInfoAsync(cachedImage.local_path);
      if (!fileInfo.exists) {
        // File was deleted, remove from database
        await this.removeCachedImage(cacheId);
        return null;
      }

      return {
        id: cachedImage.id,
        url: cachedImage.url,
        localPath: cachedImage.local_path,
        type: cachedImage.type as 'profile' | 'chat_media',
        userId: cachedImage.user_id,
        chatId: cachedImage.chat_id,
        messageId: cachedImage.message_id,
        size: cachedImage.size as 'thumbnail' | 'medium' | 'original',
        fileSize: cachedImage.file_size,
        createdAt: cachedImage.created_at,
        lastAccessed: cachedImage.last_accessed,
        expiresAt: cachedImage.expires_at,
      };
    } catch (error) {
      console.error('Error getting cached image:', error);
      return null;
    }
  }

  /**
   * Download and cache an image
   */
  private async downloadAndCacheImage(
    imageUrl: string,
    cacheId: string,
    type: 'profile' | 'chat_media',
    options: {
      userId?: number;
      chatId?: number;
      messageId?: number;
      size: 'thumbnail' | 'medium' | 'original';
    }
  ): Promise<string> {
    const { userId, chatId, messageId, size } = options;
    const fileName = `${cacheId}.jpg`;
    const localPath = `${this.cacheDir}${fileName}`;

    try {
      // Download the image
      const downloadResult = await FileSystem.downloadAsync(imageUrl, localPath);

      if (downloadResult.status !== 200) {
        throw new Error(`Failed to download image: ${downloadResult.status}`);
      }

      // Get file size
      const fileInfo = await FileSystem.getInfoAsync(localPath);
      const fileSize = fileInfo.exists ? (fileInfo as any).size || 0 : 0;

      // Store in database
      await this.storeCachedImage({
        id: cacheId,
        url: imageUrl,
        localPath,
        type,
        userId,
        chatId,
        messageId,
        size,
        fileSize,
        createdAt: new Date().toISOString(),
        lastAccessed: new Date().toISOString(),
        expiresAt: new Date(Date.now() + this.config.maxAge).toISOString(),
      });

      // Clean up old cache if needed
      await this.cleanupCache();

      console.log(`Image cached successfully: ${cacheId}`);
      return localPath;
    } catch (error) {
      console.error('Error downloading and caching image:', error);
      throw error;
    }
  }

  /**
   * Store cached image metadata in database
   */
  private async storeCachedImage(cachedImage: CachedImage): Promise<void> {
    try {
      await sqliteService.executeSql(`
        INSERT OR REPLACE INTO cached_images (
          id, url, local_path, type, user_id, chat_id, message_id, 
          size, file_size, created_at, last_accessed, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        cachedImage.id,
        cachedImage.url,
        cachedImage.localPath,
        cachedImage.type,
        cachedImage.userId || null,
        cachedImage.chatId || null,
        cachedImage.messageId || null,
        cachedImage.size,
        cachedImage.fileSize,
        cachedImage.createdAt,
        cachedImage.lastAccessed,
        cachedImage.expiresAt || null,
      ]);
    } catch (error) {
      console.error('Error storing cached image:', error);
      throw error;
    }
  }

  /**
   * Update last accessed time for cached image
   */
  private async updateLastAccessed(cacheId: string): Promise<void> {
    try {
      await sqliteService.executeSql(`
        UPDATE cached_images SET last_accessed = ? WHERE id = ?
      `, [new Date().toISOString(), cacheId]);
    } catch (error) {
      console.error('Error updating last accessed time:', error);
    }
  }

  /**
   * Remove cached image
   */
  async removeCachedImage(cacheId: string): Promise<void> {
    try {
      // Get local path
      const cachedImage = await this.getCachedImage(cacheId);
      if (cachedImage) {
        // Delete file
        await FileSystem.deleteAsync(cachedImage.localPath, { idempotent: true });
      }

      // Remove from database
      await sqliteService.executeSql(`
        DELETE FROM cached_images WHERE id = ?
      `, [cacheId]);
    } catch (error) {
      console.error('Error removing cached image:', error);
    }
  }

  /**
   * Clean up old cache entries
   */
  private async cleanupCache(): Promise<void> {
    try {
      // Get total cache size
      const totalSize = await this.getCacheSize();
      if (totalSize <= this.config.maxCacheSize) {
        return;
      }

      // Get old and least accessed images
      const oldImages = await sqliteService.executeSql(`
        SELECT * FROM cached_images 
        WHERE expires_at < ? OR last_accessed < ?
        ORDER BY last_accessed ASC
      `, [
        new Date().toISOString(),
        new Date(Date.now() - this.config.maxAge).toISOString(),
      ]);

      // Remove old images until we're under the limit
      for (const image of oldImages) {
        await this.removeCachedImage(image.id);
        
        const newSize = await this.getCacheSize();
        if (newSize <= this.config.maxCacheSize * 0.8) { // Leave 20% buffer
          break;
        }
      }
    } catch (error) {
      console.error('Error cleaning up cache:', error);
    }
  }

  /**
   * Get total cache size
   */
  private async getCacheSize(): Promise<number> {
    try {
      const result = await sqliteService.executeSql(`
        SELECT SUM(file_size) as totalSize FROM cached_images
      `);
      return result && result.length > 0 ? result[0].totalSize || 0 : 0;
    } catch (error) {
      console.error('Error getting cache size:', error);
      return 0;
    }
  }

  /**
   * Check if cached image is expired
   */
  private isExpired(cachedImage: CachedImage): boolean {
    if (!cachedImage.expiresAt) return false;
    return new Date(cachedImage.expiresAt) < new Date();
  }

  /**
   * Generate cache ID for image
   */
  private generateCacheId(
    imageUrl: string,
    type: 'profile' | 'chat_media',
    size: 'thumbnail' | 'medium' | 'original'
  ): string {
    // Create a hash of the URL and parameters
    const hash = this.simpleHash(imageUrl + type + size);
    return `${type}_${size}_${hash}`;
  }

  /**
   * Simple hash function
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Clear all cached images
   */
  async clearCache(): Promise<void> {
    try {
      // Get all cached images
      const cachedImages = await sqliteService.executeSql(`
        SELECT * FROM cached_images
      `);

      // Delete all files
      for (const image of cachedImages) {
        await FileSystem.deleteAsync(image.local_path, { idempotent: true });
      }

      // Clear database
      await sqliteService.executeSql(`DELETE FROM cached_images`);

      console.log('Image cache cleared successfully');
    } catch (error) {
      console.error('Error clearing image cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalImages: number;
    totalSize: number;
    profileImages: number;
    chatMediaImages: number;
  }> {
    try {
      const stats = await sqliteService.executeSql(`
        SELECT 
          COUNT(*) as totalImages,
          SUM(file_size) as totalSize,
          SUM(CASE WHEN type = 'profile' THEN 1 ELSE 0 END) as profileImages,
          SUM(CASE WHEN type = 'chat_media' THEN 1 ELSE 0 END) as chatMediaImages
        FROM cached_images
      `);

      const result = stats && stats.length > 0 ? stats[0] : null;

      return {
        totalImages: result?.totalImages || 0,
        totalSize: result?.totalSize || 0,
        profileImages: result?.profileImages || 0,
        chatMediaImages: result?.chatMediaImages || 0,
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {
        totalImages: 0,
        totalSize: 0,
        profileImages: 0,
        chatMediaImages: 0,
      };
    }
  }

  /**
   * Preload images for better performance
   */
  async preloadImages(
    imageUrls: string[],
    type: 'profile' | 'chat_media',
    options: {
      userId?: number;
      size?: 'thumbnail' | 'medium' | 'original';
    } = {}
  ): Promise<void> {
    const { userId, size = 'medium' } = options;

    try {
      const preloadPromises = imageUrls.map(async (url) => {
        try {
          await this.getCachedImageUrl(url, type, {
            userId,
            size,
            forceRefresh: false,
          });
        } catch (error) {
          console.error(`Error preloading image ${url}:`, error);
        }
      });

      await Promise.all(preloadPromises);
      console.log(`Preloaded ${imageUrls.length} images`);
    } catch (error) {
      console.error('Error preloading images:', error);
    }
  }
}

// Export singleton instance
export const imageCacheService = new ImageCacheService(); 