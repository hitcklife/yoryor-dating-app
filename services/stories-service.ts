import { apiClient, ApiResponse } from './api-client';

export interface Story {
    id: number;
    user_id: number;
    content?: string;
    caption?: string; // Added caption field from API
    media_url?: string;
    thumbnail_url?: string; // Added thumbnail_url from API
    media_type?: 'image' | 'video';
    type?: 'image' | 'video'; // Added type field from API
    status?: string; // Added status field from API
    is_expired?: boolean; // Added is_expired field from API
    created_at: string;
    updated_at: string;
    expires_at: string;
    is_viewed?: boolean;
    user?: {
        id: number;
        first_name: string;
        last_name: string;
        profile_photo_path?: string;
        profile?: {
            first_name: string;
            last_name: string;
        };
    };
}

export interface StoryUser {
    id: number;
    name: string;
    profile_photo_path?: string;
    has_story: boolean;
    has_unseen_story: boolean;
    stories: Story[];
}

export interface CreateStoryData {
    media: any; // Required file
    type: 'image' | 'video'; // Required type
    caption?: string; // Optional caption, max 500 characters
}

class StoriesService {
    constructor() {
        // Use the singleton apiClient instance directly
    }

    /**
     * Get current user's stories
     */
    async getUserStories(): Promise<ApiResponse<Story[]>> {
        try {
            const response = await apiClient.get<Story[]>('/api/v1/stories');
            return response;
        } catch (error) {
            console.error('Error fetching user stories:', error);
            return {
                status: 'error',
                message: 'Failed to fetch user stories'
            };
        }
    }

    /**
     * Get matched users' stories
     */
    async getMatchedUserStories(): Promise<ApiResponse<StoryUser[]>> {
        try {
            const response = await apiClient.get<StoryUser[]>('/api/v1/stories/matches');
            return response;
        } catch (error) {
            console.error('Error fetching matched user stories:', error);
            return {
                status: 'error',
                message: 'Failed to fetch matched user stories'
            };
        }
    }

    /**
     * Create a new story
     */
    async createStory(data: CreateStoryData): Promise<ApiResponse<Story>> {
        try {
            // Always use FormData for media uploads
            const formData = new FormData();
            
            // Add required media file
            formData.append('media', {
                uri: data.media.uri,
                name: data.media.name || 'story_media',
                type: data.media.type || 'image/jpeg'
            } as any);
            
            // Add required type
            formData.append('type', data.type);
            
            // Add optional caption
            if (data.caption) {
                formData.append('caption', data.caption);
            }

            const response = await apiClient.post<Story>('/api/v1/stories', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            
            return response;
        } catch (error) {
            console.error('Error creating story:', error);
            return {
                status: 'error',
                message: 'Failed to create story'
            };
        }
    }

    /**
     * Delete a story
     */
    async deleteStory(storyId: number): Promise<ApiResponse<void>> {
        try {
            const response = await apiClient.delete<void>(`/api/v1/stories/${storyId}`);
            return response;
        } catch (error) {
            console.error('Error deleting story:', error);
            return {
                status: 'error',
                message: 'Failed to delete story'
            };
        }
    }

    /**
     * Mark story as viewed
     */
    async markStoryAsViewed(storyId: number): Promise<ApiResponse<void>> {
        try {
            const response = await apiClient.post<void>(`/api/v1/stories/${storyId}/view`);
            return response;
        } catch (error) {
            console.error('Error marking story as viewed:', error);
            return {
                status: 'error',
                message: 'Failed to mark story as viewed'
            };
        }
    }

    /**
     * Get all stories (user's own + matched users')
     */
    async getAllStories(): Promise<ApiResponse<{
        user_stories: Story[];
        matched_user_stories: StoryUser[];
    }>> {
        try {
            const [userStoriesResponse, matchedStoriesResponse] = await Promise.all([
                this.getUserStories(),
                this.getMatchedUserStories()
            ]);

            if (userStoriesResponse.status === 'error' || matchedStoriesResponse.status === 'error') {
                return {
                    status: 'error',
                    message: 'Failed to fetch stories'
                };
            }

            return {
                status: 'success',
                data: {
                    user_stories: userStoriesResponse.data || [],
                    matched_user_stories: matchedStoriesResponse.data || []
                }
            };
        } catch (error) {
            console.error('Error fetching all stories:', error);
            return {
                status: 'error',
                message: 'Failed to fetch stories'
            };
        }
    }
}

// Export singleton instance
export const storiesService = new StoriesService();
export default storiesService; 