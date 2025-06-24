import React from "react";
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

export default function ProfileScreen() {
  const router = useRouter();
  const { logout, user } = useAuth();

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

  // Get user's profile photo URL
  const getProfilePhotoUrl = () => {
    if (user?.photos && user.photos.length > 0) {
      // Find the profile photo (is_profile_photo = true)
      const profilePhoto = user.photos.find(photo => photo.is_profile_photo);
      if (profilePhoto) {
        return `https://incredibly-evident-hornet.ngrok-free.app${profilePhoto.photo_url}`;
      }
      // If no profile photo is marked, use the first photo
      return `http://192.168.20.171:8000${user.photos[0].photo_url}`;
    }
    return null;
  };

  // Format user's age
  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return '';
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Get user's interests from profile
  const interests = user?.profile?.interests || [];

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
            {getProfilePhotoUrl() ? (
              <AvatarImage
                source={{
                  uri: getProfilePhotoUrl(),
                }}
                alt="Profile"
              />
            ) : (
              <AvatarFallbackText>
                {user?.profile?.first_name?.charAt(0)}{user?.profile?.last_name?.charAt(0)}
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

          <Pressable
            flexDirection="row"
            alignItems="center"
            bg="$primary600"
            px="$4"
            py="$2"
            borderRadius="$full"
            onPress={() => {
              // Handle edit profile
              console.log("Edit profile pressed");
            }}
          >
            <Ionicons name="pencil" size={16} color="white" />
            <Text color="$white" fontWeight="$medium" ml="$2">
              Edit Profile
            </Text>
          </Pressable>
        </Box>

        {/* Main Content */}
        <VStack space="lg" px="$4">
          {/* About Me Section */}
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
            <Text
              fontSize="$lg"
              fontWeight="$semibold"
              color="$primary900"
              mb="$3"
            >
              About Me
            </Text>
            <Text
              fontSize="$md"
              color="$primary700"
              lineHeight="$lg"
            >
              {user?.profile?.bio || "No bio provided yet."}
            </Text>
          </Box>

          {/* Interests Section */}
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
            <Text
              fontSize="$lg"
              fontWeight="$semibold"
              color="$primary900"
              mb="$3"
            >
              Interests
            </Text>
            <HStack flexWrap="wrap" gap="$2">
              {interests && interests.length > 0 ? (
                interests.map((interest, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    borderColor="$primary300"
                    bg="$primary50"
                    mb="$2"
                  >
                    <BadgeText color="$primary700" fontSize="$sm" textTransform="capitalize">
                      {interest}
                    </BadgeText>
                  </Badge>
                ))
              ) : (
                <Text fontSize="$sm" color="$primary700">
                  No interests specified yet.
                </Text>
              )}
            </HStack>
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
                // Handle notifications
                console.log("Notifications pressed");
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
                // Handle privacy
                console.log("Privacy pressed");
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

            {/* Help & Support */}
            <Pressable
              onPress={() => {
                // Handle help & support
                console.log("Help & Support pressed");
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
