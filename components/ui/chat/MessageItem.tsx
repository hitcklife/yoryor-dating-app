import React, { useState, useCallback } from "react";
import { Pressable, Modal, Dimensions, Alert } from "react-native";
import { Box, Text, HStack, VStack, Image, Avatar, AvatarImage, Badge, BadgeText } from "@gluestack-ui/themed";
import { Ionicons } from "@expo/vector-icons";
import { Message } from "@/services/chats-service";
import { getMessageReadStatus } from '@/services/chats-service';

interface MessageItemProps {
  message: Message;
  formatMessageTime: (timestamp: string) => string;
  formatDuration?: (seconds: number) => string;
  isCurrentlyPlaying?: boolean;
  onPlayVoiceMessage?: (mediaUrl: string, messageId: number) => void;
  onRetry?: (message: Message) => void;
  onEdit?: (message: Message) => void;
  onDelete?: (messageId: number) => void;
  onReply?: (message: Message) => void;
  replyToMessage?: Message | null; // For displaying replied message context
  currentUserId: number;
  otherUserId: number;
}

// Read status icon component
const ReadStatusIcon = ({ status }: { status: 'sent' | 'delivered' | 'read' }) => {
  switch (status) {
    case 'sent':
      return <Ionicons name="checkmark" size={14} color="#9CA3AF" />;
    case 'delivered':
      return <Ionicons name="checkmark-done" size={14} color="#9CA3AF" />;
    case 'read':
      return <Ionicons name="checkmark-done" size={14} color="#8B5CF6" />;
    default:
      return null;
  }
};

const MessageItem: React.FC<MessageItemProps> = ({
  message,
  formatMessageTime,
  formatDuration = (seconds) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`,
  isCurrentlyPlaying = false,
  onPlayVoiceMessage = () => {},
  onRetry = () => {},
  onEdit = () => {},
  onDelete = () => {},
  onReply = () => {},
  replyToMessage = null,
  currentUserId,
  otherUserId,
}) => {
  const isMe = message.is_mine;
  const isVoiceMessage = message.message_type === 'voice';
  const isImageMessage = message.message_type === 'image';
  const isVideoMessage = message.message_type === 'video';
  const canEdit = isMe && message.message_type === 'text' && !message.deleted_at;
  const canDelete = isMe && !message.deleted_at;
  
  const [showFullImage, setShowFullImage] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  // Determine background color based on message status
  let bgColor = isMe ? "#8B5CF6" : "#F9FAFB";

  if (isMe) {
    if (message.status === "sending" || message.status === "pending") {
      bgColor = "#A78BFA"; // Lighter color for sending/pending
    } else if (message.status === "failed") {
      bgColor = "#EF4444"; // Red color for failed
    }
  }

  // Get read status for message
  const getReadStatus = useCallback(() => {
    if (!message.is_mine) {
      return null; // Don't show read status for received messages
    }

    if (message.is_read) {
      return 'read';
    }

    if (message.status === 'sent' || message.status === 'delivered') {
      return 'delivered';
    }

    return 'sent';
  }, [message.is_mine, message.is_read, message.status]);

  const handleLongPress = (event: any) => {
    if (!isMe && !onReply) return; // Only show menu if user can perform actions
    
    const { pageX, pageY } = event.nativeEvent;
    setMenuPosition({ x: pageX, y: pageY });
    setShowContextMenu(true);
  };

  const handleEdit = () => {
    setShowContextMenu(false);
    if (canEdit && onEdit) {
      onEdit(message);
    }
  };

  const handleDelete = () => {
    setShowContextMenu(false);
    if (canDelete && onDelete) {
      Alert.alert(
        "Delete Message",
        "Are you sure you want to delete this message?",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Delete", 
            style: "destructive",
            onPress: () => onDelete(message.id)
          }
        ]
      );
    }
  };

  const handleReply = () => {
    setShowContextMenu(false);
    if (onReply) {
      onReply(message);
    }
  };

  const renderReplyMessage = () => {
    if (!message.reply_to_message_id || !replyToMessage) return null;

    return (
      <Box
        bg={isMe ? "rgba(255,255,255,0.2)" : "#E5E7EB"}
        borderRadius="$sm"
        p="$2"
        mb="$2"
        borderLeftWidth={3}
        borderLeftColor={isMe ? "#FFFFFF" : "#8B5CF6"}
      >
        <Text
          color={isMe ? "#EDE9FE" : "#6B7280"}
          fontSize="$xs"
          fontWeight="$medium"
          mb="$1"
        >
          {replyToMessage.is_mine ? "You" : ""}
        </Text>
        <Text
          color={isMe ? "#FFFFFF" : "#1F2937"}
          fontSize="$sm"
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {replyToMessage.content}
        </Text>
      </Box>
    );
  };

  const renderMessageContent = () => {
    if (isVoiceMessage) {
      return (
        <Pressable onPress={() => message.media_url && onPlayVoiceMessage(message.media_url, message.id)}>
          <HStack alignItems="center" space="sm">
            <Ionicons
              name={isCurrentlyPlaying ? "pause-circle" : "play-circle"}
              size={24}
              color={isMe ? "#FFFFFF" : "#8B5CF6"}
            />
            <VStack>
              <Text
                color={isMe ? "#FFFFFF" : "#1F2937"}
                fontSize="$sm"
                fontWeight="$medium"
              >
                Voice Message
              </Text>
              <Text
                color={isMe ? "#EDE9FE" : "#6B7280"}
                fontSize="$xs"
              >
                {message.media_data?.duration ? formatDuration(message.media_data.duration) : message.content}
              </Text>
            </VStack>
          </HStack>
        </Pressable>
      );
    }

    if (isImageMessage && message.media_url) {
      return (
        <VStack space="sm">
          <Pressable onPress={() => setShowFullImage(true)}>
            <Box borderRadius="$lg" overflow="hidden">
              <Image
                source={{ uri: message.media_url }}
                alt="Message image"
                width={200}
                height={150}
                resizeMode="cover"
              />
            </Box>
          </Pressable>
          {message.content && message.content !== `Sent a image` && (
            <Text
              color={isMe ? "#FFFFFF" : "#1F2937"}
              fontSize="$md"
            >
              {message.content}
            </Text>
          )}
        </VStack>
      );
    }

    if (isVideoMessage && message.media_url) {
      return (
        <VStack space="sm">
          <Pressable onPress={() => setShowFullImage(true)}>
            <Box 
              width={200} 
              height={150} 
              borderRadius="$lg" 
              bg="#F3F4F6" 
              justifyContent="center" 
              alignItems="center"
              overflow="hidden"
            >
              <Ionicons name="videocam" size={32} color="#6B7280" />
              <Text color="#6B7280" fontSize="$xs" mt="$1">Video</Text>
            </Box>
          </Pressable>
          {message.content && message.content !== `Sent a video` && (
            <Text
              color={isMe ? "#FFFFFF" : "#1F2937"}
              fontSize="$md"
            >
              {message.content}
            </Text>
          )}
        </VStack>
      );
    }

    // Default text message
    return (
      <Text
        color={isMe ? "#FFFFFF" : "#1F2937"}
        fontSize="$md"
      >
        {message.content}
      </Text>
    );
  };

  return (
    <>
      <Pressable onLongPress={handleLongPress}>
        <Box
          maxWidth="80%"
          bg={bgColor}
          borderRadius="$2xl"
          p="$3"
          mb="$2"
          alignSelf={isMe ? "flex-end" : "flex-start"}
          borderTopRightRadius={isMe ? "$none" : "$2xl"}
          borderTopLeftRadius={isMe ? "$2xl" : "$none"}
        >
          {renderReplyMessage()}
          {renderMessageContent()}
          
          <HStack justifyContent="space-between" alignItems="center" mt="$1">
            <HStack alignItems="center">
              {message.is_edited && (
                <Text
                  color={isMe ? "#EDE9FE" : "#6B7280"}
                  fontSize="$xs"
                  mr="$1"
                >
                  edited
                </Text>
              )}
            </HStack>
            
            <HStack alignItems="center">
              {isMe && (
                <>
                  {(message.status === "sending" || message.status === "pending") && (
                    <Ionicons name="time-outline" size={12} color="#E0E0E0" style={{ marginRight: 4 }} />
                  )}
                  <HStack space="xs" alignItems="center">
                    <Text color="#9CA3AF" size="xs">
                      {formatMessageTime(message.sent_at)}
                    </Text>
                    {isMe && (
                      <ReadStatusIcon 
                        status={getReadStatus() || 'sent'} 
                      />
                    )}
                    {message.status === "failed" && (
                      <Pressable onPress={() => onRetry(message)}>
                        <Ionicons name="refresh" size={12} color="#EF4444" />
                      </Pressable>
                    )}
                  </HStack>
                </>
              )}
            </HStack>
          </HStack>
        </Box>
      </Pressable>

      {/* Context Menu Modal */}
      <Modal
        visible={showContextMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowContextMenu(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }}
          onPress={() => setShowContextMenu(false)}
        >
          <Box
            position="absolute"
            top={Math.min(menuPosition.y - 50, Dimensions.get('window').height - 200)}
            left={Math.min(menuPosition.x - 50, Dimensions.get('window').width - 150)}
            bg="#FFFFFF"
            borderRadius="$lg"
            shadowColor="#000000"
            shadowOffset={{ width: 0, height: 2 }}
            shadowOpacity={0.25}
            shadowRadius={4}
            elevation={5}
            minWidth={120}
          >
            {onReply && (
              <Pressable onPress={handleReply}>
                <HStack alignItems="center" space="sm" p="$3">
                  <Ionicons name="arrow-undo" size={16} color="#6B7280" />
                  <Text color="#1F2937" fontSize="$sm">Reply</Text>
                </HStack>
              </Pressable>
            )}
            
            {canEdit && (
              <Pressable onPress={handleEdit}>
                <HStack alignItems="center" space="sm" p="$3">
                  <Ionicons name="pencil" size={16} color="#6B7280" />
                  <Text color="#1F2937" fontSize="$sm">Edit</Text>
                </HStack>
              </Pressable>
            )}
            
            {canDelete && (
              <Pressable onPress={handleDelete}>
                <HStack alignItems="center" space="sm" p="$3">
                  <Ionicons name="trash" size={16} color="#EF4444" />
                  <Text color="#EF4444" fontSize="$sm">Delete</Text>
                </HStack>
              </Pressable>
            )}
          </Box>
        </Pressable>
      </Modal>

      {/* Full Screen Image Modal */}
      <Modal
        visible={showFullImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFullImage(false)}
      >
        <Box flex={1} bg="rgba(0,0,0,0.9)" justifyContent="center" alignItems="center">
          <Pressable 
            style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
            onPress={() => setShowFullImage(false)}
          >
            {isImageMessage && message.media_url && (
              <Image
                source={{ uri: message.media_url }}
                alt="Full size image"
                width={Dimensions.get('window').width * 0.9}
                height={Dimensions.get('window').height * 0.7}
                resizeMode="contain"
              />
            )}
            {isVideoMessage && message.media_url && (
              <Box 
                width={Dimensions.get('window').width * 0.9}
                height={Dimensions.get('window').height * 0.7}
                bg="#000000"
                justifyContent="center" 
                alignItems="center"
                borderRadius="$lg"
              >
                <Ionicons name="videocam" size={64} color="#FFFFFF" />
                <Text color="#FFFFFF" fontSize="$lg" mt="$2">Video Player</Text>
                <Text color="#FFFFFF" fontSize="$sm" mt="$1">Tap to close</Text>
              </Box>
            )}
          </Pressable>
        </Box>
      </Modal>
    </>
  );
};

export default MessageItem;
