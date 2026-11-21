import mongoose from 'mongoose';

const sidebarTabSchema = new mongoose.Schema(
  {
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SidebarSection',
      required: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    key: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['view', 'category', 'link'],
      default: 'category',
    },
    viewTarget: {
      type: String,
      default: 'list',
    },
    categoryKey: {
      type: String,
      default: '',
    },
    icon: {
      type: String,
      default: 'Folder',
    },
    badge: {
      type: String,
      default: '',
    },
    order: {
      type: Number,
      default: 0,
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // Granular Access Control
    accessType: {
      type: String,
      enum: ['everyone', 'restricted'],
      default: 'everyone',
    },
    allowedRoles: {
      type: [String],
      enum: ['Owner', 'Admin', 'Editor', 'Viewer'],
      default: ['Owner', 'Admin', 'Editor', 'Viewer'],
    },
    allowedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
  }
);

const SidebarTab =
  mongoose.models.SidebarTab ||
  mongoose.model('SidebarTab', sidebarTabSchema);

export default SidebarTab;
