import React, { useMemo } from "react";
import { Pressable, Animated } from "react-native";
import { Box, HStack, VStack, Text, Avatar, AvatarImage } from "@gluestack-ui/themed";
import { Ionicons } from "@expo/vector-icons";
import { Chat } from "@/services/chats-service";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProfileImage } from "@/components/ui/CachedImage";

interface ChatHeaderProps {
  chat: Chat;
  isTyping: boolean;
  typingUser: string | null;
  isLoadingFromAPI?: boolean;
  isSending?: boolean;
  formatLastActive: (timestamp: string) => string;
  isUserOnline: (timestamp: string | null | undefined) => boolean;
  onGoBack: () => void;
  onPhoneCall: () => void;
  onVideoCall: () => void;
  onOpenOptions: () => void;
  onOpenUserProfile: () => void;
  getProfilePhotoUrl: (user: any) => string | null;
}

// Animated Typing Indicator Component
const TypingIndicator: React.FC = () => {
  const dot1 = React.useRef(new Animated.Value(0)).current;
  const dot2 = React.useRef(new Animated.Value(0)).current;
  const dot3 = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const animateDots = () => {
      const duration = 600;
      const delay = 200;

      Animated.loop(
        Animated.sequence([
          Animated.stagger(delay, [
            Animated.timing(dot1, {
              toValue: 1,
              duration: duration,
              useNativeDriver: true,
            }),
            Animated.timing(dot2, {
              toValue: 1,
              duration: duration,
              useNativeDriver: true,
            }),
            Animated.timing(dot3, {
              toValue: 1,
              duration: duration,
              useNativeDriver: true,
            }),
          ]),
          Animated.stagger(delay, [
            Animated.timing(dot1, {
              toValue: 0,
              duration: duration,
              useNativeDriver: true,
            }),
            Animated.timing(dot2, {
              toValue: 0,
              duration: duration,
              useNativeDriver: true,
            }),
            Animated.timing(dot3, {
              toValue: 0,
              duration: duration,
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();
    };

    animateDots();
  }, [dot1, dot2, dot3]);

  return (
    <HStack alignItems="center" space="xs">
      <Text color="#6B7280" fontSize="$xs" fontStyle="italic">
        typing
      </Text>
      <HStack space="xs" alignItems="center">
        <Animated.View
          style={{
            opacity: dot1,
            transform: [
              {
                scale: dot1.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1.2],
                }),
              },
            ],
          }}
        >
          <Box
            width={3}
            height={3}
            borderRadius={1.5}
            bg="#6B7280"
          />
        </Animated.View>
        <Animated.View
          style={{
            opacity: dot2,
            transform: [
              {
                scale: dot2.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1.2],
                }),
              },
            ],
          }}
        >
          <Box
            width={3}
            height={3}
            borderRadius={1.5}
            bg="#6B7280"
          />
        </Animated.View>
        <Animated.View
          style={{
            opacity: dot3,
            transform: [
              {
                scale: dot3.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1.2],
                }),
              },
            ],
          }}
        >
          <Box
            width={3}
            height={3}
            borderRadius={1.5}
            bg="#6B7280"
          />
        </Animated.View>
      </HStack>
    </HStack>
  );
};

const ChatHeader: React.FC<ChatHeaderProps> = ({
  chat,
  isTyping,
  typingUser,
  isLoadingFromAPI = false,
  isSending,
  formatLastActive,
  isUserOnline,
  onGoBack,
  onPhoneCall,
  onVideoCall,
  onOpenOptions,
  onOpenUserProfile,
  getProfilePhotoUrl,
}) => {
  const insets = useSafeAreaInsets();
  // Memoize user data and fallback values
  const userData = useMemo(() => {
    const otherUser = chat?.other_user || {};
    const profile = otherUser.profile || {};
    return {
      name: profile.first_name && profile.last_name
        ? `${profile.first_name} ${profile.last_name}`
        : 'User',
      photoUrl: getProfilePhotoUrl(otherUser) || 'https://via.placeholder.com/50',
      isOnline: isUserOnline(otherUser.last_active_at),
      lastActive: otherUser.last_active_at
        ? formatLastActive(otherUser.last_active_at)
        : 'Last seen recently',
    };
  }, [chat, getProfilePhotoUrl, isUserOnline, formatLastActive]);

  // Memoize status text
  const statusText = useMemo(() => {
    if (isTyping && typingUser) {
      return { type: 'typing' as const, text: null };
    }
    if (isLoadingFromAPI) {
      return { type: 'loading' as const, text: 'Loading...' };
    }
    if (isSending) {
      return { type: 'sending' as const, text: 'Sending...' };
    }
    return { type: 'normal' as const, text: userData.lastActive };
  }, [isTyping, typingUser, isLoadingFromAPI, isSending, userData.lastActive]);

  return (
    <Box
      px="$4"
      py="$3"
      pt={insets.top + 2} // Reduced to 2 to move header much higher
      bg="#FFFFFF"
      borderBottomWidth={1}
      borderBottomColor="#E5E7EB"
    >
      <HStack alignItems="center" justifyContent="space-between">
        <HStack alignItems="center" space="md">
          <Pressable onPress={onGoBack}>
            <Ionicons
              name="chevron-back"
              size={24}
              color="#333333"
            />
          </Pressable>
          <Pressable onPress={onOpenUserProfile}>
            <HStack alignItems="center" space="md">
              <Box position="relative">
                <ProfileImage
                  uri={userData.photoUrl}
                  size={40}
                  userId={chat?.other_user?.id}
                  fallbackUri="https://via.placeholder.com/40"
                />
                {/* Online Status Indicator */}
                {userData.isOnline && (
                  <Box
                    position="absolute"
                    bottom={2}
                    right={2}
                    width={12}
                    height={12}
                    borderRadius={6}
                    bg="#10B981"
                    borderWidth={2}
                    borderColor="#FFFFFF"
                  />
                )}
              </Box>
              <VStack>
                <Text
                  color="#1F2937"
                  fontSize="$lg"
                  fontWeight="$semibold"
                >
                  {userData.name}
                </Text>
                {statusText.type === 'typing' ? (
                  <TypingIndicator />
                ) : statusText.type === 'loading' || statusText.type === 'sending' ? (
                  <Text
                    color="#6B7280"
                    fontSize="$xs"
                    fontStyle="italic"
                  >
                    {statusText.text}
                  </Text>
                ) : (
                  <HStack alignItems="center" space="xs">
                    {userData.isOnline && (
                      <Box
                        width={6}
                        height={6}
                        borderRadius={3}
                        bg="#10B981"
                      />
                    )}
                    <Text
                      color={userData.isOnline ? "#10B981" : "#6B7280"}
                      fontSize="$xs"
                      fontWeight={userData.isOnline ? "$medium" : "$normal"}
                    >
                      {statusText.text}
                    </Text>
                  </HStack>
                )}
              </VStack>
            </HStack>
          </Pressable>
        </HStack>
        <HStack space="md">
          <Pressable onPress={onPhoneCall}>
            <Ionicons
              name="call-outline"
              size={24}
              color="#333333"
            />
          </Pressable>
          <Pressable onPress={onVideoCall}>
            <Ionicons
              name="videocam-outline"
              size={24}
              color="#333333"
            />
          </Pressable>
          <Pressable onPress={onOpenOptions}>
            <Ionicons
              name="ellipsis-vertical"
              size={24}
              color="#333333"
            />
          </Pressable>
        </HStack>
      </HStack>
    </Box>
  );
};

export default React.memo(ChatHeader);
