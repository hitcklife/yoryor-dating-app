import React from 'react';
import { useEffect } from "react";
import { Tabs, useRouter } from 'expo-router';
import { ActivityIndicator, BackHandler } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from "@/context/auth-context";
import {
  Box,
  Text,
  Pressable,
  HStack
} from '@gluestack-ui/themed';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { useFocusEffect } from '@react-navigation/native';

// Tab Bar Icon Component with circular outline for selected state
function TabBarIcon(props: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  focused?: boolean;
}) {
  if (props.focused) {
    return (
      <Box
        alignItems="center"
        justifyContent="center"
        width={50}
        height={50}
        borderRadius="$full"
        backgroundColor="#DD88CF" // Changed to the requested color
        shadowColor="$primary400"
        shadowOffset={{ width: 0, height: 3 }}
        shadowOpacity={0.3}
        shadowRadius={6}
        elevation={6}
      >
        <Ionicons
          size={26}
          color="white" // White icon
          name={props.name}
        />
      </Box>
    );
  }

  return (
    <Box alignItems="center" justifyContent="center">
      <Ionicons
        size={26}
        color={props.color}
        name={props.name}
      />
    </Box>
  );
}

export default function TabLayout() {
  const { isAuthenticated, isRegistrationCompleted, isLoading, refreshUserData } = useAuth();
  const colorScheme = useColorScheme();
  const router = useRouter();

  // Prevent back navigation when user is authenticated and in tabs
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        if (isAuthenticated && isRegistrationCompleted) {
          // Don't allow going back to login/registration when in main app
          return true;
        }
        return false;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [isAuthenticated, isRegistrationCompleted])
  );

  useEffect(() => {
    // Only redirect after loading is complete
    if (!isLoading) {
      if (!isAuthenticated) {
        // Clear navigation stack and go to login
        router.replace("/login");
      } else if (!isRegistrationCompleted) {
        // Clear navigation stack and go to registration
        router.replace("/registration");
      } else {
        // User is fully authenticated and registered
        // Refresh user data to ensure we have latest info
        refreshUserData().catch(error => {
          console.error('Failed to refresh user data:', error);
        });
      }
    }
  }, [isAuthenticated, isRegistrationCompleted, isLoading, refreshUserData]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center" bg="$backgroundLight0">
        <ActivityIndicator size="large" color="#4B164C" />
        <Text mt="$4" color="$primary700" fontSize="$lg">
          Loading...
        </Text>
      </Box>
    );
  }

  // Don't render tabs if not authenticated or registration not completed
  if (!isAuthenticated || !isRegistrationCompleted) return null;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#DD88CF',
        tabBarInactiveTintColor: '#A58AA5',
        tabBarStyle: {
          position: 'absolute',
          bottom: 30,
          left: 50, // More space from left
          right: 50, // More space from right
          backgroundColor: '#FFFFFF', // White background
          borderRadius: 35,
          height: 70,
          paddingTop: 5,
          paddingBottom: 10,
          paddingHorizontal: 25, // More internal padding
          shadowColor: '#4B164C',
          shadowOffset: {
            width: 0,
            height: 12,
          },
          shadowOpacity: 0.2,
          shadowRadius: 16,
          elevation: 12,
          borderTopWidth: 0,
        },
        tabBarItemStyle: {
          paddingVertical: 10,
          paddingHorizontal: 5, // Additional horizontal padding for each tab
          borderRadius: 25,
        },
        tabBarShowLabel: false, // Remove text labels
        headerShown: false, // Removed headers completely
      }}>

      {/* Home Tab - First */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name={focused ? "home" : "home-outline"}
              color={color}
              focused={focused}
            />
          ),
        }}
      />

      {/* Likes Tab - Second */}
      <Tabs.Screen
        name="likes"
        options={{
          title: 'Likes',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name={focused ? "heart" : "heart-outline"}
              color={color}
              focused={focused}
            />
          ),
        }}
      />

      {/* Chats Tab - Third */}
      <Tabs.Screen
        name="chats"
        options={{
          title: 'Chats',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name={focused ? "chatbubbles" : "chatbubbles-outline"}
              color={color}
              focused={focused}
            />
          ),
        }}
      />

      {/* Profile Tab - Fourth */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name={focused ? "person" : "person-outline"}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  );
}
