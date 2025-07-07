import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, Alert } from 'react-native';
import { Box } from '@gluestack-ui/themed';
import StoryItem from './StoryItem';
import StoryCreationModal from './StoryCreationModal';
import StoryViewerModal from './StoryViewerModal';
import { storiesService, StoryUser, Story, CreateStoryData } from '@/services/stories-service';
import { useAuth } from '@/context/auth-context';

interface StoriesSectionProps {
  userId?: number;
  profilePhotoUrl?: string | null;
}

const StoriesSection = ({ userId, profilePhotoUrl }: StoriesSectionProps) => {
  const { user } = useAuth();
  const [matchedUserStories, setMatchedUserStories] = useState<StoryUser[]>([]);
  const [userStories, setUserStories] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showStoryCreationModal, setShowStoryCreationModal] = useState(false);
  
  // Story viewer state
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [currentViewingStories, setCurrentViewingStories] = useState<Story[]>([]);
  const [viewingUserName, setViewingUserName] = useState('');
  const [viewingUserPhoto, setViewingUserPhoto] = useState<string | undefined>();
  const [isViewingCurrentUser, setIsViewingCurrentUser] = useState(false);

  // Fetch stories data
  const fetchStories = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await storiesService.getAllStories();
      
      if (response.status === 'success' && response.data) {
        setUserStories(response.data.user_stories || []);
        setMatchedUserStories(response.data.matched_user_stories || []);
      } else {
        setError(response.message || 'Failed to load stories');
      }
    } catch (err) {
      console.error('Error fetching stories:', err);
      setError('Failed to load stories');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle story creation
  const handleCreateStory = async (data: CreateStoryData) => {
    try {
      const response = await storiesService.createStory(data);
      
      if (response.status === 'success') {
        // Refresh stories after creating
        await fetchStories();
        Alert.alert('Success', 'Story created successfully!');
      } else {
        Alert.alert('Error', response.message || 'Failed to create story');
        throw new Error(response.message || 'Failed to create story');
      }
    } catch (err) {
      console.error('Error creating story:', err);
      throw err; // Re-throw to handle in modal
    }
  };

  // Handle opening story creation modal
  const handleOpenStoryCreation = () => {
    setShowStoryCreationModal(true);
  };

  // Handle viewing stories
  const handleViewStories = (stories: Story[], userName: string, userPhoto?: string, isCurrentUser: boolean = false) => {
    setCurrentViewingStories(stories);
    setViewingUserName(userName);
    setViewingUserPhoto(userPhoto);
    setIsViewingCurrentUser(isCurrentUser);
    setShowStoryViewer(true);
  };

  // Handle current user story viewing/creation
  const handleCurrentUserStories = () => {
    if (userStories.length > 0) {
      // User has stories, view them
      handleViewStories(
        userStories, 
        user?.profile?.first_name || 'You', 
        profilePhotoUrl || undefined, 
        true
      );
    } else {
      // User has no stories, create one
      handleOpenStoryCreation();
    }
  };

  // Fetch stories when component mounts
  useEffect(() => {
    fetchStories();
  }, []);

  // Convert user stories to the format expected by StoryItem
  const currentUserStoryData = {
    id: userId || 0,
    name: user?.profile?.first_name || 'You',
    profile_photo_path: profilePhotoUrl || undefined,
    has_story: userStories.length > 0,
    has_unseen_story: false,
    stories: userStories
  };

  return (
    <>
      <Box bg="#FDF7FD" style={{ height: 100 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.storiesContainer}
        >
          {/* Current User Story */}
          <StoryItem
            user={currentUserStoryData}
            isCurrentUser={true}
            profilePhotoUrl={profilePhotoUrl}
            onCreateStory={handleOpenStoryCreation}
            onStoryPress={() => handleCurrentUserStories()}
          />

          {/* Other Users Stories */}
          {matchedUserStories.map((storyUser) => (
            <StoryItem 
              key={storyUser.id} 
              user={storyUser}
              onStoryPress={(stories) => handleViewStories(
                stories, 
                storyUser.name, 
                storyUser.profile_photo_path, 
                false
              )}
            />
          ))}
        </ScrollView>
      </Box>

      {/* Story Creation Modal */}
      <StoryCreationModal
        visible={showStoryCreationModal}
        onClose={() => setShowStoryCreationModal(false)}
        onCreateStory={handleCreateStory}
      />

      {/* Story Viewer Modal */}
      <StoryViewerModal
        visible={showStoryViewer}
        stories={currentViewingStories}
        userName={viewingUserName}
        userPhoto={viewingUserPhoto}
        isCurrentUser={isViewingCurrentUser}
        onClose={() => setShowStoryViewer(false)}
        onAddStory={handleOpenStoryCreation}
      />
    </>
  );
};

const styles = StyleSheet.create({
  storiesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'transparent',
  },
});

export default StoriesSection;
