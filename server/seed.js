const fs = require("fs");
const path = require("path");
const vm = require("vm");
const bcrypt = require("bcryptjs");
const { ROOT_DIR, getDb, initDb } = require("./db");

const DEFAULT_PASSWORD = process.env.HAPPIU_SEED_PASSWORD || "happiu123";

function loadFixtureSeed() {
  const m1Code = fs.readFileSync(path.join(ROOT_DIR, "js/modules/m1-matching.js"), "utf8");
  const m2Code = fs.readFileSync(path.join(ROOT_DIR, "js/modules/m2-jobs-and-pay.js"), "utf8");
  const fixturesCode = fs.readFileSync(path.join(ROOT_DIR, "js/data/fixtures.js"), "utf8");

  const sandbox = {
    globalThis: {},
    console,
    structuredClone,
    localStorage: { getItem: () => null, setItem: () => {} }
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(m1Code, sandbox);
  vm.runInContext(m2Code, sandbox);
  vm.runInContext(fixturesCode + "\nthis.__freshData = fresh();", sandbox);
  return sandbox.__freshData;
}

function loadNuFaculties() {
  const code = fs.readFileSync(path.join(ROOT_DIR, "js/data/nu-faculties.js"), "utf8");
  const sandbox = { globalThis: {} };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  return sandbox.HappiUFaculties?.NU_FACULTIES || [];
}

function seedFaculties(db) {
  const list = loadNuFaculties();
  const insertFac = db.prepare("INSERT OR IGNORE INTO faculties (name) VALUES (?)");
  const getFac = db.prepare("SELECT id FROM faculties WHERE name = ?");
  const insertMajor = db.prepare("INSERT OR IGNORE INTO majors (faculty_id, name) VALUES (?, ?)");
  for (const item of list) {
    insertFac.run(item.faculty);
    const row = getFac.get(item.faculty);
    if (!row) continue;
    for (const major of item.majors || []) {
      insertMajor.run(row.id, major);
    }
  }
}

function seedDatabase(db = getDb(), { force = false } = {}) {
  const existingFaculties = db.prepare("SELECT COUNT(*) AS count FROM faculties").get().count;
  if (existingFaculties === 0 && !force) {
    seedFaculties(db);
  }

  const existingUsers = db.prepare("SELECT COUNT(*) AS count FROM users").get().count;
  if (existingUsers > 0 && !force) {
    return { seeded: false, reason: "already-populated" };
  }

  if (force) {
    db.exec(`
      DELETE FROM work_sessions;
      DELETE FROM chat_messages;
      DELETE FROM applications;
      DELETE FROM tutor_reviews;
      DELETE FROM tutor_requests;
      DELETE FROM tutors;
      DELETE FROM reports;
      DELETE FROM jobs;
      DELETE FROM employers;
      DELETE FROM students;
      DELETE FROM users;
      DELETE FROM majors;
      DELETE FROM faculties;
    `);
  }

  seedFaculties(db);

  const data = loadFixtureSeed();
  const passwordHash = bcrypt.hashSync(DEFAULT_PASSWORD, 8);

  const insertUser = db.prepare(`
    INSERT OR REPLACE INTO users (id, identifier, password_hash, role, display_name, entity_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertStudent = db.prepare(`
    INSERT OR REPLACE INTO students
      (id, code, name, nick, year, faculty, major, contact, photo, intro, skills, experience, interests_json, availability, schedule_json, hide_skills_banner)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
  `);

  for (const [id, st] of Object.entries(data.students)) {
    insertStudent.run(
      id,
      st.code,
      st.name,
      st.nick || "",
      Number(st.year || 1),
      st.faculty || "",
      st.major || "",
      st.contact || "",
      st.photo || "",
      st.intro || "",
      st.skills || "",
      st.experience || "",
      JSON.stringify(Array.isArray(st.interests) ? st.interests : []),
      st.availability || "",
      JSON.stringify(Array.isArray(st.schedule) ? st.schedule : [])
    );
    insertUser.run(`user-student-${id}`, st.code.toUpperCase(), passwordHash, "student", st.name, id);
  }

  const insertEmployer = db.prepare(`
    INSERT OR REPLACE INTO employers (id, name, type, contact, status, reason, document)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const [id, emp] of Object.entries(data.employers)) {
    insertEmployer.run(
      id,
      emp.name,
      emp.type || "near",
      emp.contact || `${id}@example.com`,
      emp.status || "verified",
      emp.reason || "",
      emp.document || ""
    );
    insertUser.run(
      `user-employer-${id}`,
      (emp.contact || `${id}@example.com`).toLowerCase(),
      passwordHash,
      "employer",
      emp.name,
      id
    );
  }

  // Seed University Admin account
  insertUser.run("user-admin-1", "ADMIN-NU-001", passwordHash, "admin", "เจ้าหน้าที่มหาวิทยาลัยนเรศวร", "admin");

  const insertJob = db.prepare(`
    INSERT OR REPLACE INTO jobs
      (id, employer_id, title, kind, job_type, category, location, pay_type, rate, distance, status, deadline, doc, description, skills, required_skills, required_major, reason, shifts_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const job of data.jobs) {
    const jobType = job.kind === "online" ? "online" : job.payType === "fixed" ? "part-time" : "part-time";
    insertJob.run(
      job.id,
      job.employer,
      job.title,
      job.kind || "near",
      jobType,
      job.category || "",
      job.location || "",
      job.payType || "hourly",
      Number(job.rate || 0),
      Number(job.distance || 0),
      job.status || "live",
      job.deadline || "",
      job.doc ? 1 : 0,
      job.description || "",
      job.skills || "",
      job.requiredSkills || "",
      job.requiredMajor || "",
      job.reason || "",
      JSON.stringify(job.shifts || [])
    );
  }

  // Also ensure at least one full-time / internship-style job label exists for showcase
  db.prepare("UPDATE jobs SET job_type = 'full-time' WHERE id IN ('demo-it-support', 'demo-office-excel')").run();

  const jobMap = new Map(data.jobs.map(j => [j.id, j]));
  const insertApp = db.prepare(`
    INSERT OR REPLACE INTO applications
      (id, student_id, job_id, employer_id, shift_id, status, hiring_stage, hiring_note, profile_json, doc, work_status, work_in, work_out, work_amount, work_proof)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const app of data.applications) {
    const job = jobMap.get(app.job);
    const empId = job ? job.employer : "library";
    insertApp.run(
      app.id,
      app.student,
      app.job,
      empId,
      app.shift || null,
      app.status || "pending",
      app.status === "accepted" ? "hired" : "review",
      "",
      JSON.stringify(app.profile || {}),
      app.doc || "",
      app.work || null,
      app.in || null,
      app.out || null,
      Number(app.amount || 0),
      app.proof || ""
    );
  }

  // Seed an initial demo chat message for Baitong & Library
  const insertMsg = db.prepare(`
    INSERT OR REPLACE INTO chat_messages (id, thread_key, application_id, student_id, employer_id, sender_role, text, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'read', ?)
  `);
  insertMsg.run(
    "msg-seed-1",
    "baitong::library",
    "demo-baitong-library",
    "baitong",
    "library",
    "employer",
    "สวัสดีครับใบตอง ทางห้องสมุดได้รับใบสมัครแล้ว สะดวกเข้ากะวันพุธ 17:00–20:00 น. ไหมครับ?",
    new Date(Date.now() - 3600 * 1000 * 5).toISOString()
  );

  // Seed initial multi-session work log for Pim's accepted job so users can see past rounds & start a new round immediately
  const insertSession = db.prepare(`
    INSERT OR REPLACE INTO work_sessions
      (id, application_id, student_id, job_id, employer_id, shift_id, check_in_at, check_in_photo_url, check_out_at, check_out_photo_url, hours, amount, status, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertSession.run(
    "ws-seed-pim-1",
    "demo-pim-library",
    "pim",
    "library",
    "library",
    "LB-01",
    new Date(Date.now() - 86400 * 1000 * 2).toISOString(),
    "/api/uploads/placeholder/checkin",
    new Date(Date.now() - 86400 * 1000 * 2 + 3 * 3600 * 1000).toISOString(),
    "/api/uploads/placeholder/checkout",
    3,
    210,
    "approved",
    "รอบทำงานตัวอย่าง (จัดหนังสือชั้น 2 เรียบร้อย)"
  );

  const insertTutor = db.prepare(`
    INSERT OR REPLACE INTO tutors (id, owner_id, category, subject, level, rate, format, availability, experience, banner_url, banner_text)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const tutor of data.tutors) {
    insertTutor.run(
      tutor.id,
      tutor.owner,
      tutor.category || "other",
      tutor.subject,
      tutor.level,
      Number(tutor.rate || 0),
      tutor.format || "online",
      tutor.availability || "",
      tutor.experience || "",
      "",
      `คอร์สติว${tutor.subject} สอนสนุก เข้าใจง่าย เน้นทำโจทย์จริง`
    );
  }

  // Seed sample tutor reviews for Phase 2 ("เพิ่มส่วนของรีวิวและประสบการณ์การสอนของติวเตอร์")
  const insertTutorReview = db.prepare(`
    INSERT OR REPLACE INTO tutor_reviews (id, tutor_id, reviewer_name, rating, comment, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const sampleReviews = [
    ["trev-1", "tutor-demo-code", "น้องกานต์ (ปี 1 วิศวะ)", 5, "พี่ธันวาอธิบาย Python เข้าใจง่ายมาก มีแบบฝึกหัดให้ลองทำจริงทุกครั้ง จากไม่เป็นเลยตอนนี้ทำแล็บผ่านแล้วครับ"],
    ["trev-2", "tutor-demo-code", "พลอย (ปี 2 บริหาร)", 5, "ใจเย็น ตอบคำถามละเอียดมาก คุ้มค่าเรียนสุดๆ ค่ะ"],
    ["trev-3", "tutor-demo-english", "มินนี่ (ม.5)", 5, "พี่พิมชวนคุยเป็นกันเอง กล้าพูดภาษาอังกฤษมากขึ้นเยอะเลยค่ะ"],
    ["trev-4", "tutor-demo-math", "ต้นกล้า (ม.3)", 4, "ปูพื้นสมการดีมาก เข้าใจวิธีคิดเป็นขั้นเป็นตอนครับ"],
    ["trev-5", "tutor-demo-canva", "แพรว (ปี 1 สื่อสาร)", 5, "พี่ใบตองสอนจัดสไลด์สวยมาก เอาไปใช้พรีเซนต์งานกลุ่มได้จริงเลย"]
  ];
  for (const [id, tutorId, reviewerName, rating, comment] of sampleReviews) {
    insertTutorReview.run(id, tutorId, reviewerName, rating, comment, new Date(Date.now() - 86400 * 1000).toISOString());
  }

  return { seeded: true, defaultPassword: DEFAULT_PASSWORD };
}

if (require.main === module) {
  const db = initDb();
  const force = process.argv.includes("--force");
  const result = seedDatabase(db, { force });
  console.log("HappiU seed result:", result);
}

module.exports = {
  DEFAULT_PASSWORD,
  seedDatabase
};
