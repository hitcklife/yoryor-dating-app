import React, { ReactNode } from 'react';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut, SlideInRight, SlideOutLeft } from 'react-native-reanimated';
import {
  Box,
  VStack,
  HStack,
  Text,
  SafeAreaView,
  Pressable,
  Progress,
  ProgressFilledTrack,
  Heading
} from '@gluestack-ui/themed';

interface ProfileSetupLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  currentStep: number;
  totalSteps: number;
  showBackButton?: boolean;
  onBack?: () => void;
  showSkipButton?: boolean;
  onSkip?: () => void;
}

export function ProfileSetupLayout({
  children,
  title,
  subtitle,
  currentStep,
  totalSteps,
  showBackButton = true,
  onBack,
  showSkipButton = false,
  onSkip
}: ProfileSetupLayoutProps) {
  const router = useRouter();
  const progress = (currentStep / totalSteps) * 100;

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    }
  };

  return (
    <SafeAreaView flex={1} bg="$backgroundLight0">
      <Stack.Screen
        options={{
          title: '',
          headerShown: true,
          headerStyle: {
            backgroundColor: '#FFFFFF',
          },
          headerShadowVisible: false,
          headerLeft: showBackButton ? () => (
            <Pressable onPress={handleBack} ml="$2">
              <Ionicons name="arrow-back" size={24} color="#4B164C" />
            </Pressable>
          ) : undefined,
          headerRight: showSkipButton ? () => (
            <Pressable onPress={handleSkip} mr="$2">
              <Text color="$primary600" fontSize="$md" fontWeight="$medium">
                Skip
              </Text>
            </Pressable>
          ) : undefined,
        }}
      />

      <Box flex={1}>
        <Animated.View
          style={{ flex: 1 }}
          entering={SlideInRight.duration(300)}
          exiting={SlideOutLeft.duration(300)}
        >
          <Box flex={1} bg="$backgroundLight0">
            {/* Header Section */}
            <Box px="$6" py="$4" bg="$backgroundLight0">
              <VStack space="sm">
                <Heading
                  size="2xl"
                  color="$primary900"
                  fontWeight="$bold"
                  textAlign="center"
                >
                  {title}
                </Heading>
                {subtitle && (
                  <Text
                    fontSize="$md"
                    color="$textLight600"
                    textAlign="center"
                    maxWidth="$80"
                    alignSelf="center"
                  >
                    {subtitle}
                  </Text>
                )}
              </VStack>
            </Box>

            {/* Progress Bar */}
            <Box px="$6" pb="$4">
              <VStack space="sm">
                <Progress
                  value={progress}
                  w="$full"
                  h="$1"
                  bg="$primary100"
                  borderRadius="$full"
                >
                  <ProgressFilledTrack
                    bg="$primary600"
                    borderRadius="$full"
                  />
                </Progress>
                <HStack justifyContent="space-between" alignItems="center">
                  <Text
                    size="xs"
                    color="$primary700"
                    fontWeight="$medium"
                  >
                    Step {currentStep} of {totalSteps}
                  </Text>
                  <Text
                    size="xs"
                    color="$textLight600"
                  >
                    {Math.round(progress)}% Complete
                  </Text>
                </HStack>
              </VStack>
            </Box>

            {/* Content */}
            <Box flex={1}>
              {children}
            </Box>
          </Box>
        </Animated.View>
      </Box>
    </SafeAreaView>
  );
} 