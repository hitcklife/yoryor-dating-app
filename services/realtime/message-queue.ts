import { apiClient } from '../api-client';

interface QueuedMessage {
  id: string;
  type: 'message' | 'read' | 'typing' | 'event';
  chatId?: number;
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  priority: 'high' | 'medium' | 'low';
}

interface WebSocketService {
  sendTyping(chatId: number, data: any): void;
}

/**
 * Manages message queue for offline scenarios and retry logic
 */
export class MessageQueue {
  private queue: QueuedMessage[] = [];
  private processing = false;
  private maxQueueSize = 50; // Reduced from 100 for memory optimization
  private maxRetries = 3;

  /**
   * Add message to queue
   */
  add(message: Omit<QueuedMessage, 'id' | 'timestamp' | 'retryCount'>): void {
    // Remove oldest low-priority messages if queue is full
    if (this.queue.length >= this.maxQueueSize) {
      const lowPriorityIndex = this.queue.findIndex(msg => msg.priority === 'low');
      if (lowPriorityIndex !== -1) {
        this.queue.splice(lowPriorityIndex, 1);
      } else {
        this.queue.shift();
      }
    }

    const queuedMessage: QueuedMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
      ...message,
      maxRetries: message.maxRetries || this.maxRetries
    };

    // Insert based on priority
    if (message.priority === 'high') {
      this.queue.unshift(queuedMessage);
    } else {
      this.queue.push(queuedMessage);
    }

    console.log(`Message queued: ${queuedMessage.id} (${queuedMessage.type})`);
  }

  /**
   * Process all queued messages
   */
  async processQueue(webSocketService: WebSocketService): Promise<void> {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;
    console.log(`Processing ${this.queue.length} queued messages...`);

    const messagesToProcess = [...this.queue];
    this.queue = [];

    for (const message of messagesToProcess) {
      try {
        await this.processMessage(message, webSocketService);
      } catch (error) {
        console.error(`Error processing queued message ${message.id}:`, error);
        
        // Retry if within limits
        if (message.retryCount < message.maxRetries) {
          message.retryCount++;
          this.queue.push(message);
        } else {
          console.warn(`Message ${message.id} failed after ${message.maxRetries} retries`);
        }
      }
    }

    this.processing = false;
  }

  /**
   * Process individual message
   */
  private async processMessage(message: QueuedMessage, webSocketService: WebSocketService): Promise<void> {
    switch (message.type) {
      case 'message':
        // Re-send message through API
        if (message.chatId) {
          await apiClient.chats.sendMessage(message.chatId, message.data);
        }
        break;
      case 'read':
        // Mark message as read - TODO: implement when API endpoint is available
        console.log('Message read queued for processing:', message.data.messageId);
        break;
      case 'typing':
        // Send typing indicator
        if (message.chatId) {
          webSocketService.sendTyping(message.chatId, message.data);
        }
        break;
      default:
        console.warn(`Unknown message type: ${message.type}`);
    }
  }

  /**
   * Clear all messages from queue
   */
  clear(): void {
    this.queue = [];
    this.processing = false;
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Get queued messages by type
   */
  getMessagesByType(type: QueuedMessage['type']): QueuedMessage[] {
    return this.queue.filter(msg => msg.type === type);
  }

  /**
   * Get queued messages by chat ID
   */
  getMessagesByChatId(chatId: number): QueuedMessage[] {
    return this.queue.filter(msg => msg.chatId === chatId);
  }

  /**
   * Get queued messages by priority
   */
  getMessagesByPriority(priority: QueuedMessage['priority']): QueuedMessage[] {
    return this.queue.filter(msg => msg.priority === priority);
  }

  /**
   * Remove specific message from queue
   */
  removeMessage(messageId: string): boolean {
    const index = this.queue.findIndex(msg => msg.id === messageId);
    if (index !== -1) {
      this.queue.splice(index, 1);
      console.log(`Message removed from queue: ${messageId}`);
      return true;
    }
    return false;
  }

  /**
   * Remove messages by chat ID
   */
  removeMessagesByChatId(chatId: number): number {
    const initialLength = this.queue.length;
    this.queue = this.queue.filter(msg => msg.chatId !== chatId);
    const removed = initialLength - this.queue.length;
    if (removed > 0) {
      console.log(`Removed ${removed} messages for chat ${chatId}`);
    }
    return removed;
  }

  /**
   * Get all queued messages (for debugging)
   */
  getAllMessages(): QueuedMessage[] {
    return [...this.queue];
  }

  /**
   * Get processing state
   */
  isProcessing(): boolean {
    return this.processing;
  }

  /**
   * Set max queue size
   */
  setMaxQueueSize(size: number): void {
    this.maxQueueSize = size;
  }

  /**
   * Set max retries
   */
  setMaxRetries(retries: number): void {
    this.maxRetries = retries;
  }

  /**
   * Get queue statistics
   */
  getQueueStats(): {
    total: number;
    processing: boolean;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
  } {
    const stats = {
      total: this.queue.length,
      processing: this.processing,
      byType: {} as Record<string, number>,
      byPriority: {} as Record<string, number>
    };

    this.queue.forEach(msg => {
      stats.byType[msg.type] = (stats.byType[msg.type] || 0) + 1;
      stats.byPriority[msg.priority] = (stats.byPriority[msg.priority] || 0) + 1;
    });

    return stats;
  }
}

export type { QueuedMessage }; 