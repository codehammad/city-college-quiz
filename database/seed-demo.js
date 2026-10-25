require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../config/db');

const completedTitle = 'General Knowledge Challenge';
const upcomingTitle = 'Science Quiz';
const teamNames = [
  { campus: 'Lahore Campus', teams: [['Team Alpha', 'central_alpha']] },
  { campus: 'Karachi Campus', teams: [['Team Phoenix', 'north_phoenix']] },
  { campus: 'Islamabad Campus', teams: [['Team Eagle', 'east_eagle']] },
  { campus: 'Peshawar Campus', teams: [['Team Spartans', 'west_spartans']] }
];
const generalQuestions = [
  ['Which is the largest ocean on Earth?', ['Atlantic Ocean', 'Pacific Ocean', 'Indian Ocean', 'Arctic Ocean'], 1],
  ['What is the currency of Japan?', ['Won', 'Yuan', 'Yen', 'Baht'], 2],
  ['How many planets are in our solar system?', ['Seven', 'Eight', 'Nine', 'Ten'], 1],
  ['What is the chemical formula for water?', ['CO2', 'O2', 'H2O', 'NaCl'], 2],
  ['What is the capital city of Australia?', ['Sydney', 'Melbourne', 'Canberra', 'Perth'], 2],
  ['Which planet is known as the Red Planet?', ['Venus', 'Mars', 'Jupiter', 'Mercury'], 1]
];
const scienceQuestions = [
  ['What force keeps planets in orbit around the Sun?', ['Magnetism', 'Gravity', 'Friction', 'Electricity'], 1],
  ['What is the SI unit of electric current?', ['Volt', 'Watt', 'Ampere', 'Ohm'], 2],
  ['Which molecule carries genetic information?', ['DNA', 'Glucose', 'Protein', 'Oxygen'], 0],
  ['At what temperature does water boil at sea level?', ['90°C', '100°C', '110°C', '120°C'], 1],
  ['How many chambers are in a human heart?', ['Two', 'Three', 'Four', 'Five'], 2],
  ['What is the outermost layer of Earth called?', ['Mantle', 'Core', 'Crust', 'Outer core'], 2]
];

async function addCompetition(conn, { title, category, startAt, status, questions, teamIds, release }) {
  const [created] = await conn.execute(
    'INSERT INTO competitions (title,description,category,start_at,duration_minutes,marks_per_question,status,results_release) VALUES (?,?,?,?,?,?,?,?)',
    [title, `Sample ${category.toLowerCase()} competition for the City College demonstration.`, category, startAt, 10, 5, status, release]
  );
  for (const teamId of teamIds) {
    await conn.execute('INSERT INTO competition_teams (competition_id,team_id) VALUES (?,?)', [created.insertId, teamId]);
  }
  const savedQuestions = [];
  for (const [questionText, choices, correctIndex] of questions) {
    const [question] = await conn.execute('INSERT INTO questions (competition_id,question_text) VALUES (?,?)', [created.insertId, questionText]);
    const optionIds = [];
    for (let i = 0; i < choices.length; i++) {
      const [option] = await conn.execute('INSERT INTO options (question_id,option_text,is_correct) VALUES (?,?,?)', [question.insertId, choices[i], i === correctIndex]);
      optionIds.push(option.insertId);
    }
    savedQuestions.push({ correct: optionIds[correctIndex], incorrect: optionIds[(correctIndex + 1) % optionIds.length], id: question.insertId });
  }
  return { id: created.insertId, questions: savedQuestions };
}

async function main() {
  const conn = await db.getConnection();
  const demoPassword = process.env.DEFAULT_TEAM_PASSWORD || 'cityteam123';
  try {
    const [existing] = await conn.execute('SELECT id FROM competitions WHERE title IN (?,?)', [completedTitle, upcomingTitle]);
    if (existing.length) throw new Error('Demo records already exist. No rows were changed.');
    const [campuses] = await conn.query('SELECT id,name FROM campuses WHERE is_active=1 ORDER BY id');
    const campusIds = new Map(campuses.map(c => [c.name, c.id]));
    for (const campus of teamNames) if (!campusIds.has(campus.campus)) throw new Error(`Sample campus is missing: ${campus.campus}. Run database/seed.sql first.`);

    const passwordHash = await bcrypt.hash(demoPassword, 12);
    await conn.beginTransaction();
    const teams = [];
    for (const campus of teamNames) {
      for (const [teamName, username] of campus.teams) {
        const [rows] = await conn.execute('SELECT id FROM teams WHERE username=? OR (campus_id=? AND team_name=?)', [username, campusIds.get(campus.campus), teamName]);
        if (rows.length) throw new Error(`A sample team already exists (${username}). Remove or rename it before running the demo seed.`);
        const [team] = await conn.execute('INSERT INTO teams (campus_id,team_name,username,password_hash) VALUES (?,?,?,?)', [campusIds.get(campus.campus), teamName, username, passwordHash]);
        teams.push({ id: team.insertId, username });
      }
    }
    const teamIds = teams.map(t => t.id);
    const completed = await addCompetition(conn, {
      title: completedTitle,
      category: 'General Knowledge',
      startAt: new Date(2026, 9, 20, 10, 0, 0),
      status: 'Completed',
      questions: generalQuestions,
      teamIds,
      release: 'after_competition'
    });

    const correctCounts = [6, 5, 4, 3];
    for (let i = 0; i < teams.length; i++) {
      const startAt = new Date(2026, 9, 20, 10, 0, i * 7);
      const submittedAt = new Date(startAt.getTime() + 9 * 60 * 1000 + i * 1000);
      const [attempt] = await conn.execute('INSERT INTO quiz_attempts (competition_id,team_id,started_at,submitted_at) VALUES (?,?,?,?)', [completed.id, teams[i].id, startAt, submittedAt]);
      for (let q = 0; q < completed.questions.length; q++) {
        await conn.execute('INSERT INTO team_answers (attempt_id,question_id,option_id) VALUES (?,?,?)', [attempt.insertId, completed.questions[q].id, q < correctCounts[i] ? completed.questions[q].correct : completed.questions[q].incorrect]);
      }
      await conn.execute('INSERT INTO results (attempt_id,competition_id,team_id,score,correct_count,submitted_at) VALUES (?,?,?,?,?,?)', [attempt.insertId, completed.id, teams[i].id, correctCounts[i] * 5, correctCounts[i], submittedAt]);
    }

    const upcomingStart = new Date(Date.now() + 30 * 60 * 1000);
    await addCompetition(conn, {
      title: upcomingTitle,
      category: 'Science',
      startAt: upcomingStart,
      status: 'Scheduled',
      questions: scienceQuestions,
      teamIds,
      release: 'immediate'
    });
    await conn.commit();
    console.log('Demo data added successfully.');
    console.log(`Teams created: ${teams.length} (1 per campus)`);
    console.log(`Completed competition: ${completedTitle} (leaderboard has ${teams.length} results)`);
    console.log(`Upcoming competition: ${upcomingTitle} (starts ${upcomingStart.toLocaleString()})`);
    console.log('Team usernames: ' + teams.map(t => t.username).join(', '));
    console.log(`Shared temporary team password: ${demoPassword}`);
    console.log('Sign in as admin to review the saved records; teams can sign in at /login?role=team.');
  } catch (error) {
    try { await conn.rollback(); } catch (_) {}
    throw error;
  } finally {
    conn.release();
    await db.end();
  }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
