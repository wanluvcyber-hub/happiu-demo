require("dotenv").config();
const express = require("express");
const path = require("path");
const { ROOT_DIR, UPLOADS_DIR, initDb } = require("./db");
const { seedDatabase } = require("./seed");

const authRoutes = require("./routes/auth");
const stateRoutes = require("./routes/state");
const uploadRoutes = require("./routes/uploads");
const workSessionRoutes = require("./routes/work-sessions");
const applicationRoutes = require("./routes/applications");
const tutorRoutes = require("./routes/tutors");
const scheduleAiRoutes = require("./routes/schedule-ai");

function createApp({ dbPath } = {}) {
  const db = initDb(dbPath);
  seedDatabase(db);

  const app = express();
  app.use(express.json({ limit: "12mb" }));
  app.use(express.urlencoded({ extended: true, limit: "12mb" }));

  // Static uploaded images (check-in photos, real profile photos, tutor banners, chat images)
  app.use("/uploads", express.static(UPLOADS_DIR, { maxAge: "7d" }));

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "happiu-api", now: new Date().toISOString() });
  });

  // API Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/uploads", uploadRoutes);
  app.use("/api/work-sessions", workSessionRoutes);
  app.use("/api/applications", applicationRoutes);
  app.use("/api/tutors", tutorRoutes);
  app.use("/api/schedule", scheduleAiRoutes);
  app.use("/api", stateRoutes);

  // Serve Frontend Static Assets (no-store for HTML/CSS/JS so live edits always reflect immediately)
  const noCacheHeaders = res => res.setHeader("Cache-Control", "no-store, must-revalidate");
  app.use("/css", express.static(path.join(ROOT_DIR, "css"), { setHeaders: noCacheHeaders }));
  app.use("/js", express.static(path.join(ROOT_DIR, "js"), { setHeaders: noCacheHeaders }));
  app.use("/img", express.static(path.join(ROOT_DIR, "img"), { maxAge: "7d" }));
  app.get("/", (_req, res) => {
    noCacheHeaders(res);
    res.sendFile(path.join(ROOT_DIR, "index.html"));
  });
  app.get("/index.html", (_req, res) => {
    noCacheHeaders(res);
    res.sendFile(path.join(ROOT_DIR, "index.html"));
  });

  // Global error handler (including multer errors)
  app.use((err, _req, res, _next) => {
    if (!err) return res.status(500).json({ error: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
    const status = err.status || (err.code === "LIMIT_FILE_SIZE" ? 413 : 400);
    const msg = err.code === "LIMIT_FILE_SIZE" ? "ไฟล์รูปภาพใหญ่เกินกำหนด (สูงสุด 8 MB)" : err.message;
    res.status(status).json({ error: msg || "คำขอไม่ถูกต้อง" });
  });

  return app;
}

if (require.main === module) {
  const PORT = Number(process.env.PORT || 8081);
  const HOST = process.env.HOST || "127.0.0.1";
  const app = createApp();
  app.listen(PORT, HOST, () => {
    console.log(`HappiU Full-Stack Server running at http://${HOST}:${PORT}`);
  });
}

module.exports = { createApp };
