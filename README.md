# Programming Q&A Tool

## Overview

This project is a full-stack channel-based Programming Q&A Tool where users can create channels, create posts, reply to posts and replies, vote on content, upload screenshots, search content, and perform admin moderation actions.

The system is built using:

- Next.js (Frontend)
- Node.js + Express (Backend)
- MySQL (Database)
- Docker Compose (Environment setup)

---

## Features

- User sign up
- User sign in / sign out
- Display current logged-in user in navbar
- Create channels
- View all channels
- Create posts inside channels
- View posts within a channel
- View a single post page
- Reply to posts
- Nested replies (reply to replies)
- Vote on posts
- Vote on replies
- Upload screenshots for posts
- Upload screenshots for replies
- Search functionality with multiple query types
- Admin moderation system
- Health check endpoint

---

## Tech Stack

### Frontend

- Next.js
- React
- Tailwind CSS

### Backend

- Node.js
- Express
- MySQL2
- Multer
- CORS

### Database / DevOps

- MySQL
- Docker
- Docker Compose

---

## Project Structure

- `server.js` → backend API
- `db/init/schema.sql` → database schema
- `db/init/seed.sql` → seed data
- `frontend/` → Next.js frontend
- `docker-compose.yml` → container configuration
- `dockerfile` → backend image

---

## Setup Instructions

### Backend (Docker)

```bash
docker compose down
docker compose up --build


Backend runs at:
    http://localhost:8080

Frontend
    cd frontend
    npm install
    npm run dev

Frontend runs at:
    http://localhost:3000


Important Routes

Auth
    POST /auth/signup
    POST /auth/signin
    POST /auth/signout
    GET /auth/me

Channels
    GET /channels
    GET /channels/:id
    POST /channels
    PUT /channels/:id
    DELETE /channels/:id

Posts
    GET /channels/:id/posts
    GET /posts/:id
    POST /posts
    PUT /posts/:id
    DELETE /posts/:id

Replies
    GET /posts/:postId/replies
    POST /replies
    PUT /replies/:replyId
    DELETE /replies/:replyId

Votes
    PUT /posts/:postId/vote
    DELETE /posts/:postId/vote
    GET /posts/:postId/vote
    PUT /replies/:replyId/vote
    DELETE /replies/:replyId/vote
    GET /replies/:replyId/vote

Attachments
    POST /attachments
    GET /attachments
    GET /attachments/:attachmentId
    GET /attachments/:attachmentId/file
    DELETE /attachments/:attachmentId

Search
    GET /search

Admin
    GET /admin/check
    DELETE /admin/users/:userId
    DELETE /admin/channels/:channelId
    DELETE /admin/posts/:postId
    DELETE /admin/replies/:replyId

Utility
    GET /health

Search Types
    Supported search types:
        text
        author
        most-posts
        least-posts
        highest-ranked
        lowest-ranked

Example:
        /search?type=text&q=sql

Database Notes
    The database schema includes:
        users
        channels
        posts
        reply
        vote
        attachments
    The system supports:
        nested replies using parentReplyId
        voting on both posts and replies
        screenshot attachments for both posts and replies

Admin Notes
    Admin moderation is implemented using dedicated routes.
    An admin can delete:
        users
        channels
        posts
        replies

Known Limitations
    Sessions are stored in memory, so restarting the backend clears login sessions
    Seeded users may require valid hashed passwords for login
    Uploaded files are stored locally in the uploads folder


Author
    Adrian Williams
```
