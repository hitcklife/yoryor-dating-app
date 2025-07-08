import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, ScrollView, Switch, Modal, Dimensions, Alert } from 'react-native';
import { Box, Text, HStack, VStack, Divider, Input, InputField, Pressable } from '@gluestack-ui/themed';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { preferencesService, DatingPreferences, Country } from '@/services/preferences-service';

interface PreferencesModalProps {
  visible: boolean;
  selectedCountry: string;
  ageRange: [number, number];
  preferredGender: string;
  searchGlobal: boolean;
  maxDistance?: number;
  onClose: () => void;
  onSave: () => void;
  onCountryChange: (country: string) => void;
  onAgeRangeChange: (range: [number, number]) => void;
  onGenderChange: (gender: string) => void;
  onSearchGlobalChange: (value: boolean) => void;
  onMaxDistanceChange?: (distance: number) => void;
}

const PreferencesModal = ({
  visible,
  selectedCountry,
  ageRange,
  preferredGender,
  searchGlobal,
  maxDistance = 25,
  onClose,
  onSave,
  onCountryChange,
  onAgeRangeChange,
  onGenderChange,
  onSearchGlobalChange,
  onMaxDistanceChange,
}: PreferencesModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tempAgeRange, setTempAgeRange] = useState<[number, number]>(ageRange);
  const [tempMaxDistance, setTempMaxDistance] = useState(maxDistance);
  const [countries, setCountries] = useState<Country[]>([]);
  const [isLoadingCountries, setIsLoadingCountries] = useState(false);

  // Ensure countries is always an array
  const safeCountries = Array.isArray(countries) ? countries : [];

  // Filter countries based on search
  const filteredCountries = React.useMemo(() => {
    return safeCountries.filter(country =>
      country?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      country?.code?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [safeCountries, searchQuery]);

  // Load countries when modal opens
  useEffect(() => {
    if (visible && safeCountries.length === 0) {
      loadCountries();
    }
  }, [visible, safeCountries.length]);

  // Update temp values when props change or modal opens
  useEffect(() => {
    if (visible) {
      // Ensure we have valid numbers for age range
      const validAgeRange: [number, number] = [
        typeof ageRange[0] === 'number' && !isNaN(ageRange[0]) ? ageRange[0] : 18,
        typeof ageRange[1] === 'number' && !isNaN(ageRange[1]) ? ageRange[1] : 35
      ];
      setTempAgeRange(validAgeRange);
      
      // Ensure we have a valid number for max distance
      const validMaxDistance = typeof maxDistance === 'number' && !isNaN(maxDistance) ? maxDistance : 25;
      setTempMaxDistance(validMaxDistance);
    }
  }, [visible, ageRange, maxDistance]);

  // Convert country code to name when countries are loaded
  useEffect(() => {
    if (safeCountries.length > 0 && selectedCountry && selectedCountry.length === 2) {
      // This is a country code, convert to name
      const country = safeCountries.find(c => c?.code === selectedCountry);
      if (country) {
        onCountryChange(country.name);
      }
    }
  }, [safeCountries, selectedCountry]);

  // Load countries from API
  const loadCountries = async () => {
    setIsLoadingCountries(true);
    try {
      console.log('Loading countries...');
      const countriesData = await preferencesService.fetchCountries();
      console.log('Countries data received:', countriesData);
      console.log('Type of countriesData:', typeof countriesData);
      console.log('Is array:', Array.isArray(countriesData));
      
      // Ensure we always set an array, even if API returns undefined/null
      const safeCountries = Array.isArray(countriesData) ? countriesData : [];
      console.log('Setting countries to:', safeCountries);
      console.log('Number of countries:', safeCountries.length);
      setCountries(safeCountries);
    } catch (error) {
      console.error('Error loading countries:', error);
      // Set empty array on error to prevent crashes
      setCountries([]);
    } finally {
      setIsLoadingCountries(false);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Validate temp values before saving
      const validAgeRange: [number, number] = [
        typeof tempAgeRange[0] === 'number' && !isNaN(tempAgeRange[0]) ? tempAgeRange[0] : 18,
        typeof tempAgeRange[1] === 'number' && !isNaN(tempAgeRange[1]) ? tempAgeRange[1] : 35
      ];
      
      const validMaxDistance = typeof tempMaxDistance === 'number' && !isNaN(tempMaxDistance) ? tempMaxDistance : 25;

      // Update the parent state with validated temp values
      onAgeRangeChange(validAgeRange);
      if (onMaxDistanceChange) {
        onMaxDistanceChange(validMaxDistance);
      }

      // Save to API
      const apiPreferences = preferencesService.convertToApiFormat({
        ageRange: validAgeRange,
        preferredGender,
        searchGlobal,
        selectedCountry,
        maxDistance: validMaxDistance
      });

      // Override country with actual country code from API
      if (selectedCountry) {
        const countryCode = getCountryCode(selectedCountry);
        if (countryCode) {
          apiPreferences.country = countryCode;
        }
      }

      const response = await preferencesService.updatePreferences(apiPreferences);
      
      if (response?.success) {
        Alert.alert('Success', 'Preferences saved successfully!');
        // Close modal and reset states properly
        handleClose();
      } else {
        Alert.alert('Error', response?.message || 'Failed to save preferences');
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      Alert.alert('Error', 'Failed to save preferences. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCountrySelect = (country: Country) => {
    onCountryChange(country.name);
    setShowCountryPicker(false);
    setSearchQuery('');
  };

  // Cleanup function when modal closes
  const handleClose = () => {
    // Reset temp states to prevent corruption
    setTempAgeRange([18, 35]);
    setTempMaxDistance(25);
    setSearchQuery('');
    setShowCountryPicker(false);
    onClose();
  };

  // Convert country name to code for API
  const getCountryCode = (countryName: string): string | null => {
    const country = safeCountries.find(c => c?.name === countryName);
    return country?.code || null;
  };

  const getSelectedCountryFlag = () => {
    const country = safeCountries.find(c => c?.name === selectedCountry);
    return country?.flag || '🌍';
  };



  return (
    <>
      <Modal
        visible={visible}
        transparent={true}
        animationType="slide"
        onRequestClose={handleClose}
      >
        <Box flex={1} justifyContent="flex-end" bg="rgba(0,0,0,0.5)">
          <Box
            bg="white"
            borderTopLeftRadius="$3xl"
            borderTopRightRadius="$3xl"
            height={Dimensions.get('window').height * 0.85}
            shadowColor="#000"
            shadowOffset={{ width: 0, height: -5 }}
            shadowOpacity={0.1}
            shadowRadius={10}
            elevation={10}
          >
            {/* Modal Header */}
            <Box
              px="$6"
              py="$4"
              borderBottomWidth="$1"
              borderBottomColor="#E2E8F0"
            >
              <HStack justifyContent="space-between" alignItems="center">
                <TouchableOpacity onPress={handleClose} disabled={isLoading}>
                  <Text color="#FF6B9D" fontSize="$lg" fontWeight="$medium">
                    Cancel
                  </Text>
                </TouchableOpacity>

                <Text fontSize="$xl" fontWeight="$bold" color="#2D3748">
                  Dating Preferences
                </Text>

                <TouchableOpacity onPress={handleSave} disabled={isLoading}>
                  <Text 
                    color={isLoading ? "#A0AEC0" : "#FF6B9D"} 
                    fontSize="$lg" 
                    fontWeight="$semibold"
                  >
                    {isLoading ? 'Saving...' : 'Save'}
                  </Text>
                </TouchableOpacity>
              </HStack>
            </Box>

            {/* Preferences Content */}
            <ScrollView showsVerticalScrollIndicator={false}>
              <Box p="$6">
                {/* Age Range */}
                <Box mb="$8">
                  <Text fontSize="$lg" fontWeight="$semibold" color="#2D3748" mb="$4">
                    Age Range
                  </Text>
                  <Box mb="$4">
                    <HStack justifyContent="space-between" mb="$3">
                      <Text color="#718096" fontSize="$md">
                        {typeof tempAgeRange[0] === 'number' && !isNaN(tempAgeRange[0]) ? tempAgeRange[0] : 18} years
                      </Text>
                      <Text color="#718096" fontSize="$md">
                        {typeof tempAgeRange[1] === 'number' && !isNaN(tempAgeRange[1]) ? tempAgeRange[1] : 35} years
                      </Text>
                    </HStack>
                    
                    {/* Min Age Slider */}
                    <Box mb="$4">
                      <Text fontSize="$sm" color="#718096" mb="$2">
                        Minimum Age: {typeof tempAgeRange[0] === 'number' && !isNaN(tempAgeRange[0]) ? tempAgeRange[0] : 18}
                      </Text>
                      <Slider
                        style={{ width: '100%', height: 40 }}
                        value={typeof tempAgeRange[0] === 'number' && !isNaN(tempAgeRange[0]) ? tempAgeRange[0] : 18}
                        onValueChange={(value: number) => {
                          if (typeof value === 'number' && !isNaN(value)) {
                            const newMin = Math.min(value, tempAgeRange[1] - 1);
                            setTempAgeRange([newMin, tempAgeRange[1]]);
                          }
                        }}
                        minimumValue={18}
                        maximumValue={65}
                        step={1}
                        minimumTrackTintColor="#FF6B9D"
                        maximumTrackTintColor="#E2E8F0"
                      />
                    </Box>

                    {/* Max Age Slider */}
                    <Box>
                      <Text fontSize="$sm" color="#718096" mb="$2">
                        Maximum Age: {typeof tempAgeRange[1] === 'number' && !isNaN(tempAgeRange[1]) ? tempAgeRange[1] : 35}
                      </Text>
                      <Slider
                        style={{ width: '100%', height: 40 }}
                        value={typeof tempAgeRange[1] === 'number' && !isNaN(tempAgeRange[1]) ? tempAgeRange[1] : 35}
                        onValueChange={(value: number) => {
                          if (typeof value === 'number' && !isNaN(value)) {
                            const newMax = Math.max(value, tempAgeRange[0] + 1);
                            setTempAgeRange([tempAgeRange[0], newMax]);
                          }
                        }}
                        minimumValue={18}
                        maximumValue={65}
                        step={1}
                        minimumTrackTintColor="#FF6B9D"
                        maximumTrackTintColor="#E2E8F0"
                      />
                    </Box>
                  </Box>
                </Box>

                <Divider bg="#E2E8F0" mb="$6" />

                {/* Preferred Gender */}
                <Box mb="$8">
                  <Text fontSize="$lg" fontWeight="$semibold" color="#2D3748" mb="$4">
                    Interested in
                  </Text>
                  <VStack space="md">
                    {[
                      { value: 'women', label: 'Women', icon: '👩' },
                      { value: 'men', label: 'Men', icon: '👨' },
                      { value: 'all', label: 'Everyone', icon: '👥' }
                    ].map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        onPress={() => onGenderChange(option.value)}
                      >
                        <HStack
                          space="md"
                          alignItems="center"
                          p="$4"
                          borderRadius="$xl"
                          bg={preferredGender === option.value ? "#FFF0F5" : "#F7FAFC"}
                          borderWidth="$2"
                          borderColor={preferredGender === option.value ? "#FF6B9D" : "#E2E8F0"}
                        >
                          <Text fontSize="$xl">{option.icon}</Text>
                          <Text
                            fontSize="$md"
                            fontWeight="$medium"
                            color={preferredGender === option.value ? "#FF6B9D" : "#2D3748"}
                            flex={1}
                          >
                            {option.label}
                          </Text>
                          {preferredGender === option.value && (
                            <Ionicons name="checkmark-circle" size={24} color="#FF6B9D" />
                          )}
                        </HStack>
                      </TouchableOpacity>
                    ))}
                  </VStack>
                </Box>

                <Divider bg="#E2E8F0" mb="$6" />

                {/* Search Location */}
                <Box mb="$8">
                  <Text fontSize="$lg" fontWeight="$semibold" color="#2D3748" mb="$4">
                    Search Location
                  </Text>

                  {/* Global vs Local Toggle */}
                  <Box
                    p="$4"
                    borderRadius="$xl"
                    bg="#F7FAFC"
                    borderWidth="$1"
                    borderColor="#E2E8F0"
                    mb="$4"
                  >
                    <HStack justifyContent="space-between" alignItems="center">
                      <VStack flex={1}>
                        <Text fontSize="$md" fontWeight="$medium" color="#2D3748">
                          Search Globally
                        </Text>
                        <Text fontSize="$sm" color="#718096">
                          Find matches worldwide
                        </Text>
                      </VStack>
                      <Switch
                        value={searchGlobal}
                        onValueChange={onSearchGlobalChange}
                        trackColor={{ false: '#E2E8F0', true: '#FF6B9D' }}
                        thumbColor={searchGlobal ? '#ffffff' : '#ffffff'}
                      />
                    </HStack>
                  </Box>

                  {/* Country Selection (only if not searching globally) */}
                  {!searchGlobal && (
                    <Box mb="$4">
                      <Text fontSize="$md" fontWeight="$medium" color="#2D3748" mb="$3">
                        Select Country
                      </Text>
                      <TouchableOpacity 
                        onPress={() => {
                          console.log('Country picker button pressed');
                          console.log('Current countries:', safeCountries.length);
                          console.log('Show country picker will be set to true');
                          setShowCountryPicker(true);
                        }}
                      >
                        <Box
                          p="$4"
                          borderRadius="$xl"
                          bg="white"
                          borderWidth="$2"
                          borderColor="#E2E8F0"
                        >
                          <HStack justifyContent="space-between" alignItems="center">
                            <HStack alignItems="center" space="md">
                              <Text fontSize="$lg">{getSelectedCountryFlag()}</Text>
                              <Text fontSize="$md" color={selectedCountry ? "#2D3748" : "#A0AEC0"}>
                                {selectedCountry || "Choose a country"}
                              </Text>
                            </HStack>
                            <Ionicons name="chevron-down" size={20} color="#718096" />
                          </HStack>
                        </Box>
                      </TouchableOpacity>
                    </Box>
                  )}

                  {/* Maximum Distance (only if not searching globally) */}
                  {!searchGlobal && (
                    <Box>
                      <Text fontSize="$md" fontWeight="$medium" color="#2D3748" mb="$3">
                        Maximum Distance
                      </Text>
                      <Box mb="$4">
                        <HStack justifyContent="space-between" mb="$3">
                          <Text color="#718096" fontSize="$md">
                            1 km
                          </Text>
                          <Text color="#718096" fontSize="$md">
                            100+ km
                          </Text>
                        </HStack>
                        <Slider
                          style={{ width: '100%', height: 40 }}
                          value={typeof tempMaxDistance === 'number' && !isNaN(tempMaxDistance) ? tempMaxDistance : 25}
                          onValueChange={(value: number) => {
                            if (typeof value === 'number' && !isNaN(value)) {
                              setTempMaxDistance(value);
                            }
                          }}
                          minimumValue={1}
                          maximumValue={100}
                          step={1}
                          minimumTrackTintColor="#FF6B9D"
                          maximumTrackTintColor="#E2E8F0"
                        />
                        <Text color="#FF6B9D" fontSize="$md" fontWeight="$medium" mt="$2" textAlign="center">
                          Within {typeof tempMaxDistance === 'number' && !isNaN(tempMaxDistance) ? tempMaxDistance : 25} km
                        </Text>
                      </Box>
                    </Box>
                  )}
                </Box>
              </Box>
            </ScrollView>
          </Box>
        </Box>
      </Modal>

      {/* Country Picker Modal */}
      <Modal
        visible={showCountryPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          console.log('Country picker modal closing');
          setShowCountryPicker(false);
        }}
      >
        <Box flex={1} bg="rgba(0,0,0,0.5)">
          <Box
            bg="white"
            borderTopLeftRadius="$3xl"
            borderTopRightRadius="$3xl"
            height={Dimensions.get('window').height * 0.7}
            mt="auto"
          >
            {/* Country Picker Header */}
            <Box
              px="$6"
              py="$4"
              borderBottomWidth="$1"
              borderBottomColor="#E2E8F0"
            >
              <HStack justifyContent="space-between" alignItems="center">
                <TouchableOpacity onPress={() => {
                  console.log('Country picker cancel pressed');
                  setShowCountryPicker(false);
                }}>
                  <Text color="#FF6B9D" fontSize="$lg" fontWeight="$medium">
                    Cancel
                  </Text>
                </TouchableOpacity>

                <Text fontSize="$xl" fontWeight="$bold" color="#2D3748">
                  Select Country ({safeCountries.length} countries)
                </Text>

                <Box width={60} />
              </HStack>
            </Box>

            {/* Search Input */}
            <Box p="$4">
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
            <ScrollView showsVerticalScrollIndicator={false}>
              <Box p="$4">
                {isLoadingCountries ? (
                  <Box alignItems="center" py="$8">
                    <Text color="#718096" fontSize="$md">Loading countries...</Text>
                  </Box>
                ) : safeCountries.length === 0 ? (
                  <Box alignItems="center" py="$8">
                    <Text color="#718096" fontSize="$md">No countries available</Text>
                    <TouchableOpacity 
                      onPress={loadCountries}
                      style={{ marginTop: 10, padding: 10, backgroundColor: '#FF6B9D', borderRadius: 8 }}
                    >
                      <Text color="white" fontSize="$md">Retry Loading Countries</Text>
                    </TouchableOpacity>
                  </Box>
                ) : (
                  <VStack space="sm">
                    {filteredCountries.map((country) => (
                      <TouchableOpacity
                        key={country.code}
                        onPress={() => {
                          console.log('Country selected:', country.name);
                          handleCountrySelect(country);
                        }}
                      >
                        <HStack
                          space="md"
                          alignItems="center"
                          p="$4"
                          borderRadius="$xl"
                          bg={selectedCountry === country.name ? "#FFF0F5" : "#F7FAFC"}
                          borderWidth="$2"
                          borderColor={selectedCountry === country.name ? "#FF6B9D" : "#E2E8F0"}
                        >
                          <Text fontSize="$xl">{country.flag}</Text>
                          <Text
                            fontSize="$md"
                            fontWeight="$medium"
                            color={selectedCountry === country.name ? "#FF6B9D" : "#2D3748"}
                            flex={1}
                          >
                            {country.name}
                          </Text>
                          {selectedCountry === country.name && (
                            <Ionicons name="checkmark-circle" size={24} color="#FF6B9D" />
                          )}
                        </HStack>
                      </TouchableOpacity>
                    ))}
                  </VStack>
                )}
              </Box>
            </ScrollView>
          </Box>
        </Box>
      </Modal>
    </>
  );
};

export default PreferencesModal;
