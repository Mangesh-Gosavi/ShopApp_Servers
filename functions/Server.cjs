const express = require('express');
const bodyParser = require('body-parser');
const app = express()
const cors = require('cors');
const mysql = require('mysql2');
const twilio = require('twilio');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
dotenv.config();
app.use(bodyParser.json());
app.use(cors());

let date = new Date().toJSON().slice(0, 10);

const accountSid = process.env.ACCOUNTSID
const authToken = process.env.AUTHTOKEN
const client = twilio(accountSid, authToken);
function id(){
  var characters = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
  var lenString = 7;
  var randomstring = '';  
  for (var i=0; i<lenString; i++) {  
    var rnum = Math.floor(Math.random() * characters.length);  
    randomstring += characters.substring(rnum, rnum+1);  
  }  
  return randomstring
}

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


// Login Route with JWT Authentication
app.get("/login", async function (req, res) {
  const data = JSON.parse(req.query.data);
  const queryResult = await new Promise((resolve, reject) => {
    connection.query("SELECT * FROM users WHERE email = ?", data.email, function (err, result, fields) {
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
app.post("/signup", async function (req, res) {
  const details = req.body;
  const hashedPassword = await bcrypt.hash(details.password, 10);

  connection.query("SHOW TABLES LIKE 'users'", function (err, result) {
    if (err) throw err;

    if (result.length === 0) {
      const createTableQuery = `
        CREATE TABLE users (
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
        console.log("Table users created");
      });
    }

    connection.query("SELECT * FROM users WHERE email = ?", details.email, function (err, prevResult, fields) {
      if (prevResult.length === 0) {
        const insertDataQuery = "INSERT INTO users (id, name, phone, email, password, date) VALUES ?";
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

// Profile Route (Protected)
app.get("/profile", authenticateToken, function (req, res) {
  connection.query("SELECT * FROM users WHERE email = ?", [req.user.email], async function (err, result, fields) {
    if (err) throw err;
    if (result.length > 0) {
      const data = {
        id: result[0].id,
        name: result[0].name,
        phone: result[0].phone,
        email: result[0].email
      };
      res.json(data);
    } else {
      res.status(404).json({ success: false, message: "User not found" });
    }
  });
});

app.post("/sendotp",function(req, res) {
  const  data = req.body;
  const phone = data.phone
  const formattedPhone = `+91${phone}`;
  const otp = Math.floor(100000 + Math.random() * 900000);

  // Assuming you have established a connection to your database (e.g., MySQL)
  connection.query("SELECT * FROM users WHERE phone = ?", [phone], async function(err, result, fields) {
      if (err) {
          console.error("Error querying database:", err);
          return res.status(500).json({ success: false, error: 'Internal Server Error' });
      }

      if (result.length > 0) {
          try {
              console.log("User found:", result);
              // Assuming you have initialized the Twilio client (client) properly
              client.messages.create({
                  body: `Your OTP is: ${otp}`,
                  from: '+12176554930',
                  to: formattedPhone
              })
              .then(message => {
                  console.log(`OTP sent: ${message.sid}`);
                  // Store the OTP in the database
                  connection.query("INSERT INTO forgot(phone, otp) VALUES (?, ?)", [phone, otp], function(err, result) {
                      if (err) {
                          console.error("Error inserting data into Forgot table:", err);
                          return res.status(500).json({ success: false, error: 'Failed to store OTP' });
                      }
                      console.log("Inserted data into Forgot table");
                      res.json({ success: true, message: 'OTP sent successfully' });
                  });
              })
              .catch(err => {
                  console.error("Error sending OTP:", err);
                  res.status(500).json({ success: false, error: 'Failed to send OTP' });
              });
          } catch (error) {
              console.error("Error:", error);
              res.status(500).json({ success: false, error: 'Internal Server Error' });
          }
      } else {
          console.log("User data not found");
          res.status(404).json({ success: false, error: 'User not found' });
      }
  });
});


app.post("/verifyotp",function(req,res){
  const data = req.body;
  const phone = data.phone;
  connection.query("Select * from forgot where phone = ?",[phone],async function(err, result, fields){
    if(err) throw err;
    if(result.length > 0){
    try {
      if(parseInt(result[0].otp ) === data.otp){
        console.log("OTP Matched");
        connection.query("Delete from forgot where phone = ?",[phone],function(err,result){
          console.log("Deleted phone number");
        })
        res.status(200).send("OTP Matched")
      }
      else{
        console.log("OTP NOt Matched");
        res.status(401).send("OTP Not Matched")
      }
  
    } catch (error) {
        console.error("Error fetching data:", error);
        res.status(500).send("Internal Server Error");
    }
    }else{
      console.log("User data not found");
    }
})
})

app.post("/newpassword" ,function(req,res){
  const data = req.body;
  console.log(data);
  const phone = data.phone;
  const password = data.newpassword;
  console.log(password);

  connection.query("Select * from users where phone = ?",[phone],async function(err, result, fields){
    if(err) throw err;
    if(result.length > 0){
      try {
        console.log("Users");
        console.log(result);
        connection.query("Update users SET password =? where phone = ?",[password,phone],function(err,result){
          console.log("Password updated Successfully");
          res.status(200).send("Password updated Successfully")
        })
  
    } catch (error) {
        console.error("Error fetching data:", error);
        res.status(500).send("Internal Server Error");
    }
    }else{
      console.log("User data not found");
    }
})
})

app.get("/allproducts",function(req,res){
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

app.get("/product/:id", authenticateToken,function(req,res){
  let singleprod = req.params.id;

  connection.query("Select * from product where productid=?",singleprod,async function(err, result, fields){
    try {
      console.log("Single Product");
      console.log(result);
      res.json(result)

  } catch (error) {
      console.error("Error fetching data:", error);
      res.status(500).send("Internal Server Error");
  }
})
})

// Add Product Route (Protected)
app.post("/addproduct", authenticateToken, function (req, res) {
  let productdata = req.body;
  let useremail = req.user.email; // Get the email from the JWT token

  connection.query("SELECT * FROM users WHERE email = ?", useremail, async function (err, userresult, fields) {
    if (err) {
      console.error("Error fetching user:", err);
      return res.status(500).send("Internal Server Error");
    }

    if (userresult.length > 0) {
      connection.query("SHOW TABLES LIKE 'cart'", function (err, result) {
        if (err) throw err;

        if (result.length === 0) {
          // 'cart' table does not exist, create it
          var createTableQuery = `
            CREATE TABLE cart (
              useremail VARCHAR(100),
              image VARCHAR(255),
              productid INT(20),
              brand VARCHAR(20),
              product VARCHAR(30),
              price INT(30),
              size VARCHAR(20),
              quantity INT(30)
            )
          `;
          connection.query(createTableQuery, function (err, result) {
            if (err) throw err;
            console.log("Table cart created");

            var insertproductData = "INSERT INTO cart(useremail, image, productid, brand, product, price, size, quantity) VALUES ?";
            var values = [
              [useremail, productdata.image, productdata.productid, productdata.brand, productdata.product, productdata.price, productdata.size, productdata.quantity]
            ];

            connection.query(insertproductData, [values], function (err, result) {
              if (err) throw err;
              console.log("1 record inserted into cart");
              return res.status(200).json({ success: true, message: "Product added to Cart" });
            });
          });
        } else {
          console.log("Table already exists");

          connection.query("SELECT * FROM cart WHERE useremail = ? AND productid = ? AND size = ?", [useremail, productdata.productid, productdata.size], function (err, result) {
            if (err) {
              console.error("Error querying cart:", err);
              return res.status(500).send("Internal Server Error");
            }

            if (result.length > 0 && result[0].quantity !== 0) {
              let newquantity = result[0].quantity + productdata.quantity;
              connection.query("UPDATE cart SET quantity = ? WHERE useremail = ? AND productid = ? AND size = ?", [newquantity, useremail, productdata.productid, productdata.size], function (err, result) {
                if (err) {
                  console.error("Error updating cart quantity:", err);
                  return res.status(500).send("Internal Server Error");
                }
                console.log("1 record updated product quantity");
                return res.status(200).json({ success: true, message: "Product quantity updated in Cart" });
              });
            } else {
              var insertproductData = "INSERT INTO cart(useremail, image, productid, brand, product, price, size, quantity) VALUES ?";
              var values = [
                [useremail, productdata.image, productdata.productid, productdata.brand, productdata.product, productdata.price, productdata.size, productdata.quantity]
              ];

              connection.query(insertproductData, [values], function (err, result) {
                if (err) throw err;
                console.log("1 record inserted into cart");
                return res.status(200).json({ success: true, message: "Product added to Cart" });
              });
            }
          });
        }
      });
    } else {
      console.log("No such user");
      return res.status(404).json({ success: false, message: "User not found" });
    }
  });
});

// Remove Product Route (Protected)
app.post("/removeproduct", authenticateToken, function (req, res) {
  const removeid = req.body;
  const useremail = req.user.email; // Get the email from the JWT token

  connection.query("SELECT * FROM cart WHERE useremail = ? AND productid = ? AND size = ?", [useremail, removeid.productid, removeid.size], function (err, result) {
    if (err) {
      console.error("Error querying cart:", err);
      return res.status(500).send("Internal Server Error");
    }

    if (result.length > 0) {
      let newquantity = result[0].quantity - removeid.quantity;
      if (newquantity > 0) {
        connection.query("UPDATE cart SET quantity = ? WHERE useremail = ? AND productid = ? AND size = ?", [newquantity, useremail, removeid.productid, removeid.size], function (err, result) {
          if (err) {
            console.error("Error updating cart quantity:", err);
            return res.status(500).send("Internal Server Error");
          }
          console.log("1 record updated product quantity");
          return res.status(200).json({ success: true, message: "Product quantity updated in Cart" });
        });
      } else {
        connection.query("DELETE FROM cart WHERE useremail = ? AND productid = ? AND size = ?", [useremail, removeid.productid, removeid.size], async function (err, userresult, fields) {
          if (err) {
            console.error("Error removing product:", err);
            return res.status(500).send("Internal Server Error");
          }
          console.log("Product removed successfully");
          return res.status(200).json({ success: true, message: "Product removed from Cart" });
        });
      }
    } else {
      console.log("No product found in cart");
      return res.status(404).json({ success: false, message: "Product not found in Cart" });
    }
  });
});


app.post("/reviews", authenticateToken,function(req,res){
  const data = req.body;
  console.log("prodid for review",data);
  const productid = data.productid;

  connection.query("Select * from reviews where productid = ?",[productid],async function(err, result, fields){
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

app.post("/addreviews",authenticateToken ,async function(req,res){
  const data = req.body;
  console.log(data);
  const email = req.user.email;
  const productid = data.productid;
  const text = data.text;
  const reviewid = id();

  const response = await fetch('http://127.0.0.1:5000',{
    method: "POST", 
    headers:{
        "Content-type":"application/json;"
    },
    body: JSON.stringify({ 
        text: text
    }), 
  })

  const pred = await response.json();
  console.log(pred);
  let label = null;

  if (pred.message == "Abusive"){
      label = 1;
  } else { label = 0 }
  console.log(label);

  connection.query("Insert into reviews(email,productid,review,label,id) values(?,?,?,?,?)",[email,productid,text,label,reviewid],async function(err, result, fields){
    try {
      if (err) throw err;
      console.log("Review inserted to table");
      res.json(result)

  } catch (error) {
      console.log("Error fetching data", error);
      res.status(500).send("Internal Server Error");
  }
})
})

app.post("/deletereview", authenticateToken,function(req,res){
  const data = req.body;
  console.log("Reviewid for review",data);
  const reviewid = data.reviewid;

   try{
    connection.query("Delete from reviews where id = ?",[reviewid],function(err,result){
      console.log("Review Deleted from Database");
      res.status(200).send("Review Deleted from Database");
    })
   }
   catch (error) {
      console.log("Error fetching data", error);
      res.status(500).send("Internal Server Error");
  }
})

app.get("/cart", authenticateToken, function(req, res) {
  try {
    const useremail = req.user.email; // Get the email from the decoded token

    connection.query("SELECT * FROM cart WHERE useremail = ?", useremail, function(err, userresult, fields) {
      if (err) {
        console.error("Error fetching cart products:", err);
        return res.status(500).send("Internal Server Error");
      }

      if (userresult && userresult.length > 0) {
        return res.json(userresult);
      } else {
        return res.json([]);
      }
    });
  } catch (error) {
    console.error("Error fetching cart products:", error);
    return res.status(500).send("Internal Server Error");
  }
});


app.post("/orderitem", authenticateToken,function(req,res){
  const data = req.body;
  const useremail = req.user.email;
  console.log(useremail);
  console.log(data);
  const orderid = id();

  //if payment method is COD
  if(data.method ==='COD'){
    connection.query("SELECT * FROM users WHERE email =?", useremail, async function(err, userresult, fields) {
      if (err) throw err;
  
      if (userresult && userresult.length > 0) {
        console.log("User Found");
        connection.query("SHOW TABLES LIKE 'orderitem'", function(err, result){
         if(err) throw err;
      
         if (result.length === 0) {
          // 'orderitem' table does not exist, create it
          var createTableQuery = "CREATE TABLE orderitem(orderid varchar(20),useremail varchar(100),productid int(20),size varchar(20),quantity int(30))";
          connection.query(createTableQuery, function(err, result) {
            if (err) throw err;
            console.log("Table orderitem created");
  
          for(let i of data.product){
            const productid = i.productid;
            const size = i.size
            const quantity = i.quantity;

            var insertproductData = "INSERT INTO orderitem(orderid,useremail,productid,size,quantity) VALUES ?";
            var values = [[orderid,useremail,productid,size,quantity]];
        
            connection.query(insertproductData, [values], function(err, result) {
              if (err) throw err;
              console.log("1 record inserted");
            });
          }
          });
       
        //adding data to orderdetails 
        connection.query("SHOW TABLES LIKE 'orderdetails'", function(err, result){
          if(err) throw err;
       
          if (result.length === 0) {
           // 'orderdetails' table does not exist, create it
           var createTableQuery = "CREATE TABLE orderdetails(orderid varchar(20),useremail varchar(100),totalamount int(30),payment varchar(20),address varchar(200),bookeddate date,status varchar(20))";
           connection.query(createTableQuery, function(err, result) {
             if (err) throw err;
             console.log("Table orderdetails created");
 
             var insertproductData = "INSERT INTO orderdetails(orderid,useremail,totalamount,payment,address,bookeddate,status) VALUES ?";
             var values = [[orderid,useremail,data.total,data.method,data.address,date,"Pending"]];
         
             connection.query(insertproductData, [values], function(err, result) {
               if (err) throw err;
               console.log("1 record inserted");
             });
           });

           connection.query("DELETE FROM cart WHERE useremail =?",useremail, function(err, result) {
            if (err) throw err;
            console.log("1 record inserted");
          });

        //Inventory management reducing the specific product quantity
        for(let i of data.product){
          connection.query("SELECT * FROM product WHERE productid = ?",[i.productid], function(err, result) {
          if (err) throw err;
          console.log("Data from inventory",result);
          if(result.length > 0){
            const productid = i.productid;
            const newquantity = result[0].stock - i.quantity;
            
            connection.query("UPDATE product SET stock = ? WHERE productid = ? ", [newquantity,productid], function(err, result) {
              if (err) throw err;
              console.log("1 stock data updated");
            });

          }else{
            console.log("NO such product");
            
          }
        });
        }
        
        //Updating soldquantity for chart
        for(let i of data.product){
          connection.query("SELECT * FROM product WHERE productid = ?",[i.productid], function(err, result) {
          if (err) throw err;
          console.log("Data from inventory",result);
          if(result.length > 0){
            const productid = i.productid;
            const brand = i.brand;
            const size = i.size;
            const boughtprice = i.boughtprice;
            const price = i.price;
            const soldquantity = result[0].soldquantity - i.quantity;
 
            connection.query("SELECT TABLE LIKE 'soldproduct'", function(err, result) {
              if(!result){
                console.log("Table soldproduct does not exist");
                connection.query('CREATE TABLE soldproduct (productid INT, brand VARCHAR(100), size VARCHAR(100), boughtprice INT, price INT, soldquantity INT)', function(err, result) {
                  if (err) throw err;
                  console.log("Table soldproduct created");

                  var values = [[productid, brand, size, boughtprice, price, i.quantity]];
                  connection.query("INSERT INTO soldproduct (productid, brand, size, boughtprice, price, soldquantity) VALUES ?", [values], function(err, result) {
                    if (err) throw err;
                    console.log("1 stock data inserted");
                  });
                });
              }
            });
          }else{
            console.log("NO such product");
          }
        });
        }
         res.status(200).send("Ordered booked");
        }     
   
        }) 
       
        } else {
          console.log("Table orderitem already exists");
  
          for(let i of data.product){
            console.log(i);
            const productid = i.productid;
            const size = i.size;
            const quantity = i.quantity;

            var insertproductData = "INSERT INTO orderitem(orderid,useremail,productid,size,quantity) VALUES ?";
            var values = [[orderid,useremail,productid,size,quantity]];
    
            connection.query(insertproductData, [values], function(err, result) {
              if (err) throw err;
              console.log("1 record inserted");
            });
          }
          
          console.log("Table orderdetails already exists");

            var insertproductData = "INSERT INTO orderdetails(orderid,useremail,totalamount,payment,address,bookeddate,status) VALUES ?";
            var values = [[orderid,useremail,data.total,data.method,data.address,date,"Pending"]]
    
            connection.query(insertproductData, [values], function(err, result) {
              if (err) throw err;
              console.log("1 record inserted");
            }); 
            
            connection.query("DELETE FROM cart WHERE useremail =?",useremail, function(err, result) {
              if (err) throw err;
              console.log("1 record inserted");
            });
          //Inventory management reducing the specific product quantity
          for(let i of data.product){
            connection.query("SELECT * FROM product WHERE productid = ?",[i.productid], function(err, result) {
            if (err) throw err;
            console.log("Data from inventory",result);
            if(result.length > 0){
              const productid = i.productid;
              const newquantity = result[0].stock - i.quantity;
              
              connection.query("UPDATE product SET stock = ? WHERE productid = ? ", [newquantity,productid], function(err, result) {
                if (err) throw err;
                console.log("1 stock data updated");
              });
  
            }else{
              console.log("NO such product");
              
            }
          });
          }
         //Inserting soldquantity for chart
         for(let i of data.product){
          connection.query("SELECT * FROM product WHERE productid = ?",[i.productid], function(err, result) {
          if (err) throw err;
          console.log("Data from inventory",result);
          if(result.length > 0){
            const productid = result[0].productid;
            const brand = result[0].brand;
            const size = result[0].size;
            const boughtprice = result[0].boughtprice;
            const price = result[0].price;
            
            console.log("Table soldproduct exist");

            connection.query('SELECT * from soldproduct where productid = ?',[i.productid],function(err,result){
              if(result.length != 0){
                const newProductdata = result[0];
                console.log("newProductdata",newProductdata["soldquantity"]);
                
                const soldquantity = parseInt(newProductdata.soldquantity)  + parseInt(i.quantity);
                console.log("new quantity",soldquantity)
                connection.query("UPDATE soldproduct SET soldquantity =? WHERE productid = ?",[soldquantity,productid],function(err,result){
                  console.log("1 stock data updated");
                });
              }else{
                var values = [[productid,brand,size,boughtprice,price,i.quantity]];
                connection.query("INSERT INTO soldproduct(productid,brand,size,boughtprice,price,soldquantity) VALUES ?", [values], function(err, result) {
                  if (err) throw err;
                  console.log("1 stock data inserted");
                });
              }
            });
          }else{
            console.log("NO such product");
          }
        });
        }
        res.status(200).send("Ordered booked");
        }
        })
        }      
        })
      } else {
        console.log("Online Method Currently Not Availabe");
        res.status(500).send("Online Method Currently Not Availabe");
      }
    });

app.get("/userorder", authenticateToken, (req, res) => {
  const useremail = req.user.email;

  connection.query("SELECT * FROM orderdetails WHERE useremail = ?", [useremail], (err, result) => {
    if (err) {
      console.error("Error fetching data:", err);
      return res.status(500).send("Internal Server Error");
    }
    if (result.length === 0) {
      console.error("No orders found for user");
      return res.status(404).json({ message: "No orders found" });
    }
    res.json(result);
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



