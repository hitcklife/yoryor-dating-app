export const CONFIG = {
  // API Configuration
  API_URL: 'https://incredibly-evident-hornet.ngrok-free.app',
  API_VERSION: 'v1',
  API_TIMEOUT: 15000,

  // Pusher Configuration
  PUSHER: {
    key: '71d10c58900cc58fb02d',
    cluster: 'us2',
    forceTLS: true,
  },

  // VideoSDK Configuration
  VIDEOSDK: {
    token: 'YOUR_VIDEOSDK_TOKEN_HERE', // Replace with actual VideoSDK token
    apiEndpoint: 'https://api.videosdk.live/v2',
  },

  // Notification Configuration
  EXPO_PROJECT_ID: 'f0228624-4b64-4543-a64a-7d0c30c19649',

  // App Configuration
  APP: {
    maxReconnectAttempts: 5,
    defaultPageSize: 10,
    chatMessagesPageSize: 20,
  },
} as const;

// Helper function to get full API endpoint
export const getApiEndpoint = (path: string): string => {
  const cleanPath = path.indexOf('/') === 0 ? path.slice(1) : path;
  return `${CONFIG.API_URL}/api/${CONFIG.API_VERSION}/${cleanPath}`;
};

// Helper function to get full URL for assets
export const getAssetUrl = (path: string): string => {
  if (path.indexOf('http') === 0) {
    return path;
  }
  const cleanPath = path.indexOf('/') === 0 ? path : `/${path}`;
  return `${CONFIG.API_URL}${cleanPath}`;
};