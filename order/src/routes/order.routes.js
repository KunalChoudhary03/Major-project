const express = require('express');
const  createAuthMiddleware = require('../middleware/auth.middleware')
const router = express.Router();
const orderController = require("../controllers/order.controller")


router.post('/', createAuthMiddleware(["user"]), orderController.createOrder)

module.exports = router;