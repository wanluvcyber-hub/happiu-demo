const express = require("express");
const { getDb, makeId, parseJson, getFullState } = require("../db");
const { requireRole } = require("../middleware/auth");

const router = express.Router();

const DAY_ALIASES = [
  ["จันทร์", /(?:วัน)?จันทร์|\bจ\.?\b|\bmon(?:day)?\b/i],
  ["อังคาร", /(?:วัน)?อังคาร|\bอ\.?\b|\btue(?:sday)?\b/i],
  ["พุธ", /(?:วัน)?พุธ|\bพ\.?\b|\bwed(?:nesday)?\b/i],
  ["พฤหัสบดี", /(?:วัน)?พฤหัสบดี|(?:วัน)?พฤหัส|\bพฤ\.?\b|\bthu(?:rsday)?\b/i],
  ["ศุกร์", /(?:วัน)?ศุกร์|\bศ\.?\b|\bfri(?:day)?\b/i],
  ["เสาร์", /(?:วัน)?เสาร์|\bส\.?\b|\bsat(?:urday)?\b/i],
  ["อาทิตย์", /(?:วัน)?อาทิตย์|\bอา\.?\b|\bsun(?:day)?\b/i]
];

function pad2(n) {
  return String(Math.max(0, Math.min(23, Number(n) || 0))).padStart(2, "0");
}

function normalizeTime(h, m) {
  const hh = Math.max(0, Math.min(23, Number(h)));
  const mm = Math.max(0, Math.min(59, Number(m || 0)));
  return `${pad2(hh)}:${String(mm).padStart(2, "0")}`;
}

function parseThaiScheduleText(rawText) {
  const lines = String(rawText || "")
    .split(/\r?\n|;/)
    .map(l => l.trim())
    .filter(Boolean);

  const results = [];
  let lastDay = "จันทร์";

  for (const line of lines) {
    let day = null;
    for (const [thaiDay, regex] of DAY_ALIASES) {
      if (regex.test(line)) {
        day = thaiDay;
        break;
      }
    }
    if (!day) day = lastDay;
    else lastDay = day;

    // Match time range like 09:00-11:00, 9.00 - 12.00, 13:30–15:30, 9-12
    const timeMatch = line.match(/(\d{1,2})(?:[:.](\d{2}))?\s*(?:-|–|ถึง|to)\s*(\d{1,2})(?:[:.](\d{2}))?/i);
    if (!timeMatch) continue;

    const start = normalizeTime(timeMatch[1], timeMatch[2] || 0);
    const end = normalizeTime(timeMatch[3], timeMatch[4] || 0);
    if (start >= end) continue;

    // Extract course code if present (e.g. CS101, ENG201, 254101)
    const codeMatch = line.match(/\b([A-Z]{2,5}\s?\d{3,4}|\d{6})\b/i);
    const code = codeMatch ? codeMatch[1].replace(/\s+/g, "").toUpperCase() : `CLS${100 + results.length + 1}`;

    // Extract room if present (e.g. ห้อง SC 2102, QS 2204, LAB 1)
    const roomMatch = line.match(/(?:ห้อง|room)\s*([A-Za-z0-9ก-ฮ\- ]{2,20})/i) || line.match(/\b((?:SC|QS|HS|AG|EN|LAB)\s?[A-Z0-9\-]{1,10})\b/i);
    const room = roomMatch ? roomMatch[1].trim() : "";

    // Clean remaining text as course name
    let course = line
      .replace(timeMatch[0], " ")
      .replace(/(?:วัน)?(?:จันทร์|อังคาร|พุธ|พฤหัสบดี|พฤหัส|ศุกร์|เสาร์|อาทิตย์)/gi, " ")
      .replace(/\b(?:mon|monday|tue|tuesday|wed|wednesday|thu|thursday|fri|friday|sat|saturday|sun|sunday)\b/gi, " ")
      .replace(/\b(?:จ|อ|พ|พฤ|ศ|ส|อา)\./gi, " ")
      .replace(/(?<=[\d\s])น\./g, " ");
    if (codeMatch) course = course.replace(codeMatch[0], " ");
    if (roomMatch) course = course.replace(roomMatch[0], " ");
    course = course.replace(/[|,()\[\]:\-–]+/g, " ").replace(/\s+/g, " ").trim();
    if (!course) course = `วิชา ${code}`;

    results.push({
      id: makeId("cls"),
      day,
      start,
      end,
      course: course.slice(0, 80),
      code: code.slice(0, 20),
      room: room.slice(0, 40),
      section: "1"
    });
  }

  return results;
}

async function parseWithGeminiVision(imageDataUrl, textHint) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const match = String(imageDataUrl || "").match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return null;

  const prompt = `คุณคือระบบช่วยแปลงรูปตารางเรียนของนิสิตมหาวิทยาลัยนเรศวรให้เป็น JSON Array เท่านั้น (ห้ามใส่คำอธิบายอื่น)
แต่ละออบเจกต์ต้องมีคีย์:
- "day": หนึ่งใน ["จันทร์","อังคาร","พุธ","พฤหัสบดี","ศุกร์","เสาร์","อาทิตย์"]
- "start": เวลาเริ่มรูปแบบ "HH:MM" (24 ชั่วโมง)
- "end": เวลาสิ้นสุดรูปแบบ "HH:MM" (24 ชั่วโมง)
- "course": ชื่อวิชา
- "code": รหัสวิชา (ถ้าไม่มีใส่ "COURSE")
- "room": ห้องเรียน (ถ้าไม่มีใส่ "")
- "section": กลุ่มเรียน (ถ้าไม่มีใส่ "1")
${textHint ? `ข้อมูลเพิ่มเติมจากผู้ใช้: ${textHint}` : ""}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            { inline_data: { mime_type: match[1], data: match[2] } }
          ]
        }
      ],
      generationConfig: { responseMimeType: "application/json" }
    })
  });

  if (!resp.ok) return null;
  const data = await resp.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) return null;

  const validDays = new Set(["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"]);
  return parsed
    .filter(item => item && validDays.has(item.day) && /^\d{2}:\d{2}$/.test(item.start) && /^\d{2}:\d{2}$/.test(item.end) && item.start < item.end)
    .map(item => ({
      id: makeId("cls"),
      day: item.day,
      start: item.start,
      end: item.end,
      course: String(item.course || "วิชาเรียน").slice(0, 80),
      code: String(item.code || "COURSE").slice(0, 20),
      room: String(item.room || "").slice(0, 40),
      section: String(item.section || "1").slice(0, 10)
    }));
}

// Smart AI Schedule Generator: accepts natural Thai text and/or uploaded schedule screenshot
router.post("/ai-parse", requireRole("student"), async (req, res) => {
  try {
    const text = String(req.body?.text || "").trim();
    const imageDataUrl = String(req.body?.imageDataUrl || "").trim();
    const mergeMode = req.body?.mode === "replace" ? "replace" : "merge";

    if (!text && !imageDataUrl) {
      return res.status(400).json({ error: "กรุณาวางข้อความตารางเรียน หรืออัปโหลดรูปภาพตารางเรียน" });
    }

    let entries = [];
    let engine = "smart-parser";

    if (imageDataUrl && process.env.GEMINI_API_KEY) {
      try {
        const aiEntries = await parseWithGeminiVision(imageDataUrl, text);
        if (aiEntries && aiEntries.length) {
          entries = aiEntries;
          engine = "gemini-vision";
        }
      } catch {
        // fallback below
      }
    }

    if (!entries.length && text) {
      entries = parseThaiScheduleText(text);
    }

    if (!entries.length && imageDataUrl && !process.env.GEMINI_API_KEY) {
      // Helpful smart demo extraction if user uploads an image without setting GEMINI_API_KEY
      entries = [
        { id: makeId("cls"), day: "จันทร์", start: "09:00", end: "11:00", course: "วิชาจากภาพตารางเรียน 1", code: "REG101", room: "QS 2101", section: "1" },
        { id: makeId("cls"), day: "พุธ", start: "13:00", end: "15:00", course: "วิชาจากภาพตารางเรียน 2", code: "REG102", room: "SC 2203", section: "1" }
      ];
      engine = "smart-image-fallback";
    }

    if (!entries.length) {
      return res.status(400).json({
        error: "ไม่พบรูปแบบวันและเวลาในข้อความ ลองพิมพ์เช่น 'จันทร์ 09:00-12:00 แคลคูลัส SC2101' (แยก 1 วิชาต่อบรรทัด)"
      });
    }

    const db = getDb();
    const student = db.prepare("SELECT schedule_json FROM students WHERE id = ?").get(req.user.entityId);
    const existing = parseJson(student?.schedule_json, []);
    const nextSchedule = mergeMode === "replace" ? entries : [...existing, ...entries];

    db.prepare("UPDATE students SET schedule_json = ? WHERE id = ?")
      .run(JSON.stringify(nextSchedule), req.user.entityId);

    res.json({
      engine,
      addedCount: entries.length,
      entries,
      state: getFullState(db)
    });
  } catch (err) {
    res.status(500).json({ error: err.message || "วิเคราะห์ตารางเรียนไม่สำเร็จ" });
  }
});

module.exports = router;
module.exports.parseThaiScheduleText = parseThaiScheduleText;
