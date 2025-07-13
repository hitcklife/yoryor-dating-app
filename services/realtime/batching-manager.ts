interface BatchedMessage {
  id: string;
  type: 'presence' | 'read_receipt' | 'typing' | 'heartbeat';
  data: any;
  timestamp: number;
  chatId?: number;
  userId?: number;
}

interface BatchConfig {
  presenceUpdateInterval: number;   // 5 seconds
  readReceiptInterval: number;      // 2 seconds
  typingUpdateInterval: number;     // 1 second
  heartbeatInterval: number;        // 30 seconds
  maxBatchSize: number;             // Maximum messages per batch
}

interface BatchStats {
  totalBatched: number;
  totalSent: number;
  averageBatchSize: number;
  lastBatchSent: Date | null;
  pendingMessages: number;
}

/**
 * Manages message batching to reduce network overhead and improve performance
 */
export class BatchingManager {
  private batches = new Map<string, BatchedMessage[]>();
  private batchTimers = new Map<string, any>();
  private batchConfig: BatchConfig = {
    presenceUpdateInterval: 5000,    // 5 seconds
    readReceiptInterval: 2000,       // 2 seconds
    typingUpdateInterval: 1000,      // 1 second
    heartbeatInterval: 30000,        // 30 seconds
    maxBatchSize: 50
  };
  private stats: BatchStats = {
    totalBatched: 0,
    totalSent: 0,
    averageBatchSize: 0,
    lastBatchSent: null,
    pendingMessages: 0
  };
  private enabled: boolean = true;

  /**
   * Add a message to the batch queue
   */
  addToBatch(
    type: BatchedMessage['type'], 
    data: any, 
    chatId?: number, 
    userId?: number,
    immediate: boolean = false
  ): string {
    if (!this.enabled || immediate) {
      // Send immediately if batching is disabled or immediate flag is set
      this.sendImmediately(type, data, chatId, userId);
      return 'immediate';
    }

    const messageId = this.generateMessageId();
    const message: BatchedMessage = {
      id: messageId,
      type,
      data,
      timestamp: Date.now(),
      chatId,
      userId
    };

    const batchKey = this.getBatchKey(type, chatId);
    
    if (!this.batches.has(batchKey)) {
      this.batches.set(batchKey, []);
    }

    const batch = this.batches.get(batchKey)!;
    
    // Check for duplicate messages and replace if newer
    const existingIndex = batch.findIndex(m => this.areMessagesSimilar(m, message));
    if (existingIndex !== -1) {
      batch[existingIndex] = message;
    } else {
      batch.push(message);
      this.stats.totalBatched++;
      this.updatePendingCount();
    }

    // Check if batch is full and needs immediate sending
    if (batch.length >= this.batchConfig.maxBatchSize) {
      this.flushBatch(batchKey);
    } else {
      // Schedule batch sending if not already scheduled
      this.scheduleBatchSending(batchKey, type);
    }

    return messageId;
  }

  /**
   * Send message immediately without batching
   */
  private sendImmediately(
    type: BatchedMessage['type'],
    data: any,
    chatId?: number,
    userId?: number
  ): void {
    console.log(`Sending ${type} immediately:`, { data, chatId, userId });
    
    // Here you would implement the actual sending logic
    // This would integrate with your WebSocket service or API client
    this.stats.totalSent++;
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get batch key for grouping messages
   */
  private getBatchKey(type: BatchedMessage['type'], chatId?: number): string {
    // Group messages by type and optionally by chat
    switch (type) {
      case 'presence':
        return 'presence_global';
      case 'read_receipt':
      case 'typing':
        return chatId ? `${type}_chat_${chatId}` : `${type}_global`;
      case 'heartbeat':
        return 'heartbeat_global';
      default:
        return `${type}_global`;
    }
  }

  /**
   * Check if two messages are similar and can be merged
   */
  private areMessagesSimilar(msg1: BatchedMessage, msg2: BatchedMessage): boolean {
    if (msg1.type !== msg2.type) return false;
    if (msg1.chatId !== msg2.chatId) return false;
    if (msg1.userId !== msg2.userId) return false;

    // Type-specific similarity checks
    switch (msg1.type) {
      case 'presence':
        // Replace older presence updates with newer ones
        return msg1.userId === msg2.userId;
      
      case 'read_receipt':
        // Merge read receipts for the same message
        return msg1.data.messageId === msg2.data.messageId;
      
      case 'typing':
        // Replace older typing indicators with newer ones
        return msg1.userId === msg2.userId;
      
      default:
        return false;
    }
  }

  /**
   * Schedule batch sending
   */
  private scheduleBatchSending(batchKey: string, type: BatchedMessage['type']): void {
    // Don't schedule if already scheduled
    if (this.batchTimers.has(batchKey)) {
      return;
    }

    const interval = this.getBatchInterval(type);
    
    const timer = setTimeout(() => {
      this.flushBatch(batchKey);
    }, interval);

    this.batchTimers.set(batchKey, timer);
  }

  /**
   * Get batch interval for message type
   */
  private getBatchInterval(type: BatchedMessage['type']): number {
    switch (type) {
      case 'presence':
        return this.batchConfig.presenceUpdateInterval;
      case 'read_receipt':
        return this.batchConfig.readReceiptInterval;
      case 'typing':
        return this.batchConfig.typingUpdateInterval;
      case 'heartbeat':
        return this.batchConfig.heartbeatInterval;
      default:
        return 5000; // Default 5 seconds
    }
  }

  /**
   * Flush a specific batch
   */
  private flushBatch(batchKey: string): void {
    const batch = this.batches.get(batchKey);
    if (!batch || batch.length === 0) {
      return;
    }

    // Clear the timer
    const timer = this.batchTimers.get(batchKey);
    if (timer) {
      clearTimeout(timer);
      this.batchTimers.delete(batchKey);
    }

    // Send the batch
    this.sendBatch(batchKey, batch);

    // Clear the batch
    this.batches.delete(batchKey);
    this.updatePendingCount();
  }

  /**
   * Send a batch of messages
   */
  private sendBatch(batchKey: string, messages: BatchedMessage[]): void {
    if (messages.length === 0) return;

    console.log(`Sending batch ${batchKey} with ${messages.length} messages`);

    // Group messages by type for optimized sending
    const groupedMessages = this.groupMessagesByType(messages);

    for (const [type, typeMessages] of groupedMessages) {
      this.sendMessageGroup(type, typeMessages);
    }

    // Update statistics
    this.stats.totalSent += messages.length;
    this.stats.lastBatchSent = new Date();
    this.updateAverageBatchSize(messages.length);
  }

  /**
   * Group messages by type
   */
  private groupMessagesByType(messages: BatchedMessage[]): Map<string, BatchedMessage[]> {
    const groups = new Map<string, BatchedMessage[]>();

    for (const message of messages) {
      if (!groups.has(message.type)) {
        groups.set(message.type, []);
      }
      groups.get(message.type)!.push(message);
    }

    return groups;
  }

  /**
   * Send a group of messages of the same type
   */
  private sendMessageGroup(type: string, messages: BatchedMessage[]): void {
    switch (type) {
      case 'presence':
        this.sendPresenceUpdates(messages);
        break;
      case 'read_receipt':
        this.sendReadReceipts(messages);
        break;
      case 'typing':
        this.sendTypingUpdates(messages);
        break;
      case 'heartbeat':
        this.sendHeartbeats(messages);
        break;
      default:
        console.warn(`Unknown message type for batching: ${type}`);
    }
  }

  /**
   * Send presence updates
   */
  private sendPresenceUpdates(messages: BatchedMessage[]): void {
    console.log(`Sending ${messages.length} presence updates`);
    
    // Extract unique presence updates
    const presenceUpdates = messages.map(msg => ({
      userId: msg.userId,
      status: msg.data.status,
      timestamp: msg.timestamp
    }));

    // Here you would send to your presence API
    // await apiClient.presence.batchUpdate(presenceUpdates);
  }

  /**
   * Send read receipts
   */
  private sendReadReceipts(messages: BatchedMessage[]): void {
    console.log(`Sending ${messages.length} read receipts`);
    
    // Group by chat for efficient API calls
    const receiptsByChat = new Map<number, any[]>();
    
    for (const msg of messages) {
      if (msg.chatId) {
        if (!receiptsByChat.has(msg.chatId)) {
          receiptsByChat.set(msg.chatId, []);
        }
        receiptsByChat.get(msg.chatId)!.push({
          messageId: msg.data.messageId,
          userId: msg.userId,
          readAt: msg.timestamp
        });
      }
    }

    // Send batched read receipts per chat
    for (const [chatId, receipts] of receiptsByChat) {
      console.log(`Sending ${receipts.length} read receipts for chat ${chatId}`);
      // await apiClient.chats.batchMarkAsRead(chatId, receipts);
    }
  }

  /**
   * Send typing updates
   */
  private sendTypingUpdates(messages: BatchedMessage[]): void {
    console.log(`Sending ${messages.length} typing updates`);
    
    // Only send the latest typing status per user per chat
    const latestTyping = new Map<string, BatchedMessage>();
    
    for (const msg of messages) {
      const key = `${msg.chatId}_${msg.userId}`;
      const existing = latestTyping.get(key);
      if (!existing || msg.timestamp > existing.timestamp) {
        latestTyping.set(key, msg);
      }
    }

    // Send latest typing statuses
    for (const msg of latestTyping.values()) {
      console.log(`Typing update: user ${msg.userId} in chat ${msg.chatId}: ${msg.data.isTyping}`);
      // Here you would send via WebSocket or API
    }
  }

  /**
   * Send heartbeats
   */
  private sendHeartbeats(messages: BatchedMessage[]): void {
    if (messages.length > 0) {
      // Only need to send one heartbeat, use the latest
      const latestHeartbeat = messages[messages.length - 1];
      console.log('Sending heartbeat:', latestHeartbeat.data);
      // Here you would send the heartbeat
    }
  }

  /**
   * Flush all pending batches
   */
  flushAll(): void {
    const batchKeys = Array.from(this.batches.keys());
    
    for (const batchKey of batchKeys) {
      this.flushBatch(batchKey);
    }
  }

  /**
   * Update pending message count
   */
  private updatePendingCount(): void {
    let count = 0;
    for (const batch of this.batches.values()) {
      count += batch.length;
    }
    this.stats.pendingMessages = count;
  }

  /**
   * Update average batch size
   */
  private updateAverageBatchSize(batchSize: number): void {
    if (this.stats.totalSent === 0) {
      this.stats.averageBatchSize = batchSize;
    } else {
      // Running average
      this.stats.averageBatchSize = (this.stats.averageBatchSize + batchSize) / 2;
    }
  }

  /**
   * Configure batch settings
   */
  configureBatching(config: Partial<BatchConfig>): void {
    this.batchConfig = { ...this.batchConfig, ...config };
    console.log('Batch configuration updated:', this.batchConfig);
  }

  /**
   * Enable or disable batching
   */
  setBatchingEnabled(enabled: boolean): void {
    this.enabled = enabled;
    
    if (!enabled) {
      // Flush all pending batches when disabling
      this.flushAll();
    }
    
    console.log(`Batching ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get batch statistics
   */
  getStats(): BatchStats {
    return { ...this.stats };
  }

  /**
   * Get current batch configuration
   */
  getBatchConfig(): BatchConfig {
    return { ...this.batchConfig };
  }

  /**
   * Get pending batches info
   */
  getPendingBatches(): { [key: string]: number } {
    const info: { [key: string]: number } = {};
    
    for (const [batchKey, batch] of this.batches) {
      info[batchKey] = batch.length;
    }
    
    return info;
  }

  /**
   * Clear all batches and timers
   */
  clear(): void {
    // Clear all timers
    for (const timer of this.batchTimers.values()) {
      clearTimeout(timer);
    }
    
    this.batches.clear();
    this.batchTimers.clear();
    
    // Reset stats but keep configuration
    this.stats = {
      totalBatched: 0,
      totalSent: 0,
      averageBatchSize: 0,
      lastBatchSent: null,
      pendingMessages: 0
    };
    
    console.log('Batching manager cleared');
  }

  /**
   * Cleanup method for graceful shutdown
   */
  shutdown(): void {
    console.log('Shutting down batching manager...');
    
    // Flush all pending batches
    this.flushAll();
    
    // Clear everything
    this.clear();
  }
}

export type { BatchedMessage, BatchConfig, BatchStats }; 