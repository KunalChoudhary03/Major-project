const {subscribeToQueue} = require('./broker');
const sendEmail = require('../email');

module.exports =  function (){
  subscribeToQueue("AUTH_NOTIFICATION.USER_CREATED",async(data)=>{
   const  emailHTMLTemplate = `
   <h1>Welcome to our Services</h1>
   <p>Hi ${data.fullName.firstName + " " +  (data.fullName.lastName || " ")},
   </p>
   <p>Thank you for signing up. We're excited to have you on board.</p>
   <p>Best regards,<br/>The Team</p>
   `
    await sendEmail(data.email,"Welcome to our platform!",`Welcome to our platform, ${data.name}!`,emailHTMLTemplate);
  })
  subscribeToQueue("PAYMENT_NOTIFICATION.PAYMENT_COMPLETED", async(data)=>{
    const emailHTMLTemplate = `
    <h1>Payment Successful</h1>
    <p>Hi ${data.fullName.firstName},
    </p>
    <p>Your payment of $${data.amount} has been successfully processed. Thank you for your purchase!</p>
    <p>Best regards,<br/>The Team</p>
    `
     await sendEmail(data.email,"Payment Confirmation",`Your payment of $${data.amount} has been successfully processed.`,emailHTMLTemplate);
  })
  subscribeToQueue("PAYMENT_NOTIFICATION.PAYMENT_FAILED", async(data)=>{
    const emailHTMLTemplate = `
    <h1>Payment Failed</h1>
    <p>Hi ${data.fullName.firstName},
    </p>
    <p>Unfortunately, your payment of $${data.amount} could not be processed. Please try again or contact support for assistance.</p>
    <p>Best regards,<br/>The Team</p>
    `
     await sendEmail(data.email,"Payment Failed",`Unfortunately, your payment of $${data.amount} could not be processed. Please try again.`,emailHTMLTemplate);
  })
}
