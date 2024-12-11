const mongoose = require('mongoose');

const truckcapacitySchema = new mongoose.Schema({
    driverId: {type: String , required:true},
    totalCapacity: { type:Number, required: true },
    currentLoad: { type:Number, required: true },
});

module.exports = mongoose.model('DriverTruckCapacity', truckcapacitySchema);