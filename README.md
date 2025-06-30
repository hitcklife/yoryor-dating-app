# YorYor Dating App

A dating app with chat, audio, and video call functionality.

## Features

- User profiles and matching
- Real-time chat with typing indicators
- Audio calls using Agora SDK
- Video calls using Agora SDK
- Offline message support
- Dark mode support

## Setup Instructions

### Prerequisites

- Node.js (v14 or later)
- Yarn package manager
- Expo CLI
- Agora.io account (for audio/video calls)

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   yarn install
   ```
3. Set up Agora SDK:
   - Create an account on [Agora.io](https://www.agora.io/)
   - Create a new project in the Agora Console
   - Copy your App ID
   - Open `services/agora-service.ts` and replace the placeholder App ID:
     ```typescript
     const AGORA_APP_ID = 'your-agora-app-id'; // Replace with your actual Agora App ID
     ```

4. Start the development server:
   ```
   yarn start
   ```

## Audio and Video Calls

The app uses Agora SDK for audio and video calls. The implementation includes:

### Services

- `agora-service.ts`: Handles the Agora SDK integration, including initializing the engine, joining/leaving channels, and managing call state.

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

For testing purposes, the app uses a simple channel naming convention:
- Channel ID: `test-{chatId}`
- Both users need to join the same channel to connect

### Agora Token Setup

**Important**: Your Agora project requires token authentication. See [Agora Token Setup Guide](docs/agora-token-setup.md) for detailed instructions.

#### Quick Setup Options:

1. **Backend Token Generation (Recommended)**:
   - Set up token generation on your Laravel backend
   - Follow the guide in `docs/agora-token-setup.md`

2. **Disable Token Authentication (Development Only)**:
   - Go to Agora Console > Project Management > Security
   - Set "App Certificate" to "Disabled"
   - Update the service to return empty string for tokens

3. **Temporary Tokens (Current Implementation)**:
   - The app currently generates temporary tokens for testing
   - This is not secure for production

### Latest Updates

- Updated to use the latest Agora React Native SDK (v4.5.3)
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

1. Make sure you've replaced the placeholder Agora App ID with your actual App ID
2. **Check token authentication setup** - see [Agora Token Setup Guide](docs/agora-token-setup.md)
3. Ensure your Agora project has the appropriate security settings
4. Check that you've granted the necessary camera and microphone permissions on your device
5. Verify that both users are joining the same channel ID

### Common Error Codes:

- **Error 110**: Invalid token - Check token generation or disable App Certificate
- **Error 8**: Invalid token format - Verify token generation logic
- **Error 9**: Token expired - Implement token refresh mechanism
- **Error 6**: Invalid App ID - Check your Agora App ID
- **Error 7**: Invalid channel name - Check channel name format

## License

[MIT License](LICENSE)
