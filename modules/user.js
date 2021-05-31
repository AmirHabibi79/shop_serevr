const mongoose=require("mongoose")

const userSchema=new mongoose.Schema({
    items:[ {
        id:String,
        quantity:Number
       }],
    total:Number
})

module.exports=mongoose.model("User",userSchema)