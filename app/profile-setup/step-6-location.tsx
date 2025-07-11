import React, { useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Platform } from 'react-native';
import {
  Box,
  VStack,
  HStack,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Pressable,
  AlertCircleIcon,
  Divider,
  CheckIcon,
  Badge,
  BadgeText,
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
  ChevronDownIcon,
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Button as GluestackButton,
  ButtonText,
  Heading
} from '@gluestack-ui/themed';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/button';
import { ProfileSetupLayout } from '@/components/ui/profile-setup-layout';
import { useAuth } from '@/context/auth-context';

export default function Step6LocationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { completeProfileSetup } = useAuth();
  
  const [immigrationStatus, setImmigrationStatus] = useState<string | null>(null);
  const [yearsInCountry, setYearsInCountry] = useState<string | null>(null);
  const [visitsUzbekistan, setVisitsUzbekistan] = useState<string | null>(null);
  const [wouldRelocate, setWouldRelocate] = useState<boolean | null>(null);
  const [relocateCountries, setRelocateCountries] = useState<string[]>([]);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const immigrationStatusOptions = [
    { id: 'citizen', label: 'Citizen', icon: 'flag' },
    { id: 'permanent_resident', label: 'Permanent Resident', icon: 'home' },
    { id: 'work_visa', label: 'Work Visa', icon: 'briefcase' },
    { id: 'student', label: 'Student', icon: 'school' },
    { id: 'other', label: 'Other', icon: 'help-circle' },
  ];

  const yearsInCountryOptions = [
    { value: '0-1', label: 'Less than 1 year' },
    { value: '1-3', label: '1-3 years' },
    { value: '3-5', label: '3-5 years' },
    { value: '5-10', label: '5-10 years' },
    { value: '10+', label: 'More than 10 years' },
    { value: 'born_here', label: 'Born here' },
  ];

  const uzbekistanVisitOptions = [
    { id: 'yearly', label: 'Yearly', icon: 'calendar' },
    { id: 'every_few_years', label: 'Every few years', icon: 'time' },
    { id: 'rarely', label: 'Rarely', icon: 'close-circle' },
    { id: 'never', label: 'Never', icon: 'ban' },
  ];

  const availableCountries = [
    'United States', 'Canada', 'United Kingdom', 'Germany', 'France', 'Australia',
    'Russia', 'Turkey', 'Kazakhstan', 'Uzbekistan', 'UAE', 'Saudi Arabia',
    'South Korea', 'Japan', 'China', 'India', 'Other'
  ];

  const toggleCountry = (country: string) => {
    setRelocateCountries(prev => {
      if (prev.includes(country)) {
        return prev.filter(c => c !== country);
      } else {
        return [...prev, country];
      }
    });
  };

  const handleComplete = async () => {
    setError('');
    setIsLoading(true);

    try {
      if (!immigrationStatus) {
        setError('Please select your immigration status');
        return;
      }

      if (!yearsInCountry) {
        setError('Please select how long you\'ve been in your current country');
        return;
      }

      if (!visitsUzbekistan) {
        setError('Please select how often you visit Uzbekistan');
        return;
      }

      if (wouldRelocate === null) {
        setError('Please specify if you would relocate for love');
        return;
      }

      if (wouldRelocate && relocateCountries.length === 0) {
        setError('Please select at least one country you would consider relocating to');
        return;
      }

      // All profile setup data collected - now we can complete the profile setup
      // In a real app, you would send this data to your backend API
      const profileSetupData = {
        // Step 1 - Basic Info
        firstName: params.firstName,
        lastName: params.lastName,
        gender: params.gender,
        dateOfBirth: params.dateOfBirth,
        age: params.age,
        city: params.city,
        country: params.country,
        bio: params.bio,
        profilePhoto: params.profilePhoto,

        // Step 2 - Cultural Background
        languages: JSON.parse(params.languages as string),
        ethnicity: params.ethnicity,
        uzbekistanRegion: params.uzbekistanRegion,
        religion: params.religion,
        religiosity: params.religiosity,
        lifestyle: params.lifestyle,

        // Step 3 - Family & Marriage
        familyImportance: parseInt(params.familyImportance as string),
        wantChildren: params.wantChildren,
        childrenCount: params.childrenCount,
        marriageTimeline: params.marriageTimeline,
        livesWithFamily: params.livesWithFamily === 'true',
        familyApprovalImportant: params.familyApprovalImportant === 'true',

        // Step 4 - Career & Education
        occupation: params.occupation,
        profession: params.profession,
        educationLevel: params.educationLevel,
        universityName: params.universityName,
        incomeRange: params.incomeRange,

        // Step 5 - Physical & Lifestyle
        height: params.height,
        heightUnit: params.heightUnit,
        bodyType: params.bodyType,
        fitnessLevel: params.fitnessLevel,
        smokingStatus: params.smokingStatus,
        drinkingStatus: params.drinkingStatus,
        dietaryRestrictions: JSON.parse(params.dietaryRestrictions as string),

        // Step 6 - Location & Immigration
        immigrationStatus,
        yearsInCountry,
        visitsUzbekistan,
        wouldRelocate,
        relocateCountries,
      };

      console.log('Profile setup data:', profileSetupData);

      // Complete profile setup using auth context
      const result = await completeProfileSetup(profileSetupData);
      
      if (result.success) {
        // Navigate to the main app
        router.replace('/(tabs)');
      } else {
        setError('Failed to complete profile setup. Please try again.');
      }
    } catch (error) {
      console.error('Error completing profile setup:', error);
      setError('Failed to complete profile setup. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => {
    if (error) setError('');
  };

  const OptionCard = ({ 
    option, 
    isSelected, 
    onPress 
  }: { 
    option: any, 
    isSelected: boolean, 
    onPress: () => void 
  }) => (
    <Pressable
      onPress={onPress}
      bg={isSelected ? '$primary100' : '$backgroundLight50'}
      borderWidth="$2"
      borderColor={isSelected ? '$primary600' : '$borderLight200'}
      borderRadius="$lg"
      p="$4"
      mb="$2"
    >
      <HStack space="md" alignItems="center">
        <Box
          w="$6"
          h="$6"
          bg={isSelected ? '$primary600' : '$backgroundLight200'}
          borderRadius="$full"
          alignItems="center"
          justifyContent="center"
        >
          {isSelected && <CheckIcon size="xs" color="$white" />}
        </Box>
        <VStack space="xs" flex={1}>
          <Text
            fontSize="$md"
            fontWeight="$medium"
            color={isSelected ? '$primary600' : '$textLight900'}
          >
            {option.label}
          </Text>
        </VStack>
        <Ionicons
          name={option.icon as any}
          size={20}
          color={isSelected ? '#8F3BBF' : '#666'}
        />
      </HStack>
    </Pressable>
  );

  const ToggleCard = ({ 
    title, 
    description,
    value, 
    onToggle 
  }: { 
    title: string, 
    description?: string,
    value: boolean | null, 
    onToggle: (value: boolean) => void 
  }) => (
    <Box
      bg="$backgroundLight50"
      borderWidth="$1"
      borderColor="$borderLight200"
      borderRadius="$lg"
      p="$4"
    >
      <VStack space="md">
        <VStack space="xs">
          <Text fontSize="$md" fontWeight="$medium" color="$textLight900">
            {title}
          </Text>
          {description && (
            <Text fontSize="$sm" color="$textLight600">
              {description}
            </Text>
          )}
        </VStack>
        <HStack space="md" alignItems="center" justifyContent="flex-end">
          <Pressable
            onPress={() => onToggle(false)}
            bg={value === false ? '$primary600' : '$backgroundLight200'}
            px="$4"
            py="$2"
            borderRadius="$full"
          >
            <Text
              fontSize="$sm"
              fontWeight="$medium"
              color={value === false ? '$white' : '$textLight600'}
            >
              No
            </Text>
          </Pressable>
          <Pressable
            onPress={() => onToggle(true)}
            bg={value === true ? '$primary600' : '$backgroundLight200'}
            px="$4"
            py="$2"
            borderRadius="$full"
          >
            <Text
              fontSize="$sm"
              fontWeight="$medium"
              color={value === true ? '$white' : '$textLight600'}
            >
              Yes
            </Text>
          </Pressable>
        </HStack>
      </VStack>
    </Box>
  );

  return (
    <ProfileSetupLayout
      title="Location & Immigration"
      subtitle="Final step - tell us about your location and immigration preferences"
      currentStep={6}
      totalSteps={6}
    >
      <KeyboardAvoidingView
        flex={1}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Box flex={1}>
          <ScrollView
            flex={1}
            contentContainerStyle={{ flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
          >
            <Box flex={1} px="$6" py="$4">
              <VStack space="xl" flex={1}>
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

                {/* Immigration Status Section */}
                <VStack space="md">
                  <Text fontSize="$lg" fontWeight="$semibold" color="$primary900">
                    Your immigration status
                  </Text>
                  <Text fontSize="$sm" color="$textLight600">
                    In your current country of residence
                  </Text>
                  <VStack space="xs">
                    {immigrationStatusOptions.map((option) => (
                      <OptionCard
                        key={option.id}
                        option={option}
                        isSelected={immigrationStatus === option.id}
                        onPress={() => {
                          setImmigrationStatus(option.id);
                          clearError();
                        }}
                      />
                    ))}
                  </VStack>
                </VStack>

                <Divider bg="$borderLight200" />

                {/* Years in Current Country Section */}
                <VStack space="md">
                  <Text fontSize="$lg" fontWeight="$semibold" color="$primary900">
                    Years in current country
                  </Text>
                  <Box
                    bg="$backgroundLight50"
                    borderWidth="$1"
                    borderColor="$borderLight200"
                    borderRadius="$lg"
                    p="$4"
                  >
                    <Select
                      selectedValue={yearsInCountry}
                      onValueChange={(value) => {
                        setYearsInCountry(value);
                        clearError();
                      }}
                    >
                      <SelectTrigger>
                        <SelectInput placeholder="Select duration" />
                        <SelectIcon as={ChevronDownIcon} mr="$3" />
                      </SelectTrigger>
                      <SelectPortal>
                        <SelectBackdrop />
                        <SelectContent>
                          <SelectDragIndicatorWrapper>
                            <SelectDragIndicator />
                          </SelectDragIndicatorWrapper>
                          {yearsInCountryOptions.map((option) => (
                            <SelectItem
                              key={option.value}
                              label={option.label}
                              value={option.value}
                            />
                          ))}
                        </SelectContent>
                      </SelectPortal>
                    </Select>
                  </Box>
                </VStack>

                <Divider bg="$borderLight200" />

                {/* Visits to Uzbekistan Section */}
                <VStack space="md">
                  <Text fontSize="$lg" fontWeight="$semibold" color="$primary900">
                    Do you visit Uzbekistan?
                  </Text>
                  <VStack space="xs">
                    {uzbekistanVisitOptions.map((option) => (
                      <OptionCard
                        key={option.id}
                        option={option}
                        isSelected={visitsUzbekistan === option.id}
                        onPress={() => {
                          setVisitsUzbekistan(option.id);
                          clearError();
                        }}
                      />
                    ))}
                  </VStack>
                </VStack>

                <Divider bg="$borderLight200" />

                {/* Would Relocate Section */}
                <VStack space="md">
                  <Text fontSize="$lg" fontWeight="$semibold" color="$primary900">
                    Would you relocate for love?
                  </Text>
                  <ToggleCard
                    title="Would relocate for the right person"
                    description="Are you open to moving to another country for a serious relationship?"
                    value={wouldRelocate}
                    onToggle={(value) => {
                      setWouldRelocate(value);
                      if (!value) {
                        setRelocateCountries([]);
                      }
                      clearError();
                    }}
                  />
                </VStack>

                {/* Relocation Countries Section - Only show if would relocate */}
                {wouldRelocate && (
                  <>
                    <Divider bg="$borderLight200" />
                    <VStack space="md">
                      <Text fontSize="$lg" fontWeight="$semibold" color="$primary900">
                        Which countries would you consider?
                      </Text>
                      <Text fontSize="$sm" color="$textLight600">
                        Select all countries you would be open to relocating to
                      </Text>
                      <Pressable
                        onPress={() => setShowCountryModal(true)}
                        bg="$backgroundLight50"
                        borderWidth="$1"
                        borderColor="$borderLight200"
                        borderRadius="$lg"
                        p="$4"
                      >
                        <HStack space="md" alignItems="center">
                          <Ionicons name="globe" size={20} color="#8F3BBF" />
                          <Text fontSize="$md" color="$textLight900" flex={1}>
                            {relocateCountries.length === 0 
                              ? 'Select countries' 
                              : `${relocateCountries.length} countries selected`}
                          </Text>
                          <Ionicons name="chevron-forward" size={20} color="#666" />
                        </HStack>
                      </Pressable>
                      {relocateCountries.length > 0 && (
                        <HStack space="xs" flexWrap="wrap">
                          {relocateCountries.map((country) => (
                            <Badge key={country} variant="solid" bg="$primary600" borderRadius="$full">
                              <BadgeText color="$white" fontSize="$xs">
                                {country}
                              </BadgeText>
                            </Badge>
                          ))}
                        </HStack>
                      )}
                    </VStack>
                  </>
                )}

                {/* Completion Info */}
                <Box
                  bg="$info50"
                  borderWidth="$1"
                  borderColor="$info200"
                  borderRadius="$lg"
                  p="$4"
                >
                  <HStack space="sm" alignItems="flex-start">
                    <Ionicons name="information-circle" size={20} color="#0369A1" />
                    <VStack space="xs" flex={1}>
                      <Text fontSize="$sm" fontWeight="$semibold" color="$info700">
                        Profile Setup Complete!
                      </Text>
                      <Text fontSize="$xs" color="$info600" lineHeight="$sm">
                        • You've completed all 6 steps of profile setup
                        • Your profile will be more attractive to potential matches
                        • You can always update this information later
                        • Start exploring and connecting with people!
                      </Text>
                    </VStack>
                  </HStack>
                </Box>

                {/* Spacer */}
                <Box h="$20" />
              </VStack>
            </Box>
          </ScrollView>

          {/* Fixed Complete Button */}
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
              title="Complete Profile Setup"
              onPress={handleComplete}
              isLoading={isLoading}
              size="lg"
              variant="solid"
            />
          </Box>
        </Box>
      </KeyboardAvoidingView>

      {/* Country Selection Modal */}
      <Modal isOpen={showCountryModal} onClose={() => setShowCountryModal(false)}>
        <ModalBackdrop />
        <ModalContent>
          <ModalHeader>
            <Heading size="md">Select Countries</Heading>
            <ModalCloseButton onPress={() => setShowCountryModal(false)} />
          </ModalHeader>
          <ModalBody>
            <VStack space="xs">
              {availableCountries.map((country) => (
                <Pressable
                  key={country}
                  onPress={() => toggleCountry(country)}
                  bg={relocateCountries.includes(country) ? '$primary100' : '$backgroundLight50'}
                  borderWidth="$1"
                  borderColor={relocateCountries.includes(country) ? '$primary600' : '$borderLight200'}
                  borderRadius="$md"
                  p="$3"
                >
                  <HStack space="md" alignItems="center">
                    <Box
                      w="$5"
                      h="$5"
                      bg={relocateCountries.includes(country) ? '$primary600' : '$backgroundLight200'}
                      borderRadius="$full"
                      alignItems="center"
                      justifyContent="center"
                    >
                      {relocateCountries.includes(country) && (
                        <CheckIcon size="xs" color="$white" />
                      )}
                    </Box>
                    <Text
                      fontSize="$sm"
                      fontWeight="$medium"
                      color={relocateCountries.includes(country) ? '$primary600' : '$textLight900'}
                      flex={1}
                    >
                      {country}
                    </Text>
                  </HStack>
                </Pressable>
              ))}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <GluestackButton
              onPress={() => setShowCountryModal(false)}
              bg="$primary600"
              flex={1}
            >
              <ButtonText color="$white">
                Done ({relocateCountries.length} selected)
              </ButtonText>
            </GluestackButton>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </ProfileSetupLayout>
  );
} 