const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const twilio = require("twilio");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");

dotenv.config();
const app = express();

app.use(bodyParser.json());
app.use(cors());

let date = new Date().toISOString().slice(0, 10);

const accountSid = process.env.ACCOUNTSID;
const authToken = process.env.AUTHTOKEN;
const twiliono = process.env.TWILIONO
const client = twilio(accountSid, authToken);

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// generate random ID
function generateId() {
  const characters =
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
  return Array(7)
    .fill(null)
    .map(() => characters[Math.floor(Math.random() * characters.length)])
    .join("");
}

//MongoDB schemas and models
const UserSchema = new mongoose.Schema({
  id: String,
  name: String,
  phone: String,
  email: { type: String, unique: true },
  password: String,
  date: Date,
});

const ForgotSchema = new mongoose.Schema({
  phone: String,
  otp: Number,
});

const ProductSchema = new mongoose.Schema({
  image: String,
  brand: String,
  product: String,
  boughtPrice: Number,
  price: Number,
  discount: Number,
  size: String,
  stocks: Number,
  description: String,
});

const ReviewSchema = new mongoose.Schema({
  productid: String,
  useremail: String,
  text: String,
  label: Number,
});

const CartSchema = new mongoose.Schema({
  useremail: String,
  productid: String,
  image: String,
  brand: String,
  product: String,
  price: Number,
  size: String,
  quantity: Number,
});

const OrderItemSchema = new mongoose.Schema({
  orderid: String,
  useremail: String,
  productid: String,
  size: String,
  quantity: Number,
});

const OrderDetailSchema = new mongoose.Schema({
  orderid: String,
  useremail: String,
  totalamount: Number,
  payment: String,
  address: String,
  bookeddate: Date,
  status: String,
});

const SoldProductSchema = new mongoose.Schema({
  productid: String,
  brand: String,
  size: String,
  boughtPrice: Number,
  price: Number,
  soldquantity: Number,
});

const User = mongoose.model("shop_user", UserSchema);
const Forgot = mongoose.model("shop_Forgot", ForgotSchema);
const Product = mongoose.model("shop_Product", ProductSchema);
const Review = mongoose.model("shop_Review", ReviewSchema);
const Cart = mongoose.model("shop_Cart", CartSchema);
const OrderItem = mongoose.model("shop_OrderItem", OrderItemSchema);
const OrderDetail = mongoose.model("shop_OrderDetail", OrderDetailSchema);
const SoldProduct = mongoose.model("shop_SoldProduct", SoldProductSchema);

// Middleware to authenticate JWT
function authenticateToken(req, res, next) {
  const token = req.headers["authorization"];
  if (!token) return res.status(403).json({ message: "No token provided" });

  jwt.verify(token.split(" ")[1], JWT_SECRET, (err, user) => {
    if (err)
      return res.status(403).json({ message: "Failed to authenticate token" });
    req.user = user;
    next();
  });
}

// Routes
app.get("/login", async (req, res) => {
  const data = JSON.parse(req.query.data);
  try {
    const user = await User.findOne({ email: data.email });
    if (user && (await bcrypt.compare(data.password, user.password))) {
      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
        expiresIn: "2h",
      });
      return res.status(200).json({
        login: "successful",
        token,
        email: user.email,
      });
    } else {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

app.post("/signup", async (req, res) => {
  const details = req.body;
  const hashedPassword = await bcrypt.hash(details.password, 10);
  const user = new User({ ...details, password: hashedPassword, date });
  try {
    await user.save();
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: "2h",
    });
    res.status(200).json({ login: "successful", token });
  } catch (error) {
    if (error.code === 11000) {
      res
        .status(401)
        .json({ success: false, message: "Already a user with this email" });
    } else {
      console.error(error);
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  }
});

app.post("/sendotp", async (req, res) => {
  const { phone } = req.body;
  const formattedPhone = `+91${phone}`;
  const otp = Math.floor(100000 + Math.random() * 900000);

  try {
    const user = await User.findOne({ phone });
    if (user) {
      await client.messages.create({
        body: `Your OTP is: ${otp}`,
        from: twiliono,
        to: formattedPhone,
      });

      await Forgot.updateOne({ phone }, { phone, otp }, { upsert: true });

      res.json({ success: true, message: "OTP sent successfully" });
    } else {
      res.status(404).json({ success: false, message: "User not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

app.post("/verifyotp", async (req, res) => {
  const { phone, otp } = req.body;

  try {
    const record = await Forgot.findOne({ phone });
    if (record && record.otp === otp) {
      await Forgot.deleteOne({ phone });
      res.status(200).send("OTP Matched");
    } else {
      res.status(401).send("OTP Not Matched");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/newpassword", async (req, res) => {
  const { phone, newpassword } = req.body;
  const hashedPassword = await bcrypt.hash(newpassword, 10);

  try {
    const user = await User.findOneAndUpdate(
      { phone },
      { password: hashedPassword }
    );
    if (user) {
      res.status(200).send("Password updated Successfully");
    } else {
      res.status(404).json({ success: false, message: "User not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/allproducts", async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/product/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const product = await Product.findOne({ _id: id });
    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ success: false, message: "Product not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/addproduct", authenticateToken, async (req, res) => {
  const productData = req.body;
  console.log(productData);
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const useremail = decoded.email;
    const existingProduct = await Cart.findOne({
      useremail,
      productid: productData.productid,
      size: productData.size,
    });

    if (existingProduct) {
      existingProduct.quantity += productData.quantity;
      await existingProduct.save();
      res
        .status(200)
        .json({ success: true, message: "Product quantity updated in Cart" });
    } else {
      const cartItem = new Cart({
        useremail,
        ...productData,
      });
      await cartItem.save();
      res.status(200).json({ success: true, message: "Product added to Cart" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/removeproduct", authenticateToken, async (req, res) => {
  const { productid, size, quantity } = req.body;
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const useremail = decoded.email;
    const cartItem = await Cart.findOne({ useremail, productid, size });

    if (cartItem) {
      const newQuantity = cartItem.quantity - quantity;

      if (newQuantity > 0) {
        cartItem.quantity = newQuantity;
        await cartItem.save();
        res
          .status(200)
          .json({ success: true, message: "Product quantity updated in Cart" });
      } else {
        await Cart.deleteOne({ useremail, productid, size });
        res
          .status(200)
          .json({ success: true, message: "Product removed from Cart" });
      }
    } else {
      res
        .status(404)
        .json({ success: false, message: "Product not found in Cart" });
    }
  } catch (error) {
    console.error("Error updating/removing product:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/reviews", async (req, res) => {
  const { productid } = req.body;

  try {
    const reviews = await Review.find({ productid });
    res.json(reviews);
  } catch (error) {
    console.error("Error fetching reviews:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/addreviews", authenticateToken, async (req, res) => {
  const { productid, text } = req.body;
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const useremail = decoded.email;
    const response = await fetch("http://127.0.0.1:5000", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    const { message } = await response.json();
    const label = message === "Abusive" ? 1 : 0;

    const newReview = new Review({ useremail, productid, text, label });
    await newReview.save();

    res
      .status(200)
      .json({ success: true, message: "Review added successfully" });
  } catch (error) {
    console.error("Error adding review:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/deletereview", authenticateToken, async (req, res) => {
  const { productid } = req.body;

  try {
    await Review.deleteOne({ productid: productid });
    res.status(200).send("Review Deleted from Database");
  } catch (error) {
    console.error("Error deleting review:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/cart", authenticateToken, async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const useremail = decoded.email;
    const cartItems = await Cart.find({ useremail });
    res.json(cartItems);
  } catch (error) {
    console.error("Error fetching cart products:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/orderitem", authenticateToken, async function (req, res) {
  const data = req.body;
  const orderid = new mongoose.Types.ObjectId();
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const useremail = decoded.email;
    if (data.method === "COD") {
      const user = await User.findOne({ email: useremail });
      if (!user) {
        return res
          .status(401)
          .json({ success: false, message: "User not found" });
      }

      // Loop through products in the cart
      for (let i of data.product) {
        const orderItem = new OrderItem({
          orderid: orderid.toString(),
          useremail: useremail,
          productid: i.productid,
          size: i.size,
          quantity: i.quantity,
        });
        await orderItem.save();
      }

      const orderDetail = new OrderDetail({
        orderid: orderid.toString(),
        useremail: useremail,
        totalamount: data.total,
        payment: data.method,
        address: data.address,
        bookeddate: new Date(),
        status: "Pending",
      });
      await orderDetail.save();

      await Cart.deleteMany({ useremail: useremail });

      // Update product stock and log the process
      for (let i of data.product) {
        const product = await Product.findOne({ _id: new mongoose.Types.ObjectId(i.productid) });
        console.log("Product fetched:", product); 

        if (!product) {
          console.log("Product not found for productid:", i.productid);
          continue;
        }

        console.log("Current stock for productid", i.productid, ":", product.stocks);

        if (isNaN(i.quantity) || i.quantity <= 0) {
          console.log("Invalid quantity for product", i.productid, "Quantity:", i.quantity);
          continue; 
        }

        const newQuantity = product.stocks - i.quantity;

        if (newQuantity < 0) {
          console.log(`Not enough stock for product ${i.productid}. Available stock: ${product.stocks}, requested quantity: ${i.quantity}`);
          continue;  
        }

        console.log("Updating stock for productid", i.productid, "from", product.stocks, "to", newQuantity);

        await Product.updateOne(
          { _id: product._id },
          { stocks: newQuantity }
        );

        const soldProduct = await SoldProduct.findOne({ productid: i.productid });
        if (soldProduct) {
          soldProduct.soldquantity += i.quantity;
          await soldProduct.save();
        } else {
          const newSoldProduct = new SoldProduct({
            productid: i.productid,
            brand: product.brand,  
            size: i.size,        
            boughtPrice: product.boughtPrice,
            price: product.price,
            soldquantity: i.quantity,
          });
          await newSoldProduct.save();
        }
      }

      res.status(200).send("Order booked successfully");
    } else {
      res.status(500).send("Online method currently not available");
    }
  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).send("Error processing order");
  }
});

app.get('/userorder', authenticateToken, async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const useremail = decoded.email;

        const orders = await OrderDetail.find({ useremail });
        if (orders && orders.length > 0) {
            res.json(orders);
        } else {
            res.status(404).json({ success: false, message: 'No orders found' });
        }
    } catch (error) {
        console.error('Error fetching user orders:', error.message, error.stack);
        res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
    }
});

app.get("/logout", authenticateToken, (req, res) => {
  console.log("Logout successful");
  res.status(200).json({ status: "successful" });
});

app.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});
