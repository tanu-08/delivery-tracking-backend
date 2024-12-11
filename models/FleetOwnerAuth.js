const mongoose = require('mongoose');

const FleetOwnerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  companyName: { type: String, required: true },
  companyId: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true, unique: true },
  fleetSize: { type: Number, required: true },
  fleetBaseLoc: { type: String, required: true },
  password: { type: String, required: true },
  filePath: { type: String }, // Path to the uploaded file
  otp: { type: String }, // Store OTP for verification
  isVerified: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('FleetOwner', FleetOwnerSchema);
