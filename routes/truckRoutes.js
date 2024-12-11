const express = require('express');
const Truck = require('../models/Truck');
const router = express.Router();

// Register a new truck
router.post('/register', async (req, res) => {
    try {
        const truck = new Truck(req.body);
        const savedTruck = await truck.save();
        res.status(201).json({ success: true, data: savedTruck });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// Get all trucks by owner
router.get('/:owner', async (req, res) => {
    try {
        const { owner } = req.params;
        const trucks = await Truck.find({ owner });
        res.status(200).json({ success: true, data: trucks });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
