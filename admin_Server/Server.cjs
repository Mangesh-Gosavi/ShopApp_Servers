const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const cors = require('cors');
const bcrypt = require('bcrypt');
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();
app.use(bodyParser.json());
app.use(cors());


let date = new Date().toJSON().slice(0, 10);

const connection = mysql.createConnection({
  host: process.env.DBHOST,
  user: process.env.DBUSER,
  password: process.env.DBPASSWORD,
  database: process.env.DATABASE
});

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

function authenticateToken(req, res, next) {
  const token = req.headers['authorization'];
  console.log("Received token:", token); // Log the received token
  if (!token) return res.status(403).json({ message: "No token provided" });

  jwt.verify(token.split(' ')[1], JWT_SECRET, (err, user) => {
    if (err) {
      console.error("Token verification error:", err); // Log any errors during verification
      return res.status(403).json({ message: "Failed to authenticate token" });
    }
    req.user = user;
    next();
  });
}

//Admin side
app.get("/Adminlogin", async function(req, res){
  const data = JSON.parse(req.query.data);
  const queryResult = await new Promise((resolve, reject) => {
    connection.query("SELECT * FROM admin WHERE email = ?", data.email, function (err, result, fields) {
      if (err) {
        reject(err);
        return;
      }
      resolve(result);
    });
  });

  if (queryResult.length > 0) {
    const user = queryResult[0];
    const passwordMatch = await bcrypt.compare(data.password, user.password);
    if (passwordMatch) {
      const token = jwt.sign(
        { id: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: "1h" }
      );
      return res.status(200).json({ login: "successful", token });
    } else {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }
  } else {
    return res.status(401).json({ success: false, message: "User not found" });
  }
});

// Signup Route
app.post("/Adminsignup", async function (req, res) {
  const details = req.body;
  const hashedPassword = await bcrypt.hash(details.password, 10);

  connection.query("SHOW TABLES LIKE 'admin'", function (err, result) {
    if (err) throw err;

    if (result.length === 0) {
      const createTableQuery = `
        CREATE TABLE admin (
          id VARCHAR(20),
          name VARCHAR(40),
          phone VARCHAR(255),
          email VARCHAR(100) UNIQUE PRIMARY KEY,
          password VARCHAR(255),
          date DATE
        )
      `;
      connection.query(createTableQuery, function (err, result) {
        if (err) throw err;
        console.log("Table admin created");
      });
    }

    connection.query("SELECT * FROM admin WHERE email = ?", details.email, function (err, prevResult, fields) {
      if (prevResult.length === 0) {
        const insertDataQuery = "INSERT INTO admin (id, name, phone, email, password, date) VALUES ?";
        const values = [
          [details.id, details.name, details.phone, details.email, hashedPassword, date]
        ];
        
        connection.query(insertDataQuery, [values], function (err, result) {
          if (err) throw err;
          console.log("1 record inserted");

          // Generate a JWT token after successful signup
          const token = jwt.sign(
            { id: details.id, email: details.email },
            JWT_SECRET,
            { expiresIn: "1h" }
          );
          return res.status(200).json({ login: "successful", token });
        });
      } else {
        return res.status(401).json({ success: false, message: "Already a user with this email" });
      }
    });
  });
});

app.get("/users",authenticateToken,function(req,res){
  connection.query("Select * from users",async function(err, result, fields){
    try {
      console.log("Users");
      console.log(result);

      const data = result.map((user)=>{
        const{password , ...rest} = user
        return rest
      })
      console.log(data);
      res.json(data)

  } catch (error) {
      console.error("Error fetching data:", error);
      res.status(500).send("Internal Server Error");
  }
})
})

app.post("/productdetail",authenticateToken,function(req,res){
  let detail = req.body
  console.log(detail);
   
    connection.query("SHOW TABLES LIKE 'product'", function(err, result){
      if(err) throw err;
    try{
      if (result.length === 0) {
      // 'product' table does not exist, create it
      var createTableQuery = "CREATE TABLE product(productid INT NOT NULL AUTO_INCREMENT PRIMARY KEY,image VARCHAR(255),brand varchar(20),product varchar(20),boughtprice INT,price INT,discount INT,size varchar(20),stock INT,description varchar(100));";
      connection.query(createTableQuery, function(err, result) {
        if (err) throw err;
        console.log("Table product created");
    
        var insertproductData = "INSERT INTO product(image,brand,product,boughtprice,price,discount,size,stock,description) VALUES ?";
        var values = [
          [detail.image,detail.brand,detail.product, detail.bought, detail.price,detail.discount,detail.size,detail.stock,detail.description]
        ];
    
        connection.query(insertproductData, [values], function(err, result) {
          if (err) throw err;
          console.log("1 record inserted in product");
        });

      });
      res.status(200).send("Product Added Successfully");
    } else {
      console.log("Table already exists");

      var insertproductData = "INSERT INTO product(image,brand,product,boughtprice,price,discount,size,stock,description) VALUES ?";
      var values = [
        [detail.image,detail.brand,detail.product, detail.bought, detail.price,detail.discount,detail.size,detail.stock,detail.description]
      ];

      connection.query(insertproductData, [values], function(err, result) {
        if (err) throw err;
        console.log("1 record inserted product");
      });
      res.status(200).send("Product Added Successfully");
    }
  }catch(err){
      console.log("Product not added",err);
      res.status(500).send("Product not added");
  }
})
})

app.get("/adminreviews", authenticateToken,function(req,res){
  connection.query("Select * from reviews",async function(err, result, fields){
    try {
      if (err) throw err;
      console.log("Review Found");
      console.log(result);
      res.json(result)

  } catch (error) {
      console.log("Error fetching data", error);
      res.status(500).send("Internal Server Error");
  }
})
})

app.post("/updatestock", authenticateToken,function(req,res){
  const data = req.body
  const id =data.productid
  console.log(data);
 try{
  connection.query("SELECT * FROM product WHERE productid = ? and size = ?",[data.productid,data.size], function(err, result) {
    if (err) throw err;
    console.log("Data from inventory",result);
    if(result.length > 0){
      const newquantity = result[0].stock + data.stock;

      connection.query("UPDATE product SET stock = ? WHERE productid = ? AND size = ?", 
      [newquantity,data.productid,data.size], function(err, result) {
      console.log("1 product updated quantity");
    });
    res.status(200).send("Product Stock updated");
    }
});
 }
 catch(err){
  console.log("Product Stock not updated",err);
  res.status(500).send("Product Stock not updated");
}

})

app.get("/allproducts", authenticateToken,function(req,res){
  connection.query("Select * from product",async function(err, result, fields){
    try {
      console.log("Products");
      console.log(result);
      res.json(result)

  } catch (error) {
      console.error("Error fetching data:", error);
      res.status(500).send("Internal Server Error");
  }
})
})

app.post("/deleteproduct", authenticateToken,function(req,res){
  const data = req.body.productid
  console.log(data);
 
  try{
  connection.query("DELETE FROM product WHERE productid =?",data, function(err, result, fields){
    if (err) {
      console.error("Error deleting product:", err);
      res.status(500).send("Internal Server Error");
      return;
    }
    else{
      console.log("Product Deleted successfully");
      return res.status(200).json({ success: true });

    }
    })
    connection.query("DELETE FROM soldproduct WHERE productid =?",data, function(err, result, fields){
      if (err) {
        console.error("Error deleting product:", err);
        res.status(500).send("Internal Server Error");
        return;
      }
      })
    }catch(err){
      console.log("Product not Deleted",err);
      res.status(500).send("Product not Deleted");
    }
})

app.get("/items", authenticateToken,function(req,res){
  connection.query("Select * from orderitem",async function(err, result, fields){
    try {
      console.log("Order Items");
      console.log(result);
      res.json(result)

  } catch (error) {
      console.error("Error fetching data:", error);
      res.status(500).send("Internal Server Error");
  }
})
})

app.get("/orders", authenticateToken,function(req,res){
  connection.query("Select * from orderdetails",async function(err, result, fields){
    try {
      console.log("Orders");
      console.log(result);
      res.json(result)

  } catch (error) {
      console.error("Error fetching data:", error);
      res.status(500).send("Internal Server Error");
  }
})
})

app.post("/orderstatus", authenticateToken,function(req,res){
  const data = req.body
  console.log(data);

  connection.query("UPDATE orderdetails SET status = ? WHERE orderid = ?",[data.status,data.id],async function(err, result, fields){
    try {
      console.log("Order Details");
      console.log(result);
      res.json(result)

  } catch (error) {
      console.error("Error fetching data:", error);
      res.status(500).send("Internal Server Error");
  }
})
})


app.get('/data', authenticateToken,(req, res) => {
  const query = `
    SELECT 
      productid, 
      brand, 
      size, 
      SUM(boughtprice * soldquantity) AS total_boughtprice,
      SUM(price * soldquantity) AS total_price,
      SUM(soldquantity) AS total_soldquantity,
      CASE 
        WHEN SUM(price * soldquantity) > SUM(boughtprice * soldquantity) THEN 'Profit'
        ELSE 'Loss'
      END AS profit_loss
    FROM 
      soldproduct 
    GROUP BY 
      productid, 
      brand, 
      size`;
  
  connection.query(query, (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});


app.get("/logout", authenticateToken, function(req, res) {
  console.log("Logout successful");
  return res.status(200).json({ status: "successful" });
});

connection.connect(function(err) {
  if (err) throw err;
  console.log("Database Connected!");
 
});

app.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});

