const express = require('express');
const axios = require('axios');
const Driver = require('../models/Driver'); // Assuming you have models for Driver and Parcel
const Parcel  = require('../models/Parcel');
const { sendNotification } = require('../config/sendNotification'); // Utility for sending notifications

const router = express.Router();
const googleApiKey = "AIzaSyDA6s3MJhCn_IwerOJgGOmWcruauxAxcxU";

router.post('/assignRoute', async (req, res) => {
    try {
        const { driverId, parcels } = req.body;
        console.log(driverId);

        // Fetch driver details
        const driver = await Driver.findOne({ phone: driverId });
        if (!driver) {
            return res.status(404).json({ success: false, message: "Driver not found" });
        }

        // Function to get latitude and longitude from address
        async function getLatLngFromAddress(address) {
            const geocodeUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&addressdetails=1`;
            const response = await axios.get(geocodeUrl);

            if (response.data.length > 0) {
                const location = response.data[0];
                return {
                    latitude: parseFloat(location.lat),
                    longitude: parseFloat(location.lon),
                };
            } else {
                throw new Error(`Geocoding failed for address: ${address}`);
            }
        }

        // Convert driver location (baseLocation) to lat/lng
        const driverLocation = await getLatLngFromAddress(driver.baseLocation);

        // Convert pickup and dropoff locations to lat/lng
        const locations = [
            driverLocation, // Start with the driver's location
            ...await Promise.all(parcels.map(async (p) => {
                const pickupLocation = await getLatLngFromAddress(p.pickupLocation);
                const dropoffLocation = await getLatLngFromAddress(p.dropoffLocation);
                return [pickupLocation, dropoffLocation];
            })).then((locations) => locations.flat()) // Flatten the array of locations
        ];

        console.log('Locations:', locations);

        // Construct the waypoints for the OSRM API
        const coordinates = locations.map(loc => `${loc.longitude},${loc.latitude}`).join(';');
        const osrmUrl = `http://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`;

        console.log('Final OSRM API URL:', osrmUrl);

        // Call the OSRM API to calculate the best route
        const response = await axios.get(osrmUrl);

        if (!response.data.routes || !response.data.routes.length) {
            throw new Error('Failed to get a valid route from OSRM API.');
        }

        // Process the route response
        const optimizedRoute = response.data.routes[0];
        const waypoints = optimizedRoute.legs.map((leg, index) => ({
            startLocation: locations[index],
            endLocation: locations[index + 1],
            duration: leg.duration,
            distance: leg.distance,
        }));

        res.status(200).json({
            success: true,
            route: waypoints,
            totalDistance: optimizedRoute.distance, // Total distance in meters
            totalDuration: optimizedRoute.duration, // Total duration in seconds
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
