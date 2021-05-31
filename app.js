require("dotenv").config()
const express=require("express")
const app=express();
const fs=require("fs")
const session=require("express-session");
const mongoose=require("mongoose");
const Product=require("./modules/product")
const User=require("./modules/user")
const cors=require("cors")
const isLoged=(req,res,next)=>{
    if(req.session.userid){
        const {userid}=req.session
        if(mongoose.Types.ObjectId.isValid(userid)){
            next()
        }
        else{
            res.send("user is not valid")
        }
    }else{
         new User({items:[],total:0}).save((err,ress)=>{
             req.session.cookie.maxAge=1000*60*60*24 //1day
             req.session.userid=ress._id
             next()
         })
       
    }
}
mongoose.connect(process.env.DB_PATH,{ useUnifiedTopology: true ,useNewUrlParser: true },(err)=>{
    if(!err){
        console.log("connected to db")
    }else{
        throw err
    }
})
app.use(cors({
    origin:process.env.ORIGIN,
    credentials:true,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    preflightContinue: false
}))
app.use(session({
    name:process.env.COOKIE_NAME,
    secret:process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized:false,
    
}))
app.use(isLoged)
// return all products
app.get("/products",async(req,res)=>{
    let collection= await Product.find({},{__v:0,description:0})
    res.send(collection)
})
// return a product
app.get("/products/:id",async(req,res)=>{
    let {id}= req.params;
    if(mongoose.Types.ObjectId.isValid(id)){
        let collection= await Product.findById(id,{__v:0})
        res.send(collection)
    }
    else{
        res.send({message:"product does not exist"})
    }
})
app.get("/cart",async(req,res)=>{
    const {userid}=req.session
    const user=await User.findById(userid,{__v:0,_id:0})
    if(user.items.length===0){
        res.send([])
    }else{
        let cart={}
        const items= user.items.map(async(item,i)=>{
            let product=await Product.findOne({_id:item.id},{__v:0,description:0,rate:0})
            return{
                id:item.id,
                title:product.title,
                image:product.image,
                price:product.price,
                quantity:item.quantity
               }
        })
        Promise.all(items).then(re=>{
            cart.items=re
            cart.total=(user.total).toFixed(2)
            res.send(cart)
        })
        
        
    }
})
app.get("/addtocart/:id",async(req,res)=>{
    const {userid}=req.session
    const {id}=req.params
    
    const user= await User.findById(userid,{__v:0,_id:0})
    const product =await Product.findById(id,{__v:0,rate:0,description:0})
    let itemCart={
     id:id,
     title:product.title,
     image:product.image,
     price:product.price,
     quantity:null,
     total:null
    }
    
    if(user.items.length===0){
        itemCart.quantity=1
        itemCart.total=(itemCart.price).toFixed(2)
        await User.updateOne({_id:userid},{items:[{id:id,quantity:itemCart.quantity}],total:itemCart.total})
        res.send(itemCart)
    }else{
        const isincart=user.items.filter(item=>{return item.id===id})
        let cart=user.items.map(item=>{
            return item
        });
        itemCart.total=(user.total+itemCart.price).toFixed(2)
        if(isincart.length!==0){
            itemCart.quantity=isincart[0].quantity+1
            cart=cart.map(item=>{
                if(item.id===id){
                    return {id:id,quantity:itemCart.quantity}
                }
                else{
                    return item
                }
            })
        }else{
            itemCart.quantity=1
            cart.push({id:id,quantity:itemCart.quantity})
        }
        Promise.all(cart).then(async(re)=>{await User.updateOne({_id:userid},{ $set:{"items":re},total:itemCart.total})})
        res.send(itemCart)
    }
})
app.get("/removecart/:id",async(req,res)=>{
    const {userid}=req.session
    const {id}=req.params
    const user= await User.findById(userid,{__v:0,_id:0})
    const product =await Product.findById(id,{__v:0,rate:0,description:0})
    let itemCart={
        id:id,
        title:product.title,
        image:product.image,
        price:product.price,
        quantity:null,
        total:null
    }
    if(user.items.length===0){
        res.send({message:"empty"})
    }else{
        const isincart=user.items.filter(item=>{return item.id===id})
        let cart=user.items.map(item=>{
            return item
        });
        if(isincart.length!==0){
            itemCart.total=(user.total-itemCart.price).toFixed(2)
            if(isincart[0].quantity===1){
                cart=cart.filter(item=>{return item.id!==id})
                Promise.all(cart).then(async(re)=>{await User.updateOne({_id:userid},{ $set:{"items":re},total:itemCart.total})})
                res.send({message:"deleted",total:itemCart.total,id:id})
            }
            else{
                itemCart.quantity=isincart[0].quantity-1
                cart=cart.map(item=>{
                if(item.id===id){
                    return {id:id,quantity:itemCart.quantity}
                }
                else{
                    return item
                }
                })
                Promise.all(cart).then(async(re)=>{await User.updateOne({_id:userid},{ $set:{"items":re},total:itemCart.total})})
                res.send(itemCart)
            }
        }
        else{
            res.send({message:"item does not exist"})
        }
    }

})
// if client get res that means server is runing
// otherwise in client shows 503 code 
app.get("/status",(req,res)=>{

    res.send({status:"server is working"})
})
// add data to db 
async function add(){
    let collection= await Product.find({})
    if(collection.length===0){
    fs.readFile("data.json","utf-8",(err,data)=>{
        let parse=JSON.parse(data)
        Product.insertMany(parse,(errr)=>{
            if(errr){
                console.log(errr)
            }
        })
    })
    }
}
add()
app.listen(process.env.PORT,()=>{console.log("server is runing on "+process.env.PORT)})