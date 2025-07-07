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
  Select,
  SelectTrigger,
  SelectInput,
  SelectPortal,
  SelectBackdrop,
  SelectContent,
  SelectItem,
  ChevronDownIcon,
} from "@gluestack-ui/themed";
import { Ionicons } from "@expo/vector-icons";

export default function PrivacyScreen() {
  const router = useRouter();
  
  // Privacy settings state
  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: true,
    showOnline: true,
    showDistance: true,
    showAge: true,
    showLastActive: false,
    allowMessagesFromMatches: true,
    allowMessagesFromAll: false,
    showReadReceipts: true,
    allowScreenshots: false,
    hideFromContacts: false,
    incognito: false,
  });

  const [profileVisibilityTo, setProfileVisibilityTo] = useState("everyone");
  const [ageRange, setAgeRange] = useState("exact");

  const togglePrivacySetting = (key: keyof typeof privacySettings) => {
    setPrivacySettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const PrivacyItem = ({ 
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

  const SelectItem = ({ 
    title, 
    description, 
    value, 
    onPress 
  }: { 
    title: string;
    description: string;
    value: string;
    onPress: () => void;
  }) => (
    <Pressable onPress={onPress}>
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
        <HStack alignItems="center" space="sm">
          <Text
            fontSize="$sm"
            color="$primary600"
            fontWeight="$medium"
            textTransform="capitalize"
          >
            {value}
          </Text>
          <Ionicons name="chevron-forward" size={16} color="#5B1994" />
        </HStack>
      </HStack>
    </Pressable>
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
            Privacy
          </Text>
        </HStack>
      </HStack>

      <ScrollView
        flex={1}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <VStack space="lg" px="$4" py="$4">
          {/* Profile Visibility */}
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
              Profile Visibility
            </Text>
            
            <PrivacyItem
              title="Show Profile"
              description="Allow others to see your profile"
              value={privacySettings.profileVisibility}
              onToggle={() => togglePrivacySetting('profileVisibility')}
            />
            <Divider bg="$backgroundLight200" />
            
            <SelectItem
              title="Visible To"
              description="Who can see your profile"
              value={profileVisibilityTo}
              onPress={() => {
                // Handle profile visibility selection
                console.log("Profile visibility options");
              }}
            />
            <Divider bg="$backgroundLight200" />
            
            <PrivacyItem
              title="Show Online Status"
              description="Let others know when you're online"
              value={privacySettings.showOnline}
              onToggle={() => togglePrivacySetting('showOnline')}
            />
            <Divider bg="$backgroundLight200" />
            
            <PrivacyItem
              title="Show Distance"
              description="Show your distance to other users"
              value={privacySettings.showDistance}
              onToggle={() => togglePrivacySetting('showDistance')}
            />
            <Divider bg="$backgroundLight200" />
            
            <PrivacyItem
              title="Show Age"
              description="Display your age on your profile"
              value={privacySettings.showAge}
              onToggle={() => togglePrivacySetting('showAge')}
            />
            <Divider bg="$backgroundLight200" />
            
            <SelectItem
              title="Age Display"
              description="How to show your age"
              value={ageRange}
              onPress={() => {
                // Handle age range selection
                console.log("Age range options");
              }}
            />
            <Divider bg="$backgroundLight200" />
            
            <PrivacyItem
              title="Show Last Active"
              description="Show when you were last active"
              value={privacySettings.showLastActive}
              onToggle={() => togglePrivacySetting('showLastActive')}
            />
          </Box>

          {/* Messaging Privacy */}
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
              Messaging Privacy
            </Text>
            
            <PrivacyItem
              title="Messages from Matches"
              description="Allow messages from people you've matched with"
              value={privacySettings.allowMessagesFromMatches}
              onToggle={() => togglePrivacySetting('allowMessagesFromMatches')}
            />
            <Divider bg="$backgroundLight200" />
            
            <PrivacyItem
              title="Messages from Everyone"
              description="Allow messages from all users (not recommended)"
              value={privacySettings.allowMessagesFromAll}
              onToggle={() => togglePrivacySetting('allowMessagesFromAll')}
            />
            <Divider bg="$backgroundLight200" />
            
            <PrivacyItem
              title="Read Receipts"
              description="Show when you've read messages"
              value={privacySettings.showReadReceipts}
              onToggle={() => togglePrivacySetting('showReadReceipts')}
            />
          </Box>

          {/* Safety & Security */}
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
              Safety & Security
            </Text>
            
            <PrivacyItem
              title="Prevent Screenshots"
              description="Disable screenshots of your profile and chats"
              value={privacySettings.allowScreenshots}
              onToggle={() => togglePrivacySetting('allowScreenshots')}
            />
            <Divider bg="$backgroundLight200" />
            
            <PrivacyItem
              title="Hide from Contacts"
              description="Don't show your profile to people in your contacts"
              value={privacySettings.hideFromContacts}
              onToggle={() => togglePrivacySetting('hideFromContacts')}
            />
            <Divider bg="$backgroundLight200" />
            
            <PrivacyItem
              title="Incognito Mode"
              description="Browse profiles without being seen"
              value={privacySettings.incognito}
              onToggle={() => togglePrivacySetting('incognito')}
            />
          </Box>

          {/* Advanced Privacy */}
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
              Advanced Privacy
            </Text>
            
            <Pressable
              onPress={() => {
                router.push("/settings/blocked-users" as any);
              }}
            >
              <HStack
                alignItems="center"
                justifyContent="space-between"
                px="$4"
                py="$3"
              >
                <Box flex={1}>
                  <Text
                    fontSize="$md"
                    color="$primary900"
                    fontWeight="$medium"
                    mb="$1"
                  >
                    Blocked Users
                  </Text>
                  <Text
                    fontSize="$sm"
                    color="$primary700"
                  >
                    Manage users you've blocked
                  </Text>
                </Box>
                <Ionicons name="chevron-forward" size={20} color="#5B1994" />
              </HStack>
            </Pressable>
            
            <Divider bg="$backgroundLight200" />
            
            <Pressable
              onPress={() => {
                router.push("/settings/data-privacy" as any);
              }}
            >
              <HStack
                alignItems="center"
                justifyContent="space-between"
                px="$4"
                py="$3"
              >
                <Box flex={1}>
                  <Text
                    fontSize="$md"
                    color="$primary900"
                    fontWeight="$medium"
                    mb="$1"
                  >
                    Data & Privacy
                  </Text>
                  <Text
                    fontSize="$sm"
                    color="$primary700"
                  >
                    Manage your data and privacy settings
                  </Text>
                </Box>
                <Ionicons name="chevron-forward" size={20} color="#5B1994" />
              </HStack>
            </Pressable>
          </Box>
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
} 