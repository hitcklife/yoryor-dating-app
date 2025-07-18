import React, { useEffect, useRef, useState } from "react";
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
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Button,
  ButtonText,
  Heading,
} from "@gluestack-ui/themed";
import { Ionicons } from "@expo/vector-icons";
import DebugNotificationCounts from "@/components/DebugNotificationCounts";
import { CircularProgressAvatar } from "@/components/ui/avatar/CircularProgressAvatar";
import { ProfileCompletionCard } from "@/app/profile/components/ProfileCompletionCard";
import { profileCompletionService } from "@/services/profile-completion-service";

export default function ProfileScreen() {
  const router = useRouter();
  const { logout, user, refreshProfile } = useAuth();
  const hasRefreshedRef = useRef(false);
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);
  
  // Calculate profile completion
  const profileCompletion = profileCompletionService.calculateCompletion(user);

  // Refresh profile data when component mounts - only once
  useEffect(() => {
    if (!hasRefreshedRef.current) {
      console.log('Profile screen - refreshing profile once');
      hasRefreshedRef.current = true;
      refreshProfile();
    }
  }, [refreshProfile]);

  const handleLogoutPress = () => {
    setShowLogoutConfirmation(true);
  };

  const handleLogoutConfirm = async () => {
    try {
      setShowLogoutConfirmation(false);
      // Logout the user
      await logout();
      // Navigate to login screen
      router.replace("/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const handleLogoutCancel = () => {
    setShowLogoutConfirmation(false);
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

  // Format location string based on available data
  const formatLocation = (): string => {
    const profile = user?.profile;
    if (!profile) return '';

    const parts = [];
    
    // Add age if available
    if (profile.age) {
      parts.push(profile.age.toString());
    } else if (profile.date_of_birth) {
      parts.push(calculateAge(profile.date_of_birth));
    }
    
    // Add city if available
    if (profile.city) {
      parts.push(profile.city);
    }
    
    // Add state if available
    if (profile.state) {
      parts.push(profile.state);
    }
    
    // Add country if available (handle both object and string formats)
    if (profile.country) {
      if (typeof profile.country === 'object' && profile.country.name) {
        parts.push(profile.country.name);
      } else if (typeof profile.country === 'string') {
        parts.push(profile.country);
      }
    }
    
    return parts.join(', ');
  };

  const locationString = formatLocation();

  return (
    <SafeAreaView flex={1} backgroundColor="#FDF7FD">
      <ScrollView
        flex={1}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Header Section */}
        <Box alignItems="center" pt="$8" pb="$6" px="$4">
          <CircularProgressAvatar
            imageUrl={profilePhotoUrl}
            fallbackText={`${user?.profile?.first_name?.charAt(0) || 'U'}${user?.profile?.last_name?.charAt(0) || ''}`}
            size="2xl"
            percentage={profileCompletion.overallPercentage}
            showPercentageBadge={profileCompletion.overallPercentage < 100}
          />

          <Text
            fontSize="$2xl"
            fontWeight="$bold"
            color="$primary900"
            textAlign="center"
            mt="$4"
          >
            {user?.profile?.first_name} {user?.profile?.last_name}
          </Text>

          <Text
            fontSize="$md"
            color="$primary700"
            textAlign="center"
            mb="$2"
          >
            {locationString}
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
        <VStack space="lg" px="$0" pb="$20">
          {/* Profile Completion Card */}
          <ProfileCompletionCard
            completionPercentage={profileCompletion.overallPercentage}
            incompleteSections={profileCompletion.sections
              .filter(section => section.percentage < 100)
              .map(section => section.title)
            }
            totalPoints={Math.round(profileCompletion.overallPercentage)}
          />

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
            mx="$4"
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
            onPress={handleLogoutPress}
            bg="$white"
            borderRadius="$xl"
            shadowColor="$backgroundLight300"
            shadowOffset={{ width: 0, height: 2 }}
            shadowOpacity={0.1}
            shadowRadius={4}
            elevation={3}
            mx="$4"
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

      <Modal isOpen={showLogoutConfirmation} onClose={handleLogoutCancel}>
        <ModalBackdrop />
        <ModalContent>
          <ModalHeader>
            <Text fontSize="$lg" fontWeight="$semibold" color="$primary900">
              Confirm Logout
            </Text>
            <ModalCloseButton onPress={handleLogoutCancel} />
          </ModalHeader>
          <ModalBody>
            <Text fontSize="$md" color="$primary700" lineHeight="$lg">
              Are you sure you want to log out? This action cannot be undone.
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onPress={handleLogoutCancel} mr="$3">
              <ButtonText>Cancel</ButtonText>
            </Button>
            <Button bg="$error600" onPress={handleLogoutConfirm}>
              <ButtonText color="$white">Logout</ButtonText>
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </SafeAreaView>
  );
}
