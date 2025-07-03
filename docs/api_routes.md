# YorYor API Routes Documentation

This document provides a comprehensive list of all API endpoints available in the YorYor dating application.

## Base URL
All API endpoints are prefixed with `/api`

## Authentication
Most endpoints require authentication using Laravel Sanctum. Include the token in the Authorization header:
```
Authorization: Bearer {your_token}
```

## Response Format
All API endpoints return JSON with the following structure:

**Success Response:**
```json
{
  "status": "success",
  "message": "Operation completed successfully",
  "data": { ... }
}
```

**Error Response:**
```json
{
  "status": "error",
  "message": "Error description",
  "errors": { ... }
}
```
---

## Public Endpoints

### Countries

| Method | Endpoint | Description | Authentication Required |
|--------|----------|-------------|------------------------|
| GET | `/api/v1/countries` | Get all countries from the database | No |

#### Example Response
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "United States",
      "code": "US",
      "created_at": "2023-01-01T00:00:00.000000Z",
      "updated_at": "2023-01-01T00:00:00.000000Z"
    }
  ]
}
```

---

## Broadcasting Authentication

| Method | Endpoint | Description | Authentication Required |
|--------|----------|-------------|------------------------|
| POST | `/api/v1/broadcasting/auth` | Authenticate user for broadcasting channels | Yes |

### Request Body
```json
{
  "channel_name": "private-chat.1",
  "socket_id": "123.456"
}
```

### Example Response
```json
{
  "auth": "pusher_auth_signature",
  "channel_data": "{}"
}
```

### Error Responses
```json
{
  "error": "Unauthorized"
}
```

---

## Authentication Endpoints

### Main Authentication (OTP-based)

| Method | Endpoint | Description | Authentication Required |
|--------|----------|-------------|------------------------|
| POST | `/api/v1/auth/authenticate` | Send OTP or verify OTP for authentication | No |
| POST | `/api/v1/auth/check-email` | Check if email is already taken | No |
| POST | `/api/v1/auth/logout` | Logout the authenticated user | Yes |
| POST | `/api/v1/auth/complete-registration` | Complete user registration | Yes |

#### Authenticate (Send OTP)
**Request:**
```json
{
  "phone": "+1234567890"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "OTP sent successfully",
  "data": {
    "otp_sent": true,
    "authenticated": false,
    "registration_completed": false,
    "phone": "+1234567890",
    "expires_in": 300
  }
}
```

#### Authenticate (Verify OTP)
**Request:**
```json
{
  "phone": "+1234567890",
  "otp": "1234"
}
```

**Response (New User):**
```json
{
  "status": "success",
  "message": "Authentication successful",
  "data": {
    "otp_sent": false,
    "authenticated": true,
    "registration_completed": false,
    "user": {
      "id": 1,
      "phone": "+1234567890",
      "registration_completed": false,
      "created_at": "2023-01-01T00:00:00.000000Z",
      "updated_at": "2023-01-01T00:00:00.000000Z"
    },
    "token": "1|abcdefghijklmnopqrstuvwxyz1234567890"
  }
}
```

**Response (Existing User):**
```json
{
  "status": "success",
  "message": "Authentication successful",
  "data": {
    "otp_sent": false,
    "authenticated": true,
    "registration_completed": true,
    "user": {
      "id": 1,
      "phone": "+1234567890",
      "email": "user@example.com",
      "registration_completed": true,
      "profile": {
        "first_name": "John",
        "last_name": "Doe",
        "bio": "Hello world!"
      },
      "photos": [],
      "likes": []
    },
    "token": "1|abcdefghijklmnopqrstuvwxyz1234567890"
  }
}
```

#### Check Email
**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "is_taken": false,
    "email": "user@example.com"
  }
}
```

#### Complete Registration
**Request:**
```json
{
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1990-01-01",
  "gender": "male",
  "age": 31,
  "bio": "Hello, I'm John!",
  "interests": ["music", "sports"],
  "country": "United States",
  "countryCode": "US",
  "state": "California",
  "city": "Los Angeles"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Registration completed successfully",
  "data": {
    "user": {
      "id": 1,
      "phone": "+1234567890",
      "email": "user@example.com",
      "registration_completed": true,
      "photos": []
    }
  }
}
```
---

## Home Dashboard

| Method | Endpoint | Description | Authentication Required |
|--------|----------|-------------|------------------------|
| GET | `/api/v1/home` | Get home dashboard data | Yes |

### Example Response
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": 1,
      "phone": "+1234567890",
      "full_name": "John Doe",
      "age": 31,
      "is_online": true,
      "last_active_at": "2023-01-01T12:00:00.000000Z",
      "registration_completed": true
    },
    "profile": {
      "first_name": "John",
      "last_name": "Doe",
      "bio": "Hello world!"
    },
    "stats": {
      "unread_messages_count": 5,
      "new_likes_count": 3,
      "matches_count": 10
    }
  }
}
```

---

## Profile Management

| Method | Endpoint | Description | Authentication Required |
|--------|----------|-------------|------------------------|
| GET | `/api/v1/profile/me` | Get authenticated user's profile | Yes |
| PUT | `/api/v1/profile/{profile}` | Update a profile | Yes |

### Get My Profile Response
```json
{
  "status": "success",
  "data": {
    "id": 1,
    "user_id": 1,
    "first_name": "John",
    "last_name": "Doe",
    "date_of_birth": "1990-01-01",
    "gender": "male",
    "bio": "Hello, I'm John!",
    "location": "Los Angeles, CA"
  }
}
```

### Update Profile
**Request:**
```json
{
  "first_name": "John",
  "last_name": "Smith",
  "bio": "Updated bio",
  "location": "New York, NY"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Profile updated successfully",
  "data": {
    "id": 1,
    "first_name": "John",
    "last_name": "Smith",
    "bio": "Updated bio"
  }
}
```

---

## Photo Management

| Method | Endpoint | Description | Authentication Required |
|--------|----------|-------------|------------------------|
| GET | `/api/v1/photos` | Get user's photos | Yes |
| POST | `/api/v1/photos/upload` | Upload a new photo | Yes |
| DELETE | `/api/v1/photos/{id}` | Delete a photo | Yes |

### Get Photos Response
```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "user_id": 1,
      "photo_url": "https://example.com/photos/1.jpg",
      "is_profile_photo": true,
      "order": 0,
      "is_private": false
    }
  ]
}
```

### Upload Photo
**Request:** (multipart/form-data)
- `photo`: File
- `is_profile_photo`: boolean
- `order`: integer
- `is_private`: boolean

**Response:**
```json
{
  "status": "success",
  "message": "Photo uploaded successfully",
  "data": {
    "id": 2,
    "user_id": 1,
    "photo_url": "https://example.com/photos/2.jpg",
    "is_profile_photo": false,
    "order": 1
  }
}
```

---

## Matches

| Method | Endpoint | Description | Authentication Required |
|--------|----------|-------------|------------------------|
| GET | `/api/v1/matches/potential` | Get potential matches | Yes |
| GET | `/api/v1/matches` | Get user's matches | Yes |
| POST | `/api/v1/matches` | Create a match | Yes |
| DELETE | `/api/v1/matches/{id}` | Delete a match | Yes |

### Get Potential Matches Response
```json
{
  "data": [
    {
      "id": 2,
      "email": "jane@example.com",
      "profile": {
        "first_name": "Jane",
        "last_name": "Doe",
        "age": 28,
        "bio": "Hello, I'm Jane!"
      },
      "photos": [
        {
          "id": 3,
          "photo_url": "https://example.com/photos/jane1.jpg",
          "is_profile_photo": true
        }
      ]
    }
  ],
  "status": "success"
}
```

### Create Match
**Request:**
```json
{
  "user_id": 2
}
```

**Response:**
```json
{
  "data": {
    "id": 1,
    "user_id": 1,
    "matched_user_id": 2,
    "matched_at": "2023-01-01T12:00:00.000000Z",
    "is_mutual": false
  },
  "status": "success",
  "message": "Match created successfully"
}
```

---

## Likes and Dislikes

| Method | Endpoint | Description | Authentication Required |
|--------|----------|-------------|------------------------|
| POST | `/api/v1/likes` | Like a user | Yes |
| POST | `/api/v1/dislikes` | Dislike a user | Yes |
| GET | `/api/v1/likes/received` | Get received likes | Yes |
| GET | `/api/v1/likes/sent` | Get sent likes | Yes |

### Like User
**Request:**
```json
{
  "user_id": 2
}
```

**Response (No Match):**
```json
{
  "status": "success",
  "message": "User liked successfully",
  "data": {
    "like": {
      "id": 1,
      "user_id": 1,
      "liked_user_id": 2,
      "liked_at": "2023-01-01T12:00:00.000000Z"
    },
    "is_match": false
  }
}
```

**Response (Match Created):**
```json
{
  "status": "success",
  "message": "User liked successfully",
  "data": {
    "like": {
      "id": 1,
      "user_id": 1,
      "liked_user_id": 2
    },
    "is_match": true,
    "match": {
      "id": 1,
      "user_id": 1,
      "matched_user_id": 2
    },
    "chat": {
      "id": 1,
      "type": "private",
      "is_active": true
    },
    "liked_user": {
      "id": 2,
      "profile": {
        "first_name": "Jane",
        "last_name": "Doe"
      }
    }
  }
}
```

### Dislike User
**Request:**
```json
{
  "user_id": 3
}
```

**Response:**
```json
{
  "status": "success",
  "message": "User disliked successfully",
  "data": {
    "dislike": {
      "id": 1,
      "user_id": 1,
      "disliked_user_id": 3
    }
  }
}
```

---

## Chat System

| Method | Endpoint | Description | Authentication Required |
|--------|----------|-------------|------------------------|
| GET | `/api/v1/chats` | Get user's chats | Yes |
| POST | `/api/v1/chats/create` | Create or get existing chat | Yes |
| GET | `/api/v1/chats/unread-count` | Get unread message count | Yes |
| GET | `/api/v1/chats/{id}` | Get specific chat with messages | Yes |
| DELETE | `/api/v1/chats/{id}` | Delete/leave a chat | Yes |
| POST | `/api/v1/chats/{id}/messages` | Send a message | Yes |
| POST | `/api/v1/chats/{id}/read` | Mark messages as read | Yes |
| PUT | `/api/v1/chats/{chat_id}/messages/{message_id}` | Edit a message | Yes |
| DELETE | `/api/v1/chats/{chat_id}/messages/{message_id}` | Delete a message | Yes |

### Get Chats Response
```json
{
  "status": "success",
  "data": {
    "chats": [
      {
        "id": 1,
        "last_message": {
          "id": 3,
          "content": "How are you?",
          "is_mine": false,
          "is_read": false,
          "created_at": "2023-01-01T12:05:00.000000Z"
        },
        "unread_count": 1,
        "other_user": {
          "id": 2,
          "profile": {
            "first_name": "Jane",
            "last_name": "Doe"
          },
          "profile_photo": {
            "photo_url": "https://example.com/photos/jane.jpg"
          }
        }
      }
    ],
    "pagination": {
      "total": 1,
      "per_page": 10,
      "current_page": 1,
      "last_page": 1
    }
  }
}
```

### Create or Get Chat
**Request:**
```json
{
  "user_id": 2
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Chat created",
  "data": {
    "chat": {
      "id": 1,
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

### Get Chat Messages Response
```json
{
  "status": "success",
  "data": {
    "chat": {
      "id": 1,
      "other_user": {
        "id": 2,
        "profile": {
          "first_name": "Jane",
          "last_name": "Doe"
        }
      }
    },
    "messages": [
      {
        "id": 1,
        "content": "Hello!",
        "media_url": null,
        "message_type": "text",
        "is_mine": false,
        "is_read": true,
        "sent_at": "2023-01-01T12:00:00.000000Z",
        "sender": {
          "id": 2,
          "email": "jane@example.com"
        }
      }
    ],
    "pagination": {
      "total": 1,
      "per_page": 20,
      "current_page": 1,
      "last_page": 1
    }
  }
}
```

### Send Message
**Request (Text):**
```json
{
  "content": "Hello, how are you?"
}
```

**Request (Media - multipart/form-data):**
- `content`: "Check out this photo!"
- `media_file`: File
- `message_type`: "image"
- `reply_to_message_id`: 123 (optional)

**Response:**
```json
{
  "status": "success",
  "message": "Message sent successfully",
  "data": {
    "message": {
      "id": 4,
      "chat_id": 1,
      "sender_id": 1,
      "content": "Hello, how are you?",
      "media_url": null,
      "message_type": "text",
      "is_mine": true,
      "is_read": false,
      "sent_at": "2023-01-01T12:10:00.000000Z"
    }
  }
}
```

### Edit Message
**Request:**
```json
{
  "content": "Updated message content"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Message edited successfully",
  "data": {
    "message": {
      "id": 1,
      "content": "Updated message content",
      "is_edited": true,
      "edited_at": "2023-01-01T12:15:00.000000Z"
    }
  }
}
```

### Get Unread Count Response
```json
{
  "status": "success",
  "data": {
    "total_unread": 15,
    "chats": [
      {
        "chat_id": 1,
        "unread_count": 5
      }
    ]
  }
}
```

---

## User Preferences

| Method | Endpoint | Description | Authentication Required |
|--------|----------|-------------|------------------------|
| GET | `/api/v1/preferences` | Get user preferences | Yes |
| PUT | `/api/v1/preferences` | Update user preferences | Yes |

### Get Preferences Response
```json
{
  "success": true,
  "data": {
    "user_id": 1,
    "search_radius": 25,
    "preferred_genders": ["female"],
    "min_age": 18,
    "max_age": 35,
    "distance_unit": "km",
    "show_me_globally": false,
    "languages_spoken": ["English"],
    "hobbies_interests": ["music", "travel"]
  }
}
```

### Update Preferences
**Request:**
```json
{
  "search_radius": 30,
  "preferred_genders": ["female"],
  "min_age": 20,
  "max_age": 40,
  "distance_unit": "miles",
  "show_me_globally": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Preferences updated successfully",
  "data": {
    "search_radius": 30,
    "preferred_genders": ["female"],
    "min_age": 20,
    "max_age": 40
  }
}
```

---

## Video/Voice Calling (Agora)

| Method | Endpoint | Description | Authentication Required |
|--------|----------|-------------|------------------------|
| POST | `/api/v1/agora/token` | Generate Agora RTC token | Yes |
| POST | `/api/v1/agora/initiate` | Initiate a call | Yes |
| POST | `/api/v1/agora/{callId}/join` | Join an existing call | Yes |
| POST | `/api/v1/agora/{callId}/end` | End a call | Yes |
| POST | `/api/v1/agora/{callId}/reject` | Reject an incoming call | Yes |
| GET | `/api/v1/agora/history` | Get call history | Yes |

### Generate Token
**Request:**
```json
{
  "channel_name": "call_channel_123",
  "uid": "1",
  "role": 2
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "token": "agora_rtc_token_here",
    "channel_name": "call_channel_123",
    "uid": "1",
    "expires_in": 3600
  }
}
```

### Initiate Call
**Request:**
```json
{
  "receiver_id": 2,
  "type": "video"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "call_id": 1,
    "channel_name": "call_channel_123",
    "token": "agora_rtc_token_here",
    "type": "video",
    "caller": {
      "id": 1,
      "name": "John Doe"
    },
    "receiver": {
      "id": 2,
      "name": "Jane Doe"
    }
  }
}
```

### Call History Response
```json
{
  "status": "success",
  "data": {
    "data": [
      {
        "id": 1,
        "caller_id": 1,
        "receiver_id": 2,
        "type": "video",
        "status": "completed",
        "duration": 120,
        "created_at": "2023-01-01T12:00:00.000000Z",
        "caller": {
          "id": 1,
          "name": "John Doe"
        },
        "receiver": {
          "id": 2,
          "name": "Jane Doe"
        }
      }
    ],
    "total": 1,
    "per_page": 15,
    "current_page": 1
  }
}
```

---

## Video Calling (Video SDK)

| Method | Endpoint | Description | Authentication Required |
|--------|----------|-------------|------------------------|
| POST | `/api/v1/video-call/token` | Get Video SDK token | Yes |
| POST | `/api/v1/video-call/create-meeting` | Create a meeting | Yes |
| GET | `/api/v1/video-call/validate-meeting/{meetingId}` | Validate meeting | Yes |
| POST | `/api/v1/video-call/initiate` | Initiate video call | Yes |
| POST | `/api/v1/video-call/{callId}/join` | Join video call | Yes |
| POST | `/api/v1/video-call/{callId}/end` | End video call | Yes |
| POST | `/api/v1/video-call/{callId}/reject` | Reject video call | Yes |
| GET | `/api/v1/video-call/history` | Get video call history | Yes |

### Get Token Response
```json
{
  "token": "video_sdk_token_here",
  "success": true
}
```

### Create Meeting
**Request:**
```json
{
  "customRoomId": "room_123"
}
```

**Response:**
```json
{
  "meetingId": "meeting_abc123",
  "token": "video_sdk_token_here",
  "success": true
}
```

### Validate Meeting Response
```json
{
  "valid": true,
  "meetingId": "meeting_abc123",
  "success": true
}
```

---

## Stories

| Method | Endpoint | Description | Authentication Required |
|--------|----------|-------------|------------------------|
| GET | `/api/v1/stories` | Get user's own stories | Yes |
| POST | `/api/v1/stories` | Create a new story | Yes |
| DELETE | `/api/v1/stories/{id}` | Delete a story | Yes |
| GET | `/api/v1/stories/matches` | Get stories from matched users | Yes |

### Get User Stories Response
```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "user_id": 1,
      "media_url": "https://example.com/stories/1.jpg",
      "thumbnail_url": "https://example.com/stories/thumbs/1.jpg",
      "type": "image",
      "caption": "Beautiful sunset!",
      "status": "active",
      "is_expired": false,
      "created_at": "2023-01-01T12:00:00.000000Z",
      "expires_at": "2023-01-02T12:00:00.000000Z"
    }
  ]
}
```

### Create Story
**Request (multipart/form-data):**
- `media`: File
- `type`: "image" or "video"
- `caption`: "Beautiful sunset!" (optional)

**Response:**
```json
{
  "data": {
    "id": 2,
    "user_id": 1,
    "media_url": "https://example.com/stories/2.jpg",
    "type": "image",
    "caption": "Beautiful sunset!",
    "status": "active",
    "expires_at": "2023-01-02T12:00:00.000000Z"
  },
  "status": "success",
  "message": "Story created successfully"
}
```

### Get Matched User Stories Response
```json
{
  "status": "success",
  "data": [
    {
      "id": 3,
      "user_id": 2,
      "media_url": "https://example.com/stories/3.jpg",
      "type": "image",
      "caption": "Great day!",
      "status": "active",
      "user": {
        "id": 2,
        "profile": {
          "first_name": "Jane",
          "last_name": "Doe"
        },
        "profile_photo": {
          "photo_url": "https://example.com/photos/jane.jpg"
        }
      }
    }
  ]
}
```

---

## Device Tokens (Push Notifications)

| Method | Endpoint | Description | Authentication Required |
|--------|----------|-------------|------------------------|
| POST | `/api/v1/device-tokens` | Store device token for push notifications | Yes |

### Store Device Token
**Request:**
```json
{
  "token": "device_push_token_here",
  "deviceName": "iPhone 12",
  "brand": "Apple",
  "modelName": "iPhone12,1",
  "osName": "iOS",
  "osVersion": "15.0",
  "deviceType": "PHONE",
  "isDevice": true,
  "manufacturer": "Apple"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Device token stored successfully",
  "data": {
    "id": 1,
    "user_id": 1,
    "token": "device_push_token_here",
    "device_name": "iPhone 12",
    "device_type": "PHONE",
    "is_device": true
  }
}
```

---

## Error Codes

### Common HTTP Status Codes

- **200**: Success
- **201**: Created successfully
- **400**: Bad request (invalid data)
- **401**: Unauthenticated (invalid or missing token)
- **403**: Forbidden (insufficient permissions)
- **404**: Not found
- **409**: Conflict (duplicate action)
- **422**: Validation error
- **429**: Too many requests (rate limited)
- **500**: Internal server error

### Common Error Responses

**Validation Error (422):**
```json
{
  "status": "error",
  "message": "Validation failed",
  "errors": {
    "email": ["The email field is required."],
    "phone": ["The phone field must be a valid phone number."]
  }
}
```

**Authentication Error (401):**
```json
{
  "status": "error",
  "message": "Unauthenticated"
}
```

**Authorization Error (403):**
```json
{
  "status": "error",
  "message": "You are not authorized to perform this action"
}
```

**Not Found Error (404):**
```json
{
  "status": "error",
  "message": "Resource not found"
}
```

**Rate Limit Error (429):**
```json
{
  "status": "error",
  "message": "Too many requests. Please try again later."
}
```

---

## Pagination

Endpoints that return lists support pagination with these query parameters:

- `page`: Page number (default: 1)
- `per_page`: Items per page (varies by endpoint)

**Paginated Response Format:**
```json
{
  "status": "success",
  "data": {
    "items": [...],
    "pagination": {
      "total": 100,
      "per_page": 10,
      "current_page": 1,
      "last_page": 10
    }
  }
}
```

---

## Real-time Events

The application supports real-time events via broadcasting for:

- New messages in chats
- Message read receipts
- User typing indicators
- Call status changes
- Match notifications

Subscribe to appropriate channels using the broadcasting authentication endpoint.

