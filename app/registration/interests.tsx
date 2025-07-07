import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  ScrollView,
  Pressable,
  SafeAreaView,
  Center,
  AlertCircleIcon
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
  { id: 'nature', label: 'Nature', icon: 'leaf' },
  { id: 'nightlife', label: 'Nightlife', icon: 'wine' },
  { id: 'pets', label: 'Pets', icon: 'paw' },
  { id: 'volunteering', label: 'Volunteering', icon: 'heart' },
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
    profession: string;
    lookingFor: string;
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

    if (selectedInterests.length > 8) {
      setError('Please select a maximum of 8 interests');
      return;
    }

    // Navigate to the next screen with the collected data
    // Send interests as JSON string to preserve array structure
    router.push({
      pathname: '/registration/photos',
      params: {
        ...params,
        interests: JSON.stringify(selectedInterests) // Send as array via JSON
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
      currentStep={5}
      totalSteps={7}
    >
      <SafeAreaView flex={1} bg="$primaryLight50">
        <Box flex={1}>
          <ScrollView
            flex={1}
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Box flex={1} px="$6" py="$6">
              <VStack space="xl" flex={1}>
                {/* Header */}
                <Center mb="$6">
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
                    size="md"
                    textAlign="center"
                    color="$textLight600"
                    maxWidth="$80"
                  >
                    Select 1-8 interests that best describe you
                  </Text>
                </Center>

                {/* Interests Grid - 4 items per row */}
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
                            maxWidth="23%"
                          >
                            <Box
                              flex={1}
                              bg={isSelected ? "$primary500" : "$backgroundLight0"}
                              borderWidth="$2"
                              borderColor={isSelected ? "$primary500" : "$primary200"}
                              rounded="$xl"
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
                                  bg={isSelected ? "$backgroundLight0" : "$primary100"}
                                  alignItems="center"
                                  justifyContent="center"
                                >
                                  <Ionicons
                                    name={option.icon as any}
                                    size={18}
                                    color={isSelected ? "#8F3BBF" : "#5B1994"}
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
                          <Box key={`empty-${emptyIndex}`} flex={1} maxWidth="23%" />
                        ))
                      }
                    </HStack>
                  ))}
                </VStack>

                {/* Selected Count */}
                {selectedInterests.length > 0 && (
                  <Box alignItems="center" mb="$2">
                    <Text
                      size="sm"
                      color="$primary600"
                      textAlign="center"
                      fontWeight="$medium"
                    >
                      {selectedInterests.length} of 8 interests selected
                    </Text>
                  </Box>
                )}

                {/* Error Message */}
                {error && (
                  <Box
                    bg="$error50"
                    borderColor="$error200"
                    borderWidth="$1"
                    borderRadius="$md"
                    px="$4"
                    py="$3"
                    mb="$4"
                  >
                    <HStack space="sm" alignItems="center">
                      <AlertCircleIcon size="sm" color="$error600" />
                      <Text
                        size="sm"
                        color="$error700"
                        fontWeight="$medium"
                        flex={1}
                      >
                        {error}
                      </Text>
                    </HStack>
                  </Box>
                )}

                {/* Spacer for scroll content */}
                <Box h="$20" />
              </VStack>
            </Box>
          </ScrollView>

          {/* Fixed Continue Button */}
          <Box
            position="absolute"
            bottom="$0"
            left="$0"
            right="$0"
            bg="$primaryLight50"
            px="$6"
            py="$4"
            borderTopWidth="$1"
            borderTopColor="$borderLight200"
            shadowColor="$shadowColor"
            shadowOffset={{ width: 0, height: -2 }}
            shadowOpacity={0.1}
            shadowRadius={4}
            elevation={5}
          >
            <Button
              title="Continue"
              onPress={handleContinue}
              isDisabled={selectedInterests.length === 0}
              size="lg"
              variant="solid"
            />
          </Box>
        </Box>
      </SafeAreaView>
    </RegistrationLayout>
  );
}
