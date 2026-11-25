import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Workspace from '../models/Workspace.js';
import store from '../storage/mockStore.js';
import { isMongoConnected } from '../config/db.js';

export const getUsers = async (req, res) => {
  try {
    let users;
    if (isMongoConnected) {
      users = await User.find().select('-password');
    } else {
      users = store.getAllUsers();
    }
    res.json({ success: true, count: users.length, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateUserRole = async (req, res) => {
  const { userId, role } = req.body;
  if (!['Owner', 'Admin', 'Editor', 'Viewer'].includes(role)) {
    return res.status(400).json({ success: false, message: 'Invalid role' });
  }

  try {
    let updated;
    if (isMongoConnected) {
      updated = await User.findByIdAndUpdate(userId, { role }, { new: true }).select('-password');
    } else {
      updated = store.updateUser(userId, { role });
    }

    if (!updated) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, message: `Role updated to ${role}`, user: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// IT Provisioning: Create employee credentials with designated role & organization
export const createCredentials = async (req, res) => {
  const {
    name,
    email,
    password,
    role = 'Editor',
    department = 'Sales & CRM',
    title = 'Team Member',
    organizationName,
  } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Please provide name, email, and password' });
  }

  try {
    let existing;
    if (isMongoConnected) {
      existing = await User.findOne({ email: email.toLowerCase() });
    } else {
      existing = store.findUserByEmail(email);
    }

    if (existing) {
      return res.status(400).json({ success: false, message: 'A user with this email already exists' });
    }

    const orgName = organizationName || (req.user?.organizationName || 'Devdrip CRM');

    let newUser;
    if (isMongoConnected) {
      newUser = await User.create({
        name,
        email,
        password,
        role,
        department,
        title,
        organizationName: orgName,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
      });

      await Workspace.updateOne(
        {},
        { $push: { members: { user: newUser._id, role, joinedAt: new Date() } } }
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
        organizationName: orgName,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
      });

      if (store.workspaces[0]) {
        store.workspaces[0].members.push({
          user: newUser._id,
          role,
          joinedAt: new Date(),
        });
      }
    }

    res.status(201).json({
      success: true,
      message: `Credentials successfully provisioned for ${name} (${role})`,
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        department: newUser.department,
        title: newUser.title,
        organizationName: orgName,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
