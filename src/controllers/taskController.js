import mongoose from 'mongoose';
import Task from '../models/Task.js';
import store from '../storage/mockStore.js';
import { isMongoConnected } from '../config/db.js';
import { getIO } from '../sockets/socketHandler.js';

export const getTasks = async (req, res) => {
  try {
    const { status, priority, listCategory, assignee, search } = req.query;

    if (isMongoConnected) {
      const filter = {};
      if (status) filter.status = status;
      if (priority) filter.priority = priority;
      if (listCategory) filter.listCategory = listCategory;
      if (assignee) filter.assignee = assignee;
      if (search) {
        filter.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { tags: { $in: [new RegExp(search, 'i')] } },
        ];
      }

      const tasks = await Task.find(filter)
        .populate('assignee', 'name email avatar role')
        .populate('reporter', 'name email avatar')
        .populate('comments.user', 'name avatar')
        .sort({ order: 1, createdAt: -1 });

      return res.json({ success: true, count: tasks.length, tasks });
    } else {
      const tasks = store.getTasks({ status, priority, listCategory, assignee, search });
      return res.json({ success: true, count: tasks.length, tasks });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getTaskById = async (req, res) => {
  try {
    const { id } = req.params;
    let task;
    if (isMongoConnected) {
      task = await Task.findById(id)
        .populate('assignee', 'name email avatar role')
        .populate('reporter', 'name email avatar')
        .populate('comments.user', 'name avatar');
    } else {
      task = store.getTaskById(id);
    }

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    res.json({ success: true, task });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createTask = async (req, res) => {
  try {
    const { title, description, status, priority, assignee, dueDate, tags, listCategory, channelId, customFields } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Task title is required' });
    }

    const resolvedAssignee = (assignee && mongoose.Types.ObjectId.isValid(assignee)) ? assignee : req.user?._id;
    const resolvedDueDate = dueDate && !isNaN(new Date(dueDate).getTime()) ? new Date(dueDate) : null;
    const resolvedChannelId = (channelId && mongoose.Types.ObjectId.isValid(channelId)) ? channelId : undefined;
    const resolvedCategory = (listCategory && listCategory.trim()) ? listCategory.trim() : 'General';
    const resolvedCustomFields = typeof customFields === 'object' && customFields !== null ? customFields : {};
    const exactCreatedAt = new Date();

    let createdTask;
    if (isMongoConnected) {
      createdTask = await Task.create({
        title: title.trim(),
        description: description || '',
        status: status || 'TO DO',
        priority: priority || 'MEDIUM',
        assignee: resolvedAssignee,
        reporter: req.user?._id,
        dueDate: resolvedDueDate,
        tags: Array.isArray(tags) ? tags : [],
        listCategory: resolvedCategory,
        channelId: resolvedChannelId,
        customFields: resolvedCustomFields,
        createdAt: exactCreatedAt,
      });

      createdTask = await Task.findById(createdTask._id)
        .populate('assignee', 'name email avatar role')
        .populate('reporter', 'name email avatar');
    } else {
      createdTask = store.createTask({
        title: title.trim(),
        description: description || '',
        status: status || 'TO DO',
        priority: priority || 'MEDIUM',
        assignee: resolvedAssignee,
        reporter: req.user?._id,
        dueDate: resolvedDueDate,
        tags: Array.isArray(tags) ? tags : [],
        listCategory: resolvedCategory,
        channelId: resolvedChannelId,
        customFields: resolvedCustomFields,
        createdAt: exactCreatedAt,
      });
    }

    // Broadcast real-time update
    try {
      const io = getIO();
      if (io) io.emit('task:created', createdTask);
    } catch (e) {}

    res.status(201).json({ success: true, task: createdTask });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    if (!updateData.assignee || !mongoose.Types.ObjectId.isValid(updateData.assignee)) {
      delete updateData.assignee;
    }
    if (!updateData.channelId || !mongoose.Types.ObjectId.isValid(updateData.channelId)) {
      delete updateData.channelId;
    }
    if (updateData.dueDate === '' || (updateData.dueDate && isNaN(new Date(updateData.dueDate).getTime()))) {
      updateData.dueDate = null;
    }
    if (updateData.listCategory) {
      updateData.listCategory = updateData.listCategory.trim();
    }

    let updated;

    if (isMongoConnected) {
      updated = await Task.findByIdAndUpdate(id, updateData, { new: true })
        .populate('assignee', 'name email avatar role')
        .populate('reporter', 'name email avatar')
        .populate('comments.user', 'name avatar');
    } else {
      updated = store.updateTask(id, updateData);
    }

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    // Real-time broadcast
    try {
      const io = getIO();
      if (io) io.emit('task:updated', updated);
    } catch (e) {}

    res.json({ success: true, task: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    let deleted = false;

    if (isMongoConnected) {
      const res = await Task.findByIdAndDelete(id);
      deleted = !!res;
    } else {
      deleted = store.deleteTask(id);
    }

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    try {
      const io = getIO();
      if (io) io.emit('task:deleted', { id });
    } catch (e) {}

    res.json({ success: true, message: 'Task removed successfully', id });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, message: 'Comment text is required' });
    }

    let updated;
    if (isMongoConnected) {
      updated = await Task.findByIdAndUpdate(
        id,
        {
          $push: {
            comments: {
              user: req.user._id,
              text,
              createdAt: new Date(),
            },
          },
        },
        { new: true }
      )
        .populate('assignee', 'name email avatar role')
        .populate('reporter', 'name email avatar')
        .populate('comments.user', 'name avatar');
    } else {
      updated = store.addComment(id, { user: req.user._id, text });
    }

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    try {
      const io = getIO();
      if (io) io.emit('task:comment_added', { taskId: id, task: updated });
    } catch (e) {}

    res.json({ success: true, task: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const toggleSubtask = async (req, res) => {
  try {
    const { id, subtaskId } = req.params;
    let updated;

    if (isMongoConnected) {
      const task = await Task.findById(id);
      if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
      const subtask = task.subtasks.id(subtaskId);
      if (subtask) subtask.completed = !subtask.completed;
      await task.save();
      updated = await Task.findById(id)
        .populate('assignee', 'name email avatar role')
        .populate('reporter', 'name email avatar')
        .populate('comments.user', 'name avatar');
    } else {
      updated = store.toggleSubtask(id, subtaskId);
    }

    try {
      const io = getIO();
      if (io) io.emit('task:updated', updated);
    } catch (e) {}

    res.json({ success: true, task: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const addSubtask = async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, message: 'Subtask title is required' });
    }

    let updated;
    if (isMongoConnected) {
      updated = await Task.findByIdAndUpdate(
        id,
        { $push: { subtasks: { title, completed: false } } },
        { new: true }
      )
        .populate('assignee', 'name email avatar role')
        .populate('reporter', 'name email avatar')
        .populate('comments.user', 'name avatar');
    } else {
      updated = store.addSubtask(id, title);
    }

    try {
      const io = getIO();
      if (io) io.emit('task:updated', updated);
    } catch (e) {}

    res.json({ success: true, task: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
