// Admin dashboard summary and recent activity.
const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { requireRole } = require("../middleware/auth");
const { page } = require("../utils/helpers");
const adminOnly = requireRole("admin");

router.get("/admin", adminOnly, async (req, res, next) => {
  try {
    const [[campuses]] = await db.query(
      "SELECT COUNT(*) AS total FROM campuses WHERE is_active=1"
    );
    const [[teams]] = await db.query(
      "SELECT COUNT(*) AS total FROM teams WHERE is_active=1"
    );
    const [[competitions]] = await db.query(
      "SELECT COUNT(*) AS total FROM competitions WHERE status IN ('Scheduled','Live')"
    );
    const [[questions]] = await db.query(
      "SELECT COUNT(*) AS total FROM questions"
    );
    const [recent] = await db.query(
      "SELECT id,title,start_at,status FROM competitions ORDER BY start_at DESC LIMIT 5"
    );
    const [campusStats] = await db.query(
      "SELECT c.name, COUNT(t.id) AS teams FROM campuses c LEFT JOIN teams t ON t.campus_id=c.id AND t.is_active=1 GROUP BY c.id ORDER BY c.id"
    );
    page(req, res, "admin/dashboard", {
      title: "Dashboard",
      active: "Dashboard",
      stats: {
        campuses: campuses.total,
        teams: teams.total,
        competitions: competitions.total,
        questions: questions.total,
      },
      recent,
      campusStats,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
