const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const driverSignUpSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String, required: true },
    licenseNumber: { type: String, required: true },
}, { timestamps: true });

// Encrypt password before saving
driverSignUpSchema.pre('save', async function (next) {
    if (this.isModified('password')) {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    }
    next();
});

module.exports = mongoose.model('DriverSignUp', driverSignUpSchema);
