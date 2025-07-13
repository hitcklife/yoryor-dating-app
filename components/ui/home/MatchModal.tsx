import React, { useEffect, useRef } from 'react';
import { StyleSheet, Animated, Dimensions, TouchableOpacity, Image } from 'react-native';
import {
  Box,
  Text,
  VStack,
  HStack,
  Button,
  ButtonText,
  Heading,
  Center,
  Badge,
  BadgeText,
  Divider
} from '@gluestack-ui/themed';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

// Updated interface to match the API response
interface MatchData {
  like: {
    user_id: number;
    liked_user_id: string;
    updated_at: string;
    created_at: string;
    id: number;
  };
  is_match: boolean;
  match: {
    user_id: number;
    matched_user_id: string;
    updated_at: string;
    created_at: string;
    id: number;
  };
  chat: {
    type: string;
    is_active: boolean;
    last_activity_at: string;
    updated_at: string;
    created_at: string;
    id: number;
  };
  liked_user: {
    type: string;
    id: string;
    attributes: {
      email: string;
      phone: string;
      profile_photo_path: string;
      registration_completed: boolean;
      is_private: boolean;
      created_at: string;
      updated_at: string;
      age: number;
      full_name: string;
      is_online: boolean;
      last_active_at: string;
    };
    included: Array<{
      type: string;
      id: string;
      attributes: any;
    }>;
  };
}

interface MatchModalProps {
  visible: boolean;
  matchData: MatchData | null;
  onClose: () => void;
  onKeepSwiping: () => void;
}

const MatchModal = ({
  visible,
  matchData,
  onClose,
  onKeepSwiping
}: MatchModalProps) => {
  const router = useRouter();
  const { height, width } = Dimensions.get('window');
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const heartsAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Complex animation sequence
      Animated.sequence([
        // Initial slide up and fade in
        Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
        // Scale up the content
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        // Animate hearts
        Animated.timing(heartsAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Slide down and fade out animation
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: height,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(heartsAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, fadeAnim, scaleAnim, heartsAnim, height]);

  if (!visible || !matchData) return null;

  // Extract data from API response
  const likedUser = matchData.liked_user;
  const profile = likedUser.included.find(item => item.type === 'profiles');
  const country = likedUser.included.find(item => item.type === 'countries');
  const photos = likedUser.included.filter(item => item.type === 'photos');

  const userName = likedUser.attributes.full_name.split(' ')[0];
  const userAge = likedUser.attributes.age;
  const isOnline = likedUser.attributes.is_online;

  // Get profile photo URL
  const getProfilePhotoUrl = () => {
    const profilePhoto = photos.find(photo => photo.attributes.is_profile_photo);
    if (profilePhoto) {
      const photoUrl = profilePhoto.attributes.medium_url || profilePhoto.attributes.original_url;
      return photoUrl.startsWith('http') ? photoUrl : `https://incredibly-evident-hornet.ngrok-free.app${photoUrl}`;
    }
    return null;
  };

  // Handle send message - navigate to chat
  const handleSendMessage = () => {
    onClose();
    router.push(`/chat/${matchData.chat.id}`);
  };

  // Calculate mutual interests count (dummy for now)
  const mutualInterests = profile?.attributes.interests?.slice(0, 2) || ['travel', 'music'];

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <LinearGradient
        colors={[
          'rgba(143, 59, 191, 0.95)', // Primary purple
          'rgba(212, 179, 224, 0.95)', // Lighter purple
          'rgba(255, 255, 255, 0.98)'  // Almost white at bottom
        ]}
        locations={[0, 0.6, 1]}
        style={styles.gradient}
      >
        <Animated.View
          style={[
            styles.contentContainer,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Box flex={1} px="$6" py="$8" justifyContent="center">
            {/* Close button */}
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Box
                bg="rgba(255, 255, 255, 0.3)"
                borderRadius="$full"
                width={40}
                height={40}
                justifyContent="center"
                alignItems="center"
                borderWidth="$1"
                borderColor="rgba(255, 255, 255, 0.5)"
              >
                <Ionicons name="close" size={20} color="white" />
              </Box>
            </TouchableOpacity>

            {/* Floating hearts animation */}
            <Animated.View
              style={[
                styles.heartsContainer,
                {
                  opacity: heartsAnim,
                  transform: [
                    {
                      translateY: heartsAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [50, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Text style={[styles.heart, { left: '20%', animationDelay: '0s' }]}>💖</Text>
              <Text style={[styles.heart, { right: '25%', animationDelay: '0.2s' }]}>💕</Text>
              <Text style={[styles.heart, { left: '70%', animationDelay: '0.4s' }]}>💗</Text>
              <Text style={[styles.heart, { right: '10%', animationDelay: '0.6s' }]}>💝</Text>
            </Animated.View>

            <VStack space="xl" alignItems="center" justifyContent="center" flex={1}>
              {/* Match celebration header */}
              <Center mb="$1">
                <Heading size="4xl" color="white" fontWeight="$bold" textAlign="center" mb="$1">
                  It's a Match!
                </Heading>

                <Text color="rgba(255, 255, 255, 0.9)" size="lg" textAlign="center" maxWidth="$80">
                  You and {userName} both swiped right ✨
                </Text>
              </Center>

              {/* User photos in a card layout */}
              <Box
                bg="white"
                borderRadius="$3xl"
                p="$6"
                mb="$12"
                shadowColor="#000"
                shadowOffset={{ width: 0, height: 10 }}
                shadowOpacity={0.3}
                shadowRadius={20}
                elevation={10}
                width="100%"
                maxWidth={320}
              >
                {/* Profile Image */}
                <Center mb="$4">
                  <Box
                    position="relative"
                    width={180}
                    height={180}
                    borderRadius="$full"
                    overflow="hidden"
                    borderWidth={4}
                    borderColor="$primary200"
                    shadowColor="$primary500"
                    shadowOffset={{ width: 0, height: 4 }}
                    shadowOpacity={0.3}
                    shadowRadius={8}
                    elevation={5}
                  >
                    <Image
                      source={{
                        uri: getProfilePhotoUrl() || "https://via.placeholder.com/180x180?text=No+Photo"
                      }}
                      style={styles.userImage}
                      resizeMode="cover"
                    />
                    {/* Online indicator */}
                    {isOnline && (
                      <Box
                        position="absolute"
                        bottom={10}
                        right={10}
                        width={20}
                        height={20}
                        borderRadius="$full"
                        bg="$success500"
                        borderWidth={2}
                        borderColor="white"
                      />
                    )}
                  </Box>
                </Center>

                {/* User info */}
                <Center mb="$4">
                  <Heading size="2xl" color="$primary700" fontWeight="$bold" mb="$1">
                    {userName}, {userAge}
                  </Heading>

                  <HStack space="xs" alignItems="center" mb="$2">
                    <Ionicons name="location" size={14} color="#8F3BBF" />
                    <Text color="$primary600" size="sm" fontWeight="$medium">
                      {profile?.attributes.city}, {profile?.attributes.state}
                      {country && ` ${country.attributes.flag}`}
                    </Text>
                  </HStack>

                  {profile?.attributes.profession && (
                    <Badge bg="$primary100" borderRadius="$full" px="$3" py="$1">
                      <BadgeText color="$primary700" size="xs" fontWeight="$bold">
                        {profile.attributes.profession}
                      </BadgeText>
                    </Badge>
                  )}
                </Center>

                {/* Quick info */}
                <VStack space="sm" mb="$4">
                  <HStack justifyContent="center" alignItems="center">
                    <HStack space="xs">
                      {mutualInterests.map((interest: string, index: number) => (
                        <Badge key={index} bg="$primary50" borderRadius="$full" px="$2" py="$1">
                          <BadgeText color="$primary600" size="2xs">
                            {interest}
                          </BadgeText>
                        </Badge>
                      ))}
                    </HStack>
                  </HStack>
                </VStack>

                <Divider bg="$primary100" mb="$5" />

                {/* Action buttons - Made larger */}
                <VStack space="md">
                  <Button
                    bg="$primary500"
                    borderRadius="$2xl"
                    py="$5"
                    px="$8"
                    onPress={handleSendMessage}
                    $pressed={{
                      bg: "$primary600",
                      transform: [{ scale: 0.98 }]
                    }}
                    shadowColor="$primary500"
                    shadowOffset={{ width: 0, height: 4 }}
                    shadowOpacity={0.3}
                    shadowRadius={8}
                    elevation={4}
                    minHeight={60}
                  >
                    <HStack space="sm" alignItems="center">
                      <Ionicons name="chatbubble-ellipses" size={20} color="white" />
                      <ButtonText color="white" fontWeight="$bold" fontSize="$xl">
                        Send Message
                      </ButtonText>
                    </HStack>
                  </Button>

                  <Button
                    variant="outline"
                    borderColor="$primary300"
                    borderWidth="$2"
                    borderRadius="$2xl"
                    py="$4"
                    px="$8"
                    mb="$6"
                    onPress={onKeepSwiping}
                    $pressed={{
                      bg: "$primary50",
                      transform: [{ scale: 0.98 }]
                    }}
                    minHeight={56}
                  >
                    <HStack space="sm" alignItems="center">
                      <Ionicons name="refresh" size={18} color="#8F3BBF" />
                      <ButtonText color="$primary600" fontWeight="$semibold" fontSize="$lg">
                        Keep Swiping
                      </ButtonText>
                    </HStack>
                  </Button>
                </VStack>
              </Box>
            </VStack>
          </Box>
        </Animated.View>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  gradient: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  contentContainer: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
  },
  heartsContainer: {
    position: 'absolute',
    top: 120,
    left: 0,
    right: 0,
    height: 100,
    zIndex: 1,
  },
  heart: {
    position: 'absolute',
    fontSize: 24,
    top: 0,
  },
  userImage: {
    width: '100%',
    height: '100%',
  },
});

export default MatchModal;
