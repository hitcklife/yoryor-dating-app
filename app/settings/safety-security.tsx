import React, { useState } from "react";
import { useRouter } from "expo-router";
import { Alert, Linking } from "react-native";
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
  Button,
  ButtonText,
  Badge,
  BadgeText,
} from "@gluestack-ui/themed";
import { Ionicons } from "@expo/vector-icons";

export default function SafetySecurityScreen() {
  const router = useRouter();
  
  const [securitySettings, setSecuritySettings] = useState({
    photoVerification: false,
    idVerification: false,
    phoneVerification: true,
    socialMediaVerification: false,
    twoFactorAuth: false,
    loginAlerts: true,
    blockScreenshots: false,
    hideFromFacebook: true,
    hideFromContacts: true,
    incognitoMode: false,
  });

  const toggleSecuritySetting = (key: keyof typeof securitySettings) => {
    setSecuritySettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handlePhotoVerification = () => {
    Alert.alert(
      "Photo Verification",
      "Take a series of selfies following our verification process to get a blue checkmark on your profile.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Start Verification",
          onPress: () => {
            // Here you would typically navigate to the photo verification flow
            console.log("Starting photo verification");
            Alert.alert("Verification Started", "Follow the on-screen instructions to complete your photo verification.");
          }
        }
      ]
    );
  };

  const handleIDVerification = () => {
    Alert.alert(
      "ID Verification",
      "Upload a photo of your government-issued ID to verify your identity. This helps keep our community safe.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Upload ID",
          onPress: () => {
            // Here you would typically navigate to the ID verification flow
            console.log("Starting ID verification");
            Alert.alert("ID Verification", "Please upload a clear photo of your government-issued ID.");
          }
        }
      ]
    );
  };

  const handleReportUser = () => {
    Alert.alert(
      "Report a User",
      "If you've encountered inappropriate behavior, harassment, or safety concerns, please report the user immediately.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Report User",
          onPress: () => {
            // Here you would typically navigate to the report flow
            console.log("Starting report flow");
            Alert.alert("Report Submitted", "Thank you for helping keep our community safe. We'll review your report promptly.");
          }
        }
      ]
    );
  };

  const openSafetyTips = () => {
    Linking.openURL("https://yoryor.com/safety-tips").catch(() => {
      Alert.alert("Error", "Unable to open safety tips");
    });
  };

  const SettingItem = ({ 
    title, 
    description, 
    value, 
    onToggle,
    badge
  }: { 
    title: string;
    description: string;
    value: boolean;
    onToggle: () => void;
    badge?: string;
  }) => (
    <HStack
      alignItems="center"
      justifyContent="space-between"
      py="$3"
      px="$4"
    >
      <Box flex={1} mr="$3">
        <HStack alignItems="center" mb="$1">
          <Text
            fontSize="$md"
            color="$primary900"
            fontWeight="$medium"
            mr="$2"
          >
            {title}
          </Text>
          {badge && (
            <Badge
              variant="solid"
              bg="$success500"
              size="sm"
            >
              <BadgeText color="$white" fontSize="$xs">
                {badge}
              </BadgeText>
            </Badge>
          )}
        </HStack>
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
            Safety & Security
          </Text>
        </HStack>
      </HStack>

      <ScrollView
        flex={1}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <VStack space="lg" px="$4" py="$4">
          {/* Safety Alert */}
          <Box
            bg="$warning50"
            borderRadius="$xl"
            p="$4"
            borderWidth="$1"
            borderColor="$warning200"
          >
            <HStack alignItems="center" space="md" mb="$3">
              <Ionicons name="shield-checkmark" size={24} color="#D69E2E" />
              <Text
                fontSize="$md"
                fontWeight="$semibold"
                color="$warning800"
              >
                Your Safety is Our Priority
              </Text>
            </HStack>
            
            <Text
              fontSize="$sm"
              color="$warning800"
              lineHeight="$md"
            >
              Use these settings to enhance your safety and security while using the app. Report any suspicious activity immediately.
            </Text>
          </Box>

          {/* Verification */}
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
              Profile Verification
            </Text>
            
            <Pressable
              onPress={handlePhotoVerification}
            >
              <HStack
                alignItems="center"
                justifyContent="space-between"
                px="$4"
                py="$3"
              >
                <Box flex={1}>
                  <HStack alignItems="center" mb="$1">
                    <Text
                      fontSize="$md"
                      color="$primary900"
                      fontWeight="$medium"
                      mr="$2"
                    >
                      Photo Verification
                    </Text>
                    {securitySettings.photoVerification && (
                      <Badge
                        variant="solid"
                        bg="$success500"
                        size="sm"
                      >
                        <BadgeText color="$white" fontSize="$xs">
                          ✓ Verified
                        </BadgeText>
                      </Badge>
                    )}
                  </HStack>
                  <Text
                    fontSize="$sm"
                    color="$primary700"
                  >
                    Get a blue checkmark by completing photo verification
                  </Text>
                </Box>
                <Ionicons name="chevron-forward" size={20} color="#5B1994" />
              </HStack>
            </Pressable>
            
            <Divider bg="$backgroundLight200" />
            
            <Pressable
              onPress={handleIDVerification}
            >
              <HStack
                alignItems="center"
                justifyContent="space-between"
                px="$4"
                py="$3"
              >
                <Box flex={1}>
                  <HStack alignItems="center" mb="$1">
                    <Text
                      fontSize="$md"
                      color="$primary900"
                      fontWeight="$medium"
                      mr="$2"
                    >
                      ID Verification
                    </Text>
                    {securitySettings.idVerification && (
                      <Badge
                        variant="solid"
                        bg="$success500"
                        size="sm"
                      >
                        <BadgeText color="$white" fontSize="$xs">
                          ✓ Verified
                        </BadgeText>
                      </Badge>
                    )}
                  </HStack>
                  <Text
                    fontSize="$sm"
                    color="$primary700"
                  >
                    Verify your identity with government-issued ID
                  </Text>
                </Box>
                <Ionicons name="chevron-forward" size={20} color="#5B1994" />
              </HStack>
            </Pressable>
            
            <Divider bg="$backgroundLight200" />
            
            <SettingItem
              title="Phone Verification"
              description="Verify your phone number"
              value={securitySettings.phoneVerification}
              onToggle={() => toggleSecuritySetting('phoneVerification')}
              badge={securitySettings.phoneVerification ? "✓ Verified" : undefined}
            />
            
            <Divider bg="$backgroundLight200" />
            
            <SettingItem
              title="Social Media Verification"
              description="Connect and verify your social media accounts"
              value={securitySettings.socialMediaVerification}
              onToggle={() => toggleSecuritySetting('socialMediaVerification')}
              badge={securitySettings.socialMediaVerification ? "✓ Verified" : undefined}
            />
          </Box>

          {/* Security Settings */}
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
              Security Settings
            </Text>
            
            <SettingItem
              title="Two-Factor Authentication"
              description="Add an extra layer of security to your account"
              value={securitySettings.twoFactorAuth}
              onToggle={() => toggleSecuritySetting('twoFactorAuth')}
            />
            
            <Divider bg="$backgroundLight200" />
            
            <SettingItem
              title="Login Alerts"
              description="Get notified when someone logs into your account"
              value={securitySettings.loginAlerts}
              onToggle={() => toggleSecuritySetting('loginAlerts')}
            />
            
            <Divider bg="$backgroundLight200" />
            
            <SettingItem
              title="Block Screenshots"
              description="Prevent others from taking screenshots of your profile"
              value={securitySettings.blockScreenshots}
              onToggle={() => toggleSecuritySetting('blockScreenshots')}
            />
          </Box>

          {/* Privacy Controls */}
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
              Privacy Controls
            </Text>
            
            <SettingItem
              title="Hide from Facebook Friends"
              description="Don't show your profile to Facebook friends"
              value={securitySettings.hideFromFacebook}
              onToggle={() => toggleSecuritySetting('hideFromFacebook')}
            />
            
            <Divider bg="$backgroundLight200" />
            
            <SettingItem
              title="Hide from Contacts"
              description="Don't show your profile to people in your contacts"
              value={securitySettings.hideFromContacts}
              onToggle={() => toggleSecuritySetting('hideFromContacts')}
            />
            
            <Divider bg="$backgroundLight200" />
            
            <SettingItem
              title="Incognito Mode"
              description="Browse profiles without being seen"
              value={securitySettings.incognitoMode}
              onToggle={() => toggleSecuritySetting('incognitoMode')}
            />
          </Box>

          {/* Safety Tools */}
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
              Safety Tools
            </Text>
            
            <Pressable
              onPress={handleReportUser}
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
                    Report a User
                  </Text>
                  <Text
                    fontSize="$sm"
                    color="$primary700"
                  >
                    Report inappropriate behavior or safety concerns
                  </Text>
                </Box>
                <Ionicons name="flag" size={20} color="#DC2626" />
              </HStack>
            </Pressable>
            
            <Divider bg="$backgroundLight200" />
            
            <Pressable
              onPress={openSafetyTips}
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
                    Safety Tips
                  </Text>
                  <Text
                    fontSize="$sm"
                    color="$primary700"
                  >
                    Learn how to stay safe while dating
                  </Text>
                </Box>
                <Ionicons name="open-outline" size={20} color="#5B1994" />
              </HStack>
            </Pressable>
            
            <Divider bg="$backgroundLight200" />
            
            <Pressable
              onPress={() => {
                // Navigate to emergency contacts
                console.log("Emergency contacts");
                Alert.alert("Emergency Contacts", "Set up emergency contacts who can be notified if you're in danger.");
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
                    Emergency Contacts
                  </Text>
                  <Text
                    fontSize="$sm"
                    color="$primary700"
                  >
                    Set up trusted contacts for emergencies
                  </Text>
                </Box>
                <Ionicons name="people" size={20} color="#5B1994" />
              </HStack>
            </Pressable>
          </Box>
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
} 