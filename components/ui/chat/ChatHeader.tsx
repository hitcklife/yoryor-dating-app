import React from "react";
import { Pressable } from "react-native";
import { Box, HStack, VStack, Text, Avatar, AvatarImage } from "@gluestack-ui/themed";
import { Ionicons } from "@expo/vector-icons";
import { Chat } from "@/services/chats-service";

interface ChatHeaderProps {
  chat: Chat;
  isTyping: boolean;
  typingUser: string | null;
  formatLastActive: (timestamp: string) => string;
  onGoBack: () => void;
  onPhoneCall: () => void;
  onVideoCall: () => void;
  onOpenOptions: () => void;
  getProfilePhotoUrl: (user: any) => string | null;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  chat,
  isTyping,
  typingUser,
  formatLastActive,
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
          <Avatar size="md">
            <AvatarImage
              source={{ uri: getProfilePhotoUrl(chat.other_user) || "https://via.placeholder.com/50" }}
              alt={`${chat.other_user.profile?.first_name || 'User'}'s profile`}
            />
          </Avatar>
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
              <Text
                color="#6B7280"
                fontSize="$xs"
                fontStyle="italic"
              >
                typing...
              </Text>
            ) : (
              <Text
                color="#6B7280"
                fontSize="$xs"
              >
                {formatLastActive(chat.other_user.last_active_at)}
              </Text>
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
