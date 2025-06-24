import React, { useState } from 'react';
import { Modal, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
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
  Divider
} from '@gluestack-ui/themed';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/button';
import { RegistrationLayout } from '@/components/ui/registration-layout';

// Gluestack-styled Calendar component
const Calendar = ({ onSelectDate, onClose }: { onSelectDate: (date: Date) => void, onClose: () => void }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Generate years (100 years back from current year)
  const years = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i);

  // Generate months
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Generate days in the selected month
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
        {/* Year Selector */}
        <VStack space="sm">
          <Text size="sm" fontWeight="$medium" color="$primary700">
            Year
          </Text>
          <Box
            h={160}
            borderWidth="$1"
            borderColor="$borderLight300"
            rounded="$lg"
            bg="$backgroundLight50"
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              {years.map(year => (
                <Pressable
                  key={year}
                  p="$3"
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
                  >
                    {year}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </Box>
        </VStack>

        {/* Month Selector */}
        <VStack space="sm">
          <Text size="sm" fontWeight="$medium" color="$primary700">
            Month
          </Text>
          <Box
            h={160}
            borderWidth="$1"
            borderColor="$borderLight300"
            rounded="$lg"
            bg="$backgroundLight50"
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              {months.map((month, index) => (
                <Pressable
                  key={month}
                  p="$3"
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
                  >
                    {month}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </Box>
        </VStack>

        {/* Day Selector */}
        <VStack space="sm">
          <Text size="sm" fontWeight="$medium" color="$primary700">
            Day
          </Text>
          <Box
            borderWidth="$1"
            borderColor="$borderLight300"
            rounded="$lg"
            bg="$backgroundLight50"
            p="$3"
          >
            <HStack flexWrap="wrap" justifyContent="center" gap="$2">
              {days.map(day => (
                <Pressable
                  key={day}
                  w={40}
                  h={40}
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

export default function DateOfBirthScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    gender: string;
    firstName: string;
    lastName: string;
  }>();

  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [error, setError] = useState('');

  const formatDate = (date: Date) => {
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  };

  const handleContinue = () => {
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

    // Navigate to the next screen with the collected data
    router.push({
      pathname: '/registration/email',
      params: {
        ...params,
        dateOfBirth: dateOfBirth.toISOString(),
        age: age.toString()
      }
    });
  };

  return (
    <SafeAreaView flex={1} bg="$primaryLight50">
      <RegistrationLayout
        title="Date of Birth"
        currentStep={3}
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
              <VStack space="xl" flex={1}>
                {/* Header */}
                <Center>
                  <Heading
                    size="3xl"
                    color="$primary700"
                    textAlign="center"
                    fontWeight="$bold"
                    mb="$2"
                  >
                    When Were You Born?
                  </Heading>
                  <Text
                    size="md"
                    color="$textLight600"
                    textAlign="center"
                    maxWidth="$80"
                  >
                    Please select your date of birth to continue
                  </Text>
                </Center>

                {/* Date Input */}
                <VStack space="md">
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
                        size="lg"
                        color={dateOfBirth ? "$textLight900" : "$textLight500"}
                        fontWeight={dateOfBirth ? "$medium" : "$normal"}
                      >
                        {dateOfBirth ? formatDate(dateOfBirth) : 'Select your date of birth'}
                      </Text>
                      <Ionicons name="calendar" size={24} color="#8F3BBF" />
                    </HStack>
                  </Pressable>

                  {error && (
                    <Box
                      px="$4"
                      py="$3"
                      bg="$error50"
                      rounded="$md"
                      borderWidth="$1"
                      borderColor="$error200"
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
                </VStack>

                {/* Continue Button */}
                <Box mt="auto" pt="$6">
                  <Button
                    title="Continue"
                    onPress={handleContinue}
                    isDisabled={!dateOfBirth}
                    size="lg"
                    variant="solid"
                  />
                </Box>
              </VStack>
            </Box>
          </ScrollView>
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
                setError('');
              }}
              onClose={() => setShowCalendar(false)}
            />
          </Box>
        </Modal>
      </RegistrationLayout>
    </SafeAreaView>
  );
}
