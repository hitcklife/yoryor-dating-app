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
  Spinner,
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
  Button,
  ButtonText,
} from "@gluestack-ui/themed";
import { Ionicons } from "@expo/vector-icons";
import { useNotificationSettings } from "@/services/settings-service";

export default function NotificationsScreen() {
  const router = useRouter();
  const { settings, loading, error, updateSettings } = useNotificationSettings();
  const [showErrorDialog, setShowErrorDialog] = useState(false);

  const handleToggleNotification = async (key: string, value: boolean) => {
    try {
      const result = await updateSettings({ [key]: value });
      
      if (!result.success) {
        setShowErrorDialog(true);
      }
    } catch (error) {
      console.error('Error updating notification setting:', error);
      setShowErrorDialog(true);
    }
  };

  const NotificationItem = ({ 
    title, 
    description, 
    value, 
    settingKey
  }: { 
    title: string;
    description: string;
    value: boolean;
    settingKey: string;
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
        onValueChange={(newValue) => handleToggleNotification(settingKey, newValue)}
        size="md"
      />
    </HStack>
  );

  if (loading) {
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
              Notifications
            </Text>
          </HStack>
        </HStack>

        <Box flex={1} justifyContent="center" alignItems="center">
          <Spinner size="large" color="$primary600" />
          <Text fontSize="$md" color="$primary700" mt="$4">
            Loading notification settings...
          </Text>
        </Box>
      </SafeAreaView>
    );
  }

  if (error || !settings) {
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
              Notifications
            </Text>
          </HStack>
        </HStack>

        <Box flex={1} justifyContent="center" alignItems="center" px="$4">
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <Text fontSize="$lg" color="$error600" mt="$4" textAlign="center">
            Failed to Load Settings
          </Text>
          <Text fontSize="$md" color="$primary700" mt="$2" textAlign="center">
            {error || 'Unable to load notification settings'}
          </Text>
          <Button
            size="md"
            bg="$primary600"
            mt="$4"
            onPress={() => window.location.reload()}
          >
            <ButtonText color="$white">Retry</ButtonText>
          </Button>
        </Box>
      </SafeAreaView>
    );
  }

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
            Notifications
          </Text>
        </HStack>
      </HStack>

      <ScrollView
        flex={1}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <VStack space="lg" px="$4" py="$4">
          {/* Dating Activity */}
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
              Dating Activity
            </Text>
            
            <NotificationItem
              title="New Matches"
              description="Get notified when someone matches with you"
              value={settings.notify_matches}
              settingKey="notify_matches"
            />
            <Divider bg="$backgroundLight200" />
            
            <NotificationItem
              title="Messages"
              description="Get notified when you receive new messages"
              value={settings.notify_messages}
              settingKey="notify_messages"
            />
            <Divider bg="$backgroundLight200" />
            
            <NotificationItem
              title="Likes"
              description="Get notified when someone likes your profile"
              value={settings.notify_likes}
              settingKey="notify_likes"
            />
            <Divider bg="$backgroundLight200" />
            
            <NotificationItem
              title="Super Likes"
              description="Get notified when someone super likes you"
              value={settings.notify_super_likes}
              settingKey="notify_super_likes"
            />
            <Divider bg="$backgroundLight200" />
            
            <NotificationItem
              title="Profile Visitors"
              description="Get notified when someone views your profile"
              value={settings.notify_visitors}
              settingKey="notify_visitors"
            />
          </Box>

          {/* App Notifications */}
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
              App Notifications
            </Text>
            
            <NotificationItem
              title="New Features"
              description="Get notified about new app features and updates"
              value={settings.notify_new_features}
              settingKey="notify_new_features"
            />
            <Divider bg="$backgroundLight200" />
            
            <NotificationItem
              title="Marketing"
              description="Get notified about promotions and special offers"
              value={settings.notify_marketing}
              settingKey="notify_marketing"
            />
          </Box>

          {/* Notification Methods */}
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
              Notification Methods
            </Text>
            
            <NotificationItem
              title="Push Notifications"
              description="Receive notifications on your device"
              value={settings.push_notifications_enabled}
              settingKey="push_notifications_enabled"
            />
            <Divider bg="$backgroundLight200" />
            
            <NotificationItem
              title="Email Notifications"
              description="Receive notifications via email"
              value={settings.email_notifications_enabled}
              settingKey="email_notifications_enabled"
            />
            <Divider bg="$backgroundLight200" />
            
            <NotificationItem
              title="In-App Sounds"
              description="Play sounds for notifications within the app"
              value={settings.in_app_sounds_enabled}
              settingKey="in_app_sounds_enabled"
            />
            <Divider bg="$backgroundLight200" />
            
            <NotificationItem
              title="Vibration"
              description="Vibrate for notifications"
              value={settings.vibration_enabled}
              settingKey="vibration_enabled"
            />
          </Box>

          {/* Quiet Hours */}
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
              Quiet Hours
            </Text>
            
            <Pressable
              onPress={() => {
                // Handle quiet hours setup
                console.log("Setup quiet hours");
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
                    Set Quiet Hours
                  </Text>
                  <Text
                    fontSize="$sm"
                    color="$primary700"
                  >
                    Turn off notifications during specific hours
                  </Text>
                </Box>
                <Ionicons name="chevron-forward" size={20} color="#5B1994" />
              </HStack>
            </Pressable>
          </Box>
        </VStack>
      </ScrollView>

      {/* Error Dialog */}
      <AlertDialog isOpen={showErrorDialog} onClose={() => setShowErrorDialog(false)}>
        <AlertDialogBackdrop />
        <AlertDialogContent>
          <AlertDialogHeader>
            <Text fontSize="$lg" fontWeight="$semibold" color="$error600">
              Update Failed
            </Text>
          </AlertDialogHeader>
          <AlertDialogBody>
            <Text fontSize="$md" color="$primary700">
              Failed to update notification settings. Please try again.
            </Text>
          </AlertDialogBody>
          <AlertDialogFooter>
            <Button
              size="sm"
              bg="$primary600"
              onPress={() => setShowErrorDialog(false)}
            >
              <ButtonText color="$white">OK</ButtonText>
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SafeAreaView>
  );
} 