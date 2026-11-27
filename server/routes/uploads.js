const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { UPLOADS_DIR, getDb, makeId } = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const EXT_BY_MIME = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp"
};

function makeUploader(folder) {
  const dest = path.join(UPLOADS_DIR, folder);
  fs.mkdirSync(dest, { recursive: true });
  return multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, dest),
      filename: (_req, file, cb) => {
        const ext = EXT_BY_MIME[file.mimetype] || ".jpg";
        cb(null, `${makeId(folder)}${ext}`);
      }
    }),
    limits: { fileSize: 8 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (ALLOWED_MIME.has(file.mimetype)) cb(null, true);
      else cb(new Error("รองรับเฉพาะไฟล์รูปภาพ JPG, PNG หรือ WebP"));
    }
  });
}

function saveDataUrlImage(dataUrl, folder) {
  if (typeof dataUrl !== "string") return null;
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return null;
  const mime = match[1];
  const buf = Buffer.from(match[2], "base64");
  if (buf.length > 8 * 1024 * 1024) throw new Error("ไฟล์รูปใหญ่เกิน 8 MB");
  const dest = path.join(UPLOADS_DIR, folder);
  fs.mkdirSync(dest, { recursive: true });
  const filename = `${makeId(folder)}${EXT_BY_MIME[mime] || ".jpg"}`;
  fs.writeFileSync(path.join(dest, filename), buf);
  return `/uploads/${folder}/${filename}`;
}

const profileUpload = makeUploader("profiles");
const bannerUpload = makeUploader("banners");
const chatUpload = makeUploader("chat");

// Placeholder SVG for seeded sample check-in/out records
router.get("/placeholder/:kind", (req, res) => {
  const isOut = req.params.kind === "checkout";
  const label = isOut ? "CHECK-OUT" : "CHECK-IN";
  const bg = isOut ? "#1e3a5f" : "#0f4c3a";
  const accent = isOut ? "#f97316" : "#10b981";
  const timeText = isOut ? "20:00 น." : "17:00 น.";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${bg}"/><stop offset="100%" stop-color="#0f172a"/></linearGradient></defs>
    <rect width="640" height="420" fill="url(#g)"/>
    <circle cx="320" cy="150" r="56" fill="rgba(255,255,255,0.12)"/>
    <text x="320" y="160" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-size="24" font-weight="700">HappiU</text>
    <rect x="24" y="300" width="592" height="96" rx="14" fill="rgba(15,23,42,0.78)" stroke="${accent}" stroke-width="2"/>
    <rect x="40" y="318" width="126" height="28" rx="14" fill="${accent}"/>
    <text x="103" y="337" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-size="14" font-weight="700">${label}</text>
    <text x="182" y="338" fill="#ffffff" font-family="sans-serif" font-size="18" font-weight="700">เวลา ${timeText} · ห้องสมุด มน.</text>
    <text x="40" y="374" fill="#cbd5e1" font-family="sans-serif" font-size="14">ภาพตัวอย่างการลงเวลาเข้า-ออกงาน (ประทับเวลาจากระบบ HappiU)</text>
  </svg>`;
  res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
  res.send(svg);
});

router.post("/profile", requireAuth, profileUpload.single("photo"), (req, res) => {
  try {
    let url = "";
    if (req.file) {
      url = `/uploads/profiles/${req.file.filename}`;
    } else if (req.body?.photoDataUrl) {
      url = saveDataUrlImage(req.body.photoDataUrl, "profiles");
    }
    if (!url) return res.status(400).json({ error: "กรุณาเลือกรูปโปรไฟล์ (JPG, PNG หรือ WebP)" });

    if (req.user.role === "student" && req.user.entityId) {
      const db = getDb();
      db.prepare("UPDATE students SET photo = ? WHERE id = ?").run(url, req.user.entityId);
    }
    res.json({ url });
  } catch (err) {
    res.status(400).json({ error: err.message || "อัปโหลดรูปไม่สำเร็จ" });
  }
});

router.post("/banner", requireAuth, bannerUpload.single("photo"), (req, res) => {
  try {
    let url = "";
    if (req.file) {
      url = `/uploads/banners/${req.file.filename}`;
    } else if (req.body?.photoDataUrl) {
      url = saveDataUrlImage(req.body.photoDataUrl, "banners");
    }
    if (!url) return res.status(400).json({ error: "กรุณาเลือกรูปแบนเนอร์ (JPG, PNG หรือ WebP)" });
    res.json({ url });
  } catch (err) {
    res.status(400).json({ error: err.message || "อัปโหลดแบนเนอร์ไม่สำเร็จ" });
  }
});

router.post("/chat", requireAuth, chatUpload.single("photo"), (req, res) => {
  try {
    let url = "";
    if (req.file) {
      url = `/uploads/chat/${req.file.filename}`;
    } else if (req.body?.photoDataUrl) {
      url = saveDataUrlImage(req.body.photoDataUrl, "chat");
    }
    if (!url) return res.status(400).json({ error: "กรุณาเลือกรูปภาพ (JPG, PNG หรือ WebP)" });
    res.json({ url });
  } catch (err) {
    res.status(400).json({ error: err.message || "อัปโหลดรูปไม่สำเร็จ" });
  }
});

module.exports = router;
module.exports.saveDataUrlImage = saveDataUrlImage;
module.exports.makeUploader = makeUploader;
