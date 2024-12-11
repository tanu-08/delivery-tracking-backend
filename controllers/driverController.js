const Driver = require('../models/Driver'); // Driver model
const { generateLink } = require('../utils/generateLink'); // Utility function for link generation

async function addDriver(req, res) {
    try {
        const { name, email, phone, licenseNumber, baseLocation, addedBy, addedById } = req.body;

        // Check if driver already exists
        const existingDriver = await Driver.findOne({ email });
        if (existingDriver) {
            return res.status(400).json({ message: 'Driver with this email already exists.' });
        }

        // Save driver to the database
        const newDriver = new Driver({
            name,
            email,
            phone,
            licenseNumber,
            baseLocation,
            addedBy,
            addedById,
        });

        await newDriver.save();

        // Generate a unique signup link for the driver
        const signupLink = generateLink(email);

        res.status(201).json({
            message: 'Driver added successfully!',
            signupLink, // Send link to the fleet owner or DOP to share with the driver
        });
    } catch (error) {
        res.status(500).json({ message: 'Error adding driver', error: error.message });
    }
}

module.exports = { addDriver };
