import React from "react";
import { Pressable } from "react-native";
import { Box, HStack, Text, View } from "@gluestack-ui/themed";
import { Ionicons } from "@expo/vector-icons";

interface RecordingState {
  isRecording: boolean;
  duration: number;
  recordedAudio: { uri: string } | null;
  showVoiceMessage: boolean;
}

interface VoiceRecorderProps {
  recordingState: RecordingState;
  isPlaying: boolean;
  formatDuration: (seconds: number) => string;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onCancelRecording: () => void;
  onPlayRecordedAudio: () => void;
  onSendVoiceMessage: () => void;
  isSending: boolean;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  recordingState,
  isPlaying,
  formatDuration,
  onStartRecording,
  onStopRecording,
  onCancelRecording,
  onPlayRecordedAudio,
  onSendVoiceMessage,
  isSending,
}) => {
  // Voice message preview
  if (recordingState.showVoiceMessage && recordingState.recordedAudio) {
    return (
      <Box
        bg="#F9FAFB"
        p="$3"
        borderTopWidth={1}
        borderTopColor="#E5E7EB"
      >
        <HStack justifyContent="space-between" alignItems="center">
          <HStack space="sm" alignItems="center">
            <Pressable onPress={onPlayRecordedAudio}>
              <Ionicons
                name={isPlaying ? "pause-circle" : "play-circle"}
                size={32}
                color="#8B5CF6"
              />
            </Pressable>
            <Text>
              {formatDuration(recordingState.duration)}
            </Text>
          </HStack>
          <HStack space="md">
            <Pressable onPress={onCancelRecording}>
              <Ionicons name="close-circle" size={24} color="#EF4444" />
            </Pressable>
            <Pressable
              onPress={onSendVoiceMessage}
              disabled={isSending}
            >
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

  // Recording indicator
  if (recordingState.isRecording) {
    return (
      <HStack space="sm" alignItems="center" justifyContent="center" mt="$2">
        <View
          style={{
            width: 12,
            height: 12,
            borderRadius: 6,
            backgroundColor: "#EF4444"
          }}
        />
        <Text color="#EF4444">
          Recording {formatDuration(recordingState.duration)}
        </Text>
        <Pressable onPress={onCancelRecording}>
          <Text color="#8B5CF6">Cancel</Text>
        </Pressable>
      </HStack>
    );
  }

  // Voice recording button
  return (
    <Pressable
      onPressIn={onStartRecording}
      onPressOut={onStopRecording}
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
  );
};

export default VoiceRecorder;
