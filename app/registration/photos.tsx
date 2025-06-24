import React, {useState, useRef, useEffect} from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Alert, Image } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { RegistrationLayout } from '@/components/ui/registration-layout';
import {
  Box,
  Text,
  ScrollView,
  Pressable,
  Button,
  ButtonText,
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  VStack,
  HStack,
  Icon,
  CloseIcon,
  Switch
} from '@gluestack-ui/themed';

interface PhotoData {
  id: string;
  uri: string;
  isMain: boolean;
  isPrivate: boolean;
}

// Private Photo Info Modal
const PrivatePhotoInfoModal = ({
  isOpen,
  onClose
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalBackdrop />
      <ModalContent>
        <ModalHeader>
          <Text size="lg" fontWeight="$bold">PRIVATE PHOTO</Text>
          <ModalCloseButton>
            <Icon as={CloseIcon} />
          </ModalCloseButton>
        </ModalHeader>
        <ModalBody>
          <VStack space="md">
            <HStack alignItems="center" space="sm" mb="$2">
              <Ionicons name="eye-off" size={24} color="#8F3BBF" />
              <Text size="md" fontWeight="$semibold" color="$primary900">
                WHAT ARE PRIVATE PHOTOS?
              </Text>
            </HStack>

            <Text size="sm" color="$textDark700" lineHeight="$lg">
              PRIVATE PHOTOS WILL ONLY BE VISIBLE TO PEOPLE WHO YOU'VE MATCHED WITH.
              OTHERS WILL SEE THEM AS BLURRED IMAGES UNTIL YOU BOTH MATCH.
            </Text>

            <Box bg="$backgroundLight100" p="$3" borderRadius="$md" mt="$2">
              <HStack alignItems="center" space="sm">
                <Ionicons name="shield-checkmark" size={20} color="#10B981" />
                <Text size="xs" color="$textDark600" flex={1}>
                  YOUR PRIVACY IS PROTECTED UNTIL YOU CHOOSE TO CONNECT
                </Text>
              </HStack>
            </Box>

            <Button
              onPress={onClose}
              bg="$primary500"
              $active-bg="$primary600"
              mt="$2"
            >
              <ButtonText>GOT IT</ButtonText>
            </Button>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

// Photo Source Selection Modal
const PhotoSourceModal = ({
  isOpen,
  onClose,
  onCameraSelect,
  onGallerySelect
}: {
  isOpen: boolean;
  onClose: () => void;
  onCameraSelect: () => void;
  onGallerySelect: () => void;
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalBackdrop />
      <ModalContent>
        <ModalHeader>
          <Text size="lg" fontWeight="$bold">SELECT PHOTO SOURCE</Text>
          <ModalCloseButton>
            <Icon as={CloseIcon} />
          </ModalCloseButton>
        </ModalHeader>
        <ModalBody>
          <VStack space="md">
            <Button
              onPress={onCameraSelect}
              bg="$primary500"
              $active-bg="$primary600"
            >
              <HStack space="sm" alignItems="center">
                <Ionicons name="camera" size={20} color="white" />
                <ButtonText>TAKE PHOTO</ButtonText>
              </HStack>
            </Button>

            <Button
              onPress={onGallerySelect}
              variant="outline"
              borderColor="$primary500"
            >
              <HStack space="sm" alignItems="center">
                <Ionicons name="images" size={20} color="#8F3BBF" />
                <ButtonText color="$primary500">CHOOSE FROM GALLERY</ButtonText>
              </HStack>
            </Button>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

// Camera Modal Component
const CameraModal = ({
  isOpen,
  onClose,
  onPhotoTaken
}: {
  isOpen: boolean;
  onClose: () => void;
  onPhotoTaken: (uri: string) => void;
}) => {
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  if (!permission) {
    return <Box />;
  }

  if (!permission.granted) {
    return (
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalBackdrop />
        <ModalContent>
          <ModalHeader>
            <Text size="lg" fontWeight="$bold">CAMERA PERMISSION</Text>
            <ModalCloseButton>
              <Icon as={CloseIcon} />
            </ModalCloseButton>
          </ModalHeader>
          <ModalBody>
            <VStack space="md" alignItems="center">
              <Text textAlign="center">
                WE NEED YOUR PERMISSION TO SHOW THE CAMERA
              </Text>
              <Button onPress={requestPermission} bg="$primary500">
                <ButtonText>GRANT PERMISSION</ButtonText>
              </Button>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    );
  }

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: false,
        });
        if (photo) {
          onPhotoTaken(photo.uri);
          onClose();
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to take picture');
      }
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="full">
      <ModalContent flex={1} bg="$black">
        <Box flex={1}>
          <CameraView
            ref={cameraRef}
            style={{ flex: 1 }}
            facing={facing}
          />
          <Box
            position="absolute"
            bottom="$10"
            left="$0"
            right="$0"
            alignItems="center"
          >
            <HStack space="xl" alignItems="center">
              <Pressable
                onPress={onClose}
                bg="$backgroundLight100"
                p="$3"
                borderRadius="$full"
              >
                <Icon as={CloseIcon} size="xl" color="$textDark900" />
              </Pressable>

              <Pressable
                onPress={takePicture}
                bg="$white"
                borderWidth="$4"
                borderColor="$backgroundLight300"
                width="$20"
                height="$20"
                borderRadius="$full"
              />

              <Pressable
                onPress={toggleCameraFacing}
                bg="$backgroundLight100"
                p="$3"
                borderRadius="$full"
              >
                <Ionicons name="camera-reverse" size={24} color="#1a1a1a" />
              </Pressable>
            </HStack>
          </Box>
        </Box>
      </ModalContent>
    </Modal>
  );
};

// Photo Upload Component
const PhotoUploader = ({
  isMain = false,
  onSelect
}: {
  isMain?: boolean;
  onSelect: () => void;
}) => {
  return (
    <Pressable
      onPress={onSelect}
      borderWidth="$2"
      borderColor="$primary500"
      borderStyle="dashed"
      borderRadius="$lg"
      alignItems="center"
      justifyContent="center"
      width={isMain ? "100%" : "$24"}
      height={isMain ? "$48" : "$24"}
      mb={isMain ? "$4" : "$0"}
      m={isMain ? "$0" : "$1"}
    >
      <VStack alignItems="center" space="sm">
        <Ionicons name="camera" size={isMain ? 36 : 24} color="#8F3BBF" />
        <Text
          color="$primary900"
          textAlign="center"
          size={isMain ? "md" : "sm"}
        >
          {isMain ? 'ADD MAIN PHOTO' : 'ADD PHOTO'}
        </Text>
      </VStack>
    </Pressable>
  );
};

// Photo Display Component
const PhotoDisplay = ({
  photo,
  onRemove,
  isPrivate = false
}: {
  photo: PhotoData;
  onRemove: () => void;
  isPrivate?: boolean;
}) => {
  return (
    <Box
      position="relative"
      width={photo.isMain ? "100%" : "$24"}
      height={photo.isMain ? "$48" : "$24"}
      mb={photo.isMain ? "$4" : "$0"}
      m={photo.isMain ? "$0" : "$1"}
    >
      <Image
        source={{ uri: photo.uri }}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 8,
        }}
        resizeMode="cover"
        blurRadius={isPrivate ? 10 : 0}
      />
      {isPrivate && (
        <Box
          position="absolute"
          top="$0"
          left="$0"
          right="$0"
          bottom="$0"
          alignItems="center"
          justifyContent="center"
        >
          <Box
            bg="rgba(0,0,0,0.7)"
            px="$3"
            py="$2"
            borderRadius="$md"
          >
            <Text color="$white" size="sm" fontWeight="$bold">
              PRIVATE
            </Text>
          </Box>
        </Box>
      )}
      <Pressable
        position="absolute"
        top="$2"
        right="$2"
        bg="$white"
        borderRadius="$full"
        p="$1"
        onPress={onRemove}
      >
        <Icon as={CloseIcon} size="sm" color="$primary900" />
      </Pressable>
    </Box>
  );
};

export default function PhotosScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    gender: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    age: string;
    email: string;
    status: string;
    occupation: string;
    lookingFor: string;
    profession: string;
    bio: string;
    interests: string;
  }>();

  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [error, setError] = useState('');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
  const [isSelectingMain, setIsSelectingMain] = useState(false);
  const [isPrivateProfile, setIsPrivateProfile] = useState(false);
  const [showPrivateInfoModal, setShowPrivateInfoModal] = useState(false);

  // Update all photos' isPrivate property when isPrivateProfile changes
  useEffect(() => {
    if (photos.length > 0) {
      setPhotos(prevPhotos =>
        prevPhotos.map(photo => ({
          ...photo,
          isPrivate: isPrivateProfile
        }))
      );
    }
  }, [isPrivateProfile]);

  const mainPhoto = photos.find(photo => photo.isMain);
  const extraPhotos = photos.filter(photo => !photo.isMain);

  const handleAddMainPhoto = () => {
    setIsSelectingMain(true);
    setIsSourceModalOpen(true);
  };

  const handleAddExtraPhoto = () => {
    if (extraPhotos.length >= 5) return;
    setIsSelectingMain(false);
    setIsSourceModalOpen(true);
  };

  const handleCameraSelect = () => {
    setIsSourceModalOpen(false);
    setIsCameraOpen(true);
  };

  const handleGallerySelect = async () => {
    setIsSourceModalOpen(false);

    try {
      // Request media library permissions
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'We need permission to access your photo library');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });


      if (!result.canceled && result.assets?.[0]) {
        handlePhotoSelected(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Gallery selection error:', error);
      Alert.alert('Error', 'Failed to select image from gallery');
    }
  };

  const handlePhotoTaken = (uri: string) => {
    handlePhotoSelected(uri);
  };

  const handlePhotoSelected = (uri: string) => {
    const newPhoto: PhotoData = {
      id: Date.now().toString(),
      uri,
      isMain: isSelectingMain,
      isPrivate: isPrivateProfile
    };

    if (isSelectingMain && mainPhoto) {
      // Replace existing main photo
      setPhotos(prev => prev.map(photo =>
        photo.isMain ? newPhoto : photo
      ));
    } else {
      setPhotos(prev => [...prev, newPhoto]);
    }

    if (error) setError('');
  };

  const handleRemovePhoto = (photoId: string) => {
    setPhotos(prev => prev.filter(photo => photo.id !== photoId));
  };

  const handleContinue = () => {
    if (!mainPhoto) {
      setError('Please add a main photo');
      return;
    }

    // Prepare photos data for passing to next screen
    const photosData = JSON.stringify(photos);

    // Navigate to the next screen with the collected data
    router.push({
      pathname: '/registration/location',
      params: {
        ...params,
        photoCount: photos.length.toString(),
        photosData: photosData,
        privateProfile: isPrivateProfile.toString()
      }
    });
  };

  return (
    <RegistrationLayout
      title="Your Photos"
      currentStep={9}
      totalSteps={10}
    >
      <ScrollView
        flex={1}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <Box flex={1} px="$6" py="$8">
          <Text
            size="3xl"
            fontWeight="$bold"
            mb="$6"
            textAlign="center"
            color="$primary900"
          >
            UPLOAD YOUR PHOTOS
          </Text>

          <Text
            size="md"
            mb="$6"
            textAlign="center"
            color="$primary900"
          >
            ADD A MAIN PHOTO AND UP TO 5 ADDITIONAL PHOTOS
          </Text>

          {/* Private Photo Toggle - Moved to more prominent position */}
          <Box mb="$6" alignItems="center">
            <HStack alignItems="center" space="sm">
              <Ionicons
                name={isPrivateProfile ? "eye-off" : "eye"}
                size={20}
                color="#8F3BBF"
              />
              <Text
                size="md"
                fontWeight="$semibold"
                color="$primary900"
              >
                PRIVATE PHOTO
              </Text>
              <Switch
                size="sm"
                value={isPrivateProfile}
                onValueChange={setIsPrivateProfile}
                trackColor={{ false: '#d1d5db', true: '#8F3BBF' }}
                thumbColor={isPrivateProfile ? '#ffffff' : '#f3f4f6'}
              />
              <Pressable
                onPress={() => setShowPrivateInfoModal(true)}
                ml="$2"
              >
                <Box
                  bg="$primary500"
                  borderRadius="$full"
                  width="$5"
                  height="$5"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Text color="$white" size="xs" fontWeight="$bold">
                    ?
                  </Text>
                </Box>
              </Pressable>
            </HStack>
          </Box>

          <Box mb="$6">
            <Text
              size="xl"
              fontWeight="$semibold"
              mb="$2"
              color="$primary900"
            >
              MAIN PHOTO
            </Text>

            {mainPhoto ? (
              <PhotoDisplay
                photo={mainPhoto}
                onRemove={() => handleRemovePhoto(mainPhoto.id)}
                isPrivate={isPrivateProfile}
              />
            ) : (
              <PhotoUploader isMain onSelect={handleAddMainPhoto} />
            )}
          </Box>

          <Box mb="$6">
            <Text
              size="xl"
              fontWeight="$semibold"
              mb="$2"
              color="$primary900"
            >
              ADDITIONAL PHOTOS ({extraPhotos.length}/5)
            </Text>

            <HStack flexWrap="wrap">
              {extraPhotos.map((photo) => (
                <PhotoDisplay
                  key={photo.id}
                  photo={photo}
                  onRemove={() => handleRemovePhoto(photo.id)}
                  isPrivate={isPrivateProfile}
                />
              ))}

              {extraPhotos.length < 5 && (
                <PhotoUploader onSelect={handleAddExtraPhoto} />
              )}
            </HStack>
          </Box>

          {error ? (
            <Text mb="$4" textAlign="center" color="$error600">
              {error}
            </Text>
          ) : null}

          <Button
            onPress={handleContinue}
            isDisabled={!mainPhoto}
            mt="$4"
            bg="$primary500"
            $active-bg="$primary600"
            $disabled-bg="$backgroundLight300"
          >
            <ButtonText>CONTINUE</ButtonText>
          </Button>
        </Box>
      </ScrollView>

      <PhotoSourceModal
        isOpen={isSourceModalOpen}
        onClose={() => setIsSourceModalOpen(false)}
        onCameraSelect={handleCameraSelect}
        onGallerySelect={handleGallerySelect}
      />

      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onPhotoTaken={handlePhotoTaken}
      />

      <PrivatePhotoInfoModal
        isOpen={showPrivateInfoModal}
        onClose={() => setShowPrivateInfoModal(false)}
      />
    </RegistrationLayout>
  );
}
