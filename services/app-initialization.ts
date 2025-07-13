import { notificationService } from './notification-service';
import { sqliteService } from './sqlite-service';
import { initializeChatsService } from './chats-service';
import { imageCacheService } from './image-cache-service';
import { performanceMonitoringService } from './performance-monitoring-service';
import { enhancedPerformanceMonitoringService } from './enhanced-performance-monitoring-service';
import { memoryLeakDetectionService } from './memory-leak-detection-service';
import { performanceReportingService } from './performance-reporting-service';
import { offlineManager } from './offline/offline-manager';

interface InitializationStep {
  name: string;
  execute: () => Promise<void>;
  critical: boolean;
}

export class AppInitializationService {
  private static instance: AppInitializationService;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): AppInitializationService {
    if (!AppInitializationService.instance) {
      AppInitializationService.instance = new AppInitializationService();
    }
    return AppInitializationService.instance;
  }

  private async initializeServices(): Promise<void> {
    const steps: InitializationStep[] = [
      {
        name: 'SQLite Service',
        execute: async () => {
          // SQLiteService initializes in constructor, just check if it's ready
          const isReady = sqliteService.isServiceInitialized();
          if (!isReady) {
            throw new Error('SQLite service failed to initialize');
          }
        },
        critical: true,
      },
      {
        name: 'Offline Manager',
        execute: async () => {
          await offlineManager.initialize();
        },
        critical: false,
      },
      {
        name: 'Chats Service',
        execute: async () => {
          await initializeChatsService();
        },
        critical: false,
      },
      {
        name: 'Notification Service',
        execute: async () => {
          await notificationService.initialize();
        },
        critical: false,
      },
      {
        name: 'Image Cache Service',
        execute: async () => {
          await imageCacheService.initialize();
        },
        critical: false,
      },
      {
        name: 'Database Performance Monitoring',
        execute: async () => {
          // Database performance monitoring initializes automatically
          console.log('Database performance monitoring initialized');
        },
        critical: false,
      },
      {
        name: 'Enhanced Performance Monitoring',
        execute: async () => {
          // Enhanced performance monitoring initializes automatically
          console.log('Enhanced performance monitoring initialized');
        },
        critical: false,
      },
      {
        name: 'Memory Leak Detection',
        execute: async () => {
          // Memory leak detection initializes automatically
          console.log('Memory leak detection initialized');
        },
        critical: false,
      },
      {
        name: 'Performance Reporting',
        execute: async () => {
          // Performance reporting initializes automatically
          console.log('Performance reporting initialized');
        },
        critical: false,
      },
    ];

    for (const step of steps) {
      if (this.isInitialized) {
        break;
      }
      
      try {
        console.log(`=== ${step.name} START ===`);
        const startTime = Date.now();
        await step.execute();
        const duration = Date.now() - startTime;
        console.log(`=== ${step.name} COMPLETE (${duration}ms) ===`);
      } catch (error) {
        console.error(`Error during ${step.name}:`, error);
        if (step.critical) {
          throw error; // Re-throw for critical services
        }
        // Continue with non-critical services
      }
    }
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('App already initialized');
      return;
    }

    try {
      console.log('=== APP INITIALIZATION START ===');
      const totalStartTime = Date.now();
      
      await this.initializeServices();
      
      const totalDuration = Date.now() - totalStartTime;
      console.log(`=== APP INITIALIZATION COMPLETE (${totalDuration}ms) ===`);
      
      this.isInitialized = true;
      
      // Log initial performance stats
      const stats = enhancedPerformanceMonitoringService.getPerformanceStatus();
      console.log('Initial Performance Stats:', stats);
    } catch (error) {
      console.error('=== APP INITIALIZATION FAILED ===', error);
      throw error;
    }
  }

  isAppInitialized(): boolean {
    return this.isInitialized;
  }

  async cleanup(): Promise<void> {
    try {
      console.log('=== APP CLEANUP START ===');
      
      // Stop performance monitoring
      enhancedPerformanceMonitoringService.shutdown();
      memoryLeakDetectionService.shutdown();
      performanceReportingService.shutdown();
      
      // Disconnect WebSocket
      const { webSocketService } = await import('./websocket-service');
      webSocketService.disconnect();
      
      // Cleanup chats service
      const { chatsService } = await import('./chats-service');
      chatsService.cleanup();
      
      // Clear image cache if needed (optional)
      // await imageCacheService.clearCache();
      
      this.isInitialized = false;
      console.log('=== APP CLEANUP COMPLETE ===');
    } catch (error) {
      console.error('Error during app cleanup:', error);
    }
  }
}

export const appInitializationService = AppInitializationService.getInstance(); 