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

export default function Step4CareerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [occupation, setOccupation] = useState('');
  const [profession, setProfession] = useState('');
  const [educationLevel, setEducationLevel] = useState<string | null>(null);
  const [universityName, setUniversityName] = useState('');
  const [incomeRange, setIncomeRange] = useState<string | null>(null);
  const [error, setError] = useState('');

  const educationOptions = [
    { id: 'high_school', label: 'High School', icon: 'school' },
    { id: 'bachelors', label: 'Bachelor\'s Degree', icon: 'school' },
    { id: 'masters', label: 'Master\'s Degree', icon: 'school' },
    { id: 'phd', label: 'PhD', icon: 'school' },
    { id: 'vocational', label: 'Vocational Training', icon: 'construct' },
    { id: 'other', label: 'Other', icon: 'help-circle' },
  ];

  const incomeRangeOptions = [
    { value: 'prefer_not_to_say', label: 'Prefer not to say' },
    { value: 'under_25k', label: 'Under $25,000' },
    { value: '25k_50k', label: '$25,000 - $50,000' },
    { value: '50k_75k', label: '$50,000 - $75,000' },
    { value: '75k_100k', label: '$75,000 - $100,000' },
    { value: '100k_plus', label: '$100,000+' },
  ];

  const handleContinue = () => {
    if (!occupation.trim()) {
      setError('Please enter your occupation');
      return;
    }

    if (!profession.trim()) {
      setError('Please enter your profession');
      return;
    }

    if (!educationLevel) {
      setError('Please select your education level');
      return;
    }

    if (!incomeRange) {
      setError('Please select your income range');
      return;
    }

    // Navigate to next step with all collected data
    router.push({
      pathname: '/profile-setup/step-5-physical',
      params: {
        ...params,
        occupation: occupation.trim(),
        profession: profession.trim(),
        educationLevel,
        universityName: universityName.trim(),
        incomeRange,
      }
    });
  };

  const clearError = () => {
    if (error) setError('');
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

  return (
    <ProfileSetupLayout
      title="Career & Education"
      subtitle="Tell us about your professional and educational background"
      currentStep={4}
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

                {/* Occupation Section */}
                <VStack space="md">
                  <Text fontSize="$lg" fontWeight="$semibold" color="$primary900">
                    Your occupation
                  </Text>
                  <Text fontSize="$sm" color="$textLight600">
                    What type of work do you do?
                  </Text>
                  <FormControl>
                    <Input>
                      <InputField
                        placeholder="e.g., Software Developer, Teacher, Doctor..."
                        value={occupation}
                        onChangeText={(text) => {
                          setOccupation(text);
                          clearError();
                        }}
                      />
                    </Input>
                  </FormControl>
                </VStack>

                <Divider bg="$borderLight200" />

                {/* Profession Section */}
                <VStack space="md">
                  <Text fontSize="$lg" fontWeight="$semibold" color="$primary900">
                    Your profession
                  </Text>
                  <Text fontSize="$sm" color="$textLight600">
                    More specific details about what you do
                  </Text>
                  <FormControl>
                    <Input>
                      <InputField
                        placeholder="e.g., Full Stack Developer, Elementary Teacher..."
                        value={profession}
                        onChangeText={(text) => {
                          setProfession(text);
                          clearError();
                        }}
                      />
                    </Input>
                  </FormControl>
                </VStack>

                <Divider bg="$borderLight200" />

                {/* Education Level Section */}
                <VStack space="md">
                  <Text fontSize="$lg" fontWeight="$semibold" color="$primary900">
                    Education level
                  </Text>
                  <VStack space="xs">
                    {educationOptions.map((option) => (
                      <OptionCard
                        key={option.id}
                        option={option}
                        isSelected={educationLevel === option.id}
                        onPress={() => {
                          setEducationLevel(option.id);
                          clearError();
                        }}
                      />
                    ))}
                  </VStack>
                </VStack>

                <Divider bg="$borderLight200" />

                {/* University Name Section */}
                <VStack space="md">
                  <Text fontSize="$lg" fontWeight="$semibold" color="$primary900">
                    University name
                  </Text>
                  <Text fontSize="$sm" color="$textLight600">
                    Optional - Where did you study?
                  </Text>
                  <FormControl>
                    <Input>
                      <InputField
                        placeholder="e.g., Harvard University, MIT..."
                        value={universityName}
                        onChangeText={(text) => {
                          setUniversityName(text);
                          clearError();
                        }}
                      />
                    </Input>
                  </FormControl>
                </VStack>

                <Divider bg="$borderLight200" />

                {/* Income Range Section */}
                <VStack space="md">
                  <Text fontSize="$lg" fontWeight="$semibold" color="$primary900">
                    Income range
                  </Text>
                  <Text fontSize="$sm" color="$textLight600">
                    This information helps with matching compatibility
                  </Text>
                  <Box
                    bg="$backgroundLight50"
                    borderWidth="$1"
                    borderColor="$borderLight200"
                    borderRadius="$lg"
                    p="$4"
                  >
                    <Select
                      selectedValue={incomeRange}
                      onValueChange={(value) => {
                        setIncomeRange(value);
                        clearError();
                      }}
                    >
                      <SelectTrigger>
                        <SelectInput placeholder="Select your income range" />
                        <SelectIcon as={ChevronDownIcon} mr="$3" />
                      </SelectTrigger>
                      <SelectPortal>
                        <SelectBackdrop />
                        <SelectContent>
                          <SelectDragIndicatorWrapper>
                            <SelectDragIndicator />
                          </SelectDragIndicatorWrapper>
                          {incomeRangeOptions.map((option) => (
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

                {/* Career Tips */}
                <Box
                  bg="$primary50"
                  borderWidth="$1"
                  borderColor="$primary200"
                  borderRadius="$lg"
                  p="$4"
                >
                  <HStack space="sm" alignItems="flex-start">
                    <Ionicons name="bulb" size={20} color="#8F3BBF" />
                    <VStack space="xs" flex={1}>
                      <Text fontSize="$sm" fontWeight="$semibold" color="$primary700">
                        Career Profile Tips
                      </Text>
                      <Text fontSize="$xs" color="$primary600" lineHeight="$sm">
                        • Be honest about your profession and income
                        • Highlight achievements and career goals
                        • This helps match with compatible partners
                        • You can always update this information later
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