import { sqliteService } from '../sqlite-service';

/**
 * Demo script to showcase the optimized chat features
 * This demonstrates all the optimization features implemented
 */
export class ChatOptimizationDemo {
  
  /**
   * Demonstrate the optimized chat loading with pagination
   */
  async demonstratePagination(): Promise<void> {
    console.log('=== PAGINATION DEMO ===');
    
    try {
      // Get first page
      const firstPage = await sqliteService.getChatsOptimized({
        limit: 10,
        includeUserData: true
      });
      
      console.log(`First page: ${firstPage.data.length} chats`);
      console.log(`Has next page: ${firstPage.hasNextPage}`);
      
      if (firstPage.hasNextPage && firstPage.nextCursor) {
        // Get second page using cursor
        const secondPage = await sqliteService.getChatsOptimized({
          cursor: firstPage.nextCursor,
          limit: 10,
          includeUserData: true
        });
        
        console.log(`Second page: ${secondPage.data.length} chats`);
        console.log(`Has next page: ${secondPage.hasNextPage}`);
      }
      
      // Demonstrate cache hit by requesting first page again
      const cachedFirstPage = await sqliteService.getChatsOptimized({
        limit: 10,
        includeUserData: true
      });
      
      console.log(`Cached first page: ${cachedFirstPage.data.length} chats (should be from cache)`);
      
    } catch (error) {
      console.error('Error in pagination demo:', error);
    }
  }

  /**
   * Demonstrate performance monitoring
   */
  async demonstratePerformanceMonitoring(): Promise<void> {
    console.log('\n=== PERFORMANCE MONITORING DEMO ===');
    
    try {
      // Get performance metrics
      const metrics = await sqliteService.getChatPerformanceMetrics();
      console.log('Current performance metrics:', metrics);
      
      // Log performance warnings
      await sqliteService.logChatPerformanceWarnings();
      
      // Generate comprehensive optimization report
      await sqliteService.generateChatOptimizationReport();
      
    } catch (error) {
      console.error('Error in performance monitoring demo:', error);
    }
  }

  /**
   * Demonstrate query analysis in development mode
   */
  async demonstrateQueryAnalysis(): Promise<void> {
    console.log('\n=== QUERY ANALYSIS DEMO ===');
    
    try {
      // Analyze chat queries
      await sqliteService.analyzeChatQueries();
      
    } catch (error) {
      console.error('Error in query analysis demo:', error);
    }
  }

  /**
   * Demonstrate view refresh functionality
   */
  async demonstrateViewRefresh(): Promise<void> {
    console.log('\n=== VIEW REFRESH DEMO ===');
    
    try {
      // Manually refresh the chat summary view
      await sqliteService.refreshChatSummaryView();
      
      console.log('Chat summary view refreshed successfully');
      
    } catch (error) {
      console.error('Error in view refresh demo:', error);
    }
  }

  /**
   * Demonstrate cache behavior
   */
  async demonstrateCaching(): Promise<void> {
    console.log('\n=== CACHING DEMO ===');
    
    try {
      const startTime = performance.now();
      
      // First call - should hit the database
      const firstCall = await sqliteService.getChatsOptimized({ limit: 5 });
      const firstCallTime = performance.now() - startTime;
      
      console.log(`First call: ${firstCallTime.toFixed(2)}ms - ${firstCall.data.length} chats`);
      
      const secondStartTime = performance.now();
      
      // Second call - should hit the cache
      const secondCall = await sqliteService.getChatsOptimized({ limit: 5 });
      const secondCallTime = performance.now() - secondStartTime;
      
      console.log(`Second call: ${secondCallTime.toFixed(2)}ms - ${secondCall.data.length} chats (cached)`);
      
      console.log(`Cache speedup: ${(firstCallTime / secondCallTime).toFixed(2)}x faster`);
      
    } catch (error) {
      console.error('Error in caching demo:', error);
    }
  }

  /**
   * Run all demonstrations
   */
  async runAllDemos(): Promise<void> {
    console.log('🚀 Starting Chat Optimization Demonstrations\n');
    
    await this.demonstratePagination();
    await this.demonstrateCaching();
    await this.demonstratePerformanceMonitoring();
    await this.demonstrateQueryAnalysis();
    await this.demonstrateViewRefresh();
    
    console.log('\n✅ All demonstrations completed!');
  }

  /**
   * Run performance benchmark
   */
  async runPerformanceBenchmark(): Promise<void> {
    console.log('\n=== PERFORMANCE BENCHMARK ===');
    
    const iterations = 10;
    const times: number[] = [];
    
    try {
      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        await sqliteService.getChatsOptimized({ limit: 20 });
        const endTime = performance.now();
        times.push(endTime - startTime);
      }
      
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);
      
      console.log(`Average time: ${avgTime.toFixed(2)}ms`);
      console.log(`Min time: ${minTime.toFixed(2)}ms`);
      console.log(`Max time: ${maxTime.toFixed(2)}ms`);
      console.log(`Standard deviation: ${this.calculateStandardDeviation(times).toFixed(2)}ms`);
      
    } catch (error) {
      console.error('Error in performance benchmark:', error);
    }
  }

  /**
   * Calculate standard deviation
   */
  private calculateStandardDeviation(values: number[]): number {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(value => Math.pow(value - avg, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(avgSquaredDiff);
  }
}

// Export singleton instance
export const chatOptimizationDemo = new ChatOptimizationDemo(); 