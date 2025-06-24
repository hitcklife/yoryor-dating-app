import React from 'react';
import { StyleSheet, TouchableOpacity, ScrollView, Switch, Modal, Dimensions } from 'react-native';
import { Box, Text, HStack, VStack, Divider } from '@gluestack-ui/themed';
import { Ionicons } from '@expo/vector-icons';

interface PreferencesModalProps {
  visible: boolean;
  selectedCountry: string;
  ageRange: [number, number];
  preferredGender: string;
  searchGlobal: boolean;
  onClose: () => void;
  onSave: () => void;
  onCountryChange: (country: string) => void;
  onAgeRangeChange: (range: [number, number]) => void;
  onGenderChange: (gender: string) => void;
  onSearchGlobalChange: (value: boolean) => void;
}

const PreferencesModal = ({
  visible,
  selectedCountry,
  ageRange,
  preferredGender,
  searchGlobal,
  onClose,
  onSave,
  onCountryChange,
  onAgeRangeChange,
  onGenderChange,
  onSearchGlobalChange,
}: PreferencesModalProps) => {
  // List of countries for selection
  const countries = [
    'United States', 'Canada', 'United Kingdom', 'Germany', 'France',
    'Italy', 'Spain', 'Australia', 'Japan', 'South Korea', 'Brazil',
    'Mexico', 'India', 'Russia', 'China', 'Netherlands', 'Sweden',
    'Norway', 'Denmark', 'Switzerland'
  ];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
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
              <TouchableOpacity onPress={onClose}>
                <Text color="#FF6B9D" fontSize="$lg" fontWeight="$medium">
                  Cancel
                </Text>
              </TouchableOpacity>

              <Text fontSize="$xl" fontWeight="$bold" color="#2D3748">
                Dating Preferences
              </Text>

              <TouchableOpacity onPress={onSave}>
                <Text color="#FF6B9D" fontSize="$lg" fontWeight="$semibold">
                  Save
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
                  <HStack justifyContent="space-between" mb="$2">
                    <Text color="#718096" fontSize="$md">
                      {ageRange[0]} years
                    </Text>
                    <Text color="#718096" fontSize="$md">
                      {ageRange[1]} years
                    </Text>
                  </HStack>
                  {/* Note: You'll need to implement a proper range slider component */}
                  <Box
                    height="$4"
                    bg="#E2E8F0"
                    borderRadius="$full"
                    position="relative"
                  >
                    <Box
                      height="$4"
                      bg="#FF6B9D"
                      borderRadius="$full"
                      width="60%"
                      ml="10%"
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
                  <Box>
                    <Text fontSize="$md" fontWeight="$medium" color="#2D3748" mb="$3">
                      Select Country
                    </Text>
                    <TouchableOpacity>
                      <Box
                        p="$4"
                        borderRadius="$xl"
                        bg="white"
                        borderWidth="$2"
                        borderColor="#E2E8F0"
                      >
                        <HStack justifyContent="space-between" alignItems="center">
                          <Text fontSize="$md" color={selectedCountry ? "#2D3748" : "#A0AEC0"}>
                            {selectedCountry || "Choose a country"}
                          </Text>
                          <Ionicons name="chevron-down" size={20} color="#718096" />
                        </HStack>
                      </Box>
                    </TouchableOpacity>
                  </Box>
                )}
              </Box>

              <Divider bg="#E2E8F0" mb="$6" />

              {/* Maximum Distance (only if searching globally is off) */}
              {!searchGlobal && (
                <Box mb="$8">
                  <Text fontSize="$lg" fontWeight="$semibold" color="#2D3748" mb="$4">
                    Maximum Distance
                  </Text>
                  <Box mb="$4">
                    <HStack justifyContent="space-between" mb="$2">
                      <Text color="#718096" fontSize="$md">
                        1 km
                      </Text>
                      <Text color="#718096" fontSize="$md">
                        100+ km
                      </Text>
                    </HStack>
                    {/* Distance slider placeholder */}
                    <Box
                      height="$4"
                      bg="#E2E8F0"
                      borderRadius="$full"
                      position="relative"
                    >
                      <Box
                        height="$4"
                        bg="#FF6B9D"
                        borderRadius="$full"
                        width="40%"
                      />
                    </Box>
                    <Text color="#FF6B9D" fontSize="$md" fontWeight="$medium" mt="$2" textAlign="center">
                      Within 25 km
                    </Text>
                  </Box>
                </Box>
              )}
            </Box>
          </ScrollView>
        </Box>
      </Box>
    </Modal>
  );
};

export default PreferencesModal;
