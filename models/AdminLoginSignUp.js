const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
    stationName: { type: String, required: true },
    stationCode: { type: String, required: true, unique: true },
    address: { type: String, required: true },
    pinCode: { type: String, required: true },
    adminName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true, unique: true },
    agreementConfirmation: { type: Boolean, required: true },
    isVerified: { type: Boolean, default: false }, // Will be updated post OTP verification
    otp: { type: String }, // Temporarily store OTP
    otpExpiry: { type: Date }, // Expiration time for OTP
});

module.exports = mongoose.model('AdminLoginSignUp', adminSchema);
