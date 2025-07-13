import { enhancedPerformanceMonitoringService } from './enhanced-performance-monitoring-service';
import { memoryLeakDetectionService } from './memory-leak-detection-service';
import { performanceMonitoringService } from './performance-monitoring-service';
import { EventEmitter } from './realtime/event-emitter';

export interface PerformanceReport {
  id: string;
  timestamp: string;
  duration: string;
  summary: PerformanceReportSummary;
  app_performance: AppPerformanceMetrics;
  memory_analysis: MemoryAnalysis;
  database_performance: DatabasePerformanceMetrics;
  component_performance: ComponentPerformanceMetrics;
  api_performance: ApiPerformanceMetrics;
  budget_violations: BudgetViolation[];
  recommendations: string[];
  alerts: PerformanceAlertSummary[];
  trends: PerformanceTrends;
}

export interface PerformanceReportSummary {
  overall_score: number; // 0-100
  performance_grade: 'A' | 'B' | 'C' | 'D' | 'F';
  critical_issues: number;
  high_issues: number;
  medium_issues: number;
  low_issues: number;
  total_issues: number;
}

export interface AppPerformanceMetrics {
  startup_time: number;
  js_thread_utilization: number;
  memory_usage: number;
  frame_rate: number;
  bridge_calls_per_second: number;
  active_components: number;
  slow_components: string[];
}

export interface MemoryAnalysis {
  current_usage: number;
  peak_usage: number;
  growth_rate: number;
  potential_leaks: number;
  component_leaks: string[];
  event_listener_leaks: number;
  timer_leaks: number;
  gc_frequency: number;
}

export interface DatabasePerformanceMetrics {
  query_count: number;
  slow_queries: number;
  avg_query_time: number;
  max_query_time: number;
  connection_pool_usage: number;
  database_size: number;
  index_recommendations: string[];
}

export interface ComponentPerformanceMetrics {
  total_renders: number;
  slow_renders: number;
  avg_render_time: number;
  max_render_time: number;
  problematic_components: string[];
  render_efficiency: number;
}

export interface ApiPerformanceMetrics {
  total_requests: number;
  slow_requests: number;
  avg_response_time: number;
  max_response_time: number;
  error_rate: number;
  timeout_rate: number;
  slow_endpoints: string[];
}

export interface BudgetViolation {
  type: 'app_startup' | 'chat_list_load' | 'message_send' | 'image_load' | 'component_render' | 'js_thread' | 'memory';
  budget: number;
  actual: number;
  violation_percentage: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
}

export interface PerformanceAlertSummary {
  type: string;
  count: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  latest_timestamp: string;
}

export interface PerformanceTrends {
  startup_time_trend: TrendData;
  memory_usage_trend: TrendData;
  js_thread_trend: TrendData;
  frame_rate_trend: TrendData;
  api_response_trend: TrendData;
}

export interface TrendData {
  current: number;
  previous: number;
  change_percentage: number;
  trend_direction: 'improving' | 'stable' | 'degrading';
  data_points: number[];
}

export interface ReportingConfiguration {
  enabled: boolean;
  report_interval: number; // milliseconds
  alert_thresholds: {
    critical_score: number;
    high_violations: number;
    memory_leak_threshold: number;
    performance_degradation: number;
  };
  notification_channels: {
    console: boolean;
    flipper: boolean;
    webhook?: string;
    email?: string;
  };
  retention_days: number;
}

/**
 * Automatic Performance Reporting Service
 * Generates comprehensive performance reports and sends alerts
 */
export class PerformanceReportingService {
  private initialized = false;
  private eventEmitter = new EventEmitter();
  private reportingInterval: any = null;
  private performanceReports: PerformanceReport[] = [];
  private previousMetrics: any = null;
  private reportCounter = 0;
  
  private configuration: ReportingConfiguration = {
    enabled: true,
    report_interval: 5 * 60 * 1000, // 5 minutes
    alert_thresholds: {
      critical_score: 30,
      high_violations: 5,
      memory_leak_threshold: 10 * 1024 * 1024, // 10MB
      performance_degradation: 20 // 20% degradation
    },
    notification_channels: {
      console: true,
      flipper: true
    },
    retention_days: 7
  };

  constructor() {
    this.initialize();
  }

  /**
   * Initialize performance reporting
   */
  private async initialize(): Promise<void> {
    try {
      // Start reporting interval
      this.startReporting();
      
      // Setup event listeners
      this.setupEventListeners();
      
      this.initialized = true;
      console.log('Performance reporting service initialized');
    } catch (error) {
      console.error('Failed to initialize performance reporting:', error);
    }
  }

  /**
   * Start performance reporting
   */
  private startReporting(): void {
    if (!this.configuration.enabled) return;
    
    this.reportingInterval = setInterval(async () => {
      try {
        await this.generateAndSendReport();
      } catch (error) {
        console.error('Error generating performance report:', error);
      }
    }, this.configuration.report_interval);
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Listen for critical performance alerts
    this.eventEmitter.on('connection.state.changed', (data) => {
      if (data.quality === 'poor') {
        this.sendImmediateAlert('Critical performance degradation detected', {
          connection_quality: data.quality,
          connection_state: data.state
        });
      }
    });
  }

  /**
   * Generate and send performance report
   */
  private async generateAndSendReport(): Promise<void> {
    const report = await this.generatePerformanceReport();
    
    // Store report
    this.performanceReports.push(report);
    
    // Cleanup old reports
    this.cleanupOldReports();
    
    // Send report
    await this.sendReport(report);
    
    // Check for alerts
    await this.checkForAlerts(report);
    
    // Update previous metrics for trend analysis
    this.updatePreviousMetrics(report);
  }

  /**
   * Generate comprehensive performance report
   */
  private async generatePerformanceReport(): Promise<PerformanceReport> {
    const timestamp = new Date().toISOString();
    
    // Collect metrics from all monitoring services
    const enhancedMetrics = enhancedPerformanceMonitoringService.getPerformanceStatus();
    const memoryMetrics = memoryLeakDetectionService.getMemoryLeakStatus();
    const databaseMetrics = await performanceMonitoringService.getPerformanceStatus();
    
    // Generate report sections
    const appPerformance = this.generateAppPerformanceMetrics(enhancedMetrics);
    const memoryAnalysis = this.generateMemoryAnalysis(memoryMetrics);
    const databasePerformance = this.generateDatabasePerformanceMetrics(databaseMetrics);
    const componentPerformance = this.generateComponentPerformanceMetrics(enhancedMetrics);
    const apiPerformance = this.generateApiPerformanceMetrics(enhancedMetrics);
    const budgetViolations = this.generateBudgetViolations(enhancedMetrics);
    const recommendations = this.generateRecommendations(enhancedMetrics, memoryMetrics, databaseMetrics);
    const alerts = this.generateAlertSummary(enhancedMetrics, memoryMetrics);
    const trends = this.generateTrends(enhancedMetrics);
    
    // Calculate overall score
    const summary = this.generatePerformanceScore(
      appPerformance, 
      memoryAnalysis, 
      databasePerformance, 
      componentPerformance, 
      apiPerformance, 
      budgetViolations
    );

    const report: PerformanceReport = {
      id: `report_${this.reportCounter++}_${Date.now()}`,
      timestamp,
      duration: this.getReportDuration(),
      summary,
      app_performance: appPerformance,
      memory_analysis: memoryAnalysis,
      database_performance: databasePerformance,
      component_performance: componentPerformance,
      api_performance: apiPerformance,
      budget_violations: budgetViolations,
      recommendations,
      alerts,
      trends
    };

    return report;
  }

  /**
   * Generate app performance metrics
   */
  private generateAppPerformanceMetrics(metrics: any): AppPerformanceMetrics {
    const currentMetrics = metrics.current_metrics || {};
    
    return {
      startup_time: metrics.startup_time || 0,
      js_thread_utilization: currentMetrics.js_thread_utilization || 0,
      memory_usage: currentMetrics.memory_usage || 0,
      frame_rate: currentMetrics.frame_rate || 60,
      bridge_calls_per_second: currentMetrics.bridge_calls || 0,
      active_components: currentMetrics.component_renders?.length || 0,
      slow_components: this.getSlowComponents(currentMetrics.component_renders || [])
    };
  }

  /**
   * Generate memory analysis
   */
  private generateMemoryAnalysis(metrics: any): MemoryAnalysis {
    const latestSnapshot = metrics.latest_snapshot || {};
    const memoryLeaks = memoryLeakDetectionService.getMemoryLeakAlerts();
    
    return {
      current_usage: latestSnapshot.totalMemory || 0,
      peak_usage: this.getPeakMemoryUsage(),
      growth_rate: this.getMemoryGrowthRate(),
      potential_leaks: memoryLeaks.length,
      component_leaks: this.getComponentLeaks(memoryLeaks),
      event_listener_leaks: metrics.active_event_listeners || 0,
      timer_leaks: metrics.active_timers || 0,
      gc_frequency: 0 // Would need native implementation
    };
  }

  /**
   * Generate database performance metrics
   */
  private generateDatabasePerformanceMetrics(metrics: any): DatabasePerformanceMetrics {
    const performanceSummary = metrics.performance_summary || {};
    const queryMetrics = performanceSummary.query_metrics || {};
    
    return {
      query_count: queryMetrics.total_queries || 0,
      slow_queries: queryMetrics.slow_queries || 0,
      avg_query_time: queryMetrics.avg_duration || 0,
      max_query_time: queryMetrics.max_duration || 0,
      connection_pool_usage: performanceSummary.connection_pool?.active_connections || 0,
      database_size: performanceSummary.database_size?.total_size || 0,
      index_recommendations: []
    };
  }

  /**
   * Generate component performance metrics
   */
  private generateComponentPerformanceMetrics(metrics: any): ComponentPerformanceMetrics {
    const componentRenders = metrics.current_metrics?.component_renders || [];
    const slowRenders = componentRenders.filter((r: any) => r.render_time > 16);
    
    return {
      total_renders: componentRenders.length,
      slow_renders: slowRenders.length,
      avg_render_time: this.calculateAverageRenderTime(componentRenders),
      max_render_time: Math.max(...componentRenders.map((r: any) => r.render_time), 0),
      problematic_components: this.getProblematicComponents(componentRenders),
      render_efficiency: this.calculateRenderEfficiency(componentRenders)
    };
  }

  /**
   * Generate API performance metrics
   */
  private generateApiPerformanceMetrics(metrics: any): ApiPerformanceMetrics {
    const apiCalls = metrics.current_metrics?.api_calls || [];
    const slowCalls = apiCalls.filter((c: any) => c.duration > 1000);
    
    return {
      total_requests: apiCalls.length,
      slow_requests: slowCalls.length,
      avg_response_time: this.calculateAverageResponseTime(apiCalls),
      max_response_time: Math.max(...apiCalls.map((c: any) => c.duration), 0),
      error_rate: this.calculateErrorRate(apiCalls),
      timeout_rate: this.calculateTimeoutRate(apiCalls),
      slow_endpoints: this.getSlowEndpoints(apiCalls)
    };
  }

  /**
   * Generate budget violations
   */
  private generateBudgetViolations(metrics: any): BudgetViolation[] {
    const violations: BudgetViolation[] = [];
    const budgets = metrics.performance_budgets || {};
    const currentMetrics = metrics.current_metrics || {};
    
    // Check each budget
    if (metrics.startup_time > budgets.app_startup) {
      violations.push({
        type: 'app_startup',
        budget: budgets.app_startup,
        actual: metrics.startup_time,
        violation_percentage: ((metrics.startup_time - budgets.app_startup) / budgets.app_startup) * 100,
        severity: this.calculateViolationSeverity(metrics.startup_time, budgets.app_startup),
        timestamp: new Date().toISOString()
      });
    }
    
    if (currentMetrics.js_thread_utilization > budgets.js_thread_utilization) {
      violations.push({
        type: 'js_thread',
        budget: budgets.js_thread_utilization,
        actual: currentMetrics.js_thread_utilization,
        violation_percentage: ((currentMetrics.js_thread_utilization - budgets.js_thread_utilization) / budgets.js_thread_utilization) * 100,
        severity: this.calculateViolationSeverity(currentMetrics.js_thread_utilization, budgets.js_thread_utilization),
        timestamp: new Date().toISOString()
      });
    }
    
    if (currentMetrics.memory_usage > budgets.memory_usage) {
      violations.push({
        type: 'memory',
        budget: budgets.memory_usage,
        actual: currentMetrics.memory_usage,
        violation_percentage: ((currentMetrics.memory_usage - budgets.memory_usage) / budgets.memory_usage) * 100,
        severity: this.calculateViolationSeverity(currentMetrics.memory_usage, budgets.memory_usage),
        timestamp: new Date().toISOString()
      });
    }
    
    return violations;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(enhancedMetrics: any, memoryMetrics: any, databaseMetrics: any): string[] {
    const recommendations: string[] = [];
    
    // App performance recommendations
    if (enhancedMetrics.startup_time > 3000) {
      recommendations.push('Consider optimizing app startup time by lazy loading components and reducing initial bundle size');
    }
    
    if (enhancedMetrics.current_metrics?.js_thread_utilization > 70) {
      recommendations.push('JS thread utilization is high. Consider using InteractionManager for non-critical operations');
    }
    
    if (enhancedMetrics.current_metrics?.memory_usage > 150 * 1024 * 1024) {
      recommendations.push('Memory usage is high. Check for memory leaks and optimize image loading');
    }
    
    // Memory leak recommendations
    if (memoryMetrics.active_event_listeners > 30) {
      recommendations.push('High number of event listeners detected. Ensure proper cleanup in useEffect hooks');
    }
    
    if (memoryMetrics.active_timers > 15) {
      recommendations.push('High number of active timers. Check for uncleaned intervals and timeouts');
    }
    
    // Database recommendations
    if (databaseMetrics.performance_summary?.query_metrics?.slow_queries > 5) {
      recommendations.push('Multiple slow database queries detected. Consider adding indexes or optimizing queries');
    }
    
    return recommendations;
  }

  /**
   * Generate alert summary
   */
  private generateAlertSummary(enhancedMetrics: any, memoryMetrics: any): PerformanceAlertSummary[] {
    const alerts: PerformanceAlertSummary[] = [];
    
    // Performance alerts
    const performanceAlerts = enhancedMetrics.active_alerts || [];
    const alertGroups = this.groupAlertsByType(performanceAlerts);
    
    for (const [type, typeAlerts] of Object.entries(alertGroups)) {
      alerts.push({
        type,
        count: (typeAlerts as any[]).length,
        severity: this.getHighestSeverity(typeAlerts as any[]),
        latest_timestamp: this.getLatestTimestamp(typeAlerts as any[])
      });
    }
    
    // Memory leak alerts
    const memoryAlerts = memoryLeakDetectionService.getMemoryLeakAlerts();
    if (memoryAlerts.length > 0) {
      alerts.push({
        type: 'memory_leak',
        count: memoryAlerts.length,
        severity: this.getHighestSeverity(memoryAlerts),
        latest_timestamp: this.getLatestTimestamp(memoryAlerts)
      });
    }
    
    return alerts;
  }

  /**
   * Generate trends
   */
  private generateTrends(metrics: any): PerformanceTrends {
    const currentMetrics = metrics.current_metrics || {};
    
    return {
      startup_time_trend: this.calculateTrend('startup_time', metrics.startup_time),
      memory_usage_trend: this.calculateTrend('memory_usage', currentMetrics.memory_usage),
      js_thread_trend: this.calculateTrend('js_thread_utilization', currentMetrics.js_thread_utilization),
      frame_rate_trend: this.calculateTrend('frame_rate', currentMetrics.frame_rate),
      api_response_trend: this.calculateTrend('api_response_time', this.getAverageApiResponseTime(currentMetrics.api_calls))
    };
  }

  /**
   * Generate performance score
   */
  private generatePerformanceScore(
    appPerformance: AppPerformanceMetrics,
    memoryAnalysis: MemoryAnalysis,
    databasePerformance: DatabasePerformanceMetrics,
    componentPerformance: ComponentPerformanceMetrics,
    apiPerformance: ApiPerformanceMetrics,
    budgetViolations: BudgetViolation[]
  ): PerformanceReportSummary {
    let score = 100;
    
    // Deduct points for various issues
    score -= Math.min(budgetViolations.length * 10, 40); // Max 40 points for budget violations
    score -= Math.min(appPerformance.slow_components.length * 5, 20); // Max 20 points for slow components
    score -= Math.min(memoryAnalysis.potential_leaks * 5, 20); // Max 20 points for memory leaks
    score -= Math.min(databasePerformance.slow_queries * 2, 10); // Max 10 points for slow queries
    score -= Math.min(componentPerformance.slow_renders * 1, 10); // Max 10 points for slow renders
    
    // Ensure score doesn't go below 0
    score = Math.max(score, 0);
    
    // Determine grade
    let grade: 'A' | 'B' | 'C' | 'D' | 'F';
    if (score >= 90) grade = 'A';
    else if (score >= 80) grade = 'B';
    else if (score >= 70) grade = 'C';
    else if (score >= 60) grade = 'D';
    else grade = 'F';
    
    // Count issues by severity
    const criticalIssues = budgetViolations.filter(v => v.severity === 'critical').length;
    const highIssues = budgetViolations.filter(v => v.severity === 'high').length;
    const mediumIssues = budgetViolations.filter(v => v.severity === 'medium').length;
    const lowIssues = budgetViolations.filter(v => v.severity === 'low').length;
    
    return {
      overall_score: score,
      performance_grade: grade,
      critical_issues: criticalIssues,
      high_issues: highIssues,
      medium_issues: mediumIssues,
      low_issues: lowIssues,
      total_issues: criticalIssues + highIssues + mediumIssues + lowIssues
    };
  }

  /**
   * Send performance report
   */
  private async sendReport(report: PerformanceReport): Promise<void> {
    if (this.configuration.notification_channels.console) {
      console.log('📊 PERFORMANCE REPORT:', JSON.stringify(report, null, 2));
    }
    
    if (this.configuration.notification_channels.flipper && __DEV__) {
      try {
        const flipper = require('react-native-flipper');
        flipper.addPlugin({
          getId() { return 'PerformanceReport'; },
          onConnect(connection: any) {
            connection.send('performanceReport', report);
          },
          onDisconnect() {},
          runInBackground() { return false; }
        });
      } catch (error) {
        console.log('Flipper not available for performance reporting');
      }
    }
    
    // Send to webhook if configured
    if (this.configuration.notification_channels.webhook) {
      try {
        await fetch(this.configuration.notification_channels.webhook, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(report)
        });
      } catch (error) {
        console.error('Failed to send performance report to webhook:', error);
      }
    }
  }

  /**
   * Check for alerts
   */
  private async checkForAlerts(report: PerformanceReport): Promise<void> {
    const { summary, budget_violations } = report;
    
    // Critical score alert
    if (summary.overall_score < this.configuration.alert_thresholds.critical_score) {
      await this.sendImmediateAlert(
        `Critical performance score: ${summary.overall_score}/100`,
        { report_id: report.id, score: summary.overall_score }
      );
    }
    
    // High violations alert
    if (summary.critical_issues + summary.high_issues >= this.configuration.alert_thresholds.high_violations) {
      await this.sendImmediateAlert(
        `High number of performance violations: ${summary.critical_issues + summary.high_issues}`,
        { report_id: report.id, violations: budget_violations }
      );
    }
    
    // Memory leak alert
    if (report.memory_analysis.current_usage > this.configuration.alert_thresholds.memory_leak_threshold) {
      await this.sendImmediateAlert(
        `Memory usage threshold exceeded: ${(report.memory_analysis.current_usage / 1024 / 1024).toFixed(1)}MB`,
        { report_id: report.id, memory_usage: report.memory_analysis.current_usage }
      );
    }
  }

  /**
   * Send immediate alert
   */
  private async sendImmediateAlert(message: string, details: any): Promise<void> {
    const alert = {
      message,
      details,
      timestamp: new Date().toISOString(),
      severity: 'critical'
    };
    
    console.error(`🚨 PERFORMANCE ALERT: ${message}`, details);
    
    // Emit event for other services
    this.eventEmitter.emit('connection.state.changed', {
      state: 'connected',
      quality: 'poor'
    });
  }

  /**
   * Helper methods
   */
  private getReportDuration(): string {
    return `${this.configuration.report_interval / 1000}s`;
  }

  private getSlowComponents(components: any[]): string[] {
    return components
      .filter(c => c.render_time > 16)
      .map(c => c.component_name)
      .slice(0, 10);
  }

  private getPeakMemoryUsage(): number {
    const snapshots = memoryLeakDetectionService.getMemorySnapshots();
    return Math.max(...snapshots.map(s => s.totalMemory), 0);
  }

  private getMemoryGrowthRate(): number {
    const snapshots = memoryLeakDetectionService.getMemorySnapshots();
    if (snapshots.length < 2) return 0;
    
    const recent = snapshots.slice(-5);
    const growth = recent[recent.length - 1].totalMemory - recent[0].totalMemory;
    return growth / recent.length;
  }

  private getComponentLeaks(alerts: any[]): string[] {
    return alerts
      .filter(a => a.type === 'component_leak')
      .map(a => a.details?.componentName)
      .filter(Boolean);
  }

  private calculateAverageRenderTime(renders: any[]): number {
    if (renders.length === 0) return 0;
    return renders.reduce((sum, r) => sum + r.render_time, 0) / renders.length;
  }

  private getProblematicComponents(renders: any[]): string[] {
    const componentCounts = new Map<string, number>();
    
    renders.forEach(r => {
      if (r.render_time > 16) {
        componentCounts.set(r.component_name, (componentCounts.get(r.component_name) || 0) + 1);
      }
    });
    
    return Array.from(componentCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);
  }

  private calculateRenderEfficiency(renders: any[]): number {
    if (renders.length === 0) return 100;
    const efficientRenders = renders.filter(r => r.render_time <= 16).length;
    return (efficientRenders / renders.length) * 100;
  }

  private calculateAverageResponseTime(apiCalls: any[]): number {
    if (apiCalls.length === 0) return 0;
    return apiCalls.reduce((sum, c) => sum + c.duration, 0) / apiCalls.length;
  }

  private calculateErrorRate(apiCalls: any[]): number {
    if (apiCalls.length === 0) return 0;
    const errors = apiCalls.filter(c => c.status_code >= 400).length;
    return (errors / apiCalls.length) * 100;
  }

  private calculateTimeoutRate(apiCalls: any[]): number {
    if (apiCalls.length === 0) return 0;
    const timeouts = apiCalls.filter(c => c.status_code === 408 || c.duration > 30000).length;
    return (timeouts / apiCalls.length) * 100;
  }

  private getSlowEndpoints(apiCalls: any[]): string[] {
    return apiCalls
      .filter(c => c.duration > 1000)
      .map(c => c.endpoint)
      .slice(0, 10);
  }

  private calculateViolationSeverity(actual: number, budget: number): 'low' | 'medium' | 'high' | 'critical' {
    const ratio = actual / budget;
    if (ratio > 3) return 'critical';
    if (ratio > 2) return 'high';
    if (ratio > 1.5) return 'medium';
    return 'low';
  }

  private groupAlertsByType(alerts: any[]): Record<string, any[]> {
    const groups: Record<string, any[]> = {};
    alerts.forEach(alert => {
      if (!groups[alert.type]) {
        groups[alert.type] = [];
      }
      groups[alert.type].push(alert);
    });
    return groups;
  }

  private getHighestSeverity(alerts: any[]): 'low' | 'medium' | 'high' | 'critical' {
    if (alerts.some(a => a.severity === 'critical')) return 'critical';
    if (alerts.some(a => a.severity === 'high')) return 'high';
    if (alerts.some(a => a.severity === 'medium')) return 'medium';
    return 'low';
  }

  private getLatestTimestamp(alerts: any[]): string {
    return alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]?.timestamp || '';
  }

  private calculateTrend(metric: string, currentValue: number): TrendData {
    const previousValue = this.previousMetrics?.[metric] || currentValue;
    const change = currentValue - previousValue;
    const changePercentage = previousValue === 0 ? 0 : (change / previousValue) * 100;
    
    let trendDirection: 'improving' | 'stable' | 'degrading' = 'stable';
    if (Math.abs(changePercentage) > 5) {
      trendDirection = changePercentage > 0 ? 'degrading' : 'improving';
    }
    
    return {
      current: currentValue,
      previous: previousValue,
      change_percentage: changePercentage,
      trend_direction: trendDirection,
      data_points: [previousValue, currentValue]
    };
  }

  private getAverageApiResponseTime(apiCalls: any[]): number {
    if (!apiCalls || apiCalls.length === 0) return 0;
    return apiCalls.reduce((sum: number, call: any) => sum + call.duration, 0) / apiCalls.length;
  }

  private updatePreviousMetrics(report: PerformanceReport): void {
    this.previousMetrics = {
      startup_time: report.app_performance.startup_time,
      memory_usage: report.app_performance.memory_usage,
      js_thread_utilization: report.app_performance.js_thread_utilization,
      frame_rate: report.app_performance.frame_rate,
      api_response_time: report.api_performance.avg_response_time
    };
  }

  private cleanupOldReports(): void {
    const cutoffTime = Date.now() - (this.configuration.retention_days * 24 * 60 * 60 * 1000);
    this.performanceReports = this.performanceReports.filter(report => 
      new Date(report.timestamp).getTime() > cutoffTime
    );
  }

  /**
   * Public methods
   */
  
  /**
   * Get performance reports
   */
  getPerformanceReports(): PerformanceReport[] {
    return this.performanceReports;
  }

  /**
   * Get latest performance report
   */
  getLatestPerformanceReport(): PerformanceReport | null {
    return this.performanceReports[this.performanceReports.length - 1] || null;
  }

  /**
   * Update reporting configuration
   */
  updateConfiguration(config: Partial<ReportingConfiguration>): void {
    this.configuration = { ...this.configuration, ...config };
    
    // Restart reporting if interval changed
    if (config.report_interval && this.reportingInterval) {
      clearInterval(this.reportingInterval);
      this.startReporting();
    }
    
    console.log('Performance reporting configuration updated:', this.configuration);
  }

  /**
   * Force generate report
   */
  async forceGenerateReport(): Promise<PerformanceReport> {
    return await this.generatePerformanceReport();
  }

  /**
   * Export performance data
   */
  exportPerformanceData(): any {
    return {
      reports: this.performanceReports,
      configuration: this.configuration,
      export_timestamp: new Date().toISOString()
    };
  }

  /**
   * Shutdown performance reporting
   */
  shutdown(): void {
    if (this.reportingInterval) {
      clearInterval(this.reportingInterval);
    }
    
    this.initialized = false;
    console.log('Performance reporting service shutdown');
  }
}

// Export singleton instance
export const performanceReportingService = new PerformanceReportingService();
export default performanceReportingService; 