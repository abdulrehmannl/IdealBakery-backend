const fs = require('fs');
const path = require('path');
const User = require('./models/User');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
require('dotenv').config();

async function testUpload() {
  try {
    // 1. Connect to DB
    await mongoose.connect(process.env.MONGO_URI);
    
    // 2. Find an admin user
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
        console.log('No admin found!');
        process.exit(1);
    }
    
    // 3. Generate token
    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    
    // 4. Create a dummy image file
    const dummyPath = path.join(__dirname, 'dummy.png');
    fs.writeFileSync(dummyPath, 'dummy image content');
    
    // 5. Upload using fetch
    const FormData = require('form-data');
    const form = new FormData();
    form.append('image', fs.createReadStream(dummyPath));
    
    const fetch = (await import('node-fetch')).default;
    const res = await fetch('http://localhost:5000/api/products/upload-image', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            ...form.getHeaders()
        },
        body: form
    });
    
    const data = await res.json();
    console.log('Upload Result:', data);
    
    // Cleanup
    fs.unlinkSync(dummyPath);
    mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
    mongoose.disconnect();
  }
}

testUpload();
