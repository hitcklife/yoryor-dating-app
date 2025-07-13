import * as SQLite from 'expo-sqlite';
import { databasePerformanceMonitor } from '../database-performance-monitor';

/**
 * Performance wrapper for database operations
 * Wraps all database queries with performance monitoring
 */
export class PerformanceWrapper {
  /**
   * Execute a database query with performance monitoring
   */
  static async executeWithMonitoring<T>(
    operation: () => Promise<T>,
    query: string,
    params: any[] = [],
    connection?: SQLite.SQLiteDatabase,
    context?: string
  ): Promise<T> {
    return databasePerformanceMonitor.executeWithTiming<T>(
      query,
      params,
      connection,
      context
    );
  }

  /**
   * Wrap a database connection with performance monitoring
   */
  static wrapConnection(connection: SQLite.SQLiteDatabase): WrappedConnection {
    return new WrappedConnection(connection);
  }
}

/**
 * Wrapped database connection that automatically monitors all queries
 */
export class WrappedConnection {
  constructor(private connection: SQLite.SQLiteDatabase) {}

  async getAllAsync<T>(query: string, params: any[] = []): Promise<T[]> {
    return databasePerformanceMonitor.executeWithTiming<T[]>(
      query,
      params,
      this.connection,
      'getAllAsync'
    );
  }

  async getFirstAsync<T>(query: string, params: any[] = []): Promise<T | null> {
    return databasePerformanceMonitor.executeWithTiming<T | null>(
      query,
      params,
      this.connection,
      'getFirstAsync'
    );
  }

  async runAsync(query: string, params: any[] = []): Promise<SQLite.SQLiteRunResult> {
    return databasePerformanceMonitor.executeWithTiming<SQLite.SQLiteRunResult>(
      query,
      params,
      this.connection,
      'runAsync'
    );
  }

  async execAsync(query: string): Promise<void> {
    return databasePerformanceMonitor.executeWithTiming<void>(
      query,
      [],
      this.connection,
      'execAsync'
    );
  }

  async withTransactionAsync(task: () => Promise<void>): Promise<void> {
    const startTime = performance.now();
    await this.connection.withTransactionAsync(task);
    const duration = performance.now() - startTime;
    
    // Log transaction performance
    if (duration > 100) {
      console.warn(`Long transaction detected: ${duration.toFixed(2)}ms`);
    }
  }
}

export default PerformanceWrapper; 