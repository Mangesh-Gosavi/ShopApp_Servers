const connection = require('../config/db');

const getCartByUser = (useremail, callback) => {
  connection.query("SELECT * FROM cart WHERE useremail = ?", useremail, callback);
};

const getCartItem = (useremail, productid, size, callback) => {
  connection.query(
    "SELECT * FROM cart WHERE useremail = ? AND productid = ? AND size = ?",
    [useremail, productid, size],
    callback
  );
};

const insertCartItem = (values, callback) => {
  connection.query(
    "INSERT INTO cart(useremail, image, productid, brand, product, price, size, quantity) VALUES ?",
    [values],
    callback
  );
};

const updateCartQuantity = (quantity, useremail, productid, size, callback) => {
  connection.query(
    "UPDATE cart SET quantity = ? WHERE useremail = ? AND productid = ? AND size = ?",
    [quantity, useremail, productid, size],
    callback
  );
};

const deleteCartItem = (useremail, productid, size, callback) => {
  connection.query(
    "DELETE FROM cart WHERE useremail = ? AND productid = ? AND size = ?",
    [useremail, productid, size],
    callback
  );
};

const clearCart = (useremail, callback) => {
  connection.query("DELETE FROM cart WHERE useremail = ?", useremail, callback);
};

const createCartTable = (callback) => {
  connection.query("SHOW TABLES LIKE 'cart'", function (err, result) {
    if (err) return callback(err);
    if (result.length === 0) {
      const createTableQuery = `
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
      connection.query(createTableQuery, callback);
    } else {
      callback(null);
    }
  });
};

module.exports = {
  getCartByUser,
  getCartItem,
  insertCartItem,
  updateCartQuantity,
  deleteCartItem,
  clearCart,
  createCartTable,
};
