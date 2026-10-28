const express = require("express");
const { body, validationResult } = require("express-validator");
const supabase = require("../supabase");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const router = express.Router();
const allowedTypes = ["Student", "General", "Monthly"];
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  next();
}
const applicationFields = [
  body("applicant_name").trim().isLength({ min: 2, max: 100 }).withMessage("Applicant name must be 2–100 characters."),
  body("phone").trim().matches(/^[0-9+\-()\s]{7,20}$/).withMessage("Enter a valid phone number."),
  body("pass_type").isIn(allowedTypes).withMessage("Choose a valid pass type."),
  body("route_start").trim().isLength({ min: 2, max: 120 }).withMessage("Starting point must be 2–120 characters."),
  body("route_end").trim().isLength({ min: 2, max: 120 }).withMessage("Destination must be 2–120 characters."),
  body("address").trim().isLength({ min: 5, max: 400 }).withMessage("Address must be 5–400 characters."),
  body("requested_start_date").isISO8601({ strict: true }).withMessage("Enter a valid start date.")
    .custom(value => value >= new Date().toISOString().slice(0, 10)).withMessage("Start date cannot be in the past.")
];
router.get("/", requireAuth, async (req, res, next) => {
  try {
    let query = supabase.from("bus_pass_applications")
      .select("id, user_id, applicant_name, phone, pass_type, route_start, route_end, requested_start_date, address, status, created_at, reviewed_at");
    if (req.user.role !== "admin") query = query.eq("user_id", req.user.id);
    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) throw error;
    let applications = data;
    if (req.user.role === "admin" && data.length) {
      const ids = [...new Set(data.map(item => item.user_id))];
      const { data: profiles, error: profileError } = await supabase.from("profiles").select("id, email").in("id", ids);
      if (profileError) throw profileError;
      const emails = Object.fromEntries(profiles.map(profile => [profile.id, profile.email]));
      applications = data.map(item => ({ ...item, email: emails[item.user_id] || "" }));
    }
    res.json({ applications });
  } catch (error) { next(error); }
});
router.post("/", requireAuth, applicationFields, validate, async (req, res, next) => {
  try {
    if (req.body.route_start.trim().toLowerCase() === req.body.route_end.trim().toLowerCase()) {
      return res.status(400).json({ error: "Starting point and destination must be different." });
    }
    const { data, error } = await supabase.from("bus_pass_applications").insert({
      user_id: req.user.id,
      applicant_name: req.body.applicant_name.trim(),
      phone: req.body.phone.trim(),
      pass_type: req.body.pass_type,
      route_start: req.body.route_start.trim(),
      route_end: req.body.route_end.trim(),
      requested_start_date: req.body.requested_start_date,
      address: req.body.address.trim()
    }).select("id, applicant_name, pass_type, route_start, route_end, requested_start_date, status, created_at").single();
    if (error) throw error;
    res.status(201).json({ application: data });
  } catch (error) { next(error); }
});
router.patch("/:id/status", requireAuth, requireAdmin, [
  body("status").isIn(["Approved", "Rejected"]).withMessage("Status must be Approved or Rejected.")
], validate, async (req, res, next) => {
  try {
    if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ error: "Invalid application ID." });
    const { data, error } = await supabase.from("bus_pass_applications")
      .update({ status: req.body.status, reviewed_at: new Date().toISOString() })
      .eq("id", Number(req.params.id)).eq("status", "Pending")
      .select("id, status, reviewed_at").maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Pending application not found. It may already have been reviewed." });
    res.json({ application: data });
  } catch (error) { next(error); }
});
module.exports = router;
