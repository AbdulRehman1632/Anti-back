import { defaultUsers, defaultTasks } from '../data/seedData.js';

class MockDataStore {
  constructor() {
    this.users = JSON.parse(JSON.stringify(defaultUsers));
    this.workspaces = [
      {
        _id: '66e200000000000000000001',
        name: 'Devdrip CRM',
        description: 'Enterprise workspace for clients, pipeline and communications',
        members: [],
        folders: [],
      },
    ];
    this.channels = [
      {
        _id: '66e300000000000000000001',
        name: 'General',
        type: 'public',
        description: 'General team discussion channel',
        topic: 'General updates',
        workspaceId: '66e200000000000000000001',
        isDefault: true,
        members: [],
      },
    ];
    this.tasks = JSON.parse(JSON.stringify(defaultTasks));
    this.messages = [];
    this.sections = [
      {
        _id: 'sec-1',
        title: 'CRM Operations',
        key: 'operations',
        order: 1,
        isSystem: true,
      },
      {
        _id: 'sec-2',
        title: 'Live Collaboration',
        key: 'collaboration',
        order: 2,
        isSystem: true,
      },
      {
        _id: 'sec-3',
        title: 'Custom Portfolios',
        key: 'custom-portfolios',
        order: 3,
        isSystem: false,
      },
    ];
    this.tabs = [
      {
        _id: 'tab-2',
        sectionId: 'sec-1',
        label: 'Deals & Records',
        key: 'list',
        type: 'view',
        viewTarget: 'list',
        icon: 'TableProperties',
        order: 1,
        isSystem: true,
      },
      {
        _id: 'tab-3',
        sectionId: 'sec-1',
        label: 'ARR & Analytics',
        key: 'analytics',
        type: 'view',
        viewTarget: 'analytics',
        icon: 'BarChart3',
        order: 2,
        isSystem: true,
      },
      {
        _id: 'tab-4',
        sectionId: 'sec-2',
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
        _id: 'tab-5',
        sectionId: 'sec-2',
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
        _id: 'tab-6',
        sectionId: 'sec-2',
        label: 'Team & RBAC Matrix',
        key: 'team',
        type: 'view',
        viewTarget: 'team',
        icon: 'Users',
        order: 3,
        isSystem: true,
      },
      {
        _id: 'tab-7',
        sectionId: 'sec-3',
        label: 'All Deals',
        key: 'all',
        type: 'category',
        categoryKey: 'all',
        viewTarget: 'list',
        icon: 'Layers',
        order: 1,
        isSystem: true,
      },
    ];
    this.customFields = [];
    this.isMock = true;
  }

  // --- Users ---
  findUserById(id) {
    return this.users.find((u) => u._id === id || u.id === id) || null;
  }

  findUserByEmail(email) {
    return this.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
  }

  getAllUsers() {
    return this.users.map(({ password, ...rest }) => rest);
  }

  createUser(userData) {
    const newUser = {
      _id: '66e10000000000000000000' + (this.users.length + 1),
      organizationName: userData.organizationName || (this.workspaces[0] ? this.workspaces[0].name : 'Devdrip CRM'),
      ...userData,
      status: userData.status || 'online',
      statusMessage: userData.statusMessage || 'Available',
      createdAt: new Date(),
    };
    if (userData.organizationName && this.workspaces[0]) {
      this.workspaces[0].name = userData.organizationName;
    }
    this.users.push(newUser);
    return newUser;
  }

  updateUser(id, updateData) {
    const index = this.users.findIndex((u) => u._id === id);
    if (index === -1) return null;
    this.users[index] = { ...this.users[index], ...updateData };
    return this.users[index];
  }

  // --- Workspaces ---
  getWorkspace() {
    const ws = this.workspaces[0];
    const populatedMembers = (ws.members || []).map((m) => {
      const user = this.findUserById(m.user);
      return {
        ...m,
        user: user ? { _id: user._id, name: user.name, email: user.email, avatar: user.avatar, role: m.role, status: user.status } : null,
      };
    });
    return { ...ws, members: populatedMembers };
  }

  updateWorkspace(id, data) {
    if (this.workspaces[0]) {
      this.workspaces[0] = { ...this.workspaces[0], ...data };
      return this.workspaces[0];
    }
    return null;
  }

  // --- Channels ---
  getChannels() {
    return this.channels.map((ch) => ({
      ...ch,
      members: (ch.members || []).map((userId) => this.findUserById(userId)).filter(Boolean),
    }));
  }

  getChannelById(id) {
    const channel = this.channels.find((ch) => ch._id === id);
    if (!channel) return null;
    return {
      ...channel,
      members: (channel.members || []).map((userId) => this.findUserById(userId)).filter(Boolean),
    };
  }

  createChannel(channelData) {
    const newChannel = {
      _id: '66e3000000000000000000' + (this.channels.length + 10),
      ...channelData,
      createdAt: new Date(),
    };
    this.channels.push(newChannel);
    return newChannel;
  }

  updateChannel(id, updateData) {
    const index = this.channels.findIndex((ch) => ch._id === id);
    if (index === -1) return null;
    this.channels[index] = { ...this.channels[index], ...updateData };
    return this.channels[index];
  }

  deleteChannel(id) {
    const index = this.channels.findIndex((ch) => ch._id === id);
    if (index === -1) return false;
    this.channels.splice(index, 1);
    return true;
  }

  // --- Tasks ---
  getTasks(filter = {}) {
    let result = [...this.tasks];

    if (filter.status) {
      result = result.filter((t) => t.status.toUpperCase() === filter.status.toUpperCase());
    }
    if (filter.priority) {
      result = result.filter((t) => t.priority.toUpperCase() === filter.priority.toUpperCase());
    }
    if (filter.listCategory) {
      result = result.filter((t) => (t.listCategory || '').toLowerCase() === filter.listCategory.toLowerCase());
    }
    if (filter.assignee) {
      result = result.filter((t) => t.assignee === filter.assignee);
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.tags?.some((tag) => tag.toLowerCase().includes(q))
      );
    }

    return result.map((t) => this.populateTask(t));
  }

  getTaskById(id) {
    const task = this.tasks.find((t) => t._id === id);
    if (!task) return null;
    return this.populateTask(task);
  }

  populateTask(task) {
    const assignee = this.findUserById(task.assignee);
    const reporter = this.findUserById(task.reporter);
    const comments = (task.comments || []).map((c) => {
      const commentUser = this.findUserById(c.user);
      return {
        ...c,
        user: commentUser ? { _id: commentUser._id, name: commentUser.name, avatar: commentUser.avatar } : { name: 'Unknown' },
      };
    });

    return {
      ...task,
      assignee: assignee ? { _id: assignee._id, name: assignee.name, email: assignee.email, avatar: assignee.avatar, role: assignee.role } : null,
      reporter: reporter ? { _id: reporter._id, name: reporter.name, email: reporter.email, avatar: reporter.avatar } : null,
      comments,
    };
  }

  createTask(taskData) {
    const newTask = {
      _id: '66e4000000000000000000' + (this.tasks.length + 10),
      subtasks: [],
      attachments: [],
      comments: [],
      tags: [],
      order: this.tasks.length + 1,
      createdAt: new Date(),
      ...taskData,
    };
    this.tasks.unshift(newTask);
    return this.populateTask(newTask);
  }

  updateTask(id, updateData) {
    const index = this.tasks.findIndex((t) => t._id === id);
    if (index === -1) return null;

    this.tasks[index] = {
      ...this.tasks[index],
      ...updateData,
      updatedAt: new Date(),
    };
    return this.populateTask(this.tasks[index]);
  }

  deleteTask(id) {
    const index = this.tasks.findIndex((t) => t._id === id);
    if (index === -1) return false;
    this.tasks.splice(index, 1);
    return true;
  }

  addComment(taskId, commentData) {
    const task = this.tasks.find((t) => t._id === taskId);
    if (!task) return null;
    const newComment = {
      _id: 'cm-' + Date.now(),
      user: commentData.user,
      text: commentData.text,
      createdAt: new Date(),
    };
    if (!task.comments) task.comments = [];
    task.comments.push(newComment);
    return this.populateTask(task);
  }

  toggleSubtask(taskId, subtaskId) {
    const task = this.tasks.find((t) => t._id === taskId);
    if (!task || !task.subtasks) return null;
    const subtask = task.subtasks.find((s) => s._id === subtaskId);
    if (!subtask) return null;
    subtask.completed = !subtask.completed;
    return this.populateTask(task);
  }

  addSubtask(taskId, title) {
    const task = this.tasks.find((t) => t._id === taskId);
    if (!task) return null;
    if (!task.subtasks) task.subtasks = [];
    task.subtasks.push({
      _id: 'st-' + Date.now(),
      title,
      completed: false,
    });
    return this.populateTask(task);
  }

  // --- Messages ---
  getMessages(query = {}) {
    let result = [...this.messages];

    if (query.channel) {
      result = result.filter((m) => m.channel === query.channel);
    } else if (query.recipient && query.sender) {
      result = result.filter(
        (m) =>
          (m.sender === query.sender && m.recipient === query.recipient) ||
          (m.sender === query.recipient && m.recipient === query.sender)
      );
    }

    return result.map((m) => ({
      ...m,
      sender: this.findUserById(m.sender),
    }));
  }

  createMessage(msgData) {
    const newMsg = {
      _id: '66e5000000000000000000' + (this.messages.length + 10),
      reactions: [],
      readBy: [msgData.sender],
      createdAt: new Date(),
      ...msgData,
    };
    this.messages.push(newMsg);
    return {
      ...newMsg,
      sender: this.findUserById(newMsg.sender),
    };
  }

  // --- Custom Fields ---
  getCustomFields() {
    return [...(this.customFields || [])];
  }

  createCustomField(fieldData) {
    const newField = {
      _id: 'cf-' + (this.customFields.length + 1) + '-' + Date.now(),
      createdAt: new Date(),
      order: this.customFields.length + 1,
      ...fieldData,
    };
    this.customFields.push(newField);
    return newField;
  }

  updateCustomField(id, data) {
    const index = this.customFields.findIndex((f) => f._id === id || f.id === id);
    if (index === -1) return null;
    this.customFields[index] = { ...this.customFields[index], ...data, updatedAt: new Date() };
    return this.customFields[index];
  }

  deleteCustomField(id) {
    const index = this.customFields.findIndex((f) => f._id === id || f.id === id);
    if (index === -1) return false;
    this.customFields.splice(index, 1);
    return true;
  }

  // --- Lifecycle Stages ---
  getLifecycleStages() {
    return [...(this.lifecycleStages || this._defaultLifecycleStages())];
  }

  _defaultLifecycleStages() {
    this.lifecycleStages = [
      { _id: 'ls-1', key: 'TO DO', label: 'To Do', color: '#94a3b8', order: 1, isSystem: true },
      { _id: 'ls-2', key: 'IN PROGRESS', label: 'In Progress', color: '#38bdf8', order: 2, isSystem: true },
      { _id: 'ls-3', key: 'REVIEW', label: 'Review', color: '#fbbf24', order: 3, isSystem: true },
      { _id: 'ls-4', key: 'COMPLETED', label: 'Completed / Won', color: '#10b981', order: 4, isSystem: true },
    ];
    return this.lifecycleStages;
  }

  createLifecycleStage(data) {
    if (!this.lifecycleStages) this._defaultLifecycleStages();
    const stage = {
      _id: 'ls-' + Date.now(),
      createdAt: new Date(),
      order: this.lifecycleStages.length + 1,
      isSystem: false,
      ...data,
    };
    this.lifecycleStages.push(stage);
    return stage;
  }

  deleteLifecycleStage(id) {
    if (!this.lifecycleStages) return false;
    const idx = this.lifecycleStages.findIndex(s => s._id === id);
    if (idx === -1 || this.lifecycleStages[idx].isSystem) return false;
    this.lifecycleStages.splice(idx, 1);
    return true;
  }

  // --- Sidebar Navigation ---
  getSidebar(userRole = 'Owner') {
    return this.sections.map((sec) => ({
      ...sec,
      tabs: this.tabs
        .filter((t) => t.sectionId === sec._id)
        .filter(
          (t) =>
            t.key !== 'kanban' &&
            t.badge?.toLowerCase() !== 'kanban' &&
            t.label?.toLowerCase() !== 'pipeline board'
        )
        .map((t) => (t.viewTarget === 'kanban' ? { ...t, viewTarget: 'list' } : t)),
    }));
  }
}

export const store = new MockDataStore();
export default store;
