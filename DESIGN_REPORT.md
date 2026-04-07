# Design Report

## Architecture and Database Choice

The application follows a full-stack architecture with a clear separation between frontend, backend, and database layers.

The frontend is built using Next.js, which provides a modern React-based framework for building interactive user interfaces. The backend is built using Node.js with Express, which handles API routing and business logic. MySQL is used as the database due to its strong relational capabilities and support for structured data.

A relational database was chosen because the system requires structured relationships between entities such as users, channels, posts, replies, votes, and attachments. These relationships are efficiently handled using foreign keys and joins.

Docker Compose is used to manage the backend and database services, ensuring consistent development and deployment environments.

---

## API Endpoints Overview

The backend exposes RESTful API endpoints grouped by functionality:

- Authentication endpoints handle user signup, login, logout, and session validation.
- Channel endpoints allow creation, retrieval, updating, and deletion of channels.
- Post endpoints manage posts within channels.
- Reply endpoints support both direct replies and nested replies using a parentReplyId.
- Vote endpoints allow users to upvote or downvote posts and replies.
- Attachment endpoints handle screenshot uploads and retrieval.
- Search endpoint supports multiple query types such as text search and ranking-based queries.
- Admin endpoints provide moderation capabilities such as deleting users, posts, channels, and replies.

These endpoints follow REST principles and use appropriate HTTP methods such as GET, POST, PUT, and DELETE.

---

## Screenshot Storage Approach

Screenshots are uploaded using the Multer middleware on the backend. Files are stored locally in an uploads directory on the server.

Each uploaded file is associated with either a post or a reply through the attachments table in the database. The database stores metadata such as file path, type, and associated entity.

This approach allows efficient retrieval of images and ensures that screenshots are linked correctly to their respective posts or replies.

---

## Key Packages and Justification

Several important packages were used in this project:

- Express: Used to build the backend server and handle routing.
- MySQL2: Enables interaction with the MySQL database using promises.
- Multer: Handles file uploads for screenshots.
- CORS: Allows communication between frontend and backend running on different ports.
- Next.js: Provides a powerful frontend framework with routing and component-based architecture.
- React: Used for building dynamic user interfaces.
- Tailwind CSS: Used for styling the frontend efficiently.

These packages were chosen for their reliability, simplicity, and suitability for building a full-stack web application.
