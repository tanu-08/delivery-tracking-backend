const mongoose = require("mongoose");
const { Message } = require("twilio/lib/twiml/MessagingResponse");

const fleetNotificationSchema = new mongoose.Schema({
    fleetOwnerId: { type: mongoose.Schema.Types.ObjectId, ref: "FleetOwner", required: true },
    parcelId: { type: mongoose.Schema.Types.ObjectId, ref: "Parcel", required: true },
    status: { type: String, enum: ["Pending", "Accepted", "Rejected"], default: "Pending" },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true },
    notificationDate: { type: Date, default: Date.now },
    message: { type: String, default: null },
});

module.exports = mongoose.model("FleetNotification", fleetNotificationSchema);
