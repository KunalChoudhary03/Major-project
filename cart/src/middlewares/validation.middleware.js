const {body,validationResult} = require('express-validator');
const mongoose = require('mongoose');


function validateResult(req,res,next){
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        return res.status(400).json({errors:errors.array()});
    }
    next();
}

const validateAddItemToCart = [
    body('productId').isString().withMessage('productId must be a string').custom(value => mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid productId format'),
    body("qty").isInt({gt:0}).withMessage("quantity must be an integer greater than 0"),
    validateResult,
]

const validateUpdateItemQuantity = [
    body("qty").isInt({min:0}).withMessage("quantity must be an integer greater than or equal to 0"),
    validateResult,
]

module.exports = {
    validateAddItemToCart,
    validateUpdateItemQuantity
}