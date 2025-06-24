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
  ProgressFilledTrack
} from '@gluestack-ui/themed';

interface RegistrationLayoutProps {
  children: ReactNode;
  title: string;
  currentStep: number;
  totalSteps: number;
  showBackButton?: boolean;
  onBack?: () => void;
}

export function RegistrationLayout({
  children,
  title,
  currentStep,
  totalSteps,
  showBackButton = true,
  onBack
}: RegistrationLayoutProps) {
  const router = useRouter();
  const progress = (currentStep / totalSteps) * 100;

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView flex={1} bg="$primaryLight50">
      <Stack.Screen
        options={{
          title: '',
          headerShown: true,
          headerStyle: {
            backgroundColor: '#F5ECF7',
          },
          headerShadowVisible: false,
          headerLeft: showBackButton ? () => (
            <Pressable onPress={handleBack} ml="$2">
              <Ionicons name="arrow-back" size={24} color="#4B164C" />
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
          <Box flex={1} bg="$primaryLight50">
            {children}
          </Box>
        </Animated.View>

        {/* Progress Bar Section */}
        <Box px="$6" pb="$6" bg="$primaryLight50">
          <VStack space="md">
            <Progress
              value={progress}
              w="$full"
              h="$2"
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
                size="sm"
                color="$primary700"
                fontWeight="$medium"
              >
                Step {currentStep} of {totalSteps}
              </Text>

              <Text
                size="sm"
                color="$textLight600"
              >
                {Math.round(progress)}% Complete
              </Text>
            </HStack>
          </VStack>
        </Box>
      </Box>
    </SafeAreaView>
  );
}
