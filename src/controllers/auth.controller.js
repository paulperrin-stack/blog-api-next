const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const { validationResult } = require("express-validator")
const prisma = require("../lib/prisma")

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