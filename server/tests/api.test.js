const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createApp } = require("../index");
const { closeDb } = require("../db");

// Tiny valid 1x1 PNG data URL for photo check-in/out & profile tests
const TINY_PNG_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";

let server;
let baseUrl;
let tempDbPath;

async function api(route, { method = "GET", token, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(`${baseUrl}${route}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

test.before(async () => {
  tempDbPath = path.join(os.tmpdir(), `happiu-test-${Date.now()}.db`);
  const app = createApp({ dbPath: tempDbPath });
  await new Promise(resolve => {
    server = app.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
});

test.after(async () => {
  await new Promise(resolve => server.close(resolve));
  closeDb();
  for (const suffix of ["", "-wal", "-shm"]) {
    try { fs.unlinkSync(tempDbPath + suffix); } catch {}
  }
});

test("1. Unified Auth: register new student with real student ID & login without choosing role", async () => {
  const reg = await api("/api/auth/register", {
    method: "POST",
    body: {
      identifier: "66310999",
      password: "mypassword",
      name: "สมชาย ทดสอบ",
      faculty: "คณะวิศวกรรมศาสตร์",
      major: "วิศวกรรมคอมพิวเตอร์",
      year: 2
    }
  });
  assert.equal(reg.status, 201);
  assert.equal(reg.data.user.role, "student");
  assert.equal(reg.data.user.identifier, "66310999");
  assert.ok(reg.data.token);

  const login = await api("/api/auth/login", {
    method: "POST",
    body: { identifier: "66310999", password: "mypassword" }
  });
  assert.equal(login.status, 200);
  assert.equal(login.data.user.role, "student");

  // Employer unified login by email (no role parameter!)
  const empLogin = await api("/api/auth/login", {
    method: "POST",
    body: { identifier: "cafe@example.com", password: "happiu123" }
  });
  assert.equal(empLogin.status, 200);
  assert.equal(empLogin.data.user.role, "employer");
  assert.equal(empLogin.data.user.entityId, "cafe");

  // Admin unified login by staff code
  const adminLogin = await api("/api/auth/login", {
    method: "POST",
    body: { identifier: "ADMIN-NU-001", password: "happiu123" }
  });
  assert.equal(adminLogin.status, 200);
  assert.equal(adminLogin.data.user.role, "admin");
});

test("2. Multi-session photo check-in/check-out, employer approval, payment & resignation flow", async () => {
  const stuLogin = await api("/api/auth/login", {
    method: "POST",
    body: { identifier: "66310999", password: "mypassword" }
  });
  const stuToken = stuLogin.data.token;

  const empLogin = await api("/api/auth/login", {
    method: "POST",
    body: { identifier: "cafe@example.com", password: "happiu123" }
  });
  const empToken = empLogin.data.token;

  // Student applies to cafe job
  const applyRes = await api("/api/applications", {
    method: "POST",
    token: stuToken,
    body: { jobId: "cafe", shared: ["nick"] }
  });
  assert.equal(applyRes.status, 201);
  const appId = applyRes.data.applicationId;

  // Duplicate apply to same job does NOT create duplicate application
  const dupRes = await api("/api/applications", {
    method: "POST",
    token: stuToken,
    body: { jobId: "cafe", shared: ["nick"] }
  });
  assert.equal(dupRes.status, 200);
  assert.equal(dupRes.data.duplicate, true);
  assert.equal(dupRes.data.applicationId, appId);

  // Employer updates hiring stage directly to 'hired' -> MUST sync student status to 'accepted'!
  const hireRes = await api(`/api/applications/${appId}/hiring`, {
    method: "PATCH",
    token: empToken,
    body: { stage: "hired", note: "ยินดีต้อนรับครับ" }
  });
  assert.equal(hireRes.status, 200);
  const updatedApp = hireRes.data.state.applications.find(a => a.id === appId);
  assert.equal(updatedApp.status, "accepted");
  assert.ok(updatedApp.shift, "Shift should be assigned when hired");

  // Round 1 Check-in with photo
  const ci1 = await api("/api/work-sessions/check-in", {
    method: "POST",
    token: stuToken,
    body: { applicationId: appId, photoDataUrl: TINY_PNG_DATA_URL, note: "เข้างานรอบ 1" }
  });
  assert.equal(ci1.status, 201);
  const ws1Id = ci1.data.session.id;
  assert.equal(ci1.data.session.status, "checked_in");
  assert.match(ci1.data.session.check_in_photo_url, /^\/uploads\/checkins\//);

  // Cannot check in again while Round 1 is still checked_in
  const ciBlocked = await api("/api/work-sessions/check-in", {
    method: "POST",
    token: stuToken,
    body: { applicationId: appId, photoDataUrl: TINY_PNG_DATA_URL }
  });
  assert.equal(ciBlocked.status, 409);

  // Round 1 Check-out with photo
  const co1 = await api(`/api/work-sessions/${ws1Id}/check-out`, {
    method: "POST",
    token: stuToken,
    body: { photoDataUrl: TINY_PNG_DATA_URL }
  });
  assert.equal(co1.status, 200);
  assert.equal(co1.data.session.status, "pending_approval");
  assert.ok(co1.data.session.amount > 0);
  assert.match(co1.data.session.check_out_photo_url, /^\/uploads\/checkins\//);

  // Round 2 Check-in IMMEDIATELY allowed even while Round 1 is still pending_approval!
  const ci2 = await api("/api/work-sessions/check-in", {
    method: "POST",
    token: stuToken,
    body: { applicationId: appId, photoDataUrl: TINY_PNG_DATA_URL, note: "เข้างานรอบ 2" }
  });
  assert.equal(ci2.status, 201);
  const ws2Id = ci2.data.session.id;

  // Cannot resign while Round 2 is still checked_in
  const resignBlocked = await api(`/api/applications/${appId}/resign`, {
    method: "POST",
    token: stuToken,
    body: { reason: "ติดสอบ" }
  });
  assert.equal(resignBlocked.status, 400);

  // Round 2 Check-out
  const co2 = await api(`/api/work-sessions/${ws2Id}/check-out`, {
    method: "POST",
    token: stuToken,
    body: { photoDataUrl: TINY_PNG_DATA_URL }
  });
  assert.equal(co2.status, 200);

  // Employer approves & pays Round 1
  const appr = await api(`/api/work-sessions/${ws1Id}/approve`, { method: "PATCH", token: empToken });
  assert.equal(appr.status, 200);
  assert.equal(appr.data.session.status, "approved");

  const pay = await api(`/api/work-sessions/${ws1Id}/pay`, {
    method: "PATCH",
    token: empToken,
    body: { proof: "REF-2026-001" }
  });
  assert.equal(pay.status, 200);
  assert.equal(pay.data.session.status, "paid");

  // Student resigns from the job -> stops new check-ins, preserves past sessions & earnings!
  const resign = await api(`/api/applications/${appId}/resign`, {
    method: "POST",
    token: stuToken,
    body: { reason: "เตรียมสอบปลายภาค" }
  });
  assert.equal(resign.status, 200);
  const resignedApp = resign.data.state.applications.find(a => a.id === appId);
  assert.equal(resignedApp.status, "resigned");
  assert.equal(resignedApp.workSessions.length, 2);

  // Round 3 check-in must be rejected after resigning
  const ci3 = await api("/api/work-sessions/check-in", {
    method: "POST",
    token: stuToken,
    body: { applicationId: appId, photoDataUrl: TINY_PNG_DATA_URL }
  });
  assert.equal(ci3.status, 400);
});

test("3. Tutor CRUD (including DELETE), reviews, profile photo upload & AI schedule parser", async () => {
  const stuLogin = await api("/api/auth/login", {
    method: "POST",
    body: { identifier: "NU-DEMO-001", password: "happiu123" }
  });
  const token = stuLogin.data.token;

  // Create tutor post with custom banner text
  const created = await api("/api/tutors", {
    method: "POST",
    token,
    body: {
      subject: "ติวแคลคูลัส 1 เข้มข้น",
      category: "math",
      level: "มหาวิทยาลัย",
      rate: 200,
      format: "online",
      availability: "เสาร์ 10:00-12:00",
      experience: "ได้เกรด A แคลคูลัส",
      bannerText: "สอนสด 1-on-1 พร้อมชีทสรุป"
    }
  });
  assert.equal(created.status, 201);
  const tutorId = created.data.tutorId;

  // Add review to tutor
  const rev = await api(`/api/tutors/${tutorId}/reviews`, {
    method: "POST",
    token,
    body: { reviewerName: "น้องบิว", rating: 5, comment: "อธิบายเข้าใจง่ายมาก" }
  });
  assert.equal(rev.status, 201);
  const foundTutor = rev.data.state.tutors.find(t => t.id === tutorId);
  assert.equal(foundTutor.reviews.length, 1);

  // Delete tutor post (น้องข้าว ข้อ 3)
  const del = await api(`/api/tutors/${tutorId}`, { method: "DELETE", token });
  assert.equal(del.status, 200);
  assert.equal(del.data.state.tutors.some(t => t.id === tutorId), false);

  // Real profile photo upload (น้องข้าว ข้อ 5)
  const up = await api("/api/uploads/profile", {
    method: "POST",
    token,
    body: { photoDataUrl: TINY_PNG_DATA_URL }
  });
  assert.equal(up.status, 200);
  assert.match(up.data.url, /^\/uploads\/profiles\//);

  // AI Schedule Parser (verifies Thai words containing น like 'การเขียน' stay intact!)
  const ai = await api("/api/schedule/ai-parse", {
    method: "POST",
    token,
    body: {
      mode: "merge",
      text: "จันทร์ 09:00-11:00 แคลคูลัส 1 MTH101 ห้อง SC2101\nอังคาร 13:00-15:00 น. การเขียนโปรแกรมเว็บ CS210 ห้อง SC LAB 2"
    }
  });
  assert.equal(ai.status, 200);
  assert.equal(ai.data.addedCount, 2);
  assert.equal(ai.data.entries[0].day, "จันทร์");
  assert.equal(ai.data.entries[0].start, "09:00");
  assert.equal(ai.data.entries[1].day, "อังคาร");
  assert.equal(ai.data.entries[1].course, "การเขียนโปรแกรมเว็บ");
});

test("4. SQLite Schema Reference Tables (NU Faculties/Majors), Profile Faculty/Major Update & SQL Views", async () => {
  const facRes = await api("/api/faculties");
  assert.equal(facRes.status, 200);
  assert.equal(facRes.data.faculties.length, 18);
  const sci = facRes.data.faculties.find(f => f.faculty === "คณะวิทยาศาสตร์");
  assert.ok(sci);
  assert.ok(sci.majors.includes("วิทยาการคอมพิวเตอร์"));

  const stuLogin = await api("/api/auth/login", {
    method: "POST",
    body: { identifier: "NU-DEMO-001", password: "happiu123" }
  });
  const upd = await api("/api/student/profile", {
    method: "PATCH",
    token: stuLogin.data.token,
    body: {
      faculty: "คณะโลจิสติกส์และดิจิทัลซัพพลายเชน",
      major: "ดิจิทัลซัพพลายเชน"
    }
  });
  assert.equal(upd.status, 200);
  assert.equal(upd.data.state.students.baitong.faculty, "คณะโลจิสติกส์และดิจิทัลซัพพลายเชน");
  assert.equal(upd.data.state.students.baitong.major, "ดิจิทัลซัพพลายเชน");

  const { getDb } = require("../db");
  const db = getDb();
  const loginAccounts = db.prepare("SELECT * FROM v_login_accounts").all();
  assert.ok(loginAccounts.length >= 15);
  const workSummary = db.prepare("SELECT * FROM v_student_work_summary").all();
  assert.ok(workSummary.length >= 1);
  const jobOverview = db.prepare("SELECT * FROM v_job_overview").all();
  assert.ok(jobOverview.length >= 10);
});
