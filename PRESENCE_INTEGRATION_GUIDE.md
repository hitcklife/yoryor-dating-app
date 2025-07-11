# Presence System Integration Guide

## 🎯 Overview

The WebSocket service now includes comprehensive **Presence Channel Integration** that works seamlessly with your backend presence system. This provides real-time online status, typing indicators, and user activity tracking across your dating app.

## 🚀 **Fixed Issues**

### ✅ **Heartbeat Timeout Issue Fixed**
The heartbeat timeout was caused by improper ping/pong handling. Now fixed with:
- **Proper connection state checking** before sending pings
- **Improved pong handler** with immediate cleanup
- **Better error handling** and timeout management
- **Enhanced logging** for debugging

## 🔧 **Presence Features**

### **Presence Channels:**
1. **`presence-chat.{chatId}`** - Users active in specific chats

### **API Integration:**
- Automatic status updates via `/api/v1/presence/*` endpoints
- Heartbeat maintenance every 30 seconds
- Typing status management
- Online user fetching

## 📋 **Basic Usage**

### **1. Initialize with Presence**

```typescript
import { webSocketService } from '@/services/websocket-service';

// Set user ID (automatically initializes presence)
webSocketService.setCurrentUserId(userId);

// Or manually initialize
await webSocketService.initialize();
```

### **2. Listen to Presence Events**

```typescript
// Chat presence events
webSocketService.on('presence.chat.user.joined', ({ user, chatId, timestamp }) => {
  console.log(`${user.name} joined chat ${chatId}`);
  showUserInChatIndicator(user, chatId);
});

webSocketService.on('presence.chat.user.left', ({ user, chatId, timestamp }) => {
  console.log(`${user.name} left chat ${chatId}`);
  hideUserInChatIndicator(user.id, chatId);
});
```

### **3. Chat Presence Integration**

```typescript
// Subscribe to chat and its presence
const chatId = 123;

// Subscribe to chat messages
webSocketService.subscribeToChat(chatId);

// Subscribe to chat presence
webSocketService.subscribeToChatPresence(chatId);

// Listen for users joining/leaving chat
webSocketService.on('presence.chat.user.joined', ({ user, chatId, timestamp }) => {
  console.log(`${user.name} joined chat ${chatId}`);
  showUserInChatIndicator(user, chatId);
});

webSocketService.on('presence.chat.user.left', ({ user, chatId, timestamp }) => {
  console.log(`${user.name} left chat ${chatId}`);
  hideUserInChatIndicator(user.id, chatId);
});
```

## 🏗️ **React Component Examples**

### **Chat Presence Component**

```typescript
import React, { useEffect, useState } from 'react';
import { webSocketService, PresenceUser } from '@/services/websocket-service';

const ChatPresenceComponent = ({ chatId }: { chatId: number }) => {
  const [usersInChat, setUsersInChat] = useState<PresenceUser[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<number>>(new Set());

  useEffect(() => {
    // Subscribe to chat presence
    webSocketService.subscribeToChatPresence(chatId);

    // Get initial online users
    webSocketService.getOnlineUsersInChat(chatId).then(setUsersInChat);

    const handleChatUserJoined = ({ user, chatId: eventChatId }: any) => {
      if (eventChatId === chatId) {
        setUsersInChat(prev => [...prev, user]);
      }
    };

    const handleChatUserLeft = ({ user, chatId: eventChatId }: any) => {
      if (eventChatId === chatId) {
        setUsersInChat(prev => prev.filter(u => u.id !== user.id));
      }
    };

    const handleTyping = ({ user_id, is_typing }: any) => {
      if (is_typing) {
        setTypingUsers(prev => new Set([...prev, user_id]));
        // Remove typing indicator after 3 seconds
        setTimeout(() => {
          setTypingUsers(prev => {
            const newSet = new Set(prev);
            newSet.delete(user_id);
            return newSet;
          });
        }, 3000);
      } else {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(user_id);
          return newSet;
        });
      }
    };

    // Listen to events
    webSocketService.on('presence.chat.user.joined', handleChatUserJoined);
    webSocketService.on('presence.chat.user.left', handleChatUserLeft);
    webSocketService.on('chat.typing', handleTyping);

    return () => {
      // Cleanup
      webSocketService.off('presence.chat.user.joined', handleChatUserJoined);
      webSocketService.off('presence.chat.user.left', handleChatUserLeft);
      webSocketService.off('chat.typing', handleTyping);
      webSocketService.unsubscribeFromChatPresence(chatId);
    };
  }, [chatId]);

  const handleTypingStart = () => {
    webSocketService.updateTypingStatus(chatId, true);
  };

  const handleTypingStop = () => {
    webSocketService.updateTypingStatus(chatId, false);
  };

  return (
    <div className="chat-presence">
      <div className="users-in-chat">
        <span>In chat: {usersInChat.length}</span>
        {usersInChat.map(user => (
          <div key={user.id} className="user-indicator">
            <img src={user.avatar} alt={user.name} />
          </div>
        ))}
      </div>
      
      {typingUsers.size > 0 && (
        <div className="typing-indicator">
          {Array.from(typingUsers).length === 1 
            ? 'Someone is typing...' 
            : `${typingUsers.size} people are typing...`}
        </div>
      )}
      
      <input
        type="text"
        placeholder="Type a message..."
        onFocus={handleTypingStart}
        onBlur={handleTypingStop}
      />
    </div>
  );
};
```

### **Match Online Status Component**

```typescript
import React, { useEffect, useState } from 'react';
import { webSocketService, PresenceUser } from '@/services/websocket-service';

const MatchesOnlineComponent = () => {
  const [onlineMatches, setOnlineMatches] = useState<PresenceUser[]>([]);

  useEffect(() => {
    // Subscribe to matches presence
    webSocketService.subscribeToMatchesPresence();

    // Get initial online matches
    webSocketService.getOnlineMatches().then(setOnlineMatches);

    const handleMatchStatusChange = ({ userId, isOnline }: any) => {
      setOnlineMatches(prev => 
        prev.map(match => 
          match.id === userId 
            ? { ...match, is_online: isOnline }
            : match
        )
      );
    };

    webSocketService.on('presence.online.status.changed', handleMatchStatusChange);

    return () => {
      webSocketService.off('presence.online.status.changed', handleMatchStatusChange);
    };
  }, []);

  return (
    <div className="online-matches">
      <h3>Online Matches</h3>
      {onlineMatches.map(match => (
        <div key={match.id} className="match-item">
          <div className="avatar">
            <img src={match.avatar} alt={match.name} />
            {match.is_online && <span className="online-dot"></span>}
          </div>
          <div className="match-info">
            <h4>{match.name}</h4>
            <span className={match.is_online ? 'online' : 'offline'}>
              {match.is_online ? 'Online now' : `Last seen ${match.last_seen}`}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};
```

## 🎛️ **Manual Presence Management**

### **Update Online Status**

```typescript
// Set user online
await webSocketService.updateOnlineStatus(true);

// Set user offline  
await webSocketService.updateOnlineStatus(false);

// Send heartbeat to maintain online status
await webSocketService.sendPresenceHeartbeat();
```

### **Get Online Users**

```typescript
// Get online users in specific chat
const onlineInChat = await webSocketService.getOnlineUsersInChat(chatId);

// Get online matches
const onlineMatches = await webSocketService.getOnlineMatches();
```

## 🎨 **CSS Styling Examples**

```css
/* Online indicator */
.online-indicator {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 12px;
  height: 12px;
  background: #4CAF50;
  border: 2px solid white;
  border-radius: 50%;
}

/* Typing indicator */
.typing-indicator {
  padding: 8px 12px;
  background: #f5f5f5;
  border-radius: 18px;
  color: #666;
  font-style: italic;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Online users list */
.online-users {
  padding: 16px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.online-user {
  display: flex;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #eee;
}

.avatar {
  position: relative;
  width: 40px;
  height: 40px;
  margin-right: 12px;
}

.avatar img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}
```

## 🔧 **Advanced Configuration**

### **Presence Heartbeat Interval**

The presence heartbeat runs every 30 seconds automatically. You can manually trigger it:

```typescript
// Manual heartbeat
await webSocketService.sendPresenceHeartbeat();

// Custom heartbeat interval
setInterval(async () => {
  if (webSocketService.isConnected()) {
    await webSocketService.sendPresenceHeartbeat();
  }
}, 15000); // Every 15 seconds
```

### **Connection Quality Monitoring**

```typescript
webSocketService.on('connection.state.changed', ({ state, quality }) => {
  console.log(`Connection: ${state} (${quality})`);
  
  // Adjust presence features based on connection quality
  if (quality === 'poor') {
    // Reduce presence updates
    console.log('Reducing presence updates due to poor connection');
  } else if (quality === 'excellent') {
    // Enable all presence features
    console.log('All presence features enabled');
  }
});
```

## 🚨 **Error Handling**

```typescript
// Handle presence errors
webSocketService.on('connection.error', ({ error, canRetry }) => {
  console.error('Presence connection error:', error);
  
  if (!canRetry) {
    // Show offline mode UI
    showOfflineMode();
  }
});

// Fallback for presence failures
try {
  await webSocketService.updateOnlineStatus(true);
} catch (error) {
  console.error('Failed to update online status:', error);
  // Continue with offline functionality
}
```

## 📊 **Performance Tips**

1. **Unsubscribe when not needed**:
   ```typescript
   // Unsubscribe from chat presence when leaving chat
   webSocketService.unsubscribeFromChatPresence(chatId);
   ```

2. **Batch presence updates**:
   ```typescript
   // Update multiple statuses together
   await Promise.all([
     webSocketService.updateOnlineStatus(true),
     webSocketService.updateTypingStatus(chatId, false)
   ]);
   ```

3. **Use connection quality to optimize**:
   ```typescript
   const metrics = webSocketService.getConnectionMetrics();
   if (metrics.quality === 'poor') {
     // Reduce presence update frequency
   }
   ```

## 🎉 **Summary**

Your presence system is now fully integrated with:

✅ **Fixed heartbeat timeouts**  
✅ **Real-time online status tracking**  
✅ **Chat presence indicators**  
✅ **Typing status management**  
✅ **Match online status monitoring**  
✅ **Automatic presence heartbeats**  
✅ **Comprehensive error handling**  
✅ **Performance optimization**  

The system automatically handles:
- Setting users online when connected
- Maintaining online status with heartbeats
- Setting users offline when disconnected
- Managing presence channel subscriptions
- Cleaning up resources on disconnect

Your dating app now has enterprise-level presence functionality! 🚀 