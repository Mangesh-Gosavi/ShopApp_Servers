const connection = require('../config/db');

const getReviewsByProduct = (productid, callback) => {
  connection.query("SELECT * FROM reviews WHERE productid = ?", [productid], callback);
};

const insertReview = (email, productid, text, label, reviewid, callback) => {
  connection.query(
    "INSERT INTO reviews(email, productid, review, label, id) VALUES(?,?,?,?,?)",
    [email, productid, text, label, reviewid],
    callback
  );
};

const deleteReview = (reviewid, callback) => {
  connection.query("DELETE FROM reviews WHERE id = ?", [reviewid], callback);
};

const createReviewsTable = (callback) => {
  connection.query("SHOW TABLES LIKE 'reviews'", (err, result) => {
    if (err) return callback(err);
    if (result.length === 0) {
      const createTableQuery = `
        CREATE TABLE reviews (
          email VARCHAR(100),
          productid INT,
          review TEXT,
          label INT,
          id VARCHAR(20)
        )
      `;
      connection.query(createTableQuery, callback);
    } else {
      callback(null);
    }
  });
};

module.exports = { getReviewsByProduct, insertReview, deleteReview, createReviewsTable };
