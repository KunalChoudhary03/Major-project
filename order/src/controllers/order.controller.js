const orderModel = require("../models/order.model");

async function createOrder(req, res) {
     const user = req.user;
     const token = req.cookies?.token || req.headers?.authorization?.split(' ')[1];

     try{
      const cartResponse = await axios.get(`http://localhost:3002/api/cart`,{
          headers:{
               Authorization: `Bearer ${token}`
          }
      })
      console.log("Cart response:",cartResponse.data);
     }
     catch(error){
          console.error("Error fetching cart data:", error);
          res.status(500).json({message:"Internal Server Error",error})
     }
}


module.exports = {
     createOrder
}