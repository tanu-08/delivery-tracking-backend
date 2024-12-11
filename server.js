const mongoose = require('mongoose');
const express = require('express');
require('dotenv').config();

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('MongoDB connected...'))
  .catch((err) => console.error('MongoDB connection error:', err));
  


const app = express();
app.use(express.json());


// Routes
app.use('/api/parcels', require('./routes/parcelRoutes'));
app.use('/api/driver', require('./routes/driverRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/admin/auth', require('./routes/adminSignUpLoginRoutes'));
app.use('/api/driver/auth', require('./routes/driverSignUpLoginroutes'));
app.use('/api/threePL/auth',require('./routes/threePLAuthRoutes'));
app.use('/api/fleetOwner/auth',require('./routes/fleetOwnerRoutes'));
app.use('/api/trucks',require('./routes/truckRoutes'));

// Start Server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

