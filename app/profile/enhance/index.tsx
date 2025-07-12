import React, { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView } from 'react-native';
import {
  Box,
  VStack,
  HStack,
  Text,
  Pressable,
  SafeAreaView,
  StatusBar,
  Icon,
  CheckIcon
} from '@gluestack-ui/themed';
import { Ionicons } from '@expo/vector-icons';

const SECTIONS = [
  {
    id: 'cultural',
    title: 'Cultural Background',
    subtitle: 'Share your heritage and values',
    icon: 'earth',
    color: '#FF6B6B',
    points: 20
  },
  {
    id: 'family',
    title: 'Family & Marriage',
    subtitle: 'Your family values and goals',
    icon: 'people',
    color: '#4ECDC4',
    points: 20
  },
  {
    id: 'career',
    title: 'Career & Education',
    subtitle: 'Your professional journey',
    icon: 'briefcase',
    color: '#45B7D1',
    points: 20
  },
  {
    id: 'lifestyle',
    title: 'Physical & Lifestyle',
    subtitle: 'Health and daily habits',
    icon: 'fitness',
    color: '#96CEB4',
    points: 20
  },
  {
    id: 'location',
    title: 'Location & Future',
    subtitle: 'Where you are and where you\'re going',
    icon: 'location',
    color: '#FFEAA7',
    points: 20
  }
];

export default function ProfileEnhanceScreen() {
  const router = useRouter();
  const [completedSections, setCompletedSections] = useState<string[]>([]);

  return (
    <SafeAreaView flex={1} bg="$backgroundLight50">
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <HStack
        px="$4"
        py="$3"
        alignItems="center"
        justifyContent="space-between"
        bg="$white"
        borderBottomWidth="$1"
        borderBottomColor="$borderLight200"
      >
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </Pressable>
        <Text fontSize="$lg" fontWeight="$bold">
          Enhance Your Profile
        </Text>
        <Text fontSize="$sm" color="$primary600">
          {completedSections.length}/5
        </Text>
      </HStack>

      <ScrollView showsVerticalScrollIndicator={false}>
        <VStack p="$4" space="lg">
          {/* Progress Overview */}
          <Box
            bg="$primary100"
            p="$4"
            borderRadius="$xl"
            borderWidth="$1"
            borderColor="$primary200"
          >
            <VStack space="sm">
              <Text fontSize="$md" fontWeight="$semibold" color="$primary900">
                🎯 Complete all sections to:
              </Text>
              <VStack space="xs" pl="$4">
                <Text fontSize="$sm" color="$primary700">
                  • Get 3x more matches</Text>
                <Text fontSize="$sm" color="$primary700">
                  • Unlock premium features</Text>
                <Text fontSize="$sm" color="$primary700">
                  • Show your verified badge</Text>
              </VStack>
            </VStack>
          </Box>

          {/* Section Cards */}
          {SECTIONS.map((section) => {
            const isCompleted = completedSections.includes(section.id);
            
            return (
              <Pressable
                key={section.id}
                onPress={() => router.push(`/profile/enhance/${section.id}` as any)}
              >
                <Box
                  bg="$white"
                  borderRadius="$xl"
                  p="$4"
                  borderWidth="$1"
                  borderColor={isCompleted ? '$success200' : '$borderLight200'}
                  shadowColor="$shadowColor"
                  shadowOffset={{ width: 0, height: 2 }}
                  shadowOpacity={0.08}
                  shadowRadius={4}
                  elevation={2}
                >
                  <HStack space="md" alignItems="center">
                    {/* Icon */}
                    <Box
                      bg={isCompleted ? '$success100' : `${section.color}20`}
                      p="$3"
                      borderRadius="$xl"
                    >
                      <Ionicons
                        name={section.icon as any}
                        size={24}
                        color={isCompleted ? '#10B981' : section.color}
                      />
                    </Box>

                    {/* Content */}
                    <VStack flex={1}>
                      <HStack alignItems="center" space="sm">
                        <Text fontSize="$md" fontWeight="$semibold">
                          {section.title}
                        </Text>
                        {isCompleted && (
                          <Icon as={CheckIcon} size="sm" color="$success600" />
                        )}
                      </HStack>
                      <Text fontSize="$sm" color="$textLight600">
                        {section.subtitle}
                      </Text>
                    </VStack>

                    {/* Points */}
                    <VStack alignItems="center">
                      <Text fontSize="$xs" color="$textLight500">
                        {isCompleted ? 'Earned' : 'Earn'}
                      </Text>
                      <Text
                        fontSize="$sm"
                        fontWeight="$bold"
                        color={isCompleted ? '$success600' : '$primary600'}
                      >
                        +{section.points}
                      </Text>
                    </VStack>

                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color="#9CA3AF"
                    />
                  </HStack>
                </Box>
              </Pressable>
            );
          })}
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
} 