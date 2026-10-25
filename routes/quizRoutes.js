// Team quiz access, answer saving, and final submission.
const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { requireRole } = require("../middleware/auth");
const { page } = require("../utils/helpers");
const teamOnly = requireRole("team");

router.get("/quiz/:id", teamOnly, async (req, res, next) => {
  try {
    const id = Number(req.params.id),
      team = req.session.user.id;
    const [[comp]] = await db.execute(
      "SELECT c.* FROM competitions c JOIN competition_teams ct ON ct.competition_id=c.id WHERE c.id=? AND ct.team_id=?",
      [id, team]
    );
    if (!comp)
      return res
        .status(404)
        .render("error", {
          title: "Quiz unavailable",
          message: "This competition is not assigned to your team.",
        });
    const now = Date.now(),
      start = new Date(comp.start_at).getTime();
    if (now < start)
      return res
        .status(403)
        .render("error", {
          title: "Not started",
          message: "This competition has not started yet.",
        });
    if (comp.status === "Draft" || comp.status === "Completed")
      return res
        .status(403)
        .render("error", {
          title: "Quiz unavailable",
          message: "This competition is currently closed.",
        });
    const [attempts] = await db.execute(
      "SELECT id,started_at,submitted_at FROM quiz_attempts WHERE competition_id=? AND team_id=?",
      [id, team]
    );
    if (attempts[0]?.submitted_at) return res.redirect("/team/results");
    let attemptId, startedAt;
    if (attempts.length) {
      attemptId = attempts[0].id;
      startedAt = attempts[0].started_at;
    } else {
      const [ins] = await db.execute(
        "INSERT INTO quiz_attempts (competition_id,team_id,started_at) VALUES (?,?,NOW())",
        [id, team]
      );
      attemptId = ins.insertId;
      startedAt = new Date();
    }
    const [questions] = await db.execute(
      "SELECT q.id,q.question_text,o.id AS option_id,o.option_text FROM questions q JOIN options o ON o.question_id=q.id WHERE q.competition_id=? ORDER BY q.id,o.id",
      [id]
    );
    const grouped = [];
    for (const row of questions) {
      let item = grouped.find((q) => q.id === row.id);
      if (!item) {
        item = { id: row.id, text: row.question_text, options: [] };
        grouped.push(item);
      }
      item.options.push({ id: row.option_id, text: row.option_text });
    }
    if (!grouped.length)
      return res
        .status(400)
        .render("error", {
          title: "Quiz unavailable",
          message: "No questions have been added yet.",
        });
    const [answers] = await db.execute(
      "SELECT question_id,option_id FROM team_answers WHERE attempt_id=?",
      [attemptId]
    );
    page(req, res, "team/quiz", {
      title: comp.title,
      competition: comp,
      questions: grouped,
      attemptId,
      startedAt,
      answers: Object.fromEntries(
        answers.map((a) => [a.question_id, a.option_id])
      ),
      active: "Competitions",
    });
  } catch (e) {
    next(e);
  }
});
router.post("/quiz/:id/save", teamOnly, async (req, res, next) => {
  try {
    const competitionId = Number(req.params.id),
      teamId = req.session.user.id,
      attemptId = Number(req.body.attempt_id),
      questionId = Number(req.body.question_id),
      optionId = Number(req.body.option_id);
    const [[attempt]] = await db.execute(
      "SELECT id,started_at,submitted_at FROM quiz_attempts WHERE id=? AND competition_id=? AND team_id=?",
      [attemptId, competitionId, teamId]
    );
    if (!attempt || attempt.submitted_at)
      return res.status(403).json({ error: "Quiz is already submitted." });
    const [[allowed]] = await db.execute(
      "SELECT o.id FROM options o JOIN questions q ON q.id=o.question_id WHERE o.id=? AND q.id=? AND q.competition_id=?",
      [optionId, questionId, competitionId]
    );
    if (!allowed) return res.status(400).json({ error: "Invalid answer." });
    const [[comp]] = await db.execute(
      "SELECT duration_minutes FROM competitions WHERE id=?",
      [competitionId]
    );
    if (
      Date.now() >
      new Date(attempt.started_at).getTime() + comp.duration_minutes * 60000
    )
      return res.status(403).json({ error: "Time expired." });
    await db.execute(
      "INSERT INTO team_answers (attempt_id,question_id,option_id) VALUES (?,?,?) ON DUPLICATE KEY UPDATE option_id=VALUES(option_id)",
      [attemptId, questionId, optionId]
    );
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});
router.post("/quiz/:id/submit", teamOnly, async (req, res, next) => {
  const conn = await db.getConnection();
  try {
    const competitionId = Number(req.params.id),
      teamId = req.session.user.id,
      attemptId = Number(req.body.attempt_id);
    await conn.beginTransaction();
    const [[attempt]] = await conn.execute(
      "SELECT id,started_at,submitted_at FROM quiz_attempts WHERE id=? AND competition_id=? AND team_id=? FOR UPDATE",
      [attemptId, competitionId, teamId]
    );
    if (!attempt) throw new Error("Quiz attempt not found.");
    if (attempt.submitted_at) {
      await conn.commit();
      return res.redirect("/team/results");
    }
    const [[comp]] = await conn.execute(
      "SELECT duration_minutes,marks_per_question FROM competitions WHERE id=?",
      [competitionId]
    );
    const [[score]] = await conn.execute(
      "SELECT COUNT(*) AS correct FROM team_answers a JOIN options o ON o.id=a.option_id WHERE a.attempt_id=? AND o.is_correct=1",
      [attemptId]
    );
    await conn.execute(
      "UPDATE quiz_attempts SET submitted_at=NOW() WHERE id=?",
      [attemptId]
    );
    await conn.execute(
      "INSERT INTO results (attempt_id,competition_id,team_id,score,correct_count,submitted_at) VALUES (?,?,?,?,?,NOW())",
      [
        attemptId,
        competitionId,
        teamId,
        score.correct * comp.marks_per_question,
        score.correct,
      ]
    );
    await conn.commit();
    req.flash("success", "Quiz submitted. Your result is saved.");
    res.redirect("/team/results");
  } catch (e) {
    await conn.rollback();
    req.flash("error", e.message);
    res.redirect("/team");
  } finally {
    conn.release();
  }
});

module.exports = router;
