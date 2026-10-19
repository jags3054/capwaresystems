const express = require("express");
const router = express.Router();
const { createOrder, verifyPayment } = require("../controller/paymentController");

// IMPORTANT: Replace this import with the JWT auth middleware used by your project.
// It must authenticate the bearer token and set req.user.id.
const auth = require("../middelware/authMiddleware");

router.post("/create-order", auth, createOrder);
router.post("/verify", auth, verifyPayment);

module.exports = router;
