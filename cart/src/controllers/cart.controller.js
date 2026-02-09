const cartModel = require('../models/cart.model');

async function getCart(req, res) {
 const user = req.user;
 let cart  = await cartModel.findOne({user:user._id});
    if(!cart){ 
        cart = new cartModel({user:user.id,items:[]});
        await cart.save();
     }
     const itemCount = cart.items.length;
     const totalQuantity = cart.items.reduce((sum,item) => sum + item.quantity, 0);
     
     res.status(200).json({
        _id: cart._id,
        user: cart.user,
        items: cart.items,
        totals:{
            itemCount,
            subtotal: 0
        }
     });
}

async function addItemToCart(req,res){
 const {productId,qty} = req.body;

 const user = req.user

 let cart = await cartModel.findOne({user:user._id,items:[]})
 if(!cart){
     cart = new cartModel({user:user._id,items:[]});
    }
    const existingItemIndex = cart.items.findIndex(item => item.productId.toString() === productId);
    
    if(existingItemIndex >=0){
        cart.items[existingItemIndex].quantity += qty;
    }else{
        cart.items.push({
            productId,
            quantity:qty
        });
    }
    await cart.save();
    return res.status(200).json({message:"Item added to cart successfully",cart});

}

async function updateItemQuantity(req, res) {
  const { productId } = req.params;
  const { qty } = req.body;
  const user = req.user;

  try {
    let cart = await cartModel.findOne({ user: user._id });
    
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);
    
    if (itemIndex < 0) {
      return res.status(404).json({ message: "Item not found in cart" });
    }

    if (qty <= 0) {
      cart.items.splice(itemIndex, 1);
    } else {
      cart.items[itemIndex].quantity = qty;
    }

    await cart.save();
    return res.status(200).json({ message: "Item quantity updated successfully", cart });
  } catch (error) {
    return res.status(500).json({ message: "Error updating item quantity", error: error.message });
  }
}

module.exports = {
    getCart,
    addItemToCart,
    updateItemQuantity
}