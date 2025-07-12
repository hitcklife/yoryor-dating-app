import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Pressable,
  Badge,
  BadgeText
} from '@gluestack-ui/themed';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface ProfileCompletionCardProps {
  completionPercentage: number;
  incompleteSections: string[];
  totalPoints: number;
}

export const ProfileCompletionCard: React.FC<ProfileCompletionCardProps> = ({
  completionPercentage,
  incompleteSections,
  totalPoints
}) => {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push('/profile/enhance')}
      mx="$4"
      my="$2"
    >
      <Box
        bg="$white"
        borderRadius="$xl"
        overflow="hidden"
        shadowColor="$shadowColor"
        shadowOffset={{ width: 0, height: 2 }}
        shadowOpacity={0.08}
        shadowRadius={4}
        elevation={3}
      >
        {/* Gradient Header */}
        <Box
          bg={
            completionPercentage < 40 ? '$error500' :
            completionPercentage < 70 ? '$warning500' :
            '$success500'
          }
          p="$4"
        >
          <HStack justifyContent="space-between" alignItems="center">
            <VStack flex={1} space="xs">
              <Text color="$white" fontSize="$lg" fontWeight="$bold">
                {completionPercentage < 100 
                  ? `Profile ${completionPercentage}% complete`
                  : 'Profile Complete! 🎉'
                }
              </Text>
              <Text color="$white" fontSize="$xs" opacity={0.9}>
                {completionPercentage < 100 
                  ? 'Complete for better matches'
                  : 'You\'re all set!'
                }
              </Text>
              
              {/* Progress Bar */}
              <Box bg="rgba(255,255,255,0.3)" borderRadius="$full" h="$1" mt="$1">
                <Box
                  bg="$white"
                  h="$1"
                  borderRadius="$full"
                  width={`${completionPercentage}%`}
                />
              </Box>
            </VStack>
            
            {/* Circular Progress */}
            <Box
              bg="rgba(255,255,255,0.2)"
              borderRadius="$full"
              p="$2"
              borderWidth="$1"
              borderColor="rgba(255,255,255,0.4)"
              ml="$3"
            >
              <Text color="$white" fontSize="$md" fontWeight="$bold">
                {completionPercentage}%
              </Text>
            </Box>
          </HStack>
        </Box>

        {/* Content */}
        <VStack p="$3" space="sm">
          {/* Points Badge */}
          <HStack space="xs" alignItems="center">
            <Ionicons name="star" size={16} color="#FFD700" />
            <Text fontSize="$sm" fontWeight="$semibold">
              {totalPoints} Points Earned
            </Text>
          </HStack>

          {/* Incomplete Sections */}
          {incompleteSections.length > 0 && incompleteSections.length <= 3 && (
            <VStack space="xs">
              <Text fontSize="$xs" color="$textLight600" fontWeight="$medium">
                Complete: {incompleteSections.slice(0, 3).join(', ')}
              </Text>
            </VStack>
          )}
          
          {incompleteSections.length > 3 && (
            <VStack space="xs">
              <Text fontSize="$xs" color="$textLight600" fontWeight="$medium">
                {incompleteSections.length} sections remaining
              </Text>
            </VStack>
          )}

          {/* CTA */}
          <HStack justifyContent="space-between" alignItems="center">
            <Text fontSize="$sm" color="$primary600" fontWeight="$semibold">
              {completionPercentage < 100 ? 'Complete Profile' : 'Edit Profile'}
            </Text>
            <Ionicons name="arrow-forward-circle" size={20} color="#8B5CF6" />
          </HStack>
        </VStack>
      </Box>
    </Pressable>
  );
}; 