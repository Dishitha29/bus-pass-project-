require("dotenv").config();
const path = require("path");
const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const authRoutes = require("./routes/auth");
const applicationRoutes = require("./routes/applications");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error("JWT_SECRET is missing or too short. Set a random secret of at least 32 characters in backend/.env.");
  process.exit(1);
}
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in backend/.env.");
  process.exit(1);
}
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "20kb" }));
app.use(express.static(path.join(__dirname, "..", "frontend")));
app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "BusPass API" }));
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: "draft-8", legacyHeaders: false, message: { error: "Too many attempts. Please wait 15 minutes and try again." } });
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api", (_req, res) => res.status(404).json({ error: "API endpoint not found." }));
app.use((err, _req, res, _next) => {
  console.error("Request failed:", err.message || "Unknown error");
  const status = err.status && err.status >= 400 && err.status < 500 ? err.status : 500;
  res.status(status).json({ error: status === 500 ? "Server error. Check the server logs and database configuration." : "Request could not be completed." });
});
app.listen(PORT, () => console.log(`BusPass is running at http://localhost:${PORT}`));
