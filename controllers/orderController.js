/**
 * controllers/orderController.js — Order Business Logic
 * =======================================================
 * ORDER SCHEMA RECAP:
 *   customer      ObjectId ref:User   required
 *   branch        ObjectId ref:Branch
 *   totalAmount   Number              required
 *   status        enum: pending|confirmed|preparing|delivered|cancelled  default:pending
 *   paymentMethod enum: cash|online   required
 *   address       String              required
 *   phone         String              required
 *   orderType     enum: delivery|pickup  required
 *
 * ORDER ITEM SCHEMA (separate collection, linked by order ObjectId):
 *   order    ObjectId ref:Order   required
 *   product  ObjectId ref:Product required
 *   quantity Number min:1         required
 *   price    Number               required
 *
 * DESIGN DECISION — Two-collection approach:
 *   Order stores the header (customer, total, status).
 *   OrderItem stores each individual product line.
 *   When creating an order we create BOTH in the same request using a session
 *   to keep data consistent (if items fail, order rolls back).
 *   We use mongoose sessions for this atomic operation.
 */

const Order     = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const mongoose  = require('mongoose');

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLER 1: createOrder
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @desc    Place a new order (creates Order + OrderItems atomically)
 * @route   POST /api/orders
 * @access  Private — logged-in customers
 *
 * Request Body:
 *   {
 *     "branch":        "64abc",
 *     "totalAmount":   2400,
 *     "paymentMethod": "cash",
 *     "address":       "House 5, Street 10, G-9 Islamabad",
 *     "phone":         "03001234567",
 *     "orderType":     "delivery",
 *     "items": [
 *       { "product": "64def", "quantity": 2, "price": 900 },
 *       { "product": "64ghi", "quantity": 1, "price": 600 }
 *     ]
 *   }
 */
const createOrder = async (req, res, next) => {
    // Start a Mongoose session for atomic (all-or-nothing) operation.
    // If saving order items fails, the Order document is also rolled back.
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { items, totalAmount, paymentMethod, address, phone, orderType, notes, branch, customerName } = req.body;

        // ── Validate required fields ──
        const missing = [];
        if (!totalAmount)   missing.push('totalAmount');
        if (!paymentMethod) missing.push('paymentMethod');
        if (!address)       missing.push('address');
        if (!phone)         missing.push('phone');
        if (!orderType)     missing.push('orderType');
        if (!items || !Array.isArray(items) || items.length === 0)
            missing.push('items (non-empty array)');

        if (missing.length > 0) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ success: false, message: `Missing: ${missing.join(', ')}` });
        }

        // Generate a random order number (e.g. ISB-12345678)
        const generateOrderNumber = () => 'ISB-' + Date.now().toString().slice(-6) + Math.floor(10 + Math.random() * 90);
        const newOrderNumber = generateOrderNumber();

        // ── Step 1: Create the Order header ──
        // req.user is attached by the protect middleware — logged-in user's ID
        const [order] = await Order.create([{
            orderNumber:   newOrderNumber,
            customer:      req.user ? req.user._id : null,
            customerName:  req.user ? req.user.name : customerName,
            branch:        req.user?.branch || branch || null,
            totalAmount,
            paymentMethod,
            address,
            phone,
            orderType,
            status: 'pending',
        }], { session });

        // ── Step 2: Build OrderItem documents from items array ──
        // Each item gets the new order's _id attached
        const orderItemDocs = items.map(item => ({
            order:       order._id,
            product:     item.product || undefined,
            productName: item.productName || 'Unknown Product',
            quantity:    item.quantity,
            price:       item.price,
        }));

        // ── Step 3: Save all order items in one batch ──
        await OrderItem.insertMany(orderItemDocs, { session });

        // ── Step 4: Commit — both Order and Items are now saved ──
        await session.commitTransaction();
        session.endSession();

        // Populate and return the created order
        const populated = await Order.findById(order._id)
            .populate('customer', 'name email phone')
            .populate('branch',   'name city');

        return res.status(201).json({
            success: true,
            message: 'Order placed successfully!',
            data:    populated,
        });

    } catch (error) {
        // If anything fails → roll back BOTH Order and OrderItems
        await session.abortTransaction();
        session.endSession();
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLER 2: getAllOrders
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @desc    Get all orders (admin) or own orders (customer)
 * @route   GET /api/orders
 * @access  Private — logged-in users
 *
 * Query filters:
 *   ?status=pending|confirmed|preparing|delivered|cancelled
 *   ?branch=<branchId>
 *   ?orderType=delivery|pickup
 */
const getAllOrders = async (req, res, next) => {
    try {
        const filter = {};

        // Admins/managers see ALL orders; customers see only their own
        if (req.user.role === 'customer') {
            filter.customer = req.user._id;
        }

        if (req.query.status)    filter.status    = req.query.status;
        if (req.query.branch)    filter.branch     = req.query.branch;
        if (req.query.orderType) filter.orderType  = req.query.orderType;

        const orders = await Order.find(filter)
            .populate('customer', 'name phone')
            .populate('branch',   'name city')
            .sort({ createdAt: -1 });

        // Fetch items for each order
        const ordersWithItems = await Promise.all(orders.map(async (order) => {
            const items = await OrderItem.find({ order: order._id }).populate('product', 'name price image');
            return { ...order.toObject(), items };
        }));

        return res.status(200).json({ success: true, count: ordersWithItems.length, data: ordersWithItems });

    } catch (error) { next(error); }
};

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLER 3: getSingleOrder
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @desc    Get one order + its items
 * @route   GET /api/orders/:id
 * @access  Private
 */
const getSingleOrder = async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('customer', 'name email phone')
            .populate('branch',   'name city address');

        if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

        // Customers can only view their own orders
        if (req.user.role === 'customer' && order.customer._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Access denied. Not your order.' });
        }

        // Fetch associated items
        const items = await OrderItem.find({ order: order._id })
            .populate('product', 'name price image');

        return res.status(200).json({ success: true, data: { order, items } });

    } catch (error) { next(error); }
};

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLER 4: updateOrderStatus
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @desc    Update order status (admin/manager only)
 * @route   PUT /api/orders/:id/status
 * @access  Private — Admin/Manager
 */
const updateOrderStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        const allowed = ['pending', 'confirmed', 'preparing', 'delivered', 'cancelled'];

        if (!status || !allowed.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Must be one of: ${allowed.join(', ')}`,
            });
        }

        const order = await Order.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true, runValidators: true }
        ).populate('customer', 'name phone').populate('branch', 'name');

        if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

        return res.status(200).json({
            success: true,
            message: `Order status updated to "${status}".`,
            data:    order,
        });

    } catch (error) { next(error); }
};

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLER 5: deleteOrder
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @desc    Delete an order and its items
 * @route   DELETE /api/orders/:id
 * @access  Private — Admin/Manager
 */
const deleteOrder = async (req, res, next) => {
    try {
        const order = await Order.findByIdAndDelete(req.params.id);
        if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

        // Also delete all order items linked to this order
        await OrderItem.deleteMany({ order: req.params.id });

        return res.status(200).json({ success: true, message: 'Order deleted.', data: null });
    } catch (error) { next(error); }
};

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLER 6: trackOrder (Public)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @desc    Track order publicly using order ID and phone number
 * @route   GET /api/orders/track
 * @access  Public
 */
const trackOrder = async (req, res, next) => {
    try {
        const { orderId, phone } = req.query;
        if (!orderId || !phone) {
            return res.status(400).json({ success: false, message: 'Order ID and phone number are required.' });
        }

        let order = await Order.findOne({ orderNumber: orderId })
            .populate('customer', 'name email phone')
            .populate('branch', 'name city address');

        // Fallback for older orders that might only have an ObjectId
        if (!order && orderId.match(/^[0-9a-fA-F]{24}$/)) {
            order = await Order.findById(orderId)
                .populate('customer', 'name email phone')
                .populate('branch', 'name city address');
        }

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found.' });
        }

        if (order.phone !== phone) {
            return res.status(401).json({ success: false, message: 'Phone number does not match this order.' });
        }

        const items = await OrderItem.find({ order: order._id })
            .populate('product', 'name price image');

        return res.status(200).json({ success: true, data: { order, items } });
    } catch (error) {
        next(error);
    }
};
// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLER 7: getMyOrders (Logged-in customer)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @desc    Get logged in user orders
 * @route   GET /api/orders/my-orders
 * @access  Private (Any logged-in user)
 */
const getMyOrders = async (req, res, next) => {
    try {
        const orders = await Order.find({ customer: req.user._id }).sort('-createdAt');
        
        // Fetch items for each order to build a comprehensive view
        const ordersWithItems = await Promise.all(orders.map(async (order) => {
            const items = await OrderItem.find({ order: order._id }).populate('product', 'name price image');
            return { ...order.toObject(), items };
        }));

        return res.status(200).json({ success: true, count: ordersWithItems.length, data: ordersWithItems });
    } catch (error) {
        next(error);
    }
};

module.exports = { createOrder, getAllOrders, getSingleOrder, updateOrderStatus, deleteOrder, trackOrder, getMyOrders };

/*
 * END OF FILE SUMMARY
 * =====================
 * File:    controllers/orderController.js
 * Exports: { createOrder, getAllOrders, getSingleOrder, updateOrderStatus, deleteOrder }
 *
 * createOrder:       POST /api/orders         → atomic Order + OrderItem creation
 * getAllOrders:       GET  /api/orders         → admin sees all; customer sees own
 * getSingleOrder:    GET  /api/orders/:id      → order + items populated
 * updateOrderStatus: PUT  /api/orders/:id/status → admin changes status
 * deleteOrder:       DELETE /api/orders/:id   → deletes order + items
 *
 * Filters on GET: ?status  ?branch  ?orderType
 * Security: customers cannot see other customers' orders
 */
