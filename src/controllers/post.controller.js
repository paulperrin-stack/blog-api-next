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
  }  catch (err) {
    next(err);
  }
}

// GET /api/posts/mine (requires authentication
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

module.exports = { getAllPosts, getPost, createPost, updatePost, deletePost, togglePublish, getMyPosts };