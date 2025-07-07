import React, { useState } from "react";
import { useRouter } from "expo-router";
import { Linking, Alert } from "react-native";
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
} from "@gluestack-ui/themed";
import { Ionicons } from "@expo/vector-icons";

export default function DataPrivacyScreen() {
  const router = useRouter();
  
  const [dataSettings, setDataSettings] = useState({
    shareAnalytics: true,
    shareLocationData: true,
    personalizedAds: true,
    dataForImprovements: true,
    shareWithPartners: false,
  });

  const toggleDataSetting = (key: keyof typeof dataSettings) => {
    setDataSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleDownloadData = () => {
    Alert.alert(
      "Download My Data",
      "We'll prepare your data export and send it to your email address within 48 hours. The export will include your profile information, matches, messages, and activity data.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Request Download",
          onPress: () => {
            // Here you would typically call your API to initiate data download
            console.log("Data download requested");
            Alert.alert("Download Requested", "You'll receive an email with your data export within 48 hours.");
          }
        }
      ]
    );
  };

  const handleDeleteData = () => {
    Alert.alert(
      "Delete All Data",
      "This will permanently delete all your data including your profile, matches, messages, and account information. This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Final Confirmation",
              "Are you absolutely sure? This will permanently delete your account and all associated data.",
              [
                {
                  text: "Cancel",
                  style: "cancel"
                },
                {
                  text: "Delete Forever",
                  style: "destructive",
                  onPress: () => {
                    // Here you would typically call your API to delete all data
                    console.log("Data deletion requested");
                    Alert.alert("Data Deleted", "Your account and all data have been permanently deleted.");
                  }
                }
              ]
            );
          }
        }
      ]
    );
  };

  const openPrivacyPolicy = () => {
    Linking.openURL("https://yoryor.com/privacy-policy").catch(() => {
      Alert.alert("Error", "Unable to open privacy policy");
    });
  };

  const openTermsOfService = () => {
    Linking.openURL("https://yoryor.com/terms-of-service").catch(() => {
      Alert.alert("Error", "Unable to open terms of service");
    });
  };

  const openDataPolicy = () => {
    Linking.openURL("https://yoryor.com/data-policy").catch(() => {
      Alert.alert("Error", "Unable to open data policy");
    });
  };

  const DataSettingItem = ({ 
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
            Data & Privacy
          </Text>
        </HStack>
      </HStack>

      <ScrollView
        flex={1}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <VStack space="lg" px="$4" py="$4">
          {/* Data Usage */}
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
              Data Usage Preferences
            </Text>
            
            <DataSettingItem
              title="Analytics Data"
              description="Help us improve the app by sharing anonymous usage data"
              value={dataSettings.shareAnalytics}
              onToggle={() => toggleDataSetting('shareAnalytics')}
            />
            <Divider bg="$backgroundLight200" />
            
            <DataSettingItem
              title="Location Data"
              description="Share your location data to improve matching accuracy"
              value={dataSettings.shareLocationData}
              onToggle={() => toggleDataSetting('shareLocationData')}
            />
            <Divider bg="$backgroundLight200" />
            
            <DataSettingItem
              title="Personalized Ads"
              description="Show personalized ads based on your activity and preferences"
              value={dataSettings.personalizedAds}
              onToggle={() => toggleDataSetting('personalizedAds')}
            />
            <Divider bg="$backgroundLight200" />
            
            <DataSettingItem
              title="Data for Improvements"
              description="Use your data to improve our matching algorithms and features"
              value={dataSettings.dataForImprovements}
              onToggle={() => toggleDataSetting('dataForImprovements')}
            />
            <Divider bg="$backgroundLight200" />
            
            <DataSettingItem
              title="Share with Partners"
              description="Share data with trusted partners for better user experience"
              value={dataSettings.shareWithPartners}
              onToggle={() => toggleDataSetting('shareWithPartners')}
            />
          </Box>

          {/* Data Control */}
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
              Data Control
            </Text>
            
            <Pressable
              onPress={handleDownloadData}
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
                    Download My Data
                  </Text>
                  <Text
                    fontSize="$sm"
                    color="$primary700"
                  >
                    Get a copy of all your data in a downloadable format
                  </Text>
                </Box>
                <Ionicons name="download" size={20} color="#5B1994" />
              </HStack>
            </Pressable>
            
            <Divider bg="$backgroundLight200" />
            
            <Pressable
              onPress={() => {
                // Handle data correction
                console.log("Data correction requested");
                Alert.alert("Data Correction", "Please contact our support team to request data corrections or updates.");
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
                    Request Data Correction
                  </Text>
                  <Text
                    fontSize="$sm"
                    color="$primary700"
                  >
                    Request corrections to your personal data
                  </Text>
                </Box>
                <Ionicons name="create" size={20} color="#5B1994" />
              </HStack>
            </Pressable>
            
            <Divider bg="$backgroundLight200" />
            
            <Pressable
              onPress={handleDeleteData}
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
                    color="$error600"
                    fontWeight="$medium"
                    mb="$1"
                  >
                    Delete All My Data
                  </Text>
                  <Text
                    fontSize="$sm"
                    color="$error500"
                  >
                    Permanently delete all your data and account
                  </Text>
                </Box>
                <Ionicons name="trash" size={20} color="#DC2626" />
              </HStack>
            </Pressable>
          </Box>

          {/* Privacy Information */}
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
              Privacy Information
            </Text>
            
            <Pressable
              onPress={openPrivacyPolicy}
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
                    Privacy Policy
                  </Text>
                  <Text
                    fontSize="$sm"
                    color="$primary700"
                  >
                    Learn how we protect and use your data
                  </Text>
                </Box>
                <Ionicons name="open-outline" size={20} color="#5B1994" />
              </HStack>
            </Pressable>
            
            <Divider bg="$backgroundLight200" />
            
            <Pressable
              onPress={openDataPolicy}
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
                    Data Policy
                  </Text>
                  <Text
                    fontSize="$sm"
                    color="$primary700"
                  >
                    Understand our data collection and usage practices
                  </Text>
                </Box>
                <Ionicons name="open-outline" size={20} color="#5B1994" />
              </HStack>
            </Pressable>
            
            <Divider bg="$backgroundLight200" />
            
            <Pressable
              onPress={openTermsOfService}
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
                    Terms of Service
                  </Text>
                  <Text
                    fontSize="$sm"
                    color="$primary700"
                  >
                    Read our terms and conditions
                  </Text>
                </Box>
                <Ionicons name="open-outline" size={20} color="#5B1994" />
              </HStack>
            </Pressable>
          </Box>

          {/* Data Summary */}
          <Box
            bg="$primary50"
            borderRadius="$xl"
            p="$4"
            borderWidth="$1"
            borderColor="$primary200"
          >
            <HStack alignItems="center" space="md" mb="$3">
              <Ionicons name="shield-checkmark" size={24} color="#5B1994" />
              <Text
                fontSize="$md"
                fontWeight="$semibold"
                color="$primary900"
              >
                Your Data is Protected
              </Text>
            </HStack>
            
            <Text
              fontSize="$sm"
              color="$primary800"
              lineHeight="$md"
            >
              We use industry-standard encryption and security measures to protect your personal data. You have full control over your data and can modify these settings at any time.
            </Text>
          </Box>
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
} 