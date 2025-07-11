import React, { useState, useRef } from "react";
import {
  Dimensions,
  FlatList,
  Pressable,
  StatusBar,
} from "react-native";
import { Box, Text, HStack, VStack } from "@gluestack-ui/themed";
import { Ionicons } from "@expo/vector-icons";
import { CachedImage } from "@/components/ui/CachedImage";
import { ProfilePhoto } from "@/services/chats-service";

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface ImageGalleryProps {
  images: ProfilePhoto[];
  initialIndex: number;
  isVisible: boolean;
  onClose: () => void;
}

export default function ImageGallery({
  images,
  initialIndex,
  isVisible,
  onClose,
}: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const flatListRef = useRef<FlatList>(null);

  const handleImageChange = (index: number) => {
    setCurrentIndex(index);
  };

  const renderImage = ({ item }: { item: ProfilePhoto }) => (
    <Box width={screenWidth} height={screenHeight} justifyContent="center" alignItems="center">
      <CachedImage
        uri={item.original_url}
        type="profile"
        style={{
          width: screenWidth,
          height: screenHeight,
        }}
        resizeMode="contain"
      />
    </Box>
  );

  if (!isVisible) return null;

  return (
    <Box
      position="absolute"
      top={0}
      left={0}
      right={0}
      bottom={0}
      bg="#000000"
      zIndex={1000}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* Header */}
      <Box
        position="absolute"
        top={0}
        left={0}
        right={0}
        zIndex={1001}
        bg="rgba(0,0,0,0.5)"
        pt={50}
        pb="$4"
        px="$4"
      >
        <HStack alignItems="center" justifyContent="space-between">
          <Pressable onPress={onClose}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </Pressable>
          <Text color="#FFFFFF" fontSize="$md" fontWeight="$medium">
            {currentIndex + 1} / {images.length}
          </Text>
          <Box width={24} />
        </HStack>
      </Box>

      {/* Image Gallery */}
      <FlatList
        ref={flatListRef}
        data={images}
        renderItem={renderImage}
        keyExtractor={(item) => item.id.toString()}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={initialIndex}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
          handleImageChange(index);
        }}
        getItemLayout={(data, index) => ({
          length: screenWidth,
          offset: screenWidth * index,
          index,
        })}
      />

      {/* Bottom Controls */}
      {images.length > 1 && (
        <Box
          position="absolute"
          bottom={0}
          left={0}
          right={0}
          bg="rgba(0,0,0,0.5)"
          py="$4"
          px="$4"
        >
          <HStack justifyContent="center" space="md">
            <Pressable
              onPress={() => {
                if (currentIndex > 0) {
                  const newIndex = currentIndex - 1;
                  setCurrentIndex(newIndex);
                  flatListRef.current?.scrollToIndex({
                    index: newIndex,
                    animated: true,
                  });
                }
              }}
              disabled={currentIndex === 0}
            >
              <Ionicons
                name="chevron-back"
                size={24}
                color={currentIndex === 0 ? "#666666" : "#FFFFFF"}
              />
            </Pressable>
            
            <VStack alignItems="center" space="xs">
              <Text color="#FFFFFF" fontSize="$sm">
                {currentIndex + 1} of {images.length}
              </Text>
            </VStack>
            
            <Pressable
              onPress={() => {
                if (currentIndex < images.length - 1) {
                  const newIndex = currentIndex + 1;
                  setCurrentIndex(newIndex);
                  flatListRef.current?.scrollToIndex({
                    index: newIndex,
                    animated: true,
                  });
                }
              }}
              disabled={currentIndex === images.length - 1}
            >
              <Ionicons
                name="chevron-forward"
                size={24}
                color={currentIndex === images.length - 1 ? "#666666" : "#FFFFFF"}
              />
            </Pressable>
          </HStack>
        </Box>
      )}
    </Box>
  );
} 