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
2. Ensure your Agora project has the appropriate security settings (App Certificate, token authentication)
3. Check that you've granted the necessary camera and microphone permissions on your device
4. For development, make sure your Agora project allows testing in debug mode

## License

[MIT License](LICENSE)
