# Vambu Chat Website – System Architecture & Overview

## 1. High-Level System Overview
Vambu Chat is a real-time chat web application.

- **Frontend**: Next.js (React framework)
- **Backend Platform**: Supabase (Backend-as-a-Service)
- **Database**: PostgreSQL (managed by Supabase)
- **Authentication**: Supabase Auth
- **Email Service**: Resend
- **Hosting**: Netlify / Vercel (typical deployment)

**Architecture Flow:**
`Client (Next.js) → Supabase APIs → PostgreSQL Database`

## 2. Technology Stack
**Frontend**
- Next.js (App Router)
- React Hooks
- TypeScript / JavaScript

**Backend (Managed by Supabase)**
- Authentication
- Database
- Realtime
- Storage
- REST APIs

## 3. Database Structure
Supabase manages the main auth table automatically.

**`auth.users` (managed by Supabase)**
- id
- email
- password hash
- metadata
- email confirmation status

**`public.users` (custom table)**
- id (linked to `auth.users`)
- email
- username
- created_at

## 4. Authentication Flow
**Email Login Flow:**
User → Login Form → `supabase.auth.signInWithPassword()` → Supabase verifies credentials → Session token returned → Cookie stored → Redirect to `/chat`

**Google OAuth Flow:**
User → Google Login → `supabase.auth.signInWithOAuth()` → Google Auth → Supabase Callback → Session created → Redirect to `/chat`

## 5. Session Management
Supabase stores sessions using cookies.

**Example cookies:**
- `sb-xxxx-auth-token`
- `sb-xxxx-auth-token.0`
- `sb-xxxx-auth-token.1`

**Session verification methods:**
- **Client**: `supabase.auth.getSession()`
- **Server**: `supabase.auth.getUser()`

## 6. Middleware Security
Middleware protects routes such as `/chat`.

**Flow:**
User visits `/chat` → `middleware.ts` runs → Supabase checks session → If user exists → allow access → If not → redirect to `/auth/login`

## 7. Project Folder Structure
```text
src
 ├── app
 │   ├── auth
 │   │   ├── login/page.tsx
 │   │   ├── register/page.tsx
 │   │   └── callback/page.tsx
 │   ├── chat/page.tsx
 │   └── page.tsx
 │
 ├── lib
 │   ├── supabase-client.ts
 │   └── supabase-server.ts
 │
 ├── middleware.ts
```

## 8. Real-Time Chat (Future Implementation)
Supabase supports realtime messaging using PostgreSQL WAL and WebSockets.

**Chat flow:**
User sends message → Insert into `messages` table → Supabase realtime event → Other users receive message instantly

## 9. Recommended Chat Database Schema
- `users`
- `chats`
- `chat_members`
- `messages`

**`messages` table example:**
- `id`
- `chat_id`
- `sender_id`
- `message`
- `created_at`

## 10. Deployment Architecture
- Next.js application deployed to Netlify/Vercel
- Frontend communicates directly with Supabase APIs
- Supabase manages authentication, database, and realtime services
