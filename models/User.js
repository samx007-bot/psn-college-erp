const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const mongoosePaginate = require('mongoose-paginate-v2');

const userSchema = new mongoose.Schema({
  // Basic Information
  userId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['student', 'faculty', 'admin'],
    required: true
  },
  
  // Contact Information
  phone: {
    type: String,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: { type: String, default: 'India' }
  },
  
  // Academic Information (for students)
  studentInfo: {
    rollNumber: {
      type: String,
      sparse: true,
      unique: true
    },
    admissionYear: Number,
    batch: String,
    section: String,
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department'
    },
    semester: {
      type: Number,
      min: 1,
      max: 8
    },
    academicYear: String,
    parentContact: {
      fatherName: String,
      motherName: String,
      guardianPhone: String,
      emergencyContact: String
    }
  },
  
  // Faculty Information
  facultyInfo: {
    employeeId: {
      type: String,
      sparse: true,
      unique: true
    },
    designation: String,
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department'
    },
    qualification: String,
    experience: Number,
    joiningDate: Date,
    specialization: [String],
    subjectsTeaching: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject'
    }]
  },
  
  // Profile
  profileImage: {
    type: String,
    default: null
  },
  dateOfBirth: Date,
  gender: {
    type: String,
    enum: ['male', 'female', 'other']
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  lastLogin: Date,
  
  // System fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Add pagination plugin
userSchema.plugin(mongoosePaginate);

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ userId: 1 });
userSchema.index({ role: 1 });
userSchema.index({ 'studentInfo.rollNumber': 1 }, { sparse: true });
userSchema.index({ 'facultyInfo.employeeId': 1 }, { sparse: true });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to generate user ID
userSchema.statics.generateUserId = async function(role, department) {
  const currentYear = new Date().getFullYear().toString().slice(-2);
  let prefix;
  
  switch (role) {
    case 'student':
      prefix = `PSN${currentYear}ST`;
      break;
    case 'faculty':
      prefix = `PSN${currentYear}FC`;
      break;
    case 'admin':
      prefix = `PSN${currentYear}AD`;
      break;
    default:
      prefix = `PSN${currentYear}`;
  }
  
  // Find the last user with similar prefix
  const lastUser = await this.findOne(
    { userId: new RegExp(`^${prefix}`) },
    {},
    { sort: { userId: -1 } }
  );
  
  let sequence = 1;
  if (lastUser) {
    const lastSequence = parseInt(lastUser.userId.slice(-4));
    sequence = lastSequence + 1;
  }
  
  return `${prefix}${sequence.toString().padStart(4, '0')}`;
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

module.exports = mongoose.model('User', userSchema);