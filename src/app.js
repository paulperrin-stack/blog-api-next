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
app.use("/api/comments", commentRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: { message: "Route not found"} });
});

// Global error handler (mist be last)
app.use(errorHandler);

module.exports = app;