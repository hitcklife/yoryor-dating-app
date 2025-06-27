import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
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
} from '@gluestack-ui/themed';
import { useColorScheme } from 'nativewind';
import { agoraService } from '@/services/agora-service';
import RtcEngine, {
  RtcLocalView,
  RtcRemoteView,
  VideoRenderMode,
} from 'react-native-agora';

interface CallScreenProps {
  chatId: number;
  userId: number;
  userName: string;
  userAvatar: string;
  isVideoCall: boolean;
  onEndCall: () => void;
}

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
  const [joined, setJoined] = useState(false);
  const [remoteUid, setRemoteUid] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [callStatus, setCallStatus] = useState<'connecting' | 'connected' | 'ended'>('connecting');

  useEffect(() => {
    // Initialize Agora service and join channel
    const initializeCall = async () => {
      try {
        // Initialize Agora engine
        await agoraService.initialize();

        // Set up event listeners
        agoraService.onJoinSuccess((uid) => {
          console.log('Successfully joined channel with UID:', uid);
          setJoined(true);
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
          // Optionally end the call automatically when remote user leaves
          // handleEndCall();
        });

        agoraService.onError((err) => {
          console.error('Agora error:', err);
          // Handle error appropriately
        });

        // Join the channel
        // Using chatId as the channel name (convert to string)
        await agoraService.joinChannel(`chat_${chatId}`);

        // If it's an audio call, disable video
        if (!isVideoCall) {
          await agoraService.toggleVideo(false);
          setIsCameraOff(true);
        }
      } catch (error) {
        console.error('Failed to initialize call:', error);
        // Handle error, maybe show an alert and end call
        handleEndCall();
      }
    };

    initializeCall();

    // Cleanup when component unmounts
    return () => {
      handleEndCall();
    };
  }, []);

  const handleEndCall = async () => {
    try {
      await agoraService.leaveChannel();
      setCallStatus('ended');
      onEndCall();
    } catch (error) {
      console.error('Error ending call:', error);
      onEndCall(); // Still call onEndCall even if there's an error
    }
  };

  const toggleMute = async () => {
    try {
      await agoraService.toggleAudio(isMuted);
      setIsMuted(!isMuted);
    } catch (error) {
      console.error('Error toggling mute:', error);
    }
  };

  const toggleSpeaker = async () => {
    try {
      if (agoraService.engine) {
        await agoraService.engine.setEnableSpeakerphone(!isSpeakerOn);
        setIsSpeakerOn(!isSpeakerOn);
      }
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

  // Render different UI based on call type and status
  const renderCallContent = () => {
    if (isVideoCall && !isCameraOff) {
      return (
        <Box flex={1}>
          {/* Remote user's video (if connected) */}
          {remoteUid ? (
            <RtcRemoteView.SurfaceView
              uid={remoteUid}
              style={styles.fullScreenVideo}
              renderMode={VideoRenderMode.Hidden}
            />
          ) : (
            <Box
              flex={1}
              bg={isDark ? '$backgroundDark900' : '$backgroundLight100'}
              justifyContent="center"
              alignItems="center"
            >
              <Avatar size="2xl">
                <AvatarImage source={{ uri: userAvatar }} alt={userName} />
              </Avatar>
              <Text
                color={isDark ? '$textDark100' : '$textLight900'}
                fontSize="$xl"
                fontWeight="$semibold"
                mt="$4"
              >
                {callStatus === 'connecting' ? 'Connecting...' : `Calling ${userName}...`}
              </Text>
            </Box>
          )}

          {/* Local user's video (picture-in-picture) */}
          {joined && (
            <View style={styles.localVideoContainer}>
              <RtcLocalView.SurfaceView
                style={styles.localVideo}
                renderMode={VideoRenderMode.Hidden}
              />
            </View>
          )}
        </Box>
      );
    } else {
      // Audio call or video call with camera off
      return (
        <Box
          flex={1}
          bg={isDark ? '$backgroundDark900' : '$backgroundLight100'}
          justifyContent="center"
          alignItems="center"
        >
          <Avatar size="2xl">
            <AvatarImage source={{ uri: userAvatar }} alt={userName} />
          </Avatar>
          <Text
            color={isDark ? '$textDark100' : '$textLight900'}
            fontSize="$xl"
            fontWeight="$semibold"
            mt="$4"
          >
            {userName}
          </Text>
          <Text
            color={isDark ? '$textDark300' : '$textLight500'}
            fontSize="$md"
            mt="$2"
          >
            {callStatus === 'connecting'
              ? 'Connecting...'
              : callStatus === 'connected'
              ? remoteUid
                ? 'Connected'
                : 'Ringing...'
              : 'Call ended'}
          </Text>
        </Box>
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Main call content */}
      {renderCallContent()}

      {/* Call controls */}
      <Box
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        bg={isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.5)'}
        p="$4"
        borderTopLeftRadius="$2xl"
        borderTopRightRadius="$2xl"
        backdropFilter="blur(10px)"
      >
        <HStack justifyContent="space-around" alignItems="center">
          <TouchableOpacity onPress={toggleMute} style={styles.iconButton}>
            <Box
              bg={isMuted ? '$error500' : 'rgba(255, 255, 255, 0.2)'}
              borderRadius="$full"
              p="$4"
            >
              <Ionicons
                name={isMuted ? 'mic-off' : 'mic'}
                size={24}
                color={isMuted ? 'white' : isDark ? 'white' : 'black'}
              />
            </Box>
            <Text
              color={isDark ? '$textDark100' : '$textLight900'}
              fontSize="$xs"
              mt="$1"
            >
              {isMuted ? 'Unmute' : 'Mute'}
            </Text>
          </TouchableOpacity>

          {isVideoCall && (
            <TouchableOpacity onPress={toggleCamera} style={styles.iconButton}>
              <Box
                bg={isCameraOff ? '$error500' : 'rgba(255, 255, 255, 0.2)'}
                borderRadius="$full"
                p="$4"
              >
                <Ionicons
                  name={isCameraOff ? 'videocam-off' : 'videocam'}
                  size={24}
                  color={isCameraOff ? 'white' : isDark ? 'white' : 'black'}
                />
              </Box>
              <Text
                color={isDark ? '$textDark100' : '$textLight900'}
                fontSize="$xs"
                mt="$1"
              >
                {isCameraOff ? 'Camera On' : 'Camera Off'}
              </Text>
            </TouchableOpacity>
          )}

          {isVideoCall && !isCameraOff && (
            <TouchableOpacity onPress={switchCamera} style={styles.iconButton}>
              <Box
                bg="rgba(255, 255, 255, 0.2)"
                borderRadius="$full"
                p="$4"
              >
                <Ionicons
                  name="camera-reverse"
                  size={24}
                  color={isDark ? 'white' : 'black'}
                />
              </Box>
              <Text
                color={isDark ? '$textDark100' : '$textLight900'}
                fontSize="$xs"
                mt="$1"
              >
                Flip
              </Text>
            </TouchableOpacity>
          )}

          {!isVideoCall && (
            <TouchableOpacity onPress={toggleSpeaker} style={styles.iconButton}>
              <Box
                bg={isSpeakerOn ? '$primary500' : 'rgba(255, 255, 255, 0.2)'}
                borderRadius="$full"
                p="$4"
              >
                <Ionicons
                  name={isSpeakerOn ? 'volume-high' : 'volume-medium'}
                  size={24}
                  color={isSpeakerOn ? 'white' : isDark ? 'white' : 'black'}
                />
              </Box>
              <Text
                color={isDark ? '$textDark100' : '$textLight900'}
                fontSize="$xs"
                mt="$1"
              >
                {isSpeakerOn ? 'Speaker Off' : 'Speaker On'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={handleEndCall} style={styles.iconButton}>
            <Box
              bg="$error500"
              borderRadius="$full"
              p="$4"
            >
              <Ionicons name="call" size={24} color="white" style={{ transform: [{ rotate: '135deg' }] }} />
            </Box>
            <Text
              color={isDark ? '$textDark100' : '$textLight900'}
              fontSize="$xs"
              mt="$1"
            >
              End
            </Text>
          </TouchableOpacity>
        </HStack>
      </Box>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'black',
  },
  fullScreenVideo: {
    flex: 1,
  },
  localVideoContainer: {
    position: 'absolute',
    top: 80,
    right: 20,
    width: 100,
    height: 150,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'white',
  },
  localVideo: {
    flex: 1,
  },
  iconButton: {
    alignItems: 'center',
  },
});

export default CallScreen;
