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

        const normalizeProductFromResponse = (responseData) => {
            if (!responseData) return undefined;
            return (
                responseData?.data?.product ||
                responseData?.data?.data?.product ||
                responseData?.data?.data ||
                responseData?.data ||
                responseData?.product ||
                responseData
            );
        };

        const productRawById = new Map();

        const products = await Promise.all(cart.items.map(async (item) => {

            if (item?.price?.amount || item?.price || item?.priceAmount || item?.amount || item?.sellingPrice || item?.mrp || item?.discountedPrice || item?.salePrice) {
                return item;
            }

            const productResponse = await fetchWithFallback(
                productEndpointCandidates.length
                    ? productEndpointCandidates.map((path) => `${productServiceBaseUrl}${path.startsWith("/") ? "" : "/"}${path}`).map((url) => `${url}/${item.productId}`)
                    : [
                        `${productServiceBaseUrl}/api/products/${item.productId}`,
                        `${productServiceBaseUrl}/products/${item.productId}`
                    ]
            );

            productRawById.set(String(item.productId), productResponse?.data);

            return normalizeProductFromResponse(productResponse?.data);

        }))

        let priceAmount = 0;

        const orderItems = cart.items.map((item, index) => {


            const product = products.find(p => String(p?._id || p?.productId || p?.product) === String(item.productId))

            if (!product) {
                const err = new Error("Product not found");
                err.statusCode = 404;
                throw err;
            }

            // if not in stock, does not allow order creation

            if (product.stock < item.quantity) {
                const err = new Error(`Product ${product.title} is out of stock or insufficient stock`);
                err.statusCode = 409;
                throw err;
            }

            const parsePriceNumber = (value) => {
                if (typeof value === "number" && Number.isFinite(value)) return value;
                if (typeof value === "string") {
                    const parsed = Number(value);
                    return Number.isFinite(parsed) ? parsed : undefined;
                }
                return undefined;
            };

            const findPriceInObject = (obj, depth = 0) => {
                if (!obj || typeof obj !== "object" || depth > 4) return undefined;
                const priceKeys = new Set([
                    "amount",
                    "value",
                    "price",
                    "priceAmount",
                    "sellingPrice",
                    "discountedPrice",
                    "salePrice",
                    "mrp",
                    "listPrice"
                ]);
                for (const key of Object.keys(obj)) {
                    if (priceKeys.has(key)) {
                        const parsed = parsePriceNumber(obj[key]);
                        if (typeof parsed === "number") return parsed;
                    }
                }
                for (const key of Object.keys(obj)) {
                    const nested = obj[key];
                    const parsed = findPriceInObject(nested, depth + 1);
                    if (typeof parsed === "number") return parsed;
                }
                return undefined;
            };

            const priceAmountValue =
                parsePriceNumber(product?.price?.amount) ??
                parsePriceNumber(product?.price?.value) ??
                parsePriceNumber(product?.price) ??
                parsePriceNumber(product?.priceAmount) ??
                parsePriceNumber(product?.amount) ??
                parsePriceNumber(product?.sellingPrice) ??
                parsePriceNumber(product?.discountedPrice) ??
                parsePriceNumber(product?.salePrice) ??
                parsePriceNumber(product?.mrp) ??
                parsePriceNumber(product?.listPrice) ??
                findPriceInObject(product);

            if (typeof priceAmountValue !== "number") {
                const err = new Error("Invalid product price data");
                err.statusCode = 502;
                err.details = {
                    productId: item.productId,
                    productSnapshot: {
                        _id: product?._id,
                        price: product?.price,
                        priceAmount: product?.priceAmount,
                        amount: product?.amount,
                        sellingPrice: product?.sellingPrice,
                        discountedPrice: product?.discountedPrice,
                        salePrice: product?.salePrice,
                        mrp: product?.mrp,
                        currency: product?.currency,
                        productRaw: productRawById.get(String(item.productId))
                    }
                };
                throw err;
            }

            const itemTotal = priceAmountValue * item.quantity;
            priceAmount += itemTotal;

            return {
                product: item.productId,
                quantity: item.quantity,
                price: {
                    amount: itemTotal,
                        currency: product?.price?.currency || product?.currency || "INR"
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

        const productById = new Map(products.map((p) => [String(p._id || p.productId), p]));
        const orderResponse = order.toObject();
        orderResponse.items = orderResponse.items.map((item) => {
            const product = productById.get(String(item.product));
            return {
                ...item,
                productDetails: product || null
            };
        });

        res.status(201).json({ order: orderResponse })

    } catch (err) {
        if (err.statusCode) {
            return res.status(err.statusCode).json({ message: err.message, details: err.details });
        }
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
async function getMyOrders(req, res) {
    const user = req.user;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    try{
        const orders = await orderModel.find({ user: user.id }).sort({ createdAt: -1 }).skip(skip).limit(limit);
        const totalOrders = await orderModel.countDocuments({ user: user.id });
        res.json({
            orders,
            meta: {
                total: totalOrders,
                page,
                limit,
            }
        })
    } catch (err) {
        res.status(500).json({ message: "Internal server error", error: err.message });
    }
}
async function getOrderById(req,res){
  const user = req.user;
  const orderId = req.params.id;
  try{
    const order = await orderModel.findById(orderId);
    if(!order){
        return res.status(404).json({message:"Order not found"})
    }
    if(order.user.toString() !== user.id && !user.role?.includes("admin")){
        return res.status(403).json({message:"Forbidden"})
    }

    // Add timeline
    const timeline = [
      { status: "PENDING", timestamp: order.createdAt, message: "Order placed" },
    ];
    if (order.status === "CONFIRMED" || order.status === "SHIPPED" || order.status === "DELIVERED") {
      timeline.push({ status: "CONFIRMED", timestamp: order.updatedAt, message: "Order confirmed" });
    }
    if (order.status === "SHIPPED" || order.status === "DELIVERED") {
      timeline.push({ status: "SHIPPED", timestamp: order.updatedAt, message: "Order shipped" });
    }
    if (order.status === "DELIVERED") {
      timeline.push({ status: "DELIVERED", timestamp: order.updatedAt, message: "Order delivered" });
    }
    if (order.status === "CANCELLED") {
      timeline.push({ status: "CANCELLED", timestamp: order.updatedAt, message: "Order cancelled" });
    }

    // Add payment summary
    const paymentSummary = {
      subtotal: order.totalPrice,
      tax: { amount: 0, currency: order.totalPrice.currency },
      total: order.totalPrice,
      status: order.status === "PENDING" ? "PENDING" : "PAID",
    };

    const orderResponse = order.toObject();
    orderResponse.timeline = timeline;
    orderResponse.paymentSummary = paymentSummary;

    res.json({ order: orderResponse });
  } catch (err) {
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
}
async function cancelOrderById(req, res) {
    const user = req.user;
    const orderId = req.params.id;
    try {
        const order = await orderModel.findById(orderId);  
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }    
        if(order.user.toString() !== user.id){
            return res.status(403).json({message:"Forbidden"})
        }
        
        // Only allow cancellation for PENDING or CONFIRMED status
        if (!["PENDING", "CONFIRMED"].includes(order.status)) {
            return res.status(409).json({ 
                message: `Cannot cancel order with status ${order.status}. Only PENDING or CONFIRMED orders can be cancelled.` 
            });
        }
        
        order.status = "CANCELLED";
        await order.save();
        res.json({ message: "Order cancelled successfully", order });
    } catch (err) {
        res.status(500).json({ message: "Internal server error", error: err.message });
    }    
}

async function updateOrderAddress(req, res) {
    const user = req.user;
    const orderId = req.params.id;
    try {
        const order = await orderModel.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        if (order.user.toString() !== user.id) {
            return res.status(403).json({ message: "Forbidden" });
        }
        
        // Only allow address update for PENDING status (before payment capture)
        if (order.status !== "PENDING") {
            return res.status(409).json({ 
                message: `Cannot update address for order with status ${order.status}. Address can only be updated for PENDING orders.` 
            });
        }
        
        order.shippingAddress = {
            ...order.shippingAddress,
            ...req.body.shippingAddress
        };
        await order.save();
        res.json({ message: "Order address updated successfully", order });
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