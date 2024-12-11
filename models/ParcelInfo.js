const mongoose = require('mongoose');

const parcelInfoSchema = new mongoose.Schema({
    parcelId: { type: String, required: true, unique: true }, // Unique parcel identifier
    weight: { type: Number, required: true }, // Weight of the parcel in kg
    length: { type: String , required:true},
    breadth: { type: String, required:true},
    height: { type: String , required:true},
    numberOfEntities: {type: Number , required: true},
    description: { type: String, required: false }, // Optional description of the parcel
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
    pickupLocation: { type: String, required: true }, // Pickup location
    dropOffLocation: { type: String, required: true }, // Drop-off location
    status: { 
        type: String, 
        enum: ['Pending', 'In Transit', 'Delivered'], 
        default: 'Pending' 
    }, // Parcel status
    createdAt: { type: Date, default: Date.now }, // Timestamp for creation
    updatedAt: { type: Date, default: Date.now }, // Timestamp for updates
});

module.exports = mongoose.model('ParcelInfo', parcelInfoSchema);
