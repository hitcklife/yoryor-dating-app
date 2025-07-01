import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Keyboard,
  ActivityIndicator,
  Modal as RNModal, Pressable,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import {
  Box,
  Text,
  SafeAreaView,
  Center,
  Spinner,
  HStack,
  Input, InputField, Avatar, AvatarImage,
  Button,
} from "@gluestack-ui/themed";
import { chatsService, Chat, Message, getProfilePhotoUrl, getCurrentUserId } from "@/services/chats-service";
import { sqliteService } from "@/services/sqlite-service";
import { webSocketService } from "@/services/websocket-service";
import { agoraService } from "@/services/agora-service";
import NetInfo from "@react-native-community/netinfo";
import { format, formatDistanceToNow } from "date-fns";
import { debounce } from 'lodash';
import { useAudioRecorder, useAudioPlayer, AudioModule, RecordingPresets } from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';
import { Image } from "@gluestack-ui/themed";
import {Ionicons} from "@expo/vector-icons";

// Import custom components
import ChatHeader from "@/components/ui/chat/ChatHeader";
import MessageItem from "@/components/ui/chat/MessageItem";
import MessageInput from "@/components/ui/chat/MessageInput";
import ChatOptions from "@/components/ui/chat/ChatOptions";
import CallScreen from "@/components/ui/chat/CallScreen";
import { TypingIndicator } from "@/components/ui/chat/TypingIndicator";

export default function ChatScreen() {
  // Navigation
  const params = useLocalSearchParams();
  const id = params?.id;
  const chatId = id ? parseInt(id as string) : 0;
  const router = useRouter();

  // Refs
  const flatListRef = useRef<FlatList<Message>>(null);

  // Basic states
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  // Pagination states
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [oldestMessageId, setOldestMessageId] = useState<number | null>(null);

  // UI states
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);

  // Typing indicator states
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [lastTypingTime, setLastTypingTime] = useState(0);

  // Chat and call states
  const [chatChannel, setChatChannel] = useState<any>(null);
  const [callVisible, setCallVisible] = useState(false);
  const [isVideoCall, setIsVideoCall] = useState(false);

  // Message interaction states
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null);
  const [editText, setEditText] = useState("");

  // Voice recording state using expo-audio hook
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [recordingState, setRecordingState] = useState({
    isRecording: false,
    duration: 0,
    recordedAudio: null as { uri: string } | null,
    showVoiceMessage: false
  });

  // Audio playback state using expo-audio hook
  const [playerUri, setPlayerUri] = useState<string | null>(null);
  const player = useAudioPlayer(playerUri || undefined);
  const [audioPlayback, setAudioPlayback] = useState({
    isPlaying: false,
    currentMessageId: null as number | null
  });

  // Scroll state management
  const [scrollState, setScrollState] = useState({
    offset: 0,
    contentHeight: 0,
    layoutHeight: 0,
    isAtBottom: true
  });

  // Component mounted state for cleanup
  const isMounted = useRef(true);

  // AUDIO: Timer for recording duration
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // File attachment states
  const [isAttachingFile, setIsAttachingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{
    uri: string;
    type: 'image' | 'video';
    name: string;
  } | null>(null);
  const [showFilePreview, setShowFilePreview] = useState(false);

  // ---- Data fetching functions ----

  // Fetch chat data with optimized pagination for inverted list
  const fetchChatData = useCallback(async () => {
    if (!isMounted.current) return;

    // Check if chatId is valid
    if (!chatId) {
      setError('Invalid chat ID. Please go back and try again.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await chatsService.getChatDetails(chatId);

      if (response?.data && isMounted.current) {
        setChat(response.data.chat);

        // Sort messages by descending time (newest first) for inverted list
        const latestMessages = response.data.messages.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setMessages(latestMessages);

        // Set pagination info - with inverted list, oldest message is the last one in the array
        setHasMoreMessages(response.data.pagination?.has_more || false);
        setOldestMessageId(
          response.data.pagination?.oldest_message_id ||
          (latestMessages.length > 0 ? latestMessages[latestMessages.length - 1]?.id : null)
        );
      }
    } catch (error) {
      console.error('Error loading chat details:', error);
      if (isMounted.current) {
        setError('Failed to load chat. Please try again.');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [chatId]);

  // Load older messages when scrolling up - optimized for inverted list
  const loadMoreMessages = useCallback(async () => {
    if (loadingMore || !hasMoreMessages || !oldestMessageId || !isMounted.current) {
      return;
    }

    // Check if chatId is valid
    if (!chatId) {
      console.warn('Cannot load more messages: Invalid chat ID');
      return;
    }

    setLoadingMore(true);
    try {
      const response = await chatsService.loadMoreMessages(chatId, oldestMessageId);

      if (response?.data?.messages?.length > 0 && isMounted.current) {
        const newMessages = response.data.messages;

        // Append older messages at the end (for inverted list)
        setMessages(prevMessages => [...prevMessages, ...newMessages]);

        // Update pagination info
        setHasMoreMessages(response.data.pagination?.has_more || false);
        setOldestMessageId(response.data.pagination?.oldest_message_id || newMessages[newMessages.length - 1]?.id);
      } else if (isMounted.current) {
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error('Error loading more messages:', error);
      if (isMounted.current) {
        setHasMoreMessages(false);
      }
    } finally {
      if (isMounted.current) {
        setLoadingMore(false);
      }
    }
  }, [chatId, loadingMore, hasMoreMessages, oldestMessageId]);

  // ---- WebSocket & Chat connection management ----

  // Initialize WebSocket connection
  useEffect(() => {
    const initializeWebSocket = async () => {
      const currentUserId = await getCurrentUserId();
      if (currentUserId) {
        webSocketService.setCurrentUserId(currentUserId);
        await webSocketService.initialize();
      }
    };

    initializeWebSocket();
  }, []);

  // Subscribe to chat channel with enhanced event handling
  useEffect(() => {
    if (!chatId) return;
    let channel: any = null;
    const connectToChatChannel = async () => {
      try {
        await webSocketService.initialize();
        if (!isMounted.current) return;
        
        channel = webSocketService.subscribeToChat(
          chatId,
          // onMessage
          (newMessage: Message) => {
            if (!isMounted.current) return;
            if (!newMessage.is_mine) {
              setMessages(prevMessages => {
                const messageExists = prevMessages.some(msg => msg.id === newMessage.id);
                if (messageExists) return prevMessages;
                // Add new message at the beginning (newest first for inverted list)
                return [newMessage, ...prevMessages];
              });
            }
          },
          // onTyping
          (user: any) => {
            if (!isMounted.current) return;
            // Only show typing if it's from the other user
            if (user && chat && chat.other_user && user.id === chat.other_user.id) {
              setIsTyping(true);
              setTypingUser(user.name);
              // Hide typing after 3 seconds
              setTimeout(() => {
                if (isMounted.current) {
                  setIsTyping(false);
                  setTypingUser(null);
                }
              }, 3000);
            }
          },
          // Additional callbacks for edit/delete events
          {
            onMessageEdited: (editedMessage: Message) => {
              if (!isMounted.current) return;
              setMessages(prevMessages =>
                prevMessages.map(msg =>
                  msg.id === editedMessage.id ? { ...msg, ...editedMessage } : msg
                )
              );
            },
            onMessageDeleted: (messageId: number) => {
              if (!isMounted.current) return;
              setMessages(prevMessages =>
                prevMessages.filter(msg => msg.id !== messageId)
              );
            },
            onMessageRead: (messageId: number, userId: number) => {
              if (!isMounted.current) return;
              // Update message read status if needed
              console.log(`Message ${messageId} read by user ${userId}`);
            }
          }
        );
        setChatChannel(channel);
      } catch (error) {
        console.error('Error initializing WebSocket:', error);
        if (isMounted.current) {
          Alert.alert(
            "Connection Error",
            "Failed to connect to chat server. Some features may not work properly.",
            [{ text: "OK" }]
          );
        }
      }
    };
    connectToChatChannel();
    return () => {
      if (channel) {
        webSocketService.unsubscribeFromChat(chatId);
      }
    };
  }, [chatId, chat]);

  // Initial data loading
  useEffect(() => {
    // Check if chatId is valid before fetching data
    if (chatId) {
      fetchChatData();
    } else {
      setError('Invalid chat ID. Please go back and try again.');
      setLoading(false);
    }

    // Cleanup function
    return () => {
      isMounted.current = false;
    };
  }, [fetchChatData, chatId]);

  // ---- Message Action Handlers ----

  // Handle edit message
  const handleEditMessage = useCallback((messageToEdit: Message) => {
    if (!messageToEdit.is_mine || messageToEdit.message_type !== 'text') return;
    setEditingMessage(messageToEdit);
    setEditText(messageToEdit.content);
  }, []);

  // Handle delete message
  const handleDeleteMessage = useCallback(async (messageId: number) => {
    try {
      if (!chatId) {
        Alert.alert("Error", "Cannot delete message: Invalid chat ID");
        return;
      }

      const response = await chatsService.deleteMessage(chatId, messageId);
      
      if (response?.status === 'success') {
        // Optimistically remove message from UI
        setMessages(prevMessages =>
          prevMessages.filter(msg => msg.id !== messageId)
        );
      } else {
        Alert.alert("Error", "Failed to delete message. Please try again.");
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      Alert.alert("Error", "An error occurred while deleting the message.");
    }
  }, [chatId]);

  // Handle reply to message
  const handleReplyToMessage = useCallback((messageToReply: Message) => {
    setReplyingToMessage(messageToReply);
  }, []);

  // Send edited message
  const sendEditedMessage = useCallback(async () => {
    if (!editingMessage || !editText.trim() || !chatId) return;

    try {
      const response = await chatsService.editMessage(chatId, editingMessage.id, editText.trim());
      
      if (response?.status === 'success') {
        // Update message in UI
        setMessages(prevMessages =>
          prevMessages.map(msg =>
            msg.id === editingMessage.id ? { ...msg, ...response.data.message } : msg
          )
        );
        
        // Clear edit state
        setEditingMessage(null);
        setEditText("");
      } else {
        Alert.alert("Error", "Failed to edit message. Please try again.");
      }
    } catch (error) {
      console.error('Error editing message:', error);
      Alert.alert("Error", "An error occurred while editing the message.");
    }
  }, [editingMessage, editText, chatId]);

  // Cancel edit
  const cancelEdit = useCallback(() => {
    setEditingMessage(null);
    setEditText("");
  }, []);

  // Clear reply
  const clearReply = useCallback(() => {
    setReplyingToMessage(null);
  }, []);

  // Get replied message for display
  const getReplyMessage = useCallback((replyToMessageId: number | null): Message | null => {
    if (!replyToMessageId) return null;
    return messages.find(msg => msg.id === replyToMessageId) || null;
  }, [messages]);

  // ---- Audio recording management ----

  // Initialize audio permissions
  useEffect(() => {
    const setupAudioPermissions = async () => {
      try {
        const status = await AudioModule.requestRecordingPermissionsAsync();
        if (!status.granted) {
          Alert.alert('Permission required', 'Audio recording permission is required to send voice messages');
        }
      } catch (error) {
        console.error('Error requesting audio permissions:', error);
      }
    };
    setupAudioPermissions();
  }, []);

  // ---- UI event handlers ----

  // Optimized keyboard event handlers to prevent crashes
  useEffect(() => {
    // Safely handle keyboard events with error boundaries
    const handleKeyboardShow = (event: any) => {
      try {
        if (!isMounted.current) return;

        setIsKeyboardVisible(true);

        // Only scroll if we're at the bottom and have a valid ref
        if (scrollState.isAtBottom && flatListRef.current) {
          // Delay scrolling slightly to ensure layout is complete
          setTimeout(() => {
            if (isMounted.current && flatListRef.current) {
              flatListRef.current.scrollToEnd({ animated: false });
            }
          }, 100);
        }
      } catch (error) {
        console.warn('Error handling keyboard show:', error);
      }
    };

    const handleKeyboardHide = () => {
      try {
        if (!isMounted.current) return;
        setIsKeyboardVisible(false);
      } catch (error) {
        console.warn('Error handling keyboard hide:', error);
      }
    };

    // Use keyboardWillShow on iOS for better performance
    const keyboardShowEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const keyboardHideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    // Add listeners with error handling
    const keyboardShowListener = Keyboard.addListener(keyboardShowEvent, handleKeyboardShow);
    const keyboardHideListener = Keyboard.addListener(keyboardHideEvent, handleKeyboardHide);

    // Clean up listeners
    return () => {
      try {
        keyboardShowListener.remove();
        keyboardHideListener.remove();
      } catch (error) {
        console.warn('Error removing keyboard listeners:', error);
      }
    };
  }, [scrollState.isAtBottom]);

  // ---- UI Interaction Handlers ----

  const handleGoBack = useCallback(() => {
    router.back();
  }, [router]);

  // Phone call handler
  const handlePhoneCall = useCallback(async () => {
    try {
      // Initialize Agora service
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
  }, []);

  // Video call handler
  const handleVideoCall = useCallback(async () => {
    try {
      // Initialize Agora service
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
  }, []);

  // End call handler
  const handleEndCall = useCallback(() => {
    setCallVisible(false);
  }, []);

  // Block user handler
  const handleBlockUser = useCallback(() => {
    if (!chat) return;

    const userName = chat.other_user?.profile ?
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
  }, [chat, router]);

  // Clear chat handler
  const handleClearChat = useCallback(() => {
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
  }, []);

  // Delete chat handler
  const handleDeleteChat = useCallback(() => {
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
  }, [router]);

  // ---- Message handling functions ----

  // Retry failed message
  const handleRetry = useCallback(async (failedMessage: Message) => {
    try {
      // Check if chatId is valid
      if (!chatId) {
        Alert.alert("Error", "Cannot retry message: Invalid chat ID");
        return;
      }

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
          failedMessage.message_type,
          failedMessage.media_url || undefined,
          failedMessage.media_data,
          failedMessage.reply_to_message_id || undefined
      );

      if (response && response.status === 'success') {
        // Replace the failed message with the real one from the API
        setMessages(prevMessages =>
            prevMessages.map(msg =>
                msg.id === failedMessage.id ? response.data.message : msg
            )
        );
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
  }, [chatId]);

  // Send text message
  const handleSend = useCallback(async () => {
    // Handle editing existing message
    if (editingMessage) {
      await sendEditedMessage();
      return;
    }

    if (message.trim() === "") return;

    // Check if chatId is valid
    if (!chatId) {
      Alert.alert("Error", "Cannot send message: Invalid chat ID");
      return;
    }

    // Store message for potential restore
    const messageToSend = message.trim();
    const replyToId = replyingToMessage?.id;

    try {
      // Show sending state
      setIsSending(true);

      // Clear the input field immediately for better UX
      setMessage("");
      
      // Clear reply state
      if (replyingToMessage) {
        setReplyingToMessage(null);
      }

      // Send the message using the chat service
      const response = await chatsService.sendMessage(
          chatId,
          messageToSend,
          "text", // message_type
          undefined, // media_url
          undefined, // media_data
          replyToId  // reply_to_message_id
      );

      if (response) {
        // Add new message at the beginning (newest first for inverted list)
        setMessages(prevMessages => [response.data.message, ...prevMessages]);
      } else {
        // This should not happen as chatsService.sendMessage always returns a response
        // But just in case, show an error message
        Alert.alert(
            "Error",
            "Failed to send message. Please try again.",
            [{ text: "OK" }]
        );

        // Restore message to input field
        setMessage(messageToSend);
        // Restore reply state
        if (replyToId) {
          setReplyingToMessage(messages.find(msg => msg.id === replyToId) || null);
        }
      }
    } catch (err) {
      console.error('Error sending message:', err);

      // Restore message to input field
      setMessage(messageToSend);
      // Restore reply state
      if (replyToId) {
        setReplyingToMessage(messages.find(msg => msg.id === replyToId) || null);
      }

      // Show an error message
      Alert.alert(
          "Error",
          "An error occurred while sending the message. Please try again.",
          [{ text: "OK" }]
      );
    } finally {
      setIsSending(false);
    }
  }, [message, chatId, editingMessage, replyingToMessage, sendEditedMessage, messages]);

  // ---- Voice message functions ----

  // Start recording function
  const startRecording = useCallback(async () => {
    try {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        Alert.alert('Permission required', 'Audio recording permission is required to send voice messages');
        return;
      }
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setRecordingState(prev => ({
        ...prev,
        isRecording: true,
        duration: 0,
        showVoiceMessage: false,
        recordedAudio: null
      }));
      // Start timer
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        setRecordingState(prev => ({ ...prev, duration: prev.duration + 1 }));
      }, 1000) as unknown as NodeJS.Timeout;
    } catch (error) {
      console.error('Error starting recording:', error);
      Alert.alert('Recording Error', 'Failed to start recording. Please try again.');
    }
  }, [audioRecorder]);

  // Stop recording function
  const stopRecording = useCallback(async () => {
    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      if (!uri) {
        throw new Error('Recording URI is null');
      }
      setRecordingState(prev => ({
        ...prev,
        isRecording: false,
        recordedAudio: { uri },
        showVoiceMessage: true
      }));
      // Stop timer
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
      setRecordingState(prev => ({
        ...prev,
        isRecording: false
      }));
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      Alert.alert('Recording Error', 'Failed to save recording. Please try again.');
    }
  }, [audioRecorder]);

  // Cancel recording function
  const cancelRecording = useCallback(async () => {
    try {
      await audioRecorder.stop();
      setRecordingState({
        isRecording: false,
        duration: 0,
        recordedAudio: null,
        showVoiceMessage: false
      });
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    } catch (error) {
      console.error('Error canceling recording:', error);
    }
  }, [audioRecorder]);

  // Play recorded audio function
  const playRecordedAudio = useCallback(async () => {
    try {
      const { recordedAudio } = recordingState;
      if (!recordedAudio) return;
      setPlayerUri(recordedAudio.uri);
      player.play();
      setAudioPlayback(prev => ({
        ...prev,
        isPlaying: true,
        currentMessageId: null
      }));
    } catch (error) {
      console.error('Error playing audio:', error);
      Alert.alert('Playback Error', 'Failed to play recording. Please try again.');
    }
  }, [recordingState, player]);

  // ---- Utility functions ----

  // Format duration in seconds to MM:SS format
  const formatDuration = useCallback((seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  // Send voice message function
  const sendVoiceMessage = useCallback(async () => {
    try {
      const { recordedAudio, duration } = recordingState;
      if (!recordedAudio) return;

      // Check if chatId is valid
      if (!chatId) {
        Alert.alert("Error", "Cannot send voice message: Invalid chat ID");
        return;
      }

      setIsSending(true);

      // Create FormData with the actual file
      const formData = new FormData();
      formData.append('content', `Voice message (${formatDuration(duration)})`);
      formData.append('message_type', 'voice');
      formData.append('media_data', JSON.stringify({ duration }));
      
      // Add the actual file
      formData.append('media_file', {
        uri: recordedAudio.uri,
        type: 'audio/m4a',
        name: 'voice-message.m4a'
      } as any);

      // Send the message using the new voice message service
      const response = await chatsService.sendVoiceMessage(chatId, formData);

      if (response) {
        // Append new messages at the end
        setMessages(prevMessages => [...prevMessages, response.data.message]);
        setRecordingState(prev => ({
          ...prev,
          recordedAudio: null,
          showVoiceMessage: false
        }));
      } else {
        Alert.alert(
          "Error",
          "Failed to send voice message. Please try again.",
          [{ text: "OK" }]
        );
      }
    } catch (err) {
      console.error('Error sending voice message:', err);
      Alert.alert(
        "Error",
        "An error occurred while sending the voice message. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setIsSending(false);
    }
  }, [chatId, recordingState, formatDuration]);

  // Handle file attachment
  const handleAttachFile = useCallback(async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Camera roll permission is required to attach files');
        return;
      }

      // Open image picker - simplified without editing
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        quality: 1,
      });

      console.log('Image picker result:', result);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        console.log('Selected asset:', asset);
        
        // Determine message type based on media type
        const messageType = asset.type === 'video' ? 'video' : 'image';
        
        // Set selected file for preview
        const fileInfo = {
          uri: asset.uri,
          type: messageType as 'image' | 'video',
          name: asset.type === 'video' ? 'video.mp4' : 'image.jpg'
        };
        
        console.log('File info for preview:', fileInfo);
        setSelectedFile(fileInfo);
        setShowFilePreview(true);
      }
    } catch (error) {
      console.error('Error selecting file:', error);
      Alert.alert(
        "Error",
        "An error occurred while selecting the file. Please try again.",
        [{ text: "OK" }]
      );
    }
  }, []);

  // Send selected file
  const sendSelectedFile = useCallback(async () => {
    if (!selectedFile || !chatId) return;

    try {
      setIsAttachingFile(true);
      setShowFilePreview(false);

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('content', `Sent a ${selectedFile.type}`);
      formData.append('message_type', selectedFile.type);
      
      // Add the file with proper file info
      const fileInfo = {
        uri: selectedFile.uri,
        type: selectedFile.type === 'video' ? 'video/mp4' : 'image/jpeg',
        name: selectedFile.name
      };
      
      console.log('File info being sent:', fileInfo);
      formData.append('media_file', fileInfo as any);

      // Send the file
      const response = await chatsService.sendVoiceMessage(chatId, formData);

      if (response) {
        // Append new messages at the end
        setMessages(prevMessages => [...prevMessages, response.data.message]);
      } else {
        Alert.alert(
          "Error",
          "Failed to send file. Please try again.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error('Error sending file:', error);
      Alert.alert(
        "Error",
        "An error occurred while sending the file. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setIsAttachingFile(false);
      setSelectedFile(null);
    }
  }, [selectedFile, chatId]);

  // Cancel file preview
  const cancelFilePreview = useCallback(() => {
    setShowFilePreview(false);
    setSelectedFile(null);
  }, []);

  // Play voice message from received message
  const playVoiceMessage = useCallback(async (messageUri: string, messageId: number) => {
    try {
      // If already playing this message, pause it
      if (audioPlayback.isPlaying && audioPlayback.currentMessageId === messageId) {
        player.pause();
        setAudioPlayback({
          isPlaying: false,
          currentMessageId: null
        });
        return;
      }
      // If another message is playing, pause it first
      if (audioPlayback.isPlaying && audioPlayback.currentMessageId !== messageId) {
        player.pause();
      }
      setPlayerUri(messageUri);
      await player.play();
      setAudioPlayback({
        isPlaying: true,
        currentMessageId: messageId
      });
    } catch (error) {
      console.error('Error playing voice message:', error);
      Alert.alert('Playback Error', 'Failed to play voice message. Please try again.');
    }
  }, [player, audioPlayback]);

  // Format message time
  const formatMessageTime = useCallback((timestamp: string): string => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return format(date, "h:mm a"); // e.g., "3:30 PM"
  }, []);

  // Format last active time
  const formatLastActive = useCallback((timestamp: string): string => {
    if (!timestamp) return "Last seen recently";
    const date = new Date(timestamp);
    return `Last seen ${formatDistanceToNow(date, { addSuffix: true })}`;
  }, []);

  // Send typing indicator - debounced for performance
  const debouncedSendTypingIndicator = useMemo(
      () => debounce(async () => {
        try {
          if (!chatId) {
            console.warn('Cannot send typing indicator: Invalid chat ID');
            return;
          }
          const currentUserId = await getCurrentUserId();
          if (!currentUserId || !chatChannel) {
            return;
          }
          // Send typing indicator via WebSocket service
          webSocketService.sendTyping(chatId, {
            id: currentUserId,
            name: 'You'
          });
          setLastTypingTime(Date.now());
        } catch (error) {
          console.error('Error sending typing indicator:', error);
        }
      }, 1000),
      [chatId, chatChannel]
  );

  // Handle message input change
  const handleMessageChange = useCallback((text: string) => {
    if (editingMessage) {
      setEditText(text);
    } else {
      setMessage(text);
    }

    // Send typing indicator if message has content
    if (text.trim().length > 0) {
      debouncedSendTypingIndicator();
    }
  }, [debouncedSendTypingIndicator, editingMessage]);

  // ---- Rendering functions ----

  // Render message item using our MessageItem component
  const renderMessage = useCallback(({ item }: { item: Message }) => {
    const isCurrentlyPlaying = audioPlayback.isPlaying && audioPlayback.currentMessageId === item.id;
    const replyToMessage = getReplyMessage(item.reply_to_message_id);

    return (
      <MessageItem
        message={item}
        formatMessageTime={formatMessageTime}
        formatDuration={formatDuration}
        isCurrentlyPlaying={isCurrentlyPlaying}
        onPlayVoiceMessage={playVoiceMessage}
        onRetry={handleRetry}
        onEdit={handleEditMessage}
        onDelete={handleDeleteMessage}
        onReply={handleReplyToMessage}
        replyToMessage={replyToMessage}
      />
    );
  }, [
    audioPlayback, 
    formatDuration, 
    formatMessageTime, 
    handleRetry, 
    playVoiceMessage,
    handleEditMessage,
    handleDeleteMessage,
    handleReplyToMessage,
    getReplyMessage
  ]);

  // ---- Render UI states ----

  // Loading state
  if (loading) {
    return (
        <Box flex={1} justifyContent="center" alignItems="center" bg="#FFFFFF">
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text mt="$2">Loading chat...</Text>
        </Box>
    );
  }

  // Error state
  if (error) {
    return (
        <Box flex={1} justifyContent="center" alignItems="center" bg="#FFFFFF">
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text color="#EF4444" mt="$2" textAlign="center">{error}</Text>
          <Box bg="#8B5CF6" px="$4" py="$2" borderRadius="$md">
            <Pressable onPress={fetchChatData}>
              <Text color="#FFFFFF">Try Again</Text>
            </Pressable>
          </Box>
        </Box>
    );
  }

  // Chat not found state
  if (!chat) {
    return (
        <Box flex={1} justifyContent="center" alignItems="center" bg="#FFFFFF">
          <Text>Chat not found</Text>
        </Box>
    );
  }

  // ---- Main UI ----
  return (
    <Box flex={1} bg="#FFFFFF">
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

      {/* File Preview Modal */}
      <RNModal
        visible={showFilePreview}
        animationType="slide"
        transparent={true}
        onRequestClose={cancelFilePreview}
      >
        <Box flex={1} bg="rgba(0,0,0,0.8)" justifyContent="center" alignItems="center">
          <Box bg="#FFFFFF" borderRadius="$lg" mx="$4" maxWidth="90%" maxHeight="80%">
            {/* Preview Content */}
            <Box p="$4">
              {selectedFile?.type === 'image' ? (
                <Box width={300} height={300} borderRadius="$md" overflow="hidden">
                  <Image
                    source={{ uri: selectedFile.uri }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="contain"
                  />
                </Box>
              ) : (
                <Box width={300} height={300} borderRadius="$md" bg="#F3F4F6" justifyContent="center" alignItems="center">
                  <Ionicons name="videocam" size={48} color="#6B7280" />
                  <Text color="#6B7280" mt="$2">Video Preview</Text>
                </Box>
              )}
            </Box>
            
            {/* Action Buttons */}
            <HStack p="$4" space="md" justifyContent="center">
              <Button
                onPress={cancelFilePreview}
                bg="$red500"
                px="$4"
                py="$2"
                borderRadius="$md"
              >
                <Text color="$white" fontWeight="bold">Cancel</Text>
              </Button>
              <Button
                onPress={sendSelectedFile}
                bg="$purple500"
                px="$4"
                py="$2"
                borderRadius="$md"
                disabled={isAttachingFile}
              >
                {isAttachingFile ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text color="$white" fontWeight="bold">Send</Text>
                )}
              </Button>
            </HStack>
          </Box>
        </Box>
      </RNModal>

      <SafeAreaView
        flex={1}
        bg="#FFFFFF"
      >
        {/* Chat Header */}
        <ChatHeader
          chat={chat}
          isTyping={isTyping}
          typingUser={typingUser}
          formatLastActive={formatLastActive}
          onGoBack={handleGoBack}
          onPhoneCall={handlePhoneCall}
          onVideoCall={handleVideoCall}
          onOpenOptions={() => setOptionsVisible(true)}
          getProfilePhotoUrl={getProfilePhotoUrl}
        />

        {/* Chat Options Modal */}
        <ChatOptions
          isVisible={optionsVisible}
          onClose={() => setOptionsVisible(false)}
          onBlockUser={handleBlockUser}
          onClearChat={handleClearChat}
          onDeleteChat={handleDeleteChat}
        />

          {/* Messages List */}
          <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
              style={{ flex: 1 }}
          >
            <Box flex={1}>
              <FlatList
                  ref={flatListRef}
                  data={messages}
                  renderItem={renderMessage}
                  keyExtractor={(item) => item.id.toString()}
                  contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}
                  inverted={true}
                  onEndReached={loadMoreMessages}
                  onEndReachedThreshold={0.1}
                  initialNumToRender={15}
                  maxToRenderPerBatch={10}
                  windowSize={21}
                  removeClippedSubviews={Platform.OS === 'android'}
                  ListFooterComponent={loadingMore ? (
                      <Box py="$2" alignItems="center">
                        <ActivityIndicator size="small" color="#8B5CF6" />
                      </Box>
                  ) : null}
                  onScroll={(event) => {
                    if (!event || !event.nativeEvent || !event.nativeEvent.contentOffset || !event.nativeEvent.contentSize || !event.nativeEvent.layoutMeasurement) return;
                    // Copy values immediately
                    const offset = event.nativeEvent.contentOffset.y;
                    const contentHeight = event.nativeEvent.contentSize.height;
                    const layoutHeight = event.nativeEvent.layoutMeasurement.height;
                    const isAtBottom = offset <= 20; // For inverted list, bottom is when offset is near 0
                    setScrollState({
                      offset,
                      contentHeight,
                      layoutHeight,
                      isAtBottom
                    });
                  }}
                  onContentSizeChange={(width, height) => {
                    setScrollState(prev => ({
                      ...prev,
                      contentHeight: height
                    }));
                  }}
                  onLayout={(event) => {
                    if (!event || !event.nativeEvent || !event.nativeEvent.layout) return;
                    // Copy value immediately
                    const { height } = event.nativeEvent.layout;
                    setScrollState(prev => ({
                      ...prev,
                      layoutHeight: height
                    }));
                  }}
              />

              {/* Typing Indicator */}
              {isTyping && typingUser && chat.other_user && typingUser === (chat.other_user.profile ? chat.other_user.profile.first_name : chat.other_user.email) && (
                  <TypingIndicator
                    typingUser={typingUser}
                    userAvatar={getProfilePhotoUrl(chat.other_user) || "https://via.placeholder.com/50"}
                    userName={chat.other_user.profile ? chat.other_user.profile.first_name : typingUser}
                  />
              )}

              {/* Reply Preview */}
              {replyingToMessage && (
                <Box bg="#F3F4F6" p="$3" mx="$4" borderRadius="$md" borderLeftWidth={3} borderLeftColor="#8B5CF6">
                  <HStack justifyContent="space-between" alignItems="flex-start">
                    <VStack flex={1}>
                      <Text color="#6B7280" fontSize="$xs" fontWeight="$medium" mb="$1">
                        Replying to {replyingToMessage.is_mine ? "yourself" : (chat?.other_user?.profile?.first_name || "User")}
                      </Text>
                      <Text color="#1F2937" fontSize="$sm" numberOfLines={2}>
                        {replyingToMessage.content}
                      </Text>
                    </VStack>
                    <Pressable onPress={clearReply} ml="$2">
                      <Ionicons name="close" size={20} color="#6B7280" />
                    </Pressable>
                  </HStack>
                </Box>
              )}

              {/* Edit Preview */}
              {editingMessage && (
                <Box bg="#FEF3C7" p="$3" mx="$4" borderRadius="$md" borderLeftWidth={3} borderLeftColor="#F59E0B">
                  <HStack justifyContent="space-between" alignItems="flex-start">
                    <VStack flex={1}>
                      <Text color="#92400E" fontSize="$xs" fontWeight="$medium" mb="$1">
                        Editing message
                      </Text>
                      <Text color="#1F2937" fontSize="$sm" numberOfLines={2}>
                        {editingMessage.content}
                      </Text>
                    </VStack>
                    <Pressable onPress={cancelEdit} ml="$2">
                      <Ionicons name="close" size={20} color="#92400E" />
                    </Pressable>
                  </HStack>
                </Box>
              )}

              {/* Voice Message Preview */}
              {recordingState.showVoiceMessage && recordingState.recordedAudio && (
                  <MessageInput
                    message={editingMessage ? editText : message}
                    isSending={isSending}
                    recordingState={recordingState}
                    isPlaying={audioPlayback.isPlaying}
                    formatDuration={formatDuration}
                    onMessageChange={handleMessageChange}
                    onSend={handleSend}
                    onStartRecording={startRecording}
                    onStopRecording={stopRecording}
                    onCancelRecording={cancelRecording}
                    onPlayRecordedAudio={playRecordedAudio}
                    onSendVoiceMessage={sendVoiceMessage}
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={() => setIsInputFocused(false)}
                    onAttachFile={handleAttachFile}
                  />
              )}

              {/* Message Input */}
              {!recordingState.showVoiceMessage && (
                  <MessageInput
                    message={editingMessage ? editText : message}
                    isSending={isSending || isAttachingFile}
                    recordingState={recordingState}
                    isPlaying={audioPlayback.isPlaying}
                    formatDuration={formatDuration}
                    onMessageChange={handleMessageChange}
                    onSend={handleSend}
                    onStartRecording={startRecording}
                    onStopRecording={stopRecording}
                    onCancelRecording={cancelRecording}
                    onPlayRecordedAudio={playRecordedAudio}
                    onSendVoiceMessage={sendVoiceMessage}
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={() => setIsInputFocused(false)}
                    onAttachFile={handleAttachFile}
                  />
              )}
            </Box>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Box>
  );
}
