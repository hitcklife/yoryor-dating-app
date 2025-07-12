import React, { useState } from 'react';
import { Animated, LayoutAnimation, Platform, UIManager } from 'react-native';
import {
  Box,
  VStack,
  HStack,
  Text,
  Pressable,
  Progress,
  ProgressFilledTrack,
  Badge,
  BadgeText,
  Divider
} from '@gluestack-ui/themed';
import { Ionicons } from '@expo/vector-icons';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

interface ProfileSectionProps {
  id: string;
  title: string;
  icon: string;
  completedFields: number;
  totalFields: number;
  percentage: number;
  isComplete: boolean;
  boostText?: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  onPress?: () => void;
}

export function ProfileSection({
  id,
  title,
  icon,
  completedFields,
  totalFields,
  percentage,
  isComplete,
  boostText,
  children,
  defaultExpanded = false,
  onPress
}: ProfileSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const rotateAnim = React.useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;

  const toggleExpand = () => {
    LayoutAnimation.configureNext(
      LayoutAnimation.create(
        300,
        LayoutAnimation.Types.easeInEaseOut,
        LayoutAnimation.Properties.opacity
      )
    );

    Animated.timing(rotateAnim, {
      toValue: isExpanded ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    setIsExpanded(!isExpanded);
    onPress?.();
  };

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  return (
    <Box
      bg="$white"
      borderRadius="$xl"
      shadowColor="$backgroundLight300"
      shadowOffset={{ width: 0, height: 2 }}
      shadowOpacity={0.1}
      shadowRadius={4}
      elevation={3}
      overflow="hidden"
      mb="$4"
    >
      <Pressable onPress={toggleExpand}>
        <Box p="$4">
          <VStack space="md">
            {/* Header */}
            <HStack alignItems="center" justifyContent="space-between">
              <HStack space="md" alignItems="center" flex={1}>
                <Box
                  w="$10"
                  h="$10"
                  bg={isComplete ? '$success100' : '$primary100'}
                  alignItems="center"
                  justifyContent="center"
                  borderRadius="$md"
                >
                  <Ionicons
                    name={icon as any}
                    size={24}
                    color={isComplete ? '#059669' : '#8F3BBF'}
                  />
                </Box>
                <VStack flex={1}>
                  <HStack alignItems="center" space="sm">
                    <Text fontSize="$lg" fontWeight="$semibold" color="$primary900">
                      {title}
                    </Text>
                    {isComplete && (
                      <Ionicons name="checkmark-circle" size={20} color="#059669" />
                    )}
                  </HStack>
                  <Text fontSize="$sm" color="$textLight600">
                    {completedFields} of {totalFields} fields completed
                  </Text>
                </VStack>
              </HStack>
              <Animated.View
                style={{
                  transform: [{ rotate: rotateInterpolate }],
                }}
              >
                <Ionicons name="chevron-forward" size={24} color="#8F3BBF" />
              </Animated.View>
            </HStack>

            {/* Progress Bar */}
            <Progress
              value={percentage}
              w="$full"
              h="$2"
              bg="$primary100"
              borderRadius="$full"
            >
              <ProgressFilledTrack
                bg={isComplete ? '$success600' : '$primary600'}
                borderRadius="$full"
              />
            </Progress>

            {/* Boost Badge */}
            {!isComplete && boostText && (
              <Box alignItems="flex-start">
                <Badge
                  variant="solid"
                  bg="$warning100"
                  borderRadius="$full"
                  px="$3"
                  py="$1"
                >
                  <HStack space="xs" alignItems="center">
                    <Ionicons name="rocket" size={14} color="#F59E0B" />
                    <BadgeText color="$warning700" fontSize="$xs" fontWeight="$medium">
                      {boostText}
                    </BadgeText>
                  </HStack>
                </Badge>
              </Box>
            )}
          </VStack>
        </Box>
      </Pressable>

      {/* Expandable Content */}
      {isExpanded && (
        <>
          <Divider bg="$borderLight200" />
          <Box p="$4">
            {children}
          </Box>
        </>
      )}
    </Box>
  );
} 