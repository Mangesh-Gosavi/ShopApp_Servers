const connection = require('../config/db');

const getSoldProductById = (productid, callback) => {
  connection.query("SELECT * FROM soldproduct WHERE productid = ?", [productid], callback);
};

const insertSoldProduct = (productid, brand, size, boughtprice, price, quantity, callback) => {
  const values = [[productid, brand, size, boughtprice, price, quantity]];
  connection.query(
    "INSERT INTO soldproduct(productid, brand, size, boughtprice, price, soldquantity) VALUES ?",
    [values],
    callback
  );
};

const updateSoldProduct = (soldquantity, productid, callback) => {
  connection.query(
    "UPDATE soldproduct SET soldquantity = ? WHERE productid = ?",
    [soldquantity, productid],
    callback
  );
};

const createSoldProductTable = (callback) => {
  connection.query("SHOW TABLES LIKE 'soldproduct'", (err, result) => {
    if (err) return callback(err);
    if (result.length === 0) {
      const createTableQuery = `
        CREATE TABLE soldproduct (
          productid INT,
          brand VARCHAR(100),
          size VARCHAR(100),
          boughtprice INT,
          price INT,
          soldquantity INT
        )
      `;
      connection.query(createTableQuery, callback);
    } else {
      callback(null);
    }
  });
};

module.exports = { getSoldProductById, insertSoldProduct, updateSoldProduct, createSoldProductTable };
