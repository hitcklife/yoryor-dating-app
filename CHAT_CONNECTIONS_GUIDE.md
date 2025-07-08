# Chat Connections & API Calls Guide

## 🎯 **Overview**

This guide shows exactly what **WebSocket connections** and **API calls** are established when users interact with chats in your dating app.

## 📱 **When User Opens a Chat**

### **1. WebSocket Connections Established**

```typescript
// When user opens chat with ID 123
const chatId = 123;

// 1. Subscribe to private chat channel
webSocketService.subscribeToChat(chatId);
// → Establishes: private channel `chat.123`

// 2. Subscribe to chat presence channel  
webSocketService.subscribeToChatPresence(chatId);
// → Establishes: presence channel `presence-chat.123`
```

### **2. API Calls Made**

```typescript
// 1. Get chat messages (when chat screen loads)
const response = await apiClient.chats.getById(chatId, 1, 20);
// → API Call: GET /api/v1/chats/123?page=1&per_page=20

// 2. Get online users in chat
const onlineUsers = await webSocketService.getOnlineUsersInChat(chatId);
// → API Call: GET /api/v1/presence/chats/123/online-users

// 3. Mark user as online in chat
await webSocketService.updateOnlineStatus(true);
// → API Call: POST /api/v1/presence/status
```

### **3. Event Listeners Set Up**

```typescript
// Chat message events
webSocketService.on('chat.message.new', handleNewMessage);
webSocketService.on('chat.message.edited', handleMessageEdit);
webSocketService.on('chat.message.deleted', handleMessageDelete);
webSocketService.on('chat.message.read', handleMessageRead);

// Chat presence events
webSocketService.on('presence.chat.user.joined', handleUserJoinedChat);
webSocketService.on('presence.chat.user.left', handleUserLeftChat);
webSocketService.on('chat.typing', handleTypingIndicator);
```

## ⌨️ **When User Starts Typing**

### **1. WebSocket Connections**

```typescript
// When user starts typing in chat 123
const chatId = 123;

// 1. Send typing indicator via WebSocket whisper
webSocketService.sendTyping(chatId, {
  user_id: currentUserId,
  name: currentUserName,
  is_typing: true
});
// → Sends: whisper event on `chat.123` channel
```

### **2. API Calls Made**

```typescript
// 1. Update typing status via API
await webSocketService.updateTypingStatus(chatId, true);
// → API Call: POST /api/v1/presence/typing
// Body: { chat_id: 123, is_typing: true }
```

### **3. Real-time Events**

```typescript
// Other users in chat receive typing indicator
webSocketService.on('chat.typing', (data) => {
  console.log(`${data.user_name} is typing...`);
  showTypingIndicator(data.user_id);
});
```

## 📤 **When User Sends a Message**

### **1. API Calls Made**

```typescript
// 1. Send message via API
const response = await apiClient.chats.sendMessage(chatId, {
  content: "Hello!",
  message_type: "text"
});
// → API Call: POST /api/v1/chats/123/messages
// Body: { content: "Hello!", message_type: "text" }
```

### **2. WebSocket Events**

```typescript
// 2. Message is broadcast via WebSocket to all chat participants
webSocketService.on('chat.message.new', (message) => {
  console.log('New message received:', message);
  addMessageToChat(message);
});
// → Receives: .MessageSent event on `chat.123` channel
```

## 👀 **When User Reads Messages**

### **1. API Calls Made**

```typescript
// 1. Mark messages as read (when user views chat)
await apiClient.chats.markAsRead(messageId);
// → API Call: POST /api/v1/chats/messages/{messageId}/read
```

### **2. WebSocket Events**

```typescript
// 2. Read receipts are broadcast to message sender
webSocketService.on('chat.message.read', (data) => {
  console.log(`Message ${data.message_id} read by user ${data.user_id}`);
  updateMessageReadStatus(data.message_id, data.user_id);
});
// → Receives: .MessageRead event on `chat.123` channel
```

## 🔄 **Connection Lifecycle**

### **When Chat Opens:**

```typescript
// 1. Establish WebSocket connections
const chatChannel = webSocketService.subscribeToChat(chatId);
const presenceChannel = webSocketService.subscribeToChatPresence(chatId);

// 2. Make API calls
const messages = await apiClient.chats.getById(chatId);
const onlineUsers = await webSocketService.getOnlineUsersInChat(chatId);

// 3. Set up event listeners
webSocketService.on('chat.message.new', handleNewMessage);
webSocketService.on('chat.typing', handleTyping);
```

### **When Chat Closes:**

```typescript
// 1. Unsubscribe from channels
webSocketService.unsubscribeFromChat(chatId);
webSocketService.unsubscribeFromChatPresence(chatId);

// 2. Remove event listeners
webSocketService.off('chat.message.new', handleNewMessage);
webSocketService.off('chat.typing', handleTyping);

// 3. Update presence status
await webSocketService.updateOnlineStatus(false);
```

## 📊 **Connection Summary**

### **Active Connections Per Chat:**

| Connection Type | Channel Name | Purpose |
|----------------|--------------|---------|
| **Private Channel** | `chat.{chatId}` | Real-time messages, edits, deletes, read receipts |
| **Presence Channel** | `presence-chat.{chatId}` | User online status in chat, typing indicators |
| **Whisper Events** | `chat.{chatId}` | Real-time typing indicators |

### **API Endpoints Used:**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/chats/{id}` | GET | Load chat messages |
| `/api/v1/chats/{id}/messages` | POST | Send new message |
| `/api/v1/presence/status` | POST | Update online status |
| `/api/v1/presence/typing` | POST | Update typing status |
| `/api/v1/presence/chats/{id}/online-users` | GET | Get online users in chat |

## 🏗️ **React Component Example**

```typescript
import React, { useEffect, useState } from 'react';
import { webSocketService } from '@/services/websocket-service';

const ChatScreen = ({ chatId }: { chatId: number }) => {
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    // 1. Subscribe to chat channels
    webSocketService.subscribeToChat(chatId);
    webSocketService.subscribeToChatPresence(chatId);

    // 2. Load initial data
    loadChatData();
    loadOnlineUsers();

    // 3. Set up event listeners
    const handleNewMessage = (message) => {
      setMessages(prev => [...prev, message]);
    };

    const handleTyping = ({ user_id, user_name }) => {
      setTypingUsers(prev => new Set([...prev, user_id]));
      // Auto-remove after 3 seconds
      setTimeout(() => {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(user_id);
          return newSet;
        });
      }, 3000);
    };

    webSocketService.on('chat.message.new', handleNewMessage);
    webSocketService.on('chat.typing', handleTyping);

    return () => {
      // Cleanup
      webSocketService.off('chat.message.new', handleNewMessage);
      webSocketService.off('chat.typing', handleTyping);
      webSocketService.unsubscribeFromChat(chatId);
      webSocketService.unsubscribeFromChatPresence(chatId);
    };
  }, [chatId]);

  const loadChatData = async () => {
    try {
      const response = await apiClient.chats.getById(chatId);
      if (response.status === 'success') {
        setMessages(response.data.messages || []);
      }
    } catch (error) {
      console.error('Error loading chat:', error);
    }
  };

  const loadOnlineUsers = async () => {
    try {
      const users = await webSocketService.getOnlineUsersInChat(chatId);
      console.log('Online users in chat:', users);
    } catch (error) {
      console.error('Error loading online users:', error);
    }
  };

  const handleTypingStart = () => {
    setIsTyping(true);
    webSocketService.sendTyping(chatId, {
      user_id: currentUserId,
      name: currentUserName
    });
    webSocketService.updateTypingStatus(chatId, true);
  };

  const handleTypingStop = () => {
    setIsTyping(false);
    webSocketService.updateTypingStatus(chatId, false);
  };

  const sendMessage = async (content: string) => {
    try {
      const response = await apiClient.chats.sendMessage(chatId, {
        content,
        message_type: 'text'
      });
      
      if (response.status === 'success') {
        console.log('Message sent successfully');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <div className="chat-screen">
      {/* Messages */}
      <div className="messages">
        {messages.map(message => (
          <MessageItem key={message.id} message={message} />
        ))}
      </div>

      {/* Typing indicators */}
      {typingUsers.size > 0 && (
        <div className="typing-indicator">
          {Array.from(typingUsers).length === 1 
            ? 'Someone is typing...' 
            : `${typingUsers.size} people are typing...`}
        </div>
      )}

      {/* Message input */}
      <input
        type="text"
        placeholder="Type a message..."
        onFocus={handleTypingStart}
        onBlur={handleTypingStop}
        onChange={(e) => {
          if (e.target.value.length > 0 && !isTyping) {
            handleTypingStart();
          }
        }}
      />
    </div>
  );
};
```

## 🔍 **Debugging Connections**

### **Check Active Channels:**

```typescript
// See all active WebSocket channels
const activeChannels = webSocketService.getActiveChannels();
console.log('Active channels:', activeChannels);
// Output: ['chat.123', 'presence-chat.123', 'user.456', 'presence-online-users']
```

### **Monitor Connection Quality:**

```typescript
// Monitor connection health
webSocketService.on('connection.state.changed', ({ state, quality }) => {
  console.log(`Connection: ${state} (${quality})`);
});

// Get connection metrics
const metrics = webSocketService.getConnectionMetrics();
console.log('Connection metrics:', metrics);
```

### **Check Message Queue:**

```typescript
// Check if messages are queued (offline)
const queueSize = webSocketService.getQueueSize();
console.log('Messages in queue:', queueSize);
```

## 🚀 **Performance Optimizations**

### **1. Lazy Channel Subscription**
- Channels are only subscribed when chat is opened
- Automatic cleanup when chat is closed
- Max 10 concurrent channels to prevent overload

### **2. Activity Tracking**
- Channels are marked as active when used
- Inactive channels are automatically unsubscribed after 5 minutes
- Prevents memory leaks and unnecessary connections

### **3. Message Queuing**
- Failed messages are queued when offline
- Automatic retry when connection is restored
- Priority-based processing (calls > messages > typing)

## 📈 **Connection Statistics**

### **Typical Chat Session:**

| Action | WebSocket Events | API Calls | Real-time Updates |
|--------|------------------|-----------|-------------------|
| **Open Chat** | 2 channels subscribed | 3 API calls | Online users, typing status |
| **Start Typing** | 1 whisper event | 1 API call | Typing indicator to others |
| **Send Message** | 1 broadcast event | 1 API call | Message to all participants |
| **Read Message** | 1 read receipt | 1 API call | Read status to sender |
| **Close Chat** | 2 channels unsubscribed | 1 API call | Offline status update |

### **Connection Efficiency:**

- **Minimal API calls** - Only when needed
- **Real-time WebSocket** - Instant updates
- **Automatic cleanup** - No memory leaks
- **Offline support** - Message queuing
- **Connection monitoring** - Health tracking

Your chat system is now **highly optimized** with efficient connections and real-time updates! 🎯 