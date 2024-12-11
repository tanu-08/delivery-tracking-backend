const express = require('express');
const Admin = require('../models/Admin');
const router = express.Router();
const AdminLoginSignup = require('../models/AdminLoginSignUp');
const otpGenerator = require('otp-generator');
const twilio = require('twilio'); 
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET ;

const accountSid = process.env.TWILIO_ACCOUNT_SID; // Your Account SID from Twilio
const authToken = process.env.TWILIO_AUTH_TOKEN;   // Your Auth Token from Twilio
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER; 

const client = twilio(accountSid, authToken);


// Admin Signup
router.post('/signup', async (req, res) => {
    try {
        const { stationName, stationCode, address, pinCode, adminName, email, phone, agreementConfirmation } = req.body;

        if (!agreementConfirmation) {
            return res.status(400).json({ message: 'Agreement must be confirmed to sign up.' });
        }

        // Check for existing admin
        const existingAdmin = await AdminLoginSignup.findOne({ $or: [{ email }, { phone }] });
        if (existingAdmin) {
            return res.status(400).json({ message: 'Admin with this email or phone number already exists.' });
        }

        // Generate OTP
        const otp = otpGenerator.generate(6, { digits: true });
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10-minute expiry

        const newAdmin = new AdminLoginSignup({
            stationName,
            stationCode,
            address,
            pinCode,
            adminName,
            email,
            phone,
            agreementConfirmation,
            otp,
            otpExpiry,
        });

        await newAdmin.save();

        // Send OTP using Twilio
        const message = await client.messages.create({
            body: `Your OTP for admin registration is: ${otp}`,
            from: twilioPhoneNumber,
            to: `+91${phone}`
        });

        console.log(`OTP sent to ${phone}: ${message.sid}`);
        res.status(201).json({ message: 'Admin registered successfully. OTP sent to your phone.' });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});



router.post('/verify-otp', async (req, res) => {
    try {
        const { phone, otp } = req.body;

        // Find the admin by phone
        const admin = await AdminLoginSignup.findOne({ phone });
        if (!admin) {
            return res.status(400).json({ message: 'Admin not found with the provided phone number.' });
        }
        console.log(admin)

        // Validate OTP
        if (admin.otp !== otp || admin.otpExpiry < Date.now()) {
            console.log(admin.otp +otp)
            return res.status(400).json({ message: 'Invalid or expired OTP.' });
        }

        // Mark as verified and clear OTP details
        admin.isVerified = true;
        admin.otp = null;
        admin.otpExpiry = null;
        await admin.save();

        // Generate JWT Token
        const token = jwt.sign({ id: admin._id, phone: admin.phone }, JWT_SECRET, { expiresIn: '1h' });
        const adminInfo = new Admin();
        adminInfo.name = admin.adminName;
        adminInfo.email = admin.email;
        adminInfo.phone = admin.phone;
        adminInfo.drivers= [];
        await adminInfo.save();

        res.status(200).json({
            message: 'OTP verified successfully.',
            token,
            admin: admin,
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { identifier } = req.body; // Identifier can be email or phone

        // Find admin by email or phone
        const admin = await AdminLoginSignup.findOne({
            $or: [{ email: identifier }, { phone: identifier }]
        });

        if (!admin) {
            return res.status(400).json({ message: 'Admin not found with the provided identifier.' });
        }

        if (!admin.isVerified) {
            return res.status(400).json({ message: 'Admin account is not verified. Please complete OTP verification.' });
        }

        // Generate JWT Token
        const token = jwt.sign({ id: admin._id, phone: admin.phone }, JWT_SECRET, { expiresIn: '1h' });

        res.status(200).json({
            message: 'Admin logged in successfully.',
            token,
            admin: admin,
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


module.exports = router;
