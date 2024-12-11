const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema({
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
    optimizedRoute: [
        {
            start: { type: String, required: true },
            end: { type: String, required: true },
            distance: { type: String },
            duration: { type: String },
        },
    ],
});

module.exports = mongoose.model('Route', routeSchema);

  