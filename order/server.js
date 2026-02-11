const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") })
const app = require("./src/app")
const connectDB = require("./src/db/db")

connectDB();

app.listen(3003,()=>{
    console.log("Server is running on port 3003")
})
