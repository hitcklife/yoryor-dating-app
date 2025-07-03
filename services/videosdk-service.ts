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
   * Get token from backend API or return test token
   */
  private async getTokenInternal(): Promise<string> {
    try {
      // First try to get from cache
      const token = await AsyncStorage.getItem('videosdk_token');
      const tokenExpiry = await AsyncStorage.getItem('videosdk_token_expiry');
      
      // Check if token is still valid (not expired)
      if (token && tokenExpiry) {
        const expiryTime = parseInt(tokenExpiry);
        const currentTime = Math.floor(Date.now() / 1000);
        
        // If token is still valid for at least 10 minutes
        if (expiryTime - currentTime > 600) {
          console.log('Using cached VideoSDK token');
          return token;
        }
      }

      // Try to get fresh token from backend
      try {
        console.log('Fetching fresh VideoSDK token from backend...');
        const response = await apiClient.videoCall.getToken();
        
        if (response.status === 'success' && response.data?.token) {
          const newToken = response.data.token;
          const expiryTime = response.data.expires_at || (Math.floor(Date.now() / 1000) + 3600); // Default 1 hour
          
          await AsyncStorage.setItem('videosdk_token', newToken);
          await AsyncStorage.setItem('videosdk_token_expiry', expiryTime.toString());
          
          console.log('✅ Fresh VideoSDK token obtained from backend');
          return newToken;
        }
      } catch (apiError) {
        console.warn('Backend token request failed:', apiError);
      }

      // Fallback: Generate token using VideoSDK API
      console.log('🔄 Generating VideoSDK token using API...');
      return await this.generateTokenFromAPI();
      
    } catch (error) {
      console.error('Error getting VideoSDK token:', error);
      throw error;
    }
  }

  /**
   * Generate token directly from VideoSDK API as fallback
   */
  private async generateTokenFromAPI(): Promise<string> {
    try {
      // This should be your VideoSDK API key - move to config
      const apiKey = '56dcf49e-1a01-452c-9b0d-f0ce1ec6f5b8'; // Move this to environment variables
      
      const response = await fetch('https://api.videosdk.live/v2/api-keys/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apikey: apiKey,
          permissions: ['allow_join', 'allow_mod'],
        }),
      });

      if (!response.ok) {
        throw new Error(`VideoSDK API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.token) {
        const expiryTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
        await AsyncStorage.setItem('videosdk_token', data.token);
        await AsyncStorage.setItem('videosdk_token_expiry', expiryTime.toString());
        
        console.log('✅ VideoSDK token generated successfully');
        return data.token;
      }

      throw new Error('No token received from VideoSDK API');
    } catch (error) {
      console.error('Error generating VideoSDK token:', error);
      
      // Last resort: use the test token provided by user (only for development)
      console.warn('⚠️ Using test token for development (update with production token)');
      const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcGlrZXkiOiI1NmRjZjQ5ZS0xYTAxLTQ1MmMtOWIwZC1mMGNlMWVjNmY1YjgiLCJwZXJtaXNzaW9ucyI6WyJhbGxvd19qb2luIl0sImlhdCI6MTc1MTQ0MTUwMSwiZXhwIjoxNzU0MDMzNTAxfQ.hiPXMATEPz0uVTpsDMdnIyhE7a4zpk0I3X6pGPOLPg4';
      
      // Cache the test token temporarily
      const expiryTime = Math.floor(Date.now() / 1000) + 3600;
      await AsyncStorage.setItem('videosdk_token', testToken);
      await AsyncStorage.setItem('videosdk_token_expiry', expiryTime.toString());
      
      return testToken;
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

      console.log('🚀 Creating new meeting...');
      const response = await fetch('https://api.videosdk.live/v2/rooms', {
        method: 'POST',
        headers: {
          authorization: this.token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          region: 'sg001', // Singapore region for better performance
          autoCloseConfig: {
            type: 'TIMER',
            duration: 30, // Auto-close after 30 minutes
          },
          permissions: {
            canToggleOtherMics: false,
            canToggleOtherCameras: false,
            canRemoveOtherParticipants: false,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('VideoSDK API error:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const { roomId: meetingId } = await response.json();
      console.log('✅ Meeting created with ID:', meetingId);
      return meetingId;
    } catch (error) {
      console.error('Error creating meeting:', error);
      
      // For development, return a test meeting ID
      const testMeetingId = `test-meeting-${Date.now()}`;
      console.warn('⚠️ Using test meeting ID:', testMeetingId);
      return testMeetingId;
    }
  }

  /**
   * Create a meeting for a specific chat (both participants will get the same meeting ID)
   */
  async createMeetingForChat(chatId: number): Promise<string> {
    try {
      if (!this.token) {
        this.token = await this.getTokenInternal();
      }

      // Use a deterministic custom room ID based on chat ID
      const customRoomId = `chat-${chatId}-meeting`;
      console.log('🏠 Creating meeting with custom room ID:', customRoomId);

      // Create meeting using VideoSDK API with custom room ID
      const response = await fetch('https://api.videosdk.live/v2/rooms', {
        method: 'POST',
        headers: {
          authorization: this.token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customRoomId: customRoomId,
          region: 'sg001',
          autoCloseConfig: {
            type: 'TIMER',
            duration: 30,
          },
          permissions: {
            canToggleOtherMics: false,
            canToggleOtherCameras: false,
            canRemoveOtherParticipants: false,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('VideoSDK API error:', response.status, errorText);
        
        // If room already exists, that's fine - both participants can still join
        if (response.status === 400 && errorText.includes('already exists')) {
          console.log('✅ Meeting already exists, using existing room:', customRoomId);
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
      const fallbackMeetingId = `chat-${chatId}-meeting`;
      console.warn('⚠️ Using fallback meeting ID:', fallbackMeetingId);
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
      participantId: `participant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
   * Refresh token if needed
   */
  async refreshToken(): Promise<string> {
    console.log('🔄 Refreshing VideoSDK token...');
    
    // Clear cached token
    await AsyncStorage.removeItem('videosdk_token');
    await AsyncStorage.removeItem('videosdk_token_expiry');
    
    // Get fresh token
    this.token = await this.getTokenInternal();
    return this.token;
  }

  /**
   * Set meeting instance (to be called from React component using useMeeting)
   */
  setMeetingInstance(meeting: any): void {
    this.meetingInstance = meeting;
    console.log('📱 Meeting instance set in service');
  }

  /**
   * Join meeting (to be called from React component)
   */
  async joinMeeting(meetingId: string): Promise<void> {
    try {
      this.meetingId = meetingId;
      console.log('🚪 Joining meeting:', meetingId);
      
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
        console.log('👋 Leaving meeting...');
        await this.meetingInstance.leave();
        console.log('✅ Left meeting successfully');
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
        console.log(`🎤 Microphone ${this.isAudioEnabled ? 'enabled' : 'disabled'}`);
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
        console.log(`📹 Camera ${this.isVideoEnabled ? 'enabled' : 'disabled'}`);
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
        console.log('🔄 Camera switched');
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
      this.isSpeakerOn = !this.isSpeakerOn;
      console.log(`🔊 Speaker ${this.isSpeakerOn ? 'on' : 'off'}`);
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

    // Clear cached tokens
    await AsyncStorage.removeItem('videosdk_token');
    await AsyncStorage.removeItem('videosdk_token_expiry');

    this.initialized = false;
    console.log('🧹 VideoSDK service destroyed successfully');
  }
}

// Create a singleton instance
export const videoSDKService = new VideoSDKService(); 