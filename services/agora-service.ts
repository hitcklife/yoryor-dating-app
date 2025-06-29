
import { Platform } from 'react-native';
import {
  createAgoraRtcEngine,
  IRtcEngine,
  ChannelProfileType,
  ClientRoleType,
  RtcSurfaceView,
  RtcTextureView,
  VideoSourceType,
  VideoEncoderConfiguration,
  OrientationMode,
  DegradationPreference,
  VideoCodecType,
  AudioCodecType,
  ChannelMediaOptions,
} from 'react-native-agora';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_BASE_URL = 'https://incredibly-evident-hornet.ngrok-free.app';
const AGORA_APP_ID = "8fa7c231530146ff8522ececbbe3d7a5";

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
   * Initialize the Agora RTC Engine with simplified settings
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

      // Initialize with basic configuration
      this.engine.initialize({
        appId: AGORA_APP_ID,
        logConfig: {
          level: 0x0001, // Only log errors
        },
      });

      // Configure audio settings (simplified)
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
   * Configure audio settings with simplified approach
   */
  private async configureAudioSettings(): Promise<void> {
    if (!this.engine) return;

    try {
      // Use numeric values for audio profile instead of enum
      // AudioProfile values: Default = 0, SpeechStandard = 1, MusicStandard = 2, MusicStandardStereo = 3, MusicHighQuality = 4
      // AudioScenario values: Default = 0, ChatRoom = 1, Education = 2, GameStreaming = 3, ShowRoom = 4, Chatroom = 5
      this.engine.setAudioProfile(2, 3); // MusicStandard profile, GameStreaming scenario

      // Enable audio processing
      this.engine.enableAudio();

      // Set default audio route
      this.engine.setDefaultAudioRouteToSpeakerphone(false);

      // Enable local audio by default
      this.engine.enableLocalAudio(true);
      this.isAudioEnabled = true;

      console.log('Audio settings configured successfully');
    } catch (error) {
      console.error('Error configuring audio settings:', error);
      // Continue without audio profile settings if they fail
    }
  }

  /**
   * Configure video settings with simplified approach
   */
  private async configureVideoSettings(): Promise<void> {
    if (!this.engine) return;

    try {
      // Enable video
      this.engine.enableVideo();

      // Set video encoder configuration with simplified approach
      const videoConfig: VideoEncoderConfiguration = {
        dimensions: { width: 640, height: 480 },
        frameRate: 15,
        bitrate: 400,
        minBitrate: 200,
        orientationMode: OrientationMode.OrientationModeAdaptive,
        degradationPreference: DegradationPreference.MaintainFramerate,
      };

      this.engine.setVideoEncoderConfiguration(videoConfig);

      // Enable local video by default
      this.engine.enableLocalVideo(true);
      this.isVideoEnabled = true;

      console.log('Video settings configured successfully');
    } catch (error) {
      console.error('Error configuring video settings:', error);
      // Continue without video encoder configuration if it fails
    }
  }

  /**
   * Add event listeners to the Agora engine with enhanced debugging
   */
  private addListeners(): void {
    if (!this.engine) return;

    this.engine.registerEventHandler({
      onJoinChannelSuccess: (connection, elapsed) => {
        console.log('✅ JOIN SUCCESS - Local user joined channel:', {
          channelId: connection.channelId,
          localUid: connection.localUid,
          elapsed: elapsed
        });
        this.localUid = connection.localUid!;
        if (this.joinSuccessCallback) {
          this.joinSuccessCallback(connection.localUid!);
        }
      },

      onUserJoined: (connection, remoteUid, elapsed) => {
        console.log('👥 REMOTE USER JOINED:', {
          remoteUid: remoteUid,
          elapsed: elapsed,
          channelId: connection.channelId
        });
        this.remoteUid = remoteUid;
        if (this.userJoinedCallback) {
          this.userJoinedCallback(remoteUid);
        }
      },

      onUserOffline: (connection, remoteUid, reason) => {
        console.log('👋 REMOTE USER LEFT:', {
          remoteUid: remoteUid,
          reason: reason,
          channelId: connection.channelId
        });
        if (this.remoteUid === remoteUid) {
          this.remoteUid = null;
        }
        if (this.userOfflineCallback) {
          this.userOfflineCallback(remoteUid);
        }
      },

      onError: (err, msg) => {
        console.error('❌ AGORA ERROR:', {
          errorCode: err,
          message: msg,
          channelId: this.channelId
        });
        if (this.errorCallback) {
          this.errorCallback({ code: err, message: msg });
        }
      },

      onWarning: (warn, msg) => {
        console.warn('⚠️ AGORA WARNING:', {
          warningCode: warn,
          message: msg,
          channelId: this.channelId
        });
      },

      onConnectionStateChanged: (connection, state, reason) => {
        const stateNames = {
          1: 'DISCONNECTED',
          2: 'CONNECTING',
          3: 'CONNECTED',
          4: 'RECONNECTING',
          5: 'FAILED'
        };

        const reasonNames = {
          0: 'CONNECTING',
          1: 'JOIN_SUCCESS',
          2: 'INTERRUPTED',
          3: 'BANNED_BY_SERVER',
          4: 'JOIN_FAILED',
          5: 'LEAVE_CHANNEL',
          6: 'INVALID_APP_ID',
          7: 'INVALID_CHANNEL_NAME',
          8: 'INVALID_TOKEN',
          9: 'TOKEN_EXPIRED',
          10: 'REJECTED_BY_SERVER',
          11: 'SETTING_PROXY_SERVER',
          12: 'RENEWING_TOKEN',
          13: 'CLIENT_IP_ADDRESS_CHANGED',
          14: 'KEEP_ALIVE_TIMEOUT'
        };

        console.log('🔗 CONNECTION STATE CHANGED:', {
          state: `${state} (${stateNames[state] || 'UNKNOWN'})`,
          reason: `${reason} (${reasonNames[reason] || 'UNKNOWN'})`,
          channelId: connection.channelId,
          localUid: connection.localUid
        });

        // Handle specific failure cases
        if (state === 5) { // CONNECTION_STATE_FAILED
          console.error('💀 CONNECTION FAILED - Reason:', reasonNames[reason] || reason);

          if (reason === 6) {
            console.error('🚫 INVALID APP ID - Check your Agora App ID');
          } else if (reason === 7) {
            console.error('🚫 INVALID CHANNEL NAME - Check channel name format');
          } else if (reason === 8 || reason === 9) {
            console.error('🚫 TOKEN ISSUE - Check token validity');
          }
        }
      },

      onNetworkQuality: (connection, remoteUid, txQuality, rxQuality) => {
        if (txQuality > 4 || rxQuality > 4) {
          console.warn('📶 POOR NETWORK QUALITY:', {
            remoteUid: remoteUid,
            txQuality: txQuality,
            rxQuality: rxQuality
          });
        }
      },

      onRemoteVideoStateChanged: (connection, remoteUid, state, reason, elapsed) => {
        const stateNames = {
          0: 'STOPPED',
          1: 'STARTING',
          2: 'DECODING',
          3: 'FROZEN',
          4: 'FAILED'
        };

        console.log('📹 REMOTE VIDEO STATE CHANGED:', {
          remoteUid: remoteUid,
          state: `${state} (${stateNames[state] || 'UNKNOWN'})`,
          reason: reason,
          elapsed: elapsed
        });
      },

      onRemoteAudioStateChanged: (connection, remoteUid, state, reason, elapsed) => {
        const stateNames = {
          0: 'STOPPED',
          1: 'STARTING',
          2: 'DECODING',
          3: 'FROZEN',
          4: 'FAILED'
        };

        console.log('🔊 REMOTE AUDIO STATE CHANGED:', {
          remoteUid: remoteUid,
          state: `${state} (${stateNames[state] || 'UNKNOWN'})`,
          reason: reason,
          elapsed: elapsed
        });
      },

      onLeaveChannel: (connection, stats) => {
        console.log('👋 LEFT CHANNEL:', {
          channelId: connection.channelId,
          duration: stats.duration,
          txBytes: stats.txBytes,
          rxBytes: stats.rxBytes
        });
      },

      onRejoinChannelSuccess: (connection, elapsed) => {
        console.log('🔄 REJOINED CHANNEL:', {
          channelId: connection.channelId,
          localUid: connection.localUid,
          elapsed: elapsed
        });
      },

      onApiCallExecuted: (api, error) => {
        if (error !== 0) {
          console.error('🔧 API CALL FAILED:', {
            api: api,
            error: error
          });
        }
      },

      onRequestToken: (connection) => {
        console.log('🔑 TOKEN REQUESTED for channel:', connection.channelId);
      }
    });
  }

  /**
   * Enhanced join method with better error handling and validation
   */

  async joinChannelForTesting(channelId: string, uid: number = 0): Promise<void> {
    try {
      // Validate App ID format
      if (!AGORA_APP_ID || AGORA_APP_ID.length !== 32) {
        throw new Error(`Invalid Agora App ID format. Expected 32 characters, got: ${AGORA_APP_ID?.length || 0}`);
      }

      // Validate App ID contains only valid hex characters
      const hexPattern = /^[0-9a-f]+$/i;
      if (!hexPattern.test(AGORA_APP_ID)) {
        throw new Error('Invalid Agora App ID: must contain only hexadecimal characters');
      }

      if (!this.initialized || !this.engine) {
        console.log('🔄 Initializing engine...');
        await this.initialize();
      }

      if (!this.engine) {
        throw new Error('Engine not initialized after initialization attempt');
      }

      // Validate channel name
      if (!channelId || channelId.trim() === '') {
        throw new Error('Invalid channel ID: cannot be empty');
      }

      if (channelId.length > 64) {
        throw new Error('Invalid channel ID: too long (max 64 characters)');
      }

      console.log(`🚀 STARTING JOIN PROCESS for channel: "${channelId}" with UID: ${uid}`);

      // Force a fresh start - leave any existing channel first
      try {
        await this.engine.leaveChannel();
        console.log('🧹 Left any existing channel');
      } catch (e) {
        // Ignore errors if not in a channel
      }

      // Add a small delay to ensure clean state
      await new Promise(resolve => setTimeout(resolve, 100));

      // Set channel profile first with explicit timing
      console.log('📡 Setting channel profile...');
      await this.engine.setChannelProfile(ChannelProfileType.ChannelProfileCommunication);

      // Small delay after setting channel profile
      await new Promise(resolve => setTimeout(resolve, 50));

      // Set client role
      console.log('👤 Setting client role...');
      await this.engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);

      // Small delay after setting client role
      await new Promise(resolve => setTimeout(resolve, 50));

      // Enable audio and video explicitly before joining
      console.log('🎵 Enabling audio...');
      await this.engine.enableAudio();
      await this.engine.enableLocalAudio(this.isAudioEnabled);

      console.log('📹 Enabling video...');
      await this.engine.enableVideo();
      await this.engine.enableLocalVideo(this.isVideoEnabled);

      // Configure channel media options with more explicit settings
      const options: ChannelMediaOptions = {
        publishMicrophoneTrack: this.isAudioEnabled,
        publishCameraTrack: this.isVideoEnabled,
        autoSubscribeAudio: true,
        autoSubscribeVideo: true,
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
        // Add these additional options for better reliability
        enableAudioRecordingOrPlayout: true,
        publishScreenTrack: false,
        publishCustomAudioTrack: false,
        publishCustomVideoTrack: false,
        publishMediaPlayerAudioTrack: false,
        publishMediaPlayerVideoTrack: false,
      };

      console.log('📋 Channel media options configured:', {
        publishMic: options.publishMicrophoneTrack,
        publishCamera: options.publishCameraTrack,
        autoSubAudio: options.autoSubscribeAudio,
        autoSubVideo: options.autoSubscribeVideo,
        enableAudioPlayback: options.enableAudioRecordingOrPlayout,
      });

      // Create a promise that will resolve when we successfully join
      const joinPromise = new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Join channel timeout - onJoinChannelSuccess not called within 15 seconds'));
        }, 15000); // 15 second timeout

        // Set up a one-time join success handler
        const originalJoinCallback = this.joinSuccessCallback;
        this.joinSuccessCallback = (joinedUid: number) => {
          clearTimeout(timeoutId);
          this.joinSuccessCallback = originalJoinCallback; // Restore original callback
          if (originalJoinCallback) {
            originalJoinCallback(joinedUid);
          }
          resolve();
        };

        // Set up a one-time error handler for join failures
        const originalErrorCallback = this.errorCallback;
        this.errorCallback = (err: any) => {
          clearTimeout(timeoutId);
          this.errorCallback = originalErrorCallback; // Restore original callback
          if (originalErrorCallback) {
            originalErrorCallback(err);
          }
          reject(new Error(`Join failed with error: ${err.message || err.code || err}`));
        };
      });

      console.log('🔗 Calling engine.joinChannel...');

      // Make the actual join call
      const joinResult = await this.engine.joinChannel('', channelId, uid, options);
      console.log('📞 Join channel method returned:', joinResult);

      // Wait for the actual join success callback or timeout
      await joinPromise;

      this.channelId = channelId;
      this.localUid = uid;

      console.log(`✅ SUCCESSFULLY JOINED CHANNEL: ${channelId} with UID: ${uid}`);

    } catch (error) {
      console.error('❌ FAILED TO JOIN CHANNEL:', {
        error: error.message,
        channelId: channelId,
        uid: uid,
        engineInitialized: this.initialized,
        engineExists: !!this.engine,
        appIdLength: AGORA_APP_ID?.length,
      });
      throw error;
    }
  }

  /**
   * Leave the current channel
   */
  async leaveChannel(): Promise<void> {
    try {
      if (!this.engine) return;

      await this.engine.leaveChannel();
      this.channelId = null;
      this.remoteUid = null;
      console.log('👋 Left channel');
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
      console.log('📹 Camera switched');
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

      console.log(`🔊 Audio ${muted ? 'muted' : 'unmuted'}`);
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

      console.log(`📹 Video ${enabled ? 'enabled' : 'disabled'}`);
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
      console.log(`📢 Speakerphone ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Failed to toggle speakerphone:', error);
      throw error;
    }
  }

  /**
   * Get a token from the server for joining a channel
   */
  private async getToken(channelId: string): Promise<string | null> {
    console.log('🔑 Using no token for testing');
    return null;
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

  getCurrentChannelId(): string | null {
    return this.channelId;
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

    console.log('🧹 Agora engine destroyed successfully');
  }
}

// Create a singleton instance
export const agoraService = new AgoraService();
