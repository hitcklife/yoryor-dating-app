import { connectionManager } from './connection-manager';
import { Message } from '../chats-service';
import { WrappedConnection } from './performance-wrapper';

export interface IMessageRepository {
  saveMessage(message: Message): Promise<void>;
  saveMessages(chatId: number, messages: Message[]): Promise<void>;
  getMessagesByChatId(chatId: number, limit?: number): Promise<Message[]>;
  getInitialMessagesByChatId(chatId: number, limit?: number): Promise<Message[]>;
  getMessagesOptimized(chatId: number, limit?: number, offset?: number): Promise<Message[]>;
  getMessageById(messageId: number): Promise<Message | null>;
  getMessagesForChat(chatId: number): Promise<Message[]>;
  getMessagesBeforeId(chatId: number, beforeMessageId: number, limit?: number): Promise<Message[]>;
  getLastMessageForChat(chatId: number): Promise<Message | null>;
  hasMessagesBeforeId(chatId: number, beforeMessageId: number): Promise<boolean>;
  messageExists(messageId: number): Promise<boolean>;
  updateMessage(message: Message): Promise<void>;
  updateMessageStatus(messageId: number, status: string): Promise<void>;
  updateMessageContent(messageId: number, newContent: string): Promise<void>;
  markMessageAsDeleted(messageId: number): Promise<void>;
  markMessagesAsRead(messageIds: number[]): Promise<void>;
  clearChatMessages(chatId: number): Promise<void>;
  deleteMessagesByChat(chatId: number): Promise<void>;
  getUnreadMessageCount(chatId: number): Promise<number>;
}

/**
 * Message Repository
 * Handles all message-related database operations
 */
export class MessageRepository implements IMessageRepository {
  /**
   * Save a single message to the database
   */
  async saveMessage(message: Message): Promise<void> {
    const db = await connectionManager.getConnection();

    try {
      await db.runAsync(`
        INSERT OR REPLACE INTO messages (
          id, chat_id, sender_id, reply_to_message_id, content,
          message_type, media_data, media_url, thumbnail_url,
          status, is_edited, edited_at, sent_at, deleted_at,
          created_at, updated_at, is_mine, sender_email, is_read, read_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        message.id,
        message.chat_id,
        message.sender_id,
        message.reply_to_message_id,
        message.content,
        message.message_type,
        message.media_data ? JSON.stringify(message.media_data) : null,
        message.media_url,
        message.thumbnail_url,
        message.status,
        message.is_edited ? 1 : 0,
        message.edited_at || null,
        message.sent_at,
        message.deleted_at || null,
        message.created_at,
        message.updated_at,
        message.is_mine === true ? 1 : 0,
        message.sender?.email || null,
        message.is_read === true ? 1 : 0,
        message.read_at || null
      ]);

      console.log(`Message ${message.id} saved successfully`);
    } catch (error) {
      console.error('Error saving message:', error);
      throw error;
    }
  }

  /**
   * Save multiple messages for a chat
   */
  async saveMessages(chatId: number, messages: Message[]): Promise<void> {
    const db = await connectionManager.getConnection();

    try {
      await db.withTransactionAsync(async () => {
        for (const message of messages) {
          await db.runAsync(`
            INSERT OR REPLACE INTO messages (
              id, chat_id, sender_id, reply_to_message_id, content,
              message_type, media_data, media_url, thumbnail_url,
              status, is_edited, edited_at, sent_at, deleted_at,
              created_at, updated_at, is_mine, sender_email, is_read, read_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            message.id,
            message.chat_id,
            message.sender_id,
            message.reply_to_message_id,
            message.content,
            message.message_type,
            message.media_data ? JSON.stringify(message.media_data) : null,
            message.media_url,
            message.thumbnail_url,
            message.status,
            message.is_edited ? 1 : 0,
            message.edited_at,
            message.sent_at,
            message.deleted_at,
            message.created_at,
            message.updated_at,
            message.is_mine ? 1 : 0,
            message.sender?.email || null,
            message.is_read ? 1 : 0,
            message.read_at || null
          ]);
        }
      });

      console.log(`${messages.length} messages saved successfully for chat ${chatId}`);
    } catch (error) {
      console.error('Error saving messages:', error);
      throw error;
    }
  }

  /**
   * Get messages by chat ID ordered by newest first (for inverted FlatList)
   */
  async getMessagesByChatId(chatId: number, limit: number = 50): Promise<Message[]> {
    const db = await connectionManager.getConnection();

    try {
      const messages = await db.getAllAsync<any>(`
        SELECT * FROM messages 
        WHERE chat_id = ? AND deleted_at IS NULL 
        ORDER BY sent_at DESC
        LIMIT ?
      `, [chatId, limit]);

      return messages.map(msg => this.transformMessageFromQuery(msg));
    } catch (error) {
      console.error('Error getting messages by chat ID:', error);
      throw error;
    }
  }

  /**
   * Get initial messages for a chat with pagination
   */
  async getInitialMessagesByChatId(chatId: number, limit: number = 20): Promise<Message[]> {
    const db = await connectionManager.getConnection();

    try {
      const messages = await db.getAllAsync<any>(`
        SELECT * FROM messages 
        WHERE chat_id = ? AND deleted_at IS NULL 
        ORDER BY sent_at DESC
        LIMIT ?
      `, [chatId, limit]);

      return messages.map(msg => this.transformMessageFromQuery(msg));
    } catch (error) {
      console.error('Error getting initial messages by chat ID:', error);
      throw error;
    }
  }

  /**
   * Get messages with optimized query
   */
  async getMessagesOptimized(chatId: number, limit: number = 20, offset: number = 0): Promise<Message[]> {
    const db = await connectionManager.getConnection();

    try {
      const messages = await db.getAllAsync<any>(`
        SELECT * FROM messages 
        WHERE chat_id = ? AND deleted_at IS NULL 
        ORDER BY sent_at DESC
        LIMIT ? OFFSET ?
      `, [chatId, limit, offset]);

      return messages.map(msg => this.transformMessageFromQuery(msg));
    } catch (error) {
      console.error('Error getting optimized messages:', error);
      throw error;
    }
  }

  /**
   * Get a specific message by ID
   */
  async getMessageById(messageId: number): Promise<Message | null> {
    const db = await connectionManager.getConnection();

    try {
      const message = await db.getFirstAsync<any>(`
        SELECT * FROM messages 
        WHERE id = ? AND deleted_at IS NULL
      `, [messageId]);

      if (!message) return null;

      return this.transformMessageFromQuery(message);
    } catch (error) {
      console.error('Error getting message by ID:', error);
      throw error;
    }
  }

  /**
   * Get all messages for a chat
   */
  async getMessagesForChat(chatId: number): Promise<Message[]> {
    const db = await connectionManager.getConnection();

    try {
      const messages = await db.getAllAsync<any>(`
        SELECT * FROM messages 
        WHERE chat_id = ? AND deleted_at IS NULL 
        ORDER BY sent_at ASC
      `, [chatId]);

      return messages.map(msg => this.transformMessageFromQuery(msg));
    } catch (error) {
      console.error('Error getting messages for chat:', error);
      throw error;
    }
  }

  /**
   * Get messages before a specific message ID
   */
  async getMessagesBeforeId(chatId: number, beforeMessageId: number, limit: number = 20): Promise<Message[]> {
    const db = await connectionManager.getConnection();

    try {
      const beforeMessage = await db.getFirstAsync<any>(`
        SELECT sent_at FROM messages WHERE id = ?
      `, [beforeMessageId]);

      if (!beforeMessage) return [];

      const messages = await db.getAllAsync<any>(`
        SELECT * FROM messages 
        WHERE chat_id = ? AND deleted_at IS NULL AND sent_at < ?
        ORDER BY sent_at DESC
        LIMIT ?
      `, [chatId, beforeMessage.sent_at, limit]);

      return messages.map(msg => this.transformMessageFromQuery(msg));
    } catch (error) {
      console.error('Error getting messages before ID:', error);
      throw error;
    }
  }

  /**
   * Get the last message for a chat
   */
  async getLastMessageForChat(chatId: number): Promise<Message | null> {
    const db = await connectionManager.getConnection();

    try {
      const message = await db.getFirstAsync<any>(`
        SELECT * FROM messages 
        WHERE chat_id = ? AND deleted_at IS NULL 
        ORDER BY sent_at DESC
        LIMIT 1
      `, [chatId]);

      if (!message) return null;

      return this.transformMessageFromQuery(message);
    } catch (error) {
      console.error('Error getting last message for chat:', error);
      throw error;
    }
  }

  /**
   * Check if there are messages before a specific message ID
   */
  async hasMessagesBeforeId(chatId: number, beforeMessageId: number): Promise<boolean> {
    const db = await connectionManager.getConnection();

    try {
      const beforeMessage = await db.getFirstAsync<any>(`
        SELECT sent_at FROM messages WHERE id = ?
      `, [beforeMessageId]);

      if (!beforeMessage) return false;

      const count = await db.getFirstAsync<{ count: number }>(`
        SELECT COUNT(*) as count FROM messages 
        WHERE chat_id = ? AND deleted_at IS NULL AND sent_at < ?
      `, [chatId, beforeMessage.sent_at]);

      return (count?.count || 0) > 0;
    } catch (error) {
      console.error('Error checking messages before ID:', error);
      throw error;
    }
  }

  /**
   * Check if a message exists
   */
  async messageExists(messageId: number): Promise<boolean> {
    const db = await connectionManager.getConnection();

    try {
      const message = await db.getFirstAsync<any>(`
        SELECT id FROM messages 
        WHERE id = ? AND deleted_at IS NULL
      `, [messageId]);

      return !!message;
    } catch (error) {
      console.error('Error checking message existence:', error);
      throw error;
    }
  }

  /**
   * Update a message
   */
  async updateMessage(message: Message): Promise<void> {
    const db = await connectionManager.getConnection();

    try {
      await db.runAsync(`
        UPDATE messages 
        SET content = ?, message_type = ?, media_data = ?, media_url = ?, 
            thumbnail_url = ?, status = ?, is_edited = ?, edited_at = ?, 
            updated_at = ?, is_read = ?, read_at = ?
        WHERE id = ?
      `, [
        message.content,
        message.message_type,
        message.media_data ? JSON.stringify(message.media_data) : null,
        message.media_url,
        message.thumbnail_url,
        message.status,
        message.is_edited ? 1 : 0,
        message.edited_at,
        message.updated_at,
        message.is_read ? 1 : 0,
        message.read_at,
        message.id
      ]);

      console.log(`Message ${message.id} updated successfully`);
    } catch (error) {
      console.error('Error updating message:', error);
      throw error;
    }
  }

  /**
   * Update message status
   */
  async updateMessageStatus(messageId: number, status: string): Promise<void> {
    const db = await connectionManager.getConnection();

    try {
      await db.runAsync(`
        UPDATE messages 
        SET status = ?, updated_at = ? 
        WHERE id = ?
      `, [status, new Date().toISOString(), messageId]);

      console.log(`Message ${messageId} status updated to ${status}`);
    } catch (error) {
      console.error('Error updating message status:', error);
      throw error;
    }
  }

  /**
   * Update message content
   */
  async updateMessageContent(messageId: number, newContent: string): Promise<void> {
    const db = await connectionManager.getConnection();

    try {
      const now = new Date().toISOString();
      await db.runAsync(`
        UPDATE messages 
        SET content = ?, is_edited = 1, edited_at = ?, updated_at = ? 
        WHERE id = ?
      `, [newContent, now, now, messageId]);

      console.log(`Message ${messageId} content updated`);
    } catch (error) {
      console.error('Error updating message content:', error);
      throw error;
    }
  }

  /**
   * Mark a message as deleted (soft delete)
   */
  async markMessageAsDeleted(messageId: number): Promise<void> {
    const db = await connectionManager.getConnection();

    try {
      await db.runAsync(`
        UPDATE messages 
        SET deleted_at = ? 
        WHERE id = ?
      `, [new Date().toISOString(), messageId]);

      console.log(`Message ${messageId} marked as deleted`);
    } catch (error) {
      console.error('Error marking message as deleted:', error);
      throw error;
    }
  }

  /**
   * Mark multiple messages as read
   */
  async markMessagesAsRead(messageIds: number[]): Promise<void> {
    const db = await connectionManager.getConnection();

    try {
      await db.withTransactionAsync(async () => {
        const now = new Date().toISOString();
        for (const messageId of messageIds) {
          await db.runAsync(`
            UPDATE messages 
            SET is_read = 1, read_at = ? 
            WHERE id = ?
          `, [now, messageId]);
        }
      });

      console.log(`${messageIds.length} messages marked as read`);
    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw error;
    }
  }

  /**
   * Clear all messages for a chat (soft delete)
   */
  async clearChatMessages(chatId: number): Promise<void> {
    const db = await connectionManager.getConnection();

    try {
      await db.runAsync(`
        UPDATE messages 
        SET deleted_at = ? 
        WHERE chat_id = ?
      `, [new Date().toISOString(), chatId]);

      console.log(`Messages for chat ${chatId} cleared`);
    } catch (error) {
      console.error('Error clearing chat messages:', error);
      throw error;
    }
  }

  /**
   * Delete messages by chat ID (used when chat is deleted)
   */
  async deleteMessagesByChat(chatId: number): Promise<void> {
    const db = await connectionManager.getConnection();

    try {
      await db.runAsync(`
        UPDATE messages 
        SET deleted_at = ? 
        WHERE chat_id = ?
      `, [new Date().toISOString(), chatId]);

      console.log(`Messages for chat ${chatId} deleted`);
    } catch (error) {
      console.error('Error deleting messages by chat:', error);
      throw error;
    }
  }

  /**
   * Get unread message count for a chat
   */
  async getUnreadMessageCount(chatId: number): Promise<number> {
    const db = await connectionManager.getConnection();

    try {
      const result = await db.getFirstAsync<{ count: number }>(`
        SELECT COUNT(*) as count FROM messages 
        WHERE chat_id = ? AND is_read = 0 AND deleted_at IS NULL
      `, [chatId]);

      return result?.count || 0;
    } catch (error) {
      console.error('Error getting unread message count:', error);
      throw error;
    }
  }

  /**
   * Transform raw message data from database query
   */
  private transformMessageFromQuery(rawMessage: any): Message {
    return {
      id: rawMessage.id,
      chat_id: rawMessage.chat_id,
      sender_id: rawMessage.sender_id,
      reply_to_message_id: rawMessage.reply_to_message_id,
      content: rawMessage.content,
      message_type: rawMessage.message_type,
      media_data: rawMessage.media_data ? JSON.parse(rawMessage.media_data) : null,
      media_url: rawMessage.media_url,
      thumbnail_url: rawMessage.thumbnail_url,
      status: rawMessage.status,
      is_edited: rawMessage.is_edited === 1,
      edited_at: rawMessage.edited_at,
      sent_at: rawMessage.sent_at,
      deleted_at: rawMessage.deleted_at,
      created_at: rawMessage.created_at,
      updated_at: rawMessage.updated_at,
      is_mine: rawMessage.is_mine === 1,
      is_read: rawMessage.is_read === 1,
      read_at: rawMessage.read_at,
      sender: rawMessage.sender_email ? {
        id: rawMessage.sender_id,
        email: rawMessage.sender_email
      } : undefined
    };
  }
}

// Export a singleton instance
export const messageRepository = new MessageRepository(); 