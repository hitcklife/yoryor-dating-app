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
      <Box p="$2" bg="#FFFFFF" borderTopWidth={1} borderTopColor="#E5E7EB">
        <HStack alignItems="center" justifyContent="space-between">
          <HStack alignItems="center" space="sm">
            <Pressable onPress={onPlayRecordedAudio}>
              <Ionicons
                name={isPlaying ? "pause-circle" : "play-circle"}
                size={32}
                color="#8B5CF6"
              />
            </Pressable>
            <Text fontWeight="$bold">{formatDuration(recordingState.duration)}</Text>
          </HStack>
          <HStack space="md">
            <Pressable onPress={onCancelRecording}>
              <Ionicons name="close-circle" size={24} color="#EF4444" />
            </Pressable>
            <Pressable onPress={onSendVoiceMessage} disabled={isSending}>
              <Ionicons
                name="send"
                size={24}
                color={isSending ? "#A78BFA" : "#8B5CF6"}
              />
            </Pressable>
          </HStack>
        </HStack>
      </Box>
    );
  }

  // Show recording indicator while recording
  if (recordingState.isRecording) {
    return (
      <Box p="$2" bg="#FFFFFF" borderTopWidth={1} borderTopColor="#E5E7EB">
        <HStack alignItems="center" justifyContent="center" space="sm">
          {/* Stop button on the left */}
          <Pressable onPress={onStopRecording} style={{ marginRight: 16 }}>
            <Ionicons name="stop-circle" size={32} color="#EF4444" />
          </Pressable>
          <Box
            style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: "#EF4444", marginRight: 8 }}
          />
          <Text color="#EF4444" fontWeight="$bold">
            Recording {formatDuration(recordingState.duration)}
          </Text>
          <Pressable onPress={onCancelRecording} style={{ marginLeft: 16 }}>
            <Text color="#8B5CF6">Cancel</Text>
          </Pressable>
        </HStack>
      </Box>
    );
  }

  // Default: show message input and mic button
  return (
    <Box
      p="$2"
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
