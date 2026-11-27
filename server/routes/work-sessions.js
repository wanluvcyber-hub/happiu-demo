const express = require("express");
const fs = require("fs");
const { getDb, makeId, parseJson, getFullState } = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");
const { saveDataUrlImage, makeUploader } = require("./uploads");

const router = express.Router();
const checkinUpload = makeUploader("checkins");
const slipUpload = makeUploader("slips");

function cleanupUploadedFiles(req) {
  const files = [];
  if (req.file) files.push(req.file);
  if (req.files && typeof req.files === "object") {
    for (const arr of Object.values(req.files)) {
      if (Array.isArray(arr)) files.push(...arr);
    }
  }
  for (const file of files) {
    if (file?.path) {
      try { fs.unlinkSync(file.path); } catch {}
    }
  }
}

function computeShiftDurationHours(jobRow, shiftId) {
  const shifts = parseJson(jobRow?.shifts_json, []);
  const s = shifts.find(item => item.id === shiftId) || shifts[0];
  if (!s || !s.start || !s.end) return 1;
  const toMin = str => Number(str.slice(0, 2)) * 60 + Number(str.slice(3, 5));
  const diff = (toMin(s.end) - toMin(s.start)) / 60;
  return diff > 0 ? diff : 1;
}

function computeSessionEarnings(jobRow, checkInIso, checkOutIso, shiftId) {
  const inMs = Date.parse(checkInIso);
  const outMs = Date.parse(checkOutIso);
  const elapsedHours = Math.max(0, (outMs - inMs) / 3600000);
  // Real elapsed hours rounded to 2 decimals; if checked in & out quickly (< 6 mins during demo/testing),
  // compute using scheduled shift hours so earnings display realistically while preserving exact timestamps
  const scheduledHours = computeShiftDurationHours(jobRow, shiftId);
  const billableHours = elapsedHours >= 0.1
    ? Math.round(elapsedHours * 100) / 100
    : scheduledHours;
  const rate = Number(jobRow?.rate || 0);
  const amount = jobRow?.pay_type === "fixed"
    ? rate
    : Math.round(billableHours * rate * 100) / 100;
  return { hours: billableHours, amount };
}

router.get("/", requireAuth, (req, res) => {
  const db = getDb();
  let rows = [];
  if (req.user.role === "student") {
    rows = db.prepare("SELECT * FROM work_sessions WHERE student_id = ? ORDER BY check_in_at DESC").all(req.user.entityId);
  } else if (req.user.role === "employer") {
    rows = db.prepare("SELECT * FROM work_sessions WHERE employer_id = ? ORDER BY check_in_at DESC").all(req.user.entityId);
  } else {
    rows = db.prepare("SELECT * FROM work_sessions ORDER BY check_in_at DESC").all();
  }
  res.json({ sessions: rows });
});

// Student Check-in with Photo (creates a new round in work_sessions — supports unlimited rounds!)
router.post("/check-in", requireRole("student"), checkinUpload.single("photo"), (req, res) => {
  try {
    const db = getDb();
    const applicationId = String(req.body?.applicationId || "").trim();
    const note = String(req.body?.note || "").trim().slice(0, 300);

    if (!applicationId) {
      return res.status(400).json({ error: "ไม่พบรหัสใบสมัครงาน" });
    }

    const app = db.prepare("SELECT * FROM applications WHERE id = ?").get(applicationId);
    if (!app || app.student_id !== req.user.entityId) {
      return res.status(404).json({ error: "ไม่พบงานของคุณในระบบ" });
    }
    if (app.status === "resigned") {
      return res.status(400).json({ error: "คุณแจ้งลาออกจากงานนี้แล้ว ไม่สามารถเช็กอินรอบใหม่ได้" });
    }
    if (app.status !== "accepted") {
      return res.status(400).json({ error: "ต้องได้รับการรับเข้าทำงานก่อนจึงจะเช็กอินได้" });
    }

    // Check if there's already an open (not checked-out) session for this job
    const openSession = db
      .prepare("SELECT id FROM work_sessions WHERE application_id = ? AND status = 'checked_in'")
      .get(applicationId);
    if (openSession) {
      return res.status(409).json({ error: "คุณเช็กอินรอบปัจจุบันค้างอยู่ กรุณาเช็กเอาต์ก่อนเริ่มรอบใหม่" });
    }

    let photoUrl = "";
    if (req.file) {
      photoUrl = `/uploads/checkins/${req.file.filename}`;
    } else if (req.body?.photoDataUrl) {
      photoUrl = saveDataUrlImage(req.body.photoDataUrl, "checkins");
    }
    if (!photoUrl) {
      return res.status(400).json({ error: "กรุณาถ่ายรูปหรือแนบรูปยืนยันการเข้าทำงานก่อนเช็กอิน" });
    }

    const nowIso = new Date().toISOString();
    const sessionId = makeId("ws");

    db.prepare(`
      INSERT INTO work_sessions
        (id, application_id, student_id, job_id, employer_id, shift_id, check_in_at, check_in_photo_url, status, note, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'checked_in', ?, ?, ?)
    `).run(
      sessionId,
      app.id,
      app.student_id,
      app.job_id,
      app.employer_id,
      app.shift_id || null,
      nowIso,
      photoUrl,
      note,
      nowIso,
      nowIso
    );

    const timeLabel = new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(nowIso));
    db.prepare("UPDATE applications SET work_status = 'started', work_in = ?, updated_at = ? WHERE id = ?")
      .run(timeLabel, nowIso, app.id);

    const session = db.prepare("SELECT * FROM work_sessions WHERE id = ?").get(sessionId);
    res.status(201).json({
      session,
      state: getFullState(db)
    });
  } catch (err) {
    res.status(400).json({ error: err.message || "เช็กอินไม่สำเร็จ" });
  }
});

// Student Check-out with Photo
router.post("/:id/check-out", requireRole("student"), checkinUpload.single("photo"), (req, res) => {
  try {
    const db = getDb();
    const session = db.prepare("SELECT * FROM work_sessions WHERE id = ?").get(req.params.id);
    if (!session || session.student_id !== req.user.entityId) {
      return res.status(404).json({ error: "ไม่พบรอบการทำงานที่กำลังเช็กอิน" });
    }
    if (session.status !== "checked_in") {
      return res.status(400).json({ error: "รอบการทำงานนี้เช็กเอาต์ไปแล้ว" });
    }

    let photoUrl = "";
    if (req.file) {
      photoUrl = `/uploads/checkins/${req.file.filename}`;
    } else if (req.body?.photoDataUrl) {
      photoUrl = saveDataUrlImage(req.body.photoDataUrl, "checkins");
    }
    if (!photoUrl) {
      return res.status(400).json({ error: "กรุณาถ่ายรูปหรือแนบรูปยืนยันการออกงานก่อนเช็กเอาต์" });
    }

    const jobRow = db.prepare("SELECT * FROM jobs WHERE id = ?").get(session.job_id);
    const nowIso = new Date().toISOString();
    const { hours, amount } = computeSessionEarnings(jobRow, session.check_in_at, nowIso, session.shift_id);
    const note = req.body?.note ? String(req.body.note).trim().slice(0, 300) : session.note;

    db.prepare(`
      UPDATE work_sessions
      SET check_out_at = ?, check_out_photo_url = ?, hours = ?, amount = ?, status = 'pending_approval', note = ?, updated_at = ?
      WHERE id = ?
    `).run(nowIso, photoUrl, hours, amount, note, nowIso, session.id);

    const timeLabel = new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(nowIso));
    db.prepare("UPDATE applications SET work_status = 'ended', work_out = ?, work_amount = ?, updated_at = ? WHERE id = ?")
      .run(timeLabel, amount, nowIso, session.application_id);

    const updated = db.prepare("SELECT * FROM work_sessions WHERE id = ?").get(session.id);
    res.json({
      session: updated,
      state: getFullState(db)
    });
  } catch (err) {
    res.status(400).json({ error: err.message || "เช็กเอาต์ไม่สำเร็จ" });
  }
});

// Employer Approve a specific work session
router.patch("/:id/approve", requireRole("employer"), (req, res) => {
  const db = getDb();
  const session = db.prepare("SELECT * FROM work_sessions WHERE id = ?").get(req.params.id);
  if (!session || session.employer_id !== req.user.entityId) {
    return res.status(404).json({ error: "ไม่พบรายการรอบการทำงานของร้านคุณ" });
  }
  if (session.status !== "pending_approval") {
    return res.status(400).json({ error: "รายการนี้ไม่อยู่ในสถานะรอรับรอง" });
  }

  const nowIso = new Date().toISOString();
  db.prepare("UPDATE work_sessions SET status = 'approved', updated_at = ? WHERE id = ?").run(nowIso, session.id);
  db.prepare("UPDATE applications SET work_status = 'approved', updated_at = ? WHERE id = ?").run(nowIso, session.application_id);

  const updated = db.prepare("SELECT * FROM work_sessions WHERE id = ?").get(session.id);
  res.json({
    session: updated,
    state: getFullState(db)
  });
});

// Employer Record Payment for a specific work session (Image slip upload only)
router.patch(
  "/:id/pay",
  requireRole("employer"),
  slipUpload.fields([{ name: "slip", maxCount: 1 }, { name: "photo", maxCount: 1 }]),
  (req, res) => {
    try {
      const db = getDb();
      const session = db.prepare("SELECT * FROM work_sessions WHERE id = ?").get(req.params.id);
      if (!session || session.employer_id !== req.user.entityId) {
        cleanupUploadedFiles(req);
        return res.status(404).json({ error: "ไม่พบรายการรอบการทำงานของร้านคุณ" });
      }
      if (session.status !== "approved") {
        cleanupUploadedFiles(req);
        return res.status(400).json({ error: "ต้องรับรองชั่วโมงก่อนบันทึกการจ่ายเงิน" });
      }

      let slipUrl = "";
      const uploadedFile = req.files?.slip?.[0] || req.files?.photo?.[0] || req.file;
      if (uploadedFile) {
        slipUrl = `/uploads/slips/${uploadedFile.filename}`;
      } else if (req.body?.slipDataUrl || req.body?.photoDataUrl) {
        slipUrl = saveDataUrlImage(req.body.slipDataUrl || req.body.photoDataUrl, "slips") || "";
      }

      if (!slipUrl) {
        cleanupUploadedFiles(req);
        return res.status(400).json({ error: "กรุณาอัปโหลดรูปภาพสลิปโอนเงิน (JPG, PNG หรือ WebP)" });
      }

      const nowIso = new Date().toISOString();
      db.prepare("UPDATE work_sessions SET status = 'paid', payment_proof = ?, updated_at = ? WHERE id = ?")
        .run(slipUrl, nowIso, session.id);
      db.prepare("UPDATE applications SET work_status = 'paid', work_proof = ?, updated_at = ? WHERE id = ?")
        .run(slipUrl, nowIso, session.application_id);

      const updated = db.prepare("SELECT * FROM work_sessions WHERE id = ?").get(session.id);
      res.json({
        session: updated,
        state: getFullState(db)
      });
    } catch (err) {
      cleanupUploadedFiles(req);
      res.status(400).json({ error: err.message || "อัปโหลดสลิปโอนเงินไม่สำเร็จ" });
    }
  }
);

module.exports = router;
