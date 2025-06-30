import React, { useState } from "react";
import { Pressable, Modal, Dimensions } from "react-native";
import { Box, Text, HStack, VStack, Image } from "@gluestack-ui/themed";
import { Ionicons } from "@expo/vector-icons";
import { Message } from "@/services/chats-service";

interface MessageItemProps {
  message: Message;
  formatMessageTime: (timestamp: string) => string;
  formatDuration?: (seconds: number) => string;
  isCurrentlyPlaying?: boolean;
  onPlayVoiceMessage?: (mediaUrl: string, messageId: number) => void;
  onRetry?: (message: Message) => void;
}

const MessageItem: React.FC<MessageItemProps> = ({
  message,
  formatMessageTime,
  formatDuration = (seconds) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`,
  isCurrentlyPlaying = false,
  onPlayVoiceMessage = () => {},
  onRetry = () => {},
}) => {
  const isMe = message.is_mine;
  const isVoiceMessage = message.message_type === 'voice';
  const isImageMessage = message.message_type === 'image';
  const isVideoMessage = message.message_type === 'video';
  
  const [showFullImage, setShowFullImage] = useState(false);

  // Determine background color based on message status
  let bgColor = isMe ? "#8B5CF6" : "#F9FAFB";

  if (isMe) {
    if (message.status === "sending" || message.status === "pending") {
      bgColor = "#A78BFA"; // Lighter color for sending/pending
    } else if (message.status === "failed") {
      bgColor = "#EF4444"; // Red color for failed
    }
  }

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
        {renderMessageContent()}
        
        <HStack justifyContent="flex-end" alignItems="center" mt="$1">
          {isMe && (
            <>
              {(message.status === "sending" || message.status === "pending") && (
                <Ionicons name="time-outline" size={12} color="#E0E0E0" style={{ marginRight: 4 }} />
              )}
              {message.status === "sent" && (
                <Ionicons name="checkmark" size={12} color="#E0E0E0" style={{ marginRight: 4 }} />
              )}
              {message.status === "failed" && (
                <Pressable onPress={() => onRetry(message)}>
                  <Ionicons name="alert-circle" size={12} color="#FF4D4D" style={{ marginRight: 4 }} />
                </Pressable>
              )}
            </>
          )}
          <Text
            color={isMe ? "#EDE9FE" : "#6B7280"}
            fontSize="$xs"
            textAlign="right"
          >
            {formatMessageTime(message.sent_at || message.created_at)}
          </Text>
        </HStack>
      </Box>

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
