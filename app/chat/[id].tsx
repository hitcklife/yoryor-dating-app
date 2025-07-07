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
  Button, VStack,
} from "@gluestack-ui/themed";
import { chatsService, Chat, Message, getProfilePhotoUrl, getCurrentUserId, initializeChatsService } from "@/services/chats-service";
import { sqliteService } from "@/services/sqlite-service";
import { webSocketService } from "@/services/websocket-service";
import { videoSDKService } from "@/services/videosdk-service";
import { CONFIG } from "@/services/config";
import NetInfo from "@react-native-community/netinfo";
import { format, formatDistanceToNow } from "date-fns";
import { debounce } from 'lodash';
import { useAudioRecorder, useAudioPlayer, AudioModule, RecordingPresets } from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';
import { Image } from "@gluestack-ui/themed";
import {Ionicons} from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from "@/services/api-client";

// Import custom components
import ChatHeader from "@/components/ui/chat/ChatHeader";
import MessageItem from "@/components/ui/chat/MessageItem";
import MessageInput from "@/components/ui/chat/MessageInput";
import ChatOptions from "@/components/ui/chat/ChatOptions";
import CallScreen from "@/components/ui/chat/CallScreen";
import { callService, CallData } from "@/services/call-service";

// Export screen options to ensure no navigation header is shown
export const options = {
  headerShown: false,
};

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
  const [isLoadingFromAPI, setIsLoadingFromAPI] = useState(false);

  // Pagination states
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

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
  const [currentCall, setCurrentCall] = useState<CallData | null>(null);

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
  const chatRef = useRef<Chat | null>(null);

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



  // Merge messages by ID, preserving local data when API data is same
  const mergeMessagesByID = useCallback((localMessages: Message[], apiMessages: Message[]): Message[] => {
    const messageMap = new Map<number, Message>();
    
    // First add local messages (they preserve the correct is_mine state and status)
    localMessages.forEach(msg => {
      messageMap.set(msg.id, msg);
    });
    
    // Then update with API messages, but preserve critical local properties
    apiMessages.forEach(apiMsg => {
      const localMsg = messageMap.get(apiMsg.id);
      if (localMsg) {
        // Merge API data with local properties that shouldn't change to prevent UI jumps
        messageMap.set(apiMsg.id, {
          ...apiMsg,
          // For sent messages, prioritize API is_mine if it's true
          // For received messages, keep local is_mine to prevent left/right jumping
          is_mine: apiMsg.is_mine === true ? true : localMsg.is_mine,
          // If local message is in 'sending' state, keep that until API confirms
          status: localMsg.status === 'sending' ? localMsg.status : apiMsg.status,
        });
      } else {
        // New message from API
        messageMap.set(apiMsg.id, apiMsg);
      }
    });
    
    // Convert back to array and sort by newest first (using sent_at for better consistency)
    return Array.from(messageMap.values()).sort((a, b) => {
      const timeA = new Date(a.sent_at || a.created_at).getTime();
      const timeB = new Date(b.sent_at || b.created_at).getTime();
      return timeB - timeA;
    });
  }, []);

  // Initial data loading
  useEffect(() => {
    const initializeChat = async () => {
      try {
        console.log('=== CHAT INITIALIZATION START ===');
        console.log('Chat ID:', chatId);
        
        if (!chatId) {
          setError('Invalid chat ID. Please go back and try again.');
          setLoading(false);
          return;
        }

        // Force database migration first
        console.log('Initializing chats service...');
        await initializeChatsService();
        console.log('Chats service initialized');
        
        // Load local data immediately
        console.log('Loading local data...');
        const localChat = await sqliteService.getChatById(chatId);
        const localMessages = await sqliteService.getInitialMessagesByChatId(chatId, CONFIG.APP.chatMessagesPageSize);
        
        console.log('Local chat found:', !!localChat);
        console.log('Local messages count:', localMessages.length);
        
        // Set chat data immediately if available
        if (localChat) {
          setChat(localChat);
          console.log('Set chat data from local storage');
        }
        
        // Set messages immediately if available
        if (localMessages.length > 0) {
          const currentUserId = await getCurrentUserId();
          const messagesWithOwnership = localMessages.map(msg => ({
            ...msg,
            is_mine: msg.sender_id === currentUserId
          }));
          setMessages(messagesWithOwnership);
          console.log('Set messages from local storage');
        }
        
        // Stop loading immediately after local data is loaded
        setLoading(false);
        console.log('Loading stopped - showing local data');
        
        // Make API call in background to get fresh data
        console.log('Making API call in background...');
        setIsLoadingFromAPI(true);
        
        try {
          const response = await chatsService.getChatDetails(chatId, 1);
          
          if (response?.data) {
            const { chat: apiChat, messages: apiMessages } = response.data;
            
            // Only update chat if important fields changed
            if (apiChat && localChat) {
              const localProfile = localChat.other_user?.profile || {};
              const apiProfile = apiChat.other_user?.profile || {};
              const localPhoto = localChat.other_user?.profile_photo_path || '';
              const apiPhoto = apiChat.other_user?.profile_photo_path || '';
              const localLastActive = localChat.other_user?.last_active_at || '';
              const apiLastActive = apiChat.other_user?.last_active_at || '';
              if (
                localProfile.first_name !== apiProfile.first_name ||
                localProfile.last_name !== apiProfile.last_name ||
                localPhoto !== apiPhoto ||
                localLastActive !== apiLastActive
              ) {
                setChat(apiChat);
                console.log('Updated chat data from API (fields changed)');
              } else {
                console.log('API chat data arrived, but no important fields changed');
              }
            } else if (apiChat && !localChat) {
              setChat(apiChat);
              console.log('Set chat data from API (no local chat)');
            }
            
            // Update messages if API has more data
            if (apiMessages && apiMessages.length > 0) {
              setMessages(prevMessages => {
                const merged = mergeMessagesByID(prevMessages, apiMessages);
                console.log('Merged API messages with local messages');
                return merged;
              });
            }
          }
        } catch (apiError) {
          console.warn('API call failed, using local data:', apiError);
          // Don't show error to user since we have local data
        } finally {
          setIsLoadingFromAPI(false);
          console.log('API call completed');
        }
        
        console.log('=== CHAT INITIALIZATION COMPLETE ===');
        
      } catch (error) {
        console.error('Error initializing chat:', error);
        setError('Failed to load chat. Please try again.');
        setLoading(false);
        setIsLoadingFromAPI(false);
      }
    };

    console.log('Starting chat initialization...');
    initializeChat();

    // Cleanup function
    return () => {
      console.log('Chat component cleanup');
      isMounted.current = false;
    };
  }, [chatId, mergeMessagesByID]);

  // Update chat ref whenever chat state changes
  useEffect(() => {
    chatRef.current = chat;
  }, [chat]);

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

  // Handle joining a call from a call message
  const handleJoinCall = useCallback(async (callData: any) => {
    try {
      console.log('Joining call from message:', callData);
      
      // Join the call via the call service
      const joinData = await callService.joinCall(callData.callId);
      
      console.log('Call joined successfully:', joinData);
      
      // Set up the call screen
      setCurrentCall({
        callId: joinData.callId,
        meetingId: joinData.meetingId,
        token: joinData.token,
        messageId: joinData.messageId,
        type: joinData.type,
        caller: { id: 0, name: null },
        receiver: { id: 0, name: null }
      });
      
      setIsVideoCall(joinData.type === 'video');
      setCallVisible(true);
      
    } catch (error) {
      console.error('Error joining call:', error);
      Alert.alert(
        "Call Error",
        "Failed to join the call. Please try again.",
        [{ text: "OK" }]
      );
    }
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

        // Always scroll to bottom when keyboard opens to show latest messages
        setTimeout(() => {
          if (isMounted.current && flatListRef.current) {
            flatListRef.current.scrollToOffset({ offset: 0, animated: true });
          }
        }, 150);
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
  }, []);

  // ---- UI Interaction Handlers ----

  const handleGoBack = useCallback(() => {
    router.back();
  }, [router]);

  // Phone call handler
  const handlePhoneCall = useCallback(async () => {
    try {
      if (!chat?.other_user?.id) {
        Alert.alert("Error", "Cannot start call: User not found");
        return;
      }

      console.log('Initiating voice call with user:', chat.other_user.id);
      const callData = await callService.initiateCall(chat.other_user.id, 'voice');
      
      setCurrentCall(callData);
      setIsVideoCall(false);
      setCallVisible(true);
      
      console.log('Voice call initiated successfully:', callData);
    } catch (error) {
      console.error('Error starting audio call:', error);
      Alert.alert(
          "Call Error",
          "Failed to start audio call. Please try again.",
          [{ text: "OK" }]
      );
    }
  }, [chat]);

  // Video call handler
  const handleVideoCall = useCallback(async () => {
    try {
      if (!chat?.other_user?.id) {
        Alert.alert("Error", "Cannot start call: User not found");
        return;
      }

      console.log('Initiating video call with user:', chat.other_user.id);
      const callData = await callService.initiateCall(chat.other_user.id, 'video');
      
      setCurrentCall(callData);
      setIsVideoCall(true);
      setCallVisible(true);
      
      console.log('Video call initiated successfully:', callData);
    } catch (error) {
      console.error('Error starting video call:', error);
      Alert.alert(
          "Call Error",
          "Failed to start video call. Please try again.",
          [{ text: "OK" }]
      );
    }
  }, [chat]);

  // End call handler
  const handleEndCall = useCallback(async () => {
    try {
      if (currentCall) {
        console.log('Ending call:', currentCall.callId);
        await callService.endCall(currentCall.callId);
        console.log('Call ended successfully');
      }
    } catch (error) {
      console.error('Error ending call:', error);
    } finally {
      setCurrentCall(null);
      setCallVisible(false);
      callService.clearCallState();
    }
  }, [currentCall]);

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
        // Add new message with smooth animation effect
        setMessages(prevMessages => {
          const newMessages = mergeMessagesByID(prevMessages, [response.data.message]);
          
          // Scroll to bottom with animation after adding new message
          setTimeout(() => {
            if (isMounted.current && flatListRef.current) {
              flatListRef.current.scrollToOffset({ offset: 0, animated: true });
            }
          }, 50);
          
          return newMessages;
        });
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
  }, [message, chatId, editingMessage, replyingToMessage, sendEditedMessage, messages, mergeMessagesByID]);

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
        // Add voice message with smooth animation effect
        setMessages(prevMessages => {
          const newMessages = mergeMessagesByID(prevMessages, [response.data.message]);
          
          // Scroll to bottom with animation after adding voice message
          setTimeout(() => {
            if (isMounted.current && flatListRef.current) {
              flatListRef.current.scrollToOffset({ offset: 0, animated: true });
            }
          }, 50);
          
          return newMessages;
        });
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
  }, [chatId, recordingState, formatDuration, mergeMessagesByID]);

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
        // Add file message with smooth animation effect
        setMessages(prevMessages => {
          const newMessages = mergeMessagesByID(prevMessages, [response.data.message]);
          
          // Scroll to bottom with animation after adding file message
          setTimeout(() => {
            if (isMounted.current && flatListRef.current) {
              flatListRef.current.scrollToOffset({ offset: 0, animated: true });
            }
          }, 50);
          
          return newMessages;
        });
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
  }, [selectedFile, chatId, mergeMessagesByID]);

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

  // Format last active time with online status
  const formatLastActive = useCallback((timestamp: string | null | undefined): string => {
    if (!timestamp) return "Last seen recently";
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return "Last seen recently";
      
      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      
      // Show "Online" if user was active within last 2 minutes
      if (diffInMinutes < 2) {
        return "Online";
      }
      
      return `Last seen ${formatDistanceToNow(date, { addSuffix: true })}`;
    } catch (error) {
      console.error('Error formatting last active time:', error);
      return "Last seen recently";
    }
  }, []);

  // Check if user is online (active within 2 minutes)
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
          
          // Get current user info for typing indicator
          const userData = await AsyncStorage.getItem('user_data');
          let userName = 'You';
          
          if (userData) {
            try {
              const user = JSON.parse(userData);
              userName = user.profile ? `${user.profile.first_name}` : user.email;
            } catch (error) {
              console.warn('Error parsing user data for typing indicator:', error);
            }
          }
          
          // Send typing indicator via WebSocket service with proper user info
          webSocketService.sendTyping(chatId, {
            user_id: currentUserId,
            id: currentUserId,
            name: userName,
            user_name: userName
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
        onJoinCall={handleJoinCall}
        replyToMessage={replyToMessage}
        currentUserId={chat?.other_user?.pivot?.user_id || 0}
        otherUserId={chat?.other_user?.id || 0}
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
    handleJoinCall,
    getReplyMessage,
    chat
  ]);

  // ---- Render UI states ----

  // Debug loading state
  console.log('Chat screen render state:', { loading, error, chat: !!chat, messagesCount: messages.length });

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
            <Pressable onPress={() => window.location.reload()}>
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
        {chat && currentCall && (
          <CallScreen
            chatId={chatId}
            userId={chat.other_user.id}
            userName={chat.other_user.profile ?
              `${chat.other_user.profile.first_name} ${chat.other_user.profile.last_name}` :
              "User"}
            userAvatar={getProfilePhotoUrl(chat.other_user) || "https://via.placeholder.com/150"}
            isVideoCall={isVideoCall}
            onEndCall={handleEndCall}
            meetingId={currentCall.meetingId}
            token={currentCall.token}
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

      <Box flex={1} bg="#FFFFFF">
        {/* Chat Header - Show once we have chat data, keep visible */}
        {chat && chat.other_user && (
          <ChatHeader
            chat={chat}
            isTyping={isTyping}
            typingUser={typingUser}
            isLoadingFromAPI={false} // Don't show loading state in header to prevent blinking
            isSending={isSending}
            formatLastActive={formatLastActive}
            isUserOnline={isUserOnline}
            onGoBack={handleGoBack}
            onPhoneCall={handlePhoneCall}
            onVideoCall={handleVideoCall}
            onOpenOptions={() => setOptionsVisible(true)}
            getProfilePhotoUrl={getProfilePhotoUrl}
          />
        )}

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
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
            style={{ flex: 1 }}
            enabled={true}
        >
          <Box flex={1}>
            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}
                inverted={true}
                onEndReachedThreshold={0.5}
                initialNumToRender={15}
                maxToRenderPerBatch={10}
                windowSize={21}
                removeClippedSubviews={Platform.OS === 'android'}
                showsVerticalScrollIndicator={false}
                ListFooterComponent={loadingMore ? (
                    <Box py="$2" alignItems="center">
                      <HStack space="sm" alignItems="center">
                        <ActivityIndicator size="small" color="#8B5CF6" />
                        <Text color="#6B7280" fontSize="$xs">Loading older messages...</Text>
                      </HStack>
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
                  <Box ml="$2">
                    <Pressable onPress={clearReply}>
                      <Ionicons name="close" size={20} color="#6B7280" />
                    </Pressable>
                  </Box>
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
                  <Box ml="$2">
                    <Pressable onPress={cancelEdit}>
                      <Ionicons name="close" size={20} color="#92400E" />
                    </Pressable>
                  </Box>
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
      </Box>
      </Box>
  );
}


