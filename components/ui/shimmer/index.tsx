import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle, DimensionValue } from 'react-native';
import { Box, HStack, VStack } from '@gluestack-ui/themed';

interface ShimmerProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: ViewStyle;
}

const Shimmer: React.FC<ShimmerProps> = ({ 
  width = '100%', 
  height = 20, 
  borderRadius = 4,
  style 
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    
    animation.start();
    
    return () => animation.stop();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, 100],
  });

  return (
    <Box
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: '#F3E8FF',
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View
        style={{
          flex: 1,
          opacity,
          transform: [{ translateX }],
          backgroundColor: '#E9D5FF',
        }}
      />
    </Box>
  );
};

// Chat list shimmer component
export const ChatListShimmer: React.FC = () => {
  return (
    <Box flex={1} p="$4">
      {[...Array(8)].map((_, index) => (
        <Box key={index} py="$3" px="$4">
          <HStack space="md" alignItems="flex-start">
            {/* Avatar shimmer */}
            <Shimmer 
              width={50} 
              height={50} 
              borderRadius={25}
            />
            
            {/* Content shimmer */}
            <VStack flex={1} space="xs">
              <HStack justifyContent="space-between" alignItems="center">
                <Shimmer width="40%" height={18} />
                <Shimmer width="20%" height={14} />
              </HStack>
              <Shimmer width="80%" height={14} />
            </VStack>
          </HStack>
        </Box>
      ))}
    </Box>
  );
};

export default Shimmer; 