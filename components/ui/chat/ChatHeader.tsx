import React from "react";
import { Pressable, Animated } from "react-native";
import { Box, HStack, VStack, Text, Avatar, AvatarImage } from "@gluestack-ui/themed";
import { Ionicons } from "@expo/vector-icons";
import { Chat } from "@/services/chats-service";

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
  getProfilePhotoUrl,
}) => {
  return (
    <Box
      px="$4"
      py="$3"
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
          <Box position="relative">
            <Avatar size="md">
              <AvatarImage
                source={{ uri: getProfilePhotoUrl(chat.other_user) || "https://via.placeholder.com/50" }}
                alt={`${chat.other_user.profile?.first_name || 'User'}'s profile`}
              />
            </Avatar>
            {/* Online Status Indicator */}
            {isUserOnline(chat.other_user.last_active_at) && (
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
              {chat.other_user.profile ?
                `${chat.other_user.profile.first_name} ${chat.other_user.profile.last_name}` :
                "User"}
            </Text>
            {isTyping && typingUser ? (
              <TypingIndicator />
            ) : isLoadingFromAPI ? (
              <Text
                color="#6B7280"
                fontSize="$xs"
                fontStyle="italic"
              >
                Loading...
              </Text>
            ) : isSending ? (
              <Text
                color="#6B7280"
                fontSize="$xs"
                fontStyle="italic"
              >
                Sending...
              </Text>
            ) : (
              <HStack alignItems="center" space="xs">
                {isUserOnline(chat.other_user.last_active_at) && (
                  <Box
                    width={6}
                    height={6}
                    borderRadius={3}
                    bg="#10B981"
                  />
                )}
                <Text
                  color={isUserOnline(chat.other_user.last_active_at) ? "#10B981" : "#6B7280"}
                  fontSize="$xs"
                  fontWeight={isUserOnline(chat.other_user.last_active_at) ? "$medium" : "$normal"}
                >
                  {formatLastActive(chat.other_user.last_active_at)}
                </Text>
              </HStack>
            )}
          </VStack>
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

export default ChatHeader;
