# WebSocket Setup Guide

This guide will help you set up WebSockets for real-time chat functionality in your YorYor Dating App.

## Backend Setup (Laravel)

1. Install the required packages:
   ```bash
   composer require pusher/pusher-php-server laravel/echo-server
   ```

2. Configure your `.env` file with Pusher credentials:
   ```
   BROADCAST_DRIVER=pusher
   PUSHER_APP_ID=your-app-id
   PUSHER_APP_KEY=your-app-key
   PUSHER_APP_SECRET=your-app-secret
   PUSHER_APP_CLUSTER=your-app-cluster
   ```

3. Update your `config/broadcasting.php` file to ensure Pusher is properly configured:
   ```php
   'pusher' => [
       'driver' => 'pusher',
       'key' => env('PUSHER_APP_KEY'),
       'secret' => env('PUSHER_APP_SECRET'),
       'app_id' => env('PUSHER_APP_ID'),
       'options' => [
           'cluster' => env('PUSHER_APP_CLUSTER'),
           'encrypted' => true,
       ],
   ],
   ```

4. Set up the authentication route for WebSockets in your `routes/api.php` or `routes/web.php`:
   ```php
   Route::post('/broadcasting/auth', function (Request $request) {
       return Broadcast::auth($request);
   })->middleware('auth:api');
   ```

5. Create a private channel for each chat in your Laravel application:
   ```php
   // In your Chat model or controller
   Broadcast::channel('chat.{chatId}', function ($user, $chatId) {
       // Check if the user is authorized to access this chat
       return $user->chats()->where('id', $chatId)->exists();
   });
   ```

6. Broadcast events when a new message is sent:
   ```php
   // In your MessageController or service
   event(new MessageSent($chat, $message, $user));
   ```

7. Create the MessageSent event:
   ```php
   // app/Events/MessageSent.php
   class MessageSent implements ShouldBroadcast
   {
       use Dispatchable, InteractsWithSockets, SerializesModels;

       public $chat;
       public $message;
       public $user;

       public function __construct(Chat $chat, Message $message, User $user)
       {
           $this->chat = $chat;
           $this->message = $message;
           $this->user = $user;
       }

       public function broadcastOn()
       {
           return new PrivateChannel('chat.' . $this->chat->id);
       }

       public function broadcastAs()
       {
           return 'message.sent';
       }
   }
   ```

## Mobile App Setup

1. Make sure you have the required dependencies installed:
   ```bash
   yarn add laravel-echo pusher-js @react-native-community/netinfo
   ```

   > **Note:** The `@react-native-community/netinfo` package is required by Pusher.js when used in React Native applications.

2. Update the Pusher configuration in `services/websocket-service.ts`:
   ```typescript
   const PUSHER_CONFIG = {
     key: 'your-pusher-key',      // Replace with your PUSHER_APP_KEY from Laravel .env
     cluster: 'your-pusher-cluster',      // Replace with your PUSHER_APP_CLUSTER from Laravel .env
     forceTLS: true,
   };
   ```

2. Make sure the API_BASE_URL is correctly set to your Laravel backend URL:
   ```typescript
   const API_BASE_URL = 'https://your-backend-url.com';
   ```

3. The WebSocket service is already configured to:
   - Connect to the Pusher server
   - Authenticate with your Laravel backend
   - Subscribe to chat channels
   - Listen for new messages
   - Send typing indicators

## Testing the WebSocket Connection

1. Start your Laravel backend server
2. Make sure your Pusher credentials are correctly set in both the Laravel backend and the mobile app
3. Run the mobile app and navigate to a chat
4. Send a message from another user or device
5. The message should appear in real-time without refreshing

## Troubleshooting

If you encounter issues with the WebSocket connection:

1. Check your Pusher credentials in both the Laravel backend and the mobile app
2. Make sure the Laravel broadcasting is properly configured
3. Check that the authentication endpoint is accessible and working correctly
4. Verify that the user is authorized to access the chat channel
5. Check the console logs for any errors

### Common Errors

#### Unable to resolve "@react-native-community/netinfo"

If you see an error like:
```
Unable to resolve "@react-native-community/netinfo" from "node_modules/pusher-js/dist/react-native/pusher.js"
```

This means the required dependency for Pusher.js in React Native is missing. Install it with:
```bash
yarn add @react-native-community/netinfo
```

Then restart your development server with:
```bash
yarn start --clear
```
