const orderModel = require("../models/order.model")
const axios = require("axios")

async function createOrder(req, res) {

    const user = req.user;
    const token = req.cookies?.token || req.headers?.authorization?.split(' ')[ 1 ];

    try {

        const cartServiceBaseUrl = process.env.CART_SERVICE_URL || "http://localhost:3001";
        const productServiceBaseUrl = process.env.PRODUCT_SERVICE_URL || "http://localhost:3002";
        const cartEndpointCandidates = (process.env.CART_ENDPOINTS || "").split(",").map(p => p.trim()).filter(Boolean);
        const productEndpointCandidates = (process.env.PRODUCT_ENDPOINTS || "").split(",").map(p => p.trim()).filter(Boolean);

        const fetchWithFallback = async (paths) => {
            let lastError;
            const attempted = [];
            for (const path of paths) {
                try {
                    attempted.push(path);
                    return await axios.get(`${path}`, {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    });
                } catch (err) {
                    lastError = err;
                    if (err.response?.status !== 404) {
                        throw err;
                    }
                }
            }
            if (lastError && attempted.length) {
                lastError.attemptedUrls = attempted;
            }
            throw lastError;
        };

        // fetch user cart from cart service (try common endpoints)
        const cartResponse = await fetchWithFallback(
            cartEndpointCandidates.length
                ? cartEndpointCandidates.map((path) => `${cartServiceBaseUrl}${path.startsWith("/") ? "" : "/"}${path}`)
                : [
                    `${cartServiceBaseUrl}/api/cart`,
                    `${cartServiceBaseUrl}/cart`,
                    `${cartServiceBaseUrl}/api/cart/current`,
                    `${cartServiceBaseUrl}/cart/current`
                ]
        );

        const cart = cartResponse?.data?.cart || cartResponse?.data?.data || cartResponse?.data;
        if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
            return res.status(400).json({ message: "Cart is empty" });
        }

        const products = await Promise.all(cart.items.map(async (item) => {

            const productResponse = await fetchWithFallback(
                productEndpointCandidates.length
                    ? productEndpointCandidates.map((path) => `${productServiceBaseUrl}${path.startsWith("/") ? "" : "/"}${path}`).map((url) => `${url}/${item.productId}`)
                    : [
                        `${productServiceBaseUrl}/api/products/${item.productId}`,
                        `${productServiceBaseUrl}/products/${item.productId}`
                    ]
            );

            return productResponse?.data?.data || productResponse?.data;

        }))

        let priceAmount = 0;

        const orderItems = cart.items.map((item, index) => {


            const product = products.find(p => p._id === item.productId)

            // if not in stock, does not allow order creation

            if (product.stock < item.quantity) {
                throw new Error(`Product ${product.title} is out of stock or insufficient stock`)
            }

            const itemTotal = product.price.amount * item.quantity;
            priceAmount += itemTotal;

            return {
                product: item.productId,
                quantity: item.quantity,
                price: {
                    amount: itemTotal,
                    currency: product.price.currency
                }
            }
        })

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

        res.status(201).json({ order })

    } catch (err) {
        if (err.response?.status === 404) {
            return res.status(404).json({
                message: "Upstream resource not found",
                error: err.message,
                attemptedUrls: err.attemptedUrls || []
            });
        }
        res.status(500).json({ message: "Internal server error", error: err.message })
    }

}

module.exports = {
    createOrder,
}