import React, { useState, useEffect } from 'react';
import { StyleSheet, Image, TouchableOpacity, Dimensions, Text as RNText } from 'react-native';
import {
  Modal,
  Box,
  Text,
  VStack,
  HStack,
  Button,
  ButtonText,
  Progress,
  ProgressFilledTrack,
} from '@gluestack-ui/themed';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Story } from '@/services/stories-service';
import { useAuth } from '@/context/auth-context';

interface StoryViewerModalProps {
  visible: boolean;
  stories: Story[];
  initialStoryIndex?: number;
  isCurrentUser?: boolean;
  userName?: string;
  userPhoto?: string;
  onClose: () => void;
  onAddStory?: () => void;
}

const StoryViewerModal = ({ 
  visible, 
  stories, 
  initialStoryIndex = 0,
  isCurrentUser = false,
  userName = '',
  userPhoto,
  onClose,
  onAddStory
}: StoryViewerModalProps) => {
  const { user } = useAuth();
  const [currentStoryIndex, setCurrentStoryIndex] = useState(initialStoryIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const { width, height } = Dimensions.get('window');
  const STORY_DURATION = 5000; // 5 seconds per story

  const currentStory = stories[currentStoryIndex];

  // Reset story index when modal opens
  useEffect(() => {
    if (visible) {
      setCurrentStoryIndex(initialStoryIndex);
      setProgress(0);
      setIsPaused(false);
    }
  }, [visible, initialStoryIndex]);

  // Progress timer
  useEffect(() => {
    if (!visible || isPaused || !currentStory) return;

    const UPDATE_INTERVAL = 50; // Update every 50ms for smoother animation
    const PROGRESS_INCREMENT = (100 / (STORY_DURATION / UPDATE_INTERVAL)); // Smaller increments

    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + PROGRESS_INCREMENT;
        
        if (newProgress >= 100) {
          // Move to next story or close
          if (currentStoryIndex < stories.length - 1) {
            setCurrentStoryIndex(prev => prev + 1);
            return 0;
          } else {
            onClose();
            return 100;
          }
        }
        
        return newProgress;
      });
    }, UPDATE_INTERVAL);

    return () => clearInterval(interval);
  }, [visible, isPaused, currentStoryIndex, stories.length, currentStory, onClose]);

  const handlePrevious = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(prev => prev - 1);
      setProgress(0);
    }
  };

  const handleNext = () => {
    if (currentStoryIndex < stories.length - 1) {
      setCurrentStoryIndex(prev => prev + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handleAddStory = () => {
    onClose();
    if (onAddStory) {
      onAddStory();
    }
  };

  const formatTime = (dateString: string) => {
    const now = new Date();
    const storyTime = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - storyTime.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'now';
    if (diffInHours < 24) return `${diffInHours}h`;
    return `${Math.floor(diffInHours / 24)}d`;
  };

  if (!visible || !currentStory) return null;

  return (
    <Modal isOpen={visible} onClose={onClose}>
      <Box
        width="100%"
        height="100%"
        bg="black"
        position="relative"
      >
        {/* Story Progress Bars */}
        <Box
          position="absolute"
          top={60}
          left={16}
          right={16}
          zIndex={20}
        >
          <HStack space="xs">
            {stories.map((_, index) => (
              <Box
                key={index}
                flex={1}
                height={3}
                bg="rgba(255,255,255,0.3)"
                borderRadius="$sm"
                overflow="hidden"
              >
                <Progress
                  value={
                    index < currentStoryIndex 
                      ? 100 
                      : index === currentStoryIndex 
                      ? progress 
                      : 0
                  }
                  size="sm"
                  bg="transparent"
                >
                  <ProgressFilledTrack bg="white" />
                </Progress>
              </Box>
            ))}
          </HStack>
        </Box>

        {/* Header */}
        <Box
          position="absolute"
          top={80}
          left={16}
          right={16}
          zIndex={20}
        >
          <HStack justifyContent="space-between" alignItems="center">
            <HStack space="sm" alignItems="center" flex={1}>
              {/* User Avatar */}
              <Box
                width={32}
                height={32}
                borderRadius="$full"
                overflow="hidden"
                borderWidth={2}
                borderColor="white"
              >
                {userPhoto ? (
                  <Image
                    source={{ uri: userPhoto }}
                    style={styles.avatar}
                    resizeMode="cover"
                  />
                ) : (
                  <Box
                    flex={1}
                    bg="$gray400"
                    justifyContent="center"
                    alignItems="center"
                  >
                    <Ionicons name="person" size={16} color="white" />
                  </Box>
                )}
              </Box>

              {/* User Info */}
              <VStack flex={1}>
                <Text color="white" fontWeight="$bold" fontSize="$sm">
                  {userName || 'Unknown User'}
                </Text>
                <Text color="rgba(255,255,255,0.7)" fontSize="$xs">
                  {formatTime(currentStory.created_at)}
                </Text>
              </VStack>
            </HStack>

            {/* Actions */}
            <HStack space="sm" alignItems="center">
              {isCurrentUser && onAddStory && (
                <TouchableOpacity onPress={handleAddStory} style={styles.actionButton}>
                  <Ionicons name="add" size={20} color="white" />
                </TouchableOpacity>
              )}
              
              <TouchableOpacity onPress={onClose} style={styles.actionButton}>
                <Ionicons name="close" size={20} color="white" />
              </TouchableOpacity>
            </HStack>
          </HStack>
        </Box>

        {/* Story Content */}
        <TouchableOpacity
          style={styles.storyContainer}
          activeOpacity={1}
          onPressIn={() => setIsPaused(true)}
          onPressOut={() => setIsPaused(false)}
        >
          {/* Background Image */}
          <Image
            source={{ uri: currentStory.media_url }}
            style={styles.storyImage}
            resizeMode="cover"
          />

          {/* Touch Areas for Navigation */}
          <TouchableOpacity
            style={[styles.touchArea, styles.leftTouch]}
            onPress={handlePrevious}
            activeOpacity={0}
          />
          
          <TouchableOpacity
            style={[styles.touchArea, styles.rightTouch]}
            onPress={handleNext}
            activeOpacity={0}
          />

          {/* Caption Overlay */}
          {currentStory.caption && (
            <Box
              position="absolute"
              bottom={100}
              left={16}
              right={16}
              px="$4"
              py="$3"
              bg="rgba(0,0,0,0.3)"
              borderRadius="$xl"
            >
              <Text
                color="white"
                fontSize="$lg"
                fontWeight="$medium"
                textAlign="center"
              >
                {currentStory.caption}
              </Text>
            </Box>
          )}
        </TouchableOpacity>

        {/* Bottom Gradient */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.6)']}
          style={styles.bottomGradient}
          pointerEvents="none"
        />
      </Box>
    </Modal>
  );
};

const styles = StyleSheet.create({
  avatar: {
    width: '100%',
    height: '100%',
  },
  actionButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    padding: 8,
  },
  storyContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  storyImage: {
    width: '100%',
    height: '100%',
  },
  touchArea: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '40%',
  },
  leftTouch: {
    left: 0,
  },
  rightTouch: {
    right: 0,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    pointerEvents: 'none',
  },
});

export default StoryViewerModal; 