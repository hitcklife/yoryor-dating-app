import React from "react";
import { Pressable } from "react-native";
import { Box, HStack, Input, InputField, Text } from "@gluestack-ui/themed";
import { Ionicons } from "@expo/vector-icons";
import VoiceRecorder from "./VoiceRecorder";

interface RecordingState {
  isRecording: boolean;
  duration: number;
  recordedAudio: { uri: string } | null;
  showVoiceMessage: boolean;
}

interface MessageInputProps {
  message: string;
  isSending: boolean;
  recordingState: RecordingState;
  isPlaying: boolean;
  formatDuration: (seconds: number) => string;
  onMessageChange: (text: string) => void;
  onSend: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onCancelRecording: () => void;
  onPlayRecordedAudio: () => void;
  onSendVoiceMessage: () => void;
  onFocus: () => void;
  onBlur: () => void;
  onAttachFile: () => void;
}

const MessageInput: React.FC<MessageInputProps> = ({
  message,
  isSending,
  recordingState,
  isPlaying,
  formatDuration,
  onMessageChange,
  onSend,
  onStartRecording,
  onStopRecording,
  onCancelRecording,
  onPlayRecordedAudio,
  onSendVoiceMessage,
  onFocus,
  onBlur,
  onAttachFile,
}) => {
  // Show recording preview (after recording, before sending)
  if (recordingState.showVoiceMessage && recordingState.recordedAudio) {
    return (
      <Box
        p="$2"
        pb="$8"
        bg="#FFFFFF"
        borderTopWidth={1}
        borderTopColor="#E5E7EB"
      >
        <HStack space="sm" alignItems="center">
          {/* Play button */}
          <Pressable onPress={onPlayRecordedAudio}>
            <Box
              p="$2"
              bg="#F9FAFB"
              borderRadius="$full"
            >
              <Ionicons
                name={isPlaying ? "pause-circle" : "play-circle"}
                size={24}
                color="#8B5CF6"
              />
            </Box>
          </Pressable>

          {/* Duration display */}
          <Box flex={1} bg="#F9FAFB" borderRadius="$2xl" px="$3" py="$2">
            <Text fontWeight="$bold" color="#1F2937">
              {formatDuration(recordingState.duration)}
            </Text>
          </Box>

          {/* Cancel button */}
          <Pressable onPress={onCancelRecording}>
            <Box
              p="$2"
              bg="#FEE2E2"
              borderRadius="$full"
            >
              <Ionicons name="close" size={24} color="#EF4444" />
            </Box>
          </Pressable>

          {/* Send button */}
          <Pressable onPress={onSendVoiceMessage} disabled={isSending}>
            <Box
              p="$2"
              bg={isSending ? "#A78BFA" : "#8B5CF6"}
              borderRadius="$full"
            >
              <Ionicons
                name="send"
                size={24}
                color="#FFFFFF"
              />
            </Box>
          </Pressable>
        </HStack>
      </Box>
    );
  }

  // Show recording indicator while recording
  if (recordingState.isRecording) {
    return (
      <Box
        p="$2"
        pb="$8"
        bg="#FFFFFF"
        borderTopWidth={1}
        borderTopColor="#E5E7EB"
      >
        <HStack space="sm" alignItems="center">
          {/* Stop button */}
          <Pressable onPress={onStopRecording}>
            <Box
              p="$2"
              bg="#FEE2E2"
              borderRadius="$full"
            >
              <Ionicons name="stop" size={24} color="#EF4444" />
            </Box>
          </Pressable>

          {/* Recording indicator and duration */}
          <Box flex={1} bg="#FEE2E2" borderRadius="$2xl" px="$3" py="$2">
            <HStack space="sm" alignItems="center">
              <Box
                style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#EF4444" }}
              />
              <Text color="#EF4444" fontWeight="$bold">
                Recording {formatDuration(recordingState.duration)}
              </Text>
            </HStack>
          </Box>

          {/* Cancel button */}
          <Pressable onPress={onCancelRecording}>
            <Box
              p="$2"
              bg="#F9FAFB"
              borderRadius="$full"
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </Box>
          </Pressable>

          {/* Placeholder for spacing */}
          <Box
            p="$2"
            bg="transparent"
            borderRadius="$full"
          >
            <Box style={{ width: 24, height: 24 }} />
          </Box>
        </HStack>
      </Box>
    );
  }

  // Default: show message input and mic button
  return (
    <Box
      p="$2"
      pb="$8"
      bg="#FFFFFF"
      borderTopWidth={1}
      borderTopColor="#E5E7EB"
    >
      <HStack space="sm" alignItems="center">
        {/* Mic button (disabled while recording) */}
        <Pressable
          onPressIn={onStartRecording}
          disabled={recordingState.isRecording}
        >
          <Box
            p="$2"
            bg={recordingState.isRecording ? "#FEE2E2" : "#F9FAFB"}
            borderRadius="$full"
          >
            <Ionicons
              name={recordingState.isRecording ? "mic" : "mic-outline"}
              size={24}
              color={recordingState.isRecording ? "#EF4444" : "#6B7280"}
            />
          </Box>
        </Pressable>

        {/* Message input */}
        <Input
          flex={1}
          size="md"
          borderRadius="$2xl"
          bg="#F9FAFB"
          borderWidth={0}
          isDisabled={recordingState.isRecording}
        >
          <InputField
            placeholder="Type a message..."
            value={message}
            onChangeText={onMessageChange}
            color="#1F2937"
            onFocus={onFocus}
            onBlur={onBlur}
          />
        </Input>

        {/* File attachment button */}
        <Pressable
          onPress={onAttachFile}
          disabled={recordingState.isRecording}
        >
          <Box
            p="$2"
            bg="#F9FAFB"
            borderRadius="$full"
          >
            <Ionicons
              name="attach"
              size={24}
              color="#6B7280"
            />
          </Box>
        </Pressable>

        {/* Send button */}
        <Pressable
          onPress={onSend}
          disabled={message.trim() === "" || isSending}
        >
          <Box
            p="$2"
            bg={message.trim() === "" ? "#F9FAFB" : "#8B5CF6"}
            borderRadius="$full"
          >
            <Ionicons
              name="send"
              size={24}
              color={message.trim() === "" ? "#A1A1AA" : "#FFFFFF"}
            />
          </Box>
        </Pressable>
      </HStack>
    </Box>
  );
};

export default MessageInput;
