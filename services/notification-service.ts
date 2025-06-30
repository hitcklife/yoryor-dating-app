import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from './api-client';
import { CONFIG } from './config';

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  private expoPushToken: string | null = null;
  private notificationListener: any = null;
  private responseListener: any = null;

  constructor() {
    // Initialize empty
  }

  /**
   * Initialize the notification service
   * @returns Promise<string | null> - The push token or null if not available
   */
  async initialize(): Promise<string | null> {
    try {
      // Check if we already have a token stored
      const storedToken = await AsyncStorage.getItem('expoPushToken');
      if (storedToken) {
        this.expoPushToken = storedToken;
        console.log('Using stored push token:', this.expoPushToken);
      } else {
        // Register for a new token
        await this.registerForPushNotifications();
      }

      // Set up notification listeners
      this.setupNotificationListeners();

      return this.expoPushToken;
    } catch (error) {
      console.error('Error initializing notification service:', error);
      return null;
    }
  }

  /**
   * Register for push notifications and get a token
   */
  private async registerForPushNotifications(): Promise<void> {
    if (!Device.isDevice) {
      console.log('Push notifications are not available on emulators/simulators');
      return;
    }

    try {
      // Request permission
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token: permission not granted');
        return;
      }

      // Get the token using the app's slug as the projectId
      const token = (await Notifications.getExpoPushTokenAsync({
        projectId: CONFIG.EXPO_PROJECT_ID, // Using the app's slug from config
      })).data;

      // Store the token
      this.expoPushToken = token;
      await AsyncStorage.setItem('expoPushToken', token);
      console.log('Push token:', token);

      // Register with backend
      await this.registerTokenWithBackend(token);

      // Configure for Android
      if (Platform.OS === 'android') {
        Notifications.setNotificationChannelAsync('chat-messages', {
          name: 'Chat Messages',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }
    } catch (error) {
      console.error('Error registering for push notifications:', error);
    }
  }

  /**
   * Register the push token with the backend
   * @param token The Expo push token
   */
  private async registerTokenWithBackend(token: string): Promise<void> {
    try {
      const authToken = await AsyncStorage.getItem('auth_token');
      if (!authToken) {
        console.log('No auth token available, skipping token registration');
        return;
      }

      // Get device information
      const deviceInfo = {
        token: token,
        deviceName: Device.deviceName || 'Unknown Device',
        brand: Device.brand || 'Unknown Brand',
        modelName: Device.modelName || 'Unknown Model',
        osName: Device.osName || Platform.OS,
        osVersion: Device.osVersion || 'Unknown OS Version',
        deviceType: this.getDeviceType(),
        isDevice: Device.isDevice,
        manufacturer: Device.manufacturer || 'Unknown Manufacturer',
      };

      console.log('Registering device with backend:', deviceInfo);

      // Send the token and device info to the backend using centralized client
      await apiClient.deviceTokens.register(deviceInfo);
      console.log('Device registered with backend successfully');
    } catch (error) {
      console.error('Error registering device with backend:', error);
    }
  }

  /**
   * Get the device type based on form factor
   */
  private getDeviceType(): string {
    if (Device.deviceType === Device.DeviceType.PHONE) {
      return 'PHONE';
    } else if (Device.deviceType === Device.DeviceType.TABLET) {
      return 'TABLET';
    } else if (Device.deviceType === Device.DeviceType.DESKTOP) {
      return 'DESKTOP';
    } else if (Device.deviceType === Device.DeviceType.TV) {
      return 'TV';
    } else {
      return 'UNKNOWN';
    }
  }

  /**
   * Set up listeners for incoming notifications and notification responses
   */
  private setupNotificationListeners(): void {
    // Remove any existing listeners
    this.removeNotificationListeners();

    // Set up a listener for incoming notifications when the app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received in foreground:', notification);
      // You can handle foreground notifications here if needed
    });

    // Set up a listener for user interaction with notifications
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response received:', response);
      const data = response.notification.request.content.data;

      // Handle notification tap based on the notification type
      this.handleNotificationResponse(data);
    });
  }

  /**
   * Handle user interaction with a notification
   * @param data The notification data
   */
  private handleNotificationResponse(data: any): void {
    try {
      // Check if it's a chat message notification
      if (data.type === 'chat_message') {
        // Navigate to the chat screen
        // Note: You'll need to implement navigation logic here or use a callback
        console.log('Should navigate to chat:', data.chatId);

        // Example of how you might navigate (implementation depends on your navigation setup)
        // navigation.navigate('chat', { id: data.chatId });
      }
    } catch (error) {
      console.error('Error handling notification response:', error);
    }
  }

  /**
   * Remove notification listeners
   */
  private removeNotificationListeners(): void {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
      this.notificationListener = null;
    }

    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
      this.responseListener = null;
    }
  }

  /**
   * Schedule a local notification for a new chat message
   * @param message The message object
   * @param chatId The chat ID
   * @param senderName The name of the message sender
   */
  async showMessageNotification(message: any, chatId: string, senderName: string): Promise<void> {
    try {
      // Don't show notifications for messages sent by the current user
      if (message.is_mine) {
        return;
      }

      // Prepare the notification content
      let notificationContent: Notifications.NotificationContentInput = {
        title: senderName,
        body: message.message_type === 'text'
          ? message.content
          : `Sent you a ${message.message_type}`,
        data: {
          type: 'chat_message',
          chatId,
          messageId: message.id,
        },
      };

      // Schedule the notification
      await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: null, // null means show immediately
      });
    } catch (error) {
      console.error('Error showing message notification:', error);
    }
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.removeNotificationListeners();
  }
}

export const notificationService = new NotificationService();
