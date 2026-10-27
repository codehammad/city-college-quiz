// Routes for settings.
const express = require("express");
const router = express.Router();
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const db = require("../config/db");
const { requireLogin, requireRole } = require("../middleware/auth");
const { page, clean } = require("../utils/helpers");
const profileUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (req, file, done) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
      return done(new Error("Choose a JPG, PNG, or WebP image."));
    }
    done(null, true);
  },
});

router.get("/settings", requireLogin, async (req, res, next) => {
  try {
    let account;
    if (req.session.user.role === "admin") {
      const [[row]] = await db.execute(
        "SELECT username,full_name AS name,profile_photo FROM admins WHERE id=?",
        [req.session.user.id]
      );
      account = row;
    } else {
      const [[row]] = await db.execute(
        "SELECT t.username,t.team_name AS name,t.profile_photo,c.name AS campus FROM teams t JOIN campuses c ON c.id=t.campus_id WHERE t.id=?",
        [req.session.user.id]
      );
      account = row;
    }
    if (!account)
      return res
        .status(404)
        .render("error", {
          title: "Account not found",
          message: "This account is no longer available.",
        });
    req.session.user.profilePhoto = account.profile_photo;
    page(req, res, "settings", {
      title: "Settings",
      active: "Settings",
      account,
    });
  } catch (e) {
    next(e);
  }
});
router.post(
  "/settings/photo",
  requireLogin,
  (req, res, next) =>
    profileUpload.single("profile_photo")(req, res, (err) => {
      if (err)
        return res
          .status(400)
          .json({
            ok: false,
            message:
              err.code === "LIMIT_FILE_SIZE"
                ? "Image must be 4 MB or smaller."
                : err.message,
          });
      next();
    }),
  async (req, res) => {
    let savedPath;
    try {
      if (!req.file)
        return res
          .status(400)
          .json({ ok: false, message: "Choose an image to upload." });
      const data = req.file.buffer;
      let extension;
      if (
        data.length >= 3 &&
        data[0] === 0xff &&
        data[1] === 0xd8 &&
        data[2] === 0xff
      )
        extension = "jpg";
      else if (
        data.length >= 8 &&
        data
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      )
        extension = "png";
      else if (
        data.length >= 12 &&
        data.toString("ascii", 0, 4) === "RIFF" &&
        data.toString("ascii", 8, 12) === "WEBP"
      )
        extension = "webp";
      else
        return res
          .status(400)
          .json({
            ok: false,
            message: "That file is not a valid JPG, PNG, or WebP image.",
          });
      const role = req.session.user.role,
        table = role === "admin" ? "admins" : "teams";
      const filename = `${role}-${req.session.user.id
        }-${crypto.randomUUID()}.${extension}`;
      const directory = path.join(__dirname, "public", "uploads", "profiles");
      await fs.mkdir(directory, { recursive: true });
      savedPath = path.join(directory, filename);
      await fs.writeFile(savedPath, data, { flag: "wx" });
      const photoUrl = `/uploads/profiles/${filename}`;
      const [updated] = await db.execute(
        `UPDATE ${table} SET profile_photo=? WHERE id=?`,
        [photoUrl, req.session.user.id]
      );
      if (!updated.affectedRows) {
        await fs.unlink(savedPath);
        return res
          .status(404)
          .json({ ok: false, message: "Account not found." });
      }
      const oldPhoto = req.session.user.profilePhoto;
      req.session.user.profilePhoto = photoUrl;
      if (oldPhoto && oldPhoto.startsWith("/uploads/profiles/"))
        fs.unlink(path.join(directory, path.basename(oldPhoto))).catch(
          () => { }
        );
      res.json({ ok: true, photoUrl });
    } catch (err) {
      if (savedPath) await fs.unlink(savedPath).catch(() => { });
      res
        .status(500)
        .json({
          ok: false,
          message: "Could not save your profile photo. Please try again.",
        });
    }
  }
);
router.post("/settings/profile", requireRole("admin"), async (req, res) => {
  try {
    const name = clean(req.body.full_name);
    if (name.length < 2 || name.length > 120)
      throw new Error("Name must be between 2 and 120 characters.");
    await db.execute("UPDATE admins SET full_name=? WHERE id=?", [
      name,
      req.session.user.id,
    ]);
    req.session.user.name = name;
    req.flash("success", "Profile name updated.");
  } catch (e) {
    req.flash("error", e.message);
  }
  res.redirect("/settings");
});
router.post("/settings/password", requireRole("admin"), async (req, res) => {
  try {
    const current = req.body.current_password || "",
      password = req.body.new_password || "",
      confirm = req.body.confirm_password || "";
    if (password.length < 8)
      throw new Error("New password must have at least 8 characters.");
    if (password !== confirm)
      throw new Error("New password and confirmation do not match.");
    const [[row]] = await db.execute(
      "SELECT password_hash FROM admins WHERE id=?",
      [req.session.user.id]
    );
    if (!row || !(await bcrypt.compare(current, row.password_hash)))
      throw new Error("Current password is incorrect.");
    const hash = await bcrypt.hash(password, 12);
    await db.execute("UPDATE admins SET password_hash=? WHERE id=?", [
      hash,
      req.session.user.id,
    ]);
    req.flash("success", "Password changed successfully.");
  } catch (e) {
    req.flash("error", e.message);
  }
  res.redirect("/settings");
});

module.exports = router;
