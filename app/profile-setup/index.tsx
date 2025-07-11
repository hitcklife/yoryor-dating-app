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

export default function ProfileSetupEntryScreen() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the first step of profile setup
    const timer = setTimeout(() => {
      router.replace('/profile-setup/step-1-basic-info');
    }, 100);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <SafeAreaView flex={1} bg="$backgroundLight0">
      <Center flex={1}>
        <VStack space="md" alignItems="center">
          <Spinner size="large" color="$primary600" />
          <Text
            size="lg"
            color="$primary700"
            fontWeight="$medium"
            textAlign="center"
          >
            Setting up your profile...
          </Text>
          <Text
            size="sm"
            color="$textLight600"
            textAlign="center"
            maxWidth="$64"
          >
            Let's add some extra details to make your profile stand out
          </Text>
        </VStack>
      </Center>
    </SafeAreaView>
  );
} 