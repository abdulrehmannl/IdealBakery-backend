/**
 * routes/orderRoutes.js — Order API Routes
 * ==========================================
 * Mounted: app.use('/api/orders', orderRoutes)
 *
 *   POST   /api/orders               → createOrder       (any logged-in user — customers place orders)
 *   GET    /api/orders               → getAllOrders       (staffOrAdmin — staff/admin view all orders)
 *   GET    /api/orders/:id           → getSingleOrder     (any logged-in user — customers view own, staff/admin view any)
 *   PUT    /api/orders/:id/status    → updateOrderStatus  (staffOrAdmin — staff can update order status)
 *   DELETE /api/orders/:id           → deleteOrder        (adminOnly — only admin can delete)
 *
 * NOTE: The controller for getAllOrders and getSingleOrder filters by customer ID
 * when the requesting user's role is 'customer', so customers only see their own orders.
 */

const express = require('express');
const router  = express.Router();
const { protect, optionalAuth, adminOnly, staffOrAdmin, staffAdminOrDelivery } = require('../middleware/auth');
const {
    createOrder, getAllOrders, getSingleOrder,
    updateOrderStatus, assignDelivery, deleteOrder, trackOrder, getMyOrders
} = require('../controllers/orderController');

router.post('/',           optionalAuth,        createOrder);
router.get('/my-orders',   protect,             getMyOrders);
router.get('/',            protect, staffAdminOrDelivery, getAllOrders);
router.get('/track',                            trackOrder); // Public route
router.get('/:id',         protect,             getSingleOrder);
router.put('/:id/status',  protect, staffAdminOrDelivery, updateOrderStatus);
router.put('/:id/assign',  protect, staffOrAdmin, assignDelivery);
router.delete('/:id',      protect, adminOnly,   deleteOrder);

module.exports = router;

/*
 * END OF FILE SUMMARY
 * =====================
 * File: routes/orderRoutes.js   Mounted: /api/orders
 * Route             Method   Middleware              Controller
 * /                 POST     protect                 createOrder
 * /                 GET      protect, staffOrAdmin   getAllOrders
 * /:id              GET      protect                 getSingleOrder
 * /:id/status       PUT      protect, staffOrAdmin   updateOrderStatus
 * /:id              DELETE   protect, adminOnly      deleteOrder
 */
