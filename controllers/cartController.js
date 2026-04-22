const cartModel = require('../models/cartModel');
const userModel = require('../models/userModel');

const getCart = (req, res) => {
  try {
    const useremail = req.user.email;
    cartModel.getCartByUser(useremail, (err, userresult) => {
      if (err) {
        console.error("Error fetching cart products:", err);
        return res.status(500).send("Internal Server Error");
      }
      return res.json(userresult && userresult.length > 0 ? userresult : []);
    });
  } catch (error) {
    console.error("Error fetching cart products:", error);
    return res.status(500).send("Internal Server Error");
  }
};

const addProduct = (req, res) => {
  const productdata = req.body;
  const useremail = req.user.email;

  userModel.findUserByEmail(useremail, (err, userresult) => {
    if (err) {
      console.error("Error fetching user:", err);
      return res.status(500).send("Internal Server Error");
    }

    if (userresult.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    cartModel.getCartItem(useremail, productdata.productid, productdata.size, (err, result) => {
        if (err) {
          console.error("Error querying cart:", err);
          return res.status(500).send("Internal Server Error");
        }

        if (result.length > 0 && result[0].quantity !== 0) {
          const newquantity = result[0].quantity + productdata.quantity;
          cartModel.updateCartQuantity(newquantity, useremail, productdata.productid, productdata.size, (err) => {
            if (err) {
              console.error("Error updating cart quantity:", err);
              return res.status(500).send("Internal Server Error");
            }
            return res.status(200).json({ success: true, message: "Product quantity updated in Cart" });
          });
        } else {
          const values = [[useremail, productdata.image, productdata.productid, productdata.brand, productdata.product, productdata.price, productdata.size, productdata.quantity]];
          cartModel.insertCartItem(values, (err) => {
            if (err) throw err;
            return res.status(200).json({ success: true, message: "Product added to Cart" });
          });
        }
      });
  });
};

const removeProduct = (req, res) => {
  const removeid = req.body;
  const useremail = req.user.email;

  cartModel.getCartItem(useremail, removeid.productid, removeid.size, (err, result) => {
    if (err) {
      console.error("Error querying cart:", err);
      return res.status(500).send("Internal Server Error");
    }

    if (result.length === 0) {
      return res.status(404).json({ success: false, message: "Product not found in Cart" });
    }

    const newquantity = result[0].quantity - removeid.quantity;
    if (newquantity > 0) {
      cartModel.updateCartQuantity(newquantity, useremail, removeid.productid, removeid.size, (err) => {
        if (err) {
          console.error("Error updating cart quantity:", err);
          return res.status(500).send("Internal Server Error");
        }
        return res.status(200).json({ success: true, message: "Product quantity updated in Cart" });
      });
    } else {
      cartModel.deleteCartItem(useremail, removeid.productid, removeid.size, (err) => {
        if (err) {
          console.error("Error removing product:", err);
          return res.status(500).send("Internal Server Error");
        }
        return res.status(200).json({ success: true, message: "Product removed from Cart" });
      });
    }
  });
};

module.exports = { getCart, addProduct, removeProduct };
