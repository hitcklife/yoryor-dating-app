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
  ConnectionStateType,
  ConnectionChangedReasonType,
  AudioProfileType,
  AudioScenarioType,
} from 'react-native-agora';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from './api-client';
import { CONFIG } from './config';

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
   * Get a token from the server for joining a channel
   */
  private async getToken(channelId: string, uid: number): Promise<string> {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No auth token available');
      }

      // Try to get token from backend using centralized client
      const response = await apiClient.agora.getToken(channelId, uid.toString(), 'publisher');

      console.log('🔑 Backend response:', JSON.stringify(response.data, null, 2));

      // Handle different response formats
      let tokenValue = null;
      
      if (response.data && response.data.token) {
        // Direct token in response.data
        tokenValue = response.data.token;
        console.log('🔑 Found token in response.data.token');
      } else if (response.data && response.data.data && response.data.data.token) {
        // Token nested under data.token
        tokenValue = response.data.data.token;
        console.log('🔑 Found token in response.data.data.token');
      } else if (response.data && response.data.status === 'success' && response.data.data && response.data.data.token) {
        // Token in success response format
        tokenValue = response.data.data.token;
        console.log('🔑 Found token in success response format');
      }

      if (tokenValue) {
        console.log('🔑 Token received from backend, length:', tokenValue.length);
        return tokenValue;
      } else {
        console.error('❌ Token not found in response structure:', {
          hasData: !!response.data,
          hasDataData: !!(response.data && response.data.data),
          hasToken: !!(response.data && response.data.token),
          hasDataToken: !!(response.data && response.data.data && response.data.data.token),
          responseKeys: response.data ? Object.keys(response.data) : [],
          dataKeys: response.data && response.data.data ? Object.keys(response.data.data) : []
        });
        throw new Error('No token found in response');
      }
    } catch (error) {
      console.warn('⚠️ Failed to get token from backend, using temporary token:', error);
      
      // For testing purposes, generate a temporary token
      // In production, you should always use proper token generation
      return this.generateTemporaryToken(channelId, uid);
    }
  }

  /**
   * Generate a temporary token for testing (NOT for production)
   */
  private generateTemporaryToken(channelId: string, uid: number): string {
    // This is a simple hash-based token for testing only
    // In production, use proper Agora token generation
    const timestamp = Math.floor(Date.now() / 1000);
    const randomString = Math.random().toString(36).substring(2);
    const tokenData = `${CONFIG.AGORA.appId}${channelId}${uid}${timestamp}${randomString}`;
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < tokenData.length; i++) {
      const char = tokenData.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Simple base64-like encoding without Buffer
    const tokenString = `${timestamp}:${uid}:${Math.abs(hash).toString(16)}`;
    const token = btoa(tokenString);
    console.log('🔑 Generated temporary token for testing');
    return token;
  }

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
        appId: CONFIG.AGORA.appId,
        logConfig: {
          level: 0x0001, // Only log errors
        },
      });

      // Configure audio settings
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
      // Use proper enum values for audio profile
      this.engine.setAudioProfile(AudioProfileType.AudioProfileMusicStandard, AudioScenarioType.AudioScenarioGameStreaming);

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

      onConnectionStateChanged: (connection, state, reason) => {
        const stateNames: Record<number, string> = {
          [ConnectionStateType.ConnectionStateDisconnected]: 'DISCONNECTED',
          [ConnectionStateType.ConnectionStateConnecting]: 'CONNECTING',
          [ConnectionStateType.ConnectionStateConnected]: 'CONNECTED',
          [ConnectionStateType.ConnectionStateReconnecting]: 'RECONNECTING',
          [ConnectionStateType.ConnectionStateFailed]: 'FAILED'
        };

        const reasonNames: Record<number, string> = {
          [ConnectionChangedReasonType.ConnectionChangedConnecting]: 'CONNECTING',
          [ConnectionChangedReasonType.ConnectionChangedJoinSuccess]: 'JOIN_SUCCESS',
          [ConnectionChangedReasonType.ConnectionChangedInterrupted]: 'INTERRUPTED',
          [ConnectionChangedReasonType.ConnectionChangedBannedByServer]: 'BANNED_BY_SERVER',
          [ConnectionChangedReasonType.ConnectionChangedJoinFailed]: 'JOIN_FAILED',
          [ConnectionChangedReasonType.ConnectionChangedLeaveChannel]: 'LEAVE_CHANNEL',
          [ConnectionChangedReasonType.ConnectionChangedInvalidAppId]: 'INVALID_APP_ID',
          [ConnectionChangedReasonType.ConnectionChangedInvalidChannelName]: 'INVALID_CHANNEL_NAME',
          [ConnectionChangedReasonType.ConnectionChangedInvalidToken]: 'INVALID_TOKEN',
          [ConnectionChangedReasonType.ConnectionChangedTokenExpired]: 'TOKEN_EXPIRED',
          [ConnectionChangedReasonType.ConnectionChangedRejectedByServer]: 'REJECTED_BY_SERVER',
          [ConnectionChangedReasonType.ConnectionChangedSettingProxyServer]: 'SETTING_PROXY_SERVER',
          [ConnectionChangedReasonType.ConnectionChangedRenewToken]: 'RENEWING_TOKEN',
          [ConnectionChangedReasonType.ConnectionChangedClientIpAddressChanged]: 'CLIENT_IP_ADDRESS_CHANGED',
          [ConnectionChangedReasonType.ConnectionChangedKeepAliveTimeout]: 'KEEP_ALIVE_TIMEOUT'
        };

        console.log('🔗 CONNECTION STATE CHANGED:', {
          state: `${state} (${stateNames[state] || 'UNKNOWN'})`,
          reason: `${reason} (${reasonNames[reason] || 'UNKNOWN'})`,
          channelId: connection.channelId,
          localUid: connection.localUid
        });

        // Handle specific failure cases
        if (state === ConnectionStateType.ConnectionStateFailed) {
          console.error('💀 CONNECTION FAILED - Reason:', reasonNames[reason] || reason);

          if (reason === ConnectionChangedReasonType.ConnectionChangedInvalidAppId) {
            console.error('🚫 INVALID APP ID - Check your Agora App ID');
          } else if (reason === ConnectionChangedReasonType.ConnectionChangedInvalidChannelName) {
            console.error('🚫 INVALID CHANNEL NAME - Check channel name format');
          } else if (reason === ConnectionChangedReasonType.ConnectionChangedInvalidToken || 
                     reason === ConnectionChangedReasonType.ConnectionChangedTokenExpired) {
            console.error('🚫 TOKEN ISSUE - Check token validity');
            console.error('🚫 Token details:', {
              tokenLength: this.channelId ? 'token exists' : 'no token',
              channelId: this.channelId
            });
          }
        }

        // Log successful connection
        if (state === ConnectionStateType.ConnectionStateConnected) {
          console.log('✅ CONNECTION ESTABLISHED successfully');
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
        const stateNames: Record<number, string> = {
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
        const stateNames: Record<number, string> = {
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

      onRequestToken: (connection) => {
        console.log('🔑 TOKEN REQUESTED for channel:', connection.channelId);
      }
    });
  }

  /**
   * Join channel for one-on-one calls with token
   */
  async joinChannel(channelId: string, uid: number = 0): Promise<void> {
    try {
      // Validate Agora App ID
      if (!CONFIG.AGORA.appId || CONFIG.AGORA.appId.length !== 32) {
        throw new Error(`Invalid Agora App ID format. Expected 32 characters, got: ${CONFIG.AGORA.appId?.length || 0}`);
      }

      // Check if App ID is hexadecimal
      const hexPattern = /^[0-9a-fA-F]{32}$/;
      if (!hexPattern.test(CONFIG.AGORA.appId)) {
        throw new Error(`Invalid Agora App ID format. Must be 32 hexadecimal characters, got: ${CONFIG.AGORA.appId}`);
      }

      console.log('🔍 App ID validation passed:', {
        appId: CONFIG.AGORA.appId,
        length: CONFIG.AGORA.appId.length,
        isHex: hexPattern.test(CONFIG.AGORA.appId)
      });

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

      // Set channel profile for one-on-one communication
      console.log('📡 Setting channel profile...');
      await this.engine.setChannelProfile(ChannelProfileType.ChannelProfileCommunication);

      // Small delay after setting channel profile
      await new Promise(resolve => setTimeout(resolve, 50));

      // Set client role as broadcaster for one-on-one calls
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

      // Configure channel media options for one-on-one calls
      const options: ChannelMediaOptions = {
        publishMicrophoneTrack: this.isAudioEnabled,
        publishCameraTrack: this.isVideoEnabled,
        autoSubscribeAudio: true,
        autoSubscribeVideo: true,
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
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

      // Get token from backend
      console.log('🔑 Getting token for channel...');
      let token: string | null = null;
      
      try {
        token = await this.getToken(channelId, uid);
        if (token) {
          // Optionally log token length
          console.log('🔑 Token received from backend, length:', token.length);
          // Skipping base64 validation in React Native
        } else {
          console.warn('🔑 No token received, using temporary token for testing');
          token = this.generateTemporaryToken(channelId, uid);
        }
      } catch (error) {
        console.error('🔑 Error getting token from backend:', error);
        console.warn('🔑 Using temporary token for testing');
        token = this.generateTemporaryToken(channelId, uid);
      }

      // Ensure we have a token
      if (!token) {
        throw new Error('Failed to get valid token for channel');
      }

      // Check network connectivity
      try {
        const NetInfo = require('@react-native-community/netinfo');
        const netInfo = await NetInfo.fetch();
        console.log('🌐 Network status:', {
          isConnected: netInfo.isConnected,
          isInternetReachable: netInfo.isInternetReachable,
          type: netInfo.type,
          isWifi: netInfo.type === 'wifi',
          isCellular: netInfo.type === 'cellular'
        });
        
        if (!netInfo.isConnected || !netInfo.isInternetReachable) {
          throw new Error('No internet connection available');
        }
      } catch (netError) {
        console.warn('⚠️ Could not check network status:', netError);
        // Continue anyway, Agora will handle network issues
      }

      // For testing purposes, let's try without token first if the token seems invalid
      const shouldTryWithoutToken = false; // Set to true for testing without token
      
      if (shouldTryWithoutToken) {
        console.log('🧪 TESTING: Trying to join without token for debugging');
        token = '';
      }

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
      console.log('🔗 Join parameters:', {
        token: token ? `${token.substring(0, 20)}...` : 'null',
        channelId: channelId,
        uid: uid,
        options: JSON.stringify(options)
      });

      const result = this.engine.joinChannel(token, channelId, uid, options);
      console.log('📞 Join channel method returned:', result);

      // Wait for the actual join success callback or timeout
      await joinPromise;

      this.channelId = channelId;
      this.localUid = uid;

      console.log(`✅ SUCCESSFULLY JOINED CHANNEL: ${channelId} with UID: ${uid}`);

    } catch (error: any) {
      console.error('❌ FAILED TO JOIN CHANNEL:', {
        error: error.message,
        channelId: channelId,
        uid: uid,
        engineInitialized: this.initialized,
        engineExists: !!this.engine,
        appIdLength: CONFIG.AGORA.appId?.length,
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
        this.engine.enableAudio();
        this.engine.enableVideo();

        // Unregister event handlers
        this.engine.unregisterEventHandler({});
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
