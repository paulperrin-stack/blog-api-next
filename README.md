# Blogging Platform API — Step-by-Step Guide

**Stack:** Express · Prisma 6 (JS) · PostgreSQL · JWT · bcryptjs  
**No frontend. No AI code generation. Pure JavaScript.**

---

## What you'll build

A REST API covering both the roadmap.sh spec and the Odin Project spec:

- Auth: register, login (JWT + bcryptjs)
- Posts: CRUD, full-text search, publish/unpublish
- Comments: per-post, auth-required
- Authorization: ownership checks, author-only actions

---

## Project structure (final)

```
blog-api/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── app.js
│   ├── server.js
│   ├── middleware/
│   │   ├── auth.js          # JWT verification
│   │   └── errorHandler.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── post.routes.js
│   │   └── comment.routes.js
│   └── controllers/
│       ├── auth.controller.js
│       ├── post.controller.js
│       └── comment.controller.js
├── .env
├── .env.example
├── .gitignore
└── package.json
```

---

## Phase 1 — Initialize the project

### 1.1 Create the folder and init git + npm

```bash
mkdir blog-api && cd blog-api
git init
npm init -y
```

### 1.2 Install dependencies

```bash
# Runtime
npm install express prisma @prisma/client bcryptjs jsonwebtoken dotenv express-validator

# Dev
npm install --save-dev nodemon
```

### 1.3 Add scripts to package.json

Open `package.json` and replace the `"scripts"` section:

```json
"scripts": {
  "dev": "nodemon src/server.js",
  "start": "node src/server.js"
}
```

### 1.4 Create .gitignore

```
node_modules/
.env
```

### 1.5 Create .env.example

```
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/blog_api"
JWT_SECRET="change_this_to_a_long_random_string"
JWT_EXPIRES_IN="7d"
PORT=3000
```

Copy it to `.env` and fill in your real values.

### Commit 1

```bash
git add .
git commit -m "chore: initialize project and install dependencies"
```

---

## Phase 2 — Prisma schema and database migration

### 2.1 Initialize Prisma

```bash
npx prisma init
```

This creates `prisma/schema.prisma` and adds `DATABASE_URL` to `.env`.

### 2.2 Write the schema

Replace the contents of `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  AUTHOR
  READER
}

model User {
  id        Int       @id @default(autoincrement())
  username  String    @unique
  email     String    @unique
  password  String
  role      Role      @default(READER)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  posts     Post[]
  comments  Comment[]
}

model Post {
  id        Int       @id @default(autoincrement())
  title     String
  content   String
  category  String
  tags      String[]
  published Boolean   @default(false)
  authorId  Int
  author    User      @relation(fields: [authorId], references: [id], onDelete: Cascade)
  comments  Comment[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}

model Comment {
  id        Int      @id @default(autoincrement())
  content   String
  postId    Int
  post      Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  authorId  Int
  author    User     @relation(fields: [authorId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### 2.3 Run the migration

```bash
npx prisma migrate dev --name init
```

### 2.4 Create the Prisma client singleton

Create `src/lib/prisma.js`:

```js
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

module.exports = prisma;
```

### Commit 2

```bash
git add .
git commit -m "feat: add Prisma schema with User, Post, Comment and run initial migration"
```

---

## Phase 3 — Express app skeleton

### 3.1 Create the error handler middleware

`src/middleware/errorHandler.js`:

```js
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const message = err.message || "Internal Server Error";

  res.status(status).json({
    error: {
      message,
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    },
  });
}

module.exports = errorHandler;
```

### 3.2 Create the Express app

`src/app.js`:

```js
require("dotenv").config();
const express = require("express");
const errorHandler = require("./middleware/errorHandler");

const authRoutes = require("./routes/auth.routes");
const postRoutes = require("./routes/post.routes");
const commentRoutes = require("./routes/comment.routes");

const app = express();

app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/posts", commentRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: { message: "Route not found" } });
});

// Global error handler (must be last)
app.use(errorHandler);

module.exports = app;
```

### 3.3 Create the server entry point

`src/server.js`:

```js
const app = require("./app");

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

### 3.4 Create the route files (empty stubs so the app boots)

`src/routes/auth.routes.js`:

```js
const { Router } = require("express");
const router = Router();
module.exports = router;
```

`src/routes/post.routes.js`:

```js
const { Router } = require("express");
const router = Router();
module.exports = router;
```

`src/routes/comment.routes.js`:

```js
const { Router } = require("express");
const router = Router();
module.exports = router;
```

### Commit 3

```bash
git add .
git commit -m "feat: set up Express app with middleware, error handler and route stubs"
```

---

## Phase 4 — Authentication (register + login)

### 4.1 JWT auth middleware

`src/middleware/auth.js`:

```js
const jwt = require("jsonwebtoken");

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    const err = new Error("No token provided");
    err.status = 401;
    return next(err);
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, email, role }
    next();
  } catch {
    const err = new Error("Invalid or expired token");
    err.status = 401;
    next(err);
  }
}

module.exports = authenticate;
```

### 4.2 Auth controller

`src/controllers/auth.controller.js`:

```js
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const prisma = require("../lib/prisma");

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

async function register(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, email, password, role } = req.body;

  try {
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });

    if (existing) {
      return res.status(409).json({
        error: { message: "Email or username already taken" },
      });
    }

    const hashed = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashed,
        role: role === "AUTHOR" ? "AUTHOR" : "READER",
      },
      select: { id: true, username: true, email: true, role: true, createdAt: true },
    });

    const token = signToken(user);

    res.status(201).json({ user, token });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(401).json({ error: { message: "Invalid credentials" } });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({ error: { message: "Invalid credentials" } });
    }

    const token = signToken(user);

    res.json({
      user: { id: user.id, username: user.username, email: user.email, role: user.role },
      token,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login };
```

### 4.3 Auth routes

`src/routes/auth.routes.js`:

```js
const { Router } = require("express");
const { body } = require("express-validator");
const { register, login } = require("../controllers/auth.controller");

const router = Router();

router.post(
  "/register",
  [
    body("username").trim().notEmpty().withMessage("Username is required"),
    body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
  ],
  register
);

router.post(
  "/login",
  [
    body("email").isEmail().normalizeEmail(),
    body("password").notEmpty(),
  ],
  login
);

module.exports = router;
```

### Test it

```bash
npm run dev

# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","email":"alice@example.com","password":"secret123","role":"AUTHOR"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"secret123"}'
```

Save the returned token — you'll use it for protected routes.

### Commit 4

```bash
git add .
git commit -m "feat: implement JWT authentication with register and login endpoints"
```

---

## Phase 5 — Post CRUD

### 5.1 Post controller

`src/controllers/post.controller.js`:

```js
const { validationResult } = require("express-validator");
const prisma = require("../lib/prisma");

// GET /api/posts?term=...
async function getAllPosts(req, res, next) {
  const { term } = req.query;

  try {
    const where = term
      ? {
          published: true,
          OR: [
            { title: { contains: term, mode: "insensitive" } },
            { content: { contains: term, mode: "insensitive" } },
            { category: { contains: term, mode: "insensitive" } },
          ],
        }
      : { published: true };

    const posts = await prisma.post.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { author: { select: { id: true, username: true } } },
    });

    res.json(posts);
  } catch (err) {
    next(err);
  }
}

// GET /api/posts/:id
async function getPost(req, res, next) {
  try {
    const post = await prisma.post.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        author: { select: { id: true, username: true } },
        comments: {
          include: { author: { select: { id: true, username: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!post) {
      return res.status(404).json({ error: { message: "Post not found" } });
    }

    // Non-authors can't see unpublished posts
    if (!post.published && req.user?.id !== post.authorId) {
      return res.status(404).json({ error: { message: "Post not found" } });
    }

    res.json(post);
  } catch (err) {
    next(err);
  }
}

// POST /api/posts
async function createPost(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { title, content, category, tags } = req.body;

  try {
    const post = await prisma.post.create({
      data: {
        title,
        content,
        category,
        tags: tags || [],
        authorId: req.user.id,
      },
    });

    res.status(201).json(post);
  } catch (err) {
    next(err);
  }
}

// PUT /api/posts/:id
async function updatePost(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const postId = Number(req.params.id);
  const { title, content, category, tags } = req.body;

  try {
    const existing = await prisma.post.findUnique({ where: { id: postId } });

    if (!existing) {
      return res.status(404).json({ error: { message: "Post not found" } });
    }

    if (existing.authorId !== req.user.id) {
      return res.status(403).json({ error: { message: "Forbidden" } });
    }

    const post = await prisma.post.update({
      where: { id: postId },
      data: { title, content, category, tags: tags || [] },
    });

    res.json(post);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/posts/:id
async function deletePost(req, res, next) {
  const postId = Number(req.params.id);

  try {
    const existing = await prisma.post.findUnique({ where: { id: postId } });

    if (!existing) {
      return res.status(404).json({ error: { message: "Post not found" } });
    }

    if (existing.authorId !== req.user.id) {
      return res.status(403).json({ error: { message: "Forbidden" } });
    }

    await prisma.post.delete({ where: { id: postId } });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { getAllPosts, getPost, createPost, updatePost, deletePost };
```

### 5.2 Post routes

`src/routes/post.routes.js`:

```js
const { Router } = require("express");
const { body } = require("express-validator");
const authenticate = require("../middleware/auth");
const {
  getAllPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
} = require("../controllers/post.controller");

const router = Router();

const postValidation = [
  body("title").trim().notEmpty().withMessage("Title is required"),
  body("content").trim().notEmpty().withMessage("Content is required"),
  body("category").trim().notEmpty().withMessage("Category is required"),
  body("tags").optional().isArray().withMessage("Tags must be an array"),
];

router.get("/", getAllPosts);
router.get("/:id", getPost);
router.post("/", authenticate, postValidation, createPost);
router.put("/:id", authenticate, postValidation, updatePost);
router.delete("/:id", authenticate, deletePost);

module.exports = router;
```

### Test it

```bash
TOKEN="paste_your_token_here"

# Create a post
curl -X POST http://localhost:3000/api/posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Hello World","content":"My first post","category":"Tech","tags":["nodejs","api"]}'

# Get all published posts
curl http://localhost:3000/api/posts

# Search
curl "http://localhost:3000/api/posts?term=nodejs"

# Update
curl -X PUT http://localhost:3000/api/posts/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Hello Updated","content":"Updated content","category":"Tech","tags":["nodejs"]}'

# Delete
curl -X DELETE http://localhost:3000/api/posts/1 \
  -H "Authorization: Bearer $TOKEN"
```

### Commit 5

```bash
git add .
git commit -m "feat: implement full CRUD for posts with search and ownership checks"
```

---

## Phase 6 — Comments

### 6.1 Comment controller

`src/controllers/comment.controller.js`:

```js
const { validationResult } = require("express-validator");
const prisma = require("../lib/prisma");

// POST /api/posts/:postId/comments
async function createComment(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const postId = Number(req.params.postId);

  try {
    const post = await prisma.post.findUnique({ where: { id: postId } });

    if (!post || !post.published) {
      return res.status(404).json({ error: { message: "Post not found" } });
    }

    const comment = await prisma.comment.create({
      data: {
        content: req.body.content,
        postId,
        authorId: req.user.id,
      },
      include: { author: { select: { id: true, username: true } } },
    });

    res.status(201).json(comment);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/posts/:postId/comments/:commentId
async function deleteComment(req, res, next) {
  const commentId = Number(req.params.commentId);

  try {
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });

    if (!comment) {
      return res.status(404).json({ error: { message: "Comment not found" } });
    }

    // Allow the comment's author OR the post's author to delete
    const post = await prisma.post.findUnique({ where: { id: comment.postId } });

    if (comment.authorId !== req.user.id && post.authorId !== req.user.id) {
      return res.status(403).json({ error: { message: "Forbidden" } });
    }

    await prisma.comment.delete({ where: { id: commentId } });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { createComment, deleteComment };
```

### 6.2 Comment routes

`src/routes/comment.routes.js`:

```js
const { Router } = require("express");
const { body } = require("express-validator");
const authenticate = require("../middleware/auth");
const { createComment, deleteComment } = require("../controllers/comment.controller");

const router = Router();

router.post(
  "/:postId/comments",
  authenticate,
  [body("content").trim().notEmpty().withMessage("Comment content is required")],
  createComment
);

router.delete("/:postId/comments/:commentId", authenticate, deleteComment);

module.exports = router;
```

### Commit 6

```bash
git add .
git commit -m "feat: implement comment creation and deletion on published posts"
```

---

## Phase 7 — Publish / unpublish

This adds `PATCH /api/posts/:id/publish` — only the post's author can toggle it.

### 7.1 Add the controller function

In `src/controllers/post.controller.js`, add at the bottom (before `module.exports`):

```js
// PATCH /api/posts/:id/publish
async function togglePublish(req, res, next) {
  const postId = Number(req.params.id);

  try {
    const existing = await prisma.post.findUnique({ where: { id: postId } });

    if (!existing) {
      return res.status(404).json({ error: { message: "Post not found" } });
    }

    if (existing.authorId !== req.user.id) {
      return res.status(403).json({ error: { message: "Forbidden" } });
    }

    const post = await prisma.post.update({
      where: { id: postId },
      data: { published: !existing.published },
    });

    res.json(post);
  } catch (err) {
    next(err);
  }
}
```

Update the `module.exports`:

```js
module.exports = { getAllPosts, getPost, createPost, updatePost, deletePost, togglePublish };
```

### 7.2 Add the route

In `src/routes/post.routes.js`, import `togglePublish` and add the route:

```js
const { ..., togglePublish } = require("../controllers/post.controller");

// Add this line with the protected routes:
router.patch("/:id/publish", authenticate, togglePublish);
```

Also update `getAllPosts` in the controller to show all posts (published + unpublished) when the requester is authenticated as the author — or keep it simple and add a separate `GET /api/posts/mine` route for that. The simplest approach: add a `GET /api/posts/mine` to see your own posts regardless of published status:

In `src/controllers/post.controller.js`:

```js
// GET /api/posts/mine (requires auth)
async function getMyPosts(req, res, next) {
  try {
    const posts = await prisma.post.findMany({
      where: { authorId: req.user.id },
      orderBy: { createdAt: "desc" },
      include: { author: { select: { id: true, username: true } } },
    });
    res.json(posts);
  } catch (err) {
    next(err);
  }
}
```

Add to `module.exports` and to the router **before** `/:id` (order matters in Express):

```js
// In post.routes.js — MUST be before router.get("/:id", ...)
router.get("/mine", authenticate, getMyPosts);
```

### Commit 7

```bash
git add .
git commit -m "feat: add publish/unpublish toggle and GET /posts/mine for author dashboard"
```

---

## Complete API reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/register | — | Register a user |
| POST | /api/auth/login | — | Login, get JWT |
| GET | /api/posts | — | All published posts (optional ?term=) |
| GET | /api/posts/mine | ✓ | Your own posts (all statuses) |
| GET | /api/posts/:id | — | Single post |
| POST | /api/posts | ✓ | Create a post |
| PUT | /api/posts/:id | ✓ owner | Update a post |
| PATCH | /api/posts/:id/publish | ✓ owner | Toggle publish |
| DELETE | /api/posts/:id | ✓ owner | Delete a post |
| POST | /api/posts/:postId/comments | ✓ | Comment on a published post |
| DELETE | /api/posts/:postId/comments/:commentId | ✓ | Delete a comment |

---

## Tips & next steps

**Prisma Studio** — visual DB browser, useful for debugging:
```bash
npx prisma studio
```

**Environment discipline** — never commit `.env`. Always update `.env.example` when you add variables.

**What to add after this:**
- `GET /api/users/:id/posts` — public profile page posts
- Pagination on `GET /api/posts` using `skip` + `take`
- Role guard middleware (e.g. only `AUTHOR` role can create posts)
- Refresh tokens for longer sessions
- Rate limiting with `express-rate-limit`
- Input sanitization with `express-validator`'s `.escape()`
- Deploy: Railway or Render for the API, Supabase for managed PostgreSQL