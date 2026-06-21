const fs = require('fs');
const path = require('path');
const User = require('./models/User');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
require('dotenv').config();

async function testUpload() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
        fs.writeFileSync('result.json', JSON.stringify({ error: 'No admin found!' }));
        process.exit(1);
    }
    
    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    
    const dummyPath = path.join(__dirname, 'dummy.png');
    fs.writeFileSync(dummyPath, 'dummy image content');
    
    const FormData = require('form-data');
    const form = new FormData();
    form.append('image', fs.createReadStream(dummyPath));
    
    const fetch = require('node-fetch');
    const res = await fetch('http://localhost:5000/api/products/upload-image', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            ...form.getHeaders()
        },
        body: form
    });
    
    const data = await res.json();
    fs.writeFileSync('result.json', JSON.stringify(data));
    
    // Cleanup
    fs.unlinkSync(dummyPath);
    mongoose.disconnect();
  } catch (err) {
    fs.writeFileSync('result.json', JSON.stringify({ error: err.message }));
    mongoose.disconnect();
  }
}

testUpload();
