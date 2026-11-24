import mongoose from 'mongoose';
import { verifyToken } from '../config/jwt.js';
import User from '../models/User.js';
import store from '../storage/mockStore.js';
import { connectDB, isMongoConnected } from '../config/db.js';

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this resource. No token provided.',
    });
  }

  try {
    const decoded = verifyToken(token);
    if (!decoded || (!decoded.id && !decoded.email)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }

    // Ensure database connection is ready
    if (!isMongoConnected) {
      try {
        await connectDB();
      } catch (e) {}
    }

    let user = null;

    if (isMongoConnected) {
      // 1. Primary lookup by MongoDB _id (if valid ObjectId format)
      if (decoded.id && mongoose.Types.ObjectId.isValid(decoded.id)) {
        user = await User.findById(decoded.id).select('-password');
      }

      // 2. Fallback lookup by email (resolves tokens issued across restarts, seeds, or stores)
      if (!user && decoded.email) {
        user = await User.findOne({ email: decoded.email.toLowerCase() }).select('-password');
      }
    }

    // 3. Fallback lookup in in-memory store
    if (!user) {
      user = (decoded.id ? store.findUserById(decoded.id) : null) ||
        (decoded.email ? store.findUserByEmail(decoded.email) : null);
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this token no longer exists.',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Authentication failed',
      error: err.message,
    });
  }
};
