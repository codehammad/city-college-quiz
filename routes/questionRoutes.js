// Routes for question.
const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { requireRole } = require("../middleware/auth");
const { page, clean } = require("../utils/helpers");
const adminOnly = requireRole("admin");

router.get("/admin/questions", adminOnly, async (req, res, next) => {
  try {
    const [competitions] = await db.query(
      "SELECT id,title FROM competitions ORDER BY start_at DESC"
    );
    const [questions] = await db.query(
      "SELECT q.id,q.question_text,q.competition_id,c.title AS competition, (SELECT COUNT(*) FROM options o WHERE o.question_id=q.id) AS option_count FROM questions q JOIN competitions c ON c.id=q.competition_id ORDER BY q.id DESC"
    );
    page(req, res, "admin/questions", {
      title: "Questions",
      active: "Questions",
      questions,
      competitions,
    });
  } catch (e) {
    next(e);
  }
});
router.get("/admin/questions/:id/edit", adminOnly, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const [[question]] = await db.execute(
      "SELECT q.id,q.question_text,q.competition_id,c.title AS competition FROM questions q JOIN competitions c ON c.id=q.competition_id WHERE q.id=?",
      [id]
    );
    if (!question)
      return res
        .status(404)
        .render("error", {
          title: "Question not found",
          message: "This question may have been deleted.",
        });
    const [options] = await db.execute(
      "SELECT id,option_text,is_correct FROM options WHERE question_id=? ORDER BY id",
      [id]
    );
    const [[attempts]] = await db.execute(
      "SELECT COUNT(*) AS total FROM quiz_attempts WHERE competition_id=?",
      [question.competition_id]
    );
    if (attempts.total)
      return res
        .status(403)
        .render("error", {
          title: "Question locked",
          message:
            "Questions cannot be edited after a team has started this competition.",
        });
    page(req, res, "admin/edit-question", {
      title: "Edit question",
      active: "Questions",
      question,
      options,
    });
  } catch (e) {
    next(e);
  }
});
router.post("/admin/questions/:id/update", adminOnly, async (req, res) => {
  const id = Number(req.params.id),
    q = clean(req.body.question_text),
    answers = [req.body.a, req.body.b, req.body.c, req.body.d].map(clean),
    correct = Number(req.body.correct);
  let conn;
  try {
    if (!id || !q || answers.some((x) => !x) || ![1, 2, 3, 4].includes(correct))
      throw new Error("Complete the question and all four options.");
    conn = await db.getConnection();
    await conn.beginTransaction();
    const [[row]] = await conn.execute(
      "SELECT competition_id FROM questions WHERE id=? FOR UPDATE",
      [id]
    );
    if (!row) throw new Error("Question not found.");
    const [[attempts]] = await conn.execute(
      "SELECT COUNT(*) AS total FROM quiz_attempts WHERE competition_id=?",
      [row.competition_id]
    );
    if (attempts.total)
      throw new Error(
        "Questions are locked after a team starts this competition."
      );
    await conn.execute("UPDATE questions SET question_text=? WHERE id=?", [
      q,
      id,
    ]);
    const [options] = await conn.execute(
      "SELECT id FROM options WHERE question_id=? ORDER BY id",
      [id]
    );
    for (let i = 0; i < Math.min(options.length, 4); i++)
      await conn.execute(
        "UPDATE options SET option_text=?,is_correct=? WHERE id=?",
        [answers[i], i + 1 === correct, options[i].id]
      );
    await conn.commit();
    req.flash("success", "Question updated.");
  } catch (e) {
    if (conn) await conn.rollback();
    req.flash("error", e.message);
  } finally {
    if (conn) conn.release();
  }
  res.redirect("/admin/questions");
});
router.post("/admin/questions", adminOnly, async (req, res) => {
  const q = clean(req.body.question_text),
    answers = [req.body.a, req.body.b, req.body.c, req.body.d].map(clean),
    correct = Number(req.body.correct),
    cid = Number(req.body.competition_id);
  let conn;
  try {
    if (
      !q ||
      answers.some((x) => !x) ||
      ![1, 2, 3, 4].includes(correct) ||
      !cid
    )
      throw new Error("Complete the question and all four options.");
    conn = await db.getConnection();
    await conn.beginTransaction();
    const [[attempts]] = await conn.execute(
      "SELECT COUNT(*) AS total FROM quiz_attempts WHERE competition_id=?",
      [cid]
    );
    if (attempts.total)
      throw new Error("Questions cannot be added after a team starts this competition.");
    const [ins] = await conn.execute(
      "INSERT INTO questions (competition_id,question_text) VALUES (?,?)",
      [cid, q]
    );
    for (let i = 0; i < 4; i++)
      await conn.execute(
        "INSERT INTO options (question_id,option_text,is_correct) VALUES (?,?,?)",
        [ins.insertId, answers[i], i + 1 === correct]
      );
    await conn.commit();
    req.flash("success", "Question added.");
  } catch (e) {
    if (conn) await conn.rollback();
    req.flash("error", e.message);
  } finally {
    if (conn) conn.release();
  }
  res.redirect("/admin/questions");
});
router.post("/admin/questions/:id/delete", adminOnly, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [[question]] = await db.execute(
      "SELECT competition_id,created_at FROM questions WHERE id=?",
      [id]
    );
    if (!question) throw new Error("Question not found.");
    const [[answers]] = await db.execute(
      "SELECT COUNT(*) AS total FROM team_answers WHERE question_id=?",
      [id]
    );
    if (answers.total)
      throw new Error(
        "This question has saved team answers and cannot be deleted."
      );
    const [[attempts]] = await db.execute(
      "SELECT COUNT(*) AS total FROM quiz_attempts WHERE competition_id=? AND started_at>=?",
      [question.competition_id, question.created_at]
    );
    if (attempts.total)
      throw new Error(
        "A team started this competition after this question was added, so it is part of saved quiz history."
      );
    await db.execute("DELETE FROM questions WHERE id=?", [id]);
    req.flash("success", "Question deleted.");
  } catch (e) {
    req.flash("error", e.message);
  }
  res.redirect("/admin/questions");
});

module.exports = router;
