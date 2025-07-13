import { useEffect, useRef, useCallback } from 'react';
import { enhancedPerformanceMonitoringService } from '../../services/enhanced-performance-monitoring-service';
import { memoryLeakDetectionService } from '../../services/memory-leak-detection-service';
import { performanceReportingService } from '../../services/performance-reporting-service';

interface PerformanceMonitoringHookOptions {
  componentName: string;
  trackRenders?: boolean;
  trackMemory?: boolean;
  trackNavigation?: boolean;
}

interface PerformanceMonitoringHook {
  trackApiCall: (endpoint: string, method: string, duration: number, statusCode: number) => void;
  trackImageLoad: (imageUri: string, loadTime: number, cacheHit: boolean, sizeBytes: number) => void;
  trackNavigation: (fromScreen: string, toScreen: string, duration: number) => void;
  startRenderTracking: () => void;
  endRenderTracking: () => void;
  getPerformanceStatus: () => any;
  forceGarbageCollection: () => void;
  exportPerformanceData: () => any;
}

/**
 * Hook for easy performance monitoring integration
 */
export function usePerformanceMonitoring(options: PerformanceMonitoringHookOptions): PerformanceMonitoringHook {
  const { componentName, trackRenders = true, trackMemory = true } = options;
  
  const renderStartTime = useRef<number>(0);
  const componentInstanceId = useRef<string>(`${componentName}_${Date.now()}_${Math.random()}`);
  const mountTime = useRef<number>(Date.now());

  // Track component lifecycle
  useEffect(() => {
    if (trackMemory) {
      // Track component instance creation
      memoryLeakDetectionService.trackComponentInstance(componentName, componentInstanceId.current);
    }

    return () => {
      if (trackMemory) {
        // Track component instance cleanup
        memoryLeakDetectionService.removeComponentInstance(componentInstanceId.current);
      }
    };
  }, [componentName, trackMemory]);

  // Track render times
  useEffect(() => {
    if (trackRenders) {
      renderStartTime.current = performance.now();
      
      // Use requestAnimationFrame to measure actual render time
      const handle = requestAnimationFrame(() => {
        const renderTime = performance.now() - renderStartTime.current;
        enhancedPerformanceMonitoringService.trackComponentRender(
          componentName,
          renderTime,
          0, // props count - would need to be calculated
          1, // state updates
          0  // children count - would need to be calculated
        );
      });

      return () => {
        cancelAnimationFrame(handle);
      };
    }
  });

  // Track API calls
  const trackApiCall = useCallback((endpoint: string, method: string, duration: number, statusCode: number) => {
    enhancedPerformanceMonitoringService.trackApiCall(endpoint, method, duration, statusCode);
  }, []);

  // Track image loading
  const trackImageLoad = useCallback((imageUri: string, loadTime: number, cacheHit: boolean, sizeBytes: number) => {
    enhancedPerformanceMonitoringService.trackImageLoad(imageUri, loadTime, cacheHit, sizeBytes);
  }, []);

  // Track navigation
  const trackNavigation = useCallback((fromScreen: string, toScreen: string, duration: number) => {
    // This would integrate with React Navigation
    console.log(`Navigation tracked: ${fromScreen} → ${toScreen} (${duration}ms)`);
  }, []);

  // Manual render tracking
  const startRenderTracking = useCallback(() => {
    renderStartTime.current = performance.now();
  }, []);

  const endRenderTracking = useCallback(() => {
    const renderTime = performance.now() - renderStartTime.current;
    enhancedPerformanceMonitoringService.trackComponentRender(
      componentName,
      renderTime,
      0, // props count
      1, // state updates
      0  // children count
    );
  }, [componentName]);

  // Get performance status
  const getPerformanceStatus = useCallback(() => {
    return {
      enhanced: enhancedPerformanceMonitoringService.getPerformanceStatus(),
      memory: memoryLeakDetectionService.getMemoryLeakStatus(),
      reporting: performanceReportingService.getLatestPerformanceReport()
    };
  }, []);

  // Force garbage collection
  const forceGarbageCollection = useCallback(() => {
    memoryLeakDetectionService.forceGarbageCollection();
  }, []);

  // Export performance data
  const exportPerformanceData = useCallback(() => {
    return {
      enhanced: enhancedPerformanceMonitoringService.exportPerformanceData(),
      memory: memoryLeakDetectionService.exportMemoryLeakData(),
      reporting: performanceReportingService.exportPerformanceData()
    };
  }, []);

  return {
    trackApiCall,
    trackImageLoad,
    trackNavigation,
    startRenderTracking,
    endRenderTracking,
    getPerformanceStatus,
    forceGarbageCollection,
    exportPerformanceData
  };
}

/**
 * Hook for monitoring API calls
 */
export function useApiPerformanceMonitoring() {
  const trackApiCall = useCallback((endpoint: string, method: string, duration: number, statusCode: number) => {
    enhancedPerformanceMonitoringService.trackApiCall(endpoint, method, duration, statusCode);
  }, []);

  return { trackApiCall };
}

/**
 * Hook for monitoring image loading
 */
export function useImagePerformanceMonitoring() {
  const trackImageLoad = useCallback((imageUri: string, loadTime: number, cacheHit: boolean, sizeBytes: number) => {
    enhancedPerformanceMonitoringService.trackImageLoad(imageUri, loadTime, cacheHit, sizeBytes);
  }, []);

  return { trackImageLoad };
}

/**
 * Hook for component-specific performance monitoring
 */
export function useComponentPerformanceMonitoring(componentName: string) {
  const renderStartTime = useRef<number>(0);
  const componentInstanceId = useRef<string>(`${componentName}_${Date.now()}_${Math.random()}`);

  useEffect(() => {
    // Track component instance
    memoryLeakDetectionService.trackComponentInstance(componentName, componentInstanceId.current);
    
    return () => {
      // Cleanup component instance
      memoryLeakDetectionService.removeComponentInstance(componentInstanceId.current);
    };
  }, [componentName]);

  const startRenderTracking = useCallback(() => {
    renderStartTime.current = performance.now();
  }, []);

  const endRenderTracking = useCallback(() => {
    const renderTime = performance.now() - renderStartTime.current;
    enhancedPerformanceMonitoringService.trackComponentRender(
      componentName,
      renderTime,
      0, // props count
      1, // state updates
      0  // children count
    );
  }, [componentName]);

  return {
    startRenderTracking,
    endRenderTracking,
    componentInstanceId: componentInstanceId.current
  };
}

export default usePerformanceMonitoring; 