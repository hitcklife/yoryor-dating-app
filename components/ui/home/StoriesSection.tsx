import React from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { Box } from '@gluestack-ui/themed';
import StoryItem from './StoryItem';

// Mock data for stories
const storyUsers = [
  {
    id: 1,
    name: "Sarah",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80",
    hasStory: true,
  },
  {
    id: 2,
    name: "Michael",
    image: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80",
    hasStory: true,
  },
  {
    id: 3,
    name: "Jessica",
    image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80",
    hasStory: true,
  },
  {
    id: 4,
    name: "David",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80",
    hasStory: true,
  },
  {
    id: 5,
    name: "Emma",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80",
    hasStory: true,
  },
];

interface StoriesSectionProps {
  userId?: number;
  profilePhotoUrl?: string | null;
}

const StoriesSection = ({ userId, profilePhotoUrl }: StoriesSectionProps) => {
  return (
    <Box bg="#FDF7FD" style={{ height: 100 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.storiesContainer}
      >
        {/* Current User Story */}
        <StoryItem
          user={{ id: userId || 0 }}
          isCurrentUser={true}
          profilePhotoUrl={profilePhotoUrl}
        />

        {/* Other Users Stories */}
        {storyUsers.map((storyUser) => (
          <StoryItem key={storyUser.id} user={storyUser} />
        ))}
      </ScrollView>
    </Box>
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
