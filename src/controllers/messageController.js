import Message from '../models/Message.js';
import store from '../storage/mockStore.js';
import { isMongoConnected } from '../config/db.js';
import { getIO } from '../sockets/socketHandler.js';

export const getMessages = async (req, res) => {
  try {
    const { channel, recipient } = req.query;
    let messages;

    if (isMongoConnected) {
      const filter = {};
      if (channel) {
        filter.channel = channel;
      } else if (recipient) {
        filter.$or = [
          { sender: req.user._id, recipient },
          { sender: recipient, recipient: req.user._id },
        ];
      }
      messages = await Message.find(filter)
        .populate('sender', 'name email avatar role status')
        .populate('recipient', 'name email avatar role')
        .sort({ createdAt: 1 });
    } else {
      messages = store.getMessages({
        channel,
        recipient,
        sender: req.user._id,
      });
    }

    res.json({ success: true, count: messages.length, messages });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createMessage = async (req, res) => {
  try {
    const { content, channel, recipient, attachments } = req.body;
    if (!content && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ success: false, message: 'Message content or attachment is required' });
    }

    let savedMessage;
    if (isMongoConnected) {
      savedMessage = await Message.create({
        sender: req.user._id,
        channel: channel || null,
        recipient: recipient || null,
        content: content || '',
        attachments: attachments || [],
        readBy: [req.user._id],
      });
      savedMessage = await Message.findById(savedMessage._id)
        .populate('sender', 'name email avatar role status')
        .populate('recipient', 'name email avatar role');
    } else {
      savedMessage = store.createMessage({
        sender: req.user._id,
        channel: channel || null,
        recipient: recipient || null,
        content: content || '',
        attachments: attachments || [],
      });
    }

    try {
      const io = getIO();
      if (io) {
        if (channel) {
          io.to(`channel:${channel}`).emit('message:new', savedMessage);
        } else if (recipient) {
          io.to(`user:${recipient}`).emit('message:new', savedMessage);
          io.to(`user:${req.user._id}`).emit('message:new', savedMessage);
        } else {
          io.emit('message:new', savedMessage);
        }
      }
    } catch (e) {}

    res.status(201).json({ success: true, message: savedMessage });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const addReaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { emoji } = req.body;
    if (!emoji) {
      return res.status(400).json({ success: false, message: 'Emoji is required' });
    }

    let updatedMessage;
    if (isMongoConnected) {
      const msg = await Message.findById(id);
      if (!msg) return res.status(404).json({ success: false, message: 'Message not found' });

      let rx = msg.reactions.find((r) => r.emoji === emoji);
      if (rx) {
        const uIndex = rx.users.indexOf(req.user._id);
        if (uIndex > -1) {
          rx.users.splice(uIndex, 1);
        } else {
          rx.users.push(req.user._id);
        }
      } else {
        msg.reactions.push({ emoji, users: [req.user._id] });
      }
      await msg.save();
      updatedMessage = await Message.findById(id).populate('sender', 'name email avatar role status');
    } else {
      const msg = store.messages.find((m) => m._id === id);
      if (!msg) return res.status(404).json({ success: false, message: 'Message not found' });
      if (!msg.reactions) msg.reactions = [];
      let rx = msg.reactions.find((r) => r.emoji === emoji);
      if (rx) {
        const uIndex = rx.users.indexOf(req.user._id);
        if (uIndex > -1) {
          rx.users.splice(uIndex, 1);
        } else {
          rx.users.push(req.user._id);
        }
      } else {
        msg.reactions.push({ emoji, users: [req.user._id] });
      }
      updatedMessage = { ...msg, sender: store.findUserById(msg.sender) };
    }

    try {
      const io = getIO();
      if (io) {
        if (updatedMessage.channel) {
          io.to(`channel:${updatedMessage.channel}`).emit('message:reaction', updatedMessage);
        } else {
          io.emit('message:reaction', updatedMessage);
        }
      }
    } catch (e) {}

    res.json({ success: true, message: updatedMessage });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
