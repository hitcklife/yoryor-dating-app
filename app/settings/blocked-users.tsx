import React, { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { Alert } from "react-native";
import {
  Box,
  VStack,
  HStack,
  Text,
  ScrollView,
  Pressable,
  SafeAreaView,
  Avatar,
  AvatarImage,
  AvatarFallbackText,
  Button,
  ButtonText,
  Divider,
  Spinner,
} from "@gluestack-ui/themed";
import { Ionicons } from "@expo/vector-icons";

interface BlockedUser {
  id: string;
  name: string;
  age: number;
  profilePhoto?: string;
  blockedDate: string;
  reason?: string;
}

export default function BlockedUsersScreen() {
  const router = useRouter();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock data - in a real app, this would come from your API
  useEffect(() => {
    const fetchBlockedUsers = async () => {
      setLoading(true);
      // Simulate API call
      setTimeout(() => {
        setBlockedUsers([
          {
            id: "1",
            name: "John Doe",
            age: 28,
            profilePhoto: "https://via.placeholder.com/100x100?text=JD",
            blockedDate: "2024-01-15T10:30:00Z",
            reason: "Inappropriate behavior"
          },
          {
            id: "2",
            name: "Jane Smith",
            age: 25,
            blockedDate: "2024-01-10T14:20:00Z",
            reason: "Spam messages"
          },
          {
            id: "3",
            name: "Mike Johnson",
            age: 32,
            profilePhoto: "https://via.placeholder.com/100x100?text=MJ",
            blockedDate: "2024-01-05T09:15:00Z",
            reason: "Harassment"
          }
        ]);
        setLoading(false);
      }, 1000);
    };

    fetchBlockedUsers();
  }, []);

  const handleUnblockUser = (userId: string, userName: string) => {
    Alert.alert(
      "Unblock User",
      `Are you sure you want to unblock ${userName}? They will be able to see your profile and message you again.`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Unblock",
          onPress: () => {
            // Here you would typically call your API to unblock the user
            console.log("Unblocking user:", userId);
            setBlockedUsers(prev => prev.filter(user => user.id !== userId));
            Alert.alert("Success", `${userName} has been unblocked.`);
          }
        }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const BlockedUserItem = ({ user }: { user: BlockedUser }) => (
    <Box
      bg="$white"
      borderRadius="$lg"
      p="$4"
      mb="$3"
      shadowColor="$backgroundLight300"
      shadowOffset={{ width: 0, height: 1 }}
      shadowOpacity={0.1}
      shadowRadius={2}
      elevation={2}
    >
      <HStack alignItems="center" space="md">
        <Avatar size="md">
          {user.profilePhoto ? (
            <AvatarImage
              source={{ uri: user.profilePhoto }}
              alt={user.name}
            />
          ) : (
            <AvatarFallbackText fontSize="$lg" fontWeight="$bold" color="$primary600">
              {user.name.split(' ').map(n => n.charAt(0)).join('')}
            </AvatarFallbackText>
          )}
        </Avatar>
        
        <Box flex={1}>
          <HStack alignItems="center" justifyContent="space-between">
            <Text
              fontSize="$md"
              fontWeight="$semibold"
              color="$primary900"
            >
              {user.name}, {user.age}
            </Text>
            
            <Button
              size="sm"
              variant="outline"
              borderColor="$primary600"
              onPress={() => handleUnblockUser(user.id, user.name)}
            >
              <ButtonText color="$primary600" fontSize="$sm">
                Unblock
              </ButtonText>
            </Button>
          </HStack>
          
          <Text
            fontSize="$sm"
            color="$primary700"
            mt="$1"
          >
            Blocked on {formatDate(user.blockedDate)}
          </Text>
          
          {user.reason && (
            <Text
              fontSize="$xs"
              color="$primary600"
              mt="$1"
              fontStyle="italic"
            >
              Reason: {user.reason}
            </Text>
          )}
        </Box>
      </HStack>
    </Box>
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
            Blocked Users
          </Text>
        </HStack>
      </HStack>

      {loading ? (
        <Box flex={1} justifyContent="center" alignItems="center">
          <Spinner size="large" color="$primary600" />
          <Text
            fontSize="$md"
            color="$primary700"
            mt="$4"
          >
            Loading blocked users...
          </Text>
        </Box>
      ) : (
        <ScrollView
          flex={1}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <VStack px="$4" py="$4">
            {blockedUsers.length === 0 ? (
              <Box
                flex={1}
                justifyContent="center"
                alignItems="center"
                py="$20"
              >
                <Box
                  w="$20"
                  h="$20"
                  bg="$primary100"
                  borderRadius="$full"
                  alignItems="center"
                  justifyContent="center"
                  mb="$4"
                >
                  <Ionicons name="shield-checkmark" size={40} color="#5B1994" />
                </Box>
                
                <Text
                  fontSize="$xl"
                  fontWeight="$semibold"
                  color="$primary900"
                  textAlign="center"
                  mb="$2"
                >
                  No Blocked Users
                </Text>
                
                <Text
                  fontSize="$md"
                  color="$primary700"
                  textAlign="center"
                  lineHeight="$lg"
                  px="$4"
                >
                  You haven't blocked any users yet. When you block someone, they'll appear here and you can unblock them if needed.
                </Text>
              </Box>
            ) : (
              <>
                {/* Info Banner */}
                <Box
                  bg="$primary50"
                  borderRadius="$lg"
                  p="$4"
                  mb="$4"
                  borderWidth="$1"
                  borderColor="$primary200"
                >
                  <HStack alignItems="center" space="md">
                    <Ionicons name="information-circle" size={24} color="#5B1994" />
                    <Box flex={1}>
                      <Text
                        fontSize="$sm"
                        color="$primary800"
                        lineHeight="$md"
                      >
                        Blocked users cannot see your profile, send you messages, or appear in your card stack. You can unblock them at any time.
                      </Text>
                    </Box>
                  </HStack>
                </Box>

                {/* Blocked Users List */}
                <Text
                  fontSize="$lg"
                  fontWeight="$semibold"
                  color="$primary900"
                  mb="$4"
                >
                  Blocked Users ({blockedUsers.length})
                </Text>
                
                {blockedUsers.map((user) => (
                  <BlockedUserItem key={user.id} user={user} />
                ))}
              </>
            )}
          </VStack>
        </ScrollView>
      )}
    </SafeAreaView>
  );
} 