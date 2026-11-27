const { initDb, closeDb } = require("./db");

function inspect() {
  const db = initDb();
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all()
    .map(r => r.name);

  console.log("=== HappiU SQLite Tables ===");
  console.table(
    tables.map(name => ({
      table: name,
      rows: db.prepare(`SELECT COUNT(*) AS n FROM "${name}"`).get().n
    }))
  );

  console.log("\n=== Login Accounts (v_login_accounts) ===");
  console.table(db.prepare("SELECT * FROM v_login_accounts ORDER BY role, identifier").all());

  console.log("\n=== Student Work Summary (v_student_work_summary) ===");
  console.table(db.prepare("SELECT * FROM v_student_work_summary").all());

  closeDb();
}

inspect();
