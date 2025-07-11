import React, { useState, useEffect, useRef } from "react";
import { FlatList, Image, TouchableOpacity, ActivityIndicator, RefreshControl, TextInput } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
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
  Input,
  InputField,
} from "@gluestack-ui/themed";
import { Ionicons } from "@expo/vector-icons";
import { chatsService, Chat, getProfilePhotoUrl, getMessageReadStatus, initializeChatsService, getCurrentUserId } from "@/services/chats-service";
import { webSocketService } from "@/services/websocket-service";
import { sqliteService } from "@/services/sqlite-service";
import { apiClient } from "@/services/api-client";
import { likesService, Match } from "@/services/likes-service";
import { format, isToday, isYesterday } from "date-fns";
import { ChatListShimmer } from "@/components/ui/shimmer";
import { CachedImage } from "@/components/ui/CachedImage";
import { ChatListTypingIndicator } from "@/components/ui/chat/ChatListTypingIndicator";

// Helper function to get profile photo URL for match users
const getMatchProfilePhotoUrl = (user: any): string | null => {
  if (!user || !user.profile_photo) {
    return null;
  }

  const photoUrl = user.profile_photo.medium_url || user.profile_photo.original_url;
  if (photoUrl) {
    // If it's already a full URL, use it as is
    if (photoUrl.startsWith('http')) {
      return photoUrl;
    }
    // Otherwise, construct the full URL (you may need to adjust this based on your API)
    return photoUrl;
  }

  return null;
};

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
  isTyping?: boolean;
};

const ChatItem = ({ chat, onPress, isTyping }: ChatItemProps) => {
  const profilePhotoUrl = getProfilePhotoUrl(chat.other_user);
  const userName = chat.other_user.profile ?
    `${chat.other_user.profile.first_name} ${chat.other_user.profile.last_name}` :
    "User";

  const lastMessageTime = chat.last_message ?
    formatTimestamp(chat.last_message.created_at) :
    formatTimestamp(chat.last_activity_at);

  const lastMessageContent = isTyping ? 
    null : // Will be handled by typing indicator component
    (chat.last_message ?
      chat.last_message.content :
      "No messages yet");

  // Check if last message is from current user and get read status
  const isLastMessageFromMe = chat.last_message?.is_mine;
  const readStatus = isLastMessageFromMe && chat.last_message ? 
    getMessageReadStatus(chat.last_message, chat.pivot.user_id, chat.other_user.id) : 
    null;

  // Read status icon component for chat list
  const ReadStatusIcon = ({ status }: { status: 'sent' | 'delivered' | 'read' }) => {
    switch (status) {
      case 'sent':
        return <Ionicons name="checkmark" size={12} color="#9CA3AF" />;
      case 'delivered':
        return <Ionicons name="checkmark" size={12} color="#9CA3AF" />;
      case 'read':
        return <Ionicons name="checkmark-done" size={12} color="#8B5CF6" />;
      default:
        return null;
    }
  };

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
            <CachedImage
              source={{ uri: profilePhotoUrl || "https://via.placeholder.com/50" }}
              style={{ width: 50, height: 50, borderRadius: 25 }}
              type="profile"
              userId={chat.other_user.id}
              fallbackSource={{ uri: "https://via.placeholder.com/50" }}
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
              <HStack space="xs" alignItems="center">
                {readStatus && <ReadStatusIcon status={readStatus} />}
                <Text
                  color="#6B7280"
                  size="sm"
                >
                  {lastMessageTime}
                </Text>
              </HStack>
            </HStack>

            {isTyping ? (
              <ChatListTypingIndicator />
            ) : (
              <Text
                color="#6B7280"
                size="sm"
                numberOfLines={1}
                ellipsizeMode="tail"
                pr="$16"
              >
                {lastMessageContent}
              </Text>
            )}
          </VStack>
        </HStack>
      </Box>
    </Pressable>
  );
};

const MatchItem = ({ match, onPress }: { match: Match; onPress: (match: Match) => void }) => {
  const profilePhotoUrl = getMatchProfilePhotoUrl(match.user);
  const userName = match.user.profile ?
    `${match.user.profile.first_name} ${match.user.profile.last_name}` :
    "User";

  return (
    <TouchableOpacity 
      style={{ marginRight: 16 }}
      onPress={() => onPress(match)}
    >
      <Box position="relative">
        <CachedImage
          source={{ uri: profilePhotoUrl || "https://via.placeholder.com/60" }}
          style={{ width: 60, height: 60, borderRadius: 30 }}
          type="profile"
          userId={match.user.id}
          fallbackSource={{ uri: "https://via.placeholder.com/60" }}
        />
        {/* New match indicator */}
        <Box
          position="absolute"
          top={-2}
          right={-2}
          bg="#FF6B9D"
          borderRadius="$full"
          width={12}
          height={12}
          borderWidth={2}
          borderColor="white"
        />
      </Box>
      <Text
        color="#1E1E1E"
        size="xs"
        fontWeight="$medium"
        textAlign="center"
        mt="$1"
        numberOfLines={1}
      >
        {userName}
      </Text>
    </TouchableOpacity>
  );
};

export default function ChatsScreen() {
  const router = useRouter();
  const [chats, setChats] = useState<Chat[]>([]);
  const [filteredChats, setFilteredChats] = useState<Chat[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [hasLocalData, setHasLocalData] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isFetchingApi, setIsFetchingApi] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [typingChats, setTypingChats] = useState<Map<number, { timestamp: number }>>(new Map());
  const isMounted = useRef(true);
  const hasInitialized = useRef(false);



  // Filter chats based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredChats(chats);
    } else {
      const filtered = chats.filter(chat => {
        const userName = chat.other_user.profile ?
          `${chat.other_user.profile.first_name} ${chat.other_user.profile.last_name}` :
          "User";
        
        // Search by user name
        const nameMatches = userName.toLowerCase().includes(searchQuery.toLowerCase());
        
        // Search by last message content
        const messageMatches = chat.last_message?.content?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
        
        return nameMatches || messageMatches;
      });
      setFilteredChats(filtered);
    }
  }, [chats, searchQuery]);

  // Load local data first
  const loadLocalData = async (): Promise<Chat[]> => {
    try {
      console.log("Loading local chats from SQLite...");
      const localChats = await sqliteService.getChats();
      console.log(`Found ${localChats.length} local chats`);
      return localChats;
    } catch (error) {
      console.error("Error loading local chats:", error);
      return [];
    }
  };

  // Fetch fresh data from API
  const fetchApiData = async (): Promise<Chat[]> => {
    try {
      console.log("Fetching fresh chats from API...");
      const response = await chatsService.getChats();
      
      if (response && response.status === 'success') {
        console.log(`Received ${response.data.chats.length} chats from API`);
        // Store fresh data in SQLite
        try {
          await sqliteService.storeChats(response.data.chats);
        } catch (sqliteError) {
          console.error("Error storing chats in SQLite:", sqliteError);
        }
        return response.data.chats;
      } else {
        console.log("API response was not successful");
        return [];
      }
    } catch (error) {
      console.error("Error fetching API data:", error);
      return [];
    }
  };

  // Fetch matches from API
  const fetchMatches = async () => {
    try {
      setMatchesLoading(true);
      console.log("Fetching matches from API...");
      const response = await likesService.fetchMatches(1);
      
      if (response && response.status === 'success') {
        console.log(`Received ${response.data.matches.length} matches from API`);
        setMatches(response.data.matches);
      } else {
        console.log("Matches API response was not successful");
        setMatches([]);
      }
    } catch (error) {
      console.error("Error fetching matches:", error);
      setMatches([]);
    } finally {
      setMatchesLoading(false);
    }
  };

  // Merge local and API data intelligently
  const mergeChatData = (localChats: Chat[], apiChats: Chat[]): Chat[] => {
    const mergedChats = new Map<number, Chat>();
    
    // First, add all local chats
    localChats.forEach(chat => {
      mergedChats.set(chat.id, chat);
    });
    
    // Then, update with API data (API data takes precedence)
    apiChats.forEach(apiChat => {
      const existingChat = mergedChats.get(apiChat.id);
      if (existingChat) {
        // Merge logic: prefer API data but keep local unread count if API doesn't have it
        const mergedChat = {
          ...existingChat,
          ...apiChat,
          unread_count: apiChat.unread_count !== undefined ? apiChat.unread_count : existingChat.unread_count
        };
        mergedChats.set(apiChat.id, mergedChat);
      } else {
        // New chat from API
        mergedChats.set(apiChat.id, apiChat);
      }
    });
    
    // Convert back to array and sort by last activity
    const result = Array.from(mergedChats.values()).sort((a, b) => {
      const timeA = new Date(a.last_activity_at).getTime();
      const timeB = new Date(b.last_activity_at).getTime();
      return timeB - timeA;
    });
    
    console.log(`Merged ${localChats.length} local + ${apiChats.length} API = ${result.length} total chats`);
    return result;
  };

  const loadChatsOptimized = async (showRefreshing = false) => {
    // Prevent duplicate calls
    if (hasInitialized.current && !showRefreshing) {
      return;
    }

    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else if (isInitialLoad) {
        setLoading(true);
      }
      setError(null);

      // Step 1: Load local data immediately
      const localChats = await loadLocalData();
      const hasLocal = localChats.length > 0;
      
      if (isInitialLoad) {
        setHasLocalData(hasLocal);
        setIsInitialLoad(false);
        hasInitialized.current = true;
      }

      // Step 2: If we have local data, show it immediately
      if (hasLocal) {
        console.log("Showing local data immediately");
        setChats(localChats);
        setLoading(false);
      }

      // Step 3: Fetch fresh data from API in parallel (but only once)
      if (!isFetchingApi) {
        setIsFetchingApi(true);
        console.log("Fetching fresh data from API...");
        const apiChats = await fetchApiData();
        setIsFetchingApi(false);
        
        // Step 4: Merge and update with fresh data
        if (apiChats.length > 0 || hasLocal) {
          const mergedChats = mergeChatData(localChats, apiChats);
          setChats(mergedChats);
        } else {
          // No chats available - this is normal, not an error
          setChats([]);
        }
      }

    } catch (err) {
      console.error('Error in optimized chat loading:', err);
      if (isMounted.current) {
        setError('An error occurred while loading chats');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
        if (showRefreshing) {
          setRefreshing(false);
        }
      }
    }
  };

  // Subscribe to chat list updates for real-time updates
  useEffect(() => {
    // Subscribe to all chat channels for typing events
    const subscribeToChatTyping = async () => {
      try {
        // Subscribe to each chat channel to receive typing events
        for (const chat of chats) {
          webSocketService.subscribeToChat(chat.id);
        }
      } catch (error) {
        console.error('Error subscribing to chat typing events:', error);
      }
    };

    // Subscribe to chat list updates
    webSocketService.subscribeToChatList({
      onNewMessage: async (chatId: number, message: any) => {
        if (!isMounted.current) return;
        
        console.log(`New message in chat ${chatId}:`, message);
        
        // Update the specific chat with new message
        await chatsService.updateChatWithNewMessage(chatId, message);
        
        // Refresh the chat list to show updated data
        setChats(prevChats => {
          return prevChats.map(chat => {
            if (chat.id === chatId) {
              // For own messages, don't increase unread count
              // For others' messages, increase unread count
              const newUnreadCount = message.is_mine ? 
                chat.unread_count : // Keep current count for own messages
                chat.unread_count + 1; // Increase for others' messages
              
              return {
                ...chat,
                last_message: message,
                last_activity_at: message.sent_at || message.created_at,
                unread_count: newUnreadCount
              };
            }
            return chat;
          }).sort((a, b) => {
            // Sort by last activity (most recent first)
            const timeA = new Date(a.last_activity_at).getTime();
            const timeB = new Date(b.last_activity_at).getTime();
            return timeB - timeA;
          });
        });
      },
      onChatUpdated: (chatId: number, updatedChat: any) => {
        if (!isMounted.current) return;
        
        console.log(`Chat ${chatId} updated:`, updatedChat);
        
        setChats(prevChats => {
          return prevChats.map(chat => {
            if (chat.id === chatId) {
              return { ...chat, ...updatedChat };
            }
            return chat;
          });
        });
      },
      onUnreadCountChanged: (chatId: number, unreadCount: number) => {
        if (!isMounted.current) return;
        
        console.log(`Unread count changed for chat ${chatId}:`, unreadCount);
        
        setChats(prevChats => {
          return prevChats.map(chat => {
            if (chat.id === chatId) {
              // Server unread count takes precedence over local calculation
              return { ...chat, unread_count: unreadCount };
            }
            return chat;
          });
        });
      }
    });

    // Handle typing indicators for chat list
    const handleTypingIndicator = async (data: any) => {
      if (!isMounted.current) return;
      
      console.log('Typing indicator received in chat list:', data);
      
      // Only show typing indicator for other users
      const currentUserId = await getCurrentUserId();
      if (data.user_id && data.user_id !== currentUserId) {
        
        setTypingChats(prev => {
          const newMap = new Map(prev);
          newMap.set(data.chat_id, {
            timestamp: Date.now()
          });
          return newMap;
        });
        
        // Auto-remove typing indicator after 3 seconds
        setTimeout(() => {
          if (isMounted.current) {
            setTypingChats(prev => {
              const newMap = new Map(prev);
              newMap.delete(data.chat_id);
              return newMap;
            });
          }
        }, 3000);
      }
    };

    // Listen for typing events
    webSocketService.on('chat.typing', handleTypingIndicator);

    // Listen for global unread count updates
    const handleGlobalUnreadUpdate = (data: any) => {
      if (!isMounted.current) return;
      
      console.log('Global unread count update:', data);
      
      // Update the global unread count (this could be used for tab badges)
      // For now, we'll just log it, but you can add state management here
      // if you want to show unread counts on tabs
    };

    // Listen for global unread updates
    webSocketService.on('user.unread.update', handleGlobalUnreadUpdate);

    // Handle own sent messages immediately
    const handleOwnMessageSent = async (data: any) => {
      if (!isMounted.current) return;
      
      console.log('Own message sent:', data);
      
      // Update chat list immediately with own message
      setChats(prevChats => {
        return prevChats.map(chat => {
          if (chat.id === data.chatId) {
            return {
              ...chat,
              last_message: data.message,
              last_activity_at: data.message.sent_at || data.message.created_at,
              // Don't change unread count for own messages
              unread_count: chat.unread_count
            };
          }
          return chat;
        }).sort((a, b) => {
          // Sort by last activity (most recent first)
          const timeA = new Date(a.last_activity_at).getTime();
          const timeB = new Date(b.last_activity_at).getTime();
          return timeB - timeA;
        });
      });
    };

    // Listen for own message sent events
    webSocketService.on('chat.own.message.sent', handleOwnMessageSent);

    // Subscribe to typing events for all chats
    subscribeToChatTyping();

    // Listen for message edit and delete events to update chat list
    const handleMessageEdited = async (editedMessage: any) => {
      if (!isMounted.current) return;
      
      console.log(`Message edited in chat ${editedMessage.chat_id}:`, editedMessage);
      
      // Update the chat list to reflect the edited message
      await chatsService.updateChatListWithMessageEdit(editedMessage);
      
      // Refresh the chat list
      setChats(prevChats => {
        return prevChats.map(chat => {
          if (chat.id === editedMessage.chat_id) {
            return {
              ...chat,
              last_message: editedMessage,
              last_activity_at: editedMessage.updated_at || editedMessage.sent_at || editedMessage.created_at
            };
          }
          return chat;
        }).sort((a, b) => {
          // Sort by last activity (most recent first)
          const timeA = new Date(a.last_activity_at).getTime();
          const timeB = new Date(b.last_activity_at).getTime();
          return timeB - timeA;
        });
      });
    };

    const handleMessageDeleted = async (data: any) => {
      if (!isMounted.current) return;
      
      console.log(`Message deleted in chat ${data.chatId}:`, data);
      
      // Update the chat list to reflect the deleted message
      await chatsService.updateChatListWithMessageDelete(data.chatId, data.messageId);
      
      // Refresh the chat list
      loadChatsOptimized();
    };

    // Add event listeners for message edit and delete
    webSocketService.on('chat.message.edited', handleMessageEdited);
    webSocketService.on('chat.message.deleted', handleMessageDeleted);

    // Cleanup function
    return () => {
      isMounted.current = false;
      webSocketService.unsubscribeFromChatList();
      webSocketService.off('chat.message.edited', handleMessageEdited);
      webSocketService.off('chat.message.deleted', handleMessageDeleted);
      webSocketService.off('chat.typing', handleTypingIndicator);
      webSocketService.off('user.unread.update', handleGlobalUnreadUpdate);
      webSocketService.off('chat.own.message.sent', handleOwnMessageSent);
    };
  }, []);

  // Subscribe to typing events when chats change - use a more stable approach
  const prevChatIds = useRef<Set<number>>(new Set());
  
  useEffect(() => {
    if (chats.length > 0) {
      const currentChatIds = new Set(chats.map(chat => chat.id));
      
      // Subscribe to new chats
      for (const chat of chats) {
        if (!prevChatIds.current.has(chat.id)) {
          webSocketService.subscribeToChat(chat.id);
        }
      }
      
      // Unsubscribe from removed chats
      for (const chatId of prevChatIds.current) {
        if (!currentChatIds.has(chatId)) {
          webSocketService.unsubscribeFromChat(chatId);
        }
      }
      
      // Update the previous chat IDs
      prevChatIds.current = currentChatIds;
    }
  }, [chats.length]); // Only depend on the length, not the entire array

  // Initialize and load data only once
  useEffect(() => {
    const initializeAndLoad = async () => {
      try {
        // Force database migration first
        await initializeChatsService();
        
        // Then load chats with optimized logic
        await loadChatsOptimized();
        
        // Fetch matches
        await fetchMatches();
        
      } catch (error) {
        console.error('Error initializing chats:', error);
        setError('Failed to load chats. Please try again.');
      }
    };

    initializeAndLoad();
  }, []);

  const handleRefresh = () => {
    loadChatsOptimized(true);
    fetchMatches();
  };

  const handleChatPress = async (chatId: number) => {
    try {
      // Mark chat as read when user opens it
      await chatsService.markChatAsRead(chatId);
      
      // Update local state to reflect read status
      setChats(prevChats => {
        return prevChats.map(chat => {
          if (chat.id === chatId) {
            return { ...chat, unread_count: 0 };
          }
          return chat;
        });
      });
      
      // Navigate to chat
      router.push(`/chat/${chatId}`);
    } catch (error) {
      console.error('Error marking chat as read:', error);
      // Still navigate even if marking as read fails
      router.push(`/chat/${chatId}`);
    }
  };

  const handleMatchPress = (match: Match) => {
    // Navigate to the user's profile or start a chat
    // For now, we'll navigate to the chat if it exists, otherwise show a message
    console.log('Match pressed:', match);
    // You can implement navigation to profile or start chat here
  };

  const handleSearchPress = () => {
    setIsSearchActive(!isSearchActive);
    if (!isSearchActive) {
      setSearchQuery("");
    }
  };

  const renderContent = () => {
    // Show loading shimmer only if no local data and still loading
    if (loading && !hasLocalData && isInitialLoad) {
      return (
        <VStack flex={1} justifyContent="center" alignItems="center">
          <ChatListShimmer />
          <Text color="#6B7280" mt="$4" textAlign="center">
            Loading chats...
          </Text>
        </VStack>
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
            onPress={() => loadChatsOptimized()}
          >
            <Text color="white">Try Again</Text>
          </Pressable>
        </Center>
      );
    }

    if (filteredChats.length === 0) {
      return (
        <Center flex={1} p="$4">
          <Ionicons 
            name={searchQuery ? "search-outline" : "chatbubble-outline"} 
            size={48} 
            color="#6B7280" 
          />
          <Text color="#6B7280" mt="$2" textAlign="center">
            {searchQuery ? 
              `No chats found for "${searchQuery}" in names or messages` : 
              "No chats yet. Start a conversation with someone!"
            }
          </Text>
        </Center>
      );
    }

    return (
      <ScrollView
        flex={1}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#8B5CF6"]}
            tintColor="#8B5CF6"
          />
        }
      >
        <VStack>
          {filteredChats.map((chat) => {
            const typingInfo = typingChats.get(chat.id);
            return (
              <ChatItem
                key={chat.id}
                chat={chat}
                onPress={handleChatPress}
                isTyping={!!typingInfo}
              />
            );
          })}
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
            
            {/* Loading spinner in header */}
            {isFetchingApi && chats.length > 0 && (
              <HStack space="xs" alignItems="center">
                <ActivityIndicator size="small" color="#8B5CF6" />
                <Text color="#6B7280" size="sm">
                  Updating...
                </Text>
              </HStack>
            )}
            
            <HStack space="md" alignItems="center">
              <TouchableOpacity onPress={handleSearchPress}>
                <Ionicons 
                  name={isSearchActive ? "close" : "search"} 
                  size={24} 
                  color="#1E1E1E" 
                />
              </TouchableOpacity>
              {!isSearchActive && (
                <TouchableOpacity>
                  <Ionicons name="ellipsis-horizontal" size={24} color="#1E1E1E" />
                </TouchableOpacity>
              )}
            </HStack>
          </HStack>

          {/* Search Input */}
          {isSearchActive && (
            <Box mt="$3">
              <Input
                size="md"
                borderWidth={1}
                borderColor="#E5E7EB"
                borderRadius="$lg"
                bg="white"
              >
                              <InputField
                placeholder="Search chats by name or message..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus={true}
              />
              </Input>
            </Box>
          )}
        </Box>

        {/* New Matches Section - only show if there are matches */}
        {matches.length > 0 && (
          <>
            <Box px="$4" pb="$4">
              <HStack justifyContent="space-between" alignItems="center" mb="$3">
                <Text
                  color="#1E1E1E"
                  size="md"
                  fontWeight="$bold"
                >
                  New Matches
                </Text>
                {matchesLoading && (
                  <ActivityIndicator size="small" color="#8B5CF6" />
                )}
              </HStack>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: 16 }}
              >
                {matches.map((match) => (
                  <MatchItem 
                    key={match.id} 
                    match={match} 
                    onPress={handleMatchPress}
                  />
                ))}
              </ScrollView>
            </Box>

            {/* Gray separator line with padding */}
            <Box px="$3">
              <Divider bg="#E5E7EB" />
            </Box>
          </>
        )}

        {/* Chat List */}
        {renderContent()}
      </VStack>
    </Box>
  );
}
