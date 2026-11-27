const express = require("express");
const { getDb, makeId, parseJson, getFullState } = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");
const { saveDataUrlImage } = require("./uploads");

const router = express.Router();

function isClosed(status) {
  return ["declined", "withdrawn", "offer_declined", "resigned"].includes(status);
}

// Student applies to a job (prevents duplicate active application AND reuses single chat thread per shop)
router.post("/", requireRole("student"), (req, res) => {
  const db = getDb();
  const jobId = String(req.body?.jobId || "").trim();
  const doc = String(req.body?.doc || "").trim();
  const shared = Array.isArray(req.body?.shared) ? req.body.shared : [];
  const studentId = req.user.entityId;

  const job = db.prepare("SELECT * FROM jobs WHERE id = ?").get(jobId);
  if (!job || job.status !== "live") {
    return res.status(400).json({ error: "ประกาศนี้ไม่เปิดรับสมัครแล้ว" });
  }
  if (job.doc && !doc) {
    return res.status(400).json({ error: "กรุณาแนบเอกสารประกอบก่อนส่งใบสมัคร" });
  }

  // Prevent duplicate active applications to the same job
  const existing = db
    .prepare("SELECT id, status FROM applications WHERE student_id = ? AND job_id = ?")
    .all(studentId, jobId)
    .find(a => !isClosed(a.status));

  if (existing) {
    // Do NOT create duplicate application or chat room — return existing application cleanly
    return res.status(200).json({
      duplicate: true,
      applicationId: existing.id,
      state: getFullState(db)
    });
  }

  const student = db.prepare("SELECT * FROM students WHERE id = ?").get(studentId);
  const profile = {
    name: student.name,
    major: student.major,
    year: student.year
  };
  for (const field of ["nick", "intro", "skills", "experience", "photo"]) {
    if (shared.includes(field) && student[field]) {
      profile[field] = student[field];
    }
  }

  const appId = makeId("app");
  const nowIso = new Date().toISOString();

  db.prepare(`
    INSERT INTO applications
      (id, student_id, job_id, employer_id, status, hiring_stage, profile_json, doc, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'pending', 'review', ?, ?, ?, ?)
  `).run(appId, studentId, jobId, job.employer_id, JSON.stringify(profile), doc, nowIso, nowIso);

  res.status(201).json({
    applicationId: appId,
    state: getFullState(db)
  });
});

// Employer updates hiring stage (FIXED: setting 'hired' immediately promotes status -> 'accepted' & assigns shift!)
router.patch("/:id/hiring", requireRole("employer"), (req, res) => {
  const db = getDb();
  const app = db.prepare("SELECT * FROM applications WHERE id = ?").get(req.params.id);
  if (!app || app.employer_id !== req.user.entityId) {
    return res.status(404).json({ error: "ไม่พบใบสมัครของร้านคุณ" });
  }
  if (!["pending", "offered", "accepted"].includes(app.status)) {
    return res.status(400).json({ error: "ไม่สามารถเปลี่ยนสถานะใบสมัครที่ปิดไปแล้ว" });
  }

  const stage = String(req.body?.stage || "").trim();
  if (!["review", "interview", "training", "hired"].includes(stage)) {
    return res.status(400).json({ error: "สถานะไม่ถูกต้อง" });
  }

  const note = String(req.body?.note || "").trim().slice(0, 600);
  const interview = req.body?.interview || null;
  const requestedShiftId = String(req.body?.shiftId || "").trim();
  const nowIso = new Date().toISOString();

  let nextStatus = app.status;
  let nextShift = app.shift_id;
  let nextWork = app.work_status;

  if (stage === "hired") {
    const job = db.prepare("SELECT * FROM jobs WHERE id = ?").get(app.job_id);
    const shifts = parseJson(job?.shifts_json, []);
    if (requestedShiftId && shifts.some(s => s.id === requestedShiftId)) {
      nextShift = requestedShiftId;
    } else if (!nextShift && shifts.length > 0) {
      nextShift = shifts[0].id;
    }
    nextStatus = "accepted";
    if (!nextWork) nextWork = "ready";
  }

  db.prepare(`
    UPDATE applications
    SET hiring_stage = ?, hiring_note = ?, interview_json = ?, status = ?, shift_id = ?, work_status = ?, updated_at = ?
    WHERE id = ?
  `).run(
    stage,
    note,
    interview ? JSON.stringify(interview) : null,
    nextStatus,
    nextShift || null,
    nextWork || null,
    nowIso,
    app.id
  );

  res.json({ state: getFullState(db) });
});

// Employer sends shift offer
router.patch("/:id/offer", requireRole("employer"), (req, res) => {
  const db = getDb();
  const app = db.prepare("SELECT * FROM applications WHERE id = ?").get(req.params.id);
  if (!app || app.employer_id !== req.user.entityId) {
    return res.status(404).json({ error: "ไม่พบใบสมัคร" });
  }
  if (!["pending", "offered"].includes(app.status)) {
    return res.status(400).json({ error: "ส่งข้อเสนอได้เฉพาะใบสมัครที่รอพิจารณาหรือเสนอแล้ว" });
  }
  const shiftId = String(req.body?.shiftId || "").trim();
  const job = db.prepare("SELECT * FROM jobs WHERE id = ?").get(app.job_id);
  const shifts = parseJson(job?.shifts_json, []);
  if (!shifts.some(s => s.id === shiftId)) {
    return res.status(400).json({ error: "ไม่พบเวลาทำงานที่เลือกในประกาศ" });
  }

  db.prepare("UPDATE applications SET shift_id = ?, status = 'offered', updated_at = ? WHERE id = ?")
    .run(shiftId, new Date().toISOString(), app.id);

  res.json({ state: getFullState(db) });
});

// Employer declines applicant
router.patch("/:id/decline", requireRole("employer"), (req, res) => {
  const db = getDb();
  const app = db.prepare("SELECT * FROM applications WHERE id = ?").get(req.params.id);
  if (!app || app.employer_id !== req.user.entityId) {
    return res.status(404).json({ error: "ไม่พบใบสมัคร" });
  }
  const nowIso = new Date().toISOString();
  db.prepare("UPDATE applications SET status = 'declined', closed_at = ?, updated_at = ? WHERE id = ?")
    .run(nowIso, nowIso, app.id);
  res.json({ state: getFullState(db) });
});

// Student accepts shift offer
router.patch("/:id/accept", requireRole("student"), (req, res) => {
  const db = getDb();
  const app = db.prepare("SELECT * FROM applications WHERE id = ?").get(req.params.id);
  if (!app || app.student_id !== req.user.entityId) {
    return res.status(404).json({ error: "ไม่พบใบสมัคร" });
  }
  if (app.status !== "offered") {
    return res.status(400).json({ error: "ข้อเสนอนี้ไม่อยู่ในสถานะรอการยืนยัน" });
  }
  const nowIso = new Date().toISOString();
  db.prepare("UPDATE applications SET status = 'accepted', hiring_stage = 'hired', work_status = 'ready', updated_at = ? WHERE id = ?")
    .run(nowIso, app.id);
  res.json({ state: getFullState(db) });
});

// Student withdraws pending application
router.patch("/:id/withdraw", requireRole("student"), (req, res) => {
  const db = getDb();
  const app = db.prepare("SELECT * FROM applications WHERE id = ?").get(req.params.id);
  if (!app || app.student_id !== req.user.entityId) {
    return res.status(404).json({ error: "ไม่พบใบสมัคร" });
  }
  if (app.status !== "pending") {
    return res.status(400).json({ error: "ถอนใบสมัครได้เฉพาะสถานะรอผลเท่านั้น" });
  }
  const nowIso = new Date().toISOString();
  db.prepare("UPDATE applications SET status = 'withdrawn', shift_id = NULL, closed_at = ?, updated_at = ? WHERE id = ?")
    .run(nowIso, nowIso, app.id);
  res.json({ state: getFullState(db) });
});

// Student declines shift offer
router.patch("/:id/decline-offer", requireRole("student"), (req, res) => {
  const db = getDb();
  const app = db.prepare("SELECT * FROM applications WHERE id = ?").get(req.params.id);
  if (!app || app.student_id !== req.user.entityId) {
    return res.status(404).json({ error: "ไม่พบใบสมัคร" });
  }
  if (app.status !== "offered") {
    return res.status(400).json({ error: "ปฏิเสธข้อเสนอได้เฉพาะเมื่อได้รับข้อเสนอเท่านั้น" });
  }
  const nowIso = new Date().toISOString();
  db.prepare("UPDATE applications SET status = 'offer_declined', shift_id = NULL, closed_at = ?, updated_at = ? WHERE id = ?")
    .run(nowIso, nowIso, app.id);
  res.json({ state: getFullState(db) });
});

// Student RESIGNS from an accepted job (stops new check-ins, preserves all past sessions & earnings)
router.post("/:id/resign", requireRole("student"), (req, res) => {
  const db = getDb();
  const app = db.prepare("SELECT * FROM applications WHERE id = ?").get(req.params.id);
  if (!app || app.student_id !== req.user.entityId) {
    return res.status(404).json({ error: "ไม่พบงานของคุณ" });
  }
  if (app.status !== "accepted") {
    return res.status(400).json({ error: "สามารถแจ้งลาออกได้เฉพาะงานที่กำลังทำอยู่เท่านั้น" });
  }

  const openSession = db
    .prepare("SELECT id FROM work_sessions WHERE application_id = ? AND status = 'checked_in'")
    .get(app.id);
  if (openSession) {
    return res.status(400).json({ error: "กรุณาเช็กเอาต์รอบที่กำลังทำอยู่ก่อนแจ้งลาออก" });
  }

  const reason = String(req.body?.reason || "").trim().slice(0, 400);
  const nowIso = new Date().toISOString();

  db.prepare(`
    UPDATE applications
    SET status = 'resigned', resigned_at = ?, resign_reason = ?, closed_at = ?, updated_at = ?
    WHERE id = ?
  `).run(nowIso, reason, nowIso, nowIso, app.id);

  // Post a system notice message into the shop chat thread
  const threadKey = `${app.student_id}::${app.employer_id}`;
  db.prepare(`
    INSERT INTO chat_messages (id, thread_key, application_id, student_id, employer_id, sender_role, text, status, created_at)
    VALUES (?, ?, ?, ?, ?, 'student', ?, 'read', ?)
  `).run(
    makeId("msg"),
    threadKey,
    app.id,
    app.student_id,
    app.employer_id,
    `[แจ้งลาออก] นิสิตขอสิ้นสุดการทำงานในตำแหน่งนี้${reason ? ` — เหตุผล: ${reason}` : ""}`,
    nowIso
  );

  res.json({ state: getFullState(db) });
});

// Send chat message (unified per student_id::employer_id thread!)
router.post("/:id/messages", requireAuth, (req, res) => {
  try {
    const db = getDb();
    const app = db.prepare("SELECT * FROM applications WHERE id = ?").get(req.params.id);
    if (!app) return res.status(404).json({ error: "ไม่พบห้องแชท" });

    const isStudent = req.user.role === "student" && app.student_id === req.user.entityId;
    const isEmployer = req.user.role === "employer" && app.employer_id === req.user.entityId;
    if (!isStudent && !isEmployer) {
      return res.status(403).json({ error: "ไม่มีสิทธิ์ส่งข้อความในห้องนี้" });
    }

    const text = String(req.body?.text || "").trim().slice(0, 1000);
    let photoUrl = String(req.body?.photoUrl || "").trim();
    if (!photoUrl && req.body?.photoDataUrl) {
      photoUrl = saveDataUrlImage(req.body.photoDataUrl, "chat") || "";
    }
    if (!text && !photoUrl) {
      return res.status(400).json({ error: "กรุณาพิมพ์ข้อความหรือแนบรูปภาพ" });
    }

    const threadKey = `${app.student_id}::${app.employer_id}`;
    const nowIso = new Date().toISOString();
    const msgId = makeId("msg");

    db.prepare(`
      INSERT INTO chat_messages (id, thread_key, application_id, student_id, employer_id, sender_role, text, photo_url, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'read', ?)
    `).run(msgId, threadKey, app.id, app.student_id, app.employer_id, req.user.role, text, photoUrl, nowIso);

    res.status(201).json({
      messageId: msgId,
      threadKey,
      state: getFullState(db)
    });
  } catch (err) {
    res.status(400).json({ error: err.message || "ส่งข้อความไม่สำเร็จ" });
  }
});

// Work & Grow review submission
router.post("/:id/review", requireAuth, (req, res) => {
  const db = getDb();
  const app = db.prepare("SELECT * FROM applications WHERE id = ?").get(req.params.id);
  if (!app) return res.status(404).json({ error: "ไม่พบใบสมัคร" });

  const rating = Number(req.body?.rating);
  const comment = String(req.body?.comment || "").trim().slice(0, 500);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ error: "กรุณาให้คะแนน 1–5 ดาว" });
  }

  const reviewObj = { rating, comment, at: new Date().toISOString() };
  if (req.user.role === "student" && app.student_id === req.user.entityId) {
    db.prepare("UPDATE applications SET student_review_json = ?, updated_at = ? WHERE id = ?")
      .run(JSON.stringify(reviewObj), new Date().toISOString(), app.id);
  } else if (req.user.role === "employer" && app.employer_id === req.user.entityId) {
    db.prepare("UPDATE applications SET employer_review_json = ?, updated_at = ? WHERE id = ?")
      .run(JSON.stringify(reviewObj), new Date().toISOString(), app.id);
  } else {
    return res.status(403).json({ error: "ไม่มีสิทธิ์ประเมินรายการนี้" });
  }

  res.json({ state: getFullState(db) });
});

module.exports = router;
