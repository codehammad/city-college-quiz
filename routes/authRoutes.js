// Routes for auth.
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const db = require("../config/db");
const { requireRole } = require("../middleware/auth");
const { page, clean } = require("../utils/helpers");
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false, message: "Too many login attempts. Try again in 15 minutes." });

router.get("/", (req, res) =>
  res.redirect(
    req.session.user
      ? req.session.user.role === "admin"
        ? "/admin"
        : "/team"
      : "/login"
  )
);
router.get("/login", (req, res) =>
  page(req, res, "auth/login", {
    title: "Sign in",
    mode: req.query.role === "team" ? "team" : "admin",
  })
);
router.post("/login", loginLimiter, async (req, res, next) => {
  try {
    const username = clean(req.body.username),
      password = req.body.password || "",
      role = req.body.role === "team" ? "team" : "admin";
    let rows;
    if (!username || !password) {
      req.flash("error", "Enter your username and password.");
      return res.redirect("/login" + (role === "team" ? "?role=team" : ""));
    }
    if (role === "admin")
      rows = await db
        .execute(
          "SELECT id, username, password_hash AS hash, full_name AS name, profile_photo FROM admins WHERE username = ? AND is_active = 1",
          [username]
        )
        .then((r) => r[0]);
    else
      rows = await db
        .execute(
          "SELECT t.id, t.username, t.password_hash AS hash, t.team_name AS name, t.campus_id, c.name AS campus, t.profile_photo FROM teams t JOIN campuses c ON c.id=t.campus_id WHERE t.username=? AND t.is_active=1",
          [username]
        )
        .then((r) => r[0]);
    if (!rows.length || !(await bcrypt.compare(password, rows[0].hash))) {
      req.flash("error", "Incorrect username or password.");
      return res.redirect("/login" + (role === "team" ? "?role=team" : ""));
    }
    const account = rows[0];
    req.session.regenerate((err) => {
      if (err) return next(err);
      req.session.user = {
        id: account.id,
        name: account.name,
        username,
        role,
        campusId: account.campus_id,
        campus: account.campus,
        profilePhoto: account.profile_photo,
      };
      req.session.save(() =>
        res.redirect(role === "admin" ? "/admin" : "/team")
      );
    });
  } catch (err) {
    next(err);
  }
});
router.post("/logout", (req, res) =>
  req.session.destroy(() => res.redirect("/login"))
);

module.exports = router;
