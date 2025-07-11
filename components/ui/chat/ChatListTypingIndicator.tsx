import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { Box, HStack, Text } from '@gluestack-ui/themed';

interface ChatListTypingIndicatorProps {
  // No props needed - just shows "typing..." with dots
}

export const ChatListTypingIndicator: React.FC<ChatListTypingIndicatorProps> = () => {
  const dot1Animation = useRef(new Animated.Value(0.4)).current;
  const dot2Animation = useRef(new Animated.Value(0.4)).current;
  const dot3Animation = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const createPulseAnimation = (animatedValue: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: 600,
            delay,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
          Animated.timing(animatedValue, {
            toValue: 0.4,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
        ])
      );
    };

    const dot1Anim = createPulseAnimation(dot1Animation, 0);
    const dot2Anim = createPulseAnimation(dot2Animation, 200);
    const dot3Anim = createPulseAnimation(dot3Animation, 400);

    dot1Anim.start();
    dot2Anim.start();
    dot3Anim.start();

    return () => {
      dot1Anim.stop();
      dot2Anim.stop();
      dot3Anim.stop();
    };
  }, []);

  return (
    <HStack space="xs" alignItems="center">
      <Text
        color="#6B7280"
        size="sm"
        fontStyle="italic"
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        typing
      </Text>
      <HStack space="xs" alignItems="center">
        <Animated.View
          style={{
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: '#8B5CF6',
            opacity: dot1Animation,
          }}
        />
        <Animated.View
          style={{
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: '#8B5CF6',
            opacity: dot2Animation,
          }}
        />
        <Animated.View
          style={{
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: '#8B5CF6',
            opacity: dot3Animation,
          }}
        />
      </HStack>
    </HStack>
  );
}; 