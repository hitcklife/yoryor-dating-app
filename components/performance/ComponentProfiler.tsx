import React, { Profiler, ProfilerOnRenderCallback, ReactNode } from 'react';
import { enhancedPerformanceMonitoringService } from '../../services/enhanced-performance-monitoring-service';

interface ComponentProfilerProps {
  id: string;
  children: ReactNode;
  onRender?: ProfilerOnRenderCallback;
  enabled?: boolean;
}

/**
 * Component Profiler
 * Wraps components to track render performance
 */
export const ComponentProfiler: React.FC<ComponentProfilerProps> = ({
  id,
  children,
  onRender,
  enabled = __DEV__
}) => {
  const handleRender: ProfilerOnRenderCallback = (
    id: string,
    phase: "mount" | "update" | "nested-update",
    actualDuration: number,
    baseDuration: number,
    startTime: number,
    commitTime: number
  ) => {
    if (enabled) {
      // Track component render metrics
      enhancedPerformanceMonitoringService.trackComponentRender(
        id,
        actualDuration,
        0, // props count would need to be calculated differently
        phase === 'update' ? 1 : 0,
        0 // children count would need to be calculated differently
      );

      // Log slow renders in development
      if (__DEV__ && actualDuration > 16) {
        console.warn(`🐌 Slow render detected: ${id} took ${actualDuration.toFixed(2)}ms (${phase})`);
      }
    }

    // Call custom onRender if provided
    if (onRender) {
      onRender(id, phase, actualDuration, baseDuration, startTime, commitTime);
    }
  };

  return (
    <Profiler id={id} onRender={handleRender}>
      {children}
    </Profiler>
  );
};

/**
 * HOC for automatic component profiling
 */
export function withComponentProfiler<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) {
  const ProfiledComponent = (props: P) => {
    const profilerName = componentName || Component.displayName || Component.name || 'Unknown';
    
    return (
      <ComponentProfiler id={profilerName}>
        <Component {...props} />
      </ComponentProfiler>
    );
  };

  ProfiledComponent.displayName = `withComponentProfiler(${Component.displayName || Component.name})`;
  
  return ProfiledComponent;
}

/**
 * Hook for manual performance tracking
 */
export function useComponentPerformance(componentName: string) {
  const startTime = React.useRef<number>(0);
  const renderCount = React.useRef<number>(0);

  const startTracking = React.useCallback(() => {
    startTime.current = performance.now();
  }, []);

  const endTracking = React.useCallback(() => {
    const endTime = performance.now();
    const renderTime = endTime - startTime.current;
    
    enhancedPerformanceMonitoringService.trackComponentRender(
      componentName,
      renderTime,
      0, // props count
      renderCount.current,
      0 // children count
    );

    renderCount.current += 1;
  }, [componentName]);

  React.useEffect(() => {
    startTracking();
    return () => {
      endTracking();
    };
  });

  return { startTracking, endTracking };
}

/**
 * Component for debugging render performance
 */
export const RenderPerformanceDebugger: React.FC<{
  componentName: string;
  threshold?: number;
}> = ({ componentName, threshold = 16 }) => {
  const [renderMetrics, setRenderMetrics] = React.useState<any[]>([]);

  React.useEffect(() => {
    const interval = setInterval(() => {
      const status = enhancedPerformanceMonitoringService.getPerformanceStatus();
      if (status.current_metrics?.component_renders) {
        const componentRenders = status.current_metrics.component_renders.filter(
          (render: any) => render.component_name === componentName
        );
        setRenderMetrics(componentRenders);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [componentName]);

  if (!__DEV__) return null;

  const slowRenders = renderMetrics.filter(render => render.render_time > threshold);

  return (
    <div style={{
      position: 'fixed',
      top: 10,
      right: 10,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: 10,
      borderRadius: 5,
      fontSize: 12,
      zIndex: 9999,
      maxWidth: 300,
      maxHeight: 200,
      overflow: 'auto'
    }}>
      <h4>Performance: {componentName}</h4>
      <div>Total Renders: {renderMetrics.length}</div>
      <div>Slow Renders: {slowRenders.length}</div>
      {slowRenders.length > 0 && (
        <div>
          <h5>Recent Slow Renders:</h5>
          {slowRenders.slice(-5).map((render, index) => (
            <div key={index}>
              {render.render_time.toFixed(2)}ms at {new Date(render.timestamp).toLocaleTimeString()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ComponentProfiler; 