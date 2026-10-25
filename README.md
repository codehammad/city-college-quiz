# City College Quiz System

A student-friendly quiz competition application built with Node.js, Express, EJS, MySQL, Bootstrap 5, and plain JavaScript. The interface follows the attached blue and white dashboard reference and adapts for phones and tablets.

## Requirements

- Node.js 18 or newer
- MySQL 8 or a compatible MySQL server

## Setup

1. Install Node.js from [nodejs.org](https://nodejs.org/) and install MySQL Community Server (or start MySQL from XAMPP).
2. Create the database schema. In a terminal from this project folder run:

   ```bash
   mysql -u root -p < database/schema.sql
   mysql -u root -p city_college_quiz < database/seed.sql
   ```

3. Copy `.env.example` to `.env`. Set the MySQL username/password and replace `SESSION_SECRET` with a long random value.
4. Install packages and create the first administrator:

   ```bash
   npm install
   npm run create-admin
   ```

   Choose an admin username, name, and password when prompted. Passwords are hashed with bcrypt and are not saved in the source code.

5. Start the app and open `http://localhost:3000`:

   ```bash
   npm run dev
   ```

   For normal use, `npm start` runs the same server without nodemon. Use `/login?role=team` for team sign-in.

## First use

1. Sign in as admin.
2. Add teams from **Teams**. Each team gets a username and password; the password is stored as a bcrypt hash. Team profiles and passwords can be edited later.
3. Create a competition, select participating teams, and choose whether results appear immediately or after the admin marks the competition Completed. Before any team starts, competition details and team participation can be edited.
4. Add its multiple-choice questions. Each question has four choices and one correct answer. Questions can be edited or removed before a team starts the quiz.
5. Set the competition start time. Teams can open their assigned quiz when its start time arrives.
6. Teams see released scores and their rank under **My results**. Admins can view the team leaderboard and campus rankings under **Results**.

The four sample campuses in Pakistan (Lahore, Karachi, Islamabad, and Peshawar) are added by `database/seed.sql`. Add, edit, or deactivate campus records from the Campuses page.

### Add persistent demonstration records

After database setup and admin creation, run `npm run seed-demo` once. This adds three teams per campus, a completed general-knowledge competition with saved answers and leaderboard results, and an upcoming science quiz. Team passwords use `cityteam123` by default (`DEFAULT_TEAM_PASSWORD` in `.env`). The seed checks for existing demo competitions and does not add duplicate rows if run again.

## Main files

- `server.js` – Express setup, shared middleware, feature route loading, and app startup.
- `routes/` – URL handlers grouped by feature, including login, campuses, teams, competitions, questions, quizzes, and results.
- `config/db.js` – MySQL connection pool.
- `middleware/auth.js` – role and CSRF protection.
- `utils/helpers.js` – shared EJS page rendering and form text cleanup.
- `views/` – EJS pages for admin, team, quiz, and login views.
- `views/settings.ejs` and `public/js/profile-menu.js` – profile settings and the topbar account menu.
- `public/js/theme.js` and `public/css/theme.css` – saved light and dark display modes.
- `PROJECT_GUIDE.md` – beginner-friendly folder map, request flow, and EJS examples.
- Admins and teams can upload JPG, PNG, or WebP profile photos (up to 4 MB); files are saved under public/uploads/profiles and linked from their database account.
- `public/css/style.css` – dashboard theme and responsive layout.
- `public/js/quiz.js` – quiz navigation, timer, and answer autosave.
- `database/schema.sql` – database tables and relationships.
- `database/seed.sql` – four sample campus records.

## Security and scoring notes

- Admin and team access are kept separate with session role checks.
- Session cookies are HTTP-only and same-site; production mode enables secure cookies.
- Database queries use placeholders, and forms that change data use session CSRF tokens.
- Passwords use bcrypt. Login attempts are rate limited.
- The browser receives answer option text only. The correctness flag is used only in the server-side scoring query.
- Scores are calculated from stored answers on the server. A unique attempt and result constraint helps prevent duplicate submissions. A row lock is used while finalizing a quiz.
- Ranking orders equal scores by earlier submission time.
- Competitions can be moved between Draft, Scheduled, Live, and Completed. Deletion is blocked once a team has started an attempt.

## Quick verification checklist

- [ ] `GET /health` reports `{ "ok": true, "database": "connected" }` after setup.
- [ ] Create an administrator, sign in, and sign out.
- [ ] Add/edit/deactivate a campus and register a team.
- [ ] Create a future competition, select teams, and add four-option questions.
- [ ] Sign in as an invited team, open the quiz at its start time, navigate and autosave answers.
- [ ] Submit once and confirm the score appears for the team and on the leaderboard.
- [ ] Check dashboard and forms at desktop and narrow mobile widths.

## Troubleshooting

- **Database connection error:** check that MySQL is running and the `.env` host, port, username, password, and database match your installation.
- **Unknown database:** run the schema command above before starting the server.
- **Cannot sign in:** confirm the chosen role (Admin or Team) and credentials. Admins are created with `npm run create-admin`; teams are created by an administrator.
- **Team cannot open competition:** check that the team is selected for the competition, the start time has arrived, and questions have been added.
- **Port is busy:** set a different `PORT` in `.env` and open that port in your browser.

Bootstrap, Font Awesome, Google Fonts, and the login background image load from their public CDNs, so an internet connection is needed for those visual assets.
