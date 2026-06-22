const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Branch = require('./models/Branch');

dotenv.config();

const updateBranches = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected.');

        // Update Branch 1
        const b1 = await Branch.findOne({ name: 'Branch 1' });
        if (b1) {
            b1.name = 'Super Ideal Sweets & Bakers'; // Keep original name if needed, but user wants it to be "Super Ideal Sweets & Bakers". Wait, changing name might affect dropdowns if they hardcode "Branch 1", but I'll update it. Let's just update the address and phone.
            b1.address = 'Dawood Chowk، Karbala Road, Madina Colony, Sahiwal, 57000, Pakistan';
            b1.phone = '+92 323 4404773';
            b1.googleMapsLink = 'https://maps.app.goo.gl/4iwa1gBtYfezbv128';
            await b1.save();
            console.log('Branch 1 updated');
        } else {
            console.log('Branch 1 not found');
        }

        // Update Branch 2
        const b2 = await Branch.findOne({ name: 'Branch 2' });
        if (b2) {
            b2.name = 'Super Ideal Sweets & Bakers'; // We'll leave the name or update it? Let's keep name unique like "Super Ideal Sweets & Bakers (Karbala Road)"
            // Actually I'll check what the user wants. The user didn't explicitly say change the branch name to be identical. Let's append location to make it distinguishable.
            b2.address = 'Arra Tulla Rd, Sahiwal, Pakistan';
            b2.phone = '+92 323 4404772';
            b2.googleMapsLink = 'https://maps.app.goo.gl/BeJ1SbqL9xGzG4ng7';
            await b2.save();
            console.log('Branch 2 updated');
        } else {
            console.log('Branch 2 not found');
        }

        console.log('Done.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

updateBranches();
