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
  Divider,
  Input,
  InputField,
  Button,
  ButtonText,
  Textarea,
  TextareaInput,
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionTrigger,
  AccordionContent,
  AccordionTitleText,
  AccordionIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@gluestack-ui/themed";
import { Ionicons } from "@expo/vector-icons";

export default function HelpSupportScreen() {
  const router = useRouter();
  const [feedbackText, setFeedbackText] = useState("");
  const [userEmail, setUserEmail] = useState("");

  const faqData = [
    {
      id: "1",
      question: "How do I delete my account?",
      answer: "To delete your account, go to Settings > Account Management > Delete Account. Please note that this action is permanent and cannot be undone."
    },
    {
      id: "2",
      question: "How do I report someone?",
      answer: "You can report a user by going to their profile, tapping the three dots menu, and selecting 'Report User'. You can also report messages directly from the chat."
    },
    {
      id: "3",
      question: "How do I change my location?",
      answer: "Your location is automatically detected. To change it, go to Settings > Privacy > Location Settings. You can also use the 'Passport' feature if you have premium."
    },
    {
      id: "4",
      question: "Why am I not getting matches?",
      answer: "Make sure your profile is complete with good photos and a bio. Check your discovery settings to ensure you're not filtering out too many potential matches."
    },
    {
      id: "5",
      question: "How do I block someone?",
      answer: "To block someone, go to their profile, tap the three dots menu, and select 'Block'. You can also block from the chat screen."
    },
    {
      id: "6",
      question: "How do I cancel my subscription?",
      answer: "You can cancel your subscription through your device's app store (iOS App Store or Google Play Store) or contact our support team."
    },
    {
      id: "7",
      question: "How do I verify my profile?",
      answer: "To verify your profile, go to Settings > Safety & Security > Photo Verification and follow the instructions to take verification photos."
    },
    {
      id: "8",
      question: "What should I do if I'm experiencing harassment?",
      answer: "If you're experiencing harassment, please report the user immediately and block them. You can also contact our support team for additional help."
    }
  ];

  const handleEmailSupport = () => {
    const email = "support@yoryor.com";
    const subject = "Support Request";
    const body = "Please describe your issue here...";
    
    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    Linking.openURL(mailtoUrl).catch(() => {
      Alert.alert("Error", "Unable to open email client. Please email us at support@yoryor.com");
    });
  };

  const handleCallSupport = () => {
    const phoneNumber = "+1-555-YORYOR";
    const telUrl = `tel:${phoneNumber}`;
    
    Linking.openURL(telUrl).catch(() => {
      Alert.alert("Error", "Unable to make phone call. Please call us at +1-555-YORYOR");
    });
  };

  const handleSubmitFeedback = () => {
    if (!feedbackText.trim()) {
      Alert.alert("Error", "Please enter your feedback");
      return;
    }
    
    // Here you would typically send the feedback to your backend
    console.log("Feedback submitted:", { feedback: feedbackText, email: userEmail });
    
    Alert.alert("Thank you!", "Your feedback has been submitted successfully.", [
      {
        text: "OK",
        onPress: () => {
          setFeedbackText("");
          setUserEmail("");
        }
      }
    ]);
  };

  const ContactItem = ({ 
    icon, 
    title, 
    description, 
    onPress 
  }: { 
    icon: string;
    title: string;
    description: string;
    onPress: () => void;
  }) => (
    <Pressable onPress={onPress}>
      <HStack
        alignItems="center"
        px="$4"
        py="$3"
        space="md"
      >
        <Box
          w="$10"
          h="$10"
          bg="$primary100"
          alignItems="center"
          justifyContent="center"
          borderRadius="$lg"
        >
          <Ionicons name={icon as any} size={24} color="#5B1994" />
        </Box>
        <Box flex={1}>
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
          >
            {description}
          </Text>
        </Box>
        <Ionicons name="chevron-forward" size={20} color="#5B1994" />
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
            Help & Support
          </Text>
        </HStack>
      </HStack>

      <ScrollView
        flex={1}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <VStack space="lg" px="$4" py="$4">
          {/* Contact Support */}
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
              Contact Support
            </Text>
            
            <ContactItem
              icon="mail"
              title="Email Support"
              description="Get help via email within 24 hours"
              onPress={handleEmailSupport}
            />
            
            <Divider bg="$backgroundLight200" />
            
            <ContactItem
              icon="call"
              title="Call Support"
              description="Speak with our support team directly"
              onPress={handleCallSupport}
            />
            
            <Divider bg="$backgroundLight200" />
            
            <ContactItem
              icon="chatbubble"
              title="Live Chat"
              description="Chat with support in real-time"
              onPress={() => {
                // Handle live chat
                console.log("Live chat pressed");
              }}
            />
          </Box>

          {/* Submit Feedback */}
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
              Send Feedback
            </Text>
            
            <VStack space="md">
              <Box>
                <Text
                  fontSize="$sm"
                  color="$primary700"
                  mb="$2"
                  fontWeight="$medium"
                >
                  Your Email (Optional)
                </Text>
                <Input>
                  <InputField
                    placeholder="your.email@example.com"
                    value={userEmail}
                    onChangeText={setUserEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </Input>
              </Box>
              
              <Box>
                <Text
                  fontSize="$sm"
                  color="$primary700"
                  mb="$2"
                  fontWeight="$medium"
                >
                  Your Feedback
                </Text>
                <Textarea>
                  <TextareaInput
                    placeholder="Tell us about your experience, suggest improvements, or report issues..."
                    value={feedbackText}
                    onChangeText={setFeedbackText}
                    multiline
                    numberOfLines={4}
                  />
                </Textarea>
              </Box>
              
              <Button
                size="md"
                bg="$primary600"
                onPress={handleSubmitFeedback}
              >
                <ButtonText color="$white">Submit Feedback</ButtonText>
              </Button>
            </VStack>
          </Box>

          {/* FAQ */}
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
              Frequently Asked Questions
            </Text>
            
            <Accordion
              size="md"
              variant="unfilled"
              type="single"
              isCollapsible={true}
            >
              {faqData.map((faq) => (
                <AccordionItem key={faq.id} value={faq.id}>
                  <AccordionHeader>
                    <AccordionTrigger>
                      {({ isExpanded }) => (
                        <>
                          <AccordionTitleText
                            fontSize="$md"
                            color="$primary900"
                            fontWeight="$medium"
                          >
                            {faq.question}
                          </AccordionTitleText>
                          {isExpanded ? (
                            <AccordionIcon as={ChevronUpIcon} ml="$3" />
                          ) : (
                            <AccordionIcon as={ChevronDownIcon} ml="$3" />
                          )}
                        </>
                      )}
                    </AccordionTrigger>
                  </AccordionHeader>
                  <AccordionContent>
                    <Text
                      fontSize="$sm"
                      color="$primary700"
                      lineHeight="$md"
                      p="$2"
                    >
                      {faq.answer}
                    </Text>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Box>

          {/* Additional Resources */}
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
              Additional Resources
            </Text>
            
            <Pressable
              onPress={() => {
                // Handle safety tips
                console.log("Safety tips pressed");
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
                    Safety Tips
                  </Text>
                  <Text
                    fontSize="$sm"
                    color="$primary700"
                  >
                    Learn how to stay safe while dating
                  </Text>
                </Box>
                <Ionicons name="chevron-forward" size={20} color="#5B1994" />
              </HStack>
            </Pressable>
            
            <Divider bg="$backgroundLight200" />
            
            <Pressable
              onPress={() => {
                // Handle community guidelines
                console.log("Community guidelines pressed");
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
                    Community Guidelines
                  </Text>
                  <Text
                    fontSize="$sm"
                    color="$primary700"
                  >
                    Read our community standards
                  </Text>
                </Box>
                <Ionicons name="chevron-forward" size={20} color="#5B1994" />
              </HStack>
            </Pressable>
            
            <Divider bg="$backgroundLight200" />
            
            <Pressable
              onPress={() => {
                Linking.openURL("https://yoryor.com/terms").catch(() => {
                  Alert.alert("Error", "Unable to open link");
                });
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
                    Terms of Service
                  </Text>
                  <Text
                    fontSize="$sm"
                    color="$primary700"
                  >
                    Read our terms and conditions
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