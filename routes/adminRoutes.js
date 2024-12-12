const express = require('express');
const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const QRCode = require('qrcode');
const router = express.Router();
const Parcel = require('../models/Parcel');
const Driver = require('../models/Driver');
const AdminData = require('../models/AdminLoginSignUp');
const DriverData = require('../models/DriverSignUp');
const Route = require('../models/Route');
const DriverTruckCapacity = require('../models/DriverTruckCapacity');
const Truck = require('../models/Truck');

const { calculateOptimizedRoute } = require('../config/routesUtil');
const FleetNotification = require("../models/FleetNotification");
const { sendNotification } = require("../config/notificationService");


router.post('/checkin', async (req, res) => {
    try {
        const { qrData, adminPhone } = req.body;

        if (!adminPhone) {
            return res.status(400).json({ message: 'Admin phone number is required.' });
        }

        // Find the admin by phone number
        const admin = await Admin.findOne({ phone: adminPhone });
        if (!admin) {
            return res.status(404).json({ message: 'Admin data not found.' });
        }

        // Generate QR code
        const qrCode = await QRCode.toDataURL(qrData);

        // Decode QR data
        const parcelData = JSON.parse(qrData);
        const { parcelInfo, driverId } = parcelData;

        // Check if the parcel exists
        const parcel = await Parcel.findById(parcelData.id);
        if (parcel) {
            return res.status(404).json({ message: 'Parcel already checked in.' });
        }

        // if (parcel.checkInTime) {
        //     return res.status(400).json({ message: 'Parcel already checked in.' });
        // }

        // Fetch the driver information
        const driver = await Driver.findById(driverId);
        if (!driver) {
            return res.status(404).json({ message: 'Driver not found.' });
        }

        if (!driver.truckInfo?.truckId) {
            return res.status(400).json({ message: 'Driver is not assigned a truck.' });
        }

        // Fetch the truck
        const truck = await Truck.findById(driver.truckInfo.truckId);
        if (!truck) {
            return res.status(404).json({ message: 'Truck not found.' });
        }

        // Calculate load and check capacity
        const load = parseFloat(parcelInfo.length) * parseFloat(parcelInfo.breadth) * parseFloat(parcelInfo.height);
        const remainingCapacity = truck.availableCapacity - load;
        if (remainingCapacity < 0) {
            return res.status(400).json({ message: 'Parcel weight exceeds truck capacity.' });
        }

        // Update truck's current load and availability
        truck.availableCapacity -= load;
        truck.availability = truck.availableCapacity > 0;

        // Mark driver as assigned
        truck.isAssigned == true;
        driver.isAssigned = true;

        // Save updates for driver and truck
        console.log(driver);
        console.log(truck);
        await driver.save();
        await truck.save();

        // Update admin's driver and parcel information
        let driverEntry;
        if (!Array.isArray(admin.drivers)) {
            admin.drivers = [];
        }
        if (driverId) {
            driverEntry = admin.drivers.find((d) => d.driverId?.toString() === driverId);
        }
        if (driverEntry) {
            driverEntry.parcels.push({
                parcelId: parcelInfo.id,
                parcelDetails: parcelInfo,
            });
        } else {
            admin.drivers.push({
                driver,
                driverName: driver.name,
                driverPhone: driver.phone,
                parcels: [
                    {
                        parcelId: parcelInfo.id,
                        parcelDetails: parcelInfo,
                    },
                ],
            });
        }

        // Save updated admin data
        await admin.save();

        // Update parcel details
        const newParcel = new Parcel({ ...parcelInfo, driverId });
        newParcel.status = 'In_Transit';
        newParcel.checkInTime = new Date();
        newParcel.qrCode = qrCode;
        await newParcel.save();

        res.status(200).json({
            message: 'Parcel checked in successfully. Truck capacity updated.',
            parcel: newParcel,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});



// Schedule Delivery

router.post('/schedule/delivery', async (req, res) => {
    try {
        const { driverId, parcelInfo } = req.body;

        if (!driverId) {
            return res.status(400).json({ message: 'Driver ID is required.' });
        }
        if (!parcelInfo || !parcelInfo.weight) {
            return res.status(400).json({ message: 'Parcel information and weight are required.' });
        }

        // Fetch the driver
        const driver = await Driver.findById(driverId);
        if (!driver) {
            return res.status(404).json({ message: 'Driver not found.' });
        }

        // Validate truck capacity
        const truck = await Truck.findById(driver.truckInfo?.truckId);
        if (!truck) {
            return res.status(404).json({ message: 'Truck not found for the selected driver.' });
        }

        const load = parseFloat(parcelInfo.length) * parseFloat(parcelInfo.breadth) * parseFloat(parcelInfo.height);
        const remainingCapacity = truck.capacity - (truck.currentLoad || 0);
        if (load > remainingCapacity) {
            return res.status(400).json({ message: 'Parcel exceeds truck capacity.' });
        }
        // Add parcel to the database
        const parcel = new Parcel({ ...parcelInfo, driverId });

        // Generate QR code
        const qrData = JSON.stringify({
            id: parcel._id,
            driverId: driverId,
            parcelInfo: parcel,
        });
        const qrCode = await QRCode.toDataURL(qrData);
        parcel.qrCode = qrCode;

        res.status(201).json({
            message: 'Parcel scheduled successfully.',
            parcel,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'An error occurred while scheduling delivery.', error: error.message });
    }
});



router.post('/checkout', async (req, res) => {
    try {
        const { qrData } = req.body;

        // Decode QR data
        const parcelData = JSON.parse(qrData);
        const parcel = await Parcel.findById(parcelData.id);

        if (!parcel) {
            return res.status(404).json({ message: 'Parcel not found.' });
        }

        if (parcel.checkOutTime) {
            return res.status(400).json({ message: 'Parcel already checked out.' });
        }

        // Fetch the driver information
        const driver = await Driver.findById(parcel.driverId);
        if (!driver) {
            return res.status(404).json({ message: 'Driver not found.' });
        }

        if (!driver.truckInfo.truckId) {
            return res.status(400).json({ message: 'Driver is not assigned a truck.' });
        }

        // Fetch the truck
        const truck = await Truck.findById(driver.truckInfo.truckId);
        if (!truck) {
            return res.status(404).json({ message: 'Truck not found.' });
        }

        // Update parcel status and check-out time
        parcel.status = 'Delivered';
        parcel.checkOutTime = new Date();
        await parcel.save();

        // Update truck data
        truck.availableCapacity += parcel.weight;
        truck.updatedAt = new Date();
        await truck.save();

        res.status(200).json({ message: 'Parcel checked out successfully. Truck capacity updated.', parcel });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// Notify Fleet Owner
router.post("/notify", async (req, res) => {
    const { fleetOwnerId, parcelId, adminId } = req.body;

    try {
        const notification = new FleetNotification({ fleetOwnerId, parcelId, adminId });
        await notification.save();

        // Send notification (mocked here)
        sendNotification(fleetOwnerId, "New Delivery Request", "You have a new delivery request.");

        res.status(200).json({ message: "Notification sent to fleet owner." });
    } catch (err) {
        res.status(500).json({ message: "Error notifying fleet owner.", error: err.message });
    }
});

router.post("/sendParcelDetails", async (req, res) => {
    const { fleetOwnerId, parcelId } = req.body;

    try {
        const parcel = await Parcel.findById(parcelId);

        if (!parcel) {
            return res.status(404).json({ message: "Parcel not found." });
        }

        const link = `${process.env.APP_URL}/driver/register?parcelId=${parcelId}`;

        // Send notification to fleet owner
        sendNotification(fleetOwnerId, "Parcel Details", {
            link,
            pickup: parcel.pickupLocation,
            drop: parcel.dropLocation,
            dateTime: parcel.dateTime,
        });

        res.status(200).json({ message: "Parcel details sent to fleet owner.", link });
    } catch (err) {
        res.status(500).json({ message: "Error sending parcel details.", error: err.message });
    }
});

router.post('/receiving-deliveries', async (req, res) => {
    try {
        // Fetch the admin's address using adminPhone (from request body)
        const { adminPhone } = req.body;
        const admin = await AdminData.findOne({ phone: adminPhone });
        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }
        console.log("ReceiveParcels:",admin);
        // Find all parcels whose drop-off location matches the admin's address
        const receivingDeliveries = await Parcel.find({
            dropOffLocation: admin.address, // Match drop-off location with admin's address
            status: { $in: ['In_Transit', 'Delivered'] }, // Filter for parcels that are in transit or delivered
        }).populate('driverId');
        console.log("ReceiveParcels:",receivingDeliveries);


        if (receivingDeliveries.length === 0) {
            return res.status(404).json({ message: 'No receiving deliveries found' });
        }

        // Generate QR codes for each parcel
        const deliveriesWithQrCode = [];

        for (let parcel of receivingDeliveries) {
            const driverId = parcel.driverId._id; // Assuming driverId is populated

            // Create the QR data with parcel info and driverId
            const qrData = JSON.stringify({
                id: parcel._id,
                driverId: driverId,
                parcelInfo: parcel,  // Include the entire parcel object
            });

            // Generate QR code as a data URL
            const qrCode = await QRCode.toDataURL(qrData);

            deliveriesWithQrCode.push({
                parcel: parcel,
                qrCode: qrCode // Attach the generated QR code to the response
            });
        }

        // Send the results with QR codes as response
        res.status(200).json(deliveriesWithQrCode);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Fetch all trucks assigned to a specific admin
router.get('/trucks/:adminPhone', async (req, res) => {
    try {
        const adminPhone = req.params.adminPhone;

        // Find admin and populate driver details, including truckInfo for driverId
        const admin = await Admin.findOne({ phone: adminPhone }).populate({
            path: 'drivers.driverId',
            select: 'truckInfo', // Ensure that truckInfo is populated
            populate: {
                path: 'truckInfo',  // Populate truckInfo if it is a reference
                select: 'truckId truckCapacity'  // Select the relevant fields
            }
        });

        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        console.log('Populated Admin:', admin);

        // Extract driver IDs and their truckInfo
        const driverIds = admin.drivers.map(driver => driver.driverPhone);

        if (driverIds.length === 0) {
            return res.status(404).json({ message: 'No drivers assigned to this admin' });
        }
        console.log('Drivers with Truck Info:', driverIds);

        // Step 3: Find each driver by their ID and check if they have truckInfo
    const driversWithTrucks = [];

    for (const driverId of driverIds) {
        const driver = await Driver.findOne({ phone: driverId });
        console.log("Driver: " , driver);
        if (driver && driver.truckInfo) {
            // If truckInfo exists, add the driver and their truck information to the list
            driversWithTrucks.push({
                truckId:driver.truckInfo.truckId
            });
        }
    }

    if (driversWithTrucks.length === 0) {
        return res.status(404).json({ message: 'No trucks assigned to this admin' });
    }

    console.log('Drivers with Truck Info:', driversWithTrucks);
    const truckIds = [];

    for (const truckId of driversWithTrucks) {
        const truck = await Truck.findById(truckId.truckId);
        console.log("Truck: " , truck);
        if (truck) {
            // If truckInfo exists, add the driver and their truck information to the list
            truckIds.push({
                truckId:truck.truckId
            });
        }
    }

        res.status(200).json(truckIds);
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ error: err.message });
    }
});



// Fetch details of driver and parcels for a specific truck
router.get('/truck/:adminId/:truckId', async (req, res) => {
    try {
        const { adminId, truckId } = req.params;

        // Find admin by phone (adminId here is actually a phone number)
        const admin = await Admin.findOne({ phone: adminId }).populate('drivers.driverId'); // Populate driver details
        console.log(admin)
        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        // Find truck details using the truckId
        const truck = await Truck.findOne({ truckId: truckId });
        if (!truck) {
            return res.status(404).json({ message: 'Truck not found' });
        }

        console.log("truck",truck);
        // Extract driver IDs and their truckInfo
        const driverIds = admin.drivers.map(driver => driver.driverPhone);
        // Find driver details who is assigned to this truck
        console.log("truck",driverIds);
        let phone;
        let driverData;
        for(let driverId in driverIds){
            const driver = await Driver.findOne({phone:driverIds[driverId]});
            console.log("truck",driver);
            if(driver.truckInfo!=null){
                if(driver.truckInfo.truckId.toString()===truck._id.toString()){
                    driverData = driver;
                    phone = driverIds[driverId];
                }
            }
        }
        console.log("truck",driverData);
        
        if (!driverData) {
            return res.status(404).json({ message: 'No driver assigned to this truck' });
        }
        // Collect parcel details assigned to this truck's driver
        let parcelInfo
        for(const driverParcel of admin.drivers){
            if(driverParcel.driverPhone===phone){
                parcelInfo = driverParcel.parcels
            }
        }
        const parcels = [];
        for (const parcel of parcelInfo) {
            const parcelDetails = await Parcel.findById(parcel.parcelDetails.toString());
            console.log(parcelDetails)
            if (parcelDetails) {
                parcels.push(parcelDetails);
            }
        }
        

        // Respond with truck, driver, and parcel details
        const response = {
            truck: truck,
            driver: driverData,
            parcels: parcels,
        };

        res.status(200).json(response);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});






module.exports = router;
