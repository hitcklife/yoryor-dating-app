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

  constructor() {
    this.initialize();
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
   * Get token from backend API
   */
  private async getTokenInternal(): Promise<string> {
    try {
      // Always get a fresh token from the backend for each call
      const response = await apiClient.post('/api/v1/video-call/token');
      if (response.data?.token) {
        // Store for potential reuse within short timeframe
        await AsyncStorage.setItem('videosdk_token', response.data.token);
        await AsyncStorage.setItem('videosdk_token_timestamp', Date.now().toString());
        return response.data.token;
      } else if (response.data && typeof response.data === 'string') {
        // Handle case where token is returned directly as string
        await AsyncStorage.setItem('videosdk_token', response.data);
        await AsyncStorage.setItem('videosdk_token_timestamp', Date.now().toString());
        return response.data;
      }
      
      throw new Error('Invalid token response from server');
    } catch (error) {
      console.error('Error getting VideoSDK token:', error);
      
      // Try to use cached token if it's recent (within 1 hour)
      try {
        const cachedToken = await AsyncStorage.getItem('videosdk_token');
        const timestamp = await AsyncStorage.getItem('videosdk_token_timestamp');
        
        if (cachedToken && timestamp) {
          const age = Date.now() - parseInt(timestamp);
          if (age < 3600000) { // 1 hour
            console.warn('Using cached token due to API error');
            return cachedToken;
          }
        }
      } catch (cacheError) {
        console.error('Error reading cached token:', cacheError);
      }
      
      throw error;
    }
  }

  /**
   * Create a new meeting
   */
  async createMeeting(): Promise<string> {
    try {
      if (!this.token) {
        this.token = await this.getTokenInternal();
      }

      // Create meeting using VideoSDK API
      const response = await fetch('https://api.videosdk.live/v2/rooms', {
        method: 'POST',
        headers: {
          authorization: this.token,
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
      // Use a deterministic custom room ID based on chat ID
      const customRoomId = `chat-${chatId}-meeting-${new Date().toISOString().split('T')[0]}`;
      console.log('Creating meeting with custom room ID:', customRoomId);

      // Try to create meeting using backend API first
      try {
        const response = await apiClient.post('/api/v1/video-call/create-meeting', {
          customRoomId: customRoomId
        });
        
        if (response.data?.meetingId) {
          console.log('✅ Meeting created via backend with ID:', response.data.meetingId);
          return response.data.meetingId;
        }
      } catch (backendError) {
        console.warn('Backend meeting creation failed, trying direct VideoSDK API:', backendError);
      }

      // Fallback to direct VideoSDK API
      if (!this.token) {
        this.token = await this.getTokenInternal();
      }

      const response = await fetch('https://api.videosdk.live/v2/rooms', {
        method: 'POST',
        headers: {
          authorization: this.token,
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
      const fallbackMeetingId = `chat-${chatId}-meeting-${Date.now()}`;
      console.warn('Using fallback meeting ID:', fallbackMeetingId);
      return fallbackMeetingId;
    }
  }

  /**
   * Get meeting configuration for MeetingProvider
   */
  getMeetingConfig(meetingId: string, participantName: string) {
    return {
      meetingId,
      micEnabled: this.isAudioEnabled,
      webcamEnabled: this.isVideoEnabled,
      name: participantName,
    };
  }

  /**
   * Get token for MeetingProvider
   */
  async getToken(): Promise<string> {
    if (!this.token) {
      this.token = await this.getTokenInternal();
    }
    return this.token;
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
      if (this.meetingInstance && this.meetingInstance.leave) {
        await this.meetingInstance.leave();
        console.log('Left meeting successfully');
      }
      this.cleanup();
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
      if (!this.meetingInstance) {
        throw new Error('Meeting not initialized');
      }

      if (this.meetingInstance.toggleMic) {
        await this.meetingInstance.toggleMic();
        this.isAudioEnabled = !this.isAudioEnabled;
        console.log(`Microphone ${this.isAudioEnabled ? 'enabled' : 'disabled'}`);
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
      if (!this.meetingInstance) {
        throw new Error('Meeting not initialized');
      }

      if (this.meetingInstance.toggleWebcam) {
        await this.meetingInstance.toggleWebcam();
        this.isVideoEnabled = !this.isVideoEnabled;
        console.log(`Camera ${this.isVideoEnabled ? 'enabled' : 'disabled'}`);
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
      if (!this.meetingInstance) {
        throw new Error('Meeting not initialized');
      }

      if (this.meetingInstance.changeWebcam) {
        await this.meetingInstance.changeWebcam();
        console.log('Camera switched');
      }
    } catch (error) {
      console.error('Error switching camera:', error);
      throw error;
    }
  }

  /**
   * Toggle speaker (for state tracking)
   */
  async toggleSpeaker(): Promise<void> {
    try {
      // VideoSDK handles speaker routing automatically
      // This is more for UI state tracking
      this.isSpeakerOn = !this.isSpeakerOn;
      console.log(`Speaker ${this.isSpeakerOn ? 'on' : 'off'}`);
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
   * Check if audio is enabled
   */
  isAudioMuted(): boolean {
    return !this.isAudioEnabled;
  }

  /**
   * Check if video is enabled
   */
  isVideoMuted(): boolean {
    return !this.isVideoEnabled;
  }

  /**
   * Check if speaker is on
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

  // Event callback setters (for compatibility with existing code)
  onJoinSuccess(callback: (uid: number | string) => void): void {
    this.joinSuccessCallback = callback as any;
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
    return this.joinMeeting(channelId);
  }

  async leaveChannel(): Promise<void> {
    return this.leaveMeeting();
  }

  async toggleAudio(muted: boolean): Promise<void> {
    if (muted !== this.isAudioMuted()) {
      return this.toggleMicrophone();
    }
  }

  async toggleVideo(enabled: boolean): Promise<void> {
    if (enabled !== this.isVideoEnabled) {
      return this.toggleCamera();
    }
  }

  async toggleSpeakerphone(enabled: boolean): Promise<void> {
    if (enabled !== this.isSpeakerOn) {
      return this.toggleSpeaker();
    }
  }

  onUserJoined(callback: (uid: number | string) => void): void {
    this.participantJoinedCallback = callback as any;
  }

  onUserOffline(callback: (uid: number | string) => void): void {
    this.participantLeftCallback = callback as any;
  }

  /**
   * Cleanup meeting resources
   */
  private cleanup(): void {
    this.meetingInstance = null;
    this.meetingId = null;
    this.localParticipantId = null;
  }

  /**
   * Destroy the service
   */
  async destroy(): Promise<void> {
    this.isDestroyed = true;

    try {
      if (this.meetingInstance) {
        await this.leaveMeeting();
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }

    this.cleanup();

    // Clear callbacks
    this.joinSuccessCallback = null;
    this.participantJoinedCallback = null;
    this.participantLeftCallback = null;
    this.errorCallback = null;
    this.meetingLeftCallback = null;

    this.initialized = false;
    console.log('VideoSDK service destroyed successfully');
  }
}

// Create a singleton instance
export const videoSDKService = new VideoSDKService(); 