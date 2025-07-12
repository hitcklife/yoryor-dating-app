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
import Slider from '@react-native-community/slider';

const CHILDREN_PREFERENCES = [
  { value: 'yes', label: 'Yes', icon: '👶' },
  { value: 'no', label: 'No', icon: '🚫' },
  { value: 'maybe', label: 'Maybe', icon: '🤔' },
  { value: 'have_and_want_more', label: 'Have and want more', icon: '👨‍👩‍👧‍👦' },
  { value: 'have_and_dont_want_more', label: 'Have and don\'t want more', icon: '✋' }
];

const MARRIAGE_TIMELINE = [
  { value: 'within_1_year', label: 'Within 1 year', icon: '⏰' },
  { value: '1_2_years', label: '1-2 years', icon: '📅' },
  { value: '2_5_years', label: '2-5 years', icon: '🗓️' },
  { value: 'someday', label: 'Someday', icon: '🌅' },
  { value: 'never', label: 'Never', icon: '❌' }
];

const CHILDREN_COUNT = [1, 2, 3, 4, 5, 6];

export default function FamilyScreen() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    family_importance: 5, // 1-10 scale
    want_children: '',
    children_count: 2,
    marriage_timeline: '',
    lives_with_family: false,
    family_approval_important: false
  });

  const handleSave = async () => {
    setLoading(true);
    try {
      // Here you would save to your API
      // await apiClient.profile.updateFamily(formData);
      
      toast.show({
        placement: "top",
        render: ({ id }) => (
          <Toast nativeID={`toast-${id}`} action="success" variant="accent">
            <ToastTitle>Family values saved! +20 points</ToastTitle>
          </Toast>
        ),
      });
      
      router.back();
    } catch (error) {
      console.error('Error saving family data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFamilyImportanceLabel = (value: number) => {
    if (value <= 2) return 'Not important';
    if (value <= 4) return 'Somewhat important';
    if (value <= 6) return 'Moderately important';
    if (value <= 8) return 'Very important';
    return 'Extremely important';
  };

  const showChildrenCount = formData.want_children === 'yes' || formData.want_children === 'have_and_want_more';

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
          Family & Marriage
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
          {/* Family Importance Slider */}
          <VStack space="md">
            <VStack space="xs">
              <Text fontSize="$lg" fontWeight="$semibold" color="$textLight900">
                How important is family to you?
              </Text>
              <Text fontSize="$sm" color="$textLight600">
                {getFamilyImportanceLabel(formData.family_importance)}
              </Text>
            </VStack>
            <Box bg="$white" borderRadius="$lg" p="$4">
                             <Slider
                 style={{ width: '100%', height: 40 }}
                 minimumValue={1}
                 maximumValue={10}
                 value={formData.family_importance}
                 onValueChange={(value) => setFormData(prev => ({ ...prev, family_importance: Math.round(value) }))}
                 minimumTrackTintColor="#8F3BBF"
                 maximumTrackTintColor="#E5E7EB"
                 thumbTintColor="#8F3BBF"
                 step={1}
               />
              <HStack justifyContent="space-between" mt="$2">
                <Text fontSize="$xs" color="$textLight500">Not important</Text>
                <Text fontSize="$xs" color="$textLight500">Extremely important</Text>
              </HStack>
            </Box>
          </VStack>

          {/* Children Preferences */}
          <VStack space="md">
            <Text fontSize="$lg" fontWeight="$semibold" color="$textLight900">
              Do you want children?
            </Text>
            <VStack space="sm">
              {CHILDREN_PREFERENCES.map((pref) => {
                const isSelected = formData.want_children === pref.value;
                return (
                  <Pressable
                    key={pref.value}
                    onPress={() => setFormData(prev => ({ ...prev, want_children: pref.value }))}
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
                        <Text fontSize="$lg">{pref.icon}</Text>
                        <Text
                          fontSize="$md"
                          fontWeight={isSelected ? '$semibold' : '$normal'}
                          color={isSelected ? '$primary700' : '$textLight700'}
                        >
                          {pref.label}
                        </Text>
                      </HStack>
                    </Box>
                  </Pressable>
                );
              })}
            </VStack>
          </VStack>

          {/* Children Count */}
          {showChildrenCount && (
            <VStack space="md">
              <Text fontSize="$lg" fontWeight="$semibold" color="$textLight900">
                How many children would you like?
              </Text>
              <HStack flexWrap="wrap" space="sm">
                {CHILDREN_COUNT.map((count) => {
                  const isSelected = formData.children_count === count;
                  return (
                    <Pressable
                      key={count}
                      onPress={() => setFormData(prev => ({ ...prev, children_count: count }))}
                    >
                      <Box
                        bg={isSelected ? '$primary100' : '$white'}
                        borderWidth="$1"
                        borderColor={isSelected ? '$primary600' : '$borderLight300'}
                        borderRadius="$full"
                        px="$6"
                        py="$3"
                        mb="$2"
                      >
                        <Text
                          fontSize="$md"
                          fontWeight={isSelected ? '$semibold' : '$normal'}
                          color={isSelected ? '$primary700' : '$textLight700'}
                        >
                          {count}
                        </Text>
                      </Box>
                    </Pressable>
                  );
                })}
              </HStack>
            </VStack>
          )}

          {/* Marriage Timeline */}
          <VStack space="md">
            <Text fontSize="$lg" fontWeight="$semibold" color="$textLight900">
              When do you want to get married?
            </Text>
            <VStack space="sm">
              {MARRIAGE_TIMELINE.map((timeline) => {
                const isSelected = formData.marriage_timeline === timeline.value;
                return (
                  <Pressable
                    key={timeline.value}
                    onPress={() => setFormData(prev => ({ ...prev, marriage_timeline: timeline.value }))}
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
                        <Text fontSize="$lg">{timeline.icon}</Text>
                        <Text
                          fontSize="$md"
                          fontWeight={isSelected ? '$semibold' : '$normal'}
                          color={isSelected ? '$primary700' : '$textLight700'}
                        >
                          {timeline.label}
                        </Text>
                      </HStack>
                    </Box>
                  </Pressable>
                );
              })}
            </VStack>
          </VStack>

          {/* Living with Family Toggle */}
          <VStack space="md">
            <Text fontSize="$lg" fontWeight="$semibold" color="$textLight900">
              Living Situation
            </Text>
            <Box bg="$white" borderRadius="$lg" p="$4">
              <HStack justifyContent="space-between" alignItems="center">
                <VStack flex={1}>
                  <Text fontSize="$md" fontWeight="$medium" color="$textLight900">
                    Do you live with your family?
                  </Text>
                  <Text fontSize="$sm" color="$textLight600">
                    Living with parents or extended family
                  </Text>
                </VStack>
                <Switch
                  value={formData.lives_with_family}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, lives_with_family: value }))}
                  trackColor={{ false: '#E5E7EB', true: '#8F3BBF' }}
                  thumbColor={formData.lives_with_family ? '#FFFFFF' : '#FFFFFF'}
                />
              </HStack>
            </Box>
          </VStack>

          {/* Family Approval Toggle */}
          <VStack space="md">
            <Box bg="$white" borderRadius="$lg" p="$4">
              <HStack justifyContent="space-between" alignItems="center">
                <VStack flex={1}>
                  <Text fontSize="$md" fontWeight="$medium" color="$textLight900">
                    Is family approval important?
                  </Text>
                  <Text fontSize="$sm" color="$textLight600">
                    For relationships and marriage decisions
                  </Text>
                </VStack>
                <Switch
                  value={formData.family_approval_important}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, family_approval_important: value }))}
                  trackColor={{ false: '#E5E7EB', true: '#8F3BBF' }}
                  thumbColor={formData.family_approval_important ? '#FFFFFF' : '#FFFFFF'}
                />
              </HStack>
            </Box>
          </VStack>
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
} 