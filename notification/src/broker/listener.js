const {subscribeToQueue} = require('./broker');
const sendEmail = require('../email');

module.exports =  function (){
  subscribeToQueue("AUTH_NOTIFICATION.USER_CREATED",async(data)=>{
    console.log('Received USER_CREATED data:', JSON.stringify(data, null, 2));
    
    // Validate data structure
    if (!data || !data.email) {
      console.error('Error: Missing email in USER_CREATED data:', data);
      return;
    }
    
    const username = data.username || 'User';
    const  emailHTMLTemplate = `
   <h1>Welcome to our Services</h1>
   <p>Hi ${username},
   </p>
   <p>Thank you for signing up. We're excited to have you on board.</p>
   <p>Best regards,<br/>The Team</p>
   `
    try {
      await sendEmail(data.email,"Welcome to our platform!",`Welcome to our platform, ${username}!`,emailHTMLTemplate);
    } catch (error) {
      console.error('Failed to send welcome email:', error.message);
    }
  })
  subscribeToQueue("PAYMENT_NOTIFICATION.PAYMENT_COMPLETED", async(data)=>{
    console.log('Received PAYMENT_COMPLETED data:', JSON.stringify(data, null, 2));
    
    // Validate data structure
    if (!data || !data.email) {
      console.error('Error: Missing email in PAYMENT_COMPLETED data:', data);
      return;
    }
    
    const username = data.username || 'Customer';
    const amount = data.amount || '0';
    const emailHTMLTemplate = `
    <h1>Payment Successful</h1>
    <p>Hi ${username},
    </p>
    <p>Your payment of $${amount} has been successfully processed. Thank you for your purchase!</p>
    <p>Best regards,<br/>The Team</p>
    `
    try {
      await sendEmail(data.email,"Payment Confirmation",`Your payment of $${amount} has been successfully processed.`,emailHTMLTemplate);
    } catch (error) {
      console.error('Failed to send payment confirmation email:', error.message);
    }
  })
  subscribeToQueue("PAYMENT_NOTIFICATION.PAYMENT_FAILED", async(data)=>{
    console.log('Received PAYMENT_FAILED data:', JSON.stringify(data, null, 2));
    
    // Validate data structure
    if (!data || !data.email) {
      console.error('Error: Missing email in PAYMENT_FAILED data:', data);
      return;
    }
    
    const username = data.username || 'Customer';
    const amount = data.amount || '0';
    const emailHTMLTemplate = `
    <h1>Payment Failed</h1>
    <p>Hi ${username},
    </p>
    <p>Unfortunately, your payment of $${amount} could not be processed. Please try again or contact support for assistance.</p>
    <p>Best regards,<br/>The Team</p>
    `
    try {
      await sendEmail(data.email,"Payment Failed",`Unfortunately, your payment of $${amount} could not be processed. Please try again.`,emailHTMLTemplate);
    } catch (error) {
      console.error('Failed to send payment failed email:', error.message);
    }
  })
}
