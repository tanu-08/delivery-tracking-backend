const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const DriverSignUp = require('../models/DriverSignUp');
const router = express.Router();
const DriverTruckCapacity = require('../models/DriverTruckCapacity');

// Signup API for Driver
router.post('/signup', async (req, res) => {
    try {
        const { name, email, password, phone, licenseNumber } = req.body;

        // Validate required fields
        if (!name || !email || !password || !phone || !licenseNumber) {
            return res.status(400).json({ message: 'All fields are required.' });
        }

        // Check if email already exists
        const existingDriver = await DriverSignUp.findOne({ phone });
        if (existingDriver) {
            return res.status(400).json({ message: 'Phone is already registered.' });
        }

        // Create a new driver
        const driver = new DriverSignUp({
            name,
            email,
            password,
            phone,
            licenseNumber,
        });

        await driver.save();
        const truckCapacity = new DriverTruckCapacity({
            driverId: driver._id, // Use the _id of the newly created driver
            totalCapacity: 1000, // Use the vehicleCapacity from the driver data
            currentLoad: 0, // Default current load to 0
          });
      
          // Save the truck capacity for the driver
          await truckCapacity.save();

        // Generate JWT token
        const token = jwt.sign({ id: driver._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.status(201).json({ success: 'true',message: 'Signup successful', body:{token,driver }});
    } catch (error) {
        console.error('Error in signup:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


const JWT_SECRET = process.env.JWT_SECRET;

// Driver Login API
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Find driver by email
        const driver = await DriverSignUp.findOne({ email });
        if (!driver) {
            return res.status(400).json({ error: "Invalid email or password" });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, driver.password);
        if (!isMatch) {
            return res.status(400).json({ error: "Invalid email or password" });
        }

        // Generate JWT Token
        const token = jwt.sign({ id: driver._id }, JWT_SECRET, { expiresIn: '1h' });

        // Respond with token and driver details
        res.json({
            message: "Login successful",
            token,
            driver: {
                id: driver._id,
                name: driver.name,
                email: driver.email,
                phone: driver.phone,
                address: driver.address
            }
        });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});



module.exports = router;