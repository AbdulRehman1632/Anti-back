import CustomField from '../models/CustomField.js';
import store from '../storage/mockStore.js';
import { isMongoConnected } from '../config/db.js';
import { getIO } from '../sockets/socketHandler.js';

export const getCustomFields = async (req, res) => {
  try {
    let fields;
    if (isMongoConnected) {
      fields = await CustomField.find().sort({ order: 1, createdAt: 1 });
    } else {
      fields = store.getCustomFields();
    }
    res.json({ success: true, customFields: fields || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createCustomField = async (req, res) => {
  try {
    const { label, type, description, required, showInTable, showInCharts } = req.body;

    if (!label || !label.trim()) {
      return res.status(400).json({ success: false, message: 'Column / Field label is required' });
    }

    const validTypes = ['text', 'textarea', 'number', 'boolean'];
    const resolvedType = (type || 'text').toLowerCase();
    if (!validTypes.includes(resolvedType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid field type "${type}". Allowed types: Text, Textarea, Number, Boolean`,
      });
    }

    const sanitizedKey =
      req.body.key && req.body.key.trim()
        ? req.body.key.trim().replace(/[^a-zA-Z0-9_]/g, '_')
        : label.trim().toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Math.random().toString(36).substring(2, 6);

    const fieldData = {
      label: label.trim(),
      key: sanitizedKey,
      type: resolvedType,
      description: description || '',
      required: Boolean(required),
      showInTable: showInTable !== false,
      showInCharts: showInCharts !== false,
      createdBy: req.user?._id,
    };

    let createdField;
    if (isMongoConnected) {
      createdField = await CustomField.create(fieldData);
    } else {
      createdField = store.createCustomField(fieldData);
    }

    const io = getIO();
    if (io) {
      io.emit('customFields:updated');
    }

    res.status(201).json({ success: true, customField: createdField });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateCustomField = async (req, res) => {
  try {
    const { id } = req.params;
    const { label, type, description, required, showInTable, showInCharts } = req.body;

    const updateData = {};
    if (label && label.trim()) updateData.label = label.trim();
    if (type) {
      const validTypes = ['text', 'textarea', 'number', 'boolean'];
      const resolvedType = type.toLowerCase();
      if (!validTypes.includes(resolvedType)) {
        return res.status(400).json({
          success: false,
          message: `Invalid field type "${type}". Allowed types: Text, Textarea, Number, Boolean`,
        });
      }
      updateData.type = resolvedType;
    }
    if (description !== undefined) updateData.description = description.trim();
    if (required !== undefined) updateData.required = Boolean(required);
    if (showInTable !== undefined) updateData.showInTable = Boolean(showInTable);
    if (showInCharts !== undefined) updateData.showInCharts = Boolean(showInCharts);

    let updatedField;
    if (isMongoConnected) {
      updatedField = await CustomField.findByIdAndUpdate(id, updateData, { new: true });
    } else {
      updatedField = store.updateCustomField(id, updateData);
    }

    if (!updatedField) {
      return res.status(404).json({ success: false, message: 'Custom field not found' });
    }

    const io = getIO();
    if (io) {
      io.emit('customFields:updated');
    }

    res.json({ success: true, customField: updatedField });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteCustomField = async (req, res) => {
  try {
    const { id } = req.params;

    if (isMongoConnected) {
      const field = await CustomField.findById(id);
      if (!field) {
        return res.status(404).json({ success: false, message: 'Custom field not found' });
      }
      await CustomField.findByIdAndDelete(id);
    } else {
      const deleted = store.deleteCustomField(id);
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Custom field not found' });
      }
    }

    const io = getIO();
    if (io) {
      io.emit('customFields:updated');
    }

    res.json({ success: true, message: 'Custom field deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

