# Video SDK Live Backend Setup Guide

This guide explains how to set up the backend to support Video SDK Live integration for your React Native dating app.

## Overview

Video SDK Live requires a backend implementation to:
1. Generate authentication tokens
2. Create meeting/room IDs
3. Manage meeting participants
4. Handle meeting events (optional)

## 1. Get Video SDK API Key

First, you need to get your API key from Video SDK:

1. Go to [Video SDK Dashboard](https://app.videosdk.live/)
2. Create an account or sign in
3. Create a new project
4. Get your API Key and Secret Key from the dashboard

## 2. Backend Implementation

### Node.js/Express Implementation

```javascript
// server.js
const express = require('express');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

const app = express();
app.use(express.json());

// Video SDK Configuration
const VIDEOSDK_API_KEY = 'your_api_key_here';
const VIDEOSDK_SECRET_KEY = 'your_secret_key_here';
const VIDEOSDK_API_ENDPOINT = 'https://api.videosdk.live/v2';

// Generate JWT token for Video SDK
function generateToken() {
  const options = {
    expiresIn: '24h',
    algorithm: 'HS256'
  };

  const payload = {
    apikey: VIDEOSDK_API_KEY,
    permissions: ['allow_join', 'allow_mod', 'ask_join'], // Meeting permissions
    version: 2
  };

  return jwt.sign(payload, VIDEOSDK_SECRET_KEY, options);
}

// Route to generate token
app.post('/api/video-call/token', (req, res) => {
  try {
    const token = generateToken();
    res.json({ 
      token,
      success: true 
    });
  } catch (error) {
    console.error('Error generating token:', error);
    res.status(500).json({ 
      error: 'Failed to generate token',
      success: false 
    });
  }
});

// Route to create a meeting
app.post('/api/video-call/create-meeting', async (req, res) => {
  try {
    const token = generateToken();
    
    const response = await fetch(`${VIDEOSDK_API_ENDPOINT}/rooms`, {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Optional: Add custom meeting settings
        customRoomId: req.body.customRoomId, // Optional custom room ID
        disabled: false,
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    res.json({
      meetingId: data.roomId,
      token,
      success: true
    });
  } catch (error) {
    console.error('Error creating meeting:', error);
    res.status(500).json({ 
      error: 'Failed to create meeting',
      success: false 
    });
  }
});

// Route to validate meeting
app.get('/api/video-call/validate-meeting/:meetingId', async (req, res) => {
  try {
    const { meetingId } = req.params;
    const token = generateToken();
    
    const response = await fetch(`${VIDEOSDK_API_ENDPOINT}/rooms/validate/${meetingId}`, {
      method: 'GET',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    res.json({
      valid: data.roomId === meetingId,
      meetingId: data.roomId,
      success: true
    });
  } catch (error) {
    console.error('Error validating meeting:', error);
    res.status(500).json({ 
      error: 'Failed to validate meeting',
      success: false 
    });
  }
});

// Optional: Get meeting details
app.get('/api/video-call/meeting/:meetingId', async (req, res) => {
  try {
    const { meetingId } = req.params;
    const token = generateToken();
    
    const response = await fetch(`${VIDEOSDK_API_ENDPOINT}/rooms/${meetingId}`, {
      method: 'GET',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error getting meeting details:', error);
    res.status(500).json({ 
      error: 'Failed to get meeting details',
      success: false 
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### Laravel/PHP Implementation

```php
<?php
// app/Http/Controllers/VideoCallController.php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class VideoCallController extends Controller
{
    private $apiKey;
    private $secretKey;
    private $apiEndpoint;

    public function __construct()
    {
        $this->apiKey = config('videosdk.api_key');
        $this->secretKey = config('videosdk.secret_key');
        $this->apiEndpoint = 'https://api.videosdk.live/v2';
    }

    private function generateToken()
    {
        $payload = [
            'apikey' => $this->apiKey,
            'permissions' => ['allow_join', 'allow_mod', 'ask_join'],
            'version' => 2,
            'exp' => time() + (24 * 60 * 60), // 24 hours
        ];

        return JWT::encode($payload, $this->secretKey, 'HS256');
    }

    public function getToken()
    {
        try {
            $token = $this->generateToken();
            
            return response()->json([
                'token' => $token,
                'success' => true
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to generate token',
                'success' => false
            ], 500);
        }
    }

    public function createMeeting(Request $request)
    {
        try {
            $token = $this->generateToken();
            
            $response = Http::withHeaders([
                'Authorization' => $token,
                'Content-Type' => 'application/json',
            ])->post($this->apiEndpoint . '/rooms', [
                'customRoomId' => $request->input('customRoomId'),
                'disabled' => false,
            ]);

            if (!$response->successful()) {
                throw new \Exception('API request failed');
            }

            $data = $response->json();
            
            return response()->json([
                'meetingId' => $data['roomId'],
                'token' => $token,
                'success' => true
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to create meeting',
                'success' => false
            ], 500);
        }
    }

    public function validateMeeting($meetingId)
    {
        try {
            $token = $this->generateToken();
            
            $response = Http::withHeaders([
                'Authorization' => $token,
                'Content-Type' => 'application/json',
            ])->get($this->apiEndpoint . "/rooms/validate/{$meetingId}");

            if (!$response->successful()) {
                throw new \Exception('API request failed');
            }

            $data = $response->json();
            
            return response()->json([
                'valid' => $data['roomId'] === $meetingId,
                'meetingId' => $data['roomId'],
                'success' => true
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to validate meeting',
                'success' => false
            ], 500);
        }
    }
}
```

## 3. Environment Configuration

### Node.js (.env)
```env
VIDEOSDK_API_KEY=your_api_key_here
VIDEOSDK_SECRET_KEY=your_secret_key_here
```

### Laravel (.env)
```env
VIDEOSDK_API_KEY=your_api_key_here
VIDEOSDK_SECRET_KEY=your_secret_key_here
```

And add to `config/videosdk.php`:
```php
<?php
return [
    'api_key' => env('VIDEOSDK_API_KEY'),
    'secret_key' => env('VIDEOSDK_SECRET_KEY'),
];
```

## 4. Frontend Configuration

Update your `services/config.ts`:

```typescript
export const CONFIG = {
  // ... other config
  VIDEOSDK: {
    token: '', // Will be fetched from backend
    apiEndpoint: 'https://api.videosdk.live/v2',
  },
  // ... rest of config
} as const;
```

## 5. API Routes Setup

### Express.js Routes
```javascript
// Add these routes to your existing API
app.post('/api/video-call/token', videoCallController.getToken);
app.post('/api/video-call/create-meeting', videoCallController.createMeeting);
app.get('/api/video-call/validate-meeting/:meetingId', videoCallController.validateMeeting);
```

### Laravel Routes
```php
// routes/api.php
Route::prefix('video-call')->group(function () {
    Route::post('/token', [VideoCallController::class, 'getToken']);
    Route::post('/create-meeting', [VideoCallController::class, 'createMeeting']);
    Route::get('/validate-meeting/{meetingId}', [VideoCallController::class, 'validateMeeting']);
});
```

## 6. Required NPM Packages

For Node.js backend:
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "jsonwebtoken": "^9.0.0",
    "node-fetch": "^2.6.7"
  }
}
```

For Laravel backend:
```bash
composer require firebase/php-jwt
```

## 7. Security Considerations

1. **Never expose your Secret Key** on the frontend
2. **Implement proper authentication** before generating tokens
3. **Add rate limiting** to prevent abuse
4. **Validate user permissions** before allowing meeting creation/joining
5. **Store meeting IDs securely** and associate them with user sessions

## 8. Integration with Dating App

In your dating app context, you might want to:

1. **Create meetings per chat**: Each chat conversation can have its own meeting room
2. **Store meeting IDs**: Associate meeting IDs with chat records in your database
3. **Handle permissions**: Ensure only chat participants can join their specific meeting
4. **Cleanup expired meetings**: Implement cleanup for old/unused meetings

Example database schema:
```sql
ALTER TABLE chats ADD COLUMN meeting_id VARCHAR(255) NULL;
ALTER TABLE chats ADD COLUMN meeting_created_at TIMESTAMP NULL;
```

## 9. Testing

Test your implementation:

1. Generate a token: `POST /api/video-call/token`
2. Create a meeting: `POST /api/video-call/create-meeting`
3. Validate the meeting: `GET /api/video-call/validate-meeting/{meetingId}`

## 10. Production Deployment

1. Set your actual Video SDK API credentials
2. Configure proper CORS settings
3. Enable HTTPS for all API endpoints
4. Implement proper logging and monitoring
5. Set up error handling and recovery mechanisms

## Troubleshooting

- **Token generation fails**: Check your API key and secret key
- **Meeting creation fails**: Verify your token is valid and has proper permissions
- **Calls don't connect**: Ensure your mobile app has the correct permissions and token

For more detailed documentation, visit: https://docs.videosdk.live/ 