// Starts the City College Quiz web app. Feature routes are kept in the routes folder.
require("dotenv").config();
const path = require("path");
const express = require("express");
const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);
const helmet = require("helmet");
const flash = require("connect-flash");
const { csrf } = require("./middleware/auth");

const app = express();
const sessionStore = new MySQLStore({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "city_college_quiz",
  createDatabaseTable: true,
});

// Set up views, security, form parsing, static files, sessions, and messages.
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.urlencoded({ extended: false, limit: "40kb" }));
app.use(express.static(path.join(__dirname, "public")));
app.use(session({
  name: "cityquiz.sid",
  secret: process.env.SESSION_SECRET || "development-only-change-this-secret",
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 8 * 60 * 60 * 1000 },
}));
app.use(flash());
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  // Set defaults here; page() reads flash messages only when rendering a page.
  res.locals.success = [];
  res.locals.error = [];
  next();
});
app.use(csrf);

// Load a route file for each main project feature.
app.use(require("./routes/authRoutes"));
app.use(require("./routes/settingsRoutes"));
app.use(require("./routes/dashboardRoutes"));
app.use(require("./routes/campusRoutes"));
app.use(require("./routes/adminTeamRoutes"));
app.use(require("./routes/competitionRoutes"));
app.use(require("./routes/questionRoutes"));
app.use(require("./routes/teamRoutes"));
app.use(require("./routes/quizRoutes"));
app.use(require("./routes/resultRoutes"));
app.use(require("./routes/healthRoutes"));

// Show helpful pages for unknown URLs and unexpected errors.
app.use((req, res) => res.status(404).render("error", { title: "Page not found", message: "The page you requested could not be found." }));
app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(500).render("error", { title: "Something went wrong", message: process.env.NODE_ENV === "production" ? "Please try again later." : err.message });
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => console.log("City College Quiz System running at http://localhost:" + port));
