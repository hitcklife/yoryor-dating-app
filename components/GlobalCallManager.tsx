import React, { useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { webSocketService } from '@/services/websocket-service';
import { callService } from '@/services/call-service';
import { getProfilePhotoUrl } from '@/services/chats-service';
import IncomingCallScreen from '@/components/ui/chat/IncomingCallScreen';
import CallScreen from '@/components/ui/chat/CallScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface IncomingCall {
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
}

interface GlobalCallManagerProps {
  children: React.ReactNode;
}

const GlobalCallManager: React.FC<GlobalCallManagerProps> = ({ children }) => {
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [activeCall, setActiveCall] = useState<any>(null);
  const [isVideoCall, setIsVideoCall] = useState(false);
  const [callerName, setCallerName] = useState('');
  const [callerAvatar, setCallerAvatar] = useState('');

  // Ref to track if component is mounted
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    // Set up WebSocket callbacks for incoming calls
    webSocketService.setGlobalCallbacks({
      onIncomingCall: handleIncomingCall,
      onNewMatch: () => {},
      onNewLike: () => {},
      onGeneralNotification: () => {},
      onGlobalUnreadCountUpdate: () => {},
    });

    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleIncomingCall = async (callData: any) => {
    if (!isMounted.current) return;

    console.log('🔔 GlobalCallManager: Received incoming call:', callData);
    console.log('🔔 GlobalCallManager: Current state - incomingCall:', incomingCall);
    console.log('🔔 GlobalCallManager: Current state - activeCall:', activeCall);

    try {
      // Extract call information
      const call: IncomingCall = {
        callId: callData.call_id || callData.id,
        meetingId: callData.meeting_id,
        token: callData.token,
        type: callData.type || 'voice',
        caller: callData.caller || {
          id: callData.caller_id,
          name: callData.caller_name
        },
        receiver: callData.receiver || {
          id: callData.receiver_id,
          name: callData.receiver_name
        }
      };

      // Get caller information for display
      const callerDisplayName = call.caller.name || 'Unknown Caller';
      const callerPhotoUrl = await getProfilePhotoUrl({ 
        id: call.caller.id,
        email: '',
        phone: '',
        google_id: null,
        facebook_id: null,
        email_verified_at: null,
        phone_verified_at: null,
        disabled_at: null,
        registration_completed: false,
        is_admin: false,
        is_private: false,
        profile_photo_path: null,
        last_active_at: new Date().toISOString(),
        deleted_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        two_factor_enabled: false,
        last_login_at: new Date().toISOString(),
        pivot: {
          chat_id: 0,
          user_id: call.caller.id,
          is_muted: false,
          last_read_at: null,
          joined_at: new Date().toISOString(),
          left_at: null,
          role: 'member',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        profile: {
          id: 0,
          user_id: call.caller.id,
          first_name: call.caller.name || 'Unknown',
          last_name: '',
          gender: '',
          date_of_birth: '',
          age: 0,
          city: '',
          state: '',
          province: null,
          country_id: 0,
          latitude: null,
          longitude: null,
          bio: '',
          interests: [],
          looking_for: '',
          profile_views: 0,
          profile_completed_at: new Date().toISOString(),
          status: null,
          occupation: null,
          profession: null,
          country_code: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        profile_photo: null
      });

      if (isMounted.current) {
        console.log('🔔 GlobalCallManager: Setting incoming call state');
        setIncomingCall(call);
        setCallerName(callerDisplayName);
        setCallerAvatar(callerPhotoUrl || 'https://via.placeholder.com/150');
        console.log('🔔 GlobalCallManager: Incoming call state set successfully');
      }
    } catch (error) {
      console.error('Error handling incoming call:', error);
    }
  };

  const handleAcceptCall = async (joinData: any) => {
    if (!incomingCall) return;

    try {
      console.log('Accepting call with join data:', joinData);

      // Set up the active call
      const callInfo = {
        callId: joinData.callId,
        meetingId: joinData.meetingId,
        token: joinData.token,
        type: joinData.type,
        isVideoCall: joinData.type === 'video'
      };

      if (isMounted.current) {
        setActiveCall(callInfo);
        setIsVideoCall(joinData.type === 'video');
        setIncomingCall(null); // Clear incoming call screen
      }
    } catch (error) {
      console.error('Error accepting call:', error);
      Alert.alert('Call Error', 'Failed to accept the call. Please try again.');
    }
  };

  const handleRejectCall = async () => {
    if (!incomingCall) return;

    try {
      console.log('Rejecting call:', incomingCall.callId);
      
      // The call service will handle the API call to reject
      // Just clear the incoming call screen
      if (isMounted.current) {
        setIncomingCall(null);
      }
    } catch (error) {
      console.error('Error rejecting call:', error);
      // Even if there's an error, clear the incoming call screen
      if (isMounted.current) {
        setIncomingCall(null);
      }
    }
  };

  const handleDismissIncomingCall = () => {
    if (isMounted.current) {
      setIncomingCall(null);
    }
  };

  const handleEndActiveCall = async () => {
    if (!activeCall) return;

    try {
      console.log('Ending active call:', activeCall.callId);
      
      // End the call via the call service
      await callService.endCall(activeCall.callId);
      
      if (isMounted.current) {
        setActiveCall(null);
        setIsVideoCall(false);
      }
    } catch (error) {
      console.error('Error ending call:', error);
      // Even if there's an error, clear the active call
      if (isMounted.current) {
        setActiveCall(null);
        setIsVideoCall(false);
      }
    }
  };

  return (
    <>
      {children}

      {/* Incoming Call Screen */}
      {incomingCall && (
        <IncomingCallScreen
          call={incomingCall}
          callerName={callerName}
          callerAvatar={callerAvatar}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
          onDismiss={handleDismissIncomingCall}
        />
      )}

      {/* Active Call Screen */}
      {activeCall && (
        <CallScreen
          chatId={0} // We don't have chat ID in global context
          userId={incomingCall?.caller.id || 0}
          userName={callerName}
          userAvatar={callerAvatar}
          isVideoCall={isVideoCall}
          onEndCall={handleEndActiveCall}
          meetingId={activeCall.meetingId}
          token={activeCall.token}
        />
      )}
    </>
  );
};

export default GlobalCallManager; 