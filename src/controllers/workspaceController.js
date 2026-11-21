import Workspace from '../models/Workspace.js';
import User from '../models/User.js';
import SidebarSection from '../models/SidebarSection.js';
import SidebarTab from '../models/SidebarTab.js';
import store from '../storage/mockStore.js';
import { isMongoConnected, initializeDefaultNavigation } from '../config/db.js';
import { getIO } from '../sockets/socketHandler.js';

// --- Workspace Info ---
export const getWorkspace = async (req, res) => {
  try {
    let ws = null;
    if (isMongoConnected) {
      ws = await Workspace.findOne().populate('members.user', 'name email avatar role status title');
      if (!ws) {
        ws = await Workspace.create({
          name: req.user?.organizationName || 'Devdrip CRM',
          description: 'Primary Enterprise Workspace',
          ownerId: req.user?._id,
          members: [
            { user: req.user?._id, role: req.user?.role || 'Owner', joinedAt: new Date() }
          ],
        });
      }
    }
    res.json({ success: true, workspace: ws });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateWorkspace = async (req, res) => {
  try {
    let ws;
    if (isMongoConnected) {
      ws = await Workspace.findOneAndUpdate({}, req.body, { new: true });
    }
    res.json({ success: true, workspace: ws });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const inviteMember = async (req, res) => {
  const { email, role = 'Editor', name } = req.body;
  try {
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    let user;
    if (isMongoConnected) {
      user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        user = await User.create({
          name: name || email.split('@')[0],
          email: email.toLowerCase(),
          password: 'password123',
          role,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(email)}`,
          organizationName: req.user?.organizationName || 'Devdrip CRM',
        });
      }
      await Workspace.updateOne(
        {},
        { $addToSet: { members: { user: user._id, role, joinedAt: new Date() } } }
      );
    }

    res.json({
      success: true,
      message: `Invitation dispatched to ${email}`,
      user: { _id: user?._id, name: user?.name, email: user?.email, role },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// --- Dynamic Sidebar Navigation Management with Granular Access Control ---

export const getSidebarNav = async (req, res) => {
  try {
    if (isMongoConnected) {
      await initializeDefaultNavigation();
      const sections = await SidebarSection.find().sort({ order: 1, createdAt: 1 }).lean();
      const tabs = await SidebarTab.find()
        .populate('allowedUsers', 'name email avatar role')
        .sort({ order: 1, createdAt: 1 })
        .lean();

      const userRole = req.user?.role || 'Viewer';
      const userId = req.user?._id?.toString();
      const isOwner = userRole === 'Owner';
      const isAdmin = userRole === 'Admin';

      // Group & filter tabs by access control
      const sectionsWithTabs = [];

      for (const sec of sections) {
        const secTabs = tabs.filter((t) => t.sectionId.toString() === sec._id.toString());

        // Filter tabs based on user permissions and strictly exclude legacy Kanban board tabs
        const accessibleTabs = secTabs
          .filter((t) => {
            if (t.key === 'kanban' || t.badge?.toLowerCase() === 'kanban' || t.label?.toLowerCase() === 'pipeline board') {
              return false;
            }
            return true;
          })
          .map((t) => (t.viewTarget === 'kanban' ? { ...t, viewTarget: 'list' } : t))
          .filter((t) => {
            // Owner always has full access to all tabs
            if (isOwner) return true;

            // If tab is open to everyone
            if (!t.accessType || t.accessType === 'everyone') {
              return true;
            }

            // If restricted: check role assignment
            if (Array.isArray(t.allowedRoles) && t.allowedRoles.includes(userRole)) {
              return true;
            }

            // Check explicit user assignment
            if (Array.isArray(t.allowedUsers)) {
              const hasUserAccess = t.allowedUsers.some((u) => {
                const uId = u?._id ? u._id.toString() : u.toString();
                return uId === userId;
              });
              if (hasUserAccess) return true;
            }

            return false;
          });

        // Hide empty sections for non-managers
        if (accessibleTabs.length > 0 || isOwner || isAdmin) {
          sectionsWithTabs.push({
            ...sec,
            tabs: accessibleTabs,
          });
        }
      }

      return res.json({ success: true, sections: sectionsWithTabs });
    }

    const sections = store.getSidebar(req.user?.role);
    return res.json({ success: true, sections: sections || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createSection = async (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ success: false, message: 'Section title is required.' });
  }

  try {
    const key = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
    const count = await SidebarSection.countDocuments();

    const newSection = await SidebarSection.create({
      title: title.trim(),
      key,
      order: count + 1,
      isSystem: false,
      createdBy: req.user?._id,
    });

    const io = getIO();
    if (io) io.emit('sidebar:updated');

    res.status(201).json({
      success: true,
      message: 'Sidebar section created successfully.',
      section: { ...newSection.toObject(), tabs: [] },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateSection = async (req, res) => {
  const { id } = req.params;
  const { title, order } = req.body;

  try {
    const updateData = {};
    if (title && title.trim()) updateData.title = title.trim();
    if (typeof order === 'number') updateData.order = order;

    const section = await SidebarSection.findByIdAndUpdate(id, updateData, { new: true });
    if (!section) {
      return res.status(404).json({ success: false, message: 'Section not found.' });
    }

    const io = getIO();
    if (io) io.emit('sidebar:updated');

    res.json({ success: true, message: 'Section updated.', section });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteSection = async (req, res) => {
  const { id } = req.params;

  try {
    const section = await SidebarSection.findById(id);
    if (!section) {
      return res.status(404).json({ success: false, message: 'Section not found.' });
    }

    if (section.isSystem) {
      return res.status(400).json({ success: false, message: 'Core system sections cannot be deleted.' });
    }

    await SidebarTab.deleteMany({ sectionId: id });
    await SidebarSection.findByIdAndDelete(id);

    const io = getIO();
    if (io) io.emit('sidebar:updated');

    res.json({ success: true, message: 'Section and its tabs deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createTab = async (req, res) => {
  const {
    sectionId,
    label,
    type = 'category',
    categoryKey,
    viewTarget = 'list',
    icon = 'Folder',
    badge = '',
    accessType = 'everyone',
    allowedRoles = ['Owner', 'Admin', 'Editor', 'Viewer'],
    allowedUsers = [],
  } = req.body;

  if (!sectionId || !label || !label.trim()) {
    return res.status(400).json({ success: false, message: 'Section ID and tab label are required.' });
  }

  try {
    const section = await SidebarSection.findById(sectionId);
    if (!section) {
      return res.status(404).json({ success: false, message: 'Target section not found.' });
    }

    const trimmedLabel = label.trim();
    const key = trimmedLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
    const resolvedCatKey = categoryKey && categoryKey.trim() ? categoryKey.trim() : trimmedLabel;

    // Ensure Owner is always included in allowedRoles for administrative continuity
    const safeRoles = Array.isArray(allowedRoles) && allowedRoles.length > 0
      ? Array.from(new Set(['Owner', ...allowedRoles]))
      : ['Owner', 'Admin', 'Editor', 'Viewer'];

    const count = await SidebarTab.countDocuments({ sectionId });

    const newTab = await SidebarTab.create({
      sectionId,
      label: trimmedLabel,
      key,
      type,
      viewTarget,
      categoryKey: resolvedCatKey,
      icon: icon || 'Folder',
      badge: badge || '',
      order: count + 1,
      isSystem: false,
      createdBy: req.user?._id,
      accessType: accessType || 'everyone',
      allowedRoles: safeRoles,
      allowedUsers: Array.isArray(allowedUsers) ? allowedUsers : [],
    });

    const populatedTab = await SidebarTab.findById(newTab._id).populate('allowedUsers', 'name email avatar role');

    const io = getIO();
    if (io) io.emit('sidebar:updated');

    res.status(201).json({
      success: true,
      message: 'Sidebar tab created successfully.',
      tab: populatedTab,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateTab = async (req, res) => {
  const { id } = req.params;
  const {
    label,
    sectionId,
    type,
    categoryKey,
    viewTarget,
    icon,
    badge,
    order,
    accessType,
    allowedRoles,
    allowedUsers,
  } = req.body;

  try {
    const tab = await SidebarTab.findById(id);
    if (!tab) {
      return res.status(404).json({ success: false, message: 'Tab not found.' });
    }

    if (label && label.trim()) tab.label = label.trim();
    if (sectionId) tab.sectionId = sectionId;
    if (type) tab.type = type;
    if (categoryKey !== undefined) {
      tab.categoryKey = categoryKey.trim() || tab.label;
    } else if (!tab.categoryKey) {
      tab.categoryKey = tab.label;
    }
    if (viewTarget) tab.viewTarget = viewTarget;
    if (icon) tab.icon = icon;
    if (badge !== undefined) tab.badge = badge;
    if (typeof order === 'number') tab.order = order;

    if (accessType) tab.accessType = accessType;
    if (Array.isArray(allowedRoles)) {
      tab.allowedRoles = Array.from(new Set(['Owner', ...allowedRoles]));
    }
    if (Array.isArray(allowedUsers)) {
      tab.allowedUsers = allowedUsers;
    }

    await tab.save();

    const populatedTab = await SidebarTab.findById(tab._id).populate('allowedUsers', 'name email avatar role');

    const io = getIO();
    if (io) io.emit('sidebar:updated');

    res.json({ success: true, message: 'Tab updated successfully.', tab: populatedTab });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Dedicated Tab Permissions Endpoint
export const updateTabPermissions = async (req, res) => {
  const { id } = req.params;
  const { accessType, allowedRoles, allowedUsers } = req.body;

  try {
    const tab = await SidebarTab.findById(id);
    if (!tab) {
      return res.status(404).json({ success: false, message: 'Tab not found.' });
    }

    if (accessType) {
      tab.accessType = accessType;
    }

    if (Array.isArray(allowedRoles)) {
      // Owner must always retain access
      tab.allowedRoles = Array.from(new Set(['Owner', ...allowedRoles]));
    }

    if (Array.isArray(allowedUsers)) {
      tab.allowedUsers = allowedUsers;
    }

    await tab.save();

    const populatedTab = await SidebarTab.findById(tab._id).populate('allowedUsers', 'name email avatar role');

    const io = getIO();
    if (io) io.emit('sidebar:updated');

    res.json({
      success: true,
      message: `Permissions updated for tab "${tab.label}".`,
      tab: populatedTab,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteTab = async (req, res) => {
  const { id } = req.params;

  try {
    const tab = await SidebarTab.findById(id);
    if (!tab) {
      return res.status(404).json({ success: false, message: 'Tab not found.' });
    }

    if (tab.isSystem) {
      return res.status(400).json({ success: false, message: 'Core system tabs cannot be deleted.' });
    }

    await SidebarTab.findByIdAndDelete(id);

    const io = getIO();
    if (io) io.emit('sidebar:updated');

    res.json({ success: true, message: 'Tab deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
