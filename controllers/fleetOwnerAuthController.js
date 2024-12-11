const FleetOwner = require('../models/FleetOwnerAuth');
const otpGenerator = require('otp-generator');
const twilio = require('twilio');

// Twilio Configuration
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
const client = twilio(accountSid, authToken);

/**
 * Fleet Owner Signup
 */
exports.signup = async (req, res) => {
  const { name, companyName, companyId, email, phone, fleetSize, fleetBaseLoc, password } = req.body;
  const filePath = req.file ? req.file.path : null;

  try {
    // Generate OTP
    const otp = otpGenerator.generate(6, { digits: true, alphabets: false, upperCase: false, specialChars: false });

    // Save Fleet Owner
    const fleetOwner = new FleetOwner({ name, companyName, companyId, email, phone, fleetSize, fleetBaseLoc, password, filePath, otp });
    await fleetOwner.save();

    // Send OTP via SMS
    await client.messages.create({
      body: `Your OTP for Fleet Owner Signup is ${otp}`,
      from: twilioPhoneNumber,
      to: `+${phone}`, // Ensure phone number is in E.164 format
    });

    res.status(200).json({ message: 'Signup successful! OTP sent for verification.' });
  } catch (error) {
    console.error('Signup Error:', error);
    res.status(500).json({ message: 'Error during signup', error: error.message });
  }
};

/**
 * Verify OTP
 */
exports.verifyOtp = async (req, res) => {
  const { phone, otp } = req.body;

  try {
    const fleetOwner = await FleetOwner.findOne({ phone });

    if (!fleetOwner) {
      return res.status(404).json({ message: 'Fleet Owner not found' });
    }

    if (fleetOwner.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // Mark as verified
    fleetOwner.isVerified = true;
    fleetOwner.otp = null; // Clear OTP after verification
    await fleetOwner.save();

    res.status(200).json({ message: 'OTP verified successfully' });
  } catch (error) {
    console.error('OTP Verification Error:', error);
    res.status(500).json({ message: 'Error during OTP verification', error: error.message });
  }
};
