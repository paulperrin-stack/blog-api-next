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
            .withMessage("Password must be at least 6 characters long"),
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