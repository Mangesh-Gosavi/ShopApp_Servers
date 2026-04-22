const connection = require('../config/db');

const findUserByEmail = (email, callback) => {
  connection.query("SELECT * FROM users WHERE email = ?", [email], callback);
};

const insertOtp = (email, otp, callback) => {
  connection.query("INSERT INTO forgot(email, otp) VALUES (?, ?)", [email, otp], callback);
};

const findOtpByEmail = (email, callback) => {
  connection.query("SELECT * FROM forgot WHERE email = ?", [email], callback);
};

const deleteOtpByEmail = (email, callback) => {
  connection.query("DELETE FROM forgot WHERE email = ?", [email], callback);
};

const updatePasswordByEmail = (password, email, callback) => {
  connection.query("UPDATE users SET password = ? WHERE email = ?", [password, email], callback);
};

const createForgotTable = (callback) => {
  connection.query("SHOW TABLES LIKE 'forgot'", (err, result) => {
    if (err) return callback(err);
    if (result.length === 0) {
      const createTableQuery = `
        CREATE TABLE forgot (
          email VARCHAR(100),
          otp INT
        )
      `;
      connection.query(createTableQuery, callback);
    } else {
      callback(null);
    }
  });
};

module.exports = { findUserByEmail, insertOtp, findOtpByEmail, deleteOtpByEmail, updatePasswordByEmail, createForgotTable };
