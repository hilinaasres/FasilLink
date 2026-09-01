# FasilLink API Configuration

This document outlines the API endpoints required for the FasilLink desktop marketplace UI to function properly.

## Base URL

```
http://localhost:5000/api
```

## Authentication

All protected endpoints require:
```
Authorization: Bearer {token}
```

---

## 📋 Categories Endpoints

### Get All Categories
```
GET /api/categories
```

**Response:**
```json
{
  "categories": [
    {
      "id": "1",
      "name": "Homes",
      "icon": "home",
      "count": 2400
    },
    {
      "id": "2",
      "name": "Vehicles",
      "icon": "truck",
      "count": 1850
    },
    {
      "id": "3",
      "name": "Event Materials",
      "icon": "zap",
      "count": 950
    }
  ]
}
```

### Get Category with Items
```
GET /api/categories/:categoryId
```

**Response:**
```json
{
  "category": {
    "id": "1",
    "name": "Homes",
    "items": [
      {
        "id": "item-1",
        "title": "2-Bedroom House",
        "price": 25000,
        "image": "https://...",
        "location": "Gondar",
        "rating": 4.5,
        "reviews": 12,
        "views": 450,
        "isPremium": true,
        "purpose": "rent"
      }
    ]
  }
}
```

---

## 🛍️ Items Endpoints

### Get Item Details
```
GET /api/items/:itemId
```

**Response:**
```json
{
  "item": {
    "id": "item-1",
    "title": "Beautiful 2-Bedroom Home",
    "description": "Spacious home in the heart of Gondar...",
    "price": 25000,
    "image": "https://...",
    "images": ["https://...", "https://..."],
    "location": "Gondar, Ethiopia",
    "category": "Homes",
    "rating": 4.5,
    "reviews": 12,
    "views": 450,
    "isPremium": true,
    "purpose": "rent",
    "features": ["WiFi", "Kitchen", "Parking"],
    "specifications": {
      "bedrooms": "2",
      "bathrooms": "1",
      "area": "80m²"
    },
    "owner": {
      "id": "owner-1",
      "name": "Abebe Tekle",
      "avatar": "https://...",
      "verified": true,
      "responseTime": "< 1 hour",
      "listings": 5
    },
    "createdAt": "2024-05-10T10:00:00Z"
  }
}
```

### Get Trending Items
```
GET /api/items/trending
```

**Query Parameters:**
- `limit`: number (default: 8)
- `offset`: number (default: 0)

**Response:**
```json
{
  "items": [
    {
      "id": "item-1",
      "title": "Toyota Corolla 2020",
      "price": 12500,
      "image": "https://...",
      "location": "Addis Ababa",
      "rating": 4.8,
      "reviews": 35,
      "views": 1200,
      "isPremium": true,
      "purpose": "sell"
    }
  ]
}
```

### Get Recommended Items
```
GET /api/items/recommended
```

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `limit`: number (default: 8)
- `userId`: string (from token)

**Response:**
Same as trending items

### Get Recently Added Items
```
GET /api/items/recent
```

**Query Parameters:**
- `limit`: number (default: 8)

**Response:**
Same as trending items

### Get Similar Items
```
GET /api/items/similar/:itemId
```

**Response:**
Same as trending items

---

## 🔍 Search Endpoint

### Search with Filters
```
GET /api/search
```

**Query Parameters:**
```
q=rent+car              # Search query
category=vehicles       # Filter by category
priceMin=1000          # Min price
priceMax=100000        # Max price
location=gondar        # Filter by location
sortBy=newest          # newest | price_low | price_high | popular | rating
limit=20               # Results per page
offset=0               # Pagination offset
```

**Response:**
```json
{
  "query": "rent car",
  "results": {
    "total": 45,
    "items": [
      {
        "id": "item-1",
        "title": "Toyota Corolla Rent",
        "price": 5000,
        "image": "https://...",
        "location": "Gondar",
        "rating": 4.5,
        "reviews": 12,
        "views": 450,
        "isPremium": false,
        "purpose": "rent"
      }
    ],
    "facets": {
      "categories": [
        { "name": "Vehicles", "count": 45 }
      ],
      "priceRanges": [
        { "min": 0, "max": 5000, "count": 20 },
        { "min": 5000, "max": 10000, "count": 15 }
      ]
    }
  }
}
```

---

## ❤️ Favorites Endpoints

### Get User Favorites
```
GET /api/favorites
```

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "items": [
    {
      "id": "item-1",
      "title": "2-Bedroom Home",
      "price": 25000,
      "image": "https://...",
      "location": "Gondar",
      "rating": 4.5,
      "reviews": 12,
      "views": 450,
      "isPremium": true,
      "purpose": "rent"
    }
  ]
}
```

### Add/Remove Favorite
```
POST /api/favorites/:itemId
```

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "favorited": true,
  "message": "Item added to favorites"
}
```

---

## 💬 Chat Endpoints

### Get User Chats
```
GET /api/chats
```

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "chats": [
    {
      "id": "chat-1",
      "userId": "user-2",
      "userName": "Abebe",
      "userAvatar": "https://...",
      "lastMessage": "When is it available?",
      "lastMessageTime": "2024-05-18T10:30:00Z",
      "unreadCount": 2,
      "isOnline": true
    }
  ]
}
```

### Get Chat Messages
```
GET /api/chats/:chatId/messages
```

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "messages": [
    {
      "id": "msg-1",
      "senderId": "user-1",
      "text": "Hi! Is this item still available?",
      "timestamp": "2024-05-18T10:00:00Z"
    },
    {
      "id": "msg-2",
      "senderId": "user-2",
      "text": "Yes, it is!",
      "timestamp": "2024-05-18T10:05:00Z"
    }
  ]
}
```

### Send Message
```
POST /api/chats/:chatId/messages
```

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "text": "When can I see it?"
}
```

**Response:**
```json
{
  "id": "msg-3",
  "senderId": "user-1",
  "text": "When can I see it?",
  "timestamp": "2024-05-18T10:10:00Z"
}
```

---

## 🔔 Notifications Endpoints

### Get Notifications
```
GET /api/notifications
```

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "notifications": [
    {
      "id": "notif-1",
      "type": "message",
      "title": "New Message from Abebe",
      "message": "Interested in the 2-bedroom home...",
      "timestamp": "2024-05-18T10:30:00Z",
      "read": false,
      "actionUrl": "/chats"
    },
    {
      "id": "notif-2",
      "type": "rating",
      "title": "New Review",
      "message": "⭐⭐⭐⭐⭐ Great service!",
      "timestamp": "2024-05-18T10:00:00Z",
      "read": false,
      "actionUrl": "/item/123"
    }
  ]
}
```

### Mark Notification as Read
```
POST /api/notifications/:notificationId/read
```

**Headers:**
```
Authorization: Bearer {token}
```

---

## ⭐ Ratings Endpoints

### Create Rating
```
POST /api/items/:itemId/ratings
```

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "rating": 5,
  "comment": "Excellent home! Highly recommended."
}
```

**Response:**
```json
{
  "id": "rating-1",
  "itemId": "item-1",
  "userId": "user-1",
  "rating": 5,
  "comment": "Excellent home!",
  "createdAt": "2024-05-18T10:00:00Z"
}
```

---

## 👤 User Profile Endpoints

### Get User Profile
```
GET /api/users/profile
```

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "user": {
    "id": "user-1",
    "name": "Abebe Tekle",
    "email": "abebe@example.com",
    "avatar": "https://...",
    "phone": "+251935545413",
    "verified": true,
    "role": "customer",
    "createdAt": "2024-05-01T00:00:00Z"
  }
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid request",
  "details": "Missing required parameter: q"
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Token expired or invalid"
}
```

### 404 Not Found
```json
{
  "error": "Not found",
  "message": "Item not found"
}
```

### 500 Server Error
```json
{
  "error": "Server error",
  "message": "An unexpected error occurred"
}
```

---

## Rate Limiting

- **Anonymous**: 100 requests per hour
- **Authenticated**: 1000 requests per hour

Headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1621353600
```

---

## WebSocket Events (Chat)

### Connect
```javascript
socket.on('connect', () => {
  socket.emit('join-chat', { chatId: 'chat-1' });
});
```

### Receive Message
```javascript
socket.on('message', (data) => {
  // { id, senderId, text, timestamp }
});
```

### Send Message
```javascript
socket.emit('send-message', { chatId: 'chat-1', text: 'Hi!' });
```

---

## Required Database Tables

```sql
CREATE TABLE categories (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  icon VARCHAR(255),
  created_at TIMESTAMP
);

CREATE TABLE items (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2),
  category_id VARCHAR(36),
  owner_id VARCHAR(36),
  images JSON,
  location VARCHAR(255),
  views INT DEFAULT 0,
  is_premium BOOLEAN DEFAULT FALSE,
  purpose ENUM('rent', 'sell'),
  created_at TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE TABLE favorites (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36),
  item_id VARCHAR(36),
  created_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (item_id) REFERENCES items(id)
);

CREATE TABLE chats (
  id VARCHAR(36) PRIMARY KEY,
  user_1_id VARCHAR(36),
  user_2_id VARCHAR(36),
  created_at TIMESTAMP,
  FOREIGN KEY (user_1_id) REFERENCES users(id),
  FOREIGN KEY (user_2_id) REFERENCES users(id)
);

CREATE TABLE messages (
  id VARCHAR(36) PRIMARY KEY,
  chat_id VARCHAR(36),
  sender_id VARCHAR(36),
  text TEXT,
  created_at TIMESTAMP,
  FOREIGN KEY (chat_id) REFERENCES chats(id),
  FOREIGN KEY (sender_id) REFERENCES users(id)
);

CREATE TABLE ratings (
  id VARCHAR(36) PRIMARY KEY,
  item_id VARCHAR(36),
  user_id VARCHAR(36),
  rating INT,
  comment TEXT,
  created_at TIMESTAMP,
  FOREIGN KEY (item_id) REFERENCES items(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## Implementation Priority

1. **Phase 1** (MVP)
   - Categories endpoints
   - Items endpoints
   - Search endpoint
   - Favorites system

2. **Phase 2**
   - Chat system
   - Notifications
   - Ratings system

3. **Phase 3**
   - Premium listings
   - Analytics
   - AI recommendations

---

**Last Updated**: May 2024
**Version**: 1.0.0
