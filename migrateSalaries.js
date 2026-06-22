const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Salary = require('./models/Salary');

dotenv.config();

const migrateSalaries = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected.');

        // Get all staff users
        const users = await User.find({ role: { $in: ['manager', 'staff', 'delivery'] } });
        let count = 0;

        for (const user of users) {
            let updated = false;

            // Set baseSalary if it is 0 or undefined
            if (!user.baseSalary) {
                if (user.role === 'manager') user.baseSalary = 35000;
                else if (user.role === 'staff') user.baseSalary = 22000;
                else if (user.role === 'delivery') user.baseSalary = 20000;
                
                await user.save();
                updated = true;
                count++;
                console.log(`Updated base salary for ${user.name} (${user.role}) to ${user.baseSalary}`);
            }

            // Optional: You could update existing pending Salary records for the current month here,
            // but the next time the system queries them it might just leave them unless we explicitly update.
            // Let's update any existing 'pending' Salary records to match the new base salary.
            const pendingSalaries = await Salary.find({ staff: user._id, status: 'pending' });
            for (const salary of pendingSalaries) {
                if (salary.basicSalary === 20000 && user.baseSalary !== 20000) {
                    salary.basicSalary = user.baseSalary;
                    salary.netSalary = salary.basicSalary + salary.bonus - salary.deductions;
                    await salary.save();
                    console.log(`Updated pending salary sheet for ${user.name} to ${salary.basicSalary}`);
                }
            }
        }

        console.log(`Migrated ${count} users.`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

migrateSalaries();
