import React, { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/auth-context";
import { Platform, ScrollView, Alert } from "react-native";
import {
  Box,
  VStack,
  HStack,
  Text,
  SafeAreaView,
  Avatar,
  AvatarImage,
  AvatarFallbackText,
  Input,
  InputField,
  Textarea,
  TextareaInput,
  Button,
  ButtonText,
  Spinner,
  Pressable,
  Select,
  SelectTrigger,
  SelectInput,
  SelectIcon,
  SelectPortal,
  SelectBackdrop,
  SelectContent,
  SelectDragIndicatorWrapper,
  SelectDragIndicator,
  SelectItem,
  CheckIcon,
  ChevronDownIcon,
} from "@gluestack-ui/themed";
import { Ionicons } from "@expo/vector-icons";
import { apiClient } from "@/services/api-client";
import * as ImagePicker from 'expo-image-picker';
import { Stack } from "expo-router";

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, fetchHomeStats } = useAuth();

  // Form state
  const [firstName, setFirstName] = useState(user?.profile?.first_name || "");
  const [lastName, setLastName] = useState(user?.profile?.last_name || "");
  const [bio, setBio] = useState(user?.profile?.bio || "");
  const [city, setCity] = useState(user?.profile?.city || "");
  const [state, setState] = useState(user?.profile?.state || "");
  const [occupation, setOccupation] = useState(user?.profile?.occupation || "");
  const [profession, setProfession] = useState(user?.profile?.profession || "");
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form data
  useEffect(() => {
    if (user?.profile) {
      setFirstName(user.profile.first_name || "");
      setLastName(user.profile.last_name || "");
      setBio(user.profile.bio || "");
      setCity(user.profile.city || "");
      setState(user.profile.state || "");
      setOccupation(user.profile.occupation || "");
      setProfession(user.profile.profession || "");
    }
  }, [user]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!firstName.trim()) {
      newErrors.firstName = "First name is required";
    }

    if (!lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }

    if (!bio.trim()) {
      newErrors.bio = "Bio is required";
    } else if (bio.length < 10) {
      newErrors.bio = "Bio must be at least 10 characters";
    } else if (bio.length > 500) {
      newErrors.bio = "Bio must be less than 500 characters";
    }

    if (!city.trim()) {
      newErrors.city = "City is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please grant camera roll permissions to update your profile photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setProfilePhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);

    try {
      // Prepare update data
      const updateData = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        bio: bio.trim(),
        city: city.trim(),
        state: state.trim(),
        occupation: occupation.trim(),
        profession: profession.trim(),
      };

      // Update profile via API
      const response = await apiClient.put(`/api/v1/profile/${user?.profile?.id}`, updateData);

      if (response.status === 'success') {
        // If there's a profile photo to upload
        if (profilePhoto) {
          try {
            const uploadResponse = await apiClient.upload(
              '/api/v1/photos/upload',
              [{
                uri: profilePhoto,
                name: 'profile.jpg',
                type: 'image/jpeg'
              }],
              'photo',
              {
                is_profile_photo: true,
                order: 0,
                is_private: false
              }
            );

            if (uploadResponse.status !== 'success') {
              console.warn('Profile photo upload failed:', uploadResponse.message);
            }
          } catch (uploadError) {
            console.error('Profile photo upload error:', uploadError);
          }
        }

        // Refresh user data
        await fetchHomeStats();

        Alert.alert(
          'Success',
          'Profile updated successfully!',
          [
            {
              text: 'OK',
              onPress: () => router.back(),
            },
          ]
        );
      } else {
        Alert.alert('Error', response.message || 'Failed to update profile. Please try again.');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const getProfilePhotoUrl = () => {
    if (profilePhoto) {
      return profilePhoto;
    }
    
    if (user?.photos && user.photos.length > 0) {
      const profilePhoto = user.photos.find(photo => photo.is_profile_photo);
      if (profilePhoto) {
        return `https://incredibly-evident-hornet.ngrok-free.app${profilePhoto.photo_url}`;
      }
      return `https://incredibly-evident-hornet.ngrok-free.app${user.photos[0].photo_url}`;
    }
    return null;
  };

  return (
    <SafeAreaView flex={1} backgroundColor="#FDF7FD">
      <Stack.Screen 
        options={{
          title: 'Edit Profile',
          headerShown: true,
          headerTitleStyle: { color: '#5B1994' },
          headerTintColor: '#5B1994',
        }}
      />

      <ScrollView 
        flex={1} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <VStack space="lg" px="$4" py="$6">
          {/* Profile Photo Section */}
          <Box alignItems="center" mb="$4">
            <Pressable onPress={handlePickImage}>
              <Box position="relative">
                <Avatar size="2xl" borderWidth={3} borderColor="$primary300">
                  {getProfilePhotoUrl() ? (
                    <AvatarImage
                      source={{ uri: getProfilePhotoUrl() }}
                      alt="Profile"
                    />
                  ) : (
                    <AvatarFallbackText>
                      {firstName.charAt(0)}{lastName.charAt(0)}
                    </AvatarFallbackText>
                  )}
                </Avatar>
                <Box
                  position="absolute"
                  bottom={-5}
                  right={-5}
                  bg="$primary600"
                  borderRadius="$full"
                  p="$2"
                  borderWidth={2}
                  borderColor="$white"
                >
                  <Ionicons name="camera" size={16} color="white" />
                </Box>
              </Box>
            </Pressable>
            <Text color="$primary600" fontSize="$sm" mt="$2">
              Tap to change photo
            </Text>
          </Box>

          {/* Personal Information */}
          <Box
            bg="$white"
            p="$4"
            borderRadius="$xl"
            shadowColor="$backgroundLight300"
            shadowOffset={{ width: 0, height: 2 }}
            shadowOpacity={0.1}
            shadowRadius={4}
            elevation={3}
          >
            <Text fontSize="$lg" fontWeight="$semibold" color="$primary900" mb="$4">
              Personal Information
            </Text>

            <VStack space="md">
              <VStack space="xs">
                <Text fontSize="$sm" fontWeight="$medium" color="$primary700">
                  First Name *
                </Text>
                <Input
                  variant="outline"
                  size="md"
                  isInvalid={!!errors.firstName}
                >
                  <InputField
                    placeholder="Enter your first name"
                    value={firstName}
                    onChangeText={(text) => {
                      setFirstName(text);
                      if (errors.firstName) {
                        setErrors(prev => ({ ...prev, firstName: "" }));
                      }
                    }}
                  />
                </Input>
                {errors.firstName && (
                  <Text fontSize="$xs" color="$error600">
                    {errors.firstName}
                  </Text>
                )}
              </VStack>

              <VStack space="xs">
                <Text fontSize="$sm" fontWeight="$medium" color="$primary700">
                  Last Name *
                </Text>
                <Input
                  variant="outline"
                  size="md"
                  isInvalid={!!errors.lastName}
                >
                  <InputField
                    placeholder="Enter your last name"
                    value={lastName}
                    onChangeText={(text) => {
                      setLastName(text);
                      if (errors.lastName) {
                        setErrors(prev => ({ ...prev, lastName: "" }));
                      }
                    }}
                  />
                </Input>
                {errors.lastName && (
                  <Text fontSize="$xs" color="$error600">
                    {errors.lastName}
                  </Text>
                )}
              </VStack>

              <VStack space="xs">
                <Text fontSize="$sm" fontWeight="$medium" color="$primary700">
                  Bio *
                </Text>
                <Textarea
                  size="md"
                  isInvalid={!!errors.bio}
                >
                  <TextareaInput
                    placeholder="Tell us about yourself..."
                    value={bio}
                    onChangeText={(text) => {
                      setBio(text);
                      if (errors.bio) {
                        setErrors(prev => ({ ...prev, bio: "" }));
                      }
                    }}
                    maxLength={500}
                    multiline
                    numberOfLines={4}
                  />
                </Textarea>
                <HStack justifyContent="space-between" alignItems="center">
                  {errors.bio ? (
                    <Text fontSize="$xs" color="$error600">
                      {errors.bio}
                    </Text>
                  ) : (
                    <Box />
                  )}
                  <Text fontSize="$xs" color="$primary500">
                    {bio.length}/500
                  </Text>
                </HStack>
              </VStack>
            </VStack>
          </Box>

          {/* Location Information */}
          <Box
            bg="$white"
            p="$4"
            borderRadius="$xl"
            shadowColor="$backgroundLight300"
            shadowOffset={{ width: 0, height: 2 }}
            shadowOpacity={0.1}
            shadowRadius={4}
            elevation={3}
          >
            <Text fontSize="$lg" fontWeight="$semibold" color="$primary900" mb="$4">
              Location
            </Text>

            <VStack space="md">
              <VStack space="xs">
                <Text fontSize="$sm" fontWeight="$medium" color="$primary700">
                  City *
                </Text>
                <Input
                  variant="outline"
                  size="md"
                  isInvalid={!!errors.city}
                >
                  <InputField
                    placeholder="Enter your city"
                    value={city}
                    onChangeText={(text) => {
                      setCity(text);
                      if (errors.city) {
                        setErrors(prev => ({ ...prev, city: "" }));
                      }
                    }}
                  />
                </Input>
                {errors.city && (
                  <Text fontSize="$xs" color="$error600">
                    {errors.city}
                  </Text>
                )}
              </VStack>

              <VStack space="xs">
                <Text fontSize="$sm" fontWeight="$medium" color="$primary700">
                  State/Province
                </Text>
                <Input variant="outline" size="md">
                  <InputField
                    placeholder="Enter your state or province"
                    value={state}
                    onChangeText={setState}
                  />
                </Input>
              </VStack>
            </VStack>
          </Box>

          {/* Professional Information */}
          <Box
            bg="$white"
            p="$4"
            borderRadius="$xl"
            shadowColor="$backgroundLight300"
            shadowOffset={{ width: 0, height: 2 }}
            shadowOpacity={0.1}
            shadowRadius={4}
            elevation={3}
          >
            <Text fontSize="$lg" fontWeight="$semibold" color="$primary900" mb="$4">
              Professional Information
            </Text>

            <VStack space="md">
              <VStack space="xs">
                <Text fontSize="$sm" fontWeight="$medium" color="$primary700">
                  Occupation
                </Text>
                <Input variant="outline" size="md">
                  <InputField
                    placeholder="What do you do?"
                    value={occupation}
                    onChangeText={setOccupation}
                  />
                </Input>
              </VStack>

              <VStack space="xs">
                <Text fontSize="$sm" fontWeight="$medium" color="$primary700">
                  Profession
                </Text>
                <Input variant="outline" size="md">
                  <InputField
                    placeholder="Your professional field"
                    value={profession}
                    onChangeText={setProfession}
                  />
                </Input>
              </VStack>
            </VStack>
          </Box>

          {/* Save Button */}
          <Button
            size="lg"
            variant="solid"
            bg="$primary600"
            onPress={handleSave}
            isDisabled={isSaving}
            mt="$4"
          >
            {isSaving ? (
              <HStack alignItems="center" space="sm">
                <Spinner color="$white" size="small" />
                <ButtonText color="$white">Saving...</ButtonText>
              </HStack>
            ) : (
              <ButtonText color="$white" fontWeight="$semibold">
                Save Changes
              </ButtonText>
            )}
          </Button>
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
}