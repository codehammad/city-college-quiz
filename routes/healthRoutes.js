// Routes for health.
const express = require("express");
const router = express.Router();
const db = require("../config/db");


router.get("/health", async (req, res) => {
  try {
    await db.query("SELECT 1");
    res.json({ ok: true, database: "connected" });
  } catch (e) {
    res.status(503).json({ ok: false, database: "unavailable" });
  }
});

module.exports = router;
