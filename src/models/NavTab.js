import mongoose from 'mongoose';

const navTabSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    // 'system' tabs cannot be deleted (kanban, list, chat, calls, team, analytics)
    // 'custom' tabs are user-created folder/section tabs
    type: {
      type: String,
      enum: ['system', 'custom'],
      default: 'custom',
    },
    // For system tabs: the view key ('kanban', 'list', etc.)
    // For custom tabs: used as the listCategory filter key
    viewKey: {
      type: String,
      required: true,
    },
    icon: {
      type: String,
      default: 'Folder',
    },
    section: {
      type: String,
      enum: ['main', 'collaboration', 'categories'],
      default: 'categories',
    },
    order: {
      type: Number,
      default: 0,
    },
    isVisible: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

const NavTab = mongoose.models.NavTab || mongoose.model('NavTab', navTabSchema);
export default NavTab;
