import LifecycleStage from '../models/LifecycleStage.js';
import store from '../storage/mockStore.js';
import { isMongoConnected } from '../config/db.js';
import { getIO } from '../sockets/socketHandler.js';

const DEFAULT_STAGES = [
  { key: 'TO DO', label: 'To Do', color: '#94a3b8', order: 1, isSystem: true },
  { key: 'IN PROGRESS', label: 'In Progress', color: '#38bdf8', order: 2, isSystem: true },
  { key: 'REVIEW', label: 'Review', color: '#fbbf24', order: 3, isSystem: true },
  { key: 'COMPLETED', label: 'Completed / Won', color: '#10b981', order: 4, isSystem: true },
];

async function ensureDefaults() {
  for (const def of DEFAULT_STAGES) {
    const exists = await LifecycleStage.findOne({ key: def.key });
    if (!exists) {
      await LifecycleStage.create({ ...def, isSystem: true });
    }
  }
}

export const getLifecycleStages = async (req, res) => {
  try {
    let stages;
    if (isMongoConnected) {
      await ensureDefaults();
      stages = await LifecycleStage.find().sort({ order: 1, createdAt: 1 });
    } else {
      stages = store.getLifecycleStages();
    }
    res.json({ success: true, stages: stages || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createLifecycleStage = async (req, res) => {
  try {
    const { label, color, description } = req.body;
    if (!label || !label.trim()) {
      return res.status(400).json({ success: false, message: 'Stage label is required' });
    }
    const key = label.trim().toUpperCase().replace(/[^A-Z0-9]/g, ' ').trim();
    const stageData = {
      label: label.trim(),
      key,
      color: color || '#94a3b8',
      description: description || '',
      isSystem: false,
      createdBy: req.user?._id,
    };
    let stage;
    if (isMongoConnected) {
      const count = await LifecycleStage.countDocuments();
      stage = await LifecycleStage.create({ ...stageData, order: count + 1 });
    } else {
      stage = store.createLifecycleStage(stageData);
    }
    const io = getIO();
    if (io) io.emit('lifecycle:updated');
    res.status(201).json({ success: true, stage });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteLifecycleStage = async (req, res) => {
  try {
    const { id } = req.params;
    if (isMongoConnected) {
      const stage = await LifecycleStage.findById(id);
      if (!stage) return res.status(404).json({ success: false, message: 'Stage not found' });
      if (stage.isSystem) return res.status(400).json({ success: false, message: 'System stages cannot be deleted' });
      await LifecycleStage.findByIdAndDelete(id);
    } else {
      const deleted = store.deleteLifecycleStage(id);
      if (!deleted) return res.status(404).json({ success: false, message: 'Stage not found' });
    }
    const io = getIO();
    if (io) io.emit('lifecycle:updated');
    res.json({ success: true, message: 'Stage deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
