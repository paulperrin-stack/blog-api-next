const { Router } = require("express");
const { body } = require("express-validator");
const { register, login } = require("../controllers/auth.controller");
const router = Router();

module.exports = router;