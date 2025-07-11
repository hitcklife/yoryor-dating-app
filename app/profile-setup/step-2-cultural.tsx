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
  BadgeText
} from '@gluestack-ui/themed';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/button';
import { ProfileSetupLayout } from '@/components/ui/profile-setup-layout';

export default function Step2CulturalScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedEthnicity, setSelectedEthnicity] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedReligion, setSelectedReligion] = useState<string | null>(null);
  const [selectedReligiosity, setSelectedReligiosity] = useState<string | null>(null);
  const [selectedLifestyle, setSelectedLifestyle] = useState<string | null>(null);
  const [error, setError] = useState('');

  const languageOptions = [
    { id: 'uzbek', label: 'Uzbek', icon: 'language' },
    { id: 'russian', label: 'Russian', icon: 'language' },
    { id: 'english', label: 'English', icon: 'language' },
    { id: 'turkish', label: 'Turkish', icon: 'language' },
    { id: 'arabic', label: 'Arabic', icon: 'language' },
    { id: 'other', label: 'Other', icon: 'language' },
  ];

  const ethnicityOptions = [
    { id: 'uzbek', label: 'Uzbek', icon: 'people' },
    { id: 'tajik', label: 'Tajik', icon: 'people' },
    { id: 'kazakh', label: 'Kazakh', icon: 'people' },
    { id: 'russian', label: 'Russian', icon: 'people' },
    { id: 'mixed', label: 'Mixed', icon: 'people' },
    { id: 'other', label: 'Other', icon: 'people' },
  ];

  const regionOptions = [
    { id: 'tashkent', label: 'Tashkent', icon: 'location' },
    { id: 'samarkand', label: 'Samarkand', icon: 'location' },
    { id: 'bukhara', label: 'Bukhara', icon: 'location' },
    { id: 'fergana', label: 'Fergana', icon: 'location' },
    { id: 'khorezm', label: 'Khorezm', icon: 'location' },
    { id: 'other', label: 'Other', icon: 'location' },
    { id: 'skip', label: 'Prefer not to say', icon: 'help-circle' },
  ];

  const religionOptions = [
    { id: 'muslim', label: 'Muslim', icon: 'moon' },
    { id: 'christian', label: 'Christian', icon: 'add' },
    { id: 'secular', label: 'Secular', icon: 'globe' },
    { id: 'other', label: 'Other', icon: 'help-circle' },
    { id: 'skip', label: 'Prefer not to say', icon: 'help-circle' },
  ];

  const religiosittyOptions = [
    { id: 'very_religious', label: 'Very Religious', icon: 'star' },
    { id: 'moderately_religious', label: 'Moderately Religious', icon: 'star-half' },
    { id: 'not_religious', label: 'Not Religious', icon: 'star-outline' },
    { id: 'skip', label: 'Prefer not to say', icon: 'help-circle' },
  ];

  const lifestyleOptions = [
    { id: 'traditional', label: 'Traditional', icon: 'home' },
    { id: 'modern', label: 'Modern', icon: 'phone-portrait' },
    { id: 'mix', label: 'Mix of Both', icon: 'options' },
  ];

  const toggleLanguage = (languageId: string) => {
    setSelectedLanguages(prev => {
      if (prev.includes(languageId)) {
        return prev.filter(id => id !== languageId);
      } else {
        return [...prev, languageId];
      }
    });
    if (error) setError('');
  };

  const handleContinue = () => {
    if (selectedLanguages.length === 0) {
      setError('Please select at least one language');
      return;
    }

    if (!selectedEthnicity) {
      setError('Please select your ethnicity');
      return;
    }

    if (!selectedReligion) {
      setError('Please select your religion');
      return;
    }

    if (!selectedReligiosity) {
      setError('Please select your religiosity level');
      return;
    }

    if (!selectedLifestyle) {
      setError('Please select your lifestyle');
      return;
    }

    // Navigate to next step with all collected data
    router.push({
      pathname: '/profile-setup/step-3-family',
      params: {
        ...params,
        languages: JSON.stringify(selectedLanguages),
        ethnicity: selectedEthnicity,
        uzbekistanRegion: selectedRegion || '',
        religion: selectedReligion,
        religiosity: selectedReligiosity,
        lifestyle: selectedLifestyle,
      }
    });
  };

  const clearError = () => {
    if (error) setError('');
  };

  const OptionCard = ({ 
    option, 
    isSelected, 
    onPress, 
    isMultiSelect = false 
  }: { 
    option: any, 
    isSelected: boolean, 
    onPress: () => void, 
    isMultiSelect?: boolean 
  }) => (
    <Pressable
      onPress={onPress}
      bg={isSelected ? '$primary100' : '$backgroundLight50'}
      borderWidth="$2"
      borderColor={isSelected ? '$primary600' : '$borderLight200'}
      borderRadius="$lg"
      p="$4"
      mb="$2"
      flex={1}
      minWidth="$32"
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

  return (
    <ProfileSetupLayout
      title="Cultural Background"
      subtitle="Tell us about your cultural identity and background"
      currentStep={2}
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

                {/* Languages Section */}
                <VStack space="md">
                  <Text fontSize="$lg" fontWeight="$semibold" color="$primary900">
                    What languages do you speak?
                  </Text>
                  <Text fontSize="$sm" color="$textLight600">
                    Select all that apply
                  </Text>
                  <VStack space="xs">
                    {languageOptions.map((option) => (
                      <OptionCard
                        key={option.id}
                        option={option}
                        isSelected={selectedLanguages.includes(option.id)}
                        onPress={() => toggleLanguage(option.id)}
                        isMultiSelect={true}
                      />
                    ))}
                  </VStack>
                  {selectedLanguages.length > 0 && (
                    <HStack space="xs" flexWrap="wrap">
                      {selectedLanguages.map((langId) => {
                        const lang = languageOptions.find(l => l.id === langId);
                        return (
                          <Badge key={langId} variant="solid" bg="$primary600" borderRadius="$full">
                            <BadgeText color="$white" fontSize="$xs">
                              {lang?.label}
                            </BadgeText>
                          </Badge>
                        );
                      })}
                    </HStack>
                  )}
                </VStack>

                <Divider bg="$borderLight200" />

                {/* Ethnicity Section */}
                <VStack space="md">
                  <Text fontSize="$lg" fontWeight="$semibold" color="$primary900">
                    Your ethnicity
                  </Text>
                  <VStack space="xs">
                    {ethnicityOptions.map((option) => (
                      <OptionCard
                        key={option.id}
                        option={option}
                        isSelected={selectedEthnicity === option.id}
                        onPress={() => {
                          setSelectedEthnicity(option.id);
                          clearError();
                        }}
                      />
                    ))}
                  </VStack>
                </VStack>

                <Divider bg="$borderLight200" />

                {/* Region Section */}
                <VStack space="md">
                  <Text fontSize="$lg" fontWeight="$semibold" color="$primary900">
                    Which region of Uzbekistan are you from?
                  </Text>
                  <Text fontSize="$sm" color="$textLight600">
                    Optional - helps connect you with people from your region
                  </Text>
                  <VStack space="xs">
                    {regionOptions.map((option) => (
                      <OptionCard
                        key={option.id}
                        option={option}
                        isSelected={selectedRegion === option.id}
                        onPress={() => {
                          setSelectedRegion(option.id);
                          clearError();
                        }}
                      />
                    ))}
                  </VStack>
                </VStack>

                <Divider bg="$borderLight200" />

                {/* Religion Section */}
                <VStack space="md">
                  <Text fontSize="$lg" fontWeight="$semibold" color="$primary900">
                    Your religion
                  </Text>
                  <VStack space="xs">
                    {religionOptions.map((option) => (
                      <OptionCard
                        key={option.id}
                        option={option}
                        isSelected={selectedReligion === option.id}
                        onPress={() => {
                          setSelectedReligion(option.id);
                          clearError();
                        }}
                      />
                    ))}
                  </VStack>
                </VStack>

                <Divider bg="$borderLight200" />

                {/* Religiosity Section */}
                <VStack space="md">
                  <Text fontSize="$lg" fontWeight="$semibold" color="$primary900">
                    How religious are you?
                  </Text>
                  <VStack space="xs">
                    {religiosittyOptions.map((option) => (
                      <OptionCard
                        key={option.id}
                        option={option}
                        isSelected={selectedReligiosity === option.id}
                        onPress={() => {
                          setSelectedReligiosity(option.id);
                          clearError();
                        }}
                      />
                    ))}
                  </VStack>
                </VStack>

                <Divider bg="$borderLight200" />

                {/* Lifestyle Section */}
                <VStack space="md">
                  <Text fontSize="$lg" fontWeight="$semibold" color="$primary900">
                    Your lifestyle
                  </Text>
                  <VStack space="xs">
                    {lifestyleOptions.map((option) => (
                      <OptionCard
                        key={option.id}
                        option={option}
                        isSelected={selectedLifestyle === option.id}
                        onPress={() => {
                          setSelectedLifestyle(option.id);
                          clearError();
                        }}
                      />
                    ))}
                  </VStack>
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