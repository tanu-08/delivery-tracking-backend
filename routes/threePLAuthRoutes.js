const express = require('express');
const router = express.Router();
const { signup, verifyOTP } = require('../controllers/threePLAuthController');
const multer = require('multer');

// File upload configuration using multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads'); // Upload directory
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage: storage });

router.post('/signup', upload.single('verificationFile'), signup);
router.post('/verify-otp', verifyOTP);

module.exports = router;
