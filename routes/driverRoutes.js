const express = require('express');
const Truck = require('../models/Truck');
const Driver = require('../models/Driver');
const router = express.Router();
const DriverTruckCapacity = require('../models/DriverTruckCapacity');
const FleetOwnerAuth = require('../models/FleetOwnerAuth');

// Get Truck's Total and Current Load Capacity
router.get('/:id/truck-capacity', async (req, res) => {
  try {
      const driverId = req.params.id;

      // Fetch the driver's truck capacity data
      const truckCapacity = await DriverTruckCapacity.findOne({ driverId: driverId });
      if (!truckCapacity) {
          return res.status(404).json({ message: 'Driver truck capacity not found.' });
      }

      const remainingCapacity = truckCapacity.totalCapacity - truckCapacity.currentLoad;

      res.status(200).json({
          totalCapacity: truckCapacity.totalCapacity,
          currentLoad: truckCapacity.currentLoad,
          remainingCapacity: remainingCapacity
      });
  } catch (err) {
      res.status(500).json({ error: err.message });
  }
});


// Update Driver's Truck Load Capacity (after scheduling a parcel, and optionally update total capacity)
router.put('/:id/truck-capacity', async (req, res) => {
  try {
      const driverId = req.params.id;
      const { parcelWeight, totalCapacity } = req.body;  // weight of the new parcel and optional new total capacity

      // Check if parcel weight is provided
      if (!parcelWeight) {
          return res.status(400).json({ message: 'Parcel weight is required.' });
      }

      // Fetch the driver's truck capacity data
      const truckCapacity = await DriverTruckCapacity.findOne({ driverId: driverId });
      if (!truckCapacity) {
          return res.status(404).json({ message: 'Driver truck capacity not found.' });
      }

      // If the totalCapacity is provided, update it
      if (totalCapacity) {
          // Update the total capacity only if the new total capacity is greater than the current load
          if (totalCapacity < truckCapacity.currentLoad) {
              return res.status(400).json({ message: 'New total capacity cannot be less than current load.' });
          }

          truckCapacity.totalCapacity = totalCapacity;
      }

      // Check if adding the parcel weight exceeds the total capacity
      if (truckCapacity.currentLoad + parcelWeight > truckCapacity.totalCapacity) {
          return res.status(400).json({ message: 'Cannot schedule parcel: exceeds truck capacity.' });
      }

      // Update the current load
      truckCapacity.currentLoad += parcelWeight;
      await truckCapacity.save();

      res.status(200).json({
          message: 'Truck load updated successfully.',
          totalCapacity: truckCapacity.totalCapacity,
          currentLoad: truckCapacity.currentLoad,
          remainingCapacity: truckCapacity.totalCapacity - truckCapacity.currentLoad
      });
  } catch (err) {
      res.status(500).json({ error: err.message });
  }
});



// Fetch drivers for delivery
router.post('/getDriversForDelivery', async (req, res) => {
    try {
        const { startLocation, requiredCapacity } = req.body;

        // Fetch DOP's own drivers
        const dopDrivers = await Driver.find({
            addedBy: 'dop',
            baseLocation: startLocation,
            capacity: { $gte: requiredCapacity },
        });

        // Fetch fleet owners by baseLocation
        const fleetOwners = await FleetOwnerAuth.find({ baseLocation: startLocation })
            .populate('drivers') // Populate drivers associated with fleet owner
            .exec();

        // Extract drivers from fleet owners who meet the capacity requirement
        const fleetDrivers = [];
        fleetOwners.forEach((owner) => {
            owner.drivers.forEach((driver) => {
                if (driver.isAvailable && driver.capacity >= requiredCapacity) {
                    fleetDrivers.push(driver);
                }
            });
        });

        return res.status(200).json({
            message: 'Drivers fetched successfully',
            dopDrivers,
            fleetDrivers,
        });
    } catch (error) {
        console.error('Error fetching drivers:', error);
        res.status(500).json({
            message: 'Error fetching drivers',
            error: error.message,
        });
    }
});
router.get("/parcel/map/:parcelId", async (req, res) => {
    const { parcelId } = req.params;

    try {
        const parcel = await Parcel.findById(parcelId);

        if (!parcel) {
            return res.status(404).json({ message: "Parcel not found." });
        }

        const pickupMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${parcel.pickupLocation.lat},${parcel.pickupLocation.lng}&zoom=15&size=600x300&key=${process.env.GOOGLE_MAPS_API_KEY}`;
        const dropMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${parcel.dropLocation.lat},${parcel.dropLocation.lng}&zoom=15&size=600x300&key=${process.env.GOOGLE_MAPS_API_KEY}`;

        res.status(200).json({ pickupMapUrl, dropMapUrl });
    } catch (err) {
        res.status(500).json({ message: "Error fetching maps.", error: err.message });
    }
});



// Register Driver
router.post('/', async (req, res) => {
  try {
    const driver = new Driver(req.body);
    await driver.save();
    res.status(201).json(driver);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Register a new driver
router.post('/register', async (req, res) => {
    try {
        const driver = new Driver(req.body);
        const savedDriver = await driver.save();
        res.status(201).json({ success: true, data: savedDriver });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// Assign truck to driver
router.post('/assign', async (req, res) => {
    try {
        const { baseLocation, owner, requiredCapacity } = req.body;

        // Find all trucks that match the criteria
        const trucks = await Truck.find({
            baseLocation,
            availableCapacity: { $gte: requiredCapacity },
            availability: true,
            owner,
        });

        if (trucks.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'No available trucks match the criteria.' 
            });
        }

        // Find all drivers in the base location
        const drivers = await Driver.find({ 
            baseLocation, 
            owner 
        }).populate('truckInfo.truckId');

        const assignedData = [];
        const availableTrucks = new Set(trucks.map((truck) => truck._id.toString())); // Track available trucks

        for (const driver of drivers) {
            let truck = null;

            // If the driver is not assigned a truck, find an available one
            if (!driver.isAssigned) {
                truck = trucks.find((t) => availableTrucks.has(t._id.toString()) && t.availableCapacity >= requiredCapacity);
            } 
            // If the driver has an assigned truck, check its capacity
            else if (driver.truckInfo && driver.truckInfo.truckId) {
                const assignedTruck = await Truck.findById(driver.truckInfo.truckId);
                if (assignedTruck && assignedTruck.availableCapacity >= requiredCapacity) {
                    truck = assignedTruck;
                }
            }

            if (truck) {
                // Assign the truck to the driver if not already assigned
                if (!driver.isAssigned) {
                    driver.truckInfo = {
                        truckId: truck._id,
                        truckCapacity: truck.capacity,
                    };
                    availableTrucks.delete(truck._id.toString()); // Remove truck from available list
                }
                
                await truck.save();

                // Save driver updates
                await driver.save();

                // Add to response
                assignedData.push({
                    driverId: driver._id,
                    driverName: driver.name,
                    truckId: truck._id,
                    truckCapacity: truck.capacity,
                });
            }
        }

        // Fetch all fleet owners in the base location independently of truck assignments
        const fleetOwners = await FleetOwnerAuth.find({
            baseLocation,
        }).select('_id name');

        if (assignedData.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'No eligible drivers or trucks available.',
                fleetOwners,
            });
        }

        res.status(200).json({ 
            success: true, 
            drivers: assignedData, 
            fleetOwners,
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});


// Get all drivers with assigned trucks
router.get('/:owner', async (req, res) => {
    try {
        const { owner } = req.params;
        const drivers = await Driver.find({ owner }).populate('truckInfo.truckId');
        res.status(200).json({ success: true, data: drivers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;


// Update Driver Location
router.put('/:id/location', async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);
    if (!driver) return res.status(404).json({ error: 'Driver not found' });

    driver.currentLocation = req.body;
    await driver.save();
    res.json(driver);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.get('/parcels/:driverId', async (req, res) => {
    try {
        const { driverId } = req.params;

        // Find the admin containing the driver and their parcels
        const adminData = await Admin.findOne({
            'drivers.driverId': driverId,
        }).select('drivers.$');

        if (!adminData || adminData.drivers.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Driver not found or no parcels assigned to this driver.',
            });
        }

        // Extract parcels for the given driver
        const driver = adminData.drivers[0];
        const parcels = driver.parcels;

        res.status(200).json({
            success: true,
            driver: {
                driverId: driver.driverId,
                driverName: driver.driverName,
                driverPhone: driver.driverPhone,
            },
            parcels,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});


module.exports = router;
