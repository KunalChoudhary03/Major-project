const express = require('express');
const { authMiddleware } = require('../middlewares/auth.middleware');
const cartController = require('../controllers/cart.controller');
const validation = require('../middlewares/validation.middleware');
const router = express.Router();

router.get("/", authMiddleware(["user"]),
cartController.getCart)

router.post("/items", validation.validateAddItemToCart, authMiddleware(["user"]),
cartController.addItemToCart)

router.patch("/items/:productId", validation.validateUpdateItemQuantity, authMiddleware(["user"]),
cartController.updateItemQuantity)

module.exports = router;