# Agora Token Setup Guide

## Overview

Your Agora project requires token authentication for security. This guide explains how to set up token generation on your backend.

## Option 1: Backend Token Generation (Recommended)

### 1. Install Agora Token Builder

In your Laravel backend, install the Agora token builder:

```bash
composer require agora/token-builder
```

### 2. Create Token Controller

Create a new controller `app/Http/Controllers/AgoraTokenController.php`:

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Agora\Token\RtcTokenBuilder;

class AgoraTokenController extends Controller
{
    public function generateToken(Request $request)
    {
        $request->validate([
            'channel_name' => 'required|string|max:64',
            'uid' => 'required|string',
            'role' => 'required|in:publisher,subscriber'
        ]);

        $appId = env('AGORA_APP_ID');
        $appCertificate = env('AGORA_APP_CERTIFICATE');
        $channelName = $request->channel_name;
        $uid = $request->uid;
        $role = $request->role === 'publisher' ? 1 : 2; // 1 for publisher, 2 for subscriber
        $expireTimeInSeconds = 3600; // Token expires in 1 hour
        $currentTimestamp = now()->getTimestamp();
        $privilegeExpiredTs = $currentTimestamp + $expireTimeInSeconds;

        try {
            $token = RtcTokenBuilder::buildTokenWithUid(
                $appId,
                $appCertificate,
                $channelName,
                $uid,
                $role,
                $privilegeExpiredTs
            );

            return response()->json([
                'status' => 'success',
                'token' => $token,
                'expires_at' => $privilegeExpiredTs
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to generate token: ' . $e->getMessage()
            ], 500);
        }
    }
}
```

### 3. Add Route

Add this route to your `routes/api.php`:

```php
Route::post('/agora/token', [AgoraTokenController::class, 'generateToken'])
    ->middleware('auth:sanctum');
```

### 4. Environment Variables

Add these to your `.env` file:

```env
AGORA_APP_ID=8fa7c231530146ff8522ececbbe3d7a5
AGORA_APP_CERTIFICATE=your_app_certificate_here
```

## Option 2: Disable Token Authentication (Development Only)

### 1. Agora Console Settings

1. Go to your [Agora Console](https://console.agora.io/)
2. Navigate to your project
3. Go to "Project Management" > "Security"
4. Set "App Certificate" to "Disabled" for development
5. Save the changes

### 2. Update Agora Service

If you disable token authentication, update `services/agora-service.ts`:

```typescript
// Replace the getToken method with:
private async getToken(channelId: string, uid: number): Promise<string> {
  // Return empty string when token authentication is disabled
  return '';
}
```

## Option 3: Use Temporary Tokens (Current Implementation)

The current implementation uses temporary tokens for testing. This is not secure for production but works for development.

## Testing

### Test with Backend Token Generation

1. Set up the backend token endpoint
2. The app will automatically request tokens from your backend
3. Both users should be able to join the same channel

### Test with Disabled Token Authentication

1. Disable App Certificate in Agora Console
2. Update the service to return empty string for tokens
3. Test the calls

### Test with Temporary Tokens

1. The current implementation will generate temporary tokens
2. This may work for basic testing but is not recommended for production

## Production Considerations

1. **Always use proper token generation** in production
2. **Never disable App Certificate** in production
3. **Implement token refresh** for long calls
4. **Use secure token storage** on the client
5. **Implement proper error handling** for token failures

## Troubleshooting

### Error 110: Invalid Token
- Check if your App Certificate is enabled
- Verify token generation is working
- Ensure the token is not expired

### Error 8: Invalid Token
- Token format is incorrect
- Check token generation logic

### Error 9: Token Expired
- Implement token refresh mechanism
- Check token expiration time

## Security Best Practices

1. **Never expose App Certificate** in client-side code
2. **Generate tokens server-side** only
3. **Use short-lived tokens** (1 hour or less)
4. **Implement proper authentication** before generating tokens
5. **Log token generation** for security monitoring
6. **Use HTTPS** for all token requests 