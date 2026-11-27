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

  // Seed 100 sequential Naresuan University student accounts: 66310000 – 66310099
  // (keeps 66310001 "ปันปัน ศิริวัฒน์" with full demo applications/reports, plus 99 additional realistic NU students)
  const panpanSchedule = [
    { id: "cls-pp-1", day: "จันทร์", start: "09:00", end: "11:00", course: "โครงสร้างข้อมูลและอัลกอริทึม", code: "CPE211", room: "EN 4102", section: "1" },
    { id: "cls-pp-2", day: "พุธ", start: "13:00", end: "15:00", course: "ระบบฐานข้อมูล", code: "CPE242", room: "EN LAB 3", section: "1" },
    { id: "cls-pp-3", day: "พฤหัสบดี", start: "10:00", end: "12:00", course: "เครือข่ายคอมพิวเตอร์", code: "CPE321", room: "EN 3205", section: "2" }
  ];
  insertStudent.run(
    "panpan",
    "66310001",
    "ปันปัน ศิริวัฒน์",
    "ปันปัน",
    3,
    "คณะวิศวกรรมศาสตร์",
    "วิศวกรรมคอมพิวเตอร์",
    "panpan.s@nu.ac.th · LINE: @panpan.cpe",
    "",
    "นิสิตปี 3 วิศวกรรมคอมพิวเตอร์ ถนัดงานถ่ายภาพ ตัดต่อ และดูแลระบบไอที ตรงต่อเวลาและทำงานเป็นทีมได้ดี",
    "ถ่ายภาพ, ตัดต่อวิดีโอ, ซ่อมคอมพิวเตอร์, Microsoft Office",
    "เคยเป็นฝ่ายโสตทัศนูปกรณ์งานรับน้องคณะวิศวกรรมศาสตร์ มน.",
    JSON.stringify(["เทคโนโลยีและไอที", "สื่อและกราฟิก", "งานอีเวนต์"]),
    "จันทร์ 17:00–21:00, พุธ 17:00–21:00, ศุกร์ 17:00–21:00, เสาร์ 09:00–18:00, อาทิตย์ 09:00–18:00",
    JSON.stringify(panpanSchedule)
  );
  insertUser.run("user-student-panpan", "66310001", passwordHash, "student", "ปันปัน ศิริวัฒน์", "panpan");

  const nuFacList = loadNuFaculties();
  const nuFirstNames = [
    ["กิตติพงศ์", "กิต"], ["ณัฐธิดา", "ณัฐ"], ["ภูริณัฐ", "ภู"], ["ชญานิษฐ์", "นิษฐ์"], ["ธนกฤต", "กฤต"],
    ["พิชญาภา", "พาย"], ["วรเมธ", "เมธ"], ["กมลชนก", "กมล"], ["ศุภวิชญ์", "วิชญ์"], ["อภิชญา", "แพร"],
    ["จิรภัทร", "ภัทร"], ["ปวีณ์ธิดา", "ปอ"], ["รัชชานนท์", "นนท์"], ["สุพิชฌาย์", "พิชญ์"], ["ณภัทร", "ภัท"],
    ["ภัทรานิษฐ์", "ฟ้า"], ["พีรพัฒน์", "พี"], ["ชนกนันท์", "นันท์"], ["ธีรภัทร", "ธีร์"], ["ณิชาภัทร", "ณิชา"],
    ["ก้องภพ", "ก้อง"], ["มณีรัตน์", "มณี"], ["ปฐมพงศ์", "พงศ์"], ["ศศิประภา", "ศศิ"], ["อานนท์", "อาร์ม"],
    ["นภัสสร", "นัท"], ["ชยุตม์", "ยุต"], ["กรกนก", "กนก"], ["พชรพล", "พชร"], ["ลลิตา", "ลิลลี่"],
    ["สัณหณัฐ", "ซัน"], ["พิมพ์ชนก", "ชนก"], ["วิศรุต", "รุต"], ["ฐิติมา", "ติม"], ["นวพล", "พล"],
    ["กัญญารัตน์", "กัญ"], ["สรวิชญ์", "สร"], ["ปิยธิดา", "ปิย"], ["อัครวินท์", "วิน"], ["ชลธิชา", "ชล"]
  ];
  const nuLastNames = [
    "วงศ์สุวรรณ", "เจริญสุข", "แสงทอง", "ศรีสวัสดิ์", "มั่นคง",
    "อินทร์แก้ว", "รุ่งเรือง", "สุขสวัสดิ์", "จันทรัตน์", "พงษ์ไพบูลย์",
    "คำดี", "นาคประเสริฐ", "ธรรมรักษ์", "ไชยวัฒน์", "บุญมี",
    "สุวรรณภูมิ", "เพชรรัตน์", "ทวีทรัพย์", "กิตติคุณ", "รัตนโชติ",
    "สมบูรณ์", "อัครเดช", "เลิศล้ำ", "ประเสริฐศรี", "โชคชัย"
  ];
  const skillSets = [
    "Microsoft Office, จัดเอกสาร, ประสานงาน, สื่อสารดี",
    "Canva, ตัดต่อคลิปสั้น, ถ่ายภาพ, โซเชียลมีเดีย",
    "แคชเชียร์, ชงเครื่องดื่ม, บริการลูกค้า, คิดเงินแม่นยำ",
    "Excel, วิเคราะห์ข้อมูล, พิมพ์สัมผัสไว, ภาษาอังกฤษ",
    "เขียนโปรแกรม, ซ่อมคอมพิวเตอร์, ช่วยงานไอที, ดูแลระบบ",
    "สอนพิเศษ, อธิบายเข้าใจง่าย, ทำชีทสรุป, ใจเย็น"
  ];
  const interestSets = [
    ["งานเอกสารและธุรการ", "งานห้องสมุด"],
    ["สื่อและกราฟิก", "งานออนไลน์"],
    ["ร้านอาหารและกาแฟ", "งานบริการและแคชเชียร์"],
    ["เทคโนโลยีและไอที", "งานอีเวนต์"],
    ["การศึกษาและติวเตอร์", "งานในมหาวิทยาลัย"]
  ];
  const availSets = [
    "จันทร์ 17:00–20:00, พุธ 17:00–20:00, ศุกร์ 17:00–20:00",
    "เสาร์ 09:00–18:00, อาทิตย์ 09:00–18:00",
    "อังคาร 16:30–20:30, พฤหัสบดี 16:30–20:30, เสาร์ 09:00–17:00",
    "จันทร์ 17:00–21:00, พฤหัสบดี 17:00–21:00, อาทิตย์ 10:00–18:00"
  ];
  const sampleDays = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์"];
  const sampleCourses = [
    ["การสื่อสารภาษาอังกฤษ", "ENG101", "QS 2101"],
    ["คณิตศาสตร์ทั่วไป", "MTH102", "SC 1204"],
    ["การคิดเชิงวิเคราะห์", "GEN111", "AG 1102"],
    ["เทคโนโลยีดิจิทัล", "COM105", "CIT 201"],
    ["หลักการจัดการเบื้องต้น", "MGT101", "BEC 3102"]
  ];

  for (let i = 0; i < 100; i++) {
    if (i === 1) continue; // 66310001 already seeded as panpan
    const code = String(66310000 + i);
    const stuId = `stu-${code}`;
    const [firstName, nick] = nuFirstNames[i % nuFirstNames.length];
    const lastName = nuLastNames[(i * 7 + Math.floor(i / nuFirstNames.length)) % nuLastNames.length];
    const fullName = `${firstName} ${lastName}`;
    const facEntry = nuFacList[i % nuFacList.length] || { faculty: "คณะวิทยาศาสตร์", majors: ["วิทยาการคอมพิวเตอร์"] };
    const major = facEntry.majors[i % facEntry.majors.length] || facEntry.majors[0];
    const year = (i % 4) + 1;
    const d1 = sampleDays[i % sampleDays.length];
    const d2 = sampleDays[(i + 2) % sampleDays.length];
    const [c1, code1, r1] = sampleCourses[i % sampleCourses.length];
    const [c2, code2, r2] = sampleCourses[(i + 1) % sampleCourses.length];
    const schedule = [
      { id: `cls-${code}-1`, day: d1, start: "09:00", end: "11:00", course: c1, code: code1, room: r1, section: "1" },
      { id: `cls-${code}-2`, day: d2, start: "13:00", end: "15:00", course: c2, code: code2, room: r2, section: "1" }
    ];

    insertStudent.run(
      stuId,
      code,
      fullName,
      nick,
      year,
      facEntry.faculty,
      major,
      `${code}@nu.ac.th`,
      "",
      `นิสิตชั้นปีที่ ${year} ${facEntry.faculty} สาขา${major} มหาวิทยาลัยนเรศวร พร้อมเรียนรู้และตรงต่อเวลา`,
      skillSets[i % skillSets.length],
      `เคยร่วมกิจกรรมนิสิต${facEntry.faculty} มน.`,
      JSON.stringify(interestSets[i % interestSets.length]),
      availSets[i % availSets.length],
      JSON.stringify(schedule)
    );
    insertUser.run(`user-student-${code}`, code, passwordHash, "student", fullName, stuId);
  }

  const insertEmployer = db.prepare(`
    INSERT OR REPLACE INTO employers (id, name, type, contact, status, reason, document)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const [id, emp] of Object.entries(data.employers)) {
    // Showcase ALL 3 employer statuses: verified, pending (activities), update (copyshop)
    const empStatus = id === "copyshop" ? "update" : (emp.status || "verified");
    const empReason = id === "copyshop" ? "กรุณาแนบสำเนาใบทะเบียนพาณิชย์หน้าล่าสุดเพิ่มเติมเพื่อยืนยันสถานประกอบการ" : (emp.reason || "");
    insertEmployer.run(
      id,
      emp.name,
      emp.type || "near",
      emp.contact || `${id}@example.com`,
      empStatus,
      empReason,
      emp.document || (empStatus === "verified" ? `doc-verify-${id}.pdf` : "")
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

  // Showcase ALL 3 job types (part-time, full-time, online) AND ALL 6 job statuses (live, draft, review, edits, rejected, paused)
  db.prepare("UPDATE jobs SET job_type = 'full-time' WHERE id IN ('demo-it-support', 'demo-office-excel')").run();
  db.prepare("UPDATE jobs SET status = 'draft' WHERE id = 'demo-library-exhibit'").run();
  db.prepare("UPDATE jobs SET status = 'edits', reason = 'กรุณาระบุเงื่อนไขเวลาพักและอัตราค่าล่วงเวลาให้ชัดเจนก่อนเผยแพร่' WHERE id = 'demo-shop-pack'").run();
  db.prepare("UPDATE jobs SET status = 'rejected', reason = 'รายละเอียดค่าจ้างและขอบเขตงานยังไม่สอดคล้องกับเกณฑ์ความปลอดภัยของมหาวิทยาลัย' WHERE id = 'demo-copyshop-check'").run();
  db.prepare("UPDATE jobs SET status = 'paused', reason = 'ระงับประกาศชั่วคราวตามผลการตรวจสอบเรื่องร้องเรียนของเจ้าหน้าที่ มน.' WHERE id = 'demo-pet-media'").run();

  const jobMap = new Map(data.jobs.map(j => [j.id, j]));
  const insertApp = db.prepare(`
    INSERT OR REPLACE INTO applications
      (id, student_id, job_id, employer_id, shift_id, status, hiring_stage, hiring_note, interview_json, profile_json, doc, work_status, work_in, work_out, work_amount, work_proof, student_review_json, employer_review_json, resigned_at, resign_reason, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = Date.now();
  const isoAgo = hoursAgo => new Date(now - hoursAgo * 3600 * 1000).toISOString();

  // Base 3 fixture applications (enhanced with realistic stages)
  for (const app of data.applications) {
    const job = jobMap.get(app.job);
    const empId = job ? job.employer : "library";
    const isBaitongLib = app.id === "demo-baitong-library";
    const isPimLib = app.id === "demo-pim-library";
    insertApp.run(
      app.id,
      app.student,
      app.job,
      empId,
      app.shift || null,
      app.status || "pending",
      isPimLib ? "hired" : (isBaitongLib ? "interview" : "review"),
      isBaitongLib ? "นัดพูดคุยแนะนำงานที่เคาน์เตอร์ชั้น 1 สำนักหอสมุด" : (isPimLib ? "รับเข้าทำงานประจำกะวันพุธเรียบร้อยแล้ว" : ""),
      isBaitongLib ? JSON.stringify({ date: "2026-11-30", time: "16:30", place: "เคาน์เตอร์บริการชั้น 1 สำนักหอสมุด มน." }) : null,
      JSON.stringify(app.profile || {}),
      app.doc || "",
      isPimLib ? "approved" : (app.work || null),
      app.in || null,
      app.out || null,
      isPimLib ? 630 : Number(app.amount || 0),
      isPimLib ? "/api/uploads/placeholder/slip" : (app.proof || ""),
      null,
      null,
      null,
      "",
      isoAgo(96),
      isoAgo(6)
    );
  }

  // Additional comprehensive applications covering EVERY status & workflow:
  // offered, accepted (+ mutual reviews), resigned (+ preserved sessions), declined, withdrawn, offer_declined, active checked_in
  const extraApps = [
    // Baitong: accepted at Campus Mart (with mutual 5-star reviews + 2 work sessions)
    [
      "app-seed-baitong-mart", "baitong", "demo-mart-cashier", "campusmart", "NEW-07",
      "accepted", "hired", "ทำงานคล่องแคล่วและสื่อสารกับลูกค้าดีมาก", null,
      JSON.stringify({ name: "ใบตอง วัฒนกิจ", nick: "ใบตอง", faculty: "คณะบริหารธุรกิจ เศรษฐศาสตร์และการสื่อสาร", major: "การตลาด", year: 2 }),
      "", "paid", isoAgo(72), isoAgo(69), 390, "/api/uploads/placeholder/slip",
      JSON.stringify({ rating: 5, comment: "พี่ๆ ที่ร้านใจดี สอนงานละเอียด จ่ายค่าจ้างตรงเวลาทุกสัปดาห์ค่ะ", at: isoAgo(48) }),
      JSON.stringify({ rating: 5, comment: "ใบตองมาตรงเวลา คิดเงินแม่นยำ ยิ้มแย้มแจ่มใส แนะนำเลยครับ", at: isoAgo(47) }),
      null, "", isoAgo(168), isoAgo(12)
    ],
    // Baitong: offered at Campus Studio (ready to test Accept/Decline Offer!)
    [
      "app-seed-baitong-studio", "baitong", "demo-video-captions", "campusstudio", "NEW-08",
      "offered", "training", "ผ่านการทดลองทำซับไตเติลแล้ว ส่งข้อเสนอเวลาทำงานให้พิจารณานะครับ", null,
      JSON.stringify({ name: "ใบตอง วัฒนกิจ", nick: "ใบตอง", faculty: "คณะบริหารธุรกิจ เศรษฐศาสตร์และการสื่อสาร", major: "การตลาด", year: 2 }),
      "portfolio-baitong-captions.pdf", null, null, null, 0, "",
      null, null, null, "", isoAgo(60), isoAgo(8)
    ],
    // Baitong: resigned from Copyshop (preserves past paid work session!)
    [
      "app-seed-baitong-copy", "baitong", "demo-copyshop-binding", "copyshop", "PB-01",
      "resigned", "hired", "ขอบคุณที่ช่วยงานช่วงเปิดเทอมครับ", null,
      JSON.stringify({ name: "ใบตอง วัฒนกิจ", nick: "ใบตอง", faculty: "คณะบริหารธุรกิจ เศรษฐศาสตร์และการสื่อสาร", major: "การตลาด", year: 2 }),
      "", "paid", isoAgo(240), isoAgo(237), 180, "/api/uploads/placeholder/slip",
      JSON.stringify({ rating: 4, comment: "งานเป็นระบบดีค่ะ ได้เรียนรู้เรื่องเข้าเล่มเอกสาร", at: isoAgo(190) }),
      JSON.stringify({ rating: 5, comment: "ตั้งใจทำงานดีมากครับ", at: isoAgo(188) }),
      isoAgo(180), "ตารางเรียนช่วงปลายภาคแน่นขึ้น ขอแจ้งลาออกล่วงหน้า 1 สัปดาห์ค่ะ", isoAgo(300), isoAgo(180)
    ],
    // Baitong: declined at Pet Corner
    [
      "app-seed-baitong-pet", "baitong", "demo-pet-supplies", "petcorner", null,
      "declined", "review", "ขอบคุณที่สนใจครับ ตอนนี้ทางร้านรับผู้สมัครครบจำนวนแล้ว", null,
      JSON.stringify({ name: "ใบตอง วัฒนกิจ", nick: "ใบตอง", faculty: "คณะบริหารธุรกิจ เศรษฐศาสตร์และการสื่อสาร", major: "การตลาด", year: 2 }),
      "", null, null, null, 0, "",
      null, null, null, "", isoAgo(140), isoAgo(120)
    ],
    // Thanwa: accepted at IT Support (currently CHECKED IN for live check-out testing!)
    [
      "app-seed-thanwa-it", "thanwa", "demo-it-support", "library", "IT-01",
      "accepted", "hired", "รับเข้าทำงานทีมสนับสนุนไอทีห้องสมุด", null,
      JSON.stringify({ name: "ธันวา พราวพงศ์", nick: "ธันวา", faculty: "คณะวิทยาศาสตร์", major: "วิทยาการคอมพิวเตอร์", year: 3 }),
      "resume-thanwa.pdf", "checked_in", isoAgo(2), null, 0, "",
      null, null, null, "", isoAgo(120), isoAgo(2)
    ],
    // Panpan (real NU student ID 66310001): pending review at Campus Studio
    [
      "app-seed-panpan-event", "panpan", "demo-event-photo", "campusstudio", null,
      "pending", "review", "", null,
      JSON.stringify({ name: "ปันปัน ศิริวัฒน์", nick: "ปันปัน", faculty: "คณะวิศวกรรมศาสตร์", major: "วิศวกรรมคอมพิวเตอร์", year: 3 }),
      "portfolio-photo-panpan.pdf", null, null, null, 0, "",
      null, null, null, "", isoAgo(20), isoAgo(20)
    ],
    // Panpan: withdrawn application
    [
      "app-seed-panpan-sports", "panpan", "demo-sports-frontdesk", "sports", null,
      "withdrawn", "review", "นิสิตถอนใบสมัครเนื่องจากติดตารางแล็บ", null,
      JSON.stringify({ name: "ปันปัน ศิริวัฒน์", nick: "ปันปัน", faculty: "คณะวิศวกรรมศาสตร์", major: "วิศวกรรมคอมพิวเตอร์", year: 3 }),
      "", null, null, null, 0, "",
      null, null, null, "", isoAgo(80), isoAgo(70)
    ],
    // Panpan: offer_declined application
    [
      "app-seed-panpan-walk", "panpan", "demo-walk-dogs", "pawstay", "NEW-01",
      "offer_declined", "interview", "นิสิตไม่สะดวกช่วงเวลาเช้าที่เสนอ", null,
      JSON.stringify({ name: "ปันปัน ศิริวัฒน์", nick: "ปันปัน", faculty: "คณะวิศวกรรมศาสตร์", major: "วิศวกรรมคอมพิวเตอร์", year: 3 }),
      "", null, null, null, 0, "",
      null, null, null, "", isoAgo(110), isoAgo(95)
    ]
  ];
  for (const row of extraApps) {
    insertApp.run(...row);
  }

  // Seed rich multi-turn chat conversations across 5 shop threads (deduplicated 1 thread per student::employer)
  const insertMsg = db.prepare(`
    INSERT OR REPLACE INTO chat_messages (id, thread_key, application_id, student_id, employer_id, sender_role, text, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'read', ?)
  `);
  const seedMessages = [
    ["msg-seed-1", "baitong::library", "demo-baitong-library", "baitong", "library", "employer", "สวัสดีครับใบตอง ทางห้องสมุดได้รับใบสมัครแล้ว สะดวกเข้าพูดคุยที่ชั้น 1 วันจันทร์ 16:30 น. ไหมครับ?", isoAgo(10)],
    ["msg-seed-2", "baitong::library", "demo-baitong-library", "baitong", "library", "student", "สวัสดีค่ะ สะดวกเข้าพบวันจันทร์ 16:30 น. เลยค่ะ ขอบคุณมากนะคะ", isoAgo(9)],
    ["msg-seed-3", "baitong::library", "demo-baitong-library", "baitong", "library", "employer", "เยี่ยมเลยครับ เตรียมบัตรนิสิตมาด้วยนะครับ แล้วเจอกันครับ", isoAgo(8)],
    ["msg-seed-4", "baitong::campusmart", "app-seed-baitong-mart", "baitong", "campusmart", "employer", "โอนค่าจ้างรอบวันเสาร์เรียบร้อยแล้วนะครับ อัปโหลดสลิปโอนเงินในระบบแล้ว", isoAgo(48)],
    ["msg-seed-5", "baitong::campusmart", "app-seed-baitong-mart", "baitong", "campusmart", "student", "ได้รับยอดเงินเรียบร้อยแล้วค่ะ ขอบคุณมากค่ะ", isoAgo(47)],
    ["msg-seed-6", "baitong::campusstudio", "app-seed-baitong-studio", "baitong", "campusstudio", "employer", "ส่งข้อเสนอเวลางานทำซับไตเติลให้แล้วนะครับ กดตอบรับในหน้าใบสมัครได้เลย", isoAgo(7)],
    ["msg-seed-7", "pim::library", "demo-pim-library", "pim", "library", "employer", "พิมพ์จัดชั้นหนังสือรอบแรกเรียบร้อยมากครับ โอนค่าจ้างรอบแรกให้แล้วนะ", isoAgo(50)],
    ["msg-seed-8", "pim::library", "demo-pim-library", "pim", "library", "student", "ขอบคุณค่ะ รอบที่ 3 หนูถ่ายรูปเช็กเอาต์ส่งให้เรียบร้อยแล้วนะคะ", isoAgo(5)],
    ["msg-seed-9", "thanwa::cafe", "demo-thanwa-cafe", "thanwa", "cafe", "employer", "สวัสดีครับธันวา ทางร้านส่งข้อเสนอกะวันจันทร์ 17:00–20:00 น. ให้แล้ว ลองเช็กดูนะครับ", isoAgo(14)],
    ["msg-seed-10", "thanwa::cafe", "demo-thanwa-cafe", "thanwa", "cafe", "student", "รับทราบครับ เดี๋ยวเช็กตารางแล็บแล้วกดยืนยันให้นะครับ", isoAgo(12)],
    ["msg-seed-11", "panpan::campusstudio", "app-seed-panpan-event", "panpan", "campusstudio", "student", "สวัสดีครับ ผมส่งพอร์ตโฟลิโอถ่ายภาพงานกิจกรรมแนบไปในใบสมัครแล้วครับ", isoAgo(18)]
  ];
  for (const m of seedMessages) {
    insertMsg.run(...m);
  }

  // Seed comprehensive Multi-Session Work Logs covering ALL 4 statuses: checked_in, pending_approval, approved, paid
  const insertSession = db.prepare(`
    INSERT OR REPLACE INTO work_sessions
      (id, application_id, student_id, job_id, employer_id, shift_id, check_in_at, check_in_photo_url, check_out_at, check_out_photo_url, hours, amount, status, payment_proof, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const seedSessions = [
    // Pim @ Library: 3 complete rounds showing full progression (paid -> approved -> pending_approval)
    ["ws-seed-pim-1", "demo-pim-library", "pim", "library", "library", "LB-01", isoAgo(120), "/api/uploads/placeholder/checkin", isoAgo(117), "/api/uploads/placeholder/checkout", 3, 210, "paid", "/api/uploads/placeholder/slip", "รอบที่ 1: จัดหมวดหมู่หนังสือชั้น 2 และตรวจบาร์โค้ด"],
    ["ws-seed-pim-2", "demo-pim-library", "pim", "library", "library", "LB-01", isoAgo(72), "/api/uploads/placeholder/checkin", isoAgo(69), "/api/uploads/placeholder/checkout", 3, 210, "approved", "", "รอบที่ 2: ดูแลเคาน์เตอร์ยืม–คืนหนังสือช่วงเย็น"],
    ["ws-seed-pim-3", "demo-pim-library", "pim", "library", "library", "LB-01", isoAgo(8), "/api/uploads/placeholder/checkin", isoAgo(5), "/api/uploads/placeholder/checkout", 3, 210, "pending_approval", "", "รอบที่ 3: จัดโซนอ่านหนังสือและซ่อมสันหนังสือ (รอผู้จ้างตรวจรูป)"],
    // Baitong @ Campus Mart: 2 rounds (paid + pending_approval)
    ["ws-seed-baitong-mart-1", "app-seed-baitong-mart", "baitong", "demo-mart-cashier", "campusmart", "NEW-07", isoAgo(75), "/api/uploads/placeholder/checkin", isoAgo(72), "/api/uploads/placeholder/checkout", 3, 195, "paid", "/api/uploads/placeholder/slip", "รอบที่ 1: แคชเชียร์และเติมสินค้าเครื่องดื่ม"],
    ["ws-seed-baitong-mart-2", "app-seed-baitong-mart", "baitong", "demo-mart-cashier", "campusmart", "NEW-07", isoAgo(15), "/api/uploads/placeholder/checkin", isoAgo(12), "/api/uploads/placeholder/checkout", 3, 195, "pending_approval", "", "รอบที่ 2: ดูแลหน้าร้านช่วงเย็นและปิดยอดกะ"],
    // Baitong @ Copyshop (RESIGNED job, historical paid session preserved!)
    ["ws-seed-baitong-copy-1", "app-seed-baitong-copy", "baitong", "demo-copyshop-binding", "copyshop", "PB-01", isoAgo(240), "/api/uploads/placeholder/checkin", isoAgo(237), "/api/uploads/placeholder/checkout", 3, 180, "paid", "/api/uploads/placeholder/slip", "รอบทำงานก่อนแจ้งลาออก (เข้าเล่มรายงานนิสิต)"],
    // Thanwa @ IT Support: ACTIVE checked_in round (ready to test Photo Check-out immediately!)
    ["ws-seed-thanwa-it-1", "app-seed-thanwa-it", "thanwa", "demo-it-support", "library", "IT-01", isoAgo(2), "/api/uploads/placeholder/checkin", null, null, 0, 0, "checked_in", "", "กำลังปฏิบัติงานตรวจเช็กคอมพิวเตอร์ห้องค้นคว้าชั้น 3"]
  ];
  for (const s of seedSessions) {
    insertSession.run(...s);
  }

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
      `คอร์สติว${tutor.subject} สอนสนุก เข้าใจง่าย เน้นทำโจทย์และฝึกปฏิบัติจริง`
    );
  }

  // Seed rich tutor reviews across multiple tutors
  const insertTutorReview = db.prepare(`
    INSERT OR REPLACE INTO tutor_reviews (id, tutor_id, reviewer_name, rating, comment, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const sampleReviews = [
    ["trev-1", "tutor-demo-code", "น้องกานต์ (ปี 1 วิศวะ)", 5, "พี่ธันวาอธิบาย Python เข้าใจง่ายมาก มีแบบฝึกหัดให้ลองทำจริงทุกครั้ง จากไม่เป็นเลยตอนนี้ทำแล็บผ่านแล้วครับ", isoAgo(48)],
    ["trev-2", "tutor-demo-code", "พลอย (ปี 2 บริหาร)", 5, "ใจเย็น ตอบคำถามละเอียดมาก คุ้มค่าเรียนสุดๆ ค่ะ", isoAgo(26)],
    ["trev-3", "tutor-demo-english", "มินนี่ (ม.5)", 5, "พี่พิมชวนคุยเป็นกันเอง กล้าพูดภาษาอังกฤษมากขึ้นเยอะเลยค่ะ", isoAgo(40)],
    ["trev-4", "tutor-demo-math", "ต้นกล้า (ม.3)", 4, "ปูพื้นสมการดีมาก เข้าใจวิธีคิดเป็นขั้นเป็นตอนครับ", isoAgo(35)],
    ["trev-5", "tutor-demo-canva", "แพรว (ปี 1 สื่อสาร)", 5, "พี่ใบตองสอนจัดสไลด์สวยมาก เอาไปใช้พรีเซนต์งานกลุ่มได้จริงเลย", isoAgo(22)],
    ["trev-6", "tutor-demo-poster", "ฟิล์ม (ปี 2 ศึกษาศาสตร์)", 5, "ได้เทคนิคจับคู่สีและจัดวางตัวอักษรทำโปสเตอร์กิจกรรมคณะสวยขึ้นมากครับ", isoAgo(18)],
    ["trev-7", "tutor-demo-tgat", "ข้าวปั้น (ม.6)", 5, "พี่พิมเก็งแนวข้อสอบ TGAT อังกฤษตรงจุดมาก ช่วยจับเวลาทำข้อสอบจริงด้วยค่ะ", isoAgo(14)],
    ["trev-8", "tutor-demo-excel", "บีม (ปี 3 บัญชี)", 5, "เรียนสูตร VLOOKUP กับ PivotTable 2 ชั่วโมงเอาไปใช้ทำโปรเจกต์ได้เลยครับ", isoAgo(10)]
  ];
  for (const rev of sampleReviews) {
    insertTutorReview.run(...rev);
  }

  // Seed incoming tutor contact requests so post owners see real inquiries immediately
  const insertTutorRequest = db.prepare(`
    INSERT OR REPLACE INTO tutor_requests (id, tutor_id, name, contact, message, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const sampleRequests = [
    ["treq-1", "tutor-demo-canva", "น้องน้ำฝน (ปี 1 การตลาด)", "LINE: @namfon.nu", "สนใจเรียนจัดสไลด์ Canva สำหรับพรีเซนต์วิชาการตลาดค่ะ สะดวกวันอังคาร 18:00 น. ค่ะ", isoAgo(12)],
    ["treq-2", "tutor-demo-math-primary", "คุณแม่น้องภูมิ (ป.5)", "089-412-xxxx", "อยากให้น้องเรียนเสริมเรื่องเศษส่วนและโจทย์ปัญหาวันอาทิตย์เช้าค่ะ", isoAgo(9)],
    ["treq-3", "tutor-demo-code", "น้องเจมส์ (ปี 1 วิทยาการคอมฯ)", "LINE: @james.csnu", "อยากปูพื้น Python ก่อนสอบมิดเทอมครับ โดยเฉพาะเรื่อง Loop กับ Function", isoAgo(7)],
    ["treq-4", "tutor-demo-english", "น้องมายด์ (ปี 2 พยาบาล)", "mind.nu@example.com", "อยากฝึกพูดภาษาอังกฤษเตรียมสัมภาษณ์ทุนแลกเปลี่ยนค่ะ สะดวกออนไลน์ช่วงค่ำ", isoAgo(6)],
    ["treq-5", "tutor-demo-presentation", "น้องโอม (ปี 2 บริหาร)", "LINE: @ohm.bec", "อยากฝึกพูดนำเสนองานหน้าชั้นให้มั่นใจขึ้นครับ เรียนกลุ่มเล็ก 2 คนได้ไหมครับ", isoAgo(4)]
  ];
  for (const req of sampleRequests) {
    insertTutorRequest.run(...req);
  }

  // Seed safety reports covering ALL 3 admin workflow statuses: new, reviewing (with employer reply), closed
  const insertReport = db.prepare(`
    INSERT OR REPLACE INTO reports (id, student_id, job_id, status, reason, detail, attachment, request, reply, result, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const sampleReports = [
    [
      "rep-seed-new", "panpan", "demo-copyshop-counter", "new",
      "เวลาทำงานไม่ตรงตามประกาศ",
      "ตอนคุยรายละเอียดงานทางร้านแจ้งให้ช่วยงานเลยเวลา 21:00 น. ซึ่งเกินจากช่วงเวลาที่ลงประกาศไว้ในระบบครับ",
      "chat-screenshot-01.png", "", "", "", isoAgo(5)
    ],
    [
      "rep-seed-reviewing", "baitong", "demo-cafe-stock", "reviewing",
      "รายละเอียดค่าจ้างไม่ชัดเจน",
      "ในประกาศระบุเป็นรายชั่วโมง แต่ตอนสอบถามเบื้องต้นยังไม่ชัดเจนเรื่องค่าชั่วโมงช่วงทดลองงานค่ะ",
      "detail-note.pdf",
      "ขอให้ร้านกาแฟหน้ามอชี้แจงเงื่อนไขค่าจ้างช่วงทดลองงานและยืนยันว่าจ่ายตามอัตราในประกาศ",
      "ทางร้านยืนยันจ่ายเต็มอัตราตามประกาศตั้งแต่วันแรกที่เริ่มงานครับ ขออภัยที่สื่อสารคลาดเคลื่อนและได้แจ้งให้นิสิตทราบแล้ว",
      "", isoAgo(36)
    ],
    [
      "rep-seed-closed", "pim", "demo-pet-media", "closed",
      "เงื่อนไขงานไม่เหมาะสม",
      "ผู้ประกาศขอให้โอนเงินค่ามัดจำอุปกรณ์ถ่ายภาพก่อนเริ่มงาน ซึ่งขัดกับนโยบายความปลอดภัยของ มน. ค่ะ",
      "evidence-deposit.png",
      "ขอให้ชี้แจงกรณีการเรียกเก็บเงินมัดจำจากนิสิต",
      "รับทราบข้อท้วงติงและจะปรับปรุงเงื่อนไขประกาศครับ",
      "เจ้าหน้าที่ มน. ตรวจสอบพบข้อเท็จจริง จึงสั่งระงับประกาศงานนี้ชั่วคราว (Paused) เพื่อความปลอดภัยของนิสิต",
      isoAgo(90)
    ]
  ];
  for (const rep of sampleReports) {
    insertReport.run(...rep);
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
