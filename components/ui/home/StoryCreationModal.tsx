import React, { useState } from 'react';
import { StyleSheet, Alert, Image, TouchableOpacity, Dimensions, TextInput } from 'react-native';
import {
  Modal,
  Box,
  Text,
  VStack,
  HStack,
  Button,
  ButtonText,
  Heading,
  Center,
} from '@gluestack-ui/themed';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { CreateStoryData } from '@/services/stories-service';

interface StoryCreationModalProps {
  visible: boolean;
  onClose: () => void;
  onCreateStory: (data: CreateStoryData) => Promise<void>;
}

const StoryCreationModal = ({ visible, onClose, onCreateStory }: StoryCreationModalProps) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [storyText, setStoryText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mediaFile, setMediaFile] = useState<any>(null);
  const [showTextInput, setShowTextInput] = useState(false);

  const { width, height } = Dimensions.get('window');

  const handleClose = () => {
    setSelectedImage(null);
    setStoryText('');
    setMediaFile(null);
    setShowTextInput(false);
    onClose();
  };

  const handleImagePick = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'We need camera roll permissions to select photos.');
        return;
      }

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [9, 16],
        quality: 0.8,
      };

      const result = await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        setMediaFile({
          uri: result.assets[0].uri,
          type: 'image/jpeg',
          name: `story_${Date.now()}.jpg`,
        });
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleCreateStory = async () => {
    if (!selectedImage) {
      Alert.alert('Error', 'Please select an image for your story.');
      return;
    }

    try {
      setIsLoading(true);
      
      const storyData: CreateStoryData = {
        media: mediaFile,
        type: 'image',
        caption: storyText.trim() || undefined,
      };

      await onCreateStory(storyData);
      handleClose();
    } catch (error) {
      console.error('Error creating story:', error);
      Alert.alert('Error', 'Failed to create story');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={visible} onClose={handleClose}>
      <Box
        width="100%"
        height="100%"
        bg="black"
        position="relative"
      >
        {/* Header */}
        <Box
          position="absolute"
          top={60}
          left={0}
          right={0}
          zIndex={10}
          px="$4"
        >
          <HStack justifyContent="space-between" alignItems="center">
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>
            <Heading color="white" size="lg">
              Your Story
            </Heading>
            <TouchableOpacity 
              onPress={() => setShowTextInput(!showTextInput)}
              style={styles.textButton}
            >
              <Ionicons name="text" size={24} color="white" />
            </TouchableOpacity>
          </HStack>
        </Box>

        {/* Main Content */}
        <Box flex={1} justifyContent="center" alignItems="center">
          {selectedImage ? (
            <Box
              width="100%"
              height="100%"
              position="relative"
              justifyContent="center"
              alignItems="center"
            >
              {/* Background Image */}
              <Image
                source={{ uri: selectedImage }}
                style={styles.storyImage}
                resizeMode="cover"
              />
              
              {/* Text Overlay */}
              {showTextInput && (
                <Box
                  position="absolute"
                  width="90%"
                  alignItems="center"
                  style={{ top: height * 0.4 }}
                >
                  <TextInput
                    style={styles.textOverlay}
                    placeholder="Add text..."
                    placeholderTextColor="rgba(255,255,255,0.7)"
                    value={storyText}
                    onChangeText={setStoryText}
                    multiline
                    textAlign="center"
                    maxLength={500}
                  />
                </Box>
              )}

              {/* Story text display when not editing */}
              {storyText && !showTextInput && (
                <TouchableOpacity
                  style={[styles.textDisplay, { top: height * 0.4 }]}
                  onPress={() => setShowTextInput(true)}
                >
                  <Text style={styles.displayText}>
                    {storyText}
                  </Text>
                </TouchableOpacity>
              )}
            </Box>
          ) : (
            /* Image Selection Screen */
            <VStack space="xl" alignItems="center" px="$8">
              <TouchableOpacity 
                onPress={handleImagePick} 
                style={styles.imagePickerContainer}
              >
                <LinearGradient
                  colors={['#8F3BBF', '#B678D6']}
                  style={styles.imagePickerGradient}
                >
                  <Ionicons name="camera" size={60} color="white" />
                  <Text color="white" fontWeight="$bold" fontSize="$xl" mt="$4">
                    Add Photo
                  </Text>
                  <Text color="rgba(255,255,255,0.8)" textAlign="center" mt="$2">
                    Choose a photo from your gallery
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </VStack>
          )}
        </Box>

        {/* Bottom Actions */}
        {selectedImage && (
          <Box
            position="absolute"
            bottom={50}
            left={0}
            right={0}
            px="$6"
            zIndex={10}
          >
            <HStack space="md" justifyContent="center">
              {/* Change Photo Button */}
              <TouchableOpacity
                onPress={handleImagePick}
                style={styles.actionButton}
              >
                <Ionicons name="images" size={24} color="white" />
              </TouchableOpacity>

              {/* Post Story Button */}
              <TouchableOpacity
                onPress={handleCreateStory}
                style={[styles.actionButton, styles.postButton]}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Text color="white" fontWeight="$bold">
                    Posting...
                  </Text>
                ) : (
                  <HStack space="xs" alignItems="center">
                    <Ionicons name="send" size={20} color="white" />
                    <Text color="white" fontWeight="$bold">
                      Share
                    </Text>
                  </HStack>
                )}
              </TouchableOpacity>
            </HStack>
          </Box>
        )}
      </Box>
    </Modal>
  );
};

const styles = StyleSheet.create({
  textButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    padding: 8,
  },
  storyImage: {
    width: '100%',
    height: '100%',
  },
  textOverlay: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 16,
    borderRadius: 12,
    minHeight: 60,
    width: '100%',
  },
  textDisplay: {
    position: 'absolute',
    width: '90%',
    alignItems: 'center',
  },
  displayText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  imagePickerContainer: {
    width: 280,
    height: 280,
    borderRadius: 140,
    overflow: 'hidden',
  },
  imagePickerGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 140,
  },
  actionButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 25,
    padding: 12,
    minWidth: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postButton: {
    backgroundColor: '#8F3BBF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 120,
  },
});

export default StoryCreationModal; 