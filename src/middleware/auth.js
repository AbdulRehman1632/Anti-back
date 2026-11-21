import { verifyToken } from '../config/jwt.js';
import User from '../models/User.js';
import store from '../storage/mockStore.js';
import { isMongoConnected } from '../config/db.js';

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
    if (!decoded || !decoded.id) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }

    let user;
    if (isMongoConnected) {
      user = await User.findById(decoded.id).select('-password');
    } else {
      user = store.findUserById(decoded.id);
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
