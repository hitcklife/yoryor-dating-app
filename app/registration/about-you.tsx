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
  Input,
  InputField,
  Divider,
  AlertCircleIcon
} from '@gluestack-ui/themed';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/button';
import { RegistrationLayout } from '@/components/ui/registration-layout';

// Status options with icons
const statusOptions = [
  { id: 'single', label: 'Single', icon: 'person' },
  { id: 'married', label: 'Married', icon: 'people' },
  { id: 'divorced', label: 'Divorced', icon: 'person-remove' },
  { id: 'widowed', label: 'Widowed', icon: 'heart-dislike' },
  { id: 'separated', label: 'Separated', icon: 'git-branch' },
];

// Occupation options with icons
const occupationOptions = [
  { id: 'employee', label: 'Employee', icon: 'briefcase' },
  { id: 'student', label: 'Student', icon: 'school' },
  { id: 'business', label: 'Business', icon: 'business' },
  { id: 'unemployed', label: 'Unemployed', icon: 'home' },
];

export default function AboutYouScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    gender: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    age: string;
    email: string;
  }>();

  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedOccupation, setSelectedOccupation] = useState<string | null>(null);
  const [profession, setProfession] = useState('');
  const [error, setError] = useState('');

  const handleContinue = () => {
    if (!selectedStatus) {
      setError('Please select your relationship status');
      return;
    }

    if (!selectedOccupation) {
      setError('Please select your occupation type');
      return;
    }

    if (!profession.trim()) {
      setError('Please tell us what you do specifically');
      return;
    }

    router.push({
      pathname: '/registration/preferences',
      params: {
        ...params,
        status: selectedStatus,
        occupation: selectedOccupation,
        profession: profession.trim()
      }
    });
  };

  const clearError = () => {
    if (error) setError('');
  };

  const OptionCard = ({
    option,
    isSelected,
    onPress
  }: {
    option: typeof statusOptions[0];
    isSelected: boolean;
    onPress: () => void;
  }) => (
    <Pressable
      onPress={onPress}
      flex={1}
      mx="$1"
      mb="$3"
    >
      <Box
        bg={isSelected ? "$primary500" : "$backgroundLight0"}
        borderWidth="$2"
        borderColor={isSelected ? "$primary500" : "$primary200"}
        borderRadius="$xl"
        px="$4"
        py="$4"
        shadowColor="$primary200"
        shadowOffset={{ width: 0, height: 2 }}
        shadowOpacity={0.1}
        shadowRadius={4}
        elevation={2}
        minHeight="$20"
      >
        <VStack alignItems="center" space="sm" flex={1} justifyContent="center">
          <Box
            w="$10"
            h="$10"
            bg={isSelected ? "$backgroundLight0" : "$primary100"}
            borderRadius="$full"
            justifyContent="center"
            alignItems="center"
          >
            <Ionicons
              name={option.icon as any}
              size={22}
              color={isSelected ? "#8F3BBF" : "#5B1994"}
            />
          </Box>
          <Text
            textAlign="center"
            fontSize="$md"
            fontWeight={isSelected ? "$bold" : "$semibold"}
            color={isSelected ? "$backgroundLight0" : "$primary700"}
            numberOfLines={2}
            lineHeight="$sm"
          >
            {option.label}
          </Text>
        </VStack>
      </Box>
    </Pressable>
  );

  return (
    <RegistrationLayout
      title="About You"
      currentStep={3}
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
                  <Center mb="$4">
                    <Heading
                      size="3xl"
                      color="$primary700"
                      textAlign="center"
                      fontWeight="$bold"
                      mb="$2"
                    >
                      About You
                    </Heading>
                    <Text
                      size="md"
                      color="$textLight600"
                      textAlign="center"
                      maxWidth="$80"
                    >
                      Tell us about your current situation and what you do
                    </Text>
                  </Center>

                  {/* Relationship Status Section */}
                  <VStack space="md">
                    <Text
                      size="lg"
                      fontWeight="$semibold"
                      color="$primary700"
                    >
                      Relationship Status
                    </Text>
                    <VStack space="sm">
                      {/* First row - 3 items */}
                      <HStack space="sm" justifyContent="space-between">
                        {statusOptions.slice(0, 3).map((option) => (
                          <OptionCard
                            key={option.id}
                            option={option}
                            isSelected={selectedStatus === option.id}
                            onPress={() => {
                              setSelectedStatus(option.id);
                              clearError();
                            }}
                          />
                        ))}
                      </HStack>
                      {/* Second row - 2 items centered */}
                      <HStack space="sm" justifyContent="center">
                        {statusOptions.slice(3, 5).map((option) => (
                          <Box key={option.id} width="32%">
                            <OptionCard
                              option={option}
                              isSelected={selectedStatus === option.id}
                              onPress={() => {
                                setSelectedStatus(option.id);
                                clearError();
                              }}
                            />
                          </Box>
                        ))}
                      </HStack>
                    </VStack>
                  </VStack>

                  <Divider bg="$borderLight200" />

                  {/* Occupation Type Section */}
                  <VStack space="md">
                    <Text
                      size="lg"
                      fontWeight="$semibold"
                      color="$primary700"
                    >
                      Occupation Type
                    </Text>
                    <HStack flexWrap="wrap" justifyContent="space-between" space="sm">
                      {occupationOptions.map((option) => (
                        <Box key={option.id} width="48%" mb="$2">
                          <OptionCard
                            option={option}
                            isSelected={selectedOccupation === option.id}
                            onPress={() => {
                              setSelectedOccupation(option.id);
                              clearError();
                            }}
                          />
                        </Box>
                      ))}
                    </HStack>
                  </VStack>

                  <Divider bg="$borderLight200" />

                  {/* Profession Input */}
                  <VStack space="md">
                    <Text
                      size="lg"
                      fontWeight="$semibold"
                      color="$primary700"
                    >
                      Your Profession
                    </Text>
                    <Text
                      size="sm"
                      color="$textLight600"
                      mb="$2"
                    >
                      What do you do specifically? (e.g., Software Engineer, Teacher, Marketing Manager)
                    </Text>
                    <Input
                      size="lg"
                      borderColor="$primary300"
                      borderRadius="$lg"
                      backgroundColor="$backgroundLight0"
                      borderWidth="$2"
                      $focus={{
                        borderColor: "$primary500",
                      }}
                    >
                      <InputField
                        placeholder="Enter your profession or job title"
                        value={profession}
                        onChangeText={(text) => {
                          setProfession(text);
                          clearError();
                        }}
                        color="$primary700"
                        fontSize="$md"
                        autoCapitalize="words"
                      />
                    </Input>
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
                isDisabled={!selectedStatus || !selectedOccupation || !profession.trim()}
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