const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');

const getDashboardStats = async (req, res, next) => {
    try {
        // Customers count
        const totalUsers = await User.countDocuments({ role: 'customer' });
        
        // Staff count
        const totalStaff = await User.countDocuments({ role: { $ne: 'customer' } });

        // Orders metrics
        const orders = await Order.find();
        const totalOrders = orders.length;
        const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

        // Recent orders (last 5)
        const recentOrders = await Order.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('customer', 'name phone')
            .populate('branch', 'name');

        // Low stock products
        const lowStock = await Product.find({ stock: { $lt: 10 } }).populate('branch', 'name');

        // Best Sellers (Aggregated from Orders)
        const bestSellersAgg = await Order.aggregate([
            { $unwind: "$items" },
            { $group: { 
                _id: "$items.product", 
                sales: { $sum: "$items.quantity" }, 
                revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
            }},
            { $sort: { sales: -1 } },
            { $limit: 3 }
        ]);

        const populatedBestSellers = await Product.populate(bestSellersAgg, { path: '_id', select: 'name' });
        const bestSellers = populatedBestSellers.map(b => ({
            name: b._id ? b._id.name : 'Unknown Product',
            sales: b.sales,
            revenue: `Rs. ${b.revenue}`
        }));

        return res.status(200).json({
            success: true,
            data: {
                totalUsers,
                totalStaff,
                totalOrders,
                totalRevenue,
                recentOrders,
                lowStock,
                bestSellers
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { getDashboardStats };
