import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
  Animated,
  Dimensions,
  PermissionsAndroid,
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
  Badge,
  BadgeText,
} from '@gluestack-ui/themed';
import { useColorScheme } from 'nativewind';
import { videoSDKService } from '@/services/videosdk-service';
import { CachedImage } from '@/components/ui/CachedImage';
import {
  MeetingProvider,
  useMeeting,
  useParticipant,
  MediaStream,
  RTCView,
} from '@videosdk.live/react-native-sdk';
import { LinearGradient } from 'expo-linear-gradient';

interface CallScreenProps {
  chatId: number;
  userId: number;
  userName: string;
  userAvatar: string;
  isVideoCall: boolean;
  onEndCall: () => void;
  meetingId?: string;
  token?: string;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Video Call Meeting Component
const VideoCallMeeting: React.FC<{
  userName: string;
  userAvatar: string;
  isVideoCall: boolean;
  onEndCall: () => void;
  chatId: number;
  meetingId: string;
}> = ({ userName, userAvatar, isVideoCall, onEndCall, chatId, meetingId }) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Use refs to prevent infinite loops and race conditions
  const joinedRef = useRef(false);
  const isJoiningRef = useRef(false);
  const hasLeftRef = useRef(false);
  const mountedRef = useRef(true);

  // Stable callback references
  const onEndCallRef = useRef(onEndCall);
  const meetingIdRef = useRef(meetingId);
  
  // Update refs when props change
  useEffect(() => {
    onEndCallRef.current = onEndCall;
    meetingIdRef.current = meetingId;
  });

  // Call state (moved before callbacks that use them)
  const [joined, setJoined] = useState(false);
  const [remoteParticipantId, setRemoteParticipantId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isCameraOff, setIsCameraOff] = useState(!isVideoCall);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [callStatus, setCallStatus] = useState<'connecting' | 'connected' | 'ended'>('connecting');
  const [callDuration, setCallDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);

  // Memoized event handlers to prevent recreating on every render
  const handleMeetingJoined = useCallback(() => {
    if (!mountedRef.current || joinedRef.current) return;
    
    console.log('✅ Meeting joined successfully - ID:', meetingIdRef.current);
    joinedRef.current = true;
    isJoiningRef.current = false;
    
    if (mountedRef.current) {
      setCallStatus('connected');
      setJoined(true);
      console.log('📞 Call status set to connected');
    }
  }, []);

  const handleMeetingLeft = useCallback(() => {
    if (!mountedRef.current || hasLeftRef.current) return;
    
    console.log('👋 Meeting left - Status:', callStatus, 'Joined:', joinedRef.current);
    
    // Only handle unexpected leaves (not when we intentionally ended the call)
    if (callStatus !== 'ended' && mountedRef.current) {
      console.log('🚨 Unexpected meeting left - may be a connection issue');
      // Give time for potential reconnection
      setTimeout(() => {
        if (mountedRef.current && (callStatus === 'connecting' || callStatus === 'connected') && !hasLeftRef.current) {
          console.log('🔄 No reconnection after 2 seconds, ending call');
          hasLeftRef.current = true;
          setCallStatus('ended');
          setTimeout(() => {
            if (mountedRef.current) {
              onEndCallRef.current();
            }
          }, 100);
        }
      }, 2000);
    }
  }, [callStatus]);

  const handleParticipantJoined = useCallback((participant: any) => {
    if (!mountedRef.current) return;
    
    console.log('👥 Participant joined:', participant.id, participant.displayName || 'Unknown');
    setRemoteParticipantId(participant.id);
    if (callStatus === 'connecting') {
      setCallStatus('connected');
    }
  }, [callStatus]);

  const handleParticipantLeft = useCallback((participant: any) => {
    if (!mountedRef.current) return;
    
    console.log('👋 Participant left:', participant.id);
    setRemoteParticipantId(prev => prev === participant.id ? null : prev);
  }, []);

  const handleError = useCallback((error: any) => {
    if (!mountedRef.current) return;
    
    console.error('❌ Meeting error:', error);
    console.error('❌ Error details:', JSON.stringify(error, null, 2));
    
    const errorStr = error.toString().toLowerCase();
    if (errorStr.includes('token') || errorStr.includes('authentication')) {
      console.error('🔐 TOKEN ERROR DETECTED');
      Alert.alert('Authentication Error', 'Video call token issue. Please try again.');
      if (mountedRef.current) {
        onEndCallRef.current();
      }
    } else if (errorStr.includes('meeting') || errorStr.includes('room')) {
      console.error('🏠 MEETING ERROR DETECTED');
      Alert.alert('Meeting Error', 'Meeting room issue. Please try again.');
      if (mountedRef.current) {
        onEndCallRef.current();
      }
    } else if (errorStr.includes('permission')) {
      console.error('🔒 PERMISSION ERROR DETECTED');
      Alert.alert('Permission Error', 'No permission to join this meeting.');
      if (mountedRef.current) {
        onEndCallRef.current();
      }
    } else {
      console.log('⚠️ Non-critical error, continuing...:', errorStr);
    }
  }, []);

  // Get meeting and participants from VideoSDK
  const { join, leave, toggleMic, toggleWebcam, changeWebcam, participants, localParticipant } = useMeeting({
    onMeetingJoined: handleMeetingJoined,
    onMeetingLeft: handleMeetingLeft,
    onParticipantJoined: handleParticipantJoined,
    onParticipantLeft: handleParticipantLeft,
    onError: handleError,
  });



  // Animations
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const controlsOpacity = useRef(new Animated.Value(1)).current;

  // Timer for call duration
  const durationTimer = useRef<any>(null);
  const controlsTimer = useRef<any>(null);

  // Get remote participant data
  const remoteParticipant = remoteParticipantId ? participants.get(remoteParticipantId) : null;

  // Auto-join the meeting when component mounts (only once with safeguards)
  useEffect(() => {
    if (!mountedRef.current || joinedRef.current || isJoiningRef.current || !join) {
      return;
    }

    isJoiningRef.current = true;
    console.log('🔄 Attempting to join meeting:', meetingId);
    
    // Add a longer delay to ensure VideoSDK is fully ready
    const joinTimer = setTimeout(() => {
      if (mountedRef.current && !joinedRef.current && join) {
        console.log('🚀 Calling join() now...');
        try {
          join();
          console.log('📞 join() called successfully');
        } catch (error) {
          console.error('💥 Error calling join():', error);
          isJoiningRef.current = false;
        }
      }
    }, 1000);

    return () => {
      clearTimeout(joinTimer);
    };
  }, [join, meetingId]); // Only depend on join function and meetingId

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('🧹 VideoCallMeeting unmounting, cleaning up...');
      mountedRef.current = false;
      joinedRef.current = false;
      hasLeftRef.current = true;
      
      if (durationTimer.current) {
        clearInterval(durationTimer.current);
      }
      if (controlsTimer.current) {
        clearTimeout(controlsTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (callStatus === 'connected') {
      startCallTimer();
      startAutoHideControls();
    }
  }, [callStatus]);

  useEffect(() => {
    startPulseAnimation();
  }, []);

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

  const startCallTimer = () => {
    if (durationTimer.current) {
      clearInterval(durationTimer.current);
    }
    durationTimer.current = setInterval(() => {
      if (mountedRef.current) {
        setCallDuration(prev => prev + 1);
      }
    }, 1000);
  };

  const startAutoHideControls = () => {
    if (controlsTimer.current) {
      clearTimeout(controlsTimer.current);
    }

    controlsTimer.current = setTimeout(() => {
      if (isVideoCall && joined && mountedRef.current) {
        hideControls();
      }
    }, 5000);
  };

  const hideControls = () => {
    Animated.timing(controlsOpacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      if (mountedRef.current) {
        setShowControls(false);
      }
    });
  };

  const showControlsTemporarily = () => {
    if (!mountedRef.current) return;
    
    setShowControls(true);
    Animated.timing(controlsOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    startAutoHideControls();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = useCallback(async () => {
    if (!mountedRef.current || hasLeftRef.current || callStatus === 'ended') {
      return;
    }
    
    console.log('🔚 User initiated call end');
    hasLeftRef.current = true;
    setCallStatus('ended');
    
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();

    try {
      if (leave) {
        await leave();
      }
    } catch (error) {
      console.error('Error leaving meeting:', error);
    }

    // Clean up timers
    if (durationTimer.current) {
      clearInterval(durationTimer.current);
    }
    if (controlsTimer.current) {
      clearTimeout(controlsTimer.current);
    }

    setTimeout(() => {
      if (mountedRef.current) {
        onEndCallRef.current();
      }
    }, 300);
  }, [callStatus, leave, fadeAnim]);

  const toggleMute = async () => {
    if (!mountedRef.current) return;
    
    try {
      await toggleMic();
      setIsMuted(prev => !prev);
    } catch (error) {
      console.error('Error toggling mute:', error);
    }
  };

  const toggleSpeaker = async () => {
    if (!mountedRef.current) return;
    
    try {
      // VideoSDK handles speaker automatically
      setIsSpeakerOn(prev => !prev);
    } catch (error) {
      console.error('Error toggling speaker:', error);
    }
  };

  const toggleCamera = async () => {
    if (!mountedRef.current) return;
    
    try {
      await toggleWebcam();
      setIsCameraOff(prev => !prev);
    } catch (error) {
      console.error('Error toggling camera:', error);
    }
  };

  const switchCamera = async () => {
    if (!mountedRef.current) return;
    
    try {
      await changeWebcam();
      setIsFrontCamera(prev => !prev);
    } catch (error) {
      console.error('Error switching camera:', error);
    }
  };

  // Remote Participant View Component
  const RemoteParticipantView = ({ participantId }: { participantId: string }) => {
    const { webcamStream, webcamOn, displayName } = useParticipant(participantId);

    return webcamOn && webcamStream ? (
      <RTCView
        streamURL={new MediaStream([webcamStream.track]).toURL()}
        objectFit={"cover"}
        style={styles.fullScreenVideo}
      />
    ) : (
      <LinearGradient
        colors={isDark ? ['#1a1a2e', '#16213e', '#0f3460'] : ['#667eea', '#764ba2', '#f093fb']}
        style={styles.fullScreenVideo}
      >
        <Center flex={1}>
                      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <CachedImage
                source={{ uri: userAvatar }}
                style={{ width: 80, height: 80, borderRadius: 40 }}
                type="profile"
                userId={chatId}
                fallbackSource={{ uri: "https://via.placeholder.com/80" }}
              />
            </Animated.View>
          <VStack alignItems="center" mt="$6" space="md">
            <Text color="$white" fontSize="$2xl" fontWeight="$bold">
              {displayName || userName}
            </Text>
            <Badge variant="solid" bg="rgba(255,255,255,0.2)" borderRadius="$full">
              <BadgeText color="$white" fontSize="$sm">
                Connected
              </BadgeText>
            </Badge>
          </VStack>
        </Center>
      </LinearGradient>
    );
  };

  // Local Participant View Component
  const LocalParticipantView = () => {
    const { webcamStream, webcamOn } = useParticipant(localParticipant?.id || '');

    if (!localParticipant?.id || !webcamOn || !webcamStream || isCameraOff) return null;

    return (
      <Box
        position="absolute"
        top={100}
        right={20}
        width={100}
        height={140}
        bg="$backgroundDark900"
        borderRadius="$xl"
        overflow="hidden"
        borderWidth={3}
        borderColor="$white"
        style={styles.localVideoContainer}
      >
        <RTCView
          streamURL={new MediaStream([webcamStream.track]).toURL()}
          objectFit={"cover"}
          style={styles.localVideo}
        />
        <Box
          position="absolute"
          top="$2"
          right="$2"
          bg="rgba(0,0,0,0.6)"
          borderRadius="$full"
          p="$1"
        >
          <Ionicons name="person" size={12} color="white" />
        </Box>
      </Box>
    );
  };

  const renderVideoCall = () => {
    return (
      <Box flex={1} position="relative" bg="$backgroundDark900">
        {/* Remote user's video */}
        {remoteParticipantId ? (
          <RemoteParticipantView participantId={remoteParticipantId} />
        ) : (
          <LinearGradient
            colors={isDark ? ['#1a1a2e', '#16213e', '#0f3460'] : ['#667eea', '#764ba2', '#f093fb']}
            style={styles.fullScreenVideo}
          >
            <Center flex={1}>
                          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <CachedImage
                source={{ uri: userAvatar }}
                style={{ width: 80, height: 80, borderRadius: 40 }}
                type="profile"
                userId={chatId}
                fallbackSource={{ uri: "https://via.placeholder.com/80" }}
              />
            </Animated.View>
              <VStack alignItems="center" mt="$6" space="md">
                <Text color="$white" fontSize="$2xl" fontWeight="$bold">
                  {userName}
                </Text>
                <Badge variant="solid" bg="rgba(255,255,255,0.2)" borderRadius="$full">
                  <BadgeText color="$white" fontSize="$sm">
                    {joined ? 'Waiting for response...' : 'Connecting...'}
                  </BadgeText>
                </Badge>
                {joined && (
                  <Text color="rgba(255,255,255,0.8)" fontSize="$sm">
                    You are connected • Waiting for {userName}
                  </Text>
                )}
              </VStack>
            </Center>
          </LinearGradient>
        )}

        {/* Local user's video */}
        <LocalParticipantView />

        {/* Debug info */}
        <Box
          position="absolute"
          top={Platform.OS === 'ios' ? 60 : 40}
          left="$4"
          bg="rgba(0,0,0,0.7)"
          borderRadius="$md"
          p="$2"
        >
          <Text color="$white" fontSize="$xs">
            Meeting: {meetingId}
          </Text>
          <Text color="$white" fontSize="$xs">
            Status: {joined ? 'Connected' : 'Connecting'}
          </Text>
          <Text color="$white" fontSize="$xs">
            Local ID: {localParticipant?.id || 'None'}
          </Text>
          <Text color="$white" fontSize="$xs">
            Remote ID: {remoteParticipantId || 'None'}
          </Text>
          <Text color="$white" fontSize="$xs">
            Participants: {participants.size}
          </Text>
        </Box>

        {/* Tap to show controls overlay */}
        {!showControls && (
          <Pressable
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            onPress={showControlsTemporarily}
          />
        )}
      </Box>
    );
  };

  const renderAudioCall = () => {
    return (
      <LinearGradient
        colors={isDark ? ['#2c1810', '#3d2914', '#4a3728'] : ['#ffecd2', '#fcb69f', '#ff9a9e']}
        style={styles.fullScreenVideo}
      >
        <Center flex={1}>
          <VStack alignItems="center" space="lg">
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <CachedImage
                source={{ uri: userAvatar }}
                style={{ width: 80, height: 80, borderRadius: 40 }}
                type="profile"
                userId={chatId}
                fallbackSource={{ uri: "https://via.placeholder.com/80" }}
              />
            </Animated.View>

            <VStack alignItems="center" space="md">
              <Text color="$white" fontSize="$3xl" fontWeight="$bold">
                {userName}
              </Text>

              <Badge
                variant="solid"
                bg="rgba(255,255,255,0.25)"
                borderRadius="$full"
                px="$4"
                py="$2"
              >
                <BadgeText color="$white" fontSize="$md" fontWeight="$semibold">
                  {joined
                    ? remoteParticipantId
                      ? formatDuration(callDuration)
                      : 'Waiting for response...'
                    : 'Connecting...'}
                </BadgeText>
              </Badge>

              {joined && (
                <HStack alignItems="center" space="sm">
                  <Box w="$2" h="$2" bg="$success500" borderRadius="$full" />
                  <Text color="rgba(255,255,255,0.8)" fontSize="$sm">
                    Connected to call
                  </Text>
                </HStack>
              )}
            </VStack>
          </VStack>
        </Center>

        {/* Debug info for audio call */}
        <Box
          position="absolute"
          bottom={200}
          left="$4"
          right="$4"
          bg="rgba(0,0,0,0.7)"
          borderRadius="$md"
          p="$3"
        >
          <Text color="$white" fontSize="$sm" textAlign="center">
            Meeting: {meetingId}
          </Text>
          <Text color="$white" fontSize="$sm" textAlign="center">
            Participants: {participants.size} | Local: {localParticipant?.id} | Remote: {remoteParticipantId || 'Waiting...'}
          </Text>
        </Box>
      </LinearGradient>
    );
  };

  const ControlButton = ({
    icon,
    label,
    isActive,
    onPress,
    variant = 'secondary'
  }: {
    icon: string;
    label: string;
    isActive?: boolean;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
  }) => {
    const getButtonColor = () => {
      if (variant === 'danger') return '$error500';
      if (variant === 'primary') return '$primary500';
      return isActive ? '$error500' : 'rgba(255,255,255,0.25)';
    };

    return (
      <Pressable onPress={onPress} alignItems="center">
        <Box
          bg={getButtonColor()}
          borderRadius="$full"
          p="$4"
          style={styles.controlButton}
          borderWidth={variant === 'secondary' ? 1 : 0}
          borderColor="rgba(255,255,255,0.3)"
        >
          <Ionicons
            name={icon as any}
            size={24}
            color="white"
            style={variant === 'danger' ? { transform: [{ rotate: '135deg' }] } : undefined}
          />
        </Box>
        <Text color="$white" fontSize="$xs" mt="$2" fontWeight="$medium">
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

        {/* Main call content */}
        {isVideoCall ? renderVideoCall() : renderAudioCall()}

        {/* Call controls */}
        {showControls && (
          <Animated.View
            style={[
              styles.controlsContainer,
              { opacity: controlsOpacity }
            ]}
          >
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.8)', 'rgba(0,0,0,0.9)']}
              style={styles.controlsGradient}
            >
              <Box px="$6" py="$8">
                <HStack justifyContent="space-around" alignItems="center">
                  <ControlButton
                    icon={isMuted ? 'mic-off' : 'mic'}
                    label={isMuted ? 'Unmute' : 'Mute'}
                    isActive={isMuted}
                    onPress={toggleMute}
                  />

                  {isVideoCall && (
                    <ControlButton
                      icon={isCameraOff ? 'videocam-off' : 'videocam'}
                      label={isCameraOff ? 'Camera' : 'Camera'}
                      isActive={isCameraOff}
                      onPress={toggleCamera}
                    />
                  )}

                  {isVideoCall && !isCameraOff && (
                    <ControlButton
                      icon="camera-reverse"
                      label="Flip"
                      onPress={switchCamera}
                    />
                  )}

                  {!isVideoCall && (
                    <ControlButton
                      icon={isSpeakerOn ? 'volume-high' : 'volume-medium'}
                      label={isSpeakerOn ? 'Speaker' : 'Speaker'}
                      isActive={isSpeakerOn}
                      variant={isSpeakerOn ? 'primary' : 'secondary'}
                      onPress={toggleSpeaker}
                    />
                  )}

                  <ControlButton
                    icon="call"
                    label="End"
                    onPress={handleEndCall}
                    variant="danger"
                  />
                </HStack>
              </Box>
            </LinearGradient>
          </Animated.View>
        )}
      </SafeAreaView>
    </Animated.View>
  );
};

// Main CallScreen Component
const CallScreen: React.FC<CallScreenProps> = ({
  chatId,
  userId,
  userName,
  userAvatar,
  isVideoCall,
  onEndCall,
  meetingId: propMeetingId,
  token: propToken,
}) => {
  const [meetingId, setMeetingId] = useState<string | null>(propMeetingId || null);
  const [token, setToken] = useState<string | null>(propToken || null);
  const [loading, setLoading] = useState(!propMeetingId || !propToken);
  const [meetingConfig, setMeetingConfig] = useState<any>(null);
  const [configLoading, setConfigLoading] = useState(false);

  useEffect(() => {
    // If meeting ID and token are provided via props, use them directly
    if (propMeetingId && propToken) {
      console.log('✅ Using provided meeting ID and token:', propMeetingId);
      setMeetingId(propMeetingId);
      setToken(propToken);
      setLoading(false);
      return;
    }

    // If no meeting ID/token provided, we can't start the call
    console.error('❌ No meeting ID or token provided for call');
    Alert.alert('Call Error', 'Missing call information. Please try again.');
    onEndCall();
  }, [chatId, propMeetingId, propToken, onEndCall]);

  // Initialize meeting config when meetingId is available
  useEffect(() => {
    const initializeMeetingConfig = async () => {
      if (!meetingId) return;
      
      try {
        setConfigLoading(true);
        const config = await videoSDKService.getMeetingConfig(meetingId, 'You');
        setMeetingConfig(config);
      } catch (error) {
        console.error('Failed to initialize meeting config:', error);
        Alert.alert('Call Error', 'Failed to initialize call. Please try again.');
        onEndCall();
      } finally {
        setConfigLoading(false);
      }
    };

    initializeMeetingConfig();
  }, [meetingId, onEndCall]);

  if (loading || !meetingId || !token || configLoading || !meetingConfig) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Center flex={1}>
          <Text color="$white" fontSize="$lg">Connecting...</Text>
        </Center>
      </SafeAreaView>
    );
  }

  return (
    <MeetingProvider
      config={meetingConfig}
      token={token}
    >
      <VideoCallMeeting
        userName={userName}
        userAvatar={userAvatar}
        isVideoCall={isVideoCall}
        onEndCall={onEndCall}
        chatId={chatId}
        meetingId={meetingId}
      />
    </MeetingProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
  fullScreenVideo: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  localVideo: {
    width: 100,
    height: 140,
  },
  localVideoContainer: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  audioAvatar: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  controlButton: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  controlsGradient: {
    paddingTop: 40,
  },
});

export default CallScreen;
