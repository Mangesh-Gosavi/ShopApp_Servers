const mysql = require('mysql2');
const dotenv = require('dotenv');
dotenv.config();

const connection = mysql.createConnection(process.env.MYSQL_PUBLIC_URL);

connection.connect(function (err) {
  if (err) throw err;
  console.log("Database Connected!");
});

module.exports = connection;
