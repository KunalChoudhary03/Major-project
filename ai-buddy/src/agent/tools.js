const { tool } = require("@langchain/core/tools")
const {z} = require("zod")
const axios = require("axios")

const searchProduct = tool(async (query,token)=>{
 console.log("Search Product called with data:",{query,token})
const response = await axios.get(`http://localhost:3001/api/products/search?q=${query}`,{
    headers: {
        Authorization: `Bearer ${token}`
    }
})
return JSON.stringify(response.data)
},{
     name: "searchProduct",
        description: "Search for a product in the based on query",
     schema: z.object({
            query: z.string().describe("The search query for the products")
        })
})


const addProductToCart = tool(async ({productId,qty=1,token}) => {
    const response = await axios.post("http://localhost:3001/api/cart/items",{
        productId,
        qty
    },{
        headers: {
            Authorization: `Bearer ${token}`
        }
    })
    return JSON.stringify(response.data)
},{
    name: "addProductToCart",
    description:"Add a product to the shopping cart",
    inputSchema:z.object({
        productId: z.string().describe("The ID of the product to add to the cart"),
        qty: z.number().describe("The quantity of the product to add to the cart")
    })
})


module.exports = {
    searchProduct,
    addProductToCart
}