import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import { AppState } from 'react-native';

// Types for performance monitoring
export interface QueryMetrics {
  query: string;
  duration: number;
  timestamp: string;
  parameters?: any[];
  stackTrace?: string;
}

export interface SlowQueryRecord {
  id?: number;
  query: string;
  duration: number;
  timestamp: string;
  parameters?: string;
  stack_trace?: string;
  frequency: number;
  created_at: string;
  last_seen: string;
}

export interface ConnectionPoolStats {
  active_connections: number;
  idle_connections: number;
  total_connections: number;
  max_connections: number;
  connection_wait_time: number;
  connections_created: number;
  connections_destroyed: number;
}

export interface DatabaseSizeMetrics {
  total_size: number;
  index_size: number;
  data_size: number;
  fragmentation_ratio: number;
  page_count: number;
  page_size: number;
  vacuum_needed: boolean;
}

export interface PerformanceAlert {
  id: string;
  type: 'slow_query' | 'connection_pool' | 'database_size' | 'vacuum_needed' | 'index_needed';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: any;
  timestamp: string;
  resolved: boolean;
}

export interface IndexRecommendation {
  table: string;
  columns: string[];
  reason: string;
  estimated_benefit: number;
  query_count: number;
  avg_duration: number;
}

/**
 * Comprehensive Database Performance Monitoring Service
 * Provides real-time monitoring, alerting, and optimization recommendations
 */
export class DatabasePerformanceMonitor {
  private db: SQLite.SQLiteDatabase | null = null;
  private isInitialized = false;
  private queryMetrics: QueryMetrics[] = [];
  private connectionPool: Map<string, { connection: SQLite.SQLiteDatabase; lastUsed: Date; isActive: boolean }> = new Map();
  private performanceAlerts: PerformanceAlert[] = [];
  private lastVacuumTime: Date = new Date(0);
  private lastSizeCheck: Date = new Date(0);
  private vacuumScheduleInterval: any = null;
  private monitoringInterval: any = null;
  
  // Configuration
  private readonly SLOW_QUERY_THRESHOLD = 100; // milliseconds
  private readonly MAX_QUERY_METRICS = 1000;
  private readonly VACUUM_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MAX_CONNECTION_POOL_SIZE = 10;
  private readonly DATABASE_SIZE_LIMIT = 500 * 1024 * 1024; // 500MB
  private readonly FRAGMENTATION_THRESHOLD = 0.3; // 30%
  private readonly MONITORING_INTERVAL = 5 * 60 * 1000; // 5 minutes
  
  constructor() {
    this.initializeMonitoring();
  }

  /**
   * Initialize performance monitoring
   */
  private async initializeMonitoring(): Promise<void> {
    try {
      await this.createPerformanceTables();
      await this.startVacuumScheduling();
      await this.startContinuousMonitoring();
      this.isInitialized = true;
      console.log('Database performance monitoring initialized');
    } catch (error) {
      console.error('Failed to initialize performance monitoring:', error);
    }
  }

  /**
   * Create performance monitoring tables
   */
  private async createPerformanceTables(): Promise<void> {
    if (!this.db) {
      this.db = await SQLite.openDatabaseAsync('yoryor_chats.db');
    }

    await this.db.withTransactionAsync(async () => {
      // Slow queries table
      await this.db!.execAsync(`
        CREATE TABLE IF NOT EXISTS slow_queries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          query TEXT NOT NULL,
          duration INTEGER NOT NULL,
          timestamp TEXT NOT NULL,
          parameters TEXT,
          stack_trace TEXT,
          frequency INTEGER DEFAULT 1,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          last_seen TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Performance metrics table
      await this.db!.execAsync(`
        CREATE TABLE IF NOT EXISTS performance_metrics (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          metric_type TEXT NOT NULL,
          metric_value REAL NOT NULL,
          details TEXT,
          timestamp TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Connection pool stats table
      await this.db!.execAsync(`
        CREATE TABLE IF NOT EXISTS connection_pool_stats (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          active_connections INTEGER NOT NULL,
          idle_connections INTEGER NOT NULL,
          total_connections INTEGER NOT NULL,
          max_connections INTEGER NOT NULL,
          connection_wait_time REAL NOT NULL,
          connections_created INTEGER NOT NULL,
          connections_destroyed INTEGER NOT NULL,
          timestamp TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Database size history table
      await this.db!.execAsync(`
        CREATE TABLE IF NOT EXISTS database_size_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          total_size INTEGER NOT NULL,
          index_size INTEGER NOT NULL,
          data_size INTEGER NOT NULL,
          fragmentation_ratio REAL NOT NULL,
          page_count INTEGER NOT NULL,
          page_size INTEGER NOT NULL,
          vacuum_needed INTEGER DEFAULT 0,
          timestamp TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Performance alerts table
      await this.db!.execAsync(`
        CREATE TABLE IF NOT EXISTS performance_alerts (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          severity TEXT NOT NULL,
          message TEXT NOT NULL,
          details TEXT,
          timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
          resolved INTEGER DEFAULT 0,
          resolved_at TEXT
        )
      `);

      // Index recommendations table
      await this.db!.execAsync(`
        CREATE TABLE IF NOT EXISTS index_recommendations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          table_name TEXT NOT NULL,
          columns TEXT NOT NULL,
          reason TEXT NOT NULL,
          estimated_benefit REAL NOT NULL,
          query_count INTEGER NOT NULL,
          avg_duration REAL NOT NULL,
          status TEXT DEFAULT 'pending',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          applied_at TEXT
        )
      `);

      // Create indexes for performance tables
      await this.db!.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_slow_queries_timestamp ON slow_queries(timestamp DESC);
        CREATE INDEX IF NOT EXISTS idx_slow_queries_duration ON slow_queries(duration DESC);
        CREATE INDEX IF NOT EXISTS idx_performance_metrics_type ON performance_metrics(metric_type);
        CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics(timestamp DESC);
        CREATE INDEX IF NOT EXISTS idx_connection_pool_stats_timestamp ON connection_pool_stats(timestamp DESC);
        CREATE INDEX IF NOT EXISTS idx_database_size_history_timestamp ON database_size_history(timestamp DESC);
        CREATE INDEX IF NOT EXISTS idx_performance_alerts_type ON performance_alerts(type);
        CREATE INDEX IF NOT EXISTS idx_performance_alerts_resolved ON performance_alerts(resolved);
        CREATE INDEX IF NOT EXISTS idx_index_recommendations_status ON index_recommendations(status);
      `);
    });
  }

  /**
   * Wrap database query with performance timing
   */
  async executeWithTiming<T>(
    query: string,
    params: any[] = [],
    connection?: SQLite.SQLiteDatabase,
    context?: string
  ): Promise<T> {
    const startTime = performance.now();
    const timestamp = new Date().toISOString();
    const stackTrace = this.getStackTrace();
    
    try {
      const db = connection || this.db;
      if (!db) {
        throw new Error('Database connection not available');
      }

      let result: T;
      
      // Execute the query based on type
      if (query.trim().toUpperCase().startsWith('SELECT')) {
        result = await db.getAllAsync(query, params) as T;
      } else if (query.trim().toUpperCase().startsWith('INSERT') || 
                 query.trim().toUpperCase().startsWith('UPDATE') || 
                 query.trim().toUpperCase().startsWith('DELETE')) {
        result = await db.runAsync(query, params) as T;
      } else {
        result = await db.execAsync(query) as T;
      }

      const duration = performance.now() - startTime;
      
      // Record metrics
      const metrics: QueryMetrics = {
        query,
        duration,
        timestamp,
        parameters: params,
        stackTrace: context || stackTrace
      };

      this.recordQueryMetrics(metrics);

      // Log slow queries
      if (duration > this.SLOW_QUERY_THRESHOLD) {
        await this.logSlowQuery(metrics);
      }

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      // Log failed queries
      await this.logFailedQuery(query, params, duration, error as Error);
      
      throw error;
    }
  }

  /**
   * Record query metrics in memory
   */
  private recordQueryMetrics(metrics: QueryMetrics): void {
    this.queryMetrics.push(metrics);
    
    // Keep only recent metrics
    if (this.queryMetrics.length > this.MAX_QUERY_METRICS) {
      this.queryMetrics = this.queryMetrics.slice(-this.MAX_QUERY_METRICS);
    }
  }

  /**
   * Log slow query to database
   */
  private async logSlowQuery(metrics: QueryMetrics): Promise<void> {
    if (!this.db) return;

    try {
      // Check if this query pattern already exists
      const existingQuery = await this.db.getFirstAsync<SlowQueryRecord>(`
        SELECT * FROM slow_queries 
        WHERE query = ? 
        ORDER BY last_seen DESC 
        LIMIT 1
      `, [metrics.query]);

      if (existingQuery) {
        // Update existing record
        await this.db.runAsync(`
          UPDATE slow_queries 
          SET frequency = frequency + 1, 
              last_seen = ?, 
              duration = CASE WHEN ? > duration THEN ? ELSE duration END
          WHERE id = ?
        `, [metrics.timestamp, metrics.duration, metrics.duration, existingQuery.id || 0]);
      } else {
        // Insert new record
        await this.db.runAsync(`
          INSERT INTO slow_queries (query, duration, timestamp, parameters, stack_trace)
          VALUES (?, ?, ?, ?, ?)
        `, [
          metrics.query,
          metrics.duration,
          metrics.timestamp,
          JSON.stringify(metrics.parameters),
          metrics.stackTrace || null
        ]);
      }

      // Create performance alert for extremely slow queries
      if (metrics.duration > this.SLOW_QUERY_THRESHOLD * 5) {
        await this.createPerformanceAlert({
          id: `slow_query_${Date.now()}`,
          type: 'slow_query',
          severity: metrics.duration > this.SLOW_QUERY_THRESHOLD * 10 ? 'critical' : 'high',
          message: `Extremely slow query detected: ${metrics.duration.toFixed(2)}ms`,
          details: {
            query: metrics.query,
            duration: metrics.duration,
            parameters: metrics.parameters
          },
          timestamp: metrics.timestamp,
          resolved: false
        });
      }
    } catch (error) {
      console.error('Failed to log slow query:', error);
    }
  }

  /**
   * Log failed query
   */
  private async logFailedQuery(query: string, params: any[], duration: number, error: Error): Promise<void> {
    if (!this.db) return;

    try {
      await this.db.runAsync(`
        INSERT INTO performance_metrics (metric_type, metric_value, details)
        VALUES (?, ?, ?)
      `, [
        'failed_query',
        duration,
        JSON.stringify({
          query,
          parameters: params,
          error: error.message,
          stack: error.stack
        })
      ]);
    } catch (logError) {
      console.error('Failed to log failed query:', logError);
    }
  }

  /**
   * Start automatic VACUUM scheduling
   */
  private async startVacuumScheduling(): Promise<void> {
    // Check if vacuum is needed immediately
    await this.checkVacuumNeeded();

    // Schedule periodic vacuum checks
    this.vacuumScheduleInterval = setInterval(async () => {
      const now = new Date();
      const timeSinceLastVacuum = now.getTime() - this.lastVacuumTime.getTime();
      
      if (timeSinceLastVacuum >= this.VACUUM_INTERVAL) {
        await this.performScheduledVacuum();
      }
    }, 60 * 60 * 1000); // Check every hour

    // Schedule vacuum during low activity periods
    AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background') {
        setTimeout(() => {
          this.performScheduledVacuum();
        }, 5000); // Wait 5 seconds after app goes to background
      }
    });
  }

  /**
   * Check if database vacuum is needed
   */
  private async checkVacuumNeeded(): Promise<boolean> {
    if (!this.db) return false;

    try {
      const sizeMetrics = await this.getDatabaseSizeMetrics();
      
      // Record size metrics
      await this.recordDatabaseSizeMetrics(sizeMetrics);
      
      // Check if vacuum is needed
      const vacuumNeeded = sizeMetrics.fragmentation_ratio > this.FRAGMENTATION_THRESHOLD;
      
      if (vacuumNeeded) {
        await this.createPerformanceAlert({
          id: `vacuum_needed_${Date.now()}`,
          type: 'vacuum_needed',
          severity: 'medium',
          message: `Database fragmentation detected: ${(sizeMetrics.fragmentation_ratio * 100).toFixed(1)}%`,
          details: sizeMetrics,
          timestamp: new Date().toISOString(),
          resolved: false
        });
      }
      
      return vacuumNeeded;
    } catch (error) {
      console.error('Failed to check vacuum needed:', error);
      return false;
    }
  }

  /**
   * Perform scheduled vacuum operation
   */
  private async performScheduledVacuum(): Promise<void> {
    if (!this.db) return;

    try {
      console.log('Starting scheduled database vacuum...');
      const startTime = performance.now();
      
      // Perform vacuum
      await this.db.execAsync('VACUUM');
      
      const duration = performance.now() - startTime;
      this.lastVacuumTime = new Date();
      
      // Record vacuum operation
      await this.db.runAsync(`
        INSERT INTO performance_metrics (metric_type, metric_value, details)
        VALUES (?, ?, ?)
      `, [
        'vacuum_operation',
        duration,
        JSON.stringify({
          timestamp: this.lastVacuumTime.toISOString(),
          duration: duration
        })
      ]);
      
      console.log(`Database vacuum completed in ${duration.toFixed(2)}ms`);
      
      // Resolve any vacuum-related alerts
      await this.resolvePerformanceAlerts('vacuum_needed');
      
    } catch (error) {
      console.error('Failed to perform scheduled vacuum:', error);
      
      await this.createPerformanceAlert({
        id: `vacuum_failed_${Date.now()}`,
        type: 'vacuum_needed',
        severity: 'high',
        message: 'Scheduled vacuum operation failed',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp: new Date().toISOString(),
        resolved: false
      });
    }
  }

  /**
   * Monitor connection pool statistics
   */
  async monitorConnectionPool(): Promise<ConnectionPoolStats> {
    const stats: ConnectionPoolStats = {
      active_connections: 0,
      idle_connections: 0,
      total_connections: this.connectionPool.size,
      max_connections: this.MAX_CONNECTION_POOL_SIZE,
      connection_wait_time: 0,
      connections_created: 0,
      connections_destroyed: 0
    };

    // Calculate active/idle connections
    const now = new Date();
    for (const [id, poolItem] of this.connectionPool.entries()) {
      if (poolItem.isActive) {
        stats.active_connections++;
      } else {
        stats.idle_connections++;
      }
    }

    // Record connection pool stats
    if (this.db) {
      await this.db.runAsync(`
        INSERT INTO connection_pool_stats (
          active_connections, idle_connections, total_connections, 
          max_connections, connection_wait_time, connections_created, connections_destroyed
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        stats.active_connections,
        stats.idle_connections,
        stats.total_connections,
        stats.max_connections,
        stats.connection_wait_time,
        stats.connections_created,
        stats.connections_destroyed
      ]);
    }

    // Check for connection pool issues
    const utilizationRate = stats.active_connections / stats.max_connections;
    if (utilizationRate > 0.8) {
      await this.createPerformanceAlert({
        id: `connection_pool_high_${Date.now()}`,
        type: 'connection_pool',
        severity: utilizationRate > 0.9 ? 'critical' : 'high',
        message: `High connection pool utilization: ${(utilizationRate * 100).toFixed(1)}%`,
        details: stats,
        timestamp: new Date().toISOString(),
        resolved: false
      });
    }

    return stats;
  }

  /**
   * Get database size metrics
   */
  private async getDatabaseSizeMetrics(): Promise<DatabaseSizeMetrics> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

         const pageCountResult = await this.db.getFirstAsync<{page_count: number}>(`PRAGMA page_count`);
     const pageSizeResult = await this.db.getFirstAsync<{page_size: number}>(`PRAGMA page_size`);
     const freePages = await this.db.getFirstAsync<{freelist_count: number}>(`PRAGMA freelist_count`);

     const pageCount = pageCountResult?.page_count || 0;
     const pageSize = pageSizeResult?.page_size || 0;
     const totalSize = pageCount * pageSize;
     const freeSize = (freePages?.freelist_count || 0) * pageSize;
     const usedSize = totalSize - freeSize;
     const fragmentationRatio = totalSize > 0 ? freeSize / totalSize : 0;

     // Get index size (approximation)
     const indexPages = await this.db.getFirstAsync<{index_pages: number}>(`
       SELECT SUM(pgsize) as index_pages FROM dbstat WHERE name LIKE 'sqlite_autoindex_%' OR name LIKE 'idx_%'
     `);

     const indexSize = indexPages?.index_pages || 0;
    const dataSize = usedSize - indexSize;

         return {
       total_size: totalSize,
       index_size: indexSize,
       data_size: dataSize,
       fragmentation_ratio: fragmentationRatio,
       page_count: pageCount,
       page_size: pageSize,
       vacuum_needed: fragmentationRatio > this.FRAGMENTATION_THRESHOLD
     };
  }

  /**
   * Record database size metrics
   */
  private async recordDatabaseSizeMetrics(metrics: DatabaseSizeMetrics): Promise<void> {
    if (!this.db) return;

    try {
      await this.db.runAsync(`
        INSERT INTO database_size_history (
          total_size, index_size, data_size, fragmentation_ratio, 
          page_count, page_size, vacuum_needed
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        metrics.total_size,
        metrics.index_size,
        metrics.data_size,
        metrics.fragmentation_ratio,
        metrics.page_count,
        metrics.page_size,
        metrics.vacuum_needed ? 1 : 0
      ]);

      // Check for size limits
      if (metrics.total_size > this.DATABASE_SIZE_LIMIT) {
        await this.createPerformanceAlert({
          id: `database_size_limit_${Date.now()}`,
          type: 'database_size',
          severity: 'critical',
          message: `Database size limit exceeded: ${(metrics.total_size / (1024 * 1024)).toFixed(2)}MB`,
          details: metrics,
          timestamp: new Date().toISOString(),
          resolved: false
        });
      } else if (metrics.total_size > this.DATABASE_SIZE_LIMIT * 0.8) {
        await this.createPerformanceAlert({
          id: `database_size_warning_${Date.now()}`,
          type: 'database_size',
          severity: 'medium',
          message: `Database approaching size limit: ${(metrics.total_size / (1024 * 1024)).toFixed(2)}MB`,
          details: metrics,
          timestamp: new Date().toISOString(),
          resolved: false
        });
      }
    } catch (error) {
      console.error('Failed to record database size metrics:', error);
    }
  }

  /**
   * Analyze slow queries and recommend indexes
   */
  async analyzeSlowQueriesAndRecommendIndexes(): Promise<IndexRecommendation[]> {
    if (!this.db) return [];

    try {
      const slowQueries = await this.db.getAllAsync<SlowQueryRecord>(`
        SELECT * FROM slow_queries 
        WHERE frequency > 1 
        ORDER BY duration DESC, frequency DESC 
        LIMIT 50
      `);

      const recommendations: IndexRecommendation[] = [];

      for (const slowQuery of slowQueries) {
        const recommendation = this.analyzeQueryForIndexRecommendation(slowQuery);
        if (recommendation) {
          recommendations.push(recommendation);
        }
      }

      // Store recommendations
      for (const recommendation of recommendations) {
        await this.storeIndexRecommendation(recommendation);
      }

      return recommendations;
    } catch (error) {
      console.error('Failed to analyze slow queries:', error);
      return [];
    }
  }

  /**
   * Analyze a query for index recommendation
   */
  private analyzeQueryForIndexRecommendation(slowQuery: SlowQueryRecord): IndexRecommendation | null {
    const query = slowQuery.query.toLowerCase();
    
    // Simple heuristics for index recommendations
    if (query.includes('where') && query.includes('order by')) {
      const tableMatch = query.match(/from\s+(\w+)/);
      const whereMatch = query.match(/where\s+(\w+)/);
      const orderMatch = query.match(/order\s+by\s+(\w+)/);
      
      if (tableMatch && whereMatch && orderMatch) {
        const table = tableMatch[1];
        const whereColumn = whereMatch[1];
        const orderColumn = orderMatch[1];
        
        return {
          table,
          columns: [whereColumn, orderColumn],
          reason: 'Composite index for WHERE and ORDER BY clauses',
          estimated_benefit: slowQuery.duration * slowQuery.frequency,
          query_count: slowQuery.frequency,
          avg_duration: slowQuery.duration
        };
      }
    } else if (query.includes('where')) {
      const tableMatch = query.match(/from\s+(\w+)/);
      const whereMatch = query.match(/where\s+(\w+)/);
      
      if (tableMatch && whereMatch) {
        return {
          table: tableMatch[1],
          columns: [whereMatch[1]],
          reason: 'Index for WHERE clause',
          estimated_benefit: slowQuery.duration * slowQuery.frequency,
          query_count: slowQuery.frequency,
          avg_duration: slowQuery.duration
        };
      }
    }
    
    return null;
  }

  /**
   * Store index recommendation
   */
  private async storeIndexRecommendation(recommendation: IndexRecommendation): Promise<void> {
    if (!this.db) return;

    try {
      await this.db.runAsync(`
        INSERT OR REPLACE INTO index_recommendations (
          table_name, columns, reason, estimated_benefit, query_count, avg_duration
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [
        recommendation.table,
        JSON.stringify(recommendation.columns),
        recommendation.reason,
        recommendation.estimated_benefit,
        recommendation.query_count,
        recommendation.avg_duration
      ]);
    } catch (error) {
      console.error('Failed to store index recommendation:', error);
    }
  }

  /**
   * Auto-create recommended indexes
   */
  async autoCreateRecommendedIndexes(): Promise<void> {
    if (!this.db) return;

    try {
      const recommendations = await this.db.getAllAsync<any>(`
        SELECT * FROM index_recommendations 
        WHERE status = 'pending' AND estimated_benefit > 1000
        ORDER BY estimated_benefit DESC
      `);

      for (const recommendation of recommendations) {
        try {
          const columns = JSON.parse(recommendation.columns);
          const indexName = `idx_auto_${recommendation.table_name}_${columns.join('_')}`;
          
          await this.db.execAsync(`
            CREATE INDEX IF NOT EXISTS ${indexName} 
            ON ${recommendation.table_name} (${columns.join(', ')})
          `);
          
          await this.db.runAsync(`
            UPDATE index_recommendations 
            SET status = 'applied', applied_at = CURRENT_TIMESTAMP 
            WHERE id = ?
          `, [recommendation.id]);
          
          console.log(`Auto-created index: ${indexName}`);
        } catch (error) {
          console.error(`Failed to create index for ${recommendation.table_name}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to auto-create recommended indexes:', error);
    }
  }

  /**
   * Start continuous monitoring
   */
  private async startContinuousMonitoring(): Promise<void> {
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.monitorConnectionPool();
        await this.checkVacuumNeeded();
        await this.analyzeSlowQueriesAndRecommendIndexes();
        await this.autoCreateRecommendedIndexes();
        await this.cleanupOldMetrics();
      } catch (error) {
        console.error('Error in continuous monitoring:', error);
      }
    }, this.MONITORING_INTERVAL);
  }

  /**
   * Clean up old metrics
   */
  private async cleanupOldMetrics(): Promise<void> {
    if (!this.db) return;

    try {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      
      await this.db.runAsync(`
        DELETE FROM performance_metrics 
        WHERE timestamp < ?
      `, [oneWeekAgo]);
      
      await this.db.runAsync(`
        DELETE FROM connection_pool_stats 
        WHERE timestamp < ?
      `, [oneWeekAgo]);
      
      await this.db.runAsync(`
        DELETE FROM database_size_history 
        WHERE timestamp < ?
      `, [oneWeekAgo]);
    } catch (error) {
      console.error('Failed to cleanup old metrics:', error);
    }
  }

  /**
   * Create performance alert
   */
  private async createPerformanceAlert(alert: PerformanceAlert): Promise<void> {
    if (!this.db) return;

    try {
      await this.db.runAsync(`
        INSERT OR REPLACE INTO performance_alerts (
          id, type, severity, message, details, timestamp, resolved
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        alert.id,
        alert.type,
        alert.severity,
        alert.message,
        JSON.stringify(alert.details),
        alert.timestamp,
        alert.resolved ? 1 : 0
      ]);
      
      this.performanceAlerts.push(alert);
      
      // Log critical alerts
      if (alert.severity === 'critical') {
        console.warn(`CRITICAL PERFORMANCE ALERT: ${alert.message}`, alert.details);
      }
    } catch (error) {
      console.error('Failed to create performance alert:', error);
    }
  }

  /**
   * Resolve performance alerts
   */
  private async resolvePerformanceAlerts(type: string): Promise<void> {
    if (!this.db) return;

    try {
      await this.db.runAsync(`
        UPDATE performance_alerts 
        SET resolved = 1, resolved_at = CURRENT_TIMESTAMP 
        WHERE type = ? AND resolved = 0
      `, [type]);
    } catch (error) {
      console.error('Failed to resolve performance alerts:', error);
    }
  }

  /**
   * Get performance summary
   */
  async getPerformanceSummary(): Promise<any> {
    if (!this.db) return null;

    try {
      const summary = {
        query_metrics: {
          total_queries: this.queryMetrics.length,
          slow_queries: this.queryMetrics.filter(m => m.duration > this.SLOW_QUERY_THRESHOLD).length,
          avg_duration: this.queryMetrics.reduce((sum, m) => sum + m.duration, 0) / this.queryMetrics.length || 0,
          max_duration: Math.max(...this.queryMetrics.map(m => m.duration), 0)
        },
        connection_pool: await this.monitorConnectionPool(),
        database_size: await this.getDatabaseSizeMetrics(),
        active_alerts: this.performanceAlerts.filter(a => !a.resolved).length,
        last_vacuum: this.lastVacuumTime.toISOString(),
        monitoring_status: this.isInitialized ? 'active' : 'inactive'
      };

      return summary;
    } catch (error) {
      console.error('Failed to get performance summary:', error);
      return null;
    }
  }

  /**
   * Get stack trace for debugging
   */
  private getStackTrace(): string {
    const stack = new Error().stack;
    return stack ? stack.split('\n').slice(2, 6).join('\n') : '';
  }

  /**
   * Shutdown monitoring
   */
  async shutdown(): Promise<void> {
    if (this.vacuumScheduleInterval) {
      clearInterval(this.vacuumScheduleInterval);
    }
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    this.isInitialized = false;
    console.log('Database performance monitoring shutdown');
  }
}

// Export singleton instance
export const databasePerformanceMonitor = new DatabasePerformanceMonitor();
export default databasePerformanceMonitor; 