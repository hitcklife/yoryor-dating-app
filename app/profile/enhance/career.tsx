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
  Input,
  InputField,
  useToast,
  Toast,
  ToastTitle
} from '@gluestack-ui/themed';
import { Ionicons } from '@expo/vector-icons';

const EDUCATION_LEVELS = [
  { value: 'high_school', label: 'High School', icon: '🎓' },
  { value: 'bachelors', label: 'Bachelor\'s Degree', icon: '📚' },
  { value: 'masters', label: 'Master\'s Degree', icon: '🎯' },
  { value: 'phd', label: 'PhD', icon: '👨‍🎓' },
  { value: 'vocational', label: 'Vocational Training', icon: '🛠️' },
  { value: 'other', label: 'Other', icon: '📖' }
];

const INCOME_RANGES = [
  { value: 'prefer_not_to_say', label: 'Prefer not to say', icon: '🤐' },
  { value: 'under_25k', label: 'Under $25,000', icon: '💰' },
  { value: '25k_50k', label: '$25,000 - $50,000', icon: '💵' },
  { value: '50k_75k', label: '$50,000 - $75,000', icon: '💸' },
  { value: '75k_100k', label: '$75,000 - $100,000', icon: '🏦' },
  { value: '100k_plus', label: '$100,000+', icon: '💎' }
];

export default function CareerScreen() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    occupation: '',
    profession: '',
    education_level: '',
    university_name: '',
    income_range: ''
  });

  const handleSave = async () => {
    setLoading(true);
    try {
      // Here you would save to your API
      // await apiClient.profile.updateCareer(formData);
      
      toast.show({
        placement: "top",
        render: ({ id }) => (
          <Toast nativeID={`toast-${id}`} action="success" variant="accent">
            <ToastTitle>Career info saved! +20 points</ToastTitle>
          </Toast>
        ),
      });
      
      router.back();
    } catch (error) {
      console.error('Error saving career data:', error);
    } finally {
      setLoading(false);
    }
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
          Career & Education
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
          {/* Occupation */}
          <VStack space="md">
            <VStack space="xs">
              <Text fontSize="$lg" fontWeight="$semibold" color="$textLight900">
                Your Occupation
              </Text>
              <Text fontSize="$sm" color="$textLight600">
                What do you do for work?
              </Text>
            </VStack>
            <Box bg="$white" borderRadius="$lg" p="$1">
              <Input>
                <InputField
                  placeholder="e.g., Software Engineer, Teacher, Doctor"
                  value={formData.occupation}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, occupation: text }))}
                />
              </Input>
            </Box>
          </VStack>

          {/* Profession */}
          <VStack space="md">
            <VStack space="xs">
              <Text fontSize="$lg" fontWeight="$semibold" color="$textLight900">
                Your Profession
              </Text>
              <Text fontSize="$sm" color="$textLight600">
                More specific job title or field
              </Text>
            </VStack>
            <Box bg="$white" borderRadius="$lg" p="$1">
              <Input>
                <InputField
                  placeholder="e.g., Full Stack Developer, Elementary Teacher"
                  value={formData.profession}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, profession: text }))}
                />
              </Input>
            </Box>
          </VStack>

          {/* Education Level */}
          <VStack space="md">
            <Text fontSize="$lg" fontWeight="$semibold" color="$textLight900">
              Education Level
            </Text>
            <VStack space="sm">
              {EDUCATION_LEVELS.map((level) => {
                const isSelected = formData.education_level === level.value;
                return (
                  <Pressable
                    key={level.value}
                    onPress={() => setFormData(prev => ({ ...prev, education_level: level.value }))}
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

          {/* University Name */}
          <VStack space="md">
            <VStack space="xs">
              <Text fontSize="$lg" fontWeight="$semibold" color="$textLight900">
                University Name
              </Text>
              <Text fontSize="$sm" color="$textLight600">
                Optional - where did you study?
              </Text>
            </VStack>
            <Box bg="$white" borderRadius="$lg" p="$1">
              <Input>
                <InputField
                  placeholder="e.g., Harvard University, MIT, Local University"
                  value={formData.university_name}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, university_name: text }))}
                />
              </Input>
            </Box>
          </VStack>

          {/* Income Range */}
          <VStack space="md">
            <Text fontSize="$lg" fontWeight="$semibold" color="$textLight900">
              Income Range
            </Text>
            <VStack space="sm">
              {INCOME_RANGES.map((range) => {
                const isSelected = formData.income_range === range.value;
                return (
                  <Pressable
                    key={range.value}
                    onPress={() => setFormData(prev => ({ ...prev, income_range: range.value }))}
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
                        <Text fontSize="$lg">{range.icon}</Text>
                        <Text
                          fontSize="$md"
                          fontWeight={isSelected ? '$semibold' : '$normal'}
                          color={isSelected ? '$primary700' : '$textLight700'}
                        >
                          {range.label}
                        </Text>
                      </HStack>
                    </Box>
                  </Pressable>
                );
              })}
            </VStack>
          </VStack>
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
} 