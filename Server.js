const express = require("express");
const session = require("express-session");
const axios = require("axios");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(session({
  secret: "super-secret-key",
  resave: false,
  saveUninitialized: true
}));

// Serve static frontend files from root
app.use(express.static(__dirname));

// Config
const SNIPEIT_URL = process.env.SNIPEIT_URL || "https://victoria.snipe-it.io";
const API_KEY = process.env.SNIPEIT_API_KEY || "PUT-YOUR-API-KEY-HERE";

// -------------------------
// LOGIN ENDPOINT
// -------------------------
app.post("/login", async (req, res) => {
  const { username } = req.body;
  try {
    const users = await axios.get(`${SNIPEIT_URL}/api/v1/users`, {
      headers: { Authorization: `Bearer ${API_KEY}` }
    });
    const found = users.data.rows.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!found) return res.status(401).json({ message: "Invalid username" });

    // Mock password check for now
    req.session.user = {
      id: found.id,
      username: found.username,
      company_id: found.company?.id || null
    };
    res.json({ message: "Login successful", user: req.session.user });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Login failed" });
  }
});

// -------------------------
// ASSET SEARCH ENDPOINT
// -------------------------
app.get("/assets", async (req, res) => {
  if (!req.session.user) return res.status(403).json({ message: "Not logged in" });

  const { city } = req.query;
  const companyId = req.session.user.company_id;

  try {
    const assets = await axios.get(`${SNIPEIT_URL}/api/v1/hardware`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
      params: { search: city, company_id: companyId }
    });

    const filtered = assets.data.rows.filter(a =>
      a.location?.name?.toLowerCase().includes(city.toLowerCase())
    );

    res.json(filtered);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Asset query failed" });
  }
});

// -------------------------
// LOGOUT ENDPOINT
// -------------------------
app.post("/logout", (req, res) => {
  req.session.destroy();
  res.json({ message: "Logged out" });
});

// Serve index.html for any unknown route
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// -------------------------
// START SERVER
// -------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Portal backend running at http://localhost:${PORT}`));
