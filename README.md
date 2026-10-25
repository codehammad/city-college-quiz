# City College Quiz

This website lets an admin make quizzes for campus teams. Teams sign in, answer questions, and see their results.

## Start it with XAMPP

1. Start **MySQL** in the XAMPP Control Panel. Open **XAMPP Shell** and go to the project folder.
2. Make the database and add the sample campuses:

   ```bat
   mysql -u root -p < database/schema.sql
   mysql -u root -p city_college_quiz < database/seed.sql
   ```

   If MySQL asks for a password and you have not set one, just press Enter.

3. Copy `.env.example` and name the copy `.env`. Set your MySQL password there.
4. In XAMPP Shell, run:

   ```bat
   npm install
   npm run create-admin
   npm run dev
   ```

5. Open `http://localhost:3000` in your browser.

New teams use `cityteam123` as their password unless you change it in `.env` or on the team form. Bootstrap, icons, and the fonts are saved in the project, so the pages do not need internet access.

## How it works

**Browser → Express → MySQL → EJS page**

The browser sends a request. Express checks it and runs the right route. The route reads or saves data in MySQL. EJS uses that data to show the page. When a team submits a quiz, the server checks the answers and saves the score.

Admins add campuses, one team for each campus, competitions, and questions. Teams take their assigned quizzes and see results when they are released.

## Use the same data on another PC

On the old PC, use phpMyAdmin to export the `city_college_quiz` database as an `.sql` file. On the new PC, start MySQL, create a database named `city_college_quiz`, and import that file in phpMyAdmin. This copies your teams, quizzes, and results too.

## Where files are

- `server.js` starts the app.
- `routes/` contains the code for each part of the app.
- `views/` contains the page designs.
- `public/` contains styles, browser code, fonts, and libraries.
- `database/` contains database setup files.
