import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ['Owner', 'Admin', 'Editor', 'Viewer'],
      default: 'Editor',
    },
    status: {
      type: String,
      enum: ['online', 'away', 'offline'],
      default: 'online',
    },
    statusMessage: {
      type: String,
      default: 'Available for sync',
    },
    avatar: {
      type: String,
      default: '',
    },
    department: {
      type: String,
      default: 'Operations',
    },
    title: {
      type: String,
      default: 'Team Member',
    },
    organizationName: {
      type: String,
      default: 'Devdrip CRM',
    },
  },
  {
    timestamps: true,
  }
);

// Encrypt password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare entered password with hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;
