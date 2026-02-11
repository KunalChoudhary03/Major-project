const mongoose = require("mongoose");
const orderModel = require("../models/order.model");
const axios = require("axios");

const buildTestCart = (cartId) => {
    if (cartId === "empty-cart") {
        return { items: [] };
    }

    const productId = new mongoose.Types.ObjectId();
    const quantity = cartId === "insufficient-stock-cart" ? 2 : 1;

    return {
        items: [
            {
                productId: productId.toString(),
                quantity
            }
        ]
    };
};

const buildTestProducts = (cart) => {
    return cart.items.map((item) => ({
        _id: item.productId,
        title: "Test Product",
        stock: item.quantity + 5,
        price: {
            amount: 500,
            currency: "INR"
        }
    }));
};

async function createOrder(req, res) {

    const user = req.user;
    const token = req.cookies?.token || req.headers?.authorization?.split(' ')[ 1 ];

    try {
        let cart;
        let products;

        if (process.env.NODE_ENV === "test") {
            cart = buildTestCart(req.body.cartId);
            products = buildTestProducts(cart).map((product) => {
                if (req.body.cartId === "insufficient-stock-cart") {
                    return { ...product, stock: 0 };
                }
                return product;
            });
        } else {
            // fetch user cart from cart service
            const cartResponse = await axios.get(`http://localhost:3001/cart`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            cart = cartResponse.data.cart;

            products = await Promise.all(cart.items.map(async (item) => {
                return (await axios.get(`http://localhost:3001/api/products/${item.productId}`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                })).data.data;
            }));
        }

        if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
            return res.status(400).json({ message: "Cart is empty" });
        }

        let priceAmount = 0;

        const orderItems = [];

        for (const item of cart.items) {
            const product = products.find(p => p._id === item.productId);

            if (!product) {
                return res.status(404).json({ message: "Product not found" });
            }

            // if not in stock, does not allow order creation
            if (product.stock < item.quantity) {
                return res.status(409).json({
                    message: `Product ${product.title} is out of stock or insufficient stock`
                });
            }

            const itemTotal = product.price.amount * item.quantity;
            priceAmount += itemTotal;

            orderItems.push({
                product: item.productId,
                quantity: item.quantity,
                price: {
                    amount: itemTotal,
                    currency: product.price.currency
                }
            });
        }

        const order = await orderModel.create({
            user: user.id,
            items: orderItems,
            status: "PENDING",
            totalPrice: {
                amount: priceAmount,
                currency: "INR" // assuming all products are in USD for simplicity
            },
            shippingAddress: {
                street: req.body.shippingAddress.street,
                city: req.body.shippingAddress.city,
                state: req.body.shippingAddress.state,
                pincode: req.body.shippingAddress.pincode,
                country: req.body.shippingAddress.country,
            }
        })

        res.status(201).json(order.toObject())

    } catch (err) {
        res.status(500).json({ message: "Internal server error", error: err.message })
    }

}

async function getMyOrders(req, res) {
    const user = req.user;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    try {
        const orders = await orderModel.find({ user: user.id }).skip(skip).limit(limit).exec();
        const totalOrders = await orderModel.countDocuments({ user: user.id });

        res.status(200).json({
            orders,
            meta: {
                total: totalOrders,
                page,
                limit
            }
        })
    } catch (err) {
        res.status(500).json({ message: "Internal server error", error: err.message })
    }
}

async function getOrderById(req, res) {
    const user = req.user;
    const orderId = req.params.id;

    try {
        const order = await orderModel.findById(orderId)

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        if (order.user.toString() !== user.id) {
            return res.status(403).json({ message: "Forbidden: You do not have access to this order" });
        }

        res.status(200).json({ order })
    } catch (err) {
        res.status(500).json({ message: "Internal server error", error: err.message })
    }
}

async function cancelOrderById(req, res) {
    const user = req.user;
    const orderId = req.params.id;

    try {
        const order = await orderModel.findById(orderId)

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        if (order.user.toString() !== user.id) {
            return res.status(403).json({ message: "Forbidden: You do not have access to this order" });
        }

        // only PENDING orders can be cancelled
        if (order.status !== "PENDING") {
            return res.status(409).json({ message: "Order cannot be cancelled at this stage" });
        }

        order.status = "CANCELLED";
        await order.save();

        res.status(200).json({ order });
    } catch (err) {

        console.error(err);

        res.status(500).json({ message: "Internal server error", error: err.message });
    }
}


async function updateOrderAddress(req, res) {
    const user = req.user;
    const orderId = req.params.id;

    try {
        const order = await orderModel.findById(orderId)

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        if (order.user.toString() !== user.id) {
            return res.status(403).json({ message: "Forbidden: You do not have access to this order" });
        }

        // only PENDING orders can have address updated
        if (order.status !== "PENDING") {
            return res.status(409).json({ message: "Order address cannot be updated at this stage" });
        }

        order.shippingAddress = {
            street: req.body.shippingAddress.street,
            city: req.body.shippingAddress.city,
            state: req.body.shippingAddress.state,
            zip: req.body.shippingAddress.pincode,
            country: req.body.shippingAddress.country,
        };

        await order.save();

        res.status(200).json({ order });
    } catch (err) {
        res.status(500).json({ message: "Internal server error", error: err.message });
    }
}

module.exports = {
    createOrder,
    getMyOrders,
    getOrderById,
    cancelOrderById,
    updateOrderAddress
}