import React, { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/auth-context";
import {
  Box,
  VStack,
  HStack,
  Text,
  ScrollView,
  Pressable,
  SafeAreaView,
  Avatar,
  AvatarImage,
  AvatarFallbackText,
  Input,
  InputField,
  Textarea,
  TextareaInput,
  Badge,
  BadgeText,
  BadgeIcon,
  BadgeCloseIcon,
  CloseIcon,
  FormControl,
  FormControlLabel,
  FormControlLabelText,
  FormControlHelper,
  FormControlHelperText,
  FormControlError,
  FormControlErrorIcon,
  FormControlErrorText,
  AlertCircleIcon,
  KeyboardAvoidingView,
} from "@gluestack-ui/themed";
import { Ionicons } from "@expo/vector-icons";
import { Platform, Alert, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiClient } from "@/services/api-client";

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form states
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [occupation, setOccupation] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Initialize form with user data
    if (user?.profile) {
      setFirstName(user.profile.first_name || "");
      setLastName(user.profile.last_name || "");
      setBio(user.profile.bio || "");
      setCity(user.profile.city || "");
      setState(user.profile.state || "");
      setOccupation(user.profile.occupation || "");
      
      // Parse interests if they exist
      if (user.profile.interests) {
        if (Array.isArray(user.profile.interests)) {
          setInterests(user.profile.interests);
        } else if (typeof user.profile.interests === 'string') {
          try {
            const parsed = JSON.parse(user.profile.interests);
            setInterests(Array.isArray(parsed) ? parsed : []);
          } catch {
            setInterests([user.profile.interests]);
          }
        }
      }
    }
  }, [user]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!firstName.trim()) newErrors.firstName = "First name is required";
    if (!lastName.trim()) newErrors.lastName = "Last name is required";
    if (bio.length > 500) newErrors.bio = "Bio must be less than 500 characters";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddInterest = () => {
    if (newInterest.trim() && !interests.includes(newInterest.trim())) {
      setInterests([...interests, newInterest.trim()]);
      setNewInterest("");
    }
  };

  const handleRemoveInterest = (interest: string) => {
    setInterests(interests.filter(i => i !== interest));
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      // Prepare the update data
      const updateData = {
        first_name: firstName,
        last_name: lastName,
        bio: bio,
        city: city,
        state: state,
        occupation: occupation,
        interests: JSON.stringify(interests),
      };

      // Call the update profile API
      const response = await apiClient.put(`/api/v1/profile/${user?.profile?.id}`, updateData);

      if (response.status === 'success') {
        // Update the user data in auth context
        const updatedUser = {
          ...user,
          profile: {
            ...user?.profile,
            ...response.data,
            interests: interests,
          }
        };
        
        // Update auth context with new user data
        const token = await AsyncStorage.getItem('auth_token');
        if (token) {
          await login(token, updatedUser as any);
        }

        Alert.alert("Success", "Profile updated successfully!");
        router.back();
      } else {
        Alert.alert("Error", response.message || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", "Failed to update profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const getProfilePhotoUrl = () => {
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
      <KeyboardAvoidingView
        flex={1}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <HStack
          alignItems="center"
          justifyContent="space-between"
          px="$4"
          py="$3"
          borderBottomWidth={1}
          borderBottomColor="$backgroundLight200"
          bg="$white"
        >
          <Pressable onPress={() => router.back()}>
            <Text color="$primary600" fontSize="$md">Cancel</Text>
          </Pressable>
          
          <Text fontSize="$lg" fontWeight="$semibold" color="$primary900">
            Edit Profile
          </Text>
          
          <Pressable onPress={handleSave} disabled={isSaving}>
            {isSaving ? (
              <ActivityIndicator size="small" color="#5B1994" />
            ) : (
              <Text color="$primary600" fontSize="$md" fontWeight="$semibold">
                Save
              </Text>
            )}
          </Pressable>
        </HStack>

        <ScrollView
          flex={1}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* Profile Photo Section */}
          <Box alignItems="center" pt="$6" pb="$4">
            <Avatar size="2xl" mb="$3">
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
            
            <Pressable
              flexDirection="row"
              alignItems="center"
              bg="$primary100"
              px="$3"
              py="$2"
              borderRadius="$full"
            >
              <Ionicons name="camera" size={16} color="#5B1994" />
              <Text color="$primary700" fontSize="$sm" fontWeight="$medium" ml="$2">
                Change Photo
              </Text>
            </Pressable>
          </Box>

          {/* Form Fields */}
          <VStack space="lg" px="$4">
            {/* Name Fields */}
            <HStack space="md">
              <FormControl flex={1} isInvalid={!!errors.firstName}>
                <FormControlLabel>
                  <FormControlLabelText>First Name</FormControlLabelText>
                </FormControlLabel>
                <Input>
                  <InputField
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder="Enter first name"
                  />
                </Input>
                {errors.firstName && (
                  <FormControlError>
                    <FormControlErrorIcon as={AlertCircleIcon} />
                    <FormControlErrorText>{errors.firstName}</FormControlErrorText>
                  </FormControlError>
                )}
              </FormControl>

              <FormControl flex={1} isInvalid={!!errors.lastName}>
                <FormControlLabel>
                  <FormControlLabelText>Last Name</FormControlLabelText>
                </FormControlLabel>
                <Input>
                  <InputField
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder="Enter last name"
                  />
                </Input>
                {errors.lastName && (
                  <FormControlError>
                    <FormControlErrorIcon as={AlertCircleIcon} />
                    <FormControlErrorText>{errors.lastName}</FormControlErrorText>
                  </FormControlError>
                )}
              </FormControl>
            </HStack>

            {/* Bio */}
            <FormControl isInvalid={!!errors.bio}>
              <FormControlLabel>
                <FormControlLabelText>Bio</FormControlLabelText>
              </FormControlLabel>
              <Textarea>
                <TextareaInput
                  value={bio}
                  onChangeText={setBio}
                  placeholder="Tell us about yourself..."
                  numberOfLines={4}
                  maxLength={500}
                />
              </Textarea>
              <FormControlHelper>
                <FormControlHelperText>
                  {bio.length}/500 characters
                </FormControlHelperText>
              </FormControlHelper>
              {errors.bio && (
                <FormControlError>
                  <FormControlErrorIcon as={AlertCircleIcon} />
                  <FormControlErrorText>{errors.bio}</FormControlErrorText>
                </FormControlError>
              )}
            </FormControl>

            {/* Location */}
            <HStack space="md">
              <FormControl flex={1}>
                <FormControlLabel>
                  <FormControlLabelText>City</FormControlLabelText>
                </FormControlLabel>
                <Input>
                  <InputField
                    value={city}
                    onChangeText={setCity}
                    placeholder="Enter city"
                  />
                </Input>
              </FormControl>

              <FormControl flex={1}>
                <FormControlLabel>
                  <FormControlLabelText>State</FormControlLabelText>
                </FormControlLabel>
                <Input>
                  <InputField
                    value={state}
                    onChangeText={setState}
                    placeholder="Enter state"
                  />
                </Input>
              </FormControl>
            </HStack>

            {/* Occupation */}
            <FormControl>
              <FormControlLabel>
                <FormControlLabelText>Occupation</FormControlLabelText>
              </FormControlLabel>
              <Input>
                <InputField
                  value={occupation}
                  onChangeText={setOccupation}
                  placeholder="Enter occupation"
                />
              </Input>
            </FormControl>

            {/* Interests */}
            <FormControl>
              <FormControlLabel>
                <FormControlLabelText>Interests</FormControlLabelText>
              </FormControlLabel>
              
              <HStack space="sm" mb="$3">
                <Input flex={1}>
                  <InputField
                    value={newInterest}
                    onChangeText={setNewInterest}
                    placeholder="Add an interest"
                    onSubmitEditing={handleAddInterest}
                  />
                </Input>
                <Pressable
                  bg="$primary600"
                  px="$4"
                  py="$2"
                  borderRadius="$md"
                  onPress={handleAddInterest}
                >
                  <Text color="$white" fontWeight="$medium">Add</Text>
                </Pressable>
              </HStack>

              <HStack flexWrap="wrap" gap="$2">
                {interests.map((interest, index) => (
                  <Badge
                    key={index}
                    variant="solid"
                    bg="$primary100"
                    mb="$2"
                  >
                    <BadgeText color="$primary700" textTransform="capitalize">
                      {interest}
                    </BadgeText>
                    <Pressable
                      ml="$1"
                      onPress={() => handleRemoveInterest(interest)}
                    >
                      <Ionicons name="close-circle" size={16} color="#5B1994" />
                    </Pressable>
                  </Badge>
                ))}
              </HStack>
            </FormControl>
          </VStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}