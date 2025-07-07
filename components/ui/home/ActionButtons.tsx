import React, { useState, useRef } from 'react';
import { StyleSheet, TouchableOpacity, ActivityIndicator, Animated, View, Text } from 'react-native';
import { Box, Button, ButtonText } from '@gluestack-ui/themed';
import { Ionicons } from '@expo/vector-icons';

interface ActionButtonsProps {
  isLoading: boolean;
  hasError: boolean;
  hasMatches: boolean;
  onLike: () => void;
  onDislike: () => void;
  onRetry: () => void;
  setCardPosition?: (position: Animated.Value) => void;
  setStampOpacity?: (opacity: Animated.Value) => void;
  setShowLikeStampParent?: (show: boolean) => void;
  setShowDislikeStampParent?: (show: boolean) => void;
}

const ActionButtons = ({
  isLoading,
  hasError,
  hasMatches,
  onLike,
  onDislike,
  onRetry,
  setCardPosition,
  setStampOpacity,
  setShowLikeStampParent,
  setShowDislikeStampParent
}: ActionButtonsProps) => {
  // Animation values
  const [showLikeStamp, setShowLikeStamp] = useState(false);
  const [showDislikeStamp, setShowDislikeStamp] = useState(false);
  const stampOpacity = useRef(new Animated.Value(0)).current;
  const cardPosition = useRef(new Animated.Value(0)).current;

  // Share animation values with parent if props are provided
  React.useEffect(() => {
    if (setCardPosition) setCardPosition(cardPosition);
    if (setStampOpacity) setStampOpacity(stampOpacity);
  }, []);

  // Animation functions
  const animateLike = () => {
    // Reset position
    cardPosition.setValue(0);
    // Show like stamp
    setShowLikeStamp(true);
    setShowDislikeStamp(false);
    if (setShowLikeStampParent) setShowLikeStampParent(true);
    if (setShowDislikeStampParent) setShowDislikeStampParent(false);

    // Animate stamp opacity
    Animated.sequence([
      Animated.timing(stampOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.delay(300),
      Animated.timing(stampOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start();

    // Animate card sliding right
    Animated.timing(cardPosition, {
      toValue: 500, // Slide right off screen
      duration: 500,
      useNativeDriver: true,
    }).start(() => {
      // Call the original onLike function after animation
      onLike();
      // Reset position for next card
      cardPosition.setValue(0);
    });
  };

  const animateDislike = () => {
    // Reset position
    cardPosition.setValue(0);
    // Show dislike stamp
    setShowDislikeStamp(true);
    setShowLikeStamp(false);
    if (setShowDislikeStampParent) setShowDislikeStampParent(true);
    if (setShowLikeStampParent) setShowLikeStampParent(false);

    // Animate stamp opacity
    Animated.sequence([
      Animated.timing(stampOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.delay(300),
      Animated.timing(stampOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start();

    // Animate card sliding left
    Animated.timing(cardPosition, {
      toValue: -500, // Slide left off screen
      duration: 500,
      useNativeDriver: true,
    }).start(() => {
      // Call the original onDislike function after animation
      onDislike();
      // Reset position for next card
      cardPosition.setValue(0);
    });
  };
  // Stamp overlays
  const renderStamps = () => {
    return (
      <>
        {/* Like Stamp */}
        {showLikeStamp && (
          <Animated.View
            style={[
              styles.stamp,
              styles.likeStamp,
              { opacity: stampOpacity }
            ]}
          >
            <Text style={styles.stampText}>LIKE</Text>
          </Animated.View>
        )}

        {/* Dislike Stamp */}
        {showDislikeStamp && (
          <Animated.View
            style={[
              styles.stamp,
              styles.dislikeStamp,
              { opacity: stampOpacity }
            ]}
          >
            <Text style={styles.stampText}>NOPE</Text>
          </Animated.View>
        )}
      </>
    );
  };

  return (
    <Box
      position="relative"
      flexDirection="row"
      justifyContent="center"
      alignItems="center"
      width="100%"
      py="$4"
    >
      {/* Render stamps */}
      {renderStamps()}
      {/* Show buttons or error state */}
      {hasError ? (
        <Button onPress={onRetry} bg="#FF6B9D" borderRadius="$xl" px="$6" py="$3">
          <ButtonText color="white">Retry</ButtonText>
        </Button>
      ) : (
        <>
          {/* Dislike Button - Square */}
          <TouchableOpacity
            style={styles.dislikeButton}
            activeOpacity={0.8}
            onPress={animateDislike}
            disabled={isLoading || !hasMatches}
          >
            <Ionicons name="close" size={28} color="#FF4458" />
          </TouchableOpacity>

          {/* Space between buttons */}
          <Box width="$6" />

          {/* Like Button - Square */}
          <TouchableOpacity
            style={styles.likeButton}
            activeOpacity={0.8}
            onPress={animateLike}
            disabled={isLoading || !hasMatches}
          >
            <Ionicons name="heart" size={28} color="#fff" />
          </TouchableOpacity>
        </>
      )}
    </Box>
  );
};

const styles = StyleSheet.create({
  dislikeButton: {
    width: 65,
    height: 65,
    borderRadius: 18,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF4458',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 2,
    borderColor: '#FFE8EA',
  },
  likeButton: {
    width: 65,
    height: 65,
    borderRadius: 18,
    backgroundColor: '#FF4458',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#DD88CF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  // Stamp styles
  stamp: {
    position: 'absolute',
    top: -200, // Position well above the buttons
    left: '50%',
    marginLeft: -75, // Half of the width to center it horizontally
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 6,
    borderRadius: 10,
    transform: [{ rotate: '-20deg' }],
    zIndex: 9999, // Ensure it's above everything else
    width: 200, // Make it larger
  },
  likeStamp: {
    borderColor: '#00E878',
    backgroundColor: 'rgba(0, 232, 120, 0.8)',
  },
  dislikeStamp: {
    borderColor: '#FF4458',
    backgroundColor: 'rgba(255, 68, 88, 0.8)',
  },
  stampText: {
    fontSize: 40,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 3,
  },
});

export default ActionButtons;
