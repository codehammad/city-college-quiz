require("dotenv").config();
const readline = require("readline");
const bcrypt = require("bcryptjs");
const db = require("./config/db");
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});
const ask = (label) => new Promise((resolve) => rl.question(label, resolve));
(async () => {
	try {
		const username = (await ask("Admin username: ")).trim(),
			name = (await ask("Admin full name: ")).trim(),
			password = await ask("Admin password (8+ characters): ");
		if (!username || !name || password.length < 8)
			throw new Error(
				"Username, full name, and an 8-character password are required."
			);
		const hash = await bcrypt.hash(password, 12);
		await db.execute(
			"INSERT INTO admins (username,password_hash,full_name) VALUES (?,?,?)",
			[username, hash, name]
		);
		console.log("Admin account created.");
	} catch (e) {
		console.error(
			e.code === "ER_DUP_ENTRY" ? "That username is already in use." : e.message
		);
		process.exitCode = 1;
	} finally {
		rl.close();
		await db.end();
	}
})();
