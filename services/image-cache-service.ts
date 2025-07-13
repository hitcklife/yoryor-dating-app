import AsyncStorage from "@react-native-async-storage/async-storage";
import { sqliteService } from "./sqlite-service";
import { Platform, Image, AppState, DeviceEventEmitter } from "react-native";
import * as FileSystem from 'expo-file-system';
import NetInfo from '@react-native-community/netinfo';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

// === INTERFACES ===
export interface CachedImage {
  id: string;
  url: string;
  localPath: string;
  thumbnailPath?: string;
  type: 'profile' | 'chat_media' | 'gallery';
  userId?: number;
  chatId?: number;
  messageId?: number;
  size: 'thumbnail' | 'medium' | 'original';
  fileSize: number;
  width?: number;
  height?: number;
  blurhash?: string; // For progressive loading
  createdAt: string;
  lastAccessed: string;
  expiresAt?: string;
  downloadProgress?: number;
}

export interface ImageCacheConfig {
  maxCacheSize: number; // in bytes
  maxMemoryCacheSize: number; // in bytes
  maxAge: number; // in milliseconds
  enableCompression: boolean;
  enableProgressiveLoading: boolean;
  compressionQuality: number;
  thumbnailSize: { width: number; height: number };
  mediumSize: { width: number; height: number };
  // New optimization settings
  maxFileSizeBeforeCompression: number; // 1MB
  maxDimension: number; // 1920px
  enableWebP: boolean;
  enableCDNRewriting: boolean;
  cdnDomain?: string;
  backendDomain?: string;
  enableMemoryPressureHandling: boolean;
}

export interface MemoryCacheItem {
  data: string; // base64 or uri
  size: number;
  lastAccessed: Date;
  accessCount: number;
}

// === OPTIMIZED IMAGE CACHE SERVICE ===
class OptimizedImageCacheService {
  private config: ImageCacheConfig = {
    maxCacheSize: 200 * 1024 * 1024, // 200MB
    maxMemoryCacheSize: 50 * 1024 * 1024, // 50MB memory cache
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    enableCompression: true,
    enableProgressiveLoading: true,
    compressionQuality: 0.85, // 85% for photos
    thumbnailSize: { width: 50, height: 50 }, // Progressive loading thumbnails
    mediumSize: { width: 300, height: 300 }, // Progressive loading medium
    // New optimization settings
    maxFileSizeBeforeCompression: 1024 * 1024, // 1MB
    maxDimension: 1920, // 1920px max dimension
    enableWebP: true,
    enableCDNRewriting: true,
    cdnDomain: 'cdn.yourdomain.com', // Configure your CDN domain
    backendDomain: 'api.yourdomain.com', // Configure your backend domain
    enableMemoryPressureHandling: true,
  };

  private cacheDir: string;
  private isInitialized = false;
  
  // Memory cache for frequently accessed images
  private memoryCache = new Map<string, MemoryCacheItem>();
  private memoryCacheSize = 0;
  
  // Download queue to prevent duplicate downloads
  private downloadQueue = new Map<string, Promise<{ uri: string; blurhash?: string }>>();
  
  // Prefetch queue for background loading
  private prefetchQueue: string[] = [];
  private isPrefetching = false;

  // New optimization features
  private supportsWebP = false;
  private memoryWarningListener: any = null;
  private appStateListener: any = null;
  private progressiveLoadingQueues = new Map<string, { 
    thumbnail?: Promise<{ uri: string; blurhash?: string } | null>,
    medium?: Promise<{ uri: string; blurhash?: string } | null>,
    full?: Promise<{ uri: string; blurhash?: string } | null>
  }>();

  constructor() {
    this.cacheDir = `${FileSystem.cacheDirectory}optimized-images/`;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Create cache directories
      await this.createCacheDirectories();
      
      // Initialize database
      await this.initializeDatabase();
      
      // Detect WebP support
      await this.detectWebPSupport();
      
      // Setup memory pressure monitoring
      if (this.config.enableMemoryPressureHandling) {
        this.setupMemoryPressureHandling();
      }
      
      // Start periodic cleanup
      this.startPeriodicCleanup();
      
      // Monitor network for prefetching
      this.setupNetworkMonitoring();
      
      this.isInitialized = true;
      console.log('OptimizedImageCacheService initialized successfully');
    } catch (error) {
      console.error('Error initializing OptimizedImageCacheService:', error);
      throw error;
    }
  }

  private async createCacheDirectories(): Promise<void> {
    const dirs = [
      this.cacheDir,
      `${this.cacheDir}thumbnails/`,
      `${this.cacheDir}medium/`,
      `${this.cacheDir}original/`
    ];

    for (const dir of dirs) {
      const dirInfo = await FileSystem.getInfoAsync(dir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      }
    }
  }

  private async initializeDatabase(): Promise<void> {
    try {
      // Wait for SQLite service
      let attempts = 0;
      while (!sqliteService.isServiceInitialized() && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }
      
      if (!sqliteService.isServiceInitialized()) {
        throw new Error('SQLite service failed to initialize');
      }

      // Create optimized table with additional fields
      await sqliteService.executeSql(`
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

      // Create comprehensive indexes
      await sqliteService.executeSql(`
        CREATE INDEX IF NOT EXISTS idx_opt_cached_images_url_size 
        ON optimized_cached_images(url, size)
      `);
      await sqliteService.executeSql(`
        CREATE INDEX IF NOT EXISTS idx_opt_cached_images_type_last_accessed 
        ON optimized_cached_images(type, last_accessed)
      `);
      await sqliteService.executeSql(`
        CREATE INDEX IF NOT EXISTS idx_opt_cached_images_expires_at 
        ON optimized_cached_images(expires_at)
      `);
      await sqliteService.executeSql(`
        CREATE INDEX IF NOT EXISTS idx_opt_cached_images_access_count 
        ON optimized_cached_images(access_count DESC)
      `);

      console.log('Optimized image cache database initialized');
    } catch (error) {
      console.error('Error initializing optimized image cache database:', error);
      throw error;
    }
  }

  private async detectWebPSupport(): Promise<void> {
    try {
      if (Platform.OS === 'android') {
        // WebP is widely supported on Android
        this.supportsWebP = true;
      } else if (Platform.OS === 'ios') {
        // WebP support depends on iOS version (iOS 14+)
        const version = parseInt(Platform.Version as string);
        this.supportsWebP = version >= 14;
      } else {
        // For web and other platforms, assume support
        this.supportsWebP = true;
      }
      
      console.log(`WebP support detected: ${this.supportsWebP}`);
    } catch (error) {
      console.error('Error detecting WebP support:', error);
      this.supportsWebP = false;
    }
  }

  private setupMemoryPressureHandling(): void {
    try {
      // Listen for memory warnings on React Native
      if (Platform.OS !== 'web') {
        this.memoryWarningListener = DeviceEventEmitter.addListener(
          'MemoryWarning',
          this.handleMemoryWarning.bind(this)
        );
        
        // Also listen to app state changes for additional memory management
        this.appStateListener = AppState.addEventListener('change', this.handleAppStateChange.bind(this));
      }
      
      console.log('Memory pressure monitoring setup complete');
    } catch (error) {
      console.error('Error setting up memory pressure handling:', error);
    }
  }

  private handleMemoryWarning(): void {
    console.log('Memory warning received, clearing memory cache');
    this.clearMemoryCache();
  }

  private handleAppStateChange(nextAppState: string): void {
    if (nextAppState === 'background') {
      // Clear memory cache when app goes to background
      console.log('App backgrounded, clearing memory cache');
      this.clearMemoryCache();
    }
  }

  private clearMemoryCache(): void {
    this.memoryCache.clear();
    this.memoryCacheSize = 0;
    console.log('Memory cache cleared');
  }

  private optimizeImageUrl(originalUrl: string, type: 'profile' | 'chat_media' | 'gallery'): string {
    if (!this.config.enableCDNRewriting || !this.config.cdnDomain || !this.config.backendDomain) {
      return originalUrl;
    }

    try {
      const url = new URL(originalUrl);
      
      // Check if this is a backend URL that should be CDN-rewritten
      if (url.hostname === this.config.backendDomain) {
        // Replace backend domain with CDN domain
        const cdnUrl = new URL(originalUrl);
        cdnUrl.hostname = this.config.cdnDomain;
        
        // Add CloudFlare image optimization parameters
        const searchParams = new URLSearchParams();
        
        if (type === 'profile') {
          // For profile images, optimize for avatars
          searchParams.set('f', this.supportsWebP && this.config.enableWebP ? 'webp' : 'jpeg');
          searchParams.set('q', '90'); // Higher quality for profiles
          searchParams.set('w', '400'); // Profile size
          searchParams.set('h', '400');
          searchParams.set('fit', 'cover');
        } else if (type === 'chat_media') {
          // For chat media, balance quality and size
          searchParams.set('f', this.supportsWebP && this.config.enableWebP ? 'webp' : 'jpeg');
          searchParams.set('q', '85'); // Good quality for photos
          searchParams.set('w', '800'); // Chat media size
          searchParams.set('fit', 'scale-down');
        } else {
          // For gallery images, optimize for viewing
          searchParams.set('f', this.supportsWebP && this.config.enableWebP ? 'webp' : 'jpeg');
          searchParams.set('q', '90'); // High quality for gallery
          searchParams.set('w', '1200'); // Gallery size
          searchParams.set('fit', 'scale-down');
        }
        
        // Add optimization parameters to URL
        cdnUrl.search = searchParams.toString();
        return cdnUrl.toString();
      }
      
      return originalUrl;
    } catch (error) {
      console.error('Error optimizing image URL:', error);
      return originalUrl;
    }
  }

  // === MAIN PUBLIC API ===
  
  /**
   * Get cached image with progressive loading support
   */
  async getCachedImageUrl(
    imageUrl: string,
    type: 'profile' | 'chat_media' | 'gallery',
    options: {
      userId?: number;
      chatId?: number;
      messageId?: number;
      size?: 'thumbnail' | 'medium' | 'original';
      forceRefresh?: boolean;
      onProgress?: (progress: number) => void;
      returnBlurhash?: boolean;
      enableProgressive?: boolean;
    } = {}
  ): Promise<{ uri: string; blurhash?: string; isProgressive?: boolean } | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!imageUrl) return null;

    const { 
      userId, 
      chatId, 
      messageId, 
      size = 'medium', 
      forceRefresh = false,
      onProgress,
      returnBlurhash = true,
      enableProgressive = this.config.enableProgressiveLoading
    } = options;

    // Optimize URL for CDN if enabled
    const optimizedUrl = this.optimizeImageUrl(imageUrl, type);
    const baseId = this.generateCacheId(optimizedUrl, type, 'base');

    // Progressive loading: Always load thumbnail first, then requested size
    if (enableProgressive && size !== 'thumbnail') {
      return this.getProgressiveImage(optimizedUrl, type, {
        userId, chatId, messageId, size, forceRefresh, onProgress, returnBlurhash
      });
    }

    // Standard loading for thumbnail or when progressive is disabled
    return this.getSingleImage(optimizedUrl, type, {
      userId, chatId, messageId, size, forceRefresh, onProgress, returnBlurhash
    });
  }

  private async getProgressiveImage(
    imageUrl: string,
    type: 'profile' | 'chat_media' | 'gallery',
    options: {
      userId?: number;
      chatId?: number;
      messageId?: number;
      size: 'thumbnail' | 'medium' | 'original';
      forceRefresh?: boolean;
      onProgress?: (progress: number) => void;
      returnBlurhash?: boolean;
    }
  ): Promise<{ uri: string; blurhash?: string; isProgressive: boolean } | null> {
    const { size, returnBlurhash = true } = options;
    const baseId = this.generateCacheId(imageUrl, type, 'base');

    // Get or create progressive loading queue for this image
    if (!this.progressiveLoadingQueues.has(baseId)) {
      this.progressiveLoadingQueues.set(baseId, {});
    }
    const queue = this.progressiveLoadingQueues.get(baseId)!;

    try {
      // Step 1: Load thumbnail immediately
      if (!queue.thumbnail) {
        queue.thumbnail = this.getSingleImage(imageUrl, type, {
          ...options,
          size: 'thumbnail'
        });
      }

      // Start loading the requested size in background
      const sizeKey = size as keyof typeof queue;
      if (!queue[sizeKey]) {
        queue[sizeKey] = this.getSingleImage(imageUrl, type, options);
      }

      // Return thumbnail first for immediate display
      const thumbnailResult = await queue.thumbnail;
      
      // Check if higher quality is ready
      try {
        const fullResult = await Promise.race([
          queue[sizeKey]!,
          new Promise<null>(resolve => setTimeout(() => resolve(null), 100)) // 100ms timeout
        ]);

        if (fullResult) {
          // Higher quality is ready, return it
          return { ...fullResult, isProgressive: true };
        }
      } catch (error) {
        // Higher quality failed, continue with thumbnail
        console.log('Higher quality loading failed, using thumbnail');
      }

      // Return thumbnail with progressive flag
      return thumbnailResult ? { ...thumbnailResult, isProgressive: true } : null;

    } catch (error) {
      console.error('Error in progressive loading:', error);
      
      // Fallback to standard loading
      const result = await this.getSingleImage(imageUrl, type, options);
      return result ? { ...result, isProgressive: false } : null;
    }
  }

  private async getSingleImage(
    imageUrl: string,
    type: 'profile' | 'chat_media' | 'gallery',
    options: {
      userId?: number;
      chatId?: number;
      messageId?: number;
      size: 'thumbnail' | 'medium' | 'original';
      forceRefresh?: boolean;
      onProgress?: (progress: number) => void;
      returnBlurhash?: boolean;
    }
  ): Promise<{ uri: string; blurhash?: string } | null> {
    const { 
      userId, 
      chatId, 
      messageId, 
      size, 
      forceRefresh = false,
      onProgress,
      returnBlurhash = true 
    } = options;
    
    const cacheId = this.generateCacheId(imageUrl, type, size);

    try {
      // Check memory cache first
      const memoryItem = this.getFromMemoryCache(cacheId);
      if (memoryItem && !forceRefresh) {
        return { uri: memoryItem.data };
      }

      // Check disk cache
      if (!forceRefresh) {
        const cachedImage = await this.getCachedImageFromDB(cacheId);
        if (cachedImage && !this.isExpired(cachedImage)) {
          // Add to memory cache
          this.addToMemoryCache(cacheId, cachedImage.localPath);
          
          // Update access stats
          await this.updateAccessStats(cacheId);
          
          return {
            uri: cachedImage.localPath,
            blurhash: returnBlurhash ? cachedImage.blurhash : undefined
          };
        }
      }

      // Check if already downloading
      const existingDownload = this.downloadQueue.get(cacheId);
      if (existingDownload) {
        const result = await existingDownload;
        return result;
      }

      // Download and cache with progress tracking
      const downloadPromise = this.downloadAndCacheImageWithProgress(
        imageUrl, 
        cacheId, 
        type, 
        { userId, chatId, messageId, size },
        onProgress
      );
      
      this.downloadQueue.set(cacheId, downloadPromise);
      
      try {
        const result = await downloadPromise;
        return result;
      } finally {
        this.downloadQueue.delete(cacheId);
      }

    } catch (error) {
      console.error('Error getting cached image:', error);
      return { uri: imageUrl }; // Fallback to original URL
    }
  }

  /**
   * Preload images for better performance
   */
  async preloadImages(
    imageUrls: string[],
    type: 'profile' | 'chat_media' | 'gallery',
    options: {
      userId?: number;
      size?: 'thumbnail' | 'medium' | 'original';
      priority?: 'high' | 'low';
    } = {}
  ): Promise<void> {
    const { priority = 'low' } = options;

    if (priority === 'high') {
      // Load immediately in parallel
      const promises = imageUrls.map(url => 
        this.getCachedImageUrl(url, type, { ...options, returnBlurhash: false })
          .catch(err => console.error(`Error preloading ${url}:`, err))
      );
      await Promise.all(promises);
    } else {
      // Add to prefetch queue for background loading
      this.prefetchQueue.push(...imageUrls.map(url => 
        JSON.stringify({ url, type, options })
      ));
      this.processPrefetchQueue();
    }
  }

  // === PRIVATE METHODS ===

  private async downloadAndCacheImageWithProgress(
    imageUrl: string,
    cacheId: string,
    type: 'profile' | 'chat_media' | 'gallery',
    options: {
      userId?: number;
      chatId?: number;
      messageId?: number;
      size: 'thumbnail' | 'medium' | 'original';
    },
    onProgress?: (progress: number) => void
  ): Promise<{ uri: string; blurhash?: string }> {
    const { userId, chatId, messageId, size } = options;
    const sizeDir = size === 'thumbnail' ? 'thumbnails/' : size === 'medium' ? 'medium/' : 'original/';
    const fileName = `${cacheId}.jpg`;
    const localPath = `${this.cacheDir}${sizeDir}${fileName}`;

    try {
      // Create download resumable for progress tracking
      const downloadResumable = FileSystem.createDownloadResumable(
        imageUrl,
        localPath,
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          onProgress?.(progress);
        }
      );

      const downloadResult = await downloadResumable.downloadAsync();
      if (!downloadResult || downloadResult.status !== 200) {
        throw new Error(`Failed to download image: ${downloadResult?.status}`);
      }

      // Process image based on size
      let processedPath = localPath;
      let thumbnailPath: string | undefined;
      let dimensions: { width?: number; height?: number } = {};
      let blurhash: string | undefined;

      if (this.config.enableCompression && size !== 'original') {
        const processed = await this.processImage(localPath, size, type);
        processedPath = processed.uri;
        dimensions = { width: processed.width, height: processed.height };
      } else if (size === 'original') {
        // Even for original size, we might need compression for large files
        const processed = await this.processImage(localPath, size, type);
        processedPath = processed.uri;
        dimensions = { width: processed.width, height: processed.height };
      }
      
      // Generate thumbnail for progressive loading
      if (size === 'medium' || size === 'original') {
        const thumbnail = await this.generateThumbnail(localPath);
        thumbnailPath = thumbnail.uri;
        blurhash = await this.generateBlurhash(thumbnail.uri);
      }

      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(processedPath);
      const fileSize = fileInfo.exists ? (fileInfo as any).size || 0 : 0;

      // Store in database
      await this.storeCachedImage({
        id: cacheId,
        url: imageUrl,
        localPath: processedPath,
        thumbnailPath,
        type,
        userId,
        chatId,
        messageId,
        size,
        fileSize,
        width: dimensions.width,
        height: dimensions.height,
        blurhash,
        createdAt: new Date().toISOString(),
        lastAccessed: new Date().toISOString(),
        expiresAt: new Date(Date.now() + this.config.maxAge).toISOString(),
      });

      // Add to memory cache
      this.addToMemoryCache(cacheId, processedPath);

      // Clean up if needed
      await this.cleanupCacheIfNeeded();

      console.log(`Image cached successfully: ${cacheId}`);
      return { uri: processedPath, blurhash };

    } catch (error) {
      console.error('Error downloading and caching image:', error);
      throw error;
    }
  }

  private async processImage(
    imagePath: string,
    size: 'thumbnail' | 'medium' | 'original',
    type: 'profile' | 'chat_media' | 'gallery' = 'chat_media'
  ): Promise<{ uri: string; width: number; height: number }> {
    try {
      // Check file size first
      const fileInfo = await FileSystem.getInfoAsync(imagePath);
      const fileSize = fileInfo.exists ? (fileInfo as any).size || 0 : 0;
      
      console.log(`Processing image: ${imagePath}, size: ${fileSize} bytes, target: ${size}`);

      // For original size, check if compression is needed based on file size
      if (size === 'original') {
        if (fileSize > this.config.maxFileSizeBeforeCompression) {
          console.log('Original image exceeds size limit, compressing...');
          return this.compressLargeImage(imagePath, type);
        }
        return { uri: imagePath, width: 0, height: 0 };
      }

      // For thumbnail and medium, always process
      const targetSize = size === 'thumbnail' 
        ? this.config.thumbnailSize 
        : this.config.mediumSize;

      // Determine format based on type and WebP support
      let format = SaveFormat.JPEG;
      let quality = this.config.compressionQuality;

      if (type === 'profile') {
        // For profile images (avatars), use PNG to preserve transparency if needed
        // or WebP if supported
        if (this.supportsWebP && this.config.enableWebP) {
          format = SaveFormat.WEBP;
        } else {
          format = SaveFormat.PNG; // Better for avatars
        }
        quality = 0.9; // Higher quality for profiles
      } else {
        // For photos, use JPEG or WebP
        if (this.supportsWebP && this.config.enableWebP) {
          format = SaveFormat.WEBP;
        } else {
          format = SaveFormat.JPEG;
        }
        quality = this.config.compressionQuality; // 85% for photos
      }

      const result = await manipulateAsync(
        imagePath,
        [{ resize: targetSize }],
        {
          compress: quality,
          format: format
        }
      );

      console.log(`Image processed: ${result.width}x${result.height}, format: ${format}`);

      return {
        uri: result.uri,
        width: result.width,
        height: result.height
      };
    } catch (error) {
      console.error('Error processing image:', error);
      // Return original if processing fails
      return { uri: imagePath, width: 0, height: 0 };
    }
  }

  private async compressLargeImage(
    imagePath: string,
    type: 'profile' | 'chat_media' | 'gallery'
  ): Promise<{ uri: string; width: number; height: number }> {
    try {
      // Get original image dimensions
      const imageInfo = await FileSystem.getInfoAsync(imagePath);
      
      // Use expo-image-manipulator to get image info and compress
      let format = SaveFormat.JPEG;
      let quality = this.config.compressionQuality;

      if (type === 'profile') {
        if (this.supportsWebP && this.config.enableWebP) {
          format = SaveFormat.WEBP;
        } else {
          format = SaveFormat.PNG;
        }
        quality = 0.9;
      } else {
        if (this.supportsWebP && this.config.enableWebP) {
          format = SaveFormat.WEBP;
        } else {
          format = SaveFormat.JPEG;
        }
        quality = this.config.compressionQuality;
      }

      // First, get original dimensions by manipulating without changes
      const originalInfo = await manipulateAsync(imagePath, [], {});
      const originalWidth = originalInfo.width;
      const originalHeight = originalInfo.height;

      // Calculate new dimensions maintaining aspect ratio
      let newWidth = originalWidth;
      let newHeight = originalHeight;
      
      if (originalWidth > this.config.maxDimension || originalHeight > this.config.maxDimension) {
        const aspectRatio = originalWidth / originalHeight;
        
        if (originalWidth > originalHeight) {
          newWidth = this.config.maxDimension;
          newHeight = Math.round(this.config.maxDimension / aspectRatio);
        } else {
          newHeight = this.config.maxDimension;
          newWidth = Math.round(this.config.maxDimension * aspectRatio);
        }
      }

      console.log(`Compressing large image: ${originalWidth}x${originalHeight} -> ${newWidth}x${newHeight}`);

      const result = await manipulateAsync(
        imagePath,
        newWidth !== originalWidth || newHeight !== originalHeight 
          ? [{ resize: { width: newWidth, height: newHeight } }]
          : [],
        {
          compress: quality,
          format: format
        }
      );

      return {
        uri: result.uri,
        width: result.width,
        height: result.height
      };
    } catch (error) {
      console.error('Error compressing large image:', error);
      return { uri: imagePath, width: 0, height: 0 };
    }
  }

  private async generateThumbnail(imagePath: string): Promise<{ uri: string }> {
    try {
      const result = await manipulateAsync(
        imagePath,
        [{ resize: { width: 50, height: 50 } }],
        {
          compress: 0.5,
          format: SaveFormat.JPEG
        }
      );
      return { uri: result.uri };
    } catch (error) {
      console.error('Error generating thumbnail:', error);
      return { uri: imagePath };
    }
  }

  private async generateBlurhash(imagePath: string): Promise<string | undefined> {
    // TODO: Implement blurhash generation
    // For now, return undefined
    return undefined;
  }

  // === MEMORY CACHE MANAGEMENT ===

  private getFromMemoryCache(cacheId: string): MemoryCacheItem | null {
    const item = this.memoryCache.get(cacheId);
    if (item) {
      item.lastAccessed = new Date();
      item.accessCount++;
      return item;
    }
    return null;
  }

  private addToMemoryCache(cacheId: string, uri: string): void {
    // Estimate size (rough estimate: 4 bytes per character for base64)
    const estimatedSize = uri.length * 4;
    
    // Check if we need to evict items
    while (this.memoryCacheSize + estimatedSize > this.config.maxMemoryCacheSize) {
      this.evictFromMemoryCache();
    }

    const item: MemoryCacheItem = {
      data: uri,
      size: estimatedSize,
      lastAccessed: new Date(),
      accessCount: 1
    };

    this.memoryCache.set(cacheId, item);
    this.memoryCacheSize += estimatedSize;
  }

  private evictFromMemoryCache(): void {
    if (this.memoryCache.size === 0) return;

    // Find least recently used item with lowest access count
    let lruKey: string | null = null;
    let lruItem: MemoryCacheItem | null = null;
    let minScore = Infinity;

    for (const [key, item] of this.memoryCache) {
      // Score based on last access time and access count
      const ageMs = Date.now() - item.lastAccessed.getTime();
      const score = ageMs / (item.accessCount + 1);
      
      if (score > minScore) {
        minScore = score;
        lruKey = key;
        lruItem = item;
      }
    }

    if (lruKey && lruItem) {
      this.memoryCache.delete(lruKey);
      this.memoryCacheSize -= lruItem.size;
    }
  }

  // === DATABASE OPERATIONS ===

  private async getCachedImageFromDB(cacheId: string): Promise<CachedImage | null> {
    try {
      const result = await sqliteService.executeSql(`
        SELECT * FROM optimized_cached_images WHERE id = ?
      `, [cacheId]);

      if (!result || result.length === 0) return null;

      const row = result[0];
      
      // Verify file exists
      const fileInfo = await FileSystem.getInfoAsync(row.local_path);
      if (!fileInfo.exists) {
        await this.removeCachedImage(cacheId);
        return null;
      }

      return this.rowToCachedImage(row);
    } catch (error) {
      console.error('Error getting cached image from DB:', error);
      return null;
    }
  }

  private async storeCachedImage(cachedImage: CachedImage): Promise<void> {
    try {
      await sqliteService.executeSql(`
        INSERT OR REPLACE INTO optimized_cached_images (
          id, url, local_path, thumbnail_path, type, user_id, chat_id, message_id, 
          size, file_size, width, height, blurhash, created_at, last_accessed, expires_at, access_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
      `, [
        cachedImage.id,
        cachedImage.url,
        cachedImage.localPath,
        cachedImage.thumbnailPath || null,
        cachedImage.type,
        cachedImage.userId || null,
        cachedImage.chatId || null,
        cachedImage.messageId || null,
        cachedImage.size,
        cachedImage.fileSize,
        cachedImage.width || null,
        cachedImage.height || null,
        cachedImage.blurhash || null,
        cachedImage.createdAt,
        cachedImage.lastAccessed,
        cachedImage.expiresAt || null
      ]);
    } catch (error) {
      console.error('Error storing cached image:', error);
      throw error;
    }
  }

  private async updateAccessStats(cacheId: string): Promise<void> {
    try {
      await sqliteService.executeSql(`
        UPDATE optimized_cached_images 
        SET last_accessed = ?, access_count = access_count + 1 
        WHERE id = ?
      `, [new Date().toISOString(), cacheId]);
    } catch (error) {
      console.error('Error updating access stats:', error);
    }
  }

  private async removeCachedImage(cacheId: string): Promise<void> {
    try {
      const cachedImage = await this.getCachedImageFromDB(cacheId);
      if (cachedImage) {
        // Delete files
        await FileSystem.deleteAsync(cachedImage.localPath, { idempotent: true });
        if (cachedImage.thumbnailPath) {
          await FileSystem.deleteAsync(cachedImage.thumbnailPath, { idempotent: true });
        }
      }

      // Remove from database
      await sqliteService.executeSql(`
        DELETE FROM optimized_cached_images WHERE id = ?
      `, [cacheId]);

      // Remove from memory cache
      const memItem = this.memoryCache.get(cacheId);
      if (memItem) {
        this.memoryCacheSize -= memItem.size;
        this.memoryCache.delete(cacheId);
      }
    } catch (error) {
      console.error('Error removing cached image:', error);
    }
  }

  // === CLEANUP & MAINTENANCE ===

  private async cleanupCacheIfNeeded(): Promise<void> {
    try {
      const totalSize = await this.getCacheSize();
      if (totalSize <= this.config.maxCacheSize) return;

      console.log(`Cache size (${totalSize}) exceeds limit (${this.config.maxCacheSize}). Cleaning up...`);

      // Remove expired images first
      await sqliteService.executeSql(`
        DELETE FROM optimized_cached_images 
        WHERE expires_at < ?
      `, [new Date().toISOString()]);

      // If still over limit, remove least accessed images
      const currentSize = await this.getCacheSize();
      if (currentSize > this.config.maxCacheSize) {
        const imagesToRemove = await sqliteService.executeSql(`
          SELECT id FROM optimized_cached_images 
          ORDER BY access_count ASC, last_accessed ASC
          LIMIT 50
        `);

        for (const image of imagesToRemove) {
          await this.removeCachedImage(image.id);
          
          const newSize = await this.getCacheSize();
          if (newSize <= this.config.maxCacheSize * 0.8) break;
        }
      }
    } catch (error) {
      console.error('Error cleaning up cache:', error);
    }
  }

  private async getCacheSize(): Promise<number> {
    try {
      const result = await sqliteService.executeSql(`
        SELECT SUM(file_size) as totalSize FROM optimized_cached_images
      `);
      return result?.[0]?.totalSize || 0;
    } catch (error) {
      console.error('Error getting cache size:', error);
      return 0;
    }
  }

  private startPeriodicCleanup(): void {
    // Run cleanup every hour
    setInterval(() => {
      this.cleanupCacheIfNeeded().catch(console.error);
    }, 60 * 60 * 1000);
  }

  // === NETWORK MONITORING ===

  private setupNetworkMonitoring(): void {
    NetInfo.addEventListener(state => {
      if (state.isConnected && state.isInternetReachable) {
        // Resume prefetching on good connection
        if (state.type === 'wifi' && this.prefetchQueue.length > 0) {
          this.processPrefetchQueue();
        }
      }
    });
  }

  private async processPrefetchQueue(): Promise<void> {
    if (this.isPrefetching || this.prefetchQueue.length === 0) return;

    this.isPrefetching = true;

    try {
      const netInfo = await NetInfo.fetch();
      // Only prefetch on WiFi
      if (netInfo.type !== 'wifi') {
        this.isPrefetching = false;
        return;
      }

      while (this.prefetchQueue.length > 0) {
        const item = this.prefetchQueue.shift();
        if (!item) continue;

        try {
          const { url, type, options } = JSON.parse(item);
          await this.getCachedImageUrl(url, type, options);
        } catch (error) {
          console.error('Error prefetching image:', error);
        }

        // Small delay between prefetches
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } finally {
      this.isPrefetching = false;
    }
  }

  // === UTILITY METHODS ===

  private generateCacheId(url: string, type: string, size: string): string {
    const hash = this.simpleHash(url + type + size);
    return `${type}_${size}_${hash}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private isExpired(cachedImage: CachedImage): boolean {
    if (!cachedImage.expiresAt) return false;
    return new Date(cachedImage.expiresAt) < new Date();
  }

  private rowToCachedImage(row: any): CachedImage {
    return {
      id: row.id,
      url: row.url,
      localPath: row.local_path,
      thumbnailPath: row.thumbnail_path,
      type: row.type,
      userId: row.user_id,
      chatId: row.chat_id,
      messageId: row.message_id,
      size: row.size,
      fileSize: row.file_size,
      width: row.width,
      height: row.height,
      blurhash: row.blurhash,
      createdAt: row.created_at,
      lastAccessed: row.last_accessed,
      expiresAt: row.expires_at
    };
  }

  // === PUBLIC UTILITY METHODS ===

  async clearCache(): Promise<void> {
    try {
      // Clear memory cache
      this.memoryCache.clear();
      this.memoryCacheSize = 0;

      // Get all cached images
      const images = await sqliteService.executeSql(`
        SELECT local_path, thumbnail_path FROM optimized_cached_images
      `);

      // Delete all files
      for (const image of images) {
        await FileSystem.deleteAsync(image.local_path, { idempotent: true });
        if (image.thumbnail_path) {
          await FileSystem.deleteAsync(image.thumbnail_path, { idempotent: true });
        }
      }

      // Clear database
      await sqliteService.executeSql(`DELETE FROM optimized_cached_images`);

      console.log('Optimized image cache cleared successfully');
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Cleanup resources when service is destroyed
   */
  destroy(): void {
    try {
      // Remove memory warning listener
      if (this.memoryWarningListener) {
        this.memoryWarningListener.remove();
        this.memoryWarningListener = null;
      }

      // Remove app state listener
      if (this.appStateListener) {
        this.appStateListener.remove();
        this.appStateListener = null;
      }

      // Clear progressive loading queues
      this.progressiveLoadingQueues.clear();

      // Clear memory cache
      this.clearMemoryCache();

      console.log('ImageCacheService destroyed successfully');
    } catch (error) {
      console.error('Error destroying ImageCacheService:', error);
    }
  }

  async getCacheStats(): Promise<{
    totalImages: number;
    totalSize: number;
    profileImages: number;
    chatMediaImages: number;
    galleryImages: number;
    memoryCacheSize: number;
    memoryCacheItems: number;
    avgAccessCount: number;
  }> {
    try {
      const stats = await sqliteService.executeSql(`
        SELECT 
          COUNT(*) as totalImages,
          SUM(file_size) as totalSize,
          SUM(CASE WHEN type = 'profile' THEN 1 ELSE 0 END) as profileImages,
          SUM(CASE WHEN type = 'chat_media' THEN 1 ELSE 0 END) as chatMediaImages,
          SUM(CASE WHEN type = 'gallery' THEN 1 ELSE 0 END) as galleryImages,
          AVG(access_count) as avgAccessCount
        FROM optimized_cached_images
      `);

      const result = stats?.[0];

      return {
        totalImages: result?.totalImages || 0,
        totalSize: result?.totalSize || 0,
        profileImages: result?.profileImages || 0,
        chatMediaImages: result?.chatMediaImages || 0,
        galleryImages: result?.galleryImages || 0,
        memoryCacheSize: this.memoryCacheSize,
        memoryCacheItems: this.memoryCache.size,
        avgAccessCount: result?.avgAccessCount || 0
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {
        totalImages: 0,
        totalSize: 0,
        profileImages: 0,
        chatMediaImages: 0,
        galleryImages: 0,
        memoryCacheSize: 0,
        memoryCacheItems: 0,
        avgAccessCount: 0
      };
    }
  }
}

// Export singleton instance
export const imageCacheService = new OptimizedImageCacheService(); 