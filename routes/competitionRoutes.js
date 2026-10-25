// Routes for competition.
const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { requireRole } = require("../middleware/auth");
const { page, clean } = require("../utils/helpers");
const adminOnly = requireRole("admin");

router.get("/admin/competitions", adminOnly, async (req, res, next) => {
  try {
    const [competitions] = await db.query(
      "SELECT id,title,category,start_at,duration_minutes,status FROM competitions ORDER BY start_at DESC"
    );
    page(req, res, "admin/competitions", {
      title: "Competitions",
      active: "Competitions",
      competitions,
    });
  } catch (e) {
    next(e);
  }
});
router.post("/admin/competitions", adminOnly, async (req, res) => {
  try {
    const title = clean(req.body.title),
      category = clean(req.body.category),
      start = clean(req.body.start_at),
      duration = Number(req.body.duration_minutes),
      marks = Number(req.body.marks_per_question),
      release = ["immediate", "after_competition"].includes(
        req.body.results_release
      )
        ? req.body.results_release
        : "immediate";
    if (
      !title ||
      !category ||
      !start ||
      Number.isNaN(new Date(start).getTime()) ||
      duration < 1 ||
      duration > 180 ||
      marks < 1 ||
      marks > 100
    )
      throw new Error(
        "Complete the required competition fields with valid values."
      );
    const [insert] = await db.execute(
      "INSERT INTO competitions (title,description,category,start_at,duration_minutes,marks_per_question,status,results_release) VALUES (?,?,?,?,?,?,?,?)",
      [
        title,
        clean(req.body.description),
        category,
        new Date(start),
        duration,
        marks,
        "Scheduled",
        release,
      ]
    );
    for (const teamId of [].concat(req.body.team_ids || [])) {
      if (Number(teamId) > 0)
        await db.execute(
          "INSERT IGNORE INTO competition_teams (competition_id,team_id) VALUES (?,?)",
          [insert.insertId, Number(teamId)]
        );
    }
    req.flash("success", "Competition created.");
  } catch (e) {
    req.flash("error", e.message);
  }
  res.redirect("/admin/competitions");
});
router.get("/admin/competitions/new", adminOnly, async (req, res, next) => {
  try {
    const [teams] = await db.query(
      "SELECT t.id,t.team_name,c.name campus FROM teams t JOIN campuses c ON c.id=t.campus_id WHERE t.is_active=1 ORDER BY c.id,t.team_name"
    );
    page(req, res, "admin/new-competition", {
      title: "New competition",
      active: "Competitions",
      teams,
    });
  } catch (e) {
    next(e);
  }
});
router.get("/admin/competitions/:id/edit", adminOnly, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const [[competition]] = await db.execute(
      "SELECT * FROM competitions WHERE id=?",
      [id]
    );
    if (!competition)
      return res
        .status(404)
        .render("error", {
          title: "Competition not found",
          message: "This competition may have been deleted.",
        });
    const [[attempts]] = await db.execute(
      "SELECT COUNT(*) AS total FROM quiz_attempts WHERE competition_id=?",
      [id]
    );
    if (attempts.total)
      return res
        .status(403)
        .render("error", {
          title: "Competition locked",
          message:
            "Competition details cannot be changed after a team starts the quiz.",
        });
    const [teams] = await db.query(
      "SELECT t.id,t.team_name,c.name campus,IF(ct.team_id IS NULL,0,1) AS selected FROM teams t JOIN campuses c ON c.id=t.campus_id LEFT JOIN competition_teams ct ON ct.team_id=t.id AND ct.competition_id=? WHERE t.is_active=1 ORDER BY c.id,t.team_name",
      [id]
    );
    page(req, res, "admin/edit-competition", {
      title: "Edit competition",
      active: "Competitions",
      competition,
      teams,
    });
  } catch (e) {
    next(e);
  }
});
router.post("/admin/competitions/:id/update", adminOnly, async (req, res) => {
  const id = Number(req.params.id);
  let conn;
  try {
    const title = clean(req.body.title),
      category = clean(req.body.category),
      start = clean(req.body.start_at),
      duration = Number(req.body.duration_minutes),
      marks = Number(req.body.marks_per_question),
      release = ["immediate", "after_competition"].includes(
        req.body.results_release
      )
        ? req.body.results_release
        : "immediate";
    if (
      !title ||
      !category ||
      !start ||
      Number.isNaN(new Date(start).getTime()) ||
      duration < 1 ||
      duration > 180 ||
      marks < 1 ||
      marks > 100
    )
      throw new Error(
        "Complete the required competition fields with valid values."
      );
    conn = await db.getConnection();
    await conn.beginTransaction();
    const [[attempts]] = await conn.execute(
      "SELECT COUNT(*) AS total FROM quiz_attempts WHERE competition_id=?",
      [id]
    );
    if (attempts.total)
      throw new Error(
        "Competition details cannot be changed after a team starts the quiz."
      );
    await conn.execute(
      "UPDATE competitions SET title=?,description=?,category=?,start_at=?,duration_minutes=?,marks_per_question=?,results_release=? WHERE id=?",
      [
        title,
        clean(req.body.description),
        category,
        new Date(start),
        duration,
        marks,
        release,
        id,
      ]
    );
    await conn.execute("DELETE FROM competition_teams WHERE competition_id=?", [
      id,
    ]);
    for (const teamId of [].concat(req.body.team_ids || [])) {
      if (Number(teamId) > 0)
        await conn.execute(
          "INSERT IGNORE INTO competition_teams (competition_id,team_id) VALUES (?,?)",
          [id, Number(teamId)]
        );
    }
    await conn.commit();
    req.flash("success", "Competition updated.");
  } catch (e) {
    if (conn) await conn.rollback();
    req.flash("error", e.message);
  } finally {
    if (conn) conn.release();
  }
  res.redirect("/admin/competitions");
});
router.post("/admin/competitions/:id/status", adminOnly, async (req, res) => {
  try {
    const status = clean(req.body.status);
    if (!["Draft", "Scheduled", "Live", "Completed"].includes(status))
      throw new Error("Choose a valid competition status.");
    await db.execute("UPDATE competitions SET status=? WHERE id=?", [
      status,
      Number(req.params.id),
    ]);
    req.flash("success", "Competition status updated.");
  } catch (e) {
    req.flash("error", e.message);
  }
  res.redirect("/admin/competitions");
});
router.post("/admin/competitions/:id/delete", adminOnly, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [[attempt]] = await db.execute(
      "SELECT COUNT(*) AS total FROM quiz_attempts WHERE competition_id=?",
      [id]
    );
    if (attempt.total)
      throw new Error(
        "This competition has quiz attempts and cannot be deleted. Mark it Completed instead."
      );
    await db.execute("DELETE FROM competitions WHERE id=?", [id]);
    req.flash("success", "Competition deleted.");
  } catch (e) {
    req.flash("error", e.message);
  }
  res.redirect("/admin/competitions");
});

module.exports = router;
