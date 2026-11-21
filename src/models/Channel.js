import mongoose from 'mongoose';

const channelSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['public', 'private'],
      default: 'public',
    },
    description: {
      type: String,
      default: '',
    },
    topic: {
      type: String,
      default: '',
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Channel = mongoose.models.Channel || mongoose.model('Channel', channelSchema);
export default Channel;
