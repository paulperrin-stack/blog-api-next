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