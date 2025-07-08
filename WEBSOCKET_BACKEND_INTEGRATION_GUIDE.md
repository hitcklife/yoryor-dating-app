# WebSocket Backend Integration Guide for Laravel

This guide provides complete implementation details for integrating WebSocket functionality in your Laravel backend to support the optimized mobile app.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Broadcasting Events](#broadcasting-events)
3. [Channel Configuration](#channel-configuration)
4. [Database Schema Updates](#database-schema-updates)
5. [API Endpoints](#api-endpoints)
6. [Queue Configuration](#queue-configuration)
7. [Testing WebSocket Events](#testing-websocket-events)

## Prerequisites

Ensure you have the following configured in your Laravel backend:

```bash
composer require pusher/pusher-php-server
composer require predis/predis # For Redis queue driver
```

Update your `.env` file:
```env
BROADCAST_DRIVER=pusher
QUEUE_CONNECTION=redis

PUSHER_APP_ID=your_app_id
PUSHER_APP_KEY=your_app_key
PUSHER_APP_SECRET=your_app_secret
PUSHER_APP_CLUSTER=your_cluster
```

## Broadcasting Events

### 1. Base Event Class
Create a base event class for common functionality:

```php
// app/Events/BaseUserEvent.php
<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

abstract class BaseUserEvent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    protected $userId;
    protected $data;

    public function __construct($userId, $data = [])
    {
        $this->userId = $userId;
        $this->data = $data;
    }

    public function broadcastOn()
    {
        return new PrivateChannel('user.' . $this->userId);
    }

    public function broadcastWith()
    {
        return $this->data;
    }

    // Ensure events are queued for performance
    public function broadcastQueue()
    {
        return 'websocket-events';
    }
}
```

### 2. Specific Event Classes

#### New Match Event
```php
// app/Events/NewMatch.php
<?php

namespace App\Events;

use App\Models\Match;
use App\Models\User;

class NewMatch extends BaseUserEvent
{
    private Match $match;

    public function __construct($userId, Match $match)
    {
        $this->match = $match;
        
        // Get the matched user details
        $matchedUser = $match->matched_user_id == $userId 
            ? User::find($match->user_id) 
            : User::find($match->matched_user_id);
        
        $data = [
            'match' => [
                'id' => $match->id,
                'name' => $matchedUser->profile->full_name,
                'user_id' => $matchedUser->id,
                'profile_photo' => $matchedUser->profile_photo,
                'chat_id' => $match->chat_id,
                'matched_at' => $match->created_at->toIso8601String(),
            ]
        ];
        
        parent::__construct($userId, $data);
    }

    public function broadcastAs()
    {
        return 'NewMatch';
    }
}
```

#### New Like Event
```php
// app/Events/NewLike.php
<?php

namespace App\Events;

use App\Models\Like;
use App\Models\User;

class NewLike extends BaseUserEvent
{
    public function __construct($userId, Like $like)
    {
        $liker = User::find($like->user_id);
        
        $data = [
            'like' => [
                'id' => $like->id,
                'name' => $liker->profile->full_name,
                'user_id' => $liker->id,
                'profile_photo' => $liker->profile_photo,
                'liked_at' => $like->created_at->toIso8601String(),
            ]
        ];
        
        parent::__construct($userId, $data);
    }

    public function broadcastAs()
    {
        return 'NewLike';
    }
}
```

#### Incoming Call Event
```php
// app/Events/IncomingCall.php
<?php

namespace App\Events;

use App\Models\Call;
use App\Models\User;

class IncomingCall extends BaseUserEvent
{
    public function __construct($userId, Call $call)
    {
        $caller = User::find($call->caller_id);
        
        $data = [
            'call' => [
                'id' => $call->id,
                'caller_id' => $caller->id,
                'caller_name' => $caller->profile->full_name,
                'caller_photo' => $caller->profile_photo,
                'type' => $call->type, // 'audio' or 'video'
                'room_id' => $call->room_id,
                'token' => $call->token,
            ]
        ];
        
        parent::__construct($userId, $data);
    }

    public function broadcastAs()
    {
        return 'IncomingCall';
    }
}
```

#### Global Unread Count Update
```php
// app/Events/GlobalUnreadCountUpdate.php
<?php

namespace App\Events;

use App\Models\User;

class GlobalUnreadCountUpdate extends BaseUserEvent
{
    public function __construct(User $user)
    {
        $data = [
            'messages_count' => $user->unreadMessagesCount(),
            'likes_count' => $user->newLikesCount(),
            'matches_count' => $user->newMatchesCount(),
            'total_count' => $user->unreadMessagesCount() + $user->newLikesCount() + $user->newMatchesCount(),
        ];
        
        parent::__construct($user->id, $data);
    }

    public function broadcastAs()
    {
        return 'GlobalUnreadCountUpdate';
    }
}
```

#### Chat Events
```php
// app/Events/NewMessageInChat.php
<?php

namespace App\Events;

use App\Models\Message;

class NewMessageInChat extends BaseUserEvent
{
    public function __construct($userId, Message $message)
    {
        $data = [
            'chat_id' => $message->chat_id,
            'message' => [
                'id' => $message->id,
                'content' => $message->content,
                'type' => $message->type,
                'sender_id' => $message->sender_id,
                'created_at' => $message->created_at->toIso8601String(),
                'is_mine' => $message->sender_id == $userId,
            ]
        ];
        
        parent::__construct($userId, $data);
    }

    public function broadcastAs()
    {
        return 'NewMessageInChat';
    }
}
```

### 3. Message Events for Chat Channel
```php
// app/Events/MessageSent.php
<?php

namespace App\Events;

use App\Models\Message;
use App\Models\User;
use Illuminate\Broadcasting\PrivateChannel;

class MessageSent extends BaseUserEvent
{
    protected $chatId;
    protected $message;

    public function __construct($chatId, Message $message)
    {
        $this->chatId = $chatId;
        $this->message = $message;
        
        $sender = User::find($message->sender_id);
        
        $this->data = [
            'message' => [
                'id' => $message->id,
                'chat_id' => $message->chat_id,
                'sender_id' => $message->sender_id,
                'content' => $message->content,
                'message_type' => $message->type,
                'created_at' => $message->created_at->toIso8601String(),
                'read_at' => $message->read_at?->toIso8601String(),
                'delivered_at' => $message->delivered_at?->toIso8601String(),
            ],
            'sender' => [
                'id' => $sender->id,
                'name' => $sender->profile->full_name,
                'avatar' => $sender->profile_photo,
            ]
        ];
    }

    public function broadcastOn()
    {
        return new PrivateChannel('chat.' . $this->chatId);
    }

    public function broadcastAs()
    {
        return 'MessageSent';
    }
}
```

## Channel Configuration

Update `routes/channels.php`:

```php
<?php

use App\Models\Chat;
use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

// Private user channel for global events
Broadcast::channel('user.{userId}', function ($user, $userId) {
    return (int) $user->id === (int) $userId;
});

// Private chat channel
Broadcast::channel('chat.{chatId}', function ($user, $chatId) {
    $chat = Chat::find($chatId);
    return $chat && $chat->users()->where('user_id', $user->id)->exists();
});

// Presence channel for online status (optional but recommended)
Broadcast::channel('presence.app', function ($user) {
    return [
        'id' => $user->id,
        'name' => $user->profile->full_name,
        'avatar' => $user->profile_photo,
        'status' => 'online',
    ];
});
```

## Database Schema Updates

Add necessary columns and indexes:

```php
// database/migrations/xxxx_add_websocket_optimizations.php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddWebsocketOptimizations extends Migration
{
    public function up()
    {
        // Add delivered_at to messages
        Schema::table('messages', function (Blueprint $table) {
            $table->timestamp('delivered_at')->nullable()->after('read_at');
            $table->index(['chat_id', 'created_at']);
            $table->index('read_at');
            $table->index('delivered_at');
        });

        // Add last_activity_at to chats for better sorting
        Schema::table('chats', function (Blueprint $table) {
            $table->timestamp('last_activity_at')->nullable();
            $table->index('last_activity_at');
        });

        // Add presence tracking
        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('last_seen_at')->nullable();
            $table->boolean('is_online')->default(false);
            $table->index('is_online');
        });

        // Create notification counts cache table
        Schema::create('user_notification_counts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->integer('unread_messages_count')->default(0);
            $table->integer('new_likes_count')->default(0);
            $table->integer('new_matches_count')->default(0);
            $table->timestamps();
            
            $table->unique('user_id');
        });
    }

    public function down()
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropColumn('delivered_at');
            $table->dropIndex(['chat_id', 'created_at']);
            $table->dropIndex(['read_at']);
        });

        Schema::table('chats', function (Blueprint $table) {
            $table->dropColumn('last_activity_at');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['last_seen_at', 'is_online']);
        });

        Schema::dropIfExists('user_notification_counts');
    }
}
```

## API Endpoints

### 1. Typing Indicator Endpoint
```php
// app/Http/Controllers/Api/ChatController.php

public function typing(Request $request, $chatId)
{
    $request->validate([
        'is_typing' => 'required|boolean'
    ]);

    // Verify user has access to chat
    $chat = Chat::findOrFail($chatId);
    abort_unless($chat->users()->where('user_id', auth()->id())->exists(), 403);

    // Broadcast typing event through WebSocket (not as a stored event)
    broadcast(new UserTyping($chatId, auth()->user(), $request->is_typing));

    return response()->json(['status' => 'success']);
}
```

### 2. Batch Read Receipts
```php
// app/Http/Controllers/Api/MessageController.php

public function markBatchAsRead(Request $request, $chatId)
{
    $request->validate([
        'message_ids' => 'required|array',
        'message_ids.*' => 'integer|exists:messages,id'
    ]);

    $chat = Chat::findOrFail($chatId);
    abort_unless($chat->users()->where('user_id', auth()->id())->exists(), 403);

    // Update messages in batch
    Message::whereIn('id', $request->message_ids)
        ->where('chat_id', $chatId)
        ->whereNull('read_at')
        ->update([
            'read_at' => now(),
            'delivered_at' => now() // Also mark as delivered
        ]);

    // Update unread count for the user
    $this->updateUnreadCount(auth()->user());

    // Broadcast read receipts to sender
    foreach ($request->message_ids as $messageId) {
        $message = Message::find($messageId);
        if ($message && $message->sender_id !== auth()->id()) {
            broadcast(new MessageRead($message->sender_id, $messageId, auth()->id()))->toOthers();
        }
    }

    return response()->json(['status' => 'success']);
}
```

### 3. Notification Counts Endpoint
```php
// app/Http/Controllers/Api/NotificationController.php

public function getCounts()
{
    $user = auth()->user();
    
    $counts = [
        'unread_messages_count' => $user->unreadMessagesCount(),
        'new_likes_count' => $user->newLikesCount(),
        'new_matches_count' => $user->newMatchesCount(),
        'total_count' => 0
    ];
    
    $counts['total_count'] = array_sum(array_values($counts));

    return response()->json([
        'status' => 'success',
        'data' => $counts
    ]);
}
```

### 4. Presence/Heartbeat Endpoint
```php
// app/Http/Controllers/Api/PresenceController.php

public function heartbeat(Request $request)
{
    $user = auth()->user();
    
    $user->update([
        'last_seen_at' => now(),
        'is_online' => true
    ]);

    // Optional: Get online friends
    $onlineUsers = $user->matches()
        ->where('is_online', true)
        ->where('last_seen_at', '>', now()->subMinutes(5))
        ->get(['id', 'name', 'profile_photo']);

    return response()->json([
        'status' => 'success',
        'data' => [
            'online_users' => $onlineUsers
        ]
    ]);
}
```

## Queue Configuration

For optimal WebSocket performance, configure queues:

### 1. Queue Worker Configuration
```bash
# supervisor configuration
[program:websocket-queue]
process_name=%(program_name)s_%(process_num)02d
command=php /path/to/artisan queue:work redis --queue=websocket-events --sleep=3 --tries=3
autostart=true
autorestart=true
user=www-data
numprocs=4
redirect_stderr=true
stdout_logfile=/path/to/logs/websocket-queue.log
```

### 2. Event Dispatching with Queues
```php
// In your controllers/services

// Dispatch events to queue
event(new NewMatch($userId, $match));
event(new GlobalUnreadCountUpdate($user));

// Or use dispatch helper for more control
dispatch(new NewMatch($userId, $match))->onQueue('websocket-events');
```

## Model Methods

Add these methods to your User model:

```php
// app/Models/User.php

public function unreadMessagesCount()
{
    return $this->chats()
        ->join('messages', 'chats.id', '=', 'messages.chat_id')
        ->where('messages.sender_id', '!=', $this->id)
        ->whereNull('messages.read_at')
        ->count();
}

public function newLikesCount()
{
    return $this->receivedLikes()
        ->where('is_viewed', false)
        ->count();
}

public function newMatchesCount()
{
    return $this->matches()
        ->where('is_viewed', false)
        ->count();
}

// Cache notification counts for performance
public function getCachedNotificationCounts()
{
    return Cache::remember("user.{$this->id}.notification_counts", 300, function () {
        return [
            'unread_messages_count' => $this->unreadMessagesCount(),
            'new_likes_count' => $this->newLikesCount(),
            'new_matches_count' => $this->newMatchesCount(),
        ];
    });
}

// Clear cache when counts change
public function clearNotificationCountsCache()
{
    Cache::forget("user.{$this->id}.notification_counts");
}
```

## Testing WebSocket Events

### 1. Artisan Command for Testing
```php
// app/Console/Commands/TestWebSocket.php
<?php

namespace App\Console\Commands;

use App\Events\NewMatch;
use App\Models\User;
use App\Models\Match;
use Illuminate\Console\Command;

class TestWebSocket extends Command
{
    protected $signature = 'websocket:test {userId} {event=match}';
    protected $description = 'Test WebSocket events';

    public function handle()
    {
        $userId = $this->argument('userId');
        $event = $this->argument('event');
        
        $user = User::find($userId);
        
        if (!$user) {
            $this->error('User not found');
            return;
        }

        switch ($event) {
            case 'match':
                $match = Match::factory()->create(['user_id' => $userId]);
                event(new NewMatch($userId, $match));
                $this->info('Match event sent');
                break;
                
            case 'like':
                // Test like event
                break;
                
            case 'message':
                // Test message event
                break;
        }
    }
}
```

### 2. WebSocket Debug Dashboard
```php
// routes/web.php (for development only)
Route::get('/websocket-debug', function () {
    return view('websocket-debug');
})->middleware(['auth', 'admin']);
```

Create a simple debug view to monitor WebSocket events in real-time.

## Performance Considerations

1. **Use Redis for Broadcasting**: Much faster than database driver
2. **Queue All Events**: Don't broadcast synchronously
3. **Batch Updates**: Group multiple updates together
4. **Cache User Data**: Cache frequently accessed user data
5. **Use Indexes**: Ensure proper database indexes
6. **Monitor Queue Length**: Set up alerts for queue backlog

## Security Considerations

1. **Always Verify Channel Access**: Check user permissions in channel authorization
2. **Validate Event Data**: Sanitize all broadcasted data
3. **Rate Limit**: Implement rate limiting for typing indicators
4. **Use HTTPS**: Ensure WebSocket connections are secure
5. **Token Rotation**: Implement token refresh mechanism

This completes the backend integration guide. Make sure to test each event thoroughly and monitor your WebSocket connections in production.