const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true, unique: true },
    drivers: [
        {
            driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
            driverName: { type: String },
            driverPhone: { type: String },
            parcels: [
                {
                    parcelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Parcel' },
                    parcelDetails: { type: mongoose.Schema.Types.ObjectId, ref: 'Parcel' }, // Add specific parcel details if needed
                },
            ],
        },
    ],

});

module.exports = mongoose.model('Admin', adminSchema);



