const productModel = require('../models/product.model');
const { uploadImage } = require('../services/imagekit.service');
const mongoose = require('mongoose');



// Accepts multipart/form-data with fields: title, description, productAmount, images[] (files)
async function createProduct(req, res) {
    try {
        const { title, description, productAmount, priceAmount } = req.body;
        const seller = req.user.id; // Extract seller from authenticated user

        const amountValue =
            (typeof productAmount === 'object' ? productAmount?.amount : productAmount) ??
            req.body['productAmount.amount'] ??
            req.body['productAmount[amount]'] ??
            (typeof priceAmount === 'object' ? priceAmount?.amount : priceAmount) ??
            req.body['priceAmount.amount'] ??
            req.body['priceAmount[amount]'];

        const currencyValue =
            (typeof productAmount === 'object' && productAmount?.currency) ||
            req.body['productAmount.currency'] ||
            req.body['productAmount[currency]'] ||
            (typeof priceAmount === 'object' && priceAmount?.currency) ||
            req.body['priceAmount.currency'] ||
            req.body['priceAmount[currency]'] ||
            req.body.productCurrency ||
            req.body.priceCurrency ||
            'INR';

        const productAmountPayload = {
            amount: Number(amountValue),
            currency: currencyValue,
        };

        const images = await Promise.all(
            (req.files || []).map(async (file) => {
                const uploaded = await uploadImage({ buffer: file.buffer, filename: file.originalname });
                return {
                    url: uploaded.url,
                    thumbnail: uploaded.thumbnailUrl,
                    id: uploaded.fileId,
                };
            })
        );


        const product = await productModel.create({ title, description, productAmount: productAmountPayload, seller, images });

        return res.status(201).json({
            message: 'Product created',
            data: product,
        });
    } catch (err) {
        console.error('Create product error', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
}


async function getProducts(req, res) {

    const { q, minprice, maxprice, skip = 0, limit = 20 } = req.query;


    const filter = {}

    if (q) {
        filter.$text = { $search: q }
    }

    if (minprice) {
        filter[ 'productAmount.amount' ] = { ...filter[ 'productAmount.amount' ], $gte: Number(minprice) }
    }

    if (maxprice) {
        filter[ 'productAmount.amount' ] = { ...filter[ 'productAmount.amount' ], $lte: Number(maxprice) }
    }

    const products = await productModel.find(filter).skip(Number(skip)).limit(Math.min(Number(limit), 20));

    return res.status(200).json({ data: products });


}


async function getProductById(req, res) {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid product id' });
    }

    const product = await productModel.findById(id);

    if (!product) {
        return res.status(404).json({ message: 'Product not found' });
    }

    return res.status(200).json({ data: product });
}

async function updateProduct(req, res) {

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid product id' });
    }

    const product = await productModel.findOne({
        _id: id,
    })


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
    return res.status(200).json({ message: 'Product updated', product });
}

async function deleteProduct(req, res) {

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid product id' });
    }

    const product = await productModel.findOne({
        _id: id,
    })

    if (!product) {
        return res.status(404).json({ message: 'Product not found' });
    }

    if (product.seller.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Forbidden: You can only delete your own products' });
    }

    await productModel.findOneAndDelete({ _id: id });
    return res.status(200).json({ message: 'Product deleted' });

}

async function getProductsBySeller(req, res) {

    const seller = req.user

    const { skip = 0, limit = 20 } = req.query;

    const products = await productModel.find({ seller: seller.id }).skip(skip).limit(Math.min(limit, 20));

    return res.status(200).json({ data: products });
}

module.exports = { createProduct, getProducts, getProductById, updateProduct, deleteProduct, getProductsBySeller };