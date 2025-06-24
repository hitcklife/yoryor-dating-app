import React, { useState } from 'react';
import { useRouter } from 'expo-router';
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
  Center
} from '@gluestack-ui/themed';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/button';
import { RegistrationLayout } from '@/components/ui/registration-layout';

export default function GenderSelectionScreen() {
  const router = useRouter();
  const [selectedGender, setSelectedGender] = useState<'male' | 'female' | null>(null);
  const [error, setError] = useState('');

  const handleContinue = () => {
    if (!selectedGender) {
      setError('Please select your gender');
      return;
    }

    // Navigate to the next screen with the selected gender
    router.push({
      pathname: '/registration/name',
      params: { gender: selectedGender }
    });
  };

  const GenderOption = ({
    gender,
    iconName,
    label,
    isSelected,
    onPress
  }: {
    gender: 'male' | 'female';
    iconName: keyof typeof Ionicons.glyphMap;
    label: string;
    isSelected: boolean;
    onPress: () => void;
  }) => (
    <Pressable onPress={onPress}>
      <VStack
        alignItems="center"
        p="$6"
        rounded="$2xl"
        bg={isSelected ? "$primary500" : "$backgroundLight0"}
        borderWidth="$2"
        borderColor={isSelected ? "$primary500" : "$primary200"}
        minWidth="$32"
        shadowColor="$shadowColor"
        shadowOffset={{ width: 0, height: 2 }}
        shadowOpacity={0.1}
        shadowRadius={4}
        elevation={3}
      >
        {/* Icon Container */}
        <Center
          w="$24"
          h="$24"
          bg={isSelected ? "$backgroundLight0" : "$primary50"}
          rounded="$full"
          mb="$4"
        >
          <Ionicons
            name={iconName}
            size={48}
            color={isSelected ? "#6366f1" : "#8b5cf6"}
          />
        </Center>

        {/* Label */}
        <Text
          fontSize="$lg"
          fontWeight="$semibold"
          color={isSelected ? "$white" : "$primary700"}
        >
          {label}
        </Text>
      </VStack>
    </Pressable>
  );

  return (
    <SafeAreaView flex={1} bg="$primaryLight50">
      <RegistrationLayout
        title="Registration"
        currentStep={1}
        totalSteps={10}
        showBackButton={false}
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
              {/* Header Section */}
              <Center mb="$12">
                <Heading
                  size="3xl"
                  color="$primary700"
                  textAlign="center"
                  fontWeight="$bold"
                  mb="$2"
                >
                  Choose Your Gender
                </Heading>

                <Text
                  size="md"
                  color="$textLight600"
                  textAlign="center"
                  maxWidth="$72"
                >
                  Select your gender to personalize your experience
                </Text>
              </Center>

              {/* Gender Options */}
              <Center flex={1} justifyContent="center">
                <HStack space="xl" justifyContent="center" mb="$8">
                  <GenderOption
                    gender="male"
                    iconName="man"
                    label="Male"
                    isSelected={selectedGender === 'male'}
                    onPress={() => {
                      setSelectedGender('male');
                      setError('');
                    }}
                  />

                  <GenderOption
                    gender="female"
                    iconName="woman"
                    label="Female"
                    isSelected={selectedGender === 'female'}
                    onPress={() => {
                      setSelectedGender('female');
                      setError('');
                    }}
                  />
                </HStack>

                {/* Error Message */}
                {error && (
                  <Box
                    mb="$6"
                    px="$4"
                    py="$3"
                    bg="$error50"
                    rounded="$lg"
                    borderWidth="$1"
                    borderColor="$error200"
                    maxWidth="$80"
                  >
                    <Text
                      size="sm"
                      color="$error700"
                      textAlign="center"
                      fontWeight="$medium"
                    >
                      {error}
                    </Text>
                  </Box>
                )}

                {/* Continue Button */}
                <Box w="$full" maxWidth="$80">
                  <Button
                    title="Continue"
                    onPress={handleContinue}
                    isDisabled={!selectedGender}
                    size="lg"
                    variant="solid"
                  />
                </Box>
              </Center>

              {/* Footer spacing */}
              <Box h="$4" />
            </Box>
          </ScrollView>
        </KeyboardAvoidingView>
      </RegistrationLayout>
    </SafeAreaView>
  );
}
