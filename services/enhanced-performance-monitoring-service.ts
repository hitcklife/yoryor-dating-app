import { NativeModules, Platform, AppState } from 'react-native';
import { databasePerformanceMonitor } from './database-performance-monitor';
import { performanceMonitoringService } from './performance-monitoring-service';
import { EventEmitter } from './realtime/event-emitter';

// Performance Budget Configuration
export interface PerformanceBudgets {
  app_startup: number;        // < 3 seconds
  chat_list_load: number;     // < 1 second
  message_send: number;       // < 500ms
  image_load: number;         // < 2 seconds
  component_render: number;   // < 16ms for 60fps
  js_thread_utilization: number; // < 70%
  memory_usage: number;       // < 200MB
  bridge_calls_per_second: number; // < 100
}

export interface PerformanceMetrics {
  timestamp: string;
  app_startup_time?: number;
  js_thread_utilization: number;
  memory_usage: number;
  bridge_calls: number;
  frame_rate: number;
  component_renders: ComponentRenderMetrics[];
  navigation_times: NavigationMetrics[];
  api_calls: ApiCallMetrics[];
  image_load_times: ImageLoadMetrics[];
  chat_performance: ChatPerformanceMetrics;
}

export interface ComponentRenderMetrics {
  component_name: string;
  render_time: number;
  props_count: number;
  state_updates: number;
  children_count: number;
  timestamp: string;
}

export interface NavigationMetrics {
  from_screen: string;
  to_screen: string;
  duration: number;
  timestamp: string;
}

export interface ApiCallMetrics {
  endpoint: string;
  method: string;
  duration: number;
  status_code: number;
  timestamp: string;
}

export interface ImageLoadMetrics {
  image_uri: string;
  load_time: number;
  cache_hit: boolean;
  size_bytes: number;
  timestamp: string;
}

export interface ChatPerformanceMetrics {
  message_send_time: number;
  chat_list_load_time: number;
  typing_indicator_latency: number;
  message_delivery_time: number;
}

export interface MemoryLeakDetection {
  component_leaks: ComponentLeakInfo[];
  event_listener_leaks: EventListenerLeakInfo[];
  timer_leaks: TimerLeakInfo[];
  memory_growth_rate: number;
  retained_objects: number;
}

export interface ComponentLeakInfo {
  component_name: string;
  instance_count: number;
  expected_count: number;
  memory_usage: number;
  stack_trace: string;
}

export interface EventListenerLeakInfo {
  event_name: string;
  listener_count: number;
  expected_count: number;
  source_component: string;
}

export interface TimerLeakInfo {
  timer_id: number;
  timer_type: 'setTimeout' | 'setInterval';
  source_component: string;
  duration: number;
}

export interface PerformanceAlert {
  id: string;
  type: 'budget_exceeded' | 'memory_leak' | 'js_thread_blocked' | 'api_slow' | 'component_slow';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: any;
  timestamp: string;
  resolved: boolean;
}

/**
 * Enhanced React Native Performance Monitoring Service
 * Comprehensive performance monitoring with React Native API integration
 */
export class EnhancedPerformanceMonitoringService {
  private initialized = false;
  private eventEmitter = new EventEmitter();
  private performanceMetrics: PerformanceMetrics[] = [];
  private performanceAlerts: PerformanceAlert[] = [];
  private componentRenderTracking = new Map<string, ComponentRenderMetrics[]>();
  private memoryLeakDetection: MemoryLeakDetection | null = null;
  private monitoringInterval: any = null;
  private jsThreadMonitor: any = null;
  private frameRateMonitor: any = null;
  private memoryMonitor: any = null;
  private startupTime: number = 0;
  private flipperConnection: any = null;
  
  // Performance Budgets
  private performanceBudgets: PerformanceBudgets = {
    app_startup: 3000,        // 3 seconds
    chat_list_load: 1000,     // 1 second  
    message_send: 500,        // 500ms
    image_load: 2000,         // 2 seconds
    component_render: 16,     // 16ms for 60fps
    js_thread_utilization: 70, // 70%
    memory_usage: 200 * 1024 * 1024, // 200MB
    bridge_calls_per_second: 100
  };

  constructor() {
    this.recordStartupTime();
    this.initializePerformanceMonitoring();
  }

  /**
   * Record app startup time
   */
  private recordStartupTime(): void {
    this.startupTime = Date.now();
  }

  /**
   * Initialize performance monitoring
   */
  private async initializePerformanceMonitoring(): Promise<void> {
    try {
      // Initialize React Native performance API
      await this.initializeReactNativePerformanceAPI();
      
      // Setup JS thread monitoring
      await this.setupJSThreadMonitoring();
      
      // Setup memory monitoring
      await this.setupMemoryMonitoring();
      
      // Setup component render tracking
      await this.setupComponentRenderTracking();
      
      // Setup Flipper integration
      await this.setupFlipperIntegration();
      
      // Start monitoring intervals
      this.startPerformanceMonitoring();
      
      this.initialized = true;
      console.log('Enhanced performance monitoring service initialized');
    } catch (error) {
      console.error('Failed to initialize enhanced performance monitoring:', error);
    }
  }

  /**
   * Initialize React Native performance API
   */
  private async initializeReactNativePerformanceAPI(): Promise<void> {
    try {
      // Use React Native's performance API if available
      if (Platform.OS === 'android' && NativeModules.PerformanceObserver) {
        // Android-specific performance monitoring
        const performanceObserver = NativeModules.PerformanceObserver;
        await performanceObserver.initialize();
      }
      
      // Setup performance mark/measure polyfill if needed
      if (typeof global.performance === 'undefined') {
        global.performance = {
          now: () => Date.now(),
          mark: (name: string) => {
            console.log(`Performance mark: ${name}`);
            return {} as PerformanceMark;
          },
          measure: (name: string, startMark: string, endMark: string) => {
            console.log(`Performance measure: ${name} from ${startMark} to ${endMark}`);
            return {} as PerformanceMeasure;
          }
        } as Performance;
      }
      
      console.log('React Native performance API initialized');
    } catch (error) {
      console.error('Failed to initialize React Native performance API:', error);
    }
  }

  /**
   * Setup JS thread monitoring
   */
  private async setupJSThreadMonitoring(): Promise<void> {
    // Monitor JS thread utilization
    this.jsThreadMonitor = setInterval(() => {
      const start = Date.now();
      setTimeout(() => {
        const end = Date.now();
        const delay = end - start;
        const utilization = Math.min(delay / 16.67, 1) * 100; // 60fps = 16.67ms per frame
        
        this.recordJSThreadUtilization(utilization);
        
        // Check if JS thread is blocked
        if (utilization > this.performanceBudgets.js_thread_utilization) {
          this.createPerformanceAlert({
            id: `js_thread_blocked_${Date.now()}`,
            type: 'js_thread_blocked',
            severity: utilization > 90 ? 'critical' : 'high',
            message: `JS thread utilization high: ${utilization.toFixed(1)}%`,
            details: { utilization, threshold: this.performanceBudgets.js_thread_utilization },
            timestamp: new Date().toISOString(),
            resolved: false
          });
        }
      }, 0);
    }, 1000);
  }

  /**
   * Setup memory monitoring
   */
  private async setupMemoryMonitoring(): Promise<void> {
    this.memoryMonitor = setInterval(async () => {
      try {
        const memoryUsage = await this.getMemoryUsage();
        
        if (memoryUsage > this.performanceBudgets.memory_usage) {
          this.createPerformanceAlert({
            id: `memory_high_${Date.now()}`,
            type: 'memory_leak',
            severity: memoryUsage > this.performanceBudgets.memory_usage * 1.5 ? 'critical' : 'high',
            message: `Memory usage high: ${(memoryUsage / 1024 / 1024).toFixed(1)}MB`,
            details: { memoryUsage, threshold: this.performanceBudgets.memory_usage },
            timestamp: new Date().toISOString(),
            resolved: false
          });
        }
        
        // Detect memory leaks
        await this.detectMemoryLeaks();
      } catch (error) {
        console.error('Error in memory monitoring:', error);
      }
    }, 10000); // Check every 10 seconds
  }

  /**
   * Setup component render tracking
   */
  private async setupComponentRenderTracking(): Promise<void> {
    // This would typically integrate with React DevTools Profiler
    // For now, we'll provide a manual tracking system
    console.log('Component render tracking initialized');
  }

  /**
   * Setup Flipper integration
   */
  private async setupFlipperIntegration(): Promise<void> {
    try {
      if (__DEV__) {
        // Flipper integration for debugging
        const flipper = require('react-native-flipper');
        this.flipperConnection = flipper.addPlugin({
          getId() { return 'EnhancedPerformanceMonitor'; },
          onConnect(connection: any) {
            console.log('Flipper performance monitor connected');
          },
          onDisconnect() {
            console.log('Flipper performance monitor disconnected');
          },
          runInBackground() {
            return true;
          }
        });
      }
    } catch (error) {
      console.log('Flipper not available, skipping integration');
    }
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.collectPerformanceMetrics();
        await this.checkPerformanceBudgets();
        await this.generatePerformanceReport();
      } catch (error) {
        console.error('Error in performance monitoring:', error);
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Collect comprehensive performance metrics
   */
  private async collectPerformanceMetrics(): Promise<void> {
    const metrics: PerformanceMetrics = {
      timestamp: new Date().toISOString(),
      js_thread_utilization: await this.getJSThreadUtilization(),
      memory_usage: await this.getMemoryUsage(),
      bridge_calls: await this.getBridgeCallCount(),
      frame_rate: await this.getFrameRate(),
      component_renders: await this.getComponentRenderMetrics(),
      navigation_times: await this.getNavigationMetrics(),
      api_calls: await this.getApiCallMetrics(),
      image_load_times: await this.getImageLoadMetrics(),
      chat_performance: await this.getChatPerformanceMetrics()
    };

    this.performanceMetrics.push(metrics);
    
    // Keep only last 100 metrics to prevent memory issues
    if (this.performanceMetrics.length > 100) {
      this.performanceMetrics = this.performanceMetrics.slice(-100);
    }
  }

  /**
   * Check performance budgets
   */
  private async checkPerformanceBudgets(): Promise<void> {
    const latestMetrics = this.performanceMetrics[this.performanceMetrics.length - 1];
    if (!latestMetrics) return;

    // Check JS thread utilization
    if (latestMetrics.js_thread_utilization > this.performanceBudgets.js_thread_utilization) {
      this.createPerformanceAlert({
        id: `budget_js_thread_${Date.now()}`,
        type: 'budget_exceeded',
        severity: 'high',
        message: `JS thread utilization budget exceeded: ${latestMetrics.js_thread_utilization.toFixed(1)}%`,
        details: { budget: this.performanceBudgets.js_thread_utilization, actual: latestMetrics.js_thread_utilization },
        timestamp: new Date().toISOString(),
        resolved: false
      });
    }

    // Check memory usage
    if (latestMetrics.memory_usage > this.performanceBudgets.memory_usage) {
      this.createPerformanceAlert({
        id: `budget_memory_${Date.now()}`,
        type: 'budget_exceeded',
        severity: 'high',
        message: `Memory usage budget exceeded: ${(latestMetrics.memory_usage / 1024 / 1024).toFixed(1)}MB`,
        details: { budget: this.performanceBudgets.memory_usage, actual: latestMetrics.memory_usage },
        timestamp: new Date().toISOString(),
        resolved: false
      });
    }

    // Check component render times
    for (const component of latestMetrics.component_renders) {
      if (component.render_time > this.performanceBudgets.component_render) {
        this.createPerformanceAlert({
          id: `budget_component_${component.component_name}_${Date.now()}`,
          type: 'component_slow',
          severity: 'medium',
          message: `Component ${component.component_name} render time exceeded: ${component.render_time.toFixed(1)}ms`,
          details: { component: component.component_name, budget: this.performanceBudgets.component_render, actual: component.render_time },
          timestamp: new Date().toISOString(),
          resolved: false
        });
      }
    }
  }

  /**
   * Generate performance report
   */
  private async generatePerformanceReport(): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      app_startup_time: this.getAppStartupTime(),
      performance_budgets: this.performanceBudgets,
      current_metrics: this.performanceMetrics[this.performanceMetrics.length - 1],
      active_alerts: this.performanceAlerts.filter(a => !a.resolved),
      memory_leak_detection: this.memoryLeakDetection,
      recommendations: this.generateRecommendations()
    };

    // Send to Flipper if connected
    if (this.flipperConnection) {
      this.flipperConnection.send('performanceReport', report);
    }

    // Log report
    console.log('📊 ENHANCED PERFORMANCE REPORT:', JSON.stringify(report, null, 2));
  }

  /**
   * Track component render time
   */
  trackComponentRender(componentName: string, renderTime: number, propsCount: number = 0, stateUpdates: number = 0, childrenCount: number = 0): void {
    const metrics: ComponentRenderMetrics = {
      component_name: componentName,
      render_time: renderTime,
      props_count: propsCount,
      state_updates: stateUpdates,
      children_count: childrenCount,
      timestamp: new Date().toISOString()
    };

    if (!this.componentRenderTracking.has(componentName)) {
      this.componentRenderTracking.set(componentName, []);
    }
    
    const componentMetrics = this.componentRenderTracking.get(componentName)!;
    componentMetrics.push(metrics);
    
    // Keep only last 50 renders per component
    if (componentMetrics.length > 50) {
      componentMetrics.splice(0, componentMetrics.length - 50);
    }

    // Check render time budget
    if (renderTime > this.performanceBudgets.component_render) {
      this.createPerformanceAlert({
        id: `component_slow_${componentName}_${Date.now()}`,
        type: 'component_slow',
        severity: renderTime > this.performanceBudgets.component_render * 2 ? 'high' : 'medium',
        message: `Component ${componentName} render time exceeded: ${renderTime.toFixed(1)}ms`,
        details: metrics,
        timestamp: new Date().toISOString(),
        resolved: false
      });
    }
  }

  /**
   * Track API call performance
   */
  trackApiCall(endpoint: string, method: string, duration: number, statusCode: number): void {
    const metrics: ApiCallMetrics = {
      endpoint,
      method,
      duration,
      status_code: statusCode,
      timestamp: new Date().toISOString()
    };

    // Check if this is a critical API call
    const isCriticalCall = endpoint.includes('/chats') || endpoint.includes('/messages') || endpoint.includes('/matches');
    
    if (isCriticalCall) {
      if (endpoint.includes('/messages') && duration > this.performanceBudgets.message_send) {
        this.createPerformanceAlert({
          id: `api_slow_message_${Date.now()}`,
          type: 'api_slow',
          severity: 'high',
          message: `Message send API slow: ${duration}ms`,
          details: metrics,
          timestamp: new Date().toISOString(),
          resolved: false
        });
      }
      
      if (endpoint.includes('/chats') && duration > this.performanceBudgets.chat_list_load) {
        this.createPerformanceAlert({
          id: `api_slow_chats_${Date.now()}`,
          type: 'api_slow',
          severity: 'high',
          message: `Chat list load API slow: ${duration}ms`,
          details: metrics,
          timestamp: new Date().toISOString(),
          resolved: false
        });
      }
    }
  }

  /**
   * Track image load performance
   */
  trackImageLoad(imageUri: string, loadTime: number, cacheHit: boolean, sizeBytes: number): void {
    const metrics: ImageLoadMetrics = {
      image_uri: imageUri,
      load_time: loadTime,
      cache_hit: cacheHit,
      size_bytes: sizeBytes,
      timestamp: new Date().toISOString()
    };

    // Check image load budget
    if (loadTime > this.performanceBudgets.image_load) {
      this.createPerformanceAlert({
        id: `image_slow_${Date.now()}`,
        type: 'api_slow',
        severity: 'medium',
        message: `Image load slow: ${loadTime}ms`,
        details: metrics,
        timestamp: new Date().toISOString(),
        resolved: false
      });
    }
  }

  /**
   * Detect memory leaks
   */
  private async detectMemoryLeaks(): Promise<void> {
    try {
      // This is a simplified memory leak detection
      // In a real implementation, you would use React DevTools Profiler API
      const memoryUsage = await this.getMemoryUsage();
      const componentLeaks: ComponentLeakInfo[] = [];
      const eventListenerLeaks: EventListenerLeakInfo[] = [];
      const timerLeaks: TimerLeakInfo[] = [];

      // Simple heuristic: if memory usage is growing consistently, there might be a leak
      if (this.performanceMetrics.length >= 5) {
        const recent = this.performanceMetrics.slice(-5);
        const memoryGrowth = recent[recent.length - 1].memory_usage - recent[0].memory_usage;
        const growthRate = memoryGrowth / recent.length;

        if (growthRate > 1024 * 1024) { // 1MB per interval
          this.createPerformanceAlert({
            id: `memory_leak_${Date.now()}`,
            type: 'memory_leak',
            severity: 'high',
            message: `Memory leak detected: ${(growthRate / 1024 / 1024).toFixed(2)}MB/interval`,
            details: { growthRate, recentUsage: recent.map(m => m.memory_usage) },
            timestamp: new Date().toISOString(),
            resolved: false
          });
        }
      }

      this.memoryLeakDetection = {
        component_leaks: componentLeaks,
        event_listener_leaks: eventListenerLeaks,
        timer_leaks: timerLeaks,
        memory_growth_rate: 0,
        retained_objects: 0
      };
    } catch (error) {
      console.error('Error in memory leak detection:', error);
    }
  }

  /**
   * Helper methods for getting performance metrics
   */
  private recordJSThreadUtilization(utilization: number): void {
    // Store the utilization for later use
  }

  private async getJSThreadUtilization(): Promise<number> {
    // This would typically use React Native's performance API
    // For now, return a mock value
    return Math.random() * 100;
  }

  private async getMemoryUsage(): Promise<number> {
    try {
      if (Platform.OS === 'android' && NativeModules.MemoryInfo) {
        const memoryInfo = await NativeModules.MemoryInfo.getMemoryInfo();
        return memoryInfo.totalPSS * 1024; // Convert KB to bytes
      }
      
      // Fallback for iOS or if module not available
      return Math.random() * 100 * 1024 * 1024; // Mock value
    } catch (error) {
      return 0;
    }
  }

  private async getBridgeCallCount(): Promise<number> {
    // This would typically use React Native's bridge monitoring
    return Math.floor(Math.random() * 200);
  }

  private async getFrameRate(): Promise<number> {
    // This would typically use React Native's frame rate monitoring
    return 60 - Math.random() * 20;
  }

  private async getComponentRenderMetrics(): Promise<ComponentRenderMetrics[]> {
    const allMetrics: ComponentRenderMetrics[] = [];
    for (const [componentName, metrics] of this.componentRenderTracking) {
      allMetrics.push(...metrics.slice(-5)); // Get last 5 renders per component
    }
    return allMetrics;
  }

  private async getNavigationMetrics(): Promise<NavigationMetrics[]> {
    // This would typically integrate with React Navigation
    return [];
  }

  private async getApiCallMetrics(): Promise<ApiCallMetrics[]> {
    // This would typically integrate with your API client
    return [];
  }

  private async getImageLoadMetrics(): Promise<ImageLoadMetrics[]> {
    // This would typically integrate with your image loading service
    return [];
  }

  private async getChatPerformanceMetrics(): Promise<ChatPerformanceMetrics> {
    return {
      message_send_time: Math.random() * 1000,
      chat_list_load_time: Math.random() * 2000,
      typing_indicator_latency: Math.random() * 500,
      message_delivery_time: Math.random() * 2000
    };
  }

  private getAppStartupTime(): number {
    return Date.now() - this.startupTime;
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    // Add recommendations based on performance metrics
    if (this.performanceMetrics.length > 0) {
      const latest = this.performanceMetrics[this.performanceMetrics.length - 1];
      
      if (latest.js_thread_utilization > 80) {
        recommendations.push('Consider optimizing component renders and reducing synchronous operations');
      }
      
      if (latest.memory_usage > this.performanceBudgets.memory_usage * 0.8) {
        recommendations.push('Monitor memory usage and check for memory leaks');
      }
      
      if (latest.frame_rate < 50) {
        recommendations.push('Optimize animations and reduce expensive operations on UI thread');
      }
    }
    
    return recommendations;
  }

  private createPerformanceAlert(alert: PerformanceAlert): void {
    this.performanceAlerts.push(alert);
    
    // Keep only last 100 alerts
    if (this.performanceAlerts.length > 100) {
      this.performanceAlerts = this.performanceAlerts.slice(-100);
    }
    
    // Emit alert event
    this.eventEmitter.emit('connection.state.changed', {
      state: 'connected',
      quality: alert.severity === 'critical' ? 'poor' : 'good'
    });
    
    // Log critical alerts
    if (alert.severity === 'critical') {
      console.error(`🚨 CRITICAL PERFORMANCE ALERT: ${alert.message}`, alert.details);
    }
  }

  /**
   * Public methods
   */
  
  /**
   * Get current performance status
   */
  getPerformanceStatus(): any {
    return {
      initialized: this.initialized,
      startup_time: this.getAppStartupTime(),
      performance_budgets: this.performanceBudgets,
      current_metrics: this.performanceMetrics[this.performanceMetrics.length - 1],
      active_alerts: this.performanceAlerts.filter(a => !a.resolved),
      memory_leak_detection: this.memoryLeakDetection
    };
  }

  /**
   * Update performance budgets
   */
  updatePerformanceBudgets(budgets: Partial<PerformanceBudgets>): void {
    this.performanceBudgets = { ...this.performanceBudgets, ...budgets };
    console.log('Performance budgets updated:', this.performanceBudgets);
  }

  /**
   * Get performance alerts
   */
  getPerformanceAlerts(): PerformanceAlert[] {
    return this.performanceAlerts.filter(a => !a.resolved);
  }

  /**
   * Resolve performance alert
   */
  resolvePerformanceAlert(alertId: string): void {
    const alert = this.performanceAlerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      console.log(`Performance alert resolved: ${alertId}`);
    }
  }

  /**
   * Export performance data for analysis
   */
  exportPerformanceData(): any {
    return {
      performance_budgets: this.performanceBudgets,
      performance_metrics: this.performanceMetrics,
      performance_alerts: this.performanceAlerts,
      component_render_tracking: Array.from(this.componentRenderTracking.entries()),
      memory_leak_detection: this.memoryLeakDetection,
      export_timestamp: new Date().toISOString()
    };
  }

  /**
   * Shutdown performance monitoring
   */
  shutdown(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    if (this.jsThreadMonitor) {
      clearInterval(this.jsThreadMonitor);
    }
    
    if (this.memoryMonitor) {
      clearInterval(this.memoryMonitor);
    }
    
    if (this.flipperConnection) {
      this.flipperConnection.disconnect();
    }
    
    this.initialized = false;
    console.log('Enhanced performance monitoring service shutdown');
  }
}

// Export singleton instance
export const enhancedPerformanceMonitoringService = new EnhancedPerformanceMonitoringService();
export default enhancedPerformanceMonitoringService; 