import mongoose from 'mongoose';

const customFieldSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['text', 'textarea', 'number', 'boolean'],
      required: true,
      default: 'text',
    },
    description: {
      type: String,
      default: '',
    },
    required: {
      type: Boolean,
      default: false,
    },
    showInTable: {
      type: Boolean,
      default: true,
    },
    showInCharts: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
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

export default mongoose.models.CustomField || mongoose.model('CustomField', customFieldSchema);

