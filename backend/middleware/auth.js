const jwt = require("jsonwebtoken");
const supabase = require("../supabase");

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return res.status(401).json({ error: "Please log in to continue." });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const { data: user, error } = await supabase
      .from("profiles").select("id, full_name, email, role").eq("id", payload.sub).maybeSingle();
    if (error || !user) return res.status(401).json({ error: "Your account could not be verified. Please log in again." });
    req.user = { id: user.id, name: user.full_name, email: user.email, role: user.role };
    next();
  } catch {
    return res.status(401).json({ error: "Your session is invalid or expired. Please log in again." });
  }
}
function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Administrator permission is required." });
  next();
}
module.exports = { requireAuth, requireAdmin };
