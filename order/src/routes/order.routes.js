const express = require('express');
const  createAuthMiddleware = require('../middleware/auth.middleware')
const router = express.Router();
const orderController = require("../controllers/order.controller")
const validation = require("../middleware/validation.middleware")

router.post('/', createAuthMiddleware(["user"]), validation.createOrderValidation, orderController.createOrder)

module.exports = router;