import React from 'react';
import { StyleSheet, TouchableOpacity, Image, Modal, Dimensions } from 'react-native';
import { Box } from '@gluestack-ui/themed';
import { Ionicons } from '@expo/vector-icons';

interface PhotoModalProps {
  visible: boolean;
  photoUrl: string | null;
  onClose: () => void;
}

const PhotoModal = ({ visible, photoUrl, onClose }: PhotoModalProps) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Box
        flex={1}
        bg="rgba(0,0,0,0.9)"
        justifyContent="center"
        alignItems="center"
      >
        {/* Close Button */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
        >
          <Ionicons name="close" size={30} color="white" />
        </TouchableOpacity>

        {/* Large Photo */}
        {photoUrl && (
          <Image
            source={{ uri: photoUrl }}
            style={styles.modalImage}
            resizeMode="contain"
          />
        )}
      </Box>
    </Modal>
  );
};

const styles = StyleSheet.create({
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 1,
    padding: 15,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalImage: {
    width: Dimensions.get('window').width * 0.9,
    height: Dimensions.get('window').height * 0.7,
  },
});

export default PhotoModal;
