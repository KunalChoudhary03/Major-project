const Product = require('../models/product.model');
const { uploadImage } = require('../services/imagekit.service');
const mongoose = require('mongoose');



// Accepts multipart/form-data with fields: title, description, productAmount[amount], productAmount[currency], images[] (files)
exports.createProduct = async (req, res) => {
    try {
        const { title, description } = req.body;
        const seller = req.user.id;

        // Parse productAmount from FormData (handles both bracket notation and JSON)
        let productAmount;
        if (req.body['productAmount[amount]']) {
            // Handle FormData bracket notation: productAmount[amount] and productAmount[currency]
            productAmount = {
                amount: parseFloat(req.body['productAmount[amount]']),
                currency: req.body['productAmount[currency]'] || 'INR'
            };
        } else if (typeof req.body.productAmount === 'string') {
            // Handle JSON string
            try {
                productAmount = JSON.parse(req.body.productAmount);
            } catch (e) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Invalid productAmount format' 
                });
            }
        } else if (req.body.productAmount && typeof req.body.productAmount === 'object') {
            // Handle direct object (from JSON body)
            productAmount = req.body.productAmount;
        } else {
            // No productAmount provided at all
            return res.status(400).json({
                success: false,
                message: 'productAmount is required'
            });
        }

        // Validate productAmount
        if (!productAmount.amount || productAmount.amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Valid productAmount with amount > 0 is required'
            });
        }

        // Upload images to ImageKit
        let images = [];
        if (req.files && req.files.length > 0) {
            const uploadedImages = await Promise.all(
                req.files.map(async (file) => {
                    const uploadResponse = await uploadImage({
                        buffer: file.buffer,
                        filename: file.originalname,
                    });
                    return uploadResponse;
                })
            );
            images = uploadedImages;
        }

        // Create product in database
        const product = new Product({
            title,
            description: description || '',
            productAmount,
            seller,
            images,
        });

        await product.save();

        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            product,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error creating product',
            error: error.message,
        });
    }
};


// Get all products
exports.getProducts = async (req, res) => {
    try {
        const { q, minprice, maxprice, skip = 0, limit = 20 } = req.query;

        const filter = {};

        if (q) {
            filter.$text = { $search: q };
        }

        if (minprice) {
            filter['productAmount.amount'] = { ...filter['productAmount.amount'], $gte: Number(minprice) };
        }

        if (maxprice) {
            filter['productAmount.amount'] = { ...filter['productAmount.amount'], $lte: Number(maxprice) };
        }

        const products = await Product.find(filter).skip(Number(skip)).limit(Math.min(Number(limit), 20));

        return res.status(200).json({ 
            success: true,
            products 
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching products',
            error: error.message,
        });
    }
};


exports.getProductById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid product id' });
        }

        const product = await Product.findById(id);

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        return res.status(200).json({ success: true, product });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching product', error: error.message });
    }
};

exports.updateProduct = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid product id' });
        }

        const product = await Product.findOne({ _id: id });

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        if (product.seller.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Forbidden: You can only update your own products' });
        }

        const allowedUpdates = [ 'title', 'description', 'productAmount' ];
        for (const key of Object.keys(req.body)) {
            if (allowedUpdates.includes(key)) {
                if (key === 'productAmount' && typeof req.body.productAmount === 'object') {
                    if (req.body.productAmount.amount !== undefined) {
                        product.productAmount.amount = Number(req.body.productAmount.amount);
                    }
                    if (req.body.productAmount.currency !== undefined) {
                        product.productAmount.currency = req.body.productAmount.currency;
                    }
                } else {
                    product[ key ] = req.body[ key ];
                }
            }
        }
        await product.save();
        return res.status(200).json({ success: true, message: 'Product updated', product });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error updating product', error: error.message });
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid product id' });
        }

        const product = await Product.findOne({ _id: id });

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        if (product.seller.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Forbidden: You can only delete your own products' });
        }

        await Product.findOneAndDelete({ _id: id });
        return res.status(200).json({ success: true, message: 'Product deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error deleting product', error: error.message });
    }
};

exports.getProductsBySeller = async (req, res) => {
    try {
        const seller = req.user;
        const { skip = 0, limit = 20 } = req.query;

        const products = await Product.find({ seller: seller.id }).skip(Number(skip)).limit(Math.min(Number(limit), 20));

        return res.status(200).json({ success: true, products });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching products', error: error.message });
    }
};