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

const BODY_TYPES = [
  { value: 'slim', label: 'Slim', icon: '🏃‍♀️' },
  { value: 'athletic', label: 'Athletic', icon: '🏋️‍♀️' },
  { value: 'average', label: 'Average', icon: '🚶‍♀️' },
  { value: 'curvy', label: 'Curvy', icon: '💃' },
  { value: 'plus_size', label: 'Plus Size', icon: '👩‍🦱' }
];

const FITNESS_LEVELS = [
  { value: 'very_active', label: 'Very Active', icon: '🏃‍♂️' },
  { value: 'active', label: 'Active', icon: '🚴‍♀️' },
  { value: 'moderate', label: 'Moderate', icon: '🚶‍♂️' },
  { value: 'sedentary', label: 'Sedentary', icon: '🛋️' }
];

const SMOKING_STATUS = [
  { value: 'never', label: 'Never', icon: '🚭' },
  { value: 'socially', label: 'Socially', icon: '🍻' },
  { value: 'regularly', label: 'Regularly', icon: '🚬' },
  { value: 'trying_to_quit', label: 'Trying to quit', icon: '💪' }
];

const DRINKING_STATUS = [
  { value: 'never', label: 'Never', icon: '🚫' },
  { value: 'socially', label: 'Socially', icon: '🍷' },
  { value: 'regularly', label: 'Regularly', icon: '🍺' },
  { value: 'special_occasions', label: 'Only special occasions', icon: '🥂' }
];

const DIETARY_RESTRICTIONS = [
  { id: 'none', label: 'None', icon: '🍽️' },
  { id: 'halal', label: 'Halal', icon: '☪️' },
  { id: 'vegetarian', label: 'Vegetarian', icon: '🥬' },
  { id: 'vegan', label: 'Vegan', icon: '🌱' },
  { id: 'other', label: 'Other', icon: '🤷‍♀️' }
];

// Height options in cm
const HEIGHT_OPTIONS = Array.from({ length: 81 }, (_, i) => 140 + i); // 140cm to 220cm

export default function LifestyleScreen() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('cm');
  
  const [formData, setFormData] = useState({
    height: 170,
    body_type: '',
    fitness_level: '',
    smoking_status: '',
    drinking_status: '',
    dietary_restrictions: [] as string[]
  });

  const handleSave = async () => {
    setLoading(true);
    try {
      // Here you would save to your API
      // await apiClient.profile.updateLifestyle(formData);
      
      toast.show({
        placement: "top",
        render: ({ id }) => (
          <Toast nativeID={`toast-${id}`} action="success" variant="accent">
            <ToastTitle>Lifestyle info saved! +20 points</ToastTitle>
          </Toast>
        ),
      });
      
      router.back();
    } catch (error) {
      console.error('Error saving lifestyle data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDietaryRestriction = (restriction: string) => {
    setFormData(prev => ({
      ...prev,
      dietary_restrictions: prev.dietary_restrictions.includes(restriction)
        ? prev.dietary_restrictions.filter(r => r !== restriction)
        : [...prev.dietary_restrictions, restriction]
    }));
  };

  const cmToFeet = (cm: number) => {
    const feet = Math.floor(cm / 30.48);
    const inches = Math.round((cm % 30.48) / 2.54);
    return `${feet}'${inches}"`;
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
          Physical & Lifestyle
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
          {/* Height */}
          <VStack space="md">
            <VStack space="xs">
              <Text fontSize="$lg" fontWeight="$semibold" color="$textLight900">
                Your Height
              </Text>
              <Text fontSize="$sm" color="$textLight600">
                Current: {formData.height}cm ({cmToFeet(formData.height)})
              </Text>
            </VStack>
            <Box bg="$white" borderRadius="$lg" p="$4">
              <HStack justifyContent="space-between" alignItems="center" mb="$3">
                <Text fontSize="$md" fontWeight="$medium">Unit</Text>
                <HStack space="sm" alignItems="center">
                  <Text fontSize="$sm" color={heightUnit === 'cm' ? '$primary600' : '$textLight600'}>cm</Text>
                  <Switch
                    value={heightUnit === 'ft'}
                    onValueChange={(value) => setHeightUnit(value ? 'ft' : 'cm')}
                    trackColor={{ false: '#8F3BBF', true: '#E5E7EB' }}
                    thumbColor="#FFFFFF"
                  />
                  <Text fontSize="$sm" color={heightUnit === 'ft' ? '$primary600' : '$textLight600'}>ft</Text>
                </HStack>
              </HStack>
              
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <HStack space="sm">
                  {HEIGHT_OPTIONS.map((height) => {
                    const isSelected = formData.height === height;
                    return (
                      <Pressable
                        key={height}
                        onPress={() => setFormData(prev => ({ ...prev, height }))}
                      >
                        <Box
                          bg={isSelected ? '$primary100' : '$backgroundLight100'}
                          borderWidth="$1"
                          borderColor={isSelected ? '$primary600' : '$borderLight300'}
                          borderRadius="$md"
                          px="$3"
                          py="$2"
                          minWidth={60}
                          alignItems="center"
                        >
                          <Text
                            fontSize="$sm"
                            fontWeight={isSelected ? '$semibold' : '$normal'}
                            color={isSelected ? '$primary700' : '$textLight700'}
                          >
                            {heightUnit === 'cm' ? `${height}cm` : cmToFeet(height)}
                          </Text>
                        </Box>
                      </Pressable>
                    );
                  })}
                </HStack>
              </ScrollView>
            </Box>
          </VStack>

          {/* Body Type */}
          <VStack space="md">
            <Text fontSize="$lg" fontWeight="$semibold" color="$textLight900">
              Body Type
            </Text>
            <VStack space="sm">
              {BODY_TYPES.map((type) => {
                const isSelected = formData.body_type === type.value;
                return (
                  <Pressable
                    key={type.value}
                    onPress={() => setFormData(prev => ({ ...prev, body_type: type.value }))}
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
                        <Text fontSize="$lg">{type.icon}</Text>
                        <Text
                          fontSize="$md"
                          fontWeight={isSelected ? '$semibold' : '$normal'}
                          color={isSelected ? '$primary700' : '$textLight700'}
                        >
                          {type.label}
                        </Text>
                      </HStack>
                    </Box>
                  </Pressable>
                );
              })}
            </VStack>
          </VStack>

          {/* Fitness Level */}
          <VStack space="md">
            <Text fontSize="$lg" fontWeight="$semibold" color="$textLight900">
              Fitness Level
            </Text>
            <VStack space="sm">
              {FITNESS_LEVELS.map((level) => {
                const isSelected = formData.fitness_level === level.value;
                return (
                  <Pressable
                    key={level.value}
                    onPress={() => setFormData(prev => ({ ...prev, fitness_level: level.value }))}
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
                        <Text fontSize="$lg">{level.icon}</Text>
                        <Text
                          fontSize="$md"
                          fontWeight={isSelected ? '$semibold' : '$normal'}
                          color={isSelected ? '$primary700' : '$textLight700'}
                        >
                          {level.label}
                        </Text>
                      </HStack>
                    </Box>
                  </Pressable>
                );
              })}
            </VStack>
          </VStack>

          {/* Smoking Status */}
          <VStack space="md">
            <Text fontSize="$lg" fontWeight="$semibold" color="$textLight900">
              Do you smoke?
            </Text>
            <VStack space="sm">
              {SMOKING_STATUS.map((status) => {
                const isSelected = formData.smoking_status === status.value;
                return (
                  <Pressable
                    key={status.value}
                    onPress={() => setFormData(prev => ({ ...prev, smoking_status: status.value }))}
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

          {/* Drinking Status */}
          <VStack space="md">
            <Text fontSize="$lg" fontWeight="$semibold" color="$textLight900">
              Do you drink?
            </Text>
            <VStack space="sm">
              {DRINKING_STATUS.map((status) => {
                const isSelected = formData.drinking_status === status.value;
                return (
                  <Pressable
                    key={status.value}
                    onPress={() => setFormData(prev => ({ ...prev, drinking_status: status.value }))}
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

          {/* Dietary Restrictions */}
          <VStack space="md">
            <VStack space="xs">
              <Text fontSize="$lg" fontWeight="$semibold" color="$textLight900">
                Dietary Restrictions
              </Text>
              <Text fontSize="$sm" color="$textLight600">
                Select all that apply
              </Text>
            </VStack>
            <HStack flexWrap="wrap" space="sm">
              {DIETARY_RESTRICTIONS.map((diet) => {
                const isSelected = formData.dietary_restrictions.includes(diet.id);
                return (
                  <Pressable
                    key={diet.id}
                    onPress={() => toggleDietaryRestriction(diet.id)}
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
                        <Text fontSize="$md">{diet.icon}</Text>
                        <Text
                          fontSize="$sm"
                          fontWeight={isSelected ? '$semibold' : '$normal'}
                          color={isSelected ? '$primary700' : '$textLight700'}
                        >
                          {diet.label}
                        </Text>
                      </HStack>
                    </Box>
                  </Pressable>
                );
              })}
            </HStack>
          </VStack>
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
} 