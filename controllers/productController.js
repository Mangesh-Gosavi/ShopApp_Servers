const productModel = require('../models/productModel');

const getAllProducts = (req, res) => {
  productModel.getAllProducts((err, result) => {
    try {
      if (err) throw err;
      console.log("Products", result);
      res.json(result);
    } catch (error) {
      console.error("Error fetching data:", error);
      res.status(500).send("Internal Server Error");
    }
  });
};

const getSingleProduct = (req, res) => {
  const singleprod = req.params.id;
  productModel.getProductById(singleprod, (err, result) => {
    try {
      if (err) throw err;
      console.log("Single Product", result);
      res.json(result);
    } catch (error) {
      console.error("Error fetching data:", error);
      res.status(500).send("Internal Server Error");
    }
  });
};

module.exports = { getAllProducts, getSingleProduct };
