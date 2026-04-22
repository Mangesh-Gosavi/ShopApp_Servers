const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

function authenticateToken(req, res, next) {
  const token = req.headers['authorization'];
  console.log("Received token:", token);
  if (!token) return res.status(403).json({ message: "No token provided" });

  jwt.verify(token.split(' ')[1], JWT_SECRET, (err, user) => {
    if (err) {
      console.error("Token verification error:", err);
      return res.status(403).json({ message: "Failed to authenticate token" });
    }
    req.user = user;
    next();
  });
}

module.exports = authenticateToken;
