# Blog API

A RESTful API for a personal blogging platform built with Express, Prisma, and PostgreSQL.

## Stack

- **Runtime:** Node.js
- **Framework:** Express
- **ORM:** Prisma 6
- **Database:** PostgreSQL
- **Auth:** JWT + bcryptjs

## Features

- JWT authentication (register, login)
- Blog post CRUD with publish/unpublish
- Full-text search across title, content and category
- Comments on published posts
- Ownership-based authorization

## Requirements

- Node.js 18+
- PostgreSQL running locally (or a connection string to a hosted instance)

## Getting started

### 1. Clone and install

```bash
git clone <your-repo-url>
cd blog-api
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

```
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/blog_api"
JWT_SECRET="your_long_random_secret"
JWT_EXPIRES_IN="7d"
PORT=3000
```

### 3. Run database migrations

```bash
npx prisma migrate dev
```

### 4. Start the server

```bash
# Development (auto-reload)
npm run dev

# Production
npm start
```

The API will be available at `http://localhost:3000`.

---

## API reference

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/register | — | Register a new user |
| POST | /api/auth/login | — | Login and receive a JWT |

**Register**
```
POST /api/auth/register
{
  "username": "alice",
  "email": "alice@example.com",
  "password": "secret123",
  "role": "AUTHOR"
}
```

**Login**
```
POST /api/auth/login
{
  "email": "alice@example.com",
  "password": "secret123"
}
```

Both return:
```json
{
  "user": { "id": 1, "username": "alice", "email": "alice@example.com", "role": "AUTHOR" },
  "token": "<jwt>"
}
```

---

### Posts

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/posts | — | Get all published posts |
| GET | /api/posts?term=nodejs | — | Search posts by title, content or category |
| GET | /api/posts/mine | ✓ | Get your own posts (all statuses) |
| GET | /api/posts/:id | — | Get a single published post |
| POST | /api/posts | ✓ | Create a post |
| PUT | /api/posts/:id | ✓ owner | Update a post |
| PATCH | /api/posts/:id/publish | ✓ owner | Toggle publish/unpublish |
| DELETE | /api/posts/:id | ✓ owner | Delete a post |

**Create / update body**
```json
{
  "title": "My Post",
  "content": "Post content here.",
  "category": "Technology",
  "tags": ["nodejs", "api"]
}
```

---

### Comments

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/posts/:postId/comments | ✓ | Add a comment to a published post |
| DELETE | /api/posts/:postId/comments/:commentId | ✓ | Delete a comment |

**Create comment body**
```json
{
  "content": "Great post!"
}
```

Comment authors and post authors can both delete a comment.

---

## Authentication

Protected routes require a `Bearer` token in the `Authorization` header:

```
Authorization: Bearer <token>
```

---

## Data models

### User
| Field | Type |
|-------|------|
| id | Int (PK) |
| username | String (unique) |
| email | String (unique) |
| password | String (hashed) |
| role | AUTHOR \| READER |

### Post
| Field | Type |
|-------|------|
| id | Int (PK) |
| title | String |
| content | String |
| category | String |
| tags | String[] |
| published | Boolean |
| authorId | Int (FK → User) |

### Comment
| Field | Type |
|-------|------|
| id | Int (PK) |
| content | String |
| postId | Int (FK → Post) |
| authorId | Int (FK → User) |

---

## Project structure

```
blog-api/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── app.js
│   ├── server.js
│   ├── lib/
│   │   └── prisma.js
│   ├── middleware/
│   │   ├── auth.js
│   │   └── errorHandler.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── post.routes.js
│   │   └── comment.routes.js
│   └── controllers/
│       ├── auth.controller.js
│       ├── post.controller.js
│       └── comment.controller.js
├── .env.example
└── package.json
```