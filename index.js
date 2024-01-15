//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const multer = require("multer");
const GridFsStorage = require("multer-gridfs-storage");
const Grid = require("gridfs-stream");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");
const session = require("express-session");
const mongoStore = require("connect-mongo");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
var fs = require('fs');
var path = require('path');

const app = express();

app.use(express.static("public")); 
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false
  }));


//Multer Implementation Starts
var storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images/cakes')
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname + Date.now)
    }
});

var upload = multer({ storage: storage });
//Multer Implementation Ends


//CREATE A MONGOOSE CONNECTION
mongoose.connect(
    process.env.DB_URL
);

// CREATE AN ORDER SCHEMA
const orderSchema = new mongoose.Schema({
    orderCode:String,
    customerName:String,
    customerContact:String,
    customerEmail:String,
    orderTotal:Number,
    orderDiscount:Number,
    orderItems: [
        {
            type:String,
        }
    ]
});

// CREATE A PRODUCT SCHEMA
const productSchema = new mongoose.Schema({
    productCode:String,
    productName:String,
    productDescription:String,
    productPrice:Number,
    productDiscount:Number,
    productNetPrice:Number,
    img:
    {
        data: Buffer,
        contentType: String
    }

});

//Assign product code
var productCodeVar = 1000;

// const order = new mongoose.model("Order", orderSchema);

//Create an object model for the product Cake
const Cake = new mongoose.model("Cake", productSchema);

// Root GET request
app.get("/", async function(req,res){
    try {
        const cakeData = await Cake.find({});
        // console.log(cakeData)
        req.session.cart = req.session.cart || [];
        const cart = req.session.cart || [];
        res.render('index',{cakeData,cart});
    } catch (error) {
        console.log(error)
        res.render('addCake');
    }
})

app.get("/admin", function(req,res){
    res.render("admin");
})
app.get("/addCake", async function(req,res){
    try {
        const cakeData = await Cake.find({ });
        // console.log(cakeData)
    res.render('addCake',{cakeData});
    } catch (error) {
        console.log(error)
        res.render('addCake');
    }
    
    });

app.post("/cart/add", function(req,res){
    const itemId = req.body.itemCode;
    console.log(itemId);
     // Access or create cart session
  const cart = req.session.cart || [];

  // Check if item already exists
  if (!cart.some(item => item.id === itemId)) {
    cart.push({ id: itemId, quantity: 1 }); // Adjust quantity as needed
  } else {
    // Handle item already in cart (e.g., increment quantity)
  }

  req.session.cart = cart;

    res.json({ success: true, message: 'Item added to cart', cart });
})

app.post("/updateCake", async function(req,res){
    try {
        console.log(req.body.productDescription)
        const originalCake = await Cake.findOne({productCode: req.body.productCode})
        console.log(originalCake.productName)

        const update = {};
        for (const property in req.body) {
            if (req.body[property] !== originalCake[property] && req.body[property] !== "") {
                update[property] = req.body[property];
            }
        }        
        console.log(update);
        const filter = {productCode: req.body.productCode};
        const updateCake = await Cake.findOneAndUpdate(filter,update)
        res.redirect("/addCake");
    } catch (error) {
        console.log(error);
    }
});

app.post("/deleteCake", async function(req,res){
    try {

        const deletedCake = await Cake.findOneAndDelete({productCode: req.body.productCode});
        console.log("Deleted Cake : "+ deletedCake);
        
        res.redirect("/addCake");
    } catch (error) {
        console.log(error);
    }
});


app.post("/addCake", upload.single('upload'), function(req,res){
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }
    async function addProduct() {
        try {
          // Create a new product instance
          const newProduct = new Cake({
              productName: req.body.cName,
              productCode: productCodeVar,
              productDescription: req.body.cDescription,
              productPrice: req.body.cPrice,
              productDiscount: req.body.cDiscount,
              productNetPrice: 0,
              img: {
                data: fs.readFileSync(path.join('public/images/cakes', req.file.filename)),
                contentType: 'image/png'
            }
            
            });
            productCodeVar= productCodeVar + 10;
          // Save the product to the database
          const savedProduct = await newProduct.save();
          console.log('Product saved successfully:', savedProduct);
        } catch (error) {
          console.error('Error saving product:', error);
        } finally {
          // Close the MongoDB connection when done
          
        }
      }
      
      // Call the function to add the product
      addProduct();
      res.redirect("/addCake")
})

app.listen(process.env.PORT || 3000, () => {
    console.log("Server has started on port");
})