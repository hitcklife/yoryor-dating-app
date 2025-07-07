import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  ScrollView,
  SafeAreaView,
  Pressable,
  Center,
  Switch
} from '@gluestack-ui/themed';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Button } from '@/components/ui/button';

export default function PermissionsScreen() {
  const router = useRouter();
  
  const [pushNotifications, setPushNotifications] = useState(false);
  const [locationSharing, setLocationSharing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = async () => {
    setIsLoading(true);
    
    try {
      // TODO: Implement actual permission requests when packages are installed
      // For now, just navigate to main app
      
      // Future implementation will include:
      // - Push notification token collection
      // - Location coordinates collection  
      // - Sending data to backend endpoint
      
      router.replace('/(tabs)');
      
    } catch (error) {
      console.error('Error handling permissions:', error);
      router.replace('/(tabs)');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    router.replace('/(tabs)');
  };

  const PermissionCard = ({
    icon,
    iconFamily = 'Ionicons',
    title,
    description,
    benefits,
    isEnabled,
    onToggle,
    color
  }: {
    icon: string;
    iconFamily?: 'Ionicons' | 'MaterialIcons';
    title: string;
    description: string;
    benefits: string[];
    isEnabled: boolean;
    onToggle: () => void;
    color: string;
  }) => {
    const IconComponent = iconFamily === 'MaterialIcons' ? MaterialIcons : Ionicons;
    
    return (
      <Box
        bg="$backgroundLight0"
        borderRadius="$xl"
        p="$6"
        borderWidth="$2"
        borderColor={isEnabled ? "$primary500" : "$borderLight200"}
        shadowColor="$shadowColor"
        shadowOffset={{ width: 0, height: 2 }}
        shadowOpacity={0.1}
        shadowRadius={8}
        elevation={3}
        mb="$4"
      >
        <VStack space="md">
          <HStack justifyContent="space-between" alignItems="center">
            <HStack alignItems="center" space="md" flex={1}>
              <Box
                bg={isEnabled ? "$primary500" : "$primary100"}
                borderRadius="$full"
                p="$3"
              >
                <IconComponent
                  name={icon as any}
                  size={24}
                  color={isEnabled ? "white" : color}
                />
              </Box>
              <VStack flex={1}>
                <Text
                  size="lg"
                  fontWeight="$bold"
                  color="$primary700"
                  mb="$1"
                >
                  {title}
                </Text>
                <Text
                  size="sm"
                  color="$textLight600"
                  lineHeight="$sm"
                >
                  {description}
                </Text>
              </VStack>
            </HStack>
            <Switch
              size="md"
              value={isEnabled}
              onValueChange={onToggle}
              trackColor={{ false: '#d1d5db', true: '#8F3BBF' }}
              thumbColor={isEnabled ? '#ffffff' : '#f3f4f6'}
            />
          </HStack>

          {/* Benefits */}
          <VStack space="xs" mt="$2">
            {benefits.map((benefit, index) => (
              <HStack key={index} alignItems="center" space="sm">
                <Box
                  bg={isEnabled ? "$primary100" : "$borderLight100"}
                  borderRadius="$full"
                  p="$1"
                >
                  <Ionicons
                    name="checkmark"
                    size={12}
                    color={isEnabled ? "#8F3BBF" : "#9CA3AF"}
                  />
                </Box>
                <Text
                  size="xs"
                  color={isEnabled ? "$primary600" : "$textLight500"}
                  flex={1}
                >
                  {benefit}
                </Text>
              </HStack>
            ))}
          </VStack>
        </VStack>
      </Box>
    );
  };

  return (
    <SafeAreaView flex={1} bg="$primaryLight50">
      <StatusBar style="dark" />
      <Stack.Screen options={{
        title: '',
        headerShown: false
      }} />
      
      <ScrollView
        flex={1}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <Box flex={1} px="$6" py="$8">
          <VStack space="xl" flex={1}>
            {/* Header */}
            <Center mb="$6">
              <Box
                bg="$primary500"
                borderRadius="$full"
                p="$4"
                mb="$4"
              >
                <Ionicons name="shield-checkmark" size={32} color="white" />
              </Box>
              
              <Heading
                size="3xl"
                color="$primary700"
                textAlign="center"
                fontWeight="$bold"
                mb="$2"
              >
                Enhance Your Experience
              </Heading>
              <Text
                size="md"
                color="$textLight600"
                textAlign="center"
                maxWidth="$80"
                lineHeight="$md"
              >
                Enable these features to get the most out of YorYor Dating App
              </Text>
            </Center>

            {/* Push Notifications */}
            <PermissionCard
              icon="notifications"
              title="Push Notifications"
              description="Stay connected with instant messages and match notifications"
              benefits={[
                "Never miss a message from matches",
                "Get notified when someone likes you", 
                "Receive important app updates"
              ]}
              isEnabled={pushNotifications}
              onToggle={() => setPushNotifications(!pushNotifications)}
              color="#8F3BBF"
            />

            {/* Location */}
            <PermissionCard
              icon="location-on"
              iconFamily="MaterialIcons"
              title="Location Services"
              description="Find matches near you and discover local events"
              benefits={[
                "See matches in your area",
                "Distance-based matching",
                "Discover local dating events"
              ]}
              isEnabled={locationSharing}
              onToggle={() => setLocationSharing(!locationSharing)}
              color="#10B981"
            />

            {/* Privacy Notice */}
            <Box
              bg="$primary50"
              borderRadius="$lg"
              p="$4"
              borderWidth="$1"
              borderColor="$primary200"
              mt="$4"
            >
              <HStack space="sm" alignItems="flex-start">
                <Ionicons name="lock-closed" size={16} color="#8F3BBF" />
                <Text size="xs" color="$primary700" flex={1} lineHeight="$xs">
                  Your privacy is important to us. You can change these settings anytime in your profile settings. We never share your exact location or personal data with other users.
                </Text>
              </HStack>
            </Box>

            <Box flex={1} />

            {/* Action Buttons */}
            <VStack space="md" mt="$6">
              <Button
                title={isLoading ? "Setting up..." : "Get Started"}
                onPress={handleContinue}
                size="lg"
                variant="solid"
                isLoading={isLoading}
                isDisabled={isLoading}
              />

              <Pressable
                onPress={handleSkip}
                alignSelf="center"
                py="$3"
                px="$4"
                disabled={isLoading}
              >
                <Text
                  size="md"
                  color={isLoading ? "$textLight400" : "$primary600"}
                  fontWeight="$medium"
                  textDecorationLine="underline"
                >
                  Skip for now
                </Text>
              </Pressable>
            </VStack>
          </VStack>
        </Box>
      </ScrollView>
    </SafeAreaView>
  );
} 