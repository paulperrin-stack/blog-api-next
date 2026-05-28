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