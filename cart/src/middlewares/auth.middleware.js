const cart = require('../models/cart.model');
const jwt = require('jsonwebtoken');

async function authMiddleware(req, res, next) {
  // Accept token from either cookie or Authorization header
  let token = null;
  if (req.cookies && req.cookies.token) token = req.cookies.token;
  const authHeader = req.headers && req.headers.authorization;
  if (!token && authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    // Check if token is blacklisted (Redis or in-memory fallback)
    const isBlacklisted = await tokenBlacklist.has(token);
    if (isBlacklisted) {
      return res.status(401).json({ message: 'Token revoked' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Ensure the token refers to an existing user
    const user = await userModel.findById(decoded.id).select('-password -__v');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

module.exports = {
  authMiddleware
}