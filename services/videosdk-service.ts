import { Platform } from 'react-native';
import {
  MeetingProvider,
  useMeeting,
  useParticipant,
  MediaStream,
  RTCView,
} from '@videosdk.live/react-native-sdk';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from './api-client';
import { CONFIG } from './config';

export interface VideoSDKConfig {
  token: string;
  meetingId: string;
  participantId: string;
  displayName: string;
  micEnabled: boolean;
  webcamEnabled: boolean;
}

class VideoSDKService {
  private meetingInstance: any = null;
  private initialized: boolean = false;
  private meetingId: string | null = null;
  private localParticipantId: string | null = null;
  private token: string | null = null;
  
  // Event callbacks
  private joinSuccessCallback: ((meetingId: string) => void) | null = null;
  private participantJoinedCallback: ((participant: any) => void) | null = null;
  private participantLeftCallback: ((participant: any) => void) | null = null;
  private errorCallback: ((error: any) => void) | null = null;
  private meetingLeftCallback: (() => void) | null = null;

  // State tracking
  private isAudioEnabled: boolean = true;
  private isVideoEnabled: boolean = true;
  private isSpeakerOn: boolean = true;
  private isDestroyed: boolean = false;

  // Legacy compatibility properties (for Agora service migration)
  private localUid: number = 0;
  private remoteUid: number | null = null;
  private channelId: string | null = null;
  private userJoinedCallback: ((uid: number) => void) | null = null;
  private userOfflineCallback: ((uid: number) => void) | null = null;

  constructor() {
    // Don't initialize automatically - wait for explicit initialization
  }

  /**
   * Initialize Video SDK
   */
  async initialize(): Promise<void> {
    if (this.isDestroyed) {
      console.warn('VideoSDK service is destroyed, cannot initialize');
      return;
    }

    try {
      if (this.initialized) {
        console.log('VideoSDK already initialized');
        return;
      }

      // Get token for VideoSDK
      this.token = await this.getTokenInternal();
      
      this.initialized = true;
      console.log('VideoSDK initialized successfully');
    } catch (error) {
      console.error('Failed to initialize VideoSDK:', error);
      this.initialized = false;
      throw error;
    }
  }

  /**
   * Ensure Video SDK is initialized before use
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Get token from backend API or return test token
   */
  private async getTokenInternal(): Promise<string> {
    try {
      const token = await AsyncStorage.getItem('videosdk_token');
      if (token) {
        return token;
      }

      // Try to get token from backend
      try {
        const response = await apiClient.post('/api/v1/video-call/token');
        if (response.data?.token) {
          await AsyncStorage.setItem('videosdk_token', response.data.token);
          return response.data.token;
        }
      } catch (apiError) {
        console.warn('Backend token request failed:', apiError);
      }

      // Return test token provided by user
      console.warn('Using test token for development');
      return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcGlrZXkiOiI1NmRjZjQ5ZS0xYTAxLTQ1MmMtOWIwZC1mMGNlMWVjNmY1YjgiLCJwZXJtaXNzaW9ucyI6WyJhbGxvd19qb2luIl0sImlhdCI6MTc1MTQ0MTUwMSwiZXhwIjoxNzU0MDMzNTAxfQ.hiPXMATEPz0uVTpsDMdnIyhE7a4zpk0I3X6pGPOLPg4';
    } catch (error) {
      console.error('Error getting VideoSDK token:', error);
      throw error;
    }
  }

  /**
   * Create a new meeting
   */
  async createMeeting(): Promise<string> {
    try {
      await this.ensureInitialized();

      // Create meeting using VideoSDK API
      const response = await fetch('https://api.videosdk.live/v2/rooms', {
        method: 'POST',
        headers: {
          authorization: this.token!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const { roomId: meetingId } = await response.json();
      console.log('Meeting created with ID:', meetingId);
      return meetingId;
    } catch (error) {
      console.error('Error creating meeting:', error);
      
      // For development, return a test meeting ID
      const testMeetingId = `test-meeting-${Date.now()}`;
      console.warn('Using test meeting ID:', testMeetingId);
      return testMeetingId;
    }
  }

  /**
   * Create a meeting for a specific chat (both participants will get the same meeting ID)
   */
  async createMeetingForChat(chatId: number): Promise<string> {
    try {
      await this.ensureInitialized();

      // Use a deterministic custom room ID based on chat ID
      const customRoomId = `chat-${chatId}-meeting`;
      console.log('Creating meeting with custom room ID:', customRoomId);

      // Create meeting using VideoSDK API with custom room ID
      const response = await fetch('https://api.videosdk.live/v2/rooms', {
        method: 'POST',
        headers: {
          authorization: this.token!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customRoomId: customRoomId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('VideoSDK API error:', response.status, errorText);
        
        // If room already exists, that's fine - both participants can still join
        if (response.status === 400 && errorText.includes('already exists')) {
          console.log('Meeting already exists, using existing room:', customRoomId);
          return customRoomId;
        }
        
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const data = await response.json();
      const meetingId = data.roomId || customRoomId;
      console.log('✅ Meeting created/found with ID:', meetingId);
      return meetingId;
    } catch (error) {
      console.error('Error creating meeting for chat:', error);
      
      // Fallback: return the deterministic meeting ID anyway
      // VideoSDK might still allow joining if the room gets created by the first participant
      const fallbackMeetingId = `chat-${chatId}-meeting`;
      console.warn('Using fallback meeting ID:', fallbackMeetingId);
      return fallbackMeetingId;
    }
  }

  /**
   * Get meeting configuration for MeetingProvider
   */
  async getMeetingConfig(meetingId: string, participantName: string) {
    await this.ensureInitialized();
    return {
      meetingId,
      micEnabled: this.isAudioEnabled,
      webcamEnabled: this.isVideoEnabled,
      name: participantName,
      token: this.token,
    };
  }

  /**
   * Get token for MeetingProvider
   */
  async getToken(): Promise<string> {
    await this.ensureInitialized();
    return this.token!;
  }

  /**
   * Set meeting instance (to be called from React component using useMeeting)
   */
  setMeetingInstance(meeting: any): void {
    this.meetingInstance = meeting;
    // Meeting events are handled in the React component using useMeeting hook
    // This is just for tracking state in the service
  }

  /**
   * Join meeting (to be called from React component)
   */
  async joinMeeting(meetingId: string): Promise<void> {
    try {
      this.meetingId = meetingId;
      console.log('Joining meeting:', meetingId);
      
      // The actual join is handled by the useMeeting hook in React component
      // This service method is for coordination and state tracking
      
      if (this.joinSuccessCallback) {
        this.joinSuccessCallback(meetingId);
      }
    } catch (error) {
      console.error('Error joining meeting:', error);
      throw error;
    }
  }

  /**
   * Leave the meeting
   */
  async leaveMeeting(): Promise<void> {
    try {
      if (this.meetingInstance) {
        this.meetingInstance.leave();
      }
      
      this.meetingId = null;
      this.localParticipantId = null;
      
      if (this.meetingLeftCallback) {
        this.meetingLeftCallback();
      }
      
      console.log('Left meeting successfully');
    } catch (error) {
      console.error('Error leaving meeting:', error);
      throw error;
    }
  }

  /**
   * Toggle microphone
   */
  async toggleMicrophone(): Promise<void> {
    try {
      if (this.meetingInstance) {
        if (this.isAudioEnabled) {
          this.meetingInstance.muteMic();
        } else {
          this.meetingInstance.unmuteMic();
        }
        this.isAudioEnabled = !this.isAudioEnabled;
      }
    } catch (error) {
      console.error('Error toggling microphone:', error);
      throw error;
    }
  }

  /**
   * Toggle camera
   */
  async toggleCamera(): Promise<void> {
    try {
      if (this.meetingInstance) {
        if (this.isVideoEnabled) {
          this.meetingInstance.disableWebcam();
        } else {
          this.meetingInstance.enableWebcam();
        }
        this.isVideoEnabled = !this.isVideoEnabled;
      }
    } catch (error) {
      console.error('Error toggling camera:', error);
      throw error;
    }
  }

  /**
   * Switch camera (front/back)
   */
  async switchCamera(): Promise<void> {
    try {
      if (this.meetingInstance) {
        this.meetingInstance.changeWebcam();
      }
    } catch (error) {
      console.error('Error switching camera:', error);
      throw error;
    }
  }

  /**
   * Toggle speaker
   */
  async toggleSpeaker(): Promise<void> {
    try {
      if (this.meetingInstance) {
        this.meetingInstance.setSpeakerOn(!this.isSpeakerOn);
        this.isSpeakerOn = !this.isSpeakerOn;
      }
    } catch (error) {
      console.error('Error toggling speaker:', error);
      throw error;
    }
  }

  /**
   * Get meeting instance
   */
  getMeetingInstance(): any {
    return this.meetingInstance;
  }

  /**
   * Get current meeting ID
   */
  getCurrentMeetingId(): string | null {
    return this.meetingId;
  }

  /**
   * Check if audio is muted
   */
  isAudioMuted(): boolean {
    return !this.isAudioEnabled;
  }

  /**
   * Check if video is disabled
   */
  isVideoMuted(): boolean {
    return !this.isVideoEnabled;
  }

  /**
   * Check if speaker is enabled
   */
  isSpeakerEnabled(): boolean {
    return this.isSpeakerOn;
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.initialized && !this.isDestroyed;
  }

  // Event callback setters
  onJoinSuccess(callback: (uid: number | string) => void): void {
    this.joinSuccessCallback = callback;
  }

  onParticipantJoined(callback: (participant: any) => void): void {
    this.participantJoinedCallback = callback;
  }

  onParticipantLeft(callback: (participant: any) => void): void {
    this.participantLeftCallback = callback;
  }

  onError(callback: (error: any) => void): void {
    this.errorCallback = callback;
  }

  onMeetingLeft(callback: () => void): void {
    this.meetingLeftCallback = callback;
  }

  // Legacy method names for compatibility with Agora service
  async joinChannel(channelId: string, userId: number): Promise<void> {
    this.channelId = channelId;
    this.localUid = userId;
    const meetingId = await this.createMeetingForChat(parseInt(channelId));
    await this.joinMeeting(meetingId);
  }

  async leaveChannel(): Promise<void> {
    await this.leaveMeeting();
    this.channelId = null;
    this.localUid = 0;
    this.remoteUid = null;
  }

  async toggleAudio(muted: boolean): Promise<void> {
    if (muted !== this.isAudioMuted()) {
      await this.toggleMicrophone();
    }
  }

  async toggleVideo(enabled: boolean): Promise<void> {
    if (enabled !== !this.isVideoMuted()) {
      await this.toggleCamera();
    }
  }

  async toggleSpeakerphone(enabled: boolean): Promise<void> {
    if (enabled !== this.isSpeakerEnabled()) {
      await this.toggleSpeaker();
    }
  }

  onUserJoined(callback: (uid: number | string) => void): void {
    this.userJoinedCallback = callback;
  }

  onUserOffline(callback: (uid: number | string) => void): void {
    this.userOfflineCallback = callback;
  }

  // Legacy getters for compatibility
  getLocalUid(): number {
    return this.localUid;
  }

  getRemoteUid(): number | null {
    return this.remoteUid;
  }

  getCurrentChannelId(): string | null {
    return this.channelId;
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    this.meetingInstance = null;
    this.meetingId = null;
    this.localParticipantId = null;
    this.isAudioEnabled = true;
    this.isVideoEnabled = true;
    this.isSpeakerOn = true;
  }

  /**
   * Destroy the service
   */
  async destroy(): Promise<void> {
    try {
      await this.leaveMeeting();
      this.cleanup();
      this.isDestroyed = true;
      this.initialized = false;
      console.log('VideoSDK service destroyed successfully');
    } catch (error) {
      console.error('Error destroying VideoSDK service:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const videoSDKService = new VideoSDKService();
export default VideoSDKService; 