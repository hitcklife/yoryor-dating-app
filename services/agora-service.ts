import { Platform } from 'react-native';
import {
  createAgoraRtcEngine,
  IRtcEngine,
  ChannelProfileType,
  ClientRoleType,
  RtcSurfaceView,
  RtcTextureView,
  VideoSourceType,
  AudioProfile,
  AudioScenario,
  VideoEncoderConfiguration,
  OrientationMode,
  DegradationPreference,
  VideoCodecType,
  AudioCodecType,
} from 'react-native-agora';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_BASE_URL = 'https://incredibly-evident-hornet.ngrok-free.app';
const AGORA_APP_ID = '8fa7c231530146ff8522ececbbe3d7a5';

class AgoraService {
  private engine: IRtcEngine | null = null;
  private initialized: boolean = false;
  private channelId: string | null = null;
  private localUid: number = 0;
  private remoteUid: number | null = null;
  private joinSuccessCallback: ((uid: number) => void) | null = null;
  private userJoinedCallback: ((uid: number) => void) | null = null;
  private userOfflineCallback: ((uid: number) => void) | null = null;
  private errorCallback: ((err: any) => void) | null = null;
  private isAudioEnabled: boolean = true;
  private isVideoEnabled: boolean = true;
  private isDestroyed: boolean = false;

  /**
   * Initialize the Agora RTC Engine with optimized settings
   */
  async initialize(): Promise<void> {
    if (this.isDestroyed) {
      console.warn('Agora service is destroyed, cannot initialize');
      return;
    }

    try {
      if (this.initialized && this.engine) {
        console.log('Agora engine already initialized');
        return;
      }

      // Cleanup any existing engine
      await this.cleanup();

      // Create the Agora engine instance
      this.engine = createAgoraRtcEngine();

      // Initialize with optimized configuration
      this.engine.initialize({
        appId: AGORA_APP_ID,
        logConfig: {
          filePath: '', // Disable file logging to prevent audio device conflicts
          level: 0x0001, // Only log errors
        },
        // Audio-specific optimizations
        audioConfig: {
          sampleRate: 48000,
          channels: 2,
          samplesPerCall: 1024,
        },
      });

      // Configure audio settings to prevent CoreAudio issues
      await this.configureAudioSettings();

      // Configure video settings
      await this.configureVideoSettings();

      // Register event listeners
      this.addListeners();

      this.initialized = true;
      console.log('Agora engine initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Agora engine:', error);
      this.initialized = false;
      throw error;
    }
  }

  /**
   * Configure audio settings to prevent CoreAudio issues
   */
  private async configureAudioSettings(): Promise<void> {
    if (!this.engine) return;

    try {
      // Set audio profile for high quality communication
      this.engine.setAudioProfile(
        AudioProfile.MusicHighQuality, // High quality audio
        AudioScenario.GameStreaming // Optimized for real-time communication
      );

      // Enable audio processing
      this.engine.enableAudio();

      // Set audio recording device (use system default to avoid conflicts)
      if (Platform.OS === 'ios') {
        // iOS-specific audio optimizations
        this.engine.setParameters('{"che.audio.use_remoteio":true}');
        this.engine.setParameters('{"che.audio.ios.category":17}'); // AVAudioSessionCategoryPlayAndRecord
        this.engine.setParameters('{"che.audio.ios.mode":3}'); // AVAudioSessionModeVoiceChat

        // Prevent audio device conflicts
        this.engine.setParameters('{"che.audio.external_device_enable":false}');
        this.engine.setParameters('{"che.audio.ios.bluetooth.a2dp":false}');
      }

      // Set default audio route to speaker for better experience
      this.engine.setDefaultAudioRouteToSpeakerphone(false); // Start with earpiece, user can toggle

      // Enable local audio by default
      this.engine.enableLocalAudio(true);
      this.isAudioEnabled = true;

      console.log('Audio settings configured successfully');
    } catch (error) {
      console.error('Error configuring audio settings:', error);
    }
  }

  /**
   * Configure video settings
   */
  private async configureVideoSettings(): Promise<void> {
    if (!this.engine) return;

    try {
      // Enable video
      this.engine.enableVideo();

      // Set video encoder configuration
      const videoConfig: VideoEncoderConfiguration = {
        dimensions: { width: 640, height: 480 }, // Moderate resolution for better performance
        frameRate: 15, // Balanced frame rate
        bitrate: 400, // Moderate bitrate
        minBitrate: 200,
        orientationMode: OrientationMode.OrientationModeAdaptive,
        degradationPreference: DegradationPreference.MaintainFramerate,
        codecType: VideoCodecType.VideoCodecH264,
      };

      this.engine.setVideoEncoderConfiguration(videoConfig);

      // Enable local video by default
      this.engine.enableLocalVideo(true);
      this.isVideoEnabled = true;

      console.log('Video settings configured successfully');
    } catch (error) {
      console.error('Error configuring video settings:', error);
    }
  }

  /**
   * Add event listeners to the Agora engine
   */
  private addListeners(): void {
    if (!this.engine) return;

    this.engine.registerEventHandler({
      onJoinChannelSuccess: (connection, elapsed) => {
        console.log('Local user joined channel:', connection.channelId, connection.localUid, elapsed);
        this.localUid = connection.localUid!;
        if (this.joinSuccessCallback) {
          this.joinSuccessCallback(connection.localUid!);
        }
      },

      onUserJoined: (connection, remoteUid, elapsed) => {
        console.log('Remote user joined:', remoteUid, elapsed);
        this.remoteUid = remoteUid;
        if (this.userJoinedCallback) {
          this.userJoinedCallback(remoteUid);
        }
      },

      onUserOffline: (connection, remoteUid, reason) => {
        console.log('Remote user left:', remoteUid, reason);
        if (this.remoteUid === remoteUid) {
          this.remoteUid = null;
        }
        if (this.userOfflineCallback) {
          this.userOfflineCallback(remoteUid);
        }
      },

      onError: (err, msg) => {
        console.error('Agora error:', err, msg);
        if (this.errorCallback) {
          this.errorCallback({ code: err, message: msg });
        }
      },

      onWarning: (warn, msg) => {
        console.warn('Agora warning:', warn, msg);
      },

      // Audio device state change handler
      onAudioDeviceStateChanged: (deviceId, deviceType, deviceState) => {
        console.log('Audio device state changed:', deviceId, deviceType, deviceState);
      },

      // Connection state change handler
      onConnectionStateChanged: (connection, state, reason) => {
        console.log('Connection state changed:', state, reason);
        if (state === 5) { // CONNECTION_STATE_FAILED
          console.error('Connection failed, attempting to rejoin...');
          this.handleConnectionFailure();
        }
      },

      // Network quality indicator
      onNetworkQuality: (connection, remoteUid, txQuality, rxQuality) => {
        if (txQuality > 4 || rxQuality > 4) {
          console.warn('Poor network quality detected');
        }
      },
    });
  }

  /**
   * Handle connection failure
   */
  private async handleConnectionFailure(): void {
    try {
      if (this.channelId) {
        console.log('Attempting to rejoin channel after connection failure...');
        await this.leaveChannel();
        // Wait a bit before rejoining
        setTimeout(() => {
          if (this.channelId) {
            this.joinChannel(this.channelId);
          }
        }, 2000);
      }
    } catch (error) {
      console.error('Error handling connection failure:', error);
    }
  }

  /**
   * Join a channel for a call
   */
  async joinChannel(channelId: string, token?: string): Promise<void> {
    try {
      if (!this.initialized || !this.engine) {
        await this.initialize();
      }

      if (!this.engine) {
        throw new Error('Engine not initialized');
      }

      // If no token is provided, try to get one from the server
      if (!token) {
        token = await this.getToken(channelId);
      }

      // Set channel profile for communication
      this.engine.setChannelProfile(ChannelProfileType.ChannelProfileCommunication);

      // Set client role to broadcaster for two-way communication
      this.engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);

      // Join the channel with optimized options
      this.engine.joinChannel(token || '', channelId, 0, {
        publishMicrophoneTrack: this.isAudioEnabled,
        publishCameraTrack: this.isVideoEnabled,
        autoSubscribeAudio: true,
        autoSubscribeVideo: true,
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
      });

      this.channelId = channelId;
      console.log('Joined channel:', channelId);
    } catch (error) {
      console.error('Failed to join channel:', error);
      throw error;
    }
  }

  /**
   * Leave the current channel
   */
  async leaveChannel(): Promise<void> {
    try {
      if (!this.engine) return;

      this.engine.leaveChannel();
      this.channelId = null;
      this.remoteUid = null;
      console.log('Left channel');
    } catch (error) {
      console.error('Failed to leave channel:', error);
      throw error;
    }
  }

  /**
   * Switch between front and back camera
   */
  async switchCamera(): Promise<void> {
    try {
      if (!this.engine) return;
      this.engine.switchCamera();
    } catch (error) {
      console.error('Failed to switch camera:', error);
      throw error;
    }
  }

  /**
   * Toggle local audio (mute/unmute)
   */
  async toggleAudio(muted: boolean): Promise<void> {
    try {
      if (!this.engine) return;

      this.engine.enableLocalAudio(!muted);
      this.engine.muteLocalAudioStream(muted);
      this.isAudioEnabled = !muted;

      console.log(`Audio ${muted ? 'muted' : 'unmuted'}`);
    } catch (error) {
      console.error('Failed to toggle audio:', error);
      throw error;
    }
  }

  /**
   * Toggle local video (enable/disable)
   */
  async toggleVideo(enabled: boolean): Promise<void> {
    try {
      if (!this.engine) return;

      this.engine.enableLocalVideo(enabled);
      this.engine.muteLocalVideoStream(!enabled);
      this.isVideoEnabled = enabled;

      console.log(`Video ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Failed to toggle video:', error);
      throw error;
    }
  }

  /**
   * Toggle speakerphone
   */
  async toggleSpeakerphone(enabled: boolean): Promise<void> {
    try {
      if (!this.engine) return;
      this.engine.setEnableSpeakerphone(enabled);
      console.log(`Speakerphone ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Failed to toggle speakerphone:', error);
      throw error;
    }
  }

  /**
   * Get a token from the server for joining a channel
   */
  private async getToken(channelId: string): Promise<string | null> {
    try {
      const token = await AsyncStorage.getItem('auth_token');

      if (!token) {
        console.error('No auth token found for Agora token request');
        return null;
      }

      const response = await axios.post(
        `${API_BASE_URL}/api/v1/calls/token`,
        {
          channel_id: channelId,
          channel_name: channelId,
          uid: this.localUid.toString()
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
          timeout: 10000, // 10 second timeout
        }
      );

      if (response.data && response.data.status === 'success') {
        return response.data.data.token;
      }

      return null;
    } catch (error) {
      console.error('Failed to get Agora token:', error);
      return null;
    }
  }

  // Callback setters
  onJoinSuccess(callback: (uid: number) => void): void {
    this.joinSuccessCallback = callback;
  }

  onUserJoined(callback: (uid: number) => void): void {
    this.userJoinedCallback = callback;
  }

  onUserOffline(callback: (uid: number) => void): void {
    this.userOfflineCallback = callback;
  }

  onError(callback: (err: any) => void): void {
    this.errorCallback = callback;
  }

  // Getters
  getLocalUid(): number {
    return this.localUid;
  }

  getRemoteUid(): number | null {
    return this.remoteUid;
  }

  getEngine(): IRtcEngine | null {
    return this.engine;
  }

  isInitialized(): boolean {
    return this.initialized && !this.isDestroyed;
  }

  /**
   * Cleanup without destroying
   */
  private async cleanup(): Promise<void> {
    if (this.engine) {
      try {
        // Leave channel if joined
        if (this.channelId) {
          await this.leaveChannel();
        }

        // Disable audio and video
        this.engine.enableLocalAudio(false);
        this.engine.enableLocalVideo(false);
        this.engine.enableAudio(false);
        this.engine.enableVideo(false);

        // Unregister event handlers
        this.engine.unregisterEventHandler();
      } catch (error) {
        console.error('Error during cleanup:', error);
      }
    }
  }

  /**
   * Destroy the Agora engine instance
   */
  async destroy(): Promise<void> {
    this.isDestroyed = true;

    await this.cleanup();

    if (this.engine) {
      try {
        // Release the engine
        this.engine.release();
      } catch (error) {
        console.error('Error releasing engine:', error);
      }
    }

    // Reset state
    this.engine = null;
    this.initialized = false;
    this.channelId = null;
    this.remoteUid = null;
    this.localUid = 0;

    // Clear callbacks
    this.joinSuccessCallback = null;
    this.userJoinedCallback = null;
    this.userOfflineCallback = null;
    this.errorCallback = null;

    console.log('Agora engine destroyed successfully');
  }
}

// Create a singleton instance
export const agoraService = new AgoraService();
