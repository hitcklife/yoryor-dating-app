import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  Platform,
  StatusBar,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Box,
  Text,
  VStack,
  HStack,
  Avatar,
  AvatarImage,
  Center,
  Pressable,
} from '@gluestack-ui/themed';
import { LinearGradient } from 'expo-linear-gradient';
import { callService } from '@/services/call-service';

interface IncomingCallScreenProps {
  call: {
    callId: number;
    meetingId: string;
    token: string;
    type: 'video' | 'voice';
    caller: {
      id: number;
      name: string | null;
    };
    receiver: {
      id: number;
      name: string | null;
    };
  };
  callerName: string;
  callerAvatar: string;
  onAccept: (callData: any) => void;
  onReject: () => void;
  onDismiss: () => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const IncomingCallScreen: React.FC<IncomingCallScreenProps> = ({
  call,
  callerName,
  callerAvatar,
  onAccept,
  onReject,
  onDismiss,
}) => {
  const [isVideoCall] = useState(call.type === 'video');
  const [callDuration, setCallDuration] = useState(0);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  // Animations
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const slideAnim = React.useRef(new Animated.Value(screenHeight)).current;

  // Timer for call duration
  const durationTimer = React.useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    console.log('📱 IncomingCallScreen: Component mounted with call:', call);
    console.log('📱 IncomingCallScreen: Caller name:', callerName);
    console.log('📱 IncomingCallScreen: Caller avatar:', callerAvatar);
    
    // Slide in animation
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Start pulse animation
    const startPulseAnimation = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    startPulseAnimation();

    // Start call duration timer
    durationTimer.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);

    // Auto-dismiss after 30 seconds if not answered
    const autoDismissTimer = setTimeout(() => {
      if (!isAccepting && !isRejecting) {
        handleReject();
      }
    }, 30000);

    return () => {
      if (durationTimer.current) {
        clearInterval(durationTimer.current);
      }
      clearTimeout(autoDismissTimer);
    };
  }, []);

  const handleAccept = async () => {
    if (isAccepting || isRejecting) return;
    
    setIsAccepting(true);
    
    try {
      console.log('Accepting call:', call.callId);
      
      // Join the call via the call service
      const joinData = await callService.joinCall(call.callId);
      
      console.log('Call joined successfully:', joinData);
      
      // Call the onAccept callback with the join data
      onAccept(joinData);
      
    } catch (error) {
      console.error('Error accepting call:', error);
      Alert.alert('Call Error', 'Failed to accept the call. Please try again.');
      setIsAccepting(false);
    }
  };

  const handleReject = async () => {
    if (isAccepting || isRejecting) return;
    
    setIsRejecting(true);
    
    try {
      console.log('Rejecting call:', call.callId);
      
      // Reject the call via the call service
      await callService.rejectCall(call.callId);
      
      console.log('Call rejected successfully');
      
      // Call the onReject callback
      onReject();
      
    } catch (error) {
      console.error('Error rejecting call:', error);
      // Even if the API call fails, we still want to dismiss the screen
      onReject();
    }
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient
          colors={['#8B5CF6', '#7C3AED', '#6D28D9']}
          style={styles.gradient}
        >
          <VStack flex={1} justifyContent="space-between" alignItems="center" p="$6">
            {/* Header */}
            <Box alignItems="center" mt="$8">
              <Text color="$white" fontSize="$2xl" fontWeight="$bold" mb="$2">
                Incoming {isVideoCall ? 'Video' : 'Voice'} Call
              </Text>
              <Text color="$white" fontSize="$lg" opacity={0.9}>
                {callerName}
              </Text>
            </Box>

            {/* Caller Avatar */}
            <Center flex={1} justifyContent="center">
              <Animated.View
                style={[
                  styles.avatarContainer,
                  {
                    transform: [{ scale: pulseAnim }],
                  },
                ]}
              >
                <Avatar size="2xl" style={styles.avatar}>
                  <AvatarImage source={{ uri: callerAvatar }} />
                </Avatar>
                
                {/* Call Type Icon */}
                <Box
                  position="absolute"
                  bottom={-10}
                  right={-10}
                  bg="$white"
                  borderRadius="$full"
                  p="$2"
                  shadowColor="#000"
                  shadowOffset={{ width: 0, height: 2 }}
                  shadowOpacity={0.25}
                  shadowRadius={4}
                  elevation={5}
                >
                  <Ionicons
                    name={isVideoCall ? 'videocam' : 'call'}
                    size={24}
                    color="#8B5CF6"
                  />
                </Box>
              </Animated.View>
            </Center>

            {/* Call Duration */}
            {callDuration > 0 && (
              <Box alignItems="center" mb="$4">
                <Text color="$white" fontSize="$lg" fontWeight="$medium">
                  {formatDuration(callDuration)}
                </Text>
              </Box>
            )}

            {/* Action Buttons */}
            <VStack space="lg" width="100%" mb="$8">
              {/* Accept Button */}
              <Pressable
                onPress={handleAccept}
                disabled={isAccepting || isRejecting}
                style={[
                  styles.actionButton,
                  styles.acceptButton,
                  (isAccepting || isRejecting) && styles.disabledButton,
                ]}
              >
                <HStack alignItems="center" justifyContent="center" space="sm">
                  <Ionicons
                    name={isVideoCall ? 'videocam' : 'call'}
                    size={24}
                    color="#FFFFFF"
                  />
                  <Text color="$white" fontSize="$lg" fontWeight="$semibold">
                    {isAccepting ? 'Accepting...' : `Accept ${isVideoCall ? 'Video' : 'Voice'} Call`}
                  </Text>
                </HStack>
              </Pressable>

              {/* Reject Button */}
              <Pressable
                onPress={handleReject}
                disabled={isAccepting || isRejecting}
                style={[
                  styles.actionButton,
                  styles.rejectButton,
                  (isAccepting || isRejecting) && styles.disabledButton,
                ]}
              >
                <HStack alignItems="center" justifyContent="center" space="sm">
                  <Ionicons name="call" size={24} color="#FFFFFF" />
                  <Text color="$white" fontSize="$lg" fontWeight="$semibold">
                    {isRejecting ? 'Rejecting...' : 'Decline'}
                  </Text>
                </HStack>
              </Pressable>

              {/* Dismiss Button */}
              <Pressable
                onPress={onDismiss}
                disabled={isAccepting || isRejecting}
                style={[
                  styles.actionButton,
                  styles.dismissButton,
                  (isAccepting || isRejecting) && styles.disabledButton,
                ]}
              >
                <Text color="$white" fontSize="$md" opacity={0.8}>
                  Dismiss
                </Text>
              </Pressable>
            </VStack>
          </VStack>
        </LinearGradient>
      </SafeAreaView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  safeArea: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  actionButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  acceptButton: {
    backgroundColor: '#10B981',
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  dismissButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default IncomingCallScreen; 