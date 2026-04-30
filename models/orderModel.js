const connection = require('../config/db');

const createOrderItemTable = (callback) => {
  connection.query("SHOW TABLES LIKE 'orderitem'", function (err, result) {
    if (err) return callback(err);
    if (result.length === 0) {
      const createTableQuery =
        "CREATE TABLE orderitem(orderid varchar(20), useremail varchar(100), productid int(20), size varchar(20), quantity int(30))";
      connection.query(createTableQuery, callback);
    } else {
      callback(null);
    }
  });
};

const createOrderDetailsTable = (callback) => {
  connection.query("SHOW TABLES LIKE 'orderdetails'", function (err, result) {
    if (err) return callback(err);
    if (result.length === 0) {
      const createTableQuery =
        "CREATE TABLE orderdetails(orderid varchar(20), useremail varchar(100), totalamount int(30), payment varchar(20), address varchar(200), bookeddate date, status varchar(20))";
      connection.query(createTableQuery, callback);
    } else {
      callback(null);
    }
  });
};

const insertOrderItem = (orderid, useremail, productid, size, quantity, callback) => {
  const values = [[orderid, useremail, productid, size, quantity]];
  connection.query("INSERT INTO orderitem(orderid,useremail,productid,size,quantity) VALUES ?", [values], callback);
};

const insertOrderDetails = (orderid, useremail, total, method, address, date, callback) => {
  const values = [[orderid, useremail, total, method, address, date, "Pending"]];
  connection.query(
    "INSERT INTO orderdetails(orderid,useremail,totalamount,payment,address,bookeddate,status) VALUES ?",
    [values],
    callback
  );
};

const getOrdersByUser = (useremail, callback) => {
  connection.query("SELECT * FROM orderdetails WHERE useremail = ?", [useremail], callback);
};

const getOrderWithItems = (useremail, orderid, callback) => {
  const sql =
    "SELECT od.orderid, od.address, od.totalamount, od.bookeddate, od.status, od.payment, " +
    "u.name AS username, " +
    "p.brand, p.product, oi.size, oi.quantity, p.price " +
    "FROM orderdetails od " +
    "JOIN orderitem oi ON od.orderid = oi.orderid " +
    "JOIN product p ON oi.productid = p.productid " +
    "JOIN users u ON od.useremail = u.email " +
    "WHERE od.useremail = ? AND od.orderid = ?";
  connection.query(sql, [useremail, orderid], callback);
};

module.exports = {
  createOrderItemTable,
  createOrderDetailsTable,
  insertOrderItem,
  insertOrderDetails,
  getOrdersByUser,
  getOrderWithItems,
};
