import React, { useState } from "react";
import { useRouter } from "expo-router";
import { Alert } from "react-native";
import { useAuth } from "@/context/auth-context";
import {
  Box,
  VStack,
  HStack,
  Text,
  ScrollView,
  Pressable,
  SafeAreaView,
  Divider,
  Input,
  InputField,
  Button,
  ButtonText,
  Switch,
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogCloseButton,
  AlertDialogBody,
  AlertDialogFooter,
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  CloseIcon,
} from "@gluestack-ui/themed";
import { Ionicons } from "@expo/vector-icons";

export default function AccountManagementScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  
  const [newEmail, setNewEmail] = useState("");
  const [settings, setSettings] = useState({
    twoFactor: false,
    emailNotifications: true,
    marketingEmails: false,
  });

  const handlePasswordChange = () => {
    if (!passwords.current || !passwords.new || !passwords.confirm) {
      Alert.alert("Error", "Please fill in all password fields");
      return;
    }
    
    if (passwords.new !== passwords.confirm) {
      Alert.alert("Error", "New passwords don't match");
      return;
    }
    
    if (passwords.new.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters long");
      return;
    }
    
    // Here you would typically call your API to change the password
    console.log("Password change requested");
    Alert.alert("Success", "Password changed successfully", [
      {
        text: "OK",
        onPress: () => {
          setShowPasswordModal(false);
          setPasswords({ current: "", new: "", confirm: "" });
        }
      }
    ]);
  };

  const handleEmailChange = () => {
    if (!newEmail.trim()) {
      Alert.alert("Error", "Please enter a new email address");
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }
    
    // Here you would typically call your API to change the email
    console.log("Email change requested to:", newEmail);
    Alert.alert("Verification Required", "A verification email has been sent to your new email address. Please verify to complete the change.", [
      {
        text: "OK",
        onPress: () => {
          setShowEmailModal(false);
          setNewEmail("");
        }
      }
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Are you absolutely sure you want to delete your account? This action cannot be undone and you will lose all your matches, messages, and profile data.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            // Here you would typically call your API to delete the account
            console.log("Account deletion requested");
            Alert.alert("Account Deleted", "Your account has been permanently deleted.", [
              {
                text: "OK",
                onPress: () => {
                  logout();
                  router.replace("/login");
                }
              }
            ]);
          }
        }
      ]
    );
  };

  const handleExportData = () => {
    Alert.alert(
      "Export Data",
      "We'll prepare your data export and send it to your email address within 48 hours.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Export",
          onPress: () => {
            // Here you would typically call your API to initiate data export
            console.log("Data export requested");
            Alert.alert("Export Requested", "Your data export has been requested. You'll receive an email with a download link within 48 hours.");
          }
        }
      ]
    );
  };

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
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
            Account Management
          </Text>
        </HStack>
      </HStack>

      <ScrollView
        flex={1}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <VStack space="lg" px="$4" py="$4">
          {/* Account Info */}
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
              Account Information
            </Text>
            
            <VStack space="md">
              <HStack justifyContent="space-between" alignItems="center">
                <Text fontSize="$md" color="$primary700">Email:</Text>
                <Text fontSize="$md" color="$primary900" fontWeight="$medium">
                  {user?.email || "Not set"}
                </Text>
              </HStack>
              
              <HStack justifyContent="space-between" alignItems="center">
                <Text fontSize="$md" color="$primary700">Phone:</Text>
                <Text fontSize="$md" color="$primary900" fontWeight="$medium">
                  {user?.phone_number || "Not set"}
                </Text>
              </HStack>
              
              <HStack justifyContent="space-between" alignItems="center">
                <Text fontSize="$md" color="$primary700">Member Since:</Text>
                <Text fontSize="$md" color="$primary900" fontWeight="$medium">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "Unknown"}
                </Text>
              </HStack>
            </VStack>
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
            
            <Pressable
              onPress={() => setShowPasswordModal(true)}
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
                    Change Password
                  </Text>
                  <Text
                    fontSize="$sm"
                    color="$primary700"
                  >
                    Update your account password
                  </Text>
                </Box>
                <Ionicons name="chevron-forward" size={20} color="#5B1994" />
              </HStack>
            </Pressable>
            
            <Divider bg="$backgroundLight200" />
            
            <Pressable
              onPress={() => setShowEmailModal(true)}
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
                    Change Email
                  </Text>
                  <Text
                    fontSize="$sm"
                    color="$primary700"
                  >
                    Update your email address
                  </Text>
                </Box>
                <Ionicons name="chevron-forward" size={20} color="#5B1994" />
              </HStack>
            </Pressable>
            
            <Divider bg="$backgroundLight200" />
            
            <SettingItem
              title="Two-Factor Authentication"
              description="Add an extra layer of security to your account"
              value={settings.twoFactor}
              onToggle={() => toggleSetting('twoFactor')}
            />
          </Box>

          {/* Communication Preferences */}
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
              Communication Preferences
            </Text>
            
            <SettingItem
              title="Email Notifications"
              description="Receive important updates via email"
              value={settings.emailNotifications}
              onToggle={() => toggleSetting('emailNotifications')}
            />
            
            <Divider bg="$backgroundLight200" />
            
            <SettingItem
              title="Marketing Emails"
              description="Receive promotional emails and offers"
              value={settings.marketingEmails}
              onToggle={() => toggleSetting('marketingEmails')}
            />
          </Box>

          {/* Data & Privacy */}
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
              Data & Privacy
            </Text>
            
            <Pressable
              onPress={handleExportData}
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
                    Export My Data
                  </Text>
                  <Text
                    fontSize="$sm"
                    color="$primary700"
                  >
                    Download a copy of your data
                  </Text>
                </Box>
                <Ionicons name="chevron-forward" size={20} color="#5B1994" />
              </HStack>
            </Pressable>
          </Box>

          {/* Danger Zone */}
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
              color="$error600"
              p="$4"
              pb="$2"
            >
              Danger Zone
            </Text>
            
            <Pressable
              onPress={handleDeleteAccount}
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
                    Delete Account
                  </Text>
                  <Text
                    fontSize="$sm"
                    color="$error500"
                  >
                    Permanently delete your account and all data
                  </Text>
                </Box>
                <Ionicons name="chevron-forward" size={20} color="#DC2626" />
              </HStack>
            </Pressable>
          </Box>
        </VStack>
      </ScrollView>

      {/* Change Password Modal */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      >
        <ModalBackdrop />
        <ModalContent>
          <ModalHeader>
            <Text fontSize="$lg" fontWeight="$semibold" color="$primary900">
              Change Password
            </Text>
            <ModalCloseButton>
              <CloseIcon />
            </ModalCloseButton>
          </ModalHeader>
          <ModalBody>
            <VStack space="md">
              <Box>
                <Text fontSize="$sm" color="$primary700" mb="$2">
                  Current Password
                </Text>
                <Input>
                  <InputField
                    type="password"
                    value={passwords.current}
                    onChangeText={(text) => setPasswords(prev => ({ ...prev, current: text }))}
                    placeholder="Enter current password"
                  />
                </Input>
              </Box>
              
              <Box>
                <Text fontSize="$sm" color="$primary700" mb="$2">
                  New Password
                </Text>
                <Input>
                  <InputField
                    type="password"
                    value={passwords.new}
                    onChangeText={(text) => setPasswords(prev => ({ ...prev, new: text }))}
                    placeholder="Enter new password"
                  />
                </Input>
              </Box>
              
              <Box>
                <Text fontSize="$sm" color="$primary700" mb="$2">
                  Confirm New Password
                </Text>
                <Input>
                  <InputField
                    type="password"
                    value={passwords.confirm}
                    onChangeText={(text) => setPasswords(prev => ({ ...prev, confirm: text }))}
                    placeholder="Confirm new password"
                  />
                </Input>
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <HStack space="md" flex={1}>
              <Button
                flex={1}
                variant="outline"
                onPress={() => setShowPasswordModal(false)}
              >
                <ButtonText>Cancel</ButtonText>
              </Button>
              <Button
                flex={1}
                bg="$primary600"
                onPress={handlePasswordChange}
              >
                <ButtonText color="$white">Change Password</ButtonText>
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Change Email Modal */}
      <Modal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
      >
        <ModalBackdrop />
        <ModalContent>
          <ModalHeader>
            <Text fontSize="$lg" fontWeight="$semibold" color="$primary900">
              Change Email
            </Text>
            <ModalCloseButton>
              <CloseIcon />
            </ModalCloseButton>
          </ModalHeader>
          <ModalBody>
            <VStack space="md">
              <Box>
                <Text fontSize="$sm" color="$primary700" mb="$2">
                  Current Email
                </Text>
                <Text fontSize="$md" color="$primary900" fontWeight="$medium">
                  {user?.email || "Not set"}
                </Text>
              </Box>
              
              <Box>
                <Text fontSize="$sm" color="$primary700" mb="$2">
                  New Email Address
                </Text>
                <Input>
                  <InputField
                    value={newEmail}
                    onChangeText={setNewEmail}
                    placeholder="Enter new email address"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </Input>
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <HStack space="md" flex={1}>
              <Button
                flex={1}
                variant="outline"
                onPress={() => setShowEmailModal(false)}
              >
                <ButtonText>Cancel</ButtonText>
              </Button>
              <Button
                flex={1}
                bg="$primary600"
                onPress={handleEmailChange}
              >
                <ButtonText color="$white">Change Email</ButtonText>
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </SafeAreaView>
  );
} 