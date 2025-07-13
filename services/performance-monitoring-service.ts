import { databasePerformanceMonitor } from './database-performance-monitor';
import { connectionManager } from './database/connection-manager';
import { chatRepository } from './database/chat-repository';
import { messageRepository } from './database/message-repository';
import { userRepository } from './database/user-repository';
import { settingsRepository } from './database/settings-repository';

/**
 * Comprehensive Performance Monitoring Service
 * Central hub for all database performance monitoring and optimization
 */
export class PerformanceMonitoringService {
  private initialized = false;
  private monitoringInterval: any = null;
  private reportingInterval: any = null;
  
  constructor() {
    this.initializeMonitoring();
  }

  /**
   * Initialize performance monitoring
   */
  private async initializeMonitoring(): Promise<void> {
    try {
      // Wait for database to be ready
      await this.waitForDatabaseReady();
      
      // Start monitoring intervals
      this.startPerformanceMonitoring();
      this.startPerformanceReporting();
      
      this.initialized = true;
      console.log('Performance monitoring service initialized');
    } catch (error) {
      console.error('Failed to initialize performance monitoring service:', error);
    }
  }

  /**
   * Wait for database to be ready
   */
  private async waitForDatabaseReady(): Promise<void> {
    let attempts = 0;
    const maxAttempts = 30;
    
    while (!connectionManager.isInitialized() && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }
    
    if (!connectionManager.isInitialized()) {
      throw new Error('Database initialization timeout');
    }
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    // Monitor every 30 seconds
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.collectPerformanceMetrics();
        await this.checkPerformanceThresholds();
        await this.optimizeIfNeeded();
      } catch (error) {
        console.error('Error in performance monitoring:', error);
      }
    }, 30000);
  }

  /**
   * Start performance reporting
   */
  private startPerformanceReporting(): void {
    // Report every 5 minutes
    this.reportingInterval = setInterval(async () => {
      try {
        await this.generatePerformanceReport();
      } catch (error) {
        console.error('Error in performance reporting:', error);
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Collect performance metrics from all sources
   */
  private async collectPerformanceMetrics(): Promise<void> {
    // Monitor connection pool
    await databasePerformanceMonitor.monitorConnectionPool();
    
    // Analyze slow queries
    await databasePerformanceMonitor.analyzeSlowQueriesAndRecommendIndexes();
    
    // Check chat repository performance
    const chatMetrics = chatRepository.getPerformanceMetrics();
    if (chatMetrics.slowQueries.length > 0) {
      console.warn('Chat repository has slow queries:', chatMetrics.slowQueries);
    }
  }

  /**
   * Check performance thresholds and create alerts
   */
  private async checkPerformanceThresholds(): Promise<void> {
    const summary = await databasePerformanceMonitor.getPerformanceSummary();
    
    if (summary) {
      // Check query performance
      if (summary.query_metrics.avg_duration > 50) {
        console.warn(`Average query duration high: ${summary.query_metrics.avg_duration.toFixed(2)}ms`);
      }
      
      if (summary.query_metrics.slow_queries > 10) {
        console.warn(`High number of slow queries: ${summary.query_metrics.slow_queries}`);
      }
      
      // Check database size
      if (summary.database_size.total_size > 400 * 1024 * 1024) { // 400MB warning
        console.warn(`Database size approaching limit: ${(summary.database_size.total_size / (1024 * 1024)).toFixed(2)}MB`);
      }
      
      // Check connection pool
      if (summary.connection_pool.active_connections > 8) {
        console.warn(`High connection pool usage: ${summary.connection_pool.active_connections}/10`);
      }
    }
  }

  /**
   * Optimize database if needed
   */
  private async optimizeIfNeeded(): Promise<void> {
    const summary = await databasePerformanceMonitor.getPerformanceSummary();
    
    if (summary) {
      // Auto-create indexes if beneficial
      if (summary.query_metrics.slow_queries > 5) {
        await databasePerformanceMonitor.autoCreateRecommendedIndexes();
      }
      
      // Suggest optimization if fragmentation is high
      if (summary.database_size.fragmentation_ratio > 0.2) {
        console.log('Database fragmentation detected, consider running VACUUM');
      }
    }
  }

  /**
   * Generate comprehensive performance report
   */
  private async generatePerformanceReport(): Promise<void> {
    const summary = await databasePerformanceMonitor.getPerformanceSummary();
    const dbStats = await connectionManager.getDatabaseStats();
    const chatMetrics = chatRepository.getPerformanceMetrics();
    
    const report = {
      timestamp: new Date().toISOString(),
      database_stats: dbStats,
      performance_summary: summary,
      chat_metrics: chatMetrics,
      recommendations: await this.generateRecommendations()
    };
    
    // Log performance report (in production, you might want to send this to a monitoring service)
    console.log('📊 PERFORMANCE REPORT:', JSON.stringify(report, null, 2));
  }

  /**
   * Generate performance recommendations
   */
  private async generateRecommendations(): Promise<string[]> {
    const recommendations: string[] = [];
    const summary = await databasePerformanceMonitor.getPerformanceSummary();
    
    if (summary) {
      if (summary.query_metrics.avg_duration > 100) {
        recommendations.push('Consider adding indexes for frequently queried columns');
      }
      
      if (summary.database_size.fragmentation_ratio > 0.3) {
        recommendations.push('Database fragmentation is high, run VACUUM to optimize');
      }
      
      if (summary.connection_pool.active_connections > 7) {
        recommendations.push('Consider implementing connection pooling optimization');
      }
      
      if (summary.query_metrics.slow_queries > 10) {
        recommendations.push('Review and optimize slow queries');
      }
    }
    
    return recommendations;
  }

  /**
   * Get current performance status
   */
  async getPerformanceStatus(): Promise<any> {
    const summary = await databasePerformanceMonitor.getPerformanceSummary();
    const dbStats = await connectionManager.getDatabaseStats();
    
    return {
      monitoring_active: this.initialized,
      database_stats: dbStats,
      performance_summary: summary,
      last_update: new Date().toISOString()
    };
  }

  /**
   * Force performance optimization
   */
  async forceOptimization(): Promise<void> {
    console.log('Starting forced database optimization...');
    
    try {
      // Auto-create recommended indexes
      await databasePerformanceMonitor.autoCreateRecommendedIndexes();
      
      // Optimize database
      await connectionManager.optimizeDatabase();
      
      // Clean up old data
      await connectionManager.cleanupOldData(30);
      
      // Refresh chat views
      await chatRepository.refreshChatSummaryView();
      
      console.log('Database optimization completed successfully');
    } catch (error) {
      console.error('Error during forced optimization:', error);
      throw error;
    }
  }

  /**
   * Get slow query analysis
   */
  async getSlowQueryAnalysis(): Promise<any> {
    const db = await connectionManager.getConnection();
    
    try {
      const slowQueries = await db.getAllAsync(`
        SELECT 
          query,
          AVG(duration) as avg_duration,
          MAX(duration) as max_duration,
          COUNT(*) as frequency,
          MAX(last_seen) as last_seen
        FROM slow_queries 
        GROUP BY query
        ORDER BY frequency DESC, avg_duration DESC
        LIMIT 20
      `);
      
      return {
        slow_queries: slowQueries,
        analysis_timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting slow query analysis:', error);
      return { slow_queries: [], analysis_timestamp: new Date().toISOString() };
    }
  }

  /**
   * Get database size trends
   */
  async getDatabaseSizeTrends(): Promise<any> {
    const db = await connectionManager.getConnection();
    
    try {
      const sizeHistory = await db.getAllAsync(`
        SELECT 
          DATE(timestamp) as date,
          AVG(total_size) as avg_size,
          MAX(total_size) as max_size,
          AVG(fragmentation_ratio) as avg_fragmentation
        FROM database_size_history 
        WHERE timestamp > datetime('now', '-30 days')
        GROUP BY DATE(timestamp)
        ORDER BY date DESC
        LIMIT 30
      `);
      
      return {
        size_trends: sizeHistory,
        analysis_timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting database size trends:', error);
      return { size_trends: [], analysis_timestamp: new Date().toISOString() };
    }
  }

  /**
   * Get performance alerts
   */
  async getPerformanceAlerts(): Promise<any> {
    const db = await connectionManager.getConnection();
    
    try {
      const alerts = await db.getAllAsync(`
        SELECT * FROM performance_alerts 
        WHERE resolved = 0 
        ORDER BY timestamp DESC
        LIMIT 50
      `);
      
      return {
        active_alerts: alerts,
        alert_count: alerts.length,
        analysis_timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting performance alerts:', error);
      return { active_alerts: [], alert_count: 0, analysis_timestamp: new Date().toISOString() };
    }
  }

  /**
   * Shutdown performance monitoring
   */
  async shutdown(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    if (this.reportingInterval) {
      clearInterval(this.reportingInterval);
    }
    
    await databasePerformanceMonitor.shutdown();
    
    this.initialized = false;
    console.log('Performance monitoring service shutdown');
  }
}

// Export singleton instance
export const performanceMonitoringService = new PerformanceMonitoringService();
export default performanceMonitoringService; 