const express = require('express');
const multer = require('multer');
const productController = require('../controllers/product.controller');
const createAuthMiddleware = require('../middlewares/auth.middleware');
const createProductValidators = require('../validations/product.validation');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Extract validators and error handler
const validators = Array.isArray(createProductValidators) ? createProductValidators : [];

// POST /api/products - Create a new product with images
router.post('/', 
  createAuthMiddleware(["admin","seller"]), 
  upload.array('images',5),
  ...validators,
  productController.createProduct
);

// GET /api/products - Get all products
router.get('/', productController.getProducts);

module.exports = router;