import React, { useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  Box,
  VStack,
  Text,
  Input,
  InputField,
  ScrollView,
  KeyboardAvoidingView,
  SafeAreaView,
  Textarea,
  TextareaInput,
  AlertCircleIcon,
  HStack
} from '@gluestack-ui/themed';
import { Platform } from 'react-native';
import { Button } from '@/components/ui/button';
import { RegistrationLayout } from '@/components/ui/registration-layout';

export default function BioScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    gender: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    age: string;
    email: string;
    status: string;
    occupation: string;
    lookingFor: string;
  }>();

  const [profession, setProfession] = useState('');
  const [bio, setBio] = useState('');
  const [error, setError] = useState('');

  const handleContinue = () => {
    if (!profession.trim()) {
      setError('Please tell us what you do');
      return;
    }

    // Bio is optional, but if provided, should be at least 10 characters
    if (bio.trim() && bio.trim().length < 10) {
      setError('Your bio should be at least 10 characters long');
      return;
    }

    // Navigate to the next screen with the collected data
    router.push({
      pathname: '/registration/interests',
      params: {
        ...params,
        profession: profession.trim(),
        bio: bio.trim()
      }
    });
  };

  return (
    <RegistrationLayout
      title="About You"
      currentStep={7}
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
                <Text
                  size="3xl"
                  fontWeight="$bold"
                  textAlign="center"
                  color="$primary700"
                  mb="$6"
                >
                  Tell Us About Yourself
                </Text>

                {/* Profession Input */}
                <VStack space="sm">
                  <Text
                    size="sm"
                    fontWeight="$medium"
                    color="$primary700"
                  >
                    What do you do? *
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
                      placeholder="Your profession or what you do"
                      value={profession}
                      onChangeText={(text) => {
                        setProfession(text);
                        if (error) setError('');
                      }}
                      color="$primary700"
                      fontSize="$md"
                    />
                  </Input>
                </VStack>

                {/* Bio Input */}
                <VStack space="sm">
                  <Text
                    size="sm"
                    fontWeight="$medium"
                    color="$primary700"
                  >
                    Tell us about yourself
                  </Text>
                  <Textarea
                    size="lg"
                    borderColor="$primary300"
                    borderRadius="$lg"
                    backgroundColor="$backgroundLight0"
                    borderWidth="$2"
                    minHeight={96}
                    $focus={{
                      borderColor: "$primary500",
                    }}
                  >
                    <TextareaInput
                      placeholder="Share a bit about yourself, your interests, and what you're looking for"
                      value={bio}
                      onChangeText={(text) => {
                        setBio(text);
                        if (error) setError('');
                      }}
                      color="$primary700"
                      fontSize="$md"
                      textAlignVertical="top"
                    />
                  </Textarea>
                </VStack>

                {/* Error Message */}
                {error ? (
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
                ) : null}

                {/* Spacer */}
                <Box flex={1} />

                {/* Continue Button */}
                <Button
                  title="Continue"
                  onPress={handleContinue}
                  isDisabled={!profession.trim()}
                  size="lg"
                  variant="solid"
                />
              </VStack>
            </Box>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </RegistrationLayout>
  );
}
