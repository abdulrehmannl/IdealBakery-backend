const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();
const connectDB = require('./config/db');

const app = express();

// Middleware
app.use(express.json());

// Test route
app.get('/', (req, res) => {
    res.send("Welcome");
});

// Database connection 
connectDB();

// Start server
app.listen(5000, () => {
    console.log("Server running on port 5000")
});