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
  Switch,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
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

export default function Step3FamilyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [familyImportance, setFamilyImportance] = useState(5);
  const [wantChildren, setWantChildren] = useState<string | null>(null);
  const [childrenCount, setChildrenCount] = useState<string | null>(null);
  const [marriageTimeline, setMarriageTimeline] = useState<string | null>(null);
  const [livesWithFamily, setLivesWithFamily] = useState<boolean | null>(null);
  const [familyApprovalImportant, setFamilyApprovalImportant] = useState<boolean | null>(null);
  const [error, setError] = useState('');

  const childrenOptions = [
    { id: 'yes', label: 'Yes, I want children', icon: 'heart' },
    { id: 'no', label: 'No, I don\'t want children', icon: 'close-circle' },
    { id: 'maybe', label: 'Maybe, not sure yet', icon: 'help-circle' },
    { id: 'have_want_more', label: 'I have children and want more', icon: 'people' },
    { id: 'have_no_more', label: 'I have children but don\'t want more', icon: 'checkmark-circle' },
  ];

  const marriageTimelineOptions = [
    { id: 'within_1_year', label: 'Within 1 year', icon: 'time' },
    { id: '1_2_years', label: '1-2 years', icon: 'time' },
    { id: '2_5_years', label: '2-5 years', icon: 'time' },
    { id: 'someday', label: 'Someday', icon: 'calendar' },
    { id: 'never', label: 'Never', icon: 'close' },
  ];

  const childrenCountOptions = [
    { value: '1', label: '1 child' },
    { value: '2', label: '2 children' },
    { value: '3', label: '3 children' },
    { value: '4', label: '4 children' },
    { value: '5+', label: '5+ children' },
  ];

  const handleContinue = () => {
    if (!wantChildren) {
      setError('Please select if you want children');
      return;
    }

    if (wantChildren === 'yes' && !childrenCount) {
      setError('Please specify how many children you would like');
      return;
    }

    if (!marriageTimeline) {
      setError('Please select your marriage timeline');
      return;
    }

    if (livesWithFamily === null) {
      setError('Please specify if you live with your family');
      return;
    }

    if (familyApprovalImportant === null) {
      setError('Please specify if family approval is important to you');
      return;
    }

    // Navigate to next step with all collected data
    router.push({
      pathname: '/profile-setup/step-4-career',
      params: {
        ...params,
        familyImportance: familyImportance.toString(),
        wantChildren,
        childrenCount: childrenCount || '',
        marriageTimeline,
        livesWithFamily: livesWithFamily.toString(),
        familyApprovalImportant: familyApprovalImportant.toString(),
      }
    });
  };

  const clearError = () => {
    if (error) setError('');
  };

  const getFamilyImportanceLabel = (value: number) => {
    if (value <= 2) return 'Not Important';
    if (value <= 4) return 'Somewhat Important';
    if (value <= 6) return 'Important';
    if (value <= 8) return 'Very Important';
    return 'Extremely Important';
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
    value, 
    onToggle 
  }: { 
    title: string, 
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
      <HStack space="md" alignItems="center" justifyContent="space-between">
        <Text fontSize="$md" fontWeight="$medium" color="$textLight900" flex={1}>
          {title}
        </Text>
        <HStack space="md" alignItems="center">
          <Pressable
            onPress={() => onToggle(false)}
            bg={value === false ? '$primary600' : '$backgroundLight200'}
            px="$3"
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
            px="$3"
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
      </HStack>
    </Box>
  );

  return (
    <ProfileSetupLayout
      title="Family & Marriage"
      subtitle="Tell us about your family values and marriage preferences"
      currentStep={3}
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

                {/* Family Importance Slider */}
                <VStack space="md">
                  <Text fontSize="$lg" fontWeight="$semibold" color="$primary900">
                    How important is family to you?
                  </Text>
                  <Box
                    bg="$backgroundLight50"
                    borderWidth="$1"
                    borderColor="$borderLight200"
                    borderRadius="$lg"
                    p="$4"
                  >
                    <VStack space="md">
                      <HStack justifyContent="space-between" alignItems="center">
                        <Text fontSize="$sm" color="$textLight600">
                          Not Important
                        </Text>
                        <Text fontSize="$lg" fontWeight="$bold" color="$primary600">
                          {getFamilyImportanceLabel(familyImportance)}
                        </Text>
                        <Text fontSize="$sm" color="$textLight600">
                          Extremely Important
                        </Text>
                      </HStack>
                      <Slider
                        value={familyImportance}
                        onChange={setFamilyImportance}
                        minValue={1}
                        maxValue={10}
                        step={1}
                        size="md"
                      >
                        <SliderTrack>
                          <SliderFilledTrack />
                        </SliderTrack>
                        <SliderThumb />
                      </Slider>
                    </VStack>
                  </Box>
                </VStack>

                <Divider bg="$borderLight200" />

                {/* Children Section */}
                <VStack space="md">
                  <Text fontSize="$lg" fontWeight="$semibold" color="$primary900">
                    Do you want children?
                  </Text>
                  <VStack space="xs">
                    {childrenOptions.map((option) => (
                      <OptionCard
                        key={option.id}
                        option={option}
                        isSelected={wantChildren === option.id}
                        onPress={() => {
                          setWantChildren(option.id);
                          clearError();
                        }}
                      />
                    ))}
                  </VStack>
                </VStack>

                {/* Children Count Section - Only show if wants children */}
                {wantChildren === 'yes' && (
                  <>
                    <Divider bg="$borderLight200" />
                    <VStack space="md">
                      <Text fontSize="$lg" fontWeight="$semibold" color="$primary900">
                        How many children would you like?
                      </Text>
                      <Box
                        bg="$backgroundLight50"
                        borderWidth="$1"
                        borderColor="$borderLight200"
                        borderRadius="$lg"
                        p="$4"
                      >
                        <Select
                          selectedValue={childrenCount}
                          onValueChange={(value) => {
                            setChildrenCount(value);
                            clearError();
                          }}
                        >
                          <SelectTrigger>
                            <SelectInput placeholder="Select number of children" />
                            <SelectIcon as={ChevronDownIcon} mr="$3" />
                          </SelectTrigger>
                          <SelectPortal>
                            <SelectBackdrop />
                            <SelectContent>
                              <SelectDragIndicatorWrapper>
                                <SelectDragIndicator />
                              </SelectDragIndicatorWrapper>
                              {childrenCountOptions.map((option) => (
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
                  </>
                )}

                <Divider bg="$borderLight200" />

                {/* Marriage Timeline Section */}
                <VStack space="md">
                  <Text fontSize="$lg" fontWeight="$semibold" color="$primary900">
                    When do you want to get married?
                  </Text>
                  <VStack space="xs">
                    {marriageTimelineOptions.map((option) => (
                      <OptionCard
                        key={option.id}
                        option={option}
                        isSelected={marriageTimeline === option.id}
                        onPress={() => {
                          setMarriageTimeline(option.id);
                          clearError();
                        }}
                      />
                    ))}
                  </VStack>
                </VStack>

                <Divider bg="$borderLight200" />

                {/* Living with Family Section */}
                <VStack space="md">
                  <Text fontSize="$lg" fontWeight="$semibold" color="$primary900">
                    Do you live with your family?
                  </Text>
                  <ToggleCard
                    title="Currently living with family"
                    value={livesWithFamily}
                    onToggle={(value) => {
                      setLivesWithFamily(value);
                      clearError();
                    }}
                  />
                </VStack>

                <Divider bg="$borderLight200" />

                {/* Family Approval Section */}
                <VStack space="md">
                  <Text fontSize="$lg" fontWeight="$semibold" color="$primary900">
                    Is family approval important?
                  </Text>
                  <Text fontSize="$sm" color="$textLight600">
                    For your relationships and major life decisions
                  </Text>
                  <ToggleCard
                    title="Family approval is important to me"
                    value={familyApprovalImportant}
                    onToggle={(value) => {
                      setFamilyApprovalImportant(value);
                      clearError();
                    }}
                  />
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