const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");

const ROOT_DIR = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "data");
const UPLOADS_DIR = path.join(ROOT_DIR, "uploads");

function ensureDirectories() {
  for (const dir of [
    DATA_DIR,
    UPLOADS_DIR,
    path.join(UPLOADS_DIR, "checkins"),
    path.join(UPLOADS_DIR, "profiles"),
    path.join(UPLOADS_DIR, "banners"),
    path.join(UPLOADS_DIR, "chat")
  ]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

let dbInstance = null;

function getDbPath() {
  return process.env.HAPPIU_DB_PATH || path.join(DATA_DIR, "happiu.db");
}

function initDb(customPath) {
  ensureDirectories();
  const dbPath = customPath || getDbPath();
  if (dbPath !== ":memory:") {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }
  const db = new DatabaseSync(dbPath);
  const schemaPath = path.join(__dirname, "schema.sql");
  const schemaSql = fs.readFileSync(schemaPath, "utf8");
  db.exec(schemaSql);

  dbInstance = db;
  return db;
}

function getDb() {
  if (!dbInstance) return initDb();
  return dbInstance;
}

function closeDb() {
  if (dbInstance) {
    try { dbInstance.close(); } catch {}
    dbInstance = null;
  }
}

function parseJson(str, fallback) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

function makeId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function inferJobType(job) {
  if (job.job_type) return job.job_type;
  if (job.jobType) return job.jobType;
  if (job.kind === "online") return "online";
  return "part-time";
}

function getFullState(db = getDb()) {
  const students = {};
  for (const row of db.prepare("SELECT * FROM students").all()) {
    students[row.id] = {
      id: row.id,
      code: row.code,
      name: row.name,
      nick: row.nick || "",
      year: row.year,
      faculty: row.faculty || "",
      major: row.major || "",
      contact: row.contact || "",
      photo: row.photo || "",
      intro: row.intro || "",
      skills: row.skills || "",
      experience: row.experience || "",
      interests: parseJson(row.interests_json, []),
      availability: row.availability || "",
      schedule: parseJson(row.schedule_json, []),
      hideSkillsBanner: Boolean(row.hide_skills_banner)
    };
  }

  const employers = {};
  for (const row of db.prepare("SELECT * FROM employers").all()) {
    employers[row.id] = {
      id: row.id,
      name: row.name,
      type: row.type,
      contact: row.contact,
      status: row.status,
      reason: row.reason || "",
      document: row.document || ""
    };
  }

  const jobs = db.prepare("SELECT * FROM jobs ORDER BY created_at ASC, id ASC").all().map(row => ({
    id: row.id,
    employer: row.employer_id,
    title: row.title,
    kind: row.kind,
    jobType: row.job_type || (row.kind === "online" ? "online" : "part-time"),
    category: row.category || "",
    location: row.location || "",
    payType: row.pay_type || "hourly",
    rate: Number(row.rate),
    distance: Number(row.distance || 0),
    status: row.status,
    deadline: row.deadline || "",
    doc: Boolean(row.doc),
    description: row.description || "",
    skills: row.skills || "",
    requiredSkills: row.required_skills || "",
    requiredMajor: row.required_major || "",
    reason: row.reason || "",
    revisionOriginal: row.revision_original || undefined,
    revisionLocation: row.revision_location ?? undefined,
    shifts: parseJson(row.shifts_json, [])
  }));

  // Group work_sessions by application_id
  const sessionsByApp = new Map();
  const allWorkSessions = db.prepare("SELECT * FROM work_sessions ORDER BY check_in_at DESC").all().map(row => {
    const s = {
      id: row.id,
      applicationId: row.application_id,
      studentId: row.student_id,
      jobId: row.job_id,
      employerId: row.employer_id,
      shiftId: row.shift_id,
      checkInAt: row.check_in_at,
      checkInPhotoUrl: row.check_in_photo_url,
      checkOutAt: row.check_out_at,
      checkOutPhotoUrl: row.check_out_photo_url,
      hours: Number(row.hours || 0),
      amount: Number(row.amount || 0),
      status: row.status,
      paymentProof: row.payment_proof || "",
      note: row.note || ""
    };
    if (!sessionsByApp.has(row.application_id)) sessionsByApp.set(row.application_id, []);
    sessionsByApp.get(row.application_id).push(s);
    return s;
  });

  // Group chat messages by thread_key (student_id::employer_id)
  const messagesByThread = new Map();
  for (const row of db.prepare("SELECT * FROM chat_messages ORDER BY created_at ASC").all()) {
    if (!messagesByThread.has(row.thread_key)) messagesByThread.set(row.thread_key, []);
    messagesByThread.get(row.thread_key).push({
      id: row.id,
      from: row.sender_role,
      text: row.text || "",
      photo: row.photo_url || undefined,
      status: row.status || "read",
      at: row.created_at
    });
  }

  const applications = db.prepare("SELECT * FROM applications ORDER BY created_at ASC").all().map(row => {
    const threadKey = `${row.student_id}::${row.employer_id}`;
    const sessions = sessionsByApp.get(row.id) || [];
    const app = {
      id: row.id,
      student: row.student_id,
      job: row.job_id,
      employer: row.employer_id,
      shift: row.shift_id || undefined,
      status: row.status,
      hiringStage: row.hiring_stage || undefined,
      hiringNote: row.hiring_note || "",
      interview: parseJson(row.interview_json, null),
      profile: parseJson(row.profile_json, {}),
      doc: row.doc || "",
      work: row.work_status || undefined,
      in: row.work_in || undefined,
      out: row.work_out || undefined,
      amount: Number(row.work_amount || 0),
      proof: row.work_proof || "",
      studentReview: parseJson(row.student_review_json, null),
      employerReview: parseJson(row.employer_review_json, null),
      closedAt: row.closed_at || undefined,
      resignedAt: row.resigned_at || undefined,
      resignReason: row.resign_reason || "",
      messages: messagesByThread.get(threadKey) || [],
      workSessions: sessions
    };
    return app;
  });

  const requestsByTutor = new Map();
  for (const row of db.prepare("SELECT * FROM tutor_requests ORDER BY created_at DESC").all()) {
    if (!requestsByTutor.has(row.tutor_id)) requestsByTutor.set(row.tutor_id, []);
    requestsByTutor.get(row.tutor_id).push({
      id: row.id,
      name: row.name,
      contact: row.contact,
      message: row.message,
      at: row.created_at
    });
  }

  const reviewsByTutor = new Map();
  for (const row of db.prepare("SELECT * FROM tutor_reviews ORDER BY created_at DESC").all()) {
    if (!reviewsByTutor.has(row.tutor_id)) reviewsByTutor.set(row.tutor_id, []);
    reviewsByTutor.get(row.tutor_id).push({
      id: row.id,
      reviewerName: row.reviewer_name,
      rating: Number(row.rating),
      comment: row.comment,
      at: row.created_at
    });
  }

  const tutors = db.prepare("SELECT * FROM tutors ORDER BY created_at DESC").all().map(row => ({
    id: row.id,
    owner: row.owner_id,
    category: row.category,
    subject: row.subject,
    level: row.level,
    rate: Number(row.rate),
    format: row.format,
    availability: row.availability,
    experience: row.experience,
    bannerUrl: row.banner_url || "",
    bannerText: row.banner_text || "",
    requests: requestsByTutor.get(row.id) || [],
    reviews: reviewsByTutor.get(row.id) || []
  }));

  const reports = db.prepare("SELECT * FROM reports ORDER BY created_at DESC").all().map(row => ({
    id: row.id,
    student: row.student_id,
    job: row.job_id,
    status: row.status,
    reason: row.reason,
    detail: row.detail,
    attachment: row.attachment || "",
    request: row.request || "",
    reply: row.reply || "",
    result: row.result || ""
  }));

  return {
    students,
    employers,
    jobs,
    applications,
    workSessions: allWorkSessions,
    tutors,
    reports,
    skillMatchingVersion: 1
  };
}

module.exports = {
  ROOT_DIR,
  DATA_DIR,
  UPLOADS_DIR,
  ensureDirectories,
  initDb,
  getDb,
  closeDb,
  parseJson,
  makeId,
  inferJobType,
  getFullState
};
