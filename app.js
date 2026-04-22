const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
app.use(bodyParser.json());
app.use(cors());

const initDb = require('./config/initDb');

const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const orderRoutes = require('./routes/orderRoutes');
const otpRoutes = require('./routes/otpRoutes');

app.use('/', authRoutes);
app.use('/', productRoutes);
app.use('/', cartRoutes);
app.use('/', reviewRoutes);
app.use('/', orderRoutes);
app.use('/', otpRoutes);

initDb((err) => {
  if (err) {
    console.error("Failed to initialize database tables:", err);
    process.exit(1);
  }
  app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
  });
});
