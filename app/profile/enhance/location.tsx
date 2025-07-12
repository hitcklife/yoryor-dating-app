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
  Switch,
  useToast,
  Toast,
  ToastTitle
} from '@gluestack-ui/themed';
import { Ionicons } from '@expo/vector-icons';

const IMMIGRATION_STATUS = [
  { value: 'citizen', label: 'Citizen', icon: '🇺🇸' },
  { value: 'permanent_resident', label: 'Permanent Resident', icon: '🏠' },
  { value: 'work_visa', label: 'Work Visa', icon: '💼' },
  { value: 'student', label: 'Student', icon: '🎓' },
  { value: 'other', label: 'Other', icon: '📄' }
];

const UZBEKISTAN_VISITS = [
  { value: 'yearly', label: 'Yearly', icon: '✈️' },
  { value: 'every_few_years', label: 'Every few years', icon: '🗓️' },
  { value: 'rarely', label: 'Rarely', icon: '🤷‍♂️' },
  { value: 'never', label: 'Never', icon: '❌' }
];

const COUNTRIES = [
  { id: 'usa', label: 'United States', icon: '🇺🇸' },
  { id: 'canada', label: 'Canada', icon: '🇨🇦' },
  { id: 'uk', label: 'United Kingdom', icon: '🇬🇧' },
  { id: 'germany', label: 'Germany', icon: '🇩🇪' },
  { id: 'australia', label: 'Australia', icon: '🇦🇺' },
  { id: 'uae', label: 'UAE', icon: '🇦🇪' },
  { id: 'turkey', label: 'Turkey', icon: '🇹🇷' },
  { id: 'russia', label: 'Russia', icon: '🇷🇺' },
  { id: 'kazakhstan', label: 'Kazakhstan', icon: '🇰🇿' },
  { id: 'other', label: 'Other', icon: '🌍' }
];

// Years options (0-50 years)
const YEARS_OPTIONS = Array.from({ length: 51 }, (_, i) => i);

export default function LocationScreen() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    immigration_status: '',
    years_in_country: 0,
    visits_uzbekistan: '',
    would_relocate: false,
    relocate_countries: [] as string[]
  });

  const handleSave = async () => {
    setLoading(true);
    try {
      // Here you would save to your API
      // await apiClient.profile.updateLocation(formData);
      
      toast.show({
        placement: "top",
        render: ({ id }) => (
          <Toast nativeID={`toast-${id}`} action="success" variant="accent">
            <ToastTitle>Location info saved! +20 points</ToastTitle>
          </Toast>
        ),
      });
      
      router.back();
    } catch (error) {
      console.error('Error saving location data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCountry = (countryId: string) => {
    setFormData(prev => ({
      ...prev,
      relocate_countries: prev.relocate_countries.includes(countryId)
        ? prev.relocate_countries.filter(id => id !== countryId)
        : [...prev.relocate_countries, countryId]
    }));
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
          Location & Immigration
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
          {/* Immigration Status */}
          <VStack space="md">
            <Text fontSize="$lg" fontWeight="$semibold" color="$textLight900">
              Your Immigration Status
            </Text>
            <VStack space="sm">
              {IMMIGRATION_STATUS.map((status) => {
                const isSelected = formData.immigration_status === status.value;
                return (
                  <Pressable
                    key={status.value}
                    onPress={() => setFormData(prev => ({ ...prev, immigration_status: status.value }))}
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
                        <Text fontSize="$lg">{status.icon}</Text>
                        <Text
                          fontSize="$md"
                          fontWeight={isSelected ? '$semibold' : '$normal'}
                          color={isSelected ? '$primary700' : '$textLight700'}
                        >
                          {status.label}
                        </Text>
                      </HStack>
                    </Box>
                  </Pressable>
                );
              })}
            </VStack>
          </VStack>

          {/* Years in Country */}
          <VStack space="md">
            <VStack space="xs">
              <Text fontSize="$lg" fontWeight="$semibold" color="$textLight900">
                Years in Current Country
              </Text>
              <Text fontSize="$sm" color="$textLight600">
                Currently selected: {formData.years_in_country} years
              </Text>
            </VStack>
            <Box bg="$white" borderRadius="$lg" p="$4">
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <HStack space="sm">
                  {YEARS_OPTIONS.map((years) => {
                    const isSelected = formData.years_in_country === years;
                    return (
                      <Pressable
                        key={years}
                        onPress={() => setFormData(prev => ({ ...prev, years_in_country: years }))}
                      >
                        <Box
                          bg={isSelected ? '$primary100' : '$backgroundLight100'}
                          borderWidth="$1"
                          borderColor={isSelected ? '$primary600' : '$borderLight300'}
                          borderRadius="$md"
                          px="$4"
                          py="$3"
                          minWidth={50}
                          alignItems="center"
                        >
                          <Text
                            fontSize="$sm"
                            fontWeight={isSelected ? '$semibold' : '$normal'}
                            color={isSelected ? '$primary700' : '$textLight700'}
                          >
                            {years}
                          </Text>
                        </Box>
                      </Pressable>
                    );
                  })}
                </HStack>
              </ScrollView>
            </Box>
          </VStack>

          {/* Uzbekistan Visits */}
          <VStack space="md">
            <Text fontSize="$lg" fontWeight="$semibold" color="$textLight900">
              Do you visit Uzbekistan?
            </Text>
            <VStack space="sm">
              {UZBEKISTAN_VISITS.map((visit) => {
                const isSelected = formData.visits_uzbekistan === visit.value;
                return (
                  <Pressable
                    key={visit.value}
                    onPress={() => setFormData(prev => ({ ...prev, visits_uzbekistan: visit.value }))}
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
                        <Text fontSize="$lg">{visit.icon}</Text>
                        <Text
                          fontSize="$md"
                          fontWeight={isSelected ? '$semibold' : '$normal'}
                          color={isSelected ? '$primary700' : '$textLight700'}
                        >
                          {visit.label}
                        </Text>
                      </HStack>
                    </Box>
                  </Pressable>
                );
              })}
            </VStack>
          </VStack>

          {/* Would Relocate Toggle */}
          <VStack space="md">
            <Text fontSize="$lg" fontWeight="$semibold" color="$textLight900">
              Relocation Preferences
            </Text>
            <Box bg="$white" borderRadius="$lg" p="$4">
              <HStack justifyContent="space-between" alignItems="center">
                <VStack flex={1}>
                  <Text fontSize="$md" fontWeight="$medium" color="$textLight900">
                    Would you relocate for love?
                  </Text>
                  <Text fontSize="$sm" color="$textLight600">
                    Are you open to moving to another country?
                  </Text>
                </VStack>
                <Switch
                  value={formData.would_relocate}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, would_relocate: value }))}
                  trackColor={{ false: '#E5E7EB', true: '#8F3BBF' }}
                  thumbColor="#FFFFFF"
                />
              </HStack>
            </Box>
          </VStack>

          {/* Countries to Relocate */}
          {formData.would_relocate && (
            <VStack space="md">
              <VStack space="xs">
                <Text fontSize="$lg" fontWeight="$semibold" color="$textLight900">
                  Which countries would you consider?
                </Text>
                <Text fontSize="$sm" color="$textLight600">
                  Select all that apply
                </Text>
              </VStack>
              <HStack flexWrap="wrap" space="sm">
                {COUNTRIES.map((country) => {
                  const isSelected = formData.relocate_countries.includes(country.id);
                  return (
                    <Pressable
                      key={country.id}
                      onPress={() => toggleCountry(country.id)}
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
                        <HStack space="sm" alignItems="center">
                          <Text fontSize="$md">{country.icon}</Text>
                          <Text
                            fontSize="$sm"
                            fontWeight={isSelected ? '$semibold' : '$normal'}
                            color={isSelected ? '$primary700' : '$textLight700'}
                          >
                            {country.label}
                          </Text>
                        </HStack>
                      </Box>
                    </Pressable>
                  );
                })}
              </HStack>
            </VStack>
          )}
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
} 