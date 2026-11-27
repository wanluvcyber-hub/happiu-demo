const express = require("express");
const bcrypt = require("bcryptjs");
const { getDb, makeId, getFullState } = require("../db");
const { signToken, requireAuth } = require("../middleware/auth");

const router = express.Router();

function formatUserResponse(user) {
  return {
    id: user.id,
    identifier: user.identifier,
    role: user.role,
    displayName: user.display_name || user.displayName,
    entityId: user.entity_id || user.entityId
  };
}

// Unified Login: single identifier field (Student ID / Staff ID / Employer Email) + password
router.post("/login", (req, res) => {
  const db = getDb();
  const rawId = String(req.body?.identifier || "").trim();
  const password = String(req.body?.password || "");

  if (!rawId || !password) {
    return res.status(400).json({ error: "กรุณากรอกรหัสประจำตัวหรืออีเมล และรหัสผ่าน" });
  }

  const normalized = rawId.includes("@") ? rawId.toLowerCase() : rawId.toUpperCase();
  const user = db.prepare("SELECT * FROM users WHERE UPPER(identifier) = UPPER(?)").get(normalized);

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "รหัสประจำตัว/อีเมล หรือรหัสผ่านไม่ถูกต้อง" });
  }

  const token = signToken(user);
  res.json({
    token,
    user: formatUserResponse(user),
    state: getFullState(db)
  });
});

// Unified Registration: Student (by Student ID) or Employer (by Email)
router.post("/register", (req, res) => {
  const db = getDb();
  const rawId = String(req.body?.identifier || "").trim();
  const password = String(req.body?.password || "");
  const displayName = String(req.body?.name || "").trim();

  if (!rawId || !password || !displayName) {
    return res.status(400).json({ error: "กรุณากรอกรหัสนิสิต/อีเมล ชื่อ และรหัสผ่านให้ครบ" });
  }
  if (password.length < 4) {
    return res.status(400).json({ error: "รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร" });
  }

  const isEmail = rawId.includes("@");
  const role = isEmail ? "employer" : "student";
  const identifier = isEmail ? rawId.toLowerCase() : rawId.toUpperCase();

  const existing = db.prepare("SELECT id FROM users WHERE UPPER(identifier) = UPPER(?)").get(identifier);
  if (existing) {
    return res.status(409).json({ error: isEmail ? "อีเมลนี้มีบัญชีในระบบแล้ว" : "รหัสนิสิตนี้มีบัญชีในระบบแล้ว" });
  }

  const passwordHash = bcrypt.hashSync(password, 8);
  const userId = makeId("usr");

  if (role === "student") {
    const studentId = makeId("stu");
    const faculty = String(req.body?.faculty || "คณะวิทยาศาสตร์").trim();
    const major = String(req.body?.major || "วิทยาการคอมพิวเตอร์").trim();
    const year = Math.max(1, Math.min(6, Number(req.body?.year || 1) || 1));
    const contact = String(req.body?.contact || `${identifier.toLowerCase()}@nu.ac.th`).trim();
    const nick = String(req.body?.nick || displayName.split(/\s+/)[0]).trim();

    db.prepare(`
      INSERT INTO students (id, code, name, nick, year, faculty, major, contact, photo, intro, skills, experience, interests_json, availability, schedule_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', '', '', '', '[]', '', '[]')
    `).run(studentId, identifier, displayName, nick, year, faculty, major, contact);

    db.prepare(`
      INSERT INTO users (id, identifier, password_hash, role, display_name, entity_id)
      VALUES (?, ?, ?, 'student', ?, ?)
    `).run(userId, identifier, passwordHash, displayName, studentId);

    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
    const token = signToken(user);
    return res.status(201).json({
      token,
      user: formatUserResponse(user),
      state: getFullState(db)
    });
  }

  // Employer registration
  const empId = makeId("emp");
  const empType = ["campus", "near", "online"].includes(req.body?.type) ? req.body.type : "near";

  db.prepare(`
    INSERT INTO employers (id, name, type, contact, status, reason, document)
    VALUES (?, ?, ?, ?, 'pending', 'รอเจ้าหน้าที่มหาวิทยาลัยตรวจสอบข้อมูลผู้จ้าง', '')
  `).run(empId, displayName, empType, identifier);

  db.prepare(`
    INSERT INTO users (id, identifier, password_hash, role, display_name, entity_id)
    VALUES (?, ?, ?, 'employer', ?, ?)
  `).run(userId, identifier, passwordHash, displayName, empId);

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  const token = signToken(user);
  return res.status(201).json({
    token,
    user: formatUserResponse(user),
    state: getFullState(db)
  });
});

router.get("/me", requireAuth, (req, res) => {
  const db = getDb();
  res.json({
    user: req.user,
    state: getFullState(db)
  });
});

module.exports = router;
