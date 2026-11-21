import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Workspace from '../models/Workspace.js';
import store from '../storage/mockStore.js';
import { isMongoConnected } from '../config/db.js';
import { signToken } from '../config/jwt.js';

export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Please provide email and password' });
  }

  try {
    let user;
    if (isMongoConnected) {
      user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    } else {
      user = store.findUserByEmail(email);
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. User not found.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Incorrect password.' });
    }

    const token = signToken({ id: user._id, role: user.role, email: user.email });
    res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        title: user.title,
        department: user.department,
        organizationName: user.organizationName || 'Devdrip CRM',
        status: user.status,
        statusMessage: user.statusMessage,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const register = async (req, res) => {
  const {
    name,
    email,
    password,
    role = 'Editor',
    department = 'General',
    title = 'Team Member',
    organizationName = 'My Organization',
  } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Please provide name, email, and password' });
  }

  if (password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
  }

  if (!['Owner', 'Admin', 'Editor', 'Viewer'].includes(role)) {
    return res.status(400).json({ success: false, message: 'Invalid role specified.' });
  }

  try {
    let existing;
    if (isMongoConnected) {
      existing = await User.findOne({ email: email.toLowerCase() });
    } else {
      existing = store.findUserByEmail(email);
    }

    if (existing) {
      return res.status(400).json({ success: false, message: 'This email is already registered.' });
    }

    let newUser;
    if (isMongoConnected) {
      newUser = await User.create({
        name,
        email,
        password,
        role,
        department,
        title,
        organizationName,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
      });

      // Link to workspace (or create user's own workspace context)
      await Workspace.findOneAndUpdate(
        {},
        { $addToSet: { members: { user: newUser._id, role, joinedAt: new Date() } } }
      );
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);
      newUser = store.createUser({
        name,
        email,
        password: hashedPassword,
        role,
        department,
        title,
        organizationName,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
      });
    }

    const token = signToken({ id: newUser._id, role: newUser.role, email: newUser.email });
    res.status(201).json({
      success: true,
      token,
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        avatar: newUser.avatar,
        title: newUser.title,
        department: newUser.department,
        organizationName: newUser.organizationName || organizationName,
        status: newUser.status || 'online',
        statusMessage: newUser.statusMessage || 'Available',
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getMe = async (req, res) => {
  try {
    let userData;
    if (isMongoConnected) {
      const dbUser = await User.findById(req.user._id).select('-password');
      if (!dbUser) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }
      userData = dbUser.toObject();
    } else {
      userData = store.findUserById(req.user._id);
      if (!userData) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }
      const { password, ...safeUser } = userData;
      userData = safeUser;
    }

    res.json({
      success: true,
      user: {
        ...userData,
        organizationName: userData.organizationName || 'Devdrip CRM',
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateStatus = async (req, res) => {
  const { status, statusMessage } = req.body;
  const allowedStatuses = ['online', 'away', 'offline'];
  if (status && !allowedStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status value.' });
  }

  try {
    let updated;
    if (isMongoConnected) {
      updated = await User.findByIdAndUpdate(
        req.user._id,
        { status, statusMessage },
        { new: true }
      ).select('-password');
    } else {
      updated = store.updateUser(req.user._id, { status, statusMessage });
    }

    if (!updated) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    res.json({
      success: true,
      user: {
        ...updated.toObject ? updated.toObject() : updated,
        organizationName: updated.organizationName || 'Devdrip CRM',
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
