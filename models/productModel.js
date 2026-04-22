const connection = require('../config/db');

const getAllProducts = (callback) => {
  connection.query("SELECT * FROM product", callback);
};

const getProductById = (id, callback) => {
  connection.query("SELECT * FROM product WHERE productid = ?", [id], callback);
};

const updateProductStock = (newquantity, productid, callback) => {
  connection.query("UPDATE product SET stock = ? WHERE productid = ?", [newquantity, productid], callback);
};

module.exports = { getAllProducts, getProductById, updateProductStock };
