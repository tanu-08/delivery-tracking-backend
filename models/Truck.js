const mongoose = require('mongoose');

const truckSchema = new mongoose.Schema({
    truckId: { type: String, required: true, unique: true },
    baseLocation: { type: String, required: true },
    capacity: { type: Number, required: true }, // Total capacity in tons
    availableCapacity: { type: Number, required: true }, // Remaining capacity in tons
    availability: { type: Boolean, default: true }, // Whether the truck is available
    owner: { type: String, enum: ['dop', 'fleet'], required: true }, // Truck owner type
    isAssigned: { type: Boolean, default: false }, // Whether the truck is assigned
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Truck', truckSchema);