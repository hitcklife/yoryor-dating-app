import React, { useState, useRef, useEffect } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Keyboard,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  Box,
  Text,
  VStack,
  HStack,
  Pressable,
  Image,
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalBody,
  Input,
  InputField,
  SafeAreaView,
  ScrollView,
  Avatar,
  AvatarImage,
  Center,
} from "@gluestack-ui/themed";
import { useColorScheme } from "nativewind";
import { chatsService, Chat, Message, getProfilePhotoUrl } from "@/services/chats-service";
import { format } from "date-fns";

// Sample chat data
const chatUsers = {
  1: {
    id: 1,
    name: "Sarah",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=687&q=80",
    messages: [
      { id: 1, text: "Hey there!", sender: "them", time: "10:00 AM" },
      { id: 2, text: "Hi! How are you?", sender: "me", time: "10:02 AM" },
      { id: 3, text: "I'm good, thanks for asking. How about you?", sender: "them", time: "10:05 AM" },
      { id: 4, text: "I'm doing well! Just working on some projects.", sender: "me", time: "10:10 AM" },
      { id: 5, text: "That sounds interesting. What kind of projects?", sender: "them", time: "10:12 AM" },
      { id: 6, text: "Mostly mobile app development. It's been fun!", sender: "me", time: "10:15 AM" },
      { id: 7, text: "That's awesome! I'd love to hear more about it.", sender: "them", time: "10:20 AM" },
    ],
  },
  2: {
    id: 2,
    name: "Michael",
    image: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=687&q=80",
    messages: [
      { id: 1, text: "Would you like to meet for coffee this weekend?", sender: "them", time: "Yesterday" },
      { id: 2, text: "That sounds great! What time were you thinking?", sender: "me", time: "Yesterday" },
      { id: 3, text: "How about Saturday at 2pm?", sender: "them", time: "Yesterday" },
      { id: 4, text: "Perfect! Let's meet at that new cafe downtown.", sender: "me", time: "Yesterday" },
    ],
  },
  3: {
    id: 3,
    name: "Jessica",
    image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=687&q=80",
    messages: [
      { id: 1, text: "Hey, did you see that new movie?", sender: "them", time: "Monday" },
      { id: 2, text: "Not yet! Is it good?", sender: "me", time: "Monday" },
      { id: 3, text: "It's amazing! We should go see it together sometime.", sender: "them", time: "Monday" },
      { id: 4, text: "That sounds great! I'll check the showtimes.", sender: "me", time: "Monday" },
      { id: 5, text: "Perfect! Let me know what works for you.", sender: "them", time: "Monday" },
    ],
  },
  4: {
    id: 4,
    name: "David",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=687&q=80",
    messages: [
      { id: 1, text: "Check out this new restaurant I found!", sender: "them", time: "Monday" },
      { id: 2, text: "It looks amazing! What kind of food do they serve?", sender: "me", time: "Monday" },
      { id: 3, text: "It's a fusion of Italian and Japanese cuisine. Really unique!", sender: "them", time: "Monday" },
      { id: 4, text: "That sounds interesting! We should try it out.", sender: "me", time: "Monday" },
    ],
  },
};

export default function ChatScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { id } = useLocalSearchParams();
  const chatId = parseInt(id as string);
  const router = useRouter();
  const flatListRef = useRef(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);

  // Fetch chat data
  const fetchChatData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await chatsService.fetchChatById(chatId);

      if (response && response.status === 'success') {
        setChat(response.data.chat);
        setMessages(response.data.messages);
      } else {
        setError('Failed to fetch chat data');
      }
    } catch (err) {
      console.error('Error fetching chat data:', err);
      setError('An error occurred while fetching chat data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChatData();
  }, [chatId]);

  useEffect(() => {
    // Scroll to bottom of chat on load
    if (flatListRef.current && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current.scrollToEnd({ animated: false });
      }, 200);
    }
  }, [messages]);

  useEffect(() => {
    // Set up keyboard event listeners
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setIsKeyboardVisible(true);
        // Scroll to bottom when keyboard appears
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setIsKeyboardVisible(false);
      }
    );

    // Clean up listeners when component unmounts
    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const handleGoBack = () => {
    router.back();
  };

  const handlePhoneCall = () => {
    const userName = chat?.other_user?.profile ?
      `${chat.other_user.profile.first_name} ${chat.other_user.profile.last_name}` :
      "User";
    Alert.alert("Call", `Calling ${userName}...`);
  };

  const handleVideoCall = () => {
    const userName = chat?.other_user?.profile ?
      `${chat.other_user.profile.first_name} ${chat.other_user.profile.last_name}` :
      "User";
    Alert.alert("Video Call", `Starting video call with ${userName}...`);
  };

  const handleBlockUser = () => {
    const userName = chat?.other_user?.profile ?
      `${chat.other_user.profile.first_name} ${chat.other_user.profile.last_name}` :
      "User";

    Alert.alert(
      "Block User",
      `Are you sure you want to block ${userName}?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Block",
          style: "destructive",
          onPress: () => {
            // In a real app, this would make an API call to block the user
            Alert.alert("Blocked", `${userName} has been blocked.`);
            router.back();
          },
        },
      ]
    );
    setOptionsVisible(false);
  };

  const handleClearChat = () => {
    Alert.alert(
      "Clear Chat",
      "Are you sure you want to clear all messages? This cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            // In a real app, this would make an API call to clear the chat
            setMessages([]);
            Alert.alert("Chat Cleared", "All messages have been cleared.");
          },
        },
      ]
    );
    setOptionsVisible(false);
  };

  const handleDeleteChat = () => {
    Alert.alert(
      "Delete Chat",
      "Are you sure you want to delete this chat? This cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            // In a real app, this would make an API call to delete the chat
            Alert.alert("Chat Deleted", "The chat has been deleted.");
            router.back();
          },
        },
      ]
    );
    setOptionsVisible(false);
  };

  const handleSend = async () => {
    if (message.trim() === "") return;

    // In a real app, this would make an API call to send the message
    // For now, we'll just add it to the local state
    const newMessage: Message = {
      id: Date.now(), // Temporary ID
      chat_id: chatId,
      sender_id: 503, // Assuming current user ID is 503 based on the API response example
      reply_to_message_id: null,
      content: message,
      message_type: "text",
      media_data: null,
      media_url: null,
      thumbnail_url: null,
      status: "sent",
      is_edited: false,
      edited_at: null,
      sent_at: new Date().toISOString(),
      deleted_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_mine: true,
      sender: {
        id: 503,
        email: "hshehdjs@gmail.com" // Placeholder email
      }
    };

    setMessages([...messages, newMessage]);
    setMessage("");

    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const formatMessageTime = (timestamp: string): string => {
    if (!timestamp) return "";

    const date = new Date(timestamp);
    return format(date, "h:mm a"); // e.g., "3:30 PM"
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.is_mine;
    return (
      <Box
        maxWidth="80%"
        bg={isMe ? "$primary500" : "$backgroundLight100"}
        $dark-bg={isMe ? "$primary500" : "$backgroundDark800"}
        borderRadius="$2xl"
        p="$3"
        mb="$2"
        alignSelf={isMe ? "flex-end" : "flex-start"}
        borderTopRightRadius={isMe ? "$none" : "$2xl"}
        borderTopLeftRadius={isMe ? "$2xl" : "$none"}
      >
        <Text
          color={isMe ? "$white" : "$textLight900"}
          $dark-color={isMe ? "$white" : "$textDark100"}
          fontSize="$md"
        >
          {item.content}
        </Text>
        <Text
          color={isMe ? "$primary200" : "$textLight500"}
          $dark-color={isMe ? "$primary200" : "$textDark400"}
          fontSize="$xs"
          mt="$1"
          textAlign="right"
        >
          {formatMessageTime(item.sent_at)}
        </Text>
      </Box>
    );
  };

  if (loading) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center" bg="$backgroundLight50" $dark-bg="$backgroundDark950">
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text mt="$2">Loading chat...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center" bg="$backgroundLight50" $dark-bg="$backgroundDark950">
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text color="#EF4444" mt="$2" textAlign="center">{error}</Text>
        <Pressable
          mt="$4"
          bg="#8B5CF6"
          px="$4"
          py="$2"
          borderRadius="$md"
          onPress={fetchChatData}
        >
          <Text color="white">Try Again</Text>
        </Pressable>
      </Box>
    );
  }

  if (!chat) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center" bg="$backgroundLight50" $dark-bg="$backgroundDark950">
        <Text>Chat not found</Text>
      </Box>
    );
  }

  return (
    <Box flex={1} bg="$backgroundLight50" $dark-bg="$backgroundDark950">
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <SafeAreaView
        flex={1}
        bg="$backgroundLight50"
        $dark-bg="$backgroundDark950"
      >
        {/* Custom Header */}
        <Box
          px="$4"
          py="$3"
          bg="$backgroundLight50"
          $dark-bg="$backgroundDark900"
          borderBottomWidth={1}
          borderBottomColor="$borderLight200"
          $dark-borderBottomColor="$borderDark800"
        >
          <HStack alignItems="center" justifyContent="space-between">
            <HStack alignItems="center" space="md">
              <Pressable onPress={handleGoBack}>
                <Ionicons
                  name="chevron-back"
                  size={24}
                  color={isDark ? "#fff" : "#333"}
                />
              </Pressable>
              <Avatar size="md">
                <AvatarImage
                  source={{ uri: getProfilePhotoUrl(chat.other_user) || "https://via.placeholder.com/50" }}
                  alt={`${chat.other_user.profile?.first_name || 'User'}'s profile`}
                />
              </Avatar>
              <Text
                color="$textLight900"
                $dark-color="$textDark100"
                fontSize="$lg"
                fontWeight="$semibold"
              >
                {chat.other_user.profile ?
                  `${chat.other_user.profile.first_name} ${chat.other_user.profile.last_name}` :
                  "User"}
              </Text>
            </HStack>

            <HStack alignItems="center" space="md">
              <Pressable onPress={handlePhoneCall}>
                <Ionicons
                  name="call"
                  size={22}
                  color={isDark ? "#fff" : "#333"}
                />
              </Pressable>
              <Pressable onPress={handleVideoCall}>
                <Ionicons
                  name="videocam"
                  size={22}
                  color={isDark ? "#fff" : "#333"}
                />
              </Pressable>
              <Pressable onPress={() => setOptionsVisible(true)}>
                <Ionicons
                  name="ellipsis-vertical"
                  size={22}
                  color={isDark ? "#fff" : "#333"}
                />
              </Pressable>
            </HStack>
          </HStack>
        </Box>

        {/* Options Menu Modal */}
        <Modal
          isOpen={optionsVisible}
          onClose={() => setOptionsVisible(false)}
          size="md"
        >
          <ModalBackdrop />
          <ModalContent
            position="absolute"
            top="$20"
            right="$4"
            bg="$backgroundLight50"
            $dark-bg="$backgroundDark800"
            borderRadius="$lg"
            p="$2"
            minWidth="$48"
            shadowColor="$shadowColor"
            shadowOffset={{ width: 0, height: 2 }}
            shadowOpacity={0.25}
            shadowRadius={3.84}
            elevation={5}
          >
            <ModalBody p="$0">
              <VStack space="xs">
                <Pressable
                  flexDirection="row"
                  alignItems="center"
                  p="$3"
                  onPress={handleBlockUser}
                  borderRadius="$md"
                  $pressed={{
                    bg: "$backgroundLight100",
                  }}
                  $dark-pressed={{
                    bg: "$backgroundDark700",
                  }}
                >
                  <Ionicons
                    name="ban"
                    size={20}
                    color={isDark ? "#ff6b6b" : "#ff4757"}
                  />
                  <Text
                    ml="$2"
                    color="$textLight900"
                    $dark-color="$textDark100"
                  >
                    Block User
                  </Text>
                </Pressable>

                <Pressable
                  flexDirection="row"
                  alignItems="center"
                  p="$3"
                  onPress={handleClearChat}
                  borderRadius="$md"
                  $pressed={{
                    bg: "$backgroundLight100",
                  }}
                  $dark-pressed={{
                    bg: "$backgroundDark700",
                  }}
                >
                  <Ionicons
                    name="trash-outline"
                    size={20}
                    color={isDark ? "#feca57" : "#ff9f43"}
                  />
                  <Text
                    ml="$2"
                    color="$textLight900"
                    $dark-color="$textDark100"
                  >
                    Clear Chat
                  </Text>
                </Pressable>

                <Pressable
                  flexDirection="row"
                  alignItems="center"
                  p="$3"
                  onPress={handleDeleteChat}
                  borderRadius="$md"
                  $pressed={{
                    bg: "$backgroundLight100",
                  }}
                  $dark-pressed={{
                    bg: "$backgroundDark700",
                  }}
                >
                  <Ionicons
                    name="trash"
                    size={20}
                    color={isDark ? "#ff6b6b" : "#ff4757"}
                  />
                  <Text
                    ml="$2"
                    color="$textLight900"
                    $dark-color="$textDark100"
                  >
                    Delete Chat
                  </Text>
                </Pressable>
              </VStack>
            </ModalBody>
          </ModalContent>
        </Modal>

        {/* Messages Container with KeyboardAvoidingView */}
        <KeyboardAvoidingView
          flex={1}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        >
          {/* Messages List */}
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{
              padding: 16,
              paddingTop: 20,
              paddingBottom: 20,
              flexGrow: 1,
            }}
            style={{
              flex: 1,
              backgroundColor: isDark ? 'transparent' : '#F5ECF7'
            }}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => {
              // Auto scroll to bottom when new messages are added
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              }, 100);
            }}
          />

          {/* Message Input - Fixed at bottom */}
          <Box
            bg="$backgroundLight50"
            $dark-bg="$backgroundDark900"
            borderTopWidth={1}
            borderTopColor="$borderLight200"
            $dark-borderTopColor="$borderDark800"
            p="$3"
            pb={Platform.OS === "ios" ? "$6" : "$3"}
          >
            <HStack alignItems="center" space="md">
              <Pressable>
                <Ionicons
                  name="attach"
                  size={26}
                  color="#666"
                />
              </Pressable>

              <Box flex={1}>
                <Input
                  variant="rounded"
                  size="md"
                  bg="$backgroundLight100"
                  $dark-bg="$backgroundDark800"
                  borderColor="transparent"
                  $dark-borderColor="transparent"
                  $focus={{
                    borderColor: "$primary600",
                  }}
                >
                  <InputField
                    placeholder="Type a message..."
                    placeholderTextColor="$textLight500"
                    $dark-placeholderTextColor="$textDark400"
                    color="$textLight900"
                    $dark-color="$textDark100"
                    value={message}
                    onChangeText={setMessage}
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={() => setIsInputFocused(false)}
                  />
                </Input>
              </Box>

              <Pressable
                bg="$primary600"
                p="$3"
                borderRadius="$full"
                onPress={handleSend}
                $pressed={{
                  bg: "$primary700",
                }}
              >
                <Ionicons
                  name={message ? "send" : "mic"}
                  size={24}
                  color="#fff"
                />
              </Pressable>
            </HStack>
          </Box>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Box>
  );
}
