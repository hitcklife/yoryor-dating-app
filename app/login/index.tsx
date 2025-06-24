import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Center,
  ScrollView,
  KeyboardAvoidingView,
  SafeAreaView,
  Pressable
} from '@gluestack-ui/themed';
import { Stack, useRouter } from 'expo-router';
import { Platform } from 'react-native';
import { CustomPhoneInput } from '@/components/ui/custom-phone-input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';

export default function PhoneLoginScreen() {
  const router = useRouter();
  const { sendOTP } = useAuth();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [formattedPhoneNumber, setFormattedPhoneNumber] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const validatePhoneNumber = (number: string) => {
    return number.length >= 6;
  };

  const handleSendOTP = async () => {
    setError('');

    if (!validatePhoneNumber(phoneNumber)) {
      setError('Please enter a valid phone number');
      return;
    }

    setIsLoading(true);

    try {
      const phoneToUse = formattedPhoneNumber || phoneNumber;
      const success = await sendOTP(phoneToUse);

      if (success) {
        router.push({
          pathname: '/login/verify',
          params: { phoneNumber: phoneToUse }
        });
      } else {
        setError('Failed to send OTP. Please try again.');
      }
    } catch (error) {
      setError('Failed to send OTP. Please try again.');
      console.error('Error sending OTP:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView flex={1} bg="$backgroundLight0">
      <StatusBar style="dark" />
      <Stack.Screen options={{
        title: 'Login',
        headerShown: false
      }} />

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
          <Box flex={1} px="$6" py="$4">
            {/* Header Section */}
            <Center flex={0.4} justifyContent="center">
              <VStack space="lg" alignItems="center">
                {/* Logo/Icon Placeholder */}
                <Box
                  w="$20"
                  h="$20"
                  bg="$primary100"
                  rounded="$full"
                  justifyContent="center"
                  alignItems="center"
                  mb="$4"
                >
                  <Text fontSize="$2xl" color="$primary600">📱</Text>
                </Box>

                <Heading
                  size="2xl"
                  color="$primary700"
                  textAlign="center"
                  fontWeight="$bold"
                >
                  Welcome Back
                </Heading>

                <Text
                  size="md"
                  color="$textLight600"
                  textAlign="center"
                  maxWidth="$80"
                >
                  Enter your phone number to continue
                </Text>
              </VStack>
            </Center>

            {/* Form Section */}
            <Box flex={0.6} justifyContent="flex-start" pt="$6">
              <VStack space="xl">
                <CustomPhoneInput
                  label="Phone Number"
                  value={phoneNumber}
                  onChangeText={(text) => {
                    setPhoneNumber(text);
                    if (error) setError('');
                  }}
                  onChangeFormattedText={setFormattedPhoneNumber}
                  onChangeCountry={setSelectedCountry}
                  placeholder="Enter your phone number"
                  error={error}
                  autoDetectCountry={true}
                />

                <Button
                  title="Send OTP"
                  onPress={handleSendOTP}
                  isLoading={isLoading}
                  isDisabled={!phoneNumber}
                  size="lg"
                  variant="solid"
                />
              </VStack>

              {/* Footer Section */}
              <VStack space="md" mt="$8" alignItems="center">
                <Text
                  size="sm"
                  color="$textLight500"
                  textAlign="center"
                  maxWidth="$80"
                >
                  By continuing, you agree to our Terms of Service and Privacy Policy
                </Text>

                <HStack space="xs" alignItems="center" mt="$4">
                  <Text size="sm" color="$textLight600">
                    Need help?
                  </Text>
                  <Pressable>
                    <Text size="sm" color="$primary600" fontWeight="$medium">
                      Contact Support
                    </Text>
                  </Pressable>
                </HStack>
              </VStack>
            </Box>
          </Box>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
