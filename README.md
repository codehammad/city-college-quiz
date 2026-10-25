# City College Quiz System

A college quiz app built with Node.js, Express, EJS, and MySQL. Bootstrap, icons, and page styles are stored in `public/`, so the interface works without a CDN or internet connection.

## Run on Windows with XAMPP

1. Start **MySQL** in the XAMPP Control Panel, open XAMPP Shell, and go to this project folder.
2. Create the database and sample campuses:

   ```bat
   mysql -u root -p < database/schema.sql
   mysql -u root -p city_college_quiz < database/seed.sql
   ```

   If the MySQL root account has no password, press Enter when prompted. For an existing database, run the needed file from `database/migrations/` once instead of creating the schema again.

3. Copy `.env.example` to `.env`. Set the MySQL password and a private `SESSION_SECRET`.
4. In XAMPP Shell, run:

   ```bat
   npm install
   npm run create-admin
   npm run dev
   ```

5. Open `http://localhost:3000`. New team accounts use `cityteam123` unless changed in `.env` or the team form.

## Working flow

**Browser → Express route → MySQL → EJS page.** Express receives each request, checks sign-in and permissions, then a feature route reads or updates MySQL. EJS turns the saved data into the page shown in the browser. During a quiz, answers are saved to MySQL; the server scores them on submission and saves the result.

Admins manage campuses, one team per campus, competitions, questions, and result release. Teams sign in, take assigned quizzes, then view released scores and answer reviews.

## Move the data to another PC

On the old PC, export the `city_college_quiz` database from phpMyAdmin. On the new PC, start XAMPP MySQL, create/select a database with that name in phpMyAdmin, and import the exported `.sql` file. This brings existing teams, quizzes, and results; `schema.sql` and `seed.sql` are only for a fresh setup.

## Project map

- `server.js` – Express setup and app startup
- `routes/` – login, admin, team, quiz, and result handlers
- `views/` – EJS page templates
- `public/css/`, `public/js/`, `public/vendor/` – styles, browser scripts, and local libraries
- `database/` – schema, sample data, and updates for existing databases
