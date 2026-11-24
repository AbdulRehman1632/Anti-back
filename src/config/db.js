import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import SidebarSection from '../models/SidebarSection.js';
import SidebarTab from '../models/SidebarTab.js';
import User from '../models/User.js';
import { defaultUsers } from '../data/seedData.js';

dotenv.config();

export let isMongoConnected = false;

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/devdrip_crm';
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 8000,
    });
    // Ping database to verify live connectivity
    await conn.connection.db.admin().ping();
    isMongoConnected = true;
    console.log(` MongoDB Connected successfully to: ${conn.connection.host}/${conn.connection.name}`);
    await initializeDefaultNavigation();
    await seedDefaultUsersIfMissing();
  } catch (error) {
    isMongoConnected = false;
    try {
      await mongoose.disconnect();
    } catch (e) {}
    console.warn(`⚠️  MongoDB not reachable (${error.message}). Running with in-memory persistence store.`);
  }
};

export async function seedDefaultUsersIfMissing() {
  try {
    const salt = await bcrypt.genSalt(10);
    const defaultHashedPassword = await bcrypt.hash('password123', salt);

    for (const defUser of defaultUsers) {
      const existing = await User.findOne({ email: defUser.email.toLowerCase() });
      if (!existing) {
        await User.create({
          name: defUser.name,
          email: defUser.email.toLowerCase(),
          password: defaultHashedPassword,
          role: defUser.role,
          status: defUser.status || 'online',
          statusMessage: defUser.statusMessage || 'Available',
          avatar: defUser.avatar || '',
          department: defUser.department || 'Operations',
          title: defUser.title || 'Team Member',
          organizationName: defUser.organizationName || 'Devdrip CRM',
        });
        console.log(`🌱 Auto-seeded default user: ${defUser.email}`);
      }
    }
  } catch (err) {
    console.warn('⚠️ Notice during user auto-seed:', err.message);
  }
}

export async function initializeDefaultNavigation() {
  try {
    // Migration: Clean up any legacy Kanban board tabs and views entirely across all sections
    await SidebarTab.deleteMany({
      $or: [
        { key: 'kanban' },
        { badge: { $regex: /kanban/i } },
        { label: { $regex: /pipeline board/i } },
      ],
    });
    await SidebarTab.updateMany(
      { viewTarget: 'kanban' },
      { $set: { viewTarget: 'list' } }
    );

    const sectionCount = await SidebarSection.countDocuments();
    if (sectionCount === 0) {
      console.log('🌱 Initializing default navigation sections in MongoDB...');

      // Section 1: Operations
      const secOperations = await SidebarSection.create({
        title: 'CRM Operations',
        key: 'operations',
        order: 1,
        isSystem: true,
      });

      await SidebarTab.insertMany([
        {
          sectionId: secOperations._id,
          label: 'Deals & Records',
          key: 'list',
          type: 'view',
          viewTarget: 'list',
          icon: 'TableProperties',
          order: 1,
          isSystem: true,
        },
        {
          sectionId: secOperations._id,
          label: 'ARR & Analytics',
          key: 'analytics',
          type: 'view',
          viewTarget: 'analytics',
          icon: 'BarChart3',
          order: 2,
          isSystem: true,
        },
      ]);

      // Section 2: Collaboration
      const secCollab = await SidebarSection.create({
        title: 'Live Collaboration',
        key: 'collaboration',
        order: 2,
        isSystem: true,
      });

      await SidebarTab.insertMany([
        {
          sectionId: secCollab._id,
          label: 'Team Channels',
          key: 'chat',
          type: 'view',
          viewTarget: 'chat',
          icon: 'MessageSquare',
          badge: 'Chat',
          order: 1,
          isSystem: true,
        },
        {
          sectionId: secCollab._id,
          label: 'Video Calls',
          key: 'calls',
          type: 'view',
          viewTarget: 'calls',
          icon: 'Video',
          badge: 'WebRTC',
          order: 2,
          isSystem: true,
        },
        {
          sectionId: secCollab._id,
          label: 'Team & RBAC Matrix',
          key: 'team',
          type: 'view',
          viewTarget: 'team',
          icon: 'Users',
          order: 3,
          isSystem: true,
        },
      ]);

      // Section 3: Custom Portfolios (Custom folders)
      const secPortfolios = await SidebarSection.create({
        title: 'Custom Portfolios',
        key: 'custom-portfolios',
        order: 3,
        isSystem: false,
      });

      await SidebarTab.insertMany([
        {
          sectionId: secPortfolios._id,
          label: 'All Deals',
          key: 'all',
          type: 'category',
          categoryKey: 'all',
          viewTarget: 'list',
          icon: 'Layers',
          order: 1,
          isSystem: true,
        },
      ]);

      console.log('✅ Default dynamic sidebar navigation initialized in MongoDB.');
    }
  } catch (err) {
    console.error('Error initializing default navigation:', err.message);
  }
}
