const mongoose = require('mongoose');

const parcelSchema = new mongoose.Schema({
    driverId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Driver', 
        required: true 
    },
    weight: { 
        type: Number, 
        required: true 
    }, // Weight in kg
    length: { type: String , required:true},
    breadth: { type: String , required:true},
    height: { type: String , required:true},
    numberOfEntities: {type: Number , required: false},
    description: { 
        type: String, 
        required: false 
    }, // Description of the parcel
    pickUpDate: {
        type: String, required: true 
    },
    dropDate: {
        type: String, required: true  
    },
    pickUpTime: {
        type: String, required: true 
    },
    dropTime: {
        type: String, required: true  
    },
    pickupLocation: { 
        type: String, 
        required: true 
    }, // Pickup address
    dropOffLocation: { 
        type: String, 
        required: true 
    }, // Drop-off address
    status: { 
        type: String, 
        enum: ['Pending', 'In_Transit', 'Delivered'], 
        default: 'Pending' 
    },
    qrCode: { 
        type: String, 
    }, // QR code for the parcel
    checkInTime: { 
        type: String 
    }, // Timestamp for check-in
    checkOutTime: { 
        type: String 
    }, // Timestamp for check-out
    updatedAt: { 
        type: Date, 
        default: Date.now 
    }, // Last updated time
}, { timestamps: true });

module.exports = mongoose.model('Parcel', parcelSchema);
