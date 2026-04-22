const userModel = require('../models/userModel');
const cartModel = require('../models/cartModel');
const orderModel = require('../models/orderModel');
const reviewModel = require('../models/reviewModel');
const soldProductModel = require('../models/soldProductModel');
const forgotModel = require('../models/forgotModel');

const initDb = (callback) => {
  userModel.createUsersTable((err) => {
    if (err) return callback(err);
    cartModel.createCartTable((err) => {
      if (err) return callback(err);
      orderModel.createOrderItemTable((err) => {
        if (err) return callback(err);
        orderModel.createOrderDetailsTable((err) => {
          if (err) return callback(err);
          reviewModel.createReviewsTable((err) => {
            if (err) return callback(err);
            soldProductModel.createSoldProductTable((err) => {
              if (err) return callback(err);
              forgotModel.createForgotTable((err) => {
                if (err) return callback(err);
                console.log("All tables verified/created.");
                callback(null);
              });
            });
          });
        });
      });
    });
  });
};

module.exports = initDb;
