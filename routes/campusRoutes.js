// Create, update, view, and deactivate campuses.
const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { requireRole } = require("../middleware/auth");
const { page, clean } = require("../utils/helpers");
const adminOnly = requireRole("admin");

router.get("/admin/campuses", adminOnly, async (req, res, next) => {
  try {
    const [campuses] = await db.query(
      "SELECT c.*, COUNT(t.id) AS teams FROM campuses c LEFT JOIN teams t ON t.campus_id=c.id GROUP BY c.id ORDER BY c.id"
    );
    page(req, res, "admin/campuses", {
      title: "Campuses",
      active: "Campuses",
      campuses,
    });
  } catch (e) {
    next(e);
  }
});
router.post("/admin/campuses", adminOnly, async (req, res, next) => {
  try {
    const name = clean(req.body.name),
      location = clean(req.body.location);
    if (!name || !location)
      throw new Error("Campus name and location are required.");
    await db.execute("INSERT INTO campuses (name,location) VALUES (?,?)", [
      name,
      location,
    ]);
    req.flash("success", "Campus added.");
    res.redirect("/admin/campuses");
  } catch (e) {
    req.flash(
      "error",
      e.code === "ER_DUP_ENTRY" ? "That campus already exists." : e.message
    );
    res.redirect("/admin/campuses");
  }
});
router.post("/admin/campuses/:id/update", adminOnly, async (req, res, next) => {
  try {
    const id = Number(req.params.id),
      name = clean(req.body.name),
      location = clean(req.body.location);
    if (!id || !name || !location) throw new Error("Complete all fields.");
    await db.execute("UPDATE campuses SET name=?,location=? WHERE id=?", [
      name,
      location,
      id,
    ]);
    req.flash("success", "Campus updated.");
    res.redirect("/admin/campuses");
  } catch (e) {
    req.flash("error", e.message);
    res.redirect("/admin/campuses");
  }
});
router.post("/admin/campuses/:id/delete", adminOnly, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) throw new Error("Invalid campus.");
    const [[campus]] = await db.execute(
      "SELECT COUNT(t.id) AS teams FROM campuses c LEFT JOIN teams t ON t.campus_id=c.id WHERE c.id=? GROUP BY c.id",
      [id]
    );
    if (!campus) throw new Error("Campus not found.");
    if (campus.teams > 0) {
      throw new Error(
        "This campus still has teams. Deactivate it or move its teams before deleting it."
      );
    }
    await db.execute("DELETE FROM campuses WHERE id=?", [id]);
    req.flash("success", "Campus deleted permanently.");
  } catch (e) {
    req.flash("error", e.message);
  }
  res.redirect("/admin/campuses");
});

router.post("/admin/campuses/:id/status", adminOnly, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) throw new Error("Invalid campus.");
    const [updated] = await db.execute(
      "UPDATE campuses SET is_active=IF(is_active=1,0,1) WHERE id=?",
      [id]
    );
    if (!updated.affectedRows) throw new Error("Campus not found.");
    req.flash("success", "Campus status updated.");
  } catch (e) {
    req.flash("error", e.message);
  }
  res.redirect("/admin/campuses");
});

module.exports = router;
