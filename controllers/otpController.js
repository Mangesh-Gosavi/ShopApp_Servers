const sgMail = require('@sendgrid/mail');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
dotenv.config();

const forgotModel = require('../models/forgotModel');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendOtp = (req, res) => {
  const { email } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000);

  forgotModel.findUserByEmail(email, (err, result) => {
    if (err) {
      console.error("Error querying database:", err);
      return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }

    if (result.length === 0) {
      console.log("User not found");
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const msg = {
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: 'Your OTP for Password Reset',
      text: `Your OTP is: ${otp}. It is valid for 10 minutes.`,
    };

    sgMail
      .send(msg)
      .then(() => {
        console.log(`OTP email sent to ${email}`);
        forgotModel.insertOtp(email, otp, (err) => {
          if (err) {
            console.error("Error inserting OTP:", err);
            return res.status(500).json({ success: false, error: 'Failed to store OTP' });
          }
          console.log("OTP stored in forgot table");
          res.json({ success: true, message: 'OTP sent successfully' });
        });
      })
      .catch((err) => {
        console.error("Error sending email:", err.response?.body?.errors || err);
        res.status(500).json({ success: false, error: 'Failed to send OTP' });
      });
  });
};

const verifyOtp = (req, res) => {
  const { email, otp } = req.body;

  forgotModel.findOtpByEmail(email, (err, result) => {
    if (err) {
      console.error("Error querying database:", err);
      return res.status(500).send("Internal Server Error");
    }

    if (result.length === 0) {
      console.log("OTP record not found");
      return res.status(404).json({ success: false, error: 'OTP not found for this email' });
    }

    if (parseInt(result[0].otp) === otp) {
      console.log("OTP Matched");
      forgotModel.deleteOtpByEmail(email, (err) => {
        if (err) console.error("Error deleting OTP:", err);
        else console.log("OTP record deleted from forgot table");
      });
      return res.status(200).send("OTP Matched");
    } else {
      console.log("OTP Not Matched");
      return res.status(401).send("OTP Not Matched");
    }
  });
};

const newPassword = async (req, res) => {
  const { email, newpassword } = req.body;
  const hashedPassword = await bcrypt.hash(newpassword, 10);

  forgotModel.findUserByEmail(email, (err, result) => {
    if (err) {
      console.error("Error querying database:", err);
      return res.status(500).send("Internal Server Error");
    }

    if (result.length === 0) {
      console.log("User not found");
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    forgotModel.updatePasswordByEmail(hashedPassword, email, (err) => {
      if (err) {
        console.error("Error updating password:", err);
        return res.status(500).send("Internal Server Error");
      }
      console.log("Password updated successfully");
      res.status(200).send("Password updated Successfully");
    });
  });
};

module.exports = { sendOtp, verifyOtp, newPassword };
