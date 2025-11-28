# API Contracts

## Overview

The Aermuse API is a RESTful service built with Express.js. All endpoints return JSON and require appropriate authentication where noted.

**Base URL**: `/api`

## Authentication

The API uses session-based authentication with httpOnly cookies. After successful login, subsequent requests automatically include the session cookie.

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "artist@example.com",
  "password": "securepassword",
  "name": "Artist Name",
  "artistName": "Stage Name" // optional
}
```

**Response (200)**:
```json
{
  "user": {
    "id": "uuid-string",
    "email": "artist@example.com",
    "name": "Artist Name",
    "artistName": "Stage Name",
    "avatarInitials": "AN",
    "plan": "free",
    "createdAt": "2025-11-28T10:00:00Z"
  }
}
```

**Errors**:
- `400` - Email already in use
- `400` - Validation error (Zod)

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "artist@example.com",
  "password": "securepassword"
}
```

**Response (200)**: Same as register

**Errors**:
- `401` - Invalid email or password

#### Logout
```http
POST /api/auth/logout
```

**Response (200)**:
```json
{ "success": true }
```

#### Get Current User
```http
GET /api/auth/me
```

**Response (200)**: User object (without password)

**Errors**:
- `401` - Not authenticated

---

## Contracts API

All contract endpoints require authentication.

### List Contracts
```http
GET /api/contracts
```

**Response (200)**:
```json
[
  {
    "id": "contract-uuid",
    "userId": "user-uuid",
    "name": "Publishing Deal 2025",
    "type": "publishing",
    "status": "pending",
    "partnerName": "Major Label Inc",
    "partnerLogo": null,
    "value": "$50,000",
    "expiryDate": "2026-12-31T00:00:00Z",
    "fileUrl": null,
    "fileName": null,
    "aiAnalysis": null,
    "aiRiskScore": null,
    "signedAt": null,
    "createdAt": "2025-11-28T10:00:00Z",
    "updatedAt": "2025-11-28T10:00:00Z"
  }
]
```

### Get Single Contract
```http
GET /api/contracts/:id
```

**Response (200)**: Single contract object

**Errors**:
- `401` - Not authenticated
- `404` - Contract not found or not owned by user

### Create Contract
```http
POST /api/contracts
Content-Type: application/json

{
  "name": "Distribution Agreement",
  "type": "distribution",
  "partnerName": "DistroKid",
  "value": "$0"
}
```

**Contract Types**:
- `record_deal`
- `sync_license`
- `distribution`
- `publishing`
- `management`

**Response (200)**: Created contract object

### Update Contract
```http
PATCH /api/contracts/:id
Content-Type: application/json

{
  "name": "Updated Name",
  "status": "active"
}
```

**Response (200)**: Updated contract object

### Delete Contract
```http
DELETE /api/contracts/:id
```

**Response (200)**:
```json
{ "success": true }
```

### Sign Contract
```http
POST /api/contracts/:id/sign
```

Sets `status` to `"active"` and records `signedAt` timestamp.

**Response (200)**: Updated contract object

### AI Analysis (Simulated)
```http
POST /api/contracts/:id/analyze
```

**Response (200)**:
```json
{
  "contract": { /* updated contract */ },
  "analysis": {
    "summary": "Contract analysis summary...",
    "keyTerms": [
      { "term": "Exclusivity Period", "value": "3 years", "risk": "medium" }
    ],
    "redFlags": ["List of concerns..."],
    "recommendations": ["Suggested changes..."],
    "overallScore": 72,
    "analyzedAt": "2025-11-28T10:00:00Z"
  }
}
```

---

## Landing Pages API

### Get User's Landing Page
```http
GET /api/landing-page
```

**Response (200)**:
```json
{
  "id": "page-uuid",
  "userId": "user-uuid",
  "slug": "artist-name-abc123",
  "artistName": "Artist Name",
  "tagline": "Independent Artist",
  "bio": "Artist biography...",
  "avatarUrl": null,
  "coverImageUrl": null,
  "primaryColor": "#660033",
  "secondaryColor": "#F7E6CA",
  "socialLinks": [],
  "isPublished": false,
  "createdAt": "2025-11-28T10:00:00Z",
  "updatedAt": "2025-11-28T10:00:00Z",
  "links": [
    {
      "id": "link-uuid",
      "landingPageId": "page-uuid",
      "title": "Spotify",
      "url": "https://spotify.com/...",
      "icon": null,
      "enabled": true,
      "order": "0",
      "createdAt": "2025-11-28T10:00:00Z"
    }
  ]
}
```

### Update Landing Page
```http
PATCH /api/landing-page
Content-Type: application/json

{
  "artistName": "New Stage Name",
  "tagline": "New tagline",
  "bio": "Updated bio",
  "isPublished": true
}
```

**Response (200)**: Updated landing page object

### Public Artist Page (No Auth)
```http
GET /api/artist/:slug
```

Returns landing page if `isPublished: true`.

**Errors**:
- `404` - Page not found or not published

---

## Landing Page Links API

### Add Link
```http
POST /api/landing-page/links
Content-Type: application/json

{
  "title": "YouTube",
  "url": "https://youtube.com/channel/..."
}
```

**Response (200)**: Created link object

### Update Link
```http
PATCH /api/landing-page/links/:id
Content-Type: application/json

{
  "enabled": false,
  "title": "Updated Title"
}
```

**Response (200)**: Updated link object

### Delete Link
```http
DELETE /api/landing-page/links/:id
```

**Response (200)**:
```json
{ "success": true }
```

---

## Error Response Format

All errors follow this format:
```json
{
  "error": "Error message" | ["Validation error array"]
}
```

## Rate Limiting

Not currently implemented. Consider adding for production.

## CORS

Not explicitly configured. Assumes same-origin deployment.

---
*Generated: 2025-11-28 | 17 endpoints documented*
