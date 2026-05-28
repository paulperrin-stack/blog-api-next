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