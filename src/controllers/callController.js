import CallSession from '../models/CallSession.js';
import { isMongoConnected } from '../config/db.js';
import { getIO } from '../sockets/socketHandler.js';

// Fallback in-memory call storage
const inMemoryCalls = new Map();

export const initiateCall = async (req, res) => {
  try {
    const { targetUserId, channelId, channelName, callType = 'video', isDirect = true, callerSocketId } = req.body;
    const callId = 'call-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);

    const callerData = {
      _id: String(req.user._id),
      name: req.user.name,
      avatar: req.user.avatar || '',
      role: req.user.role || 'Member',
    };

    const callPayload = {
      callId,
      caller: callerData,
      targetUserId: targetUserId ? String(targetUserId) : null,
      channelId: channelId ? String(channelId) : null,
      channelName: channelName || (callerData.name ? `${callerData.name}` : 'Direct Call'),
      callType,
      isDirect: Boolean(isDirect),
      status: 'ringing',
      callerSocketId: callerSocketId || '',
      createdAt: new Date(),
    };

    if (isMongoConnected) {
      await CallSession.create(callPayload);
    }
    inMemoryCalls.set(callId, callPayload);

    // Also emit via socket if socket server is active
    try {
      const io = getIO();
      if (io) {
        if (isDirect && targetUserId) {
          io.to(`user:${targetUserId}`).emit('call:incoming', callPayload);
        } else if (channelId) {
          io.to(`channel:${channelId}`).emit('call:incoming', callPayload);
          io.emit('call:incoming', callPayload);
        }
      }
    } catch (e) {}

    res.status(201).json({ success: true, call: callPayload });
  } catch (err) {
    console.error('Initiate call error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getIncomingCalls = async (req, res) => {
  try {
    const userId = String(req.user._id);
    let incomingCall = null;

    if (isMongoConnected) {
      incomingCall = await CallSession.findOne({
        status: 'ringing',
        'caller._id': { $ne: userId },
        $or: [
          { isDirect: true, targetUserId: userId },
          { isDirect: false }, // Conference call
        ],
      }).sort({ createdAt: -1 });
    }

    if (!incomingCall) {
      // Check in-memory store
      const now = Date.now();
      for (const call of inMemoryCalls.values()) {
        if (call.status === 'ringing' && call.caller?._id !== userId) {
          if ((call.isDirect && call.targetUserId === userId) || !call.isDirect) {
            // Check expiry within 45s
            if (now - new Date(call.createdAt).getTime() < 45000) {
              incomingCall = call;
              break;
            }
          }
        }
      }
    }

    res.json({ success: true, call: incomingCall || null });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getCallStatus = async (req, res) => {
  try {
    const { callId } = req.params;
    let call = null;

    if (isMongoConnected) {
      call = await CallSession.findOne({ callId });
    }
    if (!call) {
      call = inMemoryCalls.get(callId) || null;
    }

    if (!call) {
      return res.status(404).json({ success: false, message: 'Call not found' });
    }

    res.json({ success: true, call });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const respondCall = async (req, res) => {
  try {
    const { callId } = req.params;
    const { action, reason } = req.body; // action: 'accept' | 'decline'
    const newStatus = action === 'accept' ? 'accepted' : 'declined';

    const responder = {
      _id: String(req.user._id),
      name: req.user.name,
      avatar: req.user.avatar || '',
      role: req.user.role || 'Member',
    };

    let updatedCall = null;
    if (isMongoConnected) {
      updatedCall = await CallSession.findOneAndUpdate(
        { callId },
        { status: newStatus, responder, reason: reason || '' },
        { new: true }
      );
    }

    const memCall = inMemoryCalls.get(callId);
    if (memCall) {
      memCall.status = newStatus;
      memCall.responder = responder;
      memCall.reason = reason || '';
      if (!updatedCall) updatedCall = memCall;
    }

    // Emit socket event if active
    try {
      const io = getIO();
      if (io) {
        if (newStatus === 'accepted') {
          io.emit('call:accepted', { callId, responder });
        } else {
          io.emit('call:declined', { callId, reason, responder });
        }
      }
    } catch (e) {}

    res.json({ success: true, call: updatedCall });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const endCall = async (req, res) => {
  try {
    const { callId } = req.params;

    if (isMongoConnected) {
      await CallSession.findOneAndUpdate({ callId }, { status: 'ended' });
    }
    const memCall = inMemoryCalls.get(callId);
    if (memCall) {
      memCall.status = 'ended';
    }

    try {
      const io = getIO();
      if (io) {
        io.emit('call:cancelled', { callId });
      }
    } catch (e) {}

    res.json({ success: true, message: 'Call ended' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
