// Shared helpers used by route files to render pages and clean form input.
function page(req, res, view, data = {}) {
  // Consume one-time messages only when a page is rendered, not for asset requests.
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.render(view, { title: data.title || "City College Quiz System", active: data.active || "", ...data });
}
function clean(value) { return String(value || "").trim(); }
module.exports = { page, clean };
