// Import repositories
import { connectionManager } from './database/connection-manager';
import { chatRepository, ChatData, ChatPaginationOptions, PaginatedChatResult } from './database/chat-repository';
import { messageRepository } from './database/message-repository';
import { userRepository } from './database/user-repository';
import { settingsRepository, UserSettings, BlockedUser, UserFeedback, UserReport, EmergencyContact, DataExportRequest, AccountDeletionRequest, PasswordChangeHistory, EmailChangeRequest, UserVerificationStatus, SupportTicket } from './database/settings-repository';

// Re-export types from chats-service for backward compatibility
import { Chat, Message, OtherUser, Profile, ProfilePhoto, UserPivot } from './chats-service';

// Re-export repository interfaces
export * from './database/connection-manager';
export * from './database/chat-repository';
export * from './database/message-repository';
export * from './database/user-repository';
export * from './database/settings-repository';

// Re-export optimized types
export type { ChatSummary, ChatPaginationOptions, PaginatedChatResult } from './database/chat-repository';

/**
 * SQLite Database Service Facade
 * This service provides a unified interface to the database repositories
 * while maintaining backward compatibility with the existing API
 */
class SQLiteService {
  constructor() {
    // Initialize through connection manager
    console.log('SQLite service facade initialized');
  }

  // Connection and database management
  async executeSql(sql: string, params: any[] = []): Promise<any> {
    return connectionManager.executeSql(sql, params);
  }

  isServiceInitialized(): boolean {
    return connectionManager.isInitialized();
  }

  getLastError(): Error | null {
    return connectionManager.getLastError();
  }

  async closeDatabase(): Promise<void> {
    return connectionManager.closeDatabase();
  }

  async resetDatabase(): Promise<void> {
    return connectionManager.resetDatabase();
  }

  async optimizeDatabase(): Promise<void> {
    return connectionManager.optimizeDatabase();
  }

  async getDatabaseStats(): Promise<any> {
    return connectionManager.getDatabaseStats();
  }

  async cleanupOldData(daysToKeep: number = 30): Promise<void> {
    return connectionManager.cleanupOldData(daysToKeep);
  }

  // Chat operations - delegate to chat repository
  async saveChat(chat: Chat): Promise<void> {
    return chatRepository.saveChat(chat);
  }

  async storeChats(chats: Chat[]): Promise<void> {
    return chatRepository.storeChats(chats);
  }

  async getChats(): Promise<ChatData[]> {
    return chatRepository.getChats();
  }

  async getChatsOptimized(options?: ChatPaginationOptions): Promise<PaginatedChatResult> {
    return chatRepository.getChatsOptimized(options);
  }

  async getChatById(chatId: number): Promise<ChatData | null> {
    return chatRepository.getChatById(chatId);
  }

  async deleteChat(chatId: number): Promise<void> {
    return chatRepository.deleteChat(chatId);
  }

  async updateChatLastMessage(chatId: number, messageId: number, content: string, sentAt: string): Promise<void> {
    return chatRepository.updateChatLastMessage(chatId, messageId, content, sentAt);
  }

  async incrementChatUnreadCount(chatId: number): Promise<void> {
    return chatRepository.incrementChatUnreadCount(chatId);
  }

  async markChatAsRead(chatId: number): Promise<void> {
    return chatRepository.markChatAsRead(chatId);
  }

  async updateChatLastActivity(chatId: number): Promise<void> {
    return chatRepository.updateChatLastActivity(chatId);
  }

  // Message operations - delegate to message repository
  async saveMessage(message: Message): Promise<void> {
    return messageRepository.saveMessage(message);
  }

  async saveMessages(chatId: number, messages: Message[]): Promise<void> {
    return messageRepository.saveMessages(chatId, messages);
  }

  async getMessagesByChatId(chatId: number, limit?: number): Promise<Message[]> {
    return messageRepository.getMessagesByChatId(chatId, limit);
  }

  async getInitialMessagesByChatId(chatId: number, limit?: number): Promise<Message[]> {
    return messageRepository.getInitialMessagesByChatId(chatId, limit);
  }

  async getMessagesOptimized(chatId: number, limit?: number, offset?: number): Promise<Message[]> {
    return messageRepository.getMessagesOptimized(chatId, limit, offset);
  }

  async getMessageById(messageId: number): Promise<Message | null> {
    return messageRepository.getMessageById(messageId);
  }

  async getMessagesForChat(chatId: number): Promise<Message[]> {
    return messageRepository.getMessagesForChat(chatId);
  }

  async getMessagesBeforeId(chatId: number, beforeMessageId: number, limit?: number): Promise<Message[]> {
    return messageRepository.getMessagesBeforeId(chatId, beforeMessageId, limit);
  }

  async getLastMessageForChat(chatId: number): Promise<Message | null> {
    return messageRepository.getLastMessageForChat(chatId);
  }

  async hasMessagesBeforeId(chatId: number, beforeMessageId: number): Promise<boolean> {
    return messageRepository.hasMessagesBeforeId(chatId, beforeMessageId);
  }

  async messageExists(messageId: number): Promise<boolean> {
    return messageRepository.messageExists(messageId);
  }

  async updateMessage(message: Message): Promise<void> {
    return messageRepository.updateMessage(message);
  }

  async updateMessageStatus(messageId: number, status: string): Promise<void> {
    return messageRepository.updateMessageStatus(messageId, status);
  }

  async updateMessageContent(messageId: number, newContent: string): Promise<void> {
    return messageRepository.updateMessageContent(messageId, newContent);
  }

  async markMessageAsDeleted(messageId: number): Promise<void> {
    return messageRepository.markMessageAsDeleted(messageId);
  }

  async markMessagesAsRead(messageIds: number[]): Promise<void> {
    return messageRepository.markMessagesAsRead(messageIds);
  }

  async clearChatMessages(chatId: number): Promise<void> {
    return messageRepository.clearChatMessages(chatId);
  }

  // User operations - delegate to user repository
  async saveOtherUser(chatId: number, user: OtherUser): Promise<void> {
    return userRepository.saveOtherUser(chatId, user);
  }

  async getOtherUserForChat(chatId: number): Promise<OtherUser | null> {
    return userRepository.getOtherUserForChat(chatId);
  }

  async getOtherUserById(userId: number): Promise<OtherUser | null> {
    return userRepository.getOtherUserById(userId);
  }

  async saveProfile(userId: number, profile: Profile): Promise<void> {
    return userRepository.saveProfile(userId, profile);
  }

  async getProfileForUser(userId: number): Promise<Profile | null> {
    return userRepository.getProfileForUser(userId);
  }

  async saveProfilePhoto(userId: number, photo: ProfilePhoto): Promise<void> {
    return userRepository.saveProfilePhoto(userId, photo);
  }

  async getProfilePhotoForUser(userId: number): Promise<ProfilePhoto | null> {
    return userRepository.getProfilePhotoForUser(userId);
  }

  async getProfilePhotosForUser(userId: number): Promise<ProfilePhoto[]> {
    return userRepository.getProfilePhotosForUser(userId);
  }

  // Settings operations - delegate to settings repository
  async getUserSettings(userId: number): Promise<UserSettings | null> {
    return settingsRepository.getUserSettings(userId);
  }

  async saveUserSettings(settings: UserSettings): Promise<void> {
    return settingsRepository.saveUserSettings(settings);
  }

  async updateUserSettings(userId: number, updates: Partial<UserSettings>): Promise<void> {
    return settingsRepository.updateUserSettings(userId, updates);
  }

  async getBlockedUsers(userId: number): Promise<BlockedUser[]> {
    return settingsRepository.getBlockedUsers(userId);
  }

  async blockUser(blockedUser: BlockedUser): Promise<void> {
    return settingsRepository.blockUser(blockedUser);
  }

  async unblockUser(blockerId: number, blockedId: number): Promise<void> {
    return settingsRepository.unblockUser(blockerId, blockedId);
  }

  async isUserBlocked(blockerId: number, blockedId: number): Promise<boolean> {
    return settingsRepository.isUserBlocked(blockerId, blockedId);
  }

  async saveUserFeedback(feedback: UserFeedback): Promise<void> {
    return settingsRepository.saveUserFeedback(feedback);
  }

  async getUserFeedback(userId?: number): Promise<UserFeedback[]> {
    return settingsRepository.getUserFeedback(userId);
  }

  async saveUserReport(report: UserReport): Promise<void> {
    return settingsRepository.saveUserReport(report);
  }

  async getUserReports(userId?: number): Promise<UserReport[]> {
    return settingsRepository.getUserReports(userId);
  }

  async saveEmergencyContact(contact: EmergencyContact): Promise<void> {
    return settingsRepository.saveEmergencyContact(contact);
  }

  async getEmergencyContacts(userId: number): Promise<EmergencyContact[]> {
    return settingsRepository.getEmergencyContacts(userId);
  }

  async deleteEmergencyContact(contactId: number): Promise<void> {
    return settingsRepository.deleteEmergencyContact(contactId);
  }

  async saveDataExportRequest(request: DataExportRequest): Promise<void> {
    return settingsRepository.saveDataExportRequest(request);
  }

  async getDataExportRequests(userId: number): Promise<DataExportRequest[]> {
    return settingsRepository.getDataExportRequests(userId);
  }

  async saveAccountDeletionRequest(request: AccountDeletionRequest): Promise<void> {
    return settingsRepository.saveAccountDeletionRequest(request);
  }

  async getUserVerificationStatus(userId: number): Promise<UserVerificationStatus | null> {
    return settingsRepository.getUserVerificationStatus(userId);
  }

  async saveUserVerificationStatus(status: UserVerificationStatus): Promise<void> {
    return settingsRepository.saveUserVerificationStatus(status);
  }

  async saveSupportTicket(ticket: SupportTicket): Promise<void> {
    return settingsRepository.saveSupportTicket(ticket);
  }

  async getSupportTickets(userId: number): Promise<SupportTicket[]> {
    return settingsRepository.getSupportTickets(userId);
  }

  async savePasswordChangeHistory(history: PasswordChangeHistory): Promise<void> {
    return settingsRepository.savePasswordChangeHistory(history);
  }

  async saveEmailChangeRequest(request: EmailChangeRequest): Promise<void> {
    return settingsRepository.saveEmailChangeRequest(request);
  }

  async getEmailChangeRequests(userId: number): Promise<EmailChangeRequest[]> {
    return settingsRepository.getEmailChangeRequests(userId);
  }

  // Notification counts operations
  async getNotificationCounts(userId: number): Promise<{ unread_messages_count: number; new_likes_count: number }> {
    const counts = await settingsRepository.getNotificationCounts(userId);
    return {
      unread_messages_count: counts.unread_messages_count,
      new_likes_count: counts.new_likes_count
    };
  }

  async createNotificationCountsRecord(userId: number): Promise<void> {
    return settingsRepository.createNotificationCountsRecord(userId);
  }

  async updateUnreadMessagesCount(userId: number, count?: number, increment: boolean = false): Promise<void> {
    return settingsRepository.updateUnreadMessagesCount(userId, count, increment);
  }

  async updateNewLikesCount(userId: number, count?: number, increment: boolean = false): Promise<void> {
    return settingsRepository.updateNewLikesCount(userId, count, increment);
  }

  async resetNotificationCounts(userId: number): Promise<void> {
    return settingsRepository.resetNotificationCounts(userId);
  }

  // Chat optimization methods
  async getChatPerformanceMetrics(): Promise<any> {
    return chatRepository.getPerformanceMetrics();
  }

  async logChatPerformanceWarnings(): Promise<void> {
    return chatRepository.logPerformanceWarnings();
  }

  async refreshChatSummaryView(): Promise<void> {
    return chatRepository.refreshChatSummaryView();
  }

  async generateChatOptimizationReport(): Promise<void> {
    return chatRepository.generateOptimizationReport();
  }

  async analyzeChatQueries(): Promise<void> {
    return chatRepository.analyzeChatQueries();
  }

  // Combined operations that work across repositories
  async storeChatDetails(chat: Chat, messages: Message[]): Promise<void> {
    try {
      // Store chat using chat repository
      await chatRepository.saveChat(chat);
      
      // Store other user if exists
      if (chat.other_user) {
        await userRepository.saveOtherUser(chat.id, chat.other_user);
      }
      
      // Store messages using message repository
      await messageRepository.saveMessages(chat.id, messages);
      
      console.log(`Chat details for chat ${chat.id} stored successfully`);
    } catch (error) {
      console.error('Error storing chat details:', error);
      throw error;
    }
  }

  /**
   * Get complete chat with other user and last message populated
   */
  async getCompleteChat(chatId: number): Promise<Chat | null> {
    try {
      const chatData = await chatRepository.getChatById(chatId);
      if (!chatData) return null;

      const otherUser = await userRepository.getOtherUserForChat(chatId);
      const lastMessage = await messageRepository.getLastMessageForChat(chatId);

      return {
        ...chatData,
        other_user: otherUser!,
        last_message: lastMessage
      };
    } catch (error) {
      console.error('Error getting complete chat:', error);
      throw error;
    }
  }

  /**
   * Get complete chats with other users and last messages populated
   */
  async getCompleteChats(): Promise<Chat[]> {
    try {
      const chatsData = await chatRepository.getChats();
      const completeChats: Chat[] = [];

      for (const chatData of chatsData) {
        const otherUser = await userRepository.getOtherUserForChat(chatData.id);
        const lastMessage = await messageRepository.getLastMessageForChat(chatData.id);

        completeChats.push({
          ...chatData,
          other_user: otherUser!,
          last_message: lastMessage
        });
      }

      return completeChats;
    } catch (error) {
      console.error('Error getting complete chats:', error);
      throw error;
    }
  }

  // Backward compatibility methods
  async clearDatabaseOnLogout(): Promise<void> {
    console.log('Clearing database on logout...');
    // Could implement selective cleanup here if needed
    // For now, just log the action
  }

  async reinitializeAfterLogout(): Promise<void> {
    console.log('Reinitializing after logout...');
    // Could implement reinitialization logic here if needed
  }

  async forceRecreateAllTables(): Promise<void> {
    return connectionManager.resetDatabase();
  }

  async forceRecreateNotificationTable(): Promise<void> {
    console.log('Force recreating notification table...');
    // This would need to be implemented if needed
  }

  async forceAddMissingColumns(): Promise<void> {
    console.log('Force adding missing columns...');
    // This would need to be implemented if needed
  }

  async ensureDatabaseState(): Promise<void> {
    // Ensure database is ready
    if (!connectionManager.isInitialized()) {
      throw new Error('Database not initialized');
    }
  }

  async waitForDatabaseAvailability(): Promise<void> {
    // Wait for database to be available
    let attempts = 0;
    const maxAttempts = 50;
    
    while (!connectionManager.isInitialized() && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (!connectionManager.isInitialized()) {
      throw new Error('Database initialization timeout');
    }
  }

  // Transform method for backward compatibility
  private transformChatFromQuery(rawChat: any): Chat {
    return {
      id: rawChat.id,
      type: rawChat.type,
      name: rawChat.name,
      description: rawChat.description,
      last_activity_at: rawChat.last_activity_at,
      is_active: rawChat.is_active === 1,
      created_at: rawChat.created_at,
      updated_at: rawChat.updated_at,
      deleted_at: rawChat.deleted_at,
      unread_count: rawChat.unread_count || 0,
      pivot: {
        chat_id: rawChat.pivot_chat_id,
        user_id: rawChat.pivot_user_id,
        is_muted: rawChat.pivot_is_muted === 1,
        last_read_at: rawChat.pivot_last_read_at,
        joined_at: rawChat.pivot_joined_at,
        left_at: rawChat.pivot_left_at,
        role: rawChat.pivot_role,
        created_at: rawChat.pivot_created_at,
        updated_at: rawChat.pivot_updated_at
      },
      other_user: {} as OtherUser, // Will be populated separately
      last_message: null // Will be populated separately
    };
  }
}

// Export a singleton instance
export const sqliteService = new SQLiteService();
export default sqliteService;
