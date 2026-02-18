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
}
