const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    licenseNumber: { type: String, required: true },
    baseLocation: { type: String, required: true },
    truckInfo: {
        truckId: { type: mongoose.Schema.Types.ObjectId, ref: 'Truck', default: null },
        truckCapacity: { type: Number, default: null },
    },
    owner: { type: String, enum: ['dop', 'fleet'], required: true }, // Driver owner type
    isAssigned: { type: Boolean, default: false }, // Whether the driver is assigned a truck
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Driver', driverSchema);
