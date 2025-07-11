import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from 'expo-file-system';
import { Platform } from "react-native";

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

class SimpleImageCacheService {
  private config: ImageCacheConfig = {
    maxCacheSize: 50 * 1024 * 1024, // 50MB
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    enableCompression: true,
    enableProgressiveLoading: true,
  };

  private cacheDir: string;
  private isInitialized = false;
  private cacheKey = 'image_cache_metadata';

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

      this.isInitialized = true;
      console.log('SimpleImageCacheService initialized successfully');
    } catch (error) {
      console.error('Error initializing SimpleImageCacheService:', error);
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
   * Get cached image metadata from AsyncStorage
   */
  private async getCachedImage(cacheId: string): Promise<CachedImage | null> {
    try {
      const cacheData = await AsyncStorage.getItem(this.cacheKey);
      if (!cacheData) return null;

      const cache = JSON.parse(cacheData);
      const cachedImage = cache[cacheId];

      if (!cachedImage) return null;

      // Check if file still exists
      const fileInfo = await FileSystem.getInfoAsync(cachedImage.localPath);
      if (!fileInfo.exists) {
        // File was deleted, remove from cache
        await this.removeCachedImage(cacheId);
        return null;
      }

      return cachedImage;
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

      // Store in AsyncStorage
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
   * Store cached image metadata in AsyncStorage
   */
  private async storeCachedImage(cachedImage: CachedImage): Promise<void> {
    try {
      const cacheData = await AsyncStorage.getItem(this.cacheKey);
      const cache = cacheData ? JSON.parse(cacheData) : {};
      
      cache[cachedImage.id] = cachedImage;
      
      await AsyncStorage.setItem(this.cacheKey, JSON.stringify(cache));
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
      const cacheData = await AsyncStorage.getItem(this.cacheKey);
      if (!cacheData) return;

      const cache = JSON.parse(cacheData);
      if (cache[cacheId]) {
        cache[cacheId].lastAccessed = new Date().toISOString();
        await AsyncStorage.setItem(this.cacheKey, JSON.stringify(cache));
      }
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

      // Remove from AsyncStorage
      const cacheData = await AsyncStorage.getItem(this.cacheKey);
      if (cacheData) {
        const cache = JSON.parse(cacheData);
        delete cache[cacheId];
        await AsyncStorage.setItem(this.cacheKey, JSON.stringify(cache));
      }
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

      // Get all cached images
      const cacheData = await AsyncStorage.getItem(this.cacheKey);
      if (!cacheData) return;

      const cache = JSON.parse(cacheData);
      const images = Object.values(cache) as CachedImage[];

      // Sort by last accessed (oldest first)
      images.sort((a, b) => new Date(a.lastAccessed).getTime() - new Date(b.lastAccessed).getTime());

      // Remove old images until we're under the limit
      for (const image of images) {
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
      const cacheData = await AsyncStorage.getItem(this.cacheKey);
      if (!cacheData) return 0;

      const cache = JSON.parse(cacheData);
      const images = Object.values(cache) as CachedImage[];
      
      return images.reduce((total, image) => total + image.fileSize, 0);
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
      const cacheData = await AsyncStorage.getItem(this.cacheKey);
      if (cacheData) {
        const cache = JSON.parse(cacheData);
        
        // Delete all files
        for (const image of Object.values(cache) as CachedImage[]) {
          await FileSystem.deleteAsync(image.localPath, { idempotent: true });
        }
      }

      // Clear AsyncStorage
      await AsyncStorage.removeItem(this.cacheKey);

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
      const cacheData = await AsyncStorage.getItem(this.cacheKey);
      if (!cacheData) {
        return {
          totalImages: 0,
          totalSize: 0,
          profileImages: 0,
          chatMediaImages: 0,
        };
      }

      const cache = JSON.parse(cacheData);
      const images = Object.values(cache) as CachedImage[];

      const stats = {
        totalImages: images.length,
        totalSize: images.reduce((total, image) => total + image.fileSize, 0),
        profileImages: images.filter(img => img.type === 'profile').length,
        chatMediaImages: images.filter(img => img.type === 'chat_media').length,
      };

      return stats;
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
export const simpleImageCacheService = new SimpleImageCacheService(); 