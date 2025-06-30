import React, { useState, useEffect, useRef } from 'react';
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
import { agoraService } from '@/services/agora-service';
import {
  RtcSurfaceView,
  VideoSourceType,
} from 'react-native-agora';
import { LinearGradient } from 'expo-linear-gradient';

interface CallScreenProps {
  chatId: number;
  userId: number;
  userName: string;
  userAvatar: string;
  isVideoCall: boolean;
  onEndCall: () => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const CallScreen: React.FC<CallScreenProps> = ({
  chatId,
  userId,
  userName,
  userAvatar,
  isVideoCall,
  onEndCall,
}) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Call state
  const [joined, setJoined] = useState(false);
  const [remoteUid, setRemoteUid] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isCameraOff, setIsCameraOff] = useState(!isVideoCall);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [callStatus, setCallStatus] = useState<'connecting' | 'connected' | 'ended'>('connecting');
  const [callDuration, setCallDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [localUid, setLocalUid] = useState<number>(0);

  // Animations
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const controlsOpacity = useRef(new Animated.Value(1)).current;

  // Timer for call duration
  const durationTimer = useRef<any>(null);
  const controlsTimer = useRef<any>(null);

  useEffect(() => {
    requestPermissions();
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (callStatus === 'connected') {
      startCallTimer();
      startAutoHideControls();
    }
  }, [callStatus]);

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const grants = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          PermissionsAndroid.PERMISSIONS.CAMERA,
        ]);

        const audioGranted = grants[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === PermissionsAndroid.RESULTS.GRANTED;
        const cameraGranted = grants[PermissionsAndroid.PERMISSIONS.CAMERA] === PermissionsAndroid.RESULTS.GRANTED;

        if (!audioGranted) {
          Alert.alert('Permission Required', 'Audio permission is required for calls');
          return;
        }

        if (isVideoCall && !cameraGranted) {
          Alert.alert('Permission Required', 'Camera permission is required for video calls');
          return;
        }

        initializeCall();
      } catch (error) {
        console.error('Permission request error:', error);
        Alert.alert('Error', 'Failed to request permissions');
      }
    } else {
      // iOS permissions are handled by Info.plist
      initializeCall();
    }
  };

  const initializeCall = async () => {
    try {
      console.log('Initializing call...');
      await agoraService.initialize();

      agoraService.onJoinSuccess((uid) => {
        console.log('Successfully joined channel with UID:', uid);
        setJoined(true);
        setLocalUid(uid);
        setCallStatus('connected');
      });

      agoraService.onUserJoined((uid) => {
        console.log('Remote user joined with UID:', uid);
        setRemoteUid(uid);
        setCallStatus('connected');
      });

      agoraService.onUserOffline((uid) => {
        console.log('Remote user left:', uid);
        setRemoteUid(null);
      });

      agoraService.onError((err) => {
        console.error('Agora error:', err);
        Alert.alert('Call Error', 'An error occurred during the call');
      });

      // Use a simple test channel name
      const testChannelId = `test-${chatId}`;
      console.log('Joining channel:', testChannelId);

      // Use the updated join method without backend
      await agoraService.joinChannel(testChannelId, userId);

      if (!isVideoCall) {
        await agoraService.toggleVideo(false);
        setIsCameraOff(true);
      }

      startPulseAnimation();
    } catch (error) {
      console.error('Failed to initialize call:', error);
      Alert.alert('Call Failed', 'Failed to start the call. Please try again.');
      handleEndCall();
    }
  };

  const cleanup = () => {
    if (durationTimer.current) {
      clearInterval(durationTimer.current);
    }
    if (controlsTimer.current) {
      clearTimeout(controlsTimer.current);
    }
  };

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
    durationTimer.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const startAutoHideControls = () => {
    if (controlsTimer.current) {
      clearTimeout(controlsTimer.current);
    }

    controlsTimer.current = setTimeout(() => {
      if (isVideoCall && joined) {
        hideControls();
      }
    }, 5000);
  };

  const hideControls = () => {
    Animated.timing(controlsOpacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setShowControls(false));
  };

  const showControlsTemporarily = () => {
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

  const handleEndCall = async () => {
    try {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();

      await agoraService.leaveChannel();
      setCallStatus('ended');
      cleanup();
      setTimeout(onEndCall, 300);
    } catch (error) {
      console.error('Error ending call:', error);
      onEndCall();
    }
  };

  const toggleMute = async () => {
    try {
      await agoraService.toggleAudio(!isMuted);
      setIsMuted(!isMuted);
    } catch (error) {
      console.error('Error toggling mute:', error);
    }
  };

  const toggleSpeaker = async () => {
    try {
      await agoraService.toggleSpeakerphone(!isSpeakerOn);
      setIsSpeakerOn(!isSpeakerOn);
    } catch (error) {
      console.error('Error toggling speaker:', error);
    }
  };

  const toggleCamera = async () => {
    try {
      await agoraService.toggleVideo(isCameraOff);
      setIsCameraOff(!isCameraOff);
    } catch (error) {
      console.error('Error toggling camera:', error);
    }
  };

  const switchCamera = async () => {
    try {
      await agoraService.switchCamera();
      setIsFrontCamera(!isFrontCamera);
    } catch (error) {
      console.error('Error switching camera:', error);
    }
  };

  const renderVideoCall = () => {
    return (
      <Box flex={1} position="relative" bg="$backgroundDark900">
        {/* Remote user's video */}
        {remoteUid ? (
          <Box flex={1}>
            <RtcSurfaceView
              canvas={{
                uid: remoteUid,
                sourceType: VideoSourceType.VideoSourceRemote,
                renderMode: 1, // Hidden mode
              }}
              style={styles.fullScreenVideo}
            />
            <Box
              position="absolute"
              top="$4"
              right="$4"
              bg="rgba(0,0,0,0.6)"
              borderRadius="$md"
              px="$3"
              py="$2"
            >
              <Text color="$white" fontSize="$sm">
                {userName}
              </Text>
            </Box>
          </Box>
        ) : (
          <LinearGradient
            colors={isDark ? ['#1a1a2e', '#16213e', '#0f3460'] : ['#667eea', '#764ba2', '#f093fb']}
            style={styles.fullScreenVideo}
          >
            <Center flex={1}>
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <Avatar size="2xl" borderWidth={4} borderColor="$white">
                  <AvatarImage source={{ uri: userAvatar }} alt={userName} />
                </Avatar>
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
        {joined && !isCameraOff && (
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
            <RtcSurfaceView
              canvas={{
                uid: 0,
                sourceType: VideoSourceType.VideoSourceCamera,
                renderMode: 1, // Hidden mode
              }}
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
        )}

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
            Status: {joined ? 'Connected' : 'Connecting'}
          </Text>
          <Text color="$white" fontSize="$xs">
            Local UID: {localUid}
          </Text>
          <Text color="$white" fontSize="$xs">
            Remote UID: {remoteUid || 'None'}
          </Text>
          <Text color="$white" fontSize="$xs">
            Channel: test-{chatId}
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
              <Avatar size="2xl" borderWidth={6} borderColor="$white" style={styles.audioAvatar}>
                <AvatarImage source={{ uri: userAvatar }} alt={userName} />
              </Avatar>
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
                    ? remoteUid
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
            Channel: test-{chatId} | Local UID: {localUid} | Remote: {remoteUid || 'Waiting...'}
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
