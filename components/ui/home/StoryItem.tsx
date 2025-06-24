import React from 'react';
import { StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Text } from '@gluestack-ui/themed';
import { View } from '@/components/Themed';
import { Ionicons } from '@expo/vector-icons';

interface StoryItemProps {
  user: any;
  isCurrentUser?: boolean;
  profilePhotoUrl?: string | null;
}

const StoryItem = ({ user, isCurrentUser = false, profilePhotoUrl = null }: StoryItemProps) => (
  <TouchableOpacity style={styles.storyItem}>
    <View style={[styles.storyContainer, { backgroundColor: 'transparent' }]}>
      {/* Story ring for other users */}
      {!isCurrentUser && user.hasStory && (
        <View style={styles.storyRing} />
      )}

      {/* Profile image */}
      <Image
        source={{ uri: isCurrentUser && profilePhotoUrl ? profilePhotoUrl : user.image }}
        style={[
          styles.storyImage,
          isCurrentUser ? styles.currentUserImage : styles.otherUserImage
        ]}
      />

      {/* Plus icon for current user */}
      {isCurrentUser && (
        <View style={styles.plusIconContainer}>
          <Ionicons name="add" size={16} color="white" />
        </View>
      )}
    </View>

    <Text style={styles.storyName} numberOfLines={1}>
      {isCurrentUser ? "Your Story" : user.name}
    </Text>
  </TouchableOpacity>
);

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
    borderColor: '#FF6B9D',
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
    borderWidth: 3,
    borderColor: '#FDF7FD',
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
  storyName: {
    fontSize: 12,
    color: '#2D3748',
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default StoryItem;
