import React from "react";
import { Pressable } from "react-native";
import { Modal, ModalBackdrop, ModalContent, ModalBody, VStack, HStack, Text } from "@gluestack-ui/themed";
import { Ionicons } from "@expo/vector-icons";

interface ChatOptionsProps {
  isVisible: boolean;
  onClose: () => void;
  onBlockUser: () => void;
  onClearChat: () => void;
  onDeleteChat: () => void;
}

const ChatOptions: React.FC<ChatOptionsProps> = ({
  isVisible,
  onClose,
  onBlockUser,
  onClearChat,
  onDeleteChat,
}) => {
  return (
    <Modal isOpen={isVisible} onClose={onClose}>
      <ModalBackdrop />
      <ModalContent>
        <ModalBody>
          <VStack space="md" p="$4">
            <Pressable onPress={onBlockUser} py="$3">
              <HStack alignItems="center" space="sm">
                <Ionicons name="ban-outline" size={24} color="#EF4444" />
                <Text color="#EF4444">Block User</Text>
              </HStack>
            </Pressable>
            <Pressable onPress={onClearChat} py="$3">
              <HStack alignItems="center" space="sm">
                <Ionicons name="trash-outline" size={24} color="#6B7280" />
                <Text>Clear Chat</Text>
              </HStack>
            </Pressable>
            <Pressable onPress={onDeleteChat} py="$3">
              <HStack alignItems="center" space="sm">
                <Ionicons name="close-circle-outline" size={24} color="#EF4444" />
                <Text color="#EF4444">Delete Chat</Text>
              </HStack>
            </Pressable>
            <Pressable onPress={onClose} py="$3">
              <HStack alignItems="center" space="sm">
                <Ionicons name="close-outline" size={24} color="#6B7280" />
                <Text>Cancel</Text>
              </HStack>
            </Pressable>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default ChatOptions;
