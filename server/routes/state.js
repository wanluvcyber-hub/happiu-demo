const express = require("express");
const { getDb, makeId, getFullState } = require("../db");
const { requireAuth, requireRole, optionalAuth } = require("../middleware/auth");
const { seedDatabase } = require("../seed");
const { saveDataUrlImage } = require("./uploads");

const router = express.Router();

// Full bootstrap state
router.get("/state", optionalAuth, (req, res) => {
  const db = getDb();
  res.json({
    user: req.user || null,
    state: getFullState(db)
  });
});

// Naresuan University Faculties & Majors reference API
router.get("/faculties", (_req, res) => {
  const db = getDb();
  const faculties = db.prepare("SELECT id, name FROM faculties ORDER BY id ASC").all();
  const majors = db.prepare("SELECT id, faculty_id, name FROM majors ORDER BY id ASC").all();
  const majorsByFac = new Map();
  for (const m of majors) {
    if (!majorsByFac.has(m.faculty_id)) majorsByFac.set(m.faculty_id, []);
    majorsByFac.get(m.faculty_id).push(m.name);
  }
  res.json({
    faculties: faculties.map(f => ({
      id: f.id,
      faculty: f.name,
      majors: majorsByFac.get(f.id) || []
    }))
  });
});

// Update Student Profile / Skills / Interests / Availability / Photo
router.patch("/student/profile", requireRole("student"), (req, res) => {
  try {
    const db = getDb();
    const studentId = req.user.entityId;
    const student = db.prepare("SELECT * FROM students WHERE id = ?").get(studentId);
    if (!student) return res.status(404).json({ error: "ไม่พบข้อมูลนิสิต" });

    const nick = req.body?.nick !== undefined ? String(req.body.nick).trim().slice(0, 40) : student.nick;
    const faculty = req.body?.faculty !== undefined && String(req.body.faculty).trim() ? String(req.body.faculty).trim().slice(0, 100) : student.faculty;
    const major = req.body?.major !== undefined && String(req.body.major).trim() ? String(req.body.major).trim().slice(0, 100) : student.major;
    const intro = req.body?.intro !== undefined ? String(req.body.intro).trim().slice(0, 600) : student.intro;
    const skills = req.body?.skills !== undefined ? String(req.body.skills).trim() : student.skills;
    const experience = req.body?.experience !== undefined ? String(req.body.experience).trim().slice(0, 600) : student.experience;
    const availability = req.body?.availability !== undefined ? String(req.body.availability).trim() : student.availability;
    const interestsJson = req.body?.interests !== undefined
      ? JSON.stringify(Array.isArray(req.body.interests) ? req.body.interests : [])
      : student.interests_json;
    const hideSkillsBanner = req.body?.hideSkillsBanner !== undefined
      ? (req.body.hideSkillsBanner ? 1 : 0)
      : student.hide_skills_banner;

    let photo = student.photo;
    if (req.body?.removePhoto) {
      photo = "";
    } else if (req.body?.photoUrl !== undefined) {
      photo = String(req.body.photoUrl).trim();
    } else if (req.body?.photoDataUrl) {
      photo = saveDataUrlImage(req.body.photoDataUrl, "profiles") || photo;
    }

    db.prepare(`
      UPDATE students
      SET nick = ?, faculty = ?, major = ?, intro = ?, skills = ?, experience = ?, availability = ?, interests_json = ?, photo = ?, hide_skills_banner = ?
      WHERE id = ?
    `).run(nick, faculty, major, intro, skills, experience, availability, interestsJson, photo, hideSkillsBanner, studentId);

    // Also sync updated photo into active application snapshots so employers immediately see the real profile photo!
    if (photo !== student.photo) {
      const apps = db.prepare("SELECT id, profile_json FROM applications WHERE student_id = ?").all(studentId);
      const updateApp = db.prepare("UPDATE applications SET profile_json = ? WHERE id = ?");
      for (const a of apps) {
        try {
          const snap = JSON.parse(a.profile_json || "{}");
          if (photo) snap.photo = photo;
          else delete snap.photo;
          updateApp.run(JSON.stringify(snap), a.id);
        } catch {}
      }
    }

    res.json({ state: getFullState(db) });
  } catch (err) {
    res.status(400).json({ error: err.message || "บันทึกโปรไฟล์ไม่สำเร็จ" });
  }
});

// Update Student Timetable (for 2D Drag & Drop + manual/AI edits)
router.put("/student/schedule", requireRole("student"), (req, res) => {
  const db = getDb();
  const schedule = Array.isArray(req.body?.schedule) ? req.body.schedule : null;
  if (!schedule) return res.status(400).json({ error: "ข้อมูลตารางเรียนไม่ถูกต้อง" });

  const validDays = new Set(["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"]);
  const cleaned = schedule
    .filter(item => item && validDays.has(item.day) && /^\d{2}:\d{2}$/.test(item.start) && /^\d{2}:\d{2}$/.test(item.end) && item.start < item.end)
    .map(item => ({
      id: String(item.id || makeId("cls")),
      day: item.day,
      start: item.start,
      end: item.end,
      course: String(item.course || "วิชาเรียน").trim().slice(0, 80),
      code: String(item.code || "COURSE").trim().slice(0, 20),
      room: String(item.room || "").trim().slice(0, 40),
      section: String(item.section || "1").trim().slice(0, 10)
    }));

  db.prepare("UPDATE students SET schedule_json = ? WHERE id = ?")
    .run(JSON.stringify(cleaned), req.user.entityId);

  res.json({ schedule: cleaned, state: getFullState(db) });
});

// Employer creates or updates a job draft
router.post("/jobs", requireRole("employer"), (req, res) => {
  const db = getDb();
  const b = req.body || {};
  const id = String(b.id || "").trim();
  const title = String(b.title || "").trim().slice(0, 80);
  const kind = ["campus", "near", "online"].includes(b.kind) ? b.kind : "near";
  const jobType = ["part-time", "full-time", "online"].includes(b.jobType)
    ? b.jobType
    : (kind === "online" ? "online" : "part-time");
  const category = String(b.category || "").trim().slice(0, 60);
  const location = String(b.location || "").trim().slice(0, 100);
  const payType = b.payType === "fixed" ? "fixed" : "hourly";
  const rate = Number(b.rate);
  const distance = Number(b.distance || 0);
  const deadline = String(b.deadline || "").trim().slice(0, 40);
  const description = String(b.description || "").trim().slice(0, 600);
  const skills = String(b.skills || "").trim();
  const requiredSkills = String(b.requiredSkills || "").trim();
  const requiredMajor = String(b.requiredMajor || "").trim();
  const doc = b.doc ? 1 : 0;
  const shifts = Array.isArray(b.shifts) ? b.shifts : [];

  if (!title || !category || !location || !deadline || !description || !Number.isFinite(rate) || rate <= 0 || !shifts.length) {
    return res.status(400).json({ error: "กรอกข้อมูลประกาศงานและเวลาทำงานให้ครบถ้วน" });
  }

  if (id) {
    const old = db.prepare("SELECT * FROM jobs WHERE id = ?").get(id);
    if (!old || old.employer_id !== req.user.entityId) {
      return res.status(404).json({ error: "ไม่พบประกาศงานของร้านคุณ" });
    }
    db.prepare(`
      UPDATE jobs
      SET title=?, kind=?, job_type=?, category=?, location=?, pay_type=?, rate=?, distance=?, status='draft', deadline=?, doc=?, description=?, skills=?, required_skills=?, required_major=?, shifts_json=?
      WHERE id=?
    `).run(title, kind, jobType, category, location, payType, rate, distance, deadline, doc, description, skills, requiredSkills, requiredMajor, JSON.stringify(shifts), id);
    return res.json({ jobId: id, state: getFullState(db) });
  }

  const newId = makeId("job");
  db.prepare(`
    INSERT INTO jobs
      (id, employer_id, title, kind, job_type, category, location, pay_type, rate, distance, status, deadline, doc, description, skills, required_skills, required_major, shifts_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?)
  `).run(newId, req.user.entityId, title, kind, jobType, category, location, payType, rate, distance, deadline, doc, description, skills, requiredSkills, requiredMajor, JSON.stringify(shifts));

  res.status(201).json({ jobId: newId, state: getFullState(db) });
});

// Employer submits job for admin review
router.patch("/jobs/:id/submit", requireRole("employer"), (req, res) => {
  const db = getDb();
  const job = db.prepare("SELECT * FROM jobs WHERE id = ?").get(req.params.id);
  if (!job || job.employer_id !== req.user.entityId) return res.status(404).json({ error: "ไม่พบประกาศงาน" });
  const emp = db.prepare("SELECT * FROM employers WHERE id = ?").get(job.employer_id);
  if (emp?.status !== "verified") {
    return res.status(400).json({ error: "ส่งข้อมูลผู้จ้างให้เจ้าหน้าที่รับรองก่อนส่งตรวจประกาศ" });
  }
  db.prepare("UPDATE jobs SET status = 'review' WHERE id = ?").run(job.id);
  res.json({ state: getFullState(db) });
});

// Admin job decisions: publish / edits / reject
router.patch("/admin/jobs/:id", requireRole("admin"), (req, res) => {
  const db = getDb();
  const job = db.prepare("SELECT * FROM jobs WHERE id = ?").get(req.params.id);
  if (!job) return res.status(404).json({ error: "ไม่พบประกาศงาน" });
  const action = String(req.body?.action || "");
  const reason = String(req.body?.reason || "").trim();

  if (action === "publish") {
    const emp = db.prepare("SELECT status FROM employers WHERE id = ?").get(job.employer_id);
    if (emp?.status !== "verified") return res.status(400).json({ error: "ต้องรับรองผู้จ้างก่อนเผยแพร่ประกาศ" });
    db.prepare("UPDATE jobs SET status = 'live', reason = '', revision_original = NULL, revision_location = NULL WHERE id = ?").run(job.id);
  } else if (action === "edits" || action === "reject") {
    if (!reason) return res.status(400).json({ error: "กรุณาระบุเหตุผล" });
    db.prepare("UPDATE jobs SET status = ?, reason = ? WHERE id = ?").run(action === "edits" ? "edits" : "rejected", reason, job.id);
  } else {
    return res.status(400).json({ error: "คำสั่งไม่ถูกต้อง" });
  }

  res.json({ state: getFullState(db) });
});

// Employer updates profile for verification
router.patch("/employer/profile", requireRole("employer"), (req, res) => {
  const db = getDb();
  const contact = String(req.body?.contact || "").trim();
  const doc = String(req.body?.document || "").trim();
  const emp = db.prepare("SELECT * FROM employers WHERE id = ?").get(req.user.entityId);
  if (!emp) return res.status(404).json({ error: "ไม่พบข้อมูลผู้จ้าง" });

  db.prepare("UPDATE employers SET contact = ?, document = ?, status = 'pending', reason = '' WHERE id = ?")
    .run(contact || emp.contact, doc || emp.document, emp.id);
  res.json({ state: getFullState(db) });
});

// Admin employer verification
router.patch("/admin/employers/:id", requireRole("admin"), (req, res) => {
  const db = getDb();
  const emp = db.prepare("SELECT * FROM employers WHERE id = ?").get(req.params.id);
  if (!emp) return res.status(404).json({ error: "ไม่พบข้อมูลผู้จ้าง" });
  const action = String(req.body?.action || "");
  const reason = String(req.body?.reason || "").trim();

  if (action === "verify") {
    db.prepare("UPDATE employers SET status = 'verified', reason = '' WHERE id = ?").run(emp.id);
  } else if (action === "update") {
    if (!reason) return res.status(400).json({ error: "กรุณาระบุข้อมูลที่ต้องการเพิ่มเติม" });
    db.prepare("UPDATE employers SET status = 'update', reason = ? WHERE id = ?").run(reason, emp.id);
  } else {
    return res.status(400).json({ error: "คำสั่งไม่ถูกต้อง" });
  }
  res.json({ state: getFullState(db) });
});

// Reports: student submits, employer replies, admin processes
router.post("/reports", requireRole("student"), (req, res) => {
  const db = getDb();
  const jobId = String(req.body?.jobId || "").trim();
  const reason = String(req.body?.reason || "อื่น ๆ").trim();
  const detail = String(req.body?.detail || "").trim().slice(0, 600);
  const attachment = String(req.body?.attachment || "").trim();
  if (!jobId || !detail) return res.status(400).json({ error: "ระบุรายละเอียดเรื่องที่แจ้งให้ครบ" });

  db.prepare(`
    INSERT INTO reports (id, student_id, job_id, status, reason, detail, attachment)
    VALUES (?, ?, ?, 'new', ?, ?, ?)
  `).run(makeId("report"), req.user.entityId, jobId, reason, detail, attachment);

  res.status(201).json({ state: getFullState(db) });
});

router.patch("/reports/:id/reply", requireRole("employer"), (req, res) => {
  const db = getDb();
  const reply = String(req.body?.reply || "").trim().slice(0, 600);
  if (!reply) return res.status(400).json({ error: "กรอกคำชี้แจงก่อนส่ง" });
  db.prepare("UPDATE reports SET reply = ? WHERE id = ? AND status != 'closed'").run(reply, req.params.id);
  res.json({ state: getFullState(db) });
});

router.patch("/admin/reports/:id", requireRole("admin"), (req, res) => {
  const db = getDb();
  const report = db.prepare("SELECT * FROM reports WHERE id = ?").get(req.params.id);
  if (!report) return res.status(404).json({ error: "ไม่พบเรื่องร้องเรียน" });
  const action = String(req.body?.action || "");
  const reason = String(req.body?.reason || "").trim();

  if (action === "start") {
    db.prepare("UPDATE reports SET status = 'reviewing' WHERE id = ?").run(report.id);
  } else if (action === "request-reply") {
    db.prepare("UPDATE reports SET status = 'reviewing', request = ? WHERE id = ?").run(reason, report.id);
  } else if (action === "close" || action === "pause") {
    db.prepare("UPDATE reports SET status = 'closed', result = ? WHERE id = ?").run(reason, report.id);
    if (action === "pause") {
      db.prepare("UPDATE jobs SET status = 'paused' WHERE id = ?").run(report.job_id);
    }
  } else {
    return res.status(400).json({ error: "คำสั่งไม่ถูกต้อง" });
  }
  res.json({ state: getFullState(db) });
});

// Reset demo database
router.post("/demo/reset", (_req, res) => {
  const db = getDb();
  seedDatabase(db, { force: true });
  res.json({ ok: true, state: getFullState(db) });
});

module.exports = router;
