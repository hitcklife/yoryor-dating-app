import { ConnectionQuality } from './event-emitter';

interface ChannelInfo {
  channel: any;
  lastActivity: Date;
  subscribers: number;
  chatId?: number;
  isActive: boolean;
  priority: 'high' | 'medium' | 'low';
}

interface QualityBasedLimits {
  excellent: number;
  good: number;
  poor: number;
  offline: number;
}

interface ChannelMetrics {
  totalChannels: number;
  activeChannels: number;
  inactiveChannels: number;
  highPriorityChannels: number;
  mediumPriorityChannels: number;
  lowPriorityChannels: number;
}

/**
 * Enhanced channel manager with quality-based limits and priority management
 */
export class ChannelManager {
  private channels = new Map<string, ChannelInfo>();
  private connectionQuality: ConnectionQuality = 'offline';
  private qualityBasedLimits: QualityBasedLimits = {
    excellent: 10,
    good: 7,
    poor: 3,
    offline: 0
  };
  private inactiveTimeoutMs = 3 * 60 * 1000; // 3 minutes
  private cleanupIntervalMs = 30 * 1000; // 30 seconds
  private cleanupTimer: any = null;
  private activeChats = new Set<number>();
  private priorityChannels = new Set<string>();

  /**
   * Get current channel limit based on connection quality
   */
  getCurrentChannelLimit(): number {
    return this.qualityBasedLimits[this.connectionQuality];
  }

  /**
   * Subscribe to a channel with priority
   */
  subscribe(channelName: string, channel: any, chatId?: number, priority: 'high' | 'medium' | 'low' = 'medium'): void {
    const currentLimit = this.getCurrentChannelLimit();
    
    // Check if we need to cleanup before adding
    if (this.channels.size >= currentLimit) {
      if (!this.makeRoomForNewChannel(priority)) {
        console.warn(`Cannot subscribe to ${channelName}: channel limit reached (${currentLimit} for ${this.connectionQuality} quality)`);
        return;
      }
    }

    const channelInfo: ChannelInfo = {
      channel,
      lastActivity: new Date(),
      subscribers: 1,
      chatId,
      isActive: true,
      priority
    };

    this.channels.set(channelName, channelInfo);
    
    if (chatId) {
      this.activeChats.add(chatId);
    }

    if (priority === 'high') {
      this.priorityChannels.add(channelName);
    }

    this.startCleanupTimer();
    
    const metrics = this.getChannelMetrics();
    console.log(`Channel subscribed: ${channelName} (${priority}) [${metrics.totalChannels}/${currentLimit}] - Quality: ${this.connectionQuality}`);
  }

  /**
   * Unsubscribe from a channel
   */
  unsubscribe(channelName: string): void {
    const channelInfo = this.channels.get(channelName);
    if (channelInfo) {
      try {
        // Properly cleanup the channel
        if (channelInfo.channel && typeof channelInfo.channel.unsubscribe === 'function') {
          channelInfo.channel.unsubscribe();
        }
        
        if (channelInfo.chatId) {
          this.activeChats.delete(channelInfo.chatId);
        }
        
        this.priorityChannels.delete(channelName);
        this.channels.delete(channelName);
        
        console.log(`Channel unsubscribed: ${channelName} (${channelInfo.priority})`);
      } catch (error) {
        console.error(`Error unsubscribing from ${channelName}:`, error);
        // Force removal even if unsubscribe fails
        this.channels.delete(channelName);
        this.priorityChannels.delete(channelName);
      }
    }
  }

  /**
   * Update connection quality and adjust channel limits
   */
  updateConnectionQuality(quality: ConnectionQuality): void {
    if (this.connectionQuality !== quality) {
      const previousQuality = this.connectionQuality;
      this.connectionQuality = quality;
      
      const newLimit = this.getCurrentChannelLimit();
      const currentChannels = this.channels.size;
      
      console.log(`Connection quality changed: ${previousQuality} -> ${quality}, adjusting channel limit to ${newLimit}`);
      
      // If new limit is lower than current channels, remove low-priority channels
      if (currentChannels > newLimit) {
        this.enforceChannelLimit();
      }
    }
  }

  /**
   * Make room for a new channel by removing lower priority channels
   */
  private makeRoomForNewChannel(newChannelPriority: 'high' | 'medium' | 'low'): boolean {
    const currentLimit = this.getCurrentChannelLimit();
    
    if (this.channels.size < currentLimit) {
      return true;
    }

    // Try to remove channels based on priority (lowest first)
    const removalCandidates = this.getChannelsForRemoval(newChannelPriority);
    
    for (const channelName of removalCandidates) {
      this.unsubscribe(channelName);
      if (this.channels.size < currentLimit) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get channels that can be removed (prioritizing inactive and low-priority channels)
   */
  private getChannelsForRemoval(newChannelPriority: 'high' | 'medium' | 'low'): string[] {
    const candidates: { name: string; info: ChannelInfo; score: number }[] = [];
    
    for (const [channelName, channelInfo] of Array.from(this.channels.entries())) {
      // Don't remove high-priority channels unless the new channel is also high priority
      if (channelInfo.priority === 'high' && newChannelPriority !== 'high') {
        continue;
      }
      
      // Calculate removal score (higher score = more likely to be removed)
      let score = 0;
      
      // Priority scoring (higher priority = lower removal score)
      switch (channelInfo.priority) {
        case 'low':
          score += 30;
          break;
        case 'medium':
          score += 20;
          break;
        case 'high':
          score += 10;
          break;
      }
      
      // Activity scoring
      if (!channelInfo.isActive) {
        score += 20;
      }
      
      // Age scoring (older = higher removal score)
      const ageMinutes = (Date.now() - channelInfo.lastActivity.getTime()) / (1000 * 60);
      score += Math.min(ageMinutes, 30); // Cap at 30 points for age
      
      candidates.push({ name: channelName, info: channelInfo, score });
    }
    
    // Sort by score (highest first) and return channel names
    return candidates
      .sort((a, b) => b.score - a.score)
      .map(candidate => candidate.name);
  }

  /**
   * Enforce current channel limit by removing excess channels
   */
  private enforceChannelLimit(): void {
    const currentLimit = this.getCurrentChannelLimit();
    
    while (this.channels.size > currentLimit) {
      const removalCandidates = this.getChannelsForRemoval('low');
      
      if (removalCandidates.length === 0) {
        console.warn('No channels available for removal');
        break;
      }
      
      const channelToRemove = removalCandidates[0];
      console.log(`Removing channel due to quality limit: ${channelToRemove}`);
      this.unsubscribe(channelToRemove);
    }
  }

  /**
   * Update channel activity
   */
  updateActivity(channelName: string): void {
    const channelInfo = this.channels.get(channelName);
    if (channelInfo) {
      channelInfo.lastActivity = new Date();
      channelInfo.isActive = true;
    }
  }

  /**
   * Set channel as inactive
   */
  setInactive(channelName: string): void {
    const channelInfo = this.channels.get(channelName);
    if (channelInfo) {
      channelInfo.isActive = false;
    }
  }

  /**
   * Update channel priority
   */
  updateChannelPriority(channelName: string, priority: 'high' | 'medium' | 'low'): void {
    const channelInfo = this.channels.get(channelName);
    if (channelInfo) {
      const oldPriority = channelInfo.priority;
      channelInfo.priority = priority;
      
      if (priority === 'high') {
        this.priorityChannels.add(channelName);
      } else {
        this.priorityChannels.delete(channelName);
      }
      
      console.log(`Channel priority updated: ${channelName} ${oldPriority} -> ${priority}`);
    }
  }

  /**
   * Get channel by name
   */
  get(channelName: string): any {
    const channelInfo = this.channels.get(channelName);
    if (channelInfo) {
      this.updateActivity(channelName);
      return channelInfo.channel;
    }
    return null;
  }

  /**
   * Check if channel exists
   */
  has(channelName: string): boolean {
    return this.channels.has(channelName);
  }

  /**
   * Check if chat channel is active
   */
  isActiveChatChannel(chatId: number): boolean {
    return this.activeChats.has(chatId);
  }

  /**
   * Remove oldest inactive channel (enhanced with priority awareness)
   */
  private removeOldestInactiveChannel(): void {
    const removalCandidates = this.getChannelsForRemoval('low');
    
    if (removalCandidates.length > 0) {
      const channelToRemove = removalCandidates[0];
      console.log(`Removing oldest inactive channel: ${channelToRemove}`);
      this.unsubscribe(channelToRemove);
    }
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) return;

    this.cleanupTimer = setInterval(() => {
      this.cleanupInactiveChannels();
    }, this.cleanupIntervalMs);
  }

  /**
   * Cleanup inactive channels with priority consideration
   */
  private cleanupInactiveChannels(): void {
    const now = new Date();
    const channelsToRemove: string[] = [];

    for (const [channelName, channelInfo] of Array.from(this.channels.entries())) {
      const timeSinceActivity = now.getTime() - channelInfo.lastActivity.getTime();
      
      // Don't auto-cleanup high-priority channels as aggressively
      const timeoutMultiplier = channelInfo.priority === 'high' ? 2 : 1;
      const effectiveTimeout = this.inactiveTimeoutMs * timeoutMultiplier;
      
      if (!channelInfo.isActive && timeSinceActivity > effectiveTimeout) {
        channelsToRemove.push(channelName);
      }
    }

    channelsToRemove.forEach(channelName => {
      const channelInfo = this.channels.get(channelName);
      console.log(`Cleaning up inactive channel: ${channelName} (${channelInfo?.priority})`);
      this.unsubscribe(channelName);
    });

    // Stop timer if no channels
    if (this.channels.size === 0 && this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Clear all channels
   */
  clear(): void {
    // Unsubscribe from all channels
    const channelNames = Array.from(this.channels.keys());
    channelNames.forEach(channelName => {
      this.unsubscribe(channelName);
    });
    
    this.activeChats.clear();
    this.priorityChannels.clear();
    
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Get active channel names
   */
  getActiveChannels(): string[] {
    return Array.from(this.channels.keys());
  }

  /**
   * Get priority channel names
   */
  getPriorityChannels(): string[] {
    return Array.from(this.priorityChannels);
  }

  /**
   * Get channel count
   */
  getChannelCount(): number {
    return this.channels.size;
  }

  /**
   * Get channel metrics
   */
  getChannelMetrics(): ChannelMetrics {
    let activeChannels = 0;
    let inactiveChannels = 0;
    let highPriorityChannels = 0;
    let mediumPriorityChannels = 0;
    let lowPriorityChannels = 0;

    for (const channelInfo of this.channels.values()) {
      if (channelInfo.isActive) {
        activeChannels++;
      } else {
        inactiveChannels++;
      }

      switch (channelInfo.priority) {
        case 'high':
          highPriorityChannels++;
          break;
        case 'medium':
          mediumPriorityChannels++;
          break;
        case 'low':
          lowPriorityChannels++;
          break;
      }
    }

    return {
      totalChannels: this.channels.size,
      activeChannels,
      inactiveChannels,
      highPriorityChannels,
      mediumPriorityChannels,
      lowPriorityChannels
    };
  }

  /**
   * Get channel info for debugging
   */
  getChannelInfo(channelName: string): ChannelInfo | undefined {
    return this.channels.get(channelName);
  }

  /**
   * Get all channels info for debugging
   */
  getAllChannelsInfo(): Map<string, ChannelInfo> {
    return new Map(this.channels);
  }

  /**
   * Configure quality-based limits
   */
  configureQualityLimits(limits: Partial<QualityBasedLimits>): void {
    this.qualityBasedLimits = { ...this.qualityBasedLimits, ...limits };
    console.log('Quality-based limits updated:', this.qualityBasedLimits);
    
    // Enforce new limits immediately
    this.enforceChannelLimit();
  }

  /**
   * Get current quality-based limits
   */
  getQualityLimits(): QualityBasedLimits {
    return { ...this.qualityBasedLimits };
  }

  /**
   * Get connection quality
   */
  getConnectionQuality(): ConnectionQuality {
    return this.connectionQuality;
  }

  /**
   * Set inactive timeout
   */
  setInactiveTimeout(timeoutMs: number): void {
    this.inactiveTimeoutMs = timeoutMs;
  }

  /**
   * Set cleanup interval
   */
  setCleanupInterval(intervalMs: number): void {
    this.cleanupIntervalMs = intervalMs;
    
    // Restart timer with new interval
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
      this.startCleanupTimer();
    }
  }

  /**
   * Check if channel limit is reached
   */
  isChannelLimitReached(): boolean {
    return this.channels.size >= this.getCurrentChannelLimit();
  }

  /**
   * Get available channel slots
   */
  getAvailableChannelSlots(): number {
    return Math.max(0, this.getCurrentChannelLimit() - this.channels.size);
  }
}

export type { ChannelInfo, QualityBasedLimits, ChannelMetrics }; 