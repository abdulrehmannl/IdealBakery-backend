require('dotenv').config();
const mongoose = require('mongoose');
const Branch = require('./models/Branch');
const Category = require('./models/Category');
const Product = require('./models/Product');
const Staff = require('./models/Staff');
const connectDB = require('./config/db');

const seedDatabase = async () => {
    try {
        await connectDB();
        console.log('Connected to MongoDB. Starting seed process...');

        // 1. Seed Branches
        console.log('Seeding Branches...');
        const branches = [
            { name: 'Branch 1', city: 'Lahore', address: '123 Main St', phone: '0300-1111111', managerName: 'Ali' },
            { name: 'Branch 2', city: 'Karachi', address: '456 Side St', phone: '0300-2222222', managerName: 'Usman' }
        ];
        
        const branchIds = {};
        for (const b of branches) {
            let branch = await Branch.findOne({ name: b.name });
            if (!branch) branch = await Branch.create(b);
            branchIds[b.name] = branch._id;
        }

        // 2. Seed Categories
        console.log('Seeding Categories...');
        const categoryNames = ['Fast Food', 'Bakery Items', 'Desi Items', 'Desserts', 'Ice Cream', 'Beverages', 'Gift Boxes', 'Event Orders'];
        const categoryIds = {};
        for (const name of categoryNames) {
            let cat = await Category.findOne({ name });
            if (!cat) cat = await Category.create({ name });
            categoryIds[name] = cat._id;
        }

        // 3. Seed Products
        console.log('Seeding Products...');
        const initialProducts = [
            { name: 'Black Forest Cake',  category: 'Bakery Items', price: 2200, discount: 10, stock: 8,  isAvailable: true,  isSugarFree: false, weight: '1kg',   image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=80&q=60', tags: ['cake','birthday-cake'], branch: 'Branch 1' },
            { name: 'Zinger Burger',      category: 'Fast Food',    price: 450,  discount: 0,  stock: 50, isAvailable: true,  isSugarFree: false, weight: '250g',  image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=80&q=60', tags: ['burger','fast food'], branch: 'Both' },
            { name: 'Gulab Jamun 1kg',    category: 'Desi Items',   price: 500,  discount: 5,  stock: 20, isAvailable: true,  isSugarFree: false, weight: '1kg',   image: 'https://images.unsplash.com/photo-1605807646983-377bc5a76493?w=80&q=60', tags: ['mithai','desi'], branch: 'Both' },
            { name: 'Mango Milkshake',    category: 'Beverages',    price: 220,  discount: 0,  stock: 30, isAvailable: true,  isSugarFree: false, weight: '300ml', image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=80&q=60', tags: ['beverage','cold'], branch: 'Branch 2' },
            { name: 'Chocolate Brownie',  category: 'Desserts',     price: 320,  discount: 0,  stock: 3,  isAvailable: true,  isSugarFree: false, weight: '150g',  image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=80&q=60', tags: ['dessert','chocolate'], branch: 'Branch 1' },
            { name: 'Vanilla Ice Cream',  category: 'Ice Cream',    price: 180,  discount: 0,  stock: 0,  isAvailable: false, isSugarFree: false, weight: '1 scoop', image: 'https://images.unsplash.com/photo-1559703248-dcaaec9fab78?w=80&q=60', tags: ['ice cream'], branch: 'Both' },
            // Add some for special pages
            { name: 'Premium Gift Box',   category: 'Gift Boxes',   price: 5000, discount: 0,  stock: 10, isAvailable: true,  isSugarFree: false, weight: '2kg', image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=80&q=60', tags: ['gift-box'], branch: 'Both' },
            { name: 'Wedding Catering',   category: 'Event Orders', price: 50000, discount: 0, stock: 100, isAvailable: true, isSugarFree: false, weight: 'Custom', image: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=80&q=60', tags: ['event-order'], branch: 'Both' }
        ];

        for (const p of initialProducts) {
            let prod = await Product.findOne({ name: p.name });
            if (!prod) {
                const bIds = p.branch === 'Both' 
                    ? [branchIds['Branch 1'], branchIds['Branch 2']]
                    : [branchIds[p.branch]];

                await Product.create({
                    ...p,
                    category: categoryIds[p.category],
                    branch: bIds
                });
            }
        }

        // 4. Seed Staff
        console.log('Seeding Staff...');
        const initialStaff = [
            { name: 'Ali Ahmed', email: 'ali@ideal.com', phone: '0300-1111111', role: 'manager', salary: 50000, branch: branchIds['Branch 1'] },
            { name: 'Usman Raza', email: 'usman@ideal.com', phone: '0300-2222222', role: 'staff', salary: 25000, branch: branchIds['Branch 2'] },
            { name: 'Zain Khan', email: 'zain@ideal.com', phone: '0300-3333333', role: 'delivery', salary: 30000, branch: branchIds['Branch 1'] }
        ];

        for (const s of initialStaff) {
            let staff = await Staff.findOne({ email: s.email });
            if (!staff) await Staff.create(s);
        }

        console.log('✅ Database seeded successfully!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    }
};

seedDatabase();
