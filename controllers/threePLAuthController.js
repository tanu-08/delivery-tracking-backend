const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const otpGenerator = require('otp-generator');
const twilio = require('twilio');
const ThreePL = require('../models/ThreePLAuth');

const JWT_SECRET = process.env.JWT_SECRET;
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

// Store OTPs temporarily
const otpCache = new Map();

// Sign Up Logic
exports.signup = async (req, res) => {
  const { name, email, phone, companyName, createPassword, confirmPassword, companyId, headOfficeAddress, pincode, gstNumber } = req.body;
  const verificationFile = req.body.verificationFile;

  if (createPassword !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match' });
  }

  try {
    const hashedPassword = await bcrypt.hash(createPassword, 10);

    const newUser = new ThreePL({
      name,
      email,
      phone,
      companyName,
      password: hashedPassword,
      companyId,
      headOfficeAddress,
      pincode,
      gstNumber,
      verificationFile,
    });

    await newUser.save();

    // Generate OTP
    const otp = otpGenerator.generate(6, { digits: true, alphabets: false, upperCase: false });
    otpCache.set(phone, otp);

    // Send OTP using Twilio
    await client.messages.create({
      body: `Your OTP for verification is ${otp}.`,
      from: twilioPhoneNumber,
      to: phone,
    });

    res.status(201).json({ message: 'Signup successful. OTP sent to your phone.' });
  } catch (error) {
    res.status(500).json({ message: 'Error during signup', error: error.message });
  }
};

// Verify OTP Logic
exports.verifyOTP = async (req, res) => {
  const { phone, otp } = req.body;

  if (!otpCache.has(phone) || otpCache.get(phone) !== otp) {
    return res.status(400).json({ message: 'Invalid or expired OTP' });
  }

  try {
    // Mark user as verified
    await ThreePL.findOneAndUpdate({ phone }, { isVerified: true });
    otpCache.delete(phone);

    const token = jwt.sign({ phone }, JWT_SECRET, { expiresIn: '1h' });
    res.status(200).json({ message: 'OTP verified successfully', token });
  } catch (error) {
    res.status(500).json({ message: 'Error during OTP verification', error: error.message });
  }
};
