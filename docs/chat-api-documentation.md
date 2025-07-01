# Chat API Documentation for Mobile App

## Overview

This document provides comprehensive documentation for the chat API endpoints optimized for mobile applications. The API supports real-time messaging, read receipts, unread counts, and media sharing.

## Base URL
```
https://your-api-domain.com/api/v1
```

## Authentication

All endpoints require Bearer token authentication:
```
Authorization: Bearer {your-access-token}
```

## Error Handling

All API responses follow a consistent format:

### Success Response
```json
{
    "status": "success",
    "message": "Operation completed successfully",
    "data": {
        // Response data here
    }
}
```

### Error Response
```json
{
    "status": "error",
    "message": "Error description",
    "error": "Detailed error message (in development only)"
}
```

## API Endpoints

### 1. Get All Chats

Get all chats for the authenticated user with pagination.

**Endpoint:** `GET /chats`

**Parameters:**
- `page` (optional): Page number (default: 1)
- `per_page` (optional): Items per page (default: 10, max: 50)

**Example Request:**
```http
GET /api/v1/chats?page=1&per_page=20
Authorization: Bearer your-token
```

**Example Response:**
```json
{
    "status": "success",
    "data": {
        "chats": [
            {
                "id": 1,
                "type": "private",
                "name": null,
                "description": null,
                "last_activity_at": "2024-01-15T10:30:00Z",
                "is_active": true,
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-01-15T10:30:00Z",
                "unread_count": 3,
                "other_user": {
                    "id": 2,
                    "profile": {
                        "first_name": "Jane",
                        "last_name": "Doe",
                        "bio": "Software Developer"
                    },
                    "profile_photo": {
                        "url": "https://example.com/photos/jane.jpg",
                        "is_profile_photo": true
                    }
                },
                "last_message": {
                    "id": 15,
                    "content": "Hey, how are you?",
                    "message_type": "text",
                    "sent_at": "2024-01-15T10:30:00Z",
                    "sender": {
                        "id": 2,
                        "email": "jane@example.com"
                    }
                }
            }
        ],
        "pagination": {
            "total": 25,
            "per_page": 20,
            "current_page": 1,
            "last_page": 2
        }
    }
}
```

### 2. Create or Get Chat

Create a new chat with another user or retrieve existing chat.

**Endpoint:** `POST /chats/create`

**Request Body:**
```json
{
    "user_id": 2
}
```

**Example Response:**
```json
{
    "status": "success",
    "message": "Chat created",
    "data": {
        "chat": {
            "id": 3,
            "type": "private",
            "is_new": true,
            "other_user": {
                "id": 2,
                "profile": {
                    "first_name": "Jane",
                    "last_name": "Doe"
                }
            }
        }
    }
}
```

### 3. Get Specific Chat with Messages

Get a specific chat with its messages and pagination.

**Endpoint:** `GET /chats/{id}`

**Parameters:**
- `page` (optional): Page number for messages (default: 1)
- `per_page` (optional): Messages per page (default: 20, max: 100)

**Example Request:**
```http
GET /api/v1/chats/1?page=1&per_page=30
Authorization: Bearer your-token
```

**Example Response:**
```json
{
    "status": "success",
    "data": {
        "chat": {
            "id": 1,
            "type": "private",
            "last_activity_at": "2024-01-15T10:30:00Z",
            "other_user": {
                "id": 2,
                "profile": {
                    "first_name": "Jane",
                    "last_name": "Doe"
                },
                "profile_photo": {
                    "url": "https://example.com/photos/jane.jpg"
                }
            }
        },
        "messages": [
            {
                "id": 15,
                "chat_id": 1,
                "sender_id": 2,
                "content": "Hey, how are you?",
                "message_type": "text",
                "media_url": null,
                "thumbnail_url": null,
                "reply_to_message_id": null,
                "status": "sent",
                "is_edited": false,
                "sent_at": "2024-01-15T10:30:00Z",
                "is_mine": false,
                "is_read": true,
                "read_at": "2024-01-15T10:35:00Z",
                "sender": {
                    "id": 2,
                    "email": "jane@example.com"
                },
                "reply_to": null
            },
            {
                "id": 14,
                "chat_id": 1,
                "sender_id": 1,
                "content": "Hi there!",
                "message_type": "text",
                "media_url": null,
                "thumbnail_url": null,
                "reply_to_message_id": null,
                "status": "sent",
                "is_edited": false,
                "sent_at": "2024-01-15T10:25:00Z",
                "is_mine": true,
                "is_read": true,
                "read_at": null,
                "sender": {
                    "id": 1,
                    "email": "user@example.com"
                }
            }
        ],
        "pagination": {
            "total": 45,
            "per_page": 30,
            "current_page": 1,
            "last_page": 2
        }
    }
}
```

### 4. Send Message

Send a new message in a chat.

**Endpoint:** `POST /chats/{id}/messages`

**Request Body:**
```json
{
    "content": "Hello, how are you?",
    "media_url": "https://example.com/media/image.jpg" // optional
}
```

**Note:** Either `content` or `media_url` is required (can have both).

**Example Response:**
```json
{
    "status": "success",
    "message": "Message sent successfully",
    "data": {
        "message": {
            "id": 16,
            "chat_id": 1,
            "sender_id": 1,
            "content": "Hello, how are you?",
            "message_type": "text",
            "media_url": null,
            "status": "sent",
            "sent_at": "2024-01-15T10:35:00Z",
            "is_mine": true,
            "is_read": true
        }
    }
}
```

### 5. Mark Messages as Read

Mark all unread messages in a chat as read.

**Endpoint:** `POST /chats/{id}/read`

**Example Response:**
```json
{
    "status": "success",
    "message": "Messages marked as read successfully",
    "data": {
        "count": 3
    }
}
```

### 6. Get Unread Count

Get total unread messages count across all chats.

**Endpoint:** `GET /chats/unread-count`

**Example Response:**
```json
{
    "status": "success",
    "data": {
        "total_unread": 15,
        "chats": [
            {
                "chat_id": 1,
                "unread_count": 3
            },
            {
                "chat_id": 2,
                "unread_count": 7
            },
            {
                "chat_id": 3,
                "unread_count": 5
            }
        ]
    }
}
```

### 7. Edit Message

Edit a text message (only text messages can be edited).

**Endpoint:** `PUT /chats/{chat_id}/messages/{message_id}`

**Request Body:**
```json
{
    "content": "Updated message content"
}
```

**Example Response:**
```json
{
    "status": "success",
    "message": "Message edited successfully",
    "data": {
        "message": {
            "id": 15,
            "chat_id": 1,
            "sender_id": 1,
            "content": "Updated message content",
            "message_type": "text",
            "media_url": null,
            "thumbnail_url": null,
            "reply_to_message_id": null,
            "status": "sent",
            "is_edited": true,
            "edited_at": "2024-01-15T10:40:00Z",
            "sent_at": "2024-01-15T10:30:00Z",
            "is_mine": true,
            "is_read": true,
            "sender": {
                "id": 1,
                "email": "user@example.com"
            }
        }
    }
}
```

**Error Responses:**
- `400`: Only text messages can be edited
- `403`: You can only edit your own messages
- `404`: Message not found

### 8. Delete Message

Delete a message (soft delete).

**Endpoint:** `DELETE /chats/{chat_id}/messages/{message_id}`

**Example Response:**
```json
{
    "status": "success",
    "message": "Message deleted successfully"
}
```

**Error Responses:**
- `403`: You can only delete your own messages
- `404`: Message not found

### 9. Delete Chat

Remove user from chat (soft delete).

**Endpoint:** `DELETE /chats/{id}`

**Example Response:**
```json
{
    "status": "success",
    "message": "Chat deleted successfully"
}
```

## Message Types

The API supports different message types:

- `text`: Regular text message
- `image`: Image file (jpg, jpeg, png, gif, webp)
- `video`: Video file (mp4, avi, mov, webm)
- `audio`: Audio file (mp3, wav, aac, m4a)
- `file`: Other file types

## Mobile App Integration Guidelines

### 1. Real-time Updates

For real-time messaging, integrate with Laravel Echo and WebSockets:

```javascript
// Listen for new messages
Echo.private(`chat.${chatId}`)
    .listen('NewMessageEvent', (e) => {
        // Add new message to chat
        addMessageToChat(e.message);
        
        // Update unread count if not in current chat
        if (currentChatId !== e.message.chat_id) {
            updateUnreadCount();
        }
    });

// Listen for message read events
Echo.private(`chat.${chatId}`)
    .listen('MessageReadEvent', (e) => {
        // Update message read status
        markMessageAsRead(e.message_id, e.read_by_user_id);
    });
```

### 2. Efficient Loading Strategy

**For Chat List:**
- Load chats with pagination (10-20 per page)
- Cache chat list locally
- Refresh on pull-to-refresh
- Update real-time with WebSocket events

**For Messages:**
- Load latest 20-30 messages initially
- Implement infinite scroll for older messages
- Cache messages locally for offline viewing
- Auto-mark as read when messages are viewed

### 3. Optimistic Updates

For better UX, implement optimistic updates:

```javascript
// Send message optimistically
function sendMessage(chatId, content) {
    // Add message to UI immediately
    const tempMessage = {
        id: 'temp_' + Date.now(),
        content: content,
        is_mine: true,
        status: 'sending',
        sent_at: new Date().toISOString()
    };
    
    addMessageToChat(tempMessage);
    
    // Send to API
    api.post(`/chats/${chatId}/messages`, { content })
        .then(response => {
            // Replace temp message with real message
            replaceMessage(tempMessage.id, response.data.message);
        })
        .catch(error => {
            // Mark message as failed
            markMessageAsFailed(tempMessage.id);
        });
}

// Edit message optimistically
function editMessage(chatId, messageId, newContent) {
    // Update message in UI immediately
    const originalMessage = getMessageById(messageId);
    updateMessageInUI(messageId, {
        content: newContent,
        is_edited: true,
        edited_at: new Date().toISOString()
    });
    
    // Send to API
    api.put(`/chats/${chatId}/messages/${messageId}`, { content: newContent })
        .then(response => {
            // Update with server response
            updateMessageInUI(messageId, response.data.message);
        })
        .catch(error => {
            // Revert to original content
            updateMessageInUI(messageId, originalMessage);
            showError('Failed to edit message');
        });
}

// Delete message optimistically
function deleteMessage(chatId, messageId) {
    // Remove message from UI immediately
    const originalMessage = getMessageById(messageId);
    removeMessageFromUI(messageId);
    
    // Send to API
    api.delete(`/chats/${chatId}/messages/${messageId}`)
        .then(() => {
            // Message successfully deleted
        })
        .catch(error => {
            // Restore message in UI
            addMessageToChat(originalMessage);
            showError('Failed to delete message');
        });
}
```

### 4. Error Handling

Implement proper error handling for common scenarios:

- **Network errors**: Show retry options
- **Authentication errors**: Redirect to login
- **Chat not found**: Remove from local cache
- **Message send failures**: Show failed status with retry option

### 5. Offline Support

Store essential data locally:

```javascript
// Store chats and recent messages
const chatStorage = {
    chats: [], // List of chats with last messages
    messages: {}, // Messages by chat_id
    unreadCounts: {} // Unread counts by chat_id
};

// Sync when online
function syncData() {
    if (navigator.onLine) {
        // Sync unread counts
        api.get('/chats/unread-count').then(updateLocalUnreadCounts);
        
        // Sync new messages for active chats
        syncMessagesForActiveChats();
    }
}
```

### 6. Performance Tips

- **Image Caching**: Cache profile photos and media locally
- **Message Pagination**: Use cursor-based pagination for better performance
- **Background Sync**: Sync data when app comes to foreground
- **Lazy Loading**: Load media only when needed
- **Debounced Typing**: Debounce "typing" indicators

## HTTP Status Codes

- `200`: Success
- `201`: Created (new chat, message sent)
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (invalid token)
- `403`: Forbidden (no access to chat)
- `404`: Not Found (chat or message not found)
- `422`: Validation Error
- `500`: Server Error

## Rate Limiting

API requests are rate-limited to prevent abuse:

- **General API**: 60 requests per minute
- **Send Message**: 30 requests per minute
- **Create Chat**: 10 requests per minute

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Request limit
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset timestamp

## WebSocket Events

Subscribe to these real-time events:

### New Message Event
```javascript
Echo.private(`chat.${chatId}`)
    .listen('NewMessageEvent', (e) => {
        console.log('New message:', e.message);
    });
```

### Message Read Event
```javascript
Echo.private(`chat.${chatId}`)
    .listen('MessageReadEvent', (e) => {
        console.log('Message read:', e);
    });
```

### User Typing Event
```javascript
Echo.private(`chat.${chatId}`)
    .listen('UserTypingEvent', (e) => {
        console.log('User typing:', e.user_id);
    });
```

### Message Edited Event
```javascript
Echo.private(`chat.${chatId}`)
    .listen('MessageEdited', (e) => {
        console.log('Message edited:', e.message);
        console.log('Original content:', e.original_content);
        console.log('Edited at:', e.edited_at);
    });
```

### Message Deleted Event
```javascript
Echo.private(`chat.${chatId}`)
    .listen('MessageDeleted', (e) => {
        console.log('Message deleted:', e.message_id);
        console.log('Deleted by user:', e.deleted_by_user_id);
        console.log('Deleted at:', e.deleted_at);
    });
```

## Security Considerations

1. **Authentication**: Always validate Bearer tokens
2. **Authorization**: Users can only access their own chats
3. **Media Validation**: Validate file types and sizes
4. **Rate Limiting**: Respect rate limits to avoid blocking
5. **Input Sanitization**: Sanitize user input before display

## Testing

Use these test endpoints to verify integration:

```bash
# Get chats
curl -H "Authorization: Bearer {token}" \
     https://your-api.com/api/v1/chats

# Send message
curl -X POST \
     -H "Authorization: Bearer {token}" \
     -H "Content-Type: application/json" \
     -d '{"content": "Test message"}' \
     https://your-api.com/api/v1/chats/1/messages

# Get unread count
curl -H "Authorization: Bearer {token}" \
     https://your-api.com/api/v1/chats/unread-count

# Edit message
curl -X PUT \
     -H "Authorization: Bearer {token}" \
     -H "Content-Type: application/json" \
     -d '{"content": "Updated message content"}' \
     https://your-api.com/api/v1/chats/1/messages/15

# Delete message
curl -X DELETE \
     -H "Authorization: Bearer {token}" \
     https://your-api.com/api/v1/chats/1/messages/15
```

This documentation provides everything needed to integrate the optimized chat API into your mobile application efficiently.