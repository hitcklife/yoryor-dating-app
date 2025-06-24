import React, { useState, useEffect } from 'react';
import { TouchableOpacity, Alert } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
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
  Pressable,
  Spinner
} from '@gluestack-ui/themed';
import { Platform } from 'react-native';
import { OTPInput } from '@/components/ui/otp-input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';

export default function OTPVerificationScreen() {
  const router = useRouter();
  const { verifyOTP, sendOTP, isRegistrationCompleted, user } = useAuth();
  const { phoneNumber } = useLocalSearchParams<{ phoneNumber: string }>();

  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (timeLeft > 0) {
      const timerId = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timerId);
    } else {
      setCanResend(true);
    }
  }, [timeLeft]);

  const handleVerifyOTP = async () => {
    setError('');

    if (otp.length !== 4) {
      setError('Please enter a valid 4-digit OTP');
      return;
    }

    if (!phoneNumber) {
      setError('Phone number is missing. Please go back and try again.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await verifyOTP(phoneNumber, otp);

      if (result.success) {
        const userData = result.userData;

        if (userData && userData.registration_completed) {
          router.replace('/(tabs)');
        } else {
          router.replace('/registration');
        }
      } else {
        setError('Invalid OTP. Please try again.');
      }
    } catch (error) {
      setError('Failed to verify OTP. Please try again.');
      console.error('Error verifying OTP:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!phoneNumber) {
      setError('Phone number is missing. Please go back and try again.');
      return;
    }

    setCanResend(false);
    setTimeLeft(60);

    try {
      const success = await sendOTP(phoneNumber);

      if (success) {
        Alert.alert('Success', 'OTP has been resent to your phone number');
      } else {
        Alert.alert('Error', 'Failed to resend OTP. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to resend OTP. Please try again.');
      console.error('Error resending OTP:', error);
    }
  };

  return (
    <SafeAreaView flex={1} bg="$backgroundLight0">
      <StatusBar style="dark" />
      <Stack.Screen options={{
        title: 'Verify OTP',
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
                  w="$24"
                  h="$24"
                  bg="$primary100"
                  rounded="$full"
                  justifyContent="center"
                  alignItems="center"
                  mb="$4"
                >
                  <Text fontSize="$3xl" color="$primary600">🔐</Text>
                </Box>

                <Heading
                  size="2xl"
                  color="$primary700"
                  textAlign="center"
                  fontWeight="$bold"
                  mb="$2"
                >
                  Verification
                </Heading>

                <Text
                  size="lg"
                  color="$textLight600"
                  textAlign="center"
                  mb="$1"
                >
                  Enter the OTP sent to
                </Text>

                <Text
                  size="lg"
                  color="$primary700"
                  textAlign="center"
                  fontWeight="$semibold"
                  maxWidth="$80"
                >
                  {phoneNumber || 'your phone'}
                </Text>
              </VStack>
            </Center>

            {/* Form Section */}
            <Box flex={0.6} justifyContent="flex-start" pt="$4">
              <VStack space="xl" alignItems="center">
                {/* OTP Input */}
                <Box alignItems="center" w="$full">
                  <OTPInput
                    length={4}
                    value={otp}
                    onChange={(value) => {
                      setOtp(value);
                      if (error) setError('');
                    }}
                  />

                  {error && (
                    <Box
                      mt="$3"
                      px="$4"
                      py="$2"
                      bg="$error50"
                      rounded="$md"
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
                </Box>

                {/* Verify Button */}
                <Button
                  title="Verify OTP"
                  onPress={handleVerifyOTP}
                  isLoading={isLoading}
                  isDisabled={otp.length !== 4}
                  size="lg"
                  variant="solid"
                  w="$full"
                />

                {/* Resend Section */}
                <VStack space="md" alignItems="center" mt="$6">
                  <HStack alignItems="center" space="xs">
                    <Text size="md" color="$textLight600">
                      Didn't receive the OTP?
                    </Text>
                    {canResend ? (
                      <Pressable onPress={handleResendOTP}>
                        <Text
                          size="md"
                          color="$primary600"
                          fontWeight="$semibold"
                          textDecorationLine="underline"
                        >
                          Resend OTP
                        </Text>
                      </Pressable>
                    ) : (
                      <Box
                        px="$3"
                        py="$1"
                        bg="$coolGray100"
                        rounded="$full"
                      >
                        <Text
                          size="sm"
                          color="$textLight500"
                          fontWeight="$medium"
                        >
                          Resend in {timeLeft}s
                        </Text>
                      </Box>
                    )}
                  </HStack>

                  {/* Change Phone Number */}
                  <Pressable
                    onPress={() => router.back()}
                    mt="$4"
                    px="$4"
                    py="$2"
                  >
                    <Text
                      size="md"
                      color="$primary600"
                      textAlign="center"
                      fontWeight="$medium"
                      textDecorationLine="underline"
                    >
                      Change phone number
                    </Text>
                  </Pressable>
                </VStack>
              </VStack>

              {/* Footer Help Text */}
              <Box mt="$8">
                <Text
                  size="sm"
                  color="$textLight500"
                  textAlign="center"
                  maxWidth="$80"
                  alignSelf="center"
                  lineHeight="$sm"
                >
                  Make sure to check your messages for the verification code.
                  It may take a few moments to arrive.
                </Text>
              </Box>
            </Box>
          </Box>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
