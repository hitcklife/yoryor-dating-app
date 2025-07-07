import React from 'react';
import { Pressable } from 'react-native';
import { Box, Text, HStack, VStack, Badge, BadgeText } from '@gluestack-ui/themed';
import { Ionicons } from '@expo/vector-icons';
import { Message } from '@/services/chats-service';

interface CallMessageItemProps {
  message: Message;
  isMine: boolean;
  formatMessageTime: (timestamp: string) => string;
  onJoinCall?: (callData: any) => void;
}

const CallMessageItem: React.FC<CallMessageItemProps> = ({
  message,
  isMine,
  formatMessageTime,
  onJoinCall,
}) => {
  // Extract call details from media_data
  const callData = message.media_data;
  const callType = callData?.call_type || 'voice';
  const callStatus = callData?.call_status || 'unknown';
  const duration = callData?.duration || 0;
  const endedReason = callData?.ended_reason;

  // Determine call status and styling
  const getCallStatusInfo = () => {
    switch (callStatus) {
      case 'outgoing':
        return {
          icon: 'call-outline',
          color: '#8B5CF6',
          bgColor: isMine ? '#F3E8FF' : '#F9FAFB',
          text: 'Outgoing Call',
          status: 'outgoing'
        };
      case 'incoming':
        return {
          icon: 'call-outline',
          color: '#10B981',
          bgColor: isMine ? '#ECFDF5' : '#F9FAFB',
          text: 'Incoming Call',
          status: 'incoming'
        };
      case 'completed':
        return {
          icon: 'checkmark-circle',
          color: '#059669',
          bgColor: isMine ? '#D1FAE5' : '#F0FDF4',
          text: 'Call Completed',
          status: 'completed'
        };
      case 'missed':
        return {
          icon: 'close-circle',
          color: '#DC2626',
          bgColor: isMine ? '#FEE2E2' : '#FEF2F2',
          text: 'Missed Call',
          status: 'missed'
        };
      case 'rejected':
        return {
          icon: 'close-circle',
          color: '#EA580C',
          bgColor: isMine ? '#FED7AA' : '#FFF7ED',
          text: 'Call Declined',
          status: 'rejected'
        };
      case 'ongoing':
        return {
          icon: 'radio-button-on',
          color: '#16A34A',
          bgColor: isMine ? '#DCFCE7' : '#F0FDF4',
          text: 'Ongoing Call',
          status: 'ongoing'
        };
      default:
        return {
          icon: 'call-outline',
          color: '#6B7280',
          bgColor: isMine ? '#F3F4F6' : '#F9FAFB',
          text: 'Call',
          status: 'unknown'
        };
    }
  };

  const statusInfo = getCallStatusInfo();
  const isVideoCall = callType === 'video';
  const callIcon = isVideoCall ? 'videocam' : 'call';

  // Check if this call can be joined (outgoing call that's not completed or ongoing)
  const canJoinCall = !isMine && callStatus === 'outgoing' && callStatus !== 'completed' && callStatus !== 'ongoing';

  // Format duration
  const formatDuration = (seconds: number) => {
    if (seconds === 0) return '';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handlePress = () => {
    if (canJoinCall && onJoinCall) {
      onJoinCall({
        callId: callData?.call_id,
        meetingId: callData?.meeting_id,
        token: callData?.token,
        type: callType,
        messageId: message.id
      });
    }
  };

  return (
    <Pressable onPress={handlePress}>
      <Box
        maxWidth="80%"
        bg={statusInfo.bgColor}
        borderRadius="$2xl"
        p="$3"
        mb="$2"
        alignSelf={isMine ? "flex-end" : "flex-start"}
        borderTopRightRadius={isMine ? "$none" : "$2xl"}
        borderTopLeftRadius={isMine ? "$2xl" : "$none"}
        borderWidth={1}
        borderColor={isMine ? statusInfo.color + '20' : '#E5E7EB'}
        opacity={canJoinCall ? 1 : 0.8}
      >
        <VStack space="sm">
          {/* Call Header */}
          <HStack alignItems="center" space="sm">
            <Box
              bg={statusInfo.color + '20'}
              borderRadius="$full"
              p="$2"
              alignItems="center"
              justifyContent="center"
            >
              <Ionicons
                name={callIcon as any}
                size={20}
                color={statusInfo.color}
              />
            </Box>

            <VStack flex={1}>
              <Text
                color={isMine ? "#1F2937" : "#1F2937"}
                fontSize="$sm"
                fontWeight="$semibold"
              >
                {statusInfo.text}
              </Text>

              <Text
                color={isMine ? "#6B7280" : "#6B7280"}
                fontSize="$xs"
              >
                {isVideoCall ? 'Video Call' : 'Voice Call'}
                {duration > 0 && ` • ${formatDuration(duration)}`}
              </Text>
            </VStack>
          </HStack>

          {/* Call Status Badge */}
          <HStack justifyContent="space-between" alignItems="center">
            <Badge
              size="sm"
              variant="solid"
              action={statusInfo.status === 'completed' ? 'success' :
                     statusInfo.status === 'missed' || statusInfo.status === 'rejected' ? 'error' :
                     'info'}
            >
              <BadgeText fontSize="$xs">
                {statusInfo.status === 'completed' ? '✓ Completed' :
                 statusInfo.status === 'missed' ? '✗ Missed' :
                 statusInfo.status === 'rejected' ? '✗ Declined' :
                 statusInfo.status === 'outgoing' ? (canJoinCall ? '📞 Tap to Join' : '↗ Outgoing') :
                 statusInfo.status === 'incoming' ? '↙ Incoming' :
                 statusInfo.status === 'unknown' ? '? Unknown' : ''}
              </BadgeText>
            </Badge>

            <Text
              color={isMine ? "#6B7280" : "#6B7280"}
              fontSize="$xs"
            >
              {formatMessageTime(message.sent_at)}
            </Text>
          </HStack>

          {/* Call Details */}
          {endedReason && endedReason !== 'completed' && (
            <Text
              color={isMine ? "#6B7280" : "#6B7280"}
              fontSize="$xs"
              fontStyle="italic"
            >
              Reason: {endedReason}
            </Text>
          )}
        </VStack>
      </Box>
    </Pressable>
  );
};

export default CallMessageItem;
