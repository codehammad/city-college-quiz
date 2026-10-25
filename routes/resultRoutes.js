// Admin leaderboard and each team's own results and answer review.
const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { requireRole } = require("../middleware/auth");
const { page } = require("../utils/helpers");
const adminOnly = requireRole("admin");
const teamOnly = requireRole("team");

router.get(
  "/team/results/:competitionId/review",
  teamOnly,
  async (req, res, next) => {
    try {
      const competitionId = Number(req.params.competitionId);
      const [[result]] = await db.execute(
        "SELECT r.attempt_id,r.score,r.correct_count,r.submitted_at,c.id AS competition_id,c.title,c.category,c.status,c.results_release,c.marks_per_question FROM results r JOIN competitions c ON c.id=r.competition_id WHERE r.team_id=? AND c.id=?",
        [req.session.user.id, competitionId]
      );
      if (!result)
        return res
          .status(404)
          .render("error", {
            title: "Review not found",
            message: "There is no submitted result for this competition.",
          });
      if (
        result.results_release === "after_competition" &&
        result.status !== "Completed"
      )
        return res
          .status(403)
          .render("error", {
            title: "Answer review not released",
            message:
              "Answers will be available after the admin completes the competition.",
          });
      const [rows] = await db.execute(
        "SELECT q.id,q.question_text,o.id AS option_id,o.option_text,o.is_correct,ta.option_id AS selected_option_id FROM questions q JOIN options o ON o.question_id=q.id LEFT JOIN team_answers ta ON ta.attempt_id=? AND ta.question_id=q.id WHERE q.competition_id=? ORDER BY q.id,o.id",
        [result.attempt_id, competitionId]
      );
      const questions = [];
      for (const row of rows) {
        let question = questions.find((q) => q.id === row.id);
        if (!question) {
          question = { id: row.id, text: row.question_text, options: [] };
          questions.push(question);
        }
        question.options.push({
          id: row.option_id,
          text: row.option_text,
          isCorrect: Boolean(row.is_correct),
          isSelected: row.selected_option_id === row.option_id,
        });
      }
      page(req, res, "team/review", {
        title: "Answer review",
        active: "My Results",
        result,
        questions,
      });
    } catch (e) {
      next(e);
    }
  }
);
router.get("/team/results", teamOnly, async (req, res, next) => {
  try {
    const [results] = await db.execute(
      "SELECT c.id AS competition_id,c.title,c.category,r.score,r.correct_count,r.submitted_at,c.marks_per_question,(SELECT COUNT(*) FROM questions q WHERE q.competition_id=c.id) AS question_count,(SELECT COUNT(*)+1 FROM results r2 WHERE r2.competition_id=r.competition_id AND (r2.score>r.score OR (r2.score=r.score AND (r2.submitted_at<r.submitted_at OR (r2.submitted_at=r.submitted_at AND r2.id<r.id))))) AS team_rank FROM results r JOIN competitions c ON c.id=r.competition_id WHERE r.team_id=? AND (c.results_release='immediate' OR c.status='Completed') ORDER BY r.submitted_at DESC",
      [req.session.user.id]
    );
    const [[pending]] = await db.execute(
      "SELECT COUNT(*) AS total FROM results r JOIN competitions c ON c.id=r.competition_id WHERE r.team_id=? AND c.results_release='after_competition' AND c.status<>'Completed'",
      [req.session.user.id]
    );
    const summary = {
      played: results.length + pending.total,
      bestScore: results.length ? Math.max(...results.map((r) => r.score)) : 0,
      bestRank: results.length
        ? Math.min(...results.map((r) => r.team_rank))
        : null,
    };
    page(req, res, "team/results", {
      title: "My results",
      active: "My Results",
      results,
      pending: pending.total,
      summary,
    });
  } catch (e) {
    next(e);
  }
});


router.get("/admin/results", adminOnly, async (req, res, next) => {
  try {
    const selectedId = Number(req.query.competition_id) || 0;
    const [competitions] = await db.query(
      "SELECT id,title,status FROM competitions ORDER BY start_at DESC"
    );
    const where = selectedId ? "WHERE c.id=?" : "";
    const params = selectedId ? [selectedId] : [];
    const [results] = await db.execute(
      `SELECT c.id AS competition_id,c.title,c.status,t.team_name,ca.name campus,r.score,r.correct_count,r.submitted_at,(SELECT COUNT(*)+1 FROM results r2 WHERE r2.competition_id=r.competition_id AND (r2.score>r.score OR (r2.score=r.score AND (r2.submitted_at<r.submitted_at OR (r2.submitted_at=r.submitted_at AND r2.id<r.id))))) AS team_rank FROM results r JOIN competitions c ON c.id=r.competition_id JOIN teams t ON t.id=r.team_id JOIN campuses ca ON ca.id=t.campus_id ${where} ORDER BY c.id,r.score DESC,r.submitted_at ASC,r.id ASC`,
      params
    );
    const [campusRanks] = await db.execute(
      "SELECT ca.name AS campus,COUNT(r.id) AS submissions,COALESCE(SUM(r.score),0) AS total_score,COALESCE(AVG(r.score),0) AS average_score FROM campuses ca LEFT JOIN teams t ON t.campus_id=ca.id LEFT JOIN results r ON r.team_id=t.id AND (?=0 OR r.competition_id=?) GROUP BY ca.id ORDER BY total_score DESC,average_score DESC",
      [selectedId, selectedId]
    );
    const selected = competitions.find((c) => c.id === selectedId) || null;
    const topTeams = results.slice(0, 3);
    const summary = {
      submissions: results.length,
      campuses: new Set(results.map((r) => r.campus)).size,
      topScore: results.length ? Math.max(...results.map((r) => r.score)) : 0,
    };
    page(req, res, "admin/results", {
      title: "Results & leaderboard",
      active: "Results",
      results,
      campusRanks,
      competitions,
      selected,
      topTeams,
      summary,
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
