import React, { useState } from 'react';
import { useEffect } from "react";
import { Tabs, useRouter } from 'expo-router';
import { ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from "@/context/auth-context";
import sqliteService from "@/services/sqlite-service";
import {
  Box,
  Text,
  Pressable,
  HStack
} from '@gluestack-ui/themed';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';

// Tab Bar Icon Component with circular outline for selected state
function TabBarIcon(props: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  focused?: boolean;
  badgeCount?: number;
}) {
  if (props.focused === true) {
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
          color="white"
          name={typeof props.name === 'string' ? props.name : "home"}
        />
      </Box>
    );
  }

  return (
    <Box alignItems="center" justifyContent="center" position="relative">
      <Ionicons
        size={26}
        color={typeof props.color === 'string' ? props.color : "#000000"}
        name={typeof props.name === 'string' ? props.name : "home"}
      />
      {props.badgeCount && typeof props.badgeCount === 'number' && props.badgeCount > 0 && (
        <Box
          position="absolute"
          top={-5}
          right={-8}
          backgroundColor="#FF4444"
          borderRadius="$full"
          minWidth={18}
          height={18}
          alignItems="center"
          justifyContent="center"
          paddingHorizontal={4}
        >
          <Text
            color="white"
            fontSize={10}
            fontWeight="$bold"
            textAlign="center"
          >
            {props.badgeCount > 99 ? '99+' : String(props.badgeCount)}
          </Text>
        </Box>
      )}
    </Box>
  );
}

export default function TabLayout() {
  const { isAuthenticated, isRegistrationCompleted, isLoading, getLocalNotificationCounts, user } = useAuth();
  const colorScheme = useColorScheme();
  const router = useRouter();
  const [notificationCounts, setNotificationCounts] = useState({ unread_messages_count: 0, new_likes_count: 0 });

  // Fetch notification counts from database
  useEffect(() => {
    const fetchNotificationCounts = async () => {
      if (isAuthenticated && isRegistrationCompleted) {
        try {
          const counts = await getLocalNotificationCounts();
          setNotificationCounts(counts);
          
          // Add some test data if counts are 0 (for demonstration)
          if (counts.unread_messages_count === 0 && counts.new_likes_count === 0 && user?.id) {
            try {
              await sqliteService.updateUnreadMessagesCount(user.id, 3);
              await sqliteService.updateNewLikesCount(user.id, 12);
              // Fetch updated counts
              const updatedCounts = await getLocalNotificationCounts();
              setNotificationCounts(updatedCounts);
            } catch (error) {
              console.error('Error adding test notification counts:', error);
            }
          }
        } catch (error) {
          console.error('Error fetching notification counts:', error);
        }
      }
    };

    fetchNotificationCounts();
  }, [isAuthenticated, isRegistrationCompleted, getLocalNotificationCounts, user?.id]);

  useEffect(() => {
    // Only redirect after loading is complete
    if (!isLoading) {
      if (!isAuthenticated) {
        router.replace("/login");
      } else if (!isRegistrationCompleted) {
        router.replace("/registration");
      }
    }
  }, [isAuthenticated, isRegistrationCompleted, isLoading]);

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
              color={typeof color === 'string' ? color : "#000000"}
              focused={focused === true}
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
              color={typeof color === 'string' ? color : "#000000"}
              focused={focused === true}
              badgeCount={notificationCounts.new_likes_count}
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
              color={typeof color === 'string' ? color : "#000000"}
              focused={focused === true}
              badgeCount={notificationCounts.unread_messages_count}
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
              color={typeof color === 'string' ? color : "#000000"}
              focused={focused === true}
            />
          ),
        }}
      />
    </Tabs>
  );
}
