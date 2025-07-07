import React, { useState } from 'react';
import { Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  Box,
  VStack,
  Text,
  Heading,
  Input,
  InputField,
  ScrollView,
  KeyboardAvoidingView,
  SafeAreaView,
  Pressable
} from '@gluestack-ui/themed';
import { Button } from '@/components/ui/button';
import { RegistrationLayout } from '@/components/ui/registration-layout';
import axios from 'axios';

export default function EmailInputScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    gender: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    age: string;
  }>();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Simple email validation
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Check if email is taken
  const checkEmailAvailability = async (emailToCheck: string) => {
    try {
      const response = await axios.post('/api/v1/auth/check-email', {
        email: emailToCheck
      });

      if (response.data.status === 'success') {
        return response.data.data.is_taken;
      }
      return false;
    } catch (error) {
      console.error('Error checking email availability:', error);
      // In case of API error, allow user to proceed
      return false;
    }
  };

  const handleContinue = async () => {
    setError('');
    setIsLoading(true);

    try {
      // Only validate and check email if it's provided
      if (email.trim()) {
        // Validate email format first
        if (!validateEmail(email.trim())) {
          setError('Please enter a valid email address');
          setIsLoading(false);
          return;
        }

        // Check if email is already taken
        const isEmailTaken = await checkEmailAvailability(email.trim());

        if (isEmailTaken) {
          setError('Email is already taken, please use another email');
          setIsLoading(false);
          return;
        }
      }

      // Navigate to the next screen with the collected data
      router.push({
        pathname: '/registration/status',
        params: {
          ...params,
          email: email.trim() || '' // Pass empty string if no email provided
        }
      });
    } catch (error) {
      console.error('Error in handleContinue:', error);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    // Navigate to the next screen without email
    router.push({
      pathname: '/registration/status',
      params: {
        ...params,
        email: ''
      }
    });
  };

  return (
    <RegistrationLayout
      title="Email Address"
      currentStep={4}
      totalSteps={10}
    >
      <SafeAreaView flex={1} bg="$primaryLight50">
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
              <VStack space="xl" flex={1}>
                {/* Header */}
                <Box alignItems="center" mb="$6">
                  <Heading
                    size="3xl"
                    color="$primary700"
                    textAlign="center"
                    fontWeight="$bold"
                    mb="$2"
                  >
                    What's Your Email?
                  </Heading>

                  <Text
                    size="md"
                    color="$textLight600"
                    textAlign="center"
                    maxWidth="$80"
                  >
                    We'll use this to send you important updates (optional)
                  </Text>
                </Box>

                {/* Email Input Section */}
                <VStack space="md">
                  <Text
                    size="sm"
                    fontWeight="$medium"
                    color="$primary700"
                  >
                    Email Address (Optional)
                  </Text>

                  <Input
                    variant="outline"
                    size="lg"
                    borderColor={error ? "$error600" : "$primary300"}
                    borderWidth="$2"
                    backgroundColor="$backgroundLight0"
                    borderRadius="$lg"
                    focusable={true}
                    $focus={{
                      borderColor: "$primary500",
                      backgroundColor: "$backgroundLight0"
                    }}
                  >
                    <InputField
                      value={email}
                      onChangeText={(text) => {
                        setEmail(text);
                        if (error) setError('');
                      }}
                      placeholder="Enter your email address"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      fontSize="$lg"
                      color="$primary700"
                      placeholderTextColor="$textLight500"
                      editable={!isLoading}
                    />
                  </Input>

                  {error && (
                    <Box
                      bg="$error50"
                      borderColor="$error200"
                      borderWidth="$1"
                      borderRadius="$md"
                      px="$4"
                      py="$3"
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
                </VStack>

                {/* Continue Button */}
                <Box mt="$8">
                  <Button
                    title={isLoading ? "Checking..." : "Continue"}
                    onPress={handleContinue}
                    size="lg"
                    variant="solid"
                    disabled={isLoading}
                  />
                </Box>

                {/* Skip Button */}
                <Box alignItems="center">
                  <Pressable
                    onPress={handleSkip}
                    py="$3"
                    px="$4"
                    disabled={isLoading}
                  >
                    <Text
                      size="md"
                      color={isLoading ? "$textLight400" : "$primary600"}
                      fontWeight="$medium"
                      textDecorationLine="underline"
                    >
                      Skip for now
                    </Text>
                  </Pressable>
                </Box>

                {/* Footer Info */}
                <Box mt="$6" alignItems="center">
                  <Text
                    size="sm"
                    color="$textLight500"
                    textAlign="center"
                    maxWidth="$80"
                    lineHeight="$sm"
                  >
                    You can add or update your email address later in your profile settings.
                  </Text>
                </Box>
              </VStack>
            </Box>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </RegistrationLayout>
  );
}
