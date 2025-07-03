import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/context/auth-context';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  ScrollView,
  KeyboardAvoidingView,
  SafeAreaView,
  Pressable,
  Avatar,
  AvatarFallbackText,
  AvatarImage,
  Badge,
  BadgeText,
  Divider,
  Alert,
  AlertIcon,
  AlertText,
  InfoIcon,
  Image
} from '@gluestack-ui/themed';
import { Platform } from 'react-native';
import { Button } from '@/components/ui/button';
import { Ionicons } from '@expo/vector-icons';
import { MaterialIcons } from '@expo/vector-icons';

interface PhotoData {
  id: string;
  uri: string;
  isMain: boolean;
  isPrivate: boolean;
}

// Remove the RouteParams interface and use a type instead
type PreviewRouteParams = {
  gender?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  age?: string;
  email?: string;
  status?: string;
  occupation?: string;
  profession?: string;
  bio?: string;
  interests?: string;
  photoCount?: string;
  photosData?: string;
  country?: string;
  countryCode?: string;
  state?: string;
  region?: string;
  city?: string;
  lookingFor?: string;
};

export default function PreviewScreen() {
  const router = useRouter();
  const { completeRegistration } = useAuth();
  // Use the type instead of interface and make all properties optional with string | string[]
  const params = useLocalSearchParams<Record<string, string | string[]>>();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [photos, setPhotos] = useState<PhotoData[]>([]);

  // Helper function to safely get string values from params
  const getParamValue = (key: string): string => {
    const value = params[key];
    return Array.isArray(value) ? value[0] || '' : value || '';
  };

  // Parse photos data from params
  useEffect(() => {
    const photosData = getParamValue('photosData');
    if (photosData) {
      try {
        const parsedPhotos = JSON.parse(photosData);
        setPhotos(parsedPhotos);
      } catch (e) {
        console.error('Error parsing photos data:', e);
      }
    }
  }, [params.photosData]);

  // Get main photo for profile display
  const mainPhoto = useMemo(() => photos.find(photo => photo?.isMain), [photos]);

  // Get private photos count
  const privatePhotos = useMemo(() => photos.filter(photo => photo?.isPrivate), [photos]);
  const publicPhotos = useMemo(() => photos.filter(photo => !photo?.isPrivate), [photos]);

  // Format the interests string for display
  const formatInterests = (interestsString: string) => {
    if (!interestsString) return [];
    return interestsString.split(',').map(interest =>
      interest.trim().charAt(0).toUpperCase() + interest.trim().slice(1)
    );
  };

  // Format the date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleCompleteRegistration = async () => {
    setError('');
    setIsLoading(true);

    try {
      const registrationData = {
        gender: getParamValue('gender'),
        firstName: getParamValue('firstName'),
        lastName: getParamValue('lastName'),
        dateOfBirth: getParamValue('dateOfBirth'),
        age: getParamValue('age'),
        email: getParamValue('email'),
        status: getParamValue('status'),
        occupation: getParamValue('occupation'),
        profession: getParamValue('profession'),
        bio: getParamValue('bio'),
        interests: getParamValue('interests'),
        country: getParamValue('country'),
        countryCode: getParamValue('countryCode'),
        state: getParamValue('state'),
        region: getParamValue('region'),
        city: getParamValue('city'),
        lookingFor: getParamValue('lookingFor'),
        photos
      };

      const result = await completeRegistration(registrationData);

      if (result.success) {
        // Clear navigation stack to prevent going back
        router.dismissAll();
        router.replace('/(tabs)');
      } else {
        setError('Failed to complete registration. Please try again.');
      }
    } catch (error) {
      console.error('Error completing registration:', error);
      setError('Failed to complete registration. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const interests = formatInterests(getParamValue('interests'));

  return (
    <SafeAreaView flex={1} bg="$primaryLight50">
      <StatusBar style="dark" />
      <Stack.Screen options={{
        title: '',
        headerShown: false
      }} />

      {/* Header with Back Button */}
      <HStack
          alignItems="center"
          justifyContent="flex-start"
          px="$6"
          bg="$primaryLight50"
      >
        <Pressable
          onPress={() => router.back()}
          p="$2"
        >
          <Ionicons name="arrow-back" size={24} color="#4B164C" />
        </Pressable>
      </HStack>

      <KeyboardAvoidingView
        flex={1}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          flex={1}
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Box flex={1} px="$6" py="$8">
            {/* Profile Card */}
            <Box
              bg="$backgroundLight0"
              borderRadius="$2xl"
              borderWidth="$1"
              borderColor="$borderLight200"
              p="$6"
              mb="$6"
              shadowColor="$shadowColor"
              shadowOffset={{
                width: 0,
                height: 2,
              }}
              shadowOpacity={0.1}
              shadowRadius={8}
              elevation={3}
            >
              {/* Profile Header */}
              <VStack space="lg" alignItems="center" mb="$8">
                <Avatar size="2xl" bg="$primary200">
                  {mainPhoto ? (
                    <AvatarImage
                      source={{ uri: mainPhoto.uri }}
                      alt="Profile Photo"
                    />
                  ) : (
                    <AvatarFallbackText color="$primary700" fontSize="$2xl" fontWeight="$bold">
                      {getParamValue('firstName')?.charAt(0)}{getParamValue('lastName')?.charAt(0)}
                    </AvatarFallbackText>
                  )}
                </Avatar>

                <VStack space="xs" alignItems="center">
                  <Heading size="xl" color="$textLight900" textAlign="center">
                    {getParamValue('firstName')} {getParamValue('lastName')}
                  </Heading>
                  <HStack space="xs" alignItems="center">
                    <Text size="md" color="$textLight600">
                      {getParamValue('age')} years old
                    </Text>
                    <Text size="md" color="$textLight400">•</Text>
                    <Text size="md" color="$textLight600" textTransform="capitalize">
                      {getParamValue('gender')}
                    </Text>
                  </HStack>
                </VStack>
              </VStack>

              {/* Basic Information */}
              <VStack space="lg">
                <Box>
                  <Text size="lg" fontWeight="$semibold" color="$primary700" mb="$3">
                    📧 Contact Information
                  </Text>
                  <VStack space="sm" pl="$4">
                    <HStack justifyContent="space-between" alignItems="center">
                      <Text size="sm" color="$textLight500" fontWeight="$medium">
                        Email
                      </Text>
                      <Text size="sm" color="$textLight700" textAlign="right" flex={1} ml="$4">
                        {getParamValue('email')}
                      </Text>
                    </HStack>
                    <HStack justifyContent="space-between" alignItems="center">
                      <Text size="sm" color="$textLight500" fontWeight="$medium">
                        Birthday
                      </Text>
                      <Text size="sm" color="$textLight700" textAlign="right" flex={1} ml="$4">
                        {formatDate(getParamValue('dateOfBirth'))}
                      </Text>
                    </HStack>
                  </VStack>
                </Box>

                <Divider bg="$borderLight200" />

                {/* About Me */}
                <Box>
                  <Text size="lg" fontWeight="$semibold" color="$primary700" mb="$3">
                    👤 About Me
                  </Text>
                  <VStack space="sm" pl="$4">
                    <HStack justifyContent="space-between" alignItems="center">
                      <Text size="sm" color="$textLight500" fontWeight="$medium">
                        Status
                      </Text>
                      <Badge action="muted" variant="outline" size="sm">
                        <BadgeText textTransform="capitalize">{getParamValue('status')}</BadgeText>
                      </Badge>
                    </HStack>
                    <HStack justifyContent="space-between" alignItems="center">
                      <Text size="sm" color="$textLight500" fontWeight="$medium">
                        Looking For
                      </Text>
                      <Badge action="muted" variant="outline" size="sm">
                        <BadgeText textTransform="capitalize">{getParamValue('lookingFor')}</BadgeText>
                      </Badge>
                    </HStack>
                    <HStack justifyContent="space-between" alignItems="center">
                      <Text size="sm" color="$textLight500" fontWeight="$medium">
                        Occupation
                      </Text>
                      <Text size="sm" color="$textLight700" textAlign="right" flex={1} ml="$4" textTransform="capitalize">
                        {getParamValue('occupation')}
                      </Text>
                    </HStack>
                    <HStack justifyContent="space-between" alignItems="center">
                      <Text size="sm" color="$textLight500" fontWeight="$medium">
                        Profession
                      </Text>
                      <Text size="sm" color="$textLight700" textAlign="right" flex={1} ml="$4">
                        {getParamValue('profession')}
                      </Text>
                    </HStack>
                    {getParamValue('bio') && (
                      <VStack space="xs">
                        <Text size="sm" color="$textLight500" fontWeight="$medium">
                          Bio
                        </Text>
                        <Box
                          bg="$backgroundLight50"
                          p="$3"
                          borderRadius="$lg"
                          borderWidth="$1"
                          borderColor="$borderLight200"
                        >
                          <Text size="sm" color="$textLight700" lineHeight="$sm">
                            {getParamValue('bio')}
                          </Text>
                        </Box>
                      </VStack>
                    )}
                  </VStack>
                </Box>

                <Divider bg="$borderLight200" />

                {/* Interests */}
                <Box>
                  <Text size="lg" fontWeight="$semibold" color="$primary700" mb="$3">
                    🎯 Interests
                  </Text>
                  <Box pl="$4">
                    {interests.length > 0 ? (
                      <HStack space="xs" flexWrap="wrap">
                        {interests.map((interest, index) => (
                          <Badge key={index} action="info" variant="solid" size="sm" mb="$2">
                            <BadgeText>{interest}</BadgeText>
                          </Badge>
                        ))}
                      </HStack>
                    ) : (
                      <Text size="sm" color="$textLight500" fontStyle="italic">
                        No interests specified
                      </Text>
                    )}
                  </Box>
                </Box>

                <Divider bg="$borderLight200" />

                {/* Location */}
                <Box>
                  <Text size="lg" fontWeight="$semibold" color="$primary700" mb="$3">
                    📍 Location
                  </Text>
                  <VStack space="sm" pl="$4">
                    <HStack justifyContent="space-between" alignItems="center">
                      <Text size="sm" color="$textLight500" fontWeight="$medium">
                        Country
                      </Text>
                      <Text size="sm" color="$textLight700" textAlign="right" flex={1} ml="$4">
                        {getParamValue('country')}
                      </Text>
                    </HStack>
                    {getParamValue('state') && (
                      <HStack justifyContent="space-between" alignItems="center">
                        <Text size="sm" color="$textLight500" fontWeight="$medium">
                          State
                        </Text>
                        <Text size="sm" color="$textLight700" textAlign="right" flex={1} ml="$4">
                          {getParamValue('state')}
                        </Text>
                      </HStack>
                    )}
                    {getParamValue('region') && (
                      <HStack justifyContent="space-between" alignItems="center">
                        <Text size="sm" color="$textLight500" fontWeight="$medium">
                          Region
                        </Text>
                        <Text size="sm" color="$textLight700" textAlign="right" flex={1} ml="$4">
                          {getParamValue('region')}
                        </Text>
                      </HStack>
                    )}
                    <HStack justifyContent="space-between" alignItems="center">
                      <Text size="sm" color="$textLight500" fontWeight="$medium">
                        City
                      </Text>
                      <Text size="sm" color="$textLight700" textAlign="right" flex={1} ml="$4">
                        {getParamValue('city')}
                      </Text>
                    </HStack>
                  </VStack>
                </Box>

                <Divider bg="$borderLight200" />

                {/* Photos */}
                <Box>
                  <Text size="lg" fontWeight="$semibold" color="$primary700" mb="$3">
                    📸 Photos
                  </Text>
                  <Box pl="$4">
                    <VStack space="md">
                      <HStack alignItems="center" space="xs">
                        <Box
                          w="$8"
                          h="$8"
                          bg="$primary100"
                          borderRadius="$lg"
                          justifyContent="center"
                          alignItems="center"
                        >
                          <Text color="$primary600" fontSize="$sm">
                            {photos.length || '0'}
                          </Text>
                        </Box>
                        <VStack space="xs">
                          <Text size="sm" color="$textLight600">
                            {photos.length ?
                              `${photos.length} photo${photos.length > 1 ? 's' : ''} uploaded` :
                              'No photos uploaded'
                            }
                          </Text>
                          {privatePhotos.length > 0 && (
                            <HStack alignItems="center" space="xs">
                              <MaterialIcons name="lock" size={14} color="#ef4444" />
                              <Text size="xs" color="$red600">
                                {privatePhotos.length} private photo{privatePhotos.length > 1 ? 's' : ''}
                              </Text>
                            </HStack>
                          )}
                        </VStack>
                      </HStack>

                      {photos.length > 0 && (
                        <Box>
                          {/* Main Photo */}
                          {mainPhoto && (
                            <Box mb="$2">
                              <HStack justifyContent="space-between" alignItems="center" mb="$1">
                                <Text size="sm" color="$textLight500" fontWeight="$medium">
                                  Main Photo:
                                </Text>
                                {mainPhoto.isPrivate && (
                                  <HStack alignItems="center" space="xs">
                                    <MaterialIcons name="lock" size={14} color="#ef4444" />
                                    <Text size="xs" color="$red600" fontWeight="$medium">
                                      Private
                                    </Text>
                                  </HStack>
                                )}
                              </HStack>
                              <Box
                                width="100%"
                                height="$40"
                                borderRadius="$lg"
                                overflow="hidden"
                                borderWidth="$1"
                                borderColor={mainPhoto.isPrivate ? '$red200' : '$borderLight200'}
                                position="relative"
                              >
                                <Image
                                  source={{ uri: mainPhoto.uri }}
                                  alt="Main Photo"
                                  style={{ width: '100%', height: 160 }}
                                  resizeMode="cover"
                                />
                                {mainPhoto.isPrivate && (
                                  <Box
                                    position="absolute"
                                    top="$2"
                                    right="$2"
                                    bg="$red600"
                                    px="$2"
                                    py="$1"
                                    borderRadius="$sm"
                                  >
                                    <HStack alignItems="center" space="xs">
                                      <MaterialIcons name="lock" size={12} color="white" />
                                      <Text size="xs" color="$white" fontWeight="$medium">
                                        Private
                                      </Text>
                                    </HStack>
                                  </Box>
                                )}
                              </Box>
                            </Box>
                          )}

                          {/* Public Photos */}
                          {publicPhotos.filter(p => !p.isMain).length > 0 && (
                            <Box mt="$2">
                              <Text size="sm" color="$textLight500" fontWeight="$medium" mb="$1">
                                Public Photos:
                              </Text>
                              <HStack flexWrap="wrap" space="sm">
                                {publicPhotos.filter(p => !p.isMain).map((photo) => (
                                  <Box
                                    key={photo.id}
                                    width="$20"
                                    height="$20"
                                    borderRadius="$md"
                                    overflow="hidden"
                                    borderWidth="$1"
                                    borderColor="$borderLight200"
                                    mb="$2"
                                  >
                                    <Image
                                      source={{ uri: photo.uri }}
                                      alt="Public Photo"
                                      style={{ width: 80, height: 80 }}
                                      resizeMode="cover"
                                    />
                                  </Box>
                                ))}
                              </HStack>
                            </Box>
                          )}

                          {/* Private Photos */}
                          {privatePhotos.filter(p => !p.isMain).length > 0 && (
                            <Box mt="$2">
                              <HStack alignItems="center" space="xs" mb="$1">
                                <MaterialIcons name="lock" size={16} color="#ef4444" />
                                <Text size="sm" color="$red600" fontWeight="$medium">
                                  Private Photos:
                                </Text>
                              </HStack>
                              <HStack flexWrap="wrap" space="sm">
                                {privatePhotos.filter(p => !p.isMain).map((photo) => (
                                  <Box
                                    key={photo.id}
                                    width="$20"
                                    height="$20"
                                    borderRadius="$md"
                                    overflow="hidden"
                                    borderWidth="$1"
                                    borderColor="$red200"
                                    mb="$2"
                                    position="relative"
                                  >
                                    <Image
                                      source={{ uri: photo.uri }}
                                      alt="Private Photo"
                                      style={{ width: 80, height: 80 }}
                                      resizeMode="cover"
                                    />
                                    <Box
                                      position="absolute"
                                      top="$1"
                                      right="$1"
                                      bg="$red600"
                                      p="$1"
                                      borderRadius="$xs"
                                    >
                                      <MaterialIcons name="lock" size={10} color="white" />
                                    </Box>
                                  </Box>
                                ))}
                              </HStack>
                            </Box>
                          )}
                        </Box>
                      )}
                    </VStack>
                  </Box>
                </Box>
              </VStack>
            </Box>

            {/* Error Alert */}
            {error && (
              <Alert action="error" variant="solid" mb="$4" borderRadius="$lg">
                <AlertIcon as={InfoIcon} mr="$3" />
                <AlertText>{error}</AlertText>
              </Alert>
            )}

            {/* Action Buttons */}
            <VStack space="md">
              <Button
                  title="Complete Registration"
                  onPress={handleCompleteRegistration}
                  isLoading={isLoading}
                  size="lg"
                  variant="solid"
              />

              <Pressable
                onPress={() => router.back()}
                alignSelf="center"
                py="$3"
                px="$4"
              >
                <Text
                  size="md"
                  color="$primary600"
                  fontWeight="$medium"
                  textDecorationLine="underline"
                >
                  ✏️ Edit Profile Information
                </Text>
              </Pressable>
            </VStack>

            {/* Footer Info */}
            <Box mt="$6" p="$4" bg="$primary50" borderRadius="$lg" borderWidth="$1" borderColor="$primary200">
              <HStack space="sm" alignItems="flex-start">
                <Text color="$primary600" fontSize="$sm" mt="$0.5">💡</Text>
                <Text size="xs" color="$primary700" flex={1} lineHeight="$xs">
                  You can always update your profile information later in your account settings. Private photos will only be visible to users you grant access to.
                </Text>
              </HStack>
            </Box>
          </Box>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
