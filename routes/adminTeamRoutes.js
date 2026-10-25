// Routes for admin team.
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const db = require("../config/db");
const { requireRole } = require("../middleware/auth");
const { page, clean } = require("../utils/helpers");
const adminOnly = requireRole("admin");
const defaultTeamPassword = process.env.DEFAULT_TEAM_PASSWORD || "cityteam123";

router.get("/admin/teams", adminOnly, async (req, res, next) => {
  try {
    const [teams] = await db.query(
      "SELECT t.id,t.campus_id,t.team_name,t.username,t.is_active,c.name AS campus FROM teams t JOIN campuses c ON c.id=t.campus_id ORDER BY c.id,t.team_name"
    );
    const [campuses] = await db.query(
      "SELECT id,name FROM campuses WHERE is_active=1"
    );
    const [availableCampuses] = await db.query(
      "SELECT c.id,c.name FROM campuses c WHERE c.is_active=1 AND NOT EXISTS (SELECT 1 FROM teams t WHERE t.campus_id=c.id)"
    );
    page(req, res, "admin/teams", {
      title: "Teams",
      active: "Teams",
      teams,
      campuses,
      availableCampuses,
      defaultTeamPassword,
    });
  } catch (e) {
    next(e);
  }
});
router.post("/admin/teams", adminOnly, async (req, res) => {
  try {
    const name = clean(req.body.team_name),
      username = clean(req.body.username),
      password = req.body.password || defaultTeamPassword,
      campusId = Number(req.body.campus_id);
    if (!name || !username || password.length < 8 || !campusId)
      throw new Error(
        "Fill all fields. Password must be at least 8 characters."
      );
    const [[existingTeam]] = await db.execute(
      "SELECT id FROM teams WHERE campus_id=?",
      [campusId]
    );
    if (existingTeam) throw new Error("This campus already has a team.");
    const hash = await bcrypt.hash(password, 12);
    await db.execute(
      "INSERT INTO teams (campus_id,team_name,username,password_hash) VALUES (?,?,?,?)",
      [campusId, name, username, hash]
    );
    req.flash("success", "Team registered.");
  } catch (e) {
    req.flash(
      "error",
      e.code === "ER_DUP_ENTRY"
        ? "This campus already has a team, or that username is already in use."
        : e.message
    );
  }
  res.redirect("/admin/teams");
});
router.post("/admin/teams/:id/status", adminOnly, async (req, res) => {
  await db.execute(
    "UPDATE teams SET is_active=IF(is_active=1,0,1) WHERE id=?",
    [Number(req.params.id)]
  );
  req.flash("success", "Team status updated.");
  res.redirect("/admin/teams");
});
router.post("/admin/teams/:id/delete", adminOnly, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) throw new Error("Invalid team.");
    const [[team]] = await db.execute(
      "SELECT team_name FROM teams WHERE id=?",
      [id]
    );
    if (!team) throw new Error("Team not found.");
    await db.execute("DELETE FROM teams WHERE id=?", [id]);
    req.flash(
      "success",
      `${team.team_name} and its associated quiz records were deleted.`
    );
  } catch (e) {
    req.flash("error", e.message);
  }
  res.redirect("/admin/teams");
});
router.post("/admin/teams/:id/update", adminOnly, async (req, res) => {
  try {
    const id = Number(req.params.id),
      name = clean(req.body.team_name),
      username = clean(req.body.username),
      campusId = Number(req.body.campus_id),
      password = req.body.password || "";
    if (!id || !name || !username || !campusId)
      throw new Error("Complete the team details.");
    if (password && password.length < 8)
      throw new Error("New password must have at least 8 characters.");
    if (password) {
      const hash = await bcrypt.hash(password, 12);
      await db.execute(
        "UPDATE teams SET team_name=?,username=?,campus_id=?,password_hash=? WHERE id=?",
        [name, username, campusId, hash, id]
      );
    } else
      await db.execute(
        "UPDATE teams SET team_name=?,username=?,campus_id=? WHERE id=?",
        [name, username, campusId, id]
      );
    req.flash("success", "Team details updated.");
  } catch (e) {
    req.flash(
      "error",
      e.code === "ER_DUP_ENTRY"
        ? "This campus already has a team, or that username is already in use."
        : e.message
    );
  }
  res.redirect("/admin/teams");
});

module.exports = router;
