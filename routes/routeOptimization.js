const express = require('express');
const axios = require('axios');
const { Driver} = require('../models/Driver'); // Assuming you have models for Driver and Parcel
const {Parcel}  = require('../models/Parcel');
const { sendNotification } = require('../config/sendNotification'); // Utility for sending notifications

const router = express.Router();
const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;

router.post('/assignRoute', async (req, res) => {
    try {
        const { driverId, parcels } = req.body;
        const driver = await Driver.findById(driverId);

        if (!driver) {
            return res.status(404).json({ success: false, message: "Driver not found" });
        }

        const locations = [driver.location, ...parcels.map(p => p.pickupLocation), ...parcels.map(p => p.dropoffLocation)];

        // Call Google Directions API to get optimized route
        const waypoints = locations.slice(1, -1).join('|');
        const origin = locations[0];
        const destination = locations[locations.length - 1];

        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&waypoints=optimize:true|${waypoints}&key=${googleApiKey}`;
        const response = await axios.get(url);

        const optimizedRoute = response.data.routes[0];
        const routeDetails = optimizedRoute.legs.map(leg => ({
            startLocation: leg.start_address,
            endLocation: leg.end_address,
            duration: leg.duration.text,
            distance: leg.distance.text,
        }));

        // Save route details in DB and assign to the driver
        driver.route = optimizedRoute;
        await driver.save();

        res.status(200).json({
            success: true,
            route: routeDetails,
            totalDistance: optimizedRoute.legs.reduce((acc, leg) => acc + leg.distance.value, 0),
            totalDuration: optimizedRoute.legs.reduce((acc, leg) => acc + leg.duration.value, 0),
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Track driver's location and notify if off-route
router.post('/trackDriver', async (req, res) => {
    const { driverId, currentLocation } = req.body;
    const driver = await Driver.findById(driverId);

    if (!driver) {
        return res.status(404).json({ success: false, message: "Driver not found" });
    }

    // Check if driver is off-route by comparing current location with the route path
    const route = driver.route;
    const currentDistance = getDistanceFromLatLonInKm(currentLocation, route.legs[0].end_location);

    if (currentDistance > 5) { // Arbitrary threshold (5km) for off-route
        sendNotification('Admin', `Driver ${driver.name} is off-route.`);
    }

    res.status(200).json({ success: true, message: "Driver location checked" });
});

// Check if truck is late at a checkpoint
router.post('/checkLateTruck', async (req, res) => {
    const { driverId, checkpointLocation } = req.body;
    const driver = await Driver.findById(driverId);

    if (!driver) {
        return res.status(404).json({ success: false, message: "Driver not found" });
    }

    const checkpointDistance = getDistanceFromLatLonInKm(driver.location, checkpointLocation);
    const currentTime = new Date();

    // Assuming parcels have estimated times for delivery
    const parcel = await Parcel.findOne({ driverId });
    if (parcel && parcel.estimatedDeliveryTime < currentTime) {
        sendNotification('Admin', `Truck is late at checkpoint near ${checkpointLocation}.`);
        parcel.dropOffTime = currentTime; // Update drop-off time if late
        await parcel.save();
    }

    res.status(200).json({ success: true, message: "Truck check completed" });
});

// Helper function to calculate distance between two coordinates
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    return distance;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

module.exports = router;
