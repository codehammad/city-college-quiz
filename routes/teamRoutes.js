// Routes for team.
const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { requireRole } = require("../middleware/auth");
const { page } = require("../utils/helpers");
const teamOnly = requireRole("team");

router.get("/team", teamOnly, async (req, res, next) => {
  try {
    const [competitions] = await db.execute(
      "SELECT c.id,c.title,c.category,c.start_at,c.duration_minutes,c.status,qa.submitted_at FROM competition_teams ct JOIN competitions c ON c.id=ct.competition_id LEFT JOIN quiz_attempts qa ON qa.competition_id=c.id AND qa.team_id=? WHERE ct.team_id=? ORDER BY c.start_at",
      [req.session.user.id, req.session.user.id]
    );
    page(req, res, "team/home", {
      title: "Team dashboard",
      active: "Dashboard",
      competitions,
    });
  } catch (e) {
    next(e);
  }
});
module.exports = router;
