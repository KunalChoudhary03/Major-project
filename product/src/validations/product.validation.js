const { body, validationResult } = require('express-validator');


function handleValidationErrors(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Validation error', errors: errors.array() });
    }
    next();
}

const createProductValidators = [
    body('title')
        .isString()
        .trim()
        .notEmpty()
        .withMessage('title is required'),
    body('description')
        .optional()
        .isString()
        .withMessage('description must be a string')
        .trim()
        .isLength({ max: 500 })
        .withMessage('description max length is 500 characters'),
    body('productAmount')
        .custom((value, { req }) => {
            const amountValue =
                (typeof value === 'object' && value !== null ? value.amount : value) ??
                req.body['productAmount.amount'] ??
                req.body['productAmount[amount]'] ??
                req.body?.priceAmount?.amount ??
                req.body?.priceAmount ??
                req.body['priceAmount.amount'] ??
                req.body['priceAmount[amount]'];

            if (amountValue === undefined || amountValue === null || amountValue === '') {
                throw new Error('productAmount.amount is required');
            }

            if (Number.isNaN(Number(amountValue)) || Number(amountValue) <= 0) {
                throw new Error('productAmount.amount must be a number > 0');
            }

            return true;
        }),
    body('productAmount.currency')
        .optional()
        .custom((value, { req }) => {
            const currencyValue =
                value ??
                req.body['productAmount.currency'] ??
                req.body['productAmount[currency]'] ??
                req.body?.priceAmount?.currency ??
                req.body['priceAmount.currency'] ??
                req.body['priceAmount[currency]'] ??
                req.body.productCurrency ??
                req.body.priceCurrency;

            if (currencyValue === undefined || currencyValue === null || currencyValue === '') {
                return true;
            }

            if (![ 'USD', 'INR' ].includes(currencyValue)) {
                throw new Error('productAmount.currency must be USD or INR');
            }

            return true;
        }),
    handleValidationErrors
];



module.exports = createProductValidators;
module.exports.createProductValidators = createProductValidators;