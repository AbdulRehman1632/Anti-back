import mongoose from 'mongoose';

const sidebarSectionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    key: {
      type: String,
      required: true,
      trim: true,
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
  },
  {
    timestamps: true,
  }
);

const SidebarSection =
  mongoose.models.SidebarSection ||
  mongoose.model('SidebarSection', sidebarSectionSchema);

export default SidebarSection;
