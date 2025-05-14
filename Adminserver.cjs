const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
app.use(bodyParser.json());
app.use(cors());

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";
const PORT =  3001;

// MongoDB Connection
mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB connected"))
    .catch(err => console.error("MongoDB connection error:", err));

//MongoDB schemas and models
const adminSchema = new mongoose.Schema({
    name: String,
    phone: String,
    email: { type: String, unique: true },
    password: String,
    date: Date
});

const UserSchema = new mongoose.Schema({
    id: String,
    name: String,
    phone: String,
    email: { type: String, unique: true },
    password: String,
    date: Date,
  });

const productSchema = new mongoose.Schema({
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

const orderItemSchema = new mongoose.Schema({
    orderid: String,
    useremail: String,
    productid: String,
    size: String,
    quantity: Number,
  });

const orderDetailsSchema = new mongoose.Schema({
    orderid: String,
    useremail: String,
    totalamount: Number,
    payment: String,
    address: String,
    bookeddate: Date,
    status: String,
  });

  const soldProductSchema = new mongoose.Schema({
    productid: String,
    brand: String,
    size: String,
    boughtprice: Number,
    price: Number,
    soldquantity: Number,
  });

const User = mongoose.model("shop_user", UserSchema);
const Admin = mongoose.model("shop_Admin", adminSchema);
const Product = mongoose.model("shop_Product", productSchema);
const Review = mongoose.model("shop_Review", ReviewSchema);
const OrderItem = mongoose.model("shop_OrderItem", orderItemSchema);
const OrderDetail = mongoose.model("shop_OrderDetail", orderDetailsSchema);
const SoldProduct = mongoose.model("shop_SoldProduct", soldProductSchema);

// JWT Authentication Middleware
function authenticateToken(req, res, next) {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ message: "No token provided" });

    jwt.verify(token.split(' ')[1], JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: "Invalid token" });
        req.user = user;
        next();
    });
}

app.get("/Adminlogin", async (req, res) => {
    const data = JSON.parse(req.query.data);
    try {
        const user = await Admin.findOne({ email: data.email });
        console.log("User Found:", user);

        if (user && user.password === data.password) {
            const token = jwt.sign(
                { id: user._id, email: user.email },
                JWT_SECRET,
                { expiresIn: "2h" }
            );
            return res.status(200).json({
                login: "successful",
                token,
                email: user.email,
            });
        } else {
            console.log("Invalid email or password");
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }
    } catch (error) {
        console.error("Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
});

app.post("/Adminsignup", async (req, res) => {
    const details = req.body;
    const hashedPassword = await bcrypt.hash(details.password, 10);
    try {
        const newAdmin = new Admin({
            id: details.id,
            name: details.name,
            phone: details.phone,
            email: details.email,
            password: hashedPassword,
            date: new Date()
        });
        await newAdmin.save();
        const token = jwt.sign({ _id: newAdmin.id, email: newAdmin.email }, JWT_SECRET, { expiresIn: "2h" });
        res.status(200).json({ login: "Registered successful", token });
    } catch (err) {
        console.error(err);
        if (err.code === 11000) {
            res.status(401).json({ success: false, message: "Already a user with this email" });
        } else {
            res.status(500).send("Internal Server Error");
        }
    }
});

app.get("/users", authenticateToken, async (req, res) => {
    try {
        const users = await User.find({}, { password: 0 }); 
        res.json(users);
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.post("/productdetail", authenticateToken, async (req, res) => {
    const detail = req.body;
    try {
        const newProduct = new Product({
            image: detail.image,
            brand: detail.brand,
            product: detail.product,
            boughtPrice: detail.bought,
            price: detail.price,
            discount: detail.discount,
            size: detail.size,
            stocks: detail.stock,
            description: detail.description
        });
        await newProduct.save();
        res.status(200).send("Product Added Successfully");
    } catch (err) {
        console.error(err);
        res.status(500).send("Product not added");
    }
});

app.get("/adminreviews", authenticateToken, async (req, res) => {
    try {
        const reviews = await Review.find({});
        console.log("Reviews Found:", reviews);
        res.json(reviews);
    } catch (err) {
        console.error("Error fetching reviews:", err);
        res.status(500).send("Internal Server Error");
    }
});

app.get("/allproducts", authenticateToken, async (req, res) => {
    try {
        const products = await Product.find({});
        res.json(products);
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
});

app.post("/deleteproduct", authenticateToken, async (req, res) => {
    const productId = req.body.id;
    console.log("delete",productId)
    try {
        await Product.deleteOne({ _id: productId });
        res.status(200).json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).send("Product not Deleted");
    }
});

app.post("/updatestock", authenticateToken, async (req, res) => {
    const { productid, size, stock } = req.body;
    try {
        const product = await Product.findOne({ _id: productid });
        if (product) {
            product.stocks += stock;
            await product.save();
            res.status(200).send("Product Stock updated");
        } else {
            res.status(404).send("Product not found");
        }
    } catch (err) {
        console.error(err);
        res.status(500).send("Product Stock not updated");
    }
});

app.get("/items", authenticateToken, async (req, res) => {
    try {
        const items = await OrderItem.find({});
        console.log("Order Items:", items);
        res.json(items);
    } catch (error) {
        console.error("Error fetching order items:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.get("/orders", authenticateToken, async (req, res) => {
    try {
        const orders = await OrderDetail.find({});
        console.log("Orders:", orders);
        res.json(orders);
    } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.post("/orderstatus", authenticateToken, async (req, res) => {
    const { id, status } = req.body;

    try {
        const updatedOrder = await OrderDetail.findOneAndUpdate(
            { orderid: id },
            { status: status },
            { new: true } 
        );

        if (!updatedOrder) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        res.status(200).json({ success: true, message: "Order status updated", order: updatedOrder });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Error updating order status" });
    }
});


app.get("/data", authenticateToken, async (req, res) => {
  try {
    const data = await SoldProduct.aggregate([
      {
        $group: {
          _id: { brand: "$brand", size: "$size" },
          totalRevenue: { $sum: { $multiply: ["$price", "$soldquantity"] } },
          totalCost: { $sum: { $multiply: ["$boughtPrice", "$soldquantity"] } }
        }
      },
      {
        $project: {
          _id: 0,
          name: {
            $concat: ["$_id.brand", " - ", "$_id.size"]
          },
          value: { $subtract: ["$totalRevenue", "$totalCost"] } // this is the profit
        }
      }
    ]);

    console.log("Pie Chart Profit Data:", data);
    res.json(data);
  } catch (error) {
    console.error("Error fetching profit data:", error);
    res.status(500).send("Internal Server Error");
  }
});



app.get("/logout", authenticateToken, (req, res) => {
  console.log("Logout successful");
  res.status(200).json({ status: "successful" });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
