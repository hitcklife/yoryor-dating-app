import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  Box,
  VStack,
  HStack,
  Text,
  ScrollView,
  SafeAreaView,
  Pressable,
  Button,
  ButtonText,
  useToast,
  Toast,
  ToastTitle
} from '@gluestack-ui/themed';
import { Ionicons } from '@expo/vector-icons';

const LANGUAGES = [
  { id: 'uzbek', label: 'O\'zbekcha 🇺🇿' },
  { id: 'russian', label: 'Русский 🇷🇺' },
  { id: 'english', label: 'English 🇬🇧' },
  { id: 'turkish', label: 'Türkçe 🇹🇷' },
  { id: 'arabic', label: 'العربية 🇸🇦' },
  { id: 'other', label: 'Other' }
];

const ETHNICITIES = [
  { value: 'uzbek', label: 'Uzbek' },
  { value: 'tajik', label: 'Tajik' },
  { value: 'kazakh', label: 'Kazakh' },
  { value: 'russian', label: 'Russian' },
  { value: 'mixed', label: 'Mixed' },
  { value: 'other', label: 'Other' }
];

const UZBEKISTAN_REGIONS = [
  { value: 'tashkent', label: 'Tashkent' },
  { value: 'samarkand', label: 'Samarkand' },
  { value: 'bukhara', label: 'Bukhara' },
  { value: 'fergana', label: 'Fergana' },
  { value: 'khorezm', label: 'Khorezm' },
  { value: 'other', label: 'Other' }
];

const RELIGIONS = [
  { value: 'muslim', label: 'Muslim', icon: '☪️' },
  { value: 'christian', label: 'Christian', icon: '✝️' },
  { value: 'secular', label: 'Secular', icon: '🌍' },
  { value: 'other', label: 'Other', icon: '🤲' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say', icon: '🤐' }
];

const RELIGIOSITY_LEVELS = [
  { value: 'very_religious', label: 'Very religious' },
  { value: 'moderately_religious', label: 'Moderately religious' },
  { value: 'not_religious', label: 'Not religious' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' }
];

const LIFESTYLES = [
  { value: 'traditional', label: 'Traditional', icon: '🏛️' },
  { value: 'modern', label: 'Modern', icon: '🌆' },
  { value: 'mix_of_both', label: 'Mix of both', icon: '⚖️' }
];

export default function CulturalBackgroundScreen() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    languages: [] as string[],
    ethnicity: '',
    uzbekistan_region: '',
    religion: '',
    religiosity_level: '',
    lifestyle: ''
  });

  const toggleLanguage = (langId: string) => {
    setFormData(prev => ({
      ...prev,
      languages: prev.languages.includes(langId)
        ? prev.languages.filter(id => id !== langId)
        : [...prev.languages, langId]
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Here you would save to your API
      // await apiClient.profile.updateCultural(formData);
      
      toast.show({
        placement: "top",
        render: ({ id }) => (
          <Toast nativeID={`toast-${id}`} action="success" variant="accent">
            <ToastTitle>Cultural background saved! +20 points</ToastTitle>
          </Toast>
        ),
      });
      
      router.back();
    } catch (error) {
      console.error('Error saving cultural data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView flex={1} bg="$backgroundLight50">
      {/* Header */}
      <HStack
        px="$4"
        py="$3"
        alignItems="center"
        justifyContent="space-between"
        bg="$white"
        borderBottomWidth="$1"
        borderBottomColor="$borderLight200"
      >
        <Pressable onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="#1a1a1a" />
        </Pressable>
        <Text fontSize="$lg" fontWeight="$bold">
          Cultural Background
        </Text>
        <Button
          size="sm"
          variant="solid"
          bg="$primary600"
          onPress={handleSave}
          isDisabled={loading}
        >
          <ButtonText>Save</ButtonText>
        </Button>
      </HStack>

      <ScrollView showsVerticalScrollIndicator={false}>
        <VStack p="$4" space="xl">
          {/* Languages Section */}
          <VStack space="md">
            <VStack space="xs">
              <Text fontSize="$lg" fontWeight="$semibold" color="$textLight900">
                Languages You Speak
              </Text>
              <Text fontSize="$sm" color="$textLight600">
                Select all that apply
              </Text>
            </VStack>

            <HStack flexWrap="wrap" space="sm">
              {LANGUAGES.map((lang) => {
                const isSelected = formData.languages.includes(lang.id);
                return (
                  <Pressable
                    key={lang.id}
                    onPress={() => toggleLanguage(lang.id)}
                  >
                    <Box
                      bg={isSelected ? '$primary100' : '$white'}
                      borderWidth="$2"
                      borderColor={isSelected ? '$primary600' : '$borderLight300'}
                      borderRadius="$full"
                      px="$4"
                      py="$2"
                      mb="$2"
                    >
                      <Text
                        fontSize="$sm"
                        fontWeight={isSelected ? '$semibold' : '$normal'}
                        color={isSelected ? '$primary700' : '$textLight700'}
                      >
                        {lang.label}
                      </Text>
                    </Box>
                  </Pressable>
                );
              })}
            </HStack>
          </VStack>

          {/* Ethnicity Section */}
          <VStack space="md">
            <Text fontSize="$lg" fontWeight="$semibold" color="$textLight900">
              Your Ethnicity
            </Text>
            <VStack space="sm">
              {ETHNICITIES.map((ethnicity) => {
                const isSelected = formData.ethnicity === ethnicity.value;
                return (
                  <Pressable
                    key={ethnicity.value}
                    onPress={() => setFormData(prev => ({ ...prev, ethnicity: ethnicity.value }))}
                  >
                    <Box
                      bg={isSelected ? '$primary100' : '$white'}
                      borderWidth="$1"
                      borderColor={isSelected ? '$primary600' : '$borderLight300'}
                      borderRadius="$lg"
                      px="$4"
                      py="$3"
                    >
                      <Text
                        fontSize="$md"
                        fontWeight={isSelected ? '$semibold' : '$normal'}
                        color={isSelected ? '$primary700' : '$textLight700'}
                      >
                        {ethnicity.label}
                      </Text>
                    </Box>
                  </Pressable>
                );
              })}
            </VStack>
          </VStack>

          {/* Uzbekistan Region Section */}
          <VStack space="md">
            <VStack space="xs">
              <Text fontSize="$lg" fontWeight="$semibold" color="$textLight900">
                Which region of Uzbekistan are you from?
              </Text>
              <Text fontSize="$sm" color="$textLight600">
                Optional - helps connect with people from your region
              </Text>
            </VStack>
            <VStack space="sm">
              {UZBEKISTAN_REGIONS.map((region) => {
                const isSelected = formData.uzbekistan_region === region.value;
                return (
                  <Pressable
                    key={region.value}
                    onPress={() => setFormData(prev => ({ ...prev, uzbekistan_region: region.value }))}
                  >
                    <Box
                      bg={isSelected ? '$primary100' : '$white'}
                      borderWidth="$1"
                      borderColor={isSelected ? '$primary600' : '$borderLight300'}
                      borderRadius="$lg"
                      px="$4"
                      py="$3"
                    >
                      <Text
                        fontSize="$md"
                        fontWeight={isSelected ? '$semibold' : '$normal'}
                        color={isSelected ? '$primary700' : '$textLight700'}
                      >
                        {region.label}
                      </Text>
                    </Box>
                  </Pressable>
                );
              })}
            </VStack>
          </VStack>

          {/* Religion Section */}
          <VStack space="md">
            <Text fontSize="$lg" fontWeight="$semibold" color="$textLight900">
              Your Religion
            </Text>
            <VStack space="sm">
              {RELIGIONS.map((religion) => {
                const isSelected = formData.religion === religion.value;
                return (
                  <Pressable
                    key={religion.value}
                    onPress={() => setFormData(prev => ({ ...prev, religion: religion.value }))}
                  >
                    <Box
                      bg={isSelected ? '$primary100' : '$white'}
                      borderWidth="$1"
                      borderColor={isSelected ? '$primary600' : '$borderLight300'}
                      borderRadius="$lg"
                      px="$4"
                      py="$3"
                    >
                      <HStack space="sm" alignItems="center">
                        <Text fontSize="$lg">{religion.icon}</Text>
                        <Text
                          fontSize="$md"
                          fontWeight={isSelected ? '$semibold' : '$normal'}
                          color={isSelected ? '$primary700' : '$textLight700'}
                        >
                          {religion.label}
                        </Text>
                      </HStack>
                    </Box>
                  </Pressable>
                );
              })}
            </VStack>
          </VStack>

          {/* Religiosity Level Section */}
          <VStack space="md">
            <Text fontSize="$lg" fontWeight="$semibold" color="$textLight900">
              How religious are you?
            </Text>
            <VStack space="sm">
              {RELIGIOSITY_LEVELS.map((level) => {
                const isSelected = formData.religiosity_level === level.value;
                return (
                  <Pressable
                    key={level.value}
                    onPress={() => setFormData(prev => ({ ...prev, religiosity_level: level.value }))}
                  >
                    <Box
                      bg={isSelected ? '$primary100' : '$white'}
                      borderWidth="$1"
                      borderColor={isSelected ? '$primary600' : '$borderLight300'}
                      borderRadius="$lg"
                      px="$4"
                      py="$3"
                    >
                      <Text
                        fontSize="$md"
                        fontWeight={isSelected ? '$semibold' : '$normal'}
                        color={isSelected ? '$primary700' : '$textLight700'}
                      >
                        {level.label}
                      </Text>
                    </Box>
                  </Pressable>
                );
              })}
            </VStack>
          </VStack>

          {/* Lifestyle Section */}
          <VStack space="md">
            <Text fontSize="$lg" fontWeight="$semibold" color="$textLight900">
              Your Lifestyle
            </Text>
            <VStack space="sm">
              {LIFESTYLES.map((lifestyle) => {
                const isSelected = formData.lifestyle === lifestyle.value;
                return (
                  <Pressable
                    key={lifestyle.value}
                    onPress={() => setFormData(prev => ({ ...prev, lifestyle: lifestyle.value }))}
                  >
                    <Box
                      bg={isSelected ? '$primary100' : '$white'}
                      borderWidth="$1"
                      borderColor={isSelected ? '$primary600' : '$borderLight300'}
                      borderRadius="$lg"
                      px="$4"
                      py="$3"
                    >
                      <HStack space="sm" alignItems="center">
                        <Text fontSize="$lg">{lifestyle.icon}</Text>
                        <Text
                          fontSize="$md"
                          fontWeight={isSelected ? '$semibold' : '$normal'}
                          color={isSelected ? '$primary700' : '$textLight700'}
                        >
                          {lifestyle.label}
                        </Text>
                      </HStack>
                    </Box>
                  </Pressable>
                );
              })}
            </VStack>
          </VStack>
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
} 