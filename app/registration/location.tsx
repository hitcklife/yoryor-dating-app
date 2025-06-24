import React, { useState, useEffect } from 'react';
import { Modal, FlatList } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  Box,
  VStack,
  HStack,
  Text,
  Input,
  InputField,
  Pressable,
  ScrollView,
  SafeAreaView,
  Spinner,
  KeyboardAvoidingView
} from '@gluestack-ui/themed';
import { ChevronDownIcon, SearchIcon } from '@gluestack-ui/themed';
import { Button } from '@/components/ui/button';
import { RegistrationLayout } from '@/components/ui/registration-layout';
import axios from 'axios';
import { Platform } from 'react-native';

interface Country {
  id: number;
  name: string;
  code: string;
  flag: string;
  phone_code: string;
  phone_template: string;
}

export default function LocationScreen() {
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
    photoCount: string;
    photosData: string;
  }>();

  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [state, setState] = useState('');
  const [region, setRegion] = useState('');
  const [city, setCity] = useState('');
  const [error, setError] = useState('');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Fetch countries from API
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const response = await axios.get('https://incredibly-evident-hornet.ngrok-free.app/api/v1/countries');
        if (response.data.success) {
          setCountries(response.data.data);

          // Set default country to US if available
          const defaultCountry = response.data.data.find(
            (country: Country) => country.code === 'US'
          );
          if (defaultCountry) {
            setSelectedCountry(defaultCountry);
          }
        }
      } catch (error) {
        console.error('Error fetching countries:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCountries();
  }, []);

  // Auto-detect location based on IP address
  useEffect(() => {
    if (countries.length > 0) {
      const detectLocation = async () => {
        try {
          const response = await axios.get('https://ipapi.co/json/');
          if (response.data) {
            // Set country from IP data
            if (response.data.country_code) {
              const detectedCountry = countries.find(
                (country) => country.code === response.data.country_code
              );
              if (detectedCountry) {
                setSelectedCountry(detectedCountry);
              }
            }

            // Set region/state from IP data
            if (response.data.region) {
              setState(response.data.region);
            }

            // Set city from IP data
            if (response.data.city) {
              setCity(response.data.city);
            }
          }
        } catch (error) {
          console.error('Error detecting location:', error);
        }
      };

      detectLocation();
    }
  }, [countries]);

  // Handle country selection
  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setShowCountryPicker(false);
    setSearchQuery('');
    if (error) setError('');
  };

  // Filter countries based on search
  const filteredCountries = countries.filter(country =>
    country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    country.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleContinue = () => {
    if (!selectedCountry) {
      setError('Please select your country');
      return;
    }

    if (!city.trim()) {
      setError('Please enter your city');
      return;
    }

    // Navigate to the next screen with the collected data
    router.push({
      pathname: '/registration/preview',
      params: {
        ...params,
        country: selectedCountry.name,
        countryCode: selectedCountry.code,
        state: state.trim(),
        region: region.trim(),
        city: city.trim()
      }
    });
  };

  if (loading) {
    return (
      <RegistrationLayout
        title="Your Location"
        currentStep={10}
        totalSteps={10}
      >
        <Box flex={1} justifyContent="center" alignItems="center">
          <Spinner size="large" color="$primary600" />
          <Text mt="$4" color="$primary700" fontSize="$lg">
            Loading countries...
          </Text>
        </Box>
      </RegistrationLayout>
    );
  }

  return (
    <>
      <RegistrationLayout
        title="Your Location"
        currentStep={10}
        totalSteps={10}
      >
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
              <Text
                fontSize="$3xl"
                fontWeight="$bold"
                mb="$6"
                textAlign="center"
                color="$primary700"
              >
                Where Are You From?
              </Text>

              <VStack space="lg">
                {/* Country Selection */}
                <VStack space="sm">
                  <Text fontSize="$sm" color="$primary700" fontWeight="$medium">
                    Country
                  </Text>
                  <Pressable
                    onPress={() => setShowCountryPicker(true)}
                    borderWidth="$2"
                    borderColor="$primary300"
                    borderRadius="$lg"
                    height={48}
                    px="$4"
                    backgroundColor="$backgroundLight0"
                    flexDirection="row"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <HStack alignItems="center" space="sm">
                      {selectedCountry && (
                        <Text fontSize="$lg">{selectedCountry.flag}</Text>
                      )}
                      <Text
                        color={selectedCountry ? "$primary700" : "$textLight400"}
                        fontSize="$md"
                      >
                        {selectedCountry ? selectedCountry.name : 'Select your country'}
                      </Text>
                    </HStack>
                    <ChevronDownIcon size="md" color="$primary300" />
                  </Pressable>
                </VStack>

                {/* State/Province Input */}
                <VStack space="sm">
                  <Text fontSize="$sm" color="$primary700" fontWeight="$medium">
                    State/Province
                  </Text>
                  <Input
                    borderWidth="$2"
                    borderColor="$primary300"
                    borderRadius="$lg"
                    height={48}
                    backgroundColor="$backgroundLight0"
                  >
                    <InputField
                      placeholder="Enter your state or province (if applicable)"
                      value={state}
                      onChangeText={(text) => {
                        setState(text);
                        if (error) setError('');
                      }}
                      color="$primary700"
                      fontSize="$md"
                    />
                  </Input>
                </VStack>

                {/* Region Input */}
                <VStack space="sm">
                  <Text fontSize="$sm" color="$primary700" fontWeight="$medium">
                    Region
                  </Text>
                  <Input
                    borderWidth="$2"
                    borderColor="$primary300"
                    borderRadius="$lg"
                    height={48}
                    backgroundColor="$backgroundLight0"
                  >
                    <InputField
                      placeholder="Enter your region (if applicable)"
                      value={region}
                      onChangeText={(text) => {
                        setRegion(text);
                        if (error) setError('');
                      }}
                      color="$primary700"
                      fontSize="$md"
                    />
                  </Input>
                </VStack>

                {/* City Input */}
                <VStack space="sm">
                  <Text fontSize="$sm" color="$primary700" fontWeight="$medium">
                    City
                  </Text>
                  <Input
                    borderWidth="$2"
                    borderColor={error ? "$error600" : "$primary300"}
                    borderRadius="$lg"
                    height={48}
                    backgroundColor="$backgroundLight0"
                  >
                    <InputField
                      placeholder="Enter your city"
                      value={city}
                      onChangeText={(text) => {
                        setCity(text);
                        if (error) setError('');
                      }}
                      color="$primary700"
                      fontSize="$md"
                    />
                  </Input>
                </VStack>

                {error && (
                  <Text
                    fontSize="$sm"
                    color="$error600"
                    textAlign="center"
                    mt="$2"
                  >
                    {error}
                  </Text>
                )}

                <Button
                  title="Continue"
                  onPress={handleContinue}
                  isDisabled={!selectedCountry || !city.trim()}
                  className="mt-4"
                />
              </VStack>
            </Box>
          </ScrollView>
        </KeyboardAvoidingView>
      </RegistrationLayout>

      {/* Country Picker Modal */}
      <Modal
        visible={showCountryPicker}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView flex={1} backgroundColor="$backgroundLight0">
          <Box flex={1}>
            {/* Header */}
            <Box
              px="$4"
              py="$3"
              borderBottomWidth="$1"
              borderBottomColor="$borderLight200"
              backgroundColor="$backgroundLight0"
            >
              <HStack justifyContent="space-between" alignItems="center">
                <Text fontSize="$lg" fontWeight="$semibold" color="$primary700">
                  Select Country
                </Text>
                <Pressable onPress={() => setShowCountryPicker(false)}>
                  <Text fontSize="$lg" color="$primary600" fontWeight="$medium">
                    Done
                  </Text>
                </Pressable>
              </HStack>
            </Box>

            {/* Search Input */}
            <Box px="$4" py="$3">
              <Input
                borderWidth="$1"
                borderColor="$borderLight300"
                borderRadius="$lg"
              >
                <InputField
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search countries..."
                  fontSize="$md"
                />
              </Input>
            </Box>

            {/* Countries List */}
            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => handleCountrySelect(item)}
                  p="$4"
                  borderBottomWidth="$1"
                  borderBottomColor="$borderLight100"
                  backgroundColor="$backgroundLight0"
                >
                  <HStack alignItems="center" space="md">
                    <Text fontSize="$xl">{item.flag}</Text>
                    <VStack flex={1}>
                      <Text
                        fontSize="$md"
                        fontWeight="$medium"
                        color="$textLight900"
                      >
                        {item.name}
                      </Text>
                      <Text fontSize="$sm" color="$textLight600">
                        {item.code}
                      </Text>
                    </VStack>
                    <Text
                      fontSize="$md"
                      color="$textLight700"
                      fontWeight="$medium"
                    >
                      {item.phone_code}
                    </Text>
                  </HStack>
                </Pressable>
              )}
              showsVerticalScrollIndicator={false}
            />
          </Box>
        </SafeAreaView>
      </Modal>
    </>
  );
}
