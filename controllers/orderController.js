const orderModel = require('../models/orderModel');
const productModel = require('../models/productModel');
const cartModel = require('../models/cartModel');
const soldProductModel = require('../models/soldProductModel');
const userModel = require('../models/userModel');
const PDFDocument = require('pdfkit');
const { generateId, getCurrentDate } = require('../utils/helpers');

const updateInventoryAndSoldProducts = (products) => {
  for (let i of products) {
    productModel.getProductById(i.productid, (err, result) => {
      if (err) throw err;
      if (result.length > 0) {
        const newquantity = result[0].stock - i.quantity;
        productModel.updateProductStock(newquantity, i.productid, (err) => {
          if (err) throw err;
          console.log("1 stock data updated");
        });
      }
    });
  }

  for (let i of products) {
    productModel.getProductById(i.productid, (err, result) => {
      if (err) throw err;
      if (result.length > 0) {
        const productid = result[0].productid;
        const brand = result[0].brand;
        const size = result[0].size;
        const boughtprice = result[0].boughtprice;
        const price = result[0].price;

        soldProductModel.getSoldProductById(i.productid, (err, soldResult) => {
          if (soldResult && soldResult.length !== 0) {
            const soldquantity = parseInt(soldResult[0].soldquantity) + parseInt(i.quantity);
            soldProductModel.updateSoldProduct(soldquantity, productid, () => {
              console.log("1 stock data updated");
            });
          } else {
            soldProductModel.insertSoldProduct(productid, brand, size, boughtprice, price, i.quantity, (err) => {
              if (err) throw err;
              console.log("1 stock data inserted");
            });
          }
        });
      }
    });
  }
};

const placeOrder = (req, res) => {
  const data = req.body;
  const useremail = req.user.email;
  const orderid = generateId();
  const date = getCurrentDate();
  console.log(useremail);
  console.log(data);

  if (data.method !== 'COD') {
    console.log("Online Method Currently Not Available");
    return res.status(500).send("Online Method Currently Not Available");
  }

  userModel.findUserByEmail(useremail, (err, userresult) => {
    if (err) throw err;

    if (!userresult || userresult.length === 0) {
      console.log("No such user");
      return res.status(404).json({ success: false, message: "User not found" });
    }

    console.log("User Found");

    for (let i of data.product) {
      console.log(i);
      orderModel.insertOrderItem(orderid, useremail, i.productid, i.size, i.quantity, (err) => {
        if (err) throw err;
        console.log("1 record inserted");
      });
    }

    orderModel.insertOrderDetails(orderid, useremail, data.total, data.method, data.address, date, (err) => {
      if (err) throw err;
      console.log("1 record inserted");
    });

    cartModel.clearCart(useremail, (err) => {
      if (err) throw err;
    });

    updateInventoryAndSoldProducts(data.product);

    res.status(200).send("Ordered booked");
  });
};

const getUserOrders = (req, res) => {
  const useremail = req.user.email;

  orderModel.getOrdersByUser(useremail, (err, result) => {
    if (err) {
      console.error("Error fetching data:", err);
      return res.status(500).send("Internal Server Error");
    }
    if (result.length === 0) {
      return res.status(404).json({ message: "No orders found" });
    }
    res.json(result);
  });
};

const formatDate = (d) => {
  const date = new Date(d);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
};

const drawBarcode = (doc, x, y, code) => {
  const widths = [1, 2, 1, 3, 1, 2, 3, 1, 2, 1, 3, 2, 1, 3, 1, 2, 1, 3, 2, 1, 3, 1, 2, 1, 3, 1, 2, 3, 1, 2];
  let cursor = x;
  widths.forEach((w, i) => {
    if (i % 2 === 0) doc.rect(cursor, y, w, 50).fill('#000');
    cursor += w + 1;
  });
  doc.fillColor('#000').font('Helvetica').fontSize(11).text(code, x, y + 55, { width: cursor - x, align: 'center' });
};

const downloadInvoice = (req, res) => {
  const email = req.user.email;
  const { orderid } = req.params;

  orderModel.getOrderWithItems(email, orderid, (err, rows) => {
    if (err) return res.status(500).send('Internal Server Error');
    if (!rows || rows.length === 0) return res.status(404).send('Not found');

    const order = {
      orderid,
      address: rows[0].address,
      totalamount: rows[0].totalamount,
      bookeddate: rows[0].bookeddate,
      status: rows[0].status,
      payment: rows[0].payment,
      username: rows[0].username,
    };
    const items = rows.map(r => ({
      brand: r.brand,
      product: r.product,
      size: r.size,
      quantity: r.quantity,
      price: r.price,
    }));

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${orderid}.pdf"`);
    doc.pipe(res);

    const left = 40;
    const right = 555;
    const accent = '#0a8a4a';
    const muted = '#888';
    const dark = '#222';

    doc.fillColor(accent).font('Helvetica-Bold').fontSize(26).text('Pooja Collection', left, 50);
    doc.fillColor(dark).font('Helvetica-Bold').fontSize(20).text('Your order is confirmed!', left, 90);

    doc.fillColor(dark).font('Helvetica-Bold').fontSize(12).text(`Hello ${order.username || 'Customer'},`, left, 130);
    doc.fillColor(muted).font('Helvetica').fontSize(10)
      .text('your order has been confirmed and will be shipped in two days', left, 148);

    doc.moveTo(left, 170).lineTo(right, 170).strokeColor('#e5e5e5').stroke();

    const colW = (right - left) / 4;
    const labelY = 185;
    const valueY = 200;
    doc.fillColor(muted).font('Helvetica').fontSize(9)
      .text('Order date', left, labelY)
      .text('Order number', left + colW, labelY)
      .text('Payment method', left + colW * 2, labelY)
      .text('Shipping Address', left + colW * 3, labelY);
    doc.fillColor(dark).font('Helvetica-Bold').fontSize(11)
      .text(formatDate(order.bookeddate), left, valueY, { width: colW - 10 })
      .text(order.orderid, left + colW, valueY, { width: colW - 10 })
      .text(order.payment, left + colW * 2, valueY, { width: colW - 10 });
    doc.fillColor(accent).font('Helvetica-Bold').fontSize(11)
      .text(order.address, left + colW * 3, valueY, { width: colW - 10 });

    doc.moveTo(left, 240).lineTo(right, 240).strokeColor('#e5e5e5').stroke();

    let y = 260;
    let subtotal = 0;
    items.forEach(it => {
      const lineTotal = it.price * it.quantity;
      subtotal += lineTotal;
      doc.fillColor(dark).font('Helvetica-Bold').fontSize(12)
        .text(`${it.brand} ${it.product}`, left, y, { width: 360 });
      doc.fillColor(muted).font('Helvetica').fontSize(10)
        .text(`Size: ${it.size}`, left, y + 18)
        .text(`Qty: ${it.quantity}pcs`, left, y + 32);
      doc.fillColor(dark).font('Helvetica-Bold').fontSize(12)
        .text(`Rs. ${lineTotal}`, right - 100, y, { width: 100, align: 'right' });
      y += 60;
    });

    doc.moveTo(left, y).lineTo(right, y).strokeColor('#e5e5e5').stroke();
    y += 20;

    drawBarcode(doc, left, y, order.orderid);

    const sumX = right - 220;
    const sumValX = right - 100;
    let sy = y;
    doc.fillColor(dark).font('Helvetica').fontSize(11);
    doc.text('Subtotal', sumX, sy);
    doc.text(`Rs. ${subtotal}`, sumValX, sy, { width: 100, align: 'right' });
    sy += 20;
    doc.text('Status', sumX, sy);
    doc.text(order.status, sumValX, sy, { width: 100, align: 'right' });
    sy += 25;
    doc.moveTo(sumX, sy).lineTo(right, sy).strokeColor('#e5e5e5').stroke();
    sy += 10;
    doc.fillColor(dark).font('Helvetica-Bold').fontSize(13).text('Total', sumX, sy);
    doc.fillColor(accent).font('Helvetica-Bold').fontSize(13)
      .text(`Rs. ${order.totalamount}`, sumValX, sy, { width: 100, align: 'right' });

    y += 110;
    doc.moveTo(left, y).lineTo(right, y).strokeColor('#e5e5e5').stroke();
    y += 15;
    doc.fillColor(dark).font('Helvetica-Bold').fontSize(11).text('Thanks for shopping', left, y);
    doc.fillColor(muted).font('Helvetica').fontSize(10).text('Pooja Collection team', left, y + 16);
    doc.fillColor(dark).font('Helvetica-Bold').fontSize(11).text('Need Help?', right - 150, y, { width: 150, align: 'right' });
    doc.fillColor(muted).font('Helvetica').fontSize(10)
      .text('Email - support@poojacollection.in', right - 200, y + 16, { width: 200, align: 'right' });

    doc.end();
  });
};

module.exports = { placeOrder, getUserOrders, downloadInvoice };
