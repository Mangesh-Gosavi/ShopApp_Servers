const orderModel = require('../models/orderModel');
const productModel = require('../models/productModel');
const cartModel = require('../models/cartModel');
const soldProductModel = require('../models/soldProductModel');
const userModel = require('../models/userModel');
const { generateId, getCurrentDate } = require('../utils/helpers');

const updateInventoryAndSoldProducts = (products) => {
  for (let i of products) {
    productModel.getProductById(i.productid, (err, result) => {
      if (err) throw err;
      if (result.length > 0) {
        const newquantity = result[0].stock - i.quantity;
        productModel.updateProductStock(newquantity, i.productid, (err) => {
          if (err) throw err;
          console.log("1 stock data updated");
        });
      }
    });
  }

  for (let i of products) {
    productModel.getProductById(i.productid, (err, result) => {
      if (err) throw err;
      if (result.length > 0) {
        const productid = result[0].productid;
        const brand = result[0].brand;
        const size = result[0].size;
        const boughtprice = result[0].boughtprice;
        const price = result[0].price;

        soldProductModel.getSoldProductById(i.productid, (err, soldResult) => {
          if (soldResult && soldResult.length !== 0) {
            const soldquantity = parseInt(soldResult[0].soldquantity) + parseInt(i.quantity);
            soldProductModel.updateSoldProduct(soldquantity, productid, () => {
              console.log("1 stock data updated");
            });
          } else {
            soldProductModel.insertSoldProduct(productid, brand, size, boughtprice, price, i.quantity, (err) => {
              if (err) throw err;
              console.log("1 stock data inserted");
            });
          }
        });
      }
    });
  }
};

const placeOrder = (req, res) => {
  const data = req.body;
  const useremail = req.user.email;
  const orderid = generateId();
  const date = getCurrentDate();
  console.log(useremail);
  console.log(data);

  if (data.method !== 'COD') {
    console.log("Online Method Currently Not Available");
    return res.status(500).send("Online Method Currently Not Available");
  }

  userModel.findUserByEmail(useremail, (err, userresult) => {
    if (err) throw err;

    if (!userresult || userresult.length === 0) {
      console.log("No such user");
      return res.status(404).json({ success: false, message: "User not found" });
    }

    console.log("User Found");

    for (let i of data.product) {
      console.log(i);
      orderModel.insertOrderItem(orderid, useremail, i.productid, i.size, i.quantity, (err) => {
        if (err) throw err;
        console.log("1 record inserted");
      });
    }

    orderModel.insertOrderDetails(orderid, useremail, data.total, data.method, data.address, date, (err) => {
      if (err) throw err;
      console.log("1 record inserted");
    });

    cartModel.clearCart(useremail, (err) => {
      if (err) throw err;
    });

    updateInventoryAndSoldProducts(data.product);

    res.status(200).send("Ordered booked");
  });
};

const getUserOrders = (req, res) => {
  const useremail = req.user.email;

  orderModel.getOrdersByUser(useremail, (err, result) => {
    if (err) {
      console.error("Error fetching data:", err);
      return res.status(500).send("Internal Server Error");
    }
    if (result.length === 0) {
      return res.status(404).json({ message: "No orders found" });
    }
    res.json(result);
  });
};

module.exports = { placeOrder, getUserOrders };
