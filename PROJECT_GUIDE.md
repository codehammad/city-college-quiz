# City College Quiz System: Simple Project Guide

This guide shows where the main code lives and how a page request travels through the project. The app uses Node.js and Express on the server, EJS to make HTML pages, and MySQL to save data.

## Folder map

```text
city-college-quiz/
├── server.js                  Starts Express and connects the project parts
├── config/
│   └── db.js                  MySQL connection
├── middleware/
│   └── auth.js                Login, role checks, and form token checks
├── routes/                    URL handling and the related database work
│   ├── authRoutes.js          Login and logout
│   ├── settingsRoutes.js      Account settings, password, and profile photo
│   ├── dashboardRoutes.js     Admin dashboard
│   ├── campusRoutes.js        Campus management
│   ├── adminTeamRoutes.js     Admin tools for creating and managing teams
│   ├── competitionRoutes.js   Competition management
│   ├── questionRoutes.js     Competition questions
│   ├── teamRoutes.js          Team dashboard
│   ├── quizRoutes.js          Starting a quiz, saving answers, and submitting
│   ├── resultRoutes.js        Team reviews and admin/team results
│   └── healthRoutes.js        Checks the app and database connection
├── utils/
│   └── helpers.js             Shared page-rendering and form-text helpers
├── views/                     EJS pages (HTML with a few dynamic tags)
├── public/
│   ├── css/                   Page design and light/dark themes
│   ├── js/                    Browser behavior such as quiz and theme toggle
│   ├── images/                Logo and other images
│   └── uploads/profiles/      Uploaded profile photos
├── database/
│   ├── schema.sql             Creates the database tables
│   ├── seed.sql               Four sample campus records
│   └── migrations/            Database updates for existing installations
└── package.json               Packages and commands to run the app
```

## How a page works

For example, when an admin adds a campus:

1. The browser sends the form to `/admin/campuses`.
2. `server.js` runs common setup such as sessions and CSRF checks, then loads `campusRoutes.js`.
3. `campusRoutes.js` checks that the user is an admin and saves the campus through `config/db.js`.
4. The route redirects back to the campus page, and its EJS view displays the saved rows.

In short: **browser form → route → MySQL → EJS page**.

## Finding the right file

- To change a page's words or HTML, find its file under `views/`.
- To change a URL, validation rule, or database query, find its feature file under `routes/`.
- To change the database connection, open `config/db.js`.
- To change who can open a page, look at the role middleware in `middleware/auth.js` and the route file.
- To change colors and spacing, edit `public/css/style.css` or `public/css/theme.css`.
- To change something that happens in the browser, look in `public/js/`.
- To add or change database tables, edit `database/schema.sql`; existing databases may also need a migration in `database/migrations/`.

## EJS is HTML with dynamic values

Most of a `.ejs` file is normal HTML. These tags add server data or simple page logic:

```ejs
<!-- Print text safely inside HTML -->
<h1>Welcome, <%= user.name %></h1>

<!-- Show HTML only when the condition is true -->
<% if (user.role === 'admin') { %>
  <a href="/admin/teams">Manage teams</a>
<% } %>

<!-- Repeat a small HTML row for each database item -->
<% teams.forEach((team) => { %>
  <p><%= team.team_name %></p>
<% }) %>

<!-- Reuse a shared EJS file, such as the page header -->
<%- include('../partials/header') %>
```

Use `<%= ... %>` for text from a user or database; it escapes HTML characters. `<%- include(...) %>` is used for trusted project templates that need to insert HTML.

## Starting the project

1. Start MySQL from Laragon.
2. Open a terminal in this project folder.
3. Run `npm install` if packages have not been installed yet.
4. Run `npm run dev`.
5. Open `http://localhost:3000` in a browser.

Database login details are kept in `.env`. Do not put passwords in route or view files.

## Making a small change safely

For a text or color change, edit the view or CSS and reload the browser. For a behavior change, find the route that handles the page's URL, update that feature file, then check the page and the relevant admin/team flow. Keep each feature's code in its matching route file so it stays easy to find.
