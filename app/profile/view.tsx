import React, { useEffect } from "react";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
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
  Heading,
  Divider,
} from "@gluestack-ui/themed";
import { Ionicons } from "@expo/vector-icons";

export default function ProfileViewScreen() {
  const router = useRouter();
  const { user, refreshProfile } = useAuth();
  const params = useLocalSearchParams();

  // Refresh profile data when component mounts
  useEffect(() => {
    refreshProfile();
  }, []);

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
  const profilePhotoUrl = getProfilePhotoUrl('medium'); // Use medium for main hero image

  // Format location string based on available data
  const formatLocation = (): string => {
    const profile = user?.profile;
    if (!profile) return '';

    const parts = [];
    
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

  // Map common interests to emojis
  const getInterestEmoji = (interest: string) => {
    const emojiMap: {[key: string]: string} = {
      'photography': '📸',
      'hiking': '🥾',
      'cooking': '🍳',
      'travel': '✈️',
      'art': '🎨',
      'music': '🎵',
      'reading': '📚',
      'sports': '🏀',
      'movies': '🎬',
      'dancing': '💃',
      'gaming': '🎮',
      'technology': '💻',
      'fitness': '💪',
      'yoga': '🧘',
      'fashion': '👗',
      'food': '🍔',
      'nature': '🌿',
      'animals': '🐾',
      'writing': '✍️',
      'gardening': '🌱'
    };

    const lowerInterest = interest.toLowerCase();
    return emojiMap[lowerInterest] || '🌟';
  };

  return (
    <Box flex={1} bg="#FDF7FD">
      <Stack.Screen options={{
        headerShown: false,
        title: 'Profile Preview'
      }} />
      
      {/* Custom Header */}
      <Box
        bg="$primary600"
        shadowColor="$shadowColor"
        shadowOffset={{ width: 0, height: 6 }}
        shadowOpacity={0.15}
        shadowRadius={12}
        elevation={8}
        pt="$8"
      >
        <Box
          bg="$primary600"
          style={{
            paddingTop: 10,
            paddingBottom: 15,
          }}
        >
          <HStack
            alignItems="center"
            justifyContent="space-between"
            px="$4"
            py="$2"
          >
            <HStack alignItems="center" space="md" flex={1}>
              <Pressable
                onPress={() => router.back()}
                p="$3"
                borderRadius="$full"
                bg="rgba(255,255,255,0.2)"
                shadowColor="$shadowColor"
                shadowOffset={{ width: 0, height: 4 }}
                shadowOpacity={0.3}
                shadowRadius={8}
                elevation={4}
                borderWidth="$1"
                borderColor="rgba(255,255,255,0.3)"
              >
                <Ionicons name="arrow-back" size={24} color="white" />
              </Pressable>
              <VStack flex={1}>
                <Heading size="xl" color="$white" fontWeight="$bold">
                  Profile Preview
                </Heading>
                <Text size="sm" color="rgba(255,255,255,0.9)" fontWeight="$medium">
                  How others see you
                </Text>
              </VStack>
            </HStack>

            <Pressable
              onPress={() => router.push("/profile/edit")}
              p="$3"
              borderRadius="$full"
              bg="rgba(255,255,255,0.95)"
              shadowColor="$shadowColor"
              shadowOffset={{ width: 0, height: 4 }}
              shadowOpacity={0.2}
              shadowRadius={8}
              elevation={4}
            >
              <Ionicons name="pencil" size={20} color="#8F3BBF" />
            </Pressable>
          </HStack>
        </Box>
      </Box>

      <ScrollView
        flex={1}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Profile Photo Section */}
        <Box position="relative">
          <Box
            bg="$primary600"
            height={400}
            borderBottomLeftRadius="$3xl"
            borderBottomRightRadius="$3xl"
          >
            <Box
              position="absolute"
              top={0}
              left={0}
              right={0}
              bottom={0}
              borderBottomLeftRadius="$3xl"
              borderBottomRightRadius="$3xl"
              overflow="hidden"
            >
              {profilePhotoUrl ? (
                <Image
                  source={{ uri: profilePhotoUrl }}
                  alt="Profile"
                  style={{
                    width: '100%',
                    height: '100%',
                  }}
                  resizeMode="cover"
                />
              ) : (
                                 <Box
                   flex={1}
                   alignItems="center"
                   justifyContent="center"
                   bg="$primary100"
                 >
                   <Avatar size="2xl">
                     <AvatarFallbackText fontSize="$3xl" fontWeight="$bold" color="$primary600">
                       {user?.profile?.first_name?.charAt(0) || 'U'}{user?.profile?.last_name?.charAt(0) || ''}
                     </AvatarFallbackText>
                   </Avatar>
                 </Box>
              )}
            </Box>
          </Box>

          {/* Profile Info Overlay */}
          <Box
            position="absolute"
            bottom={0}
            left={0}
            right={0}
            bg="rgba(0,0,0,0.6)"
            borderBottomLeftRadius="$3xl"
            borderBottomRightRadius="$3xl"
            p="$6"
          >
            <VStack space="sm">
              <HStack alignItems="center" space="md">
                <Text
                  fontSize="$3xl"
                  fontWeight="$bold"
                  color="$white"
                >
                  {user?.profile?.first_name} {user?.profile?.last_name}
                </Text>
                <Text
                  fontSize="$xl"
                  color="$white"
                  opacity={0.9}
                >
                  {calculateAge(user?.profile?.date_of_birth)}
                </Text>
              </HStack>
              <HStack alignItems="center" space="xs">
                <Ionicons name="location" size={16} color="white" />
                <Text color="$white" fontSize="$md" opacity={0.9}>
                  {locationString}
                </Text>
              </HStack>
            </VStack>
          </Box>
        </Box>

        {/* Content Section */}
        <VStack space="md" px="$4" pt="$6">
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
            <Heading size="lg" color="#2D3748" mb="$3" fontWeight="$bold">
              About Me
            </Heading>
            <Text
              size="md"
              color="#4A5568"
              lineHeight="$lg"
              fontWeight="$normal"
            >
              {user?.profile?.bio || "No bio provided yet."}
            </Text>
          </Box>

          <Divider bg="#E2E8F0" />

          {/* Basic Info Section */}
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
            <Heading size="lg" color="#2D3748" mb="$4" fontWeight="$bold">
              Basic Information
            </Heading>
            <VStack space="lg">
              <HStack justifyContent="space-between" alignItems="center">
                <Text size="md" color="#718096" fontWeight="$medium">💼 Profession</Text>
                <Text size="md" color="#2D3748" fontWeight="$semibold">
                  {user?.profile?.profession || "Not specified"}
                </Text>
              </HStack>
              <HStack justifyContent="space-between" alignItems="center">
                <Text size="md" color="#718096" fontWeight="$medium">🌍 Location</Text>
                <Text size="md" color="#2D3748" fontWeight="$semibold">
                  {locationString}
                </Text>
              </HStack>
              <HStack justifyContent="space-between" alignItems="center">
                <Text size="md" color="#718096" fontWeight="$medium">👤 Gender</Text>
                <Text size="md" color="#2D3748" fontWeight="$semibold" textTransform="capitalize">
                  {user?.profile?.gender || "Not specified"}
                </Text>
              </HStack>
              <HStack justifyContent="space-between" alignItems="center">
                <Text size="md" color="#718096" fontWeight="$medium">🎂 Age</Text>
                <Text size="md" color="#2D3748" fontWeight="$semibold">
                  {calculateAge(user?.profile?.date_of_birth) || "Not specified"}
                </Text>
              </HStack>
              <HStack justifyContent="space-between" alignItems="center">
                <Text size="md" color="#718096" fontWeight="$medium">💕 Looking for</Text>
                <Text size="md" color="#2D3748" fontWeight="$semibold" textTransform="capitalize">
                  {user?.profile?.looking_for || "Not specified"}
                </Text>
              </HStack>
              <HStack justifyContent="space-between" alignItems="center">
                <Text size="md" color="#718096" fontWeight="$medium">💍 Status</Text>
                <Text size="md" color="#2D3748" fontWeight="$semibold" textTransform="capitalize">
                  {user?.profile?.relationship_status || user?.profile?.marital_status || "Single"}
                </Text>
              </HStack>
            </VStack>
          </Box>

          <Divider bg="#E2E8F0" />

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
            <Heading size="lg" color="#2D3748" mb="$4" fontWeight="$bold">
              Interests
            </Heading>
            {interests && interests.length > 0 ? (
              <HStack space="sm" flexWrap="wrap">
                {interests.map((interest: string, index: number) => (
                  <Badge
                    key={index}
                    variant="outline"
                    size="md"
                    mb="$3"
                    mr="$2"
                    borderColor="#FF6B9D"
                    bg="#FFF0F5"
                    borderRadius="$full"
                    px="$4"
                    py="$2"
                  >
                    <BadgeText color="#FF6B9D" fontWeight="$medium" fontSize="$sm">
                      {getInterestEmoji(interest)} {interest.charAt(0).toUpperCase() + interest.slice(1)}
                    </BadgeText>
                  </Badge>
                ))}
              </HStack>
            ) : (
              <Text size="md" color="#4A5568">
                No interests specified yet.
              </Text>
            )}
          </Box>

          <Divider bg="#E2E8F0" />

          {/* All Photos Section - Prettier Grid Layout */}
          {user?.photos && user.photos.length > 0 && (
            <Box
              bg="$white"
              p="$5"
              borderRadius="$xl"
              shadowColor="$backgroundLight300"
              shadowOffset={{ width: 0, height: 2 }}
              shadowOpacity={0.1}
              shadowRadius={4}
              elevation={3}
            >
              <HStack alignItems="center" justifyContent="space-between" mb="$4">
                <Heading size="lg" color="#2D3748" fontWeight="$bold">
                  More Photos
                </Heading>
                <Badge
                  size="sm"
                  variant="solid"
                  bg="$primary600"
                  borderRadius="$full"
                >
                  <BadgeText color="$white" fontSize="$xs" fontWeight="$bold">
                    {user.photos.length} Photo{user.photos.length !== 1 ? 's' : ''}
                  </BadgeText>
                </Badge>
              </HStack>

              <HStack flexWrap="wrap" gap="$2" justifyContent="space-between">
                {user.photos.map((photo, index) => (
                  <Box
                    key={photo.id}
                    width="48%"
                    aspectRatio={1}
                    borderRadius="$xl"
                    overflow="hidden"
                    shadowColor="$backgroundLight300"
                    shadowOffset={{ width: 0, height: 4 }}
                    shadowOpacity={0.1}
                    shadowRadius={8}
                    elevation={2}
                    mb="$3"
                    position="relative"
                  >
                    <Image
                      source={{ uri: photo.medium_url || photo.image_url || photo.thumbnail_url }}
                      alt={`Photo ${index + 1}`}
                      style={{
                        width: '100%',
                        height: '100%',
                      }}
                      resizeMode="cover"
                    />
                    
                    {/* Photo number overlay */}
                    <Box
                      position="absolute"
                      top="$2"
                      right="$2"
                      bg="rgba(0,0,0,0.6)"
                      borderRadius="$full"
                      px="$2"
                      py="$1"
                      minWidth="$6"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <Text color="$white" fontSize="$xs" fontWeight="$bold">
                        {index + 1}
                      </Text>
                    </Box>

                    {/* Main photo indicator */}
                    {photo.is_profile_photo && (
                      <Box
                        position="absolute"
                        bottom="$2"
                        left="$2"
                        bg="$primary600"
                        borderRadius="$md"
                        px="$2"
                        py="$1"
                      >
                        <HStack alignItems="center" space="xs">
                          <Ionicons name="star" size={12} color="white" />
                          <Text color="$white" fontSize="$xs" fontWeight="$bold">
                            MAIN
                          </Text>
                        </HStack>
                      </Box>
                    )}
                  </Box>
                ))}
              </HStack>
            </Box>
          )}
        </VStack>
      </ScrollView>
    </Box>
  );
}