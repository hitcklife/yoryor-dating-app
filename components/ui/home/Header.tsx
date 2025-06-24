import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Box, Text, HStack, VStack } from '@gluestack-ui/themed';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface HeaderProps {
  onSettingsPress: () => void;
}

const Header = ({ onSettingsPress }: HeaderProps) => {
  const insets = useSafeAreaInsets();

  return (
    <Box
      pt={insets.top} // Use safe area top + additional padding
      pb="$4"
      px="$4"
      bg="#FDF7FD"
    >
      <VStack space="sm">
        <HStack justifyContent="space-between" alignItems="center">
          <Text
            fontSize={28}
            fontWeight="$bold"
            color="#FF6B9D"
            style={{ fontFamily: 'System' }}
          >
            Dating
          </Text>
          <HStack space="lg" alignItems="center">
            <TouchableOpacity style={styles.headerButton}>
              <Ionicons name="heart-outline" size={24} color="#FF6B9D" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={onSettingsPress}
            >
              <Ionicons name="settings-outline" size={24} color="#FF6B9D" />
            </TouchableOpacity>
          </HStack>
        </HStack>
      </VStack>
    </Box>
  );
};

const styles = StyleSheet.create({
  headerButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 107, 157, 0.1)',
  },
});

export default Header;
