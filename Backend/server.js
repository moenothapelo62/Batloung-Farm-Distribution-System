const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { testConnection } = require("./config/db");
const { errorHandler, notFound } = require("./middleware/errorHandler");

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 5000);

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.status(200).json({ ok: true, service: "Batloung Farm Distribution API", time: new Date().toISOString() });
});

app.use("/api/suppliers", require("./routes/suppliers"));
app.use("/api/fruits", require("./routes/fruits"));
app.use("/api/vendors", require("./routes/vendors"));
app.use("/api/stock", require("./routes/stock"));
app.use("/api/purchases", require("./routes/purchases"));
app.use("/api/sales", require("./routes/sales"));
app.use("/api/payments", require("./routes/payments"));
app.use("/api/reports", require("./routes/reports"));

app.use(notFound);
app.use(errorHandler);

async function start() {
  try {
    await testConnection();
    console.log("Database connected successfully.");
  } catch (err) {
    console.error("Database connection failed:", err.message);
    console.error("Server will start, but database-dependent routes will return errors until configured.");
  }
  app.listen(PORT, () => console.log(`Batloung API running on http://localhost:${PORT}`));
}

start();
