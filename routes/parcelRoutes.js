const express = require('express');
const Parcel = require('../models/ParcelInfo');
const router = express.Router();

// Add Parcel API
router.post('/addParcel', async (req, res) => {
    try {
        const {
            parcelId,
            weight,
            description,
            senderDetails,
            receiverDetails,
            pickupLocation,
            dropOffLocation,
            status
        } = req.body;

        // Check if a parcel with the given ID already exists
        const existingParcel = await Parcel.findOne({ parcelId });
        if (existingParcel) {
            return res.status(400).json({ status: 'error', message: 'Parcel with the given ID already exists.' });
        }

        // Create a new parcel document
        const parcel = new Parcel({
            parcelId,
            weight,
            description,
            senderDetails,
            receiverDetails,
            pickupLocation,
            dropOffLocation,
            status
        });

        // Save the parcel in the database
        await parcel.save();

        res.status(201).json({
            status: 'success',
            message: 'Parcel added successfully.',
            parcel
        });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
});

module.exports = router;


// Get All Parcels
router.get('/getAllParcels', async (req, res) => {
  try {
    const parcels = await Parcel.find();
    res.json(parcels);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
