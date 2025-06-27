import React, { useState, useRef, useEffect } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Keyboard,
  ActivityIndicator,
  Modal as RNModal,
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
import { sqliteService } from "@/services/sqlite-service";
import { webSocketService } from "@/services/websocket-service";
import { agoraService } from "@/services/agora-service";
import CallScreen from "@/components/ui/chat/CallScreen";
import NetInfo from "@react-native-community/netinfo";
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
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [oldestMessageId, setOldestMessageId] = useState<number | null>(null);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [chatChannel, setChatChannel] = useState<any>(null);
  const [lastTypingTime, setLastTypingTime] = useState(0);
  const [callVisible, setCallVisible] = useState(false);
  const [isVideoCall, setIsVideoCall] = useState(false);

  // Fetch chat data
  const fetchChatData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await chatsService.fetchChatById(chatId);

      if (response && response.status === 'success') {
        setChat(response.data.chat);
        setMessages(response.data.messages);

        // Set pagination data
        setHasMoreMessages(response.data.pagination.has_more);
        setOldestMessageId(response.data.pagination.oldest_message_id);
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

  // Load older messages when scrolling up
  const loadOlderMessages = async () => {
    // Don't load more if already loading or no more messages
    if (loadingMore || !hasMoreMessages || oldestMessageId === null) {
      return;
    }

    try {
      setLoadingMore(true);

      const response = await chatsService.loadOlderMessages(chatId, oldestMessageId);

      if (response && response.status === 'success') {
        // Prepend the older messages to the current messages
        setMessages(prevMessages => [...response.data.messages, ...prevMessages]);

        // Update pagination data
        setHasMoreMessages(response.data.pagination.has_more);
        setOldestMessageId(response.data.pagination.oldest_message_id);
      }
    } catch (err) {
      console.error('Error loading older messages:', err);
      // Show a toast or alert here if needed
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchChatData();
  }, [chatId]);

  // Initialize WebSocket connection and subscribe to chat channel
  useEffect(() => {
    let channel: any = null;

    const initializeWebSocket = async () => {
      try {
        // Initialize the WebSocket service
        await webSocketService.initialize();

        // Subscribe to the chat channel
        channel = webSocketService.subscribeToChat(
          chatId,
          // Handle new messages
          (newMessage: Message) => {
            console.log('Received new message via WebSocket:', newMessage);

            // Only add the message if it's not from the current user
            if (!newMessage.is_mine) {
              setMessages(prevMessages => {
                // Check if the message is already in the list
                const messageExists = prevMessages.some(msg => msg.id === newMessage.id);
                if (messageExists) {
                  return prevMessages;
                }
                return [...prevMessages, newMessage];
              });

              // Scroll to bottom when new message arrives
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              }, 100);
            }
          },
          // Handle typing indicators
          (user: any) => {
            if (user && user.id !== 503) { // Assuming current user ID is 503
              setIsTyping(true);
              setTypingUser(user.name || 'Someone');

              // Clear typing indicator after 3 seconds
              setTimeout(() => {
                setIsTyping(false);
                setTypingUser(null);
              }, 3000);
            }
          }
        );

        setChatChannel(channel);
      } catch (error) {
        console.error('Error initializing WebSocket:', error);
        Alert.alert(
          "Connection Error",
          "Failed to connect to chat server. Some features may not work properly.",
          [{ text: "OK" }]
        );
      }
    };

    if (chatId) {
      initializeWebSocket();
    }

    // Cleanup function
    return () => {
      if (channel) {
        webSocketService.unsubscribe(channel);
      }
    };
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

  const handlePhoneCall = async () => {
    try {
      // Initialize Agora service if not already initialized
      await agoraService.initialize();

      // Set call type to audio
      setIsVideoCall(false);

      // Show call screen
      setCallVisible(true);
    } catch (error) {
      console.error('Error starting audio call:', error);
      Alert.alert(
        "Call Error",
        "Failed to start audio call. Please try again.",
        [{ text: "OK" }]
      );
    }
  };

  const handleVideoCall = async () => {
    try {
      // Initialize Agora service if not already initialized
      await agoraService.initialize();

      // Set call type to video
      setIsVideoCall(true);

      // Show call screen
      setCallVisible(true);
    } catch (error) {
      console.error('Error starting video call:', error);
      Alert.alert(
        "Call Error",
        "Failed to start video call. Please try again.",
        [{ text: "OK" }]
      );
    }
  };

  const handleEndCall = () => {
    setCallVisible(false);
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

  const handleRetry = async (failedMessage: Message) => {
    try {
      // Check network connectivity before retrying
      const netInfo = await NetInfo.fetch();
      const isConnected = netInfo.isConnected && netInfo.isInternetReachable;

      if (!isConnected) {
        // If still offline, show a message and keep the message as is
        Alert.alert(
          "Offline",
          "You are currently offline. The message will be sent automatically when you're back online.",
          [{ text: "OK" }]
        );
        return;
      }

      // Update the message status to sending in UI
      setMessages(prevMessages =>
        prevMessages.map(msg =>
          msg.id === failedMessage.id ? { ...msg, status: "sending" } : msg
        )
      );

      // Also update the message status in SQLite
      await sqliteService.updateMessageStatus(failedMessage.id, "sending");

      // Send the message to the API
      const response = await chatsService.sendMessage(
        chatId,
        failedMessage.content,
        failedMessage.media_url,
        failedMessage.message_type,
        failedMessage.media_data,
        failedMessage.reply_to_message_id
      );

      if (response && response.status === 'success') {
        // Replace the failed message with the real one from the API
        setMessages(prevMessages =>
          prevMessages.map(msg =>
            msg.id === failedMessage.id ? response.data.message : msg
          )
        );

        // The chatsService.sendMessage already saves the message to SQLite
      } else {
        // If the API call failed again, keep it as failed
        setMessages(prevMessages =>
          prevMessages.map(msg =>
            msg.id === failedMessage.id ? { ...msg, status: "failed" } : msg
          )
        );

        // Update the message status in SQLite
        await sqliteService.updateMessageStatus(failedMessage.id, "failed");

        // Show an error message
        Alert.alert(
          "Error",
          "Failed to send message. Please try again.",
          [{ text: "OK" }]
        );
      }
    } catch (err) {
      console.error('Error retrying message:', err);

      // Mark the message as failed again in UI
      setMessages(prevMessages =>
        prevMessages.map(msg =>
          msg.id === failedMessage.id ? { ...msg, status: "failed" } : msg
        )
      );

      // Update the message status in SQLite
      try {
        await sqliteService.updateMessageStatus(failedMessage.id, "failed");
      } catch (sqliteError) {
        console.error('Error updating message status in SQLite:', sqliteError);
      }

      // Show an error message
      Alert.alert(
        "Error",
        "An error occurred while sending the message. Please try again.",
        [{ text: "OK" }]
      );
    }
  };

  const handleSend = async () => {
    if (message.trim() === "") return;

    try {
      // Clear the input field immediately for better UX
      const messageToSend = message.trim();
      setMessage("");

      // Send the message using the chat service (which handles SQLite integration)
      const response = await chatsService.sendMessage(
        chatId,
        messageToSend,
        undefined, // media_url
        "text", // message_type
        undefined, // media_data
        undefined // reply_to_message_id
      );

      if (response) {
        // Add the message to the UI (either the real one from API or the local one)
        // The chatsService.sendMessage handles storing in SQLite already
        setMessages(prevMessages => [...prevMessages, response.data.message]);

        // Scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        // This should not happen as chatsService.sendMessage always returns a response
        // But just in case, show an error message
        Alert.alert(
          "Error",
          "Failed to send message. Please try again.",
          [{ text: "OK" }]
        );
      }
    } catch (err) {
      console.error('Error sending message:', err);

      // Show an error message
      Alert.alert(
        "Error",
        "An error occurred while sending the message. Please try again.",
        [{ text: "OK" }]
      );
    }
  };

  // Send typing indicator to the server
  const sendTypingIndicator = () => {
    // Throttle typing events to avoid sending too many
    const now = Date.now();
    if (now - lastTypingTime < 3000) return; // Only send every 3 seconds

    try {
      // Send typing indicator via WebSocket service
      webSocketService.sendTypingIndicator(chatId, {
        id: 503, // Assuming current user ID is 503
        name: 'Me' // This would be the current user's name in a real app
      });

      console.log('Sending typing indicator');

      // Update last typing time
      setLastTypingTime(now);
    } catch (error) {
      console.error('Error sending typing indicator:', error);
    }
  };

  const formatMessageTime = (timestamp: string): string => {
    if (!timestamp) return "";

    const date = new Date(timestamp);
    return format(date, "h:mm a"); // e.g., "3:30 PM"
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.is_mine;

    // Determine background color based on message status
    let bgColor = isMe ? "$primary500" : "$backgroundLight100";
    let darkBgColor = isMe ? "$primary500" : "$backgroundDark800";

    if (isMe) {
      if (item.status === "sending" || item.status === "pending") {
        bgColor = "$primary400"; // Lighter color for sending/pending
        darkBgColor = "$primary400";
      } else if (item.status === "failed") {
        bgColor = "$error500"; // Red color for failed
        darkBgColor = "$error500";
      }
    }

    return (
      <Box
        maxWidth="80%"
        bg={bgColor}
        $dark-bg={darkBgColor}
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
        <HStack justifyContent="flex-end" alignItems="center" mt="$1">
          {isMe && (
            <>
              {(item.status === "sending" || item.status === "pending") && (
                <Ionicons name="time-outline" size={12} color="#E0E0E0" style={{ marginRight: 4 }} />
              )}
              {item.status === "sent" && (
                <Ionicons name="checkmark" size={12} color="#E0E0E0" style={{ marginRight: 4 }} />
              )}
              {item.status === "failed" && (
                <Pressable onPress={() => handleRetry(item)}>
                  <Ionicons name="alert-circle" size={12} color="#FF4D4D" style={{ marginRight: 4 }} />
                </Pressable>
              )}
            </>
          )}
          <Text
            color={isMe ? "$primary200" : "$textLight500"}
            $dark-color={isMe ? "$primary200" : "$textDark400"}
            fontSize="$xs"
            textAlign="right"
          >
            {formatMessageTime(item.sent_at)}
          </Text>
        </HStack>
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

      {/* Call Modal */}
      <RNModal
        visible={callVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={handleEndCall}
      >
        {chat && (
          <CallScreen
            chatId={chatId}
            userId={chat.other_user.id}
            userName={chat.other_user.profile ?
              `${chat.other_user.profile.first_name} ${chat.other_user.profile.last_name}` :
              "User"}
            userAvatar={getProfilePhotoUrl(chat.other_user) || "https://via.placeholder.com/150"}
            isVideoCall={isVideoCall}
            onEndCall={handleEndCall}
          />
        )}
      </RNModal>

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
              if (!loadingMore) {
                setTimeout(() => {
                  flatListRef.current?.scrollToEnd({ animated: true });
                }, 100);
              }
            }}
            // Load more messages when scrolling to the top
            onScroll={({ nativeEvent }) => {
              // Check if user has scrolled to the top
              if (nativeEvent.contentOffset.y <= 0 && hasMoreMessages && !loadingMore) {
                loadOlderMessages();
              }
            }}
            // Add loading indicator at the top
            ListHeaderComponent={
              loadingMore ? (
                <Box py="$4" alignItems="center">
                  <ActivityIndicator size="small" color="#8B5CF6" />
                  <Text mt="$2" color="$textLight500" $dark-color="$textDark400">
                    Loading more messages...
                  </Text>
                </Box>
              ) : hasMoreMessages ? (
                <Box py="$4" alignItems="center">
                  <Pressable
                    onPress={loadOlderMessages}
                    bg="$backgroundLight100"
                    $dark-bg="$backgroundDark800"
                    px="$4"
                    py="$2"
                    borderRadius="$md"
                  >
                    <Text color="$primary600" $dark-color="$primary400">
                      Load older messages
                    </Text>
                  </Pressable>
                </Box>
              ) : null
            }
          />

          {/* Message Input - Fixed at bottom */}
          {/* Typing Indicator */}
          {isTyping && (
            <Box
              bg="$backgroundLight50"
              $dark-bg="$backgroundDark900"
              px="$3"
              py="$1"
            >
              <HStack space="xs" alignItems="center">
                <Box
                  bg="$backgroundLight200"
                  $dark-bg="$backgroundDark700"
                  borderRadius="$full"
                  p="$1"
                  px="$2"
                >
                  <HStack space="xs" alignItems="center">
                    <Box>
                      <HStack space="xs">
                        <Box
                          w="$1.5"
                          h="$1.5"
                          bg="$primary500"
                          borderRadius="$full"
                          style={{ opacity: 0.6 }}
                        />
                        <Box
                          w="$1.5"
                          h="$1.5"
                          bg="$primary500"
                          borderRadius="$full"
                          style={{ opacity: 0.8 }}
                        />
                        <Box
                          w="$1.5"
                          h="$1.5"
                          bg="$primary500"
                          borderRadius="$full"
                        />
                      </HStack>
                    </Box>
                    <Text
                      color="$textLight600"
                      $dark-color="$textDark300"
                      fontSize="$xs"
                    >
                      {typingUser || 'Someone'} is typing...
                    </Text>
                  </HStack>
                </Box>
              </HStack>
            </Box>
          )}

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
                    onChangeText={(text) => {
                      setMessage(text);
                      // Send typing indicator when user types
                      if (text.length > 0) {
                        sendTypingIndicator();
                      }
                    }}
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
