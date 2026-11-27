const express = require("express");
const { getDb, makeId, getFullState } = require("../db");
const { requireRole, optionalAuth } = require("../middleware/auth");
const { saveDataUrlImage } = require("./uploads");

const router = express.Router();

const VALID_CATEGORIES = new Set(["language", "math", "science", "tech", "creative", "exam", "other"]);
const VALID_LEVELS = new Set(["ประถมศึกษา", "มัธยมศึกษา", "มหาวิทยาลัย", "บุคคลทั่วไป"]);
const VALID_FORMATS = new Set(["online", "inPerson", "both"]);

// Create or Update tutor post (supports banner image & banner description)
router.post("/", requireRole("student"), (req, res) => {
  try {
    const db = getDb();
    const id = String(req.body?.id || "").trim();
    const subject = String(req.body?.subject || "").trim().slice(0, 80);
    const category = VALID_CATEGORIES.has(req.body?.category) ? req.body.category : "other";
    const level = String(req.body?.level || "").trim();
    const rate = Number(req.body?.rate);
    const format = String(req.body?.format || "").trim();
    const availability = String(req.body?.availability || "").trim().slice(0, 120);
    const experience = String(req.body?.experience || "").trim().slice(0, 600);
    const bannerText = String(req.body?.bannerText || "").trim().slice(0, 200);
    let bannerUrl = String(req.body?.bannerUrl || "").trim();

    if (req.body?.bannerDataUrl) {
      bannerUrl = saveDataUrlImage(req.body.bannerDataUrl, "banners") || bannerUrl;
    }

    if (!subject || !VALID_LEVELS.has(level) || !VALID_FORMATS.has(format) || !availability || !experience || !Number.isFinite(rate) || rate < 0 || rate > 10000) {
      return res.status(400).json({ error: "กรอกข้อมูลการสอนและราคาต่อชั่วโมงให้ครบถ้วน" });
    }

    if (id) {
      const existing = db.prepare("SELECT * FROM tutors WHERE id = ?").get(id);
      if (!existing) return res.status(404).json({ error: "ไม่พบประกาศรับสอน" });
      if (existing.owner_id !== req.user.entityId) {
        return res.status(403).json({ error: "แก้ไขได้เฉพาะประกาศของตัวเองเท่านั้น" });
      }
      const nextBannerUrl = req.body?.removeBanner ? "" : (bannerUrl || existing.banner_url || "");
      db.prepare(`
        UPDATE tutors
        SET category = ?, subject = ?, level = ?, rate = ?, format = ?, availability = ?, experience = ?, banner_url = ?, banner_text = ?
        WHERE id = ?
      `).run(category, subject, level, rate, format, availability, experience, nextBannerUrl, bannerText, id);
      return res.json({ tutorId: id, state: getFullState(db) });
    }

    const newId = makeId("tutor");
    db.prepare(`
      INSERT INTO tutors (id, owner_id, category, subject, level, rate, format, availability, experience, banner_url, banner_text)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(newId, req.user.entityId, category, subject, level, rate, format, availability, experience, bannerUrl, bannerText);

    res.status(201).json({ tutorId: newId, state: getFullState(db) });
  } catch (err) {
    res.status(400).json({ error: err.message || "บันทึกประกาศติวเตอร์ไม่สำเร็จ" });
  }
});

// DELETE tutor post (solves น้องข้าว ข้อ 3!)
router.delete("/:id", requireRole("student"), (req, res) => {
  const db = getDb();
  const tutor = db.prepare("SELECT * FROM tutors WHERE id = ?").get(req.params.id);
  if (!tutor) return res.status(404).json({ error: "ไม่พบประกาศรับสอน" });
  if (tutor.owner_id !== req.user.entityId) {
    return res.status(403).json({ error: "ลบได้เฉพาะประกาศรับสอนของตัวเองเท่านั้น" });
  }
  db.prepare("DELETE FROM tutor_requests WHERE tutor_id = ?").run(tutor.id);
  db.prepare("DELETE FROM tutor_reviews WHERE tutor_id = ?").run(tutor.id);
  db.prepare("DELETE FROM tutors WHERE id = ?").run(tutor.id);
  res.json({ deleted: true, state: getFullState(db) });
});

// Send contact request to a tutor
router.post("/:id/requests", optionalAuth, (req, res) => {
  const db = getDb();
  const tutor = db.prepare("SELECT * FROM tutors WHERE id = ?").get(req.params.id);
  if (!tutor) return res.status(404).json({ error: "ไม่พบประกาศติวเตอร์" });

  const name = String(req.body?.name || "").trim().slice(0, 80);
  const contact = String(req.body?.contact || "").trim().slice(0, 120);
  const message = String(req.body?.message || "").trim().slice(0, 600);
  if (!name || !contact || !message) {
    return res.status(400).json({ error: "กรอกชื่อ ช่องทางติดต่อ และข้อความให้ครบ" });
  }

  db.prepare(`
    INSERT INTO tutor_requests (id, tutor_id, name, contact, message)
    VALUES (?, ?, ?, ?, ?)
  `).run(makeId("treq"), tutor.id, name, contact, message);

  res.status(201).json({ state: getFullState(db) });
});

// Add a review for a tutor
router.post("/:id/reviews", optionalAuth, (req, res) => {
  const db = getDb();
  const tutor = db.prepare("SELECT * FROM tutors WHERE id = ?").get(req.params.id);
  if (!tutor) return res.status(404).json({ error: "ไม่พบประกาศติวเตอร์" });

  const reviewerName = String(req.body?.reviewerName || req.user?.displayName || "").trim().slice(0, 80);
  const rating = Number(req.body?.rating);
  const comment = String(req.body?.comment || "").trim().slice(0, 500);
  if (!reviewerName || !Number.isInteger(rating) || rating < 1 || rating > 5 || !comment) {
    return res.status(400).json({ error: "กรอกชื่อ คะแนน (1–5 ดาว) และรีวิวให้ครบ" });
  }

  db.prepare(`
    INSERT INTO tutor_reviews (id, tutor_id, reviewer_name, rating, comment)
    VALUES (?, ?, ?, ?, ?)
  `).run(makeId("trev"), tutor.id, reviewerName, rating, comment);

  res.status(201).json({ state: getFullState(db) });
});

module.exports = router;
