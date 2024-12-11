const mongoose = require('mongoose');

const ThreePLSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true, unique: true },
  companyName: { type: String, required: true },
  password: { type: String, required: true },
  companyId: { type: String, required: true },
  headOfficeAddress: { type: String, required: true },
  pincode: { type: String, required: true },
  gstNumber: { type: String, required: true },
  verificationFile: { type: String, required: true }, // Path to uploaded file
  isVerified: { type: Boolean, default: false },
});

module.exports = mongoose.model('ThreePL', ThreePLSchema);
