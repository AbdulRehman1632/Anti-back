import { Server } from 'socket.io';
import store from '../storage/mockStore.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import { isMongoConnected } from '../config/db.js';

let io = null;

// Track active users and their active rooms
// userId -> { socketId, user, currentChannel, inCall }
const onlineUsers = new Map();
// channelId -> Set of active participants in WebRTC call { socketId, user, isAudioMuted, isVideoOff, isScreenSharing }
const activeCalls = new Map();

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Register authenticated user
    socket.on('user:register', (user) => {
      if (!user || !user._id) return;
      socket.userId = user._id;
      onlineUsers.set(user._id, {
        socketId: socket.id,
        user,
        status: user.status || 'online',
      });

      // Join personal room for 1-on-1 direct messages and notifications
      socket.join(`user:${user._id}`);

      // Broadcast online status to everyone
      io.emit('user:presence_updated', {
        userId: user._id,
        status: user.status || 'online',
        onlineUsers: Array.from(onlineUsers.values()).map((u) => ({
          _id: u.user._id,
          name: u.user.name,
          role: u.user.role,
          avatar: u.user.avatar,
          status: u.status,
        })),
      });

      // Send current active calls state
      const callSummaries = {};
      activeCalls.forEach((participants, channelId) => {
        callSummaries[channelId] = Array.from(participants.values());
      });
      socket.emit('call:active_list', callSummaries);
    });

    // Join / Leave channel rooms
    socket.on('channel:join', ({ channelId, user }) => {
      if (!channelId) return;
      socket.join(`channel:${channelId}`);
      socket.to(`channel:${channelId}`).emit('channel:user_joined', {
        channelId,
        user,
      });
    });

    socket.on('channel:leave', ({ channelId, user }) => {
      if (!channelId) return;
      socket.leave(`channel:${channelId}`);
      socket.to(`channel:${channelId}`).emit('channel:user_left', {
        channelId,
        user,
      });
    });

    // Chat messaging via socket
    socket.on('message:send', async (msgData) => {
      try {
        const { sender, recipient, channel, content, attachments } = msgData;
        let savedMessage;

        if (isMongoConnected) {
          savedMessage = await Message.create({
            sender: sender._id || sender,
            recipient: recipient || null,
            channel: channel || null,
            content,
            attachments: attachments || [],
            readBy: [sender._id || sender],
          });
          savedMessage = await Message.findById(savedMessage._id).populate('sender', 'name email avatar role status');
        } else {
          savedMessage = store.createMessage({
            sender: sender._id || sender,
            recipient: recipient || null,
            channel: channel || null,
            content,
            attachments: attachments || [],
          });
        }

        if (channel) {
          io.to(`channel:${channel}`).emit('message:new', savedMessage);
        } else if (recipient) {
          io.to(`user:${recipient}`).emit('message:new', savedMessage);
          socket.emit('message:new', savedMessage);
        } else {
          io.emit('message:new', savedMessage);
        }
      } catch (err) {
        console.error('Socket message send error:', err);
      }
    });

    // Typing indicators
    socket.on('typing:start', ({ channelId, recipientId, user }) => {
      if (channelId) {
        socket.to(`channel:${channelId}`).emit('typing:status', {
          channelId,
          user,
          isTyping: true,
        });
      } else if (recipientId) {
        io.to(`user:${recipientId}`).emit('typing:status', {
          recipientId,
          user,
          isTyping: true,
        });
      }
    });

    socket.on('typing:stop', ({ channelId, recipientId, user }) => {
      if (channelId) {
        socket.to(`channel:${channelId}`).emit('typing:status', {
          channelId,
          user,
          isTyping: false,
        });
      } else if (recipientId) {
        io.to(`user:${recipientId}`).emit('typing:status', {
          recipientId,
          user,
          isTyping: false,
        });
      }
    });

    // WebRTC Real-Time Calling Signaling
    socket.on('call:join', ({ channelId, user, isAudioMuted = false, isVideoOff = false }) => {
      if (!channelId || !user) return;

      if (!activeCalls.has(channelId)) {
        activeCalls.set(channelId, new Map());
      }

      const participants = activeCalls.get(channelId);
      const participantInfo = {
        socketId: socket.id,
        user,
        isAudioMuted,
        isVideoOff,
        isScreenSharing: false,
        joinedAt: new Date(),
      };

      participants.set(socket.id, participantInfo);
      socket.join(`call:${channelId}`);
      socket.callChannelId = channelId;

      // Notify other participants in the call room
      socket.to(`call:${channelId}`).emit('call:peer_joined', {
        channelId,
        participant: participantInfo,
      });

      // Send existing call participants to the newcomer
      const existingList = Array.from(participants.values()).filter((p) => p.socketId !== socket.id);
      socket.emit('call:existing_participants', {
        channelId,
        participants: existingList,
      });

      // Broadcast to workspace that this channel has an active call
      io.emit('call:status_changed', {
        channelId,
        participantsCount: participants.size,
        participants: Array.from(participants.values()),
      });
    });

    // WebRTC P2P Signaling relays
    socket.on('call:signal_offer', ({ targetSocketId, offer, callerUser }) => {
      io.to(targetSocketId).emit('call:incoming_offer', {
        callerSocketId: socket.id,
        callerUser,
        offer,
      });
    });

    socket.on('call:signal_answer', ({ targetSocketId, answer }) => {
      io.to(targetSocketId).emit('call:incoming_answer', {
        responderSocketId: socket.id,
        answer,
      });
    });

    socket.on('call:signal_ice', ({ targetSocketId, candidate }) => {
      io.to(targetSocketId).emit('call:incoming_ice', {
        senderSocketId: socket.id,
        candidate,
      });
    });

    socket.on('call:toggle_media', ({ channelId, isAudioMuted, isVideoOff, isScreenSharing }) => {
      if (!channelId || !activeCalls.has(channelId)) return;
      const participants = activeCalls.get(channelId);
      if (participants.has(socket.id)) {
        const current = participants.get(socket.id);
        if (isAudioMuted !== undefined) current.isAudioMuted = isAudioMuted;
        if (isVideoOff !== undefined) current.isVideoOff = isVideoOff;
        if (isScreenSharing !== undefined) current.isScreenSharing = isScreenSharing;

        io.to(`call:${channelId}`).emit('call:media_state_changed', {
          socketId: socket.id,
          isAudioMuted: current.isAudioMuted,
          isVideoOff: current.isVideoOff,
          isScreenSharing: current.isScreenSharing,
        });
      }
    });

    socket.on('call:leave', ({ channelId }) => {
      leaveCall(socket, channelId);
    });

    // Disconnect handler
    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
      if (socket.callChannelId) {
        leaveCall(socket, socket.callChannelId);
      }
      if (socket.userId) {
        onlineUsers.delete(socket.userId);
        io.emit('user:presence_updated', {
          userId: socket.userId,
          status: 'offline',
          onlineUsers: Array.from(onlineUsers.values()).map((u) => ({
            _id: u.user._id,
            name: u.user.name,
            role: u.user.role,
            avatar: u.user.avatar,
            status: u.status,
          })),
        });
      }
    });
  });

  return io;
};

const leaveCall = (socket, channelId) => {
  if (!channelId || !activeCalls.has(channelId)) return;
  const participants = activeCalls.get(channelId);
  if (participants.has(socket.id)) {
    const leftParticipant = participants.get(socket.id);
    participants.delete(socket.id);
    socket.leave(`call:${channelId}`);
    delete socket.callChannelId;

    io.to(`call:${channelId}`).emit('call:peer_left', {
      channelId,
      socketId: socket.id,
      participant: leftParticipant,
    });

    if (participants.size === 0) {
      activeCalls.delete(channelId);
    }

    io.emit('call:status_changed', {
      channelId,
      participantsCount: participants.size,
      participants: Array.from(participants.values()),
    });
  }
};

export const getIO = () => io;
