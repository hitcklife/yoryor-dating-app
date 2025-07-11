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
  Input,
  InputField,
  FormControl,
  FormControlLabel,
  FormControlLabelText,
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
  ChevronDownIcon
} from '@gluestack-ui/themed';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/button';
import { ProfileSetupLayout } from '@/components/ui/profile-setup-layout';

export default function Step5PhysicalScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [height, setHeight] = useState('');
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('cm');
  const [bodyType, setBodyType] = useState<string | null>(null);
  const [fitnessLevel, setFitnessLevel] = useState<string | null>(null);
  const [smokingStatus, setSmokingStatus] = useState<string | null>(null);
  const [drinkingStatus, setDrinkingStatus] = useState<string | null>(null);
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
  const [error, setError] = useState('');

  const bodyTypeOptions = [
    { id: 'slim', label: 'Slim', icon: 'body' },
    { id: 'athletic', label: 'Athletic', icon: 'fitness' },
    { id: 'average', label: 'Average', icon: 'person' },
    { id: 'curvy', label: 'Curvy', icon: 'person' },
    { id: 'plus_size', label: 'Plus Size', icon: 'person' },
  ];

  const fitnessLevelOptions = [
    { id: 'very_active', label: 'Very Active', icon: 'fitness' },
    { id: 'active', label: 'Active', icon: 'walk' },
    { id: 'moderate', label: 'Moderate', icon: 'accessibility' },
    { id: 'sedentary', label: 'Sedentary', icon: 'desktop' },
  ];

  const smokingOptions = [
    { id: 'never', label: 'Never', icon: 'ban' },
    { id: 'socially', label: 'Socially', icon: 'people' },
    { id: 'regularly', label: 'Regularly', icon: 'warning' },
    { id: 'trying_to_quit', label: 'Trying to Quit', icon: 'medical' },
  ];

  const drinkingOptions = [
    { id: 'never', label: 'Never', icon: 'ban' },
    { id: 'socially', label: 'Socially', icon: 'people' },
    { id: 'regularly', label: 'Regularly', icon: 'wine' },
    { id: 'special_occasions', label: 'Only Special Occasions', icon: 'calendar' },
  ];

  const dietaryOptions = [
    { id: 'none', label: 'No Restrictions', icon: 'restaurant' },
    { id: 'halal', label: 'Halal', icon: 'star' },
    { id: 'vegetarian', label: 'Vegetarian', icon: 'leaf' },
    { id: 'vegan', label: 'Vegan', icon: 'leaf' },
    { id: 'other', label: 'Other', icon: 'help-circle' },
  ];

  const heightOptions = [
    { value: '150', label: '150 cm (4\'11")' },
    { value: '155', label: '155 cm (5\'1")' },
    { value: '160', label: '160 cm (5\'3")' },
    { value: '165', label: '165 cm (5\'5")' },
    { value: '170', label: '170 cm (5\'7")' },
    { value: '175', label: '175 cm (5\'9")' },
    { value: '180', label: '180 cm (5\'11")' },
    { value: '185', label: '185 cm (6\'1")' },
    { value: '190', label: '190 cm (6\'3")' },
    { value: '195', label: '195 cm (6\'5")' },
    { value: '200', label: '200 cm (6\'7")' },
  ];

  const toggleDietaryRestriction = (restrictionId: string) => {
    setDietaryRestrictions(prev => {
      if (restrictionId === 'none') {
        return ['none'];
      } else {
        const filtered = prev.filter(id => id !== 'none');
        if (filtered.includes(restrictionId)) {
          return filtered.filter(id => id !== restrictionId);
        } else {
          return [...filtered, restrictionId];
        }
      }
    });
    if (error) setError('');
  };

  const handleContinue = () => {
    if (!height) {
      setError('Please enter your height');
      return;
    }

    if (!bodyType) {
      setError('Please select your body type');
      return;
    }

    if (!fitnessLevel) {
      setError('Please select your fitness level');
      return;
    }

    if (!smokingStatus) {
      setError('Please select your smoking status');
      return;
    }

    if (!drinkingStatus) {
      setError('Please select your drinking status');
      return;
    }

    if (dietaryRestrictions.length === 0) {
      setError('Please select your dietary restrictions');
      return;
    }

    // Navigate to next step with all collected data
    router.push({
      pathname: '/profile-setup/step-6-location',
      params: {
        ...params,
        height,
        heightUnit,
        bodyType,
        fitnessLevel,
        smokingStatus,
        drinkingStatus,
        dietaryRestrictions: JSON.stringify(dietaryRestrictions),
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
      title="Physical & Lifestyle"
      subtitle="Tell us about your physical attributes and lifestyle preferences"
      currentStep={5}
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

                {/* Height Section */}
                <VStack space="md">
                  <Text fontSize="$lg" fontWeight="$semibold" color="$primary900">
                    Your height
                  </Text>
                  <Box
                    bg="$backgroundLight50"
                    borderWidth="$1"
                    borderColor="$borderLight200"
                    borderRadius="$lg"
                    p="$4"
                  >
                    <Select
                      selectedValue={height}
                      onValueChange={(value) => {
                        setHeight(value);
                        clearError();
                      }}
                    >
                      <SelectTrigger>
                        <SelectInput placeholder="Select your height" />
                        <SelectIcon as={ChevronDownIcon} mr="$3" />
                      </SelectTrigger>
                      <SelectPortal>
                        <SelectBackdrop />
                        <SelectContent>
                          <SelectDragIndicatorWrapper>
                            <SelectDragIndicator />
                          </SelectDragIndicatorWrapper>
                          {heightOptions.map((option) => (
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

                {/* Body Type Section */}
                <VStack space="md">
                  <Text fontSize="$lg" fontWeight="$semibold" color="$primary900">
                    Body type
                  </Text>
                  <HStack space="md" flexWrap="wrap">
                    {bodyTypeOptions.map((option) => (
                      <OptionCard
                        key={option.id}
                        option={option}
                        isSelected={bodyType === option.id}
                        onPress={() => {
                          setBodyType(option.id);
                          clearError();
                        }}
                      />
                    ))}
                  </HStack>
                </VStack>

                <Divider bg="$borderLight200" />

                {/* Fitness Level Section */}
                <VStack space="md">
                  <Text fontSize="$lg" fontWeight="$semibold" color="$primary900">
                    Fitness level
                  </Text>
                  <VStack space="xs">
                    {fitnessLevelOptions.map((option) => (
                      <OptionCard
                        key={option.id}
                        option={option}
                        isSelected={fitnessLevel === option.id}
                        onPress={() => {
                          setFitnessLevel(option.id);
                          clearError();
                        }}
                      />
                    ))}
                  </VStack>
                </VStack>

                <Divider bg="$borderLight200" />

                {/* Smoking Section */}
                <VStack space="md">
                  <Text fontSize="$lg" fontWeight="$semibold" color="$primary900">
                    Do you smoke?
                  </Text>
                  <VStack space="xs">
                    {smokingOptions.map((option) => (
                      <OptionCard
                        key={option.id}
                        option={option}
                        isSelected={smokingStatus === option.id}
                        onPress={() => {
                          setSmokingStatus(option.id);
                          clearError();
                        }}
                      />
                    ))}
                  </VStack>
                </VStack>

                <Divider bg="$borderLight200" />

                {/* Drinking Section */}
                <VStack space="md">
                  <Text fontSize="$lg" fontWeight="$semibold" color="$primary900">
                    Do you drink?
                  </Text>
                  <VStack space="xs">
                    {drinkingOptions.map((option) => (
                      <OptionCard
                        key={option.id}
                        option={option}
                        isSelected={drinkingStatus === option.id}
                        onPress={() => {
                          setDrinkingStatus(option.id);
                          clearError();
                        }}
                      />
                    ))}
                  </VStack>
                </VStack>

                <Divider bg="$borderLight200" />

                {/* Dietary Restrictions Section */}
                <VStack space="md">
                  <Text fontSize="$lg" fontWeight="$semibold" color="$primary900">
                    Dietary restrictions
                  </Text>
                  <Text fontSize="$sm" color="$textLight600">
                    Select all that apply
                  </Text>
                  <VStack space="xs">
                    {dietaryOptions.map((option) => (
                      <OptionCard
                        key={option.id}
                        option={option}
                        isSelected={dietaryRestrictions.includes(option.id)}
                        onPress={() => toggleDietaryRestriction(option.id)}
                        isMultiSelect={true}
                      />
                    ))}
                  </VStack>
                  {dietaryRestrictions.length > 0 && (
                    <HStack space="xs" flexWrap="wrap">
                      {dietaryRestrictions.map((restrictionId) => {
                        const restriction = dietaryOptions.find(d => d.id === restrictionId);
                        return (
                          <Badge key={restrictionId} variant="solid" bg="$primary600" borderRadius="$full">
                            <BadgeText color="$white" fontSize="$xs">
                              {restriction?.label}
                            </BadgeText>
                          </Badge>
                        );
                      })}
                    </HStack>
                  )}
                </VStack>

                {/* Health Tips */}
                <Box
                  bg="$success50"
                  borderWidth="$1"
                  borderColor="$success200"
                  borderRadius="$lg"
                  p="$4"
                >
                  <HStack space="sm" alignItems="flex-start">
                    <Ionicons name="heart" size={20} color="#059669" />
                    <VStack space="xs" flex={1}>
                      <Text fontSize="$sm" fontWeight="$semibold" color="$success700">
                        Health & Lifestyle Tips
                      </Text>
                      <Text fontSize="$xs" color="$success600" lineHeight="$sm">
                        • Be honest about your lifestyle choices
                        • This helps match with compatible partners
                        • Healthy lifestyle choices improve relationships
                        • You can always update these preferences later
                      </Text>
                    </VStack>
                  </HStack>
                </Box>

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