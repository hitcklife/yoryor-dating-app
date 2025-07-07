import React, { useState } from "react";
import { useRouter } from "expo-router";
import {
  Box,
  VStack,
  HStack,
  Text,
  ScrollView,
  Pressable,
  SafeAreaView,
  Switch,
  Divider,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Button,
  ButtonText,
  Checkbox,
  CheckboxIndicator,
  CheckboxIcon,
  CheckboxLabel,
  CheckIcon,
} from "@gluestack-ui/themed";
import { Ionicons } from "@expo/vector-icons";

export default function DiscoverySettingsScreen() {
  const router = useRouter();
  
  const [discoverySettings, setDiscoverySettings] = useState({
    showMe: true,
    globalMode: false,
    recentlyActiveOnly: true,
    verifiedProfilesOnly: false,
    hideAlreadySeenProfiles: true,
    smartPhotos: true,
  });

  const [ageRange, setAgeRange] = useState([22, 35]);
  const [maxDistance, setMaxDistance] = useState(25);
  const [lookingFor, setLookingFor] = useState<string[]>(['serious-relationship', 'casual-dating']);
  const [interests, setInterests] = useState<string[]>(['music', 'travel', 'fitness']);

  const lookingForOptions = [
    { id: 'serious-relationship', label: 'Serious Relationship' },
    { id: 'casual-dating', label: 'Casual Dating' },
    { id: 'friendship', label: 'Friendship' },
    { id: 'networking', label: 'Networking' },
    { id: 'something-casual', label: 'Something Casual' },
    { id: 'not-sure', label: 'Not Sure Yet' },
  ];

  const interestOptions = [
    { id: 'music', label: 'Music' },
    { id: 'travel', label: 'Travel' },
    { id: 'fitness', label: 'Fitness' },
    { id: 'movies', label: 'Movies' },
    { id: 'food', label: 'Food' },
    { id: 'books', label: 'Books' },
    { id: 'art', label: 'Art' },
    { id: 'sports', label: 'Sports' },
    { id: 'technology', label: 'Technology' },
    { id: 'nature', label: 'Nature' },
    { id: 'photography', label: 'Photography' },
    { id: 'gaming', label: 'Gaming' },
  ];

  const toggleDiscoverySetting = (key: keyof typeof discoverySettings) => {
    setDiscoverySettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const toggleLookingFor = (value: string) => {
    setLookingFor(prev => 
      prev.includes(value) 
        ? prev.filter(item => item !== value)
        : [...prev, value]
    );
  };

  const toggleInterest = (value: string) => {
    setInterests(prev => 
      prev.includes(value) 
        ? prev.filter(item => item !== value)
        : [...prev, value]
    );
  };

  const handleSaveSettings = () => {
    // Here you would typically save settings to your backend
    console.log('Saving discovery settings:', {
      discoverySettings,
      ageRange,
      maxDistance,
      lookingFor,
      interests
    });
    
    // Show success message or navigate back
    router.back();
  };

  const SettingItem = ({ 
    title, 
    description, 
    value, 
    onToggle 
  }: { 
    title: string;
    description: string;
    value: boolean;
    onToggle: () => void;
  }) => (
    <HStack
      alignItems="center"
      justifyContent="space-between"
      py="$3"
      px="$4"
    >
      <Box flex={1} mr="$3">
        <Text
          fontSize="$md"
          color="$primary900"
          fontWeight="$medium"
          mb="$1"
        >
          {title}
        </Text>
        <Text
          fontSize="$sm"
          color="$primary700"
          lineHeight="$sm"
        >
          {description}
        </Text>
      </Box>
      <Switch
        value={value}
        onValueChange={onToggle}
        size="md"
      />
    </HStack>
  );

  return (
    <SafeAreaView flex={1} backgroundColor="#FDF7FD">
      {/* Header */}
      <HStack
        alignItems="center"
        justifyContent="space-between"
        px="$4"
        py="$3"
        bg="$white"
        borderBottomWidth="$1"
        borderBottomColor="$backgroundLight200"
      >
        <HStack alignItems="center" space="md">
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#5B1994" />
          </Pressable>
          <Text fontSize="$lg" fontWeight="$semibold" color="$primary900">
            Discovery Settings
          </Text>
        </HStack>
        <Pressable onPress={handleSaveSettings}>
          <Text fontSize="$md" color="$primary600" fontWeight="$medium">
            Save
          </Text>
        </Pressable>
      </HStack>

      <ScrollView
        flex={1}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <VStack space="lg" px="$4" py="$4">
          {/* Basic Discovery Settings */}
          <Box
            bg="$white"
            borderRadius="$xl"
            shadowColor="$backgroundLight300"
            shadowOffset={{ width: 0, height: 2 }}
            shadowOpacity={0.1}
            shadowRadius={4}
            elevation={3}
          >
            <Text
              fontSize="$lg"
              fontWeight="$semibold"
              color="$primary900"
              p="$4"
              pb="$2"
            >
              Discovery Settings
            </Text>
            
            <SettingItem
              title="Show Me on Discovery"
              description="Allow other users to discover your profile"
              value={discoverySettings.showMe}
              onToggle={() => toggleDiscoverySetting('showMe')}
            />
            <Divider bg="$backgroundLight200" />
            
            <SettingItem
              title="Global Mode"
              description="Discover people from around the world"
              value={discoverySettings.globalMode}
              onToggle={() => toggleDiscoverySetting('globalMode')}
            />
            <Divider bg="$backgroundLight200" />
            
            <SettingItem
              title="Recently Active Only"
              description="Only show profiles of users active in the last 7 days"
              value={discoverySettings.recentlyActiveOnly}
              onToggle={() => toggleDiscoverySetting('recentlyActiveOnly')}
            />
            <Divider bg="$backgroundLight200" />
            
            <SettingItem
              title="Verified Profiles Only"
              description="Only show verified profiles"
              value={discoverySettings.verifiedProfilesOnly}
              onToggle={() => toggleDiscoverySetting('verifiedProfilesOnly')}
            />
            <Divider bg="$backgroundLight200" />
            
            <SettingItem
              title="Hide Already Seen Profiles"
              description="Don't show profiles you've already swiped on"
              value={discoverySettings.hideAlreadySeenProfiles}
              onToggle={() => toggleDiscoverySetting('hideAlreadySeenProfiles')}
            />
            <Divider bg="$backgroundLight200" />
            
            <SettingItem
              title="Smart Photos"
              description="Automatically show your best photo first"
              value={discoverySettings.smartPhotos}
              onToggle={() => toggleDiscoverySetting('smartPhotos')}
            />
          </Box>

          {/* Age Range */}
          <Box
            bg="$white"
            borderRadius="$xl"
            shadowColor="$backgroundLight300"
            shadowOffset={{ width: 0, height: 2 }}
            shadowOpacity={0.1}
            shadowRadius={4}
            elevation={3}
            p="$4"
          >
            <Text
              fontSize="$lg"
              fontWeight="$semibold"
              color="$primary900"
              mb="$4"
            >
              Age Range
            </Text>
            
            <HStack alignItems="center" justifyContent="space-between" mb="$3">
              <Text fontSize="$md" color="$primary700">
                {ageRange[0]} - {ageRange[1]} years
              </Text>
              <Text fontSize="$sm" color="$primary600">
                {ageRange[1] - ageRange[0] + 1} years range
              </Text>
            </HStack>
            
            <Slider
              value={ageRange[0]}
              onChange={(value) => setAgeRange([value, ageRange[1]])}
              minValue={18}
              maxValue={65}
              step={1}
              size="md"
              orientation="horizontal"
              mb="$3"
            >
              <SliderTrack>
                <SliderFilledTrack />
              </SliderTrack>
              <SliderThumb />
            </Slider>
            
            <Slider
              value={ageRange[1]}
              onChange={(value) => setAgeRange([ageRange[0], value])}
              minValue={18}
              maxValue={65}
              step={1}
              size="md"
              orientation="horizontal"
            >
              <SliderTrack>
                <SliderFilledTrack />
              </SliderTrack>
              <SliderThumb />
            </Slider>
          </Box>

          {/* Maximum Distance */}
          <Box
            bg="$white"
            borderRadius="$xl"
            shadowColor="$backgroundLight300"
            shadowOffset={{ width: 0, height: 2 }}
            shadowOpacity={0.1}
            shadowRadius={4}
            elevation={3}
            p="$4"
          >
            <Text
              fontSize="$lg"
              fontWeight="$semibold"
              color="$primary900"
              mb="$4"
            >
              Maximum Distance
            </Text>
            
            <HStack alignItems="center" justifyContent="space-between" mb="$3">
              <Text fontSize="$md" color="$primary700">
                {maxDistance} {maxDistance === 1 ? 'mile' : 'miles'}
              </Text>
              <Text fontSize="$sm" color="$primary600">
                {maxDistance === 100 ? 'Max range' : 'Within range'}
              </Text>
            </HStack>
            
            <Slider
              value={maxDistance}
              onChange={setMaxDistance}
              minValue={1}
              maxValue={100}
              step={1}
              size="md"
              orientation="horizontal"
            >
              <SliderTrack>
                <SliderFilledTrack />
              </SliderTrack>
              <SliderThumb />
            </Slider>
          </Box>

          {/* Looking For */}
          <Box
            bg="$white"
            borderRadius="$xl"
            shadowColor="$backgroundLight300"
            shadowOffset={{ width: 0, height: 2 }}
            shadowOpacity={0.1}
            shadowRadius={4}
            elevation={3}
            p="$4"
          >
            <Text
              fontSize="$lg"
              fontWeight="$semibold"
              color="$primary900"
              mb="$4"
            >
              Looking For
            </Text>
            
            <Text
              fontSize="$sm"
              color="$primary700"
              mb="$3"
            >
              Select what you're looking for (you can choose multiple)
            </Text>
            
            <VStack space="sm">
              {lookingForOptions.map((option) => (
                <Checkbox
                  key={option.id}
                  value={option.id}
                  isChecked={lookingFor.includes(option.id)}
                  onChange={() => toggleLookingFor(option.id)}
                  size="md"
                >
                  <CheckboxIndicator mr="$2">
                    <CheckboxIcon as={CheckIcon} />
                  </CheckboxIndicator>
                  <CheckboxLabel fontSize="$md" color="$primary900">
                    {option.label}
                  </CheckboxLabel>
                </Checkbox>
              ))}
            </VStack>
          </Box>

          {/* Interests */}
          <Box
            bg="$white"
            borderRadius="$xl"
            shadowColor="$backgroundLight300"
            shadowOffset={{ width: 0, height: 2 }}
            shadowOpacity={0.1}
            shadowRadius={4}
            elevation={3}
            p="$4"
          >
            <Text
              fontSize="$lg"
              fontWeight="$semibold"
              color="$primary900"
              mb="$4"
            >
              Shared Interests
            </Text>
            
            <Text
              fontSize="$sm"
              color="$primary700"
              mb="$3"
            >
              Show people who share these interests with you
            </Text>
            
            <VStack space="sm">
              {interestOptions.map((option) => (
                <Checkbox
                  key={option.id}
                  value={option.id}
                  isChecked={interests.includes(option.id)}
                  onChange={() => toggleInterest(option.id)}
                  size="md"
                >
                  <CheckboxIndicator mr="$2">
                    <CheckboxIcon as={CheckIcon} />
                  </CheckboxIndicator>
                  <CheckboxLabel fontSize="$md" color="$primary900">
                    {option.label}
                  </CheckboxLabel>
                </Checkbox>
              ))}
            </VStack>
          </Box>

          {/* Save Button */}
          <Button
            size="lg"
            bg="$primary600"
            onPress={handleSaveSettings}
            mt="$4"
          >
            <ButtonText color="$white" fontSize="$md" fontWeight="$medium">
              Save Discovery Settings
            </ButtonText>
          </Button>
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
} 