import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import {
  Box,
  Text,
  Spinner,
  VStack,
  SafeAreaView,
  Center
} from '@gluestack-ui/themed';
import { RegistrationLayout } from '@/components/ui/registration-layout';

export default function RegistrationEntryScreen() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the new optimized registration flow
    const timer = setTimeout(() => {
      router.replace('/registration/basic-info');
    }, 100);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <SafeAreaView flex={1} bg="$primaryLight50">
      <Center flex={1}>
        <VStack space="md" alignItems="center">
          <Spinner size="large" color="$primary600" />
          <Text
            size="lg"
            color="$primary700"
            fontWeight="$medium"
            textAlign="center"
          >
            Starting Registration...
          </Text>
          <Text
            size="sm"
            color="$textLight600"
            textAlign="center"
            maxWidth="$64"
          >
            We'll guide you through a quick 7-step process to set up your profile
          </Text>
        </VStack>
      </Center>
    </SafeAreaView>
  );
}
