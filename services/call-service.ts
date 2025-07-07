import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from './api-client';
import { webSocketService } from './websocket-service';

export interface CallData {
  callId: number;
  meetingId: string;
  token: string;
  messageId: number;
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

export interface CallJoinData {
  callId: number;
  meetingId: string;
  token: string;
  messageId: number;
  type: 'video' | 'voice';
}

export interface CallEndData {
  callId: number;
  duration: number;
  formattedDuration: string;
  messageId: number;
}

export interface CallRejectData {
  callId: number;
  messageId: number;
}

export interface CallMessageFilters {
  page?: number;
  perPage?: number;
  callType?: 'video' | 'voice';
  callStatus?: 'completed' | 'rejected' | 'missed' | 'ongoing';
}

export interface CallDetails {
  callId: number;
  type: 'video' | 'voice';
  status: 'initiated' | 'ongoing' | 'completed' | 'missed' | 'rejected';
  durationSeconds: number;
  formattedDuration: string;
  startedAt?: Date | null;
  endedAt?: Date | null;
  isActive: boolean;
  otherParticipant?: any;
}

export interface CallMessage {
  id: number;
  chatId: number;
  senderId: number;
  content: string;
  messageType: string;
  mediaUrl?: string;
  mediaData?: any;
  sentAt: Date;
  isRead: boolean;
  readAt?: Date | null;
  isMine: boolean;
  sender: any;
  replyTo?: any;
  callDetails: CallDetails;
}

export interface CallStatistics {
  totalCalls: number;
  totalDuration: number;
  videoCalls: number;
  voiceCalls: number;
  completedCalls: number;
  missedCalls: number;
  rejectedCalls: number;
}

class CallService {
  private currentCallId: number | null = null;
  private currentMeetingId: string | null = null;
  private isCallActive: boolean = false;

  /**
   * Initiate a video or voice call
   */
  async initiateCall(recipientId: number, callType: 'video' | 'voice'): Promise<CallData> {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No auth token found');
      }

      const response = await apiClient.post('/api/v1/video-call/initiate', {
        recipient_id: recipientId,
        call_type: callType
      });

      if (response.status === 'success' && response.data) {
        const callData: CallData = {
          callId: response.data.call_id,
          meetingId: response.data.meeting_id,
          token: response.data.token,
          messageId: response.data.message_id,
          type: response.data.type,
          caller: response.data.caller,
          receiver: response.data.receiver
        };

        // Store current call info
        this.currentCallId = callData.callId;
        this.currentMeetingId = callData.meetingId;
        this.isCallActive = true;

        // Notify via WebSocket if available
        this.notifyCallInitiated(callData);

        return callData;
      }

      throw new Error(response.message || 'Failed to initiate call');
    } catch (error) {
      console.error('Call initiation failed:', error);
      throw error;
    }
  }

  /**
   * Join an existing call
   */
  async joinCall(callId: number): Promise<CallJoinData> {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No auth token found');
      }

      const response = await apiClient.post(`/api/v1/video-call/${callId}/join`);

      if (response.status === 'success' && response.data) {
        const joinData: CallJoinData = {
          callId: response.data.call_id,
          meetingId: response.data.meeting_id,
          token: response.data.token,
          messageId: response.data.message_id,
          type: response.data.type
        };

        // Store current call info
        this.currentCallId = joinData.callId;
        this.currentMeetingId = joinData.meetingId;
        this.isCallActive = true;

        // Notify via WebSocket if available
        this.notifyCallJoined(joinData);

        return joinData;
      }

      throw new Error(response.message || 'Failed to join call');
    } catch (error) {
      console.error('Call join failed:', error);
      throw error;
    }
  }

  /**
   * End an active call
   */
  async endCall(callId: number): Promise<CallEndData> {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No auth token found');
      }

      const response = await apiClient.post(`/api/v1/video-call/${callId}/end`);

      if (response.status === 'success' && response.data) {
        const endData: CallEndData = {
          callId: response.data.call_id,
          duration: response.data.duration,
          formattedDuration: response.data.formatted_duration,
          messageId: response.data.message_id
        };

        // Clear current call info
        this.currentCallId = null;
        this.currentMeetingId = null;
        this.isCallActive = false;

        // Notify via WebSocket if available
        this.notifyCallEnded(endData);

        return endData;
      }

      throw new Error(response.message || 'Failed to end call');
    } catch (error) {
      console.error('Call end failed:', error);
      throw error;
    }
  }

  /**
   * Reject an incoming call
   */
  async rejectCall(callId: number): Promise<CallRejectData> {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No auth token found');
      }

      const response = await apiClient.post(`/api/v1/video-call/${callId}/reject`);

      if (response.status === 'success' && response.data) {
        const rejectData: CallRejectData = {
          callId: response.data.call_id,
          messageId: response.data.message_id
        };

        // Clear current call info
        this.currentCallId = null;
        this.currentMeetingId = null;
        this.isCallActive = false;

        // Notify via WebSocket if available
        this.notifyCallRejected(rejectData);

        return rejectData;
      }

      throw new Error(response.message || 'Failed to reject call');
    } catch (error) {
      console.error('Call rejection failed:', error);
      throw error;
    }
  }

  /**
   * Get call messages for a specific chat
   */
  async getCallMessages(chatId: number, filters?: CallMessageFilters): Promise<{
    callMessages: CallMessage[];
    pagination: any;
  }> {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No auth token found');
      }

      const queryParams = new URLSearchParams({
        page: (filters?.page || 1).toString(),
        per_page: (filters?.perPage || 20).toString(),
        ...(filters?.callType && { call_type: filters.callType }),
        ...(filters?.callStatus && { call_status: filters.callStatus })
      });

      const response = await apiClient.get(`/api/v1/chats/${chatId}/call-messages?${queryParams}`);

      if (response.status === 'success' && response.data) {
        return {
          callMessages: response.data.call_messages.map(this.transformCallMessage),
          pagination: response.data.pagination
        };
      }

      throw new Error(response.message || 'Failed to get call messages');
    } catch (error) {
      console.error('Get call messages failed:', error);
      throw error;
    }
  }

  /**
   * Get call statistics for a specific chat
   */
  async getCallStatistics(chatId: number): Promise<CallStatistics> {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No auth token found');
      }

      const response = await apiClient.get(`/api/v1/chats/${chatId}/call-statistics`);

      if (response.status === 'success' && response.data) {
        return response.data;
      }

      throw new Error(response.message || 'Failed to get call statistics');
    } catch (error) {
      console.error('Get call statistics failed:', error);
      throw error;
    }
  }

  /**
   * Check if there's an active call
   */
  isCallInProgress(): boolean {
    return this.isCallActive;
  }

  /**
   * Get current call information
   */
  getCurrentCallInfo(): { callId: number | null; meetingId: string | null } {
    return {
      callId: this.currentCallId,
      meetingId: this.currentMeetingId
    };
  }

  /**
   * Clear current call state (used for cleanup)
   */
  clearCallState(): void {
    this.currentCallId = null;
    this.currentMeetingId = null;
    this.isCallActive = false;
  }

  /**
   * Transform call message from API response
   */
  private transformCallMessage(message: any): CallMessage {
    return {
      id: message.id,
      chatId: message.chat_id,
      senderId: message.sender_id,
      content: message.content,
      messageType: message.message_type,
      mediaUrl: message.media_url,
      mediaData: message.media_data,
      sentAt: new Date(message.sent_at),
      isRead: message.is_read,
      readAt: message.read_at ? new Date(message.read_at) : null,
      isMine: message.is_mine,
      sender: message.sender,
      replyTo: message.reply_to,
      callDetails: {
        callId: message.call_details.call_id,
        type: message.call_details.type,
        status: message.call_details.status,
        durationSeconds: message.call_details.duration_seconds,
        formattedDuration: message.call_details.formatted_duration,
        startedAt: message.call_details.started_at ? new Date(message.call_details.started_at) : null,
        endedAt: message.call_details.ended_at ? new Date(message.call_details.ended_at) : null,
        isActive: message.call_details.is_active,
        otherParticipant: message.call_details.other_participant
      }
    };
  }

  /**
   * Notify call initiated via WebSocket
   */
  private notifyCallInitiated(callData: CallData): void {
    try {
      // You can implement WebSocket notification here if needed
      console.log('Call initiated:', callData);
    } catch (error) {
      console.error('Error notifying call initiated:', error);
    }
  }

  /**
   * Notify call joined via WebSocket
   */
  private notifyCallJoined(joinData: CallJoinData): void {
    try {
      // You can implement WebSocket notification here if needed
      console.log('Call joined:', joinData);
    } catch (error) {
      console.error('Error notifying call joined:', error);
    }
  }

  /**
   * Notify call ended via WebSocket
   */
  private notifyCallEnded(endData: CallEndData): void {
    try {
      // You can implement WebSocket notification here if needed
      console.log('Call ended:', endData);
    } catch (error) {
      console.error('Error notifying call ended:', error);
    }
  }

  /**
   * Notify call rejected via WebSocket
   */
  private notifyCallRejected(rejectData: CallRejectData): void {
    try {
      // You can implement WebSocket notification here if needed
      console.log('Call rejected:', rejectData);
    } catch (error) {
      console.error('Error notifying call rejected:', error);
    }
  }
}

export const callService = new CallService(); 