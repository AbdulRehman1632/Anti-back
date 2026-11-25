import mongoose from 'mongoose';

const callSessionSchema = new mongoose.Schema(
  {
    callId: { type: String, required: true, unique: true },
    caller: {
      _id: { type: String, required: true },
      name: { type: String, default: 'Team Member' },
      avatar: { type: String, default: '' },
      role: { type: String, default: 'Member' },
    },
    targetUserId: { type: String, default: null }, // for 1-on-1 direct calls
    channelId: { type: String, default: null }, // for conference calls
    channelName: { type: String, default: '' },
    callType: { type: String, enum: ['audio', 'video'], default: 'video' },
    isDirect: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ['ringing', 'accepted', 'declined', 'ended'],
      default: 'ringing',
    },
    responder: {
      _id: { type: String },
      name: { type: String },
      avatar: { type: String },
    },
    reason: { type: String, default: '' },
    callerSocketId: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now, expires: 120 }, // Auto-expire in 2 mins
  },
  { timestamps: true }
);

export default mongoose.models.CallSession || mongoose.model('CallSession', callSessionSchema);
