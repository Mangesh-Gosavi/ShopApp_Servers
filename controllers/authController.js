const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

const userModel = require('../models/userModel');
const { getCurrentDate } = require('../utils/helpers');

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

const login = async (req, res) => {
  const data = JSON.parse(req.query.data);
  try {
    const queryResult = await new Promise((resolve, reject) => {
      userModel.findUserByEmail(data.email, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });

    if (queryResult.length > 0) {
      const user = queryResult[0];
      console.log('data.password, user.password',data.password, user.password)
      const passwordMatch = await bcrypt.compare(data.password, user.password);
      if (passwordMatch) {
        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "1h" });
        return res.status(200).json({ login: "successful", token });
      } else {
        return res.status(401).json({ success: false, message: "Invalid email or password" });
      }
    } else {
      return res.status(401).json({ success: false, message: "User not found" });
    }
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).send("Internal Server Error");
  }
};

const signup = async (req, res) => {
  const details = req.body;
  const hashedPassword = await bcrypt.hash(details.password, 10);
  const date = getCurrentDate();

  userModel.findUserByEmail(details.email, (err, prevResult) => {
    if (err) throw err;
    if (prevResult.length === 0) {
      const values = [[details.id, details.name, details.phone, details.email, hashedPassword, date]];
      userModel.insertUser(values, (err) => {
        if (err) throw err;
        console.log("1 record inserted");
        const token = jwt.sign({ id: details.id, email: details.email }, JWT_SECRET, { expiresIn: "1h" });
        return res.status(200).json({ login: "successful", token });
      });
    } else {
      return res.status(401).json({ success: false, message: "Already a user with this email" });
    }
  });
};

const getProfile = (req, res) => {
  userModel.findUserByEmail(req.user.email, (err, result) => {
    if (err) throw err;
    if (result.length > 0) {
      const data = {
        id: result[0].id,
        name: result[0].name,
        phone: result[0].phone,
        email: result[0].email,
      };
      res.json(data);
    } else {
      res.status(404).json({ success: false, message: "User not found" });
    }
  });
};

const logout = (req, res) => {
  console.log("Logout successful");
  return res.status(200).json({ status: "successful" });
};

module.exports = { login, signup, getProfile, logout };
