const paymentModel = require('../models/payment.model');
const Razorpay = require('razorpay');
const {publishToQueue} = require('../broker/broker');
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

async function createPayment(req, res) {
    const token = req.cookies?.token || req.headers?.authorization?.split(' ')[ 1 ];
    try{
        const orderId  = req.params.orderId
        const orderResponse = await fetch ("http://localhost:3003/api/orders/" + orderId,{
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        const orderData = await orderResponse.json();
        const price  = orderData.order.totalPrice;
          const order = await razorpay.orders.create(price);
          const payment = new paymentModel({
            order: orderId,
            razorpayOrderId: order.id,
            user: req.user.id,
            price: {
                amount: order.amount,
                currency: order.currency 
            }
          })
              await payment.save();

             
          res.status(201).json({
            message: 'Payment initiated successfully',
            payment
          })
    }
    catch(err){
        console.log(err);

        
        res.status(500).json({
            message: 'Internal Server Error',
            error: err.message
        })
    }
}

async function verifyPayment(req, res) {
    const { paymentId, razorpayOrderId, signature } = req.body;
     const secret = process.env.RAZORPAY_KEY_SECRET
     try{
         const { validatePaymentVerification } = require('../../node_modules/razorpay/dist/utils/razorpay-utils.js')

         const isValid = validatePaymentVerification({
            order_id: razorpayOrderId,
           payment_id: paymentId,
         },signature,secret)

         if (!isValid) {
            return res.status(400).json({
                message: 'Invalid payment signature',
            })
         }
            const payment = await paymentModel.findOne({ razorpayOrderId, status:  'PENDING' });
            if(!payment) {
 return res.status(404).json({
                message: 'Payment not found ',
 })
}
            // Use a valid enum value from schema ('SUCCESS') instead of 'COMPLETED'
            const update = {
                status: 'SUCCESS',
                razorpayPaymentId: paymentId,
                paymentId: paymentId,
                signature: signature
            };

            // Log missing required fields for operator awareness
            const missing = {
                order: !!payment.order,
                user: !!payment.user,
                priceAmount: payment.price ? payment.price.amount : undefined
            };
            if (!payment.order || !payment.user || !payment.price || typeof payment.price?.amount !== 'number') {
                console.log('Payment document is missing required fields (will still update non-required fields):', missing);
            }

            // Update without running validators to avoid Mongoose validation errors on incomplete docs
            await paymentModel.updateOne({ _id: payment._id }, { $set: update }, { runValidators: false });
           
             await publishToQueue("PAYMENT_NOTIFICATION.PAYMENT_COMPLETED", {
                email: req.user.email,
                orderId: orderId,
                paymentId: payment.paymentId,
                amount: payment.price.amount / 100,
                currency: payment.price.currency
              });
            const updated = await paymentModel.findById(payment._id).lean();
            
            res.status(200).json({ message: 'Payment verified successfully', payment: updated });
     }catch(err){
        console.log(err);
        await publishToQueue("PAYMENT_NOTIFICATION.PAYMENT_FAILED", {
            email: req.user.email,
            orderId: razorpayOrderId,
            paymentId: paymentId,
        });
        res.status(500).json({
            message: 'Internal Server Error',
            error: err.message
        })
     }
}


module.exports = {
    createPayment, verifyPayment
}