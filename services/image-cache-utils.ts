import { imageCacheService } from './image-cache-service';
import { sqliteService } from './sqlite-service';
import { likesService } from './likes-service';

/**
 * Preload profile images for a list of users
 */
export const preloadProfileImages = async (userIds: number[]): Promise<void> => {
  try {
    console.log(`Preloading profile images for ${userIds.length} users`);
    
    // Get user profile data to extract image URLs
    const profilePromises = userIds.map(async (userId) => {
      try {
        // You might need to implement a method to get user profile data
        // For now, we'll just log the attempt
        console.log(`Preloading profile image for user ${userId}`);
      } catch (error) {
        console.error(`Error preloading profile for user ${userId}:`, error);
      }
    });

    await Promise.all(profilePromises);
    console.log('Profile image preloading completed');
  } catch (error) {
    console.error('Error preloading profile images:', error);
  }
};

/**
 * Preload chat media images for a specific chat
 */
export const preloadChatMedia = async (chatId: number, messageIds: number[]): Promise<void> => {
  try {
    console.log(`Preloading chat media for chat ${chatId}, ${messageIds.length} messages`);
    
    // Get messages with media
    const messages = await sqliteService.getMessagesForChat(chatId);
    const mediaMessages = messages.filter((msg: any) => 
      msg.message_type === 'image' || msg.message_type === 'video'
    );

    const preloadPromises = mediaMessages.map(async (message: any) => {
      if (message.media_url) {
        try {
          await imageCacheService.getCachedImageUrl(
            message.media_url,
            'chat_media',
            {
              chatId: message.chat_id,
              messageId: message.id,
              size: 'original',
            }
          );
        } catch (error) {
          console.error(`Error preloading media for message ${message.id}:`, error);
        }
      }
    });

    await Promise.all(preloadPromises);
    console.log('Chat media preloading completed');
  } catch (error) {
    console.error('Error preloading chat media:', error);
  }
};

/**
 * Preload images for matches
 */
export const preloadMatchImages = async (): Promise<void> => {
  try {
    console.log('Preloading match images');
    
    const response = await likesService.fetchMatches(1);
    if (response && response.status === 'success') {
      const matches = response.data.matches;
      
      const preloadPromises = matches.map(async (match) => {
        if (match.user && match.user.profile_photo) {
          try {
            await imageCacheService.getCachedImageUrl(
              match.user.profile_photo.medium_url || match.user.profile_photo.original_url,
              'profile',
              {
                userId: match.user.id,
                size: 'medium',
              }
            );
          } catch (error) {
            console.error(`Error preloading match image for user ${match.user.id}:`, error);
          }
        }
      });

      await Promise.all(preloadPromises);
      console.log('Match images preloading completed');
    }
  } catch (error) {
    console.error('Error preloading match images:', error);
  }
};

/**
 * Clear old cached images
 */
export const cleanupOldImages = async (): Promise<void> => {
  try {
    console.log('Cleaning up old cached images');
    
    // Get cache stats
    const stats = await imageCacheService.getCacheStats();
    console.log('Current cache stats:', stats);
    
    // Clear cache if it's getting too large
    if (stats.totalSize > 50 * 1024 * 1024) { // 50MB
      console.log('Cache size is large, clearing old images');
      await imageCacheService.clearCache();
    }
  } catch (error) {
    console.error('Error cleaning up old images:', error);
  }
};

/**
 * Get cache statistics
 */
export const getCacheStats = async () => {
  try {
    return await imageCacheService.getCacheStats();
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return null;
  }
};

/**
 * Clear all cached images
 */
export const clearAllCachedImages = async (): Promise<void> => {
  try {
    console.log('Clearing all cached images');
    await imageCacheService.clearCache();
    console.log('All cached images cleared');
  } catch (error) {
    console.error('Error clearing cached images:', error);
  }
}; 