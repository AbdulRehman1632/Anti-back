import mongoose from 'mongoose';

const subtaskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    completed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const commentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  }
);

const attachmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    size: { type: String, default: '1.2 MB' },
    type: { type: String, default: 'pdf' },
    url: { type: String, default: '#' },
    uploadedAt: { type: Date, default: Date.now },
  }
);

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      default: 'TO DO',
      trim: true,
    },
    priority: {
      type: String,
      enum: ['URGENT', 'HIGH', 'MEDIUM', 'LOW'],
      default: 'MEDIUM',
    },
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    dueDate: {
      type: Date,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    subtasks: [subtaskSchema],
    attachments: [attachmentSchema],
    comments: [commentSchema],
    listCategory: {
      type: String,
      default: 'Business',
    },
    channelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Channel',
    },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
    },
    order: {
      type: Number,
      default: 0,
    },
    customFields: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

const Task = mongoose.models.Task || mongoose.model('Task', taskSchema);
export default Task;
