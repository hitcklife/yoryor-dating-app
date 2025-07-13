# YorYor Dating App

A dating app with chat, audio, and video call functionality.

## Features

- User profiles and matching
- Real-time chat with typing indicators
- Audio calls using VideoSDK
- Video calls using VideoSDK
- Offline message support
- Dark mode support

## Setup Instructions

### Prerequisites

- Node.js (v14 or later)
- Yarn package manager
- Expo CLI
- VideoSDK account (for audio/video calls)

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   yarn install
   ```
3. Set up VideoSDK:
   - Create an account on [VideoSDK.live](https://videosdk.live/)
   - Get your API key from the VideoSDK dashboard
   - Update the VideoSDK token in `services/config.ts`:
     ```typescript
     VIDEOSDK: {
       token: 'your-videosdk-token-here', // Replace with your actual VideoSDK token
       apiEndpoint: 'https://api.videosdk.live/v2',
     },
     ```

4. Start the development server:
   ```
   yarn start
   ```

## Audio and Video Calls

The app uses VideoSDK for audio and video calls. The implementation includes:

### Services

- `videosdk-service.ts`: Handles the VideoSDK integration, including creating meetings, joining/leaving calls, and managing call state.

### Components

- `CallScreen.tsx`: Provides the UI for both audio and video calls, including controls for muting, toggling video, switching cameras, and ending calls.

### Usage

In the chat screen, users can:
- Tap the phone icon to start an audio call
- Tap the video camera icon to start a video call

During a call, users can:
- Mute/unmute their microphone
- Enable/disable their camera (video calls only)
- Switch between front and back cameras (video calls only)
- Toggle speaker mode (audio calls only)
- End the call

### Testing Calls

For testing purposes, the app uses a deterministic meeting ID generation:
- Meeting ID: `chat-{chatId}-meeting`
- Both users will get the same meeting ID for the same chat

### VideoSDK Token Setup

**Important**: Your VideoSDK project requires proper token authentication. The app includes a test token for development purposes.

#### Setup Options:

1. **Backend Token Generation (Recommended)**:
   - Set up token generation on your Laravel backend
   - Implement the `/api/v1/video-call/token` endpoint
   - Return a valid VideoSDK token

2. **Test Token (Development Only)**:
   - The app currently uses a test token for development
   - This is not secure for production

### Latest Updates

- Migrated from Agora SDK to VideoSDK
- Updated to use the latest VideoSDK React Native SDK
- Added token authentication support
- Improved error handling and connection state management
- Enhanced UI with better animations and visual feedback
- Optimized for one-on-one calls

## Permissions

The app requires the following permissions:

### iOS
- Camera access for video calls
- Microphone access for audio and video calls

### Android
- Camera access
- Record audio permission
- Modify audio settings

These permissions are configured in the `app.json` file.

## Troubleshooting

If you encounter issues with audio or video calls:

1. Make sure you've replaced the placeholder VideoSDK token with your actual token
2. Check that you've granted the necessary camera and microphone permissions on your device
3. Verify that both users are joining the same meeting ID
4. Check your VideoSDK dashboard for any account issues

### Common Issues:

- **Token errors**: Verify your VideoSDK token is valid and not expired
- **Permission errors**: Ensure camera and microphone permissions are granted
- **Connection issues**: Check your internet connection and VideoSDK service status
- **Meeting creation failures**: Verify your VideoSDK account has sufficient credits

## License

[MIT License](LICENSE)
