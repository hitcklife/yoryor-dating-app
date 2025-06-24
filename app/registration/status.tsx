import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  ScrollView,
  KeyboardAvoidingView,
  SafeAreaView,
  Pressable
} from '@gluestack-ui/themed';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Platform } from 'react-native';
import { Button } from '@/components/ui/button';
import { Ionicons } from '@expo/vector-icons';
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

export default function StatusOccupationScreen() {
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
  const [error, setError] = useState('');

  const handleContinue = () => {
    if (!selectedStatus) {
      setError('Please select your status');
      return;
    }

    if (!selectedOccupation) {
      setError('Please select your occupation');
      return;
    }

    // Navigate to the next screen with the collected data
    router.push({
      pathname: '/registration/looking-for',
      params: {
        ...params,
        status: selectedStatus,
        occupation: selectedOccupation
      }
    });
  };

  const OptionCard = ({
    option,
    isSelected,
    onPress
  }: {
    option: typeof statusOptions[0],
    isSelected: boolean,
    onPress: () => void
  }) => (
    <Pressable
      onPress={onPress}
      minWidth="47%"
      maxWidth="47%"
      mb="$3"
    >
      <Box
        bg={isSelected ? "$primary500" : "$backgroundLight0"}
        borderWidth="$2"
        borderColor={isSelected ? "$primary500" : "$primary200"}
        borderRadius="$2xl"
        px="$4"
        py="$3"
        shadowColor="$primary200"
        shadowOffset={{ width: 0, height: 2 }}
        shadowOpacity={0.1}
        shadowRadius={4}
        elevation={2}
      >
        <HStack alignItems="center" space="sm">
          <Box
            w="$8"
            h="$8"
            bg="$primary700"
            borderRadius="$full"
            justifyContent="center"
            alignItems="center"
          >
            <Ionicons
              name={option.icon as any}
              size={16}
              color="white"
            />
          </Box>
          <Text
            flex={1}
            textAlign="center"
            fontSize="$sm"
            fontWeight={isSelected ? "$bold" : "$medium"}
            color={isSelected ? "$backgroundLight0" : "$primary700"}
          >
            {option.label}
          </Text>
        </HStack>
      </Box>
    </Pressable>
  );

  return (
    <SafeAreaView flex={1} bg="$primaryLight50">
      <StatusBar style="dark" />
      <RegistrationLayout
        title="Status & Occupation"
        currentStep={5}
        totalSteps={10}
      >
        <KeyboardAvoidingView
          flex={1}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            flex={1}
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Box flex={1} px="$6" py="$8">
              {/* Header */}
              <VStack space="lg" alignItems="center" mb="$8">
                <Heading
                  size="3xl"
                  color="$primary700"
                  textAlign="center"
                  fontWeight="$bold"
                >
                  Your Status & Occupation
                </Heading>
              </VStack>

              <VStack space="xl" flex={1}>
                {/* Relationship Status Section */}
                <VStack space="lg">
                  <Heading
                    size="xl"
                    color="$primary700"
                    fontWeight="$semibold"
                  >
                    Relationship Status
                  </Heading>

                  <HStack flexWrap="wrap" justifyContent="space-between">
                    {statusOptions.map((option) => (
                      <OptionCard
                        key={option.id}
                        option={option}
                        isSelected={selectedStatus === option.id}
                        onPress={() => {
                          setSelectedStatus(option.id);
                          if (error) setError('');
                        }}
                      />
                    ))}
                  </HStack>
                </VStack>

                {/* Occupation Section */}
                <VStack space="lg">
                  <Heading
                    size="xl"
                    color="$primary700"
                    fontWeight="$semibold"
                  >
                    Occupation
                  </Heading>

                  <HStack flexWrap="wrap" justifyContent="space-between">
                    {occupationOptions.map((option) => (
                      <OptionCard
                        key={option.id}
                        option={option}
                        isSelected={selectedOccupation === option.id}
                        onPress={() => {
                          setSelectedOccupation(option.id);
                          if (error) setError('');
                        }}
                      />
                    ))}
                  </HStack>
                </VStack>

                {/* Error Message */}
                {error && (
                  <Box
                    bg="$error50"
                    borderWidth="$1"
                    borderColor="$error200"
                    borderRadius="$md"
                    px="$4"
                    py="$3"
                    alignSelf="center"
                  >
                    <Text
                      size="md"
                      color="$error700"
                      textAlign="center"
                      fontWeight="$medium"
                    >
                      {error}
                    </Text>
                  </Box>
                )}

                {/* Continue Button */}
                <Box mt="auto" pt="$6">
                  <Button
                    title="Continue"
                    onPress={handleContinue}
                    isDisabled={!selectedStatus || !selectedOccupation}
                    size="lg"
                    variant="solid"
                  />
                </Box>
              </VStack>
            </Box>
          </ScrollView>
        </KeyboardAvoidingView>
      </RegistrationLayout>
    </SafeAreaView>
  );
}
