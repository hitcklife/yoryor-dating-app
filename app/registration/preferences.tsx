import React, { useState } from 'react';
import { Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  ScrollView,
  KeyboardAvoidingView,
  SafeAreaView,
  Pressable,
  Center,
  Textarea,
  TextareaInput,
  Divider,
  AlertCircleIcon
} from '@gluestack-ui/themed';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/button';
import { RegistrationLayout } from '@/components/ui/registration-layout';

// Looking for options with icons
const lookingForOptions = [
  { id: 'casual', label: 'Casual Dating', icon: 'cafe', description: 'Fun and casual connections' },
  { id: 'serious', label: 'Serious Relationship', icon: 'heart', description: 'Long-term commitment' },
  { id: 'friendship', label: 'Friendship', icon: 'people', description: 'Friends and social connections' },
  { id: 'all', label: 'Open to All', icon: 'apps', description: 'Exploring all possibilities' },
];

export default function PreferencesScreen() {
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
  }>();

  const [selectedLookingFor, setSelectedLookingFor] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const [error, setError] = useState('');

  const handleContinue = () => {
    if (!selectedLookingFor) {
      setError('Please select what you are looking for');
      return;
    }

    // Bio is optional, but if provided, should be at least 20 characters
    if (bio.trim() && bio.trim().length < 20) {
      setError('Your bio should be at least 20 characters long to be meaningful');
      return;
    }

    router.push({
      pathname: '/registration/interests',
      params: {
        ...params,
        lookingFor: selectedLookingFor,
        bio: bio.trim()
      }
    });
  };

  const clearError = () => {
    if (error) setError('');
  };

  const LookingForCard = ({
    option,
    isSelected,
    onPress
  }: {
    option: typeof lookingForOptions[0];
    isSelected: boolean;
    onPress: () => void;
  }) => (
    <Pressable
      onPress={onPress}
      mb="$3"
    >
      <Box
        bg={isSelected ? "$primary500" : "$backgroundLight0"}
        borderWidth="$2"
        borderColor={isSelected ? "$primary500" : "$primary200"}
        borderRadius="$xl"
        p="$4"
        shadowColor="$primary200"
        shadowOffset={{ width: 0, height: 2 }}
        shadowOpacity={0.1}
        shadowRadius={4}
        elevation={2}
      >
        <HStack alignItems="center" space="md">
          <Box
            w="$12"
            h="$12"
            bg={isSelected ? "$backgroundLight0" : "$primary100"}
            borderRadius="$full"
            justifyContent="center"
            alignItems="center"
          >
            <Ionicons
              name={option.icon as any}
              size={24}
              color={isSelected ? "#8F3BBF" : "#5B1994"}
            />
          </Box>
          <VStack flex={1} space="xs">
            <Text
              fontSize="$md"
              fontWeight="$bold"
              color={isSelected ? "$backgroundLight0" : "$primary700"}
            >
              {option.label}
            </Text>
            <Text
              fontSize="$sm"
              color={isSelected ? "$backgroundLight50" : "$textLight600"}
            >
              {option.description}
            </Text>
          </VStack>
          {isSelected && (
            <Ionicons
              name="checkmark-circle"
              size={24}
              color="white"
            />
          )}
        </HStack>
      </Box>
    </Pressable>
  );

  return (
    <RegistrationLayout
      title="Your Preferences"
      currentStep={4}
      totalSteps={7}
    >
      <SafeAreaView flex={1} bg="$primaryLight50">
        <KeyboardAvoidingView
          flex={1}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
        >
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
                      color="$primary700"
                      textAlign="center"
                      fontWeight="$bold"
                      mb="$2"
                    >
                      What Are You Looking For?
                    </Heading>
                    <Text
                      size="md"
                      color="$textLight600"
                      textAlign="center"
                      maxWidth="$80"
                    >
                      Tell us about your dating preferences and a bit about yourself
                    </Text>
                  </Center>

                  {/* Looking For Section */}
                  <VStack space="md">
                    <Text
                      size="lg"
                      fontWeight="$semibold"
                      color="$primary700"
                    >
                      Relationship Type
                    </Text>
                    <Text
                      size="sm"
                      color="$textLight600"
                      mb="$2"
                    >
                      What kind of connection are you seeking?
                    </Text>
                    <VStack space="sm">
                      {lookingForOptions.map((option) => (
                        <LookingForCard
                          key={option.id}
                          option={option}
                          isSelected={selectedLookingFor === option.id}
                          onPress={() => {
                            setSelectedLookingFor(option.id);
                            clearError();
                          }}
                        />
                      ))}
                    </VStack>
                  </VStack>

                  <Divider bg="$borderLight200" />

                  {/* Bio Section */}
                  <VStack space="md">
                    <Text
                      size="lg"
                      fontWeight="$semibold"
                      color="$primary700"
                    >
                      About You
                    </Text>
                    <Text
                      size="sm"
                      color="$textLight600"
                      mb="$2"
                    >
                      Share something interesting about yourself, your hobbies, or what makes you unique (optional)
                    </Text>
                    <Textarea
                      size="lg"
                      borderColor="$primary300"
                      borderRadius="$lg"
                      backgroundColor="$backgroundLight0"
                      borderWidth="$2"
                      minHeight={120}
                      maxHeight={200}
                      $focus={{
                        borderColor: "$primary500",
                      }}
                    >
                      <TextareaInput
                        placeholder="Tell us about yourself... What do you enjoy doing? What are you passionate about? What makes you laugh?"
                        value={bio}
                        onChangeText={(text) => {
                          setBio(text);
                          clearError();
                        }}
                        color="$primary700"
                        fontSize="$md"
                        textAlignVertical="top"
                        multiline
                        numberOfLines={6}
                      />
                    </Textarea>
                    
                    {/* Character count */}
                    <HStack justifyContent="space-between" alignItems="center">
                      <Text size="xs" color="$textLight500">
                        {bio.trim() ? `${bio.trim().length} characters` : 'Optional but recommended'}
                      </Text>
                      {bio.trim().length > 0 && bio.trim().length < 20 && (
                        <Text size="xs" color="$amber600">
                          Add a few more characters for a better bio
                        </Text>
                      )}
                    </HStack>
                  </VStack>

                  {/* Error Message */}
                  {error && (
                    <Box
                      bg="$error50"
                      borderColor="$error200"
                      borderWidth="$1"
                      borderRadius="$md"
                      px="$4"
                      py="$3"
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

                  {/* Info Box */}
                  <Box mt="$4" p="$4" bg="$primary50" borderRadius="$lg" borderWidth="$1" borderColor="$primary200">
                    <HStack space="sm" alignItems="flex-start">
                      <Ionicons name="bulb" size={16} color="#8F3BBF" />
                      <Text size="xs" color="$primary700" flex={1} lineHeight="$xs">
                        A good bio helps you connect with people who share your interests and values. You can always update it later!
                      </Text>
                    </HStack>
                  </Box>

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
                isDisabled={!selectedLookingFor}
                size="lg"
                variant="solid"
              />
            </Box>
          </Box>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </RegistrationLayout>
  );
} 