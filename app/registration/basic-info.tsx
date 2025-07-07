import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { Modal, Platform } from 'react-native';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  ScrollView,
  KeyboardAvoidingView,
  SafeAreaView,
  Pressable,
  Center,
  Input,
  InputField,
  FormControl,
  FormControlLabel,
  FormControlLabelText,
  Divider
} from '@gluestack-ui/themed';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/button';
import { RegistrationLayout } from '@/components/ui/registration-layout';

// Calendar component for date selection
const Calendar = ({ onSelectDate, onClose }: { onSelectDate: (date: Date) => void, onClose: () => void }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const years = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i);
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const days = Array.from(
    { length: getDaysInMonth(selectedMonth, selectedYear) },
    (_, i) => i + 1
  );

  const handleConfirm = () => {
    onSelectDate(selectedDate);
    onClose();
  };

  return (
    <Box bg="$backgroundLight0" rounded="$xl" p="$6" w="$full" maxWidth={400}>
      <HStack justifyContent="space-between" alignItems="center" mb="$6">
        <Heading size="xl" color="$primary700">
          Select Date
        </Heading>
        <Pressable onPress={onClose} p="$1">
          <Ionicons name="close" size={24} color="#5B1994" />
        </Pressable>
      </HStack>

      <VStack space="lg">
        <HStack space="sm">
          {/* Year Selector */}
          <VStack space="sm" flex={1}>
            <Text size="sm" fontWeight="$medium" color="$primary700">Year</Text>
            <Box h={120} borderWidth="$1" borderColor="$borderLight300" rounded="$lg" bg="$backgroundLight50">
              <ScrollView showsVerticalScrollIndicator={false}>
                {years.map(year => (
                  <Pressable
                    key={year}
                    p="$2"
                    bg={selectedYear === year ? "$primary500" : "transparent"}
                    onPress={() => {
                      setSelectedYear(year);
                      setSelectedDate(new Date(year, selectedMonth, Math.min(selectedDate.getDate(), getDaysInMonth(selectedMonth, year))));
                    }}
                  >
                    <Text
                      textAlign="center"
                      color={selectedYear === year ? "$white" : "$textLight900"}
                      fontWeight={selectedYear === year ? "$bold" : "$normal"}
                      size="sm"
                    >
                      {year}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </Box>
          </VStack>

          {/* Month Selector */}
          <VStack space="sm" flex={1}>
            <Text size="sm" fontWeight="$medium" color="$primary700">Month</Text>
            <Box h={120} borderWidth="$1" borderColor="$borderLight300" rounded="$lg" bg="$backgroundLight50">
              <ScrollView showsVerticalScrollIndicator={false}>
                {months.map((month, index) => (
                  <Pressable
                    key={month}
                    p="$2"
                    bg={selectedMonth === index ? "$primary500" : "transparent"}
                    onPress={() => {
                      setSelectedMonth(index);
                      setSelectedDate(new Date(selectedYear, index, Math.min(selectedDate.getDate(), getDaysInMonth(index, selectedYear))));
                    }}
                  >
                    <Text
                      textAlign="center"
                      color={selectedMonth === index ? "$white" : "$textLight900"}
                      fontWeight={selectedMonth === index ? "$bold" : "$normal"}
                      size="xs"
                    >
                      {month.substring(0, 3)}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </Box>
          </VStack>
        </HStack>

        {/* Day Selector */}
        <VStack space="sm">
          <Text size="sm" fontWeight="$medium" color="$primary700">Day</Text>
          <Box borderWidth="$1" borderColor="$borderLight300" rounded="$lg" bg="$backgroundLight50" p="$3">
            <HStack flexWrap="wrap" justifyContent="center" gap="$2">
              {days.map(day => (
                <Pressable
                  key={day}
                  w={32}
                  h={32}
                  rounded="$full"
                  bg={selectedDate.getDate() === day ? "$primary500" : "$backgroundLight100"}
                  justifyContent="center"
                  alignItems="center"
                  onPress={() => {
                    setSelectedDate(new Date(selectedYear, selectedMonth, day));
                  }}
                >
                  <Text
                    color={selectedDate.getDate() === day ? "$white" : "$textLight900"}
                    fontWeight={selectedDate.getDate() === day ? "$bold" : "$normal"}
                    size="sm"
                  >
                    {day}
                  </Text>
                </Pressable>
              ))}
            </HStack>
          </Box>
        </VStack>

        <Button
          title="Confirm"
          onPress={handleConfirm}
          size="lg"
          variant="solid"
        />
      </VStack>
    </Box>
  );
};

export default function BasicInfoScreen() {
  const router = useRouter();
  
  const [selectedGender, setSelectedGender] = useState<'male' | 'female' | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [error, setError] = useState('');

  const formatDate = (date: Date) => {
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  };

  const handleContinue = () => {
    if (!selectedGender) {
      setError('Please select your gender');
      return;
    }

    if (!firstName.trim()) {
      setError('Please enter your first name');
      return;
    }

    if (!lastName.trim()) {
      setError('Please enter your last name');
      return;
    }

    if (!dateOfBirth) {
      setError('Please select your date of birth');
      return;
    }

    // Calculate age
    const today = new Date();
    let age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
      age--;
    }

    if (age < 18) {
      setError('You must be at least 18 years old to register');
      return;
    }

    // Navigate to the next screen
    router.push({
      pathname: '/registration/contact-info',
      params: {
        gender: selectedGender,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dateOfBirth: dateOfBirth.toISOString(),
        age: age.toString()
      }
    });
  };

  const clearError = () => {
    if (error) setError('');
  };

  const GenderOption = ({
    gender,
    iconName,
    label,
    isSelected,
    onPress
  }: {
    gender: 'male' | 'female';
    iconName: keyof typeof Ionicons.glyphMap;
    label: string;
    isSelected: boolean;
    onPress: () => void;
  }) => (
    <Pressable onPress={onPress} flex={1} maxWidth="48%">
      <VStack
        alignItems="center"
        p="$4"
        rounded="$xl"
        bg={isSelected ? "$primary500" : "$backgroundLight0"}
        borderWidth="$2"
        borderColor={isSelected ? "$primary500" : "$primary200"}
        shadowColor="$shadowColor"
        shadowOffset={{ width: 0, height: 2 }}
        shadowOpacity={0.1}
        shadowRadius={4}
        elevation={2}
      >
        <Center
          w="$16"
          h="$16"
          bg={isSelected ? "$backgroundLight0" : "$primary50"}
          rounded="$full"
          mb="$2"
        >
          <Ionicons
            name={iconName}
            size={32}
            color={isSelected ? "#6366f1" : "#8b5cf6"}
          />
        </Center>
        <Text
          fontSize="$md"
          fontWeight="$semibold"
          color={isSelected ? "$white" : "$primary700"}
        >
          {label}
        </Text>
      </VStack>
    </Pressable>
  );

  return (
    <RegistrationLayout
      title="Basic Information"
      currentStep={1}
      totalSteps={7}
      showBackButton={false}
    >
      <SafeAreaView flex={1} bg="$primaryLight50">
        <KeyboardAvoidingView
          flex={1}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
        >
          <Box flex={1}>
            <ScrollView
              flex={1}
              contentContainerStyle={{ flexGrow: 1 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Box flex={1} px="$6" py="$6">
                <VStack space="xl" flex={1}>
                  {/* Header */}
                  <Center mb="$6">
                    <Heading
                      size="3xl"
                      color="$primary700"
                      textAlign="center"
                      fontWeight="$bold"
                      mb="$2"
                    >
                      Let's Get Started
                    </Heading>
                    <Text
                      size="md"
                      color="$textLight600"
                      textAlign="center"
                      maxWidth="$80"
                    >
                      Tell us the basics about yourself
                    </Text>
                  </Center>

                  {/* Gender Selection */}
                  <VStack space="md">
                    <Text
                      size="lg"
                      fontWeight="$semibold"
                      color="$primary700"
                    >
                      Gender
                    </Text>
                    <HStack space="md" justifyContent="space-between">
                      <GenderOption
                        gender="male"
                        iconName="man"
                        label="Male"
                        isSelected={selectedGender === 'male'}
                        onPress={() => {
                          setSelectedGender('male');
                          clearError();
                        }}
                      />
                      <GenderOption
                        gender="female"
                        iconName="woman"
                        label="Female"
                        isSelected={selectedGender === 'female'}
                        onPress={() => {
                          setSelectedGender('female');
                          clearError();
                        }}
                      />
                    </HStack>
                  </VStack>

                  <Divider bg="$borderLight200" />

                  {/* Name Input */}
                  <VStack space="md">
                    <Text
                      size="lg"
                      fontWeight="$semibold"
                      color="$primary700"
                    >
                      Your Name
                    </Text>
                    
                    <HStack space="md">
                      <FormControl flex={1}>
                        <FormControlLabel>
                          <FormControlLabelText size="sm" color="$primary700" fontWeight="$medium">
                            First Name
                          </FormControlLabelText>
                        </FormControlLabel>
                        <Input
                          size="lg"
                          borderColor="$primary300"
                          borderWidth="$2"
                          borderRadius="$lg"
                          bg="$backgroundLight0"
                          $focus={{ borderColor: "$primary500" }}
                        >
                          <InputField
                            value={firstName}
                            onChangeText={(text) => {
                              setFirstName(text);
                              clearError();
                            }}
                            placeholder="First name"
                            fontSize="$md"
                            color="$primary700"
                            autoCapitalize="words"
                          />
                        </Input>
                      </FormControl>

                      <FormControl flex={1}>
                        <FormControlLabel>
                          <FormControlLabelText size="sm" color="$primary700" fontWeight="$medium">
                            Last Name
                          </FormControlLabelText>
                        </FormControlLabel>
                        <Input
                          size="lg"
                          borderColor="$primary300"
                          borderWidth="$2"
                          borderRadius="$lg"
                          bg="$backgroundLight0"
                          $focus={{ borderColor: "$primary500" }}
                        >
                          <InputField
                            value={lastName}
                            onChangeText={(text) => {
                              setLastName(text);
                              clearError();
                            }}
                            placeholder="Last name"
                            fontSize="$md"
                            color="$primary700"
                            autoCapitalize="words"
                          />
                        </Input>
                      </FormControl>
                    </HStack>
                  </VStack>

                  <Divider bg="$borderLight200" />

                  {/* Date of Birth */}
                  <VStack space="md">
                    <Text
                      size="lg"
                      fontWeight="$semibold"
                      color="$primary700"
                    >
                      Date of Birth
                    </Text>
                    
                    <Pressable
                      onPress={() => setShowCalendar(true)}
                      borderWidth="$2"
                      borderColor="$primary300"
                      rounded="$lg"
                      p="$4"
                      bg="$backgroundLight0"
                      minHeight={56}
                      justifyContent="center"
                    >
                      <HStack justifyContent="space-between" alignItems="center">
                        <Text
                          size="md"
                          color={dateOfBirth ? "$textLight900" : "$textLight500"}
                          fontWeight={dateOfBirth ? "$medium" : "$normal"}
                        >
                          {dateOfBirth ? formatDate(dateOfBirth) : 'Select your date of birth'}
                        </Text>
                        <Ionicons name="calendar" size={24} color="#8F3BBF" />
                      </HStack>
                    </Pressable>
                  </VStack>

                  {/* Error Message */}
                  {error && (
                    <Box
                      bg="$error50"
                      borderColor="$error200"
                      borderWidth="$1"
                      borderRadius="$md"
                      px="$4"
                      py="$3"
                    >
                      <Text
                        size="sm"
                        color="$error700"
                        textAlign="center"
                        fontWeight="$medium"
                      >
                        {error}
                      </Text>
                    </Box>
                  )}

                  {/* Spacer for scroll content */}
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
              bg="$primaryLight50"
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
                isDisabled={!selectedGender || !firstName.trim() || !lastName.trim() || !dateOfBirth}
                size="lg"
                variant="solid"
              />
            </Box>
          </Box>
        </KeyboardAvoidingView>

        {/* Calendar Modal */}
        <Modal
          visible={showCalendar}
          transparent={true}
          animationType="slide"
          presentationStyle="overFullScreen"
        >
          <Box
            flex={1}
            justifyContent="center"
            alignItems="center"
            bg="rgba(0,0,0,0.5)"
            p="$4"
          >
            <Calendar
              onSelectDate={(date) => {
                setDateOfBirth(date);
                clearError();
              }}
              onClose={() => setShowCalendar(false)}
            />
          </Box>
        </Modal>
      </SafeAreaView>
    </RegistrationLayout>
  );
} 