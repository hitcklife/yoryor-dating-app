import React from 'react';
import { StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Text } from '@gluestack-ui/themed';
import { View } from '@/components/Themed';
import { Ionicons } from '@expo/vector-icons';
import { StoryUser, Story } from '@/services/stories-service';
import { getAssetUrl } from '@/services/config';

interface StoryItemProps {
  user: StoryUser;
  isCurrentUser?: boolean;
  profilePhotoUrl?: string | null;
  onCreateStory?: () => void;
  onStoryPress?: (stories: Story[]) => void;
}

const StoryItem = ({ 
  user, 
  isCurrentUser = false, 
  profilePhotoUrl = null, 
  onCreateStory, 
  onStoryPress 
}: StoryItemProps) => {
  const handlePress = () => {
    if (isCurrentUser) {
      // For current user, if they have stories, view them, otherwise create
      if (user.has_story && onStoryPress) {
        onStoryPress(user.stories);
      } else if (onCreateStory) {
        onCreateStory();
      }
    } else {
      // For other users, view their stories
      if (onStoryPress && user.stories && user.stories.length > 0) {
        onStoryPress(user.stories);
      }
    }
  };

  // Get profile image URL
  const getProfileImageUrl = () => {
    if (isCurrentUser && profilePhotoUrl) {
      return profilePhotoUrl;
    }
    
    if (user.profile_photo_path) {
      return getAssetUrl(user.profile_photo_path);
    }
    
    return null;
  };

  const profileImageUrl = getProfileImageUrl();

  // Determine story ring style
  const getStoryRingStyle = () => {
    if (isCurrentUser) {
      // Current user: no ring, just border
      return null;
    }
    
    if (!user.has_story) {
      // No story: no ring
      return null;
    }
    
    // Has story: show colored ring
    return {
      ...styles.storyRing,
      borderColor: user.has_unseen_story ? '#FF6B9D' : '#C0C0C0', // Pink for unseen, gray for seen
    };
  };

  const storyRingStyle = getStoryRingStyle();

  return (
    <TouchableOpacity style={styles.storyItem} onPress={handlePress}>
      <View style={[styles.storyContainer, { backgroundColor: 'transparent' }]}>
        {/* Story ring for users with stories */}
        {storyRingStyle && (
          <View style={storyRingStyle} />
        )}

        {/* Profile image */}
        {profileImageUrl ? (
          <Image
            source={{ uri: profileImageUrl }}
            style={[
              styles.storyImage,
              isCurrentUser ? styles.currentUserImage : styles.otherUserImage
            ]}
          />
        ) : (
          <View style={[
            styles.storyImage,
            styles.placeholderImage,
            isCurrentUser ? styles.currentUserImage : styles.otherUserImage
          ]}>
            <Ionicons name="person" size={24} color="#999" />
          </View>
        )}

        {/* Plus icon for current user (only when no story) */}
        {isCurrentUser && !user.has_story && (
          <View style={styles.plusIconContainer}>
            <Ionicons name="add" size={16} color="white" />
          </View>
        )}

        {/* Story indicator for current user with stories */}
        {isCurrentUser && user.has_story && (
          <View style={styles.storyIndicator}>
            <Ionicons name="play" size={12} color="white" />
          </View>
        )}
      </View>

      <Text style={styles.storyName} numberOfLines={1}>
        {isCurrentUser ? "Your Story" : user.name}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  storyItem: {
    alignItems: 'center',
    marginRight: 16,
    width: 70,
    backgroundColor: 'transparent',
  },
  storyContainer: {
    position: 'relative',
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  storyRing: {
    position: 'absolute',
    top: -3,
    left: -3,
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    zIndex: 1,
    backgroundColor: 'transparent',
  },
  storyImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  currentUserImage: {
    borderWidth: 3,
    borderColor: '#E5E7EB',
  },
  otherUserImage: {
    borderWidth: 2,
    borderColor: '#FDF7FD',
  },
  placeholderImage: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  plusIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF6B9D',
    borderWidth: 2,
    borderColor: '#FDF7FD',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  storyIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#FDF7FD',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  storyName: {
    fontSize: 12,
    color: '#2D3748',
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default StoryItem;
