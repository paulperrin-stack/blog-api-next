const jwt = require("jsonwebtoken");

function authenticate(req, res, next) {
  console.log("JWT_SECRET present:", !!process.env.JWT_SECRET); // add this
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