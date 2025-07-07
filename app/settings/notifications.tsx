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
} from "@gluestack-ui/themed";
import { Ionicons } from "@expo/vector-icons";

export default function NotificationsScreen() {
  const router = useRouter();
  
  // Notification preferences state
  const [notifications, setNotifications] = useState({
    matches: true,
    messages: true,
    likes: true,
    superLikes: true,
    visitors: false,
    newFeatures: true,
    marketing: false,
    pushNotifications: true,
    emailNotifications: true,
    inAppSounds: true,
    vibration: true,
  });

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const NotificationItem = ({ 
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
              value={notifications.matches}
              onToggle={() => toggleNotification('matches')}
            />
            <Divider bg="$backgroundLight200" />
            
            <NotificationItem
              title="Messages"
              description="Get notified when you receive new messages"
              value={notifications.messages}
              onToggle={() => toggleNotification('messages')}
            />
            <Divider bg="$backgroundLight200" />
            
            <NotificationItem
              title="Likes"
              description="Get notified when someone likes your profile"
              value={notifications.likes}
              onToggle={() => toggleNotification('likes')}
            />
            <Divider bg="$backgroundLight200" />
            
            <NotificationItem
              title="Super Likes"
              description="Get notified when someone super likes you"
              value={notifications.superLikes}
              onToggle={() => toggleNotification('superLikes')}
            />
            <Divider bg="$backgroundLight200" />
            
            <NotificationItem
              title="Profile Visitors"
              description="Get notified when someone views your profile"
              value={notifications.visitors}
              onToggle={() => toggleNotification('visitors')}
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
              value={notifications.newFeatures}
              onToggle={() => toggleNotification('newFeatures')}
            />
            <Divider bg="$backgroundLight200" />
            
            <NotificationItem
              title="Marketing"
              description="Get notified about promotions and special offers"
              value={notifications.marketing}
              onToggle={() => toggleNotification('marketing')}
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
              value={notifications.pushNotifications}
              onToggle={() => toggleNotification('pushNotifications')}
            />
            <Divider bg="$backgroundLight200" />
            
            <NotificationItem
              title="Email Notifications"
              description="Receive notifications via email"
              value={notifications.emailNotifications}
              onToggle={() => toggleNotification('emailNotifications')}
            />
            <Divider bg="$backgroundLight200" />
            
            <NotificationItem
              title="In-App Sounds"
              description="Play sounds for notifications within the app"
              value={notifications.inAppSounds}
              onToggle={() => toggleNotification('inAppSounds')}
            />
            <Divider bg="$backgroundLight200" />
            
            <NotificationItem
              title="Vibration"
              description="Vibrate for notifications"
              value={notifications.vibration}
              onToggle={() => toggleNotification('vibration')}
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
    </SafeAreaView>
  );
} 