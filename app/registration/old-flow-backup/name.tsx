import React, { useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  Box,
  VStack,
  Text,
  Heading,
  ScrollView,
  KeyboardAvoidingView,
  Input,
  InputField,
  FormControl,
  FormControlError,
  FormControlErrorText,
  FormControlLabel,
  FormControlLabelText
} from '@gluestack-ui/themed';
import { Platform } from 'react-native';
import { Button } from '@/components/ui/button';
import { RegistrationLayout } from '@/components/ui/registration-layout';

export default function NameInputScreen() {
  const router = useRouter();
  const { gender } = useLocalSearchParams<{ gender: string }>();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');

  const handleContinue = () => {
    if (!firstName.trim()) {
      setError('Please enter your first name');
      return;
    }

    if (!lastName.trim()) {
      setError('Please enter your last name');
      return;
    }

    // Navigate to the next screen with the collected data
    router.push({
      pathname: '/registration/dob',
      params: {
        gender,
        firstName: firstName.trim(),
        lastName: lastName.trim()
      }
    });
  };

  return (
    <RegistrationLayout
      title="Your Name"
      currentStep={2}
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
                size="2xl"
                color="$primary700"
                textAlign="center"
                fontWeight="$bold"
              >
                What's Your Name?
              </Heading>

              <Text
                size="md"
                color="$textLight600"
                textAlign="center"
                maxWidth="$80"
              >
                Please enter your full name as you'd like it to appear on your profile
              </Text>
            </VStack>

            {/* Form */}
            <VStack space="xl" flex={1}>
              {/* First Name Input */}
              <FormControl isInvalid={!!(error && !firstName.trim())}>
                <FormControlLabel>
                  <FormControlLabelText
                    size="sm"
                    color="$primary700"
                    fontWeight="$medium"
                  >
                    First Name
                  </FormControlLabelText>
                </FormControlLabel>

                <Input
                  size="lg"
                  borderColor="$primary300"
                  borderWidth="$2"
                  borderRadius="$lg"
                  bg="$backgroundLight0"
                  focusable={true}
                  sx={{
                    ":focus": {
                      borderColor: "$primary600",
                    },
                  }}
                >
                  <InputField
                    value={firstName}
                    onChangeText={(text) => {
                      setFirstName(text);
                      if (error) setError('');
                    }}
                    placeholder="Enter your first name"
                    fontSize="$md"
                    color="$primary700"
                    placeholderTextColor="$textLight500"
                    autoCapitalize="words"
                    autoCorrect={false}
                  />
                </Input>
              </FormControl>

              {/* Last Name Input */}
              <FormControl isInvalid={!!(error && !lastName.trim())}>
                <FormControlLabel>
                  <FormControlLabelText
                    size="sm"
                    color="$primary700"
                    fontWeight="$medium"
                  >
                    Last Name
                  </FormControlLabelText>
                </FormControlLabel>

                <Input
                  size="lg"
                  borderColor="$primary300"
                  borderWidth="$2"
                  borderRadius="$lg"
                  bg="$backgroundLight0"
                  focusable={true}
                  sx={{
                    ":focus": {
                      borderColor: "$primary600",
                    },
                  }}
                >
                  <InputField
                    value={lastName}
                    onChangeText={(text) => {
                      setLastName(text);
                      if (error) setError('');
                    }}
                    placeholder="Enter your last name"
                    fontSize="$md"
                    color="$primary700"
                    placeholderTextColor="$textLight500"
                    autoCapitalize="words"
                    autoCorrect={false}
                  />
                </Input>
              </FormControl>

              {/* Error Message */}
              {error && (
                <Box
                  bg="$error50"
                  px="$4"
                  py="$3"
                  borderRadius="$lg"
                  borderWidth="$1"
                  borderColor="$error200"
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

              {/* Spacer */}
              <Box flex={1} />

              {/* Continue Button */}
              <Button
                title="Continue"
                onPress={handleContinue}
                isDisabled={!firstName.trim() || !lastName.trim()}
                size="lg"
                variant="solid"
              />
            </VStack>
          </Box>
        </ScrollView>
      </KeyboardAvoidingView>
    </RegistrationLayout>
  );
}
