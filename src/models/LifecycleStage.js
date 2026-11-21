import mongoose from 'mongoose';

const lifecycleStageSchema = new mongoose.Schema({
  label: { type: String, required: true, trim: true },
  key: { type: String, required: true, trim: true },
  color: { type: String, default: '#94a3b8' },
  order: { type: Number, default: 0 },
  isSystem: { type: Boolean, default: false },
  description: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.models.LifecycleStage || mongoose.model('LifecycleStage', lifecycleStageSchema);
