const { body, validationResult } = require("express-validator")

const respondWithValidationErrors = (req,res,next)=>{
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        return res.status(400).json({
            message: "Validation error",
            errors: errors.array()
        });
    }  
    next(); 
}

const createOrderValidation = [
    body("shippingAddress.street")
        .trim()
        .notEmpty()
        .withMessage("Street is required")
        .isString()
        .withMessage("Street must be a string")
        .escape(),
    body("shippingAddress.city")
        .trim()
        .notEmpty()
        .withMessage("City is required")
        .isString()
        .withMessage("City must be a string")
        .escape(),
    body("shippingAddress.state")
        .trim()
        .notEmpty()
        .withMessage("State is required")
        .isString()
        .withMessage("State must be a string")
        .escape(),
    body("shippingAddress.pincode")
        .trim()
        .notEmpty()
        .withMessage("Pincode is required")
        .matches(/^[A-Za-z0-9]{4,10}$/)
        .withMessage("Invalid pincode format"),
    body("shippingAddress.country")
        .trim()
        .notEmpty()
        .withMessage("Country is required")
        .isString()
        .withMessage("Country must be a string")
        .escape(),
    body("shippingAddress.isDefault")
        .optional()
        .isBoolean()
        .withMessage("isDefault must be a boolean"),
    respondWithValidationErrors
]
const updateAddressValidation = [
    body("shippingAddress.street")
        .optional()     
        .isString()
        .withMessage("Street must be a string")
        .notEmpty()
        .withMessage("Street cannot be empty"),
    body("shippingAddress.city")
        .optional()
        .isString()
        .withMessage("City must be a string")
        .notEmpty()
        .withMessage("City cannot be empty"),
    body("shippingAddress.state")
        .optional()
        .isString()
        .withMessage("State must be a string")
        .notEmpty()
        .withMessage("State cannot be empty"),
    body("shippingAddress.pincode")
        .optional()
        .matches(/^[A-Za-z0-9]{4,10}$/)
        .withMessage("Invalid pincode format"),
    body("shippingAddress.country")
        .optional()
        .isString()
        .withMessage("Country must be a string")
        .notEmpty()
        .withMessage("Country cannot be empty"),
    body("shippingAddress.isDefault")
        .optional()
        .isBoolean()
        .withMessage("isDefault must be a boolean"),
    respondWithValidationErrors
]
module.exports = {
    createOrderValidation,
    updateAddressValidation,
    respondWithValidationErrors
}