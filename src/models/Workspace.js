import mongoose from 'mongoose';

const workspaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      default: 'Devdrip CRM',
    },
    description: {
      type: String,
      default: 'Primary Enterprise Workspace',
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        role: {
          type: String,
          enum: ['Owner', 'Admin', 'Editor', 'Viewer'],
          default: 'Editor',
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    folders: [
      {
        name: { type: String, required: true },
        key: { type: String, required: true },
        count: { type: Number, default: 0 },
        icon: { type: String, default: 'folder' },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Workspace = mongoose.models.Workspace || mongoose.model('Workspace', workspaceSchema);
export default Workspace;
