import React, { useState, useEffect } from 'react';
import { TouchableOpacity, FlatList, Modal } from 'react-native';
import {
  Box,
  Text,
  Input,
  InputField,
  VStack,
  HStack,
  Pressable,
  ScrollView,
  Divider,
} from '@gluestack-ui/themed';
import { ChevronDownIcon, SearchIcon } from '@gluestack-ui/themed';
import axios from 'axios';

interface Country {
  id: number;
  name: string;
  code: string;
  flag: string;
  phone_code: string;
  phone_template: string;
}

interface CustomPhoneInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onChangeFormattedText?: (formattedText: string) => void;
  onChangeCountry?: (country: Country) => void;
  label?: string;
  error?: string;
  placeholder?: string;
  defaultCountry?: string;
  autoDetectCountry?: boolean;
}

export function CustomPhoneInput({
  value,
  onChangeText,
  onChangeFormattedText,
  onChangeCountry,
  label,
  error,
  placeholder = 'Phone Number',
  defaultCountry = 'US',
  autoDetectCountry = true,
}: CustomPhoneInputProps) {
  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
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

          // Set default country
          const defaultCountryData = response.data.data.find(
            (country: Country) => country.code === defaultCountry
          );
          if (defaultCountryData) {
            setSelectedCountry(defaultCountryData);
          } else {
            // Fallback to first country if default not found
            setSelectedCountry(response.data.data[0]);
          }
        }
      } catch (error) {
        console.error('Error fetching countries:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCountries();
  }, [defaultCountry]);

  // Auto-detect country based on IP
  useEffect(() => {
    if (autoDetectCountry && countries.length > 0) {
      const detectCountry = async () => {
        try {
          const response = await axios.get('https://ipapi.co/json/');
          if (response.data && response.data.country_code) {
            const detectedCountry = countries.find(
              (country) => country.code === response.data.country_code
            );
            if (detectedCountry) {
              setSelectedCountry(detectedCountry);
            }
          }
        } catch (error) {
          console.error('Error detecting country:', error);
        }
      };

      detectCountry();
    }
  }, [autoDetectCountry, countries]);

  // Format phone number based on template
  const formatPhoneNumber = (phoneNumber: string, template: string) => {
    if (!template || !phoneNumber) return phoneNumber;

    // Remove all non-digit characters from phone number
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    let formatted = '';
    let numberIndex = 0;

    for (let i = 0; i < template.length && numberIndex < cleanNumber.length; i++) {
      if (template[i] === '#') {
        formatted += cleanNumber[numberIndex];
        numberIndex++;
      } else {
        formatted += template[i];
      }
    }

    return formatted;
  };

  // Handle phone number input
  const handlePhoneNumberChange = (text: string) => {
    // Remove all non-digit characters for raw value
    const rawNumber = text.replace(/\D/g, '');
    onChangeText(rawNumber);

    // Format the number if we have a selected country and template
    if (selectedCountry && selectedCountry.phone_template) {
      const formattedNumber = formatPhoneNumber(rawNumber, selectedCountry.phone_template);
      onChangeFormattedText?.(selectedCountry.phone_code + ' ' + formattedNumber);
    } else {
      onChangeFormattedText?.(selectedCountry?.phone_code + ' ' + rawNumber);
    }
  };

  // Handle country selection
  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setShowCountryPicker(false);
    setSearchQuery('');
    onChangeCountry?.(country);

    // Re-format existing number with new country
    if (value) {
      const formattedNumber = formatPhoneNumber(value, country.phone_template);
      onChangeFormattedText?.(country.phone_code + ' ' + formattedNumber);
    }
  };

  // Filter countries based on search
  const filteredCountries = countries.filter(country =>
    country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    country.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    country.phone_code.includes(searchQuery)
  );

  // Format display value
  const displayValue = selectedCountry && value
    ? formatPhoneNumber(value, selectedCountry.phone_template)
    : value;

  if (loading) {
    return (
      <VStack space="sm">
        {label && (
          <Text size="sm" fontWeight="$medium" color="$textLight700">
            {label}
          </Text>
        )}
        <Box
          borderWidth="$2"
          borderColor="$borderLight300"
          borderRadius="$lg"
          height={56}
          justifyContent="center"
          alignItems="center"
        >
          <Text color="$textLight500">Loading countries...</Text>
        </Box>
      </VStack>
    );
  }

  return (
    <>
      <VStack space="sm">
        {label && (
          <Text size="sm" fontWeight="$medium" color="$textLight700">
            {label}
          </Text>
        )}

        <HStack
          borderWidth="$2"
          borderColor={error ? "$error600" : "$borderLight300"}
          borderRadius="$lg"
          height={56}
          alignItems="center"
          backgroundColor="$backgroundLight0"
        >
          {/* Country Picker Button */}
          <Pressable
            onPress={() => setShowCountryPicker(true)}
            flexDirection="row"
            alignItems="center"
            paddingHorizontal="$3"
            borderRightWidth="$1"
            borderRightColor="$borderLight300"
            height="100%"
          >
            <Text fontSize="$lg" marginRight="$1">
              {selectedCountry?.flag || '🌍'}
            </Text>
            <Text
              fontSize="$sm"
              color="$textLight900"
              fontWeight="$medium"
              marginRight="$1"
            >
              {selectedCountry?.phone_code || '+1'}
            </Text>
            <ChevronDownIcon size="sm" color="$textLight500" />
          </Pressable>

          {/* Phone Number Input */}
          <Input flex={1} borderWidth={0} backgroundColor="transparent">
            <InputField
              value={displayValue}
              onChangeText={handlePhoneNumberChange}
              placeholder={placeholder}
              keyboardType="phone-pad"
              fontSize="$lg"
              color="$textLight900"
            />
          </Input>
        </HStack>

        {error && (
          <Text size="sm" color="$error600">
            {error}
          </Text>
        )}
      </VStack>

      {/* Country Picker Modal */}
      <Modal
        visible={showCountryPicker}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <Box flex={1} backgroundColor="$backgroundLight0">
          {/* Header */}
          <Box
            paddingHorizontal="$4"
            paddingVertical="$3"
            borderBottomWidth="$1"
            borderBottomColor="$borderLight200"
          >
            <HStack justifyContent="space-between" alignItems="center">
              <Text fontSize="$lg" fontWeight="$semibold">
                Select Country
              </Text>
              <Pressable onPress={() => setShowCountryPicker(false)}>
                <Text fontSize="$lg" color="$primary600">
                  Done
                </Text>
              </Pressable>
            </HStack>
          </Box>

          {/* Search Input */}
          <Box paddingHorizontal="$4" paddingVertical="$3">
            <Input>
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
                padding="$4"
                borderBottomWidth="$1"
                borderBottomColor="$borderLight100"
              >
                <HStack alignItems="center" space="md">
                  <Text fontSize="$xl">{item.flag}</Text>
                  <VStack flex={1}>
                    <Text fontSize="$md" fontWeight="$medium" color="$textLight900">
                      {item.name}
                    </Text>
                    <Text fontSize="$sm" color="$textLight600">
                      {item.code}
                    </Text>
                  </VStack>
                  <Text fontSize="$md" color="$textLight700" fontWeight="$medium">
                    {item.phone_code}
                  </Text>
                </HStack>
              </Pressable>
            )}
            showsVerticalScrollIndicator={false}
          />
        </Box>
      </Modal>
    </>
  );
}
