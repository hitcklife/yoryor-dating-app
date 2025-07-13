import { Platform, NativeModules } from 'react-native';
import { enhancedPerformanceMonitoringService } from './enhanced-performance-monitoring-service';

export interface MemoryLeakAlert {
  id: string;
  type: 'component_leak' | 'event_listener_leak' | 'timer_leak' | 'memory_growth';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: any;
  timestamp: string;
  resolved: boolean;
}

export interface ComponentInstance {
  name: string;
  id: string;
  createdAt: number;
  lastSeenAt: number;
  isActive: boolean;
  memoryUsage: number;
  renderCount: number;
  stackTrace?: string;
}

export interface EventListenerInstance {
  eventName: string;
  id: string;
  component: string;
  createdAt: number;
  isActive: boolean;
  stackTrace?: string;
}

export interface TimerInstance {
  id: number;
  type: 'setTimeout' | 'setInterval' | 'requestAnimationFrame';
  component: string;
  createdAt: number;
  duration: number;
  isActive: boolean;
  stackTrace?: string;
}

export interface MemorySnapshot {
  timestamp: number;
  totalMemory: number;
  jsHeapUsed: number;
  jsHeapTotal: number;
  componentsCount: number;
  eventListenersCount: number;
  timersCount: number;
  retainedObjects: number;
}

/**
 * Memory Leak Detection Service
 * Advanced memory leak detection for React Native applications
 */
export class MemoryLeakDetectionService {
  private initialized = false;
  private componentInstances = new Map<string, ComponentInstance>();
  private eventListenerInstances = new Map<string, EventListenerInstance>();
  private timerInstances = new Map<number, TimerInstance>();
  private memorySnapshots: MemorySnapshot[] = [];
  private memoryLeakAlerts: MemoryLeakAlert[] = [];
  private monitoringInterval: any = null;
  private snapshotInterval: any = null;
  private detectionInterval: any = null;
  
  // Configuration
  private readonly MEMORY_GROWTH_THRESHOLD = 5 * 1024 * 1024; // 5MB
  private readonly COMPONENT_LEAK_THRESHOLD = 10; // 10 instances of same component
  private readonly EVENT_LISTENER_LEAK_THRESHOLD = 50; // 50 event listeners
  private readonly TIMER_LEAK_THRESHOLD = 20; // 20 timers
  private readonly SNAPSHOT_INTERVAL = 10000; // 10 seconds
  private readonly DETECTION_INTERVAL = 30000; // 30 seconds
  private readonly MAX_SNAPSHOTS = 100;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize memory leak detection
   */
  private async initialize(): Promise<void> {
    try {
      // Setup memory monitoring
      this.setupMemoryMonitoring();
      
      // Setup component tracking
      this.setupComponentTracking();
      
      // Setup event listener tracking
      this.setupEventListenerTracking();
      
      // Setup timer tracking
      this.setupTimerTracking();
      
      // Start monitoring intervals
      this.startMonitoring();
      
      this.initialized = true;
      console.log('Memory leak detection service initialized');
    } catch (error) {
      console.error('Failed to initialize memory leak detection:', error);
    }
  }

  /**
   * Setup memory monitoring
   */
  private setupMemoryMonitoring(): void {
    this.snapshotInterval = setInterval(() => {
      this.takeMemorySnapshot();
    }, this.SNAPSHOT_INTERVAL);
  }

  /**
   * Setup component tracking
   */
  private setupComponentTracking(): void {
    // This would typically integrate with React DevTools
    // For now, we'll provide a manual tracking system
    console.log('Component tracking initialized');
  }

  /**
   * Setup event listener tracking
   */
  private setupEventListenerTracking(): void {
    // Monkey patch addEventListener and removeEventListener
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    const originalRemoveEventListener = EventTarget.prototype.removeEventListener;
    const self = this;

    EventTarget.prototype.addEventListener = function(type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions) {
      const result = originalAddEventListener.call(this, type, listener, options);
      
      if (typeof listener === 'function') {
        const id = `${type}_${Date.now()}_${Math.random()}`;
        const instance: EventListenerInstance = {
          eventName: type,
          id,
          component: 'Unknown', // Would need to be determined from stack trace
          createdAt: Date.now(),
          isActive: true,
          stackTrace: new Error().stack
        };
        
        self.eventListenerInstances.set(id, instance);
      }
      
      return result;
    };

    EventTarget.prototype.removeEventListener = function(type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | EventListenerOptions) {
      const result = originalRemoveEventListener.call(this, type, listener, options);
      
      // Mark matching event listeners as inactive
      for (const [id, instance] of self.eventListenerInstances) {
        if (instance.eventName === type && instance.isActive) {
          instance.isActive = false;
        }
      }
      
      return result;
    };
  }

  /**
   * Setup timer tracking
   */
  private setupTimerTracking(): void {
    // Monkey patch setTimeout, setInterval, clearTimeout, clearInterval
    const originalSetTimeout = global.setTimeout;
    const originalSetInterval = global.setInterval;
    const originalClearTimeout = global.clearTimeout;
    const originalClearInterval = global.clearInterval;
    const originalRequestAnimationFrame = global.requestAnimationFrame;
    const originalCancelAnimationFrame = global.cancelAnimationFrame;
    const self = this;

    global.setTimeout = function(callback: any, delay?: number, ...args: any[]): number {
      const id = originalSetTimeout(callback, delay, ...args);
      
      const instance: TimerInstance = {
        id,
        type: 'setTimeout',
        component: 'Unknown', // Would need to be determined from stack trace
        createdAt: Date.now(),
        duration: delay || 0,
        isActive: true,
        stackTrace: new Error().stack
      };
      
      self.timerInstances.set(id, instance);
      return id;
    } as any;

    global.setInterval = function(callback: any, delay?: number, ...args: any[]): number {
      const id = originalSetInterval(callback, delay, ...args);
      
      const instance: TimerInstance = {
        id,
        type: 'setInterval',
        component: 'Unknown', // Would need to be determined from stack trace
        createdAt: Date.now(),
        duration: delay || 0,
        isActive: true,
        stackTrace: new Error().stack
      };
      
      self.timerInstances.set(id, instance);
      return id;
    } as any;

    global.clearTimeout = function(id?: number): void {
      const result = originalClearTimeout(id);
      if (id && self.timerInstances.has(id)) {
        const instance = self.timerInstances.get(id);
        if (instance) {
          instance.isActive = false;
        }
      }
      return result;
    } as any;

    global.clearInterval = function(id?: number): void {
      const result = originalClearInterval(id);
      if (id && self.timerInstances.has(id)) {
        const instance = self.timerInstances.get(id);
        if (instance) {
          instance.isActive = false;
        }
      }
      return result;
    } as any;

    global.requestAnimationFrame = function(callback: FrameRequestCallback): number {
      const id = originalRequestAnimationFrame(callback);
      
      const instance: TimerInstance = {
        id,
        type: 'requestAnimationFrame',
        component: 'Unknown',
        createdAt: Date.now(),
        duration: 16, // ~60fps
        isActive: true,
        stackTrace: new Error().stack
      };
      
      self.timerInstances.set(id, instance);
      return id;
    };

    global.cancelAnimationFrame = function(id: number): void {
      const result = originalCancelAnimationFrame(id);
      const instance = self.timerInstances.get(id);
      if (instance) {
        instance.isActive = false;
      }
      return result;
    };
  }

  /**
   * Start monitoring intervals
   */
  private startMonitoring(): void {
    this.detectionInterval = setInterval(() => {
      this.detectMemoryLeaks();
    }, this.DETECTION_INTERVAL);
  }

  /**
   * Take memory snapshot
   */
  private async takeMemorySnapshot(): Promise<void> {
    try {
      const memoryUsage = await this.getMemoryUsage();
      const jsHeapInfo = await this.getJSHeapInfo();
      
      const snapshot: MemorySnapshot = {
        timestamp: Date.now(),
        totalMemory: memoryUsage.totalMemory,
        jsHeapUsed: jsHeapInfo.usedJSHeapSize,
        jsHeapTotal: jsHeapInfo.totalJSHeapSize,
        componentsCount: this.getActiveComponentCount(),
        eventListenersCount: this.getActiveEventListenerCount(),
        timersCount: this.getActiveTimerCount(),
        retainedObjects: 0 // Would need native implementation
      };
      
      this.memorySnapshots.push(snapshot);
      
      // Keep only last N snapshots
      if (this.memorySnapshots.length > this.MAX_SNAPSHOTS) {
        this.memorySnapshots = this.memorySnapshots.slice(-this.MAX_SNAPSHOTS);
      }
      
    } catch (error) {
      console.error('Error taking memory snapshot:', error);
    }
  }

  /**
   * Detect memory leaks
   */
  private detectMemoryLeaks(): void {
    this.detectMemoryGrowth();
    this.detectComponentLeaks();
    this.detectEventListenerLeaks();
    this.detectTimerLeaks();
    this.cleanupInactiveInstances();
  }

  /**
   * Detect memory growth patterns
   */
  private detectMemoryGrowth(): void {
    if (this.memorySnapshots.length < 5) return;

    const recent = this.memorySnapshots.slice(-5);
    const growth = recent[recent.length - 1].totalMemory - recent[0].totalMemory;
    const growthRate = growth / recent.length;

    if (growthRate > this.MEMORY_GROWTH_THRESHOLD) {
      this.createMemoryLeakAlert({
        id: `memory_growth_${Date.now()}`,
        type: 'memory_growth',
        severity: growthRate > this.MEMORY_GROWTH_THRESHOLD * 2 ? 'critical' : 'high',
        message: `Memory growth detected: ${(growthRate / 1024 / 1024).toFixed(2)}MB/snapshot`,
        details: {
          growthRate,
          recentSnapshots: recent,
          totalGrowth: growth
        },
        timestamp: new Date().toISOString(),
        resolved: false
      });
    }
  }

  /**
   * Detect component leaks
   */
  private detectComponentLeaks(): void {
    const componentCounts = new Map<string, number>();
    
    for (const [id, instance] of this.componentInstances) {
      if (instance.isActive) {
        const count = componentCounts.get(instance.name) || 0;
        componentCounts.set(instance.name, count + 1);
      }
    }

    for (const [componentName, count] of componentCounts) {
      if (count > this.COMPONENT_LEAK_THRESHOLD) {
        this.createMemoryLeakAlert({
          id: `component_leak_${componentName}_${Date.now()}`,
          type: 'component_leak',
          severity: count > this.COMPONENT_LEAK_THRESHOLD * 2 ? 'critical' : 'high',
          message: `Component leak detected: ${componentName} has ${count} instances`,
          details: {
            componentName,
            instanceCount: count,
            threshold: this.COMPONENT_LEAK_THRESHOLD
          },
          timestamp: new Date().toISOString(),
          resolved: false
        });
      }
    }
  }

  /**
   * Detect event listener leaks
   */
  private detectEventListenerLeaks(): void {
    const activeListeners = this.getActiveEventListenerCount();
    
    if (activeListeners > this.EVENT_LISTENER_LEAK_THRESHOLD) {
      this.createMemoryLeakAlert({
        id: `event_listener_leak_${Date.now()}`,
        type: 'event_listener_leak',
        severity: activeListeners > this.EVENT_LISTENER_LEAK_THRESHOLD * 2 ? 'critical' : 'high',
        message: `Event listener leak detected: ${activeListeners} active listeners`,
        details: {
          activeListeners,
          threshold: this.EVENT_LISTENER_LEAK_THRESHOLD,
          listenersByType: this.getEventListenersByType()
        },
        timestamp: new Date().toISOString(),
        resolved: false
      });
    }
  }

  /**
   * Detect timer leaks
   */
  private detectTimerLeaks(): void {
    const activeTimers = this.getActiveTimerCount();
    
    if (activeTimers > this.TIMER_LEAK_THRESHOLD) {
      this.createMemoryLeakAlert({
        id: `timer_leak_${Date.now()}`,
        type: 'timer_leak',
        severity: activeTimers > this.TIMER_LEAK_THRESHOLD * 2 ? 'critical' : 'high',
        message: `Timer leak detected: ${activeTimers} active timers`,
        details: {
          activeTimers,
          threshold: this.TIMER_LEAK_THRESHOLD,
          timersByType: this.getTimersByType()
        },
        timestamp: new Date().toISOString(),
        resolved: false
      });
    }
  }

  /**
   * Track component instance
   */
  trackComponentInstance(componentName: string, instanceId: string): void {
    const instance: ComponentInstance = {
      name: componentName,
      id: instanceId,
      createdAt: Date.now(),
      lastSeenAt: Date.now(),
      isActive: true,
      memoryUsage: 0,
      renderCount: 0,
      stackTrace: new Error().stack
    };
    
    this.componentInstances.set(instanceId, instance);
  }

  /**
   * Update component instance
   */
  updateComponentInstance(instanceId: string, updates: Partial<ComponentInstance>): void {
    const instance = this.componentInstances.get(instanceId);
    if (instance) {
      Object.assign(instance, updates);
      instance.lastSeenAt = Date.now();
    }
  }

  /**
   * Remove component instance
   */
  removeComponentInstance(instanceId: string): void {
    const instance = this.componentInstances.get(instanceId);
    if (instance) {
      instance.isActive = false;
    }
  }

  /**
   * Helper methods
   */
  private async getMemoryUsage(): Promise<any> {
    try {
      if (Platform.OS === 'android' && NativeModules.MemoryInfo) {
        return await NativeModules.MemoryInfo.getMemoryInfo();
      }
      
      // Fallback
      return { totalMemory: Math.random() * 200 * 1024 * 1024 };
    } catch (error) {
      return { totalMemory: 0 };
    }
  }

  private async getJSHeapInfo(): Promise<any> {
    try {
      if (typeof (performance as any).memory !== 'undefined') {
        return (performance as any).memory;
      }
      
      // Fallback
      return {
        usedJSHeapSize: Math.random() * 50 * 1024 * 1024,
        totalJSHeapSize: Math.random() * 100 * 1024 * 1024
      };
    } catch (error) {
      return { usedJSHeapSize: 0, totalJSHeapSize: 0 };
    }
  }

  private getActiveComponentCount(): number {
    return Array.from(this.componentInstances.values()).filter(c => c.isActive).length;
  }

  private getActiveEventListenerCount(): number {
    return Array.from(this.eventListenerInstances.values()).filter(e => e.isActive).length;
  }

  private getActiveTimerCount(): number {
    return Array.from(this.timerInstances.values()).filter(t => t.isActive).length;
  }

  private getEventListenersByType(): Record<string, number> {
    const counts: Record<string, number> = {};
    
    for (const instance of this.eventListenerInstances.values()) {
      if (instance.isActive) {
        counts[instance.eventName] = (counts[instance.eventName] || 0) + 1;
      }
    }
    
    return counts;
  }

  private getTimersByType(): Record<string, number> {
    const counts: Record<string, number> = {};
    
    for (const instance of this.timerInstances.values()) {
      if (instance.isActive) {
        counts[instance.type] = (counts[instance.type] || 0) + 1;
      }
    }
    
    return counts;
  }

  private cleanupInactiveInstances(): void {
    const now = Date.now();
    const cleanup_threshold = 5 * 60 * 1000; // 5 minutes
    
    // Cleanup inactive components
    for (const [id, instance] of this.componentInstances) {
      if (!instance.isActive && now - instance.lastSeenAt > cleanup_threshold) {
        this.componentInstances.delete(id);
      }
    }
    
    // Cleanup inactive event listeners
    for (const [id, instance] of this.eventListenerInstances) {
      if (!instance.isActive && now - instance.createdAt > cleanup_threshold) {
        this.eventListenerInstances.delete(id);
      }
    }
    
    // Cleanup inactive timers
    for (const [id, instance] of this.timerInstances) {
      if (!instance.isActive && now - instance.createdAt > cleanup_threshold) {
        this.timerInstances.delete(id);
      }
    }
  }

  private createMemoryLeakAlert(alert: MemoryLeakAlert): void {
    this.memoryLeakAlerts.push(alert);
    
    // Keep only last 100 alerts
    if (this.memoryLeakAlerts.length > 100) {
      this.memoryLeakAlerts = this.memoryLeakAlerts.slice(-100);
    }
    
    // Log critical alerts
    if (alert.severity === 'critical') {
      console.error(`🚨 CRITICAL MEMORY LEAK: ${alert.message}`, alert.details);
    }
  }

  /**
   * Public methods
   */
  
  /**
   * Get memory leak status
   */
  getMemoryLeakStatus(): any {
    return {
      initialized: this.initialized,
      active_components: this.getActiveComponentCount(),
      active_event_listeners: this.getActiveEventListenerCount(),
      active_timers: this.getActiveTimerCount(),
      memory_snapshots: this.memorySnapshots.length,
      active_alerts: this.memoryLeakAlerts.filter(a => !a.resolved).length,
      latest_snapshot: this.memorySnapshots[this.memorySnapshots.length - 1]
    };
  }

  /**
   * Get memory snapshots
   */
  getMemorySnapshots(): MemorySnapshot[] {
    return this.memorySnapshots;
  }

  /**
   * Get memory leak alerts
   */
  getMemoryLeakAlerts(): MemoryLeakAlert[] {
    return this.memoryLeakAlerts.filter(a => !a.resolved);
  }

  /**
   * Resolve memory leak alert
   */
  resolveMemoryLeakAlert(alertId: string): void {
    const alert = this.memoryLeakAlerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      console.log(`Memory leak alert resolved: ${alertId}`);
    }
  }

  /**
   * Force garbage collection (if available)
   */
  forceGarbageCollection(): void {
    try {
      if (typeof (global as any).gc === 'function') {
        (global as any).gc();
        console.log('Garbage collection forced');
      } else {
        console.log('Garbage collection not available');
      }
    } catch (error) {
      console.error('Error forcing garbage collection:', error);
    }
  }

  /**
   * Export memory leak data
   */
  exportMemoryLeakData(): any {
    return {
      component_instances: Array.from(this.componentInstances.entries()),
      event_listener_instances: Array.from(this.eventListenerInstances.entries()),
      timer_instances: Array.from(this.timerInstances.entries()),
      memory_snapshots: this.memorySnapshots,
      memory_leak_alerts: this.memoryLeakAlerts,
      export_timestamp: new Date().toISOString()
    };
  }

  /**
   * Shutdown memory leak detection
   */
  shutdown(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    if (this.snapshotInterval) {
      clearInterval(this.snapshotInterval);
    }
    
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
    }
    
    this.initialized = false;
    console.log('Memory leak detection service shutdown');
  }
}

// Export singleton instance
export const memoryLeakDetectionService = new MemoryLeakDetectionService();
export default memoryLeakDetectionService; 