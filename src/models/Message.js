import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    channel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Channel',
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    attachments: [
      {
        name: String,
        url: String,
        fileType: String,
        size: String,
      },
    ],
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    reactions: [
      {
        emoji: String,
        users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);
export default Message;
