const reviewModel = require('../models/reviewModel');
const { generateId } = require('../utils/helpers');
const dotenv = require('dotenv');
dotenv.config();

const getReviews = (req, res) => {
  const productid = req.body.productid;
  console.log("prodid for review", req.body);

  reviewModel.getReviewsByProduct(productid, (err, result) => {
    try {
      if (err) throw err;
      console.log("Review Found", result);
      res.json(result);
    } catch (error) {
      console.log("Error fetching data", error);
      res.status(500).send("Internal Server Error");
    }
  });
};

const addReview = async (req, res) => {
  const data = req.body;
  console.log(data);
  const email = req.user.email;
  const productid = data.productid;
  const text = data.text;
  const reviewid = generateId();

  const response = await fetch(`${process.env.MODELURL}/predict`, {
    method: "POST",
    headers: { "Content-type": "application/json;" },
    body: JSON.stringify({ text: text }),
  });

  const pred = await response.json();
  console.log(pred);
  const label = pred.prediction === "Abusive" ? 1 : 0;
  console.log(label);

  reviewModel.insertReview(email, productid, text, label, reviewid, (err, result) => {
    try {
      if (err) throw err;
      console.log("Review inserted to table");
      res.json(result);
    } catch (error) {
      console.log("Error fetching data", error);
      res.status(500).send("Internal Server Error");
    }
  });
};

const deleteReview = (req, res) => {
  const reviewid = req.body.reviewid;
  console.log("Reviewid for review", req.body);

  try {
    reviewModel.deleteReview(reviewid, (err) => {
      console.log("Review Deleted from Database");
      res.status(200).send("Review Deleted from Database");
    });
  } catch (error) {
    console.log("Error fetching data", error);
    res.status(500).send("Internal Server Error");
  }
};

module.exports = { getReviews, addReview, deleteReview };
