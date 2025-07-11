import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { Platform } from 'react-native';
import {
  Box,
  VStack,
  HStack,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  SafeAreaView,
  Pressable,
  Center,
  Input,
  InputField,
  FormControl,
  FormControlLabel,
  FormControlLabelText,
  Textarea,
  TextareaInput,
  AlertCircleIcon,
  Avatar,
  AvatarImage,
  AvatarFallbackText,
  Divider
} from '@gluestack-ui/themed';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/button';
import { ProfileSetupLayout } from '@/components/ui/profile-setup-layout';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/context/auth-context';

export default function Step1BasicInfoScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  // Get existing user data to pre-populate fields
  const [firstName, setFirstName] = useState(user?.profile?.first_name || '');
  const [lastName, setLastName] = useState(user?.profile?.last_name || '');
  const [selectedGender, setSelectedGender] = useState<'male' | 'female' | 'other' | null>(
    user?.profile?.gender || null
  );
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(
    user?.profile?.date_of_birth ? new Date(user?.profile?.date_of_birth) : null
  );
  const [city, setCity] = useState(user?.profile?.city || '');
  const [country, setCountry] = useState(user?.profile?.country || '');
  const [bio, setBio] = useState(user?.profile?.bio || '');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [error, setError] = useState('');

  const genderOptions = [
    { id: 'male', label: 'Male', icon: 'male' },
    { id: 'female', label: 'Female', icon: 'female' },
    { id: 'other', label: 'Other', icon: 'person' },
  ];

  const handlePhotoUpload = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]) {
        setProfilePhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
    }
  };

  const formatDate = (date: Date) => {
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  };

  const handleContinue = () => {
    if (!firstName.trim()) {
      setError('Please enter your first name');
      return;
    }

    if (!lastName.trim()) {
      setError('Please enter your last name');
      return;
    }

    if (!selectedGender) {
      setError('Please select your gender');
      return;
    }

    if (!dateOfBirth) {
      setError('Please select your date of birth');
      return;
    }

    if (!city.trim()) {
      setError('Please enter your city');
      return;
    }

    if (!country.trim()) {
      setError('Please enter your country');
      return;
    }

    if (bio.trim() && bio.trim().length < 20) {
      setError('Bio should be at least 20 characters long');
      return;
    }

    // Calculate age
    const today = new Date();
    let age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
      age--;
    }

    if (age < 18) {
      setError('You must be at least 18 years old');
      return;
    }

    // Navigate to next step with data
    router.push({
      pathname: '/profile-setup/step-2-cultural',
      params: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        gender: selectedGender,
        dateOfBirth: dateOfBirth.toISOString(),
        age: age.toString(),
        city: city.trim(),
        country: country.trim(),
        bio: bio.trim(),
        profilePhoto: profilePhoto || '',
      }
    });
  };

  const clearError = () => {
    if (error) setError('');
  };

  return (
    <ProfileSetupLayout
      title="Basic Information"
      subtitle="Let's start with the basics about you"
      currentStep={1}
      totalSteps={6}
      showBackButton={false}
    >
      <KeyboardAvoidingView
        flex={1}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <Box flex={1}>
          <ScrollView
            flex={1}
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Box flex={1} px="$6" py="$4">
              <VStack space="lg" flex={1}>
                {/* Error Message */}
                {error ? (
                  <Box
                    bg="$error100"
                    p="$3"
                    borderRadius="$md"
                    borderWidth="$1"
                    borderColor="$error300"
                  >
                    <HStack space="sm" alignItems="center">
                      <AlertCircleIcon size="sm" color="$error600" />
                      <Text size="sm" color="$error600">
                        {error}
                      </Text>
                    </HStack>
                  </Box>
                ) : null}

                {/* Profile Photo Section */}
                <Center>
                  <VStack space="md" alignItems="center">
                    <Avatar size="2xl">
                      {profilePhoto ? (
                        <AvatarImage source={{ uri: profilePhoto }} alt="Profile" />
                      ) : (
                        <AvatarFallbackText fontSize="$2xl" color="$primary600">
                          {firstName.charAt(0) || 'U'}{lastName.charAt(0) || ''}
                        </AvatarFallbackText>
                      )}
                    </Avatar>
                    <Pressable
                      onPress={handlePhotoUpload}
                      bg="$primary100"
                      px="$4"
                      py="$2"
                      borderRadius="$full"
                      borderWidth="$1"
                      borderColor="$primary300"
                    >
                      <HStack space="sm" alignItems="center">
                        <Ionicons name="camera" size={16} color="#8F3BBF" />
                        <Text color="$primary600" fontSize="$sm" fontWeight="$medium">
                          {profilePhoto ? 'Change Photo' : 'Add Photo'}
                        </Text>
                      </HStack>
                    </Pressable>
                  </VStack>
                </Center>

                {/* Name Section */}
                <VStack space="md">
                  <Text fontSize="$lg" fontWeight="$semibold" color="$primary900">
                    Your Name
                  </Text>
                  <HStack space="md">
                    <FormControl flex={1}>
                      <FormControlLabel mb="$1">
                        <FormControlLabelText>First Name</FormControlLabelText>
                      </FormControlLabel>
                      <Input>
                        <InputField
                          placeholder="Enter first name"
                          value={firstName}
                          onChangeText={(text) => {
                            setFirstName(text);
                            clearError();
                          }}
                        />
                      </Input>
                    </FormControl>
                    <FormControl flex={1}>
                      <FormControlLabel mb="$1">
                        <FormControlLabelText>Last Name</FormControlLabelText>
                      </FormControlLabel>
                      <Input>
                        <InputField
                          placeholder="Enter last name"
                          value={lastName}
                          onChangeText={(text) => {
                            setLastName(text);
                            clearError();
                          }}
                        />
                      </Input>
                    </FormControl>
                  </HStack>
                </VStack>

                {/* Gender Section */}
                <VStack space="md">
                  <Text fontSize="$lg" fontWeight="$semibold" color="$primary900">
                    Gender
                  </Text>
                  <HStack space="md" flexWrap="wrap">
                    {genderOptions.map((option) => (
                      <Pressable
                        key={option.id}
                        onPress={() => {
                          setSelectedGender(option.id as 'male' | 'female' | 'other');
                          clearError();
                        }}
                        flex={1}
                        minWidth="$20"
                        bg={selectedGender === option.id ? '$primary100' : '$backgroundLight50'}
                        borderWidth="$2"
                        borderColor={selectedGender === option.id ? '$primary600' : '$borderLight200'}
                        borderRadius="$lg"
                        p="$4"
                        alignItems="center"
                      >
                        <VStack space="sm" alignItems="center">
                          <Ionicons
                            name={option.icon as any}
                            size={24}
                            color={selectedGender === option.id ? '#8F3BBF' : '#666'}
                          />
                          <Text
                            fontSize="$sm"
                            fontWeight="$medium"
                            color={selectedGender === option.id ? '$primary600' : '$textLight600'}
                          >
                            {option.label}
                          </Text>
                        </VStack>
                      </Pressable>
                    ))}
                  </HStack>
                </VStack>

                {/* Date of Birth Section */}
                <VStack space="md">
                  <Text fontSize="$lg" fontWeight="$semibold" color="$primary900">
                    Date of Birth
                  </Text>
                  <Pressable
                    onPress={() => {
                      // For simplicity, we'll use a simple date input
                      // In a real app, you'd want to use a proper date picker
                      const today = new Date();
                      const eighteenYearsAgo = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
                      setDateOfBirth(eighteenYearsAgo);
                      clearError();
                    }}
                    bg="$backgroundLight50"
                    borderWidth="$1"
                    borderColor="$borderLight200"
                    borderRadius="$md"
                    p="$3"
                  >
                    <HStack space="sm" alignItems="center">
                      <Ionicons name="calendar" size={20} color="#8F3BBF" />
                      <Text
                        fontSize="$md"
                        color={dateOfBirth ? '$textLight900' : '$textLight600'}
                      >
                        {dateOfBirth ? formatDate(dateOfBirth) : 'Select your date of birth'}
                      </Text>
                    </HStack>
                  </Pressable>
                </VStack>

                {/* Location Section */}
                <VStack space="md">
                  <Text fontSize="$lg" fontWeight="$semibold" color="$primary900">
                    Current Location
                  </Text>
                  <HStack space="md">
                    <FormControl flex={1}>
                      <FormControlLabel mb="$1">
                        <FormControlLabelText>City</FormControlLabelText>
                      </FormControlLabel>
                      <Input>
                        <InputField
                          placeholder="Enter city"
                          value={city}
                          onChangeText={(text) => {
                            setCity(text);
                            clearError();
                          }}
                        />
                      </Input>
                    </FormControl>
                    <FormControl flex={1}>
                      <FormControlLabel mb="$1">
                        <FormControlLabelText>Country</FormControlLabelText>
                      </FormControlLabel>
                      <Input>
                        <InputField
                          placeholder="Enter country"
                          value={country}
                          onChangeText={(text) => {
                            setCountry(text);
                            clearError();
                          }}
                        />
                      </Input>
                    </FormControl>
                  </HStack>
                </VStack>

                {/* Bio Section */}
                <VStack space="md">
                  <Text fontSize="$lg" fontWeight="$semibold" color="$primary900">
                    Bio (Optional)
                  </Text>
                  <Text fontSize="$sm" color="$textLight600">
                    Tell others about yourself (150 characters max)
                  </Text>
                  <Textarea>
                    <TextareaInput
                      placeholder="Write something about yourself..."
                      value={bio}
                      onChangeText={(text) => {
                        if (text.length <= 150) {
                          setBio(text);
                          clearError();
                        }
                      }}
                      multiline
                      numberOfLines={4}
                    />
                  </Textarea>
                  <Text fontSize="$xs" color="$textLight500" textAlign="right">
                    {bio.length}/150
                  </Text>
                </VStack>

                {/* Spacer */}
                <Box h="$20" />
              </VStack>
            </Box>
          </ScrollView>

          {/* Fixed Continue Button */}
          <Box
            position="absolute"
            bottom="$0"
            left="$0"
            right="$0"
            bg="$backgroundLight0"
            px="$6"
            py="$4"
            borderTopWidth="$1"
            borderTopColor="$borderLight200"
            shadowColor="$shadowColor"
            shadowOffset={{ width: 0, height: -2 }}
            shadowOpacity={0.1}
            shadowRadius={4}
            elevation={5}
          >
            <Button
              title="Continue"
              onPress={handleContinue}
              size="lg"
              variant="solid"
            />
          </Box>
        </Box>
      </KeyboardAvoidingView>
    </ProfileSetupLayout>
  );
} 