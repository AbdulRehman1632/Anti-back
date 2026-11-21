import Channel from '../models/Channel.js';
import store from '../storage/mockStore.js';
import { isMongoConnected } from '../config/db.js';
import { getIO } from '../sockets/socketHandler.js';

export const getChannels = async (req, res) => {
  try {
    let channels;
    if (isMongoConnected) {
      channels = await Channel.find().populate('members', 'name email avatar role status');
    } else {
      channels = store.getChannels();
    }
    res.json({ success: true, count: channels.length, channels });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getChannelById = async (req, res) => {
  try {
    const { id } = req.params;
    let channel;
    if (isMongoConnected) {
      channel = await Channel.findById(id).populate('members', 'name email avatar role status');
    } else {
      channel = store.getChannelById(id);
    }
    if (!channel) {
      return res.status(404).json({ success: false, message: 'Channel not found' });
    }
    res.json({ success: true, channel });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createChannel = async (req, res) => {
  try {
    const { name, type = 'public', description = '', topic = '', members = [] } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Channel name is required' });
    }

    let createdChannel;
    if (isMongoConnected) {
      createdChannel = await Channel.create({
        name,
        type,
        description,
        topic,
        members: members.length > 0 ? members : [req.user._id],
        isDefault: false,
      });
      createdChannel = await Channel.findById(createdChannel._id).populate('members', 'name email avatar role status');
    } else {
      createdChannel = store.createChannel({
        name,
        type,
        description,
        topic,
        members: members.length > 0 ? members : [req.user._id],
        isDefault: false,
      });
    }

    try {
      const io = getIO();
      if (io) io.emit('channel:created', createdChannel);
    } catch (e) {}

    res.status(201).json({ success: true, channel: createdChannel });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateChannel = async (req, res) => {
  try {
    const { id } = req.params;
    let updated;
    if (isMongoConnected) {
      updated = await Channel.findByIdAndUpdate(id, req.body, { new: true }).populate('members', 'name email avatar role status');
    } else {
      updated = store.updateChannel(id, req.body);
    }
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Channel not found' });
    }

    try {
      const io = getIO();
      if (io) io.emit('channel:updated', updated);
    } catch (e) {}

    res.json({ success: true, channel: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteChannel = async (req, res) => {
  try {
    const { id } = req.params;
    let deleted = false;
    if (isMongoConnected) {
      const result = await Channel.findByIdAndDelete(id);
      deleted = !!result;
    } else {
      deleted = store.deleteChannel(id);
    }
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Channel not found' });
    }

    try {
      const io = getIO();
      if (io) io.emit('channel:deleted', { id });
    } catch (e) {}

    res.json({ success: true, message: 'Channel deleted successfully', id });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
