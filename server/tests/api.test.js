const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createApp } = require("../index");
const { closeDb, UPLOADS_DIR } = require("../db");
const { validateAndNormalizeAvailability } = require("../../js/modules/m1-matching");

// Tiny valid 1x1 PNG data URL for photo check-in/out & profile tests
const TINY_PNG_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
const TINY_PNG_BUFFER = Buffer.from(TINY_PNG_DATA_URL.split(",")[1], "base64");

let server;
let baseUrl;
let tempDbPath;
const createdUploadUrls = [];

function trackUpload(url) {
  if (typeof url === "string" && url.startsWith("/uploads/")) {
    createdUploadUrls.push(url);
  }
  return url;
}

async function api(route, { method = "GET", token, body, formData } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (formData) {
    payload = formData;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const res = await fetch(`${baseUrl}${route}`, {
    method,
    headers,
    body: payload
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
  for (const relUrl of createdUploadUrls) {
    const cleanRel = relUrl.replace(/^\/uploads\//, "");
    try { fs.unlinkSync(path.join(UPLOADS_DIR, cleanRel)); } catch {}
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
  trackUpload(ci1.data.session.check_in_photo_url);

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
  trackUpload(co1.data.session.check_out_photo_url);

  // Round 2 Check-in IMMEDIATELY allowed even while Round 1 is still pending_approval!
  const ci2 = await api("/api/work-sessions/check-in", {
    method: "POST",
    token: stuToken,
    body: { applicationId: appId, photoDataUrl: TINY_PNG_DATA_URL, note: "เข้างานรอบ 2" }
  });
  assert.equal(ci2.status, 201);
  const ws2Id = ci2.data.session.id;
  trackUpload(ci2.data.session.check_in_photo_url);

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
  trackUpload(co2.data.session.check_out_photo_url);

  // Employer approves Round 1
  const appr = await api(`/api/work-sessions/${ws1Id}/approve`, { method: "PATCH", token: empToken });
  assert.equal(appr.status, 200);
  assert.equal(appr.data.session.status, "approved");

  // R2: Reject paying without slip image, with plain-text proof, with non-image dataUrl, or unapproved session
  const payEmpty = await api(`/api/work-sessions/${ws1Id}/pay`, {
    method: "PATCH",
    token: empToken,
    body: {}
  });
  assert.equal(payEmpty.status, 400);

  const payTextProof = await api(`/api/work-sessions/${ws1Id}/pay`, {
    method: "PATCH",
    token: empToken,
    body: { proof: "REF-2026-001" }
  });
  assert.equal(payTextProof.status, 400);

  const payBadDataUrl = await api(`/api/work-sessions/${ws1Id}/pay`, {
    method: "PATCH",
    token: empToken,
    body: { slipDataUrl: "data:text/plain;base64,SGVsbG8=" }
  });
  assert.equal(payBadDataUrl.status, 400);

  const payUnapproved = await api(`/api/work-sessions/${ws2Id}/pay`, {
    method: "PATCH",
    token: empToken,
    body: { slipDataUrl: TINY_PNG_DATA_URL }
  });
  assert.equal(payUnapproved.status, 400);

  // R2: Pay Round 1 with real payment slip image (slipDataUrl)
  const pay = await api(`/api/work-sessions/${ws1Id}/pay`, {
    method: "PATCH",
    token: empToken,
    body: { slipDataUrl: TINY_PNG_DATA_URL }
  });
  assert.equal(pay.status, 200);
  assert.equal(pay.data.session.status, "paid");
  const slipUrl = trackUpload(pay.data.session.payment_proof);
  assert.match(slipUrl, /^\/uploads\/slips\/.+\.png$/);

  // Verify slip image is publicly fetchable as image/* and visible in both student & employer views/state
  const slipHttp = await fetch(`${baseUrl}${slipUrl}`);
  assert.equal(slipHttp.status, 200);
  assert.match(slipHttp.headers.get("content-type") || "", /^image\//);

  const stuSessions = await api("/api/work-sessions", { token: stuToken });
  assert.equal(stuSessions.status, 200);
  const stuWs1 = stuSessions.data.sessions.find(s => s.id === ws1Id);
  assert.equal(stuWs1.status, "paid");
  assert.equal(stuWs1.payment_proof, slipUrl);

  const empSessions = await api("/api/work-sessions", { token: empToken });
  assert.equal(empSessions.status, 200);
  const empWs1 = empSessions.data.sessions.find(s => s.id === ws1Id);
  assert.equal(empWs1.status, "paid");
  assert.equal(empWs1.payment_proof, slipUrl);

  const stuState = await api("/api/state", { token: stuToken });
  assert.equal(stuState.status, 200);
  const stuStateWs1 = stuState.data.state.workSessions.find(s => s.id === ws1Id);
  assert.equal(stuStateWs1.paymentProof, slipUrl);
  const stuStateApp = stuState.data.state.applications.find(a => a.id === appId);
  assert.equal(stuStateApp.proof, slipUrl);

  const empState = await api("/api/state", { token: empToken });
  assert.equal(empState.status, 200);
  const empStateWs1 = empState.data.state.workSessions.find(s => s.id === ws1Id);
  assert.equal(empStateWs1.paymentProof, slipUrl);

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
  trackUpload(up.data.url);

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

test("5. R2 Payment Slip Multipart FormData Upload, Non-Image Rejection & Placeholder Slip", async () => {
  const libLogin = await api("/api/auth/login", {
    method: "POST",
    body: { identifier: "library@example.com", password: "happiu123" }
  });
  assert.equal(libLogin.status, 200);
  const libToken = libLogin.data.token;

  // Reject non-image multipart upload
  const badForm = new FormData();
  badForm.append("slip", new Blob(["not an image"], { type: "text/plain" }), "fake.txt");
  const badRes = await api("/api/work-sessions/ws-seed-pim-2/pay", {
    method: "PATCH",
    token: libToken,
    formData: badForm
  });
  assert.equal(badRes.status, 400);

  // Verify multipart upload on unapproved session returns 400 and leaves zero orphan slip files
  const slipsDir = path.join(UPLOADS_DIR, "slips");
  const beforeSlips = fs.existsSync(slipsDir) ? fs.readdirSync(slipsDir).length : 0;
  const unapprovedForm = new FormData();
  unapprovedForm.append("slip", new Blob([TINY_PNG_BUFFER], { type: "image/png" }), "slip.png");
  const unapprovedMultipartRes = await api("/api/work-sessions/ws-seed-pim-3/pay", {
    method: "PATCH",
    token: libToken,
    formData: unapprovedForm
  });
  assert.equal(unapprovedMultipartRes.status, 400);
  const afterSlips = fs.existsSync(slipsDir) ? fs.readdirSync(slipsDir).length : 0;
  assert.equal(afterSlips, beforeSlips, "Failed multipart upload must not leave orphan slip files");

  // Accept valid PNG multipart upload on seeded approved session ws-seed-pim-2
  const okForm = new FormData();
  okForm.append("slip", new Blob([TINY_PNG_BUFFER], { type: "image/png" }), "slip.png");
  const okRes = await api("/api/work-sessions/ws-seed-pim-2/pay", {
    method: "PATCH",
    token: libToken,
    formData: okForm
  });
  assert.equal(okRes.status, 200);
  assert.equal(okRes.data.session.status, "paid");
  const slipUrl = trackUpload(okRes.data.session.payment_proof);
  assert.match(slipUrl, /^\/uploads\/slips\/.+\.png$/);

  const imgFetch = await fetch(`${baseUrl}${slipUrl}`);
  assert.equal(imgFetch.status, 200);
  assert.match(imgFetch.headers.get("content-type") || "", /^image\/png/);

  // Seeded student (pim) also sees the uploaded slip URL
  const pimLogin = await api("/api/auth/login", {
    method: "POST",
    body: { identifier: "NU-DEMO-003", password: "happiu123" }
  });
  assert.equal(pimLogin.status, 200);
  const pimSessions = await api("/api/work-sessions", { token: pimLogin.data.token });
  const pimPaidWs = pimSessions.data.sessions.find(s => s.id === "ws-seed-pim-2");
  assert.equal(pimPaidWs.status, "paid");
  assert.equal(pimPaidWs.payment_proof, slipUrl);

  // Seeded placeholder slip SVG is valid and accessible for both roles
  const placeholderRes = await fetch(`${baseUrl}/api/uploads/placeholder/slip`);
  assert.equal(placeholderRes.status, 200);
  assert.match(placeholderRes.headers.get("content-type") || "", /^image\/svg\+xml/);
});

test("6. R1 Structured Day/Time Availability Validation & Persistence (Profile, Tutor & Seeded Data)", async () => {
  // Unit checks on shared validator (js/modules/m1-matching.js)
  {
    const validator = validateAndNormalizeAvailability;
    assert.equal(validator("ว่างทุกวัน").ok, false);
    assert.equal(validator("จันทร์หลัง 16:30").ok, false);
    assert.equal(validator("จันทร์ 20:00–17:00").ok, false);
    assert.equal(validator("จันทร์ 25:00–26:00").ok, false);
    assert.equal(validator("จันทร์ 22:00–24:15").ok, false);
    assert.equal(validator("", { allowEmpty: false }).ok, false);
    assert.equal(validator("", { allowEmpty: true }).ok, true);
    const end24 = validator("เสาร์ 18:00–24:00");
    assert.equal(end24.ok, true);
    assert.equal(end24.value, "เสาร์ 18:00–24:00");
    const dedup = validator("วันจันทร์ 16:30-20:00 น., จันทร์ 16:30–20:00, เสาร์ 09:00-12:00");
    assert.equal(dedup.ok, true);
    assert.equal(dedup.value, "จันทร์ 16:30–20:00, เสาร์ 09:00–12:00");
    const arrNorm = validator([{ day: "อังคาร", start: "13:00", end: "15:30" }]);
    assert.equal(arrNorm.ok, true);
    assert.equal(arrNorm.value, "อังคาร 13:00–15:30");
  }

  const stuLogin = await api("/api/auth/login", {
    method: "POST",
    body: { identifier: "NU-DEMO-001", password: "happiu123" }
  });
  const token = stuLogin.data.token;

  // Reject free text & invalid time ranges on student profile
  for (const badAvail of ["ว่างทุกวันหลังเลิกเรียน", "จันทร์หลัง 16:30", "จันทร์ 20:00–17:00", "จันทร์ 25:00–26:00"]) {
    const res = await api("/api/student/profile", {
      method: "PATCH",
      token,
      body: { availability: badAvail }
    });
    assert.equal(res.status, 400, `Expected 400 for profile availability: ${badAvail}`);
  }

  // Persist normalized structured availability on student profile
  const okProfile = await api("/api/student/profile", {
    method: "PATCH",
    token,
    body: { availability: "จันทร์ 16:30-20:00 น., เสาร์ 09:00-12:00 น." }
  });
  assert.equal(okProfile.status, 200);
  assert.equal(okProfile.data.state.students.baitong.availability, "จันทร์ 16:30–20:00, เสาร์ 09:00–12:00");

  // Reject empty, free-text & invalid range on POST /api/tutors
  for (const badTutorAvail of ["", "สะดวกคุยก่อน", "วันพุธหลัง 16:00", "เสาร์ 14:00–14:00", "เสาร์ 18:00–14:00"]) {
    const res = await api("/api/tutors", {
      method: "POST",
      token,
      body: {
        subject: "ติวทดสอบ",
        category: "math",
        level: "มหาวิทยาลัย",
        rate: 150,
        format: "online",
        availability: badTutorAvail,
        experience: "ทดสอบ"
      }
    });
    assert.equal(res.status, 400, `Expected 400 for tutor availability: ${badTutorAvail}`);
  }

  // Persist multi-slot availability (> 120 chars) without truncation on POST /api/tutors
  const multiSlot = "จันทร์ 17:00–19:00, อังคาร 17:00–19:00, พุธ 17:00–19:00, พฤหัสบดี 17:00–19:00, ศุกร์ 17:00–19:00, เสาร์ 09:00–12:00, อาทิตย์ 09:00–12:00";
  assert.ok(multiSlot.length > 120);
  const okTutor = await api("/api/tutors", {
    method: "POST",
    token,
    body: {
      subject: "ติวหลายช่วงเวลา",
      category: "math",
      level: "มหาวิทยาลัย",
      rate: 220,
      format: "both",
      availability: multiSlot,
      experience: "สอนได้ทุกวันตามตารางที่เลือก"
    }
  });
  assert.equal(okTutor.status, 201);
  const createdTutor = okTutor.data.state.tutors.find(t => t.id === okTutor.data.tutorId);
  assert.equal(createdTutor.availability, multiSlot);
  await api(`/api/tutors/${okTutor.data.tutorId}`, { method: "DELETE", token });

  // Verify every seeded student and tutor in GET /api/state has canonical structured availability
  const stateRes = await api("/api/state", { token });
  assert.equal(stateRes.status, 200);
  for (const [id, st] of Object.entries(stateRes.data.state.students)) {
    const check = validateAndNormalizeAvailability(st.availability, { allowEmpty: true });
    assert.equal(check.ok, true, `Seeded student ${id} has invalid availability: ${st.availability}`);
  }
  for (const t of stateRes.data.state.tutors) {
    const check = validateAndNormalizeAvailability(t.availability, { allowEmpty: false });
    assert.equal(check.ok, true, `Seeded tutor ${t.id} has invalid availability: ${t.availability}`);
  }
});
