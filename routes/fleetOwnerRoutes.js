const express = require('express');
const router = express.Router();
const fleetOwnerController = require('../controllers/fleetOwnerAuthController');
const multer = require('multer');

// Multer configuration for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

// Fleet Owner Signup
router.post('/signup', upload.single('file'), fleetOwnerController.signup);

// Verify OTP
router.post('/verify-otp', fleetOwnerController.verifyOtp);

router.post("/respond", async (req, res) => {
  const { notificationId, status } = req.body;

  try {
      const notification = await FleetNotification.findById(notificationId);

      if (!notification) {
          return res.status(404).json({ message: "Notification not found." });
      }

      notification.status = status;
      await notification.save();

      // Notify admin about the response
      const message = status === "Accepted" 
          ? "Fleet owner accepted the request." 
          : "Fleet owner rejected the request.";
      sendNotification(notification.adminId, "Response from Fleet Owner", message);

      res.status(200).json({ message: `Fleet owner has ${status.toLowerCase()} the request.` });
  } catch (err) {
      res.status(500).json({ message: "Error responding to the notification.", error: err.message });
  }
});


module.exports = router;
