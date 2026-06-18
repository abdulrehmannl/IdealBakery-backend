require('dotenv').config();
const mongoose = require('mongoose');
const User     = require('./models/User');

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const users = await User.find(
        { authProvider: 'internal', role: { $ne: 'admin' } },
        'name phone role branch -_id'
    ).populate('branch', 'name');
    
    console.log('\n=== Internal Staff Accounts in DB ===');
    console.log('Count:', users.length);
    users.forEach(u => {
        console.log(`  ${u.role.padEnd(10)} | ${u.phone} | ${u.name} | Branch: ${u.branch?.name || 'N/A'}`);
    });
    console.log('=====================================\n');
    mongoose.disconnect();
}).catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
});
