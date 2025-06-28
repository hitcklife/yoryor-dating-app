import React, { useState, useEffect } from "react";
import { FlatList, Image, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import {
  Box,
  Text,
  VStack,
  HStack,
  Pressable,
  Badge,
  BadgeText,
  ScrollView,
  Divider,
  Center,
} from "@gluestack-ui/themed";
import { Ionicons } from "@expo/vector-icons";
import { chatsService, Chat, getProfilePhotoUrl } from "@/services/chats-service";
import { format, isToday, isYesterday } from "date-fns";

// Sample active users data for now (will be replaced with real data later)
const activeUsers = [
  {
    id: 1,
    name: "Sarah",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=687&q=80",
  },
  {
    id: 2,
    name: "Michael",
    image: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=687&q=80",
  },
  {
    id: 3,
    name: "Jessica",
    image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=687&q=80",
  },
  {
    id: 4,
    name: "David",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=687&q=80",
  },
  {
    id: 5,
    name: "Emma",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=687&q=80",
  },
  {
    id: 6,
    name: "John",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=687&q=80",
  },
];

// Format the timestamp for display
const formatTimestamp = (timestamp: string): string => {
  if (!timestamp) return "";

  const date = new Date(timestamp);

  if (isToday(date)) {
    return format(date, "h:mm a"); // e.g., "3:30 PM"
  } else if (isYesterday(date)) {
    return "Yesterday";
  } else if (date.getFullYear() === new Date().getFullYear()) {
    return format(date, "MMM d"); // e.g., "Jun 15"
  } else {
    return format(date, "MM/dd/yyyy"); // e.g., "06/15/2023"
  }
};

type ChatItemProps = {
  chat: Chat;
  onPress: (chatId: number) => void;
};

const ChatItem = ({ chat, onPress }: ChatItemProps) => {
  const profilePhotoUrl = getProfilePhotoUrl(chat.other_user);
  const userName = chat.other_user.profile ?
    `${chat.other_user.profile.first_name} ${chat.other_user.profile.last_name}` :
    "User";

  const lastMessageTime = chat.last_message ?
    formatTimestamp(chat.last_message.created_at) :
    formatTimestamp(chat.last_activity_at);

  const lastMessageContent = chat.last_message ?
    chat.last_message.content :
    "No messages yet";

  return (
    <Pressable
      onPress={() => onPress(chat.id)}
      $pressed={{
        bg: "$backgroundLight100",
      }}
    >
      <Box py="$3" px="$4">
        <HStack space="md" alignItems="flex-start">
          <Box position="relative">
            <Image
              source={{ uri: profilePhotoUrl || "https://via.placeholder.com/50" }}
              style={{
                width: 50,
                height: 50,
                borderRadius: 25,
              }}
            />
            {chat.unread_count > 0 && (
              <Badge
                position="absolute"
                top={-2}
                right={-2}
                bg="#8B5CF6"
                borderRadius="$full"
                minWidth="$5"
                h="$5"
                alignItems="center"
                justifyContent="center"
              >
                <BadgeText color="$white" size="xs" fontWeight="$bold">
                  {chat.unread_count}
                </BadgeText>
              </Badge>
            )}
          </Box>

          <VStack flex={1} space="xs">
            <HStack justifyContent="space-between" alignItems="center">
              <Text
                color="#1E1E1E"
                size="lg"
                fontWeight="$bold"
                flex={1}
                mr="$2"
              >
                {userName}
              </Text>
              <Text
                color="#6B7280"
                size="sm"
              >
                {lastMessageTime}
              </Text>
            </HStack>

            <Text
              color="#6B7280"
              size="sm"
              numberOfLines={1}
              ellipsizeMode="tail"
              pr="$16"
            >
              {lastMessageContent}
            </Text>
          </VStack>
        </HStack>
      </Box>
    </Pressable>
  );
};

const ActiveUserItem = ({ user }: { user: typeof activeUsers[0] }) => (
  <TouchableOpacity style={{ marginRight: 16 }}>
    <Image
      source={{ uri: user.image }}
      style={{
        width: 60,
        height: 60,
        borderRadius: 30,
      }}
    />
  </TouchableOpacity>
);

export default function ChatsScreen() {
  const router = useRouter();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchChats = async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await chatsService.getChats();

      if (response && response.status === 'success') {
        setChats(response.data.chats);
      } else {
        setError('Failed to fetch chats');
      }
    } catch (err) {
      console.error('Error fetching chats:', err);
      setError('An error occurred while fetching chats');
    } finally {
      setLoading(false);
      if (showRefreshing) {
        setRefreshing(false);
      }
    }
  };

  useEffect(() => {
    fetchChats();
  }, []);

  const handleRefresh = () => {
    fetchChats(true);
  };

  const handleChatPress = (chatId: number) => {
    router.push(`/chat/${chatId}`);
  };

  const renderContent = () => {
    if (loading && !refreshing) {
      return (
        <Center flex={1} p="$4">
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text color="#6B7280" mt="$2">Loading chats...</Text>
        </Center>
      );
    }

    if (error) {
      return (
        <Center flex={1} p="$4">
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text color="#EF4444" mt="$2" textAlign="center">{error}</Text>
          <Pressable
            mt="$4"
            bg="#8B5CF6"
            px="$4"
            py="$2"
            borderRadius="$md"
            onPress={() => fetchChats()}
          >
            <Text color="white">Try Again</Text>
          </Pressable>
        </Center>
      );
    }

    if (chats.length === 0) {
      return (
        <Center flex={1} p="$4">
          <Ionicons name="chatbubble-outline" size={48} color="#6B7280" />
          <Text color="#6B7280" mt="$2" textAlign="center">
            No chats yet. Start a conversation with someone!
          </Text>
        </Center>
      );
    }

    return (
      <ScrollView
        flex={1}
        showsVerticalScrollIndicator={false}
      >
        <VStack>
          {chats.map((chat) => (
            <ChatItem
              key={chat.id}
              chat={chat}
              onPress={handleChatPress}
            />
          ))}
        </VStack>
      </ScrollView>
    );
  };

  return (
    <Box
      flex={1}
      bg="#FDF7FD"
      pt="$12" // Added padding top for camera area
    >
      <VStack flex={1}>
        {/* Header */}
        <Box px="$4" pt="$4" pb="$3">
          <HStack justifyContent="space-between" alignItems="center">
            <Text
              color="#1E1E1E"
              size="xl"
              fontWeight="$bold"
              fontSize={24}
            >
              Chats
            </Text>
            <HStack space="md" alignItems="center">
              <TouchableOpacity>
                <Ionicons name="search" size={24} color="#1E1E1E" />
              </TouchableOpacity>
              <TouchableOpacity>
                <Ionicons name="ellipsis-horizontal" size={24} color="#1E1E1E" />
              </TouchableOpacity>
            </HStack>
          </HStack>
        </Box>

        {/* Now Active Section */}
        <Box px="$4" pb="$4">
          <Text
            color="#1E1E1E"
            size="md"
            fontWeight="$bold"
            mb="$3"
          >
            Now Active
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 16 }}
          >
            {activeUsers.map((user) => (
              <ActiveUserItem key={user.id} user={user} />
            ))}
          </ScrollView>
        </Box>

        {/* Gray separator line with padding */}
        <Box px="$3">
          <Divider bg="#E5E7EB" />
        </Box>

        {/* Chat List */}
        {renderContent()}
      </VStack>
    </Box>
  );
}
