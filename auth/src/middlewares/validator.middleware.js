const {body, validationResult} = require('express-validator');
const { errors } = require('mongodb-memory-server');

const respondWithValidationErrors = (req,res,next)=>{
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        return res.status(400).json({errors:errors.array()});
    }  
    next(); 
}

const registerUserValidation = [
    body("username")
    .isString()
    .withMessage("Username must be a string")
    .isLength({min:3})
    .withMessage("username must be at least 3 characters long"),
    body("email")
    .isEmail()
    .withMessage("Invalid email address"),
    body("password")
    .isLength({min:6})
    .withMessage("Password must be at least 6 characters long"),
    body("fullName.firstName")
    .isString()
    .withMessage("First name must be a string")
    .notEmpty()
    .withMessage("First name is required"),
    body("fullName.lastName")
    .isString()
    .withMessage("Last name must be a string")
    .notEmpty()
    .withMessage("Last name is required"),
    respondWithValidationErrors
]
const loginUserValidation = [
        body("email")
            .isEmail()
            .withMessage("Invalid email address"),
        body("password")
            .isLength({ min: 6 })
            .withMessage("Password must be at least 6 characters long"),
        respondWithValidationErrors
]

const addUserAddressValidations = [
    body("street")
        .isString()
        .withMessage("Street must be a string")
        .notEmpty()
        .withMessage("Street is required"),
    body("city")
        .isString()
        .withMessage("City must be a string")
        .notEmpty()
        .withMessage("City is required"),
    body("state")
        .isString()
        .withMessage("State must be a string")
        .notEmpty()
        .withMessage("State is required"),
    body("postalCode")
        .isString()
        .withMessage("Postal code must be a string")
        .notEmpty()
        .withMessage("Postal code is required"),
    body("country")
        .isString()
        .withMessage("Country must be a string")
        .notEmpty()
        .withMessage("Country is required"),
    respondWithValidationErrors
]

module.exports = {
        registerUserValidation,
        loginUserValidation,
        addUserAddressValidations
}