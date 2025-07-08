import React, { useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/auth-context";
import {
  Box,
  VStack,
  HStack,
  Text,
  Image,
  ScrollView,
  Pressable,
  SafeAreaView,
  Avatar,
  AvatarImage,
  AvatarFallbackText,
  Badge,
  BadgeText,
  Divider,
} from "@gluestack-ui/themed";
import { Ionicons } from "@expo/vector-icons";
import DebugNotificationCounts from "@/components/DebugNotificationCounts";

export default function ProfileScreen() {
  const router = useRouter();
  const { logout, user, refreshProfile } = useAuth();
  const hasRefreshedRef = useRef(false);

  // Refresh profile data when component mounts - only once
  useEffect(() => {
    if (!hasRefreshedRef.current) {
      console.log('Profile screen - refreshing profile once');
      hasRefreshedRef.current = true;
      refreshProfile();
    }
  }, [refreshProfile]);

  const handleLogout = async () => {
    try {
      // Logout the user
      await logout();
      // Navigate to login screen
      router.replace("/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  // Get user's profile photo URL - optimized for performance
  const getProfilePhotoUrl = (size: 'thumbnail' | 'medium' = 'medium'): string | null => {
    if (user?.photos && user.photos.length > 0) {
      // Find the profile photo (is_profile_photo = true)
      const profilePhoto = user.photos.find(photo => photo.is_profile_photo);
      if (profilePhoto) {
        return size === 'thumbnail' 
          ? (profilePhoto.thumbnail_url || profilePhoto.medium_url || profilePhoto.image_url)
          : (profilePhoto.medium_url || profilePhoto.image_url || profilePhoto.thumbnail_url);
      }
      // If no profile photo is marked, use the first photo
      const firstPhoto = user.photos[0];
      return size === 'thumbnail'
        ? (firstPhoto.thumbnail_url || firstPhoto.medium_url || firstPhoto.image_url)
        : (firstPhoto.medium_url || firstPhoto.image_url || firstPhoto.thumbnail_url);
    }
    return null;
  };

  // Format user's age
  const calculateAge = (dateOfBirth: string | null | undefined): string => {
    if (!dateOfBirth) return '';
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age.toString();
  };

  // Get user's interests from profile
  const interests = user?.profile?.interests || [];

  const profilePhotoUrl = getProfilePhotoUrl('medium'); // Use medium for main display and avatars

  return (
    <SafeAreaView flex={1} backgroundColor="#FDF7FD">
      <ScrollView
        flex={1}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Header Section */}
        <Box alignItems="center" pt="$8" pb="$6" px="$4">
          <Avatar size="2xl" mb="$4">
            {profilePhotoUrl ? (
              <AvatarImage
                source={{
                  uri: profilePhotoUrl,
                }}
                alt="Profile"
              />
            ) : (
              <AvatarFallbackText fontSize="$2xl" fontWeight="$bold" color="$primary600">
                {user?.profile?.first_name?.charAt(0) || 'U'}{user?.profile?.last_name?.charAt(0) || ''}
              </AvatarFallbackText>
            )}
          </Avatar>

          <Text
            fontSize="$2xl"
            fontWeight="$bold"
            color="$primary900"
            textAlign="center"
          >
            {user?.profile?.first_name} {user?.profile?.last_name}
          </Text>

          <Text
            fontSize="$md"
            color="$primary700"
            textAlign="center"
            mb="$4"
          >
            {calculateAge(user?.profile?.date_of_birth)}, {user?.profile?.city}{user?.profile?.state ? `, ${user?.profile?.state}` : ''}
          </Text>

          <HStack space="md">
            <Pressable
              flexDirection="row"
              alignItems="center"
              bg="$primary600"
              px="$4"
              py="$2"
              borderRadius="$full"
              onPress={() => {
                router.push("/profile/edit");
              }}
            >
              <Ionicons name="pencil" size={16} color="white" />
              <Text color="$white" fontWeight="$medium" ml="$2">
                Edit Profile
              </Text>
            </Pressable>
            
            <Pressable
              flexDirection="row"
              alignItems="center"
              bg="$white"
              borderWidth="$1"
              borderColor="$primary600"
              px="$4"
              py="$2"
              borderRadius="$full"
              onPress={() => {
                router.push("/profile/view");
              }}
            >
              <Ionicons name="eye" size={16} color="#8F3BBF" />
              <Text color="$primary600" fontWeight="$medium" ml="$2">
                Preview
              </Text>
            </Pressable>
          </HStack>
        </Box>

        {/* Main Content */}
        <VStack space="lg" px="$4" pb="$20">
          {/* Debug Section - Temporary */}
          <Box
            bg="$white"
            borderRadius="$xl"
            shadowColor="$backgroundLight300"
            shadowOffset={{ width: 0, height: 2 }}
            shadowOpacity={0.1}
            shadowRadius={4}
            elevation={3}
            overflow="hidden"
          >
            <Text
              fontSize="$lg"
              fontWeight="$semibold"
              color="$primary900"
              p="$4"
              pb="$2"
            >
              Debug Notification Counts
            </Text>
            <DebugNotificationCounts />
          </Box>

          {/* Account Settings Section */}
          <Box
            bg="$white"
            borderRadius="$xl"
            shadowColor="$backgroundLight300"
            shadowOffset={{ width: 0, height: 2 }}
            shadowOpacity={0.1}
            shadowRadius={4}
            elevation={3}
            overflow="hidden"
          >
            <Text
              fontSize="$lg"
              fontWeight="$semibold"
              color="$primary900"
              p="$4"
              pb="$2"
            >
              Account Settings
            </Text>

            {/* Notifications */}
            <Pressable
              onPress={() => {
                router.push("/settings/notifications");
              }}
            >
              <HStack
                alignItems="center"
                px="$4"
                py="$3"
                space="md"
              >
                <Box
                  w="$8"
                  h="$8"
                  bg="$primary100"
                  alignItems="center"
                  justifyContent="center"
                  borderRadius="$md"
                >
                  <Ionicons
                    name="notifications-outline"
                    size={20}
                    color="#5B1994"
                  />
                </Box>
                <Text
                  flex={1}
                  fontSize="$md"
                  color="$primary900"
                  fontWeight="$medium"
                >
                  Notifications
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#5B1994" />
              </HStack>
            </Pressable>

            <Divider bg="$backgroundLight200" />

            {/* Privacy */}
            <Pressable
              onPress={() => {
                router.push("/settings/privacy");
              }}
            >
              <HStack
                alignItems="center"
                px="$4"
                py="$3"
                space="md"
              >
                <Box
                  w="$8"
                  h="$8"
                  bg="$primary100"
                  alignItems="center"
                  justifyContent="center"
                  borderRadius="$md"
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color="#5B1994"
                  />
                </Box>
                <Text
                  flex={1}
                  fontSize="$md"
                  color="$primary900"
                  fontWeight="$medium"
                >
                  Privacy
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#5B1994" />
              </HStack>
            </Pressable>

            <Divider bg="$backgroundLight200" />

            {/* Account Management */}
            <Pressable
              onPress={() => {
                router.push("/settings/account-management");
              }}
            >
              <HStack
                alignItems="center"
                px="$4"
                py="$3"
                space="md"
              >
                <Box
                  w="$8"
                  h="$8"
                  bg="$primary100"
                  alignItems="center"
                  justifyContent="center"
                  borderRadius="$md"
                >
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color="#5B1994"
                  />
                </Box>
                <Text
                  flex={1}
                  fontSize="$md"
                  color="$primary900"
                  fontWeight="$medium"
                >
                  Account Management
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#5B1994" />
              </HStack>
            </Pressable>

            <Divider bg="$backgroundLight200" />

            {/* Discovery Settings */}
            <Pressable
              onPress={() => {
                router.push("/settings/discovery-settings");
              }}
            >
              <HStack
                alignItems="center"
                px="$4"
                py="$3"
                space="md"
              >
                <Box
                  w="$8"
                  h="$8"
                  bg="$primary100"
                  alignItems="center"
                  justifyContent="center"
                  borderRadius="$md"
                >
                  <Ionicons
                    name="search-outline"
                    size={20}
                    color="#5B1994"
                  />
                </Box>
                <Text
                  flex={1}
                  fontSize="$md"
                  color="$primary900"
                  fontWeight="$medium"
                >
                  Discovery Settings
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#5B1994" />
              </HStack>
            </Pressable>

            <Divider bg="$backgroundLight200" />

            {/* Safety & Security */}
            <Pressable
              onPress={() => {
                router.push("/settings/safety-security");
              }}
            >
              <HStack
                alignItems="center"
                px="$4"
                py="$3"
                space="md"
              >
                <Box
                  w="$8"
                  h="$8"
                  bg="$primary100"
                  alignItems="center"
                  justifyContent="center"
                  borderRadius="$md"
                >
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={20}
                    color="#5B1994"
                  />
                </Box>
                <Text
                  flex={1}
                  fontSize="$md"
                  color="$primary900"
                  fontWeight="$medium"
                >
                  Safety & Security
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#5B1994" />
              </HStack>
            </Pressable>

            <Divider bg="$backgroundLight200" />

            {/* Help & Support */}
            <Pressable
              onPress={() => {
                router.push("/settings/help-support");
              }}
            >
              <HStack
                alignItems="center"
                px="$4"
                py="$3"
                space="md"
              >
                <Box
                  w="$8"
                  h="$8"
                  bg="$primary100"
                  alignItems="center"
                  justifyContent="center"
                  borderRadius="$md"
                >
                  <Ionicons
                    name="help-circle-outline"
                    size={20}
                    color="#5B1994"
                  />
                </Box>
                <Text
                  flex={1}
                  fontSize="$md"
                  color="$primary900"
                  fontWeight="$medium"
                >
                  Help & Support
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#5B1994" />
              </HStack>
            </Pressable>
          </Box>

          {/* Logout Button */}
          <Pressable
            onPress={handleLogout}
            bg="$white"
            borderRadius="$xl"
            shadowColor="$backgroundLight300"
            shadowOffset={{ width: 0, height: 2 }}
            shadowOpacity={0.1}
            shadowRadius={4}
            elevation={3}
          >
            <HStack
              alignItems="center"
              justifyContent="center"
              px="$4"
              py="$4"
              space="md"
            >
              <Box
                w="$8"
                h="$8"
                bg="$error100"
                alignItems="center"
                justifyContent="center"
                borderRadius="$md"
              >
                <Ionicons name="log-out-outline" size={20} color="#DC2626" />
              </Box>
              <Text
                fontSize="$md"
                fontWeight="$semibold"
                color="$error600"
              >
                Logout
              </Text>
            </HStack>
          </Pressable>
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
}
