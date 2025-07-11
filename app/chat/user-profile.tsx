import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  FlatList,
  Dimensions,
  ScrollView,
  Alert,
  ActivityIndicator,
  Pressable,
  StatusBar,
  ImageBackground,
  Platform,
  Animated,
} from "react-native";

import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import {
  Box,
  Text,
  SafeAreaView,
  Center,
  HStack,
  VStack,
  Button,
  Avatar,
  AvatarImage,
  Divider,
} from "@gluestack-ui/themed";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, formatDistanceToNow } from "date-fns";
import { Image } from "@gluestack-ui/themed";
import { LinearGradient } from 'expo-linear-gradient';
import { OtherUser, Profile, ProfilePhoto, Message } from "@/services/chats-service";
import { getProfilePhotoUrl, getCurrentUserId } from "@/services/chats-service";
import { chatsService } from "@/services/chats-service";
import { CachedImage } from "@/components/ui/CachedImage";
import ImageGallery from "@/components/ui/chat/ImageGallery";

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Export screen options to ensure no navigation header is shown
export const options = {
  headerShown: false,
};

interface UserProfileProps {
  userId: number;
  chatId: number;
}

interface SharedMedia {
  id: number;
  type: 'image' | 'video' | 'voice' | 'file';
  url: string;
  thumbnail?: string;
  messageId: number;
  sentAt: string;
  senderId: number;
  isMine: boolean;
}

export default function UserProfileScreen() {
  // Navigation
  const params = useLocalSearchParams();
  const userId = params?.userId ? parseInt(params.userId as string) : 0;
  const chatId = params?.chatId ? parseInt(params.chatId as string) : 0;
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Refs
  const imageGalleryRef = useRef<FlatList>(null);
  const sharedMediaRef = useRef<FlatList>(null);

  // States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<OtherUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profilePhotos, setProfilePhotos] = useState<ProfilePhoto[]>([]);
  const [sharedMedia, setSharedMedia] = useState<SharedMedia[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showFullGallery, setShowFullGallery] = useState(false);
  const [loadingSharedMedia, setLoadingSharedMedia] = useState(false);
  const [activeTab, setActiveTab] = useState('Media');

  // Animated values for smooth transitions
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const imageScale = scrollY.interpolate({
    inputRange: [-100, 0],
    outputRange: [1.1, 1],
    extrapolate: 'clamp',
  });
  const imageTranslateY = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [0, -50],
    extrapolate: 'clamp',
  });

  // Component mounted state for cleanup
  const isMounted = useRef(true);

  // Load user data
  useEffect(() => {
    const loadUserData = async () => {
      try {
        console.log('Loading user profile data for user:', userId);
        
        if (!userId || !chatId) {
          setError('Invalid user or chat ID');
          setLoading(false);
          return;
        }

        // Get chat details to extract user info
        const chatResponse = await chatsService.getChatDetails(chatId, 1);
        
        if (chatResponse?.data?.chat) {
          const chat = chatResponse.data.chat;
          const otherUser = chat.other_user;
          
          if (otherUser && otherUser.id === userId) {
            setUser(otherUser);
            setProfile(otherUser.profile);
            
            // Load profile photos if available
            if (otherUser.profile_photo) {
              // For demonstration, create multiple photos from the same image
              // In a real app, you would get multiple photos from the API
              const basePhoto = otherUser.profile_photo;
              const mockPhotos: ProfilePhoto[] = [
                basePhoto,
                // Create variations of the same photo for demo purposes
                {
                  ...basePhoto,
                  id: basePhoto.id + 1,
                  original_url: basePhoto.original_url,
                  thumbnail_url: basePhoto.thumbnail_url,
                  medium_url: basePhoto.medium_url,
                },
                {
                  ...basePhoto,
                  id: basePhoto.id + 2,
                  original_url: basePhoto.original_url,
                  thumbnail_url: basePhoto.thumbnail_url,
                  medium_url: basePhoto.medium_url,
                },
                {
                  ...basePhoto,
                  id: basePhoto.id + 3,
                  original_url: basePhoto.original_url,
                  thumbnail_url: basePhoto.thumbnail_url,
                  medium_url: basePhoto.medium_url,
                },
              ];
              setProfilePhotos(mockPhotos);
            }
            
            console.log('User data loaded successfully');
          } else {
            setError('User not found in this chat');
          }
        } else {
          setError('Failed to load chat data');
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        setError('Failed to load user profile');
      } finally {
        setLoading(false);
      }
    };

    loadUserData();

    return () => {
      isMounted.current = false;
    };
  }, [userId, chatId]);

  // Load shared media
  useEffect(() => {
    const loadSharedMedia = async () => {
      if (!chatId || !userId) return;

      try {
        setLoadingSharedMedia(true);
        
        // Get current user ID
        const currentUserId = await getCurrentUserId();
        if (!currentUserId) return;

        // Load messages with media
        const response = await chatsService.getChatDetails(chatId, 1);
        
        if (response?.data?.messages) {
          const mediaMessages = response.data.messages.filter((msg: Message) => {
            return msg.message_type === 'image' || 
                   msg.message_type === 'video' || 
                   msg.message_type === 'voice' || 
                   msg.message_type === 'file';
          });

          const sharedMediaItems: SharedMedia[] = mediaMessages.map((msg: Message) => ({
            id: msg.id,
            type: msg.message_type as 'image' | 'video' | 'voice' | 'file',
            url: msg.media_url || '',
            thumbnail: msg.thumbnail_url || undefined,
            messageId: msg.id,
            sentAt: msg.sent_at,
            senderId: msg.sender_id,
            isMine: msg.sender_id === currentUserId
          }));

          setSharedMedia(sharedMediaItems);
          console.log('Shared media loaded:', sharedMediaItems.length, 'items');
        }
      } catch (error) {
        console.error('Error loading shared media:', error);
      } finally {
        setLoadingSharedMedia(false);
      }
    };

    loadSharedMedia();
  }, [chatId, userId]);

  // Handle image gallery navigation
  const handleImageChange = useCallback((index: number) => {
    setCurrentImageIndex(index);
    if (imageGalleryRef.current) {
      imageGalleryRef.current.scrollToIndex({ index, animated: true });
    }
  }, []);



  // Open full gallery
  const openFullGallery = useCallback(() => {
    setShowFullGallery(true);
  }, []);

  // Close full gallery
  const closeFullGallery = useCallback(() => {
    setShowFullGallery(false);
  }, []);

  // Handle shared media item press
  const handleSharedMediaPress = useCallback((item: SharedMedia) => {
    // Navigate back to chat and scroll to the specific message
    router.back();
    // You could implement a callback to scroll to specific message in chat
  }, [router]);

  // Format user age
  const formatAge = useCallback((dateOfBirth: string): string => {
    try {
      const birthDate = new Date(dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        return `${age - 1} years`;
      }
      return `${age} years`;
    } catch (error) {
      return 'Unknown';
    }
  }, []);

  // Format last active time
  const formatLastActive = useCallback((timestamp: string | null | undefined): string => {
    if (!timestamp) return "Last seen recently";
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return "Last seen recently";
      
      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      
      if (diffInMinutes < 2) {
        return "Online";
      }
      
      return `Last seen ${formatDistanceToNow(date, { addSuffix: true })}`;
    } catch (error) {
      return "Last seen recently";
    }
  }, []);

  // Check if user is online
  const isUserOnline = useCallback((timestamp: string | null | undefined): boolean => {
    if (!timestamp) return false;
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return false;
      
      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      
      return diffInMinutes < 2;
    } catch (error) {
      return false;
    }
  }, []);

  // Render profile photo item
  const renderProfilePhoto = useCallback(({ item, index }: { item: ProfilePhoto; index: number }) => (
    <Box width={screenWidth} height={screenHeight * 0.6} justifyContent="center" alignItems="center">
      <CachedImage
        uri={item.original_url}
        type="profile"
        style={{
          width: screenWidth * 0.9,
          height: screenHeight * 0.5,
          borderRadius: 12,
        }}
        resizeMode="cover"
      />
    </Box>
  ), []);

  // Render shared media item
  const renderSharedMediaItem = useCallback(({ item }: { item: SharedMedia }) => (
    <Pressable onPress={() => handleSharedMediaPress(item)}>
      <Box width={100} height={100} borderRadius={8} overflow="hidden" mr="$2" mb="$2">
        {item.type === 'image' ? (
          <CachedImage
            uri={item.url}
            type="chat_media"
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : item.type === 'video' ? (
          <Box flex={1} bg="#F3F4F6" justifyContent="center" alignItems="center">
            <Ionicons name="videocam" size={24} color="#6B7280" />
          </Box>
        ) : item.type === 'voice' ? (
          <Box flex={1} bg="#F3F4F6" justifyContent="center" alignItems="center">
            <Ionicons name="mic" size={24} color="#6B7280" />
          </Box>
        ) : (
          <Box flex={1} bg="#F3F4F6" justifyContent="center" alignItems="center">
            <Ionicons name="document" size={24} color="#6B7280" />
          </Box>
        )}
      </Box>
    </Pressable>
  ), [handleSharedMediaPress]);

  // Handle go back
  const handleGoBack = useCallback(() => {
    router.back();
  }, [router]);

  // Handle call user
  const handleCallUser = useCallback(() => {
    Alert.alert("Call", "Call functionality would be implemented here");
  }, []);

  // Handle video call user
  const handleVideoCallUser = useCallback(() => {
    Alert.alert("Video Call", "Video call functionality would be implemented here");
  }, []);

  // Handle block user
  const handleBlockUser = useCallback(() => {
    if (!user || !profile) return;

    const userName = profile.first_name && profile.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : "User";

    Alert.alert(
      "Block User",
      `Are you sure you want to block ${userName}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Block", 
          style: "destructive",
          onPress: () => {
            Alert.alert("Blocked", `${userName} has been blocked.`);
            router.back();
          }
        }
      ]
    );
  }, [user, profile, router]);

  // Loading state
  if (loading) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center" bg="#FFFFFF">
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text mt="$2">Loading profile...</Text>
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center" bg="#FFFFFF">
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text color="#EF4444" mt="$2" textAlign="center">{error}</Text>
        <Button onPress={handleGoBack} mt="$4">
          <Text color="#FFFFFF">Go Back</Text>
        </Button>
      </Box>
    );
  }

  // User not found state
  if (!user || !profile) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center" bg="#FFFFFF">
        <Text>User not found</Text>
        <Button onPress={handleGoBack} mt="$4">
          <Text color="#FFFFFF">Go Back</Text>
        </Button>
      </Box>
    );
  }

  const userName = profile.first_name && profile.last_name
    ? `${profile.first_name} ${profile.last_name}`
    : 'User';
  const userPhotoUrl = getProfilePhotoUrl(user) || 'https://via.placeholder.com/100';
  const isOnline = isUserOnline(user.last_active_at);
  const lastActive = formatLastActive(user.last_active_at);

  return (
    <Box flex={1} bg="#F8F9FA">
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      {/* Animated Header Overlay */}
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          paddingTop: insets.top,
          opacity: headerOpacity,
        }}
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.2)', 'transparent']}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 12,
            height: 120,
          }}
        >
          <HStack alignItems="center" justifyContent="space-between">
            <HStack alignItems="center" space="md">
              <Pressable
                onPress={handleGoBack}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
              </Pressable>
              <Text color="#FFFFFF" fontSize="$lg" fontWeight="$semibold">
                {userName}
              </Text>
            </HStack>
            <HStack space="sm">
              <Pressable
                onPress={handleCallUser}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="call" size={20} color="#FFFFFF" />
              </Pressable>
              <Pressable
                onPress={handleVideoCallUser}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="videocam" size={20} color="#FFFFFF" />
              </Pressable>
              <Pressable
                onPress={handleBlockUser}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="ellipsis-horizontal" size={20} color="#FFFFFF" />
              </Pressable>
            </HStack>
          </HStack>
        </LinearGradient>
      </Animated.View>

      {/* Fixed Header for when image is not visible */}
      <Box
        position="absolute"
        top={0}
        left={0}
        right={0}
        zIndex={99}
        pt={insets.top}
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.3)', 'transparent']}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 12,
            height: 120,
          }}
        >
          <HStack alignItems="center" justifyContent="space-between">
            <Pressable
              onPress={handleGoBack}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: 'rgba(0,0,0,0.6)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
            </Pressable>
            <HStack space="sm">
              <Pressable
                onPress={handleCallUser}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="call" size={20} color="#FFFFFF" />
              </Pressable>
              <Pressable
                onPress={handleVideoCallUser}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="videocam" size={20} color="#FFFFFF" />
              </Pressable>
              <Pressable
                onPress={handleBlockUser}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="ellipsis-horizontal" size={20} color="#FFFFFF" />
              </Pressable>
            </HStack>
          </HStack>
        </LinearGradient>
      </Box>

      <Animated.ScrollView 
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* Hero Image Section */}
        {profilePhotos.length > 0 && (
          <Animated.View
            style={{
              height: screenHeight * 0.65,
              transform: [
                { scale: imageScale },
                { translateY: imageTranslateY }
              ],
            }}
          >

            
            <FlatList
              ref={imageGalleryRef}
              data={profilePhotos}
              renderItem={({ item, index }) => (
                <Pressable onPress={openFullGallery} style={{ width: screenWidth, height: screenHeight * 0.65 }}>
                  <CachedImage
                    uri={item.original_url}
                    type="profile"
                    style={{
                      width: screenWidth,
                      height: screenHeight * 0.65,
                    }}
                    resizeMode="cover"
                  />
                  {/* Dark gradient overlay for text readability */}
                  <LinearGradient
                    colors={['transparent', 'transparent', 'rgba(0,0,0,0.8)']}
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: 200,
                    }}
                  />
                </Pressable>
              )}
              keyExtractor={(item) => item.id.toString()}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) => {
                const index = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
                setCurrentImageIndex(index);
              }}
            />
              
            {/* Photo Navigation Dots */}
            {profilePhotos.length > 1 && (
              <Box
                position="absolute"
                bottom={screenHeight * 0.65 * 0.2}
                left={0}
                right={0}
                alignItems="center"
              >
                <VStack alignItems="center" space="sm">
                  <Text color="#FFFFFF" fontSize="$xs" fontWeight="$medium" opacity={0.8}>
                    Swipe to see more photos
                  </Text>
                  <HStack space="xs">
                    {profilePhotos.map((_, index) => (
                      <Box
                        key={index}
                        width={currentImageIndex === index ? 24 : 8}
                        height={8}
                        borderRadius={4}
                        bg={currentImageIndex === index ? "#FFFFFF" : "rgba(255,255,255,0.6)"}
                        style={{
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.3,
                          shadowRadius: 2,
                          elevation: 3,
                        }}
                      />
                    ))}
                  </HStack>
                </VStack>
              </Box>
            )}

            {/* User Info Overlay */}
            <Box
              position="absolute"
              bottom={0}
              left={0}
              right={0}
              p="$6"
              pb="$8"
            >
              <VStack space="sm">
                <HStack alignItems="flex-end" space="md">
                  <VStack flex={1}>
                    <Text color="#FFFFFF" fontSize="$2xl" fontWeight="$bold" lineHeight="$2xl">
                      {userName}
                    </Text>
                    <HStack alignItems="center" space="xs" mt="$1">
                      {isOnline && (
                        <Box width={8} height={8} borderRadius={4} bg="#4ADE80" />
                      )}
                      <Text
                        color={isOnline ? "#4ADE80" : "rgba(255,255,255,0.8)"}
                        fontSize="$sm"
                        fontWeight="$medium"
                      >
                        {lastActive}
                      </Text>
                    </HStack>
                  </VStack>
                </HStack>
              </VStack>
            </Box>
          </Animated.View>
        )}

        {/* Modern Action Buttons */}
        <Box px="$6" py="$4" bg="#FFFFFF" mb="$2">
          <HStack space="md" justifyContent="space-around">
            <Pressable
              onPress={handleCallUser}
              style={{
                flex: 1,
                backgroundColor: '#007AFF',
                borderRadius: 25,
                paddingVertical: 12,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
              }}
            >
              <Ionicons name="call" size={18} color="#FFFFFF" />
              <Text color="#FFFFFF" fontSize="$sm" fontWeight="$semibold" ml="$2">
                Call
              </Text>
            </Pressable>
            
            <Pressable
              onPress={handleVideoCallUser}
              style={{
                flex: 1,
                backgroundColor: '#34C759',
                borderRadius: 25,
                paddingVertical: 12,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                marginLeft: 8,
              }}
            >
              <Ionicons name="videocam" size={18} color="#FFFFFF" />
              <Text color="#FFFFFF" fontSize="$sm" fontWeight="$semibold" ml="$2">
                Video
              </Text>
            </Pressable>
          </HStack>
        </Box>

        {/* User Details Card */}
        <Box bg="#FFFFFF" mx="$4" borderRadius="$xl" p="$5" mb="$4" 
             style={{
               shadowColor: '#000',
               shadowOffset: { width: 0, height: 2 },
               shadowOpacity: 0.1,
               shadowRadius: 8,
               elevation: 3,
             }}>
          <VStack space="lg">
            {profile.age && (
              <HStack alignItems="center" space="md">
                <Box
                  width={40}
                  height={40}
                  borderRadius={20}
                  bg="#F0F9FF"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Ionicons name="calendar-outline" size={20} color="#0EA5E9" />
                </Box>
                <VStack flex={1}>
                  <Text color="#374151" fontSize="$md" fontWeight="$medium">
                    Age
                  </Text>
                  <Text color="#6B7280" fontSize="$sm">
                    {formatAge(profile.date_of_birth)} old
                  </Text>
                </VStack>
              </HStack>
            )}

            {profile.city && (
              <HStack alignItems="center" space="md">
                <Box
                  width={40}
                  height={40}
                  borderRadius={20}
                  bg="#F0FDF4"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Ionicons name="location-outline" size={20} color="#22C55E" />
                </Box>
                <VStack flex={1}>
                  <Text color="#374151" fontSize="$md" fontWeight="$medium">
                    Location
                  </Text>
                  <Text color="#6B7280" fontSize="$sm">
                    {profile.city}{profile.state ? `, ${profile.state}` : ''}{profile.country?.name ? `, ${profile.country.name}` : ''}
                  </Text>
                </VStack>
              </HStack>
            )}

            {profile.occupation && (
              <HStack alignItems="center" space="md">
                <Box
                  width={40}
                  height={40}
                  borderRadius={20}
                  bg="#FEF3C7"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Ionicons name="briefcase-outline" size={20} color="#F59E0B" />
                </Box>
                <VStack flex={1}>
                  <Text color="#374151" fontSize="$md" fontWeight="$medium">
                    Occupation
                  </Text>
                  <Text color="#6B7280" fontSize="$sm">
                    {profile.occupation}
                  </Text>
                </VStack>
              </HStack>
            )}

            {user.phone && (
              <HStack alignItems="center" space="md">
                <Box
                  width={40}
                  height={40}
                  borderRadius={20}
                  bg="#EDE9FE"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Ionicons name="call-outline" size={20} color="#8B5CF6" />
                </Box>
                <VStack flex={1}>
                  <Text color="#374151" fontSize="$md" fontWeight="$medium">
                    Mobile
                  </Text>
                  <Text color="#007AFF" fontSize="$sm" fontWeight="$medium">
                    {user.phone}
                  </Text>
                </VStack>
              </HStack>
            )}
          </VStack>
        </Box>

        {profile.bio && (
          <Box bg="#FFFFFF" mx="$4" borderRadius="$xl" p="$5" mb="$4"
               style={{
                 shadowColor: '#000',
                 shadowOffset: { width: 0, height: 2 },
                 shadowOpacity: 0.1,
                 shadowRadius: 8,
                 elevation: 3,
               }}>
            <VStack space="md">
              <HStack alignItems="center" space="md">
                <Box
                  width={40}
                  height={40}
                  borderRadius={20}
                  bg="#FDF2F8"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Ionicons name="person-outline" size={20} color="#EC4899" />
                </Box>
                <Text color="#374151" fontSize="$lg" fontWeight="$semibold">
                  About
                </Text>
              </HStack>
              <Text color="#6B7280" fontSize="$md" lineHeight="$lg">
                {profile.bio}
              </Text>
            </VStack>
          </Box>
        )}

        {profile.interests && profile.interests.length > 0 && (
          <Box bg="#FFFFFF" mx="$4" borderRadius="$xl" p="$5" mb="$4"
               style={{
                 shadowColor: '#000',
                 shadowOffset: { width: 0, height: 2 },
                 shadowOpacity: 0.1,
                 shadowRadius: 8,
                 elevation: 3,
               }}>
            <VStack space="md">
              <HStack alignItems="center" space="md">
                <Box
                  width={40}
                  height={40}
                  borderRadius={20}
                  bg="#F0F9FF"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Ionicons name="heart-outline" size={20} color="#0EA5E9" />
                </Box>
                <Text color="#374151" fontSize="$lg" fontWeight="$semibold">
                  Interests
                </Text>
              </HStack>
              <HStack flexWrap="wrap" space="xs">
                {profile.interests.map((interest, index) => (
                  <Box
                    key={index}
                    bg="#F3F4F6"
                    px="$4"
                    py="$2"
                    borderRadius="$full"
                    mb="$2"
                    mr="$2"
                    style={{
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.05,
                      shadowRadius: 3,
                      elevation: 1,
                    }}
                  >
                    <Text color="#374151" fontSize="$sm" fontWeight="$medium">
                      {interest}
                    </Text>
                  </Box>
                ))}
              </HStack>
            </VStack>
          </Box>
        )}

        {/* Telegram-style Tab Section */}
        <Box bg="#FFFFFF" mx="$4" borderRadius="$xl" mb="$4"
             style={{
               shadowColor: '#000',
               shadowOffset: { width: 0, height: 2 },
               shadowOpacity: 0.1,
               shadowRadius: 8,
               elevation: 3,
             }}>
          {/* Tab Navigation */}
          <Box p="$4" pb="$0">
            <HStack space="md" justifyContent="space-around" mb="$4">
              {['Media', 'Files', 'Voice', 'Links'].map((tab) => (
                <Pressable
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    alignItems: 'center',
                    borderBottomWidth: activeTab === tab ? 2 : 0,
                    borderBottomColor: '#007AFF',
                  }}
                >
                  <Text
                    color={activeTab === tab ? "#007AFF" : "#6B7280"}
                    fontSize="$sm"
                    fontWeight={activeTab === tab ? "$semibold" : "$normal"}
                  >
                    {tab}
                  </Text>
                  {tab === 'Media' && sharedMedia.length > 0 && (
                    <Text
                      color={activeTab === tab ? "#007AFF" : "#9CA3AF"}
                      fontSize="$xs"
                      mt="$1"
                    >
                      {sharedMedia.filter(item => item.type === 'image' || item.type === 'video').length}
                    </Text>
                  )}
                </Pressable>
              ))}
            </HStack>
          </Box>

          {/* Tab Content */}
          <Box p="$4" pt="$0">
            {activeTab === 'Media' && (
              <>
                {loadingSharedMedia ? (
                  <Box py="$8" alignItems="center">
                    <ActivityIndicator size="small" color="#007AFF" />
                    <Text color="#6B7280" fontSize="$sm" mt="$2">
                      Loading shared media...
                    </Text>
                  </Box>
                ) : sharedMedia.filter(item => item.type === 'image' || item.type === 'video').length > 0 ? (
                  <FlatList
                    ref={sharedMediaRef}
                    data={sharedMedia.filter(item => item.type === 'image' || item.type === 'video')}
                    renderItem={({ item }) => (
                      <Pressable onPress={() => handleSharedMediaPress(item)}>
                        <Box width={100} height={100} borderRadius={12} overflow="hidden" mr="$2" mb="$2"
                             style={{
                               shadowColor: '#000',
                               shadowOffset: { width: 0, height: 1 },
                               shadowOpacity: 0.1,
                               shadowRadius: 3,
                               elevation: 2,
                             }}>
                          {item.type === 'image' ? (
                            <CachedImage
                              uri={item.url}
                              type="chat_media"
                              style={{ width: '100%', height: '100%' }}
                              resizeMode="cover"
                            />
                          ) : (
                            <Box flex={1} bg="#F3F4F6" justifyContent="center" alignItems="center">
                              <Box
                                position="absolute"
                                width={30}
                                height={30}
                                borderRadius={15}
                                bg="rgba(0,0,0,0.6)"
                                alignItems="center"
                                justifyContent="center"
                              >
                                <Ionicons name="play" size={16} color="#FFFFFF" />
                              </Box>
                              <Ionicons name="videocam" size={24} color="#6B7280" />
                            </Box>
                          )}
                        </Box>
                      </Pressable>
                    )}
                    keyExtractor={(item) => item.id.toString()}
                    numColumns={3}
                    showsVerticalScrollIndicator={false}
                    scrollEnabled={false}
                    contentContainerStyle={{ paddingBottom: 20 }}
                  />
                ) : (
                  <Box py="$8" alignItems="center">
                    <Box
                      width={60}
                      height={60}
                      borderRadius={30}
                      bg="#F3F4F6"
                      alignItems="center"
                      justifyContent="center"
                      mb="$3"
                    >
                      <Ionicons name="images-outline" size={28} color="#9CA3AF" />
                    </Box>
                    <Text color="#6B7280" fontSize="$sm" textAlign="center" mb="$1">
                      No shared media yet
                    </Text>
                    <Text color="#9CA3AF" fontSize="$xs" textAlign="center">
                      Photos and videos you share will appear here
                    </Text>
                  </Box>
                )}
              </>
            )}

            {activeTab === 'Files' && (
              <Box py="$8" alignItems="center">
                <Box
                  width={60}
                  height={60}
                  borderRadius={30}
                  bg="#F3F4F6"
                  alignItems="center"
                  justifyContent="center"
                  mb="$3"
                >
                  <Ionicons name="document-outline" size={28} color="#9CA3AF" />
                </Box>
                <Text color="#6B7280" fontSize="$sm" textAlign="center" mb="$1">
                  No shared files yet
                </Text>
                <Text color="#9CA3AF" fontSize="$xs" textAlign="center">
                  Documents and files you share will appear here
                </Text>
              </Box>
            )}

            {activeTab === 'Voice' && (
              <Box py="$8" alignItems="center">
                <Box
                  width={60}
                  height={60}
                  borderRadius={30}
                  bg="#F3F4F6"
                  alignItems="center"
                  justifyContent="center"
                  mb="$3"
                >
                  <Ionicons name="mic-outline" size={28} color="#9CA3AF" />
                </Box>
                <Text color="#6B7280" fontSize="$sm" textAlign="center" mb="$1">
                  No voice messages yet
                </Text>
                <Text color="#9CA3AF" fontSize="$xs" textAlign="center">
                  Voice messages you share will appear here
                </Text>
              </Box>
            )}

            {activeTab === 'Links' && (
              <Box py="$8" alignItems="center">
                <Box
                  width={60}
                  height={60}
                  borderRadius={30}
                  bg="#F3F4F6"
                  alignItems="center"
                  justifyContent="center"
                  mb="$3"
                >
                  <Ionicons name="link-outline" size={28} color="#9CA3AF" />
                </Box>
                <Text color="#6B7280" fontSize="$sm" textAlign="center" mb="$1">
                  No shared links yet
                </Text>
                <Text color="#9CA3AF" fontSize="$xs" textAlign="center">
                  Links you share will appear here
                </Text>
              </Box>
            )}
          </Box>
        </Box>

        {/* Bottom Spacing */}
        <Box height={60} />
      </Animated.ScrollView>

      {/* Full Screen Image Gallery */}
      <ImageGallery
        images={profilePhotos}
        initialIndex={currentImageIndex}
        isVisible={showFullGallery}
        onClose={closeFullGallery}
      />
    </Box>
  );
} 