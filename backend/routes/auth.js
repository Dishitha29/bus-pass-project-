const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const supabase = require("../supabase");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  next();
}
function issueToken(user) {
  return jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "8h" });
}
function publicUser(user) {
  return { id: user.id, name: user.full_name, email: user.email, role: user.role };
}
router.post("/signup", [
  body("name").trim().isLength({ min: 2, max: 80 }).withMessage("Name must be between 2 and 80 characters."),
  body("email").trim().isEmail().normalizeEmail().withMessage("Enter a valid email address."),
  body("password").isLength({ min: 8, max: 72 }).withMessage("Password must be at least 8 characters.")
    .matches(/[a-z]/).withMessage("Password must include a lowercase letter.")
    .matches(/[A-Z]/).withMessage("Password must include an uppercase letter.")
    .matches(/[0-9]/).withMessage("Password must include a number.")
    .matches(/[^A-Za-z0-9]/).withMessage("Password must include a special character.")
], validate, async (req, res, next) => {
  try {
    const name = req.body.name.trim(), email = req.body.email.toLowerCase();
    const { data: existing, error: lookupError } = await supabase.from("profiles").select("id").eq("email", email).maybeSingle();
    if (lookupError) throw lookupError;
    if (existing) return res.status(409).json({ error: "An account with this email already exists. Please log in." });
    const password_hash = await bcrypt.hash(req.body.password, 12);
    const { data: user, error } = await supabase.from("profiles")
      .insert({ full_name: name, email, password_hash, role: "student" })
      .select("id, full_name, email, role").single();
    if (error) {
      if (error.code === "23505") return res.status(409).json({ error: "An account with this email already exists." });
      throw error;
    }
    return res.status(201).json({ token: issueToken(user), user: publicUser(user) });
  } catch (error) { next(error); }
});
router.post("/login", [
  body("email").trim().isEmail().withMessage("Enter a valid email address."),
  body("password").isString().notEmpty().withMessage("Password is required.")
], validate, async (req, res, next) => {
  try {
    const email = req.body.email.trim().toLowerCase();
    const { data: user, error } = await supabase.from("profiles")
      .select("id, full_name, email, role, password_hash").eq("email", email).maybeSingle();
    if (error) throw error;
    if (!user || !(await bcrypt.compare(req.body.password, user.password_hash))) {
      return res.status(401).json({ error: "Email or password is incorrect." });
    }
    return res.json({ token: issueToken(user), user: publicUser(user) });
  } catch (error) { next(error); }
});
router.get("/me", requireAuth, (req, res) => res.json({ user: req.user }));
module.exports = router;
