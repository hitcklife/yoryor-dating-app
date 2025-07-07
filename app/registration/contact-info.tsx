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
  Pressable,
  Center,
  HStack,
  AlertCircleIcon
} from '@gluestack-ui/themed';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/button';
import { RegistrationLayout } from '@/components/ui/registration-layout';
import { apiClient } from '@/services/api-client';

export default function ContactInfoScreen() {
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

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const checkEmailAvailability = async (emailToCheck: string) => {
    try {
      const response = await apiClient.auth.checkEmailAvailability(emailToCheck);
      
      if (response.status === 'success') {
        return response.data?.is_taken || false;
      } else {
        console.error('Email check failed:', response.message);
        return false;
      }
    } catch (error) {
      console.error('Error checking email availability:', error);
      return false;
    }
  };

  const handleContinue = async () => {
    setError('');
    setIsLoading(true);

    try {
      if (email.trim()) {
        if (!validateEmail(email.trim())) {
          setError('Please enter a valid email address');
          setIsLoading(false);
          return;
        }

        const isEmailTaken = await checkEmailAvailability(email.trim());
        if (isEmailTaken) {
          setError('Email is already taken, please use another email');
          setIsLoading(false);
          return;
        }
      }

      router.push({
        pathname: '/registration/about-you',
        params: {
          ...params,
          email: email.trim() || ''
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
    router.push({
      pathname: '/registration/about-you',
      params: {
        ...params,
        email: ''
      }
    });
  };

  return (
    <RegistrationLayout
      title="Contact Information"
      currentStep={2}
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
              <Box flex={1} px="$6" py="$8">
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
                      Contact Information
                    </Heading>
                    <Text
                      size="md"
                      color="$textLight600"
                      textAlign="center"
                      maxWidth="$80"
                    >
                      Add your email to receive important updates and recover your account
                    </Text>
                  </Center>

                  {/* Email Input Section */}
                  <VStack space="md">
                    <Text
                      size="lg"
                      fontWeight="$semibold"
                      color="$primary700"
                    >
                      Email Address
                    </Text>

                    <Input
                      size="lg"
                      borderColor={error ? "$error600" : "$primary300"}
                      borderWidth="$2"
                      backgroundColor="$backgroundLight0"
                      borderRadius="$lg"
                      $focus={{
                        borderColor: error ? "$error600" : "$primary500",
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
                        fontSize="$md"
                        color="$primary700"
                        placeholderTextColor="$textLight500"
                        editable={!isLoading}
                      />
                    </Input>

                    {/* Optional badge */}
                    <HStack alignItems="center" space="sm" mt="$2">
                      <Ionicons name="information-circle" size={16} color="#8F3BBF" />
                      <Text size="sm" color="$primary600" fontStyle="italic">
                        Email is optional but recommended for account recovery
                      </Text>
                    </HStack>

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
                  </VStack>

                  {/* Footer Info */}
                  <Box mt="$4" p="$4" bg="$primary50" borderRadius="$lg" borderWidth="$1" borderColor="$primary200">
                    <HStack space="sm" alignItems="flex-start">
                      <Ionicons name="shield-checkmark" size={16} color="#10B981" />
                      <Text size="xs" color="$primary700" flex={1} lineHeight="$xs">
                        Your email will never be shared with other users and is used only for account security and important notifications.
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
              <VStack space="md">
                <Button
                  title={isLoading ? "Checking..." : "Continue"}
                  onPress={handleContinue}
                  size="lg"
                  variant="solid"
                  isLoading={isLoading}
                  isDisabled={isLoading}
                />

                <Pressable
                  onPress={handleSkip}
                  alignSelf="center"
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
              </VStack>
            </Box>
          </Box>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </RegistrationLayout>
  );
} 