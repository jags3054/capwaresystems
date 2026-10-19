
const express = require("express");
require("dotenv").config();
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const requireAdmin = require("./middelware/requireAdmin");
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Temporary development request log
app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  next();
});

// Existing routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/contact", require("./routes/contactRoutes"));
app.use("/api/workshop", require("./routes/workshop"));

app.use("/api/admin-auth", require("./routes/adminAuthRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
// Keep exactly one mount for the existing chatbot admin routes:
app.use("/api/admin/chatbot", require("./routes/aiChatAdminRoutes"));


// Project and service enrollments
app.use("/api/enrollments", require("./routes/enrollmentRoutes"));
app.use("/api/payments", require("./routes/paymentRoutes"));

app.use("/api/ai-chat", require("./routes/aiChatRoutes"));
app.use("/api/research", require("./routes/researchRoutes"));
app.use("/api/admin/research-enquiries", requireAdmin, require("./routes/researchAdminRoutes") );



// API health check
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Capware Systems API is running",
  });
});

// Return a clear response for unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing from .env");
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is missing from .env");
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected successfully");

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
}

startServer();
