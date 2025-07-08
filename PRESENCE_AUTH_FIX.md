# Presence Channel Authentication Fix

## 🚨 **Error Analysis**

The error `{"error": undefined, "type": "AuthError"}` indicates that your **Laravel backend** is not properly authorizing the presence channels. This is a **backend configuration issue**, not a frontend problem.

## 🔧 **Backend Fix Required**

### **1. Update `routes/channels.php`**

Your `routes/channels.php` file needs to properly authorize presence channels:

```php
<?php

use Illuminate\Support\Facades\Broadcast;

// Private channels (existing)
Broadcast::channel('user.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('chat.{chatId}', function ($user, $chatId) {
    // Check if user is part of this chat
    return $user->chats()->where('chat_id', $chatId)->exists();
});

// === PRESENCE CHANNELS ===

// Global online users presence channel
Broadcast::channel('presence-online-users', function ($user) {
    // Allow all authenticated users to join global presence
    return [
        'id' => $user->id,
        'name' => $user->profile->first_name . ' ' . $user->profile->last_name,
        'avatar' => $user->profile_photo_path,
        'is_online' => true
    ];
});

// Chat-specific presence channel
Broadcast::channel('presence-chat.{chatId}', function ($user, $chatId) {
    // Check if user is part of this chat
    if ($user->chats()->where('chat_id', $chatId)->exists()) {
        return [
            'id' => $user->id,
            'name' => $user->profile->first_name . ' ' . $user->profile->last_name,
            'avatar' => $user->profile_photo_path,
            'is_online' => true
        ];
    }
    return false;
});

// Dating activity presence channel
Broadcast::channel('presence-dating-active', function ($user) {
    // Allow all authenticated users to join dating activity
    return [
        'id' => $user->id,
        'name' => $user->profile->first_name . ' ' . $user->profile->last_name,
        'avatar' => $user->profile_photo_path,
        'is_online' => true
    ];
});

// User matches presence channel
Broadcast::channel('presence-user-matches.{userId}', function ($user, $userId) {
    // Only allow user to see their own matches' presence
    return (int) $user->id === (int) $userId;
});
```

### **2. Update Broadcasting Configuration**

Make sure your `config/broadcasting.php` has proper Pusher configuration:

```php
'pusher' => [
    'driver' => 'pusher',
    'key' => env('PUSHER_APP_KEY'),
    'secret' => env('PUSHER_APP_SECRET'),
    'app_id' => env('PUSHER_APP_ID'),
    'options' => [
        'cluster' => env('PUSHER_APP_CLUSTER'),
        'encrypted' => true,
        'host' => env('PUSHER_HOST') ?: 'api-'.env('PUSHER_APP_CLUSTER', 'mt1').'.pusherapp.com',
        'port' => env('PUSHER_PORT', 443),
        'scheme' => env('PUSHER_SCHEME', 'https'),
        'useTLS' => env('PUSHER_SCHEME', 'https') === 'https',
    ],
],
```

### **3. Update `.env` File**

Ensure your `.env` file has the correct Pusher credentials:

```env
PUSHER_APP_ID=your_app_id
PUSHER_APP_KEY=your_app_key
PUSHER_APP_SECRET=your_app_secret
PUSHER_APP_CLUSTER=your_cluster

BROADCAST_DRIVER=pusher
```

### **4. Clear Laravel Cache**

Run these commands on your backend:

```bash
php artisan config:clear
php artisan cache:clear
php artisan route:clear
```

## 🔍 **Debugging Steps**

### **1. Check Authentication Token**

Make sure your frontend is sending the correct auth token:

```typescript
// In your WebSocket service, verify the token is being sent
console.log('Auth token for presence:', token);
```

### **2. Test Channel Authorization**

Add this temporary debug route to test channel authorization:

```php
// In routes/web.php (temporary for testing)
Route::get('/test-presence-auth', function () {
    $user = auth()->user();
    if (!$user) {
        return response()->json(['error' => 'Not authenticated']);
    }
    
    // Test presence channel authorization
    $channel = 'presence-online-users';
    $authorized = Broadcast::channel($channel, function ($user) {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'avatar' => $user->avatar
        ];
    });
    
    return response()->json([
        'user_id' => $user->id,
        'channel' => $channel,
        'authorized' => $authorized
    ]);
});
```

### **3. Check Broadcasting Auth Endpoint**

Verify your broadcasting auth endpoint is working:

```bash
curl -X POST https://your-backend.com/api/v1/broadcasting/auth \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"socket_id":"123.456","channel_name":"presence-online-users"}'
```

## 🛠️ **Frontend Fixes**

### **1. Update Presence Channel Subscription**

The error handling is now improved in the WebSocket service:

```typescript
// The service will now handle auth errors gracefully
webSocketService.subscribeToGlobalPresence();

// Listen for connection errors
webSocketService.on('connection.error', ({ error, canRetry }) => {
  if (error.type === 'AuthError') {
    console.error('Presence channel auth failed. Check backend configuration.');
  }
});
```

### **2. Add Retry Logic**

```typescript
// Add retry logic for presence channels
const subscribeWithRetry = async (channelName: string, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const channel = webSocketService.subscribeToGlobalPresence();
      if (channel) {
        console.log(`Successfully subscribed to ${channelName}`);
        return channel;
      }
    } catch (error) {
      console.error(`Attempt ${i + 1} failed for ${channelName}:`, error);
      if (i === maxRetries - 1) {
        console.error(`Failed to subscribe to ${channelName} after ${maxRetries} attempts`);
      } else {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }
  return null;
};
```

## 🎯 **Common Issues & Solutions**

### **Issue 1: "AuthError" on Presence Channels**

**Cause**: Backend not authorizing presence channels properly
**Solution**: Update `routes/channels.php` with proper presence channel authorization

### **Issue 2: "User not found" in Channel Authorization**

**Cause**: User model relationship issues
**Solution**: Ensure user relationships are properly defined:

```php
// In User model
public function profile()
{
    return $this->hasOne(Profile::class);
}

public function chats()
{
    return $this->belongsToMany(Chat::class, 'chat_users');
}
```

### **Issue 3: "Token expired" Errors**

**Cause**: Auth token is expired
**Solution**: Implement token refresh logic:

```typescript
// In your auth service
const refreshToken = async () => {
  try {
    const response = await apiClient.post('/api/v1/auth/refresh');
    if (response.status === 'success') {
      await AsyncStorage.setItem('auth_token', response.data.token);
      // Reinitialize WebSocket with new token
      webSocketService.disconnect();
      await webSocketService.initialize();
    }
  } catch (error) {
    console.error('Token refresh failed:', error);
    // Redirect to login
  }
};
```

## ✅ **Testing Steps**

### **1. Test Basic Connection**

```typescript
// Test basic WebSocket connection first
webSocketService.on('connection.state.changed', ({ state, quality }) => {
  console.log(`Connection: ${state} (${quality})`);
});

webSocketService.setCurrentUserId(userId);
```

### **2. Test Private Channels**

```typescript
// Test private channels work first
webSocketService.subscribeToChat(chatId);
```

### **3. Test Presence Channels**

```typescript
// Test presence channels after private channels work
webSocketService.subscribeToGlobalPresence();
```

## 🚀 **Quick Fix Checklist**

- [ ] Update `routes/channels.php` with presence channel authorization
- [ ] Verify `.env` has correct Pusher credentials
- [ ] Clear Laravel cache (`php artisan config:clear`)
- [ ] Test auth token is valid
- [ ] Check broadcasting auth endpoint works
- [ ] Verify user relationships in models
- [ ] Test with retry logic

## 📞 **If Still Having Issues**

1. **Check Laravel logs**: `storage/logs/laravel.log`
2. **Check browser console** for detailed error messages
3. **Test broadcasting auth endpoint** directly
4. **Verify Pusher app settings** in dashboard
5. **Check user authentication** is working properly

The key issue is that **presence channels require proper backend authorization** in `routes/channels.php`. Once you update that file with the correct authorization logic, the AuthError should be resolved! 🎯 