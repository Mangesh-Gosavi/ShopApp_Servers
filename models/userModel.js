const connection = require('../config/db');

const findUserByEmail = (email, callback) => {
  connection.query("SELECT * FROM users WHERE email = ?", email, callback);
};

const createUsersTable = (callback) => {
  connection.query("SHOW TABLES LIKE 'users'", function (err, result) {
    if (err) return callback(err);
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
      connection.query(createTableQuery, callback);
    } else {
      callback(null);
    }
  });
};

const insertUser = (values, callback) => {
  connection.query("INSERT INTO users (id, name, phone, email, password, date) VALUES ?", [values], callback);
};

module.exports = { findUserByEmail, createUsersTable, insertUser };
