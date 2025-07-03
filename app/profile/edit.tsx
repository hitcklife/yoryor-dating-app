import React, { useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import {
  Box,
  VStack,
  Text,
  Input,
  InputField,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  HStack,
  Alert,
  AlertIcon,
  AlertText,
} from '@gluestack-ui/themed';
import { Platform } from 'react-native';
import { useAuth } from '@/context/auth-context';
import { apiClient } from '@/services/api-client';
import { Button } from '@/components/ui/button';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, updateUser } = useAuth();

  const [firstName, setFirstName] = useState(user?.profile?.first_name || '');
  const [lastName, setLastName] = useState(user?.profile?.last_name || '');
  const [bio, setBio] = useState(user?.profile?.bio || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSave = async () => {
    if (!user?.profile?.id) return;

    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      const response = await apiClient.profile.update(user.profile.id, {
        first_name: firstName,
        last_name: lastName,
        bio: bio,
      });

      if (response.status === 'success' && response.data) {
        // Update auth context
        await updateUser({ profile: response.data });
        setSuccess('Profile updated successfully.');
        // Navigate back after a short delay
        setTimeout(() => {
          router.back();
        }, 800);
      } else {
        setError(response.message || 'Failed to update profile');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView flex={1} bg="$backgroundLight0">
      <Stack.Screen options={{ title: 'Edit Profile' }} />

      <KeyboardAvoidingView
        flex={1}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView flex={1} contentContainerStyle={{ padding: 16 }}>
          <VStack space="lg">
            {error ? (
              <Alert action="error" variant="accent">
                <AlertIcon />
                <AlertText>{error}</AlertText>
              </Alert>
            ) : null}
            {success ? (
              <Alert action="success" variant="accent">
                <AlertIcon />
                <AlertText>{success}</AlertText>
              </Alert>
            ) : null}

            <Box>
              <Text mb="$1" fontWeight="$medium">
                First Name
              </Text>
              <Input variant="outline">
                <InputField
                  value={firstName}
                  placeholder="First Name"
                  onChangeText={setFirstName}
                />
              </Input>
            </Box>

            <Box>
              <Text mb="$1" fontWeight="$medium">
                Last Name
              </Text>
              <Input variant="outline">
                <InputField
                  value={lastName}
                  placeholder="Last Name"
                  onChangeText={setLastName}
                />
              </Input>
            </Box>

            <Box>
              <Text mb="$1" fontWeight="$medium">
                Bio
              </Text>
              <Input variant="outline" size="lg">
                <InputField
                  value={bio}
                  placeholder="Tell something about yourself"
                  onChangeText={setBio}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </Input>
            </Box>

            <HStack space="lg" mt="$8" justifyContent="center">
              <Button
                title="Save"
                isLoading={isSubmitting}
                onPress={handleSave}
              />
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => router.back()}
              />
            </HStack>
          </VStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}