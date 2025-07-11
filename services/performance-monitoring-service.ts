import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

// Performance metric types
export interface PerformanceMetric {
  name: string;
  category: 'api' | 'database' | 'websocket' | 'image' | 'ui' | 'system';
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  metadata?: Record<string, any>;
  error?: string;
}

export interface PerformanceSnapshot {
  timestamp: Date;
  metrics: {
    // API Performance
    apiCallCount: number;
    apiAverageResponseTime: number;
    apiErrorRate: number;
    apiCacheHitRate: number;
    
    // WebSocket Performance
    wsConnectionState: string;
    wsConnectionQuality: string;
    wsReconnectCount: number;
    wsMessageQueueSize: number;
    wsActiveChannels: number;
    wsLatency: number;
    
    // Database Performance
    dbQueryCount: number;
    dbAverageQueryTime: number;
    dbCacheHitRate: number;
    dbStorageSize: number;
    
    // Image Cache Performance
    imageCacheSize: number;
    imageCacheHitRate: number;
    imageLoadTime: number;
    imageMemoryCacheSize: number;
    
    // Memory & System
    memoryUsage: number;
    jsHeapSize?: number;
    networkType: string;
    batteryLevel?: number;
  };
}

interface PerformanceThresholds {
  apiResponseTime: number;
  wsLatency: number;
  dbQueryTime: number;
  imageLoadTime: number;
  memoryUsage: number;
}

class PerformanceMonitoringService {
  private metrics: PerformanceMetric[] = [];
  private maxMetricsInMemory = 1000;
  private isMonitoring = false;
  
  // Performance counters
  private counters = {
    apiCalls: 0,
    apiErrors: 0,
    apiCacheHits: 0,
    dbQueries: 0,
    dbCacheHits: 0,
    imageCacheHits: 0,
    imageCacheMisses: 0
  };
  
  // Performance thresholds for alerts
  private thresholds: PerformanceThresholds = {
    apiResponseTime: 3000, // 3 seconds
    wsLatency: 500, // 500ms
    dbQueryTime: 100, // 100ms
    imageLoadTime: 2000, // 2 seconds
    memoryUsage: 500 * 1024 * 1024 // 500MB
  };
  
  // Monitoring intervals
  private snapshotInterval: any = null;
  private cleanupInterval: any = null;

  constructor() {
    this.setupMonitoring();
  }

  private setupMonitoring(): void {
    // Monitor app state changes
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      // React Native specific monitoring setup
      this.setupMemoryMonitoring();
      this.setupNetworkMonitoring();
    }
  }

  // Start monitoring
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('Performance monitoring started');
    
    // Take snapshots every minute
    this.snapshotInterval = setInterval(() => {
      this.takePerformanceSnapshot();
    }, 60000);
    
    // Cleanup old metrics every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldMetrics();
    }, 300000);
    
    // Take initial snapshot
    await this.takePerformanceSnapshot();
  }

  // Stop monitoring
  stopMonitoring(): void {
    this.isMonitoring = false;
    
    if (this.snapshotInterval) {
      clearInterval(this.snapshotInterval);
      this.snapshotInterval = null;
    }
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    console.log('Performance monitoring stopped');
  }

  // Track a performance metric
  startMetric(name: string, category: PerformanceMetric['category'], metadata?: Record<string, any>): string {
    const metric: PerformanceMetric = {
      name,
      category,
      startTime: Date.now(),
      success: true,
      metadata
    };
    
    // Generate unique ID
    const metricId = `${category}-${name}-${metric.startTime}`;
    
    // Store metric temporarily
    this.metrics.push(metric);
    
    // Cleanup if too many metrics
    if (this.metrics.length > this.maxMetricsInMemory) {
      this.metrics.shift();
    }
    
    return metricId;
  }

  // Complete a metric
  endMetric(metricId: string, success: boolean = true, error?: string): void {
    const parts = metricId.split('-');
    const startTime = parseInt(parts[parts.length - 1]);
    
    const metric = this.metrics.find(m => m.startTime === startTime);
    if (metric) {
      metric.endTime = Date.now();
      metric.duration = metric.endTime - metric.startTime;
      metric.success = success;
      if (error) metric.error = error;
      
      // Update counters
      this.updateCounters(metric);
      
      // Check thresholds
      this.checkThresholds(metric);
    }
  }

  // Track API call
  trackApiCall(endpoint: string, method: string, success: boolean, duration: number, cached: boolean = false): void {
    this.counters.apiCalls++;
    if (!success) this.counters.apiErrors++;
    if (cached) this.counters.apiCacheHits++;
    
    const metric: PerformanceMetric = {
      name: `${method} ${endpoint}`,
      category: 'api',
      startTime: Date.now() - duration,
      endTime: Date.now(),
      duration,
      success,
      metadata: { endpoint, method, cached }
    };
    
    this.metrics.push(metric);
    this.checkThresholds(metric);
  }

  // Track database query
  trackDatabaseQuery(query: string, duration: number, cached: boolean = false): void {
    this.counters.dbQueries++;
    if (cached) this.counters.dbCacheHits++;
    
    const metric: PerformanceMetric = {
      name: 'DB Query',
      category: 'database',
      startTime: Date.now() - duration,
      endTime: Date.now(),
      duration,
      success: true,
      metadata: { query: query.substring(0, 100), cached }
    };
    
    this.metrics.push(metric);
    this.checkThresholds(metric);
  }

  // Track WebSocket metrics
  trackWebSocketMetrics(metrics: {
    connectionState: string;
    quality: string;
    reconnectCount: number;
    queueSize: number;
    activeChannels: number;
    latency: number;
  }): void {
    const metric: PerformanceMetric = {
      name: 'WebSocket Status',
      category: 'websocket',
      startTime: Date.now(),
      success: metrics.connectionState === 'connected',
      metadata: metrics
    };
    
    this.metrics.push(metric);
    
    if (metrics.latency > this.thresholds.wsLatency) {
      this.reportPerformanceIssue('websocket', 'High WebSocket latency detected', metrics);
    }
  }

  // Track image cache
  trackImageCache(hit: boolean, loadTime?: number): void {
    if (hit) {
      this.counters.imageCacheHits++;
    } else {
      this.counters.imageCacheMisses++;
    }
    
    if (loadTime) {
      const metric: PerformanceMetric = {
        name: 'Image Load',
        category: 'image',
        startTime: Date.now() - loadTime,
        endTime: Date.now(),
        duration: loadTime,
        success: true,
        metadata: { cacheHit: hit }
      };
      
      this.metrics.push(metric);
      this.checkThresholds(metric);
    }
  }

  // Get performance statistics
  getPerformanceStats(): {
    apiStats: { averageResponseTime: number; errorRate: number; cacheHitRate: number };
    dbStats: { averageQueryTime: number; cacheHitRate: number };
    imageStats: { cacheHitRate: number; averageLoadTime: number };
  } {
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;
    
    // Filter recent metrics
    const recentMetrics = this.metrics.filter(m => m.startTime > fiveMinutesAgo);
    
    // API stats
    const apiMetrics = recentMetrics.filter(m => m.category === 'api' && m.duration);
    const apiAvgTime = apiMetrics.length > 0 
      ? apiMetrics.reduce((sum, m) => sum + (m.duration || 0), 0) / apiMetrics.length 
      : 0;
    const apiErrorRate = this.counters.apiCalls > 0 
      ? this.counters.apiErrors / this.counters.apiCalls 
      : 0;
    const apiCacheHitRate = this.counters.apiCalls > 0 
      ? this.counters.apiCacheHits / this.counters.apiCalls 
      : 0;
    
    // DB stats
    const dbMetrics = recentMetrics.filter(m => m.category === 'database' && m.duration);
    const dbAvgTime = dbMetrics.length > 0 
      ? dbMetrics.reduce((sum, m) => sum + (m.duration || 0), 0) / dbMetrics.length 
      : 0;
    const dbCacheHitRate = this.counters.dbQueries > 0 
      ? this.counters.dbCacheHits / this.counters.dbQueries 
      : 0;
    
    // Image stats
    const imageMetrics = recentMetrics.filter(m => m.category === 'image' && m.duration);
    const imageAvgTime = imageMetrics.length > 0 
      ? imageMetrics.reduce((sum, m) => sum + (m.duration || 0), 0) / imageMetrics.length 
      : 0;
    const imageCacheHitRate = (this.counters.imageCacheHits + this.counters.imageCacheMisses) > 0 
      ? this.counters.imageCacheHits / (this.counters.imageCacheHits + this.counters.imageCacheMisses) 
      : 0;
    
    return {
      apiStats: {
        averageResponseTime: apiAvgTime,
        errorRate: apiErrorRate,
        cacheHitRate: apiCacheHitRate
      },
      dbStats: {
        averageQueryTime: dbAvgTime,
        cacheHitRate: dbCacheHitRate
      },
      imageStats: {
        cacheHitRate: imageCacheHitRate,
        averageLoadTime: imageAvgTime
      }
    };
  }

  // Take performance snapshot
  private async takePerformanceSnapshot(): Promise<void> {
    try {
      const stats = this.getPerformanceStats();
      const networkState = await NetInfo.fetch();
      
      // Get service-specific metrics
      const { webSocketService } = await import('./websocket-service');
      const { chatsService } = await import('./chats-service');
      const { optimizedImageCacheService } = await import('./optimized-image-cache-service');
      const { sqliteService } = await import('./sqlite-service');
      
      const wsMetrics = webSocketService.getConnectionMetrics();
      const imageCacheStats = await optimizedImageCacheService.getCacheStats();
      const dbStats = await sqliteService.getDatabaseStats();
      
      const snapshot: PerformanceSnapshot = {
        timestamp: new Date(),
        metrics: {
          // API Performance
          apiCallCount: this.counters.apiCalls,
          apiAverageResponseTime: stats.apiStats.averageResponseTime,
          apiErrorRate: stats.apiStats.errorRate,
          apiCacheHitRate: stats.apiStats.cacheHitRate,
          
          // WebSocket Performance
          wsConnectionState: webSocketService.getConnectionState(),
          wsConnectionQuality: wsMetrics.quality,
          wsReconnectCount: wsMetrics.reconnectCount,
          wsMessageQueueSize: webSocketService.getQueueSize(),
          wsActiveChannels: webSocketService.getActiveChannelCount(),
          wsLatency: wsMetrics.latencyMs,
          
          // Database Performance
          dbQueryCount: this.counters.dbQueries,
          dbAverageQueryTime: stats.dbStats.averageQueryTime,
          dbCacheHitRate: stats.dbStats.cacheHitRate,
          dbStorageSize: dbStats.dbSize || 0,
          
          // Image Cache Performance
          imageCacheSize: imageCacheStats.totalSize,
          imageCacheHitRate: stats.imageStats.cacheHitRate,
          imageLoadTime: stats.imageStats.averageLoadTime,
          imageMemoryCacheSize: imageCacheStats.memoryCacheSize,
          
          // Memory & System
          memoryUsage: await this.getMemoryUsage(),
          networkType: networkState.type || 'unknown'
        }
      };
      
      // Store snapshot
      await this.storeSnapshot(snapshot);
      
      // Log summary
      console.log('Performance Snapshot:', {
        api: `${stats.apiStats.averageResponseTime.toFixed(0)}ms avg, ${(stats.apiStats.errorRate * 100).toFixed(1)}% errors`,
        ws: `${wsMetrics.quality} quality, ${wsMetrics.latencyMs}ms latency`,
        db: `${stats.dbStats.averageQueryTime.toFixed(0)}ms avg queries`,
        cache: `${(stats.imageStats.cacheHitRate * 100).toFixed(1)}% image cache hits`
      });
      
    } catch (error) {
      console.error('Error taking performance snapshot:', error);
    }
  }

  // Store snapshot for historical analysis
  private async storeSnapshot(snapshot: PerformanceSnapshot): Promise<void> {
    try {
      const key = `perf_snapshot_${snapshot.timestamp.getTime()}`;
      await AsyncStorage.setItem(key, JSON.stringify(snapshot));
      
      // Keep only last 24 hours of snapshots
      this.cleanupOldSnapshots();
    } catch (error) {
      console.error('Error storing performance snapshot:', error);
    }
  }

  // Get historical snapshots
  async getHistoricalSnapshots(hours: number = 24): Promise<PerformanceSnapshot[]> {
    try {
      const cutoffTime = Date.now() - hours * 60 * 60 * 1000;
      const keys = await AsyncStorage.getAllKeys();
      const perfKeys = keys.filter(k => k.startsWith('perf_snapshot_'));
      
      const snapshots: PerformanceSnapshot[] = [];
      
      for (const key of perfKeys) {
        const timestamp = parseInt(key.replace('perf_snapshot_', ''));
        if (timestamp > cutoffTime) {
          const data = await AsyncStorage.getItem(key);
          if (data) {
            const snapshot = JSON.parse(data);
            snapshot.timestamp = new Date(snapshot.timestamp);
            snapshots.push(snapshot);
          }
        }
      }
      
      return snapshots.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } catch (error) {
      console.error('Error getting historical snapshots:', error);
      return [];
    }
  }

  // Memory monitoring
  private setupMemoryMonitoring(): void {
    // Platform-specific memory monitoring
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      // React Native doesn't have direct memory API
      // Would need native module for accurate memory stats
    }
  }

  // Network monitoring
  private setupNetworkMonitoring(): void {
    NetInfo.addEventListener(state => {
      const metric: PerformanceMetric = {
        name: 'Network Change',
        category: 'system',
        startTime: Date.now(),
        success: state.isConnected || false,
        metadata: {
          type: state.type,
          isConnected: state.isConnected,
          isInternetReachable: state.isInternetReachable
        }
      };
      
      this.metrics.push(metric);
    });
  }

  // Get memory usage (simplified)
  private async getMemoryUsage(): Promise<number> {
    // This would need a native module for accurate memory stats
    // For now, return a placeholder
    return 0;
  }

  // Update counters based on metric
  private updateCounters(metric: PerformanceMetric): void {
    switch (metric.category) {
      case 'api':
        if (!metric.success) this.counters.apiErrors++;
        if (metric.metadata?.cached) this.counters.apiCacheHits++;
        break;
      case 'database':
        if (metric.metadata?.cached) this.counters.dbCacheHits++;
        break;
    }
  }

  // Check performance thresholds
  private checkThresholds(metric: PerformanceMetric): void {
    if (!metric.duration) return;
    
    let threshold = 0;
    let metricType = '';
    
    switch (metric.category) {
      case 'api':
        threshold = this.thresholds.apiResponseTime;
        metricType = 'API response time';
        break;
      case 'database':
        threshold = this.thresholds.dbQueryTime;
        metricType = 'Database query time';
        break;
      case 'image':
        threshold = this.thresholds.imageLoadTime;
        metricType = 'Image load time';
        break;
    }
    
    if (threshold > 0 && metric.duration > threshold) {
      this.reportPerformanceIssue(metric.category, `High ${metricType}: ${metric.duration}ms`, metric);
    }
  }

  // Report performance issues
  private reportPerformanceIssue(category: string, message: string, details: any): void {
    console.warn(`[Performance Warning] ${category}: ${message}`, details);
    
    // Could send to analytics service or error tracking
    // For now, just log
  }

  // Cleanup old metrics
  private cleanupOldMetrics(): void {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    this.metrics = this.metrics.filter(m => m.startTime > oneHourAgo);
  }

  // Cleanup old snapshots
  private async cleanupOldSnapshots(): Promise<void> {
    try {
      const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours
      const keys = await AsyncStorage.getAllKeys();
      const perfKeys = keys.filter(k => k.startsWith('perf_snapshot_'));
      
      for (const key of perfKeys) {
        const timestamp = parseInt(key.replace('perf_snapshot_', ''));
        if (timestamp < cutoffTime) {
          await AsyncStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.error('Error cleaning up old snapshots:', error);
    }
  }

  // Reset counters
  resetCounters(): void {
    this.counters = {
      apiCalls: 0,
      apiErrors: 0,
      apiCacheHits: 0,
      dbQueries: 0,
      dbCacheHits: 0,
      imageCacheHits: 0,
      imageCacheMisses: 0
    };
  }

  // Export performance report
  async exportPerformanceReport(): Promise<string> {
    const stats = this.getPerformanceStats();
    const snapshots = await this.getHistoricalSnapshots(24);
    
    const report = {
      generatedAt: new Date().toISOString(),
      summary: {
        apiPerformance: stats.apiStats,
        databasePerformance: stats.dbStats,
        cachePerformance: stats.imageStats
      },
      snapshots: snapshots.slice(0, 10), // Last 10 snapshots
      metrics: this.metrics.slice(-100) // Last 100 metrics
    };
    
    return JSON.stringify(report, null, 2);
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitoringService(); 