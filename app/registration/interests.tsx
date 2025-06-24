import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  ScrollView,
  Pressable,
  SafeAreaView
} from '@gluestack-ui/themed';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Button } from '@/components/ui/button';
import { Ionicons } from '@expo/vector-icons';
import { RegistrationLayout } from '@/components/ui/registration-layout';

// Interests and hobbies options
const interestOptions = [
  { id: 'gaming', label: 'Gaming', icon: 'game-controller' },
  { id: 'dancing', label: 'Dancing', icon: 'musical-notes' },
  { id: 'music', label: 'Music', icon: 'headset' },
  { id: 'movies', label: 'Movies', icon: 'film' },
  { id: 'reading', label: 'Reading', icon: 'book' },
  { id: 'sports', label: 'Sports', icon: 'football' },
  { id: 'cooking', label: 'Cooking', icon: 'restaurant' },
  { id: 'travel', label: 'Travel', icon: 'airplane' },
  { id: 'photography', label: 'Photography', icon: 'camera' },
  { id: 'art', label: 'Art', icon: 'color-palette' },
  { id: 'technology', label: 'Technology', icon: 'laptop' },
  { id: 'fitness', label: 'Fitness', icon: 'fitness' },
];

export default function InterestsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    gender: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    age: string;
    email: string;
    status: string;
    occupation: string;
    lookingFor: string;
    profession: string;
    bio: string;
  }>();

  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [error, setError] = useState('');

  const toggleInterest = (interestId: string) => {
    setSelectedInterests(prev => {
      if (prev.includes(interestId)) {
        return prev.filter(id => id !== interestId);
      } else {
        return [...prev, interestId];
      }
    });
    if (error) setError('');
  };

  const handleContinue = () => {
    if (selectedInterests.length === 0) {
      setError('Please select at least one interest');
      return;
    }

    // Navigate to the next screen with the collected data
    router.push({
      pathname: '/registration/photos',
      params: {
        ...params,
        interests: selectedInterests.join(',')
      }
    });
  };

  // Create rows of 4 items each for better layout
  const createRows = () => {
    const rows = [];
    for (let i = 0; i < interestOptions.length; i += 4) {
      rows.push(interestOptions.slice(i, i + 4));
    }
    return rows;
  };

  const rows = createRows();

  return (
    <RegistrationLayout
      title="Your Interests"
      currentStep={8}
      totalSteps={10}
    >
      <ScrollView
        flex={1}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Box flex={1} px="$6" py="$8">
          <VStack space="lg" alignItems="center">
            <Heading
              size="3xl"
              fontWeight="$bold"
              textAlign="center"
              color="$primary700"
              mb="$2"
            >
              What Are Your Interests?
            </Heading>

            <Text
              size="lg"
              textAlign="center"
              color="$primary600"
              mb="$6"
            >
              Select all that apply
            </Text>

            {/* Interests Grid - 4 items per row */}
            <Box width="100%" mb="$6">
              <VStack space="md">
                {rows.map((row, rowIndex) => (
                  <HStack key={rowIndex} justifyContent="space-between" space="sm">
                    {row.map((option) => {
                      const isSelected = selectedInterests.includes(option.id);
                      return (
                        <Pressable
                          key={option.id}
                          onPress={() => toggleInterest(option.id)}
                          flex={1}
                          aspectRatio={1}
                          maxWidth="22%"
                        >
                          <Box
                            flex={1}
                            bg={isSelected ? "$primary500" : "$backgroundLight0"}
                            borderWidth="$2"
                            borderColor={isSelected ? "$primary500" : "$primary200"}
                            rounded="$lg"
                            p="$2"
                            alignItems="center"
                            justifyContent="center"
                            shadowColor="$shadowColor"
                            shadowOffset={{
                              width: 0,
                              height: 2,
                            }}
                            shadowOpacity={0.1}
                            shadowRadius={4}
                            elevation={3}
                          >
                            <VStack space="xs" alignItems="center" flex={1} justifyContent="center">
                              <Box
                                w="$8"
                                h="$8"
                                rounded="$full"
                                bg={isSelected ? "$backgroundLight0" : "$primary700"}
                                alignItems="center"
                                justifyContent="center"
                              >
                                <Ionicons
                                  name={option.icon as any}
                                  size={18}
                                  color={isSelected ? "#8F3BBF" : "white"}
                                />
                              </Box>
                              <Text
                                size="xs"
                                textAlign="center"
                                color={isSelected ? "$backgroundLight0" : "$primary700"}
                                fontWeight={isSelected ? "$bold" : "$medium"}
                                numberOfLines={2}
                                lineHeight="$xs"
                              >
                                {option.label}
                              </Text>
                            </VStack>
                          </Box>
                        </Pressable>
                      );
                    })}
                    {/* Fill empty spaces in the last row */}
                    {row.length < 4 &&
                      Array.from({ length: 4 - row.length }).map((_, emptyIndex) => (
                        <Box key={`empty-${emptyIndex}`} flex={1} maxWidth="22%" />
                      ))
                    }
                  </HStack>
                ))}
              </VStack>
            </Box>

            {/* Error Message */}
            {error && (
              <Box
                bg="$error50"
                borderWidth="$1"
                borderColor="$error200"
                rounded="$lg"
                p="$3"
                mb="$4"
                width="100%"
              >
                <Text
                  size="md"
                  textAlign="center"
                  color="$error700"
                  fontWeight="$medium"
                >
                  {error}
                </Text>
              </Box>
            )}

            {/* Continue Button */}
            <Box width="100%" mt="$4">
              <Button
                title="Continue"
                onPress={handleContinue}
                isDisabled={selectedInterests.length === 0}
                size="lg"
                variant="solid"
              />
            </Box>

            {/* Selected Count */}
            {selectedInterests.length > 0 && (
              <Box mt="$4">
                <Text
                  size="sm"
                  color="$primary600"
                  textAlign="center"
                  fontWeight="$medium"
                >
                  {selectedInterests.length} interest{selectedInterests.length !== 1 ? 's' : ''} selected
                </Text>
              </Box>
            )}
          </VStack>
        </Box>
      </ScrollView>
    </RegistrationLayout>
  );
}
