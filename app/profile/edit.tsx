import React, { useState, useEffect } from "react";
import { useRouter, Stack } from "expo-router";
import { useAuth } from "@/context/auth-context";
import { apiClient } from "@/services/api-client";
import { Alert, Image as RNImage } from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  Box,
  VStack,
  HStack,
  Text,
  ScrollView,
  Pressable,
  SafeAreaView,
  Input,
  InputField,
  Button,
  ButtonText,
  Select,
  SelectTrigger,
  SelectInput,
  SelectIcon,
  SelectPortal,
  SelectBackdrop,
  SelectContent,
  SelectDragIndicatorWrapper,
  SelectDragIndicator,
  SelectItem,
  Textarea,
  TextareaInput,
  Badge,
  BadgeText,
  Spinner,
  useToast,
  Toast,
  ToastTitle,
  ToastDescription,
  Image,
  Heading,
  Card,
  LinearGradient,
  Icon,
  CloseIcon,
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  Switch,
} from "@gluestack-ui/themed";
import { Ionicons } from "@expo/vector-icons";

const INTERESTS_OPTIONS = [
  "sports", "music", "travel", "cooking", "reading", "movies", "gaming",
  "fitness", "art", "photography", "dancing", "hiking", "yoga", "meditation",
  "technology", "fashion", "food", "nature", "animals", "volunteering"
];

const GENDER_OPTIONS = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
  { label: "Non-binary", value: "non-binary" },
  { label: "Other", value: "other" },
];

const LOOKING_FOR_OPTIONS = [
  { label: "Men", value: "male" },
  { label: "Women", value: "female" },
  { label: "Everyone", value: "all" },
];

interface ProfileData {
  first_name: string;
  last_name: string;
  bio: string;
  profession: string;
  occupation: string;
  city: string;
  state: string;
  gender: string;
  looking_for: string;
  interests: string[];
  is_private: boolean;
}

interface PhotoData {
  id: number;
  image_url: string;
  thumbnail_url: string;
  medium_url: string;
  is_profile_photo: boolean;
  order: number;
  status: string;
}

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

// Photo Display Component - Clean registration design
const PhotoDisplay = ({
                        photo,
                        onRemove,
                        onSetAsMain,
                        isMain = false
                      }: {
  photo: PhotoData;
  onRemove: () => void;
  onSetAsMain?: () => void;
  isMain?: boolean;
}) => {
  return (
      <Box
          position="relative"
          width={isMain ? "100%" : "$24"}
          height={isMain ? 300 : "$24"}
          mb={isMain ? "$4" : "$0"}
          m={isMain ? "$0" : "$1"}
      >
        <Image
            source={{ uri: photo.medium_url || photo.image_url || photo.thumbnail_url }}
            alt="Profile photo"
            style={{
              width: '100%',
              height: '100%',
              borderRadius: 8,
            }}
            resizeMode="cover"
        />
        
        {/* Main Photo Badge */}
        {isMain && (
            <Box
                position="absolute"
                top="$2"
                left="$2"
                bg="rgba(0,0,0,0.7)"
                px="$3"
                py="$1"
                borderRadius="$md"
            >
              <Text color="$white" size="xs" fontWeight="$bold">
                MAIN PHOTO
              </Text>
            </Box>
        )}

        {/* Set as Main Button for non-main photos */}
        {!isMain && onSetAsMain && (
            <Pressable
                position="absolute"
                bottom="$2"
                left="$2"
                bg="rgba(255,255,255,0.9)"
                borderRadius="$full"
                p="$1.5"
                onPress={onSetAsMain}
            >
              <Ionicons name="star" size={16} color="#8F3BBF" />
            </Pressable>
        )}

        {/* Remove Button */}
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

// Photo Uploader Component - Clean registration design
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
          height={isMain ? 300 : "$24"}
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

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, updateUser, refreshProfile } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
  const [isSelectingMain, setIsSelectingMain] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData>({
    first_name: "",
    last_name: "",
    bio: "",
    profession: "",
    occupation: "",
    city: "",
    state: "",
    gender: "",
    looking_for: "",
    interests: [],
    is_private: false,
  });

  useEffect(() => {
    if (user?.profile) {
      setProfileData({
        first_name: user.profile.first_name || "",
        last_name: user.profile.last_name || "",
        bio: user.profile.bio || "",
        profession: user.profile.profession || "",
        occupation: user.profile.occupation || "",
        city: user.profile.city || "",
        state: user.profile.state || "",
        gender: user.profile.gender || "",
        looking_for: user.profile.looking_for || "",
        interests: user.profile.interests || [],
        is_private: user.profile.is_private || false,
      });
    }

    // Load photos
    loadPhotos();
  }, [user]);

  const loadPhotos = async () => {
    try {
      const response = await apiClient.photos.getPhotos();
      if (response.status === "success") {
        // Sort photos by order, with profile photo first
        const sortedPhotos = (response.data || []).sort((a: PhotoData, b: PhotoData) => {
          if (a.is_profile_photo) return -1;
          if (b.is_profile_photo) return 1;
          return a.order - b.order;
        });
        setPhotos(sortedPhotos);
      }
    } catch (error) {
      console.error("Error loading photos:", error);
    }
  };

  const handleAddMainPhoto = () => {
    setIsSelectingMain(true);
    setIsSourceModalOpen(true);
  };

  const handleAddExtraPhoto = () => {
    setIsSelectingMain(false);
    setIsSourceModalOpen(true);
  };

  const handleCameraSelect = () => {
    setIsSourceModalOpen(false);
    // For now, fallback to gallery until camera is implemented
    handleGallerySelect();
  };

  const handleGallerySelect = async () => {
    setIsSourceModalOpen(false);
    
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadPhoto(result.assets[0]);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      toast.show({
        placement: "top",
        render: ({ id }) => (
            <Toast nativeID={`toast-${id}`} action="error" variant="accent">
              <ToastTitle>Error</ToastTitle>
              <ToastDescription>Failed to pick image. Please try again.</ToastDescription>
            </Toast>
        ),
      });
    }
  };

  const uploadPhoto = async (imageAsset: ImagePicker.ImagePickerAsset) => {
    setPhotoLoading(true);
    try {
      const formData = new FormData();
      const fileExtension = imageAsset.uri.split('.').pop() || 'jpg';
      const fileName = `photo_${Date.now()}.${fileExtension}`;

      formData.append('photo', {
        uri: imageAsset.uri,
        name: fileName,
        type: `image/${fileExtension}`,
      } as any);

      const response = await apiClient.photos.uploadPhoto(formData);

      if (response.status === "success") {
        await loadPhotos(); // Reload photos
        await refreshProfile(); // Refresh user profile data
        toast.show({
          placement: "top",
          render: ({ id }) => (
              <Toast nativeID={`toast-${id}`} action="success" variant="accent">
                <ToastTitle>Success</ToastTitle>
                <ToastDescription>Photo uploaded successfully!</ToastDescription>
              </Toast>
          ),
        });
      }
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast.show({
        placement: "top",
        render: ({ id }) => (
            <Toast nativeID={`toast-${id}`} action="error" variant="accent">
              <ToastTitle>Error</ToastTitle>
              <ToastDescription>Failed to upload photo. Please try again.</ToastDescription>
            </Toast>
        ),
      });
    } finally {
      setPhotoLoading(false);
    }
  };

  const setProfilePhoto = async (photoId: number) => {
    try {
      // First, unset all photos as profile photo
      const updatePromises = photos.map(photo =>
          apiClient.photos.updatePhoto(photo.id, { is_profile_photo: false })
      );
      await Promise.all(updatePromises);

      // Then set the selected photo as profile photo
      await apiClient.photos.updatePhoto(photoId, { is_profile_photo: true });

      await loadPhotos(); // Reload photos
      await refreshProfile(); // Refresh user profile data
      toast.show({
        placement: "top",
        render: ({ id }) => (
            <Toast nativeID={`toast-${id}`} action="success" variant="accent">
              <ToastTitle>Success</ToastTitle>
              <ToastDescription>Profile photo updated!</ToastDescription>
            </Toast>
        ),
      });
    } catch (error) {
      console.error("Error setting profile photo:", error);
      toast.show({
        placement: "top",
        render: ({ id }) => (
            <Toast nativeID={`toast-${id}`} action="error" variant="accent">
              <ToastTitle>Error</ToastTitle>
              <ToastDescription>Failed to set profile photo. Please try again.</ToastDescription>
            </Toast>
        ),
      });
    }
  };

  const deletePhoto = async (photoId: number) => {
    Alert.alert(
        "Delete Photo",
        "Are you sure you want to delete this photo?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                await apiClient.photos.deletePhoto(photoId);
                await loadPhotos(); // Reload photos
                await refreshProfile(); // Refresh user profile data
                toast.show({
                  placement: "top",
                  render: ({ id }) => (
                      <Toast nativeID={`toast-${id}`} action="success" variant="accent">
                        <ToastTitle>Success</ToastTitle>
                        <ToastDescription>Photo deleted successfully!</ToastDescription>
                      </Toast>
                  ),
                });
              } catch (error) {
                console.error("Error deleting photo:", error);
                toast.show({
                  placement: "top",
                  render: ({ id }) => (
                      <Toast nativeID={`toast-${id}`} action="error" variant="accent">
                        <ToastTitle>Error</ToastTitle>
                        <ToastDescription>Failed to delete photo. Please try again.</ToastDescription>
                      </Toast>
                  ),
                });
              }
            },
          },
        ]
    );
  };



  const handleInputChange = (field: keyof ProfileData, value: string | string[] | boolean) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const toggleInterest = (interest: string) => {
    setProfileData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
          ? prev.interests.filter(i => i !== interest)
          : [...prev.interests, interest],
    }));
  };

  const togglePrivacy = (isEnabled: boolean) => {
    console.log("Privacy toggle:", isEnabled); // Debug log
    setProfileData(prev => ({
      ...prev,
      is_private: isEnabled,
    }));
  };

  const handleSave = async () => {
    if (!profileData.first_name.trim() || !profileData.last_name.trim()) {
      toast.show({
        placement: "top",
        render: ({ id }) => (
            <Toast nativeID={`toast-${id}`} action="error" variant="accent">
              <ToastTitle>Error</ToastTitle>
              <ToastDescription>First name and last name are required.</ToastDescription>
            </Toast>
        ),
      });
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.profile.updateProfile(user?.profile?.id || 0, profileData);

      if (response.status === "success") {
        // Update the user context with new data
        if (user) {
          await updateUser({
            ...user,
            profile: {
              ...user.profile,
              ...response.data
            }
          });
        }

        toast.show({
          placement: "top",
          render: ({ id }) => (
              <Toast nativeID={`toast-${id}`} action="success" variant="accent">
                <ToastTitle>Success</ToastTitle>
                <ToastDescription>Profile updated successfully!</ToastDescription>
              </Toast>
          ),
        });

        router.back();
      } else {
        throw new Error(response.message || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.show({
        placement: "top",
        render: ({ id }) => (
            <Toast nativeID={`toast-${id}`} action="error" variant="accent">
              <ToastTitle>Error</ToastTitle>
              <ToastDescription>Failed to update profile. Please try again.</ToastDescription>
            </Toast>
        ),
      });
    } finally {
      setLoading(false);
    }
  };

  // Separate main photo and additional photos
  const mainPhoto = photos.find(photo => photo.is_profile_photo);
  const additionalPhotos = photos.filter(photo => !photo.is_profile_photo);

  return (
      <Box flex={1} bg="$backgroundLight50">
        <Stack.Screen options={{
          headerShown: false,
          title: 'Edit Profile'
        }} />
        
        {/* Enhanced Header with Gradient - Full Screen */}
        <Box
            bg="$primary600"
            shadowColor="$shadowColor"
            shadowOffset={{ width: 0, height: 6 }}
            shadowOpacity={0.15}
            shadowRadius={12}
            elevation={8}
            pt="$8"
        >
          <Box
              bg="$primary600"
              style={{
                paddingTop: 10,
                paddingBottom: 15,
              }}
          >
            <HStack
                alignItems="center"
                justifyContent="space-between"
                px="$4"
                py="$2"
            >
              <HStack alignItems="center" space="md" flex={1}>
                <Pressable
                    onPress={() => router.back()}
                    p="$3"
                    borderRadius="$full"
                    bg="rgba(255,255,255,0.2)"
                    shadowColor="$shadowColor"
                    shadowOffset={{ width: 0, height: 4 }}
                    shadowOpacity={0.3}
                    shadowRadius={8}
                    elevation={4}
                    borderWidth="$1"
                    borderColor="rgba(255,255,255,0.3)"
                >
                  <Ionicons name="arrow-back" size={24} color="white" />
                </Pressable>
                <VStack flex={1}>
                  <Heading size="xl" color="$white" fontWeight="$bold">
                    Edit Profile
                  </Heading>
                  <Text size="sm" color="rgba(255,255,255,0.9)" fontWeight="$medium">
                    Make your profile shine ✨
                  </Text>
                </VStack>
              </HStack>

              <HStack space="sm">
                <Pressable
                  onPress={() => router.push("/profile/view")}
                  p="$3"
                  borderRadius="$full"
                  bg="rgba(255,255,255,0.95)"
                  shadowColor="$shadowColor"
                  shadowOffset={{ width: 0, height: 4 }}
                  shadowOpacity={0.2}
                  shadowRadius={8}
                  elevation={4}
                >
                  <Ionicons name="eye" size={20} color="#8F3BBF" />
                </Pressable>
                
                <Button
                    size="md"
                    variant="solid"
                    bg="rgba(255,255,255,0.95)"
                    borderRadius="$full"
                    px="$4"
                    py="$3"
                    onPress={handleSave}
                    isDisabled={loading}
                    shadowColor="$shadowColor"
                    shadowOffset={{ width: 0, height: 4 }}
                    shadowOpacity={0.2}
                    shadowRadius={8}
                    elevation={4}
                >
                  {loading ? (
                      <Spinner size="small" color="$primary600" />
                  ) : (
                      <ButtonText color="$primary600" fontWeight="$bold" fontSize="$sm">Save</ButtonText>
                  )}
                </Button>
              </HStack>
            </HStack>
          </Box>
        </Box>

        <ScrollView
            flex={1}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 120 }}
        >
          <VStack space="2xl" p="$5">
            {/* Photos Section - Clean Registration Design */}
            <Box mb="$6">
              <Text
                size="3xl"
                fontWeight="$bold"
                mb="$4"
                textAlign="center"
                color="$primary900"
              >
                YOUR PHOTOS
              </Text>

              <Text
                size="md"
                mb="$6"
                textAlign="center"
                color="$primary900"
              >
                ADD A MAIN PHOTO AND UP TO 5 ADDITIONAL PHOTOS
              </Text>

              {/* Main Photo Section */}
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
                    onRemove={() => deletePhoto(mainPhoto.id)}
                    isMain={true}
                  />
                ) : (
                  <PhotoUploader isMain onSelect={handleAddMainPhoto} />
                )}
              </Box>

              {/* Additional Photos Section */}
              <Box mb="$6">
                <Text
                  size="xl"
                  fontWeight="$semibold"
                  mb="$2"
                  color="$primary900"
                >
                  ADDITIONAL PHOTOS ({additionalPhotos.length}/5)
                </Text>

                <HStack flexWrap="wrap">
                  {additionalPhotos.map((photo) => (
                    <PhotoDisplay
                      key={photo.id}
                      photo={photo}
                      onRemove={() => deletePhoto(photo.id)}
                      onSetAsMain={() => setProfilePhoto(photo.id)}
                    />
                  ))}

                  {additionalPhotos.length < 5 && (
                    <PhotoUploader onSelect={handleAddExtraPhoto} />
                  )}
                </HStack>
              </Box>

              {photos.length === 0 && (
                <Box
                  borderWidth="$2"
                  borderColor="$primary500"
                  borderStyle="dashed"
                  borderRadius="$lg"
                  p="$8"
                  alignItems="center"
                  mb="$4"
                >
                  <VStack alignItems="center" space="md">
                    <Ionicons name="camera" size={48} color="#8F3BBF" />
                    <VStack alignItems="center" space="xs">
                      <Text fontSize="$lg" fontWeight="$bold" color="$primary700">
                        NO PHOTOS YET
                      </Text>
                      <Text fontSize="$sm" color="$primary500" textAlign="center">
                        Add your first photo to get started!
                      </Text>
                    </VStack>
                    <Button
                      onPress={handleAddMainPhoto}
                      bg="$primary500"
                      $active-bg="$primary600"
                      mt="$2"
                    >
                      <ButtonText>ADD MAIN PHOTO</ButtonText>
                    </Button>
                  </VStack>
                </Box>
              )}
            </Box>

            {/* Basic Information - Enhanced */}
            <Card
                variant="elevated"
                bg="$white"
                borderRadius="$3xl"
                shadowColor="$shadowColor"
                shadowOffset={{ width: 0, height: 8 }}
                shadowOpacity={0.12}
                shadowRadius={16}
                elevation={8}
                p="$6"
            >
              <VStack space="lg">
                <VStack space="xs">
                  <Heading size="lg" color="$primary900" fontWeight="$bold">
                    👤 Basic Information
                  </Heading>
                  <Text size="sm" color="$primary600">
                    Tell us about yourself
                  </Text>
                </VStack>

                <VStack space="lg">
                  <HStack space="md">
                    <VStack flex={1} space="xs">
                      <Text fontSize="$sm" color="$primary700" fontWeight="$bold">
                        First Name *
                      </Text>
                      <Input
                          variant="outline"
                          size="lg"
                          borderColor="$primary300"
                          borderWidth="$2"
                          borderRadius="$xl"
                          bg="$backgroundLight50"
                          $focus={{ borderColor: "$primary600" }}
                      >
                        <InputField
                            placeholder="Your first name"
                            value={profileData.first_name}
                            onChangeText={(text) => handleInputChange("first_name", text)}
                            fontSize="$md"
                            color="$primary800"
                        />
                      </Input>
                    </VStack>

                    <VStack flex={1} space="xs">
                      <Text fontSize="$sm" color="$primary700" fontWeight="$bold">
                        Last Name *
                      </Text>
                      <Input
                          variant="outline"
                          size="lg"
                          borderColor="$primary300"
                          borderWidth="$2"
                          borderRadius="$xl"
                          bg="$backgroundLight50"
                          $focus={{ borderColor: "$primary600" }}
                      >
                        <InputField
                            placeholder="Your last name"
                            value={profileData.last_name}
                            onChangeText={(text) => handleInputChange("last_name", text)}
                            fontSize="$md"
                            color="$primary800"
                        />
                      </Input>
                    </VStack>
                  </HStack>

                  <HStack space="md">
                    <VStack flex={1} space="xs">
                      <Text fontSize="$sm" color="$primary700" fontWeight="$bold">
                        🏙️ City
                      </Text>
                      <Input
                          variant="outline"
                          size="lg"
                          borderColor="$primary300"
                          borderWidth="$2"
                          borderRadius="$xl"
                          bg="$backgroundLight50"
                          $focus={{ borderColor: "$primary600" }}
                      >
                        <InputField
                            placeholder="Your city"
                            value={profileData.city}
                            onChangeText={(text) => handleInputChange("city", text)}
                            fontSize="$md"
                            color="$primary800"
                        />
                      </Input>
                    </VStack>

                    <VStack flex={1} space="xs">
                      <Text fontSize="$sm" color="$primary700" fontWeight="$bold">
                        📍 State
                      </Text>
                      <Input
                          variant="outline"
                          size="lg"
                          borderColor="$primary300"
                          borderWidth="$2"
                          borderRadius="$xl"
                          bg="$backgroundLight50"
                          $focus={{ borderColor: "$primary600" }}
                      >
                        <InputField
                            placeholder="Your state"
                            value={profileData.state}
                            onChangeText={(text) => handleInputChange("state", text)}
                            fontSize="$md"
                            color="$primary800"
                        />
                      </Input>
                    </VStack>
                  </HStack>

                  <HStack space="md">
                    <VStack flex={1} space="xs">
                      <Text fontSize="$sm" color="$primary700" fontWeight="$bold">
                        ⚧️ Gender
                      </Text>
                      <Select
                          selectedValue={profileData.gender}
                          onValueChange={(value) => handleInputChange("gender", value)}
                      >
                        <SelectTrigger
                            variant="outline"
                            size="lg"
                            borderColor="$primary300"
                            borderWidth="$2"
                            borderRadius="$xl"
                            bg="$backgroundLight50"
                            $focus={{ borderColor: "$primary600" }}
                        >
                          <SelectInput placeholder="Select gender" fontSize="$md" color="$primary800" />
                          <SelectIcon>
                            <Ionicons name="chevron-down" size={20} color="#5B1994" />
                          </SelectIcon>
                        </SelectTrigger>
                        <SelectPortal>
                          <SelectBackdrop />
                          <SelectContent>
                            <SelectDragIndicatorWrapper>
                              <SelectDragIndicator />
                            </SelectDragIndicatorWrapper>
                            {GENDER_OPTIONS.map((option) => (
                                <SelectItem key={option.value} label={option.label} value={option.value} />
                            ))}
                          </SelectContent>
                        </SelectPortal>
                      </Select>
                    </VStack>

                    <VStack flex={1} space="xs">
                      <Text fontSize="$sm" color="$primary700" fontWeight="$bold">
                        💕 Looking For
                      </Text>
                      <Select
                          selectedValue={profileData.looking_for}
                          onValueChange={(value) => handleInputChange("looking_for", value)}
                      >
                        <SelectTrigger
                            variant="outline"
                            size="lg"
                            borderColor="$primary300"
                            borderWidth="$2"
                            borderRadius="$xl"
                            bg="$backgroundLight50"
                            $focus={{ borderColor: "$primary600" }}
                        >
                          <SelectInput placeholder="Looking for" fontSize="$md" color="$primary800" />
                          <SelectIcon>
                            <Ionicons name="chevron-down" size={20} color="#5B1994" />
                          </SelectIcon>
                        </SelectTrigger>
                        <SelectPortal>
                          <SelectBackdrop />
                          <SelectContent>
                            <SelectDragIndicatorWrapper>
                              <SelectDragIndicator />
                            </SelectDragIndicatorWrapper>
                            {LOOKING_FOR_OPTIONS.map((option) => (
                                <SelectItem key={option.value} label={option.label} value={option.value} />
                            ))}
                          </SelectContent>
                        </SelectPortal>
                      </Select>
                    </VStack>
                  </HStack>
                </VStack>
              </VStack>
            </Card>

            {/* Professional Information - Enhanced */}
            <Card
                variant="elevated"
                bg="$white"
                borderRadius="$3xl"
                shadowColor="$shadowColor"
                shadowOffset={{ width: 0, height: 8 }}
                shadowOpacity={0.12}
                shadowRadius={16}
                elevation={8}
                p="$6"
            >
              <VStack space="lg">
                <VStack space="xs">
                  <Heading size="lg" color="$primary900" fontWeight="$bold">
                    💼 Professional Information
                  </Heading>
                  <Text size="sm" color="$primary600">
                    Share your professional side
                  </Text>
                </VStack>

                <VStack space="lg">
                  <VStack space="xs">
                    <Text fontSize="$sm" color="$primary700" fontWeight="$bold">
                      🎯 Profession
                    </Text>
                    <Input
                        variant="outline"
                        size="lg"
                        borderColor="$primary300"
                        borderWidth="$2"
                        borderRadius="$xl"
                        bg="$backgroundLight50"
                        $focus={{ borderColor: "$primary600" }}
                    >
                      <InputField
                          placeholder="What do you do professionally?"
                          value={profileData.profession}
                          onChangeText={(text) => handleInputChange("profession", text)}
                          fontSize="$md"
                          color="$primary800"
                      />
                    </Input>
                  </VStack>

                  <VStack space="xs">
                    <Text fontSize="$sm" color="$primary700" fontWeight="$bold">
                      🏢 Occupation
                    </Text>
                    <Input
                        variant="outline"
                        size="lg"
                        borderColor="$primary300"
                        borderWidth="$2"
                        borderRadius="$xl"
                        bg="$backgroundLight50"
                        $focus={{ borderColor: "$primary600" }}
                    >
                      <InputField
                          placeholder="Your current occupation"
                          value={profileData.occupation}
                          onChangeText={(text) => handleInputChange("occupation", text)}
                          fontSize="$md"
                          color="$primary800"
                      />
                    </Input>
                  </VStack>
                </VStack>
              </VStack>
            </Card>

            {/* About Me - Enhanced */}
            <Card
                variant="elevated"
                bg="$white"
                borderRadius="$3xl"
                shadowColor="$shadowColor"
                shadowOffset={{ width: 0, height: 8 }}
                shadowOpacity={0.12}
                shadowRadius={16}
                elevation={8}
                p="$6"
            >
              <VStack space="lg">
                <VStack space="xs">
                  <Heading size="lg" color="$primary900" fontWeight="$bold">
                    ✨ About Me
                  </Heading>
                  <Text size="sm" color="$primary600">
                    Tell your story in your own words
                  </Text>
                </VStack>

                <VStack space="xs">
                  <Text fontSize="$sm" color="$primary700" fontWeight="$bold">
                    📝 Your Bio
                  </Text>
                  <Textarea
                      variant="outline"
                      size="lg"
                      borderColor="$primary300"
                      borderWidth="$2"
                      borderRadius="$xl"
                      bg="$backgroundLight50"
                      minHeight={120}
                      $focus={{ borderColor: "$primary600" }}
                  >
                    <TextareaInput
                        placeholder="Share something interesting about yourself, your passions, and what makes you unique..."
                        value={profileData.bio}
                        onChangeText={(text) => handleInputChange("bio", text)}
                        fontSize="$md"
                        color="$primary800"
                        textAlignVertical="top"
                    />
                  </Textarea>
                  <HStack justifyContent="space-between" alignItems="center">
                    <Text fontSize="$xs" color="$primary400">
                      {profileData.bio.length}/500 characters
                    </Text>
                    <Badge
                        size="sm"
                        variant="outline"
                        borderColor="$primary300"
                        bg="$primary50"
                    >
                      <BadgeText color="$primary600" fontSize="$xs">
                        Optional
                      </BadgeText>
                    </Badge>
                  </HStack>
                </VStack>
              </VStack>
            </Card>

            {/* Interests - Enhanced */}
            <Card
                variant="elevated"
                bg="$white"
                borderRadius="$3xl"
                shadowColor="$shadowColor"
                shadowOffset={{ width: 0, height: 8 }}
                shadowOpacity={0.12}
                shadowRadius={16}
                elevation={8}
                p="$6"
            >
              <VStack space="lg">
                <VStack space="xs">
                  <Heading size="lg" color="$primary900" fontWeight="$bold">
                    🎨 Your Interests
                  </Heading>
                  <Text size="sm" color="$primary600">
                    Show off your passions and hobbies
                  </Text>
                </VStack>

                <VStack space="md">
                  <HStack justifyContent="space-between" alignItems="center">
                    <Text fontSize="$sm" color="$primary700" fontWeight="$medium">
                      Select up to 10 interests that describe you:
                    </Text>
                    <Badge
                        size="sm"
                        variant="solid"
                        bg={profileData.interests.length >= 10 ? "$error600" : "$primary600"}
                        borderRadius="$full"
                    >
                      <BadgeText color="$white" fontSize="$xs" fontWeight="$bold">
                        {profileData.interests.length}/10
                      </BadgeText>
                    </Badge>
                  </HStack>

                  <Box
                      bg="$backgroundLight50"
                      borderRadius="$2xl"
                      p="$4"
                      borderWidth="$1"
                      borderColor="$primary200"
                  >
                    <HStack flexWrap="wrap" gap="$2">
                      {INTERESTS_OPTIONS.map((interest) => {
                        const isSelected = profileData.interests.includes(interest);
                        return (
                            <Pressable
                                key={interest}
                                onPress={() => toggleInterest(interest)}
                                disabled={!isSelected && profileData.interests.length >= 10}
                            >
                              <Badge
                                  size="md"
                                  variant={isSelected ? "solid" : "outline"}
                                  bg={isSelected ? "$primary600" : "transparent"}
                                  borderColor={isSelected ? "$primary600" : "$primary300"}
                                  borderWidth="$2"
                                  borderRadius="$full"
                                  mb="$2"
                                  opacity={!isSelected && profileData.interests.length >= 10 ? 0.5 : 1}
                                  px="$3"
                                  py="$2"
                                  shadowColor={isSelected ? "$primary400" : "transparent"}
                                  shadowOffset={{ width: 0, height: 2 }}
                                  shadowOpacity={isSelected ? 0.3 : 0}
                                  shadowRadius={4}
                                  elevation={isSelected ? 2 : 0}
                              >
                                <BadgeText
                                    color={isSelected ? "$white" : "$primary700"}
                                    fontSize="$sm"
                                    fontWeight={isSelected ? "$bold" : "$medium"}
                                    textTransform="capitalize"
                                >
                                  {interest}
                                </BadgeText>
                              </Badge>
                            </Pressable>
                        );
                      })}
                    </HStack>
                  </Box>
                </VStack>
              </VStack>
            </Card>

            {/* Privacy Settings - Enhanced */}
            <Card
                variant="elevated"
                bg="$white"
                borderRadius="$3xl"
                shadowColor="$shadowColor"
                shadowOffset={{ width: 0, height: 8 }}
                shadowOpacity={0.12}
                shadowRadius={16}
                elevation={8}
                p="$6"
            >
              <VStack space="lg">
                <VStack space="xs">
                  <Heading size="lg" color="$primary900" fontWeight="$bold">
                    🔒 Privacy Settings
                  </Heading>
                  <Text size="sm" color="$primary600">
                    Control who can see your profile
                  </Text>
                </VStack>

                <HStack 
                  justifyContent="space-between" 
                  alignItems="center"
                  bg="$backgroundLight50"
                  borderRadius="$2xl"
                  p="$4"
                  borderWidth="$1"
                  borderColor="$primary200"
                >
                  <VStack flex={1} space="xs">
                    <Text fontSize="$md" color="$primary900" fontWeight="$semibold">
                      🔐 Make Profile Private
                    </Text>
                    <Text fontSize="$sm" color="$primary600" lineHeight="$sm">
                      When enabled, only people you match with can see your full profile
                    </Text>
                  </VStack>
                  
                  <Switch
                    size="md"
                    value={profileData.is_private}
                    onToggle={togglePrivacy}
                    trackColor={{ false: "#E2E8F0", true: "#8F3BBF" }}
                    thumbColor={profileData.is_private ? "#FFFFFF" : "#F1F5F9"}
                    ml="$4"
                  />
                </HStack>

                {profileData.is_private && (
                  <Box
                    bg="$primary50"
                    borderRadius="$xl"
                    p="$3"
                    borderWidth="$1"
                    borderColor="$primary200"
                  >
                    <HStack space="sm" alignItems="center">
                      <Ionicons name="information-circle" size={20} color="#8F3BBF" />
                      <Text fontSize="$sm" color="$primary700" flex={1}>
                        Your profile is private. Only mutual matches can see your full profile and photos.
                      </Text>
                    </HStack>
                  </Box>
                )}
              </VStack>
            </Card>
          </VStack>
        </ScrollView>

        <PhotoSourceModal
          isOpen={isSourceModalOpen}
          onClose={() => setIsSourceModalOpen(false)}
          onCameraSelect={handleCameraSelect}
          onGallerySelect={handleGallerySelect}
        />
      </Box>
  );
}
